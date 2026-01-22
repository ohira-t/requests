<?php

namespace App\Controllers;

use App\Models\Notification;
use App\Middleware\AuthMiddleware;
use App\Utils\Response;

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
}
