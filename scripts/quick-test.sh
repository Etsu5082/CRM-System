#!/bin/bash

API_GATEWAY="https://crm-api-gateway-bjnb.onrender.com"

echo "=== Quick Test ==="
echo ""

# Register
EMAIL="quicktest-$(date +%s)@example.com"
echo "1. Registering user: $EMAIL"
REGISTER_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234\",\"name\":\"Quick Test\"}")
echo "Response: $REGISTER_RESPONSE"
echo ""

# Login
echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"Test1234\"}")
echo "Response: $LOGIN_RESPONSE"

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: $TOKEN"
echo ""

# Create customer
echo "3. Creating customer..."
CUSTOMER_RESPONSE=$(curl -s -X POST "$API_GATEWAY/api/customers" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Test Customer","email":"customer@example.com","phone":"123-456-7890","investmentProfile":"moderate","riskTolerance":5}')
echo "Response: $CUSTOMER_RESPONSE"
echo ""

echo "=== Check Render logs now ==="
