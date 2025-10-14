# Render サービス完全再起動手順

## 問題

ビルドは成功しているが、古いコードが実行されています。
Renderが古いDockerイメージをキャッシュしている可能性があります。

## 📋 解決手順

### オプション1: サービスを一時停止してから再起動

1. https://dashboard.render.com/ → **crm-api-gateway**
2. 右上の「Settings」をクリック
3. 下にスクロールして「Suspend Service」をクリック
4. 確認ダイアログで「Suspend」をクリック
5. 30秒待つ
6. 「Resume Service」をクリック
7. デプロイ完了を待つ

### オプション2: サービスを削除して再作成（最終手段）

**警告**: すべての環境変数を再設定する必要があります

1. 環境変数をバックアップ（メモ帳にコピー）
2. crm-api-gateway を削除
3. 新しい Web Service を作成
4. Repository: `Etsu5082/CRM-System`
5. Branch: `main`
6. Root Directory: `services/api-gateway`
7. Environment: `Docker`
8. 環境変数を再設定：
   ```
   AUTH_SERVICE_URL=https://crm-auth-service-smfm.onrender.com
   CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
   SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
   OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com
   ANALYTICS_SERVICE_URL=https://crm-analytics-service.onrender.com
   KAFKA_ENABLED=false
   LOG_LEVEL=info
   ```
9. 「Create Web Service」

### オプション3: 別の方法でキャッシュをクリア

Renderのサポートに連絡してDockerイメージキャッシュをクリアしてもらう

## 🔍 デバッグ

実行中のコンテナに入って確認（Renderコンソールで）:

```bash
cat /app/dist/server.js | grep "req.path.replace"
```

期待される出力:
```javascript
const path = req.path.replace('/api', '');
```

現在の出力（おそらく）:
```javascript
const path = req.path.replace(pathPrefix, '');
```

## 🎯 確認方法

デプロイ後、ログで以下を確認：

```
[Proxy] POST /api/customers -> https://crm-customer-service.onrender.com/customers
```

`/customers` になっていればOK！
