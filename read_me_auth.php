File - https://prop.digiheadway.in/api/network-auth.php
<?php
// ===== CORS Fix =====
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
} else {
    header("Access-Control-Allow-Origin: *");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight (OPTIONS) requests quickly
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ===== Error Reporting =====
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
function generateToken($length = 32)
{
    return bin2hex(random_bytes($length / 2));
}

function getBearerToken()
{
    $headers = null;
    if (isset($_SERVER['HTTP_AUTHORIZATION']))
        $headers = trim($_SERVER['HTTP_AUTHORIZATION']);
    elseif (function_exists('apache_request_headers')) {
        $requestHeaders = apache_request_headers();
        if (isset($requestHeaders['Authorization']))
            $headers = trim($requestHeaders['Authorization']);
    }
    if ($headers && preg_match('/Bearer\s(\S+)/', $headers, $matches)) {
        return $matches[1];
    }
    return null;
}

function setAuthCookies($id, $token)
{
    setcookie("user_id", $id, time() + (30 * 24 * 60 * 60), "/", "", false, true);
    setcookie("auth_token", $token, time() + (30 * 24 * 60 * 60), "/", "", false, true);
}

// ===== Input =====
$input = json_decode(file_get_contents("php://input"), true);
$action = $_GET['action'] ?? '';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS')
    exit(0);

// ========== SIGNUP ==========
if ($action === 'signup') {
    $name = trim($input['name'] ?? '');
    $phone = trim($input['phone'] ?? '');
    $password = trim($input['password'] ?? '');

    if (!$name || !$phone || !$password) {
        echo json_encode(["status" => false, "message" => "Missing required fields"]);
        exit;
    }

    $check = $conn->prepare("SELECT id FROM network_users WHERE phone = ?");
    $check->bind_param("s", $phone);
    $check->execute();
    $check->store_result();

    if ($check->num_rows > 0) {
        echo json_encode(["status" => false, "message" => "Phone already registered"]);
        exit;
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $token = generateToken();
    $stmt = $conn->prepare("INSERT INTO network_users (name, phone, password, token, created_on) VALUES (?, ?, ?, ?, NOW())");
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

    $stmt = $conn->prepare("SELECT id, name, password, token FROM network_users WHERE phone = ?");
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
    $update = $conn->prepare("UPDATE network_users SET token = ? WHERE id = ?");
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
    $token = $_COOKIE['auth_token'] ?? getBearerToken() ?? ($input['token'] ?? ($_GET['token'] ?? null));

    if (!$token) {
        echo json_encode(["status" => false, "message" => "Token required"]);
        exit;
    }

    $stmt = $conn->prepare("SELECT id, name, phone, firm_name, area_covers, city_covers, `type`, default_area, default_city, default_type, token, created_on FROM network_users WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        echo json_encode(["status" => false, "message" => "Invalid token or expired login"]);
        exit;
    }

    $user = $result->fetch_assoc();
    echo json_encode(["status" => true, "user" => $user]);
    exit;
}

// ========== UPDATE PROFILE ==========
if ($action === 'update_profile') {
    $token = $_COOKIE['auth_token'] ?? getBearerToken() ?? ($input['token'] ?? ($_GET['token'] ?? null));

    if (!$token) {
        echo json_encode(["status" => false, "message" => "Token required"]);
        exit;
    }

    // Fetch user
    $stmt = $conn->prepare("SELECT id FROM network_users WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        echo json_encode(["status" => false, "message" => "Invalid token"]);
        exit;
    }

    $user = $res->fetch_assoc();
    $uid = $user['id'];

    // Allowed fields
    $fields = [
        'name',
        'firm_name',
        'area_covers',
        'city_covers',
        'type',
        'default_area',
        'default_city',
        'default_type'
    ];

    $updates = [];
    $values = [];

    foreach ($fields as $f) {
        if (isset($input[$f])) {
            $updates[] = "$f = ?";
            $values[] = $input[$f];
        }
    }

    if (empty($updates)) {
        echo json_encode(["status" => false, "message" => "No valid fields to update"]);
        exit;
    }

    $query = "UPDATE network_users SET " . implode(", ", $updates) . ", updated_on = NOW() WHERE id = ?";
    $stmt = $conn->prepare($query);
    $types = str_repeat("s", count($values)) . "i";
    $values[] = $uid;

    $stmt->bind_param($types, ...$values);
    $done = $stmt->execute();

    if ($done) {
        echo json_encode(["status" => true, "message" => "Profile updated successfully"]);
    } else {
        echo json_encode(["status" => false, "message" => "Update failed"]);
    }
    exit;
}

echo json_encode(["status" => false, "message" => "Invalid action"]);
?>
