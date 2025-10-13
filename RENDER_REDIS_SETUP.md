# Render Redis セットアップ（既存のcrm-redisを使用）

## ✅ 既存Redisの確認

スクリーンショットから確認：
- **crm-redis** が既に作成済み（Available状態）
- Region: Oregon
- Runtime: Valley 8

## 📋 Redis Internal URLの取得手順

### 1. crm-redis をクリック
Dashboard → crm-redis サービスを選択

### 2. Connect タブを開く
- 左側メニューの「Connect」または「Info」タブ

### 3. Internal Redis URL をコピー
以下の形式のURLが表示されます：
```
rediss://red-xxxxx:yyyyyy@oregon-redis.render.com:6379
```

⚠️ **External URLではなくInternal URLを使用してください**
- Internal URL: `oregon-redis.render.com` (Render内部通信用)
- External URL: `xxx.proxy.rlwy.net` などの外部アクセス用

## 🔧 環境変数の設定

### 対象サービス（5つすべて）
1. crm-auth-service
2. crm-customer-service
3. crm-sales-activity-service
4. crm-opportunity-service
5. crm-analytics-service

### 各サービスで設定する環境変数

```bash
# Redis接続
REDIS_URL=rediss://red-xxxxx:yyyyyy@oregon-redis.render.com:6379

# Kafka無効化
KAFKA_ENABLED=false

# ログレベル
LOG_LEVEL=info

# Sentry（後で設定）
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 設定手順（各サービスで実施）

1. サービスを選択（例：crm-auth-service）
2. 左側メニュー「Environment」をクリック
3. 「Add Environment Variable」をクリック
4. Key: `REDIS_URL`、Value: `rediss://...` を入力
5. 「Save Changes」をクリック
6. 同様に他の環境変数も追加
7. 「Manual Deploy」→「Deploy latest commit」で再デプロイ

## ⏱️ 所要時間

- Redis URL取得: **2分**
- 5サービスへの環境変数設定: **15分**
- 再デプロイ: **10分**
- **合計: 約27分**

## 🧪 動作確認

全サービスが「Live」状態になったら：

```bash
./scripts/e2e-test-simple.sh
```

## 📊 現在の状態

✅ Redis: 作成済み（crm-redis）
⚠️ 環境変数: 未設定
⚠️ Sentry: 未設定（オプション）
❌ Kafka: Upstashが廃止のため使用不可

## 次のステップ

1. **今すぐ**: crm-redisのInternal URLを取得
2. **5分後**: 5つのサービスに環境変数を設定
3. **20分後**: 全サービスを再デプロイ
4. **30分後**: E2Eテスト実行

Kafkaなしでも、すべての主要機能（認証、顧客管理、営業活動、商談、分析）が動作します！
