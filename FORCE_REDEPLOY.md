# Render 強制再デプロイ手順

## 「Suspend Service」が見つからない場合

別の方法で強制的に新しいコンテナを起動させます。

## 📋 手順

### 方法1: 環境変数を変更して再デプロイ

1. Renderダッシュボード → **crm-api-gateway** → **Environment**
2. 新しい環境変数を追加：
   ```
   FORCE_REBUILD=true
   ```
3. 「Save Changes」をクリック
4. 自動的に再デプロイが開始されます
5. デプロイ完了を待つ

### 方法2: Dockerfileにコメント追加

ダミーのコメントを追加してプッシュします（すでに実行済み）

### 方法3: Shell タブで再起動

1. Renderダッシュボード → **crm-api-gateway**
2. 上部メニューの **「Shell」** タブをクリック
3. 以下のコマンドを実行：
   ```bash
   cat /app/dist/server.js | grep "req.path.replace"
   ```
4. 出力を確認：
   - `const path = req.path.replace('/api', '');` なら正しい
   - `const path = req.path.replace(pathPrefix, '');` なら古い

### 方法4: サービス名を変更

**これが最も確実な方法です**

1. Settings → Service Name を変更
   - 現在: `crm-api-gateway`
   - 新しい: `crm-api-gateway-v2`
2. 「Save Changes」
3. 完全に新しいコンテナが起動します

## 🔍 デバッグ情報

Renderのビルドログを見ると、正しくビルドされています：
```
#12 [builder 7/7] RUN rm -rf dist && npm run build
#12 0.342 > api-gateway@1.0.0 build
#12 0.342 > tsc
#12 DONE 3.7s
```

しかし、実行時には古いコードが動いています。
これはRenderがDockerイメージレイヤーをキャッシュしているためです。

## 💡 推奨される対応

**方法1（環境変数追加）**を試してください。
これにより、Renderは新しいコンテナインスタンスを起動します。

環境変数を追加後、ログで以下を確認：

```
[Proxy] POST /api/customers -> https://crm-customer-service.onrender.com/customers
```

`/customers` になっていればOK！
