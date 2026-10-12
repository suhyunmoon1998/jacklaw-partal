import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#111111',
          dark: '#000000',
          light: '#2A2A2A',
        },
        gold: {
          DEFAULT: '#E07820',
          light: '#F09840',
          dark: '#C06010',
        },
        // The quiet half of the brand: a warm off-white the pages sit on and
        // the hairline their cards are drawn with, so orange is left for the
        // one thing on a screen the client should press.
        canvas: '#F6F5F2',
        line: '#E7E4DE',
      },
      boxShadow: {
        card: '0 1px 2px rgba(17, 17, 17, 0.04), 0 1px 3px rgba(17, 17, 17, 0.03)',
        lift: '0 8px 24px -12px rgba(17, 17, 17, 0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
