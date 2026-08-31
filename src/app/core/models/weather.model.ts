export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
}

export interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
}
