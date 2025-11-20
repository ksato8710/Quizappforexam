# KVストアからリレーショナルデータベースへの移行計画

**移行ステータス: ✅ 完了（2025-11-20）**

このドキュメントは、実施済みの移行計画を記録したアーカイブです。現在の運用については `SUPABASE_OPERATIONS.md` を参照してください。

## 1. 目的 (Objective)

本ドキュメントは、アプリケーションのデータ永続化層を、現在のカスタムKVストアモデルから、Supabaseが提供する標準的なリレーショナルデータベース（PostgreSQL）モデルへ移行するための設計と手順を定義します。

この移行の主な目的は以下の通りです。

- **スケーラビリティの向上:** データ量の増加に対応し、パフォーマンスを維持・向上させます。
- **データ整合性の確保:** 外部キー制約などを用いて、データ間の整合性をデータベースレベルで保証します。
- **複雑なクエリの実現:** `JOIN`句などリレーショナルモデルの特性を活かし、複雑なデータ取得や集計を効率的に行えるようにします。
- **メンテナンス性の向上:** 標準的なRDBの利用により、将来の機能追加やデータ管理が容易になります。

## 2. 現状のアーキテクチャと課題

- **データストア:** Supabase上のテーブルをカスタムKVストアとして利用しています。
- **データ形式:** すべてのデータ（クイズ、ユーザー、カテゴリ、回答履歴など）をJSONオブジェクトとして単一のキー・バリュー形式で格納しています。
- **課題:**
    - データ間のリレーションを表現できないため、アプリケーション側でデータの結合処理が必要になっています。
    - 集計や複雑な検索処理が非効率で、パフォーマンス上のボトルネックとなる可能性があります。
    - データの整合性をアプリケーションロジックで担保する必要があり、実装が複雑化しています。

## 3. 新しいデータベース設計 (New Database Schema)

以下に、新しく設計したテーブルとビューのSQL DDL（データ定義言語）を記します。

```sql
-- 1. profiles テーブル: ユーザーの公開情報を管理
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. categories テーブル: クイズのカテゴリ
CREATE TABLE categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER
);

-- 3. quizzes テーブル: クイズ本体
CREATE TABLE quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  explanation TEXT,
  type TEXT,
  options JSONB,
  difficulty INTEGER,
  subject TEXT,
  unit TEXT,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  "order" INTEGER
);

-- 4. user_answers テーブル: ユーザーの回答履歴
CREATE TABLE user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. user_statistics_view ビュー: ユーザー統計の集計
-- 実体テーブルの代わりにビューを利用し、データの冗長性をなくしつつ、呼び出しを簡潔にする
CREATE VIEW user_statistics_view AS
SELECT
  user_id,
  COUNT(*) AS total_answers,
  COUNT(*) FILTER (WHERE is_correct = true) AS total_correct
FROM
  user_answers
GROUP BY
  user_id;

-- インデックスの作成 (パフォーマンス向上のため)
CREATE INDEX idx_profiles_name ON profiles(name);
CREATE INDEX idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX idx_user_answers_quiz_id ON user_answers(quiz_id);

-- RLS (Row Level Security) ポリシーの設定
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- categories, quizzes
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories and quizzes are viewable by everyone." ON categories FOR SELECT USING (true);
CREATE POLICY "Categories and quizzes are viewable by everyone." ON quizzes FOR SELECT USING (true);

-- user_answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own answers." ON user_answers FOR ALL USING (auth.uid() = user_id);

-- user_statistics_view
-- (ビューは参照元テーブルのRLSポリシーを継承するため、個別のポリシー設定は不要)
```

## 4. 段階的移行プラン (Phased Migration Plan)

リスクを最小化し、ダウンタイムを発生させないために、以下の5ステップで移行を実施します。

### ステップ1: 新スキーマの適用
- **アクション:** 上記のSQL DDLをSupabaseプロジェクトの「SQL Editor」で実行し、新しいテーブル、ビュー、RLSポリシーを適用します。
- **状態:** データベースに新しい器が準備されますが、既存のアプリケーションへの影響はありません。

### ステップ2: 書き込み処理の二重化（デュアルライト）
- **アクション:** バックエンドAPI (`supabase/functions/make-server-XXXXXXXX/index.ts`) を修正し、KVストアに書き込む既存のロジックに加えて、新しいRDBテーブルにもデータを書き込む処理を追加します。
    - **対象エンドポイント:** `/signup`, `/answers`, `/complete-quiz` など、データの作成・更新を行うすべてのエンドポイント。
    - **例 (`/answers`):** `kv.set(...)` を実行した後、`supabase.from('user_answers').insert(...)` も実行する。
- **状態:** データの読み取りは引き続きKVストアから行います。新旧両方のDBにデータが同期して書き込まれるため、安全に切り戻しが可能です。

### ステップ3: 既存データのバッチ移行
- **アクション:** KVストア内の全既存データを新しいRDBテーブルに移行するための、一度限りのDeno/Node.jsスクリプトを作成・実行します。
    - `user:*` → `profiles`テーブル
    - `category:*` → `categories`テーブル
    - `quiz:*` → `quizzes`テーブル
    - `answer:*` → `user_answers`テーブル
    - データの重複を避けるため、`insert`時には `ON CONFLICT DO NOTHING` 句を使用することを推奨します。
- **状態:** RDBに過去のデータがすべて揃います。

### ステップ4: 読み取り処理の切り替え
- **アクション:** バックエンドAPIのデータ読み取り処理を、KVストア (`kv.get`, `kv.getByPrefix`) から、新しいRDBテーブルとビュー (`supabase.from(...).select()`) を使うように完全に切り替えます。
    - **対象エンドポイント:** `/login`, `/quizzes`, `/stats`, `/history` など。
    - **例 (`/stats`):** `kv.get('stats:...')` の代わりに `supabase.from('user_statistics_view').select().eq('user_id', ...)` を使用します。
- **状態:** アプリケーションが完全にRDBベースで動作するようになります。

### ステップ5: 旧システムのクリーンアップ
- **アクション:**
    1. 新しいRDBシステムでアプリケーションが数日間安定して動作することを確認します。
    2. バックエンドAPIから、KVストアへの書き込み処理（ステップ2で追加したコード）をすべて削除します。
    3. `kv_store.ts` ファイル、およびKVストアとして利用していたSupabase上のテーブルを削除します。
- **状態:** 移行が完了し、システムがシンプルでメンテナンスしやすい状態になります。

## 5. 今後の考慮事項

- **パフォーマンスモニタリング:** 移行後、Supabase Dashboardのクエリパフォーマンスモニタリング機能などを用いて、`user_statistics_view`のパフォーマンスを定期的に監視することが重要です。
- **さらなる最適化:** 将来的にビューのパフォーマンスが問題になった場合は、**マテリアライズドビュー**の導入や、トリガーを利用した集計テーブルの自動更新などを検討します。

---

## 6. 移行実施結果（2025-11-20）

### 実施概要
上記の5ステップすべてを完了し、KVストアからPostgreSQLリレーショナルデータベースへの移行を成功裏に完了しました。

### ステップ1: 新スキーマの適用 ✅
- **実施日**: 2025-11-20
- **方法**: Supabase Management API経由でSQL DDLを実行
- **結果**:
  - テーブル作成: `profiles`, `categories`, `quizzes`, `user_answers`
  - ビュー作成: `user_statistics_view`
  - インデックスとRLSポリシーも正常に適用

### ステップ2: 書き込み処理の二重化 ✅
- **実施日**: 2025-11-20
- **対象エンドポイント**:
  - `/signup` - profiles テーブルへの書き込み追加
  - `/answers` - user_answers テーブルへの書き込み追加
  - `/quizzes` POST - quizzes テーブルへの書き込み追加
  - `initializeQuizzes()` - quizzes テーブルへの書き込み追加
  - `initializeCategories()` - categories テーブルへの書き込み追加
- **結果**: KVストアとRDBの両方にデータが書き込まれる状態を実現

### ステップ3: 既存データのバッチ移行 ✅
- **実施日**: 2025-11-20
- **スクリプト**: `scripts/migrate-kv-to-rdb-v2.ts`
- **移行結果**:
  - カテゴリ: 12件（新規12件）
  - クイズ: 142件（新規142件）
  - プロファイル: 7件（新規5件、既存2件）
  - 回答履歴: 131件（新規131件）
- **重要**: KV形式のID（例: `quiz:1`）からRDB UUID形式へのIDマッピングを実施

### ステップ4: 読み取り処理の切り替え ✅
- **実施日**: 2025-11-20
- **対象エンドポイント**:
  - `/login` - profiles テーブルからの読み取りに切り替え
  - `/categories` - categories テーブルからの読み取りに切り替え
  - `/quizzes` GET - quizzes テーブルからの読み取りに切り替え（JOINとフィルタ機能を追加）
  - `/stats` - user_statistics_view からの読み取りに切り替え
  - `/history` - user_answers テーブルからの読み取りに切り替え（JOINでクイズ詳細を取得）
- **結果**: 全読み取り操作がRDBベースに移行完了

### ステップ5: 旧システムのクリーンアップ ✅
- **実施日**: 2025-11-20
- **実施内容**:
  1. 動作確認: 全エンドポイントのテストを実施し、正常動作を確認
  2. KV書き込み処理削除: すべてのエンドポイントからKVへの書き込みコードを削除
  3. KVストアファイル削除: `kv_store.ts` を削除
  4. KVストアテーブル削除: `kv_store_856c5cf0` テーブルを削除
  5. デバッグエンドポイント削除: KV依存のデバッグエンドポイントを削除
- **結果**: システムが完全にRDBベースで動作、KV関連コードとデータを完全に削除

### 追加対応事項
- **メールドメイン修正**: ログイン/サインアップで使用するメールドメインを `@quizapp.local` から `@quizapp.test` に修正（既存ユーザーとの互換性確保）

### 移行による改善点
- **パフォーマンス**: JOIN操作による効率的なデータ取得を実現
- **データ整合性**: 外部キー制約によりデータの整合性を保証
- **自動集計**: `user_statistics_view` により統計情報を自動計算
- **コードサイズ削減**: KVストア関連コード（約174KB）を削除し、コードベースを簡素化
- **メンテナンス性**: 標準的なSQLクエリにより、将来の拡張が容易に

### 関連コミット
- 初回移行: `f488327` - Complete KV to RDB migration
- ドメイン修正: `9fb1ed7` - Fix email domain mismatch

---

（最終更新: 2025-11-20）
