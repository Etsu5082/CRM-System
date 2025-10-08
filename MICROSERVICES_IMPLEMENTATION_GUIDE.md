# マイクロサービス実装ガイド

## 📦 完成したサービス

### ✅ Auth Service
- **ポート**: 3100
- **責任**: ユーザー認証・認可・監査ログ
- **DB**: auth_db (PostgreSQL)
- **API**: `/auth/*`

### 🔨 Customer Service (テンプレート作成済み)
- **ポート**: 3101
- **責任**: 顧客情報管理
- **DB**: customer_db (PostgreSQL)
- **API**: `/customers/*`

### 📝 残りのサービス (同様の構造で実装)

#### Sales Activity Service
- **ポート**: 3102
- **責任**: 商談記録・タスク管理
- **DB**: sales_activity_db (PostgreSQL)
- **API**: `/meetings/*`, `/tasks/*`

#### Opportunity Service
- **ポート**: 3103
- **責任**: 承認申請管理
- **DB**: opportunity_db (PostgreSQL)
- **API**: `/approvals/*`

#### Analytics Service
- **ポート**: 3104
- **責任**: レポート生成・通知管理
- **DB**: analytics_db (PostgreSQL + Redis)
- **API**: `/reports/*`, `/notifications/*`

#### API Gateway
- **ポート**: 3000
- **責任**: ルーティング・認証委譲
- **API**: すべてのサービスへプロキシ

---

## 🐳 Docker Compose でローカル起動

すべてのマイクロサービスをDocker Composeで一括起動します。

```yaml
# docker-compose.microservices.yml
version: '3.9'

services:
  # Kafka & Zookeeper
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # Databases
  auth-db:
    image: postgres:16
    environment:
      POSTGRES_DB: auth_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"

  customer-db:
    image: postgres:16
    environment:
      POSTGRES_DB: customer_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5433:5432"

  sales-activity-db:
    image: postgres:16
    environment:
      POSTGRES_DB: sales_activity_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5434:5432"

  opportunity-db:
    image: postgres:16
    environment:
      POSTGRES_DB: opportunity_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5435:5432"

  analytics-db:
    image: postgres:16
    environment:
      POSTGRES_DB: analytics_db
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5436:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Microservices
  auth-service:
    build: ./services/auth-service
    ports:
      - "3100:3100"
    environment:
      DATABASE_URL: postgresql://postgres:password@auth-db:5432/auth_db
      JWT_SECRET: super-secret-jwt-key
      KAFKA_BROKERS: kafka:9092
    depends_on:
      - auth-db
      - kafka

  customer-service:
    build: ./services/customer-service
    ports:
      - "3101:3101"
    environment:
      DATABASE_URL: postgresql://postgres:password@customer-db:5432/customer_db
      KAFKA_BROKERS: kafka:9092
      AUTH_SERVICE_URL: http://auth-service:3100
    depends_on:
      - customer-db
      - kafka

  sales-activity-service:
    build: ./services/sales-activity-service
    ports:
      - "3102:3102"
    environment:
      DATABASE_URL: postgresql://postgres:password@sales-activity-db:5432/sales_activity_db
      KAFKA_BROKERS: kafka:9092
    depends_on:
      - sales-activity-db
      - kafka

  opportunity-service:
    build: ./services/opportunity-service
    ports:
      - "3103:3103"
    environment:
      DATABASE_URL: postgresql://postgres:password@opportunity-db:5432/opportunity_db
      KAFKA_BROKERS: kafka:9092
    depends_on:
      - opportunity-db
      - kafka

  analytics-service:
    build: ./services/analytics-service
    ports:
      - "3104:3104"
    environment:
      DATABASE_URL: postgresql://postgres:password@analytics-db:5432/analytics_db
      REDIS_URL: redis://redis:6379
      KAFKA_BROKERS: kafka:9092
    depends_on:
      - analytics-db
      - redis
      - kafka

  api-gateway:
    build: ./services/api-gateway
    ports:
      - "3000:3000"
    environment:
      AUTH_SERVICE_URL: http://auth-service:3100
      CUSTOMER_SERVICE_URL: http://customer-service:3101
      SALES_ACTIVITY_SERVICE_URL: http://sales-activity-service:3102
      OPPORTUNITY_SERVICE_URL: http://opportunity-service:3103
      ANALYTICS_SERVICE_URL: http://analytics-service:3104
    depends_on:
      - auth-service
      - customer-service
      - sales-activity-service
      - opportunity-service
      - analytics-service
```

---

## ☸️ Kubernetes デプロイ

### Namespace

```yaml
# k8s/base/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: crm-system
```

### Auth Service Deployment

```yaml
# k8s/base/auth-service/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: auth-service
  namespace: crm-system
  labels:
    app: auth-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: auth-service
  template:
    metadata:
      labels:
        app: auth-service
    spec:
      containers:
      - name: auth-service
        image: crm-auth-service:latest
        ports:
        - containerPort: 3100
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: auth-db-secret
              key: url
        - name: JWT_SECRET
          valueFrom:
            secretKeyRef:
              name: jwt-secret
              key: secret
        - name: KAFKA_BROKERS
          valueFrom:
            configMapKeyRef:
              name: kafka-config
              key: brokers
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3100
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3100
          initialDelaySeconds: 10
          periodSeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: auth-service
  namespace: crm-system
spec:
  selector:
    app: auth-service
  ports:
  - protocol: TCP
    port: 3100
    targetPort: 3100
  type: ClusterIP
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: crm-system
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

### ConfigMap & Secrets

```yaml
# k8s/base/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: kafka-config
  namespace: crm-system
data:
  brokers: "kafka-0.kafka-headless.crm-system.svc.cluster.local:9092"
---
apiVersion: v1
kind: Secret
metadata:
  name: jwt-secret
  namespace: crm-system
type: Opaque
stringData:
  secret: "your-production-jwt-secret-here"
---
apiVersion: v1
kind: Secret
metadata:
  name: auth-db-secret
  namespace: crm-system
type: Opaque
stringData:
  url: "postgresql://user:password@auth-db:5432/auth_db"
```

### Ingress

```yaml
# k8s/base/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: crm-ingress
  namespace: crm-system
  annotations:
    nginx.ingress.kubernetes.io/rewrite-target: /
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - crm.example.com
    secretName: crm-tls
  rules:
  - host: crm.example.com
    http:
      paths:
      - path: /api/auth
        pathType: Prefix
        backend:
          service:
            name: auth-service
            port:
              number: 3100
      - path: /api/customers
        pathType: Prefix
        backend:
          service:
            name: customer-service
            port:
              number: 3101
      - path: /api/meetings
        pathType: Prefix
        backend:
          service:
            name: sales-activity-service
            port:
              number: 3102
      - path: /api/tasks
        pathType: Prefix
        backend:
          service:
            name: sales-activity-service
            port:
              number: 3102
      - path: /api/approvals
        pathType: Prefix
        backend:
          service:
            name: opportunity-service
            port:
              number: 3103
      - path: /api/reports
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 3104
      - path: /api/notifications
        pathType: Prefix
        backend:
          service:
            name: analytics-service
            port:
              number: 3104
      - path: /
        pathType: Prefix
        backend:
          service:
            name: frontend-shell
            port:
              number: 3000
```

---

## 🚀 デプロイコマンド

### ローカル開発 (Docker Compose)

```bash
# すべてのサービスをビルド・起動
docker-compose -f docker-compose.microservices.yml up --build

# マイグレーション実行
docker-compose exec auth-service npx prisma migrate deploy
docker-compose exec customer-service npx prisma migrate deploy
docker-compose exec sales-activity-service npx prisma migrate deploy
docker-compose exec opportunity-service npx prisma migrate deploy
docker-compose exec analytics-service npx prisma migrate deploy

# ログ確認
docker-compose logs -f auth-service
```

### Kubernetes デプロイ

```bash
# Namespaceの作成
kubectl apply -f k8s/base/namespace.yaml

# ConfigMap & Secrets
kubectl apply -f k8s/base/configmap.yaml

# データベース (Helmを使用推奨)
helm install postgresql bitnami/postgresql -n crm-system

# Kafka (Helmを使用推奨)
helm install kafka bitnami/kafka -n crm-system

# マイクロサービス
kubectl apply -f k8s/base/auth-service/
kubectl apply -f k8s/base/customer-service/
kubectl apply -f k8s/base/sales-activity-service/
kubectl apply -f k8s/base/opportunity-service/
kubectl apply -f k8s/base/analytics-service/
kubectl apply -f k8s/base/api-gateway/

# Ingress
kubectl apply -f k8s/base/ingress.yaml

# ステータス確認
kubectl get pods -n crm-system
kubectl get svc -n crm-system
kubectl get hpa -n crm-system

# ログ確認
kubectl logs -f deployment/auth-service -n crm-system
```

---

## 📊 監視・ログ

### Prometheus + Grafana

```bash
# Prometheus Operatorのインストール
helm install prometheus prometheus-community/kube-prometheus-stack -n monitoring --create-namespace

# Grafanaダッシュボードにアクセス
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

### ELK Stack

```bash
# Elasticsearchのインストール
helm install elasticsearch elastic/elasticsearch -n logging --create-namespace

# Kibanaのインストール
helm install kibana elastic/kibana -n logging

# Fluentdでログ収集
kubectl apply -f k8s/logging/fluentd-daemonset.yaml
```

### Jaeger (分散トレーシング)

```bash
# Jaegerのインストール
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/crds/jaegertracing.io_jaegers_crd.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/service_account.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/role_binding.yaml
kubectl apply -f https://raw.githubusercontent.com/jaegertracing/jaeger-operator/main/deploy/operator.yaml
```

---

## 🔐 セキュリティ

### Service Mesh (Istio)

```bash
# Istioのインストール
istioctl install --set profile=default -y

# Namespaceにラベル付け (自動サイドカーインジェクション)
kubectl label namespace crm-system istio-injection=enabled

# mTLS有効化
kubectl apply -f - <<EOF
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: crm-system
spec:
  mtls:
    mode: STRICT
EOF
```

### Network Policies

```yaml
# k8s/base/network-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: auth-service-policy
  namespace: crm-system
spec:
  podSelector:
    matchLabels:
      app: auth-service
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: api-gateway
    ports:
    - protocol: TCP
      port: 3100
```

---

## 🧪 テスト

### E2Eテスト

```bash
# Postman Collectionを使用
newman run tests/e2e/crm-microservices.postman_collection.json -e tests/e2e/env.json

# または k6でロードテスト
k6 run tests/load/scenario.js
```

---

## 📚 次のステップ

1. ✅ アーキテクチャ設計完了
2. ✅ Auth Service完全実装
3. ✅ Customer Serviceテンプレート作成
4. 🔄 残りのサービス実装 (同じパターンで実装)
5. 🔄 API Gateway実装
6. 🔄 マイクロフロントエンド統合
7. 🔄 CI/CDパイプライン構築 (GitHub Actions / ArgoCD)
8. 🔄 監視・ログ・トレーシング統合
9. 🔄 パフォーマンステスト
10. 🔄 本番デプロイ

