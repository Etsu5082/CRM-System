#!/bin/bash

set -e

echo "=========================================="
echo "CRMシステム Kubernetes デプロイスクリプト"
echo "=========================================="
echo ""

# 色の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Namespace作成
echo -e "${YELLOW}[1/8] Namespace作成...${NC}"
kubectl apply -f namespace.yaml
echo -e "${GREEN}✓ Namespace作成完了${NC}"
echo ""

# ConfigMap作成
echo -e "${YELLOW}[2/8] ConfigMap作成...${NC}"
kubectl apply -f configmap.yaml
echo -e "${GREEN}✓ ConfigMap作成完了${NC}"
echo ""

# Secrets作成
echo -e "${YELLOW}[3/8] Secrets作成...${NC}"
if [ ! -f secrets.yaml ]; then
  echo -e "${RED}エラー: secrets.yamlが見つかりません${NC}"
  echo "secrets.example.yamlをコピーしてsecrets.yamlを作成し、実際の値を設定してください"
  exit 1
fi
kubectl apply -f secrets.yaml
echo -e "${GREEN}✓ Secrets作成完了${NC}"
echo ""

# PostgreSQLデプロイ
echo -e "${YELLOW}[4/8] PostgreSQL StatefulSetデプロイ...${NC}"
kubectl apply -f postgresql-statefulset.yaml
echo "PostgreSQLの起動を待機中..."
kubectl wait --for=condition=ready pod -l app=postgres -n crm-system --timeout=300s
echo -e "${GREEN}✓ PostgreSQL起動完了${NC}"
echo ""

# Kafkaデプロイ
echo -e "${YELLOW}[5/8] Kafka + Zookeeper StatefulSetデプロイ...${NC}"
kubectl apply -f kafka-statefulset.yaml
echo "Zookeeperの起動を待機中..."
kubectl wait --for=condition=ready pod -l app=zookeeper -n crm-system --timeout=300s
echo "Kafkaの起動を待機中..."
kubectl wait --for=condition=ready pod -l app=kafka -n crm-system --timeout=300s
echo -e "${GREEN}✓ Kafka起動完了${NC}"
echo ""

# マイクロサービスデプロイ
echo -e "${YELLOW}[6/8] マイクロサービスデプロイ...${NC}"
kubectl apply -f auth-service-deployment.yaml
kubectl apply -f customer-service-deployment.yaml
kubectl apply -f sales-activity-service-deployment.yaml
kubectl apply -f opportunity-service-deployment.yaml
kubectl apply -f analytics-service-deployment.yaml
kubectl apply -f api-gateway-deployment.yaml

echo "全サービスの起動を待機中..."
kubectl wait --for=condition=ready pod -l app=auth-service -n crm-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=customer-service -n crm-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=sales-activity-service -n crm-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=opportunity-service -n crm-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=analytics-service -n crm-system --timeout=300s
kubectl wait --for=condition=ready pod -l app=api-gateway -n crm-system --timeout=300s
echo -e "${GREEN}✓ 全マイクロサービス起動完了${NC}"
echo ""

# Ingressデプロイ
echo -e "${YELLOW}[7/8] Ingressデプロイ...${NC}"
kubectl apply -f ingress.yaml
echo -e "${GREEN}✓ Ingress設定完了${NC}"
echo ""

# 状態確認
echo -e "${YELLOW}[8/8] デプロイ状態確認...${NC}"
echo ""
echo "=== Pods ==="
kubectl get pods -n crm-system
echo ""
echo "=== Services ==="
kubectl get svc -n crm-system
echo ""
echo "=== HPA ==="
kubectl get hpa -n crm-system
echo ""
echo "=== Ingress ==="
kubectl get ingress -n crm-system
echo ""

echo -e "${GREEN}=========================================="
echo "デプロイ完了！"
echo "==========================================${NC}"
echo ""
echo "API Gatewayエンドポイント確認:"
echo "  kubectl get svc api-gateway -n crm-system"
echo ""
echo "ログ確認:"
echo "  kubectl logs -f deployment/api-gateway -n crm-system"
echo ""
echo "削除する場合:"
echo "  ./cleanup.sh"
