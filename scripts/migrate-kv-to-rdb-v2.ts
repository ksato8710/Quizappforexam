/**
 * KVストアからリレーショナルデータベースへの既存データ移行スクリプト (改訂版)
 *
 * 実行方法:
 * SUPABASE_URL=https://gwaekeqhrihbhhiezupg.supabase.co \
 * SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
 * deno run --allow-env --allow-net scripts/migrate-kv-to-rdb-v2.ts
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

// 1. カテゴリの移行
async function migrateCategories() {
  console.log("\n=== Migrating Categories ===");

  const cats = await getByPrefix("category:");
  console.log(`Found ${cats.length} categories in KV store`);

  if (cats.length === 0) {
    console.log("No categories to migrate");
    return {};
  }

  const categoryIdMap: Record<string, string> = {};
  let migrated = 0;

  for (const item of cats) {
    const kvId = item.key; // e.g., "category:1"

    const { data, error } = await supabase
      .from("categories")
      .insert({
        name: item.value.name,
        order: item.value.order,
      })
      .select("id")
      .single();

    if (error) {
      // 既に存在する場合は、既存のIDを取得
      const { data: existing } = await supabase
        .from("categories")
        .select("id")
        .eq("name", item.value.name)
        .single();

      if (existing) {
        categoryIdMap[kvId] = existing.id;
      }
    } else if (data) {
      categoryIdMap[kvId] = data.id;
      migrated++;
    }
  }

  console.log(`✓ Migrated ${migrated} new categories, ${Object.keys(categoryIdMap).length} total mapped`);
  return categoryIdMap;
}

// 2. クイズの移行
async function migrateQuizzes(categoryIdMap: Record<string, string>) {
  console.log("\n=== Migrating Quizzes ===");

  const quizItems = await getByPrefix("quiz:");
  console.log(`Found ${quizItems.length} quizzes in KV store`);

  if (quizItems.length === 0) {
    console.log("No quizzes to migrate");
    return {};
  }

  const quizIdMap: Record<string, string> = {};
  let migrated = 0;
  let skipped = 0;

  for (const item of quizItems) {
    const kvId = item.key; // e.g., "quiz:1"
    const kvCategoryId = item.value.categoryId; // e.g., "category:1"

    // カテゴリIDをマッピング
    const rdbCategoryId = kvCategoryId ? categoryIdMap[kvCategoryId] : null;

    const { data, error } = await supabase
      .from("quizzes")
      .insert({
        question: item.value.question,
        answer: item.value.answer,
        explanation: item.value.explanation,
        type: item.value.type,
        options: item.value.choices ? item.value.choices : null,
        difficulty: item.value.difficulty,
        subject: item.value.subject,
        unit: item.value.unit,
        category_id: rdbCategoryId,
        order: item.value.order,
      })
      .select("id")
      .single();

    if (error) {
      // 既に存在する場合は、既存のIDを取得
      const { data: existing } = await supabase
        .from("quizzes")
        .select("id")
        .eq("question", item.value.question)
        .single();

      if (existing) {
        quizIdMap[kvId] = existing.id;
        skipped++;
      } else {
        console.error(`Failed to migrate quiz: ${item.value.question.substring(0, 50)}...`, error);
      }
    } else if (data) {
      quizIdMap[kvId] = data.id;
      migrated++;
    }

    // プログレス表示
    if ((migrated + skipped) % 20 === 0) {
      console.log(`  Progress: ${migrated + skipped}/${quizItems.length}...`);
    }
  }

  console.log(`✓ Migrated ${migrated} new quizzes, skipped ${skipped} existing, ${Object.keys(quizIdMap).length} total mapped`);
  return quizIdMap;
}

// 3. ユーザープロファイルの移行
async function migrateProfiles() {
  console.log("\n=== Migrating Profiles ===");

  const users = await getByPrefix("user:");
  console.log(`Found ${users.length} users in KV store`);

  if (users.length === 0) {
    console.log("No profiles to migrate");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const item of users) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: item.value.id,
        name: item.value.name,
        created_at: item.value.createdAt || new Date().toISOString(),
      });

    if (error) {
      if (error.code === "23505") {
        // 既に存在する（重複キー）
        skipped++;
      } else {
        console.error(`Error migrating profile ${item.value.name}:`, error);
      }
    } else {
      migrated++;
    }
  }

  console.log(`✓ Migrated ${migrated} new profiles, skipped ${skipped} existing`);
}

// 4. 回答履歴の移行
async function migrateAnswers(quizIdMap: Record<string, string>) {
  console.log("\n=== Migrating User Answers ===");

  const answerItems = await getByPrefix("answer:");
  console.log(`Found ${answerItems.length} answers in KV store`);

  if (answerItems.length === 0) {
    console.log("No answers to migrate");
    return;
  }

  // UUID正規表現
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  let migrated = 0;
  let skipped = 0;

  for (const item of answerItems) {
    const kvQuizId = item.value.quizId; // e.g., "quiz:1"
    const userId = item.value.userId;

    // user_idがUUID形式か確認
    if (!uuidRegex.test(userId)) {
      skipped++;
      continue;
    }

    // quiz_idをマッピング
    const rdbQuizId = quizIdMap[kvQuizId];

    if (!rdbQuizId) {
      console.log(`  Skipping answer: quiz ${kvQuizId} not found in mapping`);
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from("user_answers")
      .insert({
        user_id: userId,
        quiz_id: rdbQuizId,
        user_answer: item.value.userAnswer,
        is_correct: item.value.isCorrect,
        answered_at: item.value.answeredAt || new Date().toISOString(),
      });

    if (error) {
      console.error(`Error migrating answer:`, error);
    } else {
      migrated++;
    }

    // プログレス表示
    if ((migrated + skipped) % 20 === 0) {
      console.log(`  Progress: ${migrated + skipped}/${answerItems.length}...`);
    }
  }

  console.log(`✓ Migrated ${migrated} answers, skipped ${skipped}`);
}

// メイン処理
async function main() {
  console.log("=================================================");
  console.log("KV Store to RDB Migration Script (v2)");
  console.log("=================================================");
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Start time: ${new Date().toISOString()}`);

  try {
    // 順序が重要: categories → quizzes → profiles → answers
    const categoryIdMap = await migrateCategories();
    const quizIdMap = await migrateQuizzes(categoryIdMap);
    await migrateProfiles();
    await migrateAnswers(quizIdMap);

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
