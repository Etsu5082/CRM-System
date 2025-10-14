# Renderビルドキャッシュをクリアして再デプロイ

## 問題

最新のコードがデプロイされていません。ビルドキャッシュが原因で古いコードが使用されています。

現在のログ：
```
[Proxy] POST /api/customers -> https://crm-customer-service.onrender.com/
```

期待されるログ：
```
[Proxy] POST /api/customers -> https://crm-customer-service.onrender.com/customers
```

## 📋 解決手順

### 1. ビルドキャッシュをクリア

1. https://dashboard.render.com/ にアクセス
2. **crm-api-gateway** をクリック
3. 右上の **「Manual Deploy」** をクリック
4. ドロップダウンから **「Clear build cache & deploy」** を選択（重要！）
5. デプロイ完了を待つ（3-5分）

### 2. デプロイ完了の確認

ログに以下が表示されることを確認：

```
🚀 API Gateway running on port 3000
📡 Proxying to:
   - Auth Service: https://crm-auth-service-smfm.onrender.com
   - Customer Service: https://crm-customer-service.onrender.com
   - Sales Activity Service: https://crm-sales-activity-service.onrender.com
   - Opportunity Service: https://crm-opportunity-service.onrender.com
   - Analytics Service: https://crm-analytics-service.onrender.com
```

### 3. テスト実行で確認

デプロイ完了後、以下を実行：

```bash
./scripts/e2e-test-production.sh
```

ログに以下が表示されることを確認：
```
[Proxy] POST /api/customers -> https://crm-customer-service.onrender.com/customers
```

## なぜキャッシュクリアが必要？

Renderは高速化のためにビルド結果をキャッシュします。
通常の「Deploy latest commit」では、`dist/server.js`がキャッシュから読み込まれ、
TypeScriptの再コンパイルがスキップされることがあります。

**「Clear build cache & deploy」** を使用すると：
- `node_modules`が削除される
- `dist`フォルダが削除される
- `npm install`から完全にやり直し
- `npm run build`でTypeScriptを再コンパイル

## 最新のコミット

コミット: `dcc14fa`
メッセージ: "Fix: API Gatewayのプロキシパス修正（/api除去）"

変更内容：
```typescript
// 修正前
const path = req.path.replace(pathPrefix, '');

// 修正後
const path = req.path.replace('/api', '');
```

これにより `/api/customers` → `/customers` と正しく変換されます。
