import { Image, View } from "react-native";

import { AppText } from "./AppText";

type Props = {
  uri?: string | null;
  size: number;
  label?: string;
};

function getInitials(label?: string) {
  const value = (label ?? "").trim();
  if (!value) return "?";

  const parts = value.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] : "";
  return (first + last).toUpperCase();
}

export function Avatar({ uri, size, label }: Props) {
  const initials = getInitials(label);

  return (
    <View
      className="items-center justify-center overflow-hidden rounded-full bg-border dark:bg-borderDark"
      style={{ width: size, height: size }}
      accessibilityRole="image"
      accessibilityLabel={label ? `Avatar for ${label}` : "User avatar"}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} />
      ) : (
        <AppText variant="label">{initials}</AppText>
      )}
    </View>
  );
}
