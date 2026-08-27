/**
 * js/about.js
 * -----------------------------------------------------------------------
 * Populates the "About" tab of the Settings modal with project info:
 * icon, name, author, GitHub link, and a "Built with" credits list.
 * -----------------------------------------------------------------------
 */

window.ABOUT_DATA = {
  name: "Startpage v2.0",
  author: "Amadelphous",
  iconSrc: "svg/startpage.svg",
  githubUrl: "https://github.com/amadelphous/glassboard-homepage",
  builtWith: [
    {
      name: "Open-Meteo",
      linkUrl: "https://open-meteo.com/",
      desc: "Weather forecast data provided under",
      linkText: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/deed.en",
    },
    {
      name: "Open-Meteo Geocoding API",
      desc: "Location and place search functionality.",
      linkUrl: "https://open-meteo.com/en/docs/geocoding-api",
    },
    {
      name: "Outfit Font",
      desc: "Used for all UI elements, made by The Outfit Project Authors.",
      linkUrl: "https://fonts.google.com/specimen/Outfit",
    },
        {
      name: "NASA & STScI",
      desc: "Space imagery for wallpapers, provided in the public domain.",
      linkUrl: "https://images.nasa.gov/",
    },
  ],
};

function injectAboutStyles() {
  if (document.getElementById("about-panel-styles")) return;

  const style = document.createElement("style");
  style.id = "about-panel-styles";
  style.textContent = `
    .about-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }
    .about-icon {
      width: 56px;
      height: 56px;
    }
    .about-title {
      margin: 0 0 6px 0;
    }
    .about-subtitle {
      margin: 0 0 4px 0;
    }
    .about-github {
      margin: 0;
    }
    .about-built-with h3 {
      margin: 0 0 12px 0;
    }
    .about-dep {
      margin: 0 0 12px 0;
      line-height: 1.5;
    }
    .about-link {
      color: #ff751f;
    }
  `;
  document.head.appendChild(style);
}

function renderAboutPanel(data) {
  const panel = document.querySelector('.settings-panel[data-panel="about"]');
  if (!panel) return;

  injectAboutStyles();

  const builtWithHTML = data.builtWith
    .map((dep) => {
      const nameHTML = dep.linkUrl
        ? `<a href="${dep.linkUrl}" target="_blank" rel="noopener noreferrer" class="about-link">${dep.name}</a>`
        : dep.name;

      const descHTML = (dep.linkText && dep.licenseUrl)
        ? `${dep.desc} <a href="${dep.licenseUrl}" target="_blank" rel="noopener noreferrer" class="about-link">${dep.linkText}</a>.`
        : dep.desc;

      return `<p class="about-dep"><strong>${nameHTML}</strong>: ${descHTML}</p>`;
    })
    .join("");

  panel.innerHTML = `
    <div class="about-header">
      <img src="${data.iconSrc}" alt="${data.name} icon" class="about-icon" />
      <div class="about-header-text">
        <h2 class="about-title">${data.name}</h2>
        <p class="about-subtitle">Made with love by ${data.author}</p>
        <p class="about-github">
          View on
          <a href="${data.githubUrl}" target="_blank" rel="noopener noreferrer" class="about-link">
            GitHub ↗
          </a>
        </p>
      </div>
    </div>

    <div class="about-built-with">
      <h3>Built with:</h3>
      ${builtWithHTML}
    </div>
  `;
}

renderAboutPanel(window.ABOUT_DATA);