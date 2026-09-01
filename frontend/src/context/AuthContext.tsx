import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, removeAuthToken, setStoredUser, getStoredUser } from '@/src/api/client';
import { router } from 'expo-router';

interface User {
  id: string;
  name: string;
  email: string;
  dob: string;
  age: number;
  gender?: string;
  city?: string;
  bio?: string;
  avatar?: string;
  interests?: string[];
  latitude?: number;
  longitude?: number;
  is_online?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateUser: (updatedData: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    checkExistingAuth();
  }, []);

  async function checkExistingAuth() {
    try {
      const storedToken = await getAuthToken();
      const storedUser = await getStoredUser();

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(storedUser);
        // Refresh silently from backend
        api.getMe().then((freshUser) => {
          setUser(freshUser);
          setStoredUser(freshUser);
        }).catch(() => {});
      } else if (storedToken) {
        setToken(storedToken);
        const me = await api.getMe();
        setUser(me);
        await setStoredUser(me);
      }
    } catch (e) {
      console.log('Auth check error:', e);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    setIsLoading(true);
    try {
      const res = await api.login({ email, password });
      await setAuthToken(res.access_token);
      await setStoredUser(res.user);
      setToken(res.access_token);
      setUser(res.user);
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  }

  async function register(payload: any) {
    setIsLoading(true);
    try {
      const res = await api.register(payload);
      await setAuthToken(res.access_token);
      await setStoredUser(res.user);
      setToken(res.access_token);
      setUser(res.user);
      router.replace('/(tabs)');
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    await removeAuthToken();
    setUser(null);
    setToken(null);
    router.replace('/auth/login');
  }

  async function refreshProfile() {
    try {
      const fresh = await api.getMe();
      setUser(fresh);
      await setStoredUser(fresh);
    } catch (e) {
      console.log('Refresh profile failed:', e);
    }
  }

  function updateUser(updatedData: Partial<User>) {
    if (user) {
      const merged = { ...user, ...updatedData };
      setUser(merged);
      setStoredUser(merged);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
