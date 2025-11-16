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

## 動作確認（QA）ガイドライン（必須）
開発完了時は、明らかな不具合を見落とさないために、以下の一般的な確認を短時間で行う。具体機能に依存する詳細手順は記載せず、プロジェクトで再利用可能な粒度に留める。

- スモークテスト: 代表的なユーザーフローを一通り実行（画面遷移・基本操作・主要UIの描画）。
- 画面/ログ: ブラウザコンソールのエラー/例外が出ていないことを確認（赤字のスタックトレースがない）。
- 通信: 主要APIが期待どおりのステータス/簡易内容で応答していることを確認。
- ビルド/テスト: `npm test` と `npm run build` を通す。
- 記録: PR の「Test plan」に実施した流れと観察結果（操作→見えたもの）を簡潔に記載。
- 補足: 追加/変更したコンポーネントは「表示される」「入力に反応する」「空/エラー状態の最低限の表示がある」を目視確認。共通ラッパー等は基本性質（子要素が表示される、構造が崩れていない等）のみ軽く確認。
