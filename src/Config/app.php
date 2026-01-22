<?php

return [
    'name' => $_ENV['APP_NAME'] ?? 'GLUG Reminders',
    'env' => $_ENV['APP_ENV'] ?? 'production',
    'debug' => filter_var($_ENV['APP_DEBUG'] ?? false, FILTER_VALIDATE_BOOLEAN),
    'url' => $_ENV['APP_URL'] ?? 'http://localhost',
    'timezone' => $_ENV['APP_TIMEZONE'] ?? 'Asia/Tokyo',
    
    'session' => [
        'lifetime' => (int)($_ENV['SESSION_LIFETIME'] ?? 1440), // minutes
        'cookie_name' => 'glug_session',
        'cookie_secure' => ($_ENV['APP_ENV'] ?? 'production') === 'production',
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
    ],
    
    'pagination' => [
        'per_page' => 50,
    ],
    
    'priorities' => [
        'urgent' => ['label' => '緊急', 'color' => '#FF3B30'],
        'high' => ['label' => '高', 'color' => '#FF9500'],
        'medium' => ['label' => '中', 'color' => '#007AFF'],
        'low' => ['label' => '低', 'color' => '#8E8E93'],
    ],
    
    'statuses' => [
        'backlog' => ['label' => 'バックログ', 'color' => '#8E8E93'],
        'todo' => ['label' => 'ToDo', 'color' => '#007AFF'],
        'in_progress' => ['label' => '進行中', 'color' => '#FF9500'],
        'done' => ['label' => '完了', 'color' => '#34C759'],
        'cancelled' => ['label' => 'キャンセル', 'color' => '#FF3B30'],
    ],
    
    'default_categories' => [
        ['name' => '開発', 'color' => '#3B82F6'],
        ['name' => 'デザイン', 'color' => '#EC4899'],
        ['name' => '営業', 'color' => '#22C55E'],
        ['name' => 'サポート', 'color' => '#F59E0B'],
        ['name' => 'コンテンツ', 'color' => '#8B5CF6'],
        ['name' => 'リサーチ', 'color' => '#06B6D4'],
    ],
];
