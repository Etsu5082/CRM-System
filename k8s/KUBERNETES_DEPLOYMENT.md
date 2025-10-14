# Kubernetes デプロイメントガイド

## 📋 前提条件

### 必須環境
- Kubernetes クラスター（v1.24以上）
- kubectl コマンドインストール済み
- Docker（イメージビルド用）

### Kubernetes環境の選択肢

#### Option A: ローカル開発環境
```bash
# Minikube
brew install minikube
minikube start --cpus=4 --memory=8192

# または Docker Desktop Kubernetes
# Docker Desktop > Preferences > Kubernetes > Enable Kubernetes
```

#### Option B: クラウド環境
```bash
# AWS EKS
eksctl create cluster --name crm-cluster --region us-east-1 --nodegroup-name standard-workers --node-type t3.medium --nodes 3

# GCP GKE
gcloud container clusters create crm-cluster --num-nodes=3 --machine-type=n1-standard-2 --zone=us-central1-a

# Azure AKS
az aks create --resource-group myResourceGroup --name crm-cluster --node-count 3 --node-vm-size Standard_B2s
```

## 🚀 デプロイ手順

### Step 1: リポジトリクローンとディレクトリ移動
```bash
cd k8s/
```

### Step 2: Secretsファイル作成
```bash
# secrets.example.yamlをコピー
cp secrets.example.yaml secrets.yaml

# エディタで開いて実際の値を設定
vim secrets.yaml
```

**設定が必要な項目:**
- `JWT_SECRET`: ランダムな文字列（32文字以上推奨）
- `POSTGRES_USER`: PostgreSQLユーザー名
- `POSTGRES_PASSWORD`: PostgreSQL強力なパスワード
- 各データベースURL

### Step 3: Dockerイメージビルド&プッシュ

```bash
# Docker Hubにログイン
docker login

# 各サービスのイメージをビルド&プッシュ
docker build -t your-registry.io/crm/auth-service:latest ../services/auth-service
docker push your-registry.io/crm/auth-service:latest

docker build -t your-registry.io/crm/customer-service:latest ../services/customer-service
docker push your-registry.io/crm/customer-service:latest

docker build -t your-registry.io/crm/sales-activity-service:latest ../services/sales-activity-service
docker push your-registry.io/crm/sales-activity-service:latest

docker build -t your-registry.io/crm/opportunity-service:latest ../services/opportunity-service
docker push your-registry.io/crm/opportunity-service:latest

docker build -t your-registry.io/crm/analytics-service:latest ../services/analytics-service
docker push your-registry.io/crm/analytics-service:latest

docker build -t your-registry.io/crm/api-gateway:latest ../services/api-gateway
docker push your-registry.io/crm/api-gateway:latest
```

**注意**: 各deploymentファイルの`image:`を自分のレジストリに変更してください。

### Step 4: 全リソースをデプロイ

```bash
# 実行権限付与
chmod +x deploy-all.sh

# デプロイ実行
./deploy-all.sh
```

デプロイスクリプトは以下を実行します:
1. Namespace作成
2. ConfigMap作成
3. Secrets作成
4. PostgreSQL StatefulSetデプロイ
5. Kafka + Zookeeper StatefulSetデプロイ
6. 全マイクロサービスデプロイ
7. Ingressデプロイ
8. 状態確認

## ✅ デプロイ確認

### Pod状態確認
```bash
kubectl get pods -n crm-system
```

期待される出力:
```
NAME                                    READY   STATUS    RESTARTS   AGE
api-gateway-xxx                         1/1     Running   0          2m
analytics-service-xxx                   1/1     Running   0          2m
auth-service-xxx                        1/1     Running   0          2m
customer-service-xxx                    1/1     Running   0          2m
kafka-0                                 1/1     Running   0          5m
kafka-1                                 1/1     Running   0          5m
kafka-2                                 1/1     Running   0          5m
opportunity-service-xxx                 1/1     Running   0          2m
postgres-0                              1/1     Running   0          6m
sales-activity-service-xxx              1/1     Running   0          2m
zookeeper-0                             1/1     Running   0          6m
```

### Service確認
```bash
kubectl get svc -n crm-system
```

### HPA確認
```bash
kubectl get hpa -n crm-system
```

### ログ確認
```bash
# API Gatewayログ
kubectl logs -f deployment/api-gateway -n crm-system

# 特定サービスのログ
kubectl logs -f deployment/customer-service -n crm-system
```

## 🌐 アクセス方法

### LoadBalancer（クラウド環境）
```bash
# External IPを確認
kubectl get svc api-gateway -n crm-system

# 出力例:
# NAME          TYPE           EXTERNAL-IP      PORT(S)        AGE
# api-gateway   LoadBalancer   34.123.45.67     3000:30123/TCP 5m
```

ブラウザで `http://34.123.45.67:3000` にアクセス

### Port Forward（ローカル環境）
```bash
kubectl port-forward svc/api-gateway -n crm-system 3000:3000
```

ブラウザで `http://localhost:3000` にアクセス

## 📊 モニタリング

### リソース使用状況
```bash
# Pod単位のリソース使用量
kubectl top pods -n crm-system

# Node単位のリソース使用量
kubectl top nodes
```

### HPA動作確認
```bash
# HPA状態をリアルタイム監視
watch kubectl get hpa -n crm-system
```

## 🔧 トラブルシューティング

### Podが起動しない場合
```bash
# Pod詳細確認
kubectl describe pod <pod-name> -n crm-system

# イベント確認
kubectl get events -n crm-system --sort-by='.lastTimestamp'
```

### データベース接続エラー
```bash
# PostgreSQL Pod内に入る
kubectl exec -it postgres-0 -n crm-system -- psql -U crmuser -d auth_db

# データベース一覧確認
\l

# 各データベースが作成されているか確認
```

### Kafka接続エラー
```bash
# Kafka Pod内に入る
kubectl exec -it kafka-0 -n crm-system -- bash

# トピック一覧確認
kafka-topics --list --bootstrap-server localhost:9092
```

## 🧹 クリーンアップ

### 全リソース削除
```bash
chmod +x cleanup.sh
./cleanup.sh
```

### 個別削除
```bash
# 特定のサービスのみ削除
kubectl delete -f auth-service-deployment.yaml

# Namespace全体削除
kubectl delete namespace crm-system
```

## 🔄 更新・再デプロイ

### イメージ更新
```bash
# 新しいイメージをビルド&プッシュ
docker build -t your-registry.io/crm/auth-service:v2 ../services/auth-service
docker push your-registry.io/crm/auth-service:v2

# Deploymentのイメージを更新
kubectl set image deployment/auth-service auth-service=your-registry.io/crm/auth-service:v2 -n crm-system

# ローリングアップデート状況確認
kubectl rollout status deployment/auth-service -n crm-system
```

### ロールバック
```bash
# 直前のバージョンにロールバック
kubectl rollout undo deployment/auth-service -n crm-system

# 特定のリビジョンにロールバック
kubectl rollout undo deployment/auth-service --to-revision=2 -n crm-system
```

## 📈 スケーリング

### 手動スケーリング
```bash
# レプリカ数を変更
kubectl scale deployment auth-service --replicas=5 -n crm-system
```

### HPA動作確認
```bash
# 負荷テスト実行
kubectl run -it --rm load-generator --image=busybox /bin/sh
# Podコンテナ内で
while true; do wget -q -O- http://api-gateway:3000/health; done

# 別ターミナルでHPA監視
watch kubectl get hpa -n crm-system
```

## 🔐 セキュリティベストプラクティス

1. **Secrets管理**
   - secrets.yamlは`.gitignore`に追加
   - 本番環境では外部Secret管理ツール使用（AWS Secrets Manager、Vault等）

2. **RBAC設定**
   - 最小権限の原則でServiceAccount作成
   - Namespace単位でアクセス制御

3. **NetworkPolicy**
   - Pod間通信を制限
   - 必要な通信のみ許可

4. **イメージセキュリティ**
   - 脆弱性スキャン実施（Trivy、Snyk等）
   - 非rootユーザーで実行

## 📚 次のステップ

- [ ] Prometheus + Grafana監視導入
- [ ] ELK/Lokiログ集約導入
- [ ] Jaeger分散トレーシング導入
- [ ] ArgoCD GitOps導入
- [ ] Istio Service Mesh導入
