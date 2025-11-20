import { useMemo, useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { BookOpen, Play, ChevronRight, BarChart3, LogOut } from 'lucide-react';
import { SOUND_EFFECT_PRESETS, DEFAULT_SOUND_EFFECT_ID } from '../constants/sound-effects';
import { playSoundEffect } from '../utils/sound-effects';

export interface QuizConfig {
  subject?: string;
  unit?: string;
  difficulty: number | null;
  count: number;
  historyFilter?: 'unanswered' | 'uncorrected';
  soundEffect?: string;
}

interface QuizSettingsProps {
  onStart: (config: QuizConfig) => void;
  onShowStats?: () => void;
  onLogout?: () => void;
}

export type QuizSelectionState = {
  subject: string | null;
  unit: string | null;
  count: string;
  historyFilter: 'all' | 'unanswered' | 'uncorrected';
  soundEffect: string;
};

type SelectionCard = {
  value: string;
  label: string;
  icon: string;
  description: string;
};

const SUBJECT_CARDS: SelectionCard[] = [
  {
    value: '社会',
    label: '社会',
    icon: '🌏',
    description: '歴史や地理の問題',
  },
  {
    value: '理科',
    label: '理科',
    icon: '🔬',
    description: '物理・化学・地学の問題',
  },
];

type UnitCard = SelectionCard & { subject: string };

const UNIT_CARDS: Record<string, UnitCard[]> = {
  '社会': [
    {
      value: 'all',
      label: '全単元',
      icon: '📘',
      description: '社会の全単元',
      subject: '社会',
    },
    {
      value: '強かな支配の中で生きた人々',
      label: '強かな支配の中で生きた人々',
      icon: '🏯',
      description: '江戸時代初期の社会',
      subject: '社会',
    },
    {
      value: '国を閉ざした日本',
      label: '国を閉ざした日本',
      icon: '🗺️',
      description: '鎖国体制と国内の変化',
      subject: '社会',
    },
  ],
  '理科': [
    {
      value: 'all',
      label: '全単元',
      icon: '📘',
      description: '理科の全単元',
      subject: '理科',
    },
    {
      value: '電流・電圧と電気抵抗',
      label: '電流・電圧と電気抵抗',
      icon: '⚡',
      description: '電気回路と電流の性質',
      subject: '理科',
    },
  ],
};

const HISTORY_FILTER_CARDS: SelectionCard[] = [
  {
    value: 'all',
    label: 'すべての問題',
    icon: '🗂️',
    description: '履歴に関係なく全て出題',
  },
  {
    value: 'unanswered',
    label: '未回答のみ',
    icon: '📝',
    description: 'まだ解いていない問題だけ',
  },
  {
    value: 'uncorrected',
    label: '正解していない問題のみ',
    icon: '🎯',
    description: '一度も正解していない問題だけ',
  },
];

const QUESTION_COUNTS = [5, 10, 20, 30];

export function buildQuizConfig(state: QuizSelectionState): QuizConfig {
  const subject = state.subject && state.subject !== 'all' ? state.subject : undefined;
  const unit = state.unit && state.unit !== 'all' ? state.unit : undefined;
  const historyFilter = state.historyFilter === 'all' ? undefined : state.historyFilter;

  return {
    subject,
    unit,
    difficulty: null,
    count: parseInt(state.count, 10),
    historyFilter,
    soundEffect: state.soundEffect,
  };
}

export function QuizSettings({ onStart, onShowStats, onLogout }: QuizSettingsProps) {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null);
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState<'all' | 'unanswered' | 'uncorrected'>('all');
  const [selectedCount, setSelectedCount] = useState<number>(10);
  const [selectedSoundEffect, setSelectedSoundEffect] = useState<string>(DEFAULT_SOUND_EFFECT_ID);

  const availableUnits = useMemo(() => {
    if (!selectedSubject) return [];
    return UNIT_CARDS[selectedSubject] ?? [];
  }, [selectedSubject]);

  const handleSubjectSelect = (value: string) => {
    setSelectedSubject(value);
    const firstUnit = (UNIT_CARDS[value] ?? [])[0];
    setSelectedUnit(firstUnit?.value ?? null);
  };

  const handleUnitSelect = (value: string) => {
    setSelectedUnit(value);
  };

  const handleStart = () => {
    onStart(
      buildQuizConfig({
        subject: selectedSubject,
        unit: selectedUnit,
        count: String(selectedCount),
        historyFilter: selectedHistoryFilter,
        soundEffect: selectedSoundEffect,
      }),
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <BookOpen className="w-8 h-8 text-indigo-600" />
            <h1 className="text-indigo-900">クイズ設定</h1>
          </div>
          <p className="text-gray-600">学習したい内容を選択してください</p>
        </div>

        <div className="space-y-6">
          {/* ステップ1: 教科選択 */}
          <Card className="bg-white shadow-xl rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 shrink-0 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-base">
                1
              </div>
              <h3 className="text-indigo-900 text-lg font-semibold">教科を選択</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {SUBJECT_CARDS.map((card) => {
                const isActive = selectedSubject === card.value;
                return (
                  <button
                    key={card.value}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={card.label}
                    onClick={() => handleSubjectSelect(card.value)}
                    className={`p-6 rounded-xl border-2 transition-all ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="text-center">
                      <div className="text-4xl mb-2">{card.icon}</div>
                      <div className={`font-bold ${
                        isActive ? 'text-indigo-700' : 'text-gray-700'
                      }`}>{card.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>

          {/* ステップ2: 単元選択 */}
          {selectedSubject && (
            <Card className="bg-white shadow-xl rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 shrink-0 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-base">
                  2
                </div>
                <h3 className="text-indigo-900 text-lg font-semibold">単元を選択</h3>
              </div>

              <div 
                className="grid gap-4"
                style={{
                  gridTemplateColumns: selectedSubject === '社会' ? 'repeat(3, minmax(0, 1fr))' : 'repeat(2, minmax(0, 1fr))'
                }}
              >
                {availableUnits.map((unit) => {
                  const isActive = selectedUnit === unit.value;
                  return (
                    <button
                      key={`${unit.subject}-${unit.value}`}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={unit.label}
                      onClick={() => handleUnitSelect(unit.value)}
                      className={`p-6 rounded-xl border-2 transition-all min-w-0 ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">{unit.icon}</div>
                        <div className={`font-bold break-words ${
                          isActive ? 'text-indigo-700' : 'text-gray-700'
                        }`}>{unit.label}</div>
                        <div className="text-xs text-gray-500 mt-1 break-words">{unit.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ステップ3: 履歴フィルタ */}
          {selectedUnit && (
            <Card className="bg-white shadow-xl rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 shrink-0 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-base">
                  3
                </div>
                <h3 className="text-indigo-900 text-lg font-semibold">履歴フィルタ</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {HISTORY_FILTER_CARDS.map((card) => {
                  const isActive = selectedHistoryFilter === card.value;
                  return (
                    <button
                      key={card.value}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={card.label}
                      onClick={() => setSelectedHistoryFilter(card.value as 'all' | 'unanswered' | 'uncorrected')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-3xl mb-2">{card.icon}</div>
                        <div className={`font-bold ${
                          isActive ? 'text-indigo-700' : 'text-gray-700'
                        }`}>{card.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{card.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ステップ4: 問題数選択 */}
          {selectedUnit && (
            <Card className="bg-white shadow-xl rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 shrink-0 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-base">
                  4
                </div>
                <h3 className="text-indigo-900 text-lg font-semibold">問題数を選択</h3>
              </div>
              <div className="grid grid-cols-4 gap-3">
                {QUESTION_COUNTS.map((count) => {
                  const isActive = selectedCount === count;
                  return (
                    <button
                      key={count}
                      type="button"
                      aria-pressed={isActive}
                      aria-label={`${count}問`}
                      onClick={() => setSelectedCount(count)}
                      className={`px-4 py-3 rounded-lg border-2 transition-all ${
                        isActive
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      {count}問
                    </button>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ステップ5: 正解音選択 */}
          {selectedUnit && (
            <Card className="bg-white shadow-xl rounded-2xl p-6 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 shrink-0 rounded-full border-2 border-indigo-600 text-indigo-600 flex items-center justify-center font-bold text-base">
                  5
                </div>
                <h3 className="text-indigo-900 text-lg font-semibold">正解音を選択</h3>
              </div>
              <Select
                value={selectedSoundEffect}
                onValueChange={(value) => {
                  setSelectedSoundEffect(value);
                  void playSoundEffect(value);
                }}
              >
                <SelectTrigger className="w-full h-12 rounded-lg border-2 border-gray-200 px-3 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                  <SelectValue placeholder="サウンドを選択" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  sideOffset={4}
                  className="w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] rounded-xl border border-gray-100 bg-white shadow-xl max-h-[300px] overflow-y-auto"
                >
                  {SOUND_EFFECT_PRESETS.map((preset) => (
                    <SelectItem
                      key={preset.id}
                      value={preset.id}
                      className="text-gray-800 text-sm font-medium px-4 py-2 focus:bg-indigo-50 data-[highlighted]:bg-indigo-50 data-[state=checked]:bg-indigo-100 data-[state=checked]:text-indigo-700"
                    >
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Card>
          )}

          {/* スタートボタン */}
          {selectedUnit && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <Button
                onClick={handleStart}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-6"
                size="lg"
              >
                <Play className="w-5 h-5 mr-2" />
                クイズを始める
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          )}

          {/* 統計情報とログアウト */}
          <div className="flex flex-row gap-3">
            {onShowStats && (
              <Button onClick={onShowStats} variant="outline" className="flex-1 py-6" size="lg">
                <BarChart3 className="w-5 h-5 mr-2" />
                統計情報を見る
              </Button>
            )}

            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                className="flex-1 py-6 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                size="lg"
              >
                <LogOut className="w-5 h-5 mr-2" />
                ログアウト
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
