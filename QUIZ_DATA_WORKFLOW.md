# クイズ追加フロー＆注意事項

社会/理科などの新規クイズを追加する際の手順をまとめています。`defaultQuizzes` へ追加 → Supabase KV への反映 → 検証という流れを守ってください。

## 1. 事前チェック
- **単元 (`unit`) が明確な問題のみ**を復元・追加対象とする（指示通り）。
- 既存IDが重複しないよう、理科セット（`quiz:1`〜`32`）とは別の連番を採番する。社会/復旧用データは `quiz:201`〜 を使用中。
- `order` は単元内の表示順を保つが、IDとは独立なので被っても良い。ただしソート UI の挙動を考え、同じ単元内では昇順を維持。

## 2. `defaultQuizzes` へ追記
1. バックアップデータを JSON 等で整理（例: `/tmp/social_new.json`）。
2. `supabase/functions/make-server-856c5cf0/index.ts` の `defaultQuizzes` 配列末尾へ TypeScript 形式で追加。
   - `type`, `choices`, `unit`, `subject`, `categoryId`, `difficulty`, `order` を漏れなく記入。
   - Markdown を含む `explanation` はシングルクォート内で扱い、改行は `\n`。
3. `npm run lint` 等は不要だが、構文エラーがないか VS Code や `tsc` のハイライトを確認。

## 3. Supabase KV への反映
1. 追加したクイズ分を `[{ "key": "quiz:201", "value": {...}}, ...]` 形式に変換。`/tmp/social_payload.json` のようにファイル化。
2. `curl` で upsert：
   ```bash
   curl -s -X POST https://gwaekeqhrihbhhiezupg.supabase.co/rest/v1/kv_store_856c5cf0 \
     -H "apikey: ${SUPABASE_SECRET}" \
     -H "Authorization: Bearer ${SUPABASE_SECRET}" \
     -H "Content-Type: application/json" \
     -H "Prefer: resolution=merge-duplicates" \
     -d @/tmp/social_payload.json
   ```
3. レスポンスが空でも成功。`curl ...?key=eq.quiz%3A201` などでサンプリング確認。

## 4. エッジ関数の再デプロイ
クイズデータを変更したら `supabase functions deploy make-server-856c5cf0` を実行し、最新の `defaultQuizzes` が初期化エンドポイントにも反映されるようにする。

## 5. 動作確認
- `/make-server-856c5cf0/quizzes` を叩き、64件（理科32 + 社会32）のように期待数が返るかチェック。
- フロントエンド `QuizList` で `unit` や `subject` フィルタが崩れていないか、簡易スモークを行う。

## 6. 注意事項
- **元データを上書きしない**：既存IDを流用すると Supabase 側で直近のメタデータが消える。必ず新IDを割り振る。
- **JSON と TS 定義のずれに注意**：KV にある `value` と `defaultQuizzes` が一致しないと、初期化ボタンで古いデータに戻るため、常に同内容を同期する。
- **機密情報の共有禁止**：Secret key 等を issue や公開リポジトリに記載しない。

---
（最終更新: 2024-XX-XX）
