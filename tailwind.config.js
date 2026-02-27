/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: '#E85D0A',
        'background-light': '#FAF8F6',
        'background-dark': '#1A1208',
        'neutral-dark': '#1A1208',
        'neutral-muted': '#5C4A3A',
        'muted-text': '#A07850',
        border: '#E8DED0',
        'border-dark': '#3D2E1F',
        'card-dark': '#2A1E12',
        'progress-bg': '#F5EDE3',
        gold: '#FFD700',
        silver: '#C0C0C0',
        bronze: '#CD7F32',
        success: '#078818',
      },
      borderRadius: {
        DEFAULT: '0.5rem',
        lg: '1rem',
        xl: '1.5rem',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
