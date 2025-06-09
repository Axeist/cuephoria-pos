
import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px'
      }
    },
    extend: {
      fontFamily: {
        sans: ['Rajdhani', 'sans-serif'],
        heading: ['Orbitron', 'monospace'],
        mono: ['Space Grotesk', 'monospace'],
        rajdhani: ['Rajdhani', 'sans-serif'],
        orbitron: ['Orbitron', 'monospace'],
        space: ['Space Grotesk', 'monospace'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: "hsl(var(--background))",
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))'
        },
        cyber: {
          purple: '#8a2be2',
          blue: '#00bfff',
          pink: '#ff1493',
          green: '#00ff7f',
          orange: '#ff6600',
          dark: '#0a0a0f',
          darker: '#050508',
          light: '#f0f0ff',
        },
        neon: {
          purple: 'hsl(var(--neon-purple))',
          blue: 'hsl(var(--neon-blue))',
          orange: 'hsl(var(--neon-orange))',
          green: 'hsl(var(--electric-green))',
        }
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' }
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' }
        },
        'hologram': {
          '0%, 100%': { 'background-position': '0% 50%' },
          '25%': { 'background-position': '100% 50%' },
          '50%': { 'background-position': '100% 100%' },
          '75%': { 'background-position': '0% 100%' }
        },
        'cyber-pulse': {
          '0%, 100%': {
            'box-shadow': '0 0 5px rgba(138, 43, 226, 0.5), 0 0 10px rgba(138, 43, 226, 0.3), 0 0 15px rgba(138, 43, 226, 0.1)'
          },
          '50%': {
            'box-shadow': '0 0 15px rgba(138, 43, 226, 0.8), 0 0 25px rgba(138, 43, 226, 0.5), 0 0 35px rgba(138, 43, 226, 0.3)'
          }
        },
        'matrix-rain': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '10%': { opacity: '1' },
          '90%': { opacity: '1' },
          '100%': { transform: 'translateY(100vh)', opacity: '0' }
        },
        'glitch': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-2px)' },
          '20%': { transform: 'translateX(2px)' },
          '30%': { transform: 'translateX(-1px)' },
          '40%': { transform: 'translateX(1px)' },
          '50%': { transform: 'translateX(-2px)' },
          '60%': { transform: 'translateX(2px)' },
          '70%': { transform: 'translateX(-1px)' },
          '80%': { transform: 'translateX(1px)' },
          '90%': { transform: 'translateX(-2px)' }
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' }
        },
        'slide-in-top': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'slide-in-bottom': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'fade-in-scale': {
          '0%': { transform: 'scale(0.8)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        'neon-glow': {
          '0%, 100%': {
            'text-shadow': '0 0 5px rgba(138, 43, 226, 0.8), 0 0 10px rgba(138, 43, 226, 0.6), 0 0 15px rgba(138, 43, 226, 0.4)'
          },
          '50%': {
            'text-shadow': '0 0 10px rgba(138, 43, 226, 1), 0 0 20px rgba(138, 43, 226, 0.8), 0 0 30px rgba(138, 43, 226, 0.6)'
          }
        },
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' }
        },
        'spin-slow': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' }
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        'scale-in': {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'hologram': 'hologram 3s ease-in-out infinite',
        'cyber-pulse': 'cyber-pulse 2s infinite',
        'matrix-rain': 'matrix-rain 3s linear infinite',
        'glitch': 'glitch 0.5s ease-in-out',
        'slide-in-left': 'slide-in-left 0.6s ease-out',
        'slide-in-right': 'slide-in-right 0.6s ease-out',
        'slide-in-top': 'slide-in-top 0.6s ease-out',
        'slide-in-bottom': 'slide-in-bottom 0.6s ease-out',
        'fade-in-scale': 'fade-in-scale 0.5s ease-out',
        'neon-glow': 'neon-glow 2s ease-in-out infinite',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.1, 0, 0.3, 1) infinite',
        'float': 'float 5s infinite ease-in-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'slide-up': 'slide-up 0.8s ease-out',
        'scale-in': 'scale-in 0.5s ease-out'
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(135deg, rgba(138, 43, 226, 0.1) 0%, rgba(75, 0, 130, 0.1) 100%)',
        'neon-gradient': 'linear-gradient(45deg, #8a2be2, #00bfff, #ff1493, #00ff7f)',
        'dark-gradient': 'linear-gradient(135deg, #0a0a0a 0%, #1a0a2e 50%, #16213e 100%)'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
