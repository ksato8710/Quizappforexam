# クイズ追加フロー＆注意事項

社会/理科などの新規クイズを追加する際の手順をまとめています。PostgreSQLデータベースへの追加方法を記載しています。

## 1. 事前チェック
- **単元 (`unit`) が明確な問題のみ**を追加対象とする。
- UUIDは自動生成されるため、手動での採番は不要です。
- `order` は単元内の表示順を保つため、同じ単元内では昇順を維持することを推奨。

## 2. クイズデータの追加方法

### 方法A: SQLで直接追加（推奨）

1. **クイズデータをSQL形式で準備**
   ```sql
   INSERT INTO quizzes (question, answer, explanation, type, difficulty, subject, unit, "order")
   VALUES
   ('問題文1', '正解1', '解説1', 'text', 1, '理科', '光', 1),
   ('問題文2', '正解2', '解説2', 'text', 1, '理科', '光', 2);
   ```

2. **Supabase Management APIで実行**
   ```bash
   # クエリをファイルに保存
   cat > /tmp/add_quizzes.json << 'EOF'
   {
     "query": "INSERT INTO quizzes (question, answer, explanation, type, difficulty, subject, unit, \"order\") VALUES ('問題文', '正解', '解説', 'text', 1, '理科', '光', 100)"
   }
   EOF

   # APIで実行
   export SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ')
   curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
     -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
     -H 'Content-Type: application/json' \
     -d @/tmp/add_quizzes.json
   ```

3. **選択肢付きクイズの場合**
   ```sql
   INSERT INTO quizzes (question, answer, explanation, type, options, difficulty, subject, unit, "order")
   VALUES (
     '問題文',
     '正解',
     '解説',
     'multiple-choice',
     '["選択肢1", "選択肢2", "選択肢3", "選択肢4"]'::jsonb,
     1,
     '理科',
     '光',
     100
   );
   ```

### 方法B: defaultQuizzes配列を更新（バックアップ用途）

`defaultQuizzes`配列は、データベース初期化時のバックアップとして機能します。

1. **`src/supabase/functions/server/index.tsx`を編集**
   ```typescript
   const defaultQuizzes = [
     // 既存のクイズ...
     {
       id: "自動生成されるため不要",
       question: "問題文",
       answer: "正解",
       explanation: "解説",
       type: "text",
       difficulty: 1,
       subject: "理科",
       unit: "光",
       order: 100
     },
   ];
   ```

2. **エッジ関数を再デプロイ**
   ```bash
   cp src/supabase/functions/server/index.tsx supabase/functions/make-server-856c5cf0/index.ts
   SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ') \
   supabase functions deploy make-server-856c5cf0
   ```

## 3. データの確認

### 追加されたクイズの確認
```bash
# 全クイズ数を確認
cat > /tmp/count.json << 'EOF'
{"query": "SELECT COUNT(*) FROM quizzes"}
EOF
curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/count.json | jq .

# 特定の単元のクイズを確認
cat > /tmp/unit.json << 'EOF'
{"query": "SELECT id, question, unit, \"order\" FROM quizzes WHERE unit = '光' ORDER BY \"order\""}
EOF
curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/unit.json | jq .
```

### APIエンドポイントで確認
```bash
# クイズ取得エンドポイントで確認
curl "https://gwaekeqhrihbhhiezupg.supabase.co/functions/v1/make-server-856c5cf0/quizzes?unit=光" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YWVrZXFocmloYmhoaWV6dXBnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxNjQ3NzIsImV4cCI6MjA3ODc0MDc3Mn0.--tnWp-Dzmie0L8ReOEoKgWKvrXC2jNPzMx6UsNGIxs" | jq .
```

## 4. クイズの更新・削除

### クイズの更新
```sql
UPDATE quizzes
SET question = '更新された問題文',
    answer = '更新された正解',
    explanation = '更新された解説'
WHERE id = 'クイズのUUID';
```

### クイズの削除
```sql
DELETE FROM quizzes WHERE id = 'クイズのUUID';
```

**注意**: 削除する前に、そのクイズに対する回答履歴（`user_answers`テーブル）も削除されることに注意してください（CASCADE設定により自動削除）。

## 5. カテゴリの管理

### カテゴリの追加
```sql
INSERT INTO categories (name, "order")
VALUES ('新しいカテゴリ', 10);
```

### クイズにカテゴリを紐付け
```sql
UPDATE quizzes
SET category_id = 'カテゴリのUUID'
WHERE unit = '特定の単元';
```

## 6. 注意事項

### 6-1. データ型に関する注意
- **options**: 選択肢付きクイズの場合、JSONB型として配列を保存します
  - 正: `'["選択肢1", "選択肢2"]'::jsonb`
  - 誤: `["選択肢1", "選択肢2"]`（文字列として囲む必要あり）

- **order**: 予約語のため、クエリ内では `"order"` とダブルクォートで囲む必要があります

### 6-2. データ整合性
- `category_id` に存在しないUUIDを指定するとエラーになります（外部キー制約）
- `user_answers` テーブルと紐付いているクイズを削除すると、関連する回答履歴も削除されます

### 6-3. バックアップ
- `defaultQuizzes` 配列は初期化用のバックアップとして機能します
- 重要なクイズデータは定期的に SQL DUMP などでバックアップすることを推奨

### 6-4. セキュリティ
- Secret key や Access Token を公開リポジトリに記載しない
- `SupabaseSecret.md` は `.gitignore` に含まれています

## 7. 一括追加の例

複数のクイズを一度に追加する場合：

```sql
INSERT INTO quizzes (question, answer, explanation, type, difficulty, subject, unit, "order")
VALUES
  ('問題1', '正解1', '解説1', 'text', 1, '理科', '光', 1),
  ('問題2', '正解2', '解説2', 'text', 1, '理科', '光', 2),
  ('問題3', '正解3', '解説3', 'text', 2, '理科', '光', 3),
  ('問題4', '正解4', '解説4', 'multiple-choice', 1, '社会', '江戸時代', 1)
RETURNING id, question;
```

`RETURNING` 句を使用すると、追加されたクイズのIDと問題文を確認できます。

---

（最終更新: 2025-11-20 - RDBベースのワークフローに更新）
