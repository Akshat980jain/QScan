/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'terra-cotta': {
          50: '#fdf4f1',
          100: '#fbe6de',
          200: '#f6ccbd',
          300: '#efa890',
          400: '#e67a5c',
          500: '#df5a3a',
          600: '#c4623d',
          700: '#a34a2f',
          800: '#853e2b',
          900: '#6e3628',
        },
        'warm-beige': {
          50: '#faf7f0',
          100: '#f5e6d3',
          200: '#ebcca6',
          300: '#dfa974',
          400: '#d48a4a',
          500: '#c8732c',
          600: '#b05d22',
          700: '#92471e',
          800: '#773a1e',
          900: '#62301c',
        },
        'sage-green': {
          50: '#f6f7f6',
          100: '#e3e7e3',
          200: '#c7d0c7',
          300: '#a3b2a3',
          400: '#8fa68e',
          500: '#6d8a6c',
          600: '#556d54',
          700: '#455745',
          800: '#394639',
          900: '#303b30',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'warm': '0 4px 6px -1px rgba(196, 98, 61, 0.1), 0 2px 4px -1px rgba(196, 98, 61, 0.06)',
        'warm-lg': '0 10px 15px -3px rgba(196, 98, 61, 0.1), 0 4px 6px -2px rgba(196, 98, 61, 0.05)',
      }
    },
  },
  plugins: [],
};
