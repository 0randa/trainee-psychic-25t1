'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'theme';

export const ThemeContext = createContext(null);

// Apply a theme to <html> for BOTH color systems:
// - data-theme drives daisyUI
// - the `dark` class drives the shadcn CSS variables in globals.css
function applyTheme(theme) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }) {
  // Start from whatever the no-flash inline script already resolved onto
  // <html>, so the provider never disagrees with what's painted.
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    const initial =
      document.documentElement.dataset.theme ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light');
    setThemeState(initial);

    // Follow OS changes ONLY while the user has made no explicit choice.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        const next = event.matches ? 'dark' : 'light';
        applyTheme(next);
        setThemeState(next);
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
    setThemeState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
