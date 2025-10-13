# 環境変数設定ガイド

このガイドでは、Render上の全サービスに必要な環境変数の設定方法を詳しく説明します。

## 📋 目次

1. [現在の環境変数](#現在の環境変数)
2. [追加が必要な環境変数](#追加が必要な環境変数)
3. [設定手順（Render Dashboard）](#設定手順render-dashboard)
4. [サービス別の設定](#サービス別の設定)
5. [検証方法](#検証方法)

---

## 現在の環境変数

各サービスには既に以下の環境変数が設定されているはずです：

### 全サービス共通
```bash
NODE_ENV=production
PORT=3000  # サービスごとに異なる
DATABASE_URL=postgresql://...  # Renderが自動設定
JWT_SECRET=your-secret-key
KAFKA_ENABLED=false  # 現在は無効
```

### サービス間通信（Internal Addresses）
```bash
# API Gateway
AUTH_SERVICE_URL=http://crm-auth-service-smfm:3100
CUSTOMER_SERVICE_URL=http://crm-customer-service:3101
SALES_ACTIVITY_SERVICE_URL=http://crm-sales-activity-service:3102
OPPORTUNITY_SERVICE_URL=http://crm-opportunity-service:3103
ANALYTICS_SERVICE_URL=http://crm-analytics-service:3104
```

---

## 追加が必要な環境変数

以下の環境変数を**全5サービス**（Auth, Customer, Sales Activity, Opportunity, Analytics）に追加します。

### 1. Kafka 関連（Upstash）

#### 事前準備: Upstash Kafka アカウント作成

1. https://console.upstash.com/ にアクセス
2. 「Sign Up」→ GitHub/Google でログイン
3. 「Create Cluster」をクリック
4. 以下を入力:
   ```
   Name: crm-kafka-cluster
   Region: us-east-1
   Plan: Free
   ```
5. 「Create」をクリック

#### トピック作成

「Topics」タブで以下の5つを作成:
- `customer.events`
- `user.events`
- `sales-activity.events`
- `opportunity.events`
- `notification.events`

各トピックの設定:
```
Partitions: 1
Retention Time: 7 days
```

#### 接続情報を取得

「Details」タブから以下をコピー:

```bash
# 全5サービスに追加
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

各サービス専用:
```bash
# Auth Service
KAFKA_CLIENT_ID=auth-service

# Customer Service
KAFKA_CLIENT_ID=customer-service

# Sales Activity Service
KAFKA_CLIENT_ID=sales-activity-service

# Opportunity Service
KAFKA_CLIENT_ID=opportunity-service

# Analytics Service
KAFKA_CLIENT_ID=analytics-service
```

---

### 2. Redis 関連（Render）

#### 事前準備: Render Redis 作成

1. https://dashboard.render.com/ にアクセス
2. 「New +」→「Redis」をクリック
3. 以下を入力:
   ```
   Name: crm-redis
   Plan: Free (25MB)
   Region: Oregon (US West)
   ```
4. 「Create Redis」をクリック
5. 作成完了後、「Internal Redis URL」をコピー

#### 環境変数

```bash
# 全5サービスに追加
REDIS_URL=rediss://red-xxx:yyy@oregon-redis.render.com:6379
```

---

### 3. Sentry 関連（エラー追跡）

#### 事前準備: Sentry アカウント作成

1. https://sentry.io/ にアクセス
2. 「Get Started」→ GitHub/Google でログイン
3. 「Create Project」をクリック
4. 以下を選択:
   ```
   Platform: Node.js
   Project Name: crm-microservices
   ```
5. DSN をコピー

#### 環境変数

```bash
# 全5サービスに追加
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
```

---

## 設定手順（Render Dashboard）

### 手順1: Render Dashboardにアクセス

1. https://dashboard.render.com/ を開く
2. 「CRM-Service」プロジェクトを選択

### 手順2: サービスを選択

左側のサービス一覧から設定するサービスをクリック
- crm-auth-service-smfm
- crm-customer-service
- crm-sales-activity-service
- crm-opportunity-service
- crm-analytics-service

### 手順3: 環境変数を追加

1. 左メニューから「Environment」をクリック
2. 「Add Environment Variable」をクリック
3. Key と Value を入力
4. 「Add」をクリック
5. すべての環境変数を追加するまで繰り返す

### 手順4: 保存して再デプロイ

1. 「Save Changes」をクリック
2. 「Manual Deploy」→「Deploy latest commit」をクリック
3. デプロイが完了するまで待つ（5-10分）

---

## サービス別の設定

### Auth Service (crm-auth-service-smfm)

```bash
# 既存（確認のみ）
NODE_ENV=production
PORT=3100
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret-key

# 追加
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=auth-service

REDIS_URL=rediss://red-xxx:yyy@oregon-redis.render.com:6379

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
```

### Customer Service (crm-customer-service)

```bash
# 既存（確認のみ）
NODE_ENV=production
PORT=3101
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret-key

# 追加
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=customer-service

REDIS_URL=rediss://red-xxx:yyy@oregon-redis.render.com:6379

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
```

### Sales Activity Service (crm-sales-activity-service)

```bash
# 既存（確認のみ）
NODE_ENV=production
PORT=3102
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret-key

# 追加
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=sales-activity-service

REDIS_URL=rediss://red-xxx:yyy@oregon-redis.render.com:6379

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
```

### Opportunity Service (crm-opportunity-service)

```bash
# 既存（確認のみ）
NODE_ENV=production
PORT=3103
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret-key

# 追加
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=opportunity-service

REDIS_URL=rediss://red-xxx:yyy@oregon-redis.render.com:6379

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
```

### Analytics Service (crm-analytics-service)

```bash
# 既存（確認のみ）
NODE_ENV=production
PORT=3104
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret-key

# 追加
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxxxxxxxxxxxxxxxxxx
KAFKA_PASSWORD=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
KAFKA_CLIENT_ID=analytics-service

REDIS_URL=rediss://red-xxx:yyy@oregon-redis.render.com:6379

SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
LOG_LEVEL=info
```

---

## 検証方法

### 1. デプロイログの確認

各サービスのデプロイが完了したら、ログを確認:

1. Render Dashboard → サービス選択
2. 「Logs」タブをクリック
3. 以下のメッセージを探す:

**成功のログ:**
```
✅ Kafka Producer connected
✅ Redis connected
✅ Sentry initialized
🚀 Auth Service running on port 3100
```

**警告/エラーログ（トラブルシューティングが必要）:**
```
⚠️ Kafka connection failed, continuing without Kafka
❌ Redis Client Error
❌ Sentry initialization failed
```

### 2. ヘルスチェック

各サービスが正常に起動しているか確認:

```bash
# API Gateway
curl https://crm-api-gateway.onrender.com/health

# Auth Service
curl https://crm-auth-service-smfm.onrender.com/health

# Customer Service
curl https://crm-customer-service.onrender.com/health

# Sales Activity Service
curl https://crm-sales-activity-service.onrender.com/health

# Opportunity Service
curl https://crm-opportunity-service.onrender.com/health

# Analytics Service
curl https://crm-analytics-service.onrender.com/health
```

**期待レスポンス:**
```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2025-10-13T12:00:00.000Z"
}
```

### 3. Kafka 接続確認

ログで以下を確認:

```bash
# Auth Service ログ
✅ Kafka Producer connected
```

### 4. Redis 接続確認

ログで以下を確認:

```bash
# Customer Service ログ
✅ Redis connected
```

### 5. Sentry 接続確認

1. https://sentry.io/ にログイン
2. プロジェクト「crm-microservices」を開く
3. テストエラーを送信:

```bash
curl -X POST https://crm-api-gateway.onrender.com/api/test-error
```

4. Sentry の Issues に新しいエラーが表示されることを確認

### 6. E2Eテスト実行

すべての設定が完了したら、E2Eテストを実行:

```bash
cd "/path/to/CRMシステム開発"
./scripts/e2e-test-simple.sh
```

**期待結果:**
```
=========================================
E2E テスト結果
=========================================
Total:  8
Passed: 8
Failed: 0

✓ すべてのテストが成功しました！
```

---

## トラブルシューティング

### 問題1: Kafka 接続エラー

**エラーメッセージ:**
```
❌ KafkaJSConnectionError: Failed to connect
```

**解決策:**
1. KAFKA_BROKERS の URL を確認
2. KAFKA_USERNAME と KAFKA_PASSWORD を確認
3. Upstash Console でクラスターが起動しているか確認
4. ネットワーク制限がないか確認

### 問題2: Redis 接続エラー

**エラーメッセージ:**
```
❌ Redis Client Error: connect ECONNREFUSED
```

**解決策:**
1. REDIS_URL を確認
2. Render Dashboard で Redis が起動しているか確認
3. URLが Internal Redis URL であることを確認

### 問題3: Sentry エラーが送信されない

**症状:**
- Sentry Console にエラーが表示されない

**解決策:**
1. SENTRY_DSN を確認
2. NODE_ENV が production であることを確認
3. ログで「Sentry initialized」を確認

### 問題4: 環境変数が反映されない

**症状:**
- 環境変数を追加したが、サービスが認識しない

**解決策:**
1. 「Save Changes」をクリックしたか確認
2. サービスを再デプロイ
3. ログで環境変数が読み込まれているか確認

---

## 環境変数チェックリスト

### 設定前の確認

- [ ] Upstash Kafka アカウント作成済み
- [ ] Kafka クラスター作成済み
- [ ] 5つのトピック作成済み
- [ ] Render Redis 作成済み
- [ ] Sentry アカウント作成済み
- [ ] Sentry プロジェクト作成済み

### 設定後の確認

#### Auth Service
- [ ] KAFKA_ENABLED=true
- [ ] KAFKA_BROKERS 設定済み
- [ ] KAFKA_USERNAME 設定済み
- [ ] KAFKA_PASSWORD 設定済み
- [ ] KAFKA_CLIENT_ID=auth-service
- [ ] REDIS_URL 設定済み
- [ ] SENTRY_DSN 設定済み
- [ ] LOG_LEVEL=info

#### Customer Service
- [ ] KAFKA_ENABLED=true
- [ ] KAFKA_BROKERS 設定済み
- [ ] KAFKA_USERNAME 設定済み
- [ ] KAFKA_PASSWORD 設定済み
- [ ] KAFKA_CLIENT_ID=customer-service
- [ ] REDIS_URL 設定済み
- [ ] SENTRY_DSN 設定済み
- [ ] LOG_LEVEL=info

#### Sales Activity Service
- [ ] KAFKA_ENABLED=true
- [ ] KAFKA_BROKERS 設定済み
- [ ] KAFKA_USERNAME 設定済み
- [ ] KAFKA_PASSWORD 設定済み
- [ ] KAFKA_CLIENT_ID=sales-activity-service
- [ ] REDIS_URL 設定済み
- [ ] SENTRY_DSN 設定済み
- [ ] LOG_LEVEL=info

#### Opportunity Service
- [ ] KAFKA_ENABLED=true
- [ ] KAFKA_BROKERS 設定済み
- [ ] KAFKA_USERNAME 設定済み
- [ ] KAFKA_PASSWORD 設定済み
- [ ] KAFKA_CLIENT_ID=opportunity-service
- [ ] REDIS_URL 設定済み
- [ ] SENTRY_DSN 設定済み
- [ ] LOG_LEVEL=info

#### Analytics Service
- [ ] KAFKA_ENABLED=true
- [ ] KAFKA_BROKERS 設定済み
- [ ] KAFKA_USERNAME 設定済み
- [ ] KAFKA_PASSWORD 設定済み
- [ ] KAFKA_CLIENT_ID=analytics-service
- [ ] REDIS_URL 設定済み
- [ ] SENTRY_DSN 設定済み
- [ ] LOG_LEVEL=info

### デプロイ後の確認

- [ ] 全サービスが「Live」ステータス
- [ ] ヘルスチェックが成功
- [ ] ログに「Kafka Producer connected」
- [ ] ログに「Redis connected」
- [ ] ログに「Sentry initialized」
- [ ] E2Eテストが成功

---

## 参考リンク

- [Upstash Kafka Console](https://console.upstash.com/)
- [Render Dashboard](https://dashboard.render.com/)
- [Sentry Console](https://sentry.io/)
- [UPSTASH_KAFKA_GUIDE.md](./UPSTASH_KAFKA_GUIDE.md) - 詳細なKafkaガイド
- [REDIS_CACHING_GUIDE.md](./REDIS_CACHING_GUIDE.md) - Redisガイド
- [MONITORING_LOGGING_GUIDE.md](./MONITORING_LOGGING_GUIDE.md) - Sentryガイド

---

## サポート

問題が解決しない場合:

1. **Render Support**: support@render.com
2. **Upstash Support**: support@upstash.com
3. **Sentry Support**: support@sentry.io
4. **GitHub Issues**: リポジトリの Issues

---

**作成日**: 2025-10-13
**最終更新**: 2025-10-13
