# Upstash Kafka トピック作成ガイド（画像付き）

## 📋 現在の状況

スクリーンショットを見ると、現在 **Redis** のページを開いています。
Kafka のトピックを作成するには、**Kafka のクラスター** を開く必要があります。

---

## ⚠️ 重要な確認

### 確認1: Kafkaクラスターは作成済みですか？

現在のスクリーンショットには「**crm-kafka-cluster**」という名前がありません。

もしKafkaクラスターをまだ作成していない場合は、以下の手順で作成してください。

---

## 🚀 ステップ1: Kafkaクラスターを作成

### 1-1. Upstash Console のトップページに戻る

画面左上の **Upstash ロゴ（緑の渦巻き）** をクリックしてトップページに戻ります。

### 1-2. Kafka タブを選択

上部のタブで **「Kafka」** をクリックします。

現在は「Redis」タブが選択されていますが、その隣に「**Kafka**」というタブがあるはずです。

### 1-3. Create Cluster をクリック

「**Create Cluster**」または「**Create Kafka Cluster**」ボタンをクリックします。

### 1-4. クラスター情報を入力

以下の情報を入力します：

```
Name: crm-kafka-cluster
Type: Kafka
Region: us-east-1 (または AWS N. Virginia)
Plan: Free
```

**重要:**
- Region は **us-east-1** (AWS N. Virginia) を選択してください
- これは Render のサービスと同じリージョンです

### 1-5. Create をクリック

「**Create**」ボタンをクリックしてクラスターを作成します。

作成には30秒〜1分かかります。

---

## 🎯 ステップ2: トピックを作成

クラスターが作成されたら、トピックを作成します。

### 2-1. クラスターを開く

作成された「**crm-kafka-cluster**」をクリックして開きます。

### 2-2. Topics タブを選択

クラスターの詳細ページで、以下のタブが表示されます：

```
Details | Usage | CLI | Data Browser | Monitor | Backups | RBAC
```

この中から **「Details」** タブが選択されていると思いますが、
画面を下にスクロールすると **「Topics」** セクションがあるはずです。

または、ページ上部に **「Topics」** というリンクがある場合もあります。

### 2-3. Create Topic をクリック

「**Create Topic**」または「**New Topic**」ボタンをクリックします。

### 2-4. 1つ目のトピックを作成

以下の情報を入力します：

```
Topic Name: customer.events
Partitions: 1
Retention Time: 7 days (604800000 ms)
Max Message Size: 1048576 (1MB)
```

「**Create**」をクリックします。

### 2-5. 残りの4つのトピックを作成

同様に、以下のトピックを作成します：

#### 2つ目
```
Topic Name: user.events
Partitions: 1
Retention Time: 7 days
Max Message Size: 1048576
```

#### 3つ目
```
Topic Name: sales-activity.events
Partitions: 1
Retention Time: 7 days
Max Message Size: 1048576
```

#### 4つ目
```
Topic Name: opportunity.events
Partitions: 1
Retention Time: 7 days
Max Message Size: 1048576
```

#### 5つ目
```
Topic Name: notification.events
Partitions: 1
Retention Time: 7 days
Max Message Size: 1048576
```

---

## 📝 ステップ3: 接続情報を取得

すべてのトピックを作成したら、接続情報を取得します。

### 3-1. Details タブに戻る

クラスターページの「**Details**」タブをクリックします。

### 3-2. 接続情報をコピー

以下の情報をコピーして、メモ帳などに保存します：

```bash
# Bootstrap Servers（KAFKA_BROKERS）
例: sterling-guinea-14616.upstash.io:9092

# SASL Username（KAFKA_USERNAME）
例: c3Rlcmxpbmct...

# SASL Password（KAFKA_PASSWORD）
例: YjIwNDYxMmEt...
```

**重要:** これらの情報は後で Render の環境変数に設定します。

---

## ✅ 完了の確認

### 確認項目

- [ ] Kafka クラスター「crm-kafka-cluster」が作成済み
- [ ] トピック「customer.events」が作成済み
- [ ] トピック「user.events」が作成済み
- [ ] トピック「sales-activity.events」が作成済み
- [ ] トピック「opportunity.events」が作成済み
- [ ] トピック「notification.events」が作成済み
- [ ] 接続情報（KAFKA_BROKERS, KAFKA_USERNAME, KAFKA_PASSWORD）をコピー済み

---

## 🔍 トラブルシューティング

### 問題1: Kafka タブが見つからない

**症状:** 上部に「Kafka」タブが表示されない

**解決策:**
1. 画面左上の Upstash ロゴをクリック
2. トップページに戻る
3. サイドバーに「Kafka」というメニューがあるはずです

### 問題2: Create Cluster ボタンが見つからない

**症状:** Kafka ページに何も表示されない

**解決策:**
1. ページをリロード（⌘ + R）
2. 別のブラウザで開く
3. アカウントが正しくログインしているか確認

### 問題3: トピック作成に失敗する

**症状:** 「Failed to create topic」エラー

**解決策:**
1. トピック名に「.」（ドット）が含まれているか確認
2. トピック名は `customer.events` のような形式
3. 特殊文字（スペースなど）は使用しない

---

## 📞 次のステップ

トピック作成が完了したら：

1. **接続情報を確認** - KAFKA_BROKERS, KAFKA_USERNAME, KAFKA_PASSWORD
2. **Render 環境変数設定** - [ENVIRONMENT_VARIABLES_GUIDE.md](./ENVIRONMENT_VARIABLES_GUIDE.md) を参照
3. **サービス再デプロイ**
4. **E2Eテスト実行**

---

## 🖼️ 参考: 画面イメージ

### Kafka クラスター一覧ページ
```
┌─────────────────────────────────────┐
│ Upstash Console                      │
├─────────────────────────────────────┤
│ Redis | Kafka | Vector | QStash ... │ ← ここで Kafka を選択
├─────────────────────────────────────┤
│                                      │
│  [+ Create Cluster]                  │
│                                      │
│  📊 crm-kafka-cluster                │
│  Free Tier | us-east-1              │
│                                      │
└─────────────────────────────────────┘
```

### トピック一覧
```
┌─────────────────────────────────────┐
│ crm-kafka-cluster                    │
├─────────────────────────────────────┤
│ Details | Usage | Topics | ...       │ ← Topics を選択
├─────────────────────────────────────┤
│                                      │
│  [+ Create Topic]                    │
│                                      │
│  📬 customer.events                  │
│  📬 user.events                      │
│  📬 sales-activity.events            │
│  📬 opportunity.events               │
│  📬 notification.events              │
│                                      │
└─────────────────────────────────────┘
```

---

**作成日**: 2025-10-13
**最終更新**: 2025-10-13
