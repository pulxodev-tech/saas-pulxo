/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        // WhatsApp palette (for survey flow UI)
        'wa-bg':      '#ECE5DD',
        'wa-green':   '#25D366',
        'wa-dark':    '#128C7E',
        'wa-light':   '#DCF8C6',
        'wa-header':  '#075E54',
        // Pulxo brand
        brand: {
          50:  '#EEF2FF',
          100: '#E0E7FF',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          900: '#1E1B4B',
        },
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        wa:   ['"SF Pro Text"', '"Segoe UI"', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
