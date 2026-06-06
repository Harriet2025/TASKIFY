<?php
define('DB_HOST', getenv('DB_HOST') ?: 'rur2ip7hb6uxy4elmruu444s');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_USER', getenv('DB_USER') ?: 'mysql');
define('DB_PASS', getenv('DB_PASS') ?: 'CnkdYZ2dr7cO2VMW2uv5foHRbPmDpkeQsyWHXKfVNZKW6eHbFRY0A9TmeNnVMhmK');
define('DB_NAME', getenv('DB_NAME') ?: 'default');

function getConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME, (int)DB_PORT);
    if ($conn->connect_error) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database connection failed: ' . $conn->connect_error]);
        exit;
    }
    $conn->set_charset('utf8mb4');
    return $conn;
}

function jsonResponse($data, int $status = 200): void {
    http_response_code($status);
    header('Content-Type: application/json');
    echo json_encode($data);
    exit;
}

function setCorsHeaders(): void {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
