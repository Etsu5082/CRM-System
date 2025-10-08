# サービス間通信シーケンス図

## 🔄 主要なユースケース

### 1. ユーザーログイン

```mermaid
sequenceDiagram
    participant User
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Kafka
    participant Analytics as Analytics Service

    User->>Gateway: POST /api/auth/login
    Gateway->>Auth: POST /auth/login
    Auth->>Auth: Verify credentials
    Auth->>Auth: Generate JWT
    Auth->>Kafka: Publish user.login event
    Kafka-->>Analytics: Consume user.login
    Analytics->>Analytics: Record login metrics
    Auth-->>Gateway: Return JWT
    Gateway-->>User: Return JWT + User info
```

**説明:**
1. ユーザーがログイン情報を送信
2. API Gatewayが Auth Service に転送
3. Auth Service が認証情報を検証し、JWTを発行
4. ログインイベントをKafkaに発行
5. Analytics Service がイベントを受信し、メトリクスを記録

---

### 2. 顧客作成 (イベント駆動)

```mermaid
sequenceDiagram
    participant User
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Customer as Customer Service
    participant Kafka
    participant Sales as Sales Activity Service
    participant Analytics as Analytics Service

    User->>Gateway: POST /api/customers (with JWT)
    Gateway->>Auth: GET /auth/me (verify token)
    Auth-->>Gateway: User info (valid)
    Gateway->>Customer: POST /customers
    Customer->>Customer: Create customer in DB
    Customer->>Kafka: Publish customer.created event
    Customer-->>Gateway: Return customer data
    Gateway-->>User: Return customer data

    Note over Kafka,Sales: Asynchronous event processing
    Kafka-->>Sales: Consume customer.created
    Sales->>Sales: Cache customer info locally

    Kafka-->>Analytics: Consume customer.created
    Analytics->>Analytics: Update customer metrics
    Analytics->>Analytics: Generate notification
```

**説明:**
1. ユーザーが顧客作成リクエスト (JWT付き)
2. API Gateway が JWT を Auth Service で検証
3. Customer Service が顧客をDBに作成
4. `customer.created` イベントをKafkaに発行
5. Sales Activity Service が非同期でイベントを受信し、顧客情報をキャッシュ
6. Analytics Service がイベントを受信し、メトリクスを更新

---

### 3. 商談記録の作成

```mermaid
sequenceDiagram
    participant User
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Sales as Sales Activity Service
    participant Customer as Customer Service
    participant Kafka
    participant Analytics as Analytics Service

    User->>Gateway: POST /api/meetings (with JWT)
    Gateway->>Auth: Verify JWT
    Auth-->>Gateway: Valid
    Gateway->>Sales: POST /meetings

    Sales->>Customer: GET /customers/:id (verify exists)
    Customer-->>Sales: Customer data

    Sales->>Sales: Create meeting in DB
    Sales->>Kafka: Publish meeting.created event
    Sales-->>Gateway: Return meeting data
    Gateway-->>User: Return meeting data

    Kafka-->>Analytics: Consume meeting.created
    Analytics->>Analytics: Update sales metrics
    Analytics->>Analytics: Aggregate customer activity
```

**説明:**
1. ユーザーが商談記録を作成
2. Sales Activity Service が Customer Service に顧客存在確認 (同期)
3. 商談をDBに作成
4. `meeting.created` イベントをKafkaに発行
5. Analytics Service がイベントを受信し、メトリクスを更新

---

### 4. 承認申請フロー

```mermaid
sequenceDiagram
    participant Sales as Sales User
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Opportunity as Opportunity Service
    participant Customer as Customer Service
    participant Kafka
    participant Analytics as Analytics Service
    participant Manager as Manager User

    Sales->>Gateway: POST /api/approvals (with JWT)
    Gateway->>Auth: Verify JWT
    Auth-->>Gateway: Valid (role: SALES)
    Gateway->>Opportunity: POST /approvals

    Opportunity->>Customer: GET /customers/:id
    Customer-->>Opportunity: Customer data

    Opportunity->>Opportunity: Create approval request
    Opportunity->>Kafka: Publish approval.requested event
    Opportunity-->>Gateway: Return approval data
    Gateway-->>Sales: Return approval data

    Kafka-->>Analytics: Consume approval.requested
    Analytics->>Analytics: Create notification for manager
    Analytics->>Kafka: Publish notification.created

    Note over Manager: Manager receives notification
    Manager->>Gateway: PATCH /api/approvals/:id/approve
    Gateway->>Auth: Verify JWT
    Auth-->>Gateway: Valid (role: MANAGER)
    Gateway->>Opportunity: PATCH /approvals/:id/approve

    Opportunity->>Opportunity: Update status to APPROVED
    Opportunity->>Kafka: Publish approval.approved event
    Opportunity-->>Gateway: Return updated data
    Gateway-->>Manager: Return updated data

    Kafka-->>Analytics: Consume approval.approved
    Analytics->>Analytics: Create notification for sales
    Analytics->>Analytics: Update approval metrics
```

**説明:**
1. 営業担当が承認申請を作成
2. Opportunity Service が顧客情報を確認 (同期)
3. 承認申請をDBに作成し、`approval.requested` イベントを発行
4. Analytics Service が通知を生成
5. マネージャーが承認操作
6. `approval.approved` イベントを発行
7. 営業担当に通知が生成される

---

### 5. タスク期限アラート (スケジュール実行)

```mermaid
sequenceDiagram
    participant Cron as Cron Job
    participant Sales as Sales Activity Service
    participant Kafka
    participant Analytics as Analytics Service
    participant User

    Cron->>Sales: Check overdue tasks (scheduled)
    Sales->>Sales: Query tasks due within 24h

    loop For each task
        Sales->>Kafka: Publish task.due_soon event
    end

    Kafka-->>Analytics: Consume task.due_soon events

    loop For each event
        Analytics->>Analytics: Create notification
        Analytics->>Analytics: Store in DB
    end

    User->>Gateway: GET /api/notifications/unread
    Gateway->>Analytics: GET /notifications/unread
    Analytics-->>Gateway: Return notifications
    Gateway-->>User: Return notifications
```

**説明:**
1. Cron Job が Sales Activity Service の期限チェックをトリガー
2. 期限が近いタスクをクエリ
3. 各タスクについて `task.due_soon` イベントを発行
4. Analytics Service がイベントを受信し、通知を作成
5. ユーザーが通知を取得

---

### 6. レポート生成 (集約クエリ)

```mermaid
sequenceDiagram
    participant User
    participant Gateway as API Gateway
    participant Analytics as Analytics Service
    participant Auth as Auth Service
    participant Customer as Customer Service
    participant Sales as Sales Activity Service
    participant Opportunity as Opportunity Service

    User->>Gateway: GET /api/reports/sales-summary
    Gateway->>Auth: Verify JWT
    Auth-->>Gateway: Valid
    Gateway->>Analytics: GET /reports/sales-summary

    par Fetch from multiple services
        Analytics->>Customer: GET /customers/stats
        Analytics->>Sales: GET /meetings/stats
        Analytics->>Sales: GET /tasks/stats
        Analytics->>Opportunity: GET /approvals/stats
    end

    Customer-->>Analytics: Customer statistics
    Sales-->>Analytics: Meeting statistics
    Sales-->>Analytics: Task statistics
    Opportunity-->>Analytics: Approval statistics

    Analytics->>Analytics: Aggregate data
    Analytics->>Analytics: Generate report
    Analytics-->>Gateway: Return report
    Gateway-->>User: Return report
```

**説明:**
1. ユーザーがレポートをリクエスト
2. Analytics Service が複数のサービスから統計情報を並列取得
3. データを集約してレポートを生成
4. ユーザーにレポートを返却

---

### 7. ユーザー削除 (Saga パターン)

```mermaid
sequenceDiagram
    participant Admin
    participant Gateway as API Gateway
    participant Auth as Auth Service
    participant Kafka
    participant Customer as Customer Service
    participant Sales as Sales Activity Service
    participant Opportunity as Opportunity Service

    Admin->>Gateway: DELETE /api/auth/users/:id
    Gateway->>Auth: DELETE /auth/users/:id
    Auth->>Auth: Delete user from DB
    Auth->>Kafka: Publish user.deleted event
    Auth-->>Gateway: Success
    Gateway-->>Admin: User deleted

    Note over Kafka: Saga orchestration via events

    Kafka-->>Customer: Consume user.deleted
    Customer->>Customer: Reassign customers to new sales
    Customer->>Kafka: Publish customers.reassigned events

    Kafka-->>Sales: Consume user.deleted
    Sales->>Sales: Delete user's tasks
    Sales->>Sales: Reassign meetings

    Kafka-->>Opportunity: Consume user.deleted
    Opportunity->>Opportunity: Reassign pending approvals
    Opportunity->>Kafka: Publish approvals.reassigned events
```

**説明:**
1. 管理者がユーザー削除をリクエスト
2. Auth Service がユーザーを削除し、`user.deleted` イベントを発行
3. 各サービスがイベントを受信し、関連データを処理 (Saga)
   - Customer Service: 顧客を別の営業に再アサイン
   - Sales Activity Service: タスク削除、商談再アサイン
   - Opportunity Service: 承認申請を再アサイン
4. 各サービスが処理完了イベントを発行

---

### 8. 顧客削除 (カスケード削除 with Saga)

```mermaid
sequenceDiagram
    participant User
    participant Gateway as API Gateway
    participant Customer as Customer Service
    participant Kafka
    participant Sales as Sales Activity Service
    participant Opportunity as Opportunity Service
    participant Analytics as Analytics Service

    User->>Gateway: DELETE /api/customers/:id
    Gateway->>Customer: DELETE /customers/:id
    Customer->>Customer: Soft delete customer
    Customer->>Kafka: Publish customer.deleted event
    Customer-->>Gateway: Success
    Gateway-->>User: Customer deleted

    par Process deletion in dependent services
        Kafka-->>Sales: Consume customer.deleted
        Sales->>Sales: Delete related meetings
        Sales->>Sales: Delete related tasks
        Sales->>Kafka: Publish meetings.deleted, tasks.deleted

        Kafka-->>Opportunity: Consume customer.deleted
        Opportunity->>Opportunity: Cancel pending approvals
        Opportunity->>Kafka: Publish approvals.cancelled

        Kafka-->>Analytics: Consume customer.deleted
        Analytics->>Analytics: Update metrics
        Analytics->>Analytics: Archive notifications
    end
```

**説明:**
1. ユーザーが顧客削除をリクエスト
2. Customer Service がソフト削除し、`customer.deleted` イベントを発行
3. 各サービスが並行してイベントを処理
   - Sales Activity Service: 関連商談・タスクを削除
   - Opportunity Service: 保留中の承認申請をキャンセル
   - Analytics Service: メトリクスを更新、通知をアーカイブ

---

## 🔑 通信パターンまとめ

### 同期通信 (REST API)

| パターン | 用途 | 例 |
|---------|------|-----|
| **Request-Response** | リアルタイムデータ取得 | 顧客情報照会、ログイン |
| **Service-to-Service** | データ整合性確認 | 商談作成時の顧客存在確認 |
| **Gateway Authentication** | トークン検証 | すべてのAPI呼び出し |

### 非同期通信 (Kafka Events)

| パターン | 用途 | 例 |
|---------|------|-----|
| **Event Notification** | 状態変化通知 | user.created, customer.updated |
| **Event-Carried State Transfer** | データ複製 | 顧客情報のキャッシング |
| **Event Sourcing** | イベント履歴保存 | 監査ログ、アクティビティトラッキング |
| **Saga Orchestration** | 分散トランザクション | ユーザー削除時の関連データ削除 |

---

## 🛡️ エラーハンドリング

### リトライポリシー

```typescript
// Kafka Consumer with retry
const consumer = kafka.consumer({
  groupId: 'customer-service-group',
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

// HTTP Client with retry
axios.get('/api/customers', {
  timeout: 5000,
  retry: 3,
  retryDelay: exponentialDelay,
});
```

### サーキットブレーカー

```typescript
import CircuitBreaker from 'opossum';

const breaker = new CircuitBreaker(customerServiceCall, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});

breaker.fallback(() => getCachedData());
```

---

## 📈 パフォーマンス最適化

1. **イベントバッチング**: 複数イベントをまとめて送信
2. **キャッシング**: Redis でホットデータをキャッシュ
3. **並列処理**: 複数サービスへの同時リクエスト
4. **非同期処理**: 重い処理はイベント駆動で実行

---

## 🧪 テスト戦略

### コントラクトテスト (Pact)

```typescript
// Consumer test (Customer MFE)
describe('Customer API contract', () => {
  it('should return customer list', async () => {
    await provider
      .addInteraction({
        state: 'customers exist',
        uponReceiving: 'a request for customers',
        withRequest: {
          method: 'GET',
          path: '/api/customers',
        },
        willRespondWith: {
          status: 200,
          body: like([{ id: '1', name: 'Test' }]),
        },
      })
      .executeTest(async (mockServer) => {
        const response = await getCustomers(mockServer.url);
        expect(response).toHaveLength(1);
      });
  });
});
```

### E2Eテスト (Playwright)

```typescript
test('should create customer and see in list', async ({ page }) => {
  await page.goto('/customers');
  await page.click('text=新規顧客追加');
  await page.fill('[name="name"]', 'Test Customer');
  await page.fill('[name="email"]', 'test@example.com');
  await page.click('text=作成');

  await expect(page.locator('text=Test Customer')).toBeVisible();
});
```
