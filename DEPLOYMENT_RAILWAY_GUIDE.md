# Railway デプロイガイド - マイクロサービスCRM

## Railway とは
- マイクロサービス対応のクラウドプラットフォーム
- Docker対応、自動ビルド、自動スケーリング
- 月額 $20-50 で本番環境構築可能
- crm.etsu-dx.com とのドメイン接続対応

## デプロイ手順

### 1. Railwayアカウント作成
```bash
# Railway CLIインストール
npm install -g @railway/cli

# ログイン
railway login
```

### 2. プロジェクト作成
```bash
# 新規プロジェクト
railway init

# GitHubリポジトリ接続
railway link
```

### 3. サービスのデプロイ

#### 各マイクロサービスをデプロイ
```bash
# Auth Service
railway up -d services/auth-service

# Customer Service
railway up -d services/customer-service

# Sales Activity Service
railway up -d services/sales-activity-service

# Opportunity Service
railway up -d services/opportunity-service

# Analytics Service
railway up -d services/analytics-service

# API Gateway
railway up -d services/api-gateway
```

#### または GitHub 自動デプロイ
1. Railway Dashboard で GitHub リポジトリ接続
2. 各サービスディレクトリを指定
3. 自動ビルド・デプロイ開始

### 4. データベース・インフラ追加

#### PostgreSQL (Database per Service)
```bash
# 5つのPostgreSQLインスタンスを作成
railway add --database postgres # auth-db
railway add --database postgres # customer-db
railway add --database postgres # sales-activity-db
railway add --database postgres # opportunity-db
railway add --database postgres # analytics-db
```

#### Redis
```bash
railway add --database redis
```

#### Kafka (Upstashを使用)
- [Upstash Kafka](https://upstash.com/) で無料アカウント作成
- Kafka クラスター作成
- 接続情報を環境変数に設定

### 5. 環境変数設定

Railway Dashboard で各サービスに設定:

```bash
# Auth Service
DATABASE_URL=postgresql://...
JWT_SECRET=<strong-random-secret>
NODE_ENV=production

# Customer Service
DATABASE_URL=postgresql://...
JWT_SECRET=<same-as-auth>
AUTH_SERVICE_URL=https://auth-service-xxx.railway.app
KAFKA_BROKERS=upstash-kafka-endpoint

# Sales Activity Service
DATABASE_URL=postgresql://...
JWT_SECRET=<same-as-auth>
AUTH_SERVICE_URL=https://auth-service-xxx.railway.app
KAFKA_BROKERS=upstash-kafka-endpoint

# Opportunity Service
DATABASE_URL=postgresql://...
JWT_SECRET=<same-as-auth>
AUTH_SERVICE_URL=https://auth-service-xxx.railway.app
KAFKA_BROKERS=upstash-kafka-endpoint

# Analytics Service
DATABASE_URL=postgresql://...
JWT_SECRET=<same-as-auth>
REDIS_URL=redis://...
KAFKA_BROKERS=upstash-kafka-endpoint

# API Gateway
JWT_SECRET=<same-as-auth>
AUTH_SERVICE_URL=https://auth-service-xxx.railway.app
CUSTOMER_SERVICE_URL=https://customer-service-xxx.railway.app
SALES_ACTIVITY_SERVICE_URL=https://sales-activity-service-xxx.railway.app
OPPORTUNITY_SERVICE_URL=https://opportunity-service-xxx.railway.app
ANALYTICS_SERVICE_URL=https://analytics-service-xxx.railway.app
```

### 6. データベース初期化

```bash
# 各サービスでPrismaマイグレーション実行
railway run --service auth-service npx prisma db push
railway run --service customer-service npx prisma db push
railway run --service sales-activity-service npx prisma db push
railway run --service opportunity-service npx prisma db push
railway run --service analytics-service npx prisma db push

# 初期管理者ユーザー作成
railway run --service auth-service node -e "
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
})();
"
```

### 7. カスタムドメイン設定

#### Railway で API Gateway のドメイン設定
1. Railway Dashboard > API Gateway Service > Settings
2. Custom Domain > Add Domain
3. `crm.etsu-dx.com` を入力
4. DNS設定を更新:

```
Type: CNAME
Name: crm (または @)
Value: <railway-provided-domain>.railway.app
```

#### Vercel DNS設定 (現在のドメイン管理が Vercel の場合)
1. Vercel Dashboard > etsu-dx.com > DNS
2. CNAME レコード追加:
   - Name: `crm`
   - Value: `<railway-api-gateway>.railway.app`

### 8. SSL証明書
Railway が自動的に Let's Encrypt SSL証明書を発行

### 9. デプロイ検証

```bash
# ヘルスチェック
curl https://crm.etsu-dx.com/health

# ログイン
curl -X POST https://crm.etsu-dx.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'

# 顧客一覧
curl https://crm.etsu-dx.com/customers \
  -H "Authorization: Bearer <token>"
```

## 推定コスト

| サービス | Railway プラン | 月額 |
|---------|---------------|------|
| 6マイクロサービス | Hobby ($5/service) | $30 |
| 5 PostgreSQL | 含まれる | $0 |
| Redis | 含まれる | $0 |
| Kafka (Upstash) | 無料プラン | $0 |
| **合計** | | **$30/月** |

または Pro プラン: $20/月 (従量課金)

## トラブルシューティング

### サービス間通信エラー
- 環境変数 `*_SERVICE_URL` が正しいか確認
- Railway の内部DNS `service-name.railway.internal` を使用

### データベース接続エラー
- `DATABASE_URL` が正しいか確認
- Prisma Client の再生成: `npx prisma generate`

### Kafkaエラー
- Upstash Kafka の接続情報を確認
- SASL/SSL設定が必要な場合がある

## 代替: Render でのデプロイ

Railwayの代わりに [Render](https://render.com/) も同様に使用可能:

```bash
# Render CLI
npm install -g render

# デプロイ
render deploy
```

設定ファイル: `render.yaml` を作成して自動デプロイ

## まとめ

✅ Railway を使うことで AWS EKS の 1/10 のコストで本番環境構築
✅ crm.etsu-dx.com でのアクセス可能
✅ 自動スケーリング・SSL対応
✅ セットアップ時間: 30分-1時間
