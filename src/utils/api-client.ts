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
  subject?: string;  // 教科（例: 社会、理科）
  unit?: string;     // 単元（例: 強かな支配の中で生きた人々）
  order?: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

export interface Unit {
  id: string;
  subject: string;
  name: string;
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
  getQuizzes: async (params?: {
    subject?: string;
    unit?: string;
    difficulty?: number | null;
    count?: number;
    historyFilter?: 'unanswered' | 'uncorrected';
  }): Promise<{ quizzes: Quiz[] }> => {
    let url = '/quizzes';
    if (params) {
      const queryParams = new URLSearchParams();
      if (params.subject) {
        queryParams.append('subject', params.subject);
      }
      if (params.unit) {
        queryParams.append('unit', params.unit);
      }
      if (params.difficulty !== undefined && params.difficulty !== null) {
        queryParams.append('difficulty', params.difficulty.toString());
      } else if (params.difficulty === null) {
        queryParams.append('difficulty', 'mix');
      }
      if (params.count) {
        queryParams.append('count', params.count.toString());
      }
      if (params.historyFilter) {
        queryParams.append('historyFilter', params.historyFilter);
      }
      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }
    const requiresAuth = Boolean(params?.historyFilter);
    return fetchAPI(url, {}, requiresAuth);
  },

  // Categories
  getCategories: async (): Promise<{ categories: Category[] }> => {
    return fetchAPI('/categories');
  },

  // Units
  getUnits: async (params?: { subject?: string }): Promise<{ units: Unit[] }> => {
    let url = '/units';
    if (params?.subject) {
      const queryParams = new URLSearchParams();
      queryParams.append('subject', params.subject);
      url += `?${queryParams.toString()}`;
    }
    return fetchAPI(url);
  },

  // Quiz counts
  getQuizCounts: async (params: { subject: string; unit?: string }): Promise<{ total: number; unanswered: number; uncorrected: number }> => {
    const queryParams = new URLSearchParams();
    queryParams.append('subject', params.subject);
    if (params.unit) {
      queryParams.append('unit', params.unit);
    }
    return fetchAPI(`/quiz-counts?${queryParams.toString()}`, {}, true);
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

  deleteAnswer: async (answerId: string): Promise<{ success: boolean }> => {
    return fetchAPI(`/history/${answerId}`, { method: 'DELETE' }, true);
  },

  // Feedback
  submitFeedback: async (params: {
    type: 'bug' | 'feature' | 'improvement' | 'other';
    subject?: string;
    message: string;
    pageContext?: string;
    quizId?: string;
  }): Promise<{ success: boolean; message: string }> => {
    return fetchAPI('/feedback', {
      method: 'POST',
      body: JSON.stringify(params),
    }, true);
  },

  getFeedback: async (): Promise<{ feedback: any[] }> => {
    return fetchAPI('/feedback', {}, true);
  },
};
