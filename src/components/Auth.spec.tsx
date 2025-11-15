import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Auth from './Auth';

describe('Auth Component', () => {
  it('初期表示時に「名前」と「パスワード」の入力欄、および「ログイン」ボタンが表示される', () => {
    const handleAuthSuccess = vi.fn();
    render(<Auth onAuthSuccess={handleAuthSuccess} />);

    expect(screen.getByLabelText('名前')).toBeInTheDocument();
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ログイン' })).toBeInTheDocument();
  });
});
