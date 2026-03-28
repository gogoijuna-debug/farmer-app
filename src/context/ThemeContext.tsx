import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/Colors';

export type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  theme: (typeof Colors)[ResolvedTheme];
  setPreference: (value: ThemePreference) => Promise<void>;
  loading: boolean;
}

const THEME_STORAGE_KEY = 'theme-preference';

const ThemeContext = createContext<ThemeContextValue>({
  preference: 'light',
  resolvedTheme: 'light',
  theme: Colors.light,
  setPreference: async () => {},
  loading: true,
});

export const ThemePreferenceProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('light');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (storedPreference === 'system' || storedPreference === 'light' || storedPreference === 'dark') {
          setPreferenceState(storedPreference);
        }
      } finally {
        setLoading(false);
      }
    };

    loadPreference();
  }, []);

  const setPreference = async (value: ThemePreference) => {
    setPreferenceState(value);
    await AsyncStorage.setItem(THEME_STORAGE_KEY, value);
  };

  const resolvedTheme: ResolvedTheme = preference === 'system'
    ? (systemColorScheme === 'dark' ? 'dark' : 'light')
    : preference;

  const value = useMemo(() => ({
    preference,
    resolvedTheme,
    theme: Colors[resolvedTheme],
    setPreference,
    loading,
  }), [preference, resolvedTheme, loading]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useAppTheme = () => useContext(ThemeContext);