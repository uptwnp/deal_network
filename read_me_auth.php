File - https://prop.digiheadway.in/api/network-auth.php

<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ===== DB Connection =====
$host = "localhost";
$user = "u240376517_propdb";
$pass = "Y*Q;5gIOp2";
$dbname = "u240376517_propdb";
$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die(json_encode(["status" => false, "message" => "Database connection failed"]));
}

// ===== Helper =====
function generateToken($length = 32) {
    return bin2hex(random_bytes($length / 2));
}

function getBearerToken() {
    $headers = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization'])) $headers = trim($requestHeaders['Authorization']);
    }
    if ($headers && preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
        return $matches[1];
    }
    return null;
}

function setAuthCookies($id, $token) {
    // set cookie for 7 days, HttpOnly = true
    setcookie("user_id", $id, time() + (7 * 24 * 60 * 60), "/", "", false, true);
    setcookie("auth_token", $token, time() + (7 * 24 * 60 * 60), "/", "", false, true);
}

// ===== Input =====
$input = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// ========== SIGNUP ==========
if ($action === 'signup') {
    $name = trim($input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? '');

    if (!$name || !$phone || !$password) {
        echo json_encode(["status" => false, "message" => "Missing required fields"]);
        exit;
    }

    $check = $conn->prepare("SELECT id FROM users WHERE phone = ?");
    $check->bind_param("s", $phone);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        echo json_encode(["status" => false, "message" => "Phone already registered"]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $token = generateToken();
    $stmt = $conn->prepare("INSERT INTO users (name, phone, password, token, created_on) VALUES (?, ?, ?, ?, NOW())");
    $stmt->bind_param("ssss", $name, $phone, $hash, $token);
    $done = $stmt->execute();

    if ($done) {
        $user_id = $conn->insert_id;
        setAuthCookies($user_id, $token);
        echo json_encode([
            "status" => true,
            "message" => "Signup successful",
            "token" => $token,
            "user_id" => $user_id
        ]);
    } else {
        echo json_encode(["status" => false, "message" => "Signup failed"]);
    }
    exit;
}

// ========== LOGIN ==========
if ($action === 'login') {
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? '');

    if (!$phone || !$password) {
        echo json_encode(["status" => false, "message" => "Phone and password required"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, name, password, token FROM users WHERE phone = ?");
    $stmt->bind_param("s", $phone);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["status" => false, "message" => "User not found"]);
        exit;
    }

    $user = $result->fetch_assoc();
    if (!password_verify($password, $user['password'])) {
        echo json_encode(["status" => false, "message" => "Invalid password"]);
        exit;
    }

    $newToken = generateToken();
    $update = $conn->prepare("UPDATE users SET token = ? WHERE id = ?");
    $update->bind_param("si", $newToken, $user['id']);
    $update->execute();

    setAuthCookies($user['id'], $newToken);

    echo json_encode([
        "status" => true,
        "message" => "Login successful",
        "user" => [
            "id" => $user['id'],
            "name" => $user['name'],
            "phone" => $phone,
            "token" => $newToken
        ]
    ]);
    exit;
}

// ========== AUTH / PROFILE ==========
if ($action === 'me' || $action === 'profile') {
    // Priority: Cookie > Header > Body > GET
    $token = $_COOKIE['auth_token'] ?? null;
    $uid = $_COOKIE['user_id'] ?? null;

    if (!$token) $token = getBearerToken();
    if (!$token && isset($input['token'])) $token = trim($input['token']);
    if (!$token && isset($_GET['token'])) $token = trim($_GET['token']);
    if (!$uid && isset($input['user_id'])) $uid = intval($input['user_id']);

    if (!$token) {
        echo json_encode(["status" => false, "message" => "Token required"]);
        exit;
    }

    // Handle UPDATE profile
    if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($input['update'])) {
        $stmt = $conn->prepare("SELECT id FROM users WHERE token = ?");
        $stmt->bind_param("s", $token);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result->num_rows === 0) {
            echo json_encode(["status" => false, "message" => "Invalid token or expired login"]);
            exit;
        }

        $user = $result->fetch_assoc();
        $userId = $user['id'];

        // Build update query dynamically based on provided fields
        $updates = [];
        $params = [];
        $types = '';

        if (isset($input['firm_name'])) {
            $updates[] = "firm_name = ?";
            $params[] = trim($input['firm_name']);
            $types .= 's';
        }
        if (isset($input['area_covers'])) {
            $updates[] = "area_covers = ?";
            $params[] = trim($input['area_covers']);
            $types .= 's';
        }
        if (isset($input['city_covers'])) {
            $updates[] = "city_covers = ?";
            $params[] = trim($input['city_covers']);
            $types .= 's';
        }
        if (isset($input['type'])) {
            $updates[] = "`type` = ?";
            $params[] = trim($input['type']);
            $types .= 's';
        }
        if (isset($input['default_area'])) {
            $updates[] = "default_area = ?";
            $params[] = trim($input['default_area']);
            $types .= 's';
        }
        if (isset($input['default_city'])) {
            $updates[] = "default_city = ?";
            $params[] = trim($input['default_city']);
            $types .= 's';
        }
        if (isset($input['default_type'])) {
            $updates[] = "default_type = ?";
            $params[] = trim($input['default_type']);
            $types .= 's';
        }

        if (empty($updates)) {
            echo json_encode(["status" => false, "message" => "No fields to update"]);
            exit;
        }

        $params[] = $userId;
        $types .= 'i';
        $sql = "UPDATE users SET " . implode(", ", $updates) . " WHERE id = ?";
        $updateStmt = $conn->prepare($sql);
        $updateStmt->bind_param($types, ...$params);
        $done = $updateStmt->execute();

        if ($done) {
            // Return updated user data
            $stmt = $conn->prepare("SELECT id, name, phone, firm_name, area_covers, city_covers, `type`, default_area, default_city, default_type, token, created_on FROM users WHERE id = ?");
            $stmt->bind_param("i", $userId);
            $stmt->execute();
            $result = $stmt->get_result();
            $updatedUser = $result->fetch_assoc();

            echo json_encode([
                "status" => true,
                "message" => "Profile updated successfully",
                "user" => $updatedUser
            ]);
        } else {
            echo json_encode(["status" => false, "message" => "Failed to update profile"]);
        }
        exit;
    }

    // Handle GET profile
    $stmt = $conn->prepare("SELECT id, name, phone, firm_name, area_covers, city_covers, `type`, default_area, default_city, default_type, token, created_on FROM users WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["status" => false, "message" => "Invalid token or expired login"]);
        exit;
    }

    $user = $result->fetch_assoc();

    echo json_encode([
        "status" => true,
        "message" => "Authenticated via " . ($uid ? "cookie" : "token"),
        "user" => $user
    ]);
    exit;
}

echo json_encode(["status" => false, "message" => "Invalid action"]);
?>
