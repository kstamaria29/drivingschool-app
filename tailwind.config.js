/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
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
        primaryForeground: "#ffffff",
        danger: "#dc2626",
      },
    },
  },
  plugins: [],
};

