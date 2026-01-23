<?php

namespace App\Controllers;

use App\Models\Task;
use App\Models\User;
use App\Models\Notification;
use App\Middleware\AuthMiddleware;
use App\Middleware\StaffMiddleware;
use App\Utils\Response;
use App\Utils\Validator;

class TaskController
{
    public function index(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $filters = [];
        
        // For clients, only show their assigned tasks sorted by due date
        if ($user['role'] === 'client') {
            $filters['assignee_id'] = $user['id'];
            $filters['order_by'] = 'due_date';
            $filters['order_dir'] = 'ASC';
        } 
        // For staff, filter based on view
        else if ($user['role'] === 'staff' || $user['role'] === 'admin') {
            if (isset($_GET['view'])) {
                switch ($_GET['view']) {
                    case 'my':
                        // 自分に割り当てられたタスク
                        $filters['assignee_id'] = $user['id'];
                        break;
                    case 'requested':
                        // 自分が作成して社内スタッフに依頼したタスク
                        $filters['creator_id'] = $user['id'];
                        $filters['exclude_self_assigned'] = true;
                        $filters['assignee_type'] = 'internal';
                        break;
                    case 'clients':
                        // 自分が作成してクライアントに依頼したタスク
                        $filters['creator_id'] = $user['id'];
                        $filters['assignee_type'] = 'client';
                        break;
                }
            }
        }
        
        if (isset($_GET['category_id'])) {
            $filters['category_id'] = (int)$_GET['category_id'];
        }
        
        if (isset($_GET['status'])) {
            $filters['status'] = $_GET['status'];
        }
        
        if (isset($_GET['priority'])) {
            $filters['priority'] = $_GET['priority'];
        }
        
        if (isset($_GET['search'])) {
            $filters['search'] = $_GET['search'];
        }
        
        if (isset($_GET['order_by'])) {
            $filters['order_by'] = $_GET['order_by'];
        }
        
        if (isset($_GET['order_dir'])) {
            $filters['order_dir'] = $_GET['order_dir'];
        }
        
        // Grouped response
        if (isset($_GET['grouped'])) {
            switch ($_GET['grouped']) {
                case 'category':
                    // Pass user_id to filter categories to only this user's categories
                    $data = Task::getGroupedByCategory($filters, $user['id']);
                    break;
                case 'assignee':
                    $data = Task::getGroupedByAssignee($filters);
                    break;
                case 'client':
                    $data = Task::getGroupedByClient($filters);
                    break;
                case 'department':
                    $data = Task::getGroupedByDepartment($filters);
                    break;
                default:
                    $data = Task::getAll($filters);
            }
        } else {
            $data = Task::getAll($filters);
        }
        
        Response::success($data);
    }
    
    public function show(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $task = Task::findById($id);
        
        if (!$task) {
            Response::notFound('タスクが見つかりません');
            return;
        }
        
        if (!Task::canAccess($task, $user)) {
            Response::forbidden('このタスクへのアクセス権限がありません');
            return;
        }
        
        Response::success($task);
    }
    
    public function store(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        $validator = Validator::make($data)
            ->required('title', 'タイトルは必須です')
            ->max('title', 200, 'タイトルは200文字以内で入力してください')
            ->in('status', ['backlog', 'todo', 'in_progress', 'done', 'cancelled'])
            ->in('priority', ['urgent', 'high', 'medium', 'low'])
            ->date('due_date');
        
        if (!empty($data['assignee_id'])) {
            $validator->exists('assignee_id', 'users', 'id', '担当者が存在しません');
        }
        
        if (!empty($data['category_id'])) {
            $validator->exists('category_id', 'categories', 'id', 'カテゴリーが存在しません');
        }
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        $data['creator_id'] = $user['id'];
        
        $taskId = Task::create($data);
        $task = Task::findById($taskId);
        
        // Create notification if task is assigned
        if (!empty($data['assignee_id'])) {
            Notification::notifyTaskAssigned($taskId, $data['assignee_id'], $user['id']);
        }
        
        Response::created($task);
    }
    
    public function update(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $task = Task::findById($id);
        
        if (!$task) {
            Response::notFound('タスクが見つかりません');
            return;
        }
        
        // Clients can only complete/uncomplete their assigned tasks
        if ($user['role'] === 'client') {
            if ($task['assignee_id'] !== $user['id']) {
                Response::forbidden('このタスクへのアクセス権限がありません');
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
            
            // Clients can only change status to done/todo
            if (isset($data['status']) && !in_array($data['status'], ['done', 'todo'])) {
                Response::forbidden('クライアントはこの操作を実行できません');
                return;
            }
            
            // Only allow status change
            $allowedFields = ['status'];
            $data = array_intersect_key($data, array_flip($allowedFields));
        } else {
            if (!Task::canEdit($task, $user)) {
                Response::forbidden('このタスクを編集する権限がありません');
                return;
            }
            
            $data = json_decode(file_get_contents('php://input'), true) ?? [];
        }
        
        // Track if assignee changed
        $oldAssigneeId = $task['assignee_id'];
        $newAssigneeId = $data['assignee_id'] ?? null;
        $assigneeChanged = isset($data['assignee_id']) && $oldAssigneeId !== $newAssigneeId;
        
        $validator = Validator::make($data)
            ->max('title', 200, 'タイトルは200文字以内で入力してください')
            ->in('status', ['backlog', 'todo', 'in_progress', 'done', 'cancelled'])
            ->in('priority', ['urgent', 'high', 'medium', 'low'])
            ->date('due_date');
        
        if (!empty($data['assignee_id'])) {
            $validator->exists('assignee_id', 'users', 'id', '担当者が存在しません');
        }
        
        if (!empty($data['category_id'])) {
            $validator->exists('category_id', 'categories', 'id', 'カテゴリーが存在しません');
        }
        
        if ($validator->fails()) {
            Response::validationError($validator->errors());
            return;
        }
        
        Task::update($id, $data);
        $task = Task::findById($id);
        
        // Create notification if assignee changed (non-client users only)
        if ($assigneeChanged && $newAssigneeId && $user['role'] !== 'client') {
            Notification::notifyTaskAssigned($id, $newAssigneeId, $user['id']);
        }
        
        Response::success($task);
    }
    
    public function complete(int $id): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $task = Task::findById($id);
        
        if (!$task) {
            Response::notFound('タスクが見つかりません');
            return;
        }
        
        if (!Task::canAccess($task, $user)) {
            Response::forbidden('このタスクへのアクセス権限がありません');
            return;
        }
        
        $oldStatus = $task['status'];
        Task::toggleComplete($id);
        $task = Task::findById($id);
        
        // Create notification if task was completed
        if ($oldStatus !== 'done' && $task['status'] === 'done') {
            Notification::notifyTaskCompleted($id, $user['id']);
        }
        
        Response::success($task);
    }
    
    public function destroy(int $id): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $task = Task::findById($id);
        
        if (!$task) {
            Response::notFound('タスクが見つかりません');
            return;
        }
        
        if (!Task::canEdit($task, $user)) {
            Response::forbidden('このタスクを削除する権限がありません');
            return;
        }
        
        Task::delete($id);
        
        Response::success(['message' => 'タスクを削除しました']);
    }
    
    public function reorder(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = json_decode(file_get_contents('php://input'), true) ?? [];
        
        if (empty($data['tasks']) || !is_array($data['tasks'])) {
            Response::error('INVALID_DATA', 'タスクデータが不正です', 400);
            return;
        }
        
        Task::reorder($data['tasks']);
        
        Response::success(['message' => '並び替えを保存しました']);
    }
    
    public function stats(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $filters = [];
        
        // For clients, only show stats for their assigned tasks
        if ($user['role'] === 'client') {
            $filters['assignee_id'] = $user['id'];
        } else {
            // For staff, only show stats for tasks they're involved in
            $filters['involved_user_id'] = $user['id'];
        }
        
        $stats = Task::getStats($filters);
        
        Response::success($stats);
    }
    
    /**
     * Get tasks I requested with assignee workload information
     */
    public function requestedWithWorkload(): void
    {
        $user = StaffMiddleware::handle();
        if (!$user) return;
        
        $data = Task::getRequestedTasksWithAssigneeWorkload($user['id']);
        
        Response::success($data);
    }
    
    /**
     * Get tasks for calendar view
     */
    public function calendar(): void
    {
        $user = AuthMiddleware::handle();
        if (!$user) return;
        
        $startDate = $_GET['start'] ?? date('Y-m-01');
        $endDate = $_GET['end'] ?? date('Y-m-t');
        
        // Validate dates
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate) || 
            !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
            Response::error('INVALID_DATE', '日付の形式が不正です', 400);
            return;
        }
        
        $tasks = Task::getCalendarTasks($user['id'], $startDate, $endDate);
        
        Response::success($tasks);
    }
}
