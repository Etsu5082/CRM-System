#!/bin/bash

# シンプルE2Eテスト

API_GATEWAY="https://crm-api-gateway.onrender.com"

echo "========================================="
echo "E2E テスト開始"
echo "API Gateway: $API_GATEWAY"
echo "========================================="
echo ""

# テスト結果
PASSED=0
FAILED=0

# 1. ヘルスチェック
echo "[1] ヘルスチェック..."
if curl -sf "$API_GATEWAY/health" > /dev/null; then
    echo "✓ API Gateway ヘルスチェック"
    PASSED=$((PASSED + 1))
else
    echo "✗ API Gateway ヘルスチェック"
    FAILED=$((FAILED + 1))
fi
echo ""

# 2. ユーザー登録
echo "[2] ユーザー登録..."
EMAIL="test-$(date +%s)@example.com"
PASSWORD="Password123!"
NAME="Test User"

REGISTER_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"$NAME\",\"role\":\"USER\"}")

if echo "$REGISTER_RESPONSE" | grep -q "token"; then
    echo "✓ ユーザー登録成功"
    TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  User ID: $USER_ID"
    echo "  Token: ${TOKEN:0:30}..."
    PASSED=$((PASSED + 1))
else
    echo "✗ ユーザー登録失敗"
    echo "  Response: $REGISTER_RESPONSE"
    FAILED=$((FAILED + 1))
    echo ""
    echo "========================================="
    echo "結果: $PASSED passed, $FAILED failed"
    echo "========================================="
    exit 1
fi
echo ""

# 3. ログイン
echo "[3] ログイン..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✓ ログイン成功"
    TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    PASSED=$((PASSED + 1))
else
    echo "✗ ログイン失敗"
    FAILED=$((FAILED + 1))
fi
echo ""

# 4. 自分の情報取得
echo "[4] 自分の情報取得..."
ME_RESPONSE=$(curl -s -X GET "$API_GATEWAY/api/auth/me" \
  -H "Authorization: Bearer $TOKEN")

if echo "$ME_RESPONSE" | grep -q "email"; then
    echo "✓ 自分の情報取得成功"
    PASSED=$((PASSED + 1))
else
    echo "✗ 自分の情報取得失敗"
    FAILED=$((FAILED + 1))
fi
echo ""

# 5. 顧客作成
echo "[5] 顧客作成..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Company\",\"industry\":\"Technology\",\"size\":\"MEDIUM\",\"email\":\"contact@test.com\"}")

if echo "$CUSTOMER_RESPONSE" | grep -q "id"; then
    echo "✓ 顧客作成成功"
    CUSTOMER_ID=$(echo "$CUSTOMER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Customer ID: $CUSTOMER_ID"
    PASSED=$((PASSED + 1))
else
    echo "✗ 顧客作成失敗"
    echo "  Response: $CUSTOMER_RESPONSE"
    FAILED=$((FAILED + 1))
fi
echo ""

# 6. 顧客一覧取得
echo "[6] 顧客一覧取得..."
CUSTOMERS_RESPONSE=$(curl -s -X GET "$API_GATEWAY/api/customers" \
  -H "Authorization: Bearer $TOKEN")

if echo "$CUSTOMERS_RESPONSE" | grep -q "customers"; then
    echo "✓ 顧客一覧取得成功"
    PASSED=$((PASSED + 1))
else
    echo "✗ 顧客一覧取得失敗"
    FAILED=$((FAILED + 1))
fi
echo ""

# 7. タスク作成
if [ -n "$CUSTOMER_ID" ]; then
    echo "[7] タスク作成..."
    TASK_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/tasks" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"customerId\":\"$CUSTOMER_ID\",\"title\":\"初回コンタクト\",\"description\":\"テスト\",\"dueDate\":\"2025-10-20T10:00:00.000Z\",\"priority\":\"HIGH\"}")

    if echo "$TASK_RESPONSE" | grep -q "id"; then
        echo "✓ タスク作成成功"
        PASSED=$((PASSED + 1))
    else
        echo "✗ タスク作成失敗"
        FAILED=$((FAILED + 1))
    fi
    echo ""
fi

# 8. タスク一覧取得
echo "[8] タスク一覧取得..."
TASKS_RESPONSE=$(curl -s -X GET "$API_GATEWAY/api/tasks" \
  -H "Authorization: Bearer $TOKEN")

if echo "$TASKS_RESPONSE" | grep -q "tasks"; then
    echo "✓ タスク一覧取得成功"
    PASSED=$((PASSED + 1))
else
    echo "✗ タスク一覧取得失敗"
    FAILED=$((FAILED + 1))
fi
echo ""

# 結果サマリー
echo "========================================="
echo "E2E テスト結果"
echo "========================================="
echo "Total:  $((PASSED + FAILED))"
echo "Passed: $PASSED"
echo "Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "✓ すべてのテストが成功しました！"
    exit 0
else
    echo ""
    echo "✗ $FAILED 個のテストが失敗しました"
    exit 1
fi
