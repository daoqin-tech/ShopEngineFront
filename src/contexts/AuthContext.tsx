import { createContext, useContext, useEffect, useState } from 'react';
import { apiClient } from '@/lib/api';

interface User {
  id: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // 获取用户信息
  const fetchUser = async () => {
    try {
      const response = await apiClient.get('/user/info');
      if (response.data) {
        // response.data 直接就是用户信息
        setUser({
          id: response.data.userId,
          name: response.data.nickname,
          avatar: response.data.avatar
        });
      } else {
        // token无效，清除本地存储
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  // 登录
  const login = async (token: string) => {
    localStorage.setItem('token', token);
    await fetchUser();
  };

  // 登出
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  // 初始化时检查token
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser();
    } else {
      setIsLoading(false);
    }
  }, []);

  // 当用户状态改变时更新loading状态
  useEffect(() => {
    if (user !== null) {
      setIsLoading(false);
    }
  }, [user]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}