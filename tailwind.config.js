/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#f8fafc",
        foreground: "#0f172a",
        card: "#ffffff",
        border: "#e2e8f0",
        muted: "#64748b",
        primary: "#1d4ed8",
        primaryDark: "#3b82f6",
        primaryForeground: "#ffffff",
        accent: "#14b8a6",
        accentForeground: "#042f2e",
        danger: "#dc2626",
        dangerDark: "#f87171",
        backgroundDark: "#0b1220",
        foregroundDark: "#e2e8f0",
        cardDark: "#111a2a",
        borderDark: "#23324a",
        mutedDark: "#94a3b8",
      },
    },
  },
  plugins: [],
};
