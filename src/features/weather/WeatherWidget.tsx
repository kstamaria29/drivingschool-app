import dayjs from "dayjs";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
import * as Location from "expo-location";

import { AppButton } from "../../components/AppButton";
import { AppCard } from "../../components/AppCard";
import { AppStack } from "../../components/AppStack";
import { AppText } from "../../components/AppText";
import { theme } from "../../theme/theme";
import { cn } from "../../utils/cn";
import { toErrorMessage } from "../../utils/errors";

import { describeWeatherCode } from "./api";
import { useOpenMeteoForecastQuery } from "./queries";

const DEFAULT_NZ_COORDS = { latitude: -36.8485, longitude: 174.7633, label: "Auckland" };

type Coords = { latitude: number; longitude: number; source: "default" | "device" };

function formatTemp(value: number) {
  const rounded = Math.round(value);
  return `${rounded}°C`;
}

export function WeatherWidget() {
  const [coords, setCoords] = useState<Coords>({
    latitude: DEFAULT_NZ_COORDS.latitude,
    longitude: DEFAULT_NZ_COORDS.longitude,
    source: "default",
  });
  const [place, setPlace] = useState<string>(DEFAULT_NZ_COORDS.label);
  const [permissionStatus, setPermissionStatus] = useState<"unknown" | "granted" | "denied">(
    "unknown",
  );

  const query = useOpenMeteoForecastQuery({
    latitude: coords.latitude,
    longitude: coords.longitude,
    timezone: "Pacific/Auckland",
    days: 3,
    enabled: true,
  });

  async function syncDeviceLocation({ request }: { request: boolean }) {
    try {
      const permissions = request
        ? await Location.requestForegroundPermissionsAsync()
        : await Location.getForegroundPermissionsAsync();

      if (!permissions.granted) {
        setPermissionStatus("denied");
        setCoords((prev) => ({ ...prev, source: "default" }));
        setPlace(DEFAULT_NZ_COORDS.label);
        return;
      }

      setPermissionStatus("granted");

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const nextCoords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        source: "device" as const,
      };
      setCoords(nextCoords);

      const reversed = await Location.reverseGeocodeAsync({
        latitude: nextCoords.latitude,
        longitude: nextCoords.longitude,
      });
      const first = reversed[0] ?? null;
      const city = first?.city || first?.subregion || first?.region || "";
      const region = first?.region || "";
      const country = first?.country || "";
      const label = [city, region].filter(Boolean).join(", ").trim();

      if (country && country !== "New Zealand") {
        setPlace(label || country);
        return;
      }

      setPlace(label || DEFAULT_NZ_COORDS.label);
    } catch (error) {
      if (request) {
        Alert.alert("Couldn't get location", toErrorMessage(error));
      }
      setPermissionStatus("denied");
    }
  }

  useEffect(() => {
    void syncDeviceLocation({ request: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forecast = query.data ?? null;
  const nextTwoDays = useMemo(() => {
    if (!forecast) return [];
    return forecast.days.slice(1, 3);
  }, [forecast]);

  const currentText = useMemo(() => {
    if (!forecast) return null;
    const description = describeWeatherCode(forecast.current.weatherCode);
    return `${formatTemp(forecast.current.temperatureC)} · ${description}`;
  }, [forecast]);

  const subtitle = useMemo(() => {
    const usingLocation = coords.source === "device";
    if (usingLocation) return `Now in ${place}`;
    if (permissionStatus === "denied") return `Using ${DEFAULT_NZ_COORDS.label} (enable location for local weather)`;
    return `Using ${DEFAULT_NZ_COORDS.label}`;
  }, [coords.source, permissionStatus, place]);

  return (
    <AppStack gap="md">
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <AppText variant="heading">Weather</AppText>
          <AppText className="mt-1" variant="caption">
            {subtitle}
          </AppText>
        </View>

        <View className="flex-row gap-2">
          <AppButton
            width="auto"
            variant="secondary"
            label={query.isFetching ? "Refreshing..." : "Refresh"}
            disabled={query.isFetching}
            onPress={() => query.refetch()}
          />
          <AppButton
            width="auto"
            label="Use my location"
            onPress={() => void syncDeviceLocation({ request: true })}
          />
        </View>
      </View>

      {query.isPending ? (
        <View className={cn("items-center justify-center py-10", theme.text.base)}>
          <ActivityIndicator />
          <AppText className="mt-3 text-center" variant="body">
            Loading weather...
          </AppText>
        </View>
      ) : query.isError ? (
        <AppCard className="gap-2">
          <AppText variant="heading">Couldn't load weather</AppText>
          <AppText variant="body">{toErrorMessage(query.error)}</AppText>
          <AppButton width="auto" label="Retry" variant="secondary" onPress={() => query.refetch()} />
        </AppCard>
      ) : !forecast ? (
        <AppCard className="gap-2">
          <AppText variant="heading">Weather unavailable</AppText>
          <AppText variant="body">Try again in a moment.</AppText>
        </AppCard>
      ) : (
        <View className="flex-row flex-wrap gap-3">
          <AppCard className="flex-1 min-w-64 gap-2">
            <AppText variant="heading">Right now</AppText>
            <AppText variant="body">{currentText}</AppText>
            <AppText variant="caption">
              Wind: {Math.round(forecast.current.windSpeedKph)} km/h · Updated{" "}
              {forecast.current.timeISO ? dayjs(forecast.current.timeISO).format("h:mm A") : "—"}
            </AppText>
          </AppCard>

          <AppCard className="flex-1 min-w-64 gap-2">
            <AppText variant="heading">Next 2 days</AppText>
            {nextTwoDays.length === 0 ? (
              <AppText variant="body">Forecast unavailable.</AppText>
            ) : (
              <AppStack gap="sm">
                {nextTwoDays.map((day) => (
                  <View
                    key={day.dateISO}
                    className="flex-row items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2"
                  >
                    <View className="flex-1">
                      <AppText variant="body">{dayjs(day.dateISO).format("ddd")}</AppText>
                      <AppText variant="caption">{describeWeatherCode(day.weatherCode)}</AppText>
                    </View>
                    <AppText variant="body">
                      {formatTemp(day.maxC)} / {formatTemp(day.minC)}
                    </AppText>
                  </View>
                ))}
              </AppStack>
            )}
          </AppCard>
        </View>
      )}
    </AppStack>
  );
}

