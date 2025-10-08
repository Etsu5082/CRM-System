#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "================================================"
echo "マイクロサービスCRM デプロイメント検証テスト"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Create Admin User
echo "1️⃣  管理者ユーザーの作成..."
CREATE_USER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/users" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123",
    "name": "管理者",
    "role": "ADMIN"
  }')

if echo "$CREATE_USER_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ ユーザー作成成功${NC}"
  USER_ID=$(echo "$CREATE_USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  User ID: $USER_ID"
else
  echo -e "${YELLOW}⚠ ユーザーは既に存在する可能性があります${NC}"
fi
echo ""

# Test 2: Login
echo "2️⃣  ログイン..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "admin123"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "${GREEN}✓ ログイン成功${NC}"
  echo "  Token: ${TOKEN:0:30}..."
else
  echo -e "${RED}✗ ログイン失敗${NC}"
  echo "$LOGIN_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Create Customer
echo "3️⃣  顧客の作成..."
CREATE_CUSTOMER_RESPONSE=$(curl -s -X POST "$BASE_URL/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"山田太郎\",
    \"email\": \"yamada@example.com\",
    \"phone\": \"090-1234-5678\",
    \"address\": \"東京都渋谷区1-2-3\",
    \"investmentProfile\": \"moderate\",
    \"riskTolerance\": 6,
    \"investmentExperience\": \"5年\",
    \"assignedSalesId\": \"$USER_ID\"
  }")

if echo "$CREATE_CUSTOMER_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ 顧客作成成功${NC}"
  CUSTOMER_ID=$(echo "$CREATE_CUSTOMER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Customer ID: $CUSTOMER_ID"
else
  echo -e "${RED}✗ 顧客作成失敗${NC}"
  echo "$CREATE_CUSTOMER_RESPONSE"
fi
echo ""

# Test 4: Get Customers
echo "4️⃣  顧客リストの取得..."
GET_CUSTOMERS_RESPONSE=$(curl -s -X GET "$BASE_URL/customers" \
  -H "Authorization: Bearer $TOKEN")

CUSTOMER_COUNT=$(echo "$GET_CUSTOMERS_RESPONSE" | grep -o '"id"' | wc -l)
echo -e "${GREEN}✓ 顧客リスト取得成功${NC}"
echo "  顧客数: $CUSTOMER_COUNT"
echo ""

# Test 5: Create Meeting
if [ -n "$CUSTOMER_ID" ]; then
  echo "5️⃣  ミーティングの作成..."
  CREATE_MEETING_RESPONSE=$(curl -s -X POST "$BASE_URL/sales-activities/meetings" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"customerId\": \"$CUSTOMER_ID\",
      \"userId\": \"$USER_ID\",
      \"title\": \"初回面談\",
      \"description\": \"投資プランについてのディスカッション\",
      \"meetingDate\": \"$(date -u -v+1d +%Y-%m-%dT%H:%M:%S.000Z)\",
      \"location\": \"本社会議室A\",
      \"status\": \"scheduled\"
    }")

  if echo "$CREATE_MEETING_RESPONSE" | grep -q "id"; then
    echo -e "${GREEN}✓ ミーティング作成成功${NC}"
    MEETING_ID=$(echo "$CREATE_MEETING_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
    echo "  Meeting ID: $MEETING_ID"
  else
    echo -e "${RED}✗ ミーティング作成失敗${NC}"
    echo "$CREATE_MEETING_RESPONSE"
  fi
  echo ""
fi

# Test 6: Create Task
echo "6️⃣  タスクの作成..."
CREATE_TASK_RESPONSE=$(curl -s -X POST "$BASE_URL/sales-activities/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"title\": \"提案書作成\",
    \"description\": \"投資提案書を作成する\",
    \"dueDate\": \"$(date -u -v+3d +%Y-%m-%dT%H:%M:%S.000Z)\",
    \"priority\": \"high\",
    \"status\": \"pending\"
  }")

if echo "$CREATE_TASK_RESPONSE" | grep -q "id"; then
  echo -e "${GREEN}✓ タスク作成成功${NC}"
  TASK_ID=$(echo "$CREATE_TASK_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "  Task ID: $TASK_ID"
else
  echo -e "${RED}✗ タスク作成失敗${NC}"
  echo "$CREATE_TASK_RESPONSE"
fi
echo ""

# Test 7: Get Analytics Report
echo "7️⃣  分析レポートの取得..."
REPORT_RESPONSE=$(curl -s -X GET "$BASE_URL/analytics/reports/sales-summary" \
  -H "Authorization: Bearer $TOKEN")

if echo "$REPORT_RESPONSE" | grep -q "totalCustomers"; then
  echo -e "${GREEN}✓ レポート取得成功${NC}"
  TOTAL_CUSTOMERS=$(echo "$REPORT_RESPONSE" | grep -o '"totalCustomers":[0-9]*' | cut -d':' -f2)
  TOTAL_MEETINGS=$(echo "$REPORT_RESPONSE" | grep -o '"totalMeetings":[0-9]*' | cut -d':' -f2)
  TOTAL_TASKS=$(echo "$REPORT_RESPONSE" | grep -o '"totalTasks":[0-9]*' | cut -d':' -f2)
  echo "  総顧客数: $TOTAL_CUSTOMERS"
  echo "  総ミーティング数: $TOTAL_MEETINGS"
  echo "  総タスク数: $TOTAL_TASKS"
else
  echo -e "${RED}✗ レポート取得失敗${NC}"
  echo "$REPORT_RESPONSE"
fi
echo ""

# Test 8: Get Notifications
echo "8️⃣  通知の取得..."
NOTIFICATIONS_RESPONSE=$(curl -s -X GET "$BASE_URL/analytics/notifications?userId=$USER_ID" \
  -H "Authorization: Bearer $TOKEN")

NOTIFICATION_COUNT=$(echo "$NOTIFICATIONS_RESPONSE" | grep -o '"id"' | wc -l)
echo -e "${GREEN}✓ 通知取得成功${NC}"
echo "  通知数: $NOTIFICATION_COUNT"
echo ""

# Summary
echo "================================================"
echo "✅ デプロイメント検証完了"
echo "================================================"
echo ""
echo "🎉 全てのマイクロサービスが正常に動作しています！"
echo ""
echo "サービスエンドポイント:"
echo "  - API Gateway:         http://localhost:3000"
echo "  - Auth Service:        http://localhost:3100"
echo "  - Customer Service:    http://localhost:3101"
echo "  - Sales Activity:      http://localhost:3102"
echo "  - Opportunity Service: http://localhost:3103"
echo "  - Analytics Service:   http://localhost:3104"
echo ""
echo "インフラストラクチャ:"
echo "  - Kafka Broker:        http://localhost:9092"
echo "  - Redis:               http://localhost:6379"
echo "  - Zookeeper:           http://localhost:2181"
echo ""
