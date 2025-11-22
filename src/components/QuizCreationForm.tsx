import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { apiClient, Category, Unit } from '@/utils/api-client';
import { X, Plus, ArrowLeft } from 'lucide-react';

interface QuizCreationFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const SUBJECT_OPTIONS = [
  { value: '社会', label: '社会', icon: '🌏' },
  { value: '理科', label: '理科', icon: '🔬' },
];

const DIFFICULTY_OPTIONS = [
  { value: 2, label: 'やさしい' },
  { value: 3, label: 'ふつう' },
  { value: 4, label: 'むずかしい' },
  { value: 5, label: 'とてもむずかしい' },
];

export function QuizCreationForm({ onClose, onSuccess }: QuizCreationFormProps) {
  const [quizType, setQuizType] = useState<'text' | 'multiple-choice'>('text');
  const [subject, setSubject] = useState('');
  const [unit, setUnit] = useState('');
  const [difficulty, setDifficulty] = useState('3');
  const [category, setCategory] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [choices, setChoices] = useState<string[]>(['', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [units, setUnits] = useState<Unit[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    // カテゴリを取得
    apiClient.getCategories().then(data => {
      setCategories(data.categories);
    }).catch(err => {
      console.error('Failed to fetch categories:', err);
    });
  }, []);

  useEffect(() => {
    // 教科が選択されたら単元を取得
    if (subject) {
      apiClient.getUnits({ subject }).then(data => {
        setUnits(data.units);
        setUnit(data.units[0]?.name ?? ''); // 先頭をデフォルト選択（必須化）
      }).catch(err => {
        console.error('Failed to fetch units:', err);
      });
    } else {
      setUnits([]);
      setUnit('');
    }
  }, [subject]);

  const addChoice = () => {
    if (choices.length < 4) {
      setChoices([...choices, '']);
    }
  };

  const removeChoice = (index: number) => {
    if (choices.length > 2) {
      setChoices(choices.filter((_, i) => i !== index));
    }
  };

  const updateChoice = (index: number, value: string) => {
    const newChoices = [...choices];
    newChoices[index] = value;
    setChoices(newChoices);
  };

  const validate = (): string | null => {
    if (!question.trim()) return '問題文を入力してください';
    if (!answer.trim()) return '正解を入力してください';
    if (!explanation.trim()) return '解説を入力してください';
    if (!subject) return '教科を選択してください';
    if (!unit) return '単元を選択してください';

    if (quizType === 'multiple-choice') {
      const validChoices = choices.filter(c => c.trim());
      if (validChoices.length < 2) return '選択肢は2つ以上入力してください';
      if (validChoices.length > 4) return '選択肢は4つまでです';
      if (!validChoices.includes(answer.trim())) {
        return '正解は選択肢のいずれかと一致する必要があります';
      }
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const params = {
        question: question.trim(),
        answer: answer.trim(),
        explanation: explanation.trim(),
        type: quizType,
        choices: quizType === 'multiple-choice'
          ? choices.filter(c => c.trim()).map(c => c.trim())
          : undefined,
        difficulty: parseInt(difficulty),
        subject: subject,
        unit: unit || undefined,
        categoryId: category || undefined,
      };

      await apiClient.createQuiz(params);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'クイズの作成に失敗しました');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              戻る
            </Button>
            <h1 className="text-3xl font-bold text-indigo-900">クイズを作成</h1>
          </div>
        </div>

        <Card className="p-6 space-y-6">
          {/* クイズタイプ */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-700">クイズタイプ</Label>
            <RadioGroup value={quizType} onValueChange={(value) => setQuizType(value as 'text' | 'multiple-choice')}>
              <div className="grid grid-cols-2 gap-4">
                <div
                  className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${quizType === 'text'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  onClick={() => setQuizType('text')}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="text" id="type-text" />
                    <Label htmlFor="type-text" className="cursor-pointer flex-1">
                      <div className={`font-bold ${quizType === 'text' ? 'text-indigo-700' : 'text-gray-700'}`}>
                        ✍️ テキスト入力
                      </div>
                    </Label>
                  </div>
                </div>
                <div
                  className={`relative p-4 rounded-xl border-2 transition-all cursor-pointer ${quizType === 'multiple-choice'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  onClick={() => setQuizType('multiple-choice')}
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="multiple-choice" id="type-choice" />
                    <Label htmlFor="type-choice" className="cursor-pointer flex-1">
                      <div className={`font-bold ${quizType === 'multiple-choice' ? 'text-indigo-700' : 'text-gray-700'}`}>
                        ☑️ 選択肢
                      </div>
                    </Label>
                  </div>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* 教科選択 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-700">教科 <span className="text-red-500">*</span></Label>
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="h-12 rounded-lg border-2 border-gray-200 px-4 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                <SelectValue placeholder="教科を選択" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                {SUBJECT_OPTIONS.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value}
                    className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                  >
                    {option.icon} {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 単元選択 */}
          {subject && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700">単元 <span className="text-red-500">*</span></Label>
              <Select value={unit} onValueChange={setUnit}>
                <SelectTrigger className="h-12 rounded-lg border-2 border-gray-200 px-4 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                  <SelectValue placeholder="単元を選択" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                  {units.map(u => (
                    <SelectItem
                      key={u.id}
                      value={u.name}
                      className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                    >
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 難易度選択 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold text-gray-700">難易度</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger className="h-12 rounded-lg border-2 border-gray-200 px-4 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                <SelectValue placeholder="難易度を選択" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                {DIFFICULTY_OPTIONS.map(option => (
                  <SelectItem
                    key={option.value}
                    value={option.value.toString()}
                    className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* カテゴリ選択 */}
          {categories.length > 0 && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700">カテゴリ</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-12 rounded-lg border-2 border-gray-200 px-4 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                  <SelectValue placeholder="カテゴリを選択（任意）" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-gray-100 bg-white shadow-xl">
                  {categories.map(cat => (
                    <SelectItem
                      key={cat.id}
                      value={cat.id}
                      className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                    >
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 問題文 */}
          <div className="space-y-3">
            <Label htmlFor="question" className="text-base font-semibold text-gray-700">
              問題文 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="問題文を入力してください"
              className="min-h-[100px]"
            />
          </div>

          {/* 正解 */}
          <div className="space-y-3">
            <Label htmlFor="answer" className="text-base font-semibold text-gray-700">
              正解 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="正解を入力してください"
            />
            {quizType === 'multiple-choice' && (
              <p className="text-sm text-gray-500">※ 選択肢のいずれかと一致する必要があります</p>
            )}
          </div>

          {/* 選択肢（multiple-choiceの場合のみ） */}
          {quizType === 'multiple-choice' && (
            <div className="space-y-3">
              <Label className="text-base font-semibold text-gray-700">
                選択肢 <span className="text-red-500">*</span>
              </Label>
              <div className="space-y-2">
                {choices.map((choice, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={choice}
                      onChange={(e) => updateChoice(index, e.target.value)}
                      placeholder={`選択肢 ${index + 1}`}
                    />
                    {choices.length > 2 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeChoice(index)}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                {choices.length < 4 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addChoice}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    選択肢を追加
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500">※ 2〜4個の選択肢を入力してください</p>
            </div>
          )}

          {/* 解説 */}
          <div className="space-y-3">
            <Label htmlFor="explanation" className="text-base font-semibold text-gray-700">
              解説 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="解説を入力してください"
              className="min-h-[100px]"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

        </Card>

        {/* アクションボタン */}
        <div className="flex gap-3 mt-6">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 py-6 bg-white"
            size="lg"
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1 py-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold shadow-lg shadow-indigo-200"
            size="lg"
            disabled={isSubmitting}
          >
            {isSubmitting ? '作成中...' : 'クイズを作成'}
          </Button>
        </div>
      </div>
    </div>
  );
}
