# CI/CD パイプライン実装ガイド

このガイドでは、GitHub ActionsによるCI/CDパイプラインの設定と運用方法を説明します。

## 📋 目次

1. [概要](#概要)
2. [CI パイプライン](#ciパイプライン)
3. [CD パイプライン](#cdパイプライン)
4. [ワークフロー](#ワークフロー)
5. [ベストプラクティス](#ベストプラクティス)

---

## 概要

### CI/CD スタック

| ツール | 用途 | コスト |
|--------|------|--------|
| **GitHub Actions** | CI/CD自動化 | Free (2,000分/月) |
| **Render** | 自動デプロイ | 無料 |
| **Trivy** | セキュリティスキャン | オープンソース |

### 実装済みワークフロー

1. ✅ **CI Pipeline** (.github/workflows/ci.yml)
   - ビルドテスト（全6サービス並行）
   - 型チェック（TypeScript）
   - セキュリティスキャン
   - 依存関係チェック

2. ✅ **CD Pipeline** (.github/workflows/deploy.yml)
   - 自動デプロイ（main ブランチ）
   - ヘルスチェック
   - デプロイサマリー

---

## CI パイプライン

### ワークフロー構成

#### 1. ビルド & テスト

```yaml
jobs:
  test:
    strategy:
      matrix:
        service:
          - auth-service
          - customer-service
          - sales-activity-service
          - opportunity-service
          - analytics-service
          - api-gateway
```

**実行内容:**
- ✅ Node.js セットアップ (v20)
- ✅ 依存関係インストール
- ✅ Prisma クライアント生成
- ✅ TypeScript 型チェック
- ✅ ビルド実行
- ✅ ユニットテスト実行

**実行タイミング:**
- `main` ブランチへのプッシュ
- `develop` ブランチへのプッシュ
- プルリクエスト作成時

#### 2. Lint チェック

```yaml
lint:
  steps:
    - Check for common issues
    - Security check (パスワード、APIキーの検出)
```

**検出項目:**
- ❌ `password=` のハードコード
- ❌ `API_KEY=` のハードコード
- ✅ 機密情報の漏洩防止

#### 3. セキュリティスキャン

```yaml
security:
  steps:
    - Run Trivy vulnerability scanner
```

**スキャン内容:**
- 📦 依存関係の脆弱性
- 🔒 セキュリティベストプラクティス
- ⚠️  高リスク脆弱性の検出

#### 4. 依存関係チェック

```yaml
dependencies:
  steps:
    - Check for outdated dependencies
```

**確認項目:**
- 📊 古いパッケージの検出
- 🔄 アップデート推奨の表示

---

## CD パイプライン

### デプロイフロー

```
GitHub Push (main)
    ↓
GitHub Actions トリガー
    ↓
Render 自動デプロイ
    ↓
ヘルスチェック
    ↓
デプロイ完了通知
```

### Render 自動デプロイ設定

Render は GitHub と連携して自動デプロイを実行します。

#### 設定手順

1. **Render Dashboard** → サービス選択
2. **Settings** → **Build & Deploy**
3. **Auto-Deploy** を `Yes` に設定
4. **Branch** を `main` に設定

#### デプロイトリガー

- ✅ `main` ブランチへのプッシュ
- ✅ 手動トリガー（workflow_dispatch）

#### ヘルスチェック

デプロイ後、以下のエンドポイントを確認:

```bash
# API Gateway
curl https://crm-api-gateway.onrender.com/health

# Auth Service
curl https://crm-auth-service-smfm.onrender.com/health

# Customer Service
curl https://crm-customer-service.onrender.com/health

# Sales Activity Service
curl https://crm-sales-activity-service.onrender.com/health

# Opportunity Service
curl https://crm-opportunity-service.onrender.com/health

# Analytics Service
curl https://crm-analytics-service.onrender.com/health
```

**期待レスポンス:**
```json
{
  "status": "ok",
  "service": "auth-service",
  "timestamp": "2025-10-13T12:00:00.000Z"
}
```

---

## ワークフロー

### 開発フロー

#### 1. 機能開発

```bash
# 新しいブランチを作成
git checkout -b feature/new-feature

# コード変更
vim services/auth-service/src/...

# ローカルテスト
cd services/auth-service
npm test
npm run build

# コミット
git add .
git commit -m "Add: 新機能実装"

# プッシュ
git push origin feature/new-feature
```

#### 2. プルリクエスト

```
GitHub UI:
1. 「New Pull Request」をクリック
2. feature/new-feature → develop
3. PR説明を記入
4. 「Create Pull Request」
```

**自動実行:**
- ✅ CI パイプライン実行
- ✅ ビルドテスト
- ✅ セキュリティスキャン
- ✅ チェック結果表示

#### 3. レビュー & マージ

```
GitHub UI:
1. レビュアーがコードレビュー
2. 修正が必要な場合はコメント
3. 承認後「Merge Pull Request」
4. feature ブランチ削除
```

#### 4. 本番デプロイ

```bash
# develop → main マージ
git checkout main
git merge develop

# プッシュ
git push origin main
```

**自動実行:**
- ✅ CI パイプライン実行
- ✅ Render 自動デプロイ
- ✅ ヘルスチェック
- ✅ 通知

---

## ベストプラクティス

### 1. コミットメッセージ規約

```
<type>: <subject>

<body>

<footer>
```

**タイプ:**
- `Add`: 新機能追加
- `Fix`: バグ修正
- `Update`: 既存機能の更新
- `Refactor`: リファクタリング
- `Docs`: ドキュメント変更
- `Test`: テスト追加・修正
- `Chore`: ビルド・設定変更

**例:**
```
Add: ユーザー登録API実装

ユーザー登録エンドポイントを実装
- メール検証
- パスワードハッシュ化
- JWT トークン発行

Closes #123
```

### 2. ブランチ戦略

```
main (本番環境)
  ↑
develop (開発環境)
  ↑
feature/* (機能開発)
fix/* (バグ修正)
```

**ルール:**
- `main`: 常に本番可能な状態を維持
- `develop`: 開発中の機能を統合
- `feature/*`: 機能開発ブランチ
- `fix/*`: バグ修正ブランチ

### 3. プルリクエストチェックリスト

```markdown
## 変更内容
- [ ] 新機能の説明
- [ ] 変更理由

## テスト
- [ ] ユニットテスト追加
- [ ] 手動テスト完了

## ドキュメント
- [ ] README 更新
- [ ] API ドキュメント更新

## セキュリティ
- [ ] 機密情報の除外確認
- [ ] 認証・認可の確認

## パフォーマンス
- [ ] パフォーマンスへの影響確認
- [ ] N+1クエリの確認
```

### 4. デプロイ前チェック

```bash
# 1. ローカルビルド確認
npm run build

# 2. 型チェック
npx tsc --noEmit

# 3. ユニットテスト
npm test

# 4. E2Eテスト
npm run test:e2e

# 5. 依存関係確認
npm audit

# 6. 環境変数確認
cat .env.example
```

### 5. ロールバック手順

```bash
# 1. 直前のコミットに戻す
git revert HEAD

# 2. プッシュ
git push origin main

# 3. Render で自動デプロイ

# 4. ヘルスチェック
curl https://crm-api-gateway.onrender.com/health

# 5. ログ確認
# Render Dashboard → Logs
```

---

## GitHub Actions の使用量

### Free Tier 制限

| 項目 | 制限 |
|------|------|
| **実行時間** | 2,000分/月 |
| **ストレージ** | 500MB |
| **同時実行** | 20ジョブ |

### 使用量見積もり

**CI パイプライン (1回):**
- テスト: 6サービス × 3分 = 18分
- Lint: 1分
- セキュリティ: 2分
- 依存関係: 2分
- **合計: 約23分**

**1日の推定実行回数:**
- プッシュ: 5回
- プルリクエスト: 3回
- **合計: 8回/日**

**月間使用量:**
- 23分 × 8回 × 30日 = **5,520分/月**

**⚠️  Free Tier を超過します！**

### 対策

#### 1. 実行頻度の削減

```yaml
# develop ブランチのみ
on:
  push:
    branches: [ develop ]
```

#### 2. キャッシュの活用

```yaml
- uses: actions/cache@v3
  with:
    path: ~/.npm
    key: ${{ runner.os }}-node-${{ hashFiles('**/package-lock.json') }}
```

#### 3. 並行実行の制限

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

#### 4. 有料プランへのアップグレード

| プラン | 実行時間 | 料金 |
|--------|----------|------|
| **Free** | 2,000分/月 | $0 |
| **Pro** | 3,000分/月 | $4/月 |
| **Team** | 10,000分/月 | $21/月 |

---

## トラブルシューティング

### ビルド失敗

**エラー:**
```
npm ci: no package-lock.json found
```

**解決策:**
```bash
# package-lock.json 生成
npm install

# コミット
git add package-lock.json
git commit -m "Add: package-lock.json"
git push
```

### 型エラー

**エラー:**
```
error TS2304: Cannot find name 'Request'
```

**解決策:**
```bash
# 型定義インストール
npm install --save-dev @types/express

# 再ビルド
npm run build
```

### デプロイ失敗

**エラー:**
```
Health check failed
```

**解決策:**
1. Render ログ確認
2. 環境変数確認
3. データベース接続確認
4. ロールバック実行

---

## 監視 & アラート

### GitHub Actions 通知

#### Slack 連携

```yaml
- name: Notify Slack
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'CI/CD パイプライン失敗'
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

#### メール通知

GitHub Settings → Notifications:
- ✅ Actions (ワークフロー失敗時)
- ✅ Pull requests (レビューリクエスト)

---

## 次のステップ

1. ✅ CI/CD パイプライン実装完了
2. ⏳ キャッシュ戦略の最適化
3. ⏳ E2Eテストの自動化
4. ⏳ パフォーマンステストの追加
5. ⏳ Slack 通知の設定

---

## 参考リンク

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Render Deploy Hooks](https://render.com/docs/deploy-hooks)
- [Trivy Security Scanner](https://aquasecurity.github.io/trivy/)
