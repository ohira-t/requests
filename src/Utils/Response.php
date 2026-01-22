<?php

namespace App\Utils;

class Response
{
    public static function json($data, int $statusCode = 200): void
    {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }
    
    public static function success($data = null, int $statusCode = 200): void
    {
        self::json([
            'success' => true,
            'data' => $data
        ], $statusCode);
    }
    
    public static function created($data = null): void
    {
        self::success($data, 201);
    }
    
    public static function error(string $code, string $message, int $statusCode = 400): void
    {
        self::json([
            'success' => false,
            'error' => [
                'code' => $code,
                'message' => $message
            ]
        ], $statusCode);
    }
    
    public static function notFound(string $message = 'リソースが見つかりません'): void
    {
        self::error('NOT_FOUND', $message, 404);
    }
    
    public static function unauthorized(string $message = '認証が必要です'): void
    {
        self::error('UNAUTHORIZED', $message, 401);
    }
    
    public static function forbidden(string $message = 'アクセス権限がありません'): void
    {
        self::error('FORBIDDEN', $message, 403);
    }
    
    public static function validationError(array $errors): void
    {
        self::json([
            'success' => false,
            'error' => [
                'code' => 'VALIDATION_ERROR',
                'message' => 'バリデーションエラー',
                'details' => $errors
            ]
        ], 422);
    }
    
    public static function serverError(string $message = 'サーバーエラーが発生しました'): void
    {
        self::error('SERVER_ERROR', $message, 500);
    }
}
