import { projectId, publicAnonKey } from './supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-856c5cf0`;

export interface Quiz {
  id: string;
  question: string;
  answer: string;
  explanation: string;
  type: 'text' | 'multiple-choice';
  choices?: string[];
  difficulty?: number;
  categoryId?: string;
  order?: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface UserStats {
  totalQuizzes: number;
  totalCorrect: number;
  totalAnswers: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

async function fetchAPI(endpoint: string, options: RequestInit = {}, useAuth = false) {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (useAuth) {
    const token = localStorage.getItem('accessToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } else {
    headers['Authorization'] = `Bearer ${publicAnonKey}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

export const apiClient = {
  // Auth
  login: async (name: string, password: string) => {
    return fetchAPI('/login', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    });
  },

  signup: async (name: string, password: string) => {
    return fetchAPI('/signup', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    });
  },

  // Quizzes
  getQuizzes: async (): Promise<{ quizzes: Quiz[] }> => {
    return fetchAPI('/quizzes');
  },

  // Categories
  getCategories: async (): Promise<{ categories: Category[] }> => {
    return fetchAPI('/categories');
  },

  // Answers
  saveAnswer: async (quizId: string, userAnswer: string, isCorrect: boolean) => {
    return fetchAPI('/answers', {
      method: 'POST',
      body: JSON.stringify({ quizId, userAnswer, isCorrect }),
    }, true);
  },

  completeQuiz: async (correctCount: number, totalQuestions: number) => {
    return fetchAPI('/complete-quiz', {
      method: 'POST',
      body: JSON.stringify({ correctCount, totalQuestions }),
    }, true);
  },

  // Stats
  getStats: async (): Promise<{ stats: UserStats; user: UserProfile }> => {
    return fetchAPI('/stats', {}, true);
  },

  getHistory: async () => {
    return fetchAPI('/history', {}, true);
  },
};