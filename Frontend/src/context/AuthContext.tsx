'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAccessToken, getAccessToken } from '@/lib/token';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      // Try to refresh token on initial load
      try {
        const { data } = await api.get('/auth/refresh');
        setAccessToken(data.access_token);
        const profileRes = await api.get('/user/profile');
        setUser(profileRes.data);
      } catch (error) {
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (credentials: any) => {
    const res = await api.post('/auth/login', credentials);
    setAccessToken(res.data.access_token);
    const profileRes = await api.get('/user/profile');
    setUser(profileRes.data);
    router.push('/');
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    // Notify backend in background
    api.get('/auth/logout').catch(err => console.error('Server logout failed', err));
    router.replace('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 