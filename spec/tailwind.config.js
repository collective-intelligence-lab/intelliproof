// tailwind.config.js for IntelliProof

const colors = require('tailwindcss/colors')

module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './public/index.html'
  ],
  theme: {
    extend: {
      colors: {
        black: '#000000',
        yellow: '#FDD000',
        teal: '#4FD9BD',
        indigo: '#7283D9',
        lightgray: '#FAFAFA',
        grayborder: '#DDDDDD'
      },
      fontFamily: {
        sans: ['Josefin Sans', 'Century Gothic', 'sans-serif'],
        serif: ['PT Serif', 'serif']
      },
      fontSize: {
        sm: '13px',
        base: '14px',
        lg: '16px'
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px'
      },
      borderRadius: {
        sm: '4px',
        md: '6px',
        lg: '8px'
      },
      transitionDuration: {
        DEFAULT: '200ms'
      }
    }
  },
  plugins: []
};

