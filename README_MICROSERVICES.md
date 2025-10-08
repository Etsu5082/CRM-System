# マイクロサービスCRM システム

金融業界向けのエンタープライズグレードCRMシステム（マイクロサービスアーキテクチャ版）

## 🏗️ アーキテクチャ

### マイクロサービス構成

| サービス | ポート | 責務 |
|---------|--------|------|
| **API Gateway** | 3000 | リバースプロキシ、認証委譲、レート制限 |
| **Auth Service** | 3100 | 認証・認可、JWT発行、ユーザー管理 |
| **Customer Service** | 3101 | 顧客CRUD、検索、ソフトデリート |
| **Sales Activity Service** | 3102 | ミーティング・タスク管理、期限アラート |
| **Opportunity Service** | 3103 | 案件管理、承認ワークフロー |
| **Analytics Service** | 3104 | レポート生成、通知管理 |

### インフラストラクチャ

- **PostgreSQL** × 5: 各サービス専用データベース
- **Apache Kafka**: イベントストリーミング
- **Redis**: キャッシュサーバー
- **Zookeeper**: Kafkaクラスタ管理

## 🚀 クイックスタート

### 1. 前提条件

- Docker Desktop 4.0+
- Docker Compose 2.0+
- Node.js 20+ (ローカル開発用)
- 16GB以上のメモリ推奨

### 2. セットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd CRMシステム開発

# 環境変数の設定
cp .env.example .env
# .env ファイルを編集（必要に応じて）

# Docker Compose で全サービスを起動
docker compose -f docker-compose.microservices.yml up -d

# ログの確認
docker compose -f docker-compose.microservices.yml logs -f
```

### 3. 初期データ投入

```bash
# 管理者ユーザーの自動作成
./scripts/seed-data.sh
```

**デフォルトアカウント:**
- Email: `admin@example.com`
- Password: `admin123`

### 4. 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/health

# ログイン
curl -X POST http://localhost:3100/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# 統合テスト実行
./integration-test.sh
```

## 📋 コマンド一覧

### サービス管理

```bash
# 全サービス起動
docker compose -f docker-compose.microservices.yml up -d

# 特定サービスのみ起動
docker compose -f docker-compose.microservices.yml up -d auth-service

# サービス停止
docker compose -f docker-compose.microservices.yml down

# サービス再起動
docker compose -f docker-compose.microservices.yml restart <service-name>

# ログ確認
docker compose -f docker-compose.microservices.yml logs -f <service-name>

# コンテナ状態確認
docker compose -f docker-compose.microservices.yml ps
```

### データベース管理

```bash
# Prismaスキーマをデータベースにプッシュ
docker compose -f docker-compose.microservices.yml exec <service-name> npx prisma db push

# Prisma Studio起動
docker compose -f docker-compose.microservices.yml exec <service-name> npx prisma studio
```

### テスト

```bash
# 認証テスト
./test-auth.sh

# 統合テスト
./integration-test.sh

# 簡易テスト
./quick-test.sh
```

## 🔐 セキュリティ

### 環境変数の管理

**⚠️ 本番環境デプロイ前に必ず実施:**

1. **JWT_SECRETの生成**
```bash
openssl rand -base64 64
```

2. **データベースパスワードの生成**
```bash
openssl rand -base64 32
```

3. **.envファイルの保護**
```bash
# .gitignore に追加
echo ".env" >> .gitignore
chmod 600 .env
```

### 認証フロー

1. Auth Serviceでログイン → JWT発行
2. JWTをヘッダーに付与してリクエスト
3. 各サービスがJWTを検証
4. 認可チェック（RBAC）

```bash
# ログイン
TOKEN=$(curl -s -X POST http://localhost:3100/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | \
  jq -r '.token')

# 認証付きリクエスト
curl -H "Authorization: Bearer $TOKEN" http://localhost:3101/customers
```

## 📊 API エンドポイント

### Auth Service (3100)

| Method | Endpoint | 説明 |
|--------|----------|------|
| POST | /auth/login | ログイン |
| POST | /auth/logout | ログアウト |
| GET | /auth/me | 現在のユーザー情報 |
| POST | /auth/users | ユーザー作成（要認証） |
| GET | /auth/users | ユーザー一覧（要認証） |

### Customer Service (3101)

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /customers | 顧客一覧 |
| POST | /customers | 顧客作成 |
| GET | /customers/:id | 顧客詳細 |
| PUT | /customers/:id | 顧客更新 |
| DELETE | /customers/:id | 顧客削除（ソフト） |

### Sales Activity Service (3102)

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /meetings | ミーティング一覧 |
| POST | /meetings | ミーティング作成 |
| GET | /tasks | タスク一覧 |
| POST | /tasks | タスク作成 |

### Analytics Service (3104)

| Method | Endpoint | 説明 |
|--------|----------|------|
| GET | /reports/sales-summary | 営業サマリーレポート |
| GET | /notifications | 通知一覧 |

### API Gateway (3000)

全エンドポイントに `/api` プレフィックスを付与：
- `http://localhost:3000/api/auth/login`
- `http://localhost:3000/api/customers`
- など

## 🔧 開発

### ローカル開発環境

```bash
# 各サービスのディレクトリで実行
cd services/auth-service

# 依存関係のインストール
npm install

# 開発サーバー起動（Hot Reload）
npm run dev

# TypeScriptコンパイル
npm run build

# Prisma Studio起動
npm run prisma:studio
```

### 新しいサービスの追加

1. `services/<service-name>` ディレクトリ作成
2. `package.json`, `tsconfig.json`, `Dockerfile` 作成
3. Prismaスキーマ定義
4. `docker-compose.microservices.yml` に追加

## 📁 プロジェクト構造

```
CRMシステム開発/
├── services/
│   ├── auth-service/
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── customer-service/
│   ├── sales-activity-service/
│   ├── opportunity-service/
│   ├── analytics-service/
│   └── api-gateway/
├── k8s/                              # Kubernetesマニフェスト
├── scripts/                          # ユーティリティスクリプト
├── docker-compose.microservices.yml
├── .env.example
└── README_MICROSERVICES.md
```

## 📚 ドキュメント

- [アーキテクチャ設計](./MICROSERVICES_ARCHITECTURE.md)
- [実装完了レポート](./IMPLEMENTATION_COMPLETE.md)
- [デプロイメントログ](./DEPLOYMENT_LOG_MICROSERVICES.md)
- [課題解決レポート](./ISSUES_RESOLVED.md)
- [デプロイメントガイド](./DEPLOYMENT_GUIDE_MICROSERVICES.md)
- [サービス通信シーケンス](./SERVICE_COMMUNICATION_SEQUENCES.md)

## 🐛 トラブルシューティング

### ポート競合

```bash
# 使用中のポートを確認
lsof -ti:3000 | xargs kill -9
```

### コンテナが起動しない

```bash
# ログ確認
docker compose -f docker-compose.microservices.yml logs <service-name>

# コンテナ再作成
docker compose -f docker-compose.microservices.yml up -d --force-recreate <service-name>
```

### JWT認証エラー

```bash
# JWT_SECRET が全サービスで統一されているか確認
docker compose -f docker-compose.microservices.yml exec <service-name> printenv | grep JWT_SECRET
```

### データベース接続エラー

```bash
# データベースコンテナの状態確認
docker compose -f docker-compose.microservices.yml ps | grep db

# Prismaスキーマを再適用
docker compose -f docker-compose.microservices.yml exec <service-name> npx prisma db push --accept-data-loss
```

## 🚢 本番環境デプロイ

### Kubernetes

```bash
# Namespace作成
kubectl apply -f k8s/namespace.yaml

# Secrets設定（実際の値に変更）
kubectl apply -f k8s/secrets.yaml

# ConfigMap適用
kubectl apply -f k8s/configmap.yaml

# 全サービスデプロイ
kubectl apply -f k8s/

# 状態確認
kubectl get pods -n crm-system
```

### 環境変数チェックリスト

- [ ] `JWT_SECRET` を強力なランダム文字列に変更
- [ ] `POSTGRES_PASSWORD` を強力なパスワードに変更
- [ ] `ADMIN_PASSWORD` を変更
- [ ] `NODE_ENV=production` に設定
- [ ] SSL/TLS を有効化
- [ ] CORS設定を本番ドメインに制限

## 📈 モニタリング

### ヘルスチェック

```bash
# 全サービスのヘルスチェック
for port in 3100 3101 3102 3103 3104 3000; do
  echo "Port $port: $(curl -s http://localhost:$port/health | jq -r '.status')"
done
```

### メトリクス

- Prometheus (計画中)
- Grafana (計画中)
- Jaeger (計画中)

## 🤝 コントリビューション

1. Issueを作成
2. Feature Branchを作成
3. 変更をコミット
4. Pull Requestを作成

## 📝 ライセンス

Proprietary

---

**バージョン:** 1.0.0
**最終更新:** 2025年10月8日
