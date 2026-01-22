<?php
/**
 * Rewrite Test - Check if .htaccess is working
 */

header('Content-Type: application/json');

$results = [
    'test' => 'rewrite check',
    'request_uri' => $_SERVER['REQUEST_URI'] ?? 'N/A',
    'query_string' => $_SERVER['QUERY_STRING'] ?? 'N/A',
    'path_info' => $_SERVER['PATH_INFO'] ?? 'N/A',
    'orig_path_info' => $_SERVER['ORIG_PATH_INFO'] ?? 'N/A',
    'redirect_url' => $_SERVER['REDIRECT_URL'] ?? 'N/A',
    'script_name' => $_SERVER['SCRIPT_NAME'] ?? 'N/A',
    'php_self' => $_SERVER['PHP_SELF'] ?? 'N/A',
    'htaccess_test' => 'If you see this via /requests/rewrite-test, htaccess is working',
];

echo json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
