<?php

namespace App\Controllers;

use App\Models\User;
use App\Utils\Session;
use App\Utils\Response;
use App\Utils\Validator;
use App\Middleware\AuthMiddleware;

class AuthController
{
    public function login(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('email', 'メールアドレスは必須です')
            ->email('email')
            ->required('password', 'パスワードは必須です');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $user = User::findByEmail($data['email']);
        
        if (!$user || !User::verifyPassword($user, $data['password'])) {
            Response::error('INVALID_CREDENTIALS', 'メールアドレスまたはパスワードが正しくありません', 401);
            return;
        }
        
        Session::start();
        Session::login(User::toSafeArray($user));
        
        Response::success([
            'user' => User::toSafeArray($user),
            'csrf_token' => Session::generateCsrfToken(),
        ]);
    }
    
    public function logout(): void
    {
        Session::start();
        Session::logout();
        
        Response::success(['message' => 'ログアウトしました']);
    }
    
    public function me(): void
    {
        Session::start();
        
        if (!Session::isLoggedIn()) {
            Response::unauthorized();
            return;
        }
        
        $user = Session::getUser();
        
        // Refresh user data from database
        $freshUser = User::findById($user['id']);
        
        if (!$freshUser) {
            Session::logout();
            Response::unauthorized('ユーザーが見つかりません');
            return;
        }
        
        Session::set('user', $freshUser);
        
        Response::success([
            'user' => $freshUser,
            'csrf_token' => Session::get('csrf_token') ?? Session::generateCsrfToken(),
        ]);
    }
    
    public function checkSession(): void
    {
        Session::start();
        
        Response::success([
            'authenticated' => Session::isLoggedIn(),
            'user' => Session::isLoggedIn() ? Session::getUser() : null,
        ]);
    }
    
    public function changePassword(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('current_password', '現在のパスワードは必須です')
            ->required('new_password', '新しいパスワードは必須です')
            ->min('new_password', 6, '新しいパスワードは6文字以上で入力してください')
            ->required('new_password_confirmation', '新しいパスワード（確認）は必須です');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        // Check if new passwords match
        if ($data['new_password'] !== $data['new_password_confirmation']) {
            Response::error('PASSWORD_MISMATCH', '新しいパスワードが一致しません', 400);
            return;
        }
        
        // Get full user data with password
        $fullUser = User::findByEmail($user['email']);
        
        // Verify current password
        if (!User::verifyPassword($fullUser, $data['current_password'])) {
            Response::error('INVALID_PASSWORD', '現在のパスワードが正しくありません', 400);
            return;
        }
        
        // Update password
        User::update($user['id'], ['password' => $data['new_password']]);
        
        Response::success(['message' => 'パスワードを変更しました']);
    }
    
    /**
     * 新規ユーザー登録（スタッフとして登録）
     */
    public function register(): void
    {
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('name', '名前は必須です')
            ->required('email', 'メールアドレスは必須です')
            ->email('email')
            ->required('password', 'パスワードは必須です')
            ->min('password', 6, 'パスワードは6文字以上で入力してください');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        // Check if email already exists
        $existingUser = User::findByEmail($data['email']);
        if ($existingUser) {
            Response::error('EMAIL_EXISTS', 'このメールアドレスは既に登録されています', 400);
            return;
        }
        
        // Create new user as staff
        try {
            $userId = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'],
                'role' => 'staff',
                'type' => 'internal',
                'department_id' => $data['department_id'] ?? null,
            ]);
            
            // Auto-login after registration
            $user = User::findById($userId);
            Session::start();
            Session::login(User::toSafeArray($user));
            
            Response::success([
                'message' => 'アカウントを作成しました',
                'user' => User::toSafeArray($user),
                'csrf_token' => Session::generateCsrfToken(),
            ], 201);
        } catch (\Exception $e) {
            Response::error('REGISTRATION_FAILED', 'アカウントの作成に失敗しました', 500);
        }
    }
}
