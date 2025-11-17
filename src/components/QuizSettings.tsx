import { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Play, BarChart3 } from 'lucide-react';
import { apiClient } from '../utils/api-client';

export interface QuizConfig {
  subject?: string;
  unit?: string;
  difficulty: number | null; // null means mix
  count: number;
}

interface QuizSettingsProps {
  onStart: (config: QuizConfig) => void;
  onShowStats?: () => void;
}

export function QuizSettings({ onStart, onShowStats }: QuizSettingsProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('mix');
  const [selectedCount, setSelectedCount] = useState<string>('10');
  const [loading, setLoading] = useState(false);

  const subjects = [
    { value: 'all', label: '全教科' },
    { value: '社会', label: '社会' },
    { value: '理科', label: '理科' },
  ];

  const units = [
    { value: 'all', label: '全単元' },
    { value: '強かな支配の中で生きた人々', label: '強かな支配の中で生きた人々' },
    { value: '国を閉ざした日本', label: '国を閉ざした日本' },
  ];

  const handleStart = () => {
    const config: QuizConfig = {
      subject: selectedSubject === 'all' ? undefined : selectedSubject,
      unit: selectedUnit === 'all' ? undefined : selectedUnit,
      difficulty: selectedDifficulty === 'mix' ? null : parseInt(selectedDifficulty),
      count: parseInt(selectedCount),
    };
    onStart(config);
  };

  const difficultyOptions = [
    { value: 'mix', label: 'ミックス' },
    { value: '2', label: 'やさしい' },
    { value: '3', label: 'ふつう' },
    { value: '4', label: 'むずかしい' },
    { value: '5', label: 'とてもむずかしい' },
  ];

  const countOptions = [
    { value: '5', label: '5問' },
    { value: '10', label: '10問' },
    { value: '20', label: '20問' },
  ];

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
          <h1 className="text-indigo-900 mb-2">クイズ設定</h1>
          <p className="text-gray-600">お好みの設定でクイズを始めましょう</p>
        </div>

        <Card className="bg-white shadow-xl rounded-2xl p-8">
          {/* Subject Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block">教科</Label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger className="w-full h-12 rounded-lg border-2 border-gray-200 px-3 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-gray-100 bg-white shadow-xl"
              >
                {subjects.map((subject) => (
                  <SelectItem
                    key={subject.value}
                    value={subject.value}
                    className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                  >
                    {subject.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block">単元</Label>
            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
              <SelectTrigger className="w-full h-12 rounded-lg border-2 border-gray-200 px-3 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent
                position="popper"
                sideOffset={4}
                className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-gray-100 bg-white shadow-xl"
              >
                {units.map((unit) => (
                  <SelectItem
                    key={unit.value}
                    value={unit.value}
                    className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                  >
                    {unit.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Difficulty Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block">難易度</Label>
            <RadioGroup value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {difficultyOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedDifficulty === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedDifficulty(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={`difficulty-${option.value}`} />
                    <Label
                      htmlFor={`difficulty-${option.value}`}
                      className="cursor-pointer flex-1 text-gray-700"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Question Count Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block">問題数</Label>
            <RadioGroup value={selectedCount} onValueChange={setSelectedCount}>
              <div className="grid grid-cols-3 gap-3">
                {countOptions.map((option) => (
                  <div
                    key={option.value}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedCount === option.value
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 bg-gray-50 hover:border-indigo-300'
                    }`}
                    onClick={() => setSelectedCount(option.value)}
                  >
                    <RadioGroupItem value={option.value} id={`count-${option.value}`} />
                    <Label
                      htmlFor={`count-${option.value}`}
                      className="cursor-pointer flex-1 text-gray-700"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Start Button */}
          <Button
            onClick={handleStart}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            size="lg"
          >
            <Play className="w-5 h-5 mr-2" />
            クイズを始める
          </Button>

          {/* Stats Button */}
          {onShowStats && (
            <Button
              onClick={onShowStats}
              variant="outline"
              className="w-full mt-3"
              size="lg"
            >
              <BarChart3 className="w-5 h-5 mr-2" />
              統計情報を見る
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
