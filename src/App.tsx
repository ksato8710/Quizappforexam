import { useState, useEffect } from 'react';
import { QuizCard } from './components/QuizCard';
import { QuizSettings, QuizConfig } from './components/QuizSettings';
import { Auth } from './components/Auth';
import { Button } from './components/ui/button';
import { BookOpen, RotateCcw, LogOut, BarChart3, Settings } from 'lucide-react';
import { apiClient, Quiz, Category } from './utils/api-client';
import { getSupabaseClient } from './utils/supabase/client';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stats, setStats] = useState({ totalQuizzes: 0, totalCorrect: 0, totalAnswers: 0 });
  const [categories, setCategories] = useState<Category[]>([]);
  const [quizConfig, setQuizConfig] = useState<QuizConfig | null>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    checkAuth();
    loadCategories();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (data.user && !error) {
          setIsAuthenticated(true);
          setUserName(data.user.user_metadata?.name || data.user.email || 'ユーザー');
          loadStats();
        } else {
          localStorage.removeItem('accessToken');
        }
      } catch (err) {
        console.error('Auth check error:', err);
        localStorage.removeItem('accessToken');
      }
    }
    setLoading(false);
  };

  const loadCategories = async () => {
    try {
      const { categories: fetchedCategories } = await apiClient.getCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadQuizzes = async (config?: QuizConfig) => {
    try {
      const params = config ? {
        categoryId: config.categoryId,
        difficulty: config.difficulty,
        count: config.count,
      } : undefined;

      const response = await apiClient.getQuizzes(params);
      console.log('Quiz API response:', response);

      const { quizzes: fetchedQuizzes } = response;
      console.log('Fetched quizzes:', fetchedQuizzes);

      // Ensure we have valid quizzes array
      if (!fetchedQuizzes || !Array.isArray(fetchedQuizzes)) {
        console.error('Invalid quizzes data received:', fetchedQuizzes);
        return;
      }

      // Filter out null/undefined values first
      const validQuizzes = fetchedQuizzes.filter(quiz => {
        if (quiz == null) {
          console.warn('Found null/undefined quiz');
          return false;
        }
        return true;
      });

      console.log('Valid quizzes after filter:', validQuizzes);
      setQuizzes(validQuizzes);
    } catch (error) {
      console.error('Failed to load quizzes:', error);
    }
  };

  const loadStats = async () => {
    try {
      const { stats: userStats } = await apiClient.getStats();
      setStats(userStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  const handleAuthSuccess = (accessToken: string, name: string) => {
    setIsAuthenticated(true);
    setUserName(name);
    loadStats();
    setShowSettings(true);
  };

  const handleQuizStart = (config: QuizConfig) => {
    setQuizConfig(config);
    setShowSettings(false);
    setCurrentQuizIndex(0);
    setShowAnswer(false);
    setIsCompleted(false);
    setUserAnswer('');
    setIsCorrect(null);
    setCorrectCount(0);
    loadQuizzes(config);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('accessToken');
    setIsAuthenticated(false);
    setUserName('');
    setCurrentQuizIndex(0);
    setShowAnswer(false);
    setIsCompleted(false);
    setUserAnswer('');
    setIsCorrect(null);
    setCorrectCount(0);
    setShowStats(false);
    setShowSettings(false);
    setQuizConfig(null);
  };

  const currentQuiz = quizzes[currentQuizIndex];
  const progress = quizzes.length > 0 ? ((currentQuizIndex + 1) / quizzes.length) * 100 : 0;

  const handleShowAnswer = async () => {
    const correct = checkAnswer(userAnswer, currentQuiz.answer);
    setIsCorrect(correct);
    if (correct) {
      setCorrectCount(correctCount + 1);
    }
    setShowAnswer(true);

    // Save answer to database
    if (isAuthenticated) {
      try {
        await apiClient.saveAnswer(currentQuiz.id, userAnswer, correct);
      } catch (error) {
        console.error('Failed to save answer:', error);
      }
    }
  };

  const checkAnswer = (userAns: string, correctAns: string): boolean => {
    const normalizeAnswer = (ans: string) => {
      return ans.trim().toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[（）()]/g, '');
    };
    
    const normalized = normalizeAnswer(userAns);
    const correctNormalized = normalizeAnswer(correctAns);
    
    return normalized === correctNormalized || 
           correctNormalized.includes(normalized) ||
           normalized.includes(correctNormalized);
  };

  const handleNext = () => {
    if (currentQuizIndex < quizzes.length - 1) {
      setCurrentQuizIndex(currentQuizIndex + 1);
      setShowAnswer(false);
      setUserAnswer('');
      setIsCorrect(null);
    } else {
      setIsCompleted(true);
      // Save quiz completion
      if (isAuthenticated) {
        apiClient.completeQuiz(correctCount, quizzes.length).catch(err => {
          console.error('Failed to complete quiz:', err);
        });
      }
    }
  };

  const handleRestart = () => {
    setShowSettings(true);
  };

  const getCategoryName = (categoryId?: string): string | undefined => {
    if (!categoryId) return undefined;
    const category = categories.find(c => c.id === categoryId);
    return category?.name;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">読み込み中...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  if (showSettings) {
    return <QuizSettings onStart={handleQuizStart} />;
  }

  if (showStats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-indigo-900">あなたの統計</h1>
            <Button
              onClick={() => setShowStats(false)}
              variant="outline"
            >
              戻る
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mb-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600 mb-2">完了したクイズ</p>
              <p className="text-indigo-600">{stats.totalQuizzes}回</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600 mb-2">総回答数</p>
              <p className="text-indigo-600">{stats.totalAnswers}問</p>
            </div>
            <div className="bg-white rounded-xl shadow-md p-6">
              <p className="text-gray-600 mb-2">正解数</p>
              <p className="text-green-600">{stats.totalCorrect}問</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <p className="text-gray-700 mb-2">正答率</p>
            <div className="flex items-baseline gap-2">
              <span className="text-indigo-600">
                {stats.totalAnswers > 0 
                  ? Math.round((stats.totalCorrect / stats.totalAnswers) * 100)
                  : 0}%
              </span>
              <span className="text-gray-600">
                ({stats.totalCorrect} / {stats.totalAnswers})
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-indigo-900 mb-2">お疲れさまでした！</h2>
            <p className="text-gray-600 mb-6">全{quizzes.length}問のクイズが完了しました。</p>
            
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-indigo-200 rounded-xl p-6 mb-6">
              <p className="text-gray-700 mb-2">あなたの結果</p>
              <div className="flex items-center justify-center gap-2">
                <span className="text-indigo-600">{correctCount}</span>
                <span className="text-gray-600">/</span>
                <span className="text-gray-600">{quizzes.length}</span>
                <span className="text-gray-600">問正解</span>
              </div>
              <div className="mt-3">
                <div className="text-indigo-600">
                  正答率: {Math.round((correctCount / quizzes.length) * 100)}%
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={handleRestart}
              className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              size="lg"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              最初から始める
            </Button>
            <Button
              onClick={() => setShowStats(true)}
              variant="outline"
              size="lg"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              統計を見る
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">クイズを読み込んでいます...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-between items-center mb-4">
            <div className="flex-1" />
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span className="text-indigo-900">中受クイズ</span>
            </div>
            <div className="flex-1 flex justify-end gap-2">
              <Button
                onClick={() => setShowSettings(true)}
                variant="outline"
                size="sm"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setShowStats(true)}
                variant="outline"
                size="sm"
              >
                <BarChart3 className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <p className="text-gray-600 mb-2">ようこそ、{userName}さん</p>
          <h1 className="text-indigo-900 mb-2">楽しく学ぼう！</h1>
          <p className="text-gray-600">全{quizzes.length}問</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-700">進捗状況</span>
            <span className="text-indigo-600">{currentQuizIndex + 1} / {quizzes.length}</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quiz Card */}
        <QuizCard
          quiz={currentQuiz}
          showAnswer={showAnswer}
          onShowAnswer={handleShowAnswer}
          onNext={handleNext}
          isLastQuiz={currentQuizIndex === quizzes.length - 1}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          isCorrect={isCorrect}
          categoryName={getCategoryName(currentQuiz?.categoryId)}
        />
      </div>
    </div>
  );
}