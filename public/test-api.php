<?php
/**
 * API Test Script - Delete after debugging
 */

header('Content-Type: application/json');

// Test 1: Basic PHP
$results = [
    'php_version' => PHP_VERSION,
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'N/A',
    'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'N/A',
    'document_root' => $_SERVER['DOCUMENT_ROOT'] ?? 'N/A',
];

// Test 2: Check .env file
$envFile = dirname(__DIR__) . '/.env';
$results['env_file_exists'] = file_exists($envFile);
$results['env_file_path'] = $envFile;

// Test 3: Check database config
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            if (in_array($key, ['DB_DRIVER', 'DB_DATABASE', 'APP_DEBUG'])) {
                $results['env'][$key] = trim($value, " \t\n\r\0\x0B\"'");
            }
        }
    }
}

// Test 4: Check SQLite database
if (isset($results['env']['DB_DATABASE'])) {
    $dbPath = $results['env']['DB_DATABASE'];
    // Handle relative path
    if (strpos($dbPath, '/') !== 0) {
        $dbPath = dirname(__DIR__) . '/' . $dbPath;
    }
    $results['db_path'] = $dbPath;
    $results['db_exists'] = file_exists($dbPath);
    $results['db_readable'] = is_readable($dbPath);
    $results['db_writable'] = is_writable($dbPath);
    
    if ($results['db_exists'] && $results['db_readable']) {
        try {
            $pdo = new PDO('sqlite:' . $dbPath);
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            
            // Check users table
            $stmt = $pdo->query("SELECT COUNT(*) as count FROM users");
            $results['users_count'] = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
            
            $results['db_connection'] = 'OK';
        } catch (Exception $e) {
            $results['db_connection'] = 'ERROR: ' . $e->getMessage();
        }
    }
}

// Test 5: Check src directory
$srcDir = dirname(__DIR__) . '/src';
$results['src_exists'] = is_dir($srcDir);
$results['routes_exists'] = file_exists($srcDir . '/Routes/api.php');

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
