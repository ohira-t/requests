#!/bin/bash
# =====================================================
# Database Restore Script
# =====================================================

set -e  # エラーで停止

# ============ 使用方法 ============
if [ $# -eq 0 ]; then
    echo "Usage: $0 <backup_file>"
    echo ""
    echo "Examples:"
    echo "  $0 /path/to/backups/20260124_030000/database.sql.gz    # MySQL"
    echo "  $0 /path/to/backups/20260124_030000/database.sqlite.gz # SQLite"
    echo "  $0 /path/to/backups/database/backup_20260124_030000.sql.gz  # MySQL (single file)"
    exit 1
fi

BACKUP_FILE="$1"

# バックアップファイルが存在するか確認
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# ============ 設定 ============
DB_NAME="glug_reminders"
DB_USER="root"
DB_PASS=""
PROJECT_DIR="/path/to/glug-tasks"  # ← 実際のパスに変更してください

echo "========================================="
echo "Database Restore"
echo "========================================="
echo "Backup File: $BACKUP_FILE"
echo ""

# 確認
read -p "⚠️  WARNING: This will REPLACE the current database. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

# ファイルタイプを判定
if [[ "$BACKUP_FILE" == *.sql.gz ]]; then
    # MySQL
    echo ""
    echo "Detected: MySQL backup"
    echo "Restoring MySQL database..."
    
    if [ -z "$DB_PASS" ]; then
        gunzip -c "$BACKUP_FILE" | mysql -u "$DB_USER" "$DB_NAME"
    else
        gunzip -c "$BACKUP_FILE" | mysql -u "$DB_USER" -p"$DB_PASS" "$DB_NAME"
    fi
    
    echo "✓ MySQL database restored successfully"
    
elif [[ "$BACKUP_FILE" == *.sqlite.gz ]]; then
    # SQLite
    echo ""
    echo "Detected: SQLite backup"
    echo "Restoring SQLite database..."
    
    SQLITE_FILE="$PROJECT_DIR/database/database.sqlite"
    
    # 現在のデータベースをバックアップ
    if [ -f "$SQLITE_FILE" ]; then
        TEMP_BACKUP="${SQLITE_FILE}.before_restore_$(date +%Y%m%d_%H%M%S)"
        echo "Creating safety backup: $TEMP_BACKUP"
        cp "$SQLITE_FILE" "$TEMP_BACKUP"
    fi
    
    # リストア
    gunzip -c "$BACKUP_FILE" > "$SQLITE_FILE"
    
    echo "✓ SQLite database restored successfully"
    echo "Safety backup: $TEMP_BACKUP"
    
else
    echo "Error: Unknown file type. Expected .sql.gz or .sqlite.gz"
    exit 1
fi

echo ""
echo "========================================="
echo "Restore Completed: $(date)"
echo "========================================="
