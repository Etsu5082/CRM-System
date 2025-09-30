#!/bin/bash
set -e

echo "Quick API Test"
echo "=============="

# Get token
echo "Getting token..."
RESPONSE=$(curl -s -X POST http://localhost:4000/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"Admin123!"}')
TOKEN=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('token', ''))")

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  exit 1
fi
echo "✓ Login successful"

# Test dashboard
echo "Testing dashboard endpoint..."
curl -s http://localhost:4000/api/reports/dashboard -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
echo ""

# Test audit logs
echo "Testing audit logs endpoint..."
curl -s "http://localhost:4000/api/audit?limit=5" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
echo ""

echo "✓ Tests complete"
