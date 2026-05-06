import 'server-only';

export type WeatherSnapshot = {
  city: string;
  temperatureC: number;
  feelsLikeC: number;
  description: string;
  conditionCode: string;
  windKph: number;
  humidity: number;
  isOutdoorFriendly: boolean;
};

/**
 * Look up current weather for a city via OpenWeather.
 * Returns null when the API key is missing or the lookup fails — callers
 * fall back to "no weather data" mode rather than blocking the user.
 */
export async function getWeather(city: string): Promise<WeatherSnapshot | null> {
  const key = process.env.OPENWEATHER_API_KEY;
  if (!key || !city) return null;

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${key}&units=metric`;

  try {
    const res = await fetch(url, { next: { revalidate: 1800 } }); // 30 min cache
    if (!res.ok) return null;
    const data = (await res.json()) as {
      name: string;
      main: { temp: number; feels_like: number; humidity: number };
      weather: Array<{ main: string; description: string }>;
      wind: { speed: number };
    };

    const main = data.weather[0]?.main ?? 'Unknown';
    const isOutdoorFriendly =
      data.main.temp >= 5 &&
      data.main.temp <= 30 &&
      !['Thunderstorm', 'Snow'].includes(main) &&
      data.wind.speed < 10;

    return {
      city: data.name,
      temperatureC: Math.round(data.main.temp),
      feelsLikeC: Math.round(data.main.feels_like),
      description: data.weather[0]?.description ?? '',
      conditionCode: main,
      windKph: Math.round(data.wind.speed * 3.6),
      humidity: data.main.humidity,
      isOutdoorFriendly,
    };
  } catch {
    return null;
  }
}
