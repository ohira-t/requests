<?php
/**
 * Debug Session - Delete after testing
 */

header('Content-Type: application/json');

// Load environment
$envFile = dirname(__DIR__) . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value, " \t\n\r\0\x0B\"'");
        }
    }
}

$results = [
    'env' => [
        'APP_ENV' => $_ENV['APP_ENV'] ?? 'not set',
        'APP_DEBUG' => $_ENV['APP_DEBUG'] ?? 'not set',
    ],
    'session' => [
        'cookie_secure_setting' => ($_ENV['APP_ENV'] ?? 'production') === 'production',
        'is_https' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'session_id' => session_id() ?: 'not started',
    ],
    'cookies_received' => $_COOKIE,
    'request_info' => [
        'REQUEST_URI' => $_SERVER['REQUEST_URI'] ?? 'N/A',
        'HTTP_HOST' => $_SERVER['HTTP_HOST'] ?? 'N/A',
    ],
];

// Try to start session with new name
ini_set('session.cookie_path', '/');
ini_set('session.cookie_httponly', '1');
ini_set('session.cookie_secure', !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? '1' : '0');
ini_set('session.cookie_samesite', 'Lax');
session_name('requests_sess');

// Check if session save path is writable
$savePath = session_save_path() ?: sys_get_temp_dir();
$results['session']['save_path'] = $savePath;
$results['session']['save_path_writable'] = is_writable($savePath);

session_start();

$results['session']['session_id_after_start'] = session_id();
$results['session']['session_data'] = $_SESSION;
$results['session']['is_logged_in'] = isset($_SESSION['user']);

// Check if user is in session
if (isset($_SESSION['user'])) {
    $results['user'] = [
        'id' => $_SESSION['user']['id'] ?? 'N/A',
        'name' => $_SESSION['user']['name'] ?? 'N/A',
        'role' => $_SESSION['user']['role'] ?? 'N/A',
    ];
}

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
