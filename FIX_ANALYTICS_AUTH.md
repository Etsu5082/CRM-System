# Analytics Service 認証エラー修正手順

## 問題

E2Eテストで「レポート取得」のみ失敗：
```
[8] レポート取得...
✗ レポート取得失敗
  Response: {"error":"Invalid token"}
```

## 原因

analytics-serviceに**AUTH_SERVICE_URL**環境変数が設定されていない可能性があります。

## 📋 修正手順

### Renderダッシュボードで確認・設定

1. https://dashboard.render.com/ にアクセス
2. **crm-analytics-service** をクリック
3. 左メニュー「Environment」をクリック
4. 以下の環境変数があるか確認：

```bash
AUTH_SERVICE_URL=https://crm-auth-service-smfm.onrender.com
```

### 環境変数が存在しない場合

「Add Environment Variable」をクリックして追加：

```bash
AUTH_SERVICE_URL=https://crm-auth-service-smfm.onrender.com
```

「Save Changes」をクリックすると自動的に再デプロイされます。

### 環境変数が存在する場合

値が正しいか確認：
- ❌ `http://crm-auth-service:3100` (内部URLは動作しない)
- ❌ `http://localhost:3100`
- ✅ `https://crm-auth-service-smfm.onrender.com`

## 🧪 テスト

再デプロイ完了後、E2Eテストを実行：

```bash
./scripts/e2e-test-production.sh
```

期待される結果：
```
[8] レポート取得...
✓ レポート取得成功
  総顧客数: X

=========================================
結果: 8 passed, 0 failed
=========================================
```

## 📊 他の必要な環境変数（確認用）

analytics-serviceに必要な環境変数一覧：

```bash
# 必須
DATABASE_URL=postgresql://...
AUTH_SERVICE_URL=https://crm-auth-service-smfm.onrender.com

# サービスURL（レポート集計用）
CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com

# オプション
REDIS_URL=rediss://...
KAFKA_ENABLED=false
LOG_LEVEL=info
SENTRY_DSN=(未設定でもOK)
```

## 🔍 デバッグ

Renderのログで以下を確認：

```
🚀 Analytics Service running on port 3104
```

リクエスト時のログ：
```
GET /reports/sales-summary
```

エラーがある場合、詳細なエラーメッセージが表示されます。
