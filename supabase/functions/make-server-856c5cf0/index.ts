import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.ts";
const app = new Hono();

// Create Supabase client
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-856c5cf0/health", (c) => {
  return c.json({ status: "ok" });
});

// Debug endpoint to check KV store
app.get("/make-server-856c5cf0/debug/kv", async (c) => {
  try {
    const quizzes = await kv.getByPrefix('quiz:');
    const users = await kv.getByPrefix('user:');
    const stats = await kv.getByPrefix('stats:');
    
    return c.json({ 
      quizzes: quizzes,
      users: users.length,
      stats: stats.length,
    });
  } catch (error) {
    console.log(`Error in debug endpoint: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Force initialize quizzes
app.post("/make-server-856c5cf0/debug/init-quizzes", async (c) => {
  try {
    await initializeQuizzes();
    const quizzes = await kv.getByPrefix('quiz:');
    return c.json({ 
      message: 'Quizzes initialized',
      count: quizzes.length,
      quizzes: quizzes
    });
  } catch (error) {
    console.log(`Error initializing quizzes: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// Force initialize categories
app.post("/make-server-856c5cf0/debug/init-categories", async (c) => {
  try {
    await initializeCategories();
    const categories = await kv.getByPrefix('category:');
    return c.json({ 
      message: 'Categories initialized',
      count: categories.length,
      categories: categories
    });
  } catch (error) {
    console.log(`Error initializing categories: ${error}`);
    return c.json({ error: String(error) }, 500);
  }
});

// ===== Helper Functions for Auth =====

// Convert name to email format for Supabase Auth
function nameToEmail(name: string): string {
  const sanitized = name.toLowerCase().trim().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  return `${sanitized}@quizapp.test`;
}

// ===== User Authentication Endpoints =====

// Login endpoint with name
app.post("/make-server-856c5cf0/login", async (c) => {
  try {
    const { name, password } = await c.req.json();

    if (!name || !password) {
      return c.json({ error: 'Name and password are required' }, 400);
    }

    // Convert name to email format
    const email = nameToEmail(name);

    // Try to sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.log(`Login error: ${error.message}`);
      return c.json({ error: 'ログインに失敗しました。名前またはパスワードが正しくありません。' }, 401);
    }

    if (!data.session) {
      return c.json({ error: 'セッションの作成に失敗しました' }, 500);
    }

    return c.json({
      message: 'Login successful',
      accessToken: data.session.access_token,
      user: {
        id: data.user.id,
        name: data.user.user_metadata?.name || name,
      }
    });
  } catch (error) {
    console.log(`Login error: ${error}`);
    return c.json({ error: 'Internal server error during login' }, 500);
  }
});

// Sign up endpoint
app.post("/make-server-856c5cf0/signup", async (c) => {
  try {
    const { password, name } = await c.req.json();

    if (!password || !name) {
      return c.json({ error: 'Name and password are required' }, 400);
    }

    // Convert name to email format
    const email = nameToEmail(name);

    // Create user in Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      // Automatically confirm the user's email since an email server hasn't been configured.
      email_confirm: true
    });

    if (error) {
      console.log(`Signup error: ${error.message}`);
      if (error.message.includes('already registered')) {
        return c.json({ error: 'この名前は既に使用されています' }, 400);
      }
      return c.json({ error: error.message }, 400);
    }

    // Store user profile in KV store
    await kv.set(`user:${data.user.id}`, {
      id: data.user.id,
      email,
      name,
      createdAt: new Date().toISOString(),
    });

    // Initialize user stats
    await kv.set(`stats:${data.user.id}`, {
      totalQuizzes: 0,
      totalCorrect: 0,
      totalAnswers: 0,
    });

    return c.json({
      message: 'User created successfully',
      userId: data.user.id
    });
  } catch (error) {
    console.log(`Signup error: ${error}`);
    return c.json({ error: 'Internal server error during signup' }, 500);
  }
});

// ===== Quiz Management Endpoints =====

// Get all quizzes (with optional filtering)
app.get("/make-server-856c5cf0/quizzes", async (c) => {
  try {
    console.log('Fetching quizzes from KV store...');
    const quizzes = await kv.getByPrefix('quiz:');
    console.log('Quizzes from KV:', quizzes);

    // If no quizzes exist, initialize with default data
    if (!quizzes || quizzes.length === 0) {
      console.log('No quizzes found, initializing...');
      await initializeQuizzes();
      await initializeCategories();
      const newQuizzes = await kv.getByPrefix('quiz:');
      console.log('New quizzes after initialization:', newQuizzes);
      return c.json({ quizzes: newQuizzes.filter(Boolean) });
    }

    // Filter out any null/undefined values and ensure all quizzes have required properties
    let validQuizzes = quizzes
      .filter(quiz => quiz && quiz.id && quiz.question && quiz.answer);

    // Get query parameters for filtering
    const subject = c.req.query('subject');
    const unit = c.req.query('unit');
    const difficulty = c.req.query('difficulty');
    const count = c.req.query('count');

    console.log('Query params:', { subject, unit, difficulty, count });

    // Apply filters if provided
    if (subject && subject !== 'all') {
      validQuizzes = validQuizzes.filter(quiz => quiz.subject === subject);
    }

    if (unit && unit !== 'all') {
      validQuizzes = validQuizzes.filter(quiz => quiz.unit === unit);
    }

    if (difficulty && difficulty !== 'mix') {
      const difficultyNum = parseInt(difficulty);
      validQuizzes = validQuizzes.filter(quiz => quiz.difficulty === difficultyNum);
    }

    // Shuffle quizzes for random selection
    if (count) {
      const shuffled = [...validQuizzes].sort(() => Math.random() - 0.5);
      const countNum = parseInt(count);
      validQuizzes = shuffled.slice(0, Math.min(countNum, shuffled.length));
    }

    console.log('Valid quizzes to return:', validQuizzes.length);
    return c.json({ quizzes: validQuizzes });
  } catch (error) {
    console.log(`Error fetching quizzes: ${error}`);
    return c.json({ error: 'Failed to fetch quizzes' }, 500);
  }
});

// Add a new quiz (admin function)
app.post("/make-server-856c5cf0/quizzes", async (c) => {
  try {
    const quiz = await c.req.json();
    const quizId = `quiz:${Date.now()}`;
    
    await kv.set(quizId, {
      id: quizId,
      ...quiz,
      createdAt: new Date().toISOString(),
    });

    return c.json({ message: 'Quiz created successfully', quizId });
  } catch (error) {
    console.log(`Error creating quiz: ${error}`);
    return c.json({ error: 'Failed to create quiz' }, 500);
  }
});

// Get all categories
app.get("/make-server-856c5cf0/categories", async (c) => {
  try {
    const categories = await kv.getByPrefix('category:');
    
    // If no categories exist, initialize them
    if (!categories || categories.length === 0) {
      await initializeCategories();
      const newCategories = await kv.getByPrefix('category:');
      return c.json({ categories: newCategories.filter(Boolean) });
    }

    const validCategories = categories
      .filter(category => category && category.id && category.name);

    return c.json({ categories: validCategories });
  } catch (error) {
    console.log(`Error fetching categories: ${error}`);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// ===== Answer Management Endpoints =====

// Save user answer
app.post("/make-server-856c5cf0/answers", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { quizId, userAnswer, isCorrect } = await c.req.json();

    if (!quizId || userAnswer === undefined || isCorrect === undefined) {
      return c.json({ error: 'quizId, userAnswer, and isCorrect are required' }, 400);
    }

    // Save answer
    const answerId = `answer:${user.id}:${quizId}:${Date.now()}`;
    await kv.set(answerId, {
      userId: user.id,
      quizId,
      userAnswer,
      isCorrect,
      answeredAt: new Date().toISOString(),
    });

    // Update user stats
    const statsKey = `stats:${user.id}`;
    const stats = await kv.get(statsKey) || { totalQuizzes: 0, totalCorrect: 0, totalAnswers: 0 };
    
    stats.totalAnswers = (stats.totalAnswers || 0) + 1;
    if (isCorrect) {
      stats.totalCorrect = (stats.totalCorrect || 0) + 1;
    }

    await kv.set(statsKey, stats);

    return c.json({ message: 'Answer saved successfully' });
  } catch (error) {
    console.log(`Error saving answer: ${error}`);
    return c.json({ error: 'Failed to save answer' }, 500);
  }
});

// Complete quiz session
app.post("/make-server-856c5cf0/complete-quiz", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const { correctCount, totalQuestions } = await c.req.json();

    // Update user stats
    const statsKey = `stats:${user.id}`;
    const stats = await kv.get(statsKey) || { totalQuizzes: 0, totalCorrect: 0, totalAnswers: 0 };
    
    stats.totalQuizzes = (stats.totalQuizzes || 0) + 1;

    await kv.set(statsKey, stats);

    return c.json({ message: 'Quiz session completed' });
  } catch (error) {
    console.log(`Error completing quiz: ${error}`);
    return c.json({ error: 'Failed to complete quiz' }, 500);
  }
});

// Get user statistics
app.get("/make-server-856c5cf0/stats", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const stats = await kv.get(`stats:${user.id}`) || { totalQuizzes: 0, totalCorrect: 0, totalAnswers: 0 };
    const userProfile = await kv.get(`user:${user.id}`);

    return c.json({ 
      stats,
      user: userProfile 
    });
  } catch (error) {
    console.log(`Error fetching stats: ${error}`);
    return c.json({ error: 'Failed to fetch stats' }, 500);
  }
});

// Get user answer history
app.get("/make-server-856c5cf0/history", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user || authError) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const answers = await kv.getByPrefix(`answer:${user.id}:`);
    
    return c.json({ 
      history: answers.map(a => a.value).sort((a, b) => 
        new Date(b.answeredAt).getTime() - new Date(a.answeredAt).getTime()
      )
    });
  } catch (error) {
    console.log(`Error fetching history: ${error}`);
    return c.json({ error: 'Failed to fetch history' }, 500);
  }
});

// ===== Helper Functions =====

async function initializeQuizzes() {
  const defaultQuizzes = [
    {
      id: 'quiz:1',
      question: '大名の領地や権限のことを何といい、江戸時代の支配体制を何といいますか。',
      answer: '藩（はん）・幕藩体制（ばくはんたいせい）',
      explanation: '大名が支配する領地と権限の単位を「藩」といい、将軍と大名が全国を支配する仕組みを「幕藩体制」と呼びます。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 1,
    },
    {
      id: 'quiz:2',
      question: '大名を3つの区分に分けると、何と何と何になりますか。',
      answer: '親藩（しんぱん）・譜代大名（ふだいだいみょう）・外様大名（とざまだいみょう）',
      explanation: '徳川家との関係や仕え始めた時期によって、大名は親藩・譜代・外様に分かれます。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 2,
    },
    {
      id: 'quiz:3',
      question: '徳川氏の親戚の大名である親藩のうち、特に格式の高い3つの藩を何といいますか。',
      answer: '御三家（ごさんけ）',
      explanation: '徳川氏一門の中で特に重視されたのが尾張・紀伊・水戸の三家で、御三家と呼ばれました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 3,
    },
    {
      id: 'quiz:4',
      question: '御三家をすべて答えなさい。',
      answer: '尾張藩・紀伊藩・水戸藩',
      explanation: '御三家は尾張（愛知）、紀伊（和歌山）、水戸（茨城）にあたります。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 4,
    },
    {
      id: 'quiz:5',
      question: '尾張は今の何県、紀伊は今の何県、水戸は今の何県にあたりますか。',
      answer: '尾張＝愛知、紀伊＝和歌山、水戸＝茨城',
      explanation: '現在の都道府県に置き換えるとこの組み合わせになります。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 5,
    },
    {
      id: 'quiz:6',
      question: '譜代大名とは、どの戦い以前から徳川氏に従っていた大名のことですか。',
      answer: '関ヶ原の戦い',
      explanation: '関ヶ原以前から徳川氏に仕えていた大名を「譜代大名」と呼びます。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 6,
    },
    {
      id: 'quiz:7',
      question: '外様大名の領地は、江戸から見てどのような場所に多くありましたか。',
      answer: '江戸から遠く',
      explanation: '幕府からの警戒のため外様大名は遠隔地に配置されました。',
      type: 'text',
      difficulty: 1,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 7,
    },
    {
      id: 'quiz:8',
      question: '徳川家康と2代将軍秀忠は、1614年と1615年のどの戦いで豊臣氏を滅ぼしましたか。',
      answer: '大阪冬の陣・大阪夏の陣・豊臣氏',
      explanation: '大坂の陣によって豊臣氏が滅び、江戸幕府の支配が確立しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 8,
    },
    {
      id: 'quiz:9',
      question: '大阪夏の陣のあとに出された、大名統制のための決まりを何といいますか。',
      answer: '武家諸法度',
      explanation: '大名を幕府の管理下に置くための根本法令です。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 9,
    },
    {
      id: 'quiz:10',
      question: '大阪夏の陣のあとに出された、朝廷や公家を統制するための決まりを何といいますか。',
      answer: '禁中並公家諸法度',
      explanation: '天皇・公家の政治力を抑え、幕府の支配体制を強化しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 10,
    },
    {
      id: 'quiz:11',
      question: '徳川家康は誰が始めた何という貿易を受け継ぎ、誰と誰を外交顧問としましたか。',
      answer: '豊臣秀吉の朱印船貿易・ウィリアム・アダムズ・ヤン・ヨーステン',
      explanation: '朱印船貿易を継続し、外国人航海士2名を外交に活用しました。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 11,
    },
    {
      id: 'quiz:12',
      question: '朱印船貿易において貿易の許可証と、その許可を得た船を何といいますか。',
      answer: '朱印状・朱印船',
      explanation: '将軍が発行する朱印状を持つ船のみ海外貿易が認められました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 12,
    },
    {
      id: 'quiz:13',
      question: '朱印船貿易で東南アジアにできた日本人町を何といいますか。',
      answer: '日本町',
      explanation: '多くの日本人が移住し自治や商業活動を行いました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 13,
    },
    {
      id: 'quiz:14',
      question: 'シャム（タイ）で活躍した日本人は誰ですか。',
      answer: '山田長政',
      explanation: '日本人傭兵団の指導者として王の信任を得ました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 14,
    },
    {
      id: 'quiz:15',
      question: '江戸幕府の3代将軍は誰ですか。',
      answer: '徳川家光',
      explanation: '参勤交代の制度化や鎖国完成など、幕府体制を固めました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      order: 15,
    },
    {
      id: 'quiz:16',
      question: '徳川家光の時代の政策・出来事を4つ答えなさい。',
      answer: '参勤交代・島原天草一揆・キリスト教禁止の徹底・鎖国',
      explanation: '家光時代に幕府の統制強化につながる重要政策が多数実施されました。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 16,
    },
    {
      id: 'quiz:17',
      question: 'キリスト教禁止のために設けられた制度と行為は何ですか。',
      answer: '寺請制度・絵踏',
      explanation: '寺に所属させる寺請制度と、像を踏ませる絵踏によって隠れキリシタンを摘発しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 17,
    },
    {
      id: 'quiz:18',
      question: '何年にどこの国の船を禁じて鎖国が完成しましたか。',
      answer: '1639年・ポルトガル船',
      explanation: 'ポルトガルとの断交により、鎖国体制が最終的に形を整えました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 18,
    },
    {
      id: 'quiz:19',
      question: '鎖国下で貿易が許された国を2つ答えなさい。',
      answer: 'オランダ・中国',
      explanation: '布教に積極的でなかったためこの2国に限定されました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 19,
    },
    {
      id: 'quiz:20',
      question: '1641年、オランダ商館はどこからどこの何へ移されましたか。',
      answer: '平戸から長崎の出島へ',
      explanation: '外国人の活動を制限するため人工島・出島へ移転させました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 20,
    },
    {
      id: 'quiz:21',
      question: '朝鮮との窓口となった藩と使節の名前を答えなさい。',
      answer: '対馬藩の宗氏・朝鮮通信使',
      explanation: '外交の門戸を開いた対馬藩宗氏が中心となり、朝鮮通信使が派遣されました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 21,
    },
    {
      id: 'quiz:22',
      question: '江戸時代の農民に課された連帯責任の仕組みを何といいますか。',
      answer: '五人組',
      explanation: '年貢の納入などを数戸のグループで互いに監視させました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 22,
    },
    {
      id: 'quiz:23',
      question: '江戸時代前半の文化を何文化といい、中心地はどこですか。',
      answer: '元禄文化・上方（京都・大阪）',
      explanation: '町人文化が発展し、上方を中心に文化が栄えました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 23,
    },
    {
      id: 'quiz:24',
      question: '「見返り美人図」の作者は誰ですか。',
      answer: '菱川師宣',
      explanation: '初期浮世絵の代表的画家で、美人画で知られます。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 24,
    },
    {
      id: 'quiz:25',
      question: '人形浄瑠璃の代表的な脚本家は誰ですか。',
      answer: '近松門左衛門',
      explanation: '「曽根崎心中」など名作を多数執筆しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 25,
    },
    {
      id: 'quiz:26',
      question: '元禄文化の時期の代表的俳人は誰ですか。',
      answer: '松尾芭蕉',
      explanation: '「奥の細道」で知られる俳諧の巨匠です。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 26,
    },
    {
      id: 'quiz:27',
      question: '江戸時代後半の文化を何文化といい、その中心地はどこですか。',
      answer: '化政文化・江戸',
      explanation: '江戸の町人文化が大きく花開いた時期です。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 27,
    },
    {
      id: 'quiz:28',
      question: '庶民の子どもに読み書きそろばんを教えた場所を何といいますか。',
      answer: '寺子屋',
      explanation: '全国に広く広まり、基本教育の中心となりました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 28,
    },
    {
      id: 'quiz:29',
      question: 'キリスト教と関係のない洋書の輸入を許可したことで起こった学問は何ですか。',
      answer: '蘭学',
      explanation: 'オランダ語の医学・科学書の研究が盛んになりました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 29,
    },
    {
      id: 'quiz:30',
      question: '『ターヘル・アナトミア』を翻訳し「解体新書」を出版した2名と原語は何語ですか。',
      answer: '杉田玄白・前野良沢・オランダ語・解体新書',
      explanation: '西洋医学を日本に紹介した重要な翻訳書です。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 30,
    },
    {
      id: 'quiz:31',
      question: '『富嶽三十六景』の作者は誰ですか。',
      answer: '葛飾北斎',
      explanation: '富士山を題材とした代表的浮世絵シリーズです。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 31,
    },
    {
      id: 'quiz:32',
      question: '『東海道五十三次』の作者は誰ですか。',
      answer: '歌川広重',
      explanation: '宿場町を描いた風景浮世絵で広く知られています。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      order: 32,
    }
  ];

  for (const quiz of defaultQuizzes) {
    await kv.set(quiz.id, quiz);
  }

  console.log('Quizzes initialized successfully');
}


async function initializeCategories() {
  const categories = [
    { id: 'category:1', name: '日本地理（自然・気候・地形）', order: 1 },
    { id: 'category:2', name: '日本地理（地域・都市・人口）', order: 2 },
    { id: 'category:3', name: '日本地理（産業：農林水産・工業・商業）', order: 3 },
    { id: 'category:4', name: '世界地理・国際関係', order: 4 },
    { id: 'category:5', name: '日本歴史（原始〜古代）', order: 5 },
    { id: 'category:6', name: '日本歴史（中世）', order: 6 },
    { id: 'category:7', name: '日本歴史（近世：政治・社会）', order: 7 },
    { id: 'category:8', name: '日本歴史（近世：外交・貿易・文化）', order: 8 },
    { id: 'category:9', name: '日本歴史（近代〜現代）', order: 9 },
    { id: 'category:10', name: '公民（政治・憲法）', order: 10 },
    { id: 'category:11', name: '公民（経済・くらし）', order: 11 },
    { id: 'category:12', name: '公民・時事（国際社会・現代の問題）', order: 12 },
  ];

  for (const category of categories) {
    await kv.set(category.id, category);
  }
  
  console.log('Categories initialized successfully');
}

Deno.serve(app.fetch);