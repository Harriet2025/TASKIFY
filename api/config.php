<?php
// ── InfinityFree Database Configuration ──────────────────────────────────────
// Fill these in from your InfinityFree control panel → MySQL Databases
// Panel URL: https://cpanel.infinityfree.net

define('DB_HOST', 'sql309.infinityfree.com');   // your MySQL host from cPanel
define('DB_USER', 'your_db_username');           // e.g. if123456_taskify
define('DB_PASS', 'your_db_password');           // the password you set
define('DB_NAME', 'your_db_name');               // e.g. if123456_taskify

function getConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    if ($conn->connect_error) {
        http_response_code(500);
        header('Content-Type: application/json');
        echo json_encode(['error' => 'Database connection failed']);
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
