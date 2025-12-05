/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './pages/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        resortify: {
          50: '#f7fbff',
          100: '#eef6ff',
          200: '#d2e6ff',
          500: '#0b6bff',
          700: '#054fbe'
        }
      }
    }
  },
  plugins: []
}
