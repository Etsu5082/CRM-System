#!/bin/bash

set -e

echo "=========================================="
echo "マイクロフロントエンド完全セットアップ"
echo "Module Federation実装"
echo "=========================================="
echo ""

# 色の定義
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Shell App作成
echo -e "${YELLOW}[1/5] Shell App (Host) セットアップ中...${NC}"
cd shell-app
npm init -y
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf webpack
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
echo -e "${GREEN}✓ Shell App セットアップ完了${NC}"
cd ..
echo ""

# Step 2: Customer MFE作成
echo -e "${YELLOW}[2/5] Customer MFE (Remote 1) セットアップ中...${NC}"
cd customer-mfe
npm init -y
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf webpack
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
echo -e "${GREEN}✓ Customer MFE セットアップ完了${NC}"
cd ..
echo ""

# Step 3: Sales Activity MFE作成
echo -e "${YELLOW}[3/5] Sales Activity MFE (Remote 2) セットアップ中...${NC}"
cd sales-activity-mfe
npm init -y
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf webpack
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
echo -e "${GREEN}✓ Sales Activity MFE セットアップ完了${NC}"
cd ..
echo ""

# Step 4: Opportunity MFE作成
echo -e "${YELLOW}[4/5] Opportunity MFE (Remote 3) セットアップ中...${NC}"
cd opportunity-mfe
npm init -y
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf webpack
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
echo -e "${GREEN}✓ Opportunity MFE セットアップ完了${NC}"
cd ..
echo ""

# Step 5: Analytics MFE作成
echo -e "${YELLOW}[5/5] Analytics MFE (Remote 4) セットアップ中...${NC}"
cd analytics-mfe
npm init -y
npm install next@14 react@18 react-dom@18 typescript @types/node @types/react @types/react-dom
npm install @module-federation/nextjs-mf webpack
npm install tailwindcss postcss autoprefixer
npx tailwindcss init -p
echo -e "${GREEN}✓ Analytics MFE セットアップ完了${NC}"
cd ..
echo ""

echo -e "${GREEN}=========================================="
echo "全マイクロフロントエンドセットアップ完了！"
echo "==========================================${NC}"
echo ""
echo "次のステップ:"
echo "1. 各アプリのソースコード実装"
echo "2. Module Federation設定（next.config.js）"
echo "3. 全アプリ起動とテスト"
echo ""
echo "詳細: MICROFRONTEND_FULL_IMPLEMENTATION.md参照"
