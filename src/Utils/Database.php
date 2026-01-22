<?php

namespace App\Utils;

use PDO;
use PDOException;

class Database
{
    private static ?PDO $instance = null;
    
    public static function getInstance(): PDO
    {
        if (self::$instance === null) {
            $config = require __DIR__ . '/../Config/database.php';
            
            try {
                $dsn = sprintf(
                    '%s:host=%s;port=%s;dbname=%s;charset=%s',
                    $config['driver'],
                    $config['host'],
                    $config['port'],
                    $config['database'],
                    $config['charset']
                );
                
                self::$instance = new PDO(
                    $dsn,
                    $config['username'],
                    $config['password'],
                    $config['options']
                );
            } catch (PDOException $e) {
                if (($_ENV['APP_DEBUG'] ?? false)) {
                    throw $e;
                }
                throw new PDOException('Database connection failed');
            }
        }
        
        return self::$instance;
    }
    
    public static function query(string $sql, array $params = []): \PDOStatement
    {
        $stmt = self::getInstance()->prepare($sql);
        $stmt->execute($params);
        return $stmt;
    }
    
    public static function fetchAll(string $sql, array $params = []): array
    {
        return self::query($sql, $params)->fetchAll();
    }
    
    public static function fetch(string $sql, array $params = []): ?array
    {
        $result = self::query($sql, $params)->fetch();
        return $result ?: null;
    }
    
    public static function insert(string $table, array $data): int
    {
        $columns = implode(', ', array_keys($data));
        $placeholders = implode(', ', array_fill(0, count($data), '?'));
        
        $sql = "INSERT INTO {$table} ({$columns}) VALUES ({$placeholders})";
        self::query($sql, array_values($data));
        
        return (int) self::getInstance()->lastInsertId();
    }
    
    public static function update(string $table, array $data, string $where, array $whereParams = []): int
    {
        $set = implode(' = ?, ', array_keys($data)) . ' = ?';
        $sql = "UPDATE {$table} SET {$set} WHERE {$where}";
        
        $stmt = self::query($sql, array_merge(array_values($data), $whereParams));
        return $stmt->rowCount();
    }
    
    public static function delete(string $table, string $where, array $params = []): int
    {
        $sql = "DELETE FROM {$table} WHERE {$where}";
        $stmt = self::query($sql, $params);
        return $stmt->rowCount();
    }
    
    public static function softDelete(string $table, string $where, array $params = []): int
    {
        $sql = "UPDATE {$table} SET deleted_at = NOW() WHERE {$where}";
        $stmt = self::query($sql, $params);
        return $stmt->rowCount();
    }
    
    public static function beginTransaction(): void
    {
        self::getInstance()->beginTransaction();
    }
    
    public static function commit(): void
    {
        self::getInstance()->commit();
    }
    
    public static function rollback(): void
    {
        self::getInstance()->rollBack();
    }
}
