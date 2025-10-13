#!/bin/bash

# Kafka セットアップスクリプト
# Upstash Kafka の認証情報を入力して、Render の環境変数設定用のコマンドを生成

echo "========================================="
echo "Kafka 環境変数セットアップスクリプト"
echo "========================================="
echo ""
echo "Upstash Console から以下の情報を取得してください:"
echo "https://console.upstash.com/"
echo ""

# ユーザーに入力を求める
read -p "KAFKA_BROKERS (例: xxx-xxx.upstash.io:9092): " KAFKA_BROKERS
read -p "KAFKA_USERNAME: " KAFKA_USERNAME
read -sp "KAFKA_PASSWORD: " KAFKA_PASSWORD
echo ""
echo ""

# サービス名の配列
SERVICES=(
  "crm-auth-service-smfm"
  "crm-customer-service"
  "crm-sales-activity-service"
  "crm-opportunity-service"
  "crm-analytics-service"
)

# クライアントIDの配列（サービス名に対応）
CLIENT_IDS=(
  "auth-service"
  "customer-service"
  "sales-activity-service"
  "opportunity-service"
  "analytics-service"
)

# 出力ファイル
OUTPUT_FILE="kafka-env-commands.txt"

echo "=========================================" > $OUTPUT_FILE
echo "Render 環境変数設定コマンド" >> $OUTPUT_FILE
echo "=========================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "以下のコマンドを Render Dashboard の各サービスの Environment タブで実行してください。" >> $OUTPUT_FILE
echo "または、手動で環境変数を追加してください。" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# 各サービスに対してコマンドを生成
for i in "${!SERVICES[@]}"; do
  SERVICE="${SERVICES[$i]}"
  CLIENT_ID="${CLIENT_IDS[$i]}"

  echo "=========================================" >> $OUTPUT_FILE
  echo "Service: $SERVICE" >> $OUTPUT_FILE
  echo "=========================================" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
  echo "KAFKA_ENABLED=true" >> $OUTPUT_FILE
  echo "KAFKA_BROKERS=$KAFKA_BROKERS" >> $OUTPUT_FILE
  echo "KAFKA_USERNAME=$KAFKA_USERNAME" >> $OUTPUT_FILE
  echo "KAFKA_PASSWORD=$KAFKA_PASSWORD" >> $OUTPUT_FILE
  echo "KAFKA_CLIENT_ID=$CLIENT_ID" >> $OUTPUT_FILE
  echo "" >> $OUTPUT_FILE
done

echo "" >> $OUTPUT_FILE
echo "=========================================" >> $OUTPUT_FILE
echo "注意事項" >> $OUTPUT_FILE
echo "=========================================" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "1. 上記の環境変数を各サービスに追加してください" >> $OUTPUT_FILE
echo "2. 環境変数追加後、各サービスを再デプロイしてください" >> $OUTPUT_FILE
echo "3. ログで 'Kafka Producer connected' を確認してください" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "✅ 環境変数設定コマンドを生成しました: $OUTPUT_FILE"
echo ""
echo "次のステップ:"
echo "1. $OUTPUT_FILE を開いて内容を確認"
echo "2. Render Dashboard で各サービスの Environment タブを開く"
echo "3. 環境変数を追加"
echo "4. 各サービスを再デプロイ"
echo ""
echo "========================================="
echo "Upstash Kafka トピック作成"
echo "========================================="
echo ""
echo "Upstash Console で以下のトピックを作成してください:"
echo ""
echo "  - customer.events"
echo "  - user.events"
echo "  - sales-activity.events"
echo "  - opportunity.events"
echo "  - notification.events"
echo ""
echo "各トピックの設定:"
echo "  - Partitions: 1"
echo "  - Retention Time: 7 days"
echo "  - Max Message Size: 1MB"
echo ""
