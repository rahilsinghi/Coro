/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // CrowdSynth brand colors — dark neon theme
        cs: {
          bg: '#001a33',
          surface: '#002b4d',
          border: '#004080',
          accent: '#00c3ff',     // vibrant blue
          accent2: '#06b6d4',    // cyan
          accent3: '#f59e0b',    // amber
          text: '#e2e8f0',
          muted: '#64748b',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px #00c3ff, 0 0 10px #00c3ff' },
          '100%': { boxShadow: '0 0 20px #00c3ff, 0 0 40px #00c3ff' },
        }
      }
    },
  },
  plugins: [],
}
