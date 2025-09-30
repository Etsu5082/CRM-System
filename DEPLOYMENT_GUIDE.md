# 証券CRMシステム デプロイガイド

本番環境へのデプロイ手順を説明します。無料プランでデプロイできる方法を中心に解説します。

---

## 📋 目次

1. [デプロイ前の準備](#デプロイ前の準備)
2. [推奨構成](#推奨構成)
3. [データベースのセットアップ](#データベースのセットアップ)
4. [バックエンドのデプロイ](#バックエンドのデプロイ)
5. [フロントエンドのデプロイ](#フロントエンドのデプロイ)
6. [環境変数の設定](#環境変数の設定)
7. [初期データの投入](#初期データの投入)
8. [動作確認](#動作確認)
9. [トラブルシューティング](#トラブルシューティング)

---

## デプロイ前の準備

### 必要なアカウント

以下のサービスに登録してください（すべて無料プランあり）：

1. **GitHub** - コードの管理・デプロイに使用
2. **Neon** (https://neon.tech/) - PostgreSQLデータベース
3. **Render** (https://render.com/) - バックエンドAPI
4. **Vercel** (https://vercel.com/) - フロントエンド

### GitHubへのプッシュ

まず、コードをGitHubにプッシュします：

```bash
cd "/Users/kohetsuwatanabe/Library/CloudStorage/OneDrive-個人用/ETSU-DX/CRMシステム開発"

# Gitリポジトリの初期化（まだの場合）
git init
git add .
git commit -m "Initial commit: Securities CRM System"

# GitHubリポジトリを作成後、リモートを追加
git remote add origin https://github.com/YOUR_USERNAME/securities-crm.git
git branch -M main
git push -u origin main
```

---

## 推奨構成

### 無料プランの構成

```
┌─────────────────────────────────────────────┐
│          ユーザー（ブラウザ）                │
└─────────────────┬───────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
    ▼                           ▼
┌─────────┐               ┌──────────┐
│ Vercel  │               │  Render  │
│ (Next.js│◄─────────────►│(Express) │
│Frontend)│   API Call    │ Backend  │
└─────────┘               └────┬─────┘
                               │
                               ▼
                          ┌─────────┐
                          │  Neon   │
                          │(PostgreSQL)│
                          └─────────┘
```

### 費用

- **Neon**: 無料（0.5GB、3プロジェクトまで）
- **Render**: 無料（750時間/月、スリープあり）
- **Vercel**: 無料（100GB帯域、無制限デプロイ）

**合計: 完全無料**

---

## データベースのセットアップ

### 1. Neon（PostgreSQL）のセットアップ

1. [Neon](https://neon.tech/)にアクセス
2. 「Sign Up」でアカウント作成（GitHubアカウントで登録可）
3. 「Create a project」をクリック
4. プロジェクト名: `securities-crm-db`
5. リージョン: `AWS Tokyo (ap-northeast-1)` 推奨
6. PostgreSQLバージョン: 最新版
7. 「Create project」をクリック

### 2. 接続文字列の取得

プロジェクト作成後、接続文字列が表示されます：

```
postgres://username:password@ep-xxx.ap-northeast-1.aws.neon.tech/neondb?sslmode=require
```

この接続文字列を**メモ帳などに保存**してください。後で使います。

### 3. Prismaスキーマの更新

`backend/prisma/schema.prisma` を編集：

```prisma
datasource db {
  provider = "postgresql"  // sqliteから変更
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

// モデル定義はそのまま
model User {
  // ... 既存の定義
}
// ... 以下同様
```

---

## バックエンドのデプロイ

### 1. Renderでのセットアップ

1. [Render](https://render.com/)にアクセス
2. 「Sign Up」でアカウント作成（GitHubアカウントで登録）
3. ダッシュボードで「New +」→「Web Service」を選択
4. GitHubリポジトリを接続
5. リポジトリ選択: `securities-crm`

### 2. Renderの設定

#### 基本設定
- **Name**: `securities-crm-api`
- **Region**: `Singapore (Southeast Asia)` 推奨
- **Branch**: `main`
- **Root Directory**: `backend`
- **Runtime**: `Node`
- **Build Command**: `npm install && npx prisma generate && npm run build`
- **Start Command**: `npx prisma migrate deploy && npm start`

#### 環境変数（Environment Variables）

「Environment」タブで以下を設定：

```bash
DATABASE_URL=postgres://username:password@ep-xxx.ap-northeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-key-minimum-32-characters-long-random-string
JWT_EXPIRES_IN=24h
NODE_ENV=production
PORT=4000
```

**重要**: `JWT_SECRET`は以下のコマンドで生成してください：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. デプロイ実行

「Create Web Service」をクリックすると、自動的にデプロイが開始されます。

デプロイ完了後、URLが表示されます：
```
https://securities-crm-api.onrender.com
```

このURLをメモしてください。

---

## フロントエンドのデプロイ

### 1. 環境変数の準備

まず、フロントエンドの環境変数を設定するため、`frontend/.env.production` を作成：

```bash
NEXT_PUBLIC_API_URL=https://securities-crm-api.onrender.com
NEXT_PUBLIC_APP_NAME=証券CRM
```

### 2. Vercelでのセットアップ

1. [Vercel](https://vercel.com/)にアクセス
2. 「Sign Up」でアカウント作成（GitHubアカウントで登録）
3. 「Add New...」→「Project」を選択
4. GitHubリポジトリをインポート
5. リポジトリ選択: `securities-crm`

### 3. Vercelの設定

#### プロジェクト設定
- **Framework Preset**: `Next.js`
- **Root Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

#### 環境変数

「Environment Variables」で以下を追加：

```bash
NEXT_PUBLIC_API_URL=https://securities-crm-api.onrender.com
NEXT_PUBLIC_APP_NAME=証券CRM
```

### 4. デプロイ実行

「Deploy」をクリックすると、自動的にビルド・デプロイされます。

完了後、URLが表示されます：
```
https://securities-crm.vercel.app
```

---

## 環境変数の設定

### バックエンド（Render）

Renderダッシュボード → サービス選択 → Environment

```bash
# データベース
DATABASE_URL=postgres://user:pass@host/db?sslmode=require

# 認証
JWT_SECRET=生成したランダム文字列（32文字以上）
JWT_EXPIRES_IN=24h

# 環境
NODE_ENV=production
PORT=4000

# CORS（フロントエンドのURL）
FRONTEND_URL=https://securities-crm.vercel.app
```

### フロントエンド（Vercel）

Vercel Dashboard → プロジェクト選択 → Settings → Environment Variables

```bash
NEXT_PUBLIC_API_URL=https://securities-crm-api.onrender.com
NEXT_PUBLIC_APP_NAME=証券CRM
```

---

## 初期データの投入

### 1. シードデータの実行

Renderのダッシュボードで「Shell」タブを開き、以下を実行：

```bash
cd backend
node prisma/seed-simple.js
```

または、ローカルから実行：

```bash
# 本番データベースに接続
DATABASE_URL="postgres://..." npx prisma db seed
```

### 2. 初期ユーザーの確認

以下のユーザーが作成されます：

| メール | パスワード | ロール |
|--------|-----------|--------|
| admin@example.com | Admin123! | ADMIN |
| manager@example.com | Manager123! | MANAGER |
| sales1@example.com | Sales123! | SALES |
| sales2@example.com | Sales123! | SALES |
| compliance@example.com | Compliance123! | COMPLIANCE |

---

## 動作確認

### 1. バックエンドAPIの確認

ブラウザで以下にアクセス：

```
https://securities-crm-api.onrender.com/health
```

レスポンス：
```json
{
  "status": "ok",
  "timestamp": "2025-09-30T14:30:00.000Z"
}
```

### 2. フロントエンドの確認

```
https://securities-crm.vercel.app
```

ログイン画面が表示されれば成功です。

### 3. ログインテスト

- メール: `admin@example.com`
- パスワード: `Admin123!`

でログインして、ダッシュボードが表示されることを確認。

---

## トラブルシューティング

### ❌ データベース接続エラー

**エラー**: `Connection refused` または `ECONNREFUSED`

**解決策**:
1. Neonの接続文字列が正しいか確認
2. `?sslmode=require` が付いているか確認
3. Neonのダッシュボードでデータベースが起動しているか確認

### ❌ Prismaマイグレーションエラー

**エラー**: `Migration failed`

**解決策**:
```bash
# ローカルで実行
DATABASE_URL="postgres://..." npx prisma migrate deploy --schema=./backend/prisma/schema.prisma
```

### ❌ CORS エラー

**エラー**: `Access-Control-Allow-Origin` エラー

**解決策**:

`backend/src/server.ts` を確認：

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://securities-crm.vercel.app',  // 本番URL
    process.env.FRONTEND_URL,
  ],
  credentials: true,
}));
```

Renderの環境変数に追加：
```bash
FRONTEND_URL=https://securities-crm.vercel.app
```

### ❌ API接続エラー（フロントエンド）

**エラー**: `Network Error` または `Failed to fetch`

**解決策**:
1. Vercelの環境変数 `NEXT_PUBLIC_API_URL` が正しいか確認
2. ブラウザのコンソールでAPIのURLを確認
3. バックエンドが正常に起動しているか確認

### ❌ Renderのスリープ問題

**問題**: 無料プランでは15分間アクセスがないとスリープ

**解決策**:
- 有料プラン（$7/月）にアップグレード
- または、5分おきにヘルスチェックを実行するcronジョブを設定

---

## 本番環境の追加設定（推奨）

### 1. カスタムドメインの設定

#### Vercel（フロントエンド）
1. Settings → Domains
2. カスタムドメインを追加
3. DNSレコードを設定

#### Render（バックエンド）
1. Settings → Custom Domain
2. カスタムドメインを追加
3. DNSレコードを設定（CNAME）

### 2. SSL証明書

Vercel、Renderともに**自動的にSSL証明書**が発行されます（Let's Encrypt）。
追加設定は不要です。

### 3. バックアップ設定

#### Neonでの自動バックアップ
- 無料プランでも7日間のバックアップが自動実行されます
- 有料プランでは30日間に延長可能

#### 手動バックアップ
```bash
# ローカルにバックアップ
pg_dump "postgres://..." > backup.sql

# リストア
psql "postgres://..." < backup.sql
```

---

## セキュリティチェックリスト

デプロイ前に以下を確認してください：

- [ ] JWT_SECRETが強力なランダム文字列（32文字以上）
- [ ] データベースの接続文字列が環境変数に設定されている
- [ ] .envファイルが.gitignoreに含まれている
- [ ] NODE_ENVがproductionに設定されている
- [ ] CORSが適切に設定されている
- [ ] HTTPSが有効になっている
- [ ] 初期パスワードを変更している
- [ ] データベースのバックアップが設定されている

---

## 監視・ログ

### Renderのログ確認

Dashboard → サービス選択 → Logs

リアルタイムでログを確認できます。

### Vercelのログ確認

Dashboard → プロジェクト選択 → Deployments → ビルドログ

### エラー通知の設定

Renderの「Notifications」から、デプロイ失敗時の通知を設定できます。

---

## コスト見積もり

### 無料プランの制限

| サービス | 無料プラン制限 | 超過時の料金 |
|---------|--------------|------------|
| Neon | 0.5GB、3プロジェクト | $19/月〜 |
| Render | 750時間/月、スリープあり | $7/月〜 |
| Vercel | 100GB帯域、無制限デプロイ | $20/月〜 |

### 推奨プラン（小規模運用）

- **Neon**: 無料プラン（〜100ユーザー）
- **Render**: Starter ($7/月) - スリープなし
- **Vercel**: 無料プラン

**月額合計: $7**

---

## まとめ

このガイドに従えば、以下が実現できます：

✅ 完全無料でのデプロイ（スリープありの制限付き）
✅ HTTPS対応の本番環境
✅ PostgreSQL本番データベース
✅ 自動デプロイ（Gitプッシュで自動更新）
✅ SSL証明書の自動更新

**次のステップ**:
1. カスタムドメインの設定
2. 監視・アラートの設定
3. バックアップの自動化
4. パフォーマンス最適化

---

## サポート

問題が発生した場合：
1. [Neonドキュメント](https://neon.tech/docs)
2. [Renderドキュメント](https://render.com/docs)
3. [Vercelドキュメント](https://vercel.com/docs)
