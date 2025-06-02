/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        "ip-black": "#000000",
        "ip-yellow": "#FDD000",
        "ip-teal": "#4FD9BD",
        "ip-indigo": "#7283D9",
      },
      fontFamily: {
        josefin: ["Josefin Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};
