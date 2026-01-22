# GLUG Reminders

社内タスク管理および社外クライアントへの依頼管理を行うWebアプリケーション

## 機能

- **認証機能**: ログイン/ログアウト、セッション管理
- **ダッシュボード**: 3つのビュー（自分の課題/依頼した課題/クライアント別）
- **タスク管理**: 作成、編集、完了、削除、ドラッグ&ドロップ並び替え
- **カテゴリー管理**: カテゴリーの追加、編集、削除
- **コメント機能**: タスクへのコメント追加
- **ユーザー管理**: 管理者によるユーザー追加、編集、削除

## 動作環境

- PHP 8.0以上
- MySQL 5.7以上 / MariaDB 10以上
- Apache (mod_rewrite有効)

## セットアップ

### 1. ファイルの配置

プロジェクトファイルをWebサーバーのドキュメントルートに配置します。

### 2. 環境設定

`env.example`を`.env`にコピーして、データベース接続情報を設定します:

```bash
cp env.example .env
```

`.env`ファイルを編集:

```env
APP_NAME="GLUG Reminders"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=glug_reminders
DB_USERNAME=your_username
DB_PASSWORD=your_password

APP_TIMEZONE=Asia/Tokyo
```

### 3. データベースのセットアップ

phpMyAdminまたはMySQLコマンドラインで、`database/migrations.sql`を実行してテーブルを作成します:

```sql
SOURCE /path/to/database/migrations.sql;
```

### 4. Composerの依存関係（オプション）

phpdotenvを使用する場合:

```bash
composer install
```

※ 本システムはComposerなしでも動作します

### 5. ディレクトリの権限

```bash
chmod -R 755 storage/
chmod -R 755 public/
```

### 6. Apacheの設定

`.htaccess`が有効になっていることを確認してください。

## 初期アカウント

| ユーザー | メール | パスワード | 権限 |
|---------|--------|-----------|------|
| 管理者 | admin@example.com | password | admin |
| 田中太郎 | tanaka@example.com | password | staff |
| 佐藤花子 | sato@example.com | password | staff |

**⚠️ 本番環境では必ずパスワードを変更してください！**

## ディレクトリ構成

```
glug-reminders/
├── public/                 # 公開ディレクトリ
│   ├── index.php          # エントリーポイント
│   ├── app.html           # SPAメインHTML
│   ├── assets/            # 静的ファイル
│   │   ├── css/style.css
│   │   └── js/
│   │       ├── api.js     # API クライアント
│   │       └── app.js     # メインアプリ
│   └── .htaccess
│
├── src/                    # PHPソースコード
│   ├── Config/            # 設定ファイル
│   ├── Controllers/       # コントローラー
│   ├── Models/            # モデル
│   ├── Middleware/        # ミドルウェア
│   ├── Utils/             # ユーティリティ
│   └── Routes/            # ルーティング
│
├── database/
│   └── migrations.sql     # DBマイグレーション
│
├── storage/
│   └── logs/              # ログファイル
│
├── .env                   # 環境変数（要作成）
├── env.example            # 環境変数サンプル
└── composer.json
```

## API エンドポイント

### 認証

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /api/auth/login | ログイン |
| POST | /api/auth/logout | ログアウト |
| GET | /api/auth/me | 現在のユーザー情報 |

### タスク

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/tasks | タスク一覧取得 |
| GET | /api/tasks/{id} | タスク詳細取得 |
| POST | /api/tasks | タスク作成 |
| PUT | /api/tasks/{id} | タスク更新 |
| DELETE | /api/tasks/{id} | タスク削除 |
| PUT | /api/tasks/{id}/complete | タスク完了切替 |

### カテゴリー

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/categories | カテゴリー一覧 |
| POST | /api/categories | カテゴリー作成 |
| PUT | /api/categories/{id} | カテゴリー更新 |
| DELETE | /api/categories/{id} | カテゴリー削除 |

### ユーザー（管理者のみ）

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /api/users | ユーザー一覧 |
| POST | /api/users | ユーザー作成 |
| PUT | /api/users/{id} | ユーザー更新 |
| DELETE | /api/users/{id} | ユーザー削除 |

## 開発

### ローカル開発サーバー

```bash
cd public
php -S localhost:8000
```

ブラウザで http://localhost:8000 にアクセス

## ライセンス

MIT License

## 作成者

GLUG Team
