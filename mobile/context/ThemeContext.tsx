// context/ThemeContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Appearance } from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextProps {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextProps>({
  theme: 'light',
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // The root layout applies the matching `dark` class for NativeWind. Keeping the
  // theme in one place avoids calling setColorScheme against a stale media-mode stylesheet.
  const [theme, setTheme] = useState<Theme>(() => Appearance.getColorScheme() ?? 'light');

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
