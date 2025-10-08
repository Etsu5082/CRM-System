#!/bin/bash

echo "=== サービス間認証テスト ==="
echo ""

# Login
TOKEN=$(curl -s -X POST "http://localhost:3100/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' | \
  grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi

echo "✅ ログイン成功"
echo "Token: ${TOKEN:0:50}..."
echo ""

# Test Customer Service
echo "=== Customer Service テスト ==="
CUSTOMER_RESPONSE=$(curl -s -X GET "http://localhost:3101/customers" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMER_RESPONSE" | grep -q '\['; then
  echo "✅ Customer Service: 認証成功"
  echo "Response: $CUSTOMER_RESPONSE"
else
  echo "❌ Customer Service: 認証失敗"
  echo "Response: $CUSTOMER_RESPONSE"
fi
echo ""

# Test Analytics Service
echo "=== Analytics Service テスト ==="
ANALYTICS_RESPONSE=$(curl -s -X GET "http://localhost:3104/analytics/reports/sales-summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ANALYTICS_RESPONSE" | grep -q 'totalCustomers'; then
  echo "✅ Analytics Service: 認証成功"
  echo "Response: $ANALYTICS_RESPONSE"
else
  echo "❌ Analytics Service: 認証失敗"
  echo "Response: $ANALYTICS_RESPONSE"
fi
echo ""

echo "=== テスト完了 ==="
