# Kafka セットアップガイド (Upstash)

## 1. Upstash Kafka アカウントの作成

1. [Upstash Console](https://console.upstash.com/) にアクセス
2. アカウントを作成（GitHub/Google でサインイン可能）
3. 「Create Cluster」をクリック
4. 以下の設定で Kafka クラスターを作成:
   - **Name**: `crm-kafka-cluster`
   - **Region**: `us-east-1` (Render の API Gateway と同じリージョン推奨)
   - **Plan**: Free tier (月10,000メッセージまで無料)

## 2. 必要なトピックの作成

Upstash Console で以下のトピックを作成:

```
customer.events
user.events
sales-activity.events
opportunity.events
notification.events
```

各トピックの設定:
- **Partitions**: 1 (Free tier の制限)
- **Retention Time**: 7 days
- **Max Message Size**: 1MB

## 3. 接続情報の取得

Upstash Console の Cluster Details から以下の情報を取得:

```
UPSTASH_KAFKA_REST_URL=https://xxx-xxx-xxx.upstash.io
UPSTASH_KAFKA_REST_USERNAME=xxxx
UPSTASH_KAFKA_REST_PASSWORD=xxxx
UPSTASH_KAFKA_BROKER_URL=xxx-xxx.upstash.io:9092
UPSTASH_KAFKA_SASL_USERNAME=xxxx
UPSTASH_KAFKA_SASL_PASSWORD=xxxx
```

## 4. Render での環境変数設定

### 全サービス共通の環境変数

以下の環境変数を **全5つのマイクロサービス** (auth-service, customer-service, sales-activity-service, opportunity-service, analytics-service) に追加:

```bash
# Kafka 有効化
KAFKA_ENABLED=true

# Kafka ブローカー
KAFKA_BROKERS=xxx-xxx.upstash.io:9092

# SASL 認証
KAFKA_USERNAME=xxxx
KAFKA_PASSWORD=xxxx
KAFKA_MECHANISM=plain
```

### サービス別のクライアントID

各サービスに以下も追加:

**Auth Service:**
```bash
KAFKA_CLIENT_ID=auth-service
```

**Customer Service:**
```bash
KAFKA_CLIENT_ID=customer-service
```

**Sales Activity Service:**
```bash
KAFKA_CLIENT_ID=sales-activity-service
```

**Opportunity Service:**
```bash
KAFKA_CLIENT_ID=opportunity-service
```

**Analytics Service:**
```bash
KAFKA_CLIENT_ID=analytics-service
```

## 5. Kafka クライアントの更新

現在の Kafka 設定ファイル (`src/config/kafka.ts`) を Upstash 対応に更新する必要があります。

### 更新前:
```typescript
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
});
```

### 更新後 (SASL認証対応):
```typescript
const kafka = new Kafka({
  clientId: process.env.KAFKA_CLIENT_ID || 'auth-service',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: true,
  sasl: {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME || '',
    password: process.env.KAFKA_PASSWORD || '',
  },
});
```

## 6. イベントフロー

### Customer Created イベント
```
Customer Service → customer.events → Sales Activity Service
                                   → Analytics Service
```

### User Registered イベント
```
Auth Service → user.events → Customer Service
                          → Analytics Service
```

### Meeting/Task Created イベント
```
Sales Activity Service → sales-activity.events → Analytics Service
                                                → Opportunity Service
```

### Approval Status Changed イベント
```
Opportunity Service → opportunity.events → Analytics Service
                                         → Sales Activity Service
```

## 7. テスト方法

### 1. ユーザー登録テスト
```bash
curl -X POST https://crm-api-gateway.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123!",
    "name": "Test User",
    "role": "USER"
  }'
```

**期待される動作:**
- Auth Service: ユーザー作成 → `user.events` にイベント発行
- Customer Service: イベント受信 → 顧客レコード自動作成
- Analytics Service: イベント受信 → メトリクス記録

### 2. 顧客作成テスト
```bash
TOKEN="Bearer xxx"
curl -X POST https://crm-api-gateway.onrender.com/api/customers \
  -H "Authorization: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company",
    "industry": "Technology",
    "size": "MEDIUM",
    "email": "contact@testcompany.com"
  }'
```

**期待される動作:**
- Customer Service: 顧客作成 → `customer.events` にイベント発行
- Sales Activity Service: イベント受信 → 初回コンタクトタスク自動作成
- Analytics Service: イベント受信 → 顧客数メトリクス更新

### 3. ログ確認

Render の各サービスのログで以下を確認:

```
✅ Kafka Producer connected
📤 Event published: USER_CREATED to topic user.events
📥 Event received: USER_CREATED from topic user.events
```

## 8. トラブルシューティング

### 接続エラー
```
❌ Failed to connect to Kafka: Authentication failed
```
→ KAFKA_USERNAME, KAFKA_PASSWORD を確認

### タイムアウト
```
❌ Request timed out
```
→ KAFKA_BROKERS の URL を確認（SSL ポート 9092 を使用）

### イベントが届かない
```
⏭️ Skipping event publish (Kafka disabled)
```
→ KAFKA_ENABLED=true を確認

## 9. コスト見積もり

### Upstash Kafka Free Tier
- **料金**: $0/月
- **制限**:
  - 月間 10,000 メッセージ
  - 1日 1,000 メッセージ
  - 最大メッセージサイズ 1MB
  - 保持期間 7日間

### 使用量予測
- ユーザー登録: 1イベント × 3コンシューマー = 3メッセージ
- 顧客作成: 1イベント × 2コンシューマー = 2メッセージ
- 商談/タスク作成: 1イベント × 2コンシューマー = 2メッセージ

**1日100アクション → 約500メッセージ/日 → Free tier 内**

### Pro Plan ($10/月)
必要な場合のアップグレード:
- 月間 100,000 メッセージ
- 無制限のパーティション
- より高速なスループット

## 10. 次のステップ

1. ✅ Upstash アカウント作成
2. ✅ Kafka クラスター作成
3. ✅ トピック作成
4. ⏳ Kafka 設定ファイル更新 (SASL 認証追加)
5. ⏳ Render 環境変数設定
6. ⏳ 全サービス再デプロイ
7. ⏳ エンドツーエンドテスト実行
