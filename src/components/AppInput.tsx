import { TextInput, View, type TextInputProps } from "react-native";

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
  ...props
}: Props) {
  return (
    <View className={cn(theme.input.wrapper, containerClassName)}>
      <AppText variant="label">{label}</AppText>
      <TextInput
        className={cn(theme.input.base, error && theme.input.error, inputClassName)}
        placeholderTextColor={theme.colors.placeholder}
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
