/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', '"Plus Jakarta Sans"', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ===== BRAND PALETTE (legacy "pink" aliases now map to soft azure) =====
        pink: {
          50: '#fdf8e7',
          100: '#faeec2',
          200: '#f5dd90',
          300: '#efc95c',
          400: '#e8b93a',
          500: '#d4af37',
          600: '#b8912a',
          700: '#916f20',
          800: '#6b511a',
          900: '#473514',
          950: '#241a09',
        },
        // ===== GLOW COLORS =====
        'pink-glow': {
          DEFAULT: 'rgba(245, 208, 111, 0.3)',
          strong: 'rgba(245, 208, 111, 0.5)',
          soft: 'rgba(245, 208, 111, 0.1)',
        },
        // ===== PINK NEON (legacy aliases, now follow the theme tokens) =====
        'neon-pink': 'hsl(var(--primary))',
        'neon-pink-light': 'hsl(var(--primary-glow))',
        'neon-pink-dark': 'hsl(var(--primary))',
        'primary-glow': 'hsl(var(--primary-glow))',
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        // ===== PINK ROUNDED EXTRA =====
        '2xl': "1rem",
        '3xl': "1.5rem",
        '4xl': "2rem",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        // ===== PINK SHADOWS =====
        'pink-sm': '0 2px 8px rgba(212, 175, 55, 0.15)',
        'pink-md': '0 4px 20px rgba(212, 175, 55, 0.2)',
        'pink-lg': '0 8px 40px rgba(212, 175, 55, 0.25)',
        'pink-xl': '0 12px 60px rgba(212, 175, 55, 0.3)',
        'pink-2xl': '0 20px 80px rgba(212, 175, 55, 0.35)',
        'pink-glow': '0 0 30px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.1)',
        'pink-glow-strong': '0 0 40px rgba(212, 175, 55, 0.4), 0 0 80px rgba(212, 175, 55, 0.15)',
        'pink-inner': 'inset 0 2px 20px rgba(212, 175, 55, 0.05)',
        // ===== GLASS SHADOWS =====
        'glass': '0 8px 32px rgba(0, 0, 0, 0.12)',
        'glass-pink': '0 8px 32px rgba(212, 175, 55, 0.08)',
      },
      keyframes: {
        // ===== EXISTING =====
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        // ===== PINK ANIMATIONS =====
        // Wave hand
        "wave-hand": {
          "0%, 100%": { transform: "rotate(0deg)" },
          "15%": { transform: "rotate(18deg)" },
          "35%": { transform: "rotate(-8deg)" },
          "55%": { transform: "rotate(18deg)" },
          "75%": { transform: "rotate(-4deg)" },
        },
        // Pulse ring
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.8" },
          "100%": { transform: "scale(1.5)", opacity: "0" },
        },
        // Shimmer
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        // Float
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        // Glow pulse
        "glow-pulse": {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(212, 175, 55, 0.3), 0 0 60px rgba(212, 175, 55, 0.1)" 
          },
          "50%": { 
            boxShadow: "0 0 40px rgba(212, 175, 55, 0.5), 0 0 80px rgba(212, 175, 55, 0.2)" 
          },
        },
        // Slide up
        "slide-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        // Scale bounce
        "scale-bounce": {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "50%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // Spin slow
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        // Gradient move
        "gradient-shift": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        // Heartbeat
        "heartbeat": {
          "0%, 100%": { transform: "scale(1)" },
          "14%": { transform: "scale(1.15)" },
          "28%": { transform: "scale(1)" },
          "42%": { transform: "scale(1.1)" },
          "70%": { transform: "scale(1)" },
        },
        // Typing dot
        "typing-dot": {
          "0%, 100%": { transform: "scale(0.5)", opacity: "0.3" },
          "50%": { transform: "scale(1.2)", opacity: "1" },
        },
        // Flip
        "flip": {
          "0%": { transform: "perspective(400px) rotateY(0deg)" },
          "100%": { transform: "perspective(400px) rotateY(360deg)" },
        },
      },
      animation: {
        // ===== EXISTING =====
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        // ===== PINK ANIMATIONS =====
        "wave-hand": "wave-hand 2.5s ease-in-out infinite",
        "pulse-ring": "pulse-ring 2s ease-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "float": "float 3s ease-in-out infinite",
        "glow-pulse": "glow-pulse 2s ease-in-out infinite",
        "slide-up": "slide-up 0.5s ease-out",
        "scale-bounce": "scale-bounce 0.6s ease-out",
        "spin-slow": "spin-slow 3s linear infinite",
        "gradient-shift": "gradient-shift 4s ease-in-out infinite",
        "heartbeat": "heartbeat 1.5s ease-in-out infinite",
        "typing-dot": "typing-dot 1.4s ease-in-out infinite",
        "flip": "flip 1s ease-in-out",
        // ===== SHORTCUTS =====
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "bounce-slow": "bounce 2s ease-in-out infinite",
        "ping-slow": "ping 3s ease-in-out infinite",
      },
      // ===== BACKGROUND SIZE FOR SHIMMER =====
      backgroundSize: {
        '200': '200% 200%',
        '300': '300% 300%',
      },
      // ===== TRANSITION DURATION =====
      transitionDuration: {
        '2000': '2000ms',
        '3000': '3000ms',
      },
      // ===== Z-INDEX =====
      zIndex: {
        '100': '100',
        '110': '110',
        '120': '120',
        '999': '999',
        '9999': '9999',
      },
      // ===== BACKDROP BLUR =====
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        md: '8px',
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
        '3xl': '40px',
      },
      // ===== FONT WEIGHT =====
      fontWeight: {
        'extrablack': '950',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // ===== PLUGIN FOR CUSTOM FORMS =====
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-pink': {
          '&::-webkit-scrollbar': {
            width: '6px',
            height: '6px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#0a0908',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'linear-gradient(to bottom, #D4AF37, #F5D06F)',
            borderRadius: '10px',
          },
          '&::-webkit-scrollbar-thumb:hover': {
            background: '#E8C55A',
          },
          'scrollbar-width': 'thin',
          'scrollbar-color': '#D4AF37 #0a0908',
        },
        '.text-shadow-pink': {
          textShadow: '0 0 20px rgba(212, 175, 55, 0.3), 0 0 40px rgba(212, 175, 55, 0.1)',
        },
        '.text-shadow-pink-strong': {
          textShadow: '0 0 30px rgba(212, 175, 55, 0.4), 0 0 60px rgba(212, 175, 55, 0.2)',
        },
        '.bg-grid-pink': {
          backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.05) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        },
        '.bg-grid-pink-strong': {
          backgroundImage: 'radial-gradient(rgba(212, 175, 55, 0.08) 1px, transparent 1px)',
          backgroundSize: '16px 16px',
        },
      };
      addUtilities(newUtilities, ['responsive', 'hover']);
    },
  ],
}