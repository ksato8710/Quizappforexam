import { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Play, BarChart3, LogOut } from 'lucide-react';
import { apiClient } from '../utils/api-client';
import { SOUND_EFFECT_PRESETS, DEFAULT_SOUND_EFFECT_ID } from '../constants/sound-effects';
import { playSoundEffect } from '../utils/sound-effects';

export interface QuizConfig {
  subject?: string;
  unit?: string;
  difficulty: number | null; // null means mix
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
  subject: string;
  unit: string;
  count: string;
  historyFilter: 'all' | 'unanswered' | 'uncorrected';
  soundEffect: string;
};

export function buildQuizConfig(state: QuizSelectionState): QuizConfig {
  const subject = state.subject === 'all' ? undefined : state.subject;
  const unit = state.unit === 'all' ? undefined : state.unit;
  const difficulty = null;
  const count = parseInt(state.count, 10);
  const historyFilter = state.historyFilter === 'all' ? undefined : state.historyFilter;

  return {
    subject,
    unit,
    difficulty,
    count,
    historyFilter,
    soundEffect: state.soundEffect,
  };
}

export function QuizSettings({ onStart, onShowStats, onLogout }: QuizSettingsProps) {
  const [selectedSubject, setSelectedSubject] = useState<string>('all');
  const [selectedUnit, setSelectedUnit] = useState<string>('all');
  const [selectedCount, setSelectedCount] = useState<string>('10');
  const [selectedHistoryFilter, setSelectedHistoryFilter] = useState<'all' | 'unanswered' | 'uncorrected'>('all');
  const [selectedSoundEffect, setSelectedSoundEffect] = useState<string>(DEFAULT_SOUND_EFFECT_ID);
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
    onStart(
      buildQuizConfig({
        subject: selectedSubject,
        unit: selectedUnit,
        count: selectedCount,
        historyFilter: selectedHistoryFilter,
        soundEffect: selectedSoundEffect,
      }),
    );
  };

  const countOptions = [
    { value: '5', label: '5問' },
    { value: '10', label: '10問' },
    { value: '20', label: '20問' },
  ];

  const historyFilterOptions = [
    { value: 'all', label: 'すべての問題' },
    { value: 'unanswered', label: '未回答の問題のみ' },
    { value: 'uncorrected', label: '正解したことがない問題のみ' },
  ] as const;

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
            <Label className="text-gray-900 mb-3 block font-medium">教科</Label>
            <div className="space-y-4">
              {subjects.map((subject, index) => {
                const subjectId = `subject-option-${index}`;
                return (
                  <label
                    key={subject.value}
                    htmlFor={subjectId}
                    className="flex items-center gap-4 cursor-pointer text-gray-800 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-400"
                  >
                    <input
                      type="radio"
                      id={subjectId}
                      name="subject"
                      value={subject.value}
                      checked={selectedSubject === subject.value}
                      onChange={() => setSelectedSubject(subject.value)}
                      className="h-4 w-4 border-gray-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{subject.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Unit Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block font-medium">単元</Label>
            <div className="space-y-4">
              {units.map((unit, index) => {
                const unitId = `unit-option-${index}`;
                return (
                  <label
                    key={unit.value}
                    htmlFor={unitId}
                    className="flex items-center gap-4 cursor-pointer text-gray-800 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-400"
                  >
                    <input
                      type="radio"
                      id={unitId}
                      name="unit"
                      value={unit.value}
                      checked={selectedUnit === unit.value}
                      onChange={() => setSelectedUnit(unit.value)}
                      className="h-4 w-4 border-gray-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{unit.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* History Filter Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block font-medium">履歴フィルタ</Label>
            <div className="space-y-4">
              {historyFilterOptions.map((option, index) => {
                const historyId = `history-option-${index}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={historyId}
                    className="flex items-center gap-4 cursor-pointer text-gray-800 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-400"
                  >
                    <input
                      type="radio"
                      id={historyId}
                      name="history-filter"
                      value={option.value}
                      checked={selectedHistoryFilter === option.value}
                      onChange={() => setSelectedHistoryFilter(option.value)}
                      className="h-4 w-4 border-gray-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Question Count Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block font-medium">問題数</Label>
            <div className="space-y-4">
              {countOptions.map((option, index) => {
                const countId = `count-option-${index}`;
                return (
                  <label
                    key={option.value}
                    htmlFor={countId}
                    className="flex items-center gap-4 cursor-pointer text-gray-800 px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-400"
                  >
                    <input
                      type="radio"
                      id={countId}
                      name="count"
                      value={option.value}
                      checked={selectedCount === option.value}
                      onChange={() => setSelectedCount(option.value)}
                      className="h-4 w-4 border-gray-400 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{option.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Sound Effect Selection */}
          <div className="mb-8">
            <Label className="text-gray-900 mb-3 block">正解音</Label>
            <Select
              value={selectedSoundEffect}
              onValueChange={(value) => {
                setSelectedSoundEffect(value);
                playSoundEffect(value);
              }}
            >
              <SelectTrigger className="w-full h-12 rounded-lg border-2 border-gray-200 px-3 text-left text-gray-800 font-medium focus-visible:ring-2 focus-visible:ring-indigo-200 focus-visible:border-indigo-500">
                <SelectValue />
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

          {/* Stats and Logout Buttons */}
          <div className="flex gap-3 mt-3">
            {onShowStats && (
              <Button
                onClick={onShowStats}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                統計情報を見る
              </Button>
            )}

            {onLogout && (
              <Button
                onClick={onLogout}
                variant="outline"
                className="flex-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                size="lg"
              >
                <LogOut className="w-5 h-5 mr-2" />
                ログアウト
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
