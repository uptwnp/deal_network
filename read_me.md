Api - https://prop.digiheadway.in/api/network.php

<?php
// ===========================================
// Network Properties API (Enhanced, Backward-Compatible)
// - Same actions, params style, and flat-array responses
// - Strict access control: user sees/edits only his + public
// - Lists: user/public/both with pagination (default 40)
// - Search: list scope + column control (All / All General / column)
// - Filters: column-based; size/price act as ranges
// ===========================================

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// ===== DB =====
$host = "localhost";
$user = "u240376517_propdb";
$pass = "Y*Q;5gIOp2";
$dbname = "u240376517_propdb";

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

function getInt($key, $default = 0)
{
    return isset($_GET[$key]) ? intval($_GET[$key]) : $default;
}

function getFloat($key)
{
    return isset($_GET[$key]) && $_GET[$key] !== '' ? floatval($_GET[$key]) : null;
}

function paginationSql(&$meta = null)
{
    // default 40, cap 100; page starts from 1
    $page = max(1, getInt('page', 1));
    $per = min(100, max(1, getInt('per_page', 40)));
    $offset = ($page - 1) * $per;
    if (is_array($meta)) {
        $meta['page'] = $page;
        $meta['per_page'] = $per;
    }
    return " LIMIT $per OFFSET $offset ";
}

// Build visibility scope WHERE fragment
// list = mine | public | both
function scopeWhere($list, $owner_id)
{
    $oid = intval($owner_id);
    $list = strtolower((string) $list);
    if ($list === 'mine')
        return " (owner_id = $oid) ";
    if ($list === 'public')
        return " (is_public = 1 AND owner_id <> $oid) ";
    // default both
    return " (owner_id = $oid OR (is_public = 1 AND owner_id <> $oid)) ";
}

// Whitelists for search/filters
$ALLOWED_COLUMNS_ALL = [
    'city',
    'area',
    'type',
    'description',
    'note_private',
    'min_size',
    'size_max',
    'size_unit',
    'price_min',
    'price_max',
    'location',
    'location_accuracy',
    'tags',
    'highlights'
];
$ALL_GENERAL = [
    'city',
    'area',
    'type',
    'description',
    'min_size',
    'size_max',
    'size_unit',
    'price_min',
    'price_max',
    'location',
    'location_accuracy',
    'highlights'
];
// Additional owner fields (for possible joins/future use, not used in queries here)
$OWNER_FIELDS = [
    'id',
    'name',
    'phone',
    'firm_name',
    'area_covers',
    'city_covers',
    'type',
    'password',
    'default_area',
    'default_city',
    'default_type',
    'token',
    'created_on'
];

// ===== Auth check (get token → get owner_id) =====

// get token from Authorization header, cookie, POST, or query
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

$input = json_decode(file_get_contents("php://input"), true);

$token = $_COOKIE['auth_token'] ?? null;
if (!$token)
    $token = getBearerToken();
if (!$token && isset($input['token']))
    $token = trim($input['token']);
if (!$token && isset($_GET['token']))
    $token = trim($_GET['token']);

// get user id from token
$owner_id = 0;
if ($token) {
    $stmt = $conn->prepare("SELECT id FROM users WHERE token = ?");
    $stmt->bind_param("s", $token);
    $stmt->execute();
    $stmt->bind_result($uid);
    if ($stmt->fetch()) {
        $owner_id = intval($uid);
    }
    $stmt->close();
}

// ===== Read base params =====
$action = isset($_GET['action']) ? $_GET['action'] : '';

// Actions that require a logged-in owner
$needs_owner = [
    'get_user_properties',
    'get_public_properties',
    'get_all_properties',
    'search_properties',
    'filter_properties',
    'update_property',
    'delete_property',
    'add_property'
];

// If action needs owner and not logged in
if (in_array($action, $needs_owner) && $owner_id <= 0) {
    echo json_encode(["error" => "Authentication required or invalid token"]);
    exit;
}


// ===========================================
// 1️⃣ FETCH PROPERTIES OF INDIVIDUAL USER (paginated)
// GET: action=get_user_properties&owner_id=1&[page=1&per_page=40]
// ===========================================
if ($action === 'get_user_properties') {
    $meta = [];
    $limit = paginationSql($meta);
    $sql = "SELECT * FROM network_properties WHERE owner_id = $owner_id ORDER BY id DESC $limit";
    $res = $conn->query($sql);
    echo json_encode($res ? $res->fetch_all(MYSQLI_ASSOC) : []);
    exit;
}

// ===========================================
// 2️⃣ FETCH PUBLIC PROPERTIES (paginated, excludes owner)
// GET: action=get_public_properties&owner_id=1&[page=1&per_page=40]
// ===========================================
if ($action === 'get_public_properties') {
    $meta = [];
    $limit = paginationSql($meta);
    $sql = "SELECT * FROM network_properties WHERE is_public = 1 AND owner_id <> $owner_id ORDER BY id DESC $limit";
    $res = $conn->query($sql);
    echo json_encode($res ? $res->fetch_all(MYSQLI_ASSOC) : []);
    exit;
}

// ===========================================
// 2.1️⃣ FETCH BOTH (owner + public) (paginated)
// GET: action=get_all_properties&owner_id=1&[page=1&per_page=40]
// ===========================================
if ($action === 'get_all_properties') {
    $meta = [];
    $limit = paginationSql($meta);
    $sql = "SELECT * FROM network_properties WHERE owner_id = $owner_id OR (is_public = 1 AND owner_id <> $owner_id) ORDER BY id DESC $limit";
    $res = $conn->query($sql);
    echo json_encode($res ? $res->fetch_all(MYSQLI_ASSOC) : []);
    exit;
}

// ===========================================
// 3️⃣ ADD NEW PROPERTY (owner-scoped)
// POST JSON: { owner_id, city, area, ... }
// ===========================================
if ($action === 'add_property') {
    $data = json_decode(file_get_contents("php://input"), true);

    $owner_id = intval($data['owner_id'] ?? 0);
    if ($owner_id <= 0) {
        echo json_encode(["error" => "owner_id not provided"]);
        exit;
    }

    $city = clean($data['city'] ?? '');
    $area = clean($data['area'] ?? '');
    $type = clean($data['type'] ?? '');
    $description = clean($data['description'] ?? '');
    $note_private = clean($data['note_private'] ?? '');
    $min_size = floatval($data['min_size'] ?? 0);
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

    $sql = "INSERT INTO network_properties (
                owner_id, city, area, type, description, note_private, 
                min_size, size_max, size_unit, price_min, price_max, 
                location, location_accuracy, is_public, public_rating, my_rating, tags, highlights
            ) VALUES (
                $owner_id, '$city', '$area', '$type', '$description', '$note_private',
                $min_size, $size_max, '$size_unit', $price_min, $price_max,
                '$location', '$location_accuracy', $is_public, $public_rating, $my_rating, '$tags', '$highlights'
            )";

    if ($conn->query($sql)) {
        echo json_encode(["success" => true, "id" => $conn->insert_id]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
    exit;
}

// ===========================================
// 4️⃣ UPDATE PROPERTY (ONLY OWNER CAN UPDATE)
// POST JSON: { id, owner_id, ...fields... }
// ===========================================
if ($action === 'update_property') {
    $data = json_decode(file_get_contents("php://input"), true);
    $id = intval($data['id'] ?? 0);
    $oid = intval($data['owner_id'] ?? 0);
    if ($id <= 0 || $oid <= 0) {
        echo json_encode(["error" => "id/owner_id missing"]);
        exit;
    }

    $updates = [];
    foreach ($data as $key => $val) {
        if (in_array($key, ['id', 'owner_id']))
            continue;
        $updates[] = "`$key`='" . clean($val) . "'";
    }
    if (empty($updates)) {
        echo json_encode(["success" => true]);
        exit;
    }

    $update_str = implode(",", $updates);
    $sql = "UPDATE network_properties SET $update_str WHERE id = $id AND owner_id = $oid";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
    exit;
}

// ===========================================
// 5️⃣ DELETE PROPERTY (ONLY OWNER CAN DELETE)
// GET: action=delete_property&id=...&owner_id=...
// ===========================================
if ($action === 'delete_property') {
    $id = intval($_GET['id'] ?? 0);
    $oid = intval($_GET['owner_id'] ?? 0);
    if ($id <= 0 || $oid <= 0) {
        echo json_encode(["error" => "id/owner_id missing"]);
        exit;
    }

    $sql = "DELETE FROM network_properties WHERE id = $id AND owner_id = $oid";
    if ($conn->query($sql)) {
        echo json_encode(["success" => true]);
    } else {
        echo json_encode(["error" => $conn->error]);
    }
    exit;
}

// ===========================================
// 6️⃣ FILTER PROPERTIES (list scope + column filters + range logic) (paginated)
// GET: action=filter_properties&owner_id=1&list=mine|public|both
//      &city=&area=&type=&description=&note_private=&size_unit=
//      &min_size=&max_size=&price_min=&price_max=
//      &location=&location_accuracy=&tags=&highlights=
//      &[page=1&per_page=40]
// Notes:
// - size/price behave as ranges:
//   * if min_size is given => min_size >= value
//   * if max_size is given => size_max <= value
//   * if price_min is given => price_min >= value
//   * if price_max is given => price_max <= value
// ===========================================
if ($action === 'filter_properties') {
    $list = isset($_GET['list']) ? $_GET['list'] : 'both';
    $filters = [];
    $filters[] = scopeWhere($list, $owner_id);

    // Column-based equals / LIKE where obvious text fields
    $mapEquals = ['city', 'area', 'type', 'size_unit', 'location_accuracy'];
    $mapLike = ['description', 'note_private', 'location', 'tags', 'highlights'];

    foreach ($mapEquals as $col) {
        if (isset($_GET[$col]) && $_GET[$col] !== '') {
            $filters[] = "$col = '" . clean($_GET[$col]) . "'";
        }
    }
    foreach ($mapLike as $col) {
        if (isset($_GET[$col]) && $_GET[$col] !== '') {
            $filters[] = "$col LIKE '%" . clean($_GET[$col]) . "%'";
        }
    }

    // Range semantics
    $min_size_q = getFloat('min_size'); // user filter lower bound for min_size
    $max_size_q = getFloat('max_size'); // user filter upper bound for size_max
    $price_min_q = getFloat('price_min'); // lower bound for price_min
    $price_max_q = getFloat('price_max'); // upper bound for price_max

    if ($min_size_q !== null)
        $filters[] = "min_size >= $min_size_q";
    if ($max_size_q !== null)
        $filters[] = "size_max <= $max_size_q";
    if ($price_min_q !== null)
        $filters[] = "price_min >= $price_min_q";
    if ($price_max_q !== null)
        $filters[] = "price_max <= $price_max_q";

    $where = "WHERE " . implode(" AND ", $filters);
    $meta = [];
    $limit = paginationSql($meta);
    $sql = "SELECT * FROM network_properties $where ORDER BY id DESC $limit";
    $res = $conn->query($sql);
    echo json_encode($res ? $res->fetch_all(MYSQLI_ASSOC) : []);
    exit;
}

// ===========================================
// 7️⃣ SEARCH PROPERTIES (list scope + column control) (paginated)
// GET: action=search_properties&owner_id=1&list=mine|public|both
//      &query=...&column=All|All%20General|city|area|type|description|note_private|min_size|size_max|size_unit|price_min|price_max|location|location_accuracy|tags|highlights
//      &[page=1&per_page=40]
// Rules:
// - list controls visibility (mine/public/both)
// - column=All     -> search in all allowed columns
// - column=All General -> search in allowed columns except note_private, tags
// - column=<specific> -> search only that column
// - Numeric columns (min_size, size_max, price_min, price_max) will match exact or >=/<= if query is a number (simple LIKE fallback for non-numeric input).
// ===========================================
if ($action === 'search_properties') {
    $list = isset($_GET['list']) ? $_GET['list'] : 'both';
    $search = isset($_GET['query']) ? clean($_GET['query']) : '';
    $column = isset($_GET['column']) ? $_GET['column'] : 'All';

    $visibility = scopeWhere($list, $owner_id);
    $wheres = [$visibility];

    // Decide target columns
    $targetCols = [];
    if (strcasecmp($column, 'All') === 0) {
        $targetCols = $ALLOWED_COLUMNS_ALL;
    } elseif (strcasecmp($column, 'All General') === 0) {
        $targetCols = $ALL_GENERAL;
    } else {
        $c = clean($column);
        if (in_array($c, $ALLOWED_COLUMNS_ALL)) {
            $targetCols = [$c];
        } else {
            echo json_encode([]); // invalid column -> empty result (keeps response shape)
            exit;
        }
    }

    // Build OR group
    $ors = [];
    foreach ($targetCols as $col) {
        // Numeric handling for known numeric fields
        if (in_array($col, ['min_size', 'size_max', 'price_min', 'price_max'])) {
            if (is_numeric($search)) {
                // For search, choose nearest intuitive operator:
                // min_size/price_min -> >= value, size_max/price_max -> <= value
                $num = floatval($search);
                if ($col === 'min_size' || $col === 'price_min') {
                    $ors[] = "$col >= $num";
                } else {
                    $ors[] = "$col <= $num";
                }
            } else {
                $ors[] = "$col LIKE '%$search%'";
            }
        } else {
            $ors[] = "$col LIKE '%$search%'";
        }
    }

    if (!empty($ors)) {
        $wheres[] = "(" . implode(" OR ", $ors) . ")";
    }

    $where = "WHERE " . implode(" AND ", $wheres);
    $meta = [];
    $limit = paginationSql($meta);
    $sql = "SELECT * FROM network_properties $where ORDER BY id DESC $limit";
    $res = $conn->query($sql);
    echo json_encode($res ? $res->fetch_all(MYSQLI_ASSOC) : []);
    exit;
}

// ===========================================
// Default
// ===========================================
echo json_encode(["error" => "Invalid action"]);
