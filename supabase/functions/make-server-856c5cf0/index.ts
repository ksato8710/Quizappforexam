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

// ===== User Authentication Endpoints =====

// Login endpoint
app.post("/make-server-856c5cf0/login", async (c) => {
  try {
    const { name, password } = await c.req.json();

    if (!name || !password) {
      return c.json({ error: 'Name and password are required' }, 400);
    }

    // Find user by name in KV store
    const allUsers = await kv.getByPrefix('user:');
    const userRecord = allUsers.find(u => u.value?.name === name);

    if (!userRecord) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    const userProfile = userRecord.value;

    // Sign in with Supabase Auth using email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userProfile.email,
      password: password,
    });

    if (error) {
      console.log(`Login error: ${error.message}`);
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    return c.json({
      accessToken: data.session.access_token,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        email: userProfile.email,
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

    // Check if user with this name already exists
    const allUsers = await kv.getByPrefix('user:');
    const existingUser = allUsers.find(u => u.value?.name === name);

    if (existingUser) {
      return c.json({ error: 'User with this name already exists' }, 400);
    }

    // Generate a unique email from the name
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@quizapp.local`;

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

// Get all quizzes
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
      return c.json({ quizzes: newQuizzes.map(q => q.value).filter(Boolean) });
    }

    const url = new URL(c.req.url);
    const subjectFilter = url.searchParams.get('subject');
    const unitFilter = url.searchParams.get('unit');
    const difficultyParam = url.searchParams.get('difficulty');
    const countParam = url.searchParams.get('count');
    const historyFilter = url.searchParams.get('historyFilter');

    let answeredSet: Set<string> | null = null;
    let correctSet: Set<string> | null = null;

    if (historyFilter === 'unanswered' || historyFilter === 'uncorrected') {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

      if (!user || authError) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      const answerRecords = await kv.getByPrefix(`answer:${user.id}:`);
      const answers = answerRecords
        .map(record => record.value)
        .filter((entry): entry is { quizId?: string; isCorrect?: boolean } => Boolean(entry));

      answeredSet = new Set(
        answers
          .map(answer => answer.quizId)
          .filter((quizId): quizId is string => Boolean(quizId))
      );

      correctSet = new Set(
        answers
          .filter(answer => answer.isCorrect)
          .map(answer => answer.quizId)
          .filter((quizId): quizId is string => Boolean(quizId))
      );
    }

    // Filter out any null/undefined values and ensure all quizzes have required properties
    let validQuizzes = quizzes
      .map(q => q.value)
      .filter(quiz => quiz && quiz.id && quiz.question && quiz.answer);

    if (subjectFilter && subjectFilter !== 'all') {
      validQuizzes = validQuizzes.filter(quiz => quiz.subject === subjectFilter);
    }

    if (unitFilter && unitFilter !== 'all') {
      validQuizzes = validQuizzes.filter(quiz => quiz.unit === unitFilter);
    }

    if (difficultyParam && difficultyParam !== 'mix') {
      const difficulty = parseInt(difficultyParam, 10);
      if (!Number.isNaN(difficulty)) {
        validQuizzes = validQuizzes.filter(quiz => quiz.difficulty === difficulty);
      }
    }

    if (historyFilter === 'unanswered' && answeredSet) {
      validQuizzes = validQuizzes.filter(quiz => !answeredSet!.has(quiz.id));
    }

    if (historyFilter === 'uncorrected' && answeredSet && correctSet) {
      validQuizzes = validQuizzes.filter(quiz => answeredSet!.has(quiz.id) && !correctSet!.has(quiz.id));
    }

    if (countParam) {
      const count = parseInt(countParam, 10);
      if (!Number.isNaN(count) && count > 0 && validQuizzes.length > count) {
        // Shuffle array shallowly before slicing to avoid always taking the same quizzes
        validQuizzes = [...validQuizzes].sort(() => Math.random() - 0.5).slice(0, count);
      }
    }

    console.log('Valid quizzes to return:', validQuizzes);
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
      return c.json({ categories: newCategories.map(cat => cat.value).filter(Boolean) });
    }

    const validCategories = categories
      .map(cat => cat.value)
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
      question: '1.5Vのかん電池を1個直列につないだ回路に、同じかん電池をもう1個直列につなぐと、豆電球の両端の電圧はどうなりますか。',
      answer: '3.0Vになる',
      explanation: '直列につないだ電池の電圧は足し算になります。1.5V＋1.5V＝3.0V です。',
      type: 'multiple-choice',
      choices: ['1.5Vのまま', '3.0Vになる', '0.75Vになる'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 1,
    },
    {
      id: 'quiz:2',
      question: '1.5Vのかん電池を4個直列につないだとき、両端の電圧はいくらになりますか。',
      answer: '6.0V',
      explanation: '1.5Vの電池4個分なので、1.5×4＝6.0V になります。',
      type: 'text',
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 2,
    },
    {
      id: 'quiz:3',
      question: '電気抵抗が一定のとき、電圧と電流の大きさの関係として正しいのはどれですか。',
      answer: '正比例の関係がある',
      explanation: 'オームの法則より、電圧Vと電流Iは V∝I の関係になり、電圧を2倍、3倍にすると電流も2倍、3倍になります。',
      type: 'multiple-choice',
      choices: ['正比例の関係がある', '反比例の関係がある', '関係はない'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 3,
    },
    {
      id: 'quiz:4',
      question: 'ある豆電球に1.5Vをかけると電流が0.6A流れました。同じ豆電球に3.0Vをかけたときの電流の大きさはいくらになりますか。',
      answer: '1.2A',
      explanation: '電圧が2倍（1.5V→3.0V）になると、電流も2倍になります。0.6A×2＝1.2A です。',
      type: 'text',
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 4,
    },
    {
      id: 'quiz:5',
      question: '同じ豆電球に1.5Vと3.0Vをそれぞれかけたとき、明るさはどうなると考えられますか。',
      answer: '3.0Vのほうがだいたい2倍くらい明るくなる',
      explanation: '電圧が2倍になると流れる電流も2倍になり、豆電球はおよそ2倍明るくなります（実際には完全な2倍ではないが、教科書レベルではそう考えます）。',
      type: 'multiple-choice',
      choices: ['どちらも同じ明るさ', '3.0Vのほうがだいたい2倍くらい明るい', '3.0Vのほうがだいたい半分の明るさ'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 5,
    },
    {
      id: 'quiz:6',
      question: '電気抵抗が一定のとき、「電圧を2倍、3倍と大きくすると、電流も2倍、3倍になる。」という文は正しいですか。',
      answer: '正しい',
      explanation: 'V∝I の関係が成り立つので、電圧を何倍かにすると電流も同じ倍率で変化します。',
      type: 'multiple-choice',
      choices: ['正しい', '間違っている'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 6,
    },
    {
      id: 'quiz:7',
      question: '同じ豆電球を直列につないで数を増やしていくと、回路全体の電気抵抗はどうなりますか。',
      answer: '豆電球の数に比例して大きくなる',
      explanation: '同じ抵抗を直列につなぐと、全体の抵抗は足し算なので、個数に正比例して大きくなります。',
      type: 'multiple-choice',
      choices: ['豆電球の数に比例して大きくなる', '豆電球の数に比例して小さくなる', '変わらない'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 7,
    },
    {
      id: 'quiz:8',
      question: '豆電球1個をつないだときの電気抵抗は2.5Ωでした。同じ豆電球2個を直列につないだとき、回路全体の電気抵抗はいくらになりますか。',
      answer: '5.0Ω',
      explanation: '同じ抵抗2.5Ωを2つ直列なので、2.5＋2.5＝5.0Ωです。',
      type: 'text',
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 8,
    },
    {
      id: 'quiz:9',
      question: '1.5Vのかん電池1個と、豆電球2個を直列につないだ回路の電気抵抗は5.0Ωです。このとき回路に流れる電流はいくらになりますか。',
      answer: '0.3A',
      explanation: 'I＝V÷R なので、1.5÷5.0＝0.3A です。',
      type: 'text',
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 9,
    },
    {
      id: 'quiz:10',
      question: '豆電球4個を直列につないだ回路では、電気抵抗が10Ωになりました。このとき1.5Vのかん電池1個をつなぐと、流れる電流はいくらになりますか。',
      answer: '0.15A',
      explanation: 'I＝V÷R＝1.5÷10＝0.15A です。',
      type: 'text',
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 10,
    },
    {
      id: 'quiz:11',
      question: '電圧が一定のとき、電気抵抗と電流の大きさの関係として正しいのはどれですか。',
      answer: '反比例の関係がある',
      explanation: 'V＝I×R より、Vが一定なら I∝1/R となり、抵抗が大きいほど電流は小さくなります。',
      type: 'multiple-choice',
      choices: ['正比例の関係がある', '反比例の関係がある', '関係はない'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 11,
    },
    {
      id: 'quiz:12',
      question: '回路A：かん電池1個と豆電球3個を直列につないだ回路\\n回路B：かん電池3個と豆電球1個を直列につないだ回路\\n1つの豆電球がより明るくつくのはどちらですか。',
      answer: '回路B',
      explanation: '回路Bのほうが豆電球1個にかかる電圧が大きくなるため、流れる電流も大きくなり明るくつきます。',
      type: 'multiple-choice',
      choices: ['回路A', '回路B', 'どちらも同じ明るさ'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 12,
    },
    {
      id: 'quiz:13',
      question: '1.5Vのかん電池を2個並列につないだとき、豆電球の両端の電圧はどうなりますか。',
      answer: '1.5Vのまま変わらない',
      explanation: '並列につないだ電池の電圧は1個のときと同じで、電流を分け合うだけです。',
      type: 'multiple-choice',
      choices: ['3.0Vになる', '1.5Vのまま変わらない', '0.75Vになる'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 13,
    },
    {
      id: 'quiz:14',
      question: 'かん電池2個を並列につなぎ、豆電球1個をつないだところ、豆電球を流れる電流は0.6Aでした。このとき、1つのかん電池を流れる電流の大きさはいくらになりますか。（2個で均等に分かれるとします）',
      answer: '0.3A',
      explanation: '二つのかん電池で電流を半分ずつ分け合うので、0.6A÷2＝0.3A です。',
      type: 'text',
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 14,
    },
    {
      id: 'quiz:15',
      question: '1.5Vのかん電池1個と豆電球を並列につないだとき、豆電球を1個・2個・4個と増やしていったときの回路全体の電流は、表よりそれぞれ0.6A・1.2A・2.4Aでした。豆電球1個あたりに流れる電流はどうなっていますか。',
      answer: 'どのときも1個あたり0.6Aで同じ',
      explanation: '並列回路では1つ1つの豆電球の両端の電圧は同じなので、それぞれ0.6Aずつ流れます。',
      type: 'multiple-choice',
      choices: ['豆電球の数が増えるほど1個あたりの電流も増える', 'どのときも1個あたり0.6Aで同じ', '豆電球の数が増えるほど1個あたりの電流は減る'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 15,
    },
    {
      id: 'quiz:16',
      question: '豆電球を並列につないだとき、豆電球の数と回路全体の電気抵抗の大きさの関係として正しいのはどれですか。',
      answer: '豆電球の数が増えるほど電気抵抗は小さくなる（反比例の関係がある）',
      explanation: '並列につなぐと、電流の通り道が増えるので、全体の抵抗は小さくなります。個数と全体の抵抗は反比例の関係です。',
      type: 'multiple-choice',
      choices: ['数が増えるほど電気抵抗は大きくなる', '数が増えるほど電気抵抗は小さくなる', '電気抵抗は変わらない'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 16,
    },
    {
      id: 'quiz:17',
      question: '同じ明るさで豆電球をつけるとき、かん電池がより長持ちするのはどちらのつなぎ方ですか。\\n\\nA: 電池を直列につなぐ\\nB: 電池を並列につなぐ',
      answer: 'B: 電池を並列につなぐ',
      explanation: '並列につなぐと1本あたりに流れる電流が小さくなり、1本1本の電池の消耗がゆるやかになります。',
      type: 'multiple-choice',
      choices: ['A: 電池を直列につなぐ', 'B: 電池を並列につなぐ'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 17,
    },
    {
      id: 'quiz:18',
      question: '電池を並列につなぐと長持ちする理由を、簡単に1文で説明しなさい。',
      answer: '電池を並列につなぐと、1本あたりを流れる電流が小さくなるから。',
      explanation: '同じ明るさでも電流を分け合うため、1本の電池にかかる負担が小さくなり、結果として長持ちします。',
      type: 'text',
      difficulty: 4,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 18,
    },
    {
      id: 'quiz:19',
      question: '断面積0.1mm²のニクロム線10cmを使った回路で、電流が0.6A流れました。同じ太さで長さを20cmにしたとき、流れる電流はいくらになりますか。（教科書の表にしたがう）',
      answer: '0.3A',
      explanation: '長さが2倍になると抵抗も2倍になり、電流は1/2になります。0.6A÷2＝0.3A です。',
      type: 'text',
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 19,
    },
    {
      id: 'quiz:20',
      question: '同じ太さのニクロム線で、長さ10cm・20cm・30cmのときの電流が0.6A・0.3A・0.2Aになりました。ニクロム線の長さと、流れる電流の大きさの関係として正しいのはどれですか。',
      answer: '反比例の関係がある',
      explanation: '長さが長くなるほど電流は小さくなっており、長さと電流は反比例の関係になっています。',
      type: 'multiple-choice',
      choices: ['正比例の関係がある', '反比例の関係がある', '関係はない'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 20,
    },
    {
      id: 'quiz:21',
      question: 'ニクロム線の長さと電気抵抗の関係として正しいものを選びなさい。',
      answer: '長さが長いほど電気抵抗は大きくなる',
      explanation: '同じ太さなら、線が長いほど電流のじゃまをする部分が増えるので、電気抵抗も大きくなります。',
      type: 'multiple-choice',
      choices: ['長さが長いほど電気抵抗は小さくなる', '長さが長いほど電気抵抗は大きくなる', '長さと電気抵抗に関係はない'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 21,
    },
    {
      id: 'quiz:22',
      question: '長さ10cmで断面積0.1mm²のニクロム線に電流0.6Aが流れました。断面積だけを0.2mm²（2倍）にして長さを10cmのままにすると、流れる電流はいくらになりますか。（教科書の表にしたがう）',
      answer: '1.2A',
      explanation: '断面積が2倍になると抵抗は半分になり、電流は2倍になります。0.6A×2＝1.2A です。',
      type: 'text',
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 22,
    },
    {
      id: 'quiz:23',
      question: 'ニクロム線の断面積（太さ）と流れる電流の大きさの関係として正しいのはどれですか。',
      answer: '正比例の関係がある',
      explanation: '同じ長さなら、太くするほど抵抗が小さくなり、同じ電圧でもより大きな電流が流れます。',
      type: 'multiple-choice',
      choices: ['正比例の関係がある', '反比例の関係がある', '関係はない'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 23,
    },
    {
      id: 'quiz:24',
      question: 'ニクロム線の断面積（太さ）と電気抵抗の大きさの関係として正しいものを選びなさい。',
      answer: '断面積が大きいほど電気抵抗は小さくなる（反比例）',
      explanation: '太くすると電流の通り道が広くなるので、電気抵抗は小さくなり、断面積と抵抗は反比例の関係になります。',
      type: 'multiple-choice',
      choices: ['断面積が大きいほど電気抵抗は大きくなる', '断面積が大きいほど電気抵抗は小さくなる', '断面積と電気抵抗に関係はない'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 24,
    },
    {
      id: 'quiz:25',
      question: 'ニクロム線の長さと断面積の両方を2倍にしたとき、電気抵抗の大きさはどうなりますか。\\n（長さ2倍で抵抗2倍、断面積2倍で抵抗1/2になることを使う）',
      answer: '変わらない',
      explanation: '長さ2倍で抵抗2倍、断面積2倍で抵抗1/2倍なので、2倍×1/2＝1倍となり、結果として変わりません。',
      type: 'multiple-choice',
      choices: ['2倍になる', '1/2になる', '変わらない'],
      difficulty: 4,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 25,
    },
    {
      id: 'quiz:26',
      question: '同じ断面積のニクロム線を何本か直列につないだとき、全体としてはどのようなニクロム線1本と考えることができますか。',
      answer: '長さを足した1本の長いニクロム線と考えられる',
      explanation: '直列につなぐと電流は1本ずつ順番に流れるので、全体の抵抗は長さを足したのと同じになります。',
      type: 'multiple-choice',
      choices: ['長さを足した1本の長いニクロム線', '断面積を足した1本の太いニクロム線', 'どちらでもない'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 26,
    },
    {
      id: 'quiz:27',
      question: '同じ長さのニクロム線を2本並列につないだとき、全体としてはどのようなニクロム線1本と考えることができますか。',
      answer: '断面積が2倍になった1本のニクロム線と考えられる',
      explanation: '並列は電流の通り道が増えるつなぎ方なので、長さは同じで太さだけ2倍になったと考えられます。',
      type: 'multiple-choice',
      choices: ['長さが2倍のニクロム線', '断面積が2倍のニクロム線', '長さも断面積も2倍のニクロム線'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 27,
    },
    {
      id: 'quiz:28',
      question: '豆電球を2個直列につないだ回路は、ニクロム線で言いかえると、ニクロム線のどの量が2倍になったと考えられますか。',
      answer: '長さが2倍になったと考えられる',
      explanation: '同じ豆電球2個は同じ抵抗2つを直列につないだのと同じなので、抵抗（長さ）が2倍のニクロム線1本に対応します。',
      type: 'multiple-choice',
      choices: ['長さ', '断面積', '電圧'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 28,
    },
    {
      id: 'quiz:29',
      question: '豆電球を2個並列につないだ回路は、ニクロム線で言いかえると、ニクロム線のどの量が2倍になったと考えられますか。',
      answer: '断面積が2倍になったと考えられる',
      explanation: '並列につなぐと電流の通り道が増えるので、太さ（断面積）が2倍のニクロム線1本と同じ働きをします。',
      type: 'multiple-choice',
      choices: ['長さ', '断面積', '電圧'],
      difficulty: 3,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 29,
    },
    {
      id: 'quiz:30',
      question: '電流計は回路のどのような量をはかる道具ですか。',
      answer: '電流の大きさをはかる道具',
      explanation: '電流計のAはアンペアのAで、回路に流れる電流（アンペア）を読み取ります。',
      type: 'multiple-choice',
      choices: ['電圧の大きさをはかる道具', '電流の大きさをはかる道具', '電気抵抗の大きさをはかる道具'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 30,
    },
    {
      id: 'quiz:31',
      question: '電流計は、回路のどのようなつなぎ方で使うのが正しいですか。',
      answer: '調べたい部分に直列につなぐ',
      explanation: '電流は一列に流れるので、調べたい部分と同じ列になるように直列につなぎます。',
      type: 'multiple-choice',
      choices: ['調べたい部分に直列につなぐ', '調べたい部分に並列につなぐ', 'どこにつないでもよい'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 31,
    },
    {
      id: 'quiz:32',
      question: '電流計のレンジに5A・500mA・50mAの3つがあるとき、初めて測定するときはどのレンジからつなぐべきですか。',
      answer: '5Aのレンジ',
      explanation: '最初は最大値の大きいレンジを使うことで、予想より大きな電流が流れていても計器がこわれにくくなります。',
      type: 'multiple-choice',
      choices: ['5Aのレンジ', '500mAのレンジ', '50mAのレンジ'],
      difficulty: 2,
      subject: '理科',
      unit: '電流・電圧と電気抵抗',
      categoryId: 'category:7',
      order: 32,
    },
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
