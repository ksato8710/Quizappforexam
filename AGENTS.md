# Repository Guidelines

> **言語ポリシー**: このプロジェクトに関するエージェントとユーザーの対話（CLI/Issue/PR コメントを含む）は、原則として日本語で行ってください。例外が必要な場合のみ明示的に相談すること。

## エージェント運用方針
- 可能な作業（pull/push/テスト実行など）は原則としてエージェント自身が実行する。実行可否に不確実性がある場合は、すぐに確認コマンドを試し判断する。
- 自分で完了できると判明した作業については、ユーザーへ依頼するのではなく積極的にエージェント側で実施する。

## プロジェクト概要
- Vite 6 + React 18 + TypeScript の SPA。最上位は `src/App.tsx` で、ログイン（`Auth.tsx`）、クイズ進行（`QuizCard.tsx`/`QuizList.tsx`）、設定（`QuizSettings.tsx`）を切り替えている。
- スタイリングは Tailwind CSS v4（`src/index.css` と `src/styles/globals.css`）を採用。色/半径トークンを CSS 変数化しているため、テーマ追加時は `globals.css` を更新してからユーティリティを当てる。
- UI キットは shadcn/radix 派生の `src/components/ui/*` にまとまっている。まず既存の UI コンポーネントを再利用し、足りない場合のみ追加する。
- API との通信は Supabase Edge Function `make-server-856c5cf0` を Hono（Deno）で実装し、`src/utils/api-client.ts` がすべての HTTP 呼び出しを吸収する。直接 `fetch` せずにこのクライアントに処理を追加する。

## ディレクトリ構成・主要モジュール
- `src/components/`: 画面固有 UI。`ui/` 配下は再利用可能な低レベル部品、`figma/` には Figma Auto Layout 由来の静的 Node が置かれる。テスト（`*.spec.tsx`）は対象コンポーネントと同じディレクトリに置いてよい。
- `src/utils/`: `api-client.ts` と `supabase/*`。`client.ts` でブラウザ Supabase クライアントをシングルトン管理し、`info.tsx` は自動生成される `projectId/publicAnonKey` を提供する（直接編集しない）。
- `src/styles/`: Tailwind カスタムテーマ。ダークモードの挙動や CSS 変数をここで集中管理する。
- `src/test/setup.ts`: Vitest + Testing Library 用の matcher 拡張。新しい setUp が必要ならここに追記する。
- `supabase/functions/make-server-856c5cf0/`: Edge Function（Hono + `kv_store.ts`）本体。`index.ts` に REST ルート、`kv_store.ts` に Key-Value 操作用のラッパがあり、Supabase Database テーブル `kv_store_856c5cf0` を操作する。
- Supabase運用やクイズデータ更新の具体的な手順は `SUPABASE_OPERATIONS.md` と `QUIZ_DATA_WORKFLOW.md` を参照。
- `quiz_source/`: 元データとなる教材 Markdown。クイズ更新時はここを参照しつつ、Edge Function 側の初期化処理を更新する。

## 開発・ビルド・テストコマンド
- `npm i`: 依存関係インストール。
- `npm run dev`: 開発サーバー（http://localhost:3000）。Vite のモジュール解決（`@` → `src/`）を利用すること。
- `npm run build`: `build/` へ本番ビルド出力（`vite build`）。
- `npm test`: Vitest（`run` モード）。CI 相当で使用。
- `npm run test:watch`: 開発時のループ。
- `npm run test:ui`: Vitest UI（ブラウザ）でテストを確認。

## コーディング規約・命名
- すべての画面は関数コンポーネント + React Hooks で実装。ステートは `App.tsx` を中心に `Auth`/`QuizSettings`/`QuizCard` に渡す。
- ファイル命名: UI/ページは `PascalCase.tsx`、ユーティリティ/フックは `camelCase.ts`、テストは `*.spec.tsx`。
- スタイリングは Tailwind ユーティリティを優先し、複雑なバリアントは `class-variance-authority` + `clsx` を使用。独自 CSS を書く場合は `globals.css` へトークン追加→ユーティリティ化する。
- UI を新規追加する際は `src/components/ui` の既存実装（Radix ラッパ）から流用し、一貫したアクセシビリティ/トークンを守る。
- `@/...` エイリアスを使って import パスを浅く保つ。Radix/Supabase 等は `vite.config.ts` のバージョン固定 alias に合わせる。

## API / 状態管理の注意点
- `src/utils/api-client.ts` がベース URL、認証ヘッダー付与、エラーハンドリングを担う。新規エンドポイントはここにメソッドを追加し、上位から呼び出す。
- ブラウザ側のアクセス・トークンは `localStorage` の `accessToken` キーに保存し、`useSupabaseClient`（`getSupabaseClient`）から取得した Supabase クライアントで検証する。直接 `localStorage` を読まない。
- 認証フローは Edge Function の `/login` `/signup` と Supabase Auth を組み合わせている。UI 側でトークンを削除する際は `supabase.auth.signOut()` も呼ぶ。
- クイズ/カテゴリの初期データは Edge Function (`initializeQuizzes`/`initializeCategories`) で KV に書き込む。API 追加/調整時は `kv_store.ts` のスキーマを守ること。

## テスト方針
- フレームワーク: Vitest + Testing Library (`@testing-library/react`, `@testing-library/jest-dom`)。環境は jsdom、セットアップは `src/test/setup.ts` に集約。
- テストファイルは対象と同じディレクトリに配置し、ロール/ラベル/テキストベースの振る舞いテストを優先。モックは極力 API クライアント階層で行う。
- 主要ユースケース（Auth、QuizSettings、QuizList）に回帰テストを追加し、状態遷移（表示/回答/完了）をカバーする。
- CLI 実行例: `npm test`（CI）、`npm run test:watch`（開発）、UI で確認する場合は `npm run test:ui`。

## コミット/プルリクエスト
- コミットメッセージは命令形・簡潔に（例: `Fix quiz history filters`）。関連変更を一つのコミットにまとめ、不要なフォーマット変更は避ける。
- PR には概要、関連 Issue、UI 変更のスクリーンショット（可能なら before/after）、テスト計画（実行コマンドと観察結果）を含める。差分説明には主要ファイルパスを記載（例: `src/components/QuizSettings.tsx`、`supabase/functions/make-server-856c5cf0/index.ts`）。

## セキュリティと設定
- Supabase の URL/鍵は Edge Function 実行時に `SUPABASE_URL` `SUPABASE_SERVICE_ROLE_KEY` から読み込む。ローカルで serve する場合も同名変数を .env などで渡す。
- フロントエンド用の anon key と projectId は `src/utils/supabase/info.tsx` に自動生成される。値を差し替える場合は生成スクリプトを経由し、ファイルを手で書き換えない。
- `SupabaseSecret.md` に書かれているキーはドキュメント用途。公開リポジトリにはコミットしない／差し替えること。
- API 呼び出しは `https://<projectId>.supabase.co/functions/v1/make-server-856c5cf0/*` 固定。ベース URL を変更する際は `api-client.ts` と Edge Function のルート名を合わせる。

## 動作確認（QA）ガイドライン（必須）
開発完了時は、明らかな不具合を見落とさないために、以下の一般的な確認を短時間で行う。具体機能に依存する詳細手順は記載せず、プロジェクトで再利用可能な粒度に留める。

- スモークテスト: 代表的なユーザーフロー（ログイン→クイズ設定→解答→履歴/統計）を実行し、画面遷移・主要 UI が描画されることを確認。
- 画面/ログ: ブラウザコンソールに赤字エラーが出ていないことを確認。Edge Function のレスポンスも DevTools で 2xx かを軽く見る。
- 通信: 主要 API が期待どおりのステータス/負荷で応答すること（`/login` `/quizzes` `/stats` など）。異常値は Toast などの UI で表示されるか確認。
- ビルド/テスト: `npm test` と `npm run build` を通す。エッジ関連変更がある場合は supabase CLI や `supabase functions serve make-server-856c5cf0` でローカル動作確認を追加。
- 記録: PR の「Test plan」に実施した流れと観察結果（操作→見えたもの）を簡潔に記載。
- 補足: 追加/変更したコンポーネントは「表示される」「入力に反応する」「空/エラー状態の最低限の表示がある」を目視確認。共通ラッパー等は基本性質（子要素が表示される、構造が崩れていない等）のみ軽く確認。
