import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lightTheme, darkTheme } from '../theme/colors';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'themePreference'; // "light" | "dark" | "system"

export function ThemeProvider({ children }) {
  const systemScheme = Appearance.getColorScheme() || 'light';
  const [preference, setPreference] = useState('system');
  const [systemColorScheme, setSystemColorScheme] = useState(systemScheme);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setPreference(saved);
    });
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemColorScheme(colorScheme || 'light');
    });
    return () => sub.remove();
  }, []);

  const activeMode = preference === 'system' ? systemColorScheme : preference;
  const theme = activeMode === 'dark' ? darkTheme : lightTheme;

  const setThemePreference = async (value) => {
    setPreference(value);
    await AsyncStorage.setItem(STORAGE_KEY, value);
  };

  const value = useMemo(
    () => ({ theme, preference, activeMode, setThemePreference }),
    [theme, preference, activeMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
