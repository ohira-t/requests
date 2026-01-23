<?php

namespace App\Models;

use App\Utils\Database;

class User
{
    public static function findById(int $id): ?array
    {
        return Database::fetch(
            "SELECT u.id, u.name, u.email, u.role, u.type, u.company, u.department_id, 
                    u.created_at, u.updated_at,
                    d.name as department_name, d.color as department_color
             FROM users u
             LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
             WHERE u.id = ? AND u.deleted_at IS NULL",
            [$id]
        );
    }
    
    public static function findByEmail(string $email): ?array
    {
        return Database::fetch(
            "SELECT * FROM users WHERE email = ? AND deleted_at IS NULL",
            [$email]
        );
    }
    
    public static function getAll(array $filters = []): array
    {
        $sql = "SELECT u.id, u.name, u.email, u.role, u.type, u.company, u.department_id, 
                       u.created_at, u.updated_at,
                       d.name as department_name, d.color as department_color
                FROM users u
                LEFT JOIN departments d ON u.department_id = d.id AND d.deleted_at IS NULL
                WHERE u.deleted_at IS NULL";
        $params = [];
        
        if (!empty($filters['type'])) {
            $sql .= " AND type = ?";
            $params[] = $filters['type'];
        }
        
        if (!empty($filters['role'])) {
            $sql .= " AND role = ?";
            $params[] = $filters['role'];
        }
        
        if (!empty($filters['search'])) {
            $sql .= " AND (u.name LIKE ? OR u.email LIKE ? OR u.company LIKE ?)";
            $search = '%' . $filters['search'] . '%';
            $params[] = $search;
            $params[] = $search;
            $params[] = $search;
        }
        
        if (!empty($filters['department_id'])) {
            $sql .= " AND u.department_id = ?";
            $params[] = $filters['department_id'];
        }
        
        $sql .= " ORDER BY u.type ASC, u.display_order ASC, u.name ASC";
        
        return Database::fetchAll($sql, $params);
    }
    
    public static function reorder(array $users): void
    {
        foreach ($users as $userData) {
            if (isset($userData['id']) && isset($userData['sort_order'])) {
                Database::update(
                    'users',
                    ['display_order' => $userData['sort_order']],
                    'id = ?',
                    [$userData['id']]
                );
            }
        }
    }
    
    public static function getInternalUsers(): array
    {
        return self::getAll(['type' => 'internal']);
    }
    
    public static function getClientUsers(): array
    {
        return self::getAll(['type' => 'client']);
    }
    
    public static function create(array $data): int
    {
        $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        
        return Database::insert('users', [
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'role' => $data['role'] ?? 'staff',
            'type' => $data['type'] ?? 'internal',
            'company' => $data['company'] ?? null,
            'department_id' => $data['department_id'] ?? null,
        ]);
    }
    
    public static function update(int $id, array $data): bool
    {
        $updateData = [];
        
        if (isset($data['name'])) {
            $updateData['name'] = $data['name'];
        }
        if (isset($data['email'])) {
            $updateData['email'] = $data['email'];
        }
        if (isset($data['password']) && !empty($data['password'])) {
            $updateData['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }
        if (isset($data['role'])) {
            $updateData['role'] = $data['role'];
        }
        if (isset($data['type'])) {
            $updateData['type'] = $data['type'];
        }
        if (array_key_exists('company', $data)) {
            $updateData['company'] = $data['company'];
        }
        if (array_key_exists('department_id', $data)) {
            $updateData['department_id'] = $data['department_id'];
        }
        
        if (empty($updateData)) {
            return true;
        }
        
        return Database::update('users', $updateData, 'id = ? AND deleted_at IS NULL', [$id]) > 0;
    }
    
    public static function delete(int $id): bool
    {
        return Database::softDelete('users', 'id = ?', [$id]) > 0;
    }
    
    public static function verifyPassword(array $user, string $password): bool
    {
        return password_verify($password, $user['password']);
    }
    
    public static function isAdmin(array $user): bool
    {
        return $user['role'] === 'admin';
    }
    
    public static function isStaff(array $user): bool
    {
        return in_array($user['role'], ['admin', 'staff']);
    }
    
    public static function isClient(array $user): bool
    {
        return $user['role'] === 'client';
    }
    
    public static function isInternal(array $user): bool
    {
        return $user['type'] === 'internal';
    }
    
    public static function toSafeArray(array $user): array
    {
        unset($user['password']);
        return $user;
    }
    
    public static function getTaskCount(int $userId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM tasks 
             WHERE assignee_id = ? AND deleted_at IS NULL AND status != 'done' AND status != 'cancelled'",
            [$userId]
        );
        return $result['count'] ?? 0;
    }
}
