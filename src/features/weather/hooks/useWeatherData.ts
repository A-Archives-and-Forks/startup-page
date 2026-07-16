import { useEffect } from "react";
import { readSettings } from "@/lib/settings";
import { useWeatherStore } from "@/features/weather/stores/weatherStore";
import { getOpenWeatherCondition, formatWeatherDescription } from "@/features/weather/utils";
import type { WeatherData } from "@/features/weather/types/weather";

const WEATHER_TTL_MS = 10 * 60 * 1000;

interface OWCurrentResponse {
  cod: number;
  weather: Array<{ id: number; main: string; description: string }>;
  main: { temp: number; humidity: number };
  wind?: { speed: number; deg: number };
  sys: { sunrise: number; sunset: number };
  name: string;
  dt: number;
}

interface OWForecastItem {
  dt_txt: string;
  main: { temp: number; temp_min: number; temp_max: number; humidity: number };
  weather: Array<{ id: number; main: string }>;
  wind: { speed: number; deg: number };
  pop: number;
  rain?: { "3h": number };
  snow?: { "3h": number };
}

interface OWForecastResponse {
  cod: string;
  list: OWForecastItem[];
}

async function fetchWeather(
  lat: number,
  lon: number,
  key: string,
  unit: string
): Promise<{ data: WeatherData; location: string }> {
  const owUnit = unit === "imperial" ? "imperial" : "metric";

  const [currentRes, forecastRes] = await Promise.all([
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}&units=${owUnit}`),
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${key}&units=${owUnit}&cnt=40`),
  ]);

  if (currentRes.status === 401 || forecastRes.status === 401)
    throw new Error("Invalid API key — check your OpenWeather key in Settings");
  if (!currentRes.ok)
    throw new Error(`Weather request failed (${currentRes.status})`);
  if (!forecastRes.ok)
    throw new Error(`Forecast request failed (${forecastRes.status})`);

  const current  = (await currentRes.json())  as OWCurrentResponse;
  const forecast = (await forecastRes.json()) as OWForecastResponse;

  const w = current.weather?.[0];
  if (!w) throw new Error("Unexpected weather response format");

  const sunriseIso = new Date(current.sys.sunrise * 1000).toISOString();
  const sunsetIso  = new Date(current.sys.sunset  * 1000).toISOString();
  const isDay      = current.dt >= current.sys.sunrise && current.dt < current.sys.sunset ? 1 : 0;

  // Group 3h forecast slots by date
  const dayMap = new Map<string, OWForecastItem[]>();
  for (const item of forecast.list) {
    const date = item.dt_txt.slice(0, 10);
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(item);
  }

  const days = [...dayMap.entries()].slice(0, 5);
  const dailyTime:     string[] = [];
  const dailyMax:      number[] = [];
  const dailyMin:      number[] = [];
  const dailyPrecip:   number[] = [];
  const dailySunrise:  string[] = [];
  const dailySunset:   string[] = [];

  days.forEach(([date, items], idx) => {
    dailyTime.push(date);
    dailyMax.push(Math.max(...items.map((i) => i.main.temp_max ?? i.main.temp)));
    dailyMin.push(Math.min(...items.map((i) => i.main.temp_min ?? i.main.temp)));
    dailyPrecip.push(Math.round(Math.max(...items.map((i) => i.pop)) * 100));
    dailySunrise.push(idx === 0 ? sunriseIso : "");
    dailySunset.push(idx === 0 ? sunsetIso  : "");
  });

  const hourlyTime:      string[] = [];
  const hourlyHumidity:  number[] = [];
  const hourlyWind:      number[] = [];
  const hourlyWindDir:   number[] = [];
  const hourlyPrecipPct: number[] = [];
  const hourlyPrecip:    number[] = [];

  for (const item of forecast.list) {
    hourlyTime.push(item.dt_txt.replace(" ", "T"));
    hourlyHumidity.push(item.main.humidity);
    hourlyWind.push(item.wind?.speed ?? 0);
    hourlyWindDir.push(item.wind?.deg ?? 0);
    hourlyPrecipPct.push(Math.round(item.pop * 100));
    hourlyPrecip.push(item.rain?.["3h"] ?? item.snow?.["3h"] ?? 0);
  }

  const weatherData: WeatherData = {
    source: "OpenWeather",
    unit,
    current: {
      temperature_2m: current.main.temp,
      weather_code:   w.id,
      is_day:         isDay,
    },
    daily: {
      time:                          dailyTime,
      temperature_2m_max:            dailyMax,
      temperature_2m_min:            dailyMin,
      precipitation_probability_max: dailyPrecip,
      sunrise:                       dailySunrise,
      sunset:                        dailySunset,
    },
    hourly: {
      time:                      hourlyTime,
      relative_humidity_2m:      hourlyHumidity,
      uv_index:                  [],
      wind_speed_10m:            hourlyWind,
      wind_direction_10m:        hourlyWindDir,
      precipitation_probability: hourlyPrecipPct,
      precipitation:             hourlyPrecip,
    },
    openWeather: {
      id:          w.id,
      weather:     getOpenWeatherCondition(w.id, w.main),
      description: formatWeatherDescription(w.description || w.main),
      temperature: current.main.temp,
    },
  };

  return { data: weatherData, location: current.name };
}

export function useWeatherData(): void {
  const { setData, setError, setLocation, setLastFetchedAt } = useWeatherStore();

  useEffect(() => {
    const { data, lastFetchedAt } = useWeatherStore.getState();
    if (lastFetchedAt && Date.now() - lastFetchedAt < WEATHER_TTL_MS && data) return;

    const settings = readSettings() as Record<string, unknown>;
    const unit = (settings.unit as string) || (settings.units as string) || "imperial";
    const key  = ((settings.openWeatherCredential as string) ?? "").trim();

    if (!key) {
      setError("Add your OpenWeather API key in Settings to see weather");
      return;
    }

    async function load(lat: number, lon: number): Promise<void> {
      try {
        const { data: weatherData, location } = await fetchWeather(lat, lon, key, unit);
        setData(weatherData);
        setLastFetchedAt(Date.now());
        setLocation(location);
      } catch (err) {
        setError((err as Error).message || "Could not load weather");
      }
    }

    const lat = settings.latitude as number | undefined;
    const lon = settings.longitude as number | undefined;

    if (lat && lon) {
      void load(lat, lon);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => void load(pos.coords.latitude, pos.coords.longitude),
        () => setError("Location unavailable — set coordinates in Settings"),
        { timeout: 8000, maximumAge: 600000 }
      );
    } else {
      setError("Geolocation not supported");
    }
  }, [setData, setError, setLocation, setLastFetchedAt]);
}
