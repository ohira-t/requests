# さくらインターネット レンタルサーバー デプロイガイド

## 前提条件

- さくらインターネット スタンダードプラン以上（MySQLが必要）
- PHP 8.0以上
- MySQL 5.7以上

## デプロイ手順

### 1. データベースの作成

1. さくらインターネットのコントロールパネルにログイン
2. 「データベース」→「新規作成」
3. データベース名を設定（例: `requests`）
4. 文字コード: `UTF-8 (utf8mb4)` を選択

### 2. データベースのセットアップ

phpMyAdminまたはSSHで `database/migrations.sql` を実行：

```bash
# SSHでログインした場合
mysql -h mysql○○.sakura.ne.jp -u アカウント名 -p データベース名 < database/migrations.sql
```

### 3. ファイルのアップロード

#### ディレクトリ構成（サブディレクトリにデプロイする場合）

```
/home/アカウント名/www/
└── requests/              ← アプリケーションルート
    ├── public/            ← ドキュメントルート（ここを公開）
    │   ├── index.php
    │   ├── app.html
    │   ├── .htaccess
    │   └── assets/
    ├── src/
    ├── database/
    └── .env               ← 環境設定（要作成）
```

#### FTP/SFTPでアップロード

以下のファイル・フォルダをアップロード：
- `public/` フォルダ全体
- `src/` フォルダ全体
- `database/` フォルダ全体
- `composer.json`
- `.htaccess`（ルート）

**アップロードしないファイル:**
- `.env`（サーバー上で作成）
- `vendor/`（サーバー上で composer install）
- `tests/`
- `.git/`

### 4. 環境設定ファイルの作成

サーバー上で `.env` ファイルを作成：

```bash
# SSH接続後
cd ~/www/requests
cp .env.example .env
vi .env
```

`.env` の内容：

```env
# Database Configuration
DB_HOST=mysql○○.sakura.ne.jp
DB_PORT=3306
DB_DATABASE=アカウント名_requests
DB_USERNAME=アカウント名
DB_PASSWORD=データベースパスワード

# Application Environment
APP_ENV=production
APP_DEBUG=false
```

### 5. Composerの実行（SSH）

```bash
cd ~/www/requests
composer install --no-dev --optimize-autoloader
```

※ Composerが使えない場合は、ローカルで `composer install` して `vendor/` フォルダごとアップロード

### 6. パーミッションの設定

```bash
chmod 755 ~/www/requests/public
chmod 644 ~/www/requests/public/.htaccess
chmod 600 ~/www/requests/.env
```

### 7. サブディレクトリの場合の追加設定

#### public/.htaccess の RewriteBase を変更

```apache
RewriteBase /requests/public/
```

#### public/assets/js/api.js の BASE_URL を変更

```javascript
const API_BASE_URL = '/requests/public/api';
```

### 8. 動作確認

ブラウザでアクセス：
```
https://アカウント名.sakura.ne.jp/requests/public/app.html
```

---

## トラブルシューティング

### 500 Internal Server Error

1. `.htaccess` の文法エラーを確認
2. PHP バージョンを確認（8.0以上が必要）
3. エラーログを確認: `~/log/error.log`

### データベース接続エラー

1. `.env` のデータベース情報を確認
2. MySQLホスト名が正しいか確認（さくらは専用ホスト名）

### セッションが維持されない

`src/Utils/Session.php` で cookie_path を確認：
```php
'path' => '/requests/public/',  // サブディレクトリの場合
```

### CSSやJSが読み込まれない

ブラウザのネットワークタブで404を確認し、パスを修正

---

## 独自ドメインでルートにデプロイする場合

1. 独自ドメインのドキュメントルートを `~/www/requests/public` に設定
2. `.htaccess` の `RewriteBase /` をそのまま使用
3. `api.js` の `API_BASE_URL` を `/api` に設定
