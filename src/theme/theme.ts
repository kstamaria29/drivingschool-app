export const theme = {
  colors: {
    placeholder: "#94a3b8",
  },
  screen: {
    safeArea: "flex-1 bg-background",
    scrollContent: "flex-grow",
    container: "flex-1 w-full max-w-[720px] self-center px-6 py-6",
  },
  text: {
    base: "text-foreground",
    variant: {
      title: "text-3xl",
      heading: "text-xl",
      body: "text-base",
      caption: "text-sm text-muted",
      label: "text-sm",
      error: "text-sm text-danger",
      button: "text-base",
    },
  },
  button: {
    base: "items-center justify-center rounded-xl border",
    disabled: "opacity-60",
    size: {
      md: "h-12 px-4",
      lg: "h-14 px-5",
    },
    variant: {
      primary: "bg-primary border-primary",
      secondary: "bg-card border-border",
      ghost: "bg-transparent border-transparent",
    },
    labelBase: "",
    labelVariant: {
      primary: "text-primaryForeground",
      secondary: "text-foreground",
      ghost: "text-primary",
    },
  },
  input: {
    wrapper: "",
    base: "mt-2 h-12 rounded-xl border border-border bg-card px-4 text-base text-foreground",
    error: "border-danger",
  },
  card: {
    base: "rounded-2xl border border-border bg-card p-4",
  },
} as const;
