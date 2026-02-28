"use client"

import React from "react"

export interface WeatherData {
  city: string
  country: string
  temp: string
  feelsLike: string
  description: string
  weatherCode: number
  humidity: string
  windspeed: string
  high: string
  low: string
  sunrise: string
  sunset: string
  datetime: string
  hourly: Array<{
    label: string
    temp: string
    weatherCode: number
    description: string
  }>
}

// Map wttr.in weather codes to emoji
function weatherEmoji(code: number): string {
  if (code === 113) return "☀️"
  if (code === 116) return "⛅"
  if (code === 119 || code === 122) return "☁️"
  if (code === 143 || code === 248 || code === 260) return "🌫️"
  if ([176, 263, 266, 293, 296, 353].includes(code)) return "🌦️"
  if ([299, 302, 305, 308, 356, 359].includes(code)) return "🌧️"
  if ([200, 386, 389, 392, 395].includes(code)) return "⛈️"
  if ([227, 229, 323, 326, 329, 332, 335, 338, 368, 371, 395].includes(code)) return "❄️"
  if ([281, 284, 311, 314, 317, 320, 350, 374, 377].includes(code)) return "🌨️"
  if (code >= 380) return "⛈️"
  return "🌤️"
}

// Background gradient based on weather code
function bgGradient(code: number): string {
  if (code === 113) return "from-blue-400 via-sky-400 to-blue-500"           // Sunny
  if (code === 116) return "from-blue-400 via-sky-500 to-indigo-500"         // Partly cloudy
  if (code === 119 || code === 122) return "from-slate-400 via-slate-500 to-slate-600"  // Cloudy
  if ([248, 260, 143].includes(code)) return "from-gray-400 via-gray-500 to-gray-600"   // Fog
  if (code >= 200 && code < 400) return "from-slate-500 via-blue-700 to-indigo-800"    // Rain/Storm
  return "from-blue-400 via-blue-500 to-indigo-600"                          // Default
}

interface WeatherCardProps {
  data: WeatherData
}

export function WeatherCard({ data }: WeatherCardProps) {
  const emoji = weatherEmoji(data.weatherCode)
  const gradient = bgGradient(data.weatherCode)

  return (
    <div
      className={`bg-gradient-to-br ${gradient} rounded-2xl p-4 w-full max-w-sm text-white shadow-xl select-none`}
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif" }}
    >
      {/* Top row: city + datetime */}
      <div className="flex items-start justify-between mb-3">
        <span className="text-base font-semibold tracking-tight">{data.city}</span>
        <span className="text-xs text-white/80 text-right leading-tight">
          {data.datetime}
        </span>
      </div>

      {/* Main temperature row */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-4xl leading-none">{emoji}</span>
          <span className="text-5xl font-thin leading-none tracking-tight">
            {data.temp}°<span className="text-3xl">C</span>
          </span>
        </div>
        <div className="text-right text-sm leading-relaxed text-white/90">
          <div className="font-medium">H: {data.high}°</div>
          <div className="font-medium">L: {data.low}°</div>
        </div>
      </div>

      {/* Hourly Forecast */}
      <div className="bg-white/15 backdrop-blur-sm rounded-xl p-3 mb-3">
        <p className="text-xs font-semibold text-white/80 mb-3 tracking-wide uppercase">
          Hourly Forecast
        </p>
        <div className="flex justify-between">
          {data.hourly.map((slot, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5 min-w-0 flex-1">
              <span className="text-xs font-bold text-white tabular-nums">{slot.label}</span>
              <span className="text-lg leading-none">{weatherEmoji(slot.weatherCode)}</span>
              <span className="text-xs font-medium text-white/90 tabular-nums">{slot.temp}°</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom row: sunrise / sunset */}
      <div className="flex justify-between text-xs text-white/80 px-0.5">
        <span>Sunrise: {data.sunrise}</span>
        <span>Sunset: {data.sunset}</span>
      </div>
    </div>
  )
}
