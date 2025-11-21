import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

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

// Debug endpoint to test database connectivity
app.get("/make-server-856c5cf0/debug/test-db", async (c) => {
  try {
    const { data, error } = await supabase
      .from('units')
      .select('count')
      .limit(1);

    if (error) {
      return c.json({ error: error.message }, 500);
    }

    return c.json({ status: "db connected", data });
  } catch (error) {
    return c.json({ error: String(error) }, 500);
  }
});

// Debug endpoints removed - KV store deprecated

// ===== User Authentication Endpoints =====

// Login endpoint
app.post("/make-server-856c5cf0/login", async (c) => {
  try {
    const { name, password } = await c.req.json();

    if (!name || !password) {
      return c.json({ error: 'Name and password are required' }, 400);
    }

    // Find user by name in RDB
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('name', name)
      .single();

    if (profileError || !userProfile) {
      return c.json({ error: 'Invalid credentials' }, 401);
    }

    // Generate email from name (same as signup)
    const email = `${name}@quizapp.test`;

    // Sign in with Supabase Auth using email/password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
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
        email: email,
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

    // Check if user with this name already exists in RDB
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('name', name)
      .single();

    if (existingProfile) {
      return c.json({ error: 'User with this name already exists' }, 400);
    }

    // Generate a unique email from the name
    const email = `${name.toLowerCase().replace(/\s+/g, '')}@quizapp.test`;

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

    // Store user profile in RDB
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,
        name: name,
        created_at: new Date().toISOString(),
      });

    if (profileError) {
      console.error(`Error inserting profile into RDB: ${profileError.message}`);
      return c.json({ error: 'Failed to create user profile' }, 500);
    }

    // Note: User stats are now calculated automatically via user_statistics_view

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
    console.log('Fetching quizzes from RDB...');

    // Parse query parameters
    const url = new URL(c.req.url);
    const subjectFilter = url.searchParams.get('subject');
    const unitFilter = url.searchParams.get('unit');
    const difficultyParam = url.searchParams.get('difficulty');
    const countParam = url.searchParams.get('count');
    const historyFilter = url.searchParams.get('historyFilter');

    // Build query with filters
    // If filtering by unit name, first get the unit ID
    let unitId: string | null = null;
    if (unitFilter && unitFilter !== 'all') {
      const { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('name', unitFilter)
        .single();

      if (unit) {
        unitId = unit.id;
      }
    }

    let query = supabase
      .from('quizzes')
      .select('*');

    if (subjectFilter && subjectFilter !== 'all') {
      query = query.eq('subject', subjectFilter);
    }

    if (unitId) {
      query = query.eq('unit_id', unitId);
    }

    if (difficultyParam && difficultyParam !== 'mix') {
      const difficulty = parseInt(difficultyParam, 10);
      if (!Number.isNaN(difficulty)) {
        query = query.eq('difficulty', difficulty);
      }
    }

    const { data: quizzes, error } = await query.order('order', { ascending: true });

    if (error) {
      console.log(`Error fetching quizzes: ${error}`);
      return c.json({ error: 'Failed to fetch quizzes' }, 500);
    }

    // If no quizzes exist, initialize with default data
    if (!quizzes || quizzes.length === 0) {
      console.log('No quizzes found, initializing...');
      await initializeQuizzes();
      await initializeCategories();
      const { data: newQuizzes } = await supabase
        .from('quizzes')
        .select('*')
        .order('order', { ascending: true });
      return c.json({ quizzes: newQuizzes || [] });
    }

    let filteredQuizzes = quizzes;

    // Handle history filtering
    if (historyFilter === 'unanswered' || historyFilter === 'uncorrected') {
      const accessToken = c.req.header('Authorization')?.split(' ')[1];
      if (!accessToken) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);

      if (!user || authError) {
        return c.json({ error: 'Unauthorized' }, 401);
      }

      // Get user answers from RDB
      const { data: userAnswers } = await supabase
        .from('user_answers')
        .select('quiz_id, is_correct')
        .eq('user_id', user.id);

      const answeredSet = new Set((userAnswers || []).map(a => a.quiz_id));
      const correctSet = new Set(
        (userAnswers || []).filter(a => a.is_correct).map(a => a.quiz_id)
      );

      if (historyFilter === 'unanswered') {
        filteredQuizzes = filteredQuizzes.filter(quiz => !answeredSet.has(quiz.id));
      }

      if (historyFilter === 'uncorrected') {
        filteredQuizzes = filteredQuizzes.filter(quiz =>
          answeredSet.has(quiz.id) && !correctSet.has(quiz.id)
        );
      }
    }

    // Apply count limit with randomization
    if (countParam) {
      const count = parseInt(countParam, 10);
      if (!Number.isNaN(count) && count > 0 && filteredQuizzes.length > count) {
        // Shuffle and slice
        filteredQuizzes = [...filteredQuizzes]
          .sort(() => Math.random() - 0.5)
          .slice(0, count);
      }
    }

    console.log(`Returning ${filteredQuizzes.length} quizzes`);
    return c.json({ quizzes: filteredQuizzes });
  } catch (error) {
    console.log(`Error fetching quizzes: ${error}`);
    return c.json({ error: 'Failed to fetch quizzes' }, 500);
  }
});

// Add a new quiz (admin function)
app.post("/make-server-856c5cf0/quizzes", async (c) => {
  try {
    const quiz = await c.req.json();

    // Resolve unit_id if unit name is provided
    let unitId = quiz.unitId;
    if (!unitId && quiz.unit) {
      const { data: unit } = await supabase
        .from('units')
        .select('id')
        .eq('name', quiz.unit)
        .eq('subject', quiz.subject)
        .single();

      if (unit) {
        unitId = unit.id;
      }
    }

    // Write to RDB
    const { data, error } = await supabase.from("quizzes").insert({
      question: quiz.question,
      answer: quiz.answer,
      explanation: quiz.explanation,
      type: quiz.type,
      options: quiz.choices ? quiz.choices : null,
      difficulty: quiz.difficulty,
      subject: quiz.subject,
      unit_id: unitId,
      category_id: quiz.categoryId,
      order: quiz.order,
    }).select().single();

    if (error) {
      console.error("Failed to write quiz to RDB:", error);
      return c.json({ error: 'Failed to create quiz' }, 500);
    }

    return c.json({ message: 'Quiz created successfully', quizId: data.id });
  } catch (error) {
    console.log(`Error creating quiz: ${error}`);
    return c.json({ error: 'Failed to create quiz' }, 500);
  }
});

// Get all categories
app.get("/make-server-856c5cf0/categories", async (c) => {
  try {
    // Fetch categories from RDB
    const { data: categories, error } = await supabase
      .from('categories')
      .select('*')
      .order('order', { ascending: true });

    if (error) {
      console.log(`Error fetching categories: ${error}`);
      return c.json({ error: 'Failed to fetch categories' }, 500);
    }

    // If no categories exist, initialize them
    if (!categories || categories.length === 0) {
      await initializeCategories();
      const { data: newCategories } = await supabase
        .from('categories')
        .select('*')
        .order('order', { ascending: true });
      return c.json({ categories: newCategories || [] });
    }

    return c.json({ categories });
  } catch (error) {
    console.log(`Error fetching categories: ${error}`);
    return c.json({ error: 'Failed to fetch categories' }, 500);
  }
});

// Get units with available quizzes
app.get("/make-server-856c5cf0/units", async (c) => {
  try {
    const url = new URL(c.req.url);
    const subjectFilter = url.searchParams.get('subject');

    // Use PostgreSQL function for optimal performance
    // This does DISTINCT at the database level, returning minimal data
    const { data: units, error } = await supabase.rpc('get_units_with_quizzes', {
      subject_filter: subjectFilter && subjectFilter !== 'all' ? subjectFilter : null,
    });

    if (error) {
      console.log(`Error fetching units: ${error}`);
      return c.json({ error: 'Failed to fetch units' }, 500);
    }

    return c.json({ units: units || [] });
  } catch (error) {
    console.log(`Error fetching units: ${error}`);
    return c.json({ error: 'Failed to fetch units' }, 500);
  }
});

// Get quiz counts by history filter
app.get("/make-server-856c5cf0/quiz-counts", async (c) => {
  try {
    const url = new URL(c.req.url);
    const subject = url.searchParams.get('subject');
    const unit = url.searchParams.get('unit');
    const accessToken = c.req.header('Authorization')?.split(' ')[1];

    if (!subject) {
      return c.json({ error: 'Subject is required' }, 400);
    }

    // Get user for history-based counts
    let userId: string | null = null;
    if (accessToken) {
      const { data: { user } } = await supabase.auth.getUser(accessToken);
      userId = user?.id || null;
    }

    // Get unit_id if unit name is provided
    let unitId: string | null = null;
    if (unit && unit !== 'all') {
      const { data: unitData } = await supabase
        .from('units')
        .select('id')
        .eq('name', unit)
        .single();
      unitId = unitData?.id || null;
    }

    // Build base query
    let baseQuery = supabase.from('quizzes').select('id', { count: 'exact', head: true });

    if (subject !== 'all') {
      baseQuery = baseQuery.eq('subject', subject);
    }
    if (unitId) {
      baseQuery = baseQuery.eq('unit_id', unitId);
    }

    // Get total count
    const { count: total } = await baseQuery;

    let unanswered = 0;
    let uncorrected = 0;

    if (userId) {
      // Get user's answered quiz IDs
      const { data: userAnswers } = await supabase
        .from('user_answers')
        .select('quiz_id, is_correct')
        .eq('user_id', userId);

      const answeredQuizIds = new Set((userAnswers || []).map(a => a.quiz_id));
      const correctQuizIds = new Set(
        (userAnswers || []).filter(a => a.is_correct).map(a => a.quiz_id)
      );

      // Get all quiz IDs for this filter
      let allQuizzesQuery = supabase.from('quizzes').select('id');
      if (subject !== 'all') {
        allQuizzesQuery = allQuizzesQuery.eq('subject', subject);
      }
      if (unitId) {
        allQuizzesQuery = allQuizzesQuery.eq('unit_id', unitId);
      }
      const { data: allQuizzes } = await allQuizzesQuery;

      if (allQuizzes) {
        unanswered = allQuizzes.filter(q => !answeredQuizIds.has(q.id)).length;
        uncorrected = allQuizzes.filter(q => !correctQuizIds.has(q.id)).length;
      }
    } else {
      // If not authenticated, all quizzes are unanswered/uncorrected
      unanswered = total || 0;
      uncorrected = total || 0;
    }

    return c.json({
      total: total || 0,
      unanswered,
      uncorrected,
    });
  } catch (error) {
    console.log(`Error fetching quiz counts: ${error}`);
    return c.json({ error: 'Failed to fetch quiz counts' }, 500);
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

    // Save answer in RDB
    const { error: answerError } = await supabase
      .from('user_answers')
      .insert({
        user_id: user.id,
        quiz_id: quizId,
        user_answer: userAnswer,
        is_correct: isCorrect,
        answered_at: new Date().toISOString(),
      });

    if (answerError) {
      console.error(`Error inserting answer into RDB: ${answerError.message}`);
      return c.json({ error: 'Failed to save answer' }, 500);
    }

    // Note: User stats are now calculated automatically via user_statistics_view

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

    // Note: User stats are now calculated automatically via user_statistics_view
    // This endpoint is kept for backward compatibility but no longer updates stats

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

    // Get stats from user_statistics_view
    const { data: statsData } = await supabase
      .from('user_statistics_view')
      .select('total_answers, total_correct')
      .eq('user_id', user.id)
      .single();

    // Get user profile from profiles table
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Calculate totalQuizzes (sessions) - for now, we don't track this separately
    // so we use total_answers as a proxy
    const stats = {
      totalQuizzes: statsData?.total_answers || 0,
      totalCorrect: statsData?.total_correct || 0,
      totalAnswers: statsData?.total_answers || 0,
    };

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

    // Get answer history from RDB with quiz details
    const { data: answers, error } = await supabase
      .from('user_answers')
      .select(`
        id,
        user_answer,
        is_correct,
        answered_at,
        quizzes (
          id,
          question,
          answer,
          explanation
        )
      `)
      .eq('user_id', user.id)
      .order('answered_at', { ascending: false });

    if (error) {
      console.log(`Error fetching history: ${error}`);
      return c.json({ error: 'Failed to fetch history' }, 500);
    }

    // Transform to match expected format
    const history = (answers || []).map(a => ({
      userId: user.id,
      quizId: a.quizzes?.id,
      userAnswer: a.user_answer,
      isCorrect: a.is_correct,
      answeredAt: a.answered_at,
      question: a.quizzes?.question,
      correctAnswer: a.quizzes?.answer,
      explanation: a.quizzes?.explanation,
    }));

    return c.json({ history });
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
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
      unit: '電流と回路',
      categoryId: 'category:7',
      order: 32,
    },
    {
      id: 'quiz:201',
      question: '江戸幕府の支配のしくみを、『○○体制』という一言で答えなさい。',
      answer: '幕藩体制',
      explanation: '江戸時代は、将軍が直接支配する**幕府の領地（幕領）**と、各地の**大名が支配する藩**が組み合わさって国を治めていました。このしくみをまとめて**幕藩体制**といいます。幕府が全国の大名を従えたしくみをおさえる、江戸時代の最重要キーワードです。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 1,
    },
    {
      id: 'quiz:202',
      question: '江戸幕府が大名をコントロールするために行った制度で、『大名に **1年おきに江戸と自分の領地を行き来させる** 制度』を何といいますか。',
      answer: '参勤交代',
      explanation: '**参勤交代**は、3代将軍徳川家光のときに決められた制度です。大名は1年ごとに江戸と領地を行き来し、妻子は人質のように江戸に住まわせ、行き来にかかるお金で、大名の財政も苦しくさせたことで、**反乱を起こさせないようにした**のが目的です。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 2,
    },
    {
      id: 'quiz:203',
      question: '江戸時代の村では、年貢の納入や犯罪防止のために、数戸の家を1組にまとめて**連帯責任**を負わせるしくみがありました。これを何といいますか。',
      answer: '五人組',
      explanation: '**五人組**は、だいたい5戸前後を1グループにして、年貢をきちんと納める、税を逃れようとする者・犯罪者を出さないといったことを、グループみんなで責任を持たせる制度です。1人が約束を破ると、**グループ全員が責任を問われる**ので、村人どうしで監視させるねらいがありました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 3,
    },
    {
      id: 'quiz:204',
      question: '江戸時代の身分制度で、次の語を**身分の高い順**に並べかえなさい。\n\n武士　／　町人　／　百姓',
      answer: '武士 → 百姓 → 町人',
      explanation: '江戸時代の身分は、**士農工商（しのうこうしょう）**と教わることが多いです。士：武士、農：百姓（農民）、工：職人、商：商人・問屋など。町人は、主に**職人と商人**を合わせた呼び方なので、**武士 → 百姓 → 町人（職人・商人）**の順で押さえておけばOKです。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 4,
    },
    {
      id: 'quiz:205',
      question: '江戸時代の百姓のうち、自分の田畑を持ち、年貢を納める義務を負っていた百姓を何といいますか。また、土地を持たず、他人の田畑を借りて耕していた百姓を何といいますか。',
      answer: '本百姓、水呑百姓',
      explanation: '**本百姓**は、田畑を所有し、年貢を直接納める義務を持つ、村の『正規メンバー』のような存在です。一方、**水呑百姓**は土地を持たず、他人の田畑を借りて耕して生活していました。本百姓の生活が苦しくなると、土地を手放して水呑百姓が増えていき、村の経済にも影響しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 5,
    },
    {
      id: 'quiz:206',
      question: '江戸時代の鎖国の中で、ヨーロッパの国の中で唯一、日本との貿易を許された国はどこですか。また、その国との貿易の窓口となった港はどこですか。',
      answer: 'オランダ、長崎',
      explanation: '鎖国政策の中で、日本は**ポルトガル人を追放**し、キリスト教のひろがりをおそれましたが、オランダは宗教活動をほとんど行わなかったため、例外的に貿易を許されました。貿易の窓口は、**長崎の出島**という人工島で、オランダ商館が置かれ、銅・銀・生糸などを取引しました。ここを通じて、ヨーロッパの科学技術や医学などの知識（蘭学）が日本に入ってきました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 6,
    },
    {
      id: 'quiz:207',
      question: '江戸時代の鎖国のとき、日本が公式に交流・貿易をしていた相手と、その窓口となった場所の正しい組み合わせを、次から**すべて**選びなさい。\n\nア．中国 － 長崎\nイ．オランダ － 長崎\nウ．朝鮮 － 対馬\nエ．琉球 － 薩摩\nオ．アイヌの人びと － 松前',
      answer: 'ア・イ・ウ・エ・オ',
      explanation: '鎖国といっても、**完全に国を閉ざしたわけではなく**、限られた窓口で外国と交流していました。代表的な組み合わせは次のとおりです。中国（清）… 長崎、オランダ… 長崎（出島）、朝鮮… 対馬の藩を通じて（朝鮮通信使）、琉球王国… 薩摩藩を通じて、アイヌの人びと… 松前藩（蝦夷地）を通じて。',
      type: 'multiple-choice',
      choices: [
        'ア．中国 － 長崎',
        'イ．オランダ － 長崎',
        'ウ．朝鮮 － 対馬',
        'エ．琉球 － 薩摩',
        'オ．アイヌの人びと － 松前',
      ],
      difficulty: 4,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 7,
    },
    {
      id: 'quiz:208',
      question: '江戸幕府がキリスト教を厳しく禁止するきっかけの一つとなった、1637年〜38年に起こった大きな一揆を何といいますか。また、その一揆が起こった地方名を答えなさい。',
      answer: '島原・天草一揆、九州地方',
      explanation: '重い年貢やキリスト教信者への弾圧に苦しんだ農民・キリシタンたちが、九州の島原・天草地方で起こしたのが**島原・天草一揆**です。これを鎮圧した幕府は、キリスト教をさらに厳しく禁止、外国人宣教師・ポルトガル人の追放などを進め、のちの**鎖国政策強化**へとつながっていきました。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:7',
      order: 8,
    },
    {
      id: 'quiz:209',
      question: '江戸時代、日本は朝鮮とのあいだで友好関係を保っていました。朝鮮との外交を担当した日本側の藩を何といい、そのとき日本に送られてきた使節を何と呼びましたか。',
      answer: '対馬藩、朝鮮通信使',
      explanation: '鎖国といっても、周辺諸国との外交は続いており、**朝鮮との窓口が対馬藩**でした。朝鮮からは、将軍の代替わりのときなどに**朝鮮通信使**が派遣され、日本文化にも大きな影響を与えました。絵画・儒学・儀礼など、文化交流の側面も重要なポイントです。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 9,
    },
    {
      id: 'quiz:210',
      question: '鎖国の中でも、ヨーロッパの学問や科学が日本へ入ってくる道は完全には閉ざされていませんでした。オランダ語で書かれた学問を何と呼び、その学問が特に発達した分野を一つ答えなさい。',
      answer: '蘭学、医学',
      explanation: 'オランダとの貿易を通じて入ってきた書物をもとに発達した学問が**蘭学**です。特に**医学**の分野が有名で、解体新書（杉田玄白ら）などは典型的な例です。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 10,
    },
    {
      id: 'quiz:211',
      question: '徳川家康は誰が始めた何という貿易を受け継ぎ、誰と誰を外交顧問としましたか。',
      answer: '豊臣秀吉の朱印船貿易・ウィリアム・アダムズ・ヤン・ヨーステン',
      explanation: '朱印船貿易を継続し、外国人航海士2名を外交に活用しました。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 11,
    },
    {
      id: 'quiz:212',
      question: '朱印船貿易において貿易の許可証と、その許可を得た船を何といいますか。',
      answer: '朱印状・朱印船',
      explanation: '将軍が発行する朱印状を持つ船のみ海外貿易が認められました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 12,
    },
    {
      id: 'quiz:213',
      question: '朱印船貿易で東南アジアにできた日本人町を何といいますか。',
      answer: '日本町',
      explanation: '多くの日本人が移住し自治や商業活動を行いました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 13,
    },
    {
      id: 'quiz:214',
      question: 'シャム（タイ）で活躍した日本人は誰ですか。',
      answer: '山田長政',
      explanation: '日本人傭兵団の指導者として王の信任を得ました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 14,
    },
    {
      id: 'quiz:215',
      question: '江戸幕府の3代将軍は誰ですか。',
      answer: '徳川家光',
      explanation: '参勤交代の制度化や鎖国完成など、幕府体制を固めました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '強かな支配の中で生きた人々',
      categoryId: 'category:7',
      order: 15,
    },
    {
      id: 'quiz:216',
      question: '徳川家光の時代の政策・出来事を4つ答えなさい。',
      answer: '参勤交代・島原天草一揆・キリスト教禁止の徹底・鎖国',
      explanation: '家光時代に幕府の統制強化につながる重要政策が多数実施されました。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 16,
    },
    {
      id: 'quiz:217',
      question: 'キリスト教禁止のために設けられた制度と行為は何ですか。',
      answer: '寺請制度・絵踏',
      explanation: '寺に所属させる寺請制度と、像を踏ませる絵踏によって隠れキリシタンを摘発しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 17,
    },
    {
      id: 'quiz:218',
      question: '何年にどこの国の船を禁じて鎖国が完成しましたか。',
      answer: '1639年・ポルトガル船',
      explanation: 'ポルトガルとの断交により、鎖国体制が最終的に形を整えました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 18,
    },
    {
      id: 'quiz:219',
      question: '鎖国下で貿易が許された国を2つ答えなさい。',
      answer: 'オランダ・中国',
      explanation: '布教に積極的でなかったためこの2国に限定されました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 19,
    },
    {
      id: 'quiz:220',
      question: '1641年、オランダ商館はどこからどこの何へ移されましたか。',
      answer: '平戸から長崎の出島へ',
      explanation: '外国人の活動を制限するため人工島・出島へ移転させました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 20,
    },
    {
      id: 'quiz:221',
      question: '朝鮮との窓口となった藩と使節の名前を答えなさい。',
      answer: '対馬藩の宗氏・朝鮮通信使',
      explanation: '外交の門戸を開いた対馬藩宗氏が中心となり、朝鮮通信使が派遣されました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 21,
    },
    {
      id: 'quiz:222',
      question: '江戸時代の農民に課された連帯責任の仕組みを何といいますか。',
      answer: '五人組',
      explanation: '年貢の納入などを数戸のグループで互いに監視させました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 22,
    },
    {
      id: 'quiz:223',
      question: '江戸時代前半の文化を何文化といい、中心地はどこですか。',
      answer: '元禄文化・上方（京都・大阪）',
      explanation: '町人文化が発展し、上方を中心に文化が栄えました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 23,
    },
    {
      id: 'quiz:224',
      question: '『見返り美人図』の作者は誰ですか。',
      answer: '菱川師宣',
      explanation: '初期浮世絵の代表的画家で、美人画で知られます。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 24,
    },
    {
      id: 'quiz:225',
      question: '人形浄瑠璃の代表的な脚本家は誰ですか。',
      answer: '近松門左衛門',
      explanation: '「曽根崎心中」など名作を多数執筆しました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 25,
    },
    {
      id: 'quiz:226',
      question: '元禄文化の時期の代表的俳人は誰ですか。',
      answer: '松尾芭蕉',
      explanation: '「奥の細道」で知られる俳諧の巨匠です。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 26,
    },
    {
      id: 'quiz:227',
      question: '江戸時代後半の文化を何文化といい、その中心地はどこですか。',
      answer: '化政文化・江戸',
      explanation: '江戸の町人文化が大きく花開いた時期です。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 27,
    },
    {
      id: 'quiz:228',
      question: '庶民の子どもに読み書きそろばんを教えた場所を何といいますか。',
      answer: '寺子屋',
      explanation: '全国に広く広まり、基本教育の中心となりました。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 28,
    },
    {
      id: 'quiz:229',
      question: 'キリスト教と関係のない洋書の輸入を許可したことで起こった学問は何ですか。',
      answer: '蘭学',
      explanation: 'オランダ語の医学・科学書の研究が盛んになりました。',
      type: 'text',
      difficulty: 3,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 29,
    },
    {
      id: 'quiz:230',
      question: '『ターヘル・アナトミア』を翻訳し「解体新書」を出版した2名と原語は何語ですか。',
      answer: '杉田玄白・前野良沢・オランダ語・解体新書',
      explanation: '西洋医学を日本に紹介した重要な翻訳書です。',
      type: 'text',
      difficulty: 4,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 30,
    },
    {
      id: 'quiz:231',
      question: '『富嶽三十六景』の作者は誰ですか。',
      answer: '葛飾北斎',
      explanation: '富士山を題材とした代表的浮世絵シリーズです。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 31,
    },
    {
      id: 'quiz:232',
      question: '『東海道五十三次』の作者は誰ですか。',
      answer: '歌川広重',
      explanation: '宿場町を描いた風景浮世絵で広く知られています。',
      type: 'text',
      difficulty: 2,
      subject: '社会',
      unit: '国を閉ざした日本',
      categoryId: 'category:8',
      order: 32,
    },
  ];

  // Write to RDB
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  for (const quiz of defaultQuizzes) {
    // Look up unit_id from unit name
    const { data: unit } = await supabase
      .from('units')
      .select('id')
      .eq('name', quiz.unit)
      .eq('subject', quiz.subject)
      .single();

    if (!unit) {
      console.log(`Warning: Unit not found for quiz: ${quiz.question} (unit: ${quiz.unit})`);
      continue;
    }

    await supabase.from("quizzes").insert({
      question: quiz.question,
      answer: quiz.answer,
      explanation: quiz.explanation,
      type: quiz.type,
      options: quiz.choices ? quiz.choices : null,
      difficulty: quiz.difficulty,
      subject: quiz.subject,
      unit_id: unit.id,
      category_id: quiz.categoryId,
      order: quiz.order,
    });
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

  // Write to RDB
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  for (const category of categories) {
    await supabase.from("categories").insert({
      name: category.name,
      order: category.order,
    });
  }

  console.log('Categories initialized successfully');
}

Deno.serve(app.fetch);
