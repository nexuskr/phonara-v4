/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'neon-blue': '#00D4FF',
        'neon-green': '#00FF88',
        'neon-gold': '#FFD700',
        'neon-orange': '#FF6B35',
        'bg-void': '#040810',
        'bg-deep': '#060D1A',
        'bg-card': '#0A1628',
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'Inter', 'Space Grotesk', 'sans-serif'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'float': 'floatUp 3s ease-in-out infinite',
        'slide-in-up': 'slideInUp 0.4s ease-out',
        'fade-in-scale': 'fadeInScale 0.3s ease-out',
      },
    },
  },
  plugins: [],
};
