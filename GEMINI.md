
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
    -- Create the quizzes table
    CREATE TABLE quizzes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        options jsonb,
        explanation TEXT,
        "order" INT
    );

    -- Create the user_answers table
    CREATE TABLE user_answers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) NOT NULL,
        quiz_id uuid REFERENCES quizzes(id) NOT NULL,
        answer TEXT NOT NULL,
        is_correct BOOLEAN NOT NULL
    );

    -- Create the quiz_completions table
    CREATE TABLE quiz_completions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES auth.users(id) NOT NULL,
        correct_count INT NOT NULL,
        total_quizzes INT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
    );

    -- Create indexes for performance
    CREATE INDEX ON user_answers (user_id);
    CREATE INDEX ON quiz_completions (user_id);

    -- Enable Row Level Security (RLS)
    ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE user_answers ENABLE ROW LEVEL SECURITY;
    ALTER TABLE quiz_completions ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    -- Allow users to read all quizzes
    CREATE POLICY "Allow users to read all quizzes" ON quizzes FOR SELECT USING (true);
    -- Allow users to manage their own answers
    CREATE POLICY "Allow users to manage their own answers" ON user_answers FOR ALL USING (auth.uid() = user_id);
    -- Allow users to manage their own quiz completions
    CREATE POLICY "Allow users to manage their own quiz completions" ON quiz_completions FOR ALL USING (auth.uid() = user_id);
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


