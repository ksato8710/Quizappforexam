import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
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

// Sign up endpoint
app.post("/make-server-856c5cf0/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();

    if (!email || !password || !name) {
      return c.json({ error: 'Email, password, and name are required' }, 400);
    }

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

    // Filter out any null/undefined values and ensure all quizzes have required properties
    const validQuizzes = quizzes
      .map(q => q.value)
      .filter(quiz => quiz && quiz.id && quiz.question && quiz.answer);

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
      question: '江戸幕府の支配のしくみを、「○○体制」という一言で答えなさい。',
      answer: '幕藩体制',
      explanation: '江戸時代は、将軍が直接支配する**幕府の領地（幕領）**と、各地の**大名が支配する藩**が組み合わさって国を治めていました。このしくみをまとめて**幕藩体制**といいます。幕府が全国の大名を従えたしくみをおさえる、江戸時代の最重要キーワードです。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 1,
    },
    {
      id: 'quiz:2',
      question: '江戸幕府が大名をコントロールするために行った制度で、「大名に **1年おきに江戸と自分の領地を行き来させる** 制度」を何といいますか。',
      answer: '参勤交代',
      explanation: '**参勤交代**は、3代将軍徳川家光のときに決められた制度です。大名は1年ごとに江戸と領地を行き来し、妻子は人質のように江戸に住まわせ、行き来にかかるお金で、大名の財政も苦しくさせたことで、**反乱を起こさせないようにした**のが目的です。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 2,
    },
    {
      id: 'quiz:3',
      question: '江戸時代の村では、年貢の納入や犯罪防止のために、数戸の家を1組にまとめて**連帯責任**を負わせるしくみがありました。これを何といいますか。',
      answer: '五人組',
      explanation: '**五人組**は、だいたい5戸前後を1グループにして、年貢をきちんと納める、税を逃れようとする者・犯罪者を出さないといったことを、グループみんなで責任を持たせる制度です。1人が約束を破ると、**グループ全員が責任を問われる**ので、村人どうしで監視させるねらいがありました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 3,
    },
    {
      id: 'quiz:4',
      question: '江戸時代の身分制度で、次の語を**身分の高い順**に並べかえなさい。\n\n武士　／　町人　／　百姓',
      answer: '武士 → 百姓 → 町人',
      explanation: '江戸時代の身分は、**士農工商（しのうこうしょう）**と教わることが多いです。士：武士、農：百姓（農民）、工：職人、商：商人・問屋など。町人は、主に**職人と商人**を合わせた呼び方なので、**武士 → 百姓 → 町人（職人・商人）**の順で押さえておけばOKです。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 4,
    },
    {
      id: 'quiz:5',
      question: '江戸時代の百姓のうち、自分の田畑を持ち、年貢を納める義務を負っていた百姓を何といいますか。また、土地を持たず、他人の田畑を借りて耕していた百姓を何といいますか。',
      answer: '本百姓、水呑百姓',
      explanation: '**本百姓**は、田畑を所有し、年貢を直接納める義務を持つ、村の「正規メンバー」のような存在です。一方、**水呑百姓**は土地を持たず、他人の田畑を借りて耕して生活していました。本百姓の生活が苦しくなると、土地を手放して水呑百姓が増えていき、村の経済にも影響しました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 5,
    },
    {
      id: 'quiz:6',
      question: '江戸時代の鎖国の中で、ヨーロッパの国の中で唯一、日本との貿易を許された国はどこですか。また、その国との貿易の窓口となった港はどこですか。',
      answer: 'オランダ、長崎',
      explanation: '鎖国政策の中で、日本は**ポルトガル人を追放**し、キリスト教のひろがりをおそれましたが、オランダは宗教活動をほとんど行わなかったため、例外的に貿易を許されました。貿易の窓口は、**長崎の出島**という人工島で、オランダ商館が置かれ、銅・銀・生糸などを取引しました。ここを通じて、ヨーロッパの科学技術や医学などの知識（蘭学）が日本に入ってきました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 6,
    },
    {
      id: 'quiz:7',
      question: '江戸時代の鎖国のとき、日本が公式に交流・貿易をしていた相手と、その窓口となった場所の正しい組み合わせを、次から**すべて**選びなさい。\n\nア．中国 － 長崎\nイ．オランダ － 長崎\nウ．朝鮮 － 対馬\nエ．琉球 － 薩摩\nオ．アイヌの人びと － 松前',
      answer: 'ア・イ・ウ・エ・オ',
      explanation: '鎖国といっても、**完全に国を閉ざしたわけではなく**、限られた窓口で外国と交流していました。代表的な組み合わせは次のとおりです。中国（清）… 長崎、オランダ… 長崎（出島）、朝鮮… 対馬の藩を通じて（朝鮮通信使）、琉球王国… 薩摩藩を通じて、アイヌの人びと… 松前藩（蝦夷地）を通じて。これらを一気に覚える問題なので、やや難しめですが、**表にして整理して覚える**と得点源になります。',
      type: 'multiple-choice',
      choices: [
        'ア．中国 － 長崎',
        'イ．オランダ － 長崎',
        'ウ．朝鮮 － 対馬',
        'エ．琉球 － 薩摩',
        'オ．アイヌの人びと － 松前'
      ],
      difficulty: 4,
      categoryId: 'category:8',
      order: 7,
    },
    {
      id: 'quiz:8',
      question: '江戸幕府がキリスト教を厳しく禁止するきっかけの一つとなった、1637年〜38年に起こった大きな一揆を何といいますか。また、その一揆が起こった地方名を答えなさい。',
      answer: '島原・天草一揆、九州地方',
      explanation: '重い年貢やキリスト教信者への弾圧に苦しんだ農民・キリシタンたちが、九州の島原・天草地方で起こしたのが**島原・天草一揆**です。これを鎮圧した幕府は、キリスト教をさらに厳しく禁止、外国人宣教師・ポルトガル人の追放などを進め、のちの**鎖国政策強化**へとつながっていきました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 8,
    },
    {
      id: 'quiz:9',
      question: '江戸時代、日本は朝鮮とのあいだで友好関係を保っていました。朝鮮との外交を担当した日本側の藩を何といい、そのとき日本に送られてきた使節を何と呼びましたか。',
      answer: '対馬藩、朝鮮通信使',
      explanation: '鎖国といっても、周辺諸国との外交は続いており、**朝鮮との窓口が対馬藩**でした。朝鮮からは、将軍の代替わりのときなどに**朝鮮通信使**が派遣され、日本文化にも大きな影響を与えました。絵画・儒学・儀礼など、文化交流の側面も重要なポイントです。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 9,
    },
    {
      id: 'quiz:10',
      question: '鎖国の中でも、ヨーロッパの学問や科学が日本へ入ってくる道は完全には閉ざされていませんでした。オランダ語で書かれた学問を何と呼び、その学問が特に発達した分野を一つ答えなさい。',
      answer: '蘭学、医学',
      explanation: 'オランダとの貿易を通じて入ってきた書物をもとに発達した学問が**蘭学**です。特に**医学**の分野が有名で、解体新書（杉田玄白ら）などは典型的な例です。「鎖国＝西洋を完全シャットアウト」ではなく、**出島を通じて知識は入ってきていた**という視点が、中学受験ではよく問われます。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 10,
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