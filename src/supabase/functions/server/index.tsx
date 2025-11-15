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

// ===== Helper Functions for Auth =====

// Convert name to email format for Supabase Auth
function nameToEmail(name: string): string {
  const sanitized = name.toLowerCase().trim().replace(/\s+/g, '_');
  return `${sanitized}@quizapp.local`;
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
    const categoryId = c.req.query('categoryId');
    const difficulty = c.req.query('difficulty');
    const count = c.req.query('count');

    console.log('Query params:', { categoryId, difficulty, count });

    // Apply filters if provided
    if (categoryId && categoryId !== 'all') {
      validQuizzes = validQuizzes.filter(quiz => quiz.categoryId === categoryId);
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
    },
    {
      id: 'quiz:11',
      question: '江戸幕府の将軍の補佐役で、政務の中心として実務を行った役職を何といいますか。',
      answer: '老中（ろうじゅう）',
      explanation: '老中は、幕府の政治を実際に動かす中心役で、外交・大名統制・財政など幅広く担当しました。将軍一人では政治を行えないので、こうした役職が支えていました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 11,
    },
    {
      id: 'quiz:12',
      question: '徳川将軍家の一族で、特に江戸幕府にとって身近で信頼された大名を何と呼びますか。',
      answer: '親藩（しんぱん）',
      explanation: '親藩は徳川家の一族で、尾張・紀伊・水戸などが代表です。幕府にとって味方として最も頼りにされたグループで、将軍がいなくなったときの候補になることもありました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 12,
    },
    {
      id: 'quiz:13',
      question: '江戸幕府成立以前から徳川家に仕えていた大名を何と呼びますか。',
      answer: '譜代大名（ふだいだいみょう）',
      explanation: '譜代大名は、関ヶ原の戦い以前から徳川家に仕えていた大名です。幕府の要地（江戸周辺や交通の要所）に配置され、参勤交代や幕政の重要ポストにも多く起用されました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 13,
    },
    {
      id: 'quiz:14',
      question: '関ヶ原の戦い以後に徳川家に従った大名で、大きな領地を与えられたが幕府から最も警戒されたグループを何といいますか。',
      answer: '外様大名（とざまだいみょう）',
      explanation: '外様大名は、薩摩・長州・加賀など、大きな力をもつ一方で幕府にとって潜在的な脅威でもありました。そのため、国元は遠くに置かれ、幕政の中枢にはあまり参加させてもらえませんでした。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 14,
    },
    {
      id: 'quiz:15',
      question: '江戸幕府の直轄領（将軍が直接支配する土地）を何といいますか。また、その管理を任された役人を何といいますか。',
      answer: '天領（てんりょう）、代官（だいかん）',
      explanation: '将軍の直接の支配地は天領と呼ばれ、重要な鉱山や交通の要所などが含まれました。そこを管理したのが代官で、年貢の取り立てや治安維持を担当しました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 15,
    },
    {
      id: 'quiz:16',
      question: '村の代表として年貢のとりまとめや役所との連絡役をした人を、一般に何と呼びますか。',
      answer: '名主（なぬし）／庄屋（しょうや）',
      explanation: '村のトップは地方によって呼び名が違い、関東で名主、関西で庄屋ということが多いです。年貢の納入や村のトラブル処理など、村の自治の中心でした。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 16,
    },
    {
      id: 'quiz:17',
      question: '村役人のうち、名主を助ける役として村人のとりまとめなどを行った人を何といいますか。',
      answer: '組頭（くみがしら）',
      explanation: '組頭は、名主・庄屋をサポートする中堅の村役人で、村の中のいくつかのグループをまとめました。村の支配がスムーズにいくよう、細かい現場の管理を担いました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 17,
    },
    {
      id: 'quiz:18',
      question: '村人の意見を代表して、領主や代官に訴え出る役目をした村役人を何といいますか。',
      answer: '百姓代（ひゃくしょうだい）',
      explanation: '百姓代は、村人側の代表として年貢の相談や不満の調整役をしました。支配される側の声を代弁する立場で、村人から選ばれるのが一般的です。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 18,
    },
    {
      id: 'quiz:19',
      question: '江戸時代の年貢は主に何という作物で納められましたか。また、その量を決めるための土地調査を何といいますか。',
      answer: '米、検地（けんち）',
      explanation: '年貢の基本は米で、「石高（こくだか）」という単位で見積もりました。その前提になるのが検地で、土地の広さや良しあしをくわしく調べ、年貢の基準としました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 19,
    },
    {
      id: 'quiz:20',
      question: '江戸時代の武士は、主にどのような形で収入（給料）をもらっていましたか。次の中から最も適切なものを選びなさい。\n\nア．金貨を毎月もらう\nイ．米を石高で受け取る\nウ．商品売買の利益で得る',
      answer: 'イ．米を石高で受け取る',
      explanation: '武士の給料は米が基本で、○○石という形で支給されました。これを**俸禄（ほうろく）**といい、必要に応じて米を売ってお金に換えて生活しました。',
      type: 'multiple-choice',
      choices: [
        'ア．金貨を毎月もらう',
        'イ．米を石高で受け取る',
        'ウ．商品売買の利益で得る'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 20,
    },
    {
      id: 'quiz:21',
      question: '江戸時代に、村の百姓たちが年貢の軽減などを求めて、領主や代官に対して集団で訴えたり、時に暴力をともなう行動に出たりしたことを何といいますか。',
      answer: '百姓一揆（ひゃくしょういっき）',
      explanation: '百姓一揆は、重い年貢や悪政に対する農民の抵抗運動です。初めは代表がうったえる「代表越訴型」から、時代が下ると打ちこわしをともなう激しいものも増えました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 21,
    },
    {
      id: 'quiz:22',
      question: '都市の町人が米屋や酒屋などをおそい、店の物をこわしたり、ただ同然で奪ったりする騒動を何といいますか。',
      answer: '打ちこわし（うちこわし）',
      explanation: '打ちこわしは、物価の高騰や商人の不正への不満から起こりました。百姓一揆が「農村の反乱」なら、打ちこわしは「都市の町人による反乱」とおさえると整理しやすいです。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 22,
    },
    {
      id: 'quiz:23',
      question: '江戸時代の農業の発達で、田畑を新しく開いて増やしていくことを何といいますか。',
      answer: '新田開発（しんでんかいはつ）',
      explanation: '人口増加と年貢増収のため、幕府や大名は新田開発を奨励しました。干拓地や山あいの土地が田畑に変わり、米の生産量は大きく伸びました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 23,
    },
    {
      id: 'quiz:24',
      question: '江戸時代の農村では、米のほかに売るために特別に作られた作物がありました。綿・菜種・たばこ・あい・茶などのような作物をまとめて何と呼びますか。',
      answer: '商品作物（しょうひんさくもつ）',
      explanation: '自家用ではなく市場で売ることを前提に作ったのが商品作物です。これによって農家にも現金収入が増え、商業や運送業の発達にもつながりました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 24,
    },
    {
      id: 'quiz:25',
      question: '江戸時代に普及した農具で、稲からもみを効率よくこそぎ取ることができる道具を何といいますか。',
      answer: '千歯こき（せんばこき）',
      explanation: '千歯こきは、多くの歯がついた道具で、稲をしごいてもみを落とすことができます。収穫作業が大幅に効率化され、農業生産の向上に大きく貢献しました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 25,
    },
    {
      id: 'quiz:26',
      question: '江戸時代の三都と呼ばれる3つの都市をすべて答えなさい。',
      answer: '江戸・大阪・京都',
      explanation: '政治の中心が江戸、商業の中心が大阪、朝廷や伝統文化の中心が京都でした。この三つをまとめて三都と呼び、経済・文化の中心地として栄えました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 26,
    },
    {
      id: 'quiz:27',
      question: '大阪は江戸時代、「○○の台所」と呼ばれて全国の物資が集まりました。○○に入る言葉を答えなさい。',
      answer: '天下',
      explanation: '大阪は天下の台所と呼ばれ、全国から米や海産物などが集まる商業都市でした。大名の蔵屋敷も多く置かれ、米の取引を通じて全国の経済を動かしていました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 27,
    },
    {
      id: 'quiz:28',
      question: '江戸時代、江戸や大阪などに置かれた大名の倉庫と役所を合わせた施設で、年貢米などをためて売る場所を何といいますか。',
      answer: '蔵屋敷（くらやしき）',
      explanation: '蔵屋敷には、大名が集めた年貢米などが保管され、必要に応じて売却されました。ここでの取引を通じて、大名は現金収入を得て、藩の財政を支えました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 28,
    },
    {
      id: 'quiz:29',
      question: '江戸時代の商人のうち、特定の商品を扱う仲間を作り、幕府から独占的な営業権を与えられたグループを何といいますか。',
      answer: '株仲間（かぶなかま）',
      explanation: '株仲間は、幕府に税を納める代わりに、一定の品物の取引を独占できました。幕府にとっては税収の安定、商人にとっては利益の安定というメリットがありました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 29,
    },
    {
      id: 'quiz:30',
      question: '江戸時代の交通の発達で、江戸と京都・大阪を結ぶ五つの主要な街道をまとめて何といいますか。',
      answer: '五街道（ごかいどう）',
      explanation: '五街道は、東海道・中山道・甲州街道・奥州街道・日光街道の五つです。参勤交代や人・物の移動を支え、宿場町の発達にもつながりました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 30,
    },
    {
      id: 'quiz:31',
      question: '五街道沿いに発達した、旅人が泊まったり馬をかりかえたりできる集落を何といいますか。',
      answer: '宿場町（しゅくばまち）',
      explanation: '宿場町は、参勤交代の大名行列などを受け入れる重要な拠点でした。旅籠屋（はたごや）・問屋場（といやば）などがあり、交通の発達とともににぎわいました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 31,
    },
    {
      id: 'quiz:32',
      question: '江戸時代の身分制度で、「士農工商」の外側に置かれ、差別を受けていた人びとを当時何と呼んでいましたか。代表的な二つの呼び名を答えなさい。',
      answer: 'えた・ひにん',
      explanation: 'えた・ひにんと呼ばれた人びとは、皮革業や掃除、雑役など特定の仕事を担いながらも、社会的に差別されました。現在では差別をなくすため、これらの呼び名を使わないことが大切とされています。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 32,
    },
    {
      id: 'quiz:33',
      question: 'キリスト教徒を見つけ出すため、イエス・キリストや聖母マリアの絵をふませて信仰を試した制度を何といいますか。',
      answer: '絵踏（えふみ）',
      explanation: '絵踏で踏むことを拒めば、キリスト教信者とみなされ、厳しい処罰を受けました。幕府はキリスト教が支配のじゃまになると考え、徹底的に取り締まりました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 33,
    },
    {
      id: 'quiz:34',
      question: '江戸時代に、すべての人にどこかの寺に所属させ、寺がその人の身元を証明することでキリスト教徒でないことを確認した制度を何といいますか。',
      answer: '寺請制度（てらうけせいど）',
      explanation: '寺請制度では、寺が「この人はキリスト教徒ではない」という証明書（寺請証文）を出しました。宗教政策であると同時に、人口把握や支配のしくみとしても役立ちました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 34,
    },
    {
      id: 'quiz:35',
      question: '江戸幕府が、キリスト教を禁止し、外国との貿易を制限していった政策をまとめて何と呼びますか。',
      answer: '鎖国（さこく）',
      explanation: '鎖国は、ポルトガル人の追放や貿易港の限定など、約30年かけて段階的に作られた体制です。目的は、キリスト教の完全な禁止と、大名や外国勢力からの政治的な脅威を防ぐことでした。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 35,
    },
    {
      id: 'quiz:36',
      question: '鎖国のきっかけの一つになった島原・天草一揆の中心人物として知られる青年を何といいますか。',
      answer: '天草四郎（あまくさしろう）',
      explanation: '天草四郎時貞は、キリシタンのリーダー的存在として伝えられています。実像には不明な点も多いですが、重税と弾圧に苦しむ人びとの象徴のような存在です。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 36,
    },
    {
      id: 'quiz:37',
      question: '次の中で、江戸時代にキリスト教の布教をしたヨーロッパ人を何と呼びましたか。正しいものを選びなさい。\n\nア．サムライ\nイ．バテレン\nウ．サムライ商人',
      answer: 'イ．バテレン',
      explanation: 'バテレンは、ポルトガル語の「パードレ」（神父）がなまった言葉です。幕府は「バテレン追放令」を出して宣教師を追放し、キリスト教を取り締まりました。',
      type: 'multiple-choice',
      choices: [
        'ア．サムライ',
        'イ．バテレン',
        'ウ．サムライ商人'
      ],
      difficulty: 3,
      categoryId: 'category:8',
      order: 37,
    },
    {
      id: 'quiz:38',
      question: '江戸時代、ポルトガル船の来航が禁止され、日本に残ったヨーロッパとの窓口はオランダだけになりました。このポルトガル船来航禁止を行った将軍は誰ですか。',
      answer: '徳川家光（とくがわいえみつ）',
      explanation: '3代将軍徳川家光のとき、島原・天草一揆ののちポルトガル船を追放し、鎖国体制をほぼ完成させました。同時に参勤交代も制度化するなど、幕府支配の基盤を固めた人物です。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 38,
    },
    {
      id: 'quiz:39',
      question: '鎖国の時代、日本と中国（清）はどこの港を通じて貿易を行っていましたか。',
      answer: '長崎（ながさき）',
      explanation: '長崎は、オランダと中国の貿易港として特別に開かれていました。ここから絹織物・香辛料・漢方薬などが入り、日本からは銅や銀が輸出されました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 39,
    },
    {
      id: 'quiz:40',
      question: '長崎の出島に置かれていたオランダの役所を何といいますか。',
      answer: 'オランダ商館（しょうかん）',
      explanation: 'オランダ商館は、出島に置かれたオランダの拠点で、商取引とともに情報の窓口にもなっていました。商館長（カピタン）は定期的に江戸に参府し、将軍へのお祝いの品などを届けました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 40,
    },
    {
      id: 'quiz:41',
      question: '江戸時代、日本が朝鮮と友好関係を保つために、朝鮮から何という使節が日本に送られてきましたか。',
      answer: '朝鮮通信使（ちょうせんつうしんし）',
      explanation: '朝鮮通信使は、将軍の代替わりなどのときに派遣された公式の使節団です。大行列は日本各地の人びとにも見られ、朝鮮文化が日本に伝わるきっかけにもなりました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 41,
    },
    {
      id: 'quiz:42',
      question: '朝鮮との外交を担当し、朝鮮通信使を迎え入れた日本側の藩はどこですか。',
      answer: '対馬藩（つしまはん）',
      explanation: '対馬藩は、朝鮮半島に近い位置を生かして外交を担当しました。島国の日本にとって、周辺諸国とのつながりを保つ重要な役割を果たしました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 42,
    },
    {
      id: 'quiz:43',
      question: '江戸時代初め、薩摩藩が武力で支配下に置き、その後も中国との中継貿易を行った王国はどこですか。',
      answer: '琉球王国（りゅうきゅうおうこく）',
      explanation: '琉球王国は、薩摩藩に服属しながら、中国（明・清）との朝貢貿易も続けました。表向きは独立国として振る舞ったため、貿易の中継地として栄えました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 43,
    },
    {
      id: 'quiz:44',
      question: '琉球王国との外交・貿易を実際に担当した藩はどこですか。',
      answer: '薩摩藩（さつまはん）',
      explanation: '薩摩藩は琉球に出兵して支配下に置き、その後も琉球を通じて中国との貿易を行いました。鎖国の中で例外的につながっていた重要なルートです。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 44,
    },
    {
      id: 'quiz:45',
      question: '江戸時代、蝦夷地（えぞち）との貿易やアイヌの人びととの関係を担当した藩を何といいますか。',
      answer: '松前藩（まつまえはん）',
      explanation: '松前藩は、アイヌの人びとと交易を行い、魚・昆布・毛皮などを手に入れました。一方で、重い負担を強いたため、アイヌ側の反乱（シャクシャインの戦い）も起こりました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 45,
    },
    {
      id: 'quiz:46',
      question: '江戸時代の貨幣制度では、金貨を主に使った地域と、銀貨を主に使った地域がありました。金貨中心だったのは江戸とどちらの地域ですか。',
      answer: '江戸とその周辺（東日本）',
      explanation: 'ざっくりと、東の江戸は金、上方（かみがた＝京都・大阪）は銀という使い分けでした。これを**金銀複本位制（三貨制）**といい、両替商が活躍するもとになりました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 46,
    },
    {
      id: 'quiz:47',
      question: '江戸幕府が貨幣を作らせた役所を、金貨を作る場所・銀貨を作る場所それぞれ何と呼びますか。',
      answer: '金座（きんざ）、銀座（ぎんざ）',
      explanation: '金座・銀座は、貨幣の鋳造や品質管理を行った役所です。現在の東京の「銀座」の地名は、もともと銀座があったことに由来します。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 47,
    },
    {
      id: 'quiz:48',
      question: '江戸時代、武士や大名の経済がくるしくなっていった主な理由を、次の中から最も適切なもの一つ選びなさい。\n\nア．給料がすべて現金でもらえるようになったから\nイ．参勤交代や贅沢な生活で出費が増えたから\nウ．武士が農業をやめてしまったから',
      answer: 'イ．参勤交代や贅沢な生活で出費が増えたから',
      explanation: '大名や上級武士は、参勤交代の行列や江戸での生活に多くのお金を使いました。給料は米が中心のままなのに支出は増えたため、借金がふくらみ、藩財政も苦しくなりました。',
      type: 'multiple-choice',
      choices: [
        'ア．給料がすべて現金でもらえるようになったから',
        'イ．参勤交代や贅沢な生活で出費が増えたから',
        'ウ．武士が農業をやめてしまったから'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 48,
    },
    {
      id: 'quiz:49',
      question: '鎖国の時代に西洋の学問を学び、のちに『解体新書』の翻訳を行った人物の一人で、「腑分け」を見て西洋医学の正確さに驚いたとして有名なのは誰ですか。',
      answer: '杉田玄白（すぎたげんぱく）',
      explanation: '杉田玄白は、オランダ語の医学書を翻訳し、日本の医学に大きな影響を与えました。蘭学の代表的な人物として、江戸時代後期の重要キーワードです。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 49,
    },
    {
      id: 'quiz:50',
      question: '鎖国のなかで、西洋の天文学や測量術を学び、日本地図の作成に大きく貢献した人物は誰ですか。',
      answer: '伊能忠敬（いのうただたか）',
      explanation: '伊能忠敬は、50歳を過ぎてから測量の勉強を始め、日本全国を歩いてくわしい地図を作りました。彼の地図は後の近代日本にも活用されました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 50,
    },
    {
      id: 'quiz:51',
      question: '鎖国といっても、西洋からの学問・技術の流入は完全に止まってはいませんでした。このような状況を説明するのに最も適切なのは次のどれですか。\n\nア．長崎の出島を通じて知識は入った\nイ．密かにポルトガルと貿易を続けた\nウ．江戸の港を開いていた',
      answer: 'ア．長崎の出島を通じて知識は入った',
      explanation: 'オランダ商館を通じて、医学や天文学などの情報が入り、蘭学として発達しました。鎖国＝完全に閉じた、ではないことに注意しましょう。',
      type: 'multiple-choice',
      choices: [
        'ア．長崎の出島を通じて知識は入った',
        'イ．密かにポルトガルと貿易を続けた',
        'ウ．江戸の港を開いていた'
      ],
      difficulty: 2,
      categoryId: 'category:8',
      order: 51,
    },
    {
      id: 'quiz:52',
      question: '「幕藩体制」において、幕府と藩はそれぞれどのような関係にあるといえますか。最も適切なものを選びなさい。\n\nア．対等な同盟関係\nイ．幕府が上位で、藩はその支配下\nウ．藩の方が上位で、幕府は代表',
      answer: 'イ．幕府が上位で、藩はその支配下',
      explanation: '幕藩体制は、将軍が全国の大名を支配するしくみです。藩はある程度の自治はありますが、最終的には幕府の命令に従わなければならない立場でした。',
      type: 'multiple-choice',
      choices: [
        'ア．対等な同盟関係',
        'イ．幕府が上位で、藩はその支配下',
        'ウ．藩の方が上位で、幕府は代表'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 52,
    },
    {
      id: 'quiz:53',
      question: '江戸時代、城のまわりに武士の屋敷が集まり、その外側に町人の住む町が広がった都市を何といいますか。',
      answer: '城下町（じょうかまち）',
      explanation: '城下町は、大名の城を中心に武士・町人が住み、政治と経済の中心となった町です。江戸・名古屋・金沢など、多くの地方都市が城下町として発展しました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 53,
    },
    {
      id: 'quiz:54',
      question: '有名な門前町として、善光寺の門前町である長野や、伊勢神宮の門前町である宇治山田（現在の伊勢市）があります。門前町とは、どのような町のことを指しますか。',
      answer: '大きな寺社の門前に発達した町',
      explanation: '門前町は、参拝客向けの宿や土産物屋などが集まって発達しました。宗教施設への信仰心と経済活動が結びついてできた町です。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 54,
    },
    {
      id: 'quiz:55',
      question: '江戸時代の町奉行の仕事として、最も適切なものを次から一つ選びなさい。\n\nア．農村の年貢を取りまとめる\nイ．町の治安維持や裁判などを行う\nウ．寺社の管理だけを行う',
      answer: 'イ．町の治安維持や裁判などを行う',
      explanation: '町奉行は、いまでいう警察＋裁判所＋市役所のような役割を担いました。特に江戸町奉行は仕事が多く、北町奉行・南町奉行に分かれていました。',
      type: 'multiple-choice',
      choices: [
        'ア．農村の年貢を取りまとめる',
        'イ．町の治安維持や裁判などを行う',
        'ウ．寺社の管理だけを行う'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 55,
    },
    {
      id: 'quiz:56',
      question: '江戸幕府の三奉行とは、町奉行・寺社奉行と、もう一つは何奉行ですか。',
      answer: '勘定奉行（かんじょうぶぎょう）',
      explanation: '寺社奉行は寺や神社を管理し、勘定奉行は財政や幕府領の経営を担当しました。これに町奉行を加えた三奉行が、老中を助けて幕政を支えました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 56,
    },
    {
      id: 'quiz:57',
      question: '江戸時代の町人文化の例として、庶民向けの芝居として発達したものを何といいますか。',
      answer: '歌舞伎（かぶき）',
      explanation: '歌舞伎は、町人や武士も楽しんだ娯楽で、江戸・京都・大阪を中心に発達しました。時代物や世話物など、さまざまな演目が上演されました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 57,
    },
    {
      id: 'quiz:58',
      question: '江戸時代の出版文化のなかで、物語や風俗を描いた絵入りの本を何といいますか。',
      answer: '浮世草子（うきよぞうし）',
      explanation: '浮世草子は、井原西鶴などが書き、町人の生活や恋愛を描いた娯楽作品です。同じ「浮世」の名をもつ浮世絵とともに、江戸の町人文化を代表します。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 58,
    },
    {
      id: 'quiz:59',
      question: '江戸時代の絵画で、町人の生活や風景を版画でえがいたものを何といいますか。',
      answer: '浮世絵（うきよえ）',
      explanation: '浮世絵は、役者絵・美人画・風景画など、多くのテーマがありました。のちにゴッホなどヨーロッパの画家にも大きな影響を与えました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 59,
    },
    {
      id: 'quiz:60',
      question: '江戸の人口は最大で約何万人といわれ、当時世界有数の大都市でしたか。最も近いものを選びなさい。\n\nア．およそ20万人\nイ．およそ50万人\nウ．およそ100万人',
      answer: 'ウ．およそ100万人',
      explanation: '江戸は約100万人の人口を持つ世界有数の巨大都市でした。参勤交代で多くの武士が集まり、商業やサービス業も発達していました。',
      type: 'multiple-choice',
      choices: [
        'ア．およそ20万人',
        'イ．およそ50万人',
        'ウ．およそ100万人'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 60,
    },
    {
      id: 'quiz:61',
      question: '鎖国下の日本で、唐人屋敷（とうじんやしき）が置かれたのはどこの都市ですか。',
      answer: '長崎',
      explanation: '唐人屋敷は、中国人（唐人）をまとめて住まわせた居住区で、出島のオランダ人と同様に、行動が制限されていました。長崎は多国籍な雰囲気を持つ特別な都市でした。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 61,
    },
    {
      id: 'quiz:62',
      question: '江戸時代に、オランダ商館長が将軍にあいさつするために長崎から江戸まで行列をつくって行くことを何といいますか。',
      answer: 'オランダ商館長の江戸参府（えどさんぷ）',
      explanation: '江戸参府は、オランダが日本との友好を示す外交儀礼でした。このとき、ヨーロッパの珍しい品物や情報も献上されました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 62,
    },
    {
      id: 'quiz:63',
      question: '江戸時代、主にオランダ語で書かれた本を読み、西洋の学問を学ぶ学問を何といいますか。',
      answer: '蘭学（らんがく）',
      explanation: '蘭学は、医学・天文学・物理学など多くの分野に広がりました。鎖国の中でも日本が少しずつ世界の知識を取り入れていたことを示しています。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 63,
    },
    {
      id: 'quiz:64',
      question: '江戸時代の農村では、年貢は基本的に村全体にまとめてかけられました。このような方式を何といいますか。',
      answer: '村請制（むらうけせい）',
      explanation: '村請制では、村全体で決められた年貢を納める義務がありました。村の中で本百姓たちが分担し、村の自律的な支配が進む一方、互いの監視も強まりました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 64,
    },
    {
      id: 'quiz:65',
      question: '江戸幕府が、キリスト教や外国に関することなどを調査し、報告させるために設けた役職を何といいますか。',
      answer: '長崎奉行（ながさきぶぎょう）',
      explanation: '長崎奉行は、貿易管理とともに、外国事情の報告を行いました。鎖国のなかで、外国情報を管理する重要な役職でした。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 65,
    },
    {
      id: 'quiz:66',
      question: '鎖国政策の直接的な目的として、最も適切なものはどれですか。\n\nア．貿易利益を最大化するため\nイ．キリスト教の禁止と国内支配の安定のため\nウ．日本人の海外移住を増やすため',
      answer: 'イ．キリスト教の禁止と国内支配の安定のため',
      explanation: '鎖国は、単なる「内向き」政策ではなく、キリスト教勢力や外国勢力からの政治的干渉を防ぐための政策でした。その結果、国内の統制がとりやすくなりました。',
      type: 'multiple-choice',
      choices: [
        'ア．貿易利益を最大化するため',
        'イ．キリスト教の禁止と国内支配の安定のため',
        'ウ．日本人の海外移住を増やすため'
      ],
      difficulty: 3,
      categoryId: 'category:8',
      order: 66,
    },
    {
      id: 'quiz:67',
      question: '江戸時代、武士が刀を二本差していたのは、身分を示すためでした。この二本の刀を何とよびますか。',
      answer: '大小（だいしょう）',
      explanation: '長い太刀と短い脇差を合わせて大小といい、これを差すのは武士だけに許された特権でした。外見でも「支配階級」であることがわかるようになっていました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:7',
      order: 67,
    },
    {
      id: 'quiz:68',
      question: '江戸時代、武士が刀を持っていても、実際にはどのような仕事に多く従事するようになっていきましたか。最も適切なものを選びなさい。\n\nア．農業\nイ．商業\nウ．役所での事務や治安維持',
      answer: 'ウ．役所での事務や治安維持',
      explanation: '戦乱がなくなると、武士は実戦よりも役所の仕事や治安維持が中心になりました。これによって「刀は持っているが、実際は公務員」という存在へ変化していきました。',
      type: 'multiple-choice',
      choices: [
        'ア．農業',
        'イ．商業',
        'ウ．役所での事務や治安維持'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 68,
    },
    {
      id: 'quiz:69',
      question: '江戸時代、農村に住みながら手工業を行う形で、家内工業が発達しました。これを何といいますか。',
      answer: '農業と兼ねた「家内工業」または「農間稼ぎ（のうまがせぎ）」',
      explanation: '農閑期に織物や紙すきなどを行う家内工業が広まり、農家も現金収入を得るようになりました。これが商品経済の発達をさらに押し上げました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 69,
    },
    {
      id: 'quiz:70',
      question: '江戸時代、米の取引を通じて大きな力を持った商人を何と呼びますか。',
      answer: '米商人（こめしょうにん）',
      explanation: '特に大阪・堂島の米市場は有名で、米の先物取引のようなものも行われました。米の価格は社会全体に影響するため、米商人は大きな経済力を持ちました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 70,
    },
    {
      id: 'quiz:71',
      question: '江戸時代の村では、互いに助け合いながらも、監視し合うことで年貢逃れを防ぎました。こうした村人のしくみの一つで、5戸前後を一組にした制度を何といいますか。',
      answer: '五人組（ごにんぐみ）',
      explanation: 'すでに出た語ですが、「村請制」とセットでおさえるのがポイントです。村請制＋五人組により、幕府は少ない役人でも村を支配できました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 71,
    },
    {
      id: 'quiz:72',
      question: '江戸時代の農民の中で、生活が苦しくなって土地を手放し、水呑百姓が増えると、村や藩の財政にどのような影響が出ましたか。最も適切なものを選びなさい。\n\nア．年貢を納める人が減り、財政が苦しくなる\nイ．年貢を納める人が増え、財政が楽になる\nウ．特に変化はない',
      answer: 'ア．年貢を納める人が減り、財政が苦しくなる',
      explanation: '年貢を納める義務を負う本百姓が減ると、藩・幕府の財政も苦しくなります。そこで年貢の取り立てをきびしくし、さらに百姓が苦しくなる悪循環が生まれました。',
      type: 'multiple-choice',
      choices: [
        'ア．年貢を納める人が減り、財政が苦しくなる',
        'イ．年貢を納める人が増え、財政が楽になる',
        'ウ．特に変化はない'
      ],
      difficulty: 4,
      categoryId: 'category:7',
      order: 72,
    },
    {
      id: 'quiz:73',
      question: '鎖国のなかで、日本人が海外に出ることは禁止されていましたが、帰国も原則として禁止されていました。このような出国・帰国禁止の方針を定めた法令をまとめて何といいますか。',
      answer: '鎖国令（さこくれい）',
      explanation: '鎖国令は、1630年代を中心に何度か出された法令をまとめた呼び名です。日本人が海外に勝手に出て行ったり、外国勢力と結びつくことを防ぐねらいがありました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 73,
    },
    {
      id: 'quiz:74',
      question: '鎖国の時代に、日本とヨーロッパを結ぶオランダ船は、原則としてどこの港以外に入ることが禁止されていましたか。',
      answer: '長崎（出島）',
      explanation: 'オランダ船は長崎の出島にしか入れず、他の港に入ることは固く禁じられていました。これにより、貿易の量や内容を幕府がコントロールしやすくなりました。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 74,
    },
    {
      id: 'quiz:75',
      question: '鎖国下の日本に来た外国船が、食料や水の補給を求めてきたとき、特別にゆるされる制度を何といいますか。',
      answer: '薪水供給（しんすいきょうきゅう）',
      explanation: '原則入港禁止でも、遭難船などには薪や水、食料を与えて追い返す措置がとられました。完全に無視するのではなく、人道的な配慮も一定は行われていました。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:8',
      order: 75,
    },
    {
      id: 'quiz:76',
      question: '江戸時代の始まりは、おおよそ西暦何年ごろとされますか。最も近いものを選びなさい。\n\nア．1600年前後\nイ．1700年前後\nウ．1500年前後',
      answer: 'ア．1600年前後',
      explanation: '1600年の関ヶ原の戦い、1603年の江戸幕府開かれる年を覚えておきましょう。「いろおおさん（1603）徳川家康江戸幕府」と語呂で覚えることも多いです。',
      type: 'multiple-choice',
      choices: [
        'ア．1600年前後',
        'イ．1700年前後',
        'ウ．1500年前後'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 76,
    },
    {
      id: 'quiz:77',
      question: '江戸時代の終わりは、西暦およそ何年ごろとされますか。最も近いものを選びなさい。\n\nア．1860年代\nイ．1760年代\nウ．1960年代',
      answer: 'ア．1860年代',
      explanation: '1867年の大政奉還、1868年の明治維新により、江戸時代は終わりを迎えます。おおよそ1600年ごろ〜1860年代ごろまでが江戸時代のイメージです。',
      type: 'multiple-choice',
      choices: [
        'ア．1860年代',
        'イ．1760年代',
        'ウ．1960年代'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 77,
    },
    {
      id: 'quiz:78',
      question: '江戸時代、武士が農民や町人の前を通るときに、威厳を示すために行った行動で、供の者が「下にー下にー」と叫んで道をあけさせたことを何といいますか。',
      answer: 'お通り（の場面）／通行特権',
      explanation: '正式な用語ではなくとも、「武士の身分的優位」を表すエピソードとしてよく語られます。身分による差別が日常生活の中にまで入り込んでいたことが分かる例です。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:7',
      order: 78,
    },
    {
      id: 'quiz:79',
      question: '江戸時代、寺や神社を保護し、宗教政策を担当した役職を何といいますか。',
      answer: '寺社奉行（じしゃぶぎょう）',
      explanation: '寺社奉行は、寺領・神領の管理や宗教に関する規制を担当しました。寺請制度の運用にも関わり、宗教を通じた支配にも深く関係していました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 79,
    },
    {
      id: 'quiz:80',
      question: '江戸時代、農民の子どもたちに読み書きやそろばんを教えた庶民の学びの場を何といいますか。',
      answer: '寺子屋（てらこや）',
      explanation: '寺子屋は、武士だけでなく町人や農民のこどもも通い、日常生活に役立つ読み書き・計算を学びました。識字率の高さは、江戸時代の特徴の一つです。',
      type: 'text',
      difficulty: 2,
      categoryId: 'category:8',
      order: 80,
    },
    {
      id: 'quiz:81',
      question: '鎖国の時代に、西洋の科学や技術に関心を持った人々が集まり、長崎などで行った勉強会の総称を何といいますか。',
      answer: '蘭学塾（らんがくじゅく）などの蘭学の私塾',
      explanation: '正式な一つの名前ではありませんが、蘭学者たちは各地で私塾を開き、西洋の知識を広めました。のちの近代化の基盤となる学問がこの時代に育っていたわけです。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:8',
      order: 81,
    },
    {
      id: 'quiz:82',
      question: '江戸時代のころ、日本を訪れた西洋人が「日本人はよく風呂に入り、清潔好きだ」と記録に残しています。このような庶民の生活の様子を知ることのできる資料を何といいますか。',
      answer: '外国人の「来日記録」や「旅行記」',
      explanation: '具体的な書名は多くありますが、ポイントは外国人の目から見た日本の姿が分かる資料だということです。中学受験では、「来日した人が残した記録から当時の生活が分かる」という視点がよく問われます。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:8',
      order: 82,
    },
    {
      id: 'quiz:83',
      question: '鎖国中の日本を、ヨーロッパでは「鎖国している不思議な国」として紹介した本があります。このように、まだよく知られていない国や地域をまとめて紹介する本を一般に何といいますか。',
      answer: '地誌（ちし）／風土記的な書物',
      explanation: 'ヨーロッパで出された「日本誌」などが代表例です。「他者にとっての日本」を知ることで、日本が世界にどう見られていたかを考える手がかりになります。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:8',
      order: 83,
    },
    {
      id: 'quiz:84',
      question: '江戸時代の農民は、収穫した米のうち、およそどれくらいを年貢として納めなければならなかったとされていますか。最も近いものを選びなさい。\n\nア．約1〜2割\nイ．約4〜6割\nウ．約9〜10割',
      answer: 'イ．約4〜6割',
      explanation: '地域や時代によって差はありますが、4〜6割程度が一般的とされ、農民の生活はかなり厳しいものでした。凶作の年には自分たちが食べる分も足りなくなることがありました。',
      type: 'multiple-choice',
      choices: [
        'ア．約1〜2割',
        'イ．約4〜6割',
        'ウ．約9〜10割'
      ],
      difficulty: 4,
      categoryId: 'category:7',
      order: 84,
    },
    {
      id: 'quiz:85',
      question: '百姓一揆のなかには、中心となった者が「村の代表」として自らの命をかけて訴え出るものもありました。このように処罰を覚悟で行う訴えを何といいますか。',
      answer: '代表越訴（だいひょうえっそ）',
      explanation: '代表越訴は、代表者が江戸や藩の役所に直接訴え出る方法で、成功すれば年貢が減らされた例もあります。しかし多くの場合、代表者は重い罰を受けました。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:7',
      order: 85,
    },
    {
      id: 'quiz:86',
      question: '江戸時代の百姓一揆のうち、血判状を作って「一致団結して戦う」と誓い合う形を何といいますか。',
      answer: '盟約（めいやく）／血判状による誓い',
      explanation: '血判状そのものや、それを交わして団結する行為がよく問題になります。実際にはいろいろな形がありますが、「命がけの約束」であることがポイントです。',
      type: 'text',
      difficulty: 5,
      categoryId: 'category:7',
      order: 86,
    },
    {
      id: 'quiz:87',
      question: '江戸時代の農民や町人の暮らしをえがいた『東海道中膝栗毛』を書いた人物は誰ですか。',
      answer: '十返舎一九（じっぺんしゃいっく）',
      explanation: '十返舎一九は、弥次さん喜多さんの旅をユーモラスに描き、庶民の旅の様子を伝えました。江戸時代の交通・宿場町・町人文化を知る手がかりにもなります。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 87,
    },
    {
      id: 'quiz:88',
      question: '江戸時代の身分制度で、次のうち最も身分が高いのはどれですか。\n\nア．百姓\nイ．旗本\nウ．町人',
      answer: 'イ．旗本（はたもと）',
      explanation: '旗本は、将軍に直接仕える中級・下級武士で、一定の知行や俸禄を受けていました。百姓・町人とは大きな身分差がありました。',
      type: 'multiple-choice',
      choices: [
        'ア．百姓',
        'イ．旗本',
        'ウ．町人'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 88,
    },
    {
      id: 'quiz:89',
      question: '将軍に直接会うことができない下級の武士で、旗本よりも下の身分の武士を何といいますか。',
      answer: '御家人（ごけにん）',
      explanation: '御家人も将軍の家来ですが、旗本に比べて身分は低く、経済的にも苦しい者が多くいました。時代が進むと、没落する武士も増えていきます。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 89,
    },
    {
      id: 'quiz:90',
      question: '江戸時代、身分制度の決まりの一つとして、町人や百姓がみだりに苗字を名乗ることは原則として禁止されていました。このことから、当時の社会の特徴として最も適切なものはどれですか。\n\nア．身分による差が厳しく決められていた\nイ．全員平等であった\nウ．身分は自由に変えられた',
      answer: 'ア．身分による差が厳しく決められていた',
      explanation: '苗字の使用や服装などにも身分差が反映されました。外見や名前でも身分が一目で分かる社会だったことを押さえましょう。',
      type: 'multiple-choice',
      choices: [
        'ア．身分による差が厳しく決められていた',
        'イ．全員平等であった',
        'ウ．身分は自由に変えられた'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 90,
    },
    {
      id: 'quiz:91',
      question: '江戸時代の米相場や物価の変動により、庶民が生活に不安を感じると、どのような行動が起こることがありましたか。もっとも適切なものを選びなさい。\n\nア．打ちこわし\nイ．参勤交代\nウ．鎖国',
      answer: 'ア．打ちこわし',
      explanation: '米価が急騰すると、町人たちは米屋・酒屋などをおそい、打ちこわしを起こしました。経済政策の失敗が、都市の騒動として現れた例です。',
      type: 'multiple-choice',
      choices: [
        'ア．打ちこわし',
        'イ．参勤交代',
        'ウ．鎖国'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 91,
    },
    {
      id: 'quiz:92',
      question: '鎖国のなかで、ヨーロッパ諸国の中でカトリック（カトリック教会）の国は原則として排除されました。オランダはどの点で他のヨーロッパ諸国と異なっていたため、貿易が許可されたとされていますか。',
      answer: '宗教（キリスト教）の布教にあまり熱心でなかった点',
      explanation: 'オランダは主に貿易目的で、日本での宣教活動には慎重でした。そのため幕府は、キリスト教勢力の脅威が少ないと判断し、貿易を許したと考えられています。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:8',
      order: 92,
    },
    {
      id: 'quiz:93',
      question: '江戸時代の長崎に住んでいたオランダ人や中国人は、自由に日本国内を旅行できましたか。次から最も適切なものを選びなさい。\n\nア．自由にどこでも行けた\nイ．一切外出できなかった\nウ．幕府の許可を得て、厳しく制限された範囲だけ動けた',
      answer: 'ウ．幕府の許可を得て、厳しく制限された範囲だけ動けた',
      explanation: '長崎奉行が厳しく監視し、外国人は出島や唐人屋敷に住まわされました。必要があるときだけ、許可を得て限られた範囲を動くことができました。',
      type: 'multiple-choice',
      choices: [
        'ア．自由にどこでも行けた',
        'イ．一切外出できなかった',
        'ウ．幕府の許可を得て、厳しく制限された範囲だけ動けた'
      ],
      difficulty: 3,
      categoryId: 'category:8',
      order: 93,
    },
    {
      id: 'quiz:94',
      question: '江戸時代の鎖国は、日本が世界とのつながりを完全に断ったわけではありません。このことを説明する文として最も適切なものを選びなさい。\n\nア．どの国とも貿易をしていなかった\nイ．特定の国や地域とは限定的に交流していた\nウ．実はヨーロッパ全体と自由に貿易していた',
      answer: 'イ．特定の国や地域とは限定的に交流していた',
      explanation: '中国・オランダ・朝鮮・琉球・蝦夷地などとは、窓口を限定して交流が続いていました。したがって「半分開かれていた鎖国」と考えるのが正確です。',
      type: 'multiple-choice',
      choices: [
        'ア．どの国とも貿易をしていなかった',
        'イ．特定の国や地域とは限定的に交流していた',
        'ウ．実はヨーロッパ全体と自由に貿易していた'
      ],
      difficulty: 2,
      categoryId: 'category:8',
      order: 94,
    },
    {
      id: 'quiz:95',
      question: '江戸幕府のもとで、全国の藩がそれぞれ自分の領地の政治を行うことを何といいますか。',
      answer: '藩政（はんせい）',
      explanation: '藩政は、大名が行う領地の政治で、財政や治安、藩校の運営などを含みます。幕府の方針に従いつつも、藩ごとの特色ある政策が行われました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:7',
      order: 95,
    },
    {
      id: 'quiz:96',
      question: '藩が武士の子弟を教育するために設けた学校を何といいますか。',
      answer: '藩校（はんこう）',
      explanation: '藩校では、主に儒学（朱子学）などが教えられました。武士の教養を高めることで、藩の支配体制を支えるねらいがありました。',
      type: 'text',
      difficulty: 3,
      categoryId: 'category:8',
      order: 96,
    },
    {
      id: 'quiz:97',
      question: '江戸時代に支配のよりどころとなった思想で、主に親子・君臣・長幼の秩序を重んじる学問を何といいますか。',
      answer: '儒学（じゅがく）／朱子学（しゅしがく）',
      explanation: '儒学、とくに朱子学は、忠・孝・礼などの価値を重視し、武士の行動規範とされました。幕府の公式な学問としても重視されました。',
      type: 'text',
      difficulty: 4,
      categoryId: 'category:7',
      order: 97,
    },
    {
      id: 'quiz:98',
      question: '江戸時代の身分制度や支配のあり方は、明治維新後の近代社会にどのような影響を残したと考えられますか。もっとも適切な説明を選びなさい。\n\nア．身分制度は完全に消え、何の影響もなかった\nイ．法の上ではなくなっても、意識や差別として残った\nウ．身分制度はそのまま続いた',
      answer: 'イ．法の上ではなくなっても、意識や差別として残った',
      explanation: '明治の四民平等で法的な身分差はなくなりましたが、人々の意識の中の差別は簡単には消えませんでした。歴史を学ぶことは、現代の差別の問題を考える手がかりにもなります。',
      type: 'multiple-choice',
      choices: [
        'ア．身分制度は完全に消え、何の影響もなかった',
        'イ．法の上ではなくなっても、意識や差別として残った',
        'ウ．身分制度はそのまま続いた'
      ],
      difficulty: 5,
      categoryId: 'category:7',
      order: 98,
    },
    {
      id: 'quiz:99',
      question: '江戸時代の鎖国政策は、結果的に日本にどのような長所と短所をもたらしたと考えられますか。もっとも適切な組み合わせを選びなさい。\n\nア．長所：平和と安定　短所：世界の変化に出遅れた\nイ．長所：戦争拡大　短所：文化停滞\nウ．長所：貿易拡大　短所：国内不安',
      answer: 'ア．長所：平和と安定　短所：世界の変化に出遅れた',
      explanation: '鎖国によって国内の戦乱は少なく、約250年の平和な時代が続きました。その一方で、産業革命など世界の大きな変化には乗り遅れることになります。',
      type: 'multiple-choice',
      choices: [
        'ア．長所：平和と安定　短所：世界の変化に出遅れた',
        'イ．長所：戦争拡大　短所：文化停滞',
        'ウ．長所：貿易拡大　短所：国内不安'
      ],
      difficulty: 4,
      categoryId: 'category:8',
      order: 99,
    },
    {
      id: 'quiz:100',
      question: '「強かな支配の中で生きた人々」という単元名から、江戸時代の支配の特徴として最も適切なものを選びなさい。\n\nア．力づくの軍事支配だけで成り立っていた\nイ．法や制度、身分や村のしくみを利用して支配した\nウ．支配はゆるく、ほとんど統制しなかった',
      answer: 'イ．法や制度、身分や村のしくみを利用して支配した',
      explanation: '参勤交代・五人組・寺請制度・身分制度など、制度を組み合わせて反乱を防ぐのが江戸幕府の「したたか」な支配でした。単元名の理解は、知識をつなげるヒントになります。',
      type: 'multiple-choice',
      choices: [
        'ア．力づくの軍事支配だけで成り立っていた',
        'イ．法や制度、身分や村のしくみを利用して支配した',
        'ウ．支配はゆるく、ほとんど統制しなかった'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 100,
    },
    {
      id: 'quiz:101',
      question: '「国を閉ざした日本」という単元名から、鎖国の本質に最も近い説明を選びなさい。\n\nア．ただ外国嫌いだったから\nイ．支配を安定させるため、交流相手や窓口をコントロールした\nウ．国内の文化を守るため、完全に交流を禁止した',
      answer: 'イ．支配を安定させるため、交流相手や窓口をコントロールした',
      explanation: '鎖国は「閉じた」というより、窓口と相手を選んだ管理つきの交流でした。キリスト教や外圧から幕藩体制を守るための政策と考えると理解しやすいです。',
      type: 'multiple-choice',
      choices: [
        'ア．ただ外国嫌いだったから',
        'イ．支配を安定させるため、交流相手や窓口をコントロールした',
        'ウ．国内の文化を守るため、完全に交流を禁止した'
      ],
      difficulty: 3,
      categoryId: 'category:8',
      order: 101,
    },
    {
      id: 'quiz:102',
      question: '江戸時代、参勤交代は大名にとって負担が大きい制度でしたが、その一方でどのような経済的効果をもたらしましたか。最も適切なものを選びなさい。\n\nア．交通・宿場町・商業が発達した\nイ．農業が衰退した\nウ．鎖国が終わった',
      answer: 'ア．交通・宿場町・商業が発達した',
      explanation: '大名行列が通ることで、街道や宿場町が整備され、商業も活発になりました。統制と同時に、経済の発展にもつながった制度だと言えます。',
      type: 'multiple-choice',
      choices: [
        'ア．交通・宿場町・商業が発達した',
        'イ．農業が衰退した',
        'ウ．鎖国が終わった'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 102,
    },
    {
      id: 'quiz:103',
      question: '江戸時代における「江戸・大阪・京都」の役割として正しい組み合わせを選びなさい。\n\nア．江戸＝政治、京都＝商業、大阪＝文化\nイ．江戸＝政治、京都＝文化、大阪＝商業\nウ．江戸＝文化、京都＝政治、大阪＝農業',
      answer: 'イ．江戸＝政治、京都＝文化、大阪＝商業',
      explanation: '江戸は将軍のいる政治の中心、京都は天皇と伝統の文化の中心、大阪は「天下の台所」と呼ばれる商業の中心でした。三都の役割の違いを意識して覚えましょう。',
      type: 'multiple-choice',
      choices: [
        'ア．江戸＝政治、京都＝商業、大阪＝文化',
        'イ．江戸＝政治、京都＝文化、大阪＝商業',
        'ウ．江戸＝文化、京都＝政治、大阪＝農業'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 103,
    },
    {
      id: 'quiz:104',
      question: '鎖国下での対外関係の組み合わせとして、誤っているものを一つ選びなさい。\n\nア．中国 － 長崎\nイ．オランダ － 長崎\nウ．イギリス － 出島',
      answer: 'ウ．イギリス － 出島',
      explanation: 'イギリス商館は一時期長崎にありましたが、のちに撤退してしまい、江戸時代の大部分には日本とイギリスの正式な貿易はありません。本格的な関係は幕末以降です。',
      type: 'multiple-choice',
      choices: [
        'ア．中国 － 長崎',
        'イ．オランダ － 長崎',
        'ウ．イギリス － 出島'
      ],
      difficulty: 4,
      categoryId: 'category:8',
      order: 104,
    },
    {
      id: 'quiz:105',
      question: '江戸時代の農業の発達により、各地で特産品が生まれました。次のうち、江戸時代の代表的な特産品と産地の組み合わせとして正しいものを選びなさい。\n\nア．阿波 － 藍\nイ．駿河 － りんご\nウ．庄内 － バナナ',
      answer: 'ア．阿波 － 藍',
      explanation: '阿波（徳島県）では藍の生産がさかんで、江戸時代の重要な商品作物でした。りんご・バナナはこの時代の日本では一般的ではありません。',
      type: 'multiple-choice',
      choices: [
        'ア．阿波 － 藍',
        'イ．駿河 － りんご',
        'ウ．庄内 － バナナ'
      ],
      difficulty: 4,
      categoryId: 'category:7',
      order: 105,
    },
    {
      id: 'quiz:106',
      question: '江戸時代の人口が増加した要因として、もっとも適切なものを一つ選びなさい。\n\nア．戦乱が少なく、平和が続いたから\nイ．外国から多くの移民が来たから\nウ．鎖国で食料が減ったから',
      answer: 'ア．戦乱が少なく、平和が続いたから',
      explanation: '戦争が少なくなると、人口は安定して増えていきます。江戸時代は約250年の平和な時代で、人口増加とともに農業や商業も発達しました。',
      type: 'multiple-choice',
      choices: [
        'ア．戦乱が少なく、平和が続いたから',
        'イ．外国から多くの移民が来たから',
        'ウ．鎖国で食料が減ったから'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 106,
    },
    {
      id: 'quiz:107',
      question: '江戸時代の村で、領主の許可なく他の村へ勝手に移り住むことは、基本的には許されませんでした。このことから、どのような支配の特徴が分かりますか。もっとも適切なものを選びなさい。\n\nア．人々の移動も支配・管理の対象だった\nイ．自由な移動が完全に保障されていた\nウ．支配は都市だけで、村には関係なかった',
      answer: 'ア．人々の移動も支配・管理の対象だった',
      explanation: '年貢を安定してとるため、農民の移動は厳しく制限されました。どこにどれだけの人がいるかを、領主側がしっかり把握しておきたかったのです。',
      type: 'multiple-choice',
      choices: [
        'ア．人々の移動も支配・管理の対象だった',
        'イ．自由な移動が完全に保障されていた',
        'ウ．支配は都市だけで、村には関係なかった'
      ],
      difficulty: 3,
      categoryId: 'category:7',
      order: 107,
    },
    {
      id: 'quiz:108',
      question: '江戸時代の村の祭りや年中行事は、どのような役割を果たしていたと考えられますか。もっとも適切な説明を選びなさい。\n\nア．支配を弱める働きだけをした\nイ．村人の結びつきを強め、同時に支配をスムーズにした\nウ．年貢とは関係のない純粋な遊びだけだった',
      answer: 'イ．村人の結びつきを強め、同時に支配をスムーズにした',
      explanation: '村祭りは、共同体としてのまとまりを強める一方で、村の秩序や役割分担を確認する場でもありました。文化と支配が結びついている点がポイントです。',
      type: 'multiple-choice',
      choices: [
        'ア．支配を弱める働きだけをした',
        'イ．村人の結びつきを強め、同時に支配をスムーズにした',
        'ウ．年貢とは関係のない純粋な遊びだけだった'
      ],
      difficulty: 5,
      categoryId: 'category:7',
      order: 108,
    },
    {
      id: 'quiz:109',
      question: '鎖国のもとでも、海外の情報は一切入ってこなかったわけではありません。どのようなルートから海外情報がもたらされたか、最も適切なものをえらびなさい。\n\nア．オランダ・中国・朝鮮などとの外交・貿易ルート\nイ．ポルトガルとの密貿易だけ\nウ．外国人のテレビ放送',
      answer: 'ア．オランダ・中国・朝鮮などとの外交・貿易ルート',
      explanation: '出島のオランダ・長崎の中国船・対馬藩を通じた朝鮮など、限られたルートから世界情勢が知られていました。のちの開国の判断にも、これらの情報が役立ちました。',
      type: 'multiple-choice',
      choices: [
        'ア．オランダ・中国・朝鮮などとの外交・貿易ルート',
        'イ．ポルトガルとの密貿易だけ',
        'ウ．外国人のテレビ放送'
      ],
      difficulty: 3,
      categoryId: 'category:8',
      order: 109,
    },
    {
      id: 'quiz:110',
      question: '中学受験の歴史で、江戸時代の「強かな支配」と「国を閉ざした日本」を学ぶときに、一番大切な視点は何だといえますか。もっとも適切なものを選びなさい。\n\nア．出来事だけを年号とセットで暗記すること\nイ．なぜその制度や政策がとられたのか、その目的と影響を考えること\nウ．名前がむずかしい語句は捨ててしまうこと',
      answer: 'イ．なぜその制度や政策がとられたのか、その目的と影響を考えること',
      explanation: '参勤交代・五人組・寺請制度・鎖国などは、すべて「なぜそうしたのか？」を意識すると理解が一気に深まります。理由と結果をセットで理解することが、中学受験で高得点を取る最大のコツです。',
      type: 'multiple-choice',
      choices: [
        'ア．出来事だけを年号とセットで暗記すること',
        'イ．なぜその制度や政策がとられたのか、その目的と影響を考えること',
        'ウ．名前がむずかしい語句は捨ててしまうこと'
      ],
      difficulty: 2,
      categoryId: 'category:7',
      order: 110,
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