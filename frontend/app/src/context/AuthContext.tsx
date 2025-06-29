'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { setAccessToken, getAccessToken } from '@/lib/token';
import { getDefaultRoute, User } from '@/utils/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: any) => Promise<void>;
  logout: (isForced?: boolean) => void;
  updateUser: (userData: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
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
      try {
        // Check if we have a token in localStorage
        const existingToken = getAccessToken();
        
        if (existingToken) {
          // Try to get user profile with existing token
          try {
            const profileRes = await api.get('/auth/profile');
            setUser(profileRes.data);
            setLoading(false);
            return;
          } catch (profileError) {
            // If profile fetch fails, try to refresh token
            console.log('Profile fetch failed, attempting token refresh');
          }
        }
        
        // Try to refresh token
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.access_token);
        const profileRes = await api.get('/auth/profile');
        setUser(profileRes.data);
      } catch (error) {
        console.log('Authentication failed:', error);
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
    const profileRes = await api.get('/auth/profile');
    const userData = profileRes.data;
    setUser(userData);
    
    // Role-based routing using utility function
    const defaultRoute = getDefaultRoute(userData);
    router.push(defaultRoute);
  };

  const updateUser = (userData: User) => {
    setUser(userData);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
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