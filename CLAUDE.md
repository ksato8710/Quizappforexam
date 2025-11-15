# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイダンスを提供します。

## プロジェクト概要

江戸時代クイズアプリ - ユーザー認証とデータ永続化のためにSupabaseバックエンドを使用したReactベースのクイズアプリケーションです。ユーザーはログイン、クイズへの回答、進捗の追跡、統計の表示が可能です。

オリジナルデザイン: https://www.figma.com/design/7aFG88YxwoO71kv7HgfdAq/Quiz-App-for-Edo-Period

## 開発コマンド

```bash
# 依存関係のインストール
npm i

# 開発サーバーの起動（ポート3000で実行、ブラウザが自動的に開きます）
npm run dev

# 本番用ビルド
npm build
```

注意: このプロジェクトにはテストスクリプトやリンティングコマンドは設定されていません。

## アーキテクチャ

### フロントエンドスタック
- **React 18** with TypeScript
- **Vite** ビルドツール（ポート3000）
- **Tailwind CSS** と充実したRadix UIコンポーネントライブラリ
- **Supabase** 認証とバックエンドサービス

### アプリケーション構造の要点

#### 状態管理とデータフロー
アプリは`App.tsx`を中心に構築され、すべての主要な状態を管理します:
- 認証状態とユーザーセッション
- クイズの進行状況（現在のインデックス、完了ステータス）
- 回答の検証とスコアリング
- ユーザー統計

データは3つの主要なフェーズを経て流れます:
1. **認証** → `Auth.tsx`コンポーネントがSupabase Authを介してログイン/サインアップを処理
2. **クイズセッション** → `QuizCard.tsx`が質問を表示し、回答を取得
3. **統計** → 完了画面と統計ビューがユーザーのパフォーマンスを表示

#### バックエンド統合
- **APIクライアント** (`src/utils/api-client.ts`): すべてのバックエンド通信のための集中型HTTPクライアント
  - ベースURLパターン: `https://${projectId}.supabase.co/functions/v1/make-server-856c5cf0`
  - 認証トークンの注入を処理
  - すべてのエンドポイントはJSON レスポンスを返す

- **Supabaseクライアント** (`src/utils/supabase/client.ts`): Supabaseクライアントのシングルトンパターン
  - 認証操作専用に使用
  - `src/utils/supabase/info.tsx`から認証情報を読み込み

- **バックエンドサーバー** (`src/supabase/functions/server/index.tsx`): Honoベースのエッジ関数（Denoランタイム）
  - クイズデータ、ユーザープロファイル、統計のためのKVストア
  - すべてのルートに`/make-server-856c5cf0`のプレフィックス
  - クロスオリジンリクエストのためのCORS有効化
  - ユーザー管理にSupabase Admin APIを使用

#### 回答検証ロジック
`App.tsx:139-152`に配置されている回答チェックアルゴリズム:
- ユーザーの回答と正解の両方を正規化（小文字化、空白と括弧を削除）
- 完全一致、またはいずれかの方向での部分文字列の包含をチェック
- この柔軟なマッチングにより、日本語テキスト回答のバリエーションに対応

### 重要なパスエイリアス
Viteは`@`エイリアスを`./src`ディレクトリに設定しています。インポートにはこれを使用してください:
```typescript
import { Button } from '@/components/ui/button';
```

### コンポーネント構成
- `src/components/ui/` - Radix UIベースのデザインシステムコンポーネント（48コンポーネント）
- `src/components/Auth.tsx` - 認証UI
- `src/components/QuizCard.tsx` - クイズ表示と回答入力
- `src/App.tsx` - ルーティングロジックを持つメインアプリケーション（react-routerなし、状態ベースのナビゲーション）

### データモデル

**Quizインターフェース:**
```typescript
{
  id: string;
  question: string;
  answer: string;
  explanation: string;
  type: 'text' | 'multiple-choice';
  choices?: string[];
  difficulty?: number;
  categoryId?: string;
  order?: number;  // クイズの順序付けに使用
}
```

**ユーザー統計:**
- `totalQuizzes`: 完了したクイズセッションの数
- `totalCorrect`: 全セッションでの正解数
- `totalAnswers`: 送信した回答の総数

## バックエンドAPIエンドポイント

すべてのエンドポイントには`/make-server-856c5cf0`のプレフィックスが付きます:

**公開エンドポイント:**
- `POST /signup` - 新規ユーザーアカウント作成
- `GET /quizzes` - すべてのクイズを取得（空の場合は自動初期化）
- `GET /categories` - クイズカテゴリを取得

**認証済みエンドポイント**（Bearerトークンが必要）:
- `POST /answers` - クイズに対するユーザーの回答を保存
- `POST /complete-quiz` - クイズセッション完了を記録
- `GET /stats` - ユーザー統計とプロファイルを取得
- `GET /history` - ユーザーの回答履歴を取得

**デバッグエンドポイント:**
- `GET /health` - ヘルスチェック
- `GET /debug/kv` - KVストアの内容を検査
- `POST /debug/init-quizzes` - クイズを強制的に再初期化
- `POST /debug/init-categories` - カテゴリを強制的に再初期化

## 認証フロー

1. ユーザーが`Auth.tsx`で認証情報を入力
2. サインアップの場合: APIがSupabase Admin SDKを介してユーザーを作成し、プロファイルをKVに保存
3. ログインの場合: Supabase Authが認証情報を検証
4. アクセストークンが`localStorage`に'accessToken'として保存
5. トークンが認証済みAPIコールのAuthorizationヘッダーに含まれる
6. アプリのマウント時に`App.tsx:checkAuth()`でトークンがチェックされる

## 環境変数

バックエンドサーバーが必要とするもの:
- `SUPABASE_URL` - SupabaseプロジェクトのURL
- `SUPABASE_SERVICE_ROLE_KEY` - 管理操作のためのサービスロールキー

フロントエンドは`src/utils/supabase/info.tsx`の値を使用:
- `projectId` - Supabaseプロジェクト識別子
- `publicAnonKey` - クライアント操作のための公開匿名キー

## Supabaseエッジ関数のデプロイ

バックエンドのエッジ関数を更新する場合は、以下の手順でデプロイします:

### 前提条件
- Supabase CLIがインストールされていること（Homebrewで`brew install supabase/tap/supabase`）
- Supabaseアクセストークンが`SupabaseSecret.md`に保存されていること

### デプロイ手順

1. **プロジェクトディレクトリの準備**
   ```bash
   # 標準構造にファイルをコピー
   mkdir -p supabase/functions/make-server-856c5cf0
   cp src/supabase/functions/server/index.tsx supabase/functions/make-server-856c5cf0/index.ts
   cp src/supabase/functions/server/kv_store.tsx supabase/functions/make-server-856c5cf0/kv_store.ts
   ```

2. **インポートパスの修正**
   `supabase/functions/make-server-856c5cf0/index.ts`内で:
   ```typescript
   import * as kv from "./kv_store.ts";  // .tsx から .ts に変更
   ```

3. **プロジェクトをリンク**
   ```bash
   SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ') \
   supabase link --project-ref gwaekeqhrihbhhiezupg
   ```

4. **関数をデプロイ**
   ```bash
   SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ') \
   supabase functions deploy make-server-856c5cf0
   ```

5. **デプロイの確認**
   ```bash
   curl -H "Authorization: Bearer $(grep "Publishable key" SupabaseSecret.md | cut -d: -f2 | tr -d ' ')" \
   https://gwaekeqhrihbhhiezupg.supabase.co/functions/v1/make-server-856c5cf0/quizzes
   ```

### 重要な注意事項
- `src/supabase/functions/server/`のファイルを編集した後は、必ず`supabase/functions/make-server-856c5cf0/`にコピーしてデプロイすること
- アクセストークンは`SupabaseSecret.md`に保存され、`.gitignore`に追加されています
- 関数名は`make-server-856c5cf0`で固定（URLパスと一致）
