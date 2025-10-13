# API Gateway 環境変数更新が必要

## 問題

API Gatewayが新しいサービスURLを認識していません。
ログに表示されているURLが古い内部URL形式です：

```
- Auth Service: http://crm-auth-service-smfm:3100
- Customer Service: http://crm-customer-service:3101
```

## 必要な環境変数（Render Dashboard）

crm-api-gateway の Environment タブで以下を設定：

```bash
# 新しい外部URL
AUTH_SERVICE_URL=https://crm-auth-service-smfm.onrender.com
CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com
ANALYTICS_SERVICE_URL=https://crm-analytics-service.onrender.com

# Redis
KAFKA_ENABLED=false
LOG_LEVEL=info
```

## 設定手順

1. https://dashboard.render.com/ → crm-api-gateway
2. 左メニュー「Environment」
3. 上記の環境変数を追加
4. 「Save Changes」
5. 「Manual Deploy」→「Deploy latest commit」

## 再デプロイ後の確認

```bash
./scripts/e2e-test-production.sh
```

## E2Eテスト結果（現在）

✅ ヘルスチェック  
✅ ユーザー登録  
✅ ログイン  
❌ 顧客作成（ルーティングエラー）  
❌ タスク作成（ルーティングエラー）  
❌ 会議作成（ルーティングエラー）  
❌ 承認申請作成（ルーティングエラー）  
❌ レポート取得（ルーティングエラー）

**3/8 passed (37.5%)**
