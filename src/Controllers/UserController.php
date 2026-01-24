<?php

namespace App\Controllers;

use App\Models\User;
use App\Middleware\AuthMiddleware;
use App\Middleware\StaffMiddleware;
use App\Utils\Response;
use App\Utils\Validator;

class UserController
{
    public function index(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $filters = [];
        
        if (isset($_GET['type'])) {
            $filters['type'] = $_GET['type'];
        }
        
        if (isset($_GET['role'])) {
            $filters['role'] = $_GET['role'];
        }
        
        if (isset($_GET['search'])) {
            $filters['search'] = $_GET['search'];
        }
        
        $users = User::getAll($filters);
        
        Response::success($users);
    }
    
    public function show(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $targetUser = User::findById($id);
        
        if (!$targetUser) {
            Response::notFound('ユーザーが見つかりません');
            return;
        }
        
        Response::success($targetUser);
    }
    
    public function store(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Staff cannot create admin users
        if ($user['role'] !== 'admin' && isset($data['role']) && $data['role'] === 'admin') {
            Response::forbidden('管理者ユーザーを作成する権限がありません');
            return;
        }
        
        $validator = Validator::make($data)
            ->required('name', '名前は必須です')
            ->max('name', 100, '名前は100文字以内で入力してください')
            ->required('email', 'メールアドレスは必須です')
            ->email('email')
            ->unique('email', 'users')
            ->required('password', 'パスワードは必須です')
            ->min('password', 6, 'パスワードは6文字以上で入力してください')
            ->in('role', ['admin', 'staff', 'client'])
            ->in('type', ['internal', 'client']);
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $userId = User::create($data);
        $newUser = User::findById($userId);
        
        Response::created($newUser);
    }
    
    public function update(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $targetUser = User::findById($id);
        
        if (!$targetUser) {
            Response::notFound('ユーザーが見つかりません');
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        // Staff cannot edit admin users (unless they are admin themselves)
        if ($user['role'] !== 'admin' && $targetUser['role'] === 'admin') {
            Response::forbidden('管理者ユーザーを編集する権限がありません');
            return;
        }
        
        // Staff cannot promote users to admin
        if ($user['role'] !== 'admin' && isset($data['role']) && $data['role'] === 'admin') {
            Response::forbidden('管理者権限を付与する権限がありません');
            return;
        }
        
        $validator = Validator::make($data)
            ->max('name', 100, '名前は100文字以内で入力してください')
            ->email('email')
            ->unique('email', 'users', 'email', $id)
            ->min('password', 6, 'パスワードは6文字以上で入力してください')
            ->in('role', ['admin', 'staff', 'client'])
            ->in('type', ['internal', 'client']);
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        User::update($id, $data);
        $updatedUser = User::findById($id);
        
        Response::success($updatedUser);
    }
    
    public function destroy(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $targetUser = User::findById($id);
        
        if (!$targetUser) {
            Response::notFound('ユーザーが見つかりません');
            return;
        }
        
        // Cannot delete yourself
        if ($targetUser['id'] === $user['id']) {
            Response::error('CANNOT_DELETE_SELF', '自分自身を削除することはできません', 400);
            return;
        }
        
        // Staff cannot delete admin users
        if ($user['role'] !== 'admin' && $targetUser['role'] === 'admin') {
            Response::forbidden('管理者ユーザーを削除する権限がありません');
            return;
        }
        
        User::delete($id);
        
        Response::success(['message' => 'ユーザーを削除しました']);
    }
    
    public function internalUsers(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $users = User::getInternalUsers();
        
        Response::success($users);
    }
    
    public function clientUsers(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $users = User::getClientUsers();
        
        Response::success($users);
    }
    
    public function reorder(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['users']) || !is_array($data['users'])) {
            Response::error('INVALID_DATA', 'ユーザーデータが不正です', 400);
            return;
        }
        
        User::reorder($data['users']);
        
        Response::success(['message' => '並び替えを保存しました']);
    }
    
    /**
     * 無効化されたユーザー一覧を取得（管理者のみ）
     */
    public function deactivated(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user || $user['role'] !== 'admin') {
            Response::forbidden('この操作を実行する権限がありません');
            return;
        }
        
        $users = User::getDeactivated();
        
        Response::success($users);
    }
    
    /**
     * ユーザーを復元（管理者のみ）
     */
    public function restore(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user || $user['role'] !== 'admin') {
            Response::forbidden('この操作を実行する権限がありません');
            return;
        }
        
        $targetUser = User::findDeactivatedById($id);
        
        if (!$targetUser) {
            Response::notFound('無効化されたユーザーが見つかりません');
            return;
        }
        
        User::restore($id);
        
        Response::success(['message' => 'ユーザーを復元しました']);
    }
    
    /**
     * ユーザーを完全削除（管理者のみ）
     */
    public function permanentlyDelete(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user || $user['role'] !== 'admin') {
            Response::forbidden('この操作を実行する権限がありません');
            return;
        }
        
        $targetUser = User::findDeactivatedById($id);
        
        if (!$targetUser) {
            Response::notFound('無効化されたユーザーが見つかりません');
            return;
        }
        
        User::permanentlyDelete($id);
        
        Response::success(['message' => 'ユーザーを完全に削除しました']);
    }
}
