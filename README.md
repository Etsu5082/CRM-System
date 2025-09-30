# 証券CRMシステム (Securities CRM System)

証券会社向けの顧客関係管理(CRM)システムです。顧客管理、商談履歴、タスク管理、承認ワークフロー、レポート・分析、監査ログなどの機能を提供します。

**開発進捗**: 82% 完了 (45/55タスク)

## 技術スタック

### フロントエンド
- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Charts**: Recharts
- **UI Components**: カスタムコンポーネント

### バックエンド
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: SQLite (開発) / PostgreSQL (本番推奨)
- **ORM**: Prisma
- **Authentication**: JWT (jsonwebtoken)
- **Validation**: Zod
- **Security**: Helmet, bcrypt

## セットアップ

### 前提条件
- Node.js 18.x 以上
- npm または yarn

### 環境構築手順

#### 1. バックエンドのセットアップ

```bash
cd backend

# 依存関係のインストール
npm install

# 環境変数の設定 (必要に応じて編集)
cp .env.example .env

# データベースのマイグレーション
npx prisma migrate dev

# 初期データの投入
node prisma/seed-simple.js

# 開発サーバーの起動
npm run dev
```

バックエンドサーバーは http://localhost:4000 で起動します。

#### 2. フロントエンドのセットアップ

```bash
cd ../frontend

# 依存関係のインストール
npm install

# 開発サーバーの起動
npm run dev
```

フロントエンドは http://localhost:3000 で起動します。

### テストアカウント

初期データ投入後、以下のアカウントでログインできます:

| 役割 | メールアドレス | パスワード |
|-----|-------------|-----------|
| 管理者 | admin@example.com | Admin123! |
| マネージャー | manager@example.com | Manager123! |
| 営業 | sales1@example.com | Sales123! |
| 営業 | sales2@example.com | Sales123! |
| コンプライアンス | compliance@example.com | Compliance123! |

## プロジェクト構造

```
.
├── app/              # Next.js App Router
├── components/       # Reactコンポーネント
├── lib/             # ユーティリティ関数
├── hooks/           # カスタムフック
├── types/           # TypeScript型定義
├── backend/         # バックエンドAPI
│   ├── src/
│   │   ├── routes/      # APIルート
│   │   ├── controllers/ # コントローラー
│   │   ├── services/    # ビジネスロジック
│   │   ├── middleware/  # ミドルウェア
│   │   └── types/       # 型定義
│   └── prisma/          # データベーススキーマ
└── docker-compose.yml   # Docker設定
```

## 利用可能なコマンド

### フロントエンド
```bash
npm run dev          # 開発サーバー起動
npm run build        # プロダクションビルド
npm start            # プロダクションサーバー起動
npm run lint         # Lint実行
```

### バックエンド
```bash
npm run dev              # 開発サーバー起動
npm run build            # TypeScriptビルド
npm start                # プロダクションサーバー起動
npm test                 # テスト実行
npm run test:watch       # テストのwatch mode
npm run test:coverage    # カバレッジレポート生成
npm run prisma:generate  # Prismaクライアント生成
npm run prisma:migrate   # マイグレーション実行
npm run prisma:studio    # Prisma Studio起動
```

## 環境変数

### フロントエンド (.env.local)
```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=Securities CRM
```

### バックエンド (.env)
```
DATABASE_URL=postgresql://crm_user:crm_password@localhost:5432/crm_development
JWT_SECRET=your-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h
PORT=4000
NODE_ENV=development
```

## データベーススキーマ

主要なモデル:
- **User** - ユーザー管理 (ADMIN/MANAGER/SALES/COMPLIANCE)
- **Customer** - 顧客情報
- **Meeting** - 商談履歴
- **Task** - タスク管理
- **ApprovalRequest** - 承認ワークフロー
- **AuditLog** - 監査ログ

## 実装済み機能

### ✅ 認証・権限管理
- JWT認証によるセキュアなログイン
- ロールベースアクセス制御 (RBAC)
  - ADMIN: システム管理者
  - MANAGER: マネージャー
  - SALES: 営業担当
  - COMPLIANCE: コンプライアンス

### ✅ 顧客管理
- 顧客情報のCRUD操作
- 投資プロファイル管理
- リスク許容度の記録
- 検索・フィルタリング機能
- ページネーション対応

### ✅ 商談履歴管理
- 商談記録の作成・編集・削除
- 顧客別の商談履歴表示
- 次回アクション設定
- 自動タスク生成

### ✅ タスク管理
- タスクのCRUD操作
- 優先度設定 (URGENT, HIGH, MEDIUM, LOW)
- ステータス管理 (TODO, IN_PROGRESS, COMPLETED, CANCELLED)
- 期限切れタスクの検出・アラート
- カレンダービュー

### ✅ 承認ワークフロー
- 営業担当による商品提案申請
- マネージャー/コンプライアンスによる承認・却下
- 申請ステータス管理
- 承認履歴の記録

### ✅ レポート・分析
- ダッシュボード統計
- 営業パフォーマンス分析
- タスク完了トレンド
- 承認統計
- CSVエクスポート機能
- グラフ可視化 (Recharts)

### ✅ 監査ログ
- 全操作の記録
- ユーザー別アクティビティ追跡
- エンティティ別履歴
- ADMIN/COMPLIANCE専用アクセス
- フィルタリング機能

## 今後の拡張予定

- [x] テストフレームワーク導入（Jest + Supertest）
- [ ] ユニットテストの拡充（カバレッジ70%以上目標）
- [ ] E2Eテスト（Playwright）
- [ ] メール通知機能
- [ ] ファイルアップロード機能
- [ ] より詳細なレポート機能
- [ ] Docker対応
- [ ] CI/CDパイプライン

## 📖 関連ドキュメント

- [開発計画書](./crm_dev_plan.md) - プロジェクトの全体計画
- [プロジェクト完了レポート](./PROJECT_COMPLETION_REPORT.md) - 開発成果の総括
- [進捗管理表](./進捗管理表.md) - 詳細な進捗状況
- **[デプロイガイド](./DEPLOYMENT_GUIDE.md)** - 本番環境へのデプロイ手順

## 📞 サポート

問題が発生した場合は、Issueを作成してください。

---

**最終更新日**: 2025年9月30日