# バックアップガイド

このディレクトリには、Requestsアプリのバックアップ/リストア用スクリプトが含まれています。

## 📁 スクリプト一覧

| スクリプト | 用途 | データベース |
|-----------|------|-------------|
| `backup_mysql.sh` | MySQLのバックアップのみ | MySQL |
| `backup_sqlite.sh` | SQLiteのバックアップのみ | SQLite |
| `backup_complete.sh` | DB + アプリコードの完全バックアップ | MySQL/SQLite |
| `restore.sh` | バックアップからのリストア | MySQL/SQLite |

---

## 🚀 初期設定

### 1. スクリプトに実行権限を付与

```bash
cd /path/to/glug-tasks/scripts
chmod +x *.sh
```

### 2. 設定を編集

各スクリプトの上部にある設定を編集してください：

```bash
# 例: backup_mysql.sh の設定部分
DB_NAME="glug_reminders"
DB_USER="root"  # ← あなたのユーザー名
DB_PASS=""      # ← あなたのパスワード
BACKUP_DIR="/path/to/backups/database"  # ← バックアップ先
```

### 3. バックアップディレクトリを作成

```bash
mkdir -p /path/to/backups/database
```

---

## 💾 バックアップの実行

### 手動バックアップ

#### MySQL の場合
```bash
./backup_mysql.sh
```

#### SQLite の場合
```bash
./backup_sqlite.sh
```

#### 完全バックアップ（DB + コード）
```bash
./backup_complete.sh
```

---

## ⏰ 自動バックアップ（cron）

### cronジョブの設定

```bash
# crontabを編集
crontab -e

# 以下を追加
```

#### パターン1: 毎日午前3時に実行
```cron
0 3 * * * /path/to/glug-tasks/scripts/backup_complete.sh >> /path/to/logs/backup.log 2>&1
```

#### パターン2: 日次・週次・月次バックアップ
```cron
# 毎日午前3時（日次）
0 3 * * * /path/to/glug-tasks/scripts/backup_mysql.sh >> /path/to/logs/backup_daily.log 2>&1

# 毎週日曜日午前2時（週次・完全バックアップ）
0 2 * * 0 /path/to/glug-tasks/scripts/backup_complete.sh >> /path/to/logs/backup_weekly.log 2>&1

# 毎月1日午前1時（月次・完全バックアップ）
0 1 1 * * /path/to/glug-tasks/scripts/backup_complete.sh >> /path/to/logs/backup_monthly.log 2>&1
```

#### パターン3: 頻繁なバックアップ
```cron
# 4時間ごと（6:00, 10:00, 14:00, 18:00, 22:00）
0 6,10,14,18,22 * * * /path/to/glug-tasks/scripts/backup_mysql.sh >> /path/to/logs/backup.log 2>&1
```

---

## 🔄 リストア（復元）

### 基本的な使い方

```bash
# バックアップファイルを指定してリストア
./restore.sh /path/to/backups/20260124_030000/database.sql.gz
```

### 注意事項

⚠️ **リストアは現在のデータベースを上書きします！**
- 必ず確認メッセージが表示されます
- 既存のデータベースは自動的にバックアップされます（SQLiteの場合）

### 例

```bash
# MySQL のリストア
./restore.sh /path/to/backups/database/backup_20260124_030000.sql.gz

# SQLite のリストア
./restore.sh /path/to/backups/20260124_030000/database.sqlite.gz
```

---

## 📋 バックアップのベストプラクティス

### 3-2-1 ルール

- **3つ**のコピー: 本番データ + バックアップ2つ
- **2つ**の異なるメディア: ローカル + リモート
- **1つ**はオフサイト: 別のサーバーやクラウド

### 世代管理

デフォルトでは30日間保持されます。長期保存が必要な場合：

```bash
# 月次バックアップを別ディレクトリに保存
0 1 1 * * /path/to/scripts/backup_complete.sh && \
  cp -r /path/to/backups/$(ls -t /path/to/backups/ | head -1) \
  /path/to/backups/monthly/$(date +%Y%m)
```

### 定期的なテスト

**月1回はリストアテストを実施してください！**

1. テスト環境でリストアを実行
2. データが正しく復元されることを確認
3. アプリが正常に動作することを確認

---

## 🌐 オフサイトバックアップ

### rsync でリモートサーバーに転送

```bash
# バックアップ後にリモートサーバーに転送
rsync -avz --delete \
  /path/to/backups/ \
  backup_user@remote.server.com:/backups/glug-tasks/
```

### cronで自動化

```bash
# 毎日午前4時にリモート転送
0 4 * * * rsync -avz /path/to/backups/ backup_user@remote:/backups/glug-tasks/ >> /path/to/logs/rsync.log 2>&1
```

---

## 🔐 セキュリティ

### バックアップの暗号化

機密データを含む場合は暗号化を推奨：

```bash
# 暗号化してバックアップ
mysqldump -u user -ppass database | gzip | \
  openssl enc -aes-256-cbc -salt -out backup.sql.gz.enc

# 復号してリストア
openssl enc -aes-256-cbc -d -in backup.sql.gz.enc | \
  gunzip | mysql -u user -ppass database
```

### パスワード管理

スクリプトにパスワードを直接書かない場合：

```bash
# .my.cnf を使用（MySQL）
cat > ~/.my.cnf <<EOF
[client]
user=your_username
password=your_password
EOF
chmod 600 ~/.my.cnf

# スクリプトでは -p オプションを削除
mysqldump database | gzip > backup.sql.gz
```

---

## 📊 バックアップの確認

### バックアップ一覧を表示

```bash
# 日付順にバックアップを表示
ls -lht /path/to/backups/

# サイズ情報を含めて表示
du -sh /path/to/backups/*
```

### バックアップの整合性チェック

```bash
# gzipファイルの整合性確認
gunzip -t /path/to/backups/backup_*.sql.gz

# SQLiteファイルの整合性確認
gunzip -c /path/to/backups/backup_*.sqlite.gz | sqlite3 :memory: "PRAGMA integrity_check;"
```

---

## ❓ トラブルシューティング

### エラー: Permission denied

```bash
chmod +x /path/to/scripts/*.sh
```

### エラー: command not found

必要なコマンドをインストール：

```bash
# MySQL
sudo apt install mysql-client  # Debian/Ubuntu
brew install mysql-client       # macOS

# SQLite
sudo apt install sqlite3        # Debian/Ubuntu
brew install sqlite3            # macOS
```

### バックアップファイルが大きすぎる

圧縮レベルを上げる：

```bash
mysqldump database | gzip -9 > backup.sql.gz  # 最高圧縮
```

---

## 📞 サポート

問題が発生した場合は、ログファイルを確認してください：

```bash
tail -f /path/to/logs/backup.log
```
