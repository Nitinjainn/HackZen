/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4F46E5',       // Indigo Blue
        secondary: '#10B981',     // Emerald Green
        accent: '#8B5CF6',        // Violet / Purple
        background: '#FFFFFF',    // Light Background
        dark: '#1E293B',          // Dark Mode Background
        text: {
          primary: '#111827',     // Charcoal
          secondary: '#6B7280',   // Cool Gray
        },
        error: '#EF4444',         // Red
      },
      fontFamily: {
        heading: ['Poppins', 'Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'monospace'],
        heading1: ['Space Grotesk', 'sans-serif'],
      },
      animation: {
        fadeInUp: "fadeInUp 0.8s ease-out forwards",
        "draw-4": "draw-4 2s ease-in-out forwards",
        "draw-0": "draw-0 2s ease-in-out 0.5s forwards",
        "draw-4-2": "draw-4-2 2s ease-in-out 1s forwards",
        "flicker": "flicker 3s ease-in-out 2.5s infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "draw-4": {
          "0%": { strokeDasharray: "940px", strokeDashoffset: "-940px" },
          "100%": { strokeDasharray: "940px", strokeDashoffset: "0px" },
        },
        "draw-0": {
          "0%": { strokeDasharray: "735px", strokeDashoffset: "-735px" },
          "100%": { strokeDasharray: "735px", strokeDashoffset: "0px" },
        },
        "draw-4-2": {
          "0%": { strokeDasharray: "940px", strokeDashoffset: "-940px" },
          "100%": { strokeDasharray: "940px", strokeDashoffset: "0px" },
        },
        "flicker": {
          "0%, 100%": { 
            color: "#00d4ff",
            textShadow: "0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 30px #00d4ff"
          },
          "50%": { 
            color: "#0099cc",
            textShadow: "0 0 5px #0099cc, 0 0 10px #0099cc, 0 0 15px #0099cc"
          },
        },
      },
    },
  },
  plugins: [],
};


// bg-[#0D0D2B]
