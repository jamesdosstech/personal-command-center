import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

import {
  CurrentWeather,
  WeatherData,
  WeatherLocation,
} from '../models/weather.model';

interface GeocodingResponse {
  results?: Array<{
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  }>;
}

interface ForecastResponse {
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
    precipitation: number;
    weather_code: number;
    is_day: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class WeatherService {
  private readonly http = inject(HttpClient);

  private readonly geocodingUrl =
    'https://geocoding-api.open-meteo.com/v1/search';

  private readonly forecastUrl = 'https://api.open-meteo.com/v1/forecast';

  private readonly weatherState = signal<WeatherData | null>(null);

  readonly weather = this.weatherState.asReadonly();

  readonly loading = signal(false);

  readonly error = signal<string | null>(null);

  async loadWeather(city: string): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      const location = await this.geocodeCity(city);

      if (!location) {
        throw new Error('Location not found.');
      }

      const current = await this.getCurrentWeather(location);

      this.weatherState.set({
        location,
        current,
      });
    } catch (error) {
      console.error('Weather error:', error);

      this.error.set('Unable to load weather right now.');
    } finally {
      this.loading.set(false);
    }
  }

  private async geocodeCity(city: string): Promise<WeatherLocation | null> {
    const params = new HttpParams()
      .set('name', city)
      .set('count', '1')
      .set('language', 'en')
      .set('format', 'json');

    const response = await firstValueFrom(
      this.http.get<GeocodingResponse>(this.geocodingUrl, { params })
    );

    const result = response.results?.[0];

    if (!result) {
      return null;
    }

    return {
      name: result.name,
      latitude: result.latitude,
      longitude: result.longitude,
      timezone: result.timezone,
    };
  }

  private async getCurrentWeather(
    location: WeatherLocation
  ): Promise<CurrentWeather> {
    const params = new HttpParams()
      .set('latitude', location.latitude)
      .set('longitude', location.longitude)
      .set(
        'current',
        [
          'temperature_2m',
          'apparent_temperature',
          'relative_humidity_2m',
          'wind_speed_10m',
          'precipitation',
          'weather_code',
          'is_day',
        ].join(',')
      )
      .set('temperature_unit', 'fahrenheit')
      .set('wind_speed_unit', 'mph')
      .set('timezone', 'auto');

    const response = await firstValueFrom(
      this.http.get<ForecastResponse>(this.forecastUrl, { params })
    );

    return {
      temperature: response.current.temperature_2m,
      apparentTemperature: response.current.apparent_temperature,
      humidity: response.current.relative_humidity_2m,
      windSpeed: response.current.wind_speed_10m,
      precipitation: response.current.precipitation,
      weatherCode: response.current.weather_code,
      isDay: response.current.is_day === 1,
    };
  }
}
