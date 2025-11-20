/**
 * KVストアからリレーショナルデータベースへの既存データ移行スクリプト
 *
 * 実行方法:
 * SUPABASE_URL=https://gwaekeqhrihbhhiezupg.supabase.co \
 * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
 * deno run --allow-env --allow-net scripts/migrate-kv-to-rdb.ts
 */

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  Deno.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// KVストアヘルパー関数
async function getByPrefix(prefix: string): Promise<Array<{ key: string; value: any }>> {
  const { data, error } = await supabase
    .from("kv_store_856c5cf0")
    .select("key, value")
    .like("key", `${prefix}%`);

  if (error) {
    throw new Error(`Failed to fetch KV data: ${error.message}`);
  }

  return data || [];
}

// 1. ユーザープロファイルの移行
async function migrateProfiles() {
  console.log("\n=== Migrating Profiles ===");

  const users = await getByPrefix("user:");
  console.log(`Found ${users.length} users in KV store`);

  const profiles = users.map((item) => ({
    id: item.value.id,
    name: item.value.name,
    created_at: item.value.createdAt || new Date().toISOString(),
  }));

  if (profiles.length === 0) {
    console.log("No profiles to migrate");
    return;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(profiles, { onConflict: "id", ignoreDuplicates: true });

  if (error) {
    console.error("Error migrating profiles:", error);
  } else {
    console.log(`✓ Successfully migrated ${profiles.length} profiles`);
  }
}

// 2. カテゴリの移行
async function migrateCategories() {
  console.log("\n=== Migrating Categories ===");

  const cats = await getByPrefix("category:");
  console.log(`Found ${cats.length} categories in KV store`);

  const categories = cats.map((item) => ({
    name: item.value.name,
    order: item.value.order,
  }));

  if (categories.length === 0) {
    console.log("No categories to migrate");
    return;
  }

  const { data, error } = await supabase
    .from("categories")
    .upsert(categories, { onConflict: "name", ignoreDuplicates: true });

  if (error) {
    console.error("Error migrating categories:", error);
  } else {
    console.log(`✓ Successfully migrated ${categories.length} categories`);
  }
}

// 3. クイズの移行
async function migrateQuizzes() {
  console.log("\n=== Migrating Quizzes ===");

  const quizItems = await getByPrefix("quiz:");
  console.log(`Found ${quizItems.length} quizzes in KV store`);

  const quizzes = quizItems.map((item) => ({
    question: item.value.question,
    answer: item.value.answer,
    explanation: item.value.explanation,
    type: item.value.type,
    options: item.value.choices ? item.value.choices : null,
    difficulty: item.value.difficulty,
    subject: item.value.subject,
    unit: item.value.unit,
    category_id: item.value.categoryId,
    order: item.value.order,
  }));

  if (quizzes.length === 0) {
    console.log("No quizzes to migrate");
    return;
  }

  // バッチサイズを小さくして処理
  const batchSize = 50;
  let migrated = 0;

  for (let i = 0; i < quizzes.length; i += batchSize) {
    const batch = quizzes.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("quizzes")
      .upsert(batch, { onConflict: "question", ignoreDuplicates: true });

    if (error) {
      console.error(`Error migrating quiz batch ${i / batchSize + 1}:`, error);
    } else {
      migrated += batch.length;
      console.log(`  Migrated ${migrated}/${quizzes.length} quizzes...`);
    }
  }

  console.log(`✓ Successfully migrated ${migrated} quizzes`);
}

// 4. 回答履歴の移行
async function migrateAnswers() {
  console.log("\n=== Migrating User Answers ===");

  const answerItems = await getByPrefix("answer:");
  console.log(`Found ${answerItems.length} answers in KV store`);

  // answer:${userId}:${quizId}:${timestamp} の形式からデータを抽出
  const answers = answerItems.map((item) => {
    const parts = item.key.split(":");
    const userId = parts[1];
    const quizId = parts[2];

    return {
      user_id: item.value.userId || userId,
      quiz_id: item.value.quizId || quizId,
      user_answer: item.value.userAnswer,
      is_correct: item.value.isCorrect,
      answered_at: item.value.answeredAt || new Date().toISOString(),
    };
  });

  if (answers.length === 0) {
    console.log("No answers to migrate");
    return;
  }

  // クイズIDがUUID形式でない場合、スキップする必要がある
  // まず、既存のクイズIDマッピングを取得
  const { data: quizData } = await supabase
    .from("quizzes")
    .select("id, question");

  const quizMap = new Map(
    (quizData || []).map((q: any) => [q.question, q.id])
  );

  const validAnswers = answers.filter((answer) => {
    // user_idがUUID形式か確認
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(answer.user_id);
  });

  console.log(`Filtered to ${validAnswers.length} valid answers (with UUID user_id)`);

  if (validAnswers.length === 0) {
    console.log("No valid answers to migrate");
    return;
  }

  // バッチサイズを小さくして処理
  const batchSize = 100;
  let migrated = 0;
  let failed = 0;

  for (let i = 0; i < validAnswers.length; i += batchSize) {
    const batch = validAnswers.slice(i, i + batchSize);

    const { data, error } = await supabase
      .from("user_answers")
      .insert(batch);

    if (error) {
      console.error(`Error migrating answer batch ${i / batchSize + 1}:`, error);
      failed += batch.length;
    } else {
      migrated += batch.length;
      console.log(`  Migrated ${migrated}/${validAnswers.length} answers...`);
    }
  }

  console.log(`✓ Successfully migrated ${migrated} answers (${failed} failed)`);
}

// メイン処理
async function main() {
  console.log("=================================================");
  console.log("KV Store to RDB Migration Script");
  console.log("=================================================");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Start time: ${new Date().toISOString()}`);

  try {
    // 順序が重要: profiles → categories → quizzes → answers
    await migrateProfiles();
    await migrateCategories();
    await migrateQuizzes();
    await migrateAnswers();

    console.log("\n=================================================");
    console.log("Migration completed successfully!");
    console.log("=================================================");
  } catch (error) {
    console.error("\n=================================================");
    console.error("Migration failed:", error);
    console.error("=================================================");
    Deno.exit(1);
  }
}

// スクリプト実行
if (import.meta.main) {
  await main();
}
