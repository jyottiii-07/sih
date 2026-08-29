/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        abyss: {
          950: '#04070d',
          900: '#070b12',
          850: '#0a101b',
          800: '#0e1626',
          750: '#111c30',
          700: '#152238',
          600: '#1c2c47',
          500: '#253b5e',
        },
        ocean: {
          cyan: '#06b6d4',
          glow: '#22d3ee',
          teal: '#14b8a6',
          emerald: '#10b981',
          amber: '#f59e0b',
          crimson: '#ef4444',
          blue: '#3b82f6',
        },
        anomaly: {
          normal: '#10b981',
          weak: '#f59e0b',
          strong: '#ef4444',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
        'radar-sweep': 'radarSweep 4s linear infinite',
      },
      keyframes: {
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
