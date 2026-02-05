import { useQuery } from "@tanstack/react-query";

import { fetchOpenMeteoForecast } from "./api";

export const weatherKeys = {
  forecast: (input: { latitude: number; longitude: number; timezone: string; days: number }) =>
    ["weather", "forecast", input] as const,
};

export function useOpenMeteoForecastQuery(input: {
  latitude: number;
  longitude: number;
  timezone?: string;
  days?: number;
  enabled?: boolean;
}) {
  const timezone = input.timezone ?? "Pacific/Auckland";
  const days = input.days ?? 3;

  return useQuery({
    queryKey: weatherKeys.forecast({
      latitude: input.latitude,
      longitude: input.longitude,
      timezone,
      days,
    }),
    queryFn: () => fetchOpenMeteoForecast({ ...input, timezone, days }),
    enabled: input.enabled ?? true,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 60,
    retry: 1,
  });
}

