/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './app/**/*.{js,jsx,ts,tsx}',
    './routes/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  darkMode: 'class',

  theme: {
    extend: {
      colors: {
        // Brand (see constants/Colors.ts)
        babyPink: '#F5AFC4',
        babyBlue: '#A8DDF5',
        brandWhite: '#FFFFFF',
        brandBlack: '#0A0A0A',

        background: '#FFFFFF',
        card: '#FFFFFF',
        primary: '#F5AFC4',
        secondary: '#A8DDF5',
        accent: '#A8DDF5',
        textPrimary: '#0A0A0A',
        textMuted: '#5C5C5C',
        border: '#E3E3E3',
        success: '#2E7D32',
        error: '#C62828',

        'dark-background': '#0A0A0A',
        'dark-card': '#141414',
        'dark-primary': '#F5AFC4',
        'dark-secondary': '#A8DDF5',
        'dark-accent': '#A8DDF5',
        'dark-textPrimary': '#FFFFFF',
        'dark-textMuted': '#B0B0B0',
        'dark-border': '#2A2A2A',
        'dark-success': '#66BB6A',
        'dark-error': '#EF5350',
      },
    },
  },
  plugins: [],
};
