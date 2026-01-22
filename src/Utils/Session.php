<?php

namespace App\Utils;

class Session
{
    private static bool $started = false;
    
    public static function start(): void
    {
        if (self::$started) {
            return;
        }
        
        $config = require __DIR__ . '/../Config/app.php';
        $sessionConfig = $config['session'];
        
        ini_set('session.cookie_httponly', $sessionConfig['cookie_httponly'] ? '1' : '0');
        ini_set('session.cookie_secure', $sessionConfig['cookie_secure'] ? '1' : '0');
        ini_set('session.cookie_samesite', $sessionConfig['cookie_samesite']);
        ini_set('session.cookie_path', '/');
        ini_set('session.gc_maxlifetime', $sessionConfig['lifetime'] * 60);
        
        session_name($sessionConfig['cookie_name']);
        session_set_cookie_params([
            'lifetime' => $sessionConfig['lifetime'] * 60,
            'path' => '/',
            'httponly' => $sessionConfig['cookie_httponly'],
            'secure' => $sessionConfig['cookie_secure'],
            'samesite' => $sessionConfig['cookie_samesite'],
        ]);
        session_start();
        
        self::$started = true;
        
        // Check session timeout
        if (isset($_SESSION['last_activity'])) {
            $inactive = time() - $_SESSION['last_activity'];
            if ($inactive > ($sessionConfig['lifetime'] * 60)) {
                self::destroy();
                return;
            }
        }
        
        $_SESSION['last_activity'] = time();
    }
    
    public static function set(string $key, $value): void
    {
        $_SESSION[$key] = $value;
    }
    
    public static function get(string $key, $default = null)
    {
        return $_SESSION[$key] ?? $default;
    }
    
    public static function has(string $key): bool
    {
        return isset($_SESSION[$key]);
    }
    
    public static function remove(string $key): void
    {
        unset($_SESSION[$key]);
    }
    
    public static function destroy(): void
    {
        $_SESSION = [];
        
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params['path'],
                $params['domain'],
                $params['secure'],
                $params['httponly']
            );
        }
        
        session_destroy();
        self::$started = false;
    }
    
    public static function regenerate(): void
    {
        session_regenerate_id(true);
    }
    
    public static function flash(string $key, $value): void
    {
        $_SESSION['_flash'][$key] = $value;
    }
    
    public static function getFlash(string $key, $default = null)
    {
        $value = $_SESSION['_flash'][$key] ?? $default;
        unset($_SESSION['_flash'][$key]);
        return $value;
    }
    
    public static function generateCsrfToken(): string
    {
        $token = bin2hex(random_bytes(32));
        self::set('csrf_token', $token);
        return $token;
    }
    
    public static function validateCsrfToken(?string $token): bool
    {
        if ($token === null) {
            return false;
        }
        return hash_equals(self::get('csrf_token', ''), $token);
    }
    
    public static function getUserId(): ?int
    {
        return self::get('user_id');
    }
    
    public static function getUser(): ?array
    {
        return self::get('user');
    }
    
    public static function isLoggedIn(): bool
    {
        return self::has('user_id');
    }
    
    public static function login(array $user): void
    {
        self::regenerate();
        self::set('user_id', $user['id']);
        self::set('user', $user);
    }
    
    public static function logout(): void
    {
        self::destroy();
    }
}
