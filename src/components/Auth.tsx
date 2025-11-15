import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { BookOpen, LogIn, UserPlus } from 'lucide-react';
import { getSupabaseClient } from '../utils/supabase/client';
import { apiClient } from '../utils/api-client';

interface AuthProps {
  onAuthSuccess: (accessToken: string, userName: string) => void;
}

export function Auth({ onAuthSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const supabase = getSupabaseClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        // Login
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;

        if (data.session) {
          localStorage.setItem('accessToken', data.session.access_token);
          const userName = data.user.user_metadata?.name || email;
          onAuthSuccess(data.session.access_token, userName);
        }
      } else {
        // Signup
        if (!name.trim()) {
          setError('名前を入力してください');
          setLoading(false);
          return;
        }

        await apiClient.signup(email, password, name);

        // Auto login after signup
        const { data, error: loginError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) throw loginError;

        if (data.session) {
          localStorage.setItem('accessToken', data.session.access_token);
          onAuthSuccess(data.session.access_token, name);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || '認証に失敗しました');
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
          {!isLogin && (
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
          )}

          <div>
            <label className="block text-gray-700 mb-2">メールアドレス</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 mb-2">パスワード</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={6}
            />
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