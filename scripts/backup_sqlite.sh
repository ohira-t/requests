#!/bin/bash
# =====================================================
# SQLite Database Backup Script
# =====================================================

set -e  # エラーで停止

# ============ 設定 ============
# SQLiteファイルのパス
SQLITE_FILE="/path/to/glug-tasks/database/database.sqlite"  # ← 実際のパスに変更してください
BACKUP_DIR="/path/to/backups/database"  # ← 実際のバックアップ先に変更してください
RETENTION_DAYS=30  # 保持日数
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/backup_${DATE}.sqlite"

# ============ バックアップ実行 ============
echo "==================================="
echo "SQLite Backup Started: $(date)"
echo "==================================="

# バックアップディレクトリを作成
mkdir -p "$BACKUP_DIR"

# SQLiteファイルが存在するか確認
if [ ! -f "$SQLITE_FILE" ]; then
    echo "Error: SQLite database file not found: $SQLITE_FILE"
    exit 1
fi

# SQLiteの安全なバックアップ方法（.backupコマンド使用）
echo "Backing up SQLite database: $SQLITE_FILE"
sqlite3 "$SQLITE_FILE" ".backup '$BACKUP_FILE'"

# バックアップを圧縮
echo "Compressing backup..."
gzip "$BACKUP_FILE"
BACKUP_FILE="${BACKUP_FILE}.gz"

# バックアップファイルのサイズを確認
BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup file created: $BACKUP_FILE (Size: $BACKUP_SIZE)"

# 古いバックアップを削除
echo "Cleaning old backups (older than $RETENTION_DAYS days)..."
find "$BACKUP_DIR" -name "backup_*.sqlite.gz" -mtime +$RETENTION_DAYS -delete

# 残っているバックアップ数を表示
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sqlite.gz" | wc -l)
echo "Total backups: $BACKUP_COUNT"

echo "==================================="
echo "SQLite Backup Completed: $(date)"
echo "==================================="
