Backend files on https://prop.digiheadway.in/api/dealer_network/
--
files
- auth.php 
- options.php - its currently area.php in apis, code not changed
- fetch.php - currently network.php but now changed file
- action.php - currently network.php but now changed file
---
fetch 
<?php

include('config.php');

$action = $_GET['action'] ?? '';

if ($action === 'get_property') {

    $property_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

    if ($property_id <= 0) {
        sendResponse(false, "Invalid property id");
    }

    $conn = new mysqli($host, $user, $pass, $dbname);

    if ($conn->connect_error) {
        sendResponse(false, "Database connection failed: " . $conn->connect_error);
    }

    $sql = "SELECT id, heading,description, city, area, type, price_min, price_max,landmark_location,landmark_location_distance,
                   size_min, size_max, size_unit, highlights
            FROM network_properties_view 
            WHERE id = ? AND is_public = 1";

    $stmt = $conn->prepare($sql);

    if (!$stmt) {
        sendResponse(false, "Query prepare failed");
    }

    $stmt->bind_param("i", $property_id);
    $stmt->execute();
    $res = $stmt->get_result();

    if ($res->num_rows === 0) {
        sendResponse(false, "No public property found");
    }

    $row = $res->fetch_assoc();

    $stmt->close();
    $conn->close();

    sendResponse(true, "Property fetched", $row);
}


// ===== Auth =====
function getBearerToken()
{
    if (isset($_SERVER['HTTP_AUTHORIZATION']))
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    if (function_exists('apache_request_headers')) {
        $h = apache_request_headers();
        if (isset($h['Authorization']))
            return trim($h['Authorization']);
    }
    return null;
}

function out($a)
{
    echo json_encode($a);
    exit();
}

$input = json_decode(file_get_contents("php://input"), true);

$token = $_COOKIE['auth_token'] ?? null;
if (!$token)
    $token = getBearerToken();
if (!$token && isset($input['token']))
    $token = $input['token'];
if (!$token && isset($_GET['token']))
    $token = $_GET['token'];

$owner_id = 0;
if ($token) {
    if (preg_match('/Bearer\s(.+)/', $token, $m))
        $token = $m[1];

    $stmt = $conn->prepare("SELECT id FROM network_users WHERE token=?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $stmt->bind_result($uid);
    if ($stmt->fetch())
        $owner_id = intval($uid);
    $stmt->close();
}


// ===== Size Conversion Helper =====
function convertToGaj($size, $unit)
{
    $unit = strtolower(trim($unit));

    switch ($unit) {
        case 'gaj':
            return $size;
        case 'sqft':
            return $size / 9; // 1 gaj = 9 sqft
        case 'marla':
            // Marla ranges from 24-33 gaj per marla, use average for conversion
            return $size * 28.5; // Using 28.5 as average
        case 'kanal':
            // Kanal ranges from 450-650 gaj, use average
            return $size * 550; // Using 550 as average
        case 'acre':
            // Acre ranges from 4500-5100 gaj, use average
            return $size * 4800; // Using 4800 as average
        default:
            return $size; // Return as-is if unknown unit
    }
}

function getSizeRangeInGaj($size, $unit)
{
    $unit = strtolower(trim($unit));

    switch ($unit) {
        case 'gaj':
            return ['min' => $size, 'max' => $size];
        case 'sqft':
            $gaj = $size / 9;
            return ['min' => $gaj, 'max' => $gaj];
        case 'marla':
            // 3 marla = 80-100 gaj (24-33 gaj per marla)
            return ['min' => $size * 24, 'max' => $size * 33];
        case 'kanal':
            return ['min' => $size * 450, 'max' => $size * 650];
        case 'acre':
            return ['min' => $size * 4500, 'max' => $size * 5100];
        default:
            return ['min' => $size, 'max' => $size];
    }
}

// ===== Response Helper =====
function sendResponse($success, $message, $data = null, $meta = null)
{
    $response = [
        'success' => $success,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s')
    ];

    if ($data !== null) {
        $response['data'] = $data;
    }

    if ($meta !== null) {
        $response['meta'] = $meta;
    }

    echo json_encode($response, JSON_PRETTY_PRINT);
    exit();
}

try {
    // ===== Connect to DB =====
    $conn = new mysqli($host, $user, $pass, $dbname);
    if ($conn->connect_error) {
        throw new Exception("Database connection failed: " . $conn->connect_error);
    }
    $conn->set_charset("utf8mb4");

    // ===== Get Request Parameters =====
    $list = isset($_GET['list']) ? strtolower(trim($_GET['list'])) : 'mine'; // mine/both/others
    $for_map = isset($_GET['for']) && strtolower(trim($_GET['for'])) === 'map';
    $search = isset($_GET['search']) ? trim($_GET['search']) : '';
    $page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
    $limit = isset($_GET['limit']) ? max(1, min(100, intval($_GET['limit']))) : 20;
    $sortby = isset($_GET['sortby']) ? trim($_GET['sortby']) : 'id';
    $order = isset($_GET['order']) && strtoupper($_GET['order']) === 'ASC' ? 'ASC' : 'DESC';

    // Validate owner_id
    if ($owner_id === null || $owner_id <= 0) {
        sendResponse(false, "Invalid or missing owner_id parameter");
    }

    // Validate list parameter
    if (!in_array($list, ['mine', 'both', 'others'])) {
        sendResponse(false, "Invalid list parameter. Must be: mine, both, or others");
    }

    // ===== Build WHERE Clause =====
    $where_conditions = [];
    $params = [];
    $types = '';

    // Owner/visibility filtering
    if ($list === 'mine') {
        $where_conditions[] = "owner_id = ?";
        $params[] = $owner_id;
        $types .= 'i';
    } elseif ($list === 'others') {
        $where_conditions[] = "(owner_id != ? AND is_public = 1)";
        $params[] = $owner_id;
        $types .= 'i';
    } elseif ($list === 'both') {
        $where_conditions[] = "(owner_id = ? OR is_public = 1)";
        $params[] = $owner_id;
        $types .= 'i';
    }

    // Search filter
    if (!empty($search)) {
        $where_conditions[] = "(city LIKE ? OR area LIKE ? OR type LIKE ? OR description LIKE ? OR highlights LIKE ? OR heading LIKE ?)";
        $search_param = "%{$search}%";
        $params = array_merge($params, array_fill(0, 6, $search_param));
        $types .= str_repeat('s', 6);
    }

    // ===== Filter: City =====
    if (isset($_GET['city']) && $_GET['city'] !== '') {
        $where_conditions[] = "city = ?";
        $params[] = $_GET['city'];
        $types .= 's';
    }

    // ===== Filter: Area =====
    if (isset($_GET['area']) && $_GET['area'] !== '') {
        $where_conditions[] = "area = ?";
        $params[] = $_GET['area'];
        $types .= 's';
    }

    // ===== Filter: Type =====
    if (isset($_GET['type']) && $_GET['type'] !== '') {
        $where_conditions[] = "type = ?";
        $params[] = $_GET['type'];
        $types .= 's';
    }

    // ===== Filter: Price Range (Overlapping) =====
    // If user searches 50-60, include properties where price_min=55 and price_max=65
    if (isset($_GET['min_price']) && is_numeric($_GET['min_price'])) {
        // Property's price_max should be >= user's min_price
        $where_conditions[] = "(price_max >= ? OR price_max IS NULL)";
        $params[] = floatval($_GET['min_price']);
        $types .= 'd';
    }
    if (isset($_GET['max_price']) && is_numeric($_GET['max_price'])) {
        // Property's price_min should be <= user's max_price
        $where_conditions[] = "(price_min <= ? OR price_min IS NULL)";
        $params[] = floatval($_GET['max_price']);
        $types .= 'd';
    }

    // ===== Filter: Size Range with Unit Conversion =====
    if (isset($_GET['min_size']) || isset($_GET['max_size'])) {
        $size_unit = isset($_GET['size_unit']) ? strtolower(trim($_GET['size_unit'])) : 'gaj';

        // Convert filter sizes to gaj for comparison
        $filter_min_gaj = isset($_GET['min_size']) && is_numeric($_GET['min_size'])
            ? convertToGaj(floatval($_GET['min_size']), $size_unit)
            : null;
        $filter_max_gaj = isset($_GET['max_size']) && is_numeric($_GET['max_size'])
            ? convertToGaj(floatval($_GET['max_size']), $size_unit)
            : null;

        // Build complex WHERE condition for size filtering with unit conversion
        $size_conditions = [];

        if ($filter_min_gaj !== null) {
            $size_conditions[] = "
                CASE 
                    WHEN LOWER(size_unit) = 'gaj' THEN size_max >= ?
                    WHEN LOWER(size_unit) = 'sqft' THEN size_max / 9 >= ?
                    WHEN LOWER(size_unit) = 'marla' THEN size_max * 33 >= ?
                    WHEN LOWER(size_unit) = 'kanal' THEN size_max * 650 >= ?
                    WHEN LOWER(size_unit) = 'acre' THEN size_max * 5100 >= ?
                    ELSE size_max >= ?
                END
            ";
            // Add the same parameter 6 times for each WHEN clause
            $params = array_merge($params, array_fill(0, 6, $filter_min_gaj));
            $types .= str_repeat('d', 6);
        }

        if ($filter_max_gaj !== null) {
            $size_conditions[] = "
                CASE 
                    WHEN LOWER(size_unit) = 'gaj' THEN size_min <= ?
                    WHEN LOWER(size_unit) = 'sqft' THEN size_min / 9 <= ?
                    WHEN LOWER(size_unit) = 'marla' THEN size_min * 24 <= ?
                    WHEN LOWER(size_unit) = 'kanal' THEN size_min * 450 <= ?
                    WHEN LOWER(size_unit) = 'acre' THEN size_min * 4500 <= ?
                    ELSE size_min <= ?
                END
            ";
            $params = array_merge($params, array_fill(0, 6, $filter_max_gaj));
            $types .= str_repeat('d', 6);
        }

        if (!empty($size_conditions)) {
            $where_conditions[] = "(" . implode(" AND ", $size_conditions) . ")";
        }
    }

    // ===== Filter: Size Unit =====
    if (isset($_GET['filter_size_unit']) && $_GET['filter_size_unit'] !== '') {
        $where_conditions[] = "LOWER(size_unit) = LOWER(?)";
        $params[] = $_GET['filter_size_unit'];
        $types .= 's';
    }

    // ===== Filter: Tags (LIKE search, only for own properties) =====
    if (isset($_GET['tags']) && $_GET['tags'] !== '') {
        $where_conditions[] = "(owner_id = ? AND tags LIKE ?)";
        $params[] = $owner_id;
        $params[] = "%{$_GET['tags']}%";
        $types .= 'is';
    }

    // ===== Filter: Location Exists (only for own properties) =====
    if (isset($_GET['has_location'])) {
        $has_location = filter_var($_GET['has_location'], FILTER_VALIDATE_BOOLEAN);
        if ($has_location) {
            $where_conditions[] = "(owner_id = ? AND location IS NOT NULL AND location != '')";
            $params[] = $owner_id;
            $types .= 'i';
        } else {
            $where_conditions[] = "(owner_id = ? AND (location IS NULL OR location = ''))";
            $params[] = $owner_id;
            $types .= 'i';
        }
    }

    // ===== Filter: Landmark Exists =====
    if (isset($_GET['has_landmark'])) {
        $has_landmark = filter_var($_GET['has_landmark'], FILTER_VALIDATE_BOOLEAN);
        if ($has_landmark) {
            $where_conditions[] = "(landmark_location IS NOT NULL AND landmark_location != '')";
        } else {
            $where_conditions[] = "(landmark_location IS NULL OR landmark_location = '')";
        }
    }

    // ===== Filter: For Map (properties with location/landmark) =====
    if ($for_map) {
        // For map view, only show properties that have location or landmark
        // Owner's properties: must have location OR landmark_location
        // Others' properties: must have landmark_location (location is private)
        $where_conditions[] = "
            (
                (owner_id = ? AND (
                    (location IS NOT NULL AND location != '') OR 
                    (landmark_location IS NOT NULL AND landmark_location != '')
                ))
                OR
                (owner_id != ? AND (landmark_location IS NOT NULL AND landmark_location != ''))
            )
        ";
        $params[] = $owner_id;
        $params[] = $owner_id;
        $types .= 'ii';
    }

    // Build WHERE clause
    $where_sql = !empty($where_conditions) ? "WHERE " . implode(" AND ", $where_conditions) : "";

    // ===== Build ORDER BY Clause =====
    $order_clause = "";
    switch ($sortby) {
        case 'price':
            // Average of price_min and price_max
            $order_clause = "((COALESCE(price_min, 0) + COALESCE(price_max, 0)) / 2) {$order}";
            break;
        case 'size':
            // Average of size_min and size_max (converted to gaj for fair comparison)
            $order_clause = "
                (
                    (CASE 
                        WHEN LOWER(size_unit) = 'gaj' THEN COALESCE(size_min, 0)
                        WHEN LOWER(size_unit) = 'sqft' THEN COALESCE(size_min, 0) / 9
                        WHEN LOWER(size_unit) = 'marla' THEN COALESCE(size_min, 0) * 28.5
                        WHEN LOWER(size_unit) = 'kanal' THEN COALESCE(size_min, 0) * 550
                        WHEN LOWER(size_unit) = 'acre' THEN COALESCE(size_min, 0) * 4800
                        ELSE COALESCE(size_min, 0)
                    END +
                    CASE 
                        WHEN LOWER(size_unit) = 'gaj' THEN COALESCE(size_max, 0)
                        WHEN LOWER(size_unit) = 'sqft' THEN COALESCE(size_max, 0) / 9
                        WHEN LOWER(size_unit) = 'marla' THEN COALESCE(size_max, 0) * 28.5
                        WHEN LOWER(size_unit) = 'kanal' THEN COALESCE(size_max, 0) * 550
                        WHEN LOWER(size_unit) = 'acre' THEN COALESCE(size_max, 0) * 4800
                        ELSE COALESCE(size_max, 0)
                    END) / 2
                ) {$order}
            ";
            break;
        case 'id':
        case 'updated_on':
        case 'created_on':
            $order_clause = "{$sortby} {$order}";
            break;
        default:
            // Default to id DESC
            $order_clause = "id DESC";
    }

    // ===== Get Total Count =====
    $count_sql = "SELECT COUNT(*) as total FROM network_properties_view {$where_sql}";
    $count_stmt = $conn->prepare($count_sql);

    if (!empty($params)) {
        $count_stmt->bind_param($types, ...$params);
    }

    $count_stmt->execute();
    $count_result = $count_stmt->get_result();
    $total_records = $count_result->fetch_assoc()['total'];
    $count_stmt->close();

    // ===== Calculate Pagination =====
    $offset = ($page - 1) * $limit;
    $total_pages = ceil($total_records / $limit);

    // ===== Fetch Data =====
    $data_sql = "SELECT * FROM network_properties_view {$where_sql} ORDER BY {$order_clause} LIMIT ? OFFSET ?";
    $data_stmt = $conn->prepare($data_sql);

    $params[] = $limit;
    $params[] = $offset;
    $types .= 'ii';

    $data_stmt->bind_param($types, ...$params);
    $data_stmt->execute();
    $result = $data_stmt->get_result();

    // ===== Process Results =====
    $properties = [];
    while ($row = $result->fetch_assoc()) {
        // Check if this property belongs to the requesting user
        $is_owner = ($row['owner_id'] == $owner_id);

        // Hide private fields if not owner
        if (!$is_owner) {
            $row['note_private'] = null;
            $row['location'] = null;
            $row['location_accuracy'] = null;
            $row['tags'] = null; // Tags are also private
        }

        // Convert boolean fields
        $row['is_public'] = (bool) $row['is_public'];

        // Convert numeric fields
        $row['size_min'] = $row['size_min'] ? floatval($row['size_min']) : null;
        $row['size_max'] = $row['size_max'] ? floatval($row['size_max']) : null;
        $row['price_min'] = $row['price_min'] ? floatval($row['price_min']) : null;
        $row['price_max'] = $row['price_max'] ? floatval($row['price_max']) : null;
        $row['public_rating'] = floatval($row['public_rating']);
        $row['my_rating'] = floatval($row['my_rating']);
        $row['landmark_location_distance'] = $row['landmark_location_distance'] ? intval($row['landmark_location_distance']) : null;

        // Add ownership flag
        $row['is_owner'] = $is_owner;

        $properties[] = $row;
    }

    $data_stmt->close();
    $conn->close();

    // ===== Build Metadata =====
    $meta = [
        'current_page' => $page,
        'per_page' => $limit,
        'total_records' => $total_records,
        'total_pages' => $total_pages,
        'has_next' => $page < $total_pages,
        'has_prev' => $page > 1,
        'for_map' => $for_map,
        'filters_applied' => [
            'owner_id' => $owner_id,
            'list' => $list,
            'search' => $search ?: null,
            'city' => $_GET['city'] ?? null,
            'area' => $_GET['area'] ?? null,
            'type' => $_GET['type'] ?? null,
            'min_price' => $_GET['min_price'] ?? null,
            'max_price' => $_GET['max_price'] ?? null,
            'min_size' => $_GET['min_size'] ?? null,
            'max_size' => $_GET['max_size'] ?? null,
            'size_unit' => $_GET['size_unit'] ?? null,
            'filter_size_unit' => $_GET['filter_size_unit'] ?? null,
            'tags' => $_GET['tags'] ?? null,
            'has_location' => $_GET['has_location'] ?? null,
            'has_landmark' => $_GET['has_landmark'] ?? null,
        ],
        'sorting' => [
            'sortby' => $sortby,
            'order' => $order
        ]
    ];

    // ===== Send Response =====
    sendResponse(true, "Properties fetched successfully", $properties, $meta);

} catch (Exception $e) {
    http_response_code(500);
    sendResponse(false, "Error: " . $e->getMessage());
}
?>

---
action.php
<?php
include('network-config.php');

$conn = new mysqli($host, $user, $pass, $dbname);
if ($conn->connect_error) {
    die(json_encode(["error" => "Database connection failed"]));
}

// ===== Helpers =====
function clean($data)
{
    global $conn;
    return mysqli_real_escape_string($conn, trim((string) $data));
}

// ===== Auth =====
function getBearerToken()
{
    if (isset($_SERVER['HTTP_AUTHORIZATION']))
        return trim($_SERVER['HTTP_AUTHORIZATION']);
    if (function_exists('apache_request_headers')) {
        $h = apache_request_headers();
        if (isset($h['Authorization']))
            return trim($h['Authorization']);
    }
    return null;
}

function out($a)
{
    echo json_encode($a);
    exit();
}

$input = json_decode(file_get_contents("php://input"), true);

$token = $_COOKIE['auth_token'] ?? null;
if (!$token)
    $token = getBearerToken();
if (!$token && isset($input['token']))
    $token = $input['token'];
if (!$token && isset($_GET['token']))
    $token = $_GET['token'];

$owner_id = 0;
if ($token) {
    if (preg_match('/Bearer\s(.+)/', $token, $m))
        $token = $m[1];

    $stmt = $conn->prepare("SELECT id FROM network_users WHERE token=?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $stmt->bind_result($uid);
    if ($stmt->fetch())
        $owner_id = intval($uid);
    $stmt->close();
}

$action = $_GET['action'] ?? '';

// ====================================================================
// 6) add_property
// ====================================================================
if ($action === 'add_property') {
    $data = json_decode(file_get_contents("php://input"), true);

    $oid = intval($data['owner_id']);
    if ($oid <= 0)
        out(["error" => "owner_id required"]);

    $city = clean($data['city'] ?? '');
    $area = clean($data['area'] ?? '');
    $type = clean($data['type'] ?? '');
    $description = clean($data['description'] ?? '');
    $note_private = clean($data['note_private'] ?? '');
    $size_min = floatval($data['size_min'] ?? 0);
    $size_max = floatval($data['size_max'] ?? 0);
    $size_unit = clean($data['size_unit'] ?? '');
    $price_min = floatval($data['price_min'] ?? 0);
    $price_max = floatval($data['price_max'] ?? 0);
    $location = clean($data['location'] ?? '');
    $location_accuracy = clean($data['location_accuracy'] ?? '');
    $is_public = intval($data['is_public'] ?? 1);
    $tags = clean($data['tags'] ?? '');
    $highlights = clean($data['highlights'] ?? '');
    $public_rating = floatval($data['public_rating'] ?? 0);
    $my_rating = floatval($data['my_rating'] ?? 0);

    $sql = "INSERT INTO network_properties
        (owner_id, city, area, type, description, note_private,
        size_min, size_max, size_unit, price_min, price_max,
        location, location_accuracy, is_public, public_rating, my_rating, tags, highlights)
    VALUES (
        $oid,'$city','$area','$type','$description','$note_private',
        $size_min,$size_max,'$size_unit',$price_min,$price_max,
        '$location','$location_accuracy',$is_public,$public_rating,$my_rating,
        '$tags','$highlights'
    )";

    if ($conn->query($sql))
        out(["success" => true, "id" => $conn->insert_id]);

    out(["error" => $conn->error]);
}

// ====================================================================
// 7) update_property
// ====================================================================
if ($action === 'update_property') {
    $data = json_decode(file_get_contents("php://input"), true);

    $id = intval($data['id']);
    $oid = intval($data['owner_id']);

    if ($id <= 0 || $oid <= 0)
        out(["error" => "id/owner_id missing"]);

    $updates = [];
    foreach ($data as $k => $v) {
        if (in_array($k, ['id', 'owner_id']))
            continue;
        $updates[] = "`$k`='" . clean($v) . "'";
    }

    if (!$updates)
        out(["success" => true]);

    $sql = "UPDATE network_properties SET " . implode(",", $updates) . " WHERE id=$id AND owner_id=$oid";

    if ($conn->query($sql))
        out(["success" => true]);

    out(["error" => $conn->error]);
}

// ====================================================================
// 8) delete_property
// ====================================================================
if ($action === 'delete_property') {
    $id = intval($_GET['id'] ?? 0);
    $oid = intval($_GET['owner_id'] ?? 0);

    if ($id <= 0 || $oid <= 0)
        out(["error" => "id/owner_id missing"]);

    if ($conn->query("DELETE FROM network_properties WHERE id=$id AND owner_id=$oid"))
        out(["success" => true]);

    out(["error" => $conn->error]);
}

// ===== DEFAULT =====
out(["error" => "Invalid action"]);

