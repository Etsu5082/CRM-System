#!/bin/bash

set -e

echo "=========================================="
echo "CRMシステム Kubernetes クリーンアップ"
echo "=========================================="
echo ""

RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}警告: crm-system namespace内の全リソースを削除します${NC}"
read -p "続行しますか? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "キャンセルしました"
  exit 0
fi

echo ""
echo "リソース削除中..."

# Ingress削除
kubectl delete -f ingress.yaml --ignore-not-found=true

# マイクロサービス削除
kubectl delete -f api-gateway-deployment.yaml --ignore-not-found=true
kubectl delete -f analytics-service-deployment.yaml --ignore-not-found=true
kubectl delete -f opportunity-service-deployment.yaml --ignore-not-found=true
kubectl delete -f sales-activity-service-deployment.yaml --ignore-not-found=true
kubectl delete -f customer-service-deployment.yaml --ignore-not-found=true
kubectl delete -f auth-service-deployment.yaml --ignore-not-found=true

# Kafka削除
kubectl delete -f kafka-statefulset.yaml --ignore-not-found=true

# PostgreSQL削除
kubectl delete -f postgresql-statefulset.yaml --ignore-not-found=true

# ConfigMap/Secrets削除
kubectl delete -f configmap.yaml --ignore-not-found=true
if [ -f secrets.yaml ]; then
  kubectl delete -f secrets.yaml --ignore-not-found=true
fi

# PVC削除
echo "PVC削除中..."
kubectl delete pvc --all -n crm-system

# Namespace削除
kubectl delete -f namespace.yaml --ignore-not-found=true

echo ""
echo -e "${RED}クリーンアップ完了${NC}"
