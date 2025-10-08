#!/bin/bash

echo "=========================================="
echo "マイクロサービスCRM 初期データ投入"
echo "=========================================="
echo ""

ADMIN_EMAIL="${ADMIN_EMAIL:-admin@example.com}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-admin123}"
ADMIN_NAME="${ADMIN_NAME:-管理者}"

echo "🔄 Auth Service の起動を待機中..."
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -s http://localhost:3100/health > /dev/null 2>&1; then
    echo "✅ Auth Service が起動しました"
    break
  fi
  RETRY_COUNT=$((RETRY_COUNT + 1))
  echo "   待機中... ($RETRY_COUNT/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo "❌ Auth Service の起動がタイムアウトしました"
  exit 1
fi

echo ""
echo "📋 既存管理者ユーザーの確認..."

LOGIN_RESULT=$(curl -s -X POST "http://localhost:3100/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")

if echo "$LOGIN_RESULT" | grep -q "token"; then
  echo "✅ 管理者ユーザーは既に存在します"
  USER_ID=$(echo "$LOGIN_RESULT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "   User ID: $USER_ID"
else
  echo "🔨 管理者ユーザーを作成中..."
  
  docker compose -f docker-compose.microservices.yml exec -T auth-service node << 'EOFNODE'
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
    const user = await prisma.user.create({
      data: {
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: hashedPassword,
        name: process.env.ADMIN_NAME || '管理者',
        role: 'ADMIN'
      }
    });
    console.log('✅ 管理者ユーザーを作成しました');
    console.log('User ID:', user.id);
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('✅ 管理者ユーザーは既に存在します');
    } else {
      console.error('❌ エラー:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
})();
EOFNODE
fi

echo ""
echo "=========================================="
echo "✅ 初期データ投入完了"
echo "=========================================="
echo ""
echo "管理者アカウント:"
echo "  Email: $ADMIN_EMAIL"
echo "  Password: $ADMIN_PASSWORD"
echo ""
