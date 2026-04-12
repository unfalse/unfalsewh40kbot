import axios, { type AxiosInstance } from "axios";

export type CurrentWeatherFacts = {
  cityName: string;
  country?: string;
  tempC: number;
  feelsLikeC: number;
  description: string;
  humidityPct: number;
  pressureHpa: number;
  windMs?: number;
};

type OwmResponse = {
  name: string;
  sys?: { country?: string };
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{ description: string }>;
  wind?: { speed?: number };
};

function toFactString(w: CurrentWeatherFacts): string {
  const lines = [
    `Город: ${w.cityName}${w.country ? ", " + w.country : ""}`,
    `Температура: ${w.tempC} °C (ощущается как ${w.feelsLikeC} °C)`,
    `Условия: ${w.description}`,
    `Влажность: ${w.humidityPct}%`,
    `Давление: ${w.pressureHpa} гПа`,
  ];
  if (w.windMs != null) lines.push(`Ветер: ${w.windMs} м/с`);
  return lines.join("\n");
}

export type WeatherService = {
  getCurrentByCity(city: string): Promise<CurrentWeatherFacts>;
  formatFactsForLlm(facts: CurrentWeatherFacts): string;
};

export function createWeatherService(apiKey: string): WeatherService {
  const http: AxiosInstance = axios.create({
    baseURL: "https://api.openweathermap.org/data/2.5",
    timeout: 12_000,
  });

  return {
    async getCurrentByCity(city: string): Promise<CurrentWeatherFacts> {
      const trimmed = city.trim();
      if (!trimmed) {
        throw new Error("empty_city");
      }

      try {
        const { data, status } = await http.get<OwmResponse>("/weather", {
          params: {
            q: trimmed,
            appid: apiKey,
            units: "metric",
            lang: "ru",
          },
          validateStatus: () => true,
        });

        const cod = (data as { cod?: string | number }).cod;
        if (
          status === 404 ||
          cod === "404" ||
          cod === 404
        ) {
          throw new Error("city_not_found");
        }
        if (status !== 200) {
          throw new Error(`owm_http_${status}`);
        }
        if (cod != null && Number(cod) !== 200) {
          throw new Error(`owm_${String(cod)}`);
        }

        const desc = data.weather[0]?.description ?? "неизвестно";
        return {
          cityName: data.name,
          country: data.sys?.country,
          tempC: data.main.temp,
          feelsLikeC: data.main.feels_like,
          description: desc,
          humidityPct: data.main.humidity,
          pressureHpa: data.main.pressure,
          windMs: data.wind?.speed,
        };
      } catch (e) {
        if (axios.isAxiosError(e) && e.code === "ECONNABORTED") {
          throw new Error("timeout");
        }
        throw e;
      }
    },

    formatFactsForLlm(facts: CurrentWeatherFacts): string {
      return toFactString(facts);
    },
  };
}
