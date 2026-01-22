<?php

namespace App\Models;

use App\Utils\Database;

class Notification
{
    public static function findById(int $id): ?array
    {
        return Database::fetch(
            "SELECT n.*, 
                    u.name as user_name,
                    t.title as task_title, t.ticket_id as task_ticket_id,
                    ru.name as related_user_name
             FROM notifications n
             LEFT JOIN users u ON n.user_id = u.id
             LEFT JOIN tasks t ON n.task_id = t.id
             LEFT JOIN users ru ON n.related_user_id = ru.id
             WHERE n.id = ?",
            [$id]
        );
    }
    
    public static function getByUserId(int $userId, array $filters = []): array
    {
        $sql = "SELECT n.*, 
                       t.title as task_title, t.ticket_id as task_ticket_id,
                       ru.name as related_user_name
                FROM notifications n
                LEFT JOIN tasks t ON n.task_id = t.id
                LEFT JOIN users ru ON n.related_user_id = ru.id
                WHERE n.user_id = ?";
        $params = [$userId];
        
        if (isset($filters['is_read'])) {
            $sql .= " AND n.is_read = ?";
            $params[] = $filters['is_read'] ? 1 : 0;
        }
        
        if (!empty($filters['type'])) {
            $sql .= " AND n.type = ?";
            $params[] = $filters['type'];
        }
        
        $sql .= " ORDER BY n.created_at DESC";
        
        if (!empty($filters['limit'])) {
            $sql .= " LIMIT ?";
            $params[] = (int)$filters['limit'];
        }
        
        return Database::fetchAll($sql, $params);
    }
    
    public static function getUnreadCount(int $userId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE",
            [$userId]
        );
        return $result['count'] ?? 0;
    }
    
    public static function create(array $data): int
    {
        return Database::insert('notifications', [
            'user_id' => $data['user_id'],
            'type' => $data['type'],
            'title' => $data['title'],
            'message' => $data['message'] ?? null,
            'task_id' => $data['task_id'] ?? null,
            'related_user_id' => $data['related_user_id'] ?? null,
        ]);
    }
    
    public static function markAsRead(int $id): bool
    {
        return Database::update('notifications', ['is_read' => true], 'id = ?', [$id]) > 0;
    }
    
    public static function markAllAsRead(int $userId): bool
    {
        return Database::update('notifications', ['is_read' => true], 'user_id = ? AND is_read = FALSE', [$userId]) > 0;
    }
    
    public static function delete(int $id): bool
    {
        return Database::delete('notifications', 'id = ?', [$id]) > 0;
    }
    
    public static function deleteAll(int $userId): bool
    {
        return Database::delete('notifications', 'user_id = ?', [$userId]) > 0;
    }
    
    // Helper method to create task assignment notification
    public static function notifyTaskAssigned(int $taskId, int $assigneeId, int $creatorId): void
    {
        $task = Task::findById($taskId);
        if (!$task || $assigneeId === $creatorId) return;
        
        $creator = User::findById($creatorId);
        
        self::create([
            'user_id' => $assigneeId,
            'type' => 'task_assigned',
            'title' => '新しいタスクが割り当てられました',
            'message' => "{$creator['name']}さんから「{$task['title']}」が割り当てられました",
            'task_id' => $taskId,
            'related_user_id' => $creatorId,
        ]);
    }
    
    // Helper method to create comment notification
    public static function notifyCommentAdded(int $taskId, int $commenterId, string $comment): void
    {
        $task = Task::findById($taskId);
        if (!$task) return;
        
        $commenter = User::findById($commenterId);
        $recipientIds = [];
        
        // Notify task creator if they're not the commenter
        if ($task['creator_id'] && $task['creator_id'] !== $commenterId) {
            $recipientIds[] = $task['creator_id'];
        }
        
        // Notify assignee if they're not the commenter
        if ($task['assignee_id'] && $task['assignee_id'] !== $commenterId) {
            $recipientIds[] = $task['assignee_id'];
        }
        
        // Remove duplicates
        $recipientIds = array_unique($recipientIds);
        
        foreach ($recipientIds as $recipientId) {
            self::create([
                'user_id' => $recipientId,
                'type' => 'comment_added',
                'title' => '新しいコメントが追加されました',
                'message' => "{$commenter['name']}さんが「{$task['title']}」にコメントしました",
                'task_id' => $taskId,
                'related_user_id' => $commenterId,
            ]);
        }
    }
    
    // Helper method to create task completion notification
    public static function notifyTaskCompleted(int $taskId, int $completerId): void
    {
        $task = Task::findById($taskId);
        if (!$task) return;
        
        $completer = User::findById($completerId);
        
        // Notify task creator if they're not the completer
        if ($task['creator_id'] && $task['creator_id'] !== $completerId) {
            self::create([
                'user_id' => $task['creator_id'],
                'type' => 'task_completed',
                'title' => 'タスクが完了しました',
                'message' => "{$completer['name']}さんが「{$task['title']}」を完了しました",
                'task_id' => $taskId,
                'related_user_id' => $completerId,
            ]);
        }
    }
}
