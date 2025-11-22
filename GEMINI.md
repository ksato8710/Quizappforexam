
# GEMINI.md

## 1. Project Overview

This is a quiz application focused on the Edo period of Japan. It's a single-page application built with React and Vite. The backend is powered by Supabase, which handles user authentication and quiz data.

- **Frontend:** React, TypeScript, Vite
- **Backend:** Supabase
- **Styling:** Tailwind CSS (inferred from `tailwind-merge` and `clsx` in `package.json`) and Radix UI components.

## 2. Getting Started

### Prerequisites

- Node.js and npm installed.
- Supabase account and project.

### Installation

1.  Install the dependencies:
    ```bash
    npm install
    ```

### Supabase Setup

1.  Create a new Supabase project.
2.  Go to the "SQL Editor" in your Supabase project and run the following SQL queries to create the necessary tables, indexes, and enable Row Level Security (RLS).

    ```sql
    -- 1. profiles テーブル: ユーザーの公開情報
    CREATE TABLE IF NOT EXISTS profiles (
      id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      name TEXT NOT NULL UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 2. categories テーブル: クイズの大カテゴリ
    CREATE TABLE IF NOT EXISTS categories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      "order" INTEGER
    );

    -- 3. units テーブル: 単元情報
    CREATE TABLE IF NOT EXISTS units (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      subject TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 4. quizzes テーブル: クイズ本体
    CREATE TABLE IF NOT EXISTS quizzes (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      explanation TEXT,
      type TEXT,
      options JSONB,
      difficulty INTEGER,
      subject TEXT,
      category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
      "order" INTEGER,
      unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE
    );

    -- 5. user_answers テーブル: ユーザーの回答履歴
    CREATE TABLE IF NOT EXISTS user_answers (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
      user_answer TEXT NOT NULL,
      is_correct BOOLEAN NOT NULL,
      answered_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- 6. feedback テーブル: ユーザーからのフィードバック
    CREATE TABLE IF NOT EXISTS feedback (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        page_context TEXT,
        quiz_id TEXT,
        created_at TIMESTAMPTZ DEFAULT now(),
        status TEXT
    );

    -- 7. test_schedules テーブル: テスト範囲のスケジュール
    CREATE TABLE IF NOT EXISTS test_schedules (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        subject TEXT NOT NULL,
        round_number INTEGER NOT NULL,
        textbook_page TEXT,
        lesson_start_date DATE,
        lesson_end_date DATE,
        test_date DATE NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        unit_id uuid NOT NULL REFERENCES units(id) ON DELETE CASCADE
    );

    -- 8. user_statistics_view ビュー: ユーザー統計
    CREATE OR REPLACE VIEW user_statistics_view AS
    SELECT
      user_id,
      COUNT(*) AS total_answers,
      COUNT(*) FILTER (WHERE is_correct = true) AS total_correct
    FROM
      user_answers
    GROUP BY
      user_id;

    -- インデックスの作成
    CREATE INDEX IF NOT EXISTS idx_profiles_name ON profiles(name);
    CREATE INDEX IF NOT EXISTS idx_quizzes_category_id ON quizzes(category_id);
    CREATE INDEX IF NOT EXISTS idx_quizzes_unit_id ON quizzes(unit_id);
    CREATE INDEX IF NOT EXISTS idx_user_answers_user_id ON user_answers(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_answers_quiz_id ON user_answers(quiz_id);
    CREATE INDEX IF NOT EXISTS idx_test_schedules_unit_id ON test_schedules(unit_id);


    -- RLS (Row Level Security) ポリシーの設定
    -- 公開テーブル (誰でも閲覧可能)
    ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Categories are viewable by everyone." ON categories FOR SELECT USING (true);

    ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Quizzes are viewable by everyone." ON quizzes FOR SELECT USING (true);
    
    ALTER TABLE units ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Units are viewable by everyone." ON units FOR SELECT USING (true);

    ALTER TABLE test_schedules ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Test schedules are viewable by everyone." ON test_schedules FOR SELECT USING (true);

    -- ユーザー個別情報 (本人のみ操作可能)
    ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
    CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
    CREATE POLICY "Users can update their own profile." ON profiles FOR UPDATE USING (auth.uid() = id);

    ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage their own answers." ON user_answers FOR ALL USING (auth.uid() = user_id);

    ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Users can manage their own feedback." ON feedback FOR ALL USING (auth.uid() = user_id);

    ```

3.  Create a file named `src/utils/supabase/info.tsx` by copying the template file:

    ```bash
    cp src/utils/supabase/info.example.tsx src/utils/supabase/info.tsx
    ```

    Then, open `src/utils/supabase/info.tsx` and add your Supabase project information.
    Replace `"YOUR_SUPABASE_PROJECT_ID"` and `"YOUR_SUPABASE_PUBLIC_ANON_KEY"` with your actual Supabase project ID and public anonymous key.

    **Important**: Remember to add `src/utils/supabase/info.tsx` to your `.gitignore` file to avoid committing sensitive keys.

### Running the Application

1.  Start the development server:
    ```bash
    npm run dev
    ```
    The application will be available at `http://localhost:3000`.

### Building for Production

1.  Build the application for production:
    ```bash
    npm run build
    ```
    The production-ready files will be in the `build` directory.

## 3. Development Conventions

### Supabase Integration

- The Supabase client is initialized in `src/utils/supabase/client.ts`.
- The Supabase project ID and public anonymous key are stored in `src/utils/supabase/info.tsx`.

### Supabase CLI/API Operations

For direct database operations or administrative tasks (like adding quizzes from a script), use the Supabase Management API.

- **Project ID**: `gwaekeqhrihbhhiezupg`
- **Access Token**: An access token (`service_role` key) is required. This can be retrieved from the `SupabaseSecret.md` file (which is git-ignored) and set as an environment variable using the following command:
  ```bash
  export SUPABASE_ACCESS_TOKEN=$(grep "Access Tokens" SupabaseSecret.md | cut -d: -f2 | tr -d ' ')
  ```
- **Executing SQL Queries**: To execute raw SQL, use `curl` to POST a JSON payload to the database query endpoint.
  ```bash
  # 1. Store your SQL in a JSON file (e.g., /tmp/my_query.json)
  #    {"query": "SELECT * FROM your_table LIMIT 5;"}

  # 2. Execute the query via the API
  curl -X POST 'https://api.supabase.com/v1/projects/gwaekeqhrihbhhiezupg/database/query' \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H 'Content-Type: application/json' \
    -d @/tmp/my_query.json
  ```
- **Reference Document**: For more detailed commands and workflows, always refer to `SUPABASE_OPERATIONS.md`.


### Components

- UI components are located in `src/components/ui`.
- The main application logic is in `src/App.tsx`.
- The `QuizCard` component (`src/components/QuizCard.tsx`) is responsible for displaying a single quiz question and handling user interaction. It displays the quiz question and choices (for multiple-choice questions) or a text input field. When the user answers, it shows whether the answer was correct, the correct answer, and an explanation. It also provides navigation to the next question.

### API Client

- An API client is defined in `src/utils/api-client.ts` to interact with the backend.
- The API client uses the Supabase client to make requests to the database.
- The available API client methods are:
  - `login(name, password)`: Authenticates a user.
  - `signup(name, password)`: Creates a new user.
  - `getQuizzes()`: Fetches all quizzes.
  - `getCategories()`: Fetches all categories.
  - `saveAnswer(quizId, userAnswer, isCorrect)`: Saves a user's answer.
  - `completeQuiz(correctCount, totalQuestions)`: Records a quiz completion.
  - `getStats()`: Fetches user statistics.
  - `getHistory()`: Fetches the user's answer history.

### Backend

- The backend is a Deno serverless function using the Hono framework.
- The main entry point is located in a path similar to `supabase/functions/make-server-XXXXXXXX/index.ts`, where `XXXXXXXX` is a generated hash.
- **Authentication:** The backend uses Supabase Auth. It converts usernames to a local email format (`@quizapp.local`) for use with Supabase's email/password authentication.
- **Data Storage:** The application uses a Key-Value (KV) store for some data. This KV store is implemented using a Supabase table (e.g., `kv_store_XXXXXXXX`), and the logic is located alongside the server's `index.ts`. Each key-value pair is a row in the table. The data is initialized with default values if the store is empty.
- **API Endpoints:** The backend defines several API endpoints that correspond to the methods in the `api-client.ts` file.

### Frontend Authentication Flow

- The authentication flow is handled by the `src/components/Auth.tsx` component.
- **UI:** The component displays a form with fields for "name" and "password". It can switch between "Login" and "Signup" modes.
- **Submission:** When the form is submitted, it calls either the `apiClient.login` or `apiClient.signup` method.
- **Signup:** After a successful signup, the component automatically logs in the new user.
- **Login:** Upon successful login, the `accessToken` is stored in `localStorage`, and the `onAuthSuccess` callback is called with the `accessToken` and user's name.
- **Error Handling:** The component displays any errors that occur during the authentication process.


