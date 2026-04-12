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

export interface WeatherService {
  getCurrentByCity(city: string): Promise<CurrentWeatherFacts>;
  formatFactsForLlm(facts: CurrentWeatherFacts): string;
}

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
  cod?: string | number;
};

export class OpenWeatherService implements WeatherService {
  private readonly http: AxiosInstance;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.http = axios.create({
      baseURL: "https://api.openweathermap.org/data/2.5",
      timeout: 12_000,
    });
  }

  async getCurrentByCity(city: string): Promise<CurrentWeatherFacts> {
    const trimmed = city.trim();
    if (!trimmed) {
      throw new Error("empty_city");
    }

    try {
      const { data, status } = await this.http.get<OwmResponse>("/weather", {
        params: {
          q: trimmed,
          appid: this.apiKey,
          units: "metric",
          lang: "ru",
        },
        validateStatus: () => true,
      });

      const cod = data.cod;
      if (status === 404 || cod === "404" || cod === 404) {
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
  }

  formatFactsForLlm(facts: CurrentWeatherFacts): string {
    const lines = [
      `Город: ${facts.cityName}${facts.country ? ", " + facts.country : ""}`,
      `Температура: ${facts.tempC} °C (ощущается как ${facts.feelsLikeC} °C)`,
      `Условия: ${facts.description}`,
      `Влажность: ${facts.humidityPct}%`,
      `Давление: ${facts.pressureHpa} гПа`,
    ];
    if (facts.windMs != null) lines.push(`Ветер: ${facts.windMs} м/с`);
    return lines.join("\n");
  }
}
