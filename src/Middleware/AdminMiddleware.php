<?php

namespace App\Middleware;

use App\Utils\Session;
use App\Utils\Response;

class AdminMiddleware
{
    public static function handle(): ?array
    {
        $user = AuthMiddleware::handle();
        
        if (!$user) {
            return null;
        }
        
        if ($user['role'] !== 'admin') {
            Response::forbidden('管理者権限が必要です');
            return null;
        }
        
        return $user;
    }
}
