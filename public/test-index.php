<?php
/**
 * Test index.php routing logic (updated)
 */

header('Content-Type: application/json');

// Simulate what index.php does
$method = $_SERVER['REQUEST_METHOD'];
$uri = $_SERVER['REQUEST_URI'];

$results = [
    'step1_original' => [
        'method' => $method,
        'uri' => $uri,
    ],
];

// Remove query string
$uri = parse_url($uri, PHP_URL_PATH);
$results['step2_without_query'] = $uri;

// New base path logic
$scriptName = $_SERVER['SCRIPT_NAME'];
$scriptDir = dirname($scriptName);
$results['step3_script_name'] = $scriptName;
$results['step3_script_dir'] = $scriptDir;

if ($scriptDir !== '/') {
    if (strpos($uri, $scriptDir) === 0) {
        $uri = substr($uri, strlen($scriptDir));
        $results['step4_matched'] = 'full script dir';
    } else {
        $parentDir = dirname($scriptDir);
        if ($parentDir !== '/' && strpos($uri, $parentDir) === 0) {
            $uri = substr($uri, strlen($parentDir));
            $results['step4_matched'] = 'parent dir: ' . $parentDir;
        }
    }
}

if (empty($uri) || $uri[0] !== '/') {
    $uri = '/' . $uri;
}

$results['step5_final_uri'] = $uri;

// Check if this is an API request
$results['step6_is_api'] = strpos($uri, '/api/') === 0;

// Simulate API route test
$results['test_api_login'] = '/api/auth/login';
$results['would_match_api'] = strpos('/api/auth/login', '/api/') === 0;

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
