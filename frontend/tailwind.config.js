/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      // Colores para los cortes M/R/B del sistema
      colors: {
        corte: {
          b: '#86efac', // green-300
          r: '#fde047', // yellow-300
          m: '#fca5a5', // red-300
        },
      },
    },
  },
  plugins: [],
};
