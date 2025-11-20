-- ================================================
-- Database Migration: KV Store to Relational DB
-- Step 1: Create New Schema
-- ================================================

-- 1. profiles テーブル: ユーザーの公開情報を管理
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. categories テーブル: クイズのカテゴリ
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  "order" INTEGER
);

-- 3. quizzes テーブル: クイズ本体
CREATE TABLE IF NOT EXISTS quizzes (
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
CREATE TABLE IF NOT EXISTS user_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  user_answer TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. user_statistics_view ビュー: ユーザー統計の集計
-- 実体テーブルの代わりにビューを利用し、データの冗長性をなくしつつ、呼び出しを簡潔にする
CREATE OR REPLACE VIEW user_statistics_view AS
SELECT
  user_id,
  COUNT(*) AS total_answers,
  COUNT(*) FILTER (WHERE is_correct = true) AS total_correct
FROM
  user_answers
GROUP BY
  user_id;

-- インデックスの作成 (パフォーマンス向上のため)
CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON quizzes(category_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_answers_quiz_id ON user_answers(quiz_id);

-- RLS (Row Level Security) ポリシーの設定
-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile." ON profiles;
CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

-- categories, quizzes
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Categories are viewable by everyone." ON categories;
CREATE POLICY "Categories are viewable by everyone." ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Quizzes are viewable by everyone." ON quizzes;
CREATE POLICY "Quizzes are viewable by everyone." ON quizzes FOR SELECT USING (true);

-- user_answers
ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own answers." ON user_answers;
CREATE POLICY "Users can manage their own answers." ON user_answers FOR ALL USING (auth.uid() = user_id);

-- user_statistics_view
-- (ビューは参照元テーブルのRLSポリシーを継承するため、個別のポリシー設定は不要)
