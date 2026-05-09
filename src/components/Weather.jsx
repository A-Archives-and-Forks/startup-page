import React, { useState, useEffect, useMemo } from "react";
import { NeuroNoise } from "@paper-design/shaders-react";
import { HiArrowTopRightOnSquare } from "react-icons/hi2";
import { readSettings } from "@/lib/settings";
import VolumetricCloudscape from "@/components/VolumetricCloudscape";

const OPEN_METEO_CODES = {
  0: { weather: "Clear", description: "Clear sky" },
  1: { weather: "Clear", description: "Mainly clear" },
  2: { weather: "Clouds", description: "Partly cloudy" },
  3: { weather: "Clouds", description: "Overcast" },
  45: { weather: "Fog", description: "Fog" },
  48: { weather: "Fog", description: "Depositing rime fog" },
  51: { weather: "Drizzle", description: "Light drizzle" },
  53: { weather: "Drizzle", description: "Moderate drizzle" },
  55: { weather: "Drizzle", description: "Dense drizzle" },
  56: { weather: "Drizzle", description: "Light freezing drizzle" },
  57: { weather: "Drizzle", description: "Dense freezing drizzle" },
  61: { weather: "Rain", description: "Slight rain" },
  63: { weather: "Rain", description: "Moderate rain" },
  65: { weather: "Rain", description: "Heavy rain" },
  66: { weather: "Rain", description: "Light freezing rain" },
  67: { weather: "Rain", description: "Heavy freezing rain" },
  71: { weather: "Snow", description: "Slight snow" },
  73: { weather: "Snow", description: "Moderate snow" },
  75: { weather: "Snow", description: "Heavy snow" },
  77: { weather: "Snow", description: "Snow grains" },
  80: { weather: "Rain", description: "Slight rain showers" },
  81: { weather: "Rain", description: "Moderate rain showers" },
  82: { weather: "Rain", description: "Violent rain showers" },
  85: { weather: "Snow", description: "Slight snow showers" },
  86: { weather: "Snow", description: "Heavy snow showers" },
  95: { weather: "Thunderstorm", description: "Thunderstorm" },
  96: { weather: "Thunderstorm", description: "Thunderstorm with hail" },
  99: { weather: "Thunderstorm", description: "Thunderstorm with heavy hail" },
};

const CONDITION_GRADIENTS = {
  Clear: {
    day: "from-sky-400 via-blue-500 to-blue-400",
    night: "from-slate-950 via-indigo-950 to-slate-900",
  },
  Clouds: {
    day: "from-slate-800 via-slate-900 to-gray-900",
    night: "from-slate-800 via-slate-900 to-gray-900",
  },
  Rain: {
    day: "from-slate-700 via-slate-800 to-gray-800",
    night: "from-slate-950 via-gray-950 to-slate-900",
  },
  Drizzle: {
    day: "from-slate-500 via-slate-600 to-gray-600",
    night: "from-slate-900 via-gray-900 to-slate-950",
  },
  Snow: {
    day: "from-white via-sky-50 to-blue-100",
    night: "from-slate-800 via-blue-950 to-indigo-950",
  },
  Thunderstorm: {
    day: "from-gray-900 via-slate-800 to-purple-950",
    night: "from-gray-950 via-slate-950 to-purple-950",
  },
  Fog: {
    day: "from-gray-200 via-slate-300 to-gray-300",
    night: "from-gray-800 via-slate-800 to-gray-700",
  },
};

const SHADER_COLORS = {
  Clear: { day: ["#38bdf8", "#0284c7", "#0ea5e9"], night: ["#1e1b4b", "#312e81", "#0f172a"] },
  Clouds: { day: ["#475569", "#1f2937", "#111827"], night: ["#334155", "#1e293b", "#111827"] },
  Rain: { day: ["#334155", "#1e293b", "#475569"], night: ["#0f172a", "#1e293b", "#020617"] },
  Drizzle: { day: ["#475569", "#334155", "#64748b"], night: ["#1e293b", "#0f172a", "#334155"] },
  Snow: { day: ["#e0f2fe", "#bae6fd", "#7dd3fc"], night: ["#1e3a5f", "#172554", "#1e293b"] },
  Thunderstorm: { day: ["#581c87", "#1f2937", "#374151"], night: ["#3b0764", "#111827", "#1e1b4b"] },
  Fog: { day: ["#d1d5db", "#e5e7eb", "#9ca3af"], night: ["#374151", "#4b5563", "#334155"] },
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getConditionCategory(weather) {
  if (CONDITION_GRADIENTS[weather]) return weather;
  return "Clouds";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTimePhase(data) {
  const currentTime = data.current?.time ? new Date(data.current.time).getTime() : Date.now();
  const sunrise = data.daily?.sunrise?.[0] ? new Date(data.daily.sunrise[0]).getTime() : null;
  const sunset = data.daily?.sunset?.[0] ? new Date(data.daily.sunset[0]).getTime() : null;
  const sunriseWindow = 90 * 60 * 1000;
  const sunsetLeadWindow = 150 * 60 * 1000;
  const sunsetTrailWindow = 120 * 60 * 1000;

  if (sunrise && currentTime < sunrise) {
    return currentTime >= sunrise - sunriseWindow
      ? 2 - clamp((currentTime - (sunrise - sunriseWindow)) / sunriseWindow, 0, 1)
      : 2;
  }

  if (sunrise && currentTime < sunrise + sunriseWindow) {
    return 1 - clamp((currentTime - sunrise) / sunriseWindow, 0, 1);
  }

  if (sunset && currentTime < sunset) {
    return currentTime >= sunset - sunsetLeadWindow
      ? clamp((currentTime - (sunset - sunsetLeadWindow)) / sunsetLeadWindow, 0, 1)
      : 0;
  }

  if (sunset && currentTime < sunset + sunsetTrailWindow) {
    return 1 + clamp((currentTime - sunset) / sunsetTrailWindow, 0, 1);
  }

  return data.current?.is_day === 0 ? 2 : 0;
}

function getCloudCoverage(weatherCode, condition) {
  if (condition === "Thunderstorm") return "storm";
  if (condition === "Rain" || condition === "Drizzle") return "full";
  if (weatherCode === 2) return "partly";
  if (weatherCode === 3) return "full";
  return "none";
}

function RainDrops() {
  const drops = useMemo(() =>
    Array.from({ length: 40 }, () => ({
      left: `${Math.random() * 100}%`,
      top: `-${Math.random() * 20}%`,
      height: `${12 + Math.random() * 18}px`,
      duration: `${0.6 + Math.random() * 0.4}s`,
      delay: `${Math.random() * 2}s`,
    })), []);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {drops.map((d, i) => (
        <div key={i} className="absolute w-[1px] bg-white/20 rounded-full" style={{
          left: d.left, top: d.top, height: d.height,
          animation: `weather-rain-fall ${d.duration} linear infinite`,
          animationDelay: d.delay,
        }} />
      ))}
    </div>
  );
}

function ClearSky({ phase }) {
  return <VolumetricCloudscape coverage="none" phase={phase} />;
}

function FogLayer() {
  return (
    <div className="weather-fog-layer absolute inset-0 overflow-hidden pointer-events-none" />
  );
}

function SnowFlakes({ heavy = false }) {
  const flakes = useMemo(() =>
    Array.from({ length: heavy ? 68 : 34 }, () => {
      const size = `${2 + Math.random() * (heavy ? 5 : 3)}px`;
      return {
        left: `${Math.random() * 100}%`,
        top: `-${Math.random() * 10}%`,
        width: size, height: size,
        opacity: 0.42 + Math.random() * (heavy ? 0.5 : 0.34),
        duration: `${heavy ? 1.9 : 3.2 + Math.random() * 3.4}s`,
        delay: `${Math.random() * (heavy ? 2.5 : 5)}s`,
      };
    }), [heavy]);
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${heavy ? "weather-heavy-snow" : ""}`}>
      {flakes.map((f, i) => (
        <div key={i} className="absolute rounded-full bg-white/60" style={{
          left: f.left, top: f.top, width: f.width, height: f.height, opacity: f.opacity,
          animation: `weather-snow-fall ${f.duration} linear infinite`,
          animationDelay: f.delay,
        }} />
      ))}
    </div>
  );
}

function Stars() {
  const stars = useMemo(() =>
    Array.from({ length: 220 }, () => {
      const sizeValue = Math.random() < 0.78
        ? 0.38 + Math.random() * 0.62
        : 1 + Math.random() * 0.85;
      const size = `${sizeValue}px`;
      return {
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 86}%`,
        width: size, height: size,
        opacity: 0.36 + Math.random() * 0.58,
        duration: `${2 + Math.random() * 3}s`,
        delay: `${Math.random() * 3}s`,
      };
    }), []);
  return (
    <div className="weather-stars-layer absolute inset-0 z-[8] overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <div key={i} className="absolute rounded-full bg-white" style={{
          left: s.left, top: s.top, width: s.width, height: s.height, opacity: s.opacity,
          animation: `weather-star-twinkle ${s.duration} ease-in-out infinite`,
          animationDelay: s.delay,
        }} />
      ))}
    </div>
  );
}

function Lightning() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-white/0" style={{ animation: "weather-lightning 4s ease-in-out infinite" }} />
      <div className="absolute inset-0 bg-white/0" style={{ animation: "weather-lightning 7s ease-in-out infinite", animationDelay: "2s" }} />
    </div>
  );
}

function CloudLayers({ coverage, phase }) {
  return <VolumetricCloudscape coverage={coverage} phase={phase} />;
}

function WeatherBox() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [location, setLocation] = useState("Weather");

  useEffect(() => {
    const settings = readSettings();
    const unit = settings.units || "imperial";
    const key = settings.openWeatherCredential;

    async function fetchWeather(lat, lon) {
      const tempUnit = unit === "imperial" ? "fahrenheit" : "celsius";
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,is_day&daily=weather_code,temperature_2m_max,precipitation_probability_max,sunrise,sunset&temperature_unit=${tempUnit}&timezone=auto&forecast_days=5`;

      const response = await fetch(url);
      const json = await response.json();
      if (!response.ok) throw new Error(json?.reason || "Open-Meteo request failed");

      setData({ ...json, unit });

      if (key) {
        try {
          const owmRes = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${key}`);
          const owmData = await owmRes.json();
          if (owmRes.ok && owmData.name) { setLocation(owmData.name); return; }
        } catch {}
      }

      try {
        const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`);
        const geoData = await geoRes.json();
        if (geoData?.address?.city) setLocation(geoData.address.city);
        else if (geoData?.address?.town) setLocation(geoData.address.town);
        else if (geoData?.display_name) setLocation(geoData.display_name.split(",")[0]);
        else setLocation(`${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`);
      } catch {
        setLocation(`${Number(lat).toFixed(2)}, ${Number(lon).toFixed(2)}`);
      }
    }

    function loadFromCoords(lat, lon) {
      fetchWeather(lat, lon).catch((err) => setError(err.message || "Could not load forecast"));
    }

    if (settings.latitude && settings.longitude) {
      loadFromCoords(settings.latitude, settings.longitude);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadFromCoords(pos.coords.latitude, pos.coords.longitude),
        () => setError("Location unavailable — set coordinates in settings")
      );
    } else {
      setError("Geolocation not supported");
    }
  }, []);

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center rounded-[inherit] bg-muted/50 p-4 text-center text-muted-foreground">
        <p className="text-sm font-medium">Weather unavailable</p>
        <p className="mt-1 text-xs opacity-70">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[inherit] bg-muted/30">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
      </div>
    );
  }

  const weatherCode = data.current?.weather_code ?? 3;
  const mapped = OPEN_METEO_CODES[weatherCode] || { weather: "Clouds", description: "Current conditions" };
  const condition = getConditionCategory(mapped.weather);
  const dayTime = data.current?.is_day === 1 || (data.current?.is_day === undefined);
  const timeKey = dayTime ? "day" : "night";
  const timePhase = getTimePhase(data);
  const cloudCoverage = getCloudCoverage(weatherCode, condition);
  const gradient = CONDITION_GRADIENTS[condition]?.[timeKey] || CONDITION_GRADIENTS.Clouds.day;
  const shaderColors = SHADER_COLORS[condition]?.[timeKey] || SHADER_COLORS.Clouds.day;
  const temperature = Math.round(data.current?.temperature_2m ?? 0);
  const unitLabel = data.unit === "imperial" ? "F" : "C";
  const isSnowDay = condition === "Snow" && dayTime;
  const isFogDay = condition === "Fog" && dayTime;
  const isHeavySnow = [75, 86].includes(weatherCode);
  const darkText = isSnowDay || isFogDay;
  const textColor = darkText ? "text-slate-800" : "text-white";
  const textColorMuted = darkText ? "text-slate-600" : "text-white/70";
  const shaderOpacity = condition === "Clear" && dayTime ? "opacity-[0.12]" : "opacity-[0.3]";

  return (
    <div className="group/weather flex h-full w-full flex-col rounded-[inherit] overflow-hidden">
      {/* Top section - Current weather */}
      <div className={`relative flex flex-1 flex-col justify-between bg-gradient-to-br ${gradient} p-4`}>
        {/* Shader overlay */}
        <div className={`absolute inset-0 ${shaderOpacity} mix-blend-soft-light pointer-events-none`}>
          <NeuroNoise
            colorFront={shaderColors[0]}
            colorMid={shaderColors[1]}
            colorBack={shaderColors[2]}
            speed={0.5}
            scale={1.5}
            brightness={0.7}
            contrast={0.5}
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        {/* Condition-specific effects */}
        {condition === "Clear" && <ClearSky phase={timePhase} />}
        {cloudCoverage !== "none" && <CloudLayers coverage={cloudCoverage} phase={timePhase} />}
        {(condition === "Rain" || condition === "Drizzle") && <RainDrops />}
        {condition === "Snow" && <CloudLayers coverage={isHeavySnow ? "storm" : "full"} phase={isHeavySnow ? "storm" : timePhase} />}
        {condition === "Snow" && <SnowFlakes heavy={isHeavySnow} />}
        {condition === "Fog" && <FogLayer />}
        {condition === "Thunderstorm" && (<><RainDrops /><Lightning /></>)}
        {((condition === "Clear" && !dayTime) || (condition === "Clouds" && !dayTime && cloudCoverage === "partly")) && <Stars />}

        {/* Weather content */}
        <div className="relative z-10 flex items-start justify-between">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-widest ${textColorMuted}`}>
              {location}
            </p>
            <p className={`mt-1 text-4xl font-bold tracking-tight ${textColor}`}>
              {temperature}°
            </p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${textColor}`}>
              {mapped.description}
            </p>
            <p className={`mt-0.5 text-[10px] ${textColorMuted}`}>
              °{unitLabel} · Open-Meteo
            </p>
          </div>
        </div>

        {/* Preview button */}
        <div className="relative z-10 flex justify-end">
          <a
            href="#/weather-preview"
            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium opacity-0 transition-opacity group-hover/weather:opacity-100 ${darkText ? "text-slate-600 hover:bg-black/5" : "text-white/50 hover:bg-white/10"}`}
          >
            Preview all
            <HiArrowTopRightOnSquare className="h-2.5 w-2.5" />
          </a>
        </div>
      </div>

      {/* Bottom section - 5-day forecast */}
      <div className="flex items-center justify-between bg-black/90 px-3 py-2.5">
        {data.daily?.time?.map((date, i) => {
          const dayDate = new Date(date + "T00:00:00");
          const dayName = i === 0 ? "Today" : DAY_NAMES[dayDate.getDay()];
          const high = Math.round(data.daily.temperature_2m_max?.[i] ?? 0);
          const precip = data.daily.precipitation_probability_max?.[i] ?? 0;

          return (
            <div key={date} className="flex flex-col items-center gap-0.5 min-w-0 flex-1">
              <span className="text-[10px] font-medium text-white/60">{dayName}</span>
              <span className="text-sm font-semibold text-white">{high}°</span>
              {precip > 0 && <span className="text-[9px] text-blue-300">{precip}%</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default WeatherBox;
