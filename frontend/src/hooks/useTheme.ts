import { useState, useEffect } from 'react';

export type ThemeMode = 'light' | 'dark' | 'auto';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('console-theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'auto';
  });

  const [systemDark, setSystemDark] = useState<boolean>(() => {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemDark(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const effectiveTheme: 'light' | 'dark' = theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;

  useEffect(() => {
    document.documentElement.dataset.theme = effectiveTheme;
    if (theme === 'auto') {
      localStorage.removeItem('console-theme');
    } else {
      localStorage.setItem('console-theme', theme);
    }
  }, [theme, effectiveTheme]);

  const toggleTheme = () => {
    setThemeState(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'auto';
      return 'light';
    });
  };

  return {
    theme,
    effectiveTheme,
    setTheme: setThemeState,
    toggleTheme,
  };
}
