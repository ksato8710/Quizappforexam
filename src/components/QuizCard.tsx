import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ChevronRight, Eye, CheckCircle2, XCircle } from 'lucide-react';
import { Quiz } from '../utils/api-client';

interface QuizCardProps {
  quiz: Quiz;
  showAnswer: boolean;
  onShowAnswer: () => void;
  onNext: () => void;
  isLastQuiz: boolean;
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  isCorrect: boolean | null;
}

export function QuizCard({ quiz, showAnswer, onShowAnswer, onNext, isLastQuiz, userAnswer, setUserAnswer, isCorrect }: QuizCardProps) {
  const handleChoiceClick = (choice: string) => {
    if (!showAnswer) {
      // Extract the choice letter (ア, イ, ウ, エ)
      const choiceLetter = choice.charAt(0);
      setUserAnswer(choiceLetter);
    }
  };

  return (
    <Card className="bg-white shadow-xl rounded-2xl overflow-hidden">
      <div className="p-8">
        {/* Question Number */}
        <div className="inline-block bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-1 rounded-full mb-6">
          問{quiz.id}
        </div>

        {/* Question */}
        <div className="mb-8">
          <h2 className="text-gray-900 mb-4">{quiz.question}</h2>
          
          {/* Multiple Choice Options */}
          {quiz.type === 'multiple-choice' && quiz.choices && (
            <div className="space-y-2 mt-6">
              {quiz.choices.map((choice, index) => {
                const choiceLetter = choice.charAt(0);
                const isSelected = userAnswer === choiceLetter;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleChoiceClick(choice)}
                    disabled={showAnswer}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      isSelected 
                        ? 'border-indigo-500 bg-indigo-50' 
                        : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-25'
                    } ${showAnswer ? 'cursor-default' : 'cursor-pointer'}`}
                  >
                    <p className="text-gray-700">{choice}</p>
                  </button>
                );
              })}
            </div>
          )}

          {/* Text Input for non-multiple-choice questions */}
          {quiz.type === 'text' && (
            <div className="mt-6">
              <label className="block text-gray-700 mb-2">あなたの答え：</label>
              <Input
                type="text"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="答えを入力してください"
                disabled={showAnswer}
                className="text-gray-900"
              />
            </div>
          )}
        </div>

        {/* Answer Section */}
        {showAnswer && (
          <div className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            {/* Correct/Incorrect Badge */}
            <div className="mb-4">
              {isCorrect ? (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                  <span className="text-green-600">正解！</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="w-6 h-6" />
                  <span className="text-red-600">不正解</span>
                </div>
              )}
            </div>

            <div className={`border-2 rounded-xl p-6 ${
              isCorrect 
                ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200' 
                : 'bg-gradient-to-br from-red-50 to-orange-50 border-red-200'
            }`}>
              <div className="mb-3">
                <span className={`inline-block text-white px-3 py-1 rounded-full ${
                  isCorrect ? 'bg-green-600' : 'bg-red-600'
                }`}>
                  正解
                </span>
              </div>
              <p className={`mb-4 ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                {quiz.answer}
              </p>
              
              <div className={`border-t pt-4 mt-4 ${
                isCorrect ? 'border-green-200' : 'border-red-200'
              }`}>
                <p className="text-gray-700">{quiz.explanation}</p>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-3">
          {!showAnswer ? (
            <Button
              onClick={onShowAnswer}
              disabled={!userAnswer.trim()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              size="lg"
            >
              <Eye className="w-4 h-4 mr-2" />
              答えを見る
            </Button>
          ) : (
            <Button
              onClick={onNext}
              className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
              size="lg"
            >
              {isLastQuiz ? '完了' : '次の問題へ'}
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}