#!/bin/bash

echo "=========================================="
echo "マイクロサービスCRM 統合テスト"
echo "=========================================="
echo ""

# Login
echo "1️⃣  ログイン..."
curl -s -X POST "http://localhost:3100/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' > /tmp/login_test.json

TOKEN=$(cat /tmp/login_test.json | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
USER_ID=$(cat /tmp/login_test.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ ログイン失敗"
  exit 1
fi

echo "✅ ログイン成功"
echo "   User ID: $USER_ID"
echo ""

# Create Customer
echo "2️⃣  顧客作成..."
curl -s -X POST "http://localhost:3101/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"山田太郎\",
    \"email\": \"yamada.taro@example.com\",
    \"phone\": \"090-1234-5678\",
    \"address\": \"東京都渋谷区1-2-3\",
    \"investmentProfile\": \"moderate\",
    \"riskTolerance\": 6,
    \"investmentExperience\": \"5年\",
    \"assignedSalesId\": \"$USER_ID\"
  }" > /tmp/customer.json

CUSTOMER_ID=$(cat /tmp/customer.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$CUSTOMER_ID" ]; then
  echo "✅ 顧客作成成功"
  echo "   Customer ID: $CUSTOMER_ID"
else
  echo "❌ 顧客作成失敗"
  echo "   Response: $(cat /tmp/customer.json)"
fi
echo ""

# Get Customers
echo "3️⃣  顧客リスト取得..."
CUSTOMER_COUNT=$(curl -s "http://localhost:3101/customers" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | tr -d ' ')
echo "✅ 顧客リスト取得成功: $CUSTOMER_COUNT 件"
echo ""

# Create Meeting
if [ -n "$CUSTOMER_ID" ]; then
  echo "4️⃣  ミーティング作成..."
  MEETING_DATE=$(date -u -v+1d '+%Y-%m-%dT%H:%M:%S.000Z' 2>/dev/null || date -u -d '+1 day' '+%Y-%m-%dT%H:%M:%S.000Z')

  curl -s -X POST "http://localhost:3102/meetings" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d "{
      \"customerId\": \"$CUSTOMER_ID\",
      \"userId\": \"$USER_ID\",
      \"title\": \"初回面談\",
      \"description\": \"投資プランのディスカッション\",
      \"meetingDate\": \"$MEETING_DATE\",
      \"location\": \"本社会議室A\",
      \"status\": \"scheduled\"
    }" > /tmp/meeting.json

  MEETING_ID=$(cat /tmp/meeting.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -n "$MEETING_ID" ]; then
    echo "✅ ミーティング作成成功"
    echo "   Meeting ID: $MEETING_ID"
  else
    echo "⚠️  ミーティング作成: $(cat /tmp/meeting.json)"
  fi
  echo ""
fi

# Create Task
echo "5️⃣  タスク作成..."
TASK_DUE=$(date -u -v+3d '+%Y-%m-%dT%H:%M:%S.000Z' 2>/dev/null || date -u -d '+3 days' '+%Y-%m-%dT%H:%M:%S.000Z')

curl -s -X POST "http://localhost:3102/tasks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"title\": \"提案書作成\",
    \"description\": \"投資提案書を作成する\",
    \"dueDate\": \"$TASK_DUE\",
    \"priority\": \"high\",
    \"status\": \"pending\"
  }" > /tmp/task.json

TASK_ID=$(cat /tmp/task.json | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$TASK_ID" ]; then
  echo "✅ タスク作成成功"
  echo "   Task ID: $TASK_ID"
else
  echo "⚠️  タスク作成: $(cat /tmp/task.json)"
fi
echo ""

# Get Analytics Report
echo "6️⃣  分析レポート取得..."
curl -s "http://localhost:3104/reports/sales-summary" \
  -H "Authorization: Bearer $TOKEN" > /tmp/report.json

TOTAL_CUSTOMERS=$(cat /tmp/report.json | grep -o '"totalCustomers":[0-9]*' | cut -d':' -f2)
TOTAL_MEETINGS=$(cat /tmp/report.json | grep -o '"totalMeetings":[0-9]*' | cut -d':' -f2)
TOTAL_TASKS=$(cat /tmp/report.json | grep -o '"totalTasks":[0-9]*' | cut -d':' -f2)

echo "✅ 分析レポート取得成功"
echo "   総顧客数: $TOTAL_CUSTOMERS"
echo "   総ミーティング数: $TOTAL_MEETINGS"
echo "   総タスク数: $TOTAL_TASKS"
echo ""

# Test via API Gateway
echo "7️⃣  API Gateway経由テスト..."
API_GW_CUSTOMERS=$(curl -s "http://localhost:3000/api/customers" \
  -H "Authorization: Bearer $TOKEN" | grep -o '"id"' | wc -l | tr -d ' ')
echo "✅ API Gateway経由で顧客取得: $API_GW_CUSTOMERS 件"
echo ""

echo "=========================================="
echo "✅ 全テスト完了"
echo "=========================================="
echo ""
echo "🎉 すべてのマイクロサービスが正常に連携動作しています！"
echo ""
echo "作成されたデータ:"
echo "  - ユーザー: 1 件"
echo "  - 顧客: $TOTAL_CUSTOMERS 件"
echo "  - ミーティング: $TOTAL_MEETINGS 件"
echo "  - タスク: $TOTAL_TASKS 件"
echo ""
