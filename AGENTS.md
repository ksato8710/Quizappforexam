# Repository Guidelines

## 定型タスク
- 読み込み: `/Users/satokeita/Dev/Quizappforexam/branch_dev_flow.md` を読み、記載のフローに厳密に従って開発を実行する。
- 対象: 「auto dev」ラベルかつ open の Issue を1件選定し、branch/worktree を作成して対応する。
- 要点:
  - base ブランチ（`main`/`master`）を判定し最新化
  - Issue 取得→最古（または最小番号）を選択
  - ブランチ名 `issue/<番号>-<slug>`、worktree は `~/Dev/worktrees/Quizappforexam/issue/<番号>-<slug>`
  - 作業は必ず worktree 内でのみ実施
  - 依存が必要なら `npm i`、本番ビルドは `npm run build`
  - コミット → `git push -u origin <branch>` → `gh pr create` で PR 作成
  - 最終出力テンプレに従い、Issue/変更点/コマンド結果/PR を要約
- 表示: ツールが AGENTS.md を読み込む際は、この「定型タスク」節を最初に表示すること。

## プロジェクト構成・モジュール配置
- `src/`: React + TypeScript のソース。
  - `components/`: UI/機能コンポーネント（例: `Auth.tsx`, `QuizCard.tsx`, `ui/*`）。
  - `utils/`: API/Supabase クライアント（例: `api-client.ts`, `supabase/client.ts`）。
  - `test/`: テストセットアップ（`setup.ts`）。
  - スタイル: `index.css`（Tailwind v4 ビルド）、`styles/globals.css`。
- `supabase/` と `src/supabase/`: Edge Functions のコードとローカルメタデータ。
- `vite.config.ts`: Vite のエイリアス/Vitest 設定。
- `vercel.json`: Vercel のビルド/出力設定。

## ビルド・テスト・開発コマンド
- `npm i`: 依存関係をインストール。
- `npm run dev`: 開発サーバーを `http://localhost:3000` で起動。
- `npm run build`: 本番ビルドを `build/` に出力。
- `npm test`: Vitest（jsdom）を実行。`vitest --watch` で監視。

## コーディング規約・命名
- 言語: TypeScript + React 18（関数コンポーネント + Hooks）。
- スタイリング: Tailwind ユーティリティを優先。インライン style は最小限。
- 命名: コンポーネントは `PascalCase.tsx`（例: `QuizSettings.tsx`）、ユーティリティは `camelCase.ts`（例: `api-client.ts`）、テストは `*.spec.tsx`（関連コンポーネント直下可）。
- インポート: Vite のエイリアス `@/...` を使用し、相対パスを浅く保つ。
- インデント: 2 スペース。不要なフォーマット変更は避ける。

## テスト方針
- フレームワーク: Vitest + Testing Library（`@testing-library/react`, `@testing-library/jest-dom`）。
- セットアップ: `src/test/setup.ts` でグローバルマッチャを読み込み。
- 規約: ロール/ラベルで要素を特定し、振る舞いと API 境界を重視。
- 実行: `npm test`（監視は `vitest --watch`）。

## コミット／プルリクエスト
- コミット: 命令形・簡潔な件名（例: `Fix quiz loading issue`）。関連変更はまとめる。
- PR: 概要、関連 Issue、UI 変更のスクリーンショット、テスト計画（コマンドと影響範囲）を含め、主要ファイルを明記（例: `src/components/Auth.tsx`）。

## 言語・コミュニケーション
- 会話・レビュー: メンテナー（依頼者）とのやり取りは基本的に日本語でお願いします（Issue、PR、コメント、レビュー、ドキュメント更新依頼など）。
- コミット/PR: コミットメッセージは英語の命令形を推奨。PR のタイトル/説明やディスカッションは日本語推奨です。

## セキュリティと設定
- Supabase: シークレットのハードコードは禁止。Edge Functions は `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を環境変数で設定。
- 認証: アクセストークンは `localStorage` から読み出し、必要な API に `Authorization` として送信。
<<<<<<< HEAD
- ルーティング/API: フロントエンドは `utils/api-client.ts` 経由で `https://<projectId>.supabase.co/functions/v1/make-server-856c5cf0/*` を呼び出す。

## 動作確認（QA）ガイドライン（必須）
開発完了時は、明らかな不具合を見落とさないために、以下の一般的な確認を短時間で行う。具体機能に依存する詳細手順は記載せず、プロジェクトで再利用可能な粒度に留める。

- スモークテスト: 代表的なユーザーフローを一通り実行（画面遷移・基本操作・主要UIの描画）。
- 画面/ログ: ブラウザコンソールのエラー/例外が出ていないことを確認（赤字のスタックトレースがない）。
- 通信: 主要APIが期待どおりのステータス/簡易内容で応答していることを確認。
- ビルド/テスト: `npm test` と `npm run build` を通す。
- 記録: PR の「Test plan」に実施した流れと観察結果（操作→見えたもの）を簡潔に記載。
- 補足: 追加/変更したコンポーネントは「表示される」「入力に反応する」「空/エラー状態の最低限の表示がある」を目視確認。共通ラッパー等は基本性質（子要素が表示される、構造が崩れていない等）のみ軽く確認。
=======
- ルーティング/API: `utils/api-client.ts` 経由で `https://<projectId>.supabase.co/functions/v1/make-server-856c5cf0/*` を呼び出す。

## 開発補助ツール
- Playwright MCP: LLM からブラウザ操作を自動化する MCP サーバ。
  - ワークスペース設定: `.vscode/mcp.json`（`npx @playwright/mcp@latest` を参照）
  - 初期化スクリプト: `tools/mcp/playwright-init.js`（`localStorage.accessToken` 注入）
  - 詳細: `docs/mcp-playwright.md` を参照。
>>>>>>> 1f0f9f2 (Docs/Config: introduce Playwright MCP server config and usage)
