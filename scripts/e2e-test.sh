#!/bin/bash

# E2E テストスクリプト
# Render本番環境のAPI Gatewayをテスト

set -e

# カラー出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API Gateway URL
API_GATEWAY="https://crm-api-gateway.onrender.com"

# テスト結果
PASSED=0
FAILED=0
TOTAL=0

# テスト結果を記録
test_result() {
    local test_name="$1"
    local result="$2"
    local response="$3"

    TOTAL=$((TOTAL + 1))

    if [ "$result" -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        PASSED=$((PASSED + 1))
    else
        echo -e "${RED}✗${NC} $test_name"
        echo -e "${RED}  Response: $response${NC}"
        FAILED=$((FAILED + 1))
    fi
}

echo "========================================="
echo "E2E テスト開始"
echo "API Gateway: $API_GATEWAY"
echo "========================================="
echo ""

# 1. ヘルスチェック
echo -e "${BLUE}[1] ヘルスチェック${NC}"
response=$(curl -s -w "\n%{http_code}" "$API_GATEWAY/health" || echo "error")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    test_result "API Gateway ヘルスチェック" 0 "$body"
else
    test_result "API Gateway ヘルスチェック" 1 "HTTP $http_code"
fi
echo ""

# 2. ユーザー登録
echo -e "${BLUE}[2] ユーザー登録${NC}"
EMAIL="test-$(date +%s)@example.com"
PASSWORD="Password123!"
NAME="Test User $(date +%s)"

response=$(curl -s -w "\n%{http_code}" -X POST "$API_GATEWAY/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\",
    \"name\": \"$NAME\",
    \"role\": \"USER\"
  }" || echo "error")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "201" ]; then
    test_result "ユーザー登録" 0 "$body"
    USER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    echo -e "  ${GREEN}User ID: $USER_ID${NC}"
    echo -e "  ${GREEN}Token: ${TOKEN:0:20}...${NC}"
else
    test_result "ユーザー登録" 1 "HTTP $http_code: $body"
    echo -e "${RED}後続のテストをスキップします${NC}"
    exit 1
fi
echo ""

# 3. ログイン
echo -e "${BLUE}[3] ログイン${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }" || echo "error")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    test_result "ログイン" 0 "$body"
    TOKEN=$(echo "$body" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
else
    test_result "ログイン" 1 "HTTP $http_code: $body"
fi
echo ""

# 4. 自分の情報取得
echo -e "${BLUE}[4] 自分の情報取得${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_GATEWAY/api/auth/me" \
  -H "Authorization: Bearer $TOKEN" || echo "error")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    test_result "自分の情報取得" 0 "$body"
else
    test_result "自分の情報取得" 1 "HTTP $http_code: $body"
fi
echo ""

# 5. 顧客作成
echo -e "${BLUE}[5] 顧客作成${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_GATEWAY/api/customers" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Test Company $(date +%s)\",
    \"industry\": \"Technology\",
    \"size\": \"MEDIUM\",
    \"email\": \"contact-$(date +%s)@testcompany.com\",
    \"phone\": \"+81-3-1234-5678\",
    \"address\": \"東京都渋谷区\"
  }" || echo "error")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "201" ]; then
    test_result "顧客作成" 0 "$body"
    CUSTOMER_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo -e "  ${GREEN}Customer ID: $CUSTOMER_ID${NC}"
else
    test_result "顧客作成" 1 "HTTP $http_code: $body"
fi
echo ""

# 6. 顧客一覧取得
echo -e "${BLUE}[6] 顧客一覧取得${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_GATEWAY/api/customers?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN" || echo "error")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    test_result "顧客一覧取得" 0 "$body"
else
    test_result "顧客一覧取得" 1 "HTTP $http_code: $body"
fi
echo ""

# 7. 顧客詳細取得
if [ -n "$CUSTOMER_ID" ]; then
    echo -e "${BLUE}[7] 顧客詳細取得${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_GATEWAY/api/customers/$CUSTOMER_ID" \
      -H "Authorization: Bearer $TOKEN" || echo "error")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "200" ]; then
        test_result "顧客詳細取得" 0 "$body"
    else
        test_result "顧客詳細取得" 1 "HTTP $http_code: $body"
    fi
    echo ""
fi

# 8. タスク作成
if [ -n "$CUSTOMER_ID" ]; then
    echo -e "${BLUE}[8] タスク作成${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_GATEWAY/api/tasks" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"customerId\": \"$CUSTOMER_ID\",
        \"title\": \"初回コンタクト\",
        \"description\": \"新規顧客への初回コンタクトを実施\",
        \"dueDate\": \"2025-10-20T10:00:00.000Z\",
        \"priority\": \"HIGH\"
      }" || echo "error")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "201" ]; then
        test_result "タスク作成" 0 "$body"
        TASK_ID=$(echo "$body" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
        echo -e "  ${GREEN}Task ID: $TASK_ID${NC}"
    else
        test_result "タスク作成" 1 "HTTP $http_code: $body"
    fi
    echo ""
fi

# 9. タスク一覧取得
echo -e "${BLUE}[9] タスク一覧取得${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_GATEWAY/api/tasks" \
  -H "Authorization: Bearer $TOKEN" || echo "error")

http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | head -n-1)

if [ "$http_code" = "200" ]; then
    test_result "タスク一覧取得" 0 "$body"
else
    test_result "タスク一覧取得" 1 "HTTP $http_code: $body"
fi
echo ""

# 10. 会議作成
if [ -n "$CUSTOMER_ID" ]; then
    echo -e "${BLUE}[10] 会議作成${NC}"
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_GATEWAY/api/meetings" \
      -H "Authorization: Bearer $TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"customerId\": \"$CUSTOMER_ID\",
        \"title\": \"要件ヒアリング\",
        \"description\": \"新規案件の要件をヒアリング\",
        \"scheduledAt\": \"2025-10-25T14:00:00.000Z\",
        \"location\": \"オンライン (Zoom)\"
      }" || echo "error")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)

    if [ "$http_code" = "201" ]; then
        test_result "会議作成" 0 "$body"
    else
        test_result "会議作成" 1 "HTTP $http_code: $body"
    fi
    echo ""
fi

# テスト結果サマリー
echo ""
echo "========================================="
echo "E2E テスト結果"
echo "========================================="
echo -e "Total:  ${BLUE}$TOTAL${NC}"
echo -e "Passed: ${GREEN}$PASSED${NC}"
echo -e "Failed: ${RED}$FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ すべてのテストが成功しました！${NC}"
    exit 0
else
    echo -e "\n${RED}✗ $FAILED 個のテストが失敗しました${NC}"
    exit 1
fi
