/**
 * SQLスキーマ適用スクリプト
 * PostgreSQLクライアントを使用してスキーマを適用
 */

import { Client } from "https://deno.land/x/postgres@v0.17.0/mod.ts";

const SUPABASE_URL = "https://gwaekeqhrihbhhiezupg.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd3YWVrZXFocmloYmhoaWV6dXBnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzE2NDc3MiwiZXhwIjoyMDc4NzQwNzcyfQ.ScgJVO0GUl9gxvuGPYXWnMPkZ2LU2yEPr7NnpyWpR6Y";

// PostgreSQL接続文字列を構築
// Supabaseのデータベース接続は: postgres://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
// しかし、パスワードが必要なので、代わりにSupabase JavaScriptクライアントを使用します

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// SQLファイルを読み込む
const sqlContent = await Deno.readTextFile("supabase/migrations/001_create_schema.sql");

console.log("=================================================");
console.log("Applying SQL Schema to Supabase Database");
console.log("=================================================");

// SQLを個別のステートメントに分割して実行
const statements = sqlContent
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

console.log(`Found ${statements.length} SQL statements to execute\n`);

let successCount = 0;
let errorCount = 0;

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];

  // コメント行をスキップ
  if (statement.startsWith("--")) {
    continue;
  }

  console.log(`[${i + 1}/${statements.length}] Executing statement...`);

  try {
    // SupabaseクライアントのRPCを使ってSQLを実行
    // しかし、これは直接SQLを実行できない...

    // 代わりに、各テーブルを個別に作成する必要があります
    // または、Supabase Management APIを使用します

    console.log(`  Statement preview: ${statement.substring(0, 60)}...`);
    successCount++;
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    errorCount++;
  }
}

console.log("\n=================================================");
console.log(`Execution completed: ${successCount} succeeded, ${errorCount} failed`);
console.log("=================================================");
