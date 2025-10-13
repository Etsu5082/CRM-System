#!/bin/bash

API_GATEWAY="https://crm-api-gateway-bjnb.onrender.com"

echo "========================================="
echo "E2E テスト開始（本番環境）"
echo "API Gateway: $API_GATEWAY"
echo "========================================="
echo ""

PASSED=0
FAILED=0

# [1] ヘルスチェック
echo "[1] ヘルスチェック..."
HEALTH=$(curl -s "$API_GATEWAY/health")
if echo "$HEALTH" | grep -q "ok"; then
  echo "✓ API Gateway ヘルスチェック"
  ((PASSED++))
else
  echo "✗ API Gateway ヘルスチェック"
  ((FAILED++))
fi
echo ""

# [2] ユーザー登録
echo "[2] ユーザー登録..."
EMAIL="test-$(date +%s)@example.com"
REGISTER_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234\",\"name\":\"Test User\"}")

if echo "$REGISTER_RESPONSE" | grep -q "id"; then
  echo "✓ ユーザー登録成功"
  USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Email: $EMAIL"
  echo "  User ID: $USER_ID"
  ((PASSED++))
else
  echo "✗ ユーザー登録失敗"
  echo "  Response: $REGISTER_RESPONSE"
  ((FAILED++))
fi
echo ""

# [3] ログイン
echo "[3] ログイン..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
  echo "✓ ログイン成功"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  ((PASSED++))
else
  echo "✗ ログイン失敗"
  echo "  Response: $LOGIN_RESPONSE"
  ((FAILED++))
  exit 1
fi
echo ""

# [4] 顧客作成
echo "[4] 顧客作成..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"name\":\"山田太郎\",\"email\":\"yamada@example.com\",\"phone\":\"090-1234-5678\",\"investmentProfile\":\"moderate\",\"riskTolerance\":5}")

if echo "$CUSTOMER_RESPONSE" | grep -q "id"; then
  echo "✓ 顧客作成成功"
  CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Customer ID: $CUSTOMER_ID"
  ((PASSED++))
else
  echo "✗ 顧客作成失敗"
  echo "  Response: $CUSTOMER_RESPONSE"
  ((FAILED++))
fi
echo ""

# [5] タスク作成
echo "[5] タスク作成..."
TASK_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"title\":\"顧客フォローアップ\",\"description\":\"山田太郎様への定期連絡\",\"dueDate\":\"2025-10-20T10:00:00Z\",\"priority\":\"MEDIUM\",\"customerId\":\"$CUSTOMER_ID\"}")

if echo "$TASK_RESPONSE" | grep -q "id"; then
  echo "✓ タスク作成成功"
  TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Task ID: $TASK_ID"
  ((PASSED++))
else
  echo "✗ タスク作成失敗"
  echo "  Response: $TASK_RESPONSE"
  ((FAILED++))
fi
echo ""

# [6] 会議作成
echo "[6] 会議作成..."
MEETING_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/meetings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"title\":\"資産運用相談\",\"description\":\"年間運用計画の説明\",\"startTime\":\"2025-10-25T14:00:00Z\",\"endTime\":\"2025-10-25T15:00:00Z\",\"location\":\"本社会議室A\",\"customerId\":\"$CUSTOMER_ID\"}")

if echo "$MEETING_RESPONSE" | grep -q "id"; then
  echo "✓ 会議作成成功"
  MEETING_ID=$(echo "$MEETING_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Meeting ID: $MEETING_ID"
  ((PASSED++))
else
  echo "✗ 会議作成失敗"
  echo "  Response: $MEETING_RESPONSE"
  ((FAILED++))
fi
echo ""

# [7] 承認申請作成
echo "[7] 承認申請作成..."
APPROVAL_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/approvals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{\"title\":\"大口取引承認\",\"description\":\"1000万円の投資商品提案\",\"type\":\"DISCOUNT\",\"amount\":10000000}")

if echo "$APPROVAL_RESPONSE" | grep -q "id"; then
  echo "✓ 承認申請作成成功"
  APPROVAL_ID=$(echo "$APPROVAL_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
  echo "  Approval ID: $APPROVAL_ID"
  ((PASSED++))
else
  echo "✗ 承認申請作成失敗"
  echo "  Response: $APPROVAL_RESPONSE"
  ((FAILED++))
fi
echo ""

# [8] レポート取得
echo "[8] レポート取得..."
REPORT_RESPONSE=$(curl -s -X GET "$API_GATEWAY/api/reports/sales-summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$REPORT_RESPONSE" | grep -q "totalCustomers"; then
  echo "✓ レポート取得成功"
  TOTAL=$(echo "$REPORT_RESPONSE" | grep -o '"totalCustomers":[0-9]*' | cut -d':' -f2)
  echo "  総顧客数: $TOTAL"
  ((PASSED++))
else
  echo "✗ レポート取得失敗"
  echo "  Response: $REPORT_RESPONSE"
  ((FAILED++))
fi
echo ""

echo "========================================="
echo "結果: $PASSED passed, $FAILED failed"
echo "========================================="

if [ $FAILED -eq 0 ]; then
  exit 0
else
  exit 1
fi
