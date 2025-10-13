# API Gateway 再デプロイ手順

## 環境変数を変更した後の手順

環境変数を追加・変更しただけでは反映されません。
必ず再デプロイが必要です。

## 📋 再デプロイ手順

1. https://dashboard.render.com/ にアクセス
2. **crm-api-gateway** をクリック
3. 右上の **「Manual Deploy」** をクリック
4. **「Deploy latest commit」** を選択
5. デプロイ完了を待つ（約2-3分）

## ✅ デプロイ完了の確認

ログに以下のようなメッセージが表示されます：

```
🚀 API Gateway running on port 3000
📡 Proxying to:
   - Auth Service: https://crm-auth-service-smfm.onrender.com
   - Customer Service: https://crm-customer-service.onrender.com
   - Sales Activity Service: https://crm-sales-activity-service.onrender.com
   - Opportunity Service: https://crm-opportunity-service.onrender.com
   - Analytics Service: https://crm-analytics-service.onrender.com
```

**重要**: URLが `https://` で始まっていることを確認してください

## 🧪 テスト実行

デプロイ完了後、以下のコマンドでE2Eテストを実行：

```bash
./scripts/e2e-test-production.sh
```

## 期待される結果

```
=========================================
結果: 8 passed, 0 failed
=========================================
```

## 現在の状態

環境変数は設定済みですが、再デプロイ待ちです。

✅ 環境変数設定完了  
⏳ 再デプロイ待ち  
⏳ E2Eテスト完走待ち
