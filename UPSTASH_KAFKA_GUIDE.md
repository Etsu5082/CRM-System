# Upstash Kafka 完全セットアップガイド

このガイドでは、RenderにデプロイされたCRMマイクロサービスにUpstash Kafkaを統合する手順を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [Upstash Kafkaのセットアップ](#upstash-kafkaのセットアップ)
3. [Renderへの環境変数設定](#renderへの環境変数設定)
4. [デプロイと検証](#デプロイと検証)
5. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

- ✅ Render アカウント
- ✅ 5つのマイクロサービスがデプロイ済み
- ✅ API Gateway が動作中
- ⏳ Upstash アカウント（これから作成）

---

## Upstash Kafkaのセットアップ

### ステップ1: Upstash アカウント作成

1. [Upstash Console](https://console.upstash.com/) にアクセス
2. 「Sign Up」をクリック
3. GitHub または Google アカウントでサインイン
4. メール確認を完了

### ステップ2: Kafka クラスター作成

1. Upstash Console で「Create Cluster」をクリック
2. 以下の設定を入力:

```
Name: crm-kafka-cluster
Type: Kafka
Region: us-east-1 (Renderと同じリージョンを推奨)
```

3. 「Free」プランを選択
4. 「Create」をクリック

**Free プランの制限:**
- ✅ 月間 10,000 メッセージ
- ✅ 1日 1,000 メッセージ
- ✅ 最大メッセージサイズ 1MB
- ✅ 保持期間 7日間
- ✅ 無料で使用可能

### ステップ3: トピック作成

クラスター作成後、以下の5つのトピックを作成します:

#### 作成するトピック

1. **customer.events**
   - 用途: 顧客関連のイベント（顧客作成、更新）
   - コンシューマー: Sales Activity Service, Analytics Service

2. **user.events**
   - 用途: ユーザー認証イベント（登録、ログイン）
   - コンシューマー: Customer Service, Analytics Service

3. **sales-activity.events**
   - 用途: 商談・タスクイベント（作成、更新、完了）
   - コンシューマー: Opportunity Service, Analytics Service

4. **opportunity.events**
   - 用途: 承認フローイベント（申請、承認、却下）
   - コンシューマー: Sales Activity Service, Analytics Service

5. **notification.events**
   - 用途: 通知イベント（期限アラート、承認通知）
   - コンシューマー: Analytics Service

#### トピックの作成手順

各トピックに対して以下を実行:

1. Upstash Console の「Topics」タブをクリック
2. 「Create Topic」をクリック
3. 以下の設定を入力:

```
Topic Name: customer.events (または他のトピック名)
Partitions: 1
Retention Time: 7 days (604800000 ms)
Max Message Size: 1048576 (1MB)
```

4. 「Create」をクリック
5. 残り4つのトピックについても繰り返す

### ステップ4: 接続情報の取得

1. Upstash Console でクラスターをクリック
2. 「Details」タブを開く
3. 以下の情報をコピー:

```bash
# これらの値をメモしてください
KAFKA_BROKERS=xxx-xxx-xxx-12345.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**スクリーンショット位置:**
- `KAFKA_BROKERS`: "Bootstrap Servers" フィールド
- `KAFKA_USERNAME`: "SASL Username" フィールド
- `KAFKA_PASSWORD`: "SASL Password" フィールド

---

## Renderへの環境変数設定

### 方法1: 自動スクリプト使用（推奨）

1. ターミナルで以下を実行:

```bash
cd "/Users/kohetsuwatanabe/Library/CloudStorage/OneDrive-個人用/ETSU-DX/CRMシステム開発"
./scripts/setup-kafka-env.sh
```

2. Upstash からコピーした情報を入力
3. 生成された `kafka-env-commands.txt` を開く
4. 各サービスの環境変数をコピー＆ペースト

### 方法2: 手動設定

各サービス（5つすべて）に以下の環境変数を追加:

#### Auth Service (crm-auth-service-smfm)

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx-12345.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=auth-service
```

#### Customer Service (crm-customer-service)

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx-12345.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=customer-service
```

#### Sales Activity Service (crm-sales-activity-service)

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx-12345.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=sales-activity-service
```

#### Opportunity Service (crm-opportunity-service)

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx-12345.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=opportunity-service
```

#### Analytics Service (crm-analytics-service)

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx-12345.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=analytics-service
```

### Render Dashboardでの設定手順

1. [Render Dashboard](https://dashboard.render.com/) を開く
2. 「CRM-Service」プロジェクトを選択
3. 各サービスに対して:
   - サービス名をクリック
   - 左メニューから「Environment」をクリック
   - 「Add Environment Variable」をクリック
   - 上記の5つの環境変数を1つずつ追加
   - 「Save Changes」をクリック

---

## デプロイと検証

### ステップ1: 全サービスの再デプロイ

環境変数を追加後、各サービスを再デプロイ:

1. Render Dashboard で各サービスを開く
2. 右上の「Manual Deploy」→「Deploy latest commit」をクリック
3. すべてのサービスが「Live」になるまで待つ（約5-10分）

### ステップ2: ログでKafka接続を確認

各サービスのログを確認:

1. Render Dashboard で各サービスを開く
2. 「Logs」タブをクリック
3. 以下のメッセージを探す:

**成功のログ:**
```
✅ Kafka Producer connected
✅ Kafka Consumer connected
```

**失敗のログ (トラブルシューティングが必要):**
```
❌ Failed to connect to Kafka
⚠️ Kafka connection failed, continuing without Kafka
```

### ステップ3: エンドツーエンドテスト

#### テスト1: ユーザー登録 → 顧客自動作成

```bash
# 1. ユーザー登録
curl -X POST https://crm-api-gateway.onrender.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kafka-test@example.com",
    "password": "Password123!",
    "name": "Kafka Test User",
    "role": "USER"
  }'

# レスポンス例:
# {
#   "id": "cm...",
#   "email": "kafka-test@example.com",
#   "name": "Kafka Test User",
#   "role": "USER",
#   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
# }

# 2. ログイン
TOKEN=$(curl -X POST https://crm-api-gateway.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "kafka-test@example.com",
    "password": "Password123!"
  }' | jq -r '.token')

# 3. 自動作成された顧客を確認
curl -X GET https://crm-api-gateway.onrender.com/api/customers \
  -H "Authorization: Bearer $TOKEN"

# 期待される結果:
# - email が "kafka-test@example.com" の顧客が存在する
# - name が "Kafka Test User" になっている
```

**検証ポイント:**
- ✅ Auth Service ログ: `📤 Event published: USER_CREATED to topic user.events`
- ✅ Customer Service ログ: `📥 Event received: USER_CREATED from topic user.events`
- ✅ Analytics Service ログ: `📥 Event received: USER_CREATED from topic user.events`

#### テスト2: 顧客作成 → タスク自動作成

```bash
# 1. 顧客作成
CUSTOMER_ID=$(curl -X POST https://crm-api-gateway.onrender.com/api/customers \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company Inc.",
    "industry": "Technology",
    "size": "MEDIUM",
    "email": "contact@testcompany.com",
    "phone": "+81-3-1234-5678"
  }' | jq -r '.id')

# 2. 自動作成されたタスクを確認
curl -X GET https://crm-api-gateway.onrender.com/api/tasks \
  -H "Authorization: Bearer $TOKEN"

# 期待される結果:
# - "初回コンタクト: Test Company Inc." という件名のタスクが存在する
# - customerId が上記の CUSTOMER_ID と一致する
```

**検証ポイント:**
- ✅ Customer Service ログ: `📤 Event published: CUSTOMER_CREATED to topic customer.events`
- ✅ Sales Activity Service ログ: `📥 Event received: CUSTOMER_CREATED from topic customer.events`
- ✅ Analytics Service ログ: `📥 Event received: CUSTOMER_CREATED from topic customer.events`

### ステップ4: Upstash Console でメッセージ確認

1. Upstash Console を開く
2. クラスターをクリック
3. 「Messages」タブを開く
4. 各トピックのメッセージ数を確認:

```
customer.events: 2 messages
user.events: 1 message
```

---

## トラブルシューティング

### 問題1: Kafka接続失敗

**エラーメッセージ:**
```
❌ KafkaJSConnectionError: Failed to connect to seed broker
```

**原因:**
- KAFKA_BROKERS の URL が間違っている
- ポート番号が間違っている（9092であることを確認）

**解決策:**
1. Upstash Console で正しい URL を確認
2. Render の環境変数を修正
3. サービスを再デプロイ

### 問題2: 認証失敗

**エラーメッセージ:**
```
❌ KafkaJSSASLAuthenticationError: SASL PLAIN authentication failed
```

**原因:**
- KAFKA_USERNAME または KAFKA_PASSWORD が間違っている

**解決策:**
1. Upstash Console で認証情報を再確認
2. Render の環境変数を修正（コピペミスに注意）
3. サービスを再デプロイ

### 問題3: トピックが存在しない

**エラーメッセージ:**
```
❌ KafkaJSProtocolError: Topic 'customer.events' not found
```

**原因:**
- Upstash Console でトピックが作成されていない

**解決策:**
1. Upstash Console で必要な5つのトピックを作成
2. サービスを再起動（自動的に再接続される）

### 問題4: イベントが届かない

**症状:**
- Kafka 接続は成功しているが、イベントが他のサービスに届かない

**原因:**
- Consumer が起動していない
- トピック名が間違っている

**解決策:**
1. 各サービスのログで `✅ Kafka Consumer connected` を確認
2. `src/config/kafka.ts` のトピック名を確認
3. Producer と Consumer のトピック名が一致しているか確認

### 問題5: メッセージ制限に達した

**エラーメッセージ:**
```
❌ Rate limit exceeded
```

**原因:**
- Free プランの1日1,000メッセージ制限を超えた

**解決策:**
1. Upstash Console で使用量を確認
2. 不要なイベント発行を削減
3. Pro プラン（$10/月）へのアップグレードを検討

---

## イベントフローの確認

### システム全体のイベントフロー図

```
┌─────────────────┐
│  Auth Service   │
│                 │
│  User Register  │──┐
└─────────────────┘  │
                     │ user.events
                     ├─────────────────────┐
                     ↓                     ↓
         ┌─────────────────────┐  ┌──────────────────┐
         │  Customer Service   │  │ Analytics Service│
         │                     │  │                  │
         │ Auto-create Customer│  │ Record Metrics   │
         └──────────┬──────────┘  └──────────────────┘
                    │
                    │ customer.events
                    ├──────────────────────┬─────────────────┐
                    ↓                      ↓                 ↓
       ┌──────────────────────┐  ┌─────────────────┐  ┌──────────────────┐
       │Sales Activity Service│  │Opportunity Svc  │  │Analytics Service │
       │                      │  │                 │  │                  │
       │ Auto-create Task     │  │ Link Customer   │  │ Update Dashboard │
       └──────────┬───────────┘  └─────────────────┘  └──────────────────┘
                  │
                  │ sales-activity.events
                  ├──────────────────────┬──────────────────┐
                  ↓                      ↓                  ↓
    ┌─────────────────────┐   ┌─────────────────┐   ┌──────────────────┐
    │ Opportunity Service │   │Analytics Service│   │ Notification Svc │
    │                     │   │                 │   │                  │
    │ Track Activities    │   │ Activity Metrics│   │ Send Alerts      │
    └─────────────────────┘   └─────────────────┘   └──────────────────┘
```

---

## 次のステップ

Kafka セットアップが完了したら:

1. ✅ **Redis キャッシング実装** - データベースクエリの最適化
2. ✅ **監視・ロギングシステム** - Sentry, LogRocket の統合
3. ✅ **CI/CD パイプライン** - GitHub Actions の設定
4. ✅ **E2Eテスト** - Playwright による自動テスト
5. ✅ **フロントエンド接続** - Next.js アプリの統合

---

## 参考リンク

- [Upstash Kafka Documentation](https://docs.upstash.com/kafka)
- [KafkaJS Documentation](https://kafka.js.org/)
- [Render Documentation](https://render.com/docs)
- [KAFKA_SETUP.md](./KAFKA_SETUP.md) - 詳細なセットアップ手順

---

## サポート

問題が解決しない場合:

1. このリポジトリの Issues を確認
2. Upstash Support (support@upstash.com) に問い合わせ
3. Render Support (support@render.com) に問い合わせ
