import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { useState } from 'react';
import { QuizCard } from './QuizCard';
import { Quiz } from '../utils/api-client';

describe('QuizCard Component', () => {
    // テスト用のモックデータ
    const mockTextQuiz: Quiz = {
        id: 'quiz-1',
        question: '江戸幕府を開いた将軍は誰ですか？',
        answer: '徳川家康',
        explanation: '1603年に征夷大将軍に任命されました。',
        type: 'text',
        difficulty: 2,
        subject: '社会',
        unit: '江戸時代',
    };

    const mockMultipleChoiceQuiz: Quiz = {
        id: 'quiz-2',
        question: '参勤交代の目的として正しいものはどれですか？',
        answer: 'ア',
        explanation: '大名の財力を削ぎ、幕府への反抗を防ぐためでした。',
        type: 'multiple-choice',
        choices: [
            'ア. 大名の財力を削ぐため',
            'イ. 大名同士の交流を深めるため',
            'ウ. 江戸の街を活性化するため',
            'エ. 将軍の権威を示すため',
        ],
        difficulty: 3,
        subject: '社会',
        unit: '江戸時代',
    };

    const defaultProps = {
        showAnswer: false,
        onShowAnswer: vi.fn(),
        onNext: vi.fn(),
        isLastQuiz: false,
        userAnswer: '',
        setUserAnswer: vi.fn(),
        isCorrect: null,
    };

    beforeEach(() => {
        cleanup();
    });

    describe('基本表示', () => {
        it('問題文が表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} />);
            expect(screen.getByText('江戸幕府を開いた将軍は誰ですか？')).toBeInTheDocument();
        });

        it('問題番号が表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} questionNumber={5} />);
            expect(screen.getByText('問5')).toBeInTheDocument();
        });

        it('問題番号が指定されていない場合はクイズIDを表示する', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} />);
            expect(screen.getByText('問quiz-1')).toBeInTheDocument();
        });

        it('難易度ラベルが表示される（やさしい）', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} />);
            expect(screen.getByText('やさしい')).toBeInTheDocument();
        });

        it('難易度ラベルが表示される（ふつう）', () => {
            const quiz = { ...mockTextQuiz, difficulty: 3 };
            render(<QuizCard {...defaultProps} quiz={quiz} />);
            expect(screen.getByText('ふつう')).toBeInTheDocument();
        });

        it('難易度ラベルが表示される（むずかしい）', () => {
            const quiz = { ...mockTextQuiz, difficulty: 4 };
            render(<QuizCard {...defaultProps} quiz={quiz} />);
            expect(screen.getByText('むずかしい')).toBeInTheDocument();
        });

        it('難易度ラベルが表示される（とてもむずかしい）', () => {
            const quiz = { ...mockTextQuiz, difficulty: 5 };
            render(<QuizCard {...defaultProps} quiz={quiz} />);
            expect(screen.getByText('とてもむずかしい')).toBeInTheDocument();
        });

        it('難易度が指定されていない場合はラベルを表示しない', () => {
            const quiz = { ...mockTextQuiz, difficulty: undefined };
            render(<QuizCard {...defaultProps} quiz={quiz} />);
            expect(screen.queryByText(/やさしい|ふつう|むずかしい/)).not.toBeInTheDocument();
        });

        it('カテゴリ名が表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} categoryName="江戸時代" />);
            expect(screen.getByText('江戸時代')).toBeInTheDocument();
        });
    });

    describe('記述式問題', () => {
        it('記述式問題の場合、入力フィールドが表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} />);
            expect(screen.getByPlaceholderText('答えを入力してください')).toBeInTheDocument();
            expect(screen.getByText('あなたの答え：')).toBeInTheDocument();
        });

        it('入力フィールドに値を入力できる', () => {
            const setUserAnswer = vi.fn();
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} setUserAnswer={setUserAnswer} />);

            const input = screen.getByPlaceholderText('答えを入力してください');
            fireEvent.change(input, { target: { value: '徳川家康' } });

            expect(setUserAnswer).toHaveBeenCalledWith('徳川家康');
        });

        it('解答表示時は入力フィールドが無効になる', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} />);
            const input = screen.getByPlaceholderText('答えを入力してください');
            expect(input).toBeDisabled();
        });
    });

    describe('選択式問題', () => {
        it('選択式問題の場合、選択肢が表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockMultipleChoiceQuiz} />);

            expect(screen.getByText('ア. 大名の財力を削ぐため')).toBeInTheDocument();
            expect(screen.getByText('イ. 大名同士の交流を深めるため')).toBeInTheDocument();
            expect(screen.getByText('ウ. 江戸の街を活性化するため')).toBeInTheDocument();
            expect(screen.getByText('エ. 将軍の権威を示すため')).toBeInTheDocument();
        });

        it('選択肢をクリックすると選択される', () => {
            const setUserAnswer = vi.fn();
            render(<QuizCard {...defaultProps} quiz={mockMultipleChoiceQuiz} setUserAnswer={setUserAnswer} />);

            const choice = screen.getByText('ア. 大名の財力を削ぐため');
            fireEvent.click(choice);

            expect(setUserAnswer).toHaveBeenCalledWith('ア. 大名の財力を削ぐため');
        });

        it('解答表示後は選択肢をクリックできない', () => {
            const setUserAnswer = vi.fn();
            render(<QuizCard {...defaultProps} quiz={mockMultipleChoiceQuiz} showAnswer={true} setUserAnswer={setUserAnswer} />);

            const choice = screen.getByText('ア. 大名の財力を削ぐため');
            fireEvent.click(choice);

            expect(setUserAnswer).not.toHaveBeenCalled();
        });

        it('選択した選択肢がハイライトされる', () => {
            render(<QuizCard {...defaultProps} quiz={mockMultipleChoiceQuiz} userAnswer="ア. 大名の財力を削ぐため" />);

            const choiceButton = screen.getByText('ア. 大名の財力を削ぐため').closest('button');
            expect(choiceButton).toHaveClass('border-indigo-500');
            expect(choiceButton).toHaveClass('bg-indigo-50');
        });

        it('選択肢を選ぶと「回答する」ボタンが有効になる', () => {
            const Wrapper = () => {
                const [answer, setAnswer] = useState('');
                return (
                    <QuizCard
                        {...defaultProps}
                        quiz={mockMultipleChoiceQuiz}
                        userAnswer={answer}
                        setUserAnswer={setAnswer}
                    />
                );
            };

            render(<Wrapper />);

            const button = screen.getByRole('button', { name: /回答する/i });
            expect(button).toBeDisabled();

            fireEvent.click(screen.getByText('ア. 大名の財力を削ぐため'));

            expect(button).not.toBeDisabled();
        });

        it('先頭文字が同じ選択肢でも単一選択になる', () => {
            const quiz = {
                ...mockMultipleChoiceQuiz,
                choices: [
                    'どちらも同じだけ傾く。',
                    'どちらもまったく傾かない。',
                    '2回巻きつけたほうが大きく傾く。',
                    '1回巻きつけたほうが大きく傾く。',
                ],
            };

            const Wrapper = () => {
                const [answer, setAnswer] = useState('');
                return (
                    <QuizCard
                        {...defaultProps}
                        quiz={quiz}
                        userAnswer={answer}
                        setUserAnswer={setAnswer}
                    />
                );
            };

            render(<Wrapper />);

            const first = screen.getByText('どちらも同じだけ傾く。').closest('button')!;
            const second = screen.getByText('どちらもまったく傾かない。').closest('button')!;

            fireEvent.click(first);
            expect(first).toHaveClass('border-indigo-500');
            expect(second).not.toHaveClass('border-indigo-500');

            fireEvent.click(second);
            expect(second).toHaveClass('border-indigo-500');
            expect(first).not.toHaveClass('border-indigo-500');
        });
    });

    describe('解答表示', () => {
        it('解答前は解答セクションが表示されない', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} userAnswer="徳川家康" />);
            expect(screen.queryByText('正解！')).not.toBeInTheDocument();
            expect(screen.queryByText('不正解')).not.toBeInTheDocument();
        });

        it('正解時に「正解！」と正解マークが表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} />);
            expect(screen.getByText('正解！')).toBeInTheDocument();
            expect(screen.getByText('正解！').previousSibling).toBeTruthy(); // CheckCircle2 icon
        });

        it('不正解時に「不正解」と不正解マークが表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={false} />);
            expect(screen.getByText('不正解')).toBeInTheDocument();
            expect(screen.getByText('不正解').previousSibling).toBeTruthy(); // XCircle icon
        });

        it('解答表示時に正解が表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={false} />);
            // 実際の正解が表示されることを確認
            expect(screen.getByText('徳川家康')).toBeInTheDocument();
        });

        it('解答表示時に解説が表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} />);
            expect(screen.getByText('1603年に征夷大将軍に任命されました。')).toBeInTheDocument();
        });

        it('正解時は緑色のスタイルが適用される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} />);
            const answerSection = screen.getByText('徳川家康').closest('div');
            expect(answerSection).toHaveClass('from-green-50');
            expect(answerSection).toHaveClass('border-green-200');
        });

        it('不正解時は赤色のスタイルが適用される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={false} />);
            const answerSection = screen.getByText('徳川家康').closest('div');
            expect(answerSection).toHaveClass('from-red-50');
            expect(answerSection).toHaveClass('border-red-200');
        });
    });

    describe('ボタン状態', () => {
        it('未回答時は「答えを見る」ボタンが無効', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} userAnswer="" />);
            const button = screen.getByRole('button', { name: /回答する/i });
            expect(button).toBeDisabled();
        });

        it('回答後は「回答する」ボタンが有効', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} userAnswer="徳川家康" />);
            const button = screen.getByRole('button', { name: /回答する/i });
            expect(button).not.toBeDisabled();
        });

        it('空白のみの回答では「回答する」ボタンが無効', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} userAnswer="   " />);
            const button = screen.getByRole('button', { name: /回答する/i });
            expect(button).toBeDisabled();
        });

        it('「回答する」ボタンをクリックするとonShowAnswerが呼ばれる', () => {
            const onShowAnswer = vi.fn();
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} userAnswer="徳川家康" onShowAnswer={onShowAnswer} />);


            const button = screen.getByText('回答する').closest('button')!;
            fireEvent.click(button);

            expect(onShowAnswer).toHaveBeenCalledTimes(1);
        });
        it('解答表示後は「次の問題へ」ボタンが表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} />);
            expect(screen.getByText('次の問題へ')).toBeInTheDocument();
        });
        it('最後の問題の場合は「完了」ボタンが表示される', () => {
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} isLastQuiz={true} />);
            expect(screen.getByText('完了')).toBeInTheDocument();
        });
        it('「次の問題へ」ボタンをクリックするとonNextが呼ばれる', () => {
            const onNext = vi.fn();
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} onNext={onNext} />);

            const button = screen.getByText('次の問題へ').closest('button')!;
            fireEvent.click(button);

            expect(onNext).toHaveBeenCalledTimes(1);
        });

        it('「完了」ボタンをクリックするとonNextが呼ばれる', () => {
            const onNext = vi.fn();
            render(<QuizCard {...defaultProps} quiz={mockTextQuiz} showAnswer={true} isCorrect={true} isLastQuiz={true} onNext={onNext} />);

            const button = screen.getByText('完了').closest('button')!;
            fireEvent.click(button);

            expect(onNext).toHaveBeenCalledTimes(1);
        });
    });
});
