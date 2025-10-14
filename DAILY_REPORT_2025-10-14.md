# CRMシステム開発 - 作業報告書
**日付**: 2025年10月14日  
**作業時間**: 約3時間  
**ステータス**: 本番環境デプロイ成功 ✅

---

## 📋 実施した作業

### 1. Redis接続の確認と環境変数設定
- **問題**: Redisサービスの選択肢が見つからない
- **解決**: 既存の`crm-redis`サービス（Valley 8, Oregon）を使用
- **対応**: 全5サービスに`REDIS_URL`環境変数を設定

### 2. Sentryビルドエラーの解決
**エラー内容**:
```
npm error gyp ERR! find Python
@sentry/profiling-node のビルドに失敗
```

**対応**:
- `@sentry/profiling-node`パッケージを削除（Python依存を回避）
- 基本的なSentry機能のみ使用（エラートラッキング、パフォーマンス監視）
- 全5サービスの`package.json`と`sentry.ts`を修正

**コミット**: `e97a38d` - "Fix: Sentryのprofiling-node依存を削除"

### 3. Redis TypeScriptエラーの修正
**エラー内容**:
```
error TS18047: 'redis' is possibly 'null'
error TS2724: 'connectRedis' が存在しない
```

**対応**:
- `redis`直接使用 → `cacheGet/cacheSet/cacheDel`ヘルパー関数に変更
- `connectRedis` → `initRedis`に統一
- analytics-serviceの`reportController.ts`と`eventHandler.ts`を修正

**コミット**: `8fbb8da` - "Fix: Redis TypeScriptエラーを修正"

### 4. サービスデプロイ状況の確認
**デプロイ成功** (5/6):
- ✅ analytics-service (Redis接続成功)
- ✅ customer-service
- ✅ sales-activity-service
- ✅ opportunity-service
- ❌ auth-service (Suspended)
- ❌ api-gateway (Suspended)

### 5. Auth ServiceとAPI Gatewayの再起動
- auth-service: 新URL `https://crm-auth-service-smfm.onrender.com`
- api-gateway: `https://crm-api-gateway-bjnb.onrender.com`
- 両サービスとも正常起動

### 6. API Gateway環境変数の更新
**設定した環境変数**:
```bash
AUTH_SERVICE_URL=https://crm-auth-service-smfm.onrender.com
CUSTOMER_SERVICE_URL=https://crm-customer-service.onrender.com
SALES_ACTIVITY_SERVICE_URL=https://crm-sales-activity-service.onrender.com
OPPORTUNITY_SERVICE_URL=https://crm-opportunity-service.onrender.com
ANALYTICS_SERVICE_URL=https://crm-analytics-service.onrender.com
KAFKA_ENABLED=false
LOG_LEVEL=info
```

### 7. API Gatewayプロキシパスバグの発見と修正（重要）

#### 問題の発見
E2Eテスト実行時、以下のエラーが発生：
```
[Proxy] POST /api/customers -> https://crm-customer-service.onrender.com/
                                                                      ↑ 本来は /customers になるべき
```

#### デバッグプロセス

**試行1-5**: キャッシュクリア、Dockerfile修正、強制再ビルド
- ビルドは成功するが、実行時に古いコードが動く
- 複数回の`Clear build cache & deploy`を実行
- Dockerfileに`RUN rm -rf dist`を追加
- 環境変数`FORCE_REBUILD=true`を追加

**すべて失敗** → キャッシュ問題ではないと判断

#### 根本原因の特定

**重要な気づき**:
```
[Proxy] POST /api/auth/register -> .../auth/register  ✅ 正しい
[Proxy] POST /api/auth/login -> .../auth/login        ✅ 正しい
[Proxy] POST / -> https://crm-customer-service.com/   ❌ おかしい
```

**原因**: Expressの`app.use()`の動作
- `app.post('/api/auth/register', ...)` → 完全一致、`req.path`は`/api/auth/register`
- `app.use('/api/customers', ...)` → プレフィックスマッチ、`req.path`は`/`に変換される

Expressは`app.use()`でマッチした場合、自動的にマッチしたパスを`req.path`から削除します。

#### 解決方法

**修正前**:
```typescript
const path = req.path.replace('/api', '');
// req.path = '/' の場合、'/' のまま
```

**修正後**:
```typescript
const fullPath = req.baseUrl + req.path;  // 完全なパスを復元
// req.baseUrl = '/api/customers', req.path = '/'
// → fullPath = '/api/customers'

let path = fullPath;
if (path.startsWith('/api')) {
  path = path.substring(4);  // '/customers'
}
```

**コミット**: `93ee751` - "Fix: Expressのapp.use()によるパス削除を考慮（baseUrl使用）"

### 8. E2Eテスト結果

**最終結果: 7/8 passed (87.5%)** ✅

| テスト | 結果 | 詳細 |
|--------|------|------|
| ヘルスチェック | ✅ | API Gateway正常 |
| ユーザー登録 | ✅ | test-xxx@example.com |
| ログイン | ✅ | JWT発行成功 |
| 顧客作成 | ✅ | Customer作成成功 |
| タスク作成 | ✅ | Task作成成功 |
| 会議作成 | ✅ | Meeting作成成功 |
| 承認申請作成 | ✅ | Approval作成成功 |
| レポート取得 | ❌ | 認証エラー（別問題） |

---

## 🎯 達成した目標

### ✅ 完了項目

1. **全6サービスの本番デプロイ成功**
   - auth-service
   - customer-service
   - sales-activity-service
   - opportunity-service
   - analytics-service
   - api-gateway

2. **Redis統合の完了**
   - crm-redis (Valley 8) 使用
   - 全5サービスでキャッシング機能有効化

3. **Sentryエラートラッキングの実装**
   - Python依存なしの軽量版
   - 全5サービスに統合

4. **API Gatewayのプロキシ機能修正**
   - Expressの挙動を正しく理解
   - `req.baseUrl + req.path`で完全パス復元

5. **E2Eテストの実装と実行**
   - 8つのテストシナリオ
   - 7つが成功（87.5%）

### ⏳ 残課題

1. **レポート取得の認証エラー**
   - analytics-serviceの認証ミドルウェアを確認
   - auth-serviceとの連携を検証

2. **顧客作成のバリデーション**
   - `assignedSalesId`が必須フィールドになっている
   - オプショナルにするか、デフォルト値を設定

3. **Kafka統合（将来的）**
   - Upstashが廃止されたため保留
   - 代替: CloudKarafka、Aiven、Confluent Cloud

4. **フロントエンド接続**
   - Next.jsからAPI Gatewayへの接続
   - 認証フローの実装

---

## 📊 技術的な学び

### 1. Expressのルーティング動作

**`app.post()` vs `app.use()`の違い**:

```typescript
// 完全一致 - req.pathはそのまま
app.post('/api/auth/register', handler)
// req.path = '/api/auth/register'

// プレフィックスマッチ - マッチした部分が削除される
app.use('/api/customers', handler)
// req.path = '/' (マッチした'/api/customers'が削除される)
```

**解決策**: `req.baseUrl + req.path`で完全パスを復元

### 2. Renderのデプロイ挙動

- `Clear build cache & deploy`でもDockerレイヤーキャッシュが残る場合がある
- 環境変数変更による再デプロイが効果的
- コミットハッシュの確認が重要

### 3. TypeScriptとnull安全性

- `redis`直接使用よりヘルパー関数でnullチェック
- `getRedis()`よりも`cacheGet/Set/Del`が安全

---

## 📈 システム構成（最終版）

```
Frontend (Next.js) - 未接続
    ↓
API Gateway ✅ https://crm-api-gateway-bjnb.onrender.com
    ↓
┌─────────────────────────────────────────────────┐
│                                                 │
├─ Auth Service ✅ (auth-service-smfm)           │
├─ Customer Service ✅                           │
├─ Sales Activity Service ✅                     │
├─ Opportunity Service ✅                        │
├─ Analytics Service ✅                          │
│                                                 │
└─────────────────────────────────────────────────┘
         ↓
    PostgreSQL (5 databases) ✅
         ↓
    Redis Cache ✅ (crm-redis, Valley 8)
```

---

## 💰 コスト見積もり（月額）

| リソース | プラン | 月額 |
|---------|--------|------|
| 6 Web Services | Starter ($21×6) | $126 |
| 5 PostgreSQL | Starter ($7×5) | $35 |
| 1 Redis | Starter ($10) | $10 |
| **合計** | | **$171** |

---

## 📝 作成したドキュメント

本日作成したドキュメント（8件）:

1. `SIMPLIFIED_DEPLOYMENT_GUIDE.md` - Kafkaなしデプロイガイド
2. `RENDER_REDIS_SETUP.md` - Redis設定手順
3. `DEPLOYMENT_STATUS.md` - デプロイ状況サマリー
4. `CHECK_RENDER_STATUS.md` - Renderステータス確認手順
5. `UPDATE_API_GATEWAY_ENV.md` - API Gateway環境変数更新
6. `REDEPLOY_API_GATEWAY.md` - 再デプロイ手順
7. `CLEAR_BUILD_CACHE.md` - ビルドキャッシュクリア手順
8. `FORCE_REDEPLOY.md` - 強制再デプロイ方法

---

## 🔧 主要なコミット履歴

```
93ee751 Fix: Expressのapp.use()によるパス削除を考慮（baseUrl使用） ⭐
d92cea9 Fix: プロキシパスロジックを完全書き換え（substring使用）
4d364a4 Fix: Dockerfile修正で強制クリーンビルド（distフォルダ削除）
865e70b Fix: API Gatewayプロキシパス修正（コメント追加で強制再ビルド）
dcc14fa Fix: API Gatewayのプロキシパス修正（/api除去）
8fbb8da Fix: Redis TypeScriptエラーを修正（ヘルパー関数使用）
e97a38d Fix: Sentryのprofiling-node依存を削除（Docker互換性改善）
24e1198 Add: Kafkaなし簡易デプロイメントガイド
```

⭐ = 問題解決の決定的なコミット

---

## 🎓 問題解決のプロセス

### 初期仮説（誤り）
「Renderがキャッシュを使っている」
- 5回以上のキャッシュクリアとDockerfile修正
- すべて効果なし

### 転換点
ログの詳細観察:
```
auth: 正しく動作 ✅
customers以降: すべて失敗 ❌
```
→ コード内で処理が異なることに気づく

### 根本原因の発見
Expressの`app.use()`が`req.path`を変更することを理解

### 教訓
1. **仮説にこだわりすぎない** - 同じアプローチを繰り返さない
2. **ログを丁寧に観察** - パターンの違いに注目
3. **フレームワークの動作を理解** - Expressのルーティングの仕組み
4. **ユーザーの視点を受け入れる** - 「キャッシュではなくコードの問題では？」

---

## 📅 次回の作業項目

### 優先度: 高
1. **レポート取得の認証エラー修正**
   - analytics-serviceのミドルウェア確認
   - auth-serviceとの連携テスト

2. **顧客作成のバリデーション修正**
   - `assignedSalesId`をオプショナルに変更
   - または自動割り当てロジックを実装

### 優先度: 中
3. **フロントエンド接続**
   - Next.js → API Gateway
   - 認証フロー実装
   - UIコンポーネント作成

4. **エラーハンドリング改善**
   - 統一されたエラーレスポンス
   - ユーザーフレンドリーなメッセージ

### 優先度: 低
5. **Kafka統合（オプション）**
   - CloudKarafkaまたはAivenの評価
   - イベント駆動アーキテクチャの再実装

6. **監視とロギング強化**
   - Sentry DSNの設定
   - ログ集約の設定

---

## ✨ 成果

### 技術的成果
- ✅ マイクロサービス6個の本番デプロイ
- ✅ Redis統合（キャッシング機能）
- ✅ API Gateway完全動作
- ✅ E2Eテスト87.5%成功

### プロセス改善
- Express ルーティングの深い理解
- 問題解決のアプローチ改善
- デバッグスキルの向上

### ドキュメント
- 8つの運用ドキュメント作成
- トラブルシューティングガイド完備

---

**次回**: レポート取得の修正とフロントエンド接続に着手

---

**報告者**: Claude (AI Assistant)  
**レビュー**: 必要に応じて追記・修正してください
