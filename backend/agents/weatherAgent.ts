/**
 * Dedicated Weather Agent — uses Open-Meteo (free, no API key, ~100ms response).
 * Returns structured WeatherData for the frontend WeatherCard component.
 */

export interface WeatherData {
  city: string;
  country: string;
  temp: string;
  feelsLike: string;
  description: string;
  weatherCode: number;
  humidity: string;
  windspeed: string;
  high: string;
  low: string;
  sunrise: string;
  sunset: string;
  datetime: string;
  hourly: Array<{
    label: string;
    temp: string;
    weatherCode: number;
    description: string;
  }>;
}

// WMO Weather Code → description mapping
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snow fall",
  73: "Moderate snow fall",
  75: "Heavy snow fall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

// Map WMO codes → wttr.in-compatible codes (for frontend emoji/gradient compat)
function wmoToWttrCode(wmo: number): number {
  if (wmo === 0) return 113;        // Clear
  if (wmo <= 2) return 116;         // Partly cloudy
  if (wmo === 3) return 119;        // Overcast
  if (wmo <= 48) return 143;        // Fog
  if (wmo <= 57) return 266;        // Drizzle
  if (wmo <= 65) return 296;        // Rain
  if (wmo <= 67) return 311;        // Freezing rain
  if (wmo <= 77) return 326;        // Snow
  if (wmo <= 82) return 299;        // Rain showers
  if (wmo <= 86) return 335;        // Snow showers
  if (wmo >= 95) return 200;        // Thunderstorm
  return 116;
}

/**
 * Geocode a city name → lat/lon using Open-Meteo's free geocoding API.
 */
async function geocode(city: string): Promise<{ lat: number; lon: number; name: string; country: string }> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
  const data = await res.json();
  if (!data.results?.length) throw new Error(`City not found: ${city}`);
  const r = data.results[0];
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country };
}

/**
 * Fetch weather from Open-Meteo — single HTTP call, ~100ms, no API key.
 */
export async function weatherAgent(city: string): Promise<WeatherData> {
  // Step 1: Geocode
  const geo = await geocode(city);

  // Step 2: Fetch current + today's hourly + daily summary in ONE call
  const params = new URLSearchParams({
    latitude: geo.lat.toString(),
    longitude: geo.lon.toString(),
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
    hourly: "temperature_2m,weather_code",
    daily: "temperature_2m_max,temperature_2m_min,sunrise,sunset",
    timezone: "auto",
    forecast_days: "1",
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo API error: ${res.status}`);
  const data = await res.json();

  const current = data.current;
  const daily = data.daily;
  const hourly = data.hourly;

  // Find current hour index
  const nowISO = current.time; // e.g. "2026-02-26T14:00"
  const currentHourIdx = hourly.time.findIndex((t: string) => t === nowISO);
  const startIdx = currentHourIdx >= 0 ? currentHourIdx : 0;

  // Take 6 hourly slots from now
  const slots: WeatherData["hourly"] = [];
  for (let i = 0; i < 6 && startIdx + i < hourly.time.length; i++) {
    const idx = startIdx + i;
    const timeStr = hourly.time[idx]; // "2026-02-26T14:00"
    const hour = parseInt(timeStr.split("T")[1].split(":")[0]);
    let label: string;
    if (i === 0) {
      label = "Now";
    } else if (hour === 0) {
      label = "12AM";
    } else if (hour === 12) {
      label = "12PM";
    } else if (hour < 12) {
      label = `${hour}AM`;
    } else {
      label = `${hour - 12}PM`;
    }

    const wmo = hourly.weather_code[idx];
    slots.push({
      label,
      temp: Math.round(hourly.temperature_2m[idx]).toString(),
      weatherCode: wmoToWttrCode(wmo),
      description: WMO_DESCRIPTIONS[wmo] ?? "Unknown",
    });
  }

  // Format current datetime
  const now = new Date();
  const datetime =
    now.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    ", " +
    now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  // Format sunrise/sunset times
  const formatSunTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const wmo = current.weather_code;

  return {
    city: geo.name,
    country: geo.country,
    temp: Math.round(current.temperature_2m).toString(),
    feelsLike: Math.round(current.apparent_temperature).toString(),
    description: WMO_DESCRIPTIONS[wmo] ?? "Unknown",
    weatherCode: wmoToWttrCode(wmo),
    humidity: Math.round(current.relative_humidity_2m).toString(),
    windspeed: Math.round(current.wind_speed_10m).toString(),
    high: Math.round(daily.temperature_2m_max[0]).toString(),
    low: Math.round(daily.temperature_2m_min[0]).toString(),
    sunrise: formatSunTime(daily.sunrise[0]),
    sunset: formatSunTime(daily.sunset[0]),
    datetime,
    hourly: slots,
  };
}
