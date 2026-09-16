/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Logo-inspired Caramel Amber & Sand Tan Palette
        brand: {
          50: '#fdf9f4',
          100: '#f8eee2',
          200: '#f0d9c1',
          300: '#e5be96',
          400: '#dca46d',
          500: '#d4924d', // Signature Logo Color
          600: '#c27938',
          700: '#a15d2a',
          800: '#824926',
          900: '#693c22',
          950: '#3a1e10',
        },
        // Logo-inspired Charcoal & Matte Carbon Dark Palette
        carbon: {
          50: '#f6f7f9',
          100: '#eceef2',
          200: '#d5dae2',
          300: '#b0b8c6',
          400: '#8593a6',
          500: '#647287',
          600: '#4e5a6d',
          700: '#3f4857',
          800: '#262a32',
          900: '#181a1d', // Signature Logo Carbon
          950: '#0f1113',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'brand': '0 10px 25px -5px rgba(212, 146, 77, 0.25), 0 8px 10px -6px rgba(212, 146, 77, 0.2)',
        'carbon': '0 10px 30px -5px rgba(24, 26, 29, 0.3)',
      }
    },
  },
  plugins: [],
}
