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