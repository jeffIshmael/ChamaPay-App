/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        downy: {
          50: '#f1fcfa',
          100: '#d1f6f1',
          200: '#a3ece4',
          300: '#66d9d0',
          400: '#3fc2bb',
          500: '#26a6a2',
          600: '#1c8584',
          700: '#1a6b6b',
          800: '#195556',
          900: '#194848',
          950: '#09272a',
        },
      },
    },
  },
  plugins: [],
};
