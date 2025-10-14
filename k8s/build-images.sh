#!/bin/bash

set -e

echo "=========================================="
echo "Dockerイメージビルド（Minikube環境）"
echo "=========================================="
echo ""

# Minikubeのdocker環境を使用
eval $(minikube docker-env)

# イメージタグ
TAG="latest"
REGISTRY="localhost:5000"

cd ..

echo "[1/6] auth-service イメージビルド..."
docker build -t crm/auth-service:$TAG -f services/auth-service/Dockerfile services/auth-service
echo "✓ auth-service ビルド完了"
echo ""

echo "[2/6] customer-service イメージビルド..."
docker build -t crm/customer-service:$TAG -f services/customer-service/Dockerfile services/customer-service
echo "✓ customer-service ビルド完了"
echo ""

echo "[3/6] sales-activity-service イメージビルド..."
docker build -t crm/sales-activity-service:$TAG -f services/sales-activity-service/Dockerfile services/sales-activity-service
echo "✓ sales-activity-service ビルド完了"
echo ""

echo "[4/6] opportunity-service イメージビルド..."
docker build -t crm/opportunity-service:$TAG -f services/opportunity-service/Dockerfile services/opportunity-service
echo "✓ opportunity-service ビルド完了"
echo ""

echo "[5/6] analytics-service イメージビルド..."
docker build -t crm/analytics-service:$TAG -f services/analytics-service/Dockerfile services/analytics-service
echo "✓ analytics-service ビルド完了"
echo ""

echo "[6/6] api-gateway イメージビルド..."
docker build -t crm/api-gateway:$TAG -f services/api-gateway/Dockerfile services/api-gateway
echo "✓ api-gateway ビルド完了"
echo ""

echo "=========================================="
echo "全イメージビルド完了！"
echo "=========================================="
echo ""
echo "イメージ一覧:"
docker images | grep crm/
