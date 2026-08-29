const settingsBtn = document.getElementById('settings-btn');
const settingsModal = document.getElementById('settings-modal');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const closeXBtn = document.getElementById('close-x-btn');

// Settings state captured before the modal opens, used by Cancel and Esc.
let settingsSnapshot = null;

function sanitizeCoordinate(rawValue, axis) {
  const min = axis === 'latitude' ? -90 : -180;
  const max = axis === 'latitude' ? 90 : 180;
  const value = Number(rawValue);

  if (!Number.isFinite(value) || value < min || value > max) {
    return null;
  }

  return value;
}

function captureSettings() {
  return {
    wallpaperPath: localStorage.getItem('startpage_wallpaper_path') || window.wallpapers[0].filepath,
    darkMode: localStorage.getItem('dark_mode') === 'true',
    searchEngine: localStorage.getItem('search_engine') || 'google',
    backgroundUrl: localStorage.getItem('background_url') || '',
    weatherCity: localStorage.getItem('weatherSettings.selectedCity'),
    weatherLat: localStorage.getItem('startpage_weather_lat'),
    weatherLon: localStorage.getItem('startpage_weather_lon'),
    weatherShowCityName: localStorage.getItem('weatherSettings.showCityName'),
    weatherTempUnit: localStorage.getItem('weatherSettings.temperatureUnit'),
  };
}

function applySettings(settings) {
  const weatherStateChanged = [
    ['weatherCity', localStorage.getItem('weatherSettings.selectedCity')],
    ['weatherLat', localStorage.getItem('startpage_weather_lat')],
    ['weatherLon', localStorage.getItem('startpage_weather_lon')],
    ['weatherShowCityName', localStorage.getItem('weatherSettings.showCityName')],
    ['weatherTempUnit', localStorage.getItem('weatherSettings.temperatureUnit')],
  ].some(([key, currentValue]) => currentValue !== settings[key]);

  const wallpaper = window.wallpapers.find(wp => wp.filepath === settings.wallpaperPath) || window.wallpapers[0];
  applyWallpaper(wallpaper.filepath); // applyWallpaper also persists the selected path

  document.documentElement.classList.toggle('dark', settings.darkMode);
  localStorage.setItem('dark_mode', settings.darkMode);

  localStorage.setItem('search_engine', settings.searchEngine);
  localStorage.setItem('background_url', settings.backgroundUrl);

  // Restore the weather selection and display preferences.
  if (settings.weatherCity != null) {
    localStorage.setItem('weatherSettings.selectedCity', settings.weatherCity);
  } else {
    localStorage.removeItem('weatherSettings.selectedCity');
  }

  const safeLat = sanitizeCoordinate(settings.weatherLat, 'latitude');
  const safeLon = sanitizeCoordinate(settings.weatherLon, 'longitude');

  if (safeLat !== null) {
    localStorage.setItem('startpage_weather_lat', String(safeLat));
  } else {
    localStorage.removeItem('startpage_weather_lat');
  }
  if (safeLon !== null) {
    localStorage.setItem('startpage_weather_lon', String(safeLon));
  } else {
    localStorage.removeItem('startpage_weather_lon');
  }
  if (settings.weatherShowCityName != null) {
    localStorage.setItem('weatherSettings.showCityName', settings.weatherShowCityName);
  } else {
    localStorage.removeItem('weatherSettings.showCityName');
  }
  if (settings.weatherTempUnit != null) {
    localStorage.setItem('weatherSettings.temperatureUnit', settings.weatherTempUnit);
  } else {
    localStorage.removeItem('weatherSettings.temperatureUnit');
  }

  if (window.weatherCitySettings) {
    window.weatherCitySettings.syncFromStorage({ refreshWeather: weatherStateChanged });
  } else if (weatherStateChanged && typeof window.updateWeather === 'function') {
    window.updateWeather();
  }

  // The wallpaper grid is built once, so update its selected card directly
  // instead of attempting to render the grid again.
  const gridContainer = document.getElementById('wallpaper-grid');
  if (gridContainer) {
    gridContainer.querySelectorAll('.wallpaper-card').forEach(card => {
      card.classList.toggle('selected', parseInt(card.dataset.wallpaperId, 10) === wallpaper.id);
    });
  }
}

// Capture the current state before opening so Cancel can restore it.
settingsBtn.addEventListener('click', () => {
  settingsSnapshot = captureSettings();
  settingsModal.showModal();
});

// Restore the pre-open state, then close the dialog.
cancelBtn.addEventListener('click', () => {
  if (settingsSnapshot) {
    applySettings(settingsSnapshot);
  }
  settingsModal.close();
});

// The close button follows the same revert behavior as Cancel.
closeXBtn.addEventListener('click', () => cancelBtn.click());

// The current live state becomes the new baseline when Save is clicked.
saveBtn.addEventListener('click', () => {
  settingsSnapshot = captureSettings();
  settingsModal.close();
});

let backdropMouseDownOnDialog = false;

settingsModal.addEventListener('mousedown', (event) => {
  backdropMouseDownOnDialog = event.target === settingsModal;
});

settingsModal.addEventListener('click', (event) => {
  if (backdropMouseDownOnDialog && event.target === settingsModal) {
    cancelBtn.click(); // reuse the dialog's revert logic
  }
  backdropMouseDownOnDialog = false;
});

settingsModal.addEventListener('cancel', () => {
  if (settingsSnapshot) {
    applySettings(settingsSnapshot);
  }
});

const navItems = document.querySelectorAll('.settings-modal .nav-item');
const panels = document.querySelectorAll('.settings-modal .settings-panel');

navItems.forEach(item => {
  item.addEventListener('click', () => {
    const target = item.dataset.panel;

    // Keep navigation and panel visibility in sync.
    navItems.forEach(nav => nav.classList.remove('active'));
    item.classList.add('active');

    panels.forEach(panel => {
      panel.classList.toggle('active', panel.dataset.panel === target);
    });
  });
});

// Reset transient modal UI after any native dialog close. This keeps the
// next opening on the default tab with an empty weather search.
settingsModal.addEventListener('close', () => {
  navItems.forEach(nav => nav.classList.remove('active'));
  panels.forEach(panel => panel.classList.remove('active'));

  const defaultNav = document.querySelector('.settings-modal .nav-item[data-panel="about"]');
  const defaultPanel = document.querySelector('.settings-modal .settings-panel[data-panel="about"]');
  if (defaultNav) defaultNav.classList.add('active');
  if (defaultPanel) defaultPanel.classList.add('active');

  if (window.weatherCitySettings) {
    window.weatherCitySettings.resetSearch();
  }
});