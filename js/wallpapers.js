// Handles wallpaper grid rendering, selection, and CSS background updates.
//
// The inline head script paints the saved wallpaper before the body is parsed;
// this file owns the settings UI and applies changes made there.

window.wallpapers = [
  { id: 1,  name: "Sunset Glow",      filepath: "./wallpapers/wallpaper_sunsetglow.jpg" },
  { id: 2,  name: "Underwater",       filepath: "./wallpapers/wallpaper_underwater.jpg" },
  { id: 3,  name: "Monochrome",       filepath: "./wallpapers/wallpaper_monochrome.jpg" },
  { id: 4,  name: "Irish Tweed",      filepath: "./wallpapers/wallpaper_irishtweed.jpg" },
  { id: 5,  name: "Mint & Teal",      filepath: "./wallpapers/wallpaper_mintandteal.jpg" },
  { id: 6,  name: "Jadeite",          filepath: "./wallpapers/wallpaper_jadeite.jpg" },
  { id: 7,  name: "Royal Purple",     filepath: "./wallpapers/wallpaper_royalpurple.jpg" },
  { id: 8,  name: "Blackberry",       filepath: "./wallpapers/wallpaper_blackberry.jpg" },
  { id: 9,  name: "Rebel",            filepath: "./wallpapers/wallpaper_rebel.jpg" },
  { id: 10, name: "Rose Gold",        filepath: "./wallpapers/wallpaper_rosegold.jpg" },
  { id: 11, name: "Tangerine",        filepath: "./wallpapers/wallpaper_tangerine.jpg" },
  { id: 12, name: "Just Black",       filepath: "./wallpapers/wallpaper_justblack.jpg" },
  { id: 13, name: "Damascus",         filepath: "./wallpapers/wallpaper_damascus.jpg" },
  { id: 14, name: "Forged Steel",     filepath: "./wallpapers/wallpaper_forgedsteel.jpg" },
  { id: 15, name: "Camo Black",       filepath: "./wallpapers/wallpaper_camoblack.jpg" },
  { id: 16, name: "Toxic Green",      filepath: "./wallpapers/wallpaper_toxicgreen.jpg" },
  { id: 17, name: "Retro Wave",       filepath: "./wallpapers/wallpaper_retrowave.jpg" },
  { id: 18, name: "Motion Blur",      filepath: "./wallpapers/wallpaper_motionblur.jpg" },
  { id: 19, name: "Mapped",           filepath: "./wallpapers/wallpaper_mapped.jpg" },
  { id: 20, name: "Pastelle",         filepath: "./wallpapers/wallpaper_pastelle.jpg" },
  { id: 21, name: "Pinkie",           filepath: "./wallpapers/wallpaper_pinkie.jpg" },
  { id: 22, name: "80s Orange",       filepath: "./wallpapers/wallpaper_80sorange.jpg" },
  { id: 23, name: "Vintage Wallart",  filepath: "./wallpapers/wallpaper_vintagewallart.jpg" },
  { id: 24, name: "Marbled Swirl",    filepath: "./wallpapers/wallpaper_marbledswirl.jpg" },
  { id: 25, name: "Checkered Tiles",  filepath: "./wallpapers/wallpaper_checkered.jpg" },
  { id: 26, name: "Starry",           filepath: "./wallpapers/wallpaper_starry.jpg" },
  { id: 27, name: "Cat's Paw",        filepath: "./wallpapers/wallpaper_catspaw.jpg" },
  { id: 28, name: "Cratered",         filepath: "./wallpapers/wallpaper_cratered.jpg" },
  { id: 29, name: "Messier 106",      filepath: "./wallpapers/wallpaper_messier106.jpg" },
  { id: 30, name: "Poolside",         filepath: "./wallpapers/wallpaper_poolside.jpg" },
];

const WALLPAPER_STORAGE_KEY = 'startpage_wallpaper_path';

// Applies a wallpaper by filepath and persists the choice.
//
// Resolve the path before storing it in the custom property. CSS resolves a
// url() used through var() relative to the stylesheet, so a relative value
// would incorrectly be resolved from ./css/.
function applyWallpaper(filepath) {
  const absoluteUrl = new URL(filepath, document.baseURI).href;
  document.documentElement.style.setProperty('--background-image', `url("${absoluteUrl}")`);
  localStorage.setItem(WALLPAPER_STORAGE_KEY, filepath); // keep storage portable when the project folder moves
}

// Return the saved wallpaper for the grid's selected state, or the default
// entry when storage is empty or no longer matches the catalog.
function getCurrentWallpaper() {
  const savedPath = localStorage.getItem(WALLPAPER_STORAGE_KEY);
  return window.wallpapers.find(wp => wp.filepath === savedPath) || window.wallpapers[0];
}

// Build the grid on demand; the data attribute prevents duplicate work.
function renderWallpaperGrid(selectedId) {
  const gridContainer = document.getElementById('wallpaper-grid');
  if (!gridContainer) return;
  if (gridContainer.dataset.rendered === 'true') return;

  gridContainer.innerHTML = window.wallpapers.map(wp => `
    <div class="wallpaper-card${wp.id === selectedId ? ' selected' : ''}" data-wallpaper-id="${wp.id}">
      <img src="${wp.filepath}" alt="${wp.name}" loading="lazy" />
      <span class="wallpaper-name">${wp.name}</span>
    </div>
  `).join('');

  gridContainer.dataset.rendered = 'true';
}

document.addEventListener('DOMContentLoaded', () => {
  const gridContainer = document.getElementById('wallpaper-grid');

  // The settings nav and panel use the same data attribute for routing.
  const wallpaperTabButton = document.querySelector('[data-panel="wallpaper"]');

  const currentWallpaper = getCurrentWallpaper();

  // Delay image creation until the Wallpaper tab is opened.
  if (wallpaperTabButton) {
    wallpaperTabButton.addEventListener('click', () => {
      renderWallpaperGrid(currentWallpaper.id);
    }, { once: true });
  }

  // Delegate selection from the grid container so the handler also works
  // for cards created later by renderWallpaperGrid().
  if (gridContainer) {
    gridContainer.addEventListener('click', (e) => {
      const card = e.target.closest('.wallpaper-card');
      if (!card) return;

      const clickedId = parseInt(card.dataset.wallpaperId, 10);
      const selectedWallpaper = window.wallpapers.find(wp => wp.id === clickedId);
      if (!selectedWallpaper) return;

      applyWallpaper(selectedWallpaper.filepath);

      gridContainer.querySelectorAll('.wallpaper-card.selected')
        .forEach(el => el.classList.remove('selected'));
      card.classList.add('selected');
    });
  }
});