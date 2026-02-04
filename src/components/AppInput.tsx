import { TextInput, View, type TextInputProps } from "react-native";
import { useColorScheme } from "nativewind";

import { fonts } from "../theme/fonts";
import { theme } from "../theme/theme";
import { cn } from "../utils/cn";

import { AppText } from "./AppText";

type Props = TextInputProps & {
  label: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
};

export function AppInput({
  label,
  error,
  containerClassName,
  inputClassName,
  style,
  ...props
}: Props) {
  const { colorScheme } = useColorScheme();
  const placeholderTextColor =
    colorScheme === "dark" ? theme.colors.mutedDark : theme.colors.mutedLight;

  return (
    <View className={cn(theme.input.wrapper, containerClassName)}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        className={cn(theme.input.base, error && theme.input.error, inputClassName)}
        placeholderTextColor={placeholderTextColor}
        style={[{ fontFamily: fonts.regular }, style]}
        {...props}
      />
      {error ? (
        <AppText className="mt-1" variant="error">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}
