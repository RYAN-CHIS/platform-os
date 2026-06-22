/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        yun: {
          white: '#F5F1EA',
          grey: '#D9CCB8',
          text: '#2B2B2B',
          accent: '#8A6A44',
          dark: '#1A1A1A',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"STSong"', '"SimSun"', 'serif'],
        display: ['"Cormorant Garamond"', '"Georgia"', 'serif'],
      },
      borderRadius: {
        brand: '16px',
      },
    },
  },
  plugins: [],
};
