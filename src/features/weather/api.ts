export type OpenMeteoForecast = {
  current: {
    temperatureC: number;
    windSpeedKph: number;
    weatherCode: number;
    timeISO: string;
  };
  hourly: Array<{
    timeISO: string;
    temperatureC: number;
    weatherCode: number;
    precipitationProbabilityPercent: number | null;
  }>;
  days: Array<{
    dateISO: string;
    weatherCode: number;
    maxC: number;
    minC: number;
  }>;
};

type OpenMeteoApiResponse = {
  current_weather?: {
    temperature?: number;
    windspeed?: number;
    weathercode?: number;
    time?: string;
  };
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    weathercode?: number[];
    precipitation_probability?: number[];
  };
  daily?: {
    time?: string[];
    weathercode?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

export function describeWeatherCode(code: number) {
  if (code === 0) return "Clear";
  if (code === 1) return "Mainly clear";
  if (code === 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 57) return "Drizzle";
  if (code >= 61 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code === 85 || code === 86) return "Snow showers";
  if (code === 95) return "Thunderstorm";
  if (code === 96 || code === 99) return "Thunderstorm (hail)";
  return "Unknown";
}

export async function fetchOpenMeteoForecast(input: {
  latitude: number;
  longitude: number;
  timezone?: string;
  days?: number;
}): Promise<OpenMeteoForecast> {
  const timezone = input.timezone ?? "Pacific/Auckland";
  const days = input.days ?? 3;

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(input.latitude));
  url.searchParams.set("longitude", String(input.longitude));
  url.searchParams.set("current_weather", "true");
  url.searchParams.set("hourly", "temperature_2m,weathercode,precipitation_probability");
  url.searchParams.set("daily", "weathercode,temperature_2m_max,temperature_2m_min");
  url.searchParams.set("timezone", timezone);
  url.searchParams.set("forecast_days", String(days));

  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Weather request failed (${response.status})`);
  }

  const json = (await response.json()) as OpenMeteoApiResponse;
  const current = json?.current_weather;
  const hourly = json?.hourly;
  const daily = json?.daily;

  if (
    !current ||
    typeof current.temperature !== "number" ||
    typeof current.windspeed !== "number" ||
    typeof current.weathercode !== "number"
  ) {
    throw new Error("Weather response missing current conditions.");
  }

  const timeISO = String(current.time ?? "");
  const dailyTimes: string[] = Array.isArray(daily?.time) ? daily.time : [];
  const dailyCodes: number[] = Array.isArray(daily?.weathercode) ? daily.weathercode : [];
  const dailyMax: number[] = Array.isArray(daily?.temperature_2m_max) ? daily.temperature_2m_max : [];
  const dailyMin: number[] = Array.isArray(daily?.temperature_2m_min) ? daily.temperature_2m_min : [];

  const hourlyTimes: string[] = Array.isArray(hourly?.time) ? hourly.time : [];
  const hourlyTemps: number[] = Array.isArray(hourly?.temperature_2m) ? hourly.temperature_2m : [];
  const hourlyCodes: number[] = Array.isArray(hourly?.weathercode) ? hourly.weathercode : [];
  const hourlyPrecipProb: number[] = Array.isArray(hourly?.precipitation_probability)
    ? hourly.precipitation_probability
    : [];

  const hourlyOut: OpenMeteoForecast["hourly"] = hourlyTimes.map((timeISO, index) => {
    const probability = hourlyPrecipProb[index];
    return {
      timeISO,
      temperatureC: Number(hourlyTemps[index] ?? 0),
      weatherCode: Number(hourlyCodes[index] ?? 0),
      precipitationProbabilityPercent:
        typeof probability === "number" && Number.isFinite(probability) ? Math.round(probability) : null,
    };
  });

  const daysOut: OpenMeteoForecast["days"] = dailyTimes.map((dateISO, index) => ({
    dateISO,
    weatherCode: Number(dailyCodes[index] ?? 0),
    maxC: Number(dailyMax[index] ?? 0),
    minC: Number(dailyMin[index] ?? 0),
  }));

  return {
    current: {
      temperatureC: current.temperature,
      windSpeedKph: current.windspeed,
      weatherCode: current.weathercode,
      timeISO,
    },
    hourly: hourlyOut,
    days: daysOut,
  };
}
