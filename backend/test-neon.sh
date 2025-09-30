#!/bin/bash
echo "Testing Neon PostgreSQL connection..."
echo ""
echo "1. Health check:"
curl -s http://localhost:4000/health
echo ""
echo ""
echo "2. Login test:"
curl -s -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"Admin123!\"}"
echo ""
