
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
        sans: ['Inter', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
        quicksand: ['Quicksand', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
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
        cuephoria: {
          purple: '#6E59A5',
          lightpurple: '#9b87f5',
          orange: '#F97316',
          blue: '#0EA5E9',
          green: '#10B981',
          dark: '#0B0D1A',
          darker: '#070911',
          light: '#F1F0FB',
          neon: {
            cyan: '#00FFFF',
            purple: '#9b87f5',
            pink: '#FF00FF',
            green: '#00FF00',
            blue: '#0080FF',
            orange: '#FF8000'
          }
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
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' }
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
        },
        'glow': {
          '0%, 100%': { 
            boxShadow: '0 0 5px rgba(155, 135, 245, 0.5), 0 0 10px rgba(155, 135, 245, 0.3)' 
          },
          '50%': { 
            boxShadow: '0 0 20px rgba(155, 135, 245, 0.8), 0 0 40px rgba(155, 135, 245, 0.5)' 
          }
        },
        'shimmer': {
          '0%': { backgroundPosition: '-500px 0' },
          '100%': { backgroundPosition: '500px 0' }
        },
        'breathe': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.03)' }
        },
        'ping-slow': {
          '75%, 100%': {
            transform: 'scale(2)',
            opacity: '0'
          }
        },
        'scanner': {
          '0%': { 
            transform: 'translateY(-100%)', 
            opacity: '0.8' 
          },
          '100%': { 
            transform: 'translateY(100%)', 
            opacity: '0.2' 
          }
        },
        'text-gradient': {
          '0%, 100%': {
            'background-size': '200% 200%',
            'background-position': 'left center'
          },
          '50%': {
            'background-size': '200% 200%',
            'background-position': 'right center'
          }
        },
        'flip-in': {
          '0%': { 
            transform: 'perspective(400px) rotateX(90deg)',
            opacity: '0' 
          },
          '40%': { 
            transform: 'perspective(400px) rotateX(-10deg)' 
          },
          '70%': { 
            transform: 'perspective(400px) rotateX(10deg)' 
          },
          '100%': { 
            transform: 'perspective(400px) rotateX(0deg)',
            opacity: '1' 
          }
        },
        'float-shadow': {
          '0%, 100%': { 
            transform: 'translateY(0)',
            boxShadow: '0 5px 15px rgba(0,0,0,0.3)' 
          },
          '50%': { 
            transform: 'translateY(-10px)',
            boxShadow: '0 25px 15px rgba(0,0,0,0.1)' 
          }
        },
        'neon-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(155, 135, 245, 0.7), 0 0 10px rgba(155, 135, 245, 0.5), 0 0 15px rgba(155, 135, 245, 0.3)'
          },
          '50%': {
            boxShadow: '0 0 10px rgba(155, 135, 245, 0.9), 0 0 20px rgba(155, 135, 245, 0.7), 0 0 30px rgba(155, 135, 245, 0.5)'
          }
        },
        'pulse-ring': {
          '0%': {
            transform: 'scale(0.8)',
            opacity: '1'
          },
          '100%': {
            transform: 'scale(2)',
            opacity: '0'
          }
        },
        'cyber-glow': {
          '0%, 100%': {
            textShadow: '0 0 5px rgba(0, 255, 255, 0.8), 0 0 10px rgba(0, 255, 255, 0.6), 0 0 15px rgba(0, 255, 255, 0.4)',
            filter: 'hue-rotate(0deg)'
          },
          '25%': {
            textShadow: '0 0 5px rgba(155, 135, 245, 0.8), 0 0 10px rgba(155, 135, 245, 0.6), 0 0 15px rgba(155, 135, 245, 0.4)',
            filter: 'hue-rotate(90deg)'
          },
          '50%': {
            textShadow: '0 0 5px rgba(255, 0, 255, 0.8), 0 0 10px rgba(255, 0, 255, 0.6), 0 0 15px rgba(255, 0, 255, 0.4)',
            filter: 'hue-rotate(180deg)'
          },
          '75%': {
            textShadow: '0 0 5px rgba(0, 255, 0, 0.8), 0 0 10px rgba(0, 255, 0, 0.6), 0 0 15px rgba(0, 255, 0, 0.4)',
            filter: 'hue-rotate(270deg)'
          }
        },
        'hologram': {
          '0%, 100%': {
            transform: 'scale(1) perspective(1000px) rotateX(0deg)',
            opacity: '1'
          },
          '50%': {
            transform: 'scale(1.05) perspective(1000px) rotateX(2deg)',
            opacity: '0.9'
          }
        },
        'data-stream': {
          '0%': {
            transform: 'translateX(-100%)',
            opacity: '0'
          },
          '50%': {
            opacity: '1'
          },
          '100%': {
            transform: 'translateX(100%)',
            opacity: '0'
          }
        },
        'matrix-rain': {
          '0%': {
            transform: 'translateY(-100%)',
            opacity: '0'
          },
          '10%': {
            opacity: '1'
          },
          '90%': {
            opacity: '1'
          },
          '100%': {
            transform: 'translateY(100vh)',
            opacity: '0'
          }
        },
        'energy-pulse': {
          '0%': {
            boxShadow: '0 0 0 0 rgba(155, 135, 245, 0.7)'
          },
          '70%': {
            boxShadow: '0 0 0 10px rgba(155, 135, 245, 0)'
          },
          '100%': {
            boxShadow: '0 0 0 0 rgba(155, 135, 245, 0)'
          }
        },
        'circuit-flow': {
          '0%': {
            backgroundPosition: '0% 50%'
          },
          '50%': {
            backgroundPosition: '100% 50%'
          },
          '100%': {
            backgroundPosition: '0% 50%'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'pulse-soft': 'pulse-soft 3s infinite ease-in-out',
        'float': 'float 5s infinite ease-in-out',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'spin-slow': 'spin-slow 8s linear infinite',
        'fade-in': 'fade-in 0.6s ease-out',
        'slide-up': 'slide-up 0.8s ease-out',
        'scale-in': 'scale-in 0.5s ease-out',
        'glow': 'glow 3s infinite ease-in-out',
        'shimmer': 'shimmer 2.5s infinite linear',
        'breathe': 'breathe 4s infinite ease-in-out',
        'ping-slow': 'ping-slow 2s cubic-bezier(0, 0, 0.2, 1) infinite',
        'scanner': 'scanner 3s ease-in-out infinite',
        'text-gradient': 'text-gradient 3s ease-in-out infinite',
        'flip-in': 'flip-in 1s ease-out',
        'float-shadow': 'float-shadow 5s infinite ease-in-out',
        'neon-pulse': 'neon-pulse 3s infinite ease-in-out',
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.1, 0, 0.3, 1) infinite',
        'cyber-glow': 'cyber-glow 4s ease-in-out infinite',
        'hologram': 'hologram 3s ease-in-out infinite',
        'data-stream': 'data-stream 2s linear infinite',
        'matrix-rain': 'matrix-rain 3s linear infinite',
        'energy-pulse': 'energy-pulse 2s infinite',
        'circuit-flow': 'circuit-flow 3s ease-in-out infinite'
      },
      backgroundImage: {
        'cyber-grid': `
          linear-gradient(rgba(155, 135, 245, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(155, 135, 245, 0.1) 1px, transparent 1px)
        `,
        'hologram-gradient': `
          linear-gradient(45deg, 
            rgba(0, 255, 255, 0.1) 0%, 
            rgba(155, 135, 245, 0.1) 25%, 
            rgba(255, 0, 255, 0.1) 50%, 
            rgba(0, 255, 0, 0.1) 75%, 
            rgba(0, 255, 255, 0.1) 100%)
        `,
        'circuit-pattern': `
          repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(155, 135, 245, 0.1) 2px,
            rgba(155, 135, 245, 0.1) 4px
          )
        `
      },
      backgroundSize: {
        'cyber-grid': '20px 20px',
        'circuit-pattern': '100% 4px'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
