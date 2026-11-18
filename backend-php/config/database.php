<?php
// Database configuration for DigitalDocs Solutions
define('DB_HOST', 'localhost');
define('DB_NAME', 'dds_db');
define('DB_USER', 'dds_user');
define('DB_PASS', 'DdsSecure_2026!Px');
define('ADMIN_EMAIL', 'adiiopase@gmail.com');
define('ADMIN_PIN', '1957');
define('JWT_SECRET', 'dds_secret_key_2026_super_secure_hash_89412');

function getDbConnection() {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
        $options = [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "Database connection error: " . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}
