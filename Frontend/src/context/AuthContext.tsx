'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAccessToken, getAccessToken } from '@/lib/token';

interface AuthContextType {
  user: any;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: (isForced?: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const logout = async (isForced = false) => {
    try {
      if (!isForced) {
        await api.get('/auth/logout');
      }
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      setUser(null);
      setAccessToken(null);
      // Use replace instead of push to prevent back navigation
      router.replace('/login');
    }
  };

  useEffect(() => {
    const handleAuthFailure = () => {
      console.log('Auth failure event caught, logging out.');
      logout(true); // Pass a flag to indicate it's a forced logout
    };

    window.addEventListener('auth-failure', handleAuthFailure);

    return () => {
      window.removeEventListener('auth-failure', handleAuthFailure);
    };
  }, []); // Empty dependency array ensures this runs only once

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