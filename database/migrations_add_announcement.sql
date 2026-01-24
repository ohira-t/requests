-- =====================================================
-- Migration: Add Announcement Notification Type
-- Date: 2026-01-24
-- Description: 管理者からのお知らせ通知機能を追加
-- =====================================================

-- 既存データに影響を与えない安全な変更
-- notifications テーブルの type ENUM に 'announcement' を追加

ALTER TABLE notifications 
MODIFY COLUMN type ENUM(
    'task_assigned', 
    'task_updated', 
    'task_completed', 
    'comment_added', 
    'task_due_soon',
    'announcement'  -- 新規追加
) NOT NULL;

-- ロールバック用SQL（必要な場合）
-- ALTER TABLE notifications 
-- MODIFY COLUMN type ENUM(
--     'task_assigned', 
--     'task_updated', 
--     'task_completed', 
--     'comment_added', 
--     'task_due_soon'
-- ) NOT NULL;
