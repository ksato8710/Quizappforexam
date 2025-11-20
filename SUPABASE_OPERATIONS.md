# Supabase 操作ガイド

本プロジェクトで Supabase を扱う際の共通手順をまとめています。Edge Function の再デプロイやデータベース操作時に参照してください。

## 1. 認証情報の確認
- `SupabaseSecret.md` に Publishable key / Secret key / Access Token がまとまっています。
- CLI や REST API を叩くときは **Access Token** を使用します。
- CLI 利用時は以下のように環境変数へセットしておくと便利です。

```bash
export SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ')
```

## 2. Supabase CLI での Edge Function デプロイ
1. 変更した `src/supabase/functions/server/index.tsx` を確認。
2. デプロイディレクトリにコピー。
   ```bash
   cp src/supabase/functions/server/index.tsx supabase/functions/make-server-856c5cf0/index.ts
   ```
3. プロジェクトをリンク（初回のみ）。
   ```bash
   SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ') \
   supabase link --project-ref gwaekeqhrihbhhiezupg
   ```
4. 関数をデプロイ。
   ```bash
   SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ') \
   supabase functions deploy make-server-856c5cf0
   ```
5. 必要に応じて `supabase functions serve make-server-856c5cf0` でローカル確認。

## 3. PostgreSQL データベース操作

### 3-1. データベースへの直接アクセス
Supabase Management API を使用してSQLクエリを実行できます：

```bash
# クエリをファイルに保存
cat > /tmp/query.json << 'EOF'
{
  "query": "SELECT * FROM profiles LIMIT 10"
}
EOF

# APIを使用してクエリを実行
curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/query.json | jq .
```

### 3-2. クイズデータの追加
クイズは `quizzes` テーブルに直接INSERT、またはエッジ関数の `defaultQuizzes` 配列を更新してデプロイします。

**方法1: SQLで直接追加**
```bash
cat > /tmp/insert_quiz.json << 'EOF'
{
  "query": "INSERT INTO quizzes (question, answer, explanation, type, difficulty, subject, unit, \"order\") VALUES ('新しい問題', '正解', '解説', 'text', 1, '理科', '単元名', 100)"
}
EOF

curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/insert_quiz.json
```

**方法2: defaultQuizzes配列を更新**
1. `src/supabase/functions/server/index.tsx` の `defaultQuizzes` 配列に追加
2. エッジ関数を再デプロイ（セクション2参照）
3. 初期化エンドポイントを叩く（必要に応じて）

### 3-3. データの確認
```bash
# 全クイズ数の確認
cat > /tmp/count_quizzes.json << 'EOF'
{
  "query": "SELECT COUNT(*) FROM quizzes"
}
EOF

curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/count_quizzes.json | jq .

# 特定の単元のクイズを確認
cat > /tmp/unit_quizzes.json << 'EOF'
{
  "query": "SELECT id, question, unit FROM quizzes WHERE unit = '光' ORDER BY \"order\""
}
EOF

curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/unit_quizzes.json | jq .
```

## 4. Edge Function のエンドポイント

### 4-1. 公開エンドポイント（認証不要、ただしanon keyが必要）
- `GET /make-server-856c5cf0/health` - ヘルスチェック
- `GET /make-server-856c5cf0/quizzes` - クイズ一覧取得（フィルタ可能）
- `GET /make-server-856c5cf0/categories` - カテゴリ一覧取得
- `POST /make-server-856c5cf0/login` - ログイン
- `POST /make-server-856c5cf0/signup` - サインアップ

### 4-2. 認証済みエンドポイント（アクセストークンが必要）
- `GET /make-server-856c5cf0/stats` - ユーザー統計取得
- `GET /make-server-856c5cf0/history` - 回答履歴取得
- `POST /make-server-856c5cf0/answers` - 回答を保存
- `POST /make-server-856c5cf0/complete-quiz` - クイズ完了を記録

### 4-3. 実行例
```bash
# ヘルスチェック
curl https://gwaekeqhrihbhhiezupg.supabase.co/functions/v1/make-server-856c5cf0/health \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YWVrZXFocmloYmhoaWV6dXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjQ3NzIsImV4cCI6MjA3ODc0MDc3Mn0.--tnWp-Dzmie0L8ReOEoKgWKvrXC2jNPzMx6UsNGIxs"

# クイズ取得（単元でフィルタ）
curl "https://gwaekeqhrihbhhiezupg.supabase.co/functions/v1/make-server-856c5cf0/quizzes?unit=光" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YWVrZXFocmloYmhoaWV6dXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjQ3NzIsImV4cCI6MjA3ODc0MDc3Mn0.--tnWp-Dzmie0L8ReOEoKgWKvrXC2jNPzMx6UsNGIxs"
```

## 5. データベーススキーマ

現在のデータベースは以下のテーブルで構成されています：

- `profiles` - ユーザープロファイル（id, name, created_at）
- `categories` - クイズカテゴリ（id, name, order）
- `quizzes` - クイズデータ（id, question, answer, explanation, type, options, difficulty, subject, unit, category_id, order）
- `user_answers` - 回答履歴（id, user_id, quiz_id, user_answer, is_correct, answered_at）
- `user_statistics_view` - ユーザー統計ビュー（user_id, total_answers, total_correct）

## 6. トラブルシューティング
- **401 / 403**: Access Token やanon keyが正しいか確認。
- **429**: 連続リクエストでレート制限。少し時間を空けて再実行。
- **500エラー**: Edge Function のログを確認。Supabase Dashboard > Edge Functions > Logs で詳細を確認できます。
- **データが反映されない**: デプロイが正しく完了しているか確認。`/health` エンドポイントが応答するか確認。

## 7. 重要な注意事項

### 7-1. メールドメイン
ユーザー認証では、ユーザー名から自動的にメールアドレスを生成しています：
- フォーマット: `{username}@quizapp.test`
- 例: ユーザー名 `keita` → メールアドレス `keita@quizapp.test`

### 7-2. パスワード管理
- パスワードは `auth.users` テーブル（Supabase管理）に暗号化されて保存されます
- カスタムテーブルにはパスワードを保存しません
- パスワードリセットが必要な場合は、Supabase Dashboardから手動で操作します

### 7-3. データ移行履歴
- 2025-11-20: KVストアからPostgreSQLリレーショナルデータベースへ移行完了
- 移行スクリプト: `scripts/migrate-kv-to-rdb-v2.ts`
- 移行詳細: `DB_MIGRATION_PLAN.md` 参照

---
（最終更新: 2025-11-20）
