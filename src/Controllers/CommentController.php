<?php

namespace App\Controllers;

use App\Models\Comment;
use App\Models\Task;
use App\Models\Notification;
use App\Middleware\AuthMiddleware;
use App\Utils\Response;
use App\Utils\Validator;

class CommentController
{
    public function index(int $taskId): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $task = Task::findById($taskId);
        
        if (!$task) {
            Response::notFound('タスクが見つかりません');
            return;
        }
        
        if (!Task::canAccess($task, $user)) {
            Response::forbidden('このタスクへのアクセス権限がありません');
            return;
        }
        
        $comments = Comment::getByTaskId($taskId);
        
        Response::success($comments);
    }
    
    public function store(int $taskId): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $task = Task::findById($taskId);
        
        if (!$task) {
            Response::notFound('タスクが見つかりません');
            return;
        }
        
        if (!Task::canAccess($task, $user)) {
            Response::forbidden('このタスクへのアクセス権限がありません');
            return;
        }
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('content', 'コメント内容は必須です');
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $commentId = Comment::create([
            'task_id' => $taskId,
            'user_id' => $user['id'],
            'content' => $data['content'],
        ]);
        
        $comment = Comment::findById($commentId);
        
        // Create notification for comment
        Notification::notifyCommentAdded($taskId, $user['id'], $data['content']);
        
        Response::created($comment);
    }
}
