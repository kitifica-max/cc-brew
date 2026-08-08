/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sora: ['Sora', 'sans-serif'] },
      colors: {
        cream: '#fde8e4',
        orange: '#f04e23',
        teal: '#00b09b',
        yellow: '#f5c518',
        ink: '#1a1a1a',
      },
      borderRadius: { '2xl': '24px', '3xl': '36px' },
    },
  },
};
