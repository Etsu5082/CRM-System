# 証券CRMシステム API仕様書

**バージョン**: 1.0.0
**ベースURL**: `http://localhost:4000` (開発環境)
**本番URL**: `https://crm-backend.render.com`

---

## 📋 目次

1. [認証](#認証)
2. [顧客管理](#顧客管理)
3. [商談履歴](#商談履歴)
4. [タスク管理](#タスク管理)
5. [承認ワークフロー](#承認ワークフロー)
6. [レポート](#レポート)
7. [監査ログ](#監査ログ)
8. [エラーレスポンス](#エラーレスポンス)

---

## 認証

### POST /api/auth/register
新規ユーザー登録

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "name": "山田太郎",
  "role": "SALES"
}
```

**レスポンス (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm123...",
      "email": "user@example.com",
      "name": "山田太郎",
      "role": "SALES"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### POST /api/auth/login
ログイン

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cm123...",
      "email": "user@example.com",
      "name": "山田太郎",
      "role": "SALES"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

### GET /api/auth/me
現在のユーザー情報取得

**ヘッダー**:
```
Authorization: Bearer {token}
```

**レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "id": "cm123...",
    "email": "user@example.com",
    "name": "山田太郎",
    "role": "SALES"
  }
}
```

---

## 顧客管理

### GET /api/customers
顧客一覧取得

**クエリパラメータ**:
- `page`: ページ番号（デフォルト: 1）
- `limit`: 1ページあたりの件数（デフォルト: 10）
- `search`: 検索キーワード（名前、メール、電話番号）
- `investmentProfile`: 投資プロファイル（conservative, moderate, aggressive）

**レスポンス (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm123...",
      "name": "田中一郎",
      "email": "tanaka@example.com",
      "phone": "090-1234-5678",
      "company": "株式会社ABC",
      "investmentProfile": "moderate",
      "assignedSales": {
        "id": "cm456...",
        "name": "山田太郎"
      },
      "createdAt": "2025-09-30T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10
  }
}
```

### POST /api/customers
顧客作成

**権限**: ADMIN, MANAGER, SALES

**リクエスト**:
```json
{
  "name": "田中一郎",
  "email": "tanaka@example.com",
  "phone": "090-1234-5678",
  "company": "株式会社ABC",
  "investmentProfile": "moderate",
  "notes": "新規見込み客"
}
```

### GET /api/customers/:id
顧客詳細取得

**レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "id": "cm123...",
    "name": "田中一郎",
    "email": "tanaka@example.com",
    "phone": "090-1234-5678",
    "company": "株式会社ABC",
    "investmentProfile": "moderate",
    "notes": "新規見込み客",
    "meetings": [...],
    "tasks": [...],
    "createdAt": "2025-09-30T00:00:00.000Z",
    "updatedAt": "2025-09-30T00:00:00.000Z"
  }
}
```

### PUT /api/customers/:id
顧客更新

**権限**: ADMIN, MANAGER, SALES（自分の担当顧客のみ）

### DELETE /api/customers/:id
顧客削除

**権限**: ADMIN, MANAGER

---

## 商談履歴

### GET /api/meetings
商談一覧取得

**クエリパラメータ**:
- `page`, `limit`: ページネーション
- `customerId`: 顧客IDでフィルタ

**レスポンス (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm123...",
      "title": "新商品提案",
      "meetingDate": "2025-10-05T10:00:00.000Z",
      "location": "本社会議室",
      "attendees": "田中様、山田（営業）",
      "summary": "投資信託の提案を実施",
      "nextAction": "資料送付",
      "customer": {
        "id": "cm456...",
        "name": "田中一郎"
      },
      "createdAt": "2025-10-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

### POST /api/meetings
商談作成

**権限**: ADMIN, MANAGER, SALES

**リクエスト**:
```json
{
  "customerId": "cm123...",
  "title": "新商品提案",
  "meetingDate": "2025-10-05T10:00:00.000Z",
  "location": "本社会議室",
  "attendees": "田中様、山田（営業）",
  "summary": "投資信託の提案を実施",
  "nextAction": "資料送付"
}
```

---

## タスク管理

### GET /api/tasks
タスク一覧取得

**クエリパラメータ**:
- `page`, `limit`: ページネーション
- `status`: タスクステータス（TODO, IN_PROGRESS, COMPLETED, CANCELLED）
- `priority`: 優先度（LOW, MEDIUM, HIGH, URGENT）

**レスポンス (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm123...",
      "title": "提案資料作成",
      "description": "新商品の提案資料を作成",
      "dueDate": "2025-10-03T23:59:59.999Z",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "customer": {
        "id": "cm456...",
        "name": "田中一郎"
      },
      "user": {
        "id": "cm789...",
        "name": "山田太郎"
      },
      "createdAt": "2025-10-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

### GET /api/tasks/overdue
期限切れタスク取得

### GET /api/tasks/upcoming
期限間近タスク取得（3日以内）

### POST /api/tasks
タスク作成

**権限**: ADMIN, MANAGER, SALES

**リクエスト**:
```json
{
  "title": "提案資料作成",
  "description": "新商品の提案資料を作成",
  "dueDate": "2025-10-03",
  "priority": "HIGH",
  "customerId": "cm123...",
  "userId": "cm456..."
}
```

### PUT /api/tasks/:id/complete
タスク完了

**権限**: ADMIN, MANAGER, SALES（自分のタスクのみ）

---

## 承認ワークフロー

### GET /api/approvals
承認申請一覧取得

**クエリパラメータ**:
- `status`: PENDING, APPROVED, REJECTED, RECALLED

**レスポンス (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm123...",
      "title": "新商品提案承認",
      "description": "田中様への投資信託提案",
      "productName": "○○投資信託",
      "amount": 10000000,
      "status": "PENDING",
      "requester": {
        "id": "cm456...",
        "name": "山田太郎"
      },
      "customer": {
        "id": "cm789...",
        "name": "田中一郎"
      },
      "createdAt": "2025-10-01T00:00:00.000Z"
    }
  ],
  "pagination": {...}
}
```

### POST /api/approvals
承認申請作成

**権限**: SALES

**リクエスト**:
```json
{
  "title": "新商品提案承認",
  "description": "田中様への投資信託提案",
  "productName": "○○投資信託",
  "amount": 10000000,
  "customerId": "cm123..."
}
```

### PUT /api/approvals/:id/approve
承認申請を承認

**権限**: MANAGER

### PUT /api/approvals/:id/reject
承認申請を却下

**権限**: MANAGER

---

## レポート

### GET /api/reports/sales
営業実績レポート

**クエリパラメータ**:
- `startDate`: 開始日
- `endDate`: 終了日
- `userId`: ユーザーID（オプション）

**レスポンス (200)**:
```json
{
  "success": true,
  "data": {
    "totalMeetings": 50,
    "totalCustomers": 30,
    "completedTasks": 80,
    "pendingApprovals": 5,
    "approvedDeals": 10,
    "totalAmount": 100000000,
    "byUser": [
      {
        "userId": "cm123...",
        "name": "山田太郎",
        "meetings": 20,
        "customers": 15,
        "deals": 5,
        "amount": 50000000
      }
    ]
  }
}
```

---

## 監査ログ

### GET /api/audit
監査ログ一覧取得

**権限**: ADMIN, COMPLIANCE

**クエリパラメータ**:
- `page`, `limit`: ページネーション
- `userId`: ユーザーIDでフィルタ
- `action`: アクション（CREATE, UPDATE, DELETE）
- `resourceType`: リソースタイプ（Customer, Meeting, Task等）
- `startDate`, `endDate`: 期間フィルタ

**レスポンス (200)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cm123...",
      "userId": "cm456...",
      "action": "CREATE",
      "resourceType": "Customer",
      "resourceId": "cm789...",
      "changes": {
        "new": {...}
      },
      "ipAddress": "192.168.1.1",
      "timestamp": "2025-10-01T12:00:00.000Z",
      "user": {
        "id": "cm456...",
        "name": "山田太郎",
        "email": "yamada@example.com",
        "role": "SALES"
      }
    }
  ],
  "pagination": {...}
}
```

---

## エラーレスポンス

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Validation error",
  "details": [
    {
      "field": "email",
      "message": "有効なメールアドレスを入力してください"
    }
  ]
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Access denied"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Customer not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## 認証

すべての保護されたエンドポイントには、以下のヘッダーが必要です：

```
Authorization: Bearer {JWT_TOKEN}
```

トークンの有効期限は24時間です。

---

## レート制限

- **未実装** - 将来のバージョンで追加予定
- 推奨: 1分あたり100リクエスト/ユーザー

---

## バージョニング

現在のAPIバージョン: `v1`

将来的なバージョンアップ時は `/api/v2/` のようにバージョンをURLに含める予定です。

---

**最終更新**: 2025年10月1日
