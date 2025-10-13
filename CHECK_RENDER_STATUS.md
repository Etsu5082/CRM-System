# Renderサービス状態確認手順

## 現在の状況

Renderダッシュボードで"deployed"と表示されているが、アクセスすると"Service Suspended"が返される。

## 確認手順

### 1. auth-service の確認

1. https://dashboard.render.com/ にアクセス
2. **crm-auth-service** をクリック
3. 以下を確認：
   - **Status**: Live / Building / Deploy failed / Suspended のどれか？
   - **Logs**: 最新のログを確認（エラーメッセージがないか）
   - **Events**: 最近のイベントを確認

### 2. api-gateway の確認

1. **crm-api-gateway** をクリック
2. 同様に Status、Logs、Events を確認

## よくある原因と対処法

### ケース1: Deploy Failed（デプロイ失敗）

**症状**: Status が "Deploy failed"  
**原因**: ビルドエラーまたは起動エラー  
**対処**:
1. Logs タブでエラーメッセージを確認
2. 必要に応じてコード修正
3. Manual Deploy で再デプロイ

### ケース2: 無料プランの時間制限

**症状**: "Free instance hours exceeded"  
**原因**: 無料プランの月間750時間制限を超過  
**対処**:
1. Settings → Plan で有料プラン（Starter: $7/月）にアップグレード
2. または、不要なサービスを停止して時間を節約

### ケース3: サービスが手動停止されている

**症状**: Status が "Suspended"（赤色）  
**原因**: 手動で停止された、または支払いの問題  
**対処**:
1. Settings → "Resume Service" ボタンをクリック
2. 支払い情報を確認

### ケース4: 環境変数が不足

**症状**: サービスは起動するがすぐにクラッシュ  
**ログ例**: "DATABASE_URL is not defined"  
**対処**:
1. Environment タブで必要な環境変数を追加
2. Manual Deploy で再デプロイ

### ケース5: ヘルスチェック失敗

**症状**: サービスは起動するが "Health check failed"  
**原因**: /health エンドポイントが正常に応答しない  
**対処**:
1. Logs で詳細を確認
2. データベース接続などの依存関係を確認

## 必要な環境変数（auth-service）

```bash
# データベース
DATABASE_URL=postgresql://...

# JWT
JWT_SECRET=your-secret-key-here

# Redis（オプション）
REDIS_URL=rediss://...
KAFKA_ENABLED=false
LOG_LEVEL=info

# 内部URL
CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com
ANALYTICS_SERVICE_URL=https://crm-analytics-service.onrender.com
```

## 必要な環境変数（api-gateway）

```bash
# 内部URL
AUTH_SERVICE_URL=https://crm-auth-service.onrender.com
CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com
ANALYTICS_SERVICE_URL=https://crm-analytics-service.onrender.com

# Redis（オプション）
REDIS_URL=rediss://...
KAFKA_ENABLED=false
LOG_LEVEL=info
```

## デバッグコマンド

### ローカルでビルドテスト（auth-service）

```bash
cd services/auth-service
npm install
npm run build
npm start
```

### ローカルでビルドテスト（api-gateway）

```bash
cd api-gateway
npm install
npm run build
npm start
```

## 次のステップ

1. **今すぐ**: Renderダッシュボードで auth-service と api-gateway の Status を確認
2. **エラーがあれば**: Logs を確認してエラーメッセージを共有
3. **Suspended状態なら**: "Resume Service" をクリック
4. **Deploy Failed なら**: エラーログを共有してください

## スクリーンショット撮影箇所

以下の画面をスクリーンショットで共有いただけると、問題の特定が早くなります：

1. ✅ auth-service の Overview ページ（Status表示）
2. ✅ auth-service の Logs ページ（最新50行）
3. ✅ api-gateway の Overview ページ（Status表示）
4. ✅ api-gateway の Logs ページ（最新50行）
