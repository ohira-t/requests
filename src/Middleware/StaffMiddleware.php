<?php

namespace App\Middleware;

use App\Utils\Session;
use App\Utils\Response;

class StaffMiddleware
{
    public static function handle(): ?array
    {
        $user = AuthMiddleware::handle();
        
        if (!$user) {
            return null;
        }
        
        if (!in_array($user['role'], ['admin', 'staff'])) {
            Response::forbidden('スタッフ権限が必要です');
            return null;
        }
        
        return $user;
    }
}
