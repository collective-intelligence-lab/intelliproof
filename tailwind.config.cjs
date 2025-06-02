/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        black: "#000000",
        yellow: "#FDD000",
        teal: "#4FD9BD",
        indigo: "#7283D9",
        lightgray: "#FAFAFA",
        grayborder: "#DDDDDD",
      },
      fontFamily: {
        sans: ["Josefin Sans", "Century Gothic", "sans-serif"],
        serif: ["PT Serif", "serif"],
      },
      fontSize: {
        sm: "13px",
        base: "14px",
        lg: "16px",
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "16px",
        lg: "24px",
        xl: "32px",
      },
    },
  },
  plugins: [],
};
