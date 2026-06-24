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
          paper:      '#F8F5EE',
          paperWarm:  '#FFFBEB',
          paperAged:  '#F0E8D8',
          ink:        '#2C241B',
          inkLight:   '#3A2A1A',
          inkMuted:   '#8C7660',
          inkFaded:   '#B8A898',
          earth:      '#C8A972',
          earthLight: '#D4BA8A',
          earthFaded: '#E8D9B5',
          border:     'rgba(44,36,27,0.08)',
          borderMed:  'rgba(44,36,27,0.12)',
          borderStr:  'rgba(44,36,27,0.20)',
          success:    '#6B8E5A',
          error:      '#8B5E3C',
          /* 旧映射兼容 */
          white:      '#FFFBEB',
          grey:       'rgba(44,36,27,0.12)',
          text:       '#2C241B',
          accent:     '#C8A972',
          dark:       '#2C241B',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"STSong"', '"SimSun"', 'serif'],
        display: ['"Cormorant Garamond"', '"Georgia"', 'serif'],
        sans: ['"Inter"', '"Helvetica Neue"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      borderRadius: {
        brand: '2px',   /* V2.1：器物边缘感 */
      },
      letterSpacing: {
        yunhero:   '0.04em',   /* V2.1：8px */
        yuntitle:  '0.04em',
        yuncaption: '0.06em',
      },
    },
  },
  plugins: [],
};
