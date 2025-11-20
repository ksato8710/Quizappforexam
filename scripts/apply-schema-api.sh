#!/bin/bash

# Supabase Management APIを使用してSQLスキーマを適用するスクリプト

ACCESS_TOKEN="sbp_1e9317e01631f9a044e6dbcceb2b95fc5d1f52b4"
PROJECT_REF="gwaekeqhrihbhhiezupg"
API_URL="https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query"

# SQLファイルを読み込んでJSON形式に変換
SQL_FILE="supabase/migrations/001_create_schema.sql"

if [ ! -f "$SQL_FILE" ]; then
  echo "Error: SQL file not found: $SQL_FILE"
  exit 1
fi

echo "================================================="
echo "Applying SQL Schema via Supabase Management API"
echo "================================================="

# SQL全体を読み込んで実行
SQL_CONTENT=$(cat "$SQL_FILE")

# JSONペイロードを作成
JSON_PAYLOAD=$(jq -n --arg sql "$SQL_CONTENT" '{query: $sql}')

# APIを使用してSQLを実行
echo "Executing SQL schema..."
RESPONSE=$(curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "$JSON_PAYLOAD")

echo "Response:"
echo "$RESPONSE" | jq . 2>/dev/null || echo "$RESPONSE"

echo ""
echo "================================================="
echo "Schema application completed!"
echo "================================================="
