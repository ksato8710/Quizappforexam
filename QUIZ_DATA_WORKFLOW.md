# クイズ追加フロー＆注意事項

新規クイズを追加する際の手順をまとめています。データベースへの追加方法を記載しています。

## 前提
- このクイズは、小学校高学年のこどもが、中学受験のために実施するものです。
  - クイズの内容は、これに見合ったものとしてください 
- クイズの回答は、「自由入力」か、「選択式」を選んで選択としてください
- クイズの解説は、できるだけ丁寧にし、読み手が興味を持てる内容や、関連するトピックについても言及してください。
- クイズの回答は、自由入力の場合は、「一つ」に絞ってください。複数の回答を求めたい場合は、「選択式」としてください。
- クイズの回答の、漢字表記に、小学生が間違えやすいものが含まれていれば、解説で目立つように補足してください。
- 社会に関しては、起きた事件や政策の影響や、目的を問う問題を、「選択式」で出題するように努めてください。

## 1. クイズのもととなるデータソースの読み込み
- /Users/satokeita/Dev/Quizappforexam/quiz_source/input に存在するファイルを読み込む
- フォルダが存在する場合は、該当フォルダ内のファイルを一つずつ順番に処理する
  - 「教科」「単元名」は、フォルダ名から抽出すること。フォルダ名から判断出来ない場合は、ファイル名から。それで判断出来ない場合は問題内容から類推すること  

## 2. 事前チェック
- UUIDは自動生成されるため、手動での採番は不要です。
- `order` は単元内の表示順を保つため、同じ単元内では昇順を維持することを推奨。

## 3. クイズデータの追加方法

> [!IMPORTANT]
> **事前準備: `unit_id`の確認**
> クイズを追加する前に、どの単元に紐付けるかを示す`unit_id`（UUID）を`units`テーブルから調べておく必要があります。
> ```sql
> SELECT id, name FROM units WHERE subject = '理科';
> ```
> 上記のようなクエリで、追加したいクイズの単元名に対応する`id`を確認してください。

### 方法A: SQLで直接追加（推奨）
supabaseに直接SQLでアクセスして最新のデータ構造を把握したうえで、INSERTすること。
以下、例を示す。

1. **クイズデータをSQL形式で準備**
   ```sql
   INSERT INTO quizzes (question, answer, explanation, type, difficulty, subject, unit_id, "order")
   VALUES
   ('問題文1', '正解1', '解説1', 'text', 1, '理科', '取得したunit_idをここに貼り付け', 1),
   ('問題文2', '正解2', '解説2', 'text', 1, '理科', '取得したunit_idをここに貼り付け', 2);
   ```

2. **選択肢付きクイズの場合**
   ```sql
   INSERT INTO quizzes (question, answer, explanation, type, options, difficulty, subject, unit_id, "order")
   VALUES (
     '問題文',
     '正解',
     '解説',
     'multiple-choice',
     '["選択肢1", "選択肢2", "選択肢3", "選択肢4"]'::jsonb,
     1,
     '理科',
     '取得したunit_idをここに貼り付け',
     100
   );
   ```

## 3. データの確認

> [!WARNING]
> **コマンドの利用に関する注意**
> 以下の`curl`コマンド例では、具体的なプロジェクトIDや認証トークンをプレースホルダ形式（例: `${VAR_NAME}`）で示しています。これらの値をドキュメントに直接書き込むことは、セキュリティリスクとなり、メンテナンス性も損ないます。
> 実際の運用では、これらの値を環境変数（例: `$SUPABASE_PROJECT_ID`, `$SUPABASE_ANON_KEY`）やSupabase CLIから動的に取得することを強く推奨します。

### 追加されたクイズの確認（SQL API経由）
```bash
# 事前に環境変数を設定した上で実行してください
# export SUPABASE_PROJECT_ID="your-project-id"
# export SUPABASE_ACCESS_TOKEN="your-service-role-key"

cat > /tmp/query.json << 'EOF'
{"query": "SELECT id, question, unit_id, \"order\" FROM quizzes WHERE unit_id = '調べたい単元のUUID' ORDER BY \"order\""}
EOF

curl -X POST "https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_ID}/database/query" \
  -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
  -H 'Content-Type: application/json' \
  -d @/tmp/query.json | jq .
```

### APIエンドポイントで確認（Edge Function経由）
```bash
# 事前に環境変数を設定した上で実行してください
# export SUPABASE_PROJECT_URL="https://your-project-id.supabase.co"
# export SUPABASE_ANON_KEY="your-anon-key"
# export FUNCTION_NAME="your-function-name" # 例: make-server-856c5cf0

curl "${SUPABASE_PROJECT_URL}/functions/v1/${FUNCTION_NAME}/quizzes?unit_id=調べたい単元のUUID" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" | jq .
```

## 4. データ登録完了後の処理

- クイズデータ作成のために読み込んだファイルを、/Users/satokeita/Dev/Quizappforexam/quiz_source/作成済 に移動する
- コンソール上に完了報告を行う。読み込んだファイル名、登録したデータ件数、データ内容の一覧を出力すること


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
