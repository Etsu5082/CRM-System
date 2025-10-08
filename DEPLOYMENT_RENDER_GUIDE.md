# Render デプロイガイド - マイクロサービスCRM

## Render とは
- マイクロサービス対応のクラウドプラットフォーム
- Docker完全対応、GitHubからの自動デプロイ
- 月額 $0-25 で本番環境構築可能（無料プランあり）
- crm.etsu-dx.com とのドメイン接続対応

## デプロイ手順

### 1. Render Dashboard にアクセス

1. https://render.com にアクセス
2. GitHubアカウントでログイン（既にログイン済みの場合はスキップ）

### 2. Blueprint からデプロイ（最も簡単）

#### 方法A: render.yaml を使った一括デプロイ

1. Render Dashboard で **New** → **Blueprint**
2. GitHubリポジトリ **Etsu5082/CRM-System** を選択
3. **Blueprint Name**: `crm-microservices`
4. **Apply** をクリック

Renderが自動的に：
- 6つのマイクロサービスをデプロイ
- 5つのPostgreSQLデータベースを作成
- 1つのRedisインスタンスを作成
- 全ての環境変数を設定

#### 方法B: 手動で各サービスをデプロイ

render.yamlが動作しない場合は、以下の手順で手動デプロイ：

### 3. データベース作成

#### PostgreSQL (5個)
1. **New** → **PostgreSQL**
2. 以下を5回繰り返し：

| Name | Database | User | Plan |
|------|----------|------|------|
| auth-db | crm_auth | crm_auth_user | Free |
| customer-db | crm_customer | crm_customer_user | Free |
| sales-activity-db | crm_sales_activity | crm_sales_activity_user | Free |
| opportunity-db | crm_opportunity | crm_opportunity_user | Free |
| analytics-db | crm_analytics | crm_analytics_user | Free |

#### Redis (1個)
1. **New** → **Redis**
2. Name: `redis`
3. Plan: **Free**

### 4. Upstash Kafka セットアップ

1. https://upstash.com にアクセス
2. GitHub/Googleアカウントでサインアップ
3. **Kafka** → **Create Cluster**
   - Name: `crm-kafka`
   - Region: `us-east-1` (最も近いリージョン)
   - Plan: **Free**
4. **Details** から以下をコピー：
   - **Bootstrap Servers** (例: `grizzly-12345-us1-kafka.upstash.io:9092`)
   - **Username**
   - **Password**

### 5. マイクロサービスのデプロイ

各サービスごとに以下を実行：

#### 5-1. Auth Service

1. **New** → **Web Service**
2. **Connect GitHub Repository**: `Etsu5082/CRM-System`
3. 設定:
   - **Name**: `crm-auth-service`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `services/auth-service/Dockerfile`
   - **Docker Context**: `services/auth-service`
   - **Plan**: `Free`
4. **Advanced** → **Health Check Path**: `/health`
5. **Environment Variables**:
```
NODE_ENV=production
PORT=3100
JWT_SECRET=<strong-random-32-char-secret>
DATABASE_URL=<auth-db の Internal Connection String>
```

#### 5-2. Customer Service

1. **New** → **Web Service**
2. **Connect Repository**: `Etsu5082/CRM-System`
3. 設定:
   - **Name**: `crm-customer-service`
   - **Dockerfile Path**: `services/customer-service/Dockerfile`
   - **Docker Context**: `services/customer-service`
4. **Environment Variables**:
```
NODE_ENV=production
PORT=3101
JWT_SECRET=<same-as-auth-service>
DATABASE_URL=<customer-db の Internal Connection String>
AUTH_SERVICE_URL=https://crm-auth-service.onrender.com
KAFKA_BROKERS=<Upstash Kafka Bootstrap Server>
KAFKA_USERNAME=<Upstash Username>
KAFKA_PASSWORD=<Upstash Password>
```

#### 5-3. Sales Activity Service

1. **New** → **Web Service**
2. 設定:
   - **Name**: `crm-sales-activity-service`
   - **Dockerfile Path**: `services/sales-activity-service/Dockerfile`
   - **Docker Context**: `services/sales-activity-service`
3. **Environment Variables**:
```
NODE_ENV=production
PORT=3102
JWT_SECRET=<same-as-auth-service>
DATABASE_URL=<sales-activity-db の Internal Connection String>
AUTH_SERVICE_URL=https://crm-auth-service.onrender.com
KAFKA_BROKERS=<Upstash Kafka Bootstrap Server>
KAFKA_USERNAME=<Upstash Username>
KAFKA_PASSWORD=<Upstash Password>
```

#### 5-4. Opportunity Service

1. **New** → **Web Service**
2. 設定:
   - **Name**: `crm-opportunity-service`
   - **Dockerfile Path**: `services/opportunity-service/Dockerfile`
   - **Docker Context**: `services/opportunity-service`
3. **Environment Variables**:
```
NODE_ENV=production
PORT=3103
JWT_SECRET=<same-as-auth-service>
DATABASE_URL=<opportunity-db の Internal Connection String>
AUTH_SERVICE_URL=https://crm-auth-service.onrender.com
KAFKA_BROKERS=<Upstash Kafka Bootstrap Server>
KAFKA_USERNAME=<Upstash Username>
KAFKA_PASSWORD=<Upstash Password>
```

#### 5-5. Analytics Service

1. **New** → **Web Service**
2. 設定:
   - **Name**: `crm-analytics-service`
   - **Dockerfile Path**: `services/analytics-service/Dockerfile`
   - **Docker Context**: `services/analytics-service`
3. **Environment Variables**:
```
NODE_ENV=production
PORT=3104
JWT_SECRET=<same-as-auth-service>
DATABASE_URL=<analytics-db の Internal Connection String>
REDIS_URL=<redis の Internal Connection String>
KAFKA_BROKERS=<Upstash Kafka Bootstrap Server>
KAFKA_USERNAME=<Upstash Username>
KAFKA_PASSWORD=<Upstash Password>
```

#### 5-6. API Gateway

1. **New** → **Web Service**
2. 設定:
   - **Name**: `crm-api-gateway`
   - **Dockerfile Path**: `services/api-gateway/Dockerfile`
   - **Docker Context**: `services/api-gateway`
3. **Environment Variables**:
```
NODE_ENV=production
PORT=3000
JWT_SECRET=<same-as-auth-service>
AUTH_SERVICE_URL=https://crm-auth-service.onrender.com
CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com
ANALYTICS_SERVICE_URL=https://crm-analytics-service.onrender.com
```

### 6. データベース初期化

Auth Serviceのデプロイが完了したら、Render Shellで初期化：

1. Auth Service → **Shell** タブ
2. 以下のコマンドを実行：

```bash
# Prisma migration
npx prisma db push

# Create admin user
node -e "
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const hashedPassword = await bcrypt.hash('Admin123!', 10);
  await prisma.user.create({
    data: {
      email: 'admin@example.com',
      password: hashedPassword,
      name: '管理者',
      role: 'ADMIN'
    }
  });
  console.log('Admin user created!');
  process.exit(0);
})();
"
```

3. 他の4つのサービスでも同様にPrisma migration実行：
```bash
npx prisma db push
```

### 7. カスタムドメイン設定

#### API Gatewayにカスタムドメインを追加

1. API Gateway サービス → **Settings** → **Custom Domains**
2. **Add Custom Domain**: `crm.etsu-dx.com`
3. Renderが提供するCNAMEレコードをコピー

#### Vercel DNS設定

1. Vercel Dashboard → **etsu-dx.com** → **Settings** → **Domains**
2. DNS Records を編集：

```
Type: CNAME
Name: crm
Value: <render-provided-cname>.onrender.com
```

3. DNS伝播を待つ（5-30分）

### 8. SSL証明書

Renderが自動的にLet's Encrypt SSL証明書を発行（無料）

### 9. デプロイ検証

```bash
# ヘルスチェック
curl https://crm.etsu-dx.com/health

# ログイン
curl -X POST https://crm.etsu-dx.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# 顧客一覧（要トークン）
curl https://crm.etsu-dx.com/customers \
  -H "Authorization: Bearer <token>"
```

## 推定コスト

| プラン | 月額 | 含まれるもの |
|--------|------|------------|
| **Free** | $0 | 6サービス + 5 PostgreSQL + Redis（制限あり） |
| **Starter** | $7/service | より高いリソース、常時稼働 |
| **Standard** | $25/service | プロダクション推奨 |

### 推奨プラン構成

- **無料プランで開始**: $0/月（15分無アクセスでスリープ）
- **Starter API Gateway**: $7/月（常時稼働）
- **本番環境**: $50-150/月（重要サービスのみStarter/Standard）

## トラブルシューティング

### ビルドエラー
- **Dockerfile Path** と **Docker Context** が正しいか確認
- ログを確認: サービス → **Logs** タブ

### データベース接続エラー
- **Internal Connection String** を使用（External は課金対象）
- 環境変数 `DATABASE_URL` が正しいか確認

### サービス間通信エラー
- サービスURL は `https://service-name.onrender.com` 形式
- JWT_SECRET が全サービスで同一か確認

### Kafkaエラー
- Upstash Kafka の **SASL/SCRAM認証** が必要
- 環境変数に `KAFKA_USERNAME` と `KAFKA_PASSWORD` を追加

## 自動デプロイ設定

Render は GitHub の main ブランチへのプッシュを検知して自動デプロイ：

1. 各サービス → **Settings** → **Build & Deploy**
2. **Auto-Deploy**: `Yes` に設定
3. **Branch**: `main`

これで `git push` するたびに自動的に本番環境にデプロイされます。

## まとめ

✅ Render Blueprint で一括デプロイ可能
✅ 無料プランで開始可能
✅ crm.etsu-dx.com でのアクセス対応
✅ 自動スケーリング・SSL対応
✅ セットアップ時間: 30-45分
