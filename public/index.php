<?php

/**
 * GLUG Reminders - Entry Point
 */

// Error reporting
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Define base path
define('BASE_PATH', dirname(__DIR__));

// Autoload
$autoloadPath = BASE_PATH . '/vendor/autoload.php';
if (file_exists($autoloadPath)) {
    require $autoloadPath;
}

// Load environment variables
$envFile = BASE_PATH . '/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B\"'");
            $_ENV[$key] = $value;
            putenv("{$key}={$value}");
        }
    }
}

// Set timezone
date_default_timezone_set($_ENV['APP_TIMEZONE'] ?? 'Asia/Tokyo');

// Simple autoloader for App namespace
spl_autoload_register(function ($class) {
    $prefix = 'App\\';
    $baseDir = BASE_PATH . '/src/';
    
    $len = strlen($prefix);
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relativeClass = substr($class, $len);
    $file = $baseDir . str_replace('\\', '/', $relativeClass) . '.php';
    
    if (file_exists($file)) {
        require $file;
    }
});

// Handle CORS
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-CSRF-Token');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Get request info
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

// Remove query string
$uri = parse_url($uri, PHP_URL_PATH);

// Remove base path if needed
// Handle case where SCRIPT_NAME is /requests/public/index.php but URI is /requests/...
$scriptName = $_SERVER['SCRIPT_NAME']; // e.g., /requests/public/index.php
$scriptDir = dirname($scriptName);      // e.g., /requests/public

// Try to find the common base path between URI and script directory
// URI: /requests/api/auth/login
// Script dir: /requests/public
// We need to strip /requests from URI

if ($scriptDir !== '/') {
    // Check if URI starts with full script directory (e.g., /requests/public)
    if (strpos($uri, $scriptDir) === 0) {
        $uri = substr($uri, strlen($scriptDir));
    } else {
        // Check if there's a parent directory match (e.g., /requests)
        $parentDir = dirname($scriptDir); // e.g., /requests
        if ($parentDir !== '/' && strpos($uri, $parentDir) === 0) {
            $uri = substr($uri, strlen($parentDir));
        }
    }
}

// Ensure URI starts with /
if (empty($uri) || $uri[0] !== '/') {
    $uri = '/' . $uri;
}

// Route the request
use App\Routes\Router;
use App\Utils\Response;

// Check if this is an API request
if (strpos($uri, '/api/') === 0) {
    header('Content-Type: application/json; charset=utf-8');
    
    try {
        require BASE_PATH . '/src/Routes/api.php';
        $router = \App\Routes\registerRoutes();
        
        if (!$router->dispatch($method, $uri)) {
            Response::notFound('エンドポイントが見つかりません');
        }
    } catch (\PDOException $e) {
        if (($_ENV['APP_DEBUG'] ?? false) === 'true') {
            Response::error('DATABASE_ERROR', $e->getMessage(), 500);
        } else {
            Response::serverError('データベースエラーが発生しました');
        }
    } catch (\Exception $e) {
        if (($_ENV['APP_DEBUG'] ?? false) === 'true') {
            Response::error('SERVER_ERROR', $e->getMessage(), 500);
        } else {
            Response::serverError();
        }
    }
    exit;
}

// Serve static files or SPA
$requestPath = parse_url($uri, PHP_URL_PATH);
$filePath = __DIR__ . $requestPath;

// Check for static files
if ($requestPath !== '/' && file_exists($filePath) && is_file($filePath)) {
    $extension = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'css' => 'text/css',
        'js' => 'application/javascript',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
    ];
    
    if (isset($mimeTypes[$extension])) {
        header('Content-Type: ' . $mimeTypes[$extension]);
    }
    
    readfile($filePath);
    exit;
}

// Serve the main HTML file (SPA)
require __DIR__ . '/app.html';
