# Repository Guidelines

## プロジェクト構成・モジュール配置
- `src/`: React + TypeScript のソース。
  - `components/`: UI/機能コンポーネント（例: `Auth.tsx`, `QuizCard.tsx`, `ui/*`）。
  - `utils/`: API クライアントと Supabase クライアント（例: `api-client.ts`, `supabase/client.ts`）。
  - `test/`: テストセットアップ（`setup.ts`）。
  - スタイル: `index.css`（Tailwind v4 ビルド）、`styles/globals.css`。
- `supabase/` と `src/supabase/`: Edge Functions のコードとローカルメタデータ。
- `vite.config.ts`: Vite 設定、エイリアス、Vitest 設定。
- `vercel.json`: Vercel のビルド/出力設定。

## ビルド・テスト・開発コマンド
- `npm i`: 依存関係をインストール。
- `npm run dev`: 開発サーバー起動（`http://localhost:3000`）。
- `npm run build`: 本番ビルドを `build/` に出力。
- `npm test`: Vitest（jsdom）でテストを実行。

## コーディング規約・命名
- 言語: TypeScript + React 18。関数コンポーネントと Hooks を使用。
- スタイリング: Tailwind ユーティリティを優先（インライン style は最小限）。
- ファイル: コンポーネントは `PascalCase.tsx`（例: `QuizSettings.tsx`）、ユーティリティは `camelCase.ts`（例: `api-client.ts`）、テストは `*.spec.tsx` を配置（`src/components` 直下可）。
- インポート: Vite のエイリアス（例: `@/...`）を活用し、相対パスを浅く保つ。

## テスト方針
- フレームワーク: Vitest + Testing Library（`@testing-library/react`, `@testing-library/jest-dom`）。
- セットアップ: グローバルマッチャは `src/test/setup.ts` で読み込み。
- 規約: テスト名は `*.spec.tsx`。ロール/ラベルを用いた振る舞いテストを重視。
- 実行: `npm test`（ウォッチは `vitest --watch`）。コンポーネントと API の境界を重点的に。

## コミット/プルリクエスト
- コミット: 命令形・簡潔な件名（例: `Fix quiz loading issue`）。関連変更はまとめる。
- PR: 概要、関連 Issue、UI 変更のスクリーンショット、テスト計画（実行コマンド・影響範囲）を含める。差分は焦点を絞り、主要ファイルを明記（例: `src/components/Auth.tsx`）。

## セキュリティと設定
- Supabase: 公開 anon 設定は `src/utils/supabase/info.tsx`（自動生成）。シークレットのハードコードは禁止。Edge Functions は `SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を環境変数で設定。
- 認証: アクセストークンは `localStorage` から読み出し、必要な API に `Authorization` として送信。
- ルーティング/API: フロントエンドは `utils/api-client.ts` 経由で `https://<projectId>.supabase.co/functions/v1/make-server-856c5cf0/*` を呼び出す。
