<?php

namespace App\Models;

use App\Utils\Database;

class Comment
{
    public static function findById(int $id): ?array
    {
        return Database::fetch(
            "SELECT c.*, u.name as user_name, u.email as user_email, u.type as user_type
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.id = ?",
            [$id]
        );
    }
    
    public static function getByTaskId(int $taskId): array
    {
        return Database::fetchAll(
            "SELECT c.*, u.name as user_name, u.email as user_email, u.type as user_type
             FROM comments c
             JOIN users u ON c.user_id = u.id
             WHERE c.task_id = ?
             ORDER BY c.created_at ASC",
            [$taskId]
        );
    }
    
    public static function create(array $data): int
    {
        return Database::insert('comments', [
            'task_id' => $data['task_id'],
            'user_id' => $data['user_id'],
            'content' => $data['content'],
        ]);
    }
    
    public static function getCountByTaskId(int $taskId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM comments WHERE task_id = ?",
            [$taskId]
        );
        return $result['count'] ?? 0;
    }
}
