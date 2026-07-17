const WMO_LABELS = {
  0: 'Clear',
  1: 'Mostly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Icy fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Heavy drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunderstorm',
  96: 'Storm + hail',
  99: 'Severe storm',
}

export function weatherLabel(code) {
  return WMO_LABELS[code] ?? 'Unknown'
}

export async function fetchPlaceName(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  })
  const response = await fetch(
    `https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`,
  )
  if (!response.ok) return null
  const data = await response.json()
  const city =
    data.city ||
    data.locality ||
    data.principalSubdivision ||
    data.countryName
  if (!city) return null
  const region = data.principalSubdivision
  if (region && region !== city) return `${city}, ${region}`
  if (data.countryName && data.countryName !== city) {
    return `${city}, ${data.countryName}`
  }
  return city
}

export async function fetchCurrentWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'precipitation',
      'is_day',
    ].join(','),
    timezone: 'auto',
  })

  const [response, place] = await Promise.all([
    fetch(`https://api.open-meteo.com/v1/forecast?${params}`),
    fetchPlaceName(latitude, longitude),
  ])
  if (!response.ok) throw new Error(`Weather ${response.status}`)
  const data = await response.json()
  const current = data.current
  if (!current) throw new Error('No current weather')

  return {
    temperature: current.temperature_2m,
    feelsLike: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    precipitation: current.precipitation,
    code: current.weather_code,
    isDay: Boolean(current.is_day),
    label: weatherLabel(current.weather_code),
    timezone: data.timezone,
    place: place || data.timezone?.replace(/_/g, ' ') || 'Local',
  }
}

export function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation unavailable'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 30 * 60 * 1000 },
    )
  })
}
