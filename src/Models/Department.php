<?php

namespace App\Models;

use App\Utils\Database;

class Department
{
    public static function findById(int $id): ?array
    {
        return Database::fetch(
            "SELECT * FROM departments WHERE id = ? AND deleted_at IS NULL",
            [$id]
        );
    }
    
    public static function getAll(): array
    {
        return Database::fetchAll(
            "SELECT d.*, 
                    (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id AND u.deleted_at IS NULL AND u.type = 'internal') as user_count
             FROM departments d
             WHERE d.deleted_at IS NULL
             ORDER BY d.display_order ASC, d.name ASC"
        );
    }
    
    public static function create(array $data): int
    {
        $maxOrder = Database::fetch(
            "SELECT MAX(display_order) as max_order FROM departments WHERE deleted_at IS NULL"
        );
        
        return Database::insert('departments', [
            'name' => $data['name'],
            'color' => $data['color'] ?? '#6366F1',
            'display_order' => ($maxOrder['max_order'] ?? 0) + 1,
        ]);
    }
    
    public static function update(int $id, array $data): bool
    {
        $updateData = [];
        
        if (isset($data['name'])) {
            $updateData['name'] = $data['name'];
        }
        if (isset($data['color'])) {
            $updateData['color'] = $data['color'];
        }
        if (isset($data['display_order'])) {
            $updateData['display_order'] = $data['display_order'];
        }
        
        if (empty($updateData)) {
            return true;
        }
        
        return Database::update('departments', $updateData, 'id = ? AND deleted_at IS NULL', [$id]) > 0;
    }
    
    public static function delete(int $id): bool
    {
        return Database::softDelete('departments', 'id = ?', [$id]) > 0;
    }
    
    public static function reorder(array $departments): void
    {
        foreach ($departments as $dept) {
            if (isset($dept['id']) && isset($dept['sort_order'])) {
                Database::update(
                    'departments',
                    ['display_order' => $dept['sort_order']],
                    'id = ?',
                    [$dept['id']]
                );
            }
        }
    }
    
    public static function getUsersByDepartment(int $departmentId): array
    {
        return Database::fetchAll(
            "SELECT id, name, email, role FROM users 
             WHERE department_id = ? AND deleted_at IS NULL AND type = 'internal'
             ORDER BY name ASC",
            [$departmentId]
        );
    }
}
