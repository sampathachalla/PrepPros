/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.tsx",
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  darkMode: 'class', // Enables class-based dark mode (toggle with a class)

  theme: {
    extend: {
      colors: {
        // ✅ Light Mode Palette (Zytrix)
        background: '#FAFAFA',
        card: '#F2F2F2',
        primary: '#D7263D',
        secondary: '#2E2E2E',
        accent: '#FF6F00',
        textPrimary: '#1A1A1A',
        textMuted: '#7A7A7A',
        success: '#32CD32',
        error: '#C62828',

        // ✅ Dark Mode Palette (flat-prefixed for class-based dark mode)
        'dark-background': '#121212',
        'dark-card': '#1E1E1E',
        'dark-primary': '#D7263D',
        'dark-secondary': '#E0E0E0',
        'dark-accent': '#FF6F00',
        'dark-textPrimary': '#EDEDED',
        'dark-textMuted': '#9E9E9E',
        'dark-success': '#00FF7F',
        'dark-error': '#EF5350',
      }
    }
  },
  plugins: [],
};