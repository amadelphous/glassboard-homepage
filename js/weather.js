// ==========================================
// WEATHER WIDGET & LOCATION MODAL CONTROLS
// ==========================================

const DEFAULT_LAT = 48.8566;
const DEFAULT_LON = 2.3522;

const weatherCodeMap = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Freezing rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
  80: "Light showers", 81: "Showers", 82: "Heavy showers", 85: "Snow showers", 86: "Heavy snow showers",
  95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Severe thunderstorm"
};

function getCoords() {
  const lat = localStorage.getItem('startpage_weather_lat') || DEFAULT_LAT;
  const lon = localStorage.getItem('startpage_weather_lon') || DEFAULT_LON;
  return { lat, lon };
}

async function updateWeather() {
  const { lat, lon } = getCoords();
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto`;
    const res = await fetch(url);
    const data = await res.json();
    
    const tempEl = document.getElementById('weather-temp');
    const highlowEl = document.getElementById('weather-highlow');
    const descEl = document.getElementById('weather-desc');

    if (tempEl) tempEl.textContent = `${Math.round(data.current.temperature_2m)}°C`;
    if (highlowEl) highlowEl.textContent = `H: ${Math.round(data.daily.temperature_2m_max[0])}° L: ${Math.round(data.daily.temperature_2m_min[0])}°`;
    if (descEl) descEl.textContent = weatherCodeMap[data.current.weather_code] || "Unknown";
  } catch (err) {
    console.error("Weather fetch error:", err);
  }
}

function openWeatherModal() {
  const modal = document.getElementById('location-modal');
  const input = document.getElementById('modal-coords-input');
  if (!modal) return console.error("Could not find #location-modal");
  
  const { lat, lon } = getCoords();
  if (input) input.value = `${lat}, ${lon}`;
  
  modal.classList.remove('hidden');
  setTimeout(() => input?.focus(), 50);
}

function closeWeatherModal() {
  const modal = document.getElementById('location-modal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function saveWeatherCoords() {
  const input = document.getElementById('modal-coords-input');
  if (!input) return;
  const val = input.value.trim();
  if (val) {
    const parts = val.split(',').map(p => p.trim());
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      localStorage.setItem('startpage_weather_lat', parts[0]);
      localStorage.setItem('startpage_weather_lon', parts[1]);
      updateWeather();
      closeWeatherModal();
      return;
    }
  }
  alert("Invalid format! Enter as: Latitude, Longitude (e.g. 48.8566, 2.3522)");
}

// WRAPPED IN DOMCONTENTLOADED SO NODES ARE ACTUALLY ACCESSIBLE
document.addEventListener('DOMContentLoaded', () => {
  const gearBtn = document.getElementById('weather-settings-btn');
  if (gearBtn) {
    gearBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openWeatherModal();
    });
  }

  const weatherBox = document.getElementById('weather');
  if (weatherBox) {
    weatherBox.addEventListener('click', () => {
      openWeatherModal();
    });
  }

  const cancelBtn = document.getElementById('modal-cancel-btn');
  if (cancelBtn) cancelBtn.addEventListener('click', closeWeatherModal);

  const saveBtn = document.getElementById('modal-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', saveWeatherCoords);

  const modalEl = document.getElementById('location-modal');
  if (modalEl) {
    modalEl.addEventListener('click', (e) => {
      if (e.target === modalEl) closeWeatherModal();
    });
  }

  // Initial fetch
  updateWeather();
  setInterval(updateWeather, 15 * 60 * 1000);
});

// This script and its functions control the weather widget and location modal.
// They can be edited if you want to change the behavior of the weather widget or modal, 
// but it is not recommended to change them unless you know what you are doing. 
// Breaking these functions will cause the weather widget and modal to stop working
// and will require grabbing a clean copy of weather.js from the repository and
// replacing the broken one with it.

// Note: A part of this function is wrapped in a DOMContentLoaded event listener 
// to ensure that the DOM nodes are accessible when the script runs.

// Note 2: The weather widget fetches data from the Open-Meteo API. 
// If the API changes or becomes unavailable, the widget may stop working.

// Note 3: The location modal allows users to input their latitude and longitude to 
// customize the weather data displayed. The default location is set to 
// Paris, France (48.8566, 2.3522). You can change the fallback by editing lines
// of this file near the top. DEFAULT_LAT is the default latitude and DEFAULT_LON is 
// the default longitude.