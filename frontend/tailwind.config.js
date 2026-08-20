/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F1E4",
        paperDim: "#EDE6D3",
        ink: "#26241F",
        inkMuted: "#6B6455",
        navy: "#1E2761",
        navyDark: "#141A46",
        accent: "#FF7A45",
        accentSoft: "#FFE4D3",
        sage: "#6B9080",
        clay: "#B0392B",
      },
      fontFamily: {
        display: ["Lora", "serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        lamp: "0 0 0 0 rgba(255,122,69,0)",
        lampGlow: "0 8px 30px -4px rgba(255,122,69,0.55), 0 0 0 1px rgba(255,122,69,0.15)",
        paper: "0 1px 2px rgba(38,36,31,0.06), 0 2px 8px rgba(38,36,31,0.05)",
      },
      keyframes: {
        pulseglow: {
          "0%, 100%": { boxShadow: "0 8px 24px -6px rgba(255,122,69,0.45), 0 0 0 1px rgba(255,122,69,0.12)" },
          "50%": { boxShadow: "0 10px 36px -4px rgba(255,122,69,0.75), 0 0 0 1px rgba(255,122,69,0.25)" },
        },
      },
      animation: {
        pulseglow: "pulseglow 2.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};