# CRMシステム デプロイメントチェックリスト

このドキュメントは、Renderへのデプロイに必要なすべてのステップをまとめています。

## 📋 現在の状態

### ✅ 完了済み

1. **マイクロサービス基盤**
   - ✅ 5つのマイクロサービス実装
     - Auth Service (認証・認可)
     - Customer Service (顧客管理)
     - Sales Activity Service (商談・タスク)
     - Opportunity Service (承認フロー)
     - Analytics Service (分析・通知)
   - ✅ API Gateway 実装（Axios ベース）
   - ✅ Prisma ORM によるデータベース管理

2. **Render デプロイ**
   - ✅ 6サービスすべてデプロイ済み
   - ✅ PostgreSQL データベース（各サービス）
   - ✅ Internal Address による内部通信
   - ✅ Standard プラン ($25/月 × 6 = $150/月)

3. **Kafka 統合準備**
   - ✅ 全サービスに SASL/PLAIN 認証対応追加
   - ✅ Upstash Kafka セットアップガイド作成
   - ✅ 環境変数設定スクリプト作成
   - ✅ イベント駆動アーキテクチャ設計完了

4. **Redis キャッシング準備**
   - ✅ 全サービスに Redis 設定追加
   - ✅ キャッシュヘルパー関数実装
   - ✅ キャッシング戦略設計完了
   - ✅ 実装ガイド作成完了

### ⏳ 次のステップ

5. **Kafka 有効化**
   - ⏳ Upstash Kafka クラスター作成
   - ⏳ 5つのトピック作成
   - ⏳ Render 環境変数設定
   - ⏳ 全サービス再デプロイ
   - ⏳ イベント駆動通信検証

6. **Redis 有効化**
   - ⏳ Render Redis インスタンス作成
   - ⏳ 環境変数設定
   - ⏳ server.ts に initRedis() 追加
   - ⏳ コントローラーにキャッシングロジック実装

7. **監視・ロギング**
   - ⏳ Sentry 統合（エラー追跡）
   - ⏳ LogRocket 統合（ユーザーセッション記録）
   - ⏳ Render ログ集約設定

8. **CI/CD パイプライン**
   - ⏳ GitHub Actions ワークフロー作成
   - ⏳ 自動テスト実行
   - ⏳ 自動デプロイ設定

9. **E2E テスト**
   - ⏳ Playwright テスト実行
   - ⏳ 全エンドポイント検証
   - ⏳ パフォーマンステスト

10. **フロントエンド接続**
    - ⏳ Next.js アプリ設定
    - ⏳ API Gateway URL 設定
    - ⏳ 認証フロー統合

---

## 🚀 Kafka セットアップ手順

### ステップ1: Upstash アカウント作成

1. https://console.upstash.com/ にアクセス
2. GitHub/Google でサインイン
3. Kafka クラスター作成
   - Name: `crm-kafka-cluster`
   - Region: `us-east-1`
   - Plan: Free

### ステップ2: トピック作成

以下の5つのトピックを作成:

```
1. customer.events
2. user.events
3. sales-activity.events
4. opportunity.events
5. notification.events
```

各トピック設定:
- Partitions: 1
- Retention: 7 days
- Max Message Size: 1MB

### ステップ3: 接続情報取得

Upstash Console から以下をコピー:

```bash
KAFKA_BROKERS=xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxx
KAFKA_PASSWORD=xxxx
```

### ステップ4: Render 環境変数設定

**全5サービス** に以下を追加:

```bash
KAFKA_ENABLED=true
KAFKA_BROKERS=xxx-xxx.upstash.io:9092
KAFKA_USERNAME=xxxx
KAFKA_PASSWORD=xxxx
KAFKA_CLIENT_ID=<service-name>
```

サービス別のクライアントID:
- Auth: `auth-service`
- Customer: `customer-service`
- Sales Activity: `sales-activity-service`
- Opportunity: `opportunity-service`
- Analytics: `analytics-service`

### ステップ5: 再デプロイ

Render Dashboard で各サービスを再デプロイ

### ステップ6: 検証

ログで確認:
```
✅ Kafka Producer connected
✅ Kafka Consumer connected
📤 Event published: USER_CREATED to topic user.events
```

---

## 🔴 Redis セットアップ手順

### ステップ1: Render Redis 作成

1. Render Dashboard → New + → Redis
2. 設定:
   - Name: `crm-redis`
   - Plan: Free (25MB)
   - Region: Oregon (US West)

### ステップ2: Internal Redis URL 取得

```bash
REDIS_URL=rediss://red-xxx:xxx@oregon-redis.render.com:6379
```

### ステップ3: Render 環境変数設定

**全5サービス** に追加:

```bash
REDIS_URL=rediss://red-xxx:xxx@oregon-redis.render.com:6379
```

### ステップ4: 再デプロイ

Render Dashboard で各サービスを再デプロイ

### ステップ5: 検証

ログで確認:
```
✅ Redis connected
✅ Cache HIT: customer:cm123
```

---

## 💰 コスト見積もり

### 現在のコスト (月額)

| サービス | プラン | 月額 |
|---------|--------|------|
| API Gateway | Standard | $25 |
| Auth Service | Standard | $25 |
| Customer Service | Standard | $25 |
| Sales Activity Service | Standard | $25 |
| Opportunity Service | Standard | $25 |
| Analytics Service | Standard | $25 |
| PostgreSQL × 5 | Free | $0 |
| **合計** | | **$150** |

### 追加コスト

| サービス | プラン | 月額 |
|---------|--------|------|
| Upstash Kafka | Free | $0 |
| Render Redis | Free | $0 |
| **新しい合計** | | **$150** |

### 将来的なアップグレード

| サービス | 現在 | アップグレード後 | 差額 |
|---------|------|--------------|------|
| Upstash Kafka | Free (10k/月) | Pro ($10) | +$10 |
| Render Redis | Free (25MB) | Standard ($10) | +$10 |
| PostgreSQL | Free | Standard ($7×5) | +$35 |
| **潜在的な合計** | $150 | | **$205** |

---

## 📊 パフォーマンス目標

### 現在の実績

- ユーザー登録: **0.55秒**
- ログイン: **0.3秒**
- 顧客一覧取得: **1.2秒**

### 目標 (Kafka + Redis 有効化後)

- ユーザー登録: **0.4秒** (Kafka非同期化)
- ログイン: **0.1秒** (Redis キャッシュ)
- 顧客一覧取得: **0.2秒** (Redis キャッシュ)
- ダッシュボード: **0.5秒** (Redis キャッシュ)

---

## 🔐 セキュリティチェックリスト

- ✅ JWT トークン認証
- ✅ Helmet.js セキュリティヘッダー
- ✅ CORS 設定
- ✅ Rate Limiting (API Gateway)
- ✅ SASL/SSL 認証 (Kafka)
- ✅ SSL/TLS 暗号化 (Redis)
- ⏳ 環境変数の暗号化
- ⏳ API キーのローテーション
- ⏳ 監査ログの保持

---

## 📚 ドキュメント

### 作成済み

1. **KAFKA_SETUP.md** - Kafka 基本セットアップ
2. **UPSTASH_KAFKA_GUIDE.md** - Upstash 完全ガイド
3. **REDIS_CACHING_GUIDE.md** - Redis 実装ガイド
4. **DEPLOYMENT_CHECKLIST.md** - このドキュメント

### スクリプト

1. **scripts/setup-kafka-env.sh** - Kafka 環境変数生成

---

## 🧪 テストチェックリスト

### エンドツーエンドテスト

#### 1. 認証フロー
```bash
# ユーザー登録
curl -X POST https://crm-api-gateway.onrender.com/api/auth/register

# ログイン
curl -X POST https://crm-api-gateway.onrender.com/api/auth/login

# ユーザー情報取得
curl -X GET https://crm-api-gateway.onrender.com/api/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

#### 2. 顧客管理
```bash
# 顧客作成
curl -X POST https://crm-api-gateway.onrender.com/api/customers \
  -H "Authorization: Bearer $TOKEN"

# 顧客一覧取得
curl -X GET https://crm-api-gateway.onrender.com/api/customers \
  -H "Authorization: Bearer $TOKEN"
```

#### 3. イベント駆動（Kafka有効化後）
```bash
# ユーザー登録 → 顧客自動作成確認
# 顧客作成 → タスク自動作成確認
```

#### 4. キャッシング（Redis有効化後）
```bash
# 1回目: Cache MISS
# 2回目: Cache HIT
# パフォーマンス改善確認
```

---

## 🎯 今後の改善

### Phase 1: 安定化 (Week 1-2)
- ✅ Kafka 有効化
- ✅ Redis 有効化
- ✅ 監視・ロギング追加

### Phase 2: 自動化 (Week 3-4)
- ⏳ CI/CD パイプライン
- ⏳ E2E テスト自動化
- ⏳ パフォーマンステスト自動化

### Phase 3: スケーリング (Week 5-6)
- ⏳ データベース最適化
- ⏳ キャッシュ戦略改善
- ⏳ 負荷テスト実施

### Phase 4: 機能拡張 (Week 7-8)
- ⏳ リアルタイム通知 (WebSocket)
- ⏳ ファイルアップロード (S3)
- ⏳ レポート生成 (PDF/Excel)

---

## 📞 サポート

### トラブルシューティング

問題が発生した場合:

1. **Render ログ確認**
   - Render Dashboard → サービス → Logs

2. **環境変数確認**
   - Render Dashboard → サービス → Environment

3. **ヘルスチェック**
   ```bash
   curl https://<service>.onrender.com/health
   ```

4. **Kafka接続確認**
   - Upstash Console → Cluster → Metrics

5. **Redis接続確認**
   - Render Dashboard → Redis → Metrics

### 連絡先

- GitHub Issues: リポジトリの Issues を使用
- Render Support: support@render.com
- Upstash Support: support@upstash.com

---

## ✅ 完了後の確認事項

### Kafka 有効化後
- [ ] すべてのサービスで「Kafka Producer connected」を確認
- [ ] イベント発行を確認（📤 Event published ログ）
- [ ] イベント受信を確認（📥 Event received ログ）
- [ ] エンドツーエンドテスト実施

### Redis 有効化後
- [ ] すべてのサービスで「Redis connected」を確認
- [ ] キャッシュヒットを確認（✅ Cache HIT ログ）
- [ ] パフォーマンス改善を測定
- [ ] キャッシュ無効化テスト

### 本番リリース前
- [ ] すべてのE2Eテスト通過
- [ ] セキュリティ監査完了
- [ ] バックアップ設定完了
- [ ] 監視アラート設定完了
- [ ] ドキュメント最新化完了

---

**最終更新**: 2025-10-13
**バージョン**: 1.0.0
**ステータス**: Kafka/Redis 統合準備完了
