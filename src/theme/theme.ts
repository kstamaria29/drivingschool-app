export const theme = {
  colors: {
    placeholder: "#94a3b8",
    foregroundLight: "#0f172a",
    foregroundDark: "#e2e8f0",
    mutedLight: "#64748b",
    mutedDark: "#94a3b8",
    primary: "#1d4ed8",
    primaryDark: "#3b82f6",
    accent: "#14b8a6",
    danger: "#dc2626",
    dangerDark: "#f87171",
    primaryForeground: "#ffffff",
  },
  screen: {
    safeArea: "flex-1 bg-background dark:bg-backgroundDark",
    scrollContent: "flex-grow",
    container: "flex-1 w-full max-w-[720px] self-center px-6 py-6",
  },
  text: {
    base: "text-foreground dark:text-foregroundDark",
    variant: {
      title: "text-3xl",
      heading: "text-xl",
      body: "text-base",
      caption: "text-sm text-muted dark:text-mutedDark",
      label: "text-sm",
      error: "text-sm text-danger dark:text-dangerDark",
      button: "text-base",
    },
  },
  button: {
    base: "items-center justify-center rounded-xl border shadow-sm shadow-black/5 dark:shadow-black/30",
    disabled: "opacity-60",
    size: {
      md: "h-12 px-4",
      lg: "h-14 px-5",
    },
    variant: {
      primary: "bg-primary border-primary dark:bg-primaryDark dark:border-primaryDark",
      secondary: "bg-card border-border dark:bg-cardDark dark:border-borderDark",
      danger: "bg-danger border-danger dark:bg-dangerDark dark:border-dangerDark",
      ghost: "bg-transparent border-transparent",
    },
    labelBase: "",
    labelVariant: {
      primary: "text-primaryForeground",
      secondary: "text-foreground dark:text-foregroundDark",
      danger: "text-primaryForeground",
      ghost: "text-primary dark:text-primaryDark",
    },
  },
  input: {
    wrapper: "",
    base: "mt-2 h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground dark:border-borderDark dark:bg-cardDark dark:text-foregroundDark",
    error: "border-danger dark:border-dangerDark",
  },
  card: {
    base: "rounded-2xl border border-border bg-card p-4 shadow-sm shadow-black/5 dark:border-borderDark dark:bg-cardDark dark:shadow-black/30",
  },
} as const;
