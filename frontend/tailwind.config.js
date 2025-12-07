/** @type {import('tailwindcss').Config} */
const { colors } = require('./tailwind.theme');

module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors,
    },
  },
  plugins: [],
}
