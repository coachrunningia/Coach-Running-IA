/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0f172a', // Slate 900
        accent: '#f97316', // Orange 500
        secondary: '#3b82f6', // Blue 500
        surface: '#f8fafc', // Slate 50
      },
    },
  },
  plugins: [],
}
