<?php

namespace App\Models;

use App\Utils\Database;

class Task
{
    public static function findById(int $id): ?array
    {
        $task = Database::fetch(
            "SELECT t.*, 
                    c.name as creator_name, c.email as creator_email,
                    a.name as assignee_name, a.email as assignee_email, a.company as assignee_company,
                    cat.name as category_name, cat.color as category_color
             FROM tasks t
             LEFT JOIN users c ON t.creator_id = c.id
             LEFT JOIN users a ON t.assignee_id = a.id
             LEFT JOIN categories cat ON t.category_id = cat.id
             WHERE t.id = ? AND t.deleted_at IS NULL",
            [$id]
        );
        
        if ($task) {
            $task['tags'] = json_decode($task['tags'] ?? '[]', true);
        }
        
        return $task;
    }
    
    public static function findByTicketId(string $ticketId): ?array
    {
        $task = Database::fetch(
            "SELECT t.*, 
                    c.name as creator_name, c.email as creator_email,
                    a.name as assignee_name, a.email as assignee_email, a.company as assignee_company,
                    cat.name as category_name, cat.color as category_color
             FROM tasks t
             LEFT JOIN users c ON t.creator_id = c.id
             LEFT JOIN users a ON t.assignee_id = a.id
             LEFT JOIN categories cat ON t.category_id = cat.id
             WHERE t.ticket_id = ? AND t.deleted_at IS NULL",
            [$ticketId]
        );
        
        if ($task) {
            $task['tags'] = json_decode($task['tags'] ?? '[]', true);
        }
        
        return $task;
    }
    
    public static function getAll(array $filters = []): array
    {
        $sql = "SELECT t.*, 
                       c.name as creator_name, c.email as creator_email,
                       a.name as assignee_name, a.email as assignee_email, a.type as assignee_type, a.company as assignee_company,
                       a.department_id as assignee_department_id,
                       d.name as assignee_department_name, d.color as assignee_department_color,
                       cat.name as category_name, cat.color as category_color
                FROM tasks t
                LEFT JOIN users c ON t.creator_id = c.id
                LEFT JOIN users a ON t.assignee_id = a.id
                LEFT JOIN departments d ON a.department_id = d.id AND d.deleted_at IS NULL
                LEFT JOIN categories cat ON t.category_id = cat.id
                WHERE t.deleted_at IS NULL";
        $params = [];
        
        // Filter by assignee
        if (!empty($filters['assignee_id'])) {
            $sql .= " AND t.assignee_id = ?";
            $params[] = $filters['assignee_id'];
        }
        
        // Filter by creator
        if (!empty($filters['creator_id'])) {
            $sql .= " AND t.creator_id = ?";
            $params[] = $filters['creator_id'];
        }
        
        // Filter by category
        if (!empty($filters['category_id'])) {
            $sql .= " AND t.category_id = ?";
            $params[] = $filters['category_id'];
        }
        
        // Filter by status
        if (!empty($filters['status'])) {
            if (is_array($filters['status'])) {
                $placeholders = implode(',', array_fill(0, count($filters['status']), '?'));
                $sql .= " AND t.status IN ({$placeholders})";
                $params = array_merge($params, $filters['status']);
            } else {
                $sql .= " AND t.status = ?";
                $params[] = $filters['status'];
            }
        }
        
        // Filter by priority
        if (!empty($filters['priority'])) {
            $sql .= " AND t.priority = ?";
            $params[] = $filters['priority'];
        }
        
        // Filter by assignee type (internal/client)
        if (!empty($filters['assignee_type'])) {
            $sql .= " AND a.type = ?";
            $params[] = $filters['assignee_type'];
        }
        
        // Exclude self-assigned tasks (creator_id = assignee_id)
        if (!empty($filters['exclude_self_assigned'])) {
            $sql .= " AND (t.assignee_id IS NULL OR t.creator_id != t.assignee_id)";
        }
        
        // Exclude completed tasks if needed
        if (!empty($filters['exclude_done'])) {
            $sql .= " AND t.status NOT IN ('done', 'cancelled')";
        }
        
        // Search
        if (!empty($filters['search'])) {
            $sql .= " AND (t.title LIKE ? OR t.description LIKE ? OR t.ticket_id LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }
        
        // Sorting
        $orderBy = $filters['order_by'] ?? 'display_order';
        $orderDir = strtoupper($filters['order_dir'] ?? 'ASC') === 'DESC' ? 'DESC' : 'ASC';
        
        $allowedOrders = ['display_order', 'due_date', 'created_at', 'priority', 'title'];
        if (!in_array($orderBy, $allowedOrders)) {
            $orderBy = 'display_order';
        }
        
        // due_dateでソートする場合、NULLを最後に
        if ($orderBy === 'due_date') {
            $sql .= " ORDER BY t.due_date IS NULL ASC, t.due_date {$orderDir}";
        } else {
            $sql .= " ORDER BY t.{$orderBy} {$orderDir}";
            $sql .= ", t.due_date IS NULL ASC, t.due_date ASC";
        }
        
        $tasks = Database::fetchAll($sql, $params);
        
        // Decode tags JSON
        foreach ($tasks as &$task) {
            $task['tags'] = json_decode($task['tags'] ?? '[]', true);
        }
        
        return $tasks;
    }
    
    public static function getMyTasks(int $userId): array
    {
        return self::getAll(['assignee_id' => $userId]);
    }
    
    public static function getRequestedTasks(int $userId): array
    {
        return self::getAll([
            'creator_id' => $userId,
            'exclude_done' => false,
        ]);
    }
    
    /**
     * Get tasks I requested, grouped by assignee, with their other tasks from other people
     * This shows the workload of people I assigned tasks to
     */
    public static function getRequestedTasksWithAssigneeWorkload(int $userId): array
    {
        // Get my requested tasks (where I am the creator)
        $myRequests = self::getAll([
            'creator_id' => $userId,
            'exclude_self_assigned' => true, // Exclude tasks I assigned to myself
        ]);
        
        // Get unique assignee IDs from my requests
        $assigneeIds = array_unique(array_filter(array_column($myRequests, 'assignee_id')));
        
        if (empty($assigneeIds)) {
            return [];
        }
        
        // Get all tasks assigned to those people (including from others)
        $allAssigneeTasks = [];
        foreach ($assigneeIds as $assigneeId) {
            $allAssigneeTasks[$assigneeId] = self::getAll([
                'assignee_id' => $assigneeId,
                'exclude_done' => true, // Only show active tasks for workload
            ]);
        }
        
        // Group by assignee
        $grouped = [];
        foreach ($assigneeIds as $assigneeId) {
            $assigneeTasks = $allAssigneeTasks[$assigneeId] ?? [];
            $myTasks = [];
            $othersTasks = [];
            
            foreach ($assigneeTasks as $task) {
                if ($task['creator_id'] == $userId) {
                    $myTasks[] = $task;
                } else {
                    $task['is_others_task'] = true; // Mark as other's task
                    $othersTasks[] = $task;
                }
            }
            
            // Get assignee info from first task or fetch
            $assignee = null;
            if (!empty($assigneeTasks)) {
                $assignee = [
                    'id' => $assigneeId,
                    'name' => $assigneeTasks[0]['assignee_name'],
                    'email' => $assigneeTasks[0]['assignee_email'],
                    'type' => $assigneeTasks[0]['assignee_type'] ?? 'internal',
                    'company' => $assigneeTasks[0]['assignee_company'] ?? null,
                ];
            }
            
            if ($assignee) {
                $grouped[$assigneeId] = [
                    'assignee' => $assignee,
                    'my_tasks' => $myTasks,
                    'others_tasks' => $othersTasks,
                    'my_task_count' => count($myTasks),
                    'others_task_count' => count($othersTasks),
                    'total_task_count' => count($myTasks) + count($othersTasks),
                ];
            }
        }
        
        return $grouped;
    }
    
    /**
     * Get tasks for calendar view - tasks with due dates that involve the user
     */
    public static function getCalendarTasks(int $userId, string $startDate, string $endDate): array
    {
        $sql = "SELECT t.*, 
                       c.name as creator_name, c.email as creator_email,
                       a.name as assignee_name, a.email as assignee_email,
                       cat.name as category_name, cat.color as category_color
                FROM tasks t
                LEFT JOIN users c ON t.creator_id = c.id
                LEFT JOIN users a ON t.assignee_id = a.id
                LEFT JOIN categories cat ON t.category_id = cat.id
                WHERE t.deleted_at IS NULL
                AND t.due_date IS NOT NULL
                AND t.due_date >= ?
                AND t.due_date <= ?
                AND (t.creator_id = ? OR t.assignee_id = ?)
                ORDER BY t.due_date ASC, t.priority DESC";
        
        $tasks = Database::fetchAll($sql, [$startDate, $endDate, $userId, $userId]);
        
        foreach ($tasks as &$task) {
            $task['tags'] = json_decode($task['tags'] ?? '[]', true);
            $task['is_my_task'] = ($task['assignee_id'] == $userId);
            $task['is_my_request'] = ($task['creator_id'] == $userId && $task['assignee_id'] != $userId);
        }
        
        return $tasks;
    }
    
    public static function getClientTasks(): array
    {
        return self::getAll(['assignee_type' => 'client']);
    }
    
    public static function create(array $data): int
    {
        $ticketId = self::generateTicketId();
        
        return Database::insert('tasks', [
            'ticket_id' => $ticketId,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'status' => $data['status'] ?? 'todo',
            'priority' => $data['priority'] ?? 'medium',
            'creator_id' => $data['creator_id'],
            'assignee_id' => $data['assignee_id'] ?? null,
            'category_id' => $data['category_id'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'tags' => !empty($data['tags']) ? json_encode($data['tags'], JSON_UNESCAPED_UNICODE) : null,
            'display_order' => self::getNextDisplayOrder($data['assignee_id'], $data['category_id']),
        ]);
    }
    
    public static function update(int $id, array $data): bool
    {
        $updateData = [];
        
        $fields = ['title', 'description', 'status', 'priority', 'assignee_id', 'category_id', 'due_date', 'display_order'];
        
        foreach ($fields as $field) {
            if (array_key_exists($field, $data)) {
                $updateData[$field] = $data[$field];
            }
        }
        
        if (array_key_exists('tags', $data)) {
            $updateData['tags'] = !empty($data['tags']) ? json_encode($data['tags'], JSON_UNESCAPED_UNICODE) : null;
        }
        
        // Handle completion
        if (isset($data['status'])) {
            if ($data['status'] === 'done') {
                $updateData['completed_at'] = date('Y-m-d H:i:s');
            } elseif (in_array($data['status'], ['backlog', 'todo', 'in_progress'])) {
                $updateData['completed_at'] = null;
            }
        }
        
        if (empty($updateData)) {
            return true;
        }
        
        return Database::update('tasks', $updateData, 'id = ? AND deleted_at IS NULL', [$id]) > 0;
    }
    
    public static function complete(int $id): bool
    {
        return self::update($id, ['status' => 'done']);
    }
    
    public static function uncomplete(int $id): bool
    {
        return self::update($id, ['status' => 'todo']);
    }
    
    public static function toggleComplete(int $id): bool
    {
        $task = self::findById($id);
        if (!$task) {
            return false;
        }
        
        if ($task['status'] === 'done') {
            return self::uncomplete($id);
        } else {
            return self::complete($id);
        }
    }
    
    public static function delete(int $id): bool
    {
        return Database::softDelete('tasks', 'id = ?', [$id]) > 0;
    }
    
    public static function reorder(array $tasks): bool
    {
        Database::beginTransaction();
        
        try {
            foreach ($tasks as $taskData) {
                if (!isset($taskData['id'])) continue;
                
                $updateData = [];
                
                // Use sort_order if provided, otherwise use array index
                if (isset($taskData['sort_order'])) {
                    $updateData['display_order'] = (int)$taskData['sort_order'];
                }
                
                if (isset($taskData['category_id'])) {
                    $updateData['category_id'] = $taskData['category_id'];
                }
                if (isset($taskData['assignee_id'])) {
                    $updateData['assignee_id'] = $taskData['assignee_id'];
                }
                
                if (!empty($updateData)) {
                    Database::update('tasks', $updateData, 'id = ?', [(int)$taskData['id']]);
                }
            }
            Database::commit();
            return true;
        } catch (\Exception $e) {
            Database::rollback();
            return false;
        }
    }
    
    private static function generateTicketId(): string
    {
        $prefix = 'GLG';
        $year = date('y');
        $month = date('m');
        
        // SQLite compatible: use SUBSTR instead of SUBSTRING, CAST AS INTEGER instead of UNSIGNED
        $driver = Database::getDriver();
        if ($driver === 'sqlite') {
            $result = Database::fetch(
                "SELECT MAX(CAST(SUBSTR(ticket_id, 8) AS INTEGER)) as max_num 
                 FROM tasks 
                 WHERE ticket_id LIKE ?",
                [$prefix . $year . $month . '%']
            );
        } else {
            $result = Database::fetch(
                "SELECT MAX(CAST(SUBSTRING(ticket_id, 8) AS UNSIGNED)) as max_num 
                 FROM tasks 
                 WHERE ticket_id LIKE ?",
                [$prefix . $year . $month . '%']
            );
        }
        
        $nextNum = ($result['max_num'] ?? 0) + 1;
        
        return sprintf('%s%s%s%04d', $prefix, $year, $month, $nextNum);
    }
    
    private static function getNextDisplayOrder(?int $assigneeId, ?int $categoryId): int
    {
        $sql = "SELECT MAX(display_order) as max_order FROM tasks WHERE deleted_at IS NULL";
        $params = [];
        
        if ($assigneeId !== null) {
            $sql .= " AND assignee_id = ?";
            $params[] = $assigneeId;
        }
        
        if ($categoryId !== null) {
            $sql .= " AND category_id = ?";
            $params[] = $categoryId;
        }
        
        $result = Database::fetch($sql, $params);
        
        return ($result['max_order'] ?? 0) + 1;
    }
    
    public static function canAccess(array $task, array $user): bool
    {
        // Admins and staff can access all tasks
        if (in_array($user['role'], ['admin', 'staff'])) {
            return true;
        }
        
        // Clients can only access tasks assigned to them
        if ($user['role'] === 'client') {
            return $task['assignee_id'] === $user['id'];
        }
        
        return false;
    }
    
    public static function canEdit(array $task, array $user): bool
    {
        // Admins can edit all tasks
        if ($user['role'] === 'admin') {
            return true;
        }
        
        // Staff can edit tasks they created or are assigned to
        if ($user['role'] === 'staff') {
            return $task['creator_id'] === $user['id'] || $task['assignee_id'] === $user['id'];
        }
        
        // Clients can only complete/uncomplete tasks assigned to them
        return false;
    }
    
    public static function getGroupedByCategory(array $filters = []): array
    {
        $tasks = self::getAll($filters);
        $categories = Category::getAll();
        
        $grouped = [];
        
        foreach ($categories as $category) {
            $grouped[$category['id']] = [
                'category' => $category,
                'tasks' => [],
                'completed_tasks' => [],
            ];
        }
        
        // Add "未分類" category
        $grouped[0] = [
            'category' => ['id' => 0, 'name' => '未分類', 'color' => '#8E8E93'],
            'tasks' => [],
            'completed_tasks' => [],
        ];
        
        foreach ($tasks as $task) {
            $catId = $task['category_id'] ?? 0;
            if (!isset($grouped[$catId])) {
                $catId = 0;
            }
            
            if ($task['status'] === 'done') {
                $grouped[$catId]['completed_tasks'][] = $task;
            } else {
                $grouped[$catId]['tasks'][] = $task;
            }
        }
        
        return $grouped;
    }
    
    public static function getGroupedByAssignee(array $filters = []): array
    {
        $tasks = self::getAll($filters);
        
        // タスクがある担当者のみグループ化（タスクがない人は表示しない）
        $users = User::getInternalUsers();
        $userMap = [];
        foreach ($users as $user) {
            $userMap[$user['id']] = $user;
        }
        
        $grouped = [];
        
        foreach ($tasks as $task) {
            $assigneeId = $task['assignee_id'];
            if (!$assigneeId || !isset($userMap[$assigneeId])) continue;
            
            // 初めて出現した担当者はグループを作成
            if (!isset($grouped[$assigneeId])) {
                $grouped[$assigneeId] = [
                    'assignee' => $userMap[$assigneeId],
                    'tasks' => [],
                    'completed_tasks' => [],
                    'total_tasks' => User::getTaskCount($assigneeId),
                ];
            }
            
            if ($task['status'] === 'done') {
                $grouped[$assigneeId]['completed_tasks'][] = $task;
            } else {
                $grouped[$assigneeId]['tasks'][] = $task;
            }
        }
        
        return $grouped;
    }
    
    public static function getGroupedByClient(array $filters = []): array
    {
        $filters['assignee_type'] = 'client';
        $tasks = self::getAll($filters);
        
        // タスクがあるクライアントのみグループ化（タスクがない人は表示しない）
        $clients = User::getClientUsers();
        $clientMap = [];
        foreach ($clients as $client) {
            $clientMap[$client['id']] = $client;
        }
        
        $grouped = [];
        
        foreach ($tasks as $task) {
            $clientId = $task['assignee_id'];
            if (!$clientId || !isset($clientMap[$clientId])) continue;
            
            // 初めて出現したクライアントはグループを作成
            if (!isset($grouped[$clientId])) {
                $grouped[$clientId] = [
                    'client' => $clientMap[$clientId],
                    'tasks' => [],
                    'completed_tasks' => [],
                ];
            }
            
            if ($task['status'] === 'done') {
                $grouped[$clientId]['completed_tasks'][] = $task;
            } else {
                $grouped[$clientId]['tasks'][] = $task;
            }
        }
        
        return $grouped;
    }
    
    public static function getGroupedByDepartment(array $filters = []): array
    {
        // 社内スタッフのみ対象
        $filters['assignee_type'] = 'internal';
        $tasks = self::getAll($filters);
        $departments = Department::getAll();
        
        $grouped = [];
        
        foreach ($departments as $dept) {
            $grouped[$dept['id']] = [
                'department' => $dept,
                'tasks' => [],
                'completed_tasks' => [],
            ];
        }
        
        // 部署未設定用
        $grouped[0] = [
            'department' => ['id' => 0, 'name' => '部署未設定', 'color' => '#8E8E93'],
            'tasks' => [],
            'completed_tasks' => [],
        ];
        
        // 担当者の部署でグループ化
        foreach ($tasks as $task) {
            $deptId = $task['assignee_department_id'] ?? 0;
            if (!isset($grouped[$deptId])) {
                $deptId = 0;
            }
            
            if ($task['status'] === 'done') {
                $grouped[$deptId]['completed_tasks'][] = $task;
            } else {
                $grouped[$deptId]['tasks'][] = $task;
            }
        }
        
        return $grouped;
    }
    
    public static function getStats(array $filters = []): array
    {
        // SQLite uses date('now'), MySQL uses CURDATE()
        $today = Database::getDriver() === 'sqlite' ? "date('now')" : "CURDATE()";
        
        $sql = "SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed,
                    SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
                    SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
                    SUM(CASE WHEN status = 'backlog' THEN 1 ELSE 0 END) as backlog,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
                    SUM(CASE WHEN priority = 'urgent' THEN 1 ELSE 0 END) as urgent,
                    SUM(CASE WHEN priority = 'high' THEN 1 ELSE 0 END) as high,
                    SUM(CASE WHEN priority = 'medium' THEN 1 ELSE 0 END) as medium,
                    SUM(CASE WHEN priority = 'low' THEN 1 ELSE 0 END) as low,
                    SUM(CASE WHEN due_date < {$today} AND status != 'done' AND status != 'cancelled' THEN 1 ELSE 0 END) as overdue
                FROM tasks
                WHERE deleted_at IS NULL";
        $params = [];
        
        // Filter by assignee (for clients)
        if (!empty($filters['assignee_id'])) {
            $sql .= " AND assignee_id = ?";
            $params[] = $filters['assignee_id'];
        }
        
        // Filter by involved user (creator or assignee) for staff
        if (!empty($filters['involved_user_id'])) {
            $sql .= " AND (creator_id = ? OR assignee_id = ?)";
            $params[] = $filters['involved_user_id'];
            $params[] = $filters['involved_user_id'];
        }
        
        $stats = Database::fetch($sql, $params);
        
        // Calculate completion rate
        $completionRate = $stats['total'] > 0 
            ? round(($stats['completed'] / $stats['total']) * 100, 1) 
            : 0;
        
        $stats['completion_rate'] = $completionRate;
        
        // Get recent tasks
        $recentSql = "SELECT t.*, 
                             c.name as creator_name,
                             a.name as assignee_name, a.company as assignee_company,
                             cat.name as category_name, cat.color as category_color
                      FROM tasks t
                      LEFT JOIN users c ON t.creator_id = c.id
                      LEFT JOIN users a ON t.assignee_id = a.id
                      LEFT JOIN categories cat ON t.category_id = cat.id
                      WHERE t.deleted_at IS NULL";
        $recentParams = [];
        
        if (!empty($filters['assignee_id'])) {
            $recentSql .= " AND t.assignee_id = ?";
            $recentParams[] = $filters['assignee_id'];
        }
        
        if (!empty($filters['involved_user_id'])) {
            $recentSql .= " AND (t.creator_id = ? OR t.assignee_id = ?)";
            $recentParams[] = $filters['involved_user_id'];
            $recentParams[] = $filters['involved_user_id'];
        }
        
        $recentSql .= " AND t.status != 'done' AND t.status != 'cancelled'
                       ORDER BY t.updated_at DESC 
                       LIMIT 10";
        
        $recentTasks = Database::fetchAll($recentSql, $recentParams);
        
        foreach ($recentTasks as &$task) {
            $task['tags'] = json_decode($task['tags'] ?? '[]', true);
        }
        
        $stats['recent_tasks'] = $recentTasks;
        
        return $stats;
    }
}
