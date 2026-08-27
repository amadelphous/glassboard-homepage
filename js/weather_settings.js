/**
 * js/weather_settings.js
 * -----------------------------------------------------------------------
 * Populates the "Weather" tab of the Settings modal with a searchable
 * city grid backed by Open-Meteo's free Geocoding API.
 *
 *   - Empty search box  -> shows the 10 hardcoded default cities
 *   - Typed search       -> debounced 500ms, fetches up to 10 results
 *                           from Open-Meteo and swaps them into the grid
 *   - "Select" button    -> persists the chosen city to localStorage
 *
 * Loaded as a plain <script> (no modules), matching the rest of the
 * project's script stack. Self-initializes on #weather-settings-panel
 * once the DOM is ready — no manual wiring needed elsewhere.
 * -----------------------------------------------------------------------
 */
(function () {
  "use strict";

  // The 2x5 grid of defaults shown before the user searches for anything.
  const DEFAULT_CITIES = [
    { name: "New York", admin1: "New York", country: "US", lat: 40.7128, lon: -74.0060 },
    { name: "Los Angeles", admin1: "California", country: "US", lat: 34.0522, lon: -118.2437 },
    { name: "London", admin1: null, country: "GB", lat: 51.5074, lon: -0.1278 },
    { name: "Tokyo", admin1: "Tokyo", country: "JP", lat: 35.6762, lon: 139.6503 },
    { name: "Seoul", admin1: null, country: "KR", lat: 37.5665, lon: 126.9780 },
    { name: "Shanghai", admin1: null, country: "CN", lat: 31.2304, lon: 121.4737 },
    { name: "Paris", admin1: "Île-de-France", country: "FR", lat: 48.8566, lon: 2.3522 },
    { name: "Berlin", admin1: null, country: "DE", lat: 52.5200, lon: 13.4050 },
    { name: "Sydney", admin1: "New South Wales", country: "AU", lat: -33.8688, lon: 151.2093 },
    { name: "Jakarta", admin1: null, country: "ID", lat: -6.2088, lon: 106.8456 },
  ];

  const GEOCODING_ENDPOINT = "https://geocoding-api.open-meteo.com/v1/search";
  const DEBOUNCE_MS = 500;
  const RESULT_COUNT = 10;
  const STORAGE_KEY = "weatherSettings.selectedCity";
  const CITY_NAME_TOGGLE_KEY = "weatherSettings.showCityName";
  const TEMP_UNIT_KEY = "weatherSettings.temperatureUnit";

  // Mirrors DEFAULT_LAT / DEFAULT_LON in weather.js.
  const FALLBACK_LAT = 48.8566;
  const FALLBACK_LON = 2.3522;

  class WeatherCitySettings {
    constructor(container, options = {}) {
      if (!container) throw new Error("WeatherCitySettings: container is required");

      this.container = container;
      this.storageKey = options.storageKey || STORAGE_KEY;
      this.iconPath = options.iconPath || "./svg/search.svg";
      this.onSelect = options.onSelect || null;

      this.debounceTimer = null;
      this.activeController = null;
      this.selectedCity = this.readSelectedCity();
      this.currentUnit = this.readTemperatureUnit();

      this.renderShell();
      this.renderCurrentCity();
      this.renderGrid(DEFAULT_CITIES);
    }

    // ---- setup ------------------------------------------------------------

    renderShell() {
      this.container.innerHTML = `
        <div class="wx-current">
          <span class="wx-current-label">Current city:</span>
          <span class="wx-current-value">—</span>
        </div>
        <div class="wx-search-wrap">
          <img class="wx-search-icon" src="${this.iconPath}" alt="" />
          <input
            type="text"
            class="wx-search-input"
            placeholder="Input city name here..."
            autocomplete="off"
          />
        </div>
        <div class="wx-grid" role="list"></div>
        <hr class="wx-divider" />
        <div class="wx-unit-toggle">
          <span>Temperature unit:</span>
          <button type="button" class="wx-unit-btn"></button>
        </div>
        <label class="wx-toggle">
          <input type="checkbox" class="wx-toggle-input" />
          <span>Show city name on widget</span>
        </label>
      `;

      this.currentCityEl = this.container.querySelector(".wx-current-value");
      this.toggleEl = this.container.querySelector(".wx-toggle-input");
      this.unitBtnEl = this.container.querySelector(".wx-unit-btn");
      this.inputEl = this.container.querySelector(".wx-search-input");
      this.gridEl = this.container.querySelector(".wx-grid");

      this.toggleEl.checked = this.readShowCityName();
      this.toggleEl.addEventListener("change", () => this.handleToggleChange());

      this.updateUnitButtonText();
      this.unitBtnEl.addEventListener("click", () => this.handleUnitToggle());

      this.inputEl.addEventListener("input", () => this.handleInput());
    }

    // ---- temperature unit --------------------------------------------

    readTemperatureUnit() {
      return localStorage.getItem(TEMP_UNIT_KEY) === "fahrenheit" ? "fahrenheit" : "celsius";
    }

    updateUnitButtonText() {
      this.unitBtnEl.textContent = this.currentUnit === "celsius" ? "Celsius (°C)" : "Fahrenheit (°F)";
    }

    handleUnitToggle() {
      this.currentUnit = this.currentUnit === "celsius" ? "fahrenheit" : "celsius";
      this.updateUnitButtonText();

      try {
        localStorage.setItem(TEMP_UNIT_KEY, this.currentUnit);
      } catch (err) {
        console.error("Could not save temperature unit:", err);
      }

      if (typeof window.updateWeather === "function") {
        window.updateWeather();
      }
    }

    // ---- city name toggle -------------------------------------------------

    readShowCityName() {
      return localStorage.getItem(CITY_NAME_TOGGLE_KEY) !== "false";
    }

    handleToggleChange() {
      try {
        localStorage.setItem(CITY_NAME_TOGGLE_KEY, this.toggleEl.checked ? "true" : "false");
      } catch (err) {
        console.error("Could not save city name toggle:", err);
      }
      if (typeof window.updateWeather === "function") {
        window.updateWeather();
      }
    }

    // ---- search -------------------------------------------------------

    handleInput() {
      const query = this.inputEl.value.trim();
      clearTimeout(this.debounceTimer);

      if (!query) {
        if (this.activeController) this.activeController.abort();
        this.renderGrid(DEFAULT_CITIES);
        return;
      }

      this.debounceTimer = setTimeout(() => this.searchCities(query), DEBOUNCE_MS);
    }

    async searchCities(query) {
      if (this.activeController) this.activeController.abort();
      this.activeController = new AbortController();

      this.renderLoading();

      const url =
        `${GEOCODING_ENDPOINT}?name=${encodeURIComponent(query)}` +
        `&count=${RESULT_COUNT}&language=en&format=json`;

      try {
        const res = await fetch(url, { signal: this.activeController.signal });
        if (!res.ok) throw new Error(`Geocoding API responded ${res.status}`);

        const data = await res.json();
        const results = Array.isArray(data.results) ? data.results : [];

        const cities = results.map((r) => ({
          name: r.name,
          admin1: r.admin1 || null,
          country: r.country || r.country_code || "Unknown",
          lat: r.latitude,
          lon: r.longitude,
        }));

        this.renderGrid(cities, { emptyMessage: "No cities found." });
      } catch (err) {
        if (err.name === "AbortError") return;
        console.error("City search failed, showing defaults instead:", err);
        this.renderGrid(DEFAULT_CITIES);
      }
    }

    // ---- current city readout --------------------------------------------

    resolveCurrentCity() {
      if (this.selectedCity) return this.selectedCity;

      const storedLat = parseFloat(localStorage.getItem("startpage_weather_lat"));
      const storedLon = parseFloat(localStorage.getItem("startpage_weather_lon"));
      const hasStoredCoords = !Number.isNaN(storedLat) && !Number.isNaN(storedLon);

      const lat = hasStoredCoords ? storedLat : FALLBACK_LAT;
      const lon = hasStoredCoords ? storedLon : FALLBACK_LON;

      const match = DEFAULT_CITIES.find(
        (c) => this.coordsMatch(c.lat, lat) && this.coordsMatch(c.lon, lon)
      );

      return match || { name: null, country: null, lat, lon };
    }

    coordsMatch(a, b) {
      return Math.abs(a - b) < 0.01;
    }

    renderCurrentCity() {
      if (!this.currentCityEl) return;
      const city = this.resolveCurrentCity();

      this.currentCityEl.textContent = city.name
        ? `${city.name}${city.admin1 ? ", " + city.admin1 : ""}${city.country ? ", " + city.country : ""}`
        : `${this.formatCoord(city.lat)}, ${this.formatCoord(city.lon)} (custom location)`;
    }

    // ---- rendering ----------------------------------------------------

    renderLoading() {
      this.gridEl.innerHTML = `<div class="wx-grid-status">Searching…</div>`;
    }

    renderGrid(cities, { emptyMessage = "No cities found." } = {}) {
      this.gridEl.innerHTML = "";

      if (!cities.length) {
        this.gridEl.innerHTML = `<div class="wx-grid-status">${emptyMessage}</div>`;
        return;
      }

      this.lastRenderedCities = cities;
      this.lastEmptyMessage = emptyMessage;

      const fragment = document.createDocumentFragment();
      cities.slice(0, RESULT_COUNT).forEach((city) => {
        fragment.appendChild(this.buildCard(city));
      });
      this.gridEl.appendChild(fragment);
    }

    buildCard(city) {
      const isSelected = this.isSameCity(city, this.selectedCity);

      const card = document.createElement("div");
      card.className = "wx-card" + (isSelected ? " wx-card--selected" : "");
      card.setAttribute("role", "listitem");

      card.innerHTML = `
        <div class="wx-card-name">${this.escape(city.name)}</div>
        ${city.admin1 ? `<div class="wx-card-meta">Region: ${this.escape(city.admin1)}</div>` : ""}
        <div class="wx-card-meta">Country: ${this.escape(city.country)}</div>
        <div class="wx-card-meta">Latitude: ${this.formatCoord(city.lat)}</div>
        <div class="wx-card-meta">Longitude: ${this.formatCoord(city.lon)}</div>
        <button type="button" class="wx-card-select">
          ${isSelected ? "Selected" : "Select"}
        </button>
      `;

      const btn = card.querySelector(".wx-card-select");
      btn.addEventListener("click", () => this.selectCity(city, card));

      return card;
    }

    // ---- selection ------------------------------------------------------

    selectCity(city, cardEl) {
      this.selectedCity = city;
      this.persistSelectedCity(city);
      this.pushToWeatherWidget(city);
      this.renderCurrentCity();

      this.gridEl.querySelectorAll(".wx-card").forEach((c) => {
        c.classList.remove("wx-card--selected");
        c.querySelector(".wx-card-select").textContent = "Select";
      });
      cardEl.classList.add("wx-card--selected");
      cardEl.querySelector(".wx-card-select").textContent = "Selected";

      if (typeof this.onSelect === "function") this.onSelect(city);
    }

    // ---- persistence ----------------------------------------------------

    persistSelectedCity(city) {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(city));
      } catch (err) {
        console.error("Could not save selected city to localStorage:", err);
      }
    }

    pushToWeatherWidget(city) {
      try {
        localStorage.setItem("startpage_weather_lat", city.lat);
        localStorage.setItem("startpage_weather_lon", city.lon);
      } catch (err) {
        console.error("Could not update widget location in localStorage:", err);
        return;
      }

      if (typeof window.updateWeather === "function") {
        window.updateWeather();
      } else {
        console.warn(
          "weather_settings.js: window.updateWeather() not found — " +
          "make sure weather.js is loaded before weather_settings.js."
        );
      }
    }

    readSelectedCity() {
      try {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    }

    // ---- helpers ----------------------------------------------------------

    isSameCity(a, b) {
      if (!a || !b) return false;
      return a.name === b.name && a.lat === b.lat && a.lon === b.lon;
    }

    formatCoord(value) {
      return typeof value === "number" ? value.toFixed(4) : "—";
    }

    escape(str) {
      const div = document.createElement("div");
      div.textContent = str ?? "";
      return div.innerHTML;
    }

    // ---- external reset ---------------------------------------------------

    resetSearch() {
      clearTimeout(this.debounceTimer);
      if (this.activeController) this.activeController.abort();
      if (this.inputEl) this.inputEl.value = "";
      this.renderGrid(DEFAULT_CITIES);
    }

    syncFromStorage({ refreshWeather = true } = {}) {
      this.selectedCity = this.readSelectedCity();
      this.currentUnit = this.readTemperatureUnit();
      if (this.toggleEl) this.toggleEl.checked = this.readShowCityName();
      this.updateUnitButtonText();
      this.renderCurrentCity();
      this.renderGrid(this.lastRenderedCities || DEFAULT_CITIES, {
        emptyMessage: this.lastEmptyMessage,
      });
      if (refreshWeather && typeof window.updateWeather === "function") {
        window.updateWeather();
      }
    }
  }

  window.WeatherCitySettings = WeatherCitySettings;

  document.addEventListener("DOMContentLoaded", () => {
    const panel = document.getElementById("weather-settings-panel");
    if (panel) {
      window.weatherCitySettings = new WeatherCitySettings(panel);
    } else {
      console.warn("weather_settings.js: #weather-settings-panel not found in DOM");
    }
  });
})();