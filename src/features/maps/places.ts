import Constants from "expo-constants";

export type PlacePrediction = {
  placeId: string;
  description: string;
  primaryText: string;
  secondaryText: string | null;
};

export type PlaceCoordinates = {
  placeId: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

type PlacesAutocompleteResponse = {
  status?: string;
  error_message?: string;
  predictions?: Array<{
    description?: string;
    place_id?: string;
    structured_formatting?: {
      main_text?: string;
      secondary_text?: string;
    };
  }>;
};

type PlacesDetailsResponse = {
  status?: string;
  error_message?: string;
  result?: {
    place_id?: string;
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
  };
};

type GeocodeResponse = {
  status?: string;
  error_message?: string;
  results?: Array<{
    formatted_address?: string;
    geometry?: {
      location?: {
        lat?: number;
        lng?: number;
      };
    };
    place_id?: string;
  }>;
};

type ExpoExtra = {
  googleMapsApiKey?: string;
};

function readExpoExtra(): ExpoExtra {
  const fromExpoConfig = Constants.expoConfig?.extra;
  if (fromExpoConfig && typeof fromExpoConfig === "object") {
    return fromExpoConfig as ExpoExtra;
  }

  const anyConstants = Constants as unknown as {
    manifest?: { extra?: ExpoExtra };
    manifest2?: { extra?: ExpoExtra };
  };

  return anyConstants.manifest2?.extra ?? anyConstants.manifest?.extra ?? {};
}

function getGoogleMapsApiKey(): string {
  const extra = readExpoExtra();
  return process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? extra.googleMapsApiKey ?? "";
}

function toGoogleApiError(status: string | undefined, errorMessage: string | undefined): Error {
  const statusValue = status ?? "UNKNOWN";
  if (statusValue === "ZERO_RESULTS") {
    return new Error("No matching New Zealand address found.");
  }

  if (errorMessage) {
    return new Error(errorMessage);
  }

  return new Error(`Google Places request failed (${statusValue}).`);
}

function buildQueryString(params: Record<string, string>) {
  return Object.entries(params)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join("&");
}

async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Google Maps request failed with HTTP ${response.status}.`);
  }
  return (await response.json()) as T;
}

export function isGooglePlacesConfigured() {
  return Boolean(getGoogleMapsApiKey());
}

export async function fetchNzAddressPredictions(
  input: string,
  signal?: AbortSignal,
): Promise<PlacePrediction[]> {
  const trimmedInput = input.trim();
  if (trimmedInput.length < 3) return [];

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) return [];

  const query = buildQueryString({
    input: trimmedInput,
    key: apiKey,
    language: "en-NZ",
    components: "country:nz",
    types: "address",
  });

  const response = await fetchJson<PlacesAutocompleteResponse>(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?${query}`,
    signal,
  );

  if (response.status === "ZERO_RESULTS") return [];
  if (response.status !== "OK") {
    throw toGoogleApiError(response.status, response.error_message);
  }

  const predictions = response.predictions ?? [];

  return predictions
    .map((prediction) => {
      const placeId = prediction.place_id?.trim();
      const description = prediction.description?.trim();
      if (!placeId || !description) return null;

      const primaryText = prediction.structured_formatting?.main_text?.trim() || description;
      const secondaryText = prediction.structured_formatting?.secondary_text?.trim() || null;

      return {
        placeId,
        description,
        primaryText,
        secondaryText,
      };
    })
    .filter((prediction): prediction is PlacePrediction => prediction != null);
}

export async function fetchPlaceCoordinatesById(
  placeId: string,
  signal?: AbortSignal,
): Promise<PlaceCoordinates> {
  const trimmedPlaceId = placeId.trim();
  if (!trimmedPlaceId) {
    throw new Error("Place ID is required.");
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("Google Maps API key is missing.");
  }

  const query = buildQueryString({
    place_id: trimmedPlaceId,
    key: apiKey,
    language: "en-NZ",
    fields: "place_id,formatted_address,geometry/location",
  });

  const response = await fetchJson<PlacesDetailsResponse>(
    `https://maps.googleapis.com/maps/api/place/details/json?${query}`,
    signal,
  );

  if (response.status !== "OK") {
    throw toGoogleApiError(response.status, response.error_message);
  }

  const result = response.result;
  const latitude = result?.geometry?.location?.lat;
  const longitude = result?.geometry?.location?.lng;
  const latitudeValue = Number(latitude);
  const longitudeValue = Number(longitude);

  if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
    throw new Error("Place details did not return valid coordinates.");
  }

  return {
    placeId: result?.place_id?.trim() || trimmedPlaceId,
    formattedAddress: result?.formatted_address?.trim() || "",
    latitude: latitudeValue,
    longitude: longitudeValue,
  };
}

export async function geocodeNewZealandAddress(
  address: string,
  signal?: AbortSignal,
): Promise<PlaceCoordinates | null> {
  const trimmedAddress = address.trim();
  if (!trimmedAddress) return null;

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    throw new Error("Google Maps API key is missing.");
  }

  const query = buildQueryString({
    address: trimmedAddress,
    key: apiKey,
    language: "en-NZ",
    components: "country:NZ",
  });

  const response = await fetchJson<GeocodeResponse>(
    `https://maps.googleapis.com/maps/api/geocode/json?${query}`,
    signal,
  );

  if (response.status === "ZERO_RESULTS") return null;
  if (response.status !== "OK") {
    throw toGoogleApiError(response.status, response.error_message);
  }

  const first = response.results?.[0];
  const latitude = first?.geometry?.location?.lat;
  const longitude = first?.geometry?.location?.lng;
  const latitudeValue = Number(latitude);
  const longitudeValue = Number(longitude);
  if (!Number.isFinite(latitudeValue) || !Number.isFinite(longitudeValue)) {
    return null;
  }

  return {
    placeId: first?.place_id?.trim() || "",
    formattedAddress: first?.formatted_address?.trim() || trimmedAddress,
    latitude: latitudeValue,
    longitude: longitudeValue,
  };
}
