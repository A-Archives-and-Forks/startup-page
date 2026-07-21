import { create } from "zustand";
import type { ForecastDay, WeatherData } from "@/features/weather/types/weather";

export interface SelectedWeatherDay {
  day: ForecastDay;
  unit: "imperial" | "metric";
}

interface WeatherStore {
  data: WeatherData | null;
  error: string | null;
  location: string;
  lat: number | null;
  lon: number | null;
  clockTime: number;
  lastFetchedAt: number | null;
  selectedDay: SelectedWeatherDay | null;
  /** Bumped on every "open the weather card" click — FeaturePanel watches this
      to jump to the weather mode. A counter (not a boolean) so clicking the
      same day/state twice still re-triggers the navigation. */
  weatherCardFocusToken: number;
  setData: (data: WeatherData) => void;
  setError: (error: string) => void;
  setLocation: (location: string) => void;
  setCoords: (lat: number, lon: number) => void;
  setLastFetchedAt: (time: number) => void;
  /** Sets which day to show (or null for "today") and requests FeaturePanel focus it. */
  openWeatherCard: (selectedDay?: SelectedWeatherDay | null) => void;
  tickClock: () => void;
}

export const useWeatherStore = create<WeatherStore>((set) => ({
  data: null,
  error: null,
  location: "Weather",
  lat: null,
  lon: null,
  clockTime: Date.now(),
  lastFetchedAt: null,
  selectedDay: null,
  weatherCardFocusToken: 0,
  setData:           (data)     => set({ data }),
  setError:          (error)    => set({ error }),
  setLocation:       (location) => set({ location }),
  setCoords:         (lat, lon) => set({ lat, lon }),
  setLastFetchedAt:  (time)     => set({ lastFetchedAt: time }),
  openWeatherCard:   (selectedDay = null) =>
    set((state) => ({ selectedDay, weatherCardFocusToken: state.weatherCardFocusToken + 1 })),
  tickClock:         ()         => set({ clockTime: Date.now() }),
}));
