import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Axiosインスタンスを作成
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエストインターセプター - トークンを自動で追加
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    console.log('[Axios Interceptor] Token from localStorage:', token ? 'EXISTS' : 'NULL');
    console.log('[Axios Interceptor] Request URL:', config.url);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[Axios Interceptor] Authorization header set');
    } else {
      console.warn('[Axios Interceptor] No token found in localStorage!');
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// レスポンスインターセプター - エラーハンドリング
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // 認証エラーの場合、トークンを削除してログインページへ
      console.error('401 Unauthorized:', error.response?.data);
      console.error('Request URL:', error.config?.url);
      console.error('Token exists:', !!localStorage.getItem('token'));
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;