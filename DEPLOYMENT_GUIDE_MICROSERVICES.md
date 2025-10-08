# CRMマイクロサービス デプロイ手順書

## 📋 目次

1. [前提条件](#前提条件)
2. [ローカル開発環境セットアップ](#ローカル開発環境セットアップ)
3. [Docker Composeでのデプロイ](#docker-composeでのデプロイ)
4. [Kubernetesへのデプロイ](#kubernetesへのデプロイ)
5. [CI/CDパイプライン](#cicdパイプライン)
6. [監視・ログ設定](#監視ログ設定)
7. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

### 必要なツール

| ツール | バージョン | 用途 |
|--------|-----------|------|
| Node.js | 20.x | マイクロサービス実行 |
| Docker | 24.x+ | コンテナ化 |
| Docker Compose | 2.x+ | ローカル統合環境 |
| Kubernetes | 1.28+ | 本番環境オーケストレーション |
| kubectl | 1.28+ | K8s CLI |
| Helm | 3.12+ | K8s パッケージ管理 |
| Terraform | 1.5+ (optional) | インフラコード |

### インフラ要件

#### 開発環境
- CPU: 8コア以上
- メモリ: 16GB以上
- ストレージ: 50GB以上

#### 本番環境 (Kubernetes)
- マスターノード: 3台 (4vCPU, 8GB RAM)
- ワーカーノード: 5台以上 (8vCPU, 16GB RAM)
- ストレージ: 1TB以上 (SSD推奨)

---

## ローカル開発環境セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/your-org/crm-microservices.git
cd crm-microservices
```

### 2. 環境変数の設定

```bash
# Auth Service
cd services/auth-service
cp .env.example .env
# Edit .env with your local values

# Customer Service
cd ../customer-service
cp .env.example .env
# Edit .env

# Repeat for all services...
```

### 3. 依存関係のインストール

```bash
# Install dependencies for all services
npm run install:all

# または個別に
cd services/auth-service && npm install
cd services/customer-service && npm install
cd services/api-gateway && npm install
# ...
```

### 4. データベースマイグレーション

```bash
# Start PostgreSQL with Docker
docker run -d --name postgres-dev -p 5432:5432 \
  -e POSTGRES_PASSWORD=password postgres:16

# Run migrations
cd services/auth-service
npx prisma migrate dev

cd ../customer-service
npx prisma migrate dev

# Repeat for all services...
```

### 5. サービスの起動

```bash
# Terminal 1: Auth Service
cd services/auth-service
npm run dev  # Port 3100

# Terminal 2: Customer Service
cd services/customer-service
npm run dev  # Port 3101

# Terminal 3: Sales Activity Service
cd services/sales-activity-service
npm run dev  # Port 3102

# Terminal 4: Opportunity Service
cd services/opportunity-service
npm run dev  # Port 3103

# Terminal 5: Analytics Service
cd services/analytics-service
npm run dev  # Port 3104

# Terminal 6: API Gateway
cd services/api-gateway
npm run dev  # Port 3000
```

---

## Docker Composeでのデプロイ

### 1. Docker Compose ファイルの作成

```bash
# すでに docker-compose.microservices.yml が作成されている前提
cp docker-compose.microservices.yml docker-compose.yml
```

### 2. 環境変数の設定

```bash
# .env ファイルを作成
cat > .env <<EOF
# Database Passwords
POSTGRES_PASSWORD=secure-password-here

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key

# Kafka
KAFKA_BROKERS=kafka:9092

# Service URLs (for API Gateway)
AUTH_SERVICE_URL=http://auth-service:3100
CUSTOMER_SERVICE_URL=http://customer-service:3101
SALES_ACTIVITY_SERVICE_URL=http://sales-activity-service:3102
OPPORTUNITY_SERVICE_URL=http://opportunity-service:3103
ANALYTICS_SERVICE_URL=http://analytics-service:3104
EOF
```

### 3. ビルドと起動

```bash
# Build all images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. データベースマイグレーション

```bash
# Auth Service
docker-compose exec auth-service npx prisma migrate deploy

# Customer Service
docker-compose exec customer-service npx prisma migrate deploy

# Sales Activity Service
docker-compose exec sales-activity-service npx prisma migrate deploy

# Opportunity Service
docker-compose exec opportunity-service npx prisma migrate deploy

# Analytics Service
docker-compose exec analytics-service npx prisma migrate deploy
```

### 5. 初期データのシード

```bash
# Auth Service (create admin user)
docker-compose exec auth-service npm run seed

# Customer Service (sample customers)
docker-compose exec customer-service npm run seed
```

### 6. 動作確認

```bash
# Health checks
curl http://localhost:3100/health  # Auth Service
curl http://localhost:3101/health  # Customer Service
curl http://localhost:3000/health  # API Gateway

# Login test
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

---

## Kubernetesへのデプロイ

### 前提: Kubernetesクラスタの準備

```bash
# Minikubeの場合 (ローカル開発)
minikube start --cpus=4 --memory=8192

# GKEの場合
gcloud container clusters create crm-cluster \
  --num-nodes=5 \
  --machine-type=n1-standard-4 \
  --zone=asia-northeast1-a

# EKSの場合
eksctl create cluster \
  --name crm-cluster \
  --region ap-northeast-1 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 5
```

### 1. Namespace の作成

```bash
kubectl apply -f k8s/base/namespace.yaml

# Or manually
kubectl create namespace crm-system
```

### 2. シークレットとConfigMapの作成

```bash
# JWT Secret
kubectl create secret generic jwt-secret \
  --from-literal=secret='your-production-jwt-secret' \
  -n crm-system

# Database secrets
kubectl create secret generic auth-db-secret \
  --from-literal=url='postgresql://user:pass@auth-db:5432/auth_db' \
  -n crm-system

kubectl create secret generic customer-db-secret \
  --from-literal=url='postgresql://user:pass@customer-db:5432/customer_db' \
  -n crm-system

# ConfigMap
kubectl apply -f k8s/base/configmap.yaml
```

### 3. データベースのデプロイ (Helm推奨)

```bash
# Add Bitnami repo
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# PostgreSQL for Auth Service
helm install auth-db bitnami/postgresql \
  --namespace crm-system \
  --set auth.username=authuser \
  --set auth.password=authpass \
  --set auth.database=auth_db \
  --set primary.persistence.size=20Gi

# PostgreSQL for Customer Service
helm install customer-db bitnami/postgresql \
  --namespace crm-system \
  --set auth.username=customeruser \
  --set auth.password=customerpass \
  --set auth.database=customer_db \
  --set primary.persistence.size=50Gi

# Repeat for other databases...

# Redis
helm install redis bitnami/redis \
  --namespace crm-system \
  --set auth.password=redispass \
  --set master.persistence.size=10Gi
```

### 4. Kafkaのデプロイ

```bash
helm install kafka bitnami/kafka \
  --namespace crm-system \
  --set replicaCount=3 \
  --set persistence.size=100Gi \
  --set zookeeper.replicaCount=3 \
  --set zookeeper.persistence.size=10Gi
```

### 5. マイクロサービスのビルドとプッシュ

```bash
# Docker registry にログイン
docker login

# Build and push all services
export REGISTRY=your-registry.io/crm

# Auth Service
cd services/auth-service
docker build -t ${REGISTRY}/auth-service:latest .
docker push ${REGISTRY}/auth-service:latest

# Customer Service
cd ../customer-service
docker build -t ${REGISTRY}/customer-service:latest .
docker push ${REGISTRY}/customer-service:latest

# API Gateway
cd ../api-gateway
docker build -t ${REGISTRY}/api-gateway:latest .
docker push ${REGISTRY}/api-gateway:latest

# Repeat for all services...
```

### 6. Kubernetesマニフェストの適用

```bash
# Auth Service
kubectl apply -f k8s/base/auth-service/

# Customer Service
kubectl apply -f k8s/base/customer-service/

# Sales Activity Service
kubectl apply -f k8s/base/sales-activity-service/

# Opportunity Service
kubectl apply -f k8s/base/opportunity-service/

# Analytics Service
kubectl apply -f k8s/base/analytics-service/

# API Gateway
kubectl apply -f k8s/base/api-gateway/

# Frontend Shell
kubectl apply -f k8s/base/frontend-shell/
```

### 7. Ingressの設定

```bash
# Install NGINX Ingress Controller
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace

# Apply Ingress
kubectl apply -f k8s/base/ingress.yaml

# Get Ingress IP
kubectl get ingress -n crm-system
```

### 8. SSL/TLS証明書 (cert-manager)

```bash
# Install cert-manager
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml

# Create ClusterIssuer
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF
```

### 9. データベースマイグレーション (Job)

```bash
# Auth Service Migration Job
cat <<EOF | kubectl apply -f -
apiVersion: batch/v1
kind: Job
metadata:
  name: auth-db-migration
  namespace: crm-system
spec:
  template:
    spec:
      containers:
      - name: migrate
        image: ${REGISTRY}/auth-service:latest
        command: ["npx", "prisma", "migrate", "deploy"]
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-db-secret
              key: url
      restartPolicy: Never
  backoffLimit: 3
EOF

# Check job status
kubectl get jobs -n crm-system
kubectl logs job/auth-db-migration -n crm-system
```

### 10. 動作確認

```bash
# Check all pods
kubectl get pods -n crm-system

# Check services
kubectl get svc -n crm-system

# Check HPA
kubectl get hpa -n crm-system

# Test API
INGRESS_IP=$(kubectl get ingress -n crm-system -o jsonpath='{.items[0].status.loadBalancer.ingress[0].ip}')
curl https://${INGRESS_IP}/api/auth/health
```

---

## CI/CDパイプライン

### GitHub Actions ワークフロー

```yaml
# .github/workflows/deploy.yml
name: Deploy Microservices

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ secrets.REGISTRY }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}

      - name: Build and push Auth Service
        uses: docker/build-push-action@v5
        with:
          context: ./services/auth-service
          push: true
          tags: ${{ secrets.REGISTRY }}/auth-service:${{ github.sha }}

      - name: Build and push Customer Service
        uses: docker/build-push-action@v5
        with:
          context: ./services/customer-service
          push: true
          tags: ${{ secrets.REGISTRY }}/customer-service:${{ github.sha }}

      # Repeat for all services...

      - name: Setup kubectl
        uses: azure/setup-kubectl@v3

      - name: Deploy to Kubernetes
        run: |
          kubectl set image deployment/auth-service \
            auth-service=${{ secrets.REGISTRY }}/auth-service:${{ github.sha }} \
            -n crm-system

          kubectl set image deployment/customer-service \
            customer-service=${{ secrets.REGISTRY }}/customer-service:${{ github.sha }} \
            -n crm-system

          # Repeat for all services...

      - name: Wait for rollout
        run: |
          kubectl rollout status deployment/auth-service -n crm-system
          kubectl rollout status deployment/customer-service -n crm-system
```

### ArgoCD によるGitOps

```bash
# Install ArgoCD
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# Access ArgoCD UI
kubectl port-forward svc/argocd-server -n argocd 8080:443

# Get admin password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Create Application
cat <<EOF | kubectl apply -f -
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: crm-microservices
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/your-org/crm-microservices.git
    targetRevision: HEAD
    path: k8s/base
  destination:
    server: https://kubernetes.default.svc
    namespace: crm-system
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
EOF
```

---

## 監視・ログ設定

### Prometheus + Grafana

```bash
# Install Prometheus Operator
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring --create-namespace

# Access Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80

# Username: admin
# Password:
kubectl get secret -n monitoring prometheus-grafana \
  -o jsonpath="{.data.admin-password}" | base64 -d
```

### ELK Stack

```bash
# Elasticsearch
helm install elasticsearch elastic/elasticsearch \
  --namespace logging --create-namespace \
  --set replicas=3 \
  --set volumeClaimTemplate.resources.requests.storage=100Gi

# Kibana
helm install kibana elastic/kibana --namespace logging

# Fluentd
kubectl apply -f k8s/logging/fluentd-daemonset.yaml
```

### Jaeger (分散トレーシング)

```bash
# Install Jaeger Operator
kubectl create namespace observability
kubectl apply -f https://github.com/jaegertracing/jaeger-operator/releases/download/v1.50.0/jaeger-operator.yaml -n observability

# Deploy Jaeger instance
cat <<EOF | kubectl apply -f -
apiVersion: jaegertracing.io/v1
kind: Jaeger
metadata:
  name: simplest
  namespace: crm-system
EOF
```

---

## トラブルシューティング

### Podが起動しない

```bash
# Podの状態確認
kubectl describe pod <pod-name> -n crm-system

# ログ確認
kubectl logs <pod-name> -n crm-system

# イベント確認
kubectl get events -n crm-system --sort-by='.lastTimestamp'
```

### データベース接続エラー

```bash
# Secret確認
kubectl get secret auth-db-secret -n crm-system -o yaml

# データベースPodに接続
kubectl exec -it auth-db-postgresql-0 -n crm-system -- psql -U authuser -d auth_db

# 接続テスト
kubectl run -it --rm debug --image=postgres:16 --restart=Never -n crm-system -- \
  psql -h auth-db-postgresql -U authuser -d auth_db
```

### Kafka接続エラー

```bash
# Kafka Podの確認
kubectl get pods -n crm-system -l app.kubernetes.io/name=kafka

# Kafka Topicの確認
kubectl exec -it kafka-0 -n crm-system -- kafka-topics.sh \
  --bootstrap-server localhost:9092 --list
```

### HPAが動作しない

```bash
# Metrics Serverの確認
kubectl top nodes
kubectl top pods -n crm-system

# HPA status確認
kubectl describe hpa auth-service-hpa -n crm-system
```

---

## ロールバック手順

### Kubernetesでのロールバック

```bash
# Deployment履歴確認
kubectl rollout history deployment/auth-service -n crm-system

# 前のバージョンにロールバック
kubectl rollout undo deployment/auth-service -n crm-system

# 特定のリビジョンにロールバック
kubectl rollout undo deployment/auth-service --to-revision=2 -n crm-system
```

---

## スケーリング

### 手動スケーリング

```bash
# Replica数を変更
kubectl scale deployment/auth-service --replicas=5 -n crm-system
```

### 自動スケーリング (HPA)

```bash
# HPA設定
kubectl autoscale deployment auth-service \
  --cpu-percent=70 \
  --min=3 \
  --max=10 \
  -n crm-system
```

---

## バックアップとリカバリ

### データベースバックアップ

```bash
# PostgreSQL バックアップ
kubectl exec auth-db-postgresql-0 -n crm-system -- \
  pg_dump -U authuser auth_db > backup-auth-$(date +%Y%m%d).sql

# リストア
kubectl exec -i auth-db-postgresql-0 -n crm-system -- \
  psql -U authuser auth_db < backup-auth-20241008.sql
```

### Velero によるクラスタバックアップ

```bash
# Velero インストール
velero install \
  --provider aws \
  --bucket crm-backup \
  --backup-location-config region=ap-northeast-1

# バックアップ実行
velero backup create crm-backup-$(date +%Y%m%d) \
  --include-namespaces crm-system

# リストア
velero restore create --from-backup crm-backup-20241008
```

---

## 完了チェックリスト

- [ ] すべてのPodが正常起動
- [ ] データベースマイグレーション完了
- [ ] Ingress経由でアクセス可能
- [ ] HPAが正常動作
- [ ] 監視ダッシュボードが表示される
- [ ] ログが集約されている
- [ ] 分散トレーシングが動作
- [ ] バックアップジョブが設定済み
- [ ] CI/CDパイプラインが動作
- [ ] ドキュメントが最新

---

## サポート

問題が発生した場合は、以下のログを添えてサポートチームに連絡してください:

```bash
# すべてのログを収集
kubectl logs -n crm-system --all-containers=true --prefix=true > all-logs.txt

# システム情報
kubectl describe namespace crm-system > namespace-info.txt
kubectl get all -n crm-system -o yaml > resources.yaml
```
