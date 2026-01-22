<?php

namespace App\Models;

use App\Utils\Database;

class Category
{
    public static function findById(int $id): ?array
    {
        return Database::fetch(
            "SELECT * FROM categories WHERE id = ? AND deleted_at IS NULL",
            [$id]
        );
    }
    
    public static function getAll(): array
    {
        return Database::fetchAll(
            "SELECT * FROM categories WHERE deleted_at IS NULL ORDER BY display_order ASC, name ASC"
        );
    }
    
    public static function create(array $data): int
    {
        $maxOrder = Database::fetch(
            "SELECT MAX(display_order) as max_order FROM categories WHERE deleted_at IS NULL"
        );
        
        return Database::insert('categories', [
            'name' => $data['name'],
            'color' => $data['color'] ?? '#3B82F6',
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
        
        return Database::update('categories', $updateData, 'id = ? AND deleted_at IS NULL', [$id]) > 0;
    }
    
    public static function delete(int $id): bool
    {
        return Database::softDelete('categories', 'id = ?', [$id]) > 0;
    }
    
    public static function reorder(array $order): bool
    {
        Database::beginTransaction();
        
        try {
            foreach ($order as $index => $id) {
                Database::update(
                    'categories',
                    ['display_order' => $index + 1],
                    'id = ?',
                    [$id]
                );
            }
            Database::commit();
            return true;
        } catch (\Exception $e) {
            Database::rollback();
            return false;
        }
    }
    
    public static function reorderWithObjects(array $categories): bool
    {
        Database::beginTransaction();
        
        try {
            foreach ($categories as $item) {
                if (isset($item['id']) && isset($item['sort_order'])) {
                    Database::update(
                        'categories',
                        ['display_order' => (int)$item['sort_order'] + 1],
                        'id = ?',
                        [(int)$item['id']]
                    );
                }
            }
            Database::commit();
            return true;
        } catch (\Exception $e) {
            Database::rollback();
            return false;
        }
    }
    
    public static function getTaskCount(int $categoryId): int
    {
        $result = Database::fetch(
            "SELECT COUNT(*) as count FROM tasks 
             WHERE category_id = ? AND deleted_at IS NULL AND status != 'done' AND status != 'cancelled'",
            [$categoryId]
        );
        return $result['count'] ?? 0;
    }
    
    public static function getWithTaskCounts(): array
    {
        return Database::fetchAll(
            "SELECT c.*, 
                    COUNT(CASE WHEN t.status NOT IN ('done', 'cancelled') AND t.deleted_at IS NULL THEN 1 END) as active_count,
                    COUNT(CASE WHEN t.status = 'done' AND t.deleted_at IS NULL THEN 1 END) as completed_count
             FROM categories c
             LEFT JOIN tasks t ON c.id = t.category_id
             WHERE c.deleted_at IS NULL
             GROUP BY c.id
             ORDER BY c.display_order ASC, c.name ASC"
        );
    }
}
