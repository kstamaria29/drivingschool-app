import { useEffect, useRef, useState } from "react";
import type { TextInputProps } from "react-native";
import { ActivityIndicator, Pressable, View } from "react-native";

import {
  fetchNzAddressPredictions,
  isGooglePlacesConfigured,
  type PlacePrediction,
} from "../features/maps/places";
import { cn } from "../utils/cn";
import { toErrorMessage } from "../utils/errors";

import { AppInput } from "./AppInput";
import { AppText } from "./AppText";

type Props = Omit<TextInputProps, "value" | "onChangeText"> & {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onSelectPrediction?: (prediction: PlacePrediction) => void;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
  minQueryLength?: number;
  maxResults?: number;
};

export function AddressAutocompleteInput({
  label,
  value,
  onChangeText,
  onSelectPrediction,
  error,
  containerClassName,
  inputClassName,
  minQueryLength = 3,
  maxResults = 6,
  onFocus,
  onBlur,
  ...props
}: Props) {
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autocompleteConfigured = isGooglePlacesConfigured();

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!focused || !autocompleteConfigured) {
      setLoading(false);
      setPredictions([]);
      setLookupError(null);
      return;
    }

    const needle = value.trim();
    if (needle.length < minQueryLength) {
      setLoading(false);
      setPredictions([]);
      setLookupError(null);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setLoading(true);
      setLookupError(null);
      try {
        const items = await fetchNzAddressPredictions(needle, controller.signal);
        setPredictions(items.slice(0, maxResults));
      } catch (lookupErrorValue) {
        setPredictions([]);
        setLookupError(toErrorMessage(lookupErrorValue));
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [autocompleteConfigured, focused, maxResults, minQueryLength, value]);

  const showSuggestionList =
    focused && autocompleteConfigured && predictions.length > 0 && value.trim().length >= minQueryLength;

  return (
    <View className={cn("gap-2", containerClassName)}>
      <AppInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        error={error}
        inputClassName={inputClassName}
        onFocus={(event) => {
          if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
          }
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          blurTimeoutRef.current = setTimeout(() => {
            setFocused(false);
          }, 120);
          onBlur?.(event);
        }}
        {...props}
      />

      {!autocompleteConfigured && focused ? (
        <AppText variant="caption">Set `GOOGLE_MAPS_API_KEY` to enable NZ address autocomplete.</AppText>
      ) : null}

      {loading ? (
        <View className="flex-row items-center gap-2 py-1">
          <ActivityIndicator size="small" />
          <AppText variant="caption">Finding NZ addresses...</AppText>
        </View>
      ) : null}

      {lookupError ? <AppText variant="error">{lookupError}</AppText> : null}

      {showSuggestionList ? (
        <View className="rounded-xl border border-border bg-background dark:border-borderDark dark:bg-backgroundDark">
          {predictions.map((prediction) => (
            <Pressable
              key={prediction.placeId}
              accessibilityRole="button"
              className={cn("border-b border-border px-3 py-2 dark:border-borderDark")}
              onPress={() => {
                onChangeText(prediction.description);
                setPredictions([]);
                setFocused(false);
                setLookupError(null);
                onSelectPrediction?.(prediction);
              }}
            >
              <AppText variant="label">{prediction.primaryText}</AppText>
              {prediction.secondaryText ? (
                <AppText variant="caption">{prediction.secondaryText}</AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}

      {focused && !loading && autocompleteConfigured && value.trim().length >= minQueryLength && predictions.length === 0 && !lookupError ? (
        <AppText variant="caption">No matching NZ addresses.</AppText>
      ) : null}
    </View>
  );
}
