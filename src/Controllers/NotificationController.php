<?php

namespace App\Controllers;

use App\Models\Notification;
use App\Models\User;
use App\Middleware\AuthMiddleware;
use App\Middleware\AdminMiddleware;
use App\Utils\Response;
use App\Utils\Validator;

class NotificationController
{
    public function index(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $filters = [];
        
        if (isset($_GET['is_read'])) {
            $filters['is_read'] = $_GET['is_read'] === 'true' || $_GET['is_read'] === '1';
        }
        
        if (isset($_GET['type'])) {
            $filters['type'] = $_GET['type'];
        }
        
        if (isset($_GET['limit'])) {
            $filters['limit'] = (int)$_GET['limit'];
        } else {
            $filters['limit'] = 50; // Default limit
        }
        
        $notifications = Notification::getByUserId($user['id'], $filters);
        $unreadCount = Notification::getUnreadCount($user['id']);
        
        Response::success([
            'notifications' => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }
    
    public function markAsRead(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $notification = Notification::findById($id);
        
        if (!$notification) {
            Response::notFound('通知が見つかりません');
            return;
        }
        
        // Check if notification belongs to user
        if ($notification['user_id'] !== $user['id']) {
            Response::forbidden('この通知へのアクセス権限がありません');
            return;
        }
        
        Notification::markAsRead($id);
        
        Response::success(['message' => '既読にしました']);
    }
    
    public function markAllAsRead(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        Notification::markAllAsRead($user['id']);
        
        Response::success(['message' => 'すべて既読にしました']);
    }
    
    public function destroy(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $notification = Notification::findById($id);
        
        if (!$notification) {
            Response::notFound('通知が見つかりません');
            return;
        }
        
        // Check if notification belongs to user
        if ($notification['user_id'] !== $user['id']) {
            Response::forbidden('この通知へのアクセス権限がありません');
            return;
        }
        
        Notification::delete($id);
        
        Response::success(['message' => '通知を削除しました']);
    }
    
    public function deleteAll(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        Notification::deleteAll($user['id']);
        
        Response::success(['message' => 'すべての通知を削除しました']);
    }
    
    /**
     * 管理者がお知らせを作成（全ユーザーまたは特定ユーザーに通知）
     */
    public function createAnnouncement(): void
    {
        $user = AdminMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('title', 'タイトルは必須です')
            ->required('message', 'メッセージは必須です')
            ->required('target_type', '配信対象は必須です');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $title = $data['title'];
        $message = $data['message'];
        $targetType = $data['target_type']; // 'all', 'staff', 'clients', 'specific'
        $targetUserIds = $data['target_user_ids'] ?? [];
        
        // 配信対象ユーザーを取得
        $targetUsers = [];
        
        switch ($targetType) {
            case 'all':
                // 全ユーザー
                $targetUsers = User::getAllActive();
                break;
            case 'staff':
                // スタッフのみ（adminとstaff）
                $targetUsers = User::getByRole(['admin', 'staff']);
                break;
            case 'clients':
                // クライアントのみ
                $targetUsers = User::getByRole(['client']);
                break;
            case 'specific':
                // 特定ユーザー
                if (empty($targetUserIds)) {
                    Response::error('INVALID_TARGET', '配信対象ユーザーを選択してください', 400);
                    return;
                }
                $targetUsers = User::getByIds($targetUserIds);
                break;
            default:
                Response::error('INVALID_TARGET_TYPE', '無効な配信対象です', 400);
                return;
        }
        
        if (empty($targetUsers)) {
            Response::error('NO_TARGET_USERS', '配信対象ユーザーが見つかりません', 400);
            return;
        }
        
        // 各ユーザーに通知を作成
        $createdCount = 0;
        foreach ($targetUsers as $targetUser) {
            Notification::create([
                'user_id' => $targetUser['id'],
                'type' => 'announcement',
                'title' => $title,
                'message' => $message,
                'task_id' => null,
                'related_user_id' => $user['id'], // 作成者（管理者）
            ]);
            $createdCount++;
        }
        
        Response::success([
            'message' => "お知らせを{$createdCount}人に送信しました",
            'sent_count' => $createdCount,
        ]);
    }
}
