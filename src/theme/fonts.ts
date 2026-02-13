export type FontPack = {
  regular: string;
  medium: string;
  semibold: string;
};

export const fonts: FontPack = {
  regular: "Poppins_400Regular",
  medium: "Poppins_500Medium",
  semibold: "Poppins_600SemiBold",
} as const;
