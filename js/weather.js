// Weather widget data fetching and display updates.

const DEFAULT_LAT = 48.8566;
const DEFAULT_LON = 2.3522;
const LAT_MIN = -90;
const LAT_MAX = 90;
const LON_MIN = -180;
const LON_MAX = 180;

const weatherCodeMap = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm"
};

const CITY_NAME_TOGGLE_KEY = 'weatherSettings.showCityName';
const TEMP_UNIT_KEY = 'weatherSettings.temperatureUnit';

function getTemperatureUnit() {
  // Celsius is the fallback when no unit preference has been saved.
  return localStorage.getItem(TEMP_UNIT_KEY) === 'fahrenheit' ? 'fahrenheit' : 'celsius';
}

function sanitizeCoordinate(rawValue, min, max, fallback) {
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < min || value > max) {
    return fallback;
  }

  return value;
}

function getCoords() {
  const lat = sanitizeCoordinate(localStorage.getItem('startpage_weather_lat'), LAT_MIN, LAT_MAX, DEFAULT_LAT);
  const lon = sanitizeCoordinate(localStorage.getItem('startpage_weather_lon'), LON_MIN, LON_MAX, DEFAULT_LON);
  return { lat, lon };
}

// Read the city selected in the Weather settings panel. A coordinate-only
// location has no city label, so return null when no city object is stored.
function getSelectedCityName() {
  try {
    const raw = localStorage.getItem('weatherSettings.selectedCity');
    if (!raw) return null;
    const city = JSON.parse(raw);
    return city && city.name ? city.name : null;
  } catch {
    return null;
  }
}

// Create the optional city label on demand so the base markup can stay minimal.
function ensureCityLabelEl() {
  let el = document.getElementById('weather-city');
  if (el) return el;

  const tempEl = document.getElementById('weather-temp');
  if (!tempEl || !tempEl.parentElement) return null;

  el = document.createElement('div');
  el.id = 'weather-city';
  el.className = 'weather-city';
  tempEl.parentElement.insertBefore(el, tempEl);
  return el;
}

function updateCityLabel() {
  const cityEl = ensureCityLabelEl();
  if (!cityEl) return;

  // The label is enabled unless the user explicitly turns it off.
  const showCityName = localStorage.getItem(CITY_NAME_TOGGLE_KEY) !== 'false';
  const name = showCityName ? getSelectedCityName() : null;

  if (name) {
    cityEl.textContent = name;
    cityEl.classList.remove('hidden');
  } else {
    cityEl.textContent = '';
    cityEl.classList.add('hidden');
  }
}

function renderWeatherError() {
  const tempEl = document.getElementById('weather-temp');
  const highlowEl = document.getElementById('weather-highlow');
  const descEl = document.getElementById('weather-desc');

  if (tempEl) tempEl.textContent = '--';
  if (highlowEl) highlowEl.textContent = 'Weather unavailable';
  if (descEl) descEl.textContent = 'Unable to load weather';
}

async function updateWeather() {
  updateCityLabel();
  const { lat, lon } = getCoords();
  const unit = getTemperatureUnit();
  const unitParam = unit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '';
  const symbol = unit === 'fahrenheit' ? '°F' : '°C';
  try {
    const safeLat = encodeURIComponent(String(lat));
    const safeLon = encodeURIComponent(String(lon));
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${safeLat}&longitude=${safeLon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto${unitParam}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Weather API responded ${res.status}`);

    const data = await res.json();
    const currentTemperature = data?.current?.temperature_2m;
    const weatherCode = data?.current?.weather_code;
    const highTemperature = data?.daily?.temperature_2m_max?.[0];
    const lowTemperature = data?.daily?.temperature_2m_min?.[0];

    if (![currentTemperature, weatherCode, highTemperature, lowTemperature].every(Number.isFinite)) {
      throw new Error('Weather API returned an incomplete response');
    }
    
    const tempEl = document.getElementById('weather-temp');
    const highlowEl = document.getElementById('weather-highlow');
    const descEl = document.getElementById('weather-desc');

    if (tempEl) tempEl.textContent = `${Math.round(currentTemperature)}${symbol}`;
    if (highlowEl) highlowEl.textContent = `H: ${Math.round(highTemperature)}${symbol} L: ${Math.round(lowTemperature)}${symbol}`;
    if (descEl) descEl.textContent = weatherCodeMap[weatherCode] || "Unknown";
  } catch (err) {
    console.error("Weather fetch error:", err);
    renderWeatherError();
  }
}

// Location is selected in the Weather settings panel; this file reads the
// saved coordinates and renders the resulting forecast.

// Wait until the widget elements exist before the first request.
document.addEventListener('DOMContentLoaded', () => {
  // Refresh immediately, then update every 15 minutes.
  updateWeather();
  setInterval(updateWeather, 15 * 60 * 1000);
});