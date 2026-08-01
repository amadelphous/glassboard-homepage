// Dynamic Tab Panel Toggles
function setupTabToggle(toggleBtnId, panelId) {
  const btn = document.getElementById(toggleBtnId);
  const panel = document.getElementById(panelId);

  btn?.addEventListener('click', () => {
    panel?.classList.toggle('open');
  });
}

setupTabToggle('timer-toggle', 'timer-panel');

// Auto-hide Scroll Hint & Side Widgets on Scroll
const scrollHint = document.getElementById('scroll-hint');
const timerPanel = document.getElementById('timer-panel');

window.addEventListener('scroll', () => {
  if (window.scrollY > 50) {
    scrollHint?.classList.add('hidden');
    timerPanel?.classList.add('hidden');
  } else {
    scrollHint?.classList.remove('hidden');
    timerPanel?.classList.remove('hidden');
  }
});

// This function is what enables the UI to update and function properly.
// I seriously recommend not editing this function even if you know what you are doing.
// Breaking this function will cause the UI to stop working as a whole and will
// require grabbing a clean copy of ui.js from the repository and replacing the broken
// one with it. Breaking this function subsequently breaks everything else tied to it.