/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d"
        }
      }
    }
  },
  plugins: []
};

