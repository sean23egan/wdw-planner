/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        disney: {
          blue: '#006eb7',
          gold: '#f5a623',
          purple: '#6b2fa0',
        },
      },
    },
  },
  plugins: [],
}
