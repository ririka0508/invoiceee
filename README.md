# invoiceee

Automated invoice downloader with Next.js + Express + Playwright + PostgreSQL

## 🚀 Features

- **自動請求書ダウンロード**: Playwrightを使用した高度な自動化
- **Next.js フロントエンド**: モダンなReact UIとTypeScript
- **Google OAuth認証**: next-authによるセキュアな認証
- **PostgreSQL データベース**: ユーザーデータとダウンロード履歴の管理
- **Railway対応**: 簡単なクラウドデプロイ

## 🏗️ Architecture

```
├── server/              # Express API サーバー
│   ├── routes/         # API エンドポイント
│   ├── models/         # データベースモデル
│   ├── middleware/     # 認証ミドルウェア
│   └── utils/          # ユーティリティ
├── client/             # Next.js フロントエンド
│   ├── src/app/        # App Router
│   ├── src/components/ # UIコンポーネント
│   └── src/types/      # TypeScript型定義
└── downloads/          # ダウンロードファイル保存先
```

## 🛠️ Setup

### 1. 依存関係のインストール

```bash
# ルートディレクトリ
npm install

# クライアント
cd client && npm install
```

### 2. 環境変数の設定

```bash
# ルートに .env ファイルを作成
cp .env.example .env

# クライアントに .env.local ファイルを作成
cp client/.env.example client/.env.local
```

### 3. Google OAuth設定

1. [Google Cloud Console](https://console.cloud.google.com/)でプロジェクトを作成
2. OAuth 2.0 認証情報を作成
3. 認証されたリダイレクトURIに `http://localhost:3000/api/auth/callback/google` を追加
4. CLIENT_IDとCLIENT_SECRETを環境変数に設定

### 4. PostgreSQLデータベース

```bash
# ローカル開発の場合
createdb invoiceee

# Railway PostgreSQLを使用する場合
# Railway Dashboardで PostgreSQL アドオンを追加し、DATABASE_URLを取得
```

### 5. 開発サーバー起動

```bash
# 同時起動
npm run dev

# 個別起動
npm run dev:server  # API サーバー (Port 5000)
npm run dev:client  # Next.js (Port 3000)
```

## 🚀 Railway Deployment

### 1. Railway プロジェクト作成

```bash
# Railway CLI をインストール
npm install -g @railway/cli

# ログイン
railway login

# プロジェクト作成
railway init
```

### 2. PostgreSQL アドオン追加

Railway Dashboard で PostgreSQL アドオンを追加

### 3. 環境変数設定

Railway Dashboard で以下の環境変数を設定:

```
DATABASE_URL=<Railway PostgreSQL URL>
JWT_SECRET=<ランダムな文字列>
GOOGLE_CLIENT_ID=<Google OAuth Client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth Client Secret>
NEXTAUTH_SECRET=<ランダムな文字列>
NEXTAUTH_URL=<Railway デプロイURL>
NODE_ENV=production
```

### 4. デプロイ

```bash
railway deploy
```

## 🔧 Usage

1. **認証**: Googleアカウントでサインイン
2. **ポータル設定**: 請求書ダウンロード先のポータル情報を登録
3. **自動ダウンロード**: 設定済みポータルから請求書を自動取得
4. **履歴確認**: ダウンロード履歴とファイル管理

## 🛡️ Security Features

- JWT ベース認証
- CORS 保護
- Rate limiting
- Helmet.js セキュリティヘッダー
- 暗号化されたパスワード保存

## 📝 API Endpoints

### Authentication
- `POST /api/auth/google` - Google OAuth認証
- `GET /api/auth/verify` - トークン検証
- `POST /api/auth/logout` - ログアウト

### Invoices
- `GET /api/invoices/portals` - ポータル一覧取得
- `POST /api/invoices/portals` - ポータル作成
- `PUT /api/invoices/portals/:id` - ポータル更新
- `DELETE /api/invoices/portals/:id` - ポータル削除

### Downloads
- `POST /api/download` - ダウンロード実行
- `GET /api/download/history` - ダウンロード履歴

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

MIT License