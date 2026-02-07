/** @type {import('tailwindcss').Config} */
const withAlpha = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`;

module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        placeholder: withAlpha("--color-placeholder"),
        background: withAlpha("--color-background"),
        foreground: withAlpha("--color-foreground"),
        card: withAlpha("--color-card"),
        border: withAlpha("--color-border"),
        muted: withAlpha("--color-muted"),
        primary: withAlpha("--color-primary"),
        primaryDark: withAlpha("--color-primary-dark"),
        primaryForeground: withAlpha("--color-primary-foreground"),
        accent: withAlpha("--color-accent"),
        accentForeground: withAlpha("--color-accent-foreground"),
        danger: withAlpha("--color-danger"),
        dangerDark: withAlpha("--color-danger-dark"),
        backgroundDark: withAlpha("--color-background-dark"),
        foregroundDark: withAlpha("--color-foreground-dark"),
        cardDark: withAlpha("--color-card-dark"),
        borderDark: withAlpha("--color-border-dark"),
        mutedDark: withAlpha("--color-muted-dark"),
      },
    },
  },
  plugins: [],
};
