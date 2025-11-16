import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { BookOpen, Play } from 'lucide-react';
import { apiClient, Category } from '../utils/api-client';

export interface QuizConfig {
  categoryId: string;
  difficulty: number | null;
  count: number;
}

interface QuizSettingsProps {
  onStart: (config: QuizConfig) => void;
}

export function QuizSettings({ onStart }: QuizSettingsProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<number | null>(null);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { categories: fetchedCategories } = await apiClient.getCategories();
      setCategories(fetchedCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    onStart({
      categoryId: selectedCategory,
      difficulty: selectedDifficulty,
      count: questionCount,
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-indigo-600">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h1 className="text-indigo-900">クイズ設定</h1>
          </div>
          <p className="text-gray-600">学習したい内容を選択してください</p>
        </div>

        <Card className="bg-white shadow-xl rounded-2xl p-8">
          <div className="space-y-6">
            {/* カテゴリ選択 */}
            <div>
              <label className="block text-gray-700 mb-3">カテゴリ</label>
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedCategory === 'all'
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  すべてのカテゴリ
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition-all ${
                      selectedCategory === category.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 難易度選択 */}
            <div>
              <label className="block text-gray-700 mb-3">難易度</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setSelectedDifficulty(null)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedDifficulty === null
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300'
                  }`}
                >
                  ミックス
                </button>
                <button
                  onClick={() => setSelectedDifficulty(2)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedDifficulty === 2
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  やさしい
                </button>
                <button
                  onClick={() => setSelectedDifficulty(3)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedDifficulty === 3
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  ふつう
                </button>
                <button
                  onClick={() => setSelectedDifficulty(4)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all ${
                    selectedDifficulty === 4
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  むずかしい
                </button>
              </div>
            </div>

            {/* 問題数選択 */}
            <div>
              <label className="block text-gray-700 mb-3">問題数</label>
              <div className="grid grid-cols-4 gap-3">
                {[5, 10, 20, 30].map((count) => (
                  <button
                    key={count}
                    onClick={() => setQuestionCount(count)}
                    className={`px-4 py-3 rounded-lg border-2 transition-all ${
                      questionCount === count
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    {count}問
                  </button>
                ))}
              </div>
            </div>

            {/* スタートボタン */}
            <Button
              onClick={handleStart}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-6"
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              クイズを始める
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
