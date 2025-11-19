# Supabase 操作ガイド

本プロジェクトで Supabase を扱う際の共通手順をまとめています。Edge Function の再デプロイや KV ストアの操作時に参照してください。

## 1. 認証情報の確認
- `SupabaseSecret.md` に Publishable key / Secret key / Access Token がまとまっています。
- CLI や REST API を叩くときは **Secret key** を `apikey` と `Authorization: Bearer` に流用します（サービスロール権限のため取り扱い注意）。
- CLI 利用時は以下のように環境変数へセットしておくと便利です。

```bash
export SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ')
```

## 2. Supabase CLI での Edge Function デプロイ
1. 変更した `supabase/functions/make-server-856c5cf0` 配下を確認。
2. プロジェクトをリンク（初回のみ）。
   ```bash
   supabase link --project-ref gwaekeqhrihbhhiezupg
   ```
3. 関数をデプロイ。
   ```bash
   supabase functions deploy make-server-856c5cf0
   ```
4. 必要に応じて `supabase functions serve make-server-856c5cf0` でローカル確認。

## 3. KV ストア（`kv_store_856c5cf0`）へのデータ投入
### 3-1. JSON ペイロード作成
- `[{ "key": "quiz:201", "value": {...}}, ...]` 形式で配列を組み、ファイルに保存（例: `/tmp/social_payload.json`）。

### 3-2. upsert 実行（REST API）
```bash
curl -s -X POST \
  https://gwaekeqhrihbhhiezupg.supabase.co/rest/v1/kv_store_856c5cf0 \
  -H "apikey: ${SUPABASE_SECRET}" \
  -H "Authorization: Bearer ${SUPABASE_SECRET}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d @/tmp/social_payload.json
```
- `Prefer: resolution=merge-duplicates` を付けると key が存在していてもマージされます。
- 200 が返れば成功。エラー時はメッセージが JSON で返るのでそのまま確認。

## 4. KV ストア内容の検証
### 4-1. 単一キーを確認
```bash
curl -s \
  'https://gwaekeqhrihbhhiezupg.supabase.co/rest/v1/kv_store_856c5cf0?select=key%2Cvalue&key=eq.quiz%3A201' \
  -H "apikey: ${SUPABASE_SECRET}" \
  -H "Authorization: Bearer ${SUPABASE_SECRET}"
```

### 4-2. プレフィックス検索
```bash
curl -s \
  'https://gwaekeqhrihbhhiezupg.supabase.co/rest/v1/kv_store_856c5cf0?select=key&key=like.quiz%3A2%' \
  -H "apikey: ${SUPABASE_SECRET}" \
  -H "Authorization: Bearer ${SUPABASE_SECRET}"
```

## 5. Edge Function での初期化エンドポイント
- `/make-server-856c5cf0/debug/init-quizzes` と `/make-server-856c5cf0/debug/init-categories` を叩くと、サーバー側で `defaultQuizzes` / `categories` を KV に再書き込みできます。
- 実行例:
  ```bash
  curl -s -X POST \
    https://gwaekeqhrihbhhiezupg.supabase.co/functions/v1/make-server-856c5cf0/debug/init-quizzes \
    -H "Authorization: Bearer ${SUPABASE_PUBLISHABLE}"
  ```
  - 公開エンドポイントなので Publishable key で OK。レスポンスに `count` と書き込まれた値が返ります。

## 6. トラブルシューティング
- **401 / 403**: Secret key が正しいか、Bearer に付け忘れがないか確認。
- **429**: 連続リクエストでレート制限。少し時間を空けて再実行。
- **KV に反映されない**: `curl` 成功後は `/make-server-856c5cf0/quizzes` を GET し、ログに `Quizzes initialized` などが出ていないか確認。Edge Function 側にエラーがある場合は `supabase/functions/make-server-856c5cf0/index.ts` のログを確認し再デプロイ。

---
（最終更新: 2024-XX-XX, この記事は作業体験に基づいています）
