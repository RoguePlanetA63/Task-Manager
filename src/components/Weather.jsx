import { useCallback, useEffect, useRef, useState } from 'react'

const REFRESH_INTERVAL_MS = 60 * 60 * 1000

export default function SidePanel() {
  const [weather, setWeather] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const intervalRef = useRef(null)
  const API_KEY = import.meta.env.VITE_OPENWEATHER_API_KEY

  const loadWeather = useCallback(() => {
    if (!API_KEY) {
      setError('Missing OpenWeather API key.')
      setLoading(false)
      return
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lon = position.coords.longitude

        try {
          const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
          )

          if (!response.ok) {
            throw new Error('Failed to fetch weather')
          }

          const data = await response.json()
          setWeather(data)
        } catch (err) {
          setError(err?.message ?? 'Unable to fetch weather data.')
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError('Location permission denied or unavailable.')
        setLoading(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 600000,
      },
    )
  }, [API_KEY])

  useEffect(() => {
    const t = setTimeout(() => loadWeather(), 0)
    intervalRef.current = window.setInterval(loadWeather, REFRESH_INTERVAL_MS)
    return () => {
      window.clearTimeout(t)
      window.clearInterval(intervalRef.current)
    }
  }, [loadWeather])

  return (
    <div className="side-panel">
      <h1 className="title">Weather</h1>

      <button className="button" onClick={loadWeather}>
        Refresh now
      </button>

      {loading && (
        <p className="message">Loading...</p>
      )}

      {!weather && !loading && !error && (
        <div className="placeholder">
          <h1 className="temp">--°</h1>
          <p className="placeholderText">Loading weather...</p>
        </div>
      )}

      {error && (
        <p className="error">{error}</p>
      )}

      {weather && (
        <>
          <img
            src={`https://openweathermap.org/img/wn/${weather?.weather?.[0]?.icon}@4x.png`}
            alt="weather icon"
            className="icon"
          />

          <h2 className="city">{weather?.name ?? '--'}</h2>

          <h1 className="temp">
            {weather?.main?.temp != null ? Math.round(weather.main.temp) : '--'}°C
          </h1>

          <p className="weatherMain">{weather?.weather?.[0]?.main ?? '--'}</p>

          <div className="infoCard">
            <span>Humidity</span>
            <strong>{weather?.main?.humidity ?? '--'}%</strong>
          </div>

          <div className="infoCard">
            <span>Wind</span>
            <strong>{weather?.wind?.speed ?? '--'} m/s</strong>
          </div>

          <div className="infoCard">
            <span>Feels Like</span>
            <strong>
              {weather?.main?.feels_like != null ? Math.round(weather.main.feels_like) : '--'}°C
            </strong>
          </div>
        </>
      )}
    </div>
  )
}
