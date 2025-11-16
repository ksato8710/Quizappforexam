import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { BookOpen, LogIn, UserPlus, Eye, EyeOff } from 'lucide-react';
import { apiClient } from '../utils/api-client';

interface AuthProps {
  onAuthSuccess: (accessToken: string, userName: string) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (!name.trim()) {
        setError('名前を入力してください');
        setLoading(false);
        return;
      }

      if (isLogin) {
        // Login
        const response = await apiClient.login(name, password);

        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
          onAuthSuccess(response.accessToken, response.user.name);
        }
      } else {
        // Signup
        await apiClient.signup(name, password);

        // Auto login after signup
        const response = await apiClient.login(name, password);

        if (response.accessToken) {
          localStorage.setItem('accessToken', response.accessToken);
          onAuthSuccess(response.accessToken, name);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || err.error || '認証に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-white shadow-xl rounded-2xl p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-indigo-900 mb-2">中受クイズ</h1>
          <p className="text-gray-600">
            {isLogin ? 'ログインして学習を始めましょう' : 'アカウントを作成して始めましょう'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-700 mb-2">名前</label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="山田太郎"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">パスワード</label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="pr-10"
                aria-label="パスワード"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500 hover:text-gray-700 focus:outline-none"
                aria-label={showPassword ? 'パスワードを非表示' : 'パスワードを表示'}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              '処理中...'
            ) : isLogin ? (
              <>
                <LogIn className="w-4 h-4 mr-2" />
                ログイン
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                アカウント作成
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
            className="text-indigo-600 hover:text-indigo-700"
          >
            {isLogin ? 'アカウントを作成する' : 'ログインする'}
          </button>
        </div>
      </Card>
    </div>
  );
}
