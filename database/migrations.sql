-- GLUG Reminders Database Schema
-- Version: 1.0
-- Date: 2026-01-20

-- Create database (if needed)
-- CREATE DATABASE IF NOT EXISTS glug_reminders CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE glug_reminders;

-- -----------------------------------------------------
-- Table: departments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS departments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#6366F1',
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    INDEX idx_display_order (display_order),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: users
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'staff', 'client') NOT NULL DEFAULT 'staff',
    type ENUM('internal', 'client') NOT NULL DEFAULT 'internal',
    company VARCHAR(100) NULL,
    department_id INT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_type (type),
    INDEX idx_role (role),
    INDEX idx_department (department_id),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: categories
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at DATETIME NULL,
    INDEX idx_display_order (display_order),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: tasks
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id VARCHAR(20) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    status ENUM('backlog', 'todo', 'in_progress', 'done', 'cancelled') NOT NULL DEFAULT 'todo',
    priority ENUM('urgent', 'high', 'medium', 'low') NOT NULL DEFAULT 'medium',
    creator_id INT NOT NULL,
    assignee_id INT NULL,
    category_id INT NULL,
    due_date DATE NULL,
    tags JSON NULL,
    display_order INT DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    deleted_at DATETIME NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE RESTRICT,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
    INDEX idx_ticket_id (ticket_id),
    INDEX idx_creator (creator_id),
    INDEX idx_assignee (assignee_id),
    INDEX idx_category (category_id),
    INDEX idx_status (status),
    INDEX idx_priority (priority),
    INDEX idx_due_date (due_date),
    INDEX idx_display_order (display_order),
    INDEX idx_deleted (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: comments
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    user_id INT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT,
    INDEX idx_task (task_id),
    INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: sessions
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(128) PRIMARY KEY,
    user_id INT NULL,
    data TEXT,
    last_activity INT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_last_activity (last_activity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table: notifications
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('task_assigned', 'task_updated', 'task_completed', 'comment_added', 'task_due_soon') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NULL,
    task_id INT NULL,
    related_user_id INT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (related_user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_user (user_id),
    INDEX idx_task (task_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Insert default categories
-- -----------------------------------------------------
INSERT INTO categories (name, color, display_order) VALUES
('開発', '#3B82F6', 1),
('デザイン', '#EC4899', 2),
('営業', '#22C55E', 3),
('サポート', '#F59E0B', 4),
('コンテンツ', '#8B5CF6', 5),
('リサーチ', '#06B6D4', 6)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- -----------------------------------------------------
-- Insert default admin user
-- Password: admin123 (bcrypt hash)
-- IMPORTANT: Change this password after first login!
-- -----------------------------------------------------
INSERT INTO users (name, email, password, role, type) VALUES
('管理者', 'admin@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'internal')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Sample staff users
INSERT INTO users (name, email, password, role, type) VALUES
('田中太郎', 'tanaka@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff', 'internal'),
('佐藤花子', 'sato@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff', 'internal'),
('山本次郎', 'yamamoto@example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'staff', 'internal')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Sample client users
INSERT INTO users (name, email, password, role, type, company) VALUES
('鈴木商事 担当者', 'suzuki@client.example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', 'client', '株式会社鈴木商事'),
('ABC株式会社 担当者', 'abc@client.example.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'client', 'client', 'ABC株式会社')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- -----------------------------------------------------
-- Insert default departments
-- -----------------------------------------------------
INSERT INTO departments (name, color, display_order) VALUES
('経営企画', '#6366F1', 1),
('営業', '#22C55E', 2),
('開発', '#3B82F6', 3),
('デザイン', '#EC4899', 4),
('マーケティング', '#F59E0B', 5),
('カスタマーサポート', '#06B6D4', 6)
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- -----------------------------------------------------
-- Migration: Add department_id to existing users table
-- Run this if you already have the users table
-- -----------------------------------------------------
-- ALTER TABLE users ADD COLUMN department_id INT NULL AFTER company;
-- ALTER TABLE users ADD FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL;
-- ALTER TABLE users ADD INDEX idx_department (department_id);
