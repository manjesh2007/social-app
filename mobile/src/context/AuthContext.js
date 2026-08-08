import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api from '../api/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const savedToken = await AsyncStorage.getItem('authToken');
      if (savedToken) {
        setToken(savedToken);
        try {
          const res = await api.get('/auth/me');
          setUser(res.data.user);
        } catch (err) {
          await AsyncStorage.removeItem('authToken');
          setToken(null);
        }
      }
      setIsLoading(false);
    })();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    await AsyncStorage.setItem('authToken', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const signup = async ({ name, email, password, dateOfBirth }) => {
    const res = await api.post('/auth/signup', { name, email, password, dateOfBirth });
    await AsyncStorage.setItem('authToken', res.data.token);
    setToken(res.data.token);
    setUser(res.data.user);
  };

  const logout = async () => {
    await AsyncStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  const refreshUser = async () => {
    const res = await api.get('/auth/me');
    setUser(res.data.user);
  };

  const value = useMemo(
    () => ({ user, token, isLoading, login, signup, logout, refreshUser, setUser }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
