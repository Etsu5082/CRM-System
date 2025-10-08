# CRMシステム マイクロサービスアーキテクチャ設計書

## 📋 目次
1. [システム全体アーキテクチャ](#システム全体アーキテクチャ)
2. [マイクロサービス分割戦略](#マイクロサービス分割戦略)
3. [技術スタック](#技術スタック)
4. [サービス境界定義](#サービス境界定義)
5. [データベース設計](#データベース設計)
6. [サービス間通信](#サービス間通信)
7. [マイクロフロントエンド](#マイクロフロントエンド)

---

## システム全体アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     Internet / Users                        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ingress Controller                         │
│                   (NGINX / Traefik)                          │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  Frontend Shell  │      │   API Gateway    │
│  (Next.js Host)  │      │   (Node.js)      │
└──────────────────┘      └──────┬───────────┘
         │                       │
         │ Module Federation     │ REST/gRPC
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Micro Frontends (Remotes)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │ Customer │ │  Sales   │ │Opportunity│ │Analytics │      │
│  │   MFE    │ │   MFE    │ │   MFE    │ │   MFE    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                      │
                      │ API Calls
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend Services                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   Auth   │ │ Customer │ │  Sales   │ │Opportunity│      │
│  │ Service  │ │ Service  │ │ Activity │ │ Service  │      │
│  │          │ │          │ │ Service  │ │          │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       │            │            │            │             │
│  ┌────┴────────────┴────────────┴────────────┴─────┐       │
│  │            Analytics Service                     │       │
│  │         (Event Consumer & Aggregator)            │       │
│  └──────────────────────────────────────────────────┘       │
└───────────┬──────────────────────────────┬──────────────────┘
            │                              │
            │ Kafka Event Bus              │ Database Access
            ▼                              ▼
┌──────────────────────┐     ┌─────────────────────────────────┐
│   Apache Kafka       │     │   Database per Service          │
│  (Event Streaming)   │     │  ┌────────┐ ┌────────┐         │
│                      │     │  │ Auth   │ │Customer│         │
│  Topics:             │     │  │   DB   │ │   DB   │         │
│  - user.events       │     │  └────────┘ └────────┘         │
│  - customer.events   │     │  ┌────────┐ ┌────────┐         │
│  - sales.events      │     │  │ Sales  │ │Opport- │         │
│  - approval.events   │     │  │   DB   │ │ nity DB│         │
└──────────────────────┘     │  └────────┘ └────────┘         │
                             │  ┌────────┐                     │
                             │  │Analytics                     │
                             │  │   DB   │                     │
                             │  └────────┘                     │
                             └─────────────────────────────────┘
```

---

## マイクロサービス分割戦略

### 1. **Auth Service** (認証・認可サービス)

**責任範囲:**
- ユーザー認証 (Login/Logout)
- JWT トークン発行・検証
- ユーザー管理 (CRUD)
- ロール・権限管理 (RBAC)
- 監査ログ記録

**データモデル:**
- User
- AuditLog

**API エンドポイント:**
```
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh
GET    /auth/me
POST   /auth/users
GET    /auth/users
GET    /auth/users/:id
PUT    /auth/users/:id
DELETE /auth/users/:id
GET    /auth/audit-logs
```

**イベント発行:**
- `user.created`
- `user.updated`
- `user.deleted`
- `user.login`
- `user.logout`

---

### 2. **Customer Service** (顧客管理サービス)

**責任範囲:**
- 顧客情報管理 (CRUD)
- 投資プロファイル管理
- 顧客検索・フィルタリング
- 担当営業アサイン

**データモデル:**
- Customer

**API エンドポイント:**
```
POST   /customers
GET    /customers
GET    /customers/:id
PUT    /customers/:id
DELETE /customers/:id (Soft Delete)
GET    /customers/search
GET    /customers/by-sales/:salesId
```

**イベント発行:**
- `customer.created`
- `customer.updated`
- `customer.deleted`
- `customer.assigned`

**イベント購読:**
- `user.deleted` → 担当営業の再アサイン

---

### 3. **Sales Activity Service** (営業活動管理サービス)

**責任範囲:**
- 商談記録管理
- タスク管理
- 活動履歴追跡
- 期限管理・アラート

**データモデル:**
- Meeting
- Task

**API エンドポイント:**
```
POST   /meetings
GET    /meetings
GET    /meetings/:id
PUT    /meetings/:id
DELETE /meetings/:id
GET    /meetings/customer/:customerId

POST   /tasks
GET    /tasks
GET    /tasks/:id
PUT    /tasks/:id
DELETE /tasks/:id
PATCH  /tasks/:id/status
GET    /tasks/overdue
```

**イベント発行:**
- `meeting.created`
- `meeting.updated`
- `task.created`
- `task.updated`
- `task.completed`
- `task.due_soon`

**イベント購読:**
- `customer.deleted` → 関連タスク・商談の削除

---

### 4. **Opportunity Service** (商談管理サービス)

**責任範囲:**
- 承認申請管理
- 承認フロー制御
- ステータス追跡
- 承認履歴管理

**データモデル:**
- ApprovalRequest

**API エンドポイント:**
```
POST   /approvals
GET    /approvals
GET    /approvals/:id
PUT    /approvals/:id
PATCH  /approvals/:id/approve
PATCH  /approvals/:id/reject
GET    /approvals/pending
GET    /approvals/requester/:userId
GET    /approvals/approver/:userId
```

**イベント発行:**
- `approval.requested`
- `approval.approved`
- `approval.rejected`
- `approval.recalled`

**イベント購読:**
- `customer.deleted` → 関連承認申請の削除
- `user.deleted` → 承認者の再アサイン

---

### 5. **Analytics Service** (分析・レポートサービス)

**責任範囲:**
- レポート生成
- KPI集計
- 通知管理
- イベント集約・分析

**データモデル:**
- Notification
- AggregatedMetrics (Read Model)

**API エンドポイント:**
```
GET    /reports/sales-summary
GET    /reports/customer-statistics
GET    /reports/approval-statistics
GET    /reports/task-completion

GET    /notifications
GET    /notifications/unread
PATCH  /notifications/:id/read
PATCH  /notifications/read-all
DELETE /notifications/:id
```

**イベント購読:**
- すべてのドメインイベントを購読
- イベント集約・分析
- 通知生成

**イベント発行:**
- `notification.created`

---

### 6. **API Gateway**

**責任範囲:**
- リクエストルーティング
- 認証委譲 (Auth Service へ)
- レート制限
- リクエスト/レスポンス変換
- CORS処理

**技術:**
- Node.js + Express
- または Kong / Traefik

---

## 技術スタック

### Backend Services

| サービス | 言語/FW | 理由 |
|---------|---------|------|
| **Auth Service** | Node.js + Express + TypeScript | JWT処理、既存コードベース活用 |
| **Customer Service** | Node.js + Express + TypeScript | 既存Prismaスキーマ活用、高速開発 |
| **Sales Activity Service** | Node.js + Express + TypeScript | 既存コードベース活用 |
| **Opportunity Service** | Node.js + Express + TypeScript | 一貫性維持 |
| **Analytics Service** | Node.js + Express + TypeScript | イベント処理、既存コード活用 |
| **API Gateway** | Node.js + Express または Kong | 柔軟なルーティング、認証連携 |

### データベース

| サービス | DB | 理由 |
|---------|---------|------|
| **Auth Service** | PostgreSQL | リレーショナルデータ、トランザクション |
| **Customer Service** | PostgreSQL | 複雑なクエリ、インデックス |
| **Sales Activity Service** | PostgreSQL | リレーショナルデータ |
| **Opportunity Service** | PostgreSQL | トランザクション、整合性 |
| **Analytics Service** | PostgreSQL + Redis | 集約データ、キャッシュ |

### メッセージング

- **Apache Kafka**: イベントストリーミング、高スループット
- **代替案**: RabbitMQ (シンプルな構成の場合)

### Frontend

| 技術 | 用途 |
|------|------|
| **Next.js 14** | Host Shell (App Router) |
| **Webpack Module Federation** | マイクロフロントエンド統合 |
| **React 18** | UI コンポーネント |
| **TanStack Query** | データフェッチング |
| **Zustand** | 状態管理 |

### Infrastructure

- **Kubernetes**: オーケストレーション
- **Docker**: コンテナ化
- **Helm**: K8s パッケージング
- **Prometheus + Grafana**: メトリクス監視
- **ELK Stack**: ログ集約
- **Jaeger**: 分散トレーシング

---

## サービス境界定義

### ドメイン駆動設計 (DDD) に基づく境界

```
┌─────────────────────────────────────────────────────────────┐
│                    Bounded Contexts                          │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │ Identity &     │  │   Customer     │                    │
│  │ Access Context │  │    Context     │                    │
│  │                │  │                │                    │
│  │ - User         │  │ - Customer     │                    │
│  │ - Role         │  │ - Profile      │                    │
│  │ - Permission   │  │ - Assignment   │                    │
│  └────────────────┘  └────────────────┘                    │
│                                                              │
│  ┌────────────────┐  ┌────────────────┐                    │
│  │ Sales Activity │  │  Opportunity   │                    │
│  │    Context     │  │    Context     │                    │
│  │                │  │                │                    │
│  │ - Meeting      │  │ - Approval     │                    │
│  │ - Task         │  │ - Workflow     │                    │
│  │ - Activity     │  │ - Stage        │                    │
│  └────────────────┘  └────────────────┘                    │
│                                                              │
│  ┌────────────────────────────────────┐                    │
│  │      Analytics Context             │                    │
│  │                                    │                    │
│  │ - Report                           │                    │
│  │ - Notification                     │                    │
│  │ - Metrics                          │                    │
│  └────────────────────────────────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### サービス間の依存関係

```
Auth Service (Core)
    ↓ (すべてのサービスが認証に依存)
    ├─→ Customer Service
    ├─→ Sales Activity Service
    ├─→ Opportunity Service
    └─→ Analytics Service (イベント購読のみ)
```

**原則:**
- **同期通信**: REST API (ユーザー認証、データ取得)
- **非同期通信**: Kafka Events (ドメインイベント、通知)
- **参照データ**: 各サービスが必要最小限のコピーを保持

---

## データベース設計

### Database per Service パターン

各マイクロサービスが独立したデータベースを持つ:

```
auth_db:
  - users
  - audit_logs

customer_db:
  - customers

sales_activity_db:
  - meetings
  - tasks

opportunity_db:
  - approval_requests

analytics_db:
  - notifications
  - aggregated_metrics (Read Model)
```

### データ整合性戦略

1. **Saga パターン**: 分散トランザクション
   - 例: 顧客削除時の関連データ削除

2. **Eventual Consistency**: 最終的整合性
   - イベント駆動で非同期同期

3. **CQRS**: コマンドとクエリの分離
   - Analytics Serviceで読み取り専用モデル

---

## サービス間通信

### 同期通信 (REST API)

**認証フロー:**
```
Client → API Gateway → Auth Service
                     ↓ (JWT Token)
                   Client
```

**データ取得フロー:**
```
Client → API Gateway → Customer Service
                     → Sales Activity Service
                     → Opportunity Service
```

### 非同期通信 (Kafka Events)

**イベント駆動フロー:**
```
Customer Service → Kafka (customer.created)
                     ↓
                   ┌─┴─┐
                   │   │
    ┌──────────────┘   └──────────────┐
    ↓                                  ↓
Sales Activity Service        Analytics Service
(顧客情報キャッシュ)          (通知生成、メトリクス集計)
```

### イベントスキーマ例

```typescript
// customer.created
{
  "eventId": "uuid",
  "eventType": "customer.created",
  "timestamp": "2024-10-08T10:00:00Z",
  "data": {
    "customerId": "cuid",
    "name": "山田太郎",
    "email": "yamada@example.com",
    "assignedSalesId": "user_id"
  }
}

// task.due_soon
{
  "eventId": "uuid",
  "eventType": "task.due_soon",
  "timestamp": "2024-10-08T10:00:00Z",
  "data": {
    "taskId": "cuid",
    "title": "顧客面談",
    "dueDate": "2024-10-09T10:00:00Z",
    "userId": "user_id",
    "customerId": "customer_id"
  }
}
```

---

## マイクロフロントエンド

### Module Federation アーキテクチャ

**Host Shell (Shell App):**
- Next.js 14 (App Router)
- ルーティング管理
- 共通レイアウト
- 認証状態管理

**Remotes (Micro Frontends):**
1. **Customer MFE**: 顧客管理画面
2. **Sales MFE**: 営業活動管理画面
3. **Opportunity MFE**: 商談・承認管理画面
4. **Analytics MFE**: レポート・ダッシュボード

### Module Federation 設定

```javascript
// next.config.js (Host)
const NextFederationPlugin = require('@module-federation/nextjs-mf');

module.exports = {
  webpack: (config, options) => {
    config.plugins.push(
      new NextFederationPlugin({
        name: 'host',
        remotes: {
          customer: 'customer@http://localhost:3001/remoteEntry.js',
          sales: 'sales@http://localhost:3002/remoteEntry.js',
          opportunity: 'opportunity@http://localhost:3003/remoteEntry.js',
          analytics: 'analytics@http://localhost:3004/remoteEntry.js',
        },
        shared: {
          react: { singleton: true },
          'react-dom': { singleton: true },
        },
      })
    );
    return config;
  },
};
```

### 共有コンポーネントライブラリ

```
packages/
  ui-components/        # shadcn/ui ベースの共通コンポーネント
  theme/                # デザイントークン
  utils/                # 共通ユーティリティ
  types/                # 型定義
```

---

## 次のステップ

1. ✅ アーキテクチャ設計完了
2. 🔄 各マイクロサービスの実装
3. 🔄 Kubernetes マニフェスト作成
4. 🔄 マイクロフロントエンド統合
5. 🔄 CI/CD パイプライン構築
6. 🔄 監視・ログ基盤構築
