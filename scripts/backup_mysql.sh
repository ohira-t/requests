#!/bin/bash
# =====================================================
# MySQL Database Backup Script
# =====================================================

set -e  # エラーで停止

# ============ 設定 ============
# データベース接続情報
DB_NAME="glug_reminders"
DB_USER="root"  # ← 実際のユーザー名に変更してください
DB_PASS=""      # ← 実際のパスワードに変更してください（空の場合は-pを削除）
DB_HOST="localhost"
DB_PORT="3306"

# バックアップ設定
BACKUP_DIR="/path/to/backups/database"  # ← 実際のバックアップ先に変更してください
RETENTION_DAYS=30  # 保持日数
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sql.gz"

# ============ バックアップ実行 ============
echo "==================================="
echo "MySQL Backup Started: $(date)"
echo "==================================="

# バックアップディレクトリを作成
mkdir -p "$BACKUP_DIR"

# データベースバックアップ（圧縮して保存）
echo "Backing up database: $DB_NAME"
if [ -z "$DB_PASS" ]; then
    # パスワードなしの場合
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"
else
    # パスワードありの場合
    mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > "$BACKUP_FILE"
fi

# バックアップファイルのサイズを確認
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup file created: $BACKUP_FILE (Size: $BACKUP_SIZE)"

# 古いバックアップを削除
echo "Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete

# 残っているバックアップ数を表示
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql.gz" | wc -l)
echo "Total backups: $BACKUP_COUNT"

echo "==================================="
echo "MySQL Backup Completed: $(date)"
echo "==================================="
