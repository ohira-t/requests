#!/bin/bash
# =====================================================
# Complete Backup Script (Database + Files)
# =====================================================

set -e  # エラーで停止

# ============ 設定 ============
PROJECT_DIR="/path/to/glug-tasks"  # ← 実際のパスに変更してください
BACKUP_BASE="/path/to/backups"     # ← 実際のバックアップ先に変更してください
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$BACKUP_BASE/$DATE"

# データベース設定（MySQL用）
DB_NAME="glug_reminders"
DB_USER="root"
DB_PASS=""
USE_MYSQL=true  # MySQLを使用する場合はtrue、SQLiteの場合はfalse

# SQLite設定
SQLITE_FILE="$PROJECT_DIR/database/database.sqlite"

# ============ バックアップ実行 ============
echo "========================================="
echo "Complete Backup Started: $(date)"
echo "========================================="

# バックアップディレクトリを作成
mkdir -p "$BACKUP_DIR"
cd "$BACKUP_DIR"

# 1. データベースバックアップ
echo ""
echo "[1/3] Backing up database..."
if [ "$USE_MYSQL" = true ]; then
    # MySQL
    if [ -z "$DB_PASS" ]; then
        mysqldump -u "$DB_USER" "$DB_NAME" | gzip > database.sql.gz
    else
        mysqldump -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" | gzip > database.sql.gz
    fi
    echo "✓ MySQL database backed up"
else
    # SQLite
    if [ -f "$SQLITE_FILE" ]; then
        sqlite3 "$SQLITE_FILE" ".backup database.sqlite"
        gzip database.sqlite
        echo "✓ SQLite database backed up"
    else
        echo "⚠ SQLite file not found: $SQLITE_FILE"
    fi
fi

# 2. アプリケーションコードのバックアップ（重要ファイルのみ）
echo ""
echo "[2/3] Backing up application code..."
tar -czf app_code.tar.gz \
    -C "$(dirname "$PROJECT_DIR")" \
    --exclude="vendor" \
    --exclude="node_modules" \
    --exclude=".git" \
    --exclude="database/database.sqlite" \
    --exclude="*.log" \
    "$(basename "$PROJECT_DIR")"
echo "✓ Application code backed up"

# 3. メタデータの作成
echo ""
echo "[3/3] Creating metadata..."
cat > metadata.txt <<EOF
=====================================
Backup Information
=====================================
Backup Date: $(date '+%Y-%m-%d %H:%M:%S')
Database: $DB_NAME
Project Directory: $PROJECT_DIR
Backup Type: Complete (Database + Code)
Database Type: $(if [ "$USE_MYSQL" = true ]; then echo "MySQL"; else echo "SQLite"; fi)

=====================================
Backup Contents
=====================================
EOF

# ファイルリストとサイズを追加
ls -lh | grep -v "^total" >> metadata.txt

echo "✓ Metadata created"

# 4. バックアップサマリー
echo ""
echo "========================================="
echo "Backup Summary"
echo "========================================="
BACKUP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Backup Location: $BACKUP_DIR"
echo "Total Size: $BACKUP_SIZE"
echo ""
ls -lh "$BACKUP_DIR"

# 5. 古いバックアップの削除（30日以上前）
echo ""
echo "Cleaning old backups (older than 30 days)..."
find "$BACKUP_BASE" -maxdepth 1 -type d -name "20*" -mtime +30 -exec rm -rf {} \; 2>/dev/null || true

BACKUP_COUNT=$(find "$BACKUP_BASE" -maxdepth 1 -type d -name "20*" | wc -l)
echo "Total backup directories: $BACKUP_COUNT"

echo ""
echo "========================================="
echo "Complete Backup Finished: $(date)"
echo "========================================="
