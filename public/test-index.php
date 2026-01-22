<?php
/**
 * Test index.php routing logic
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

// Remove base path logic from index.php
$scriptName = dirname($_SERVER['SCRIPT_NAME']);
$results['step3_script_name_dir'] = $scriptName;

if ($scriptName !== '/' && strpos($uri, $scriptName) === 0) {
    $uri = substr($uri, strlen($scriptName));
}
$results['step4_after_base_removal'] = $uri;

// Check if this is an API request
$results['step5_is_api'] = strpos($uri, '/api/') === 0;
$results['step6_strpos_result'] = strpos($uri, '/api/');

// What the URI should be for API routing
$results['expected_uri_for_api'] = '/api/auth/login';
$results['current_uri_matches'] = ($uri === '/api/auth/login');

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
