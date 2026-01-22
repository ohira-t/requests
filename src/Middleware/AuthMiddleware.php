<?php

namespace App\Middleware;

use App\Utils\Session;
use App\Utils\Response;

class AuthMiddleware
{
    public static function handle(): ?array
    {
        Session::start();
        
        if (!Session::isLoggedIn()) {
            Response::unauthorized('ログインが必要です');
            return null;
        }
        
        $user = Session::getUser();
        
        if (!$user) {
            Session::logout();
            Response::unauthorized('セッションが無効です');
            return null;
        }
        
        return $user;
    }
    
    public static function check(): bool
    {
        Session::start();
        return Session::isLoggedIn();
    }
    
    public static function user(): ?array
    {
        Session::start();
        return Session::getUser();
    }
}
