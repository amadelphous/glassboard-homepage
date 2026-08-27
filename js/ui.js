// Shared interactions for collapsible panels and hero-area scroll state.
function setupTabToggle(toggleBtnId, panelId) {
  const btn = document.getElementById(toggleBtnId);
  const panel = document.getElementById(panelId);

  btn?.addEventListener('click', () => {
    panel?.classList.toggle('open');
  });
}

setupTabToggle('timer-toggle', 'timer-panel');

window.addEventListener('scroll', () => {
  const activationZone = document.querySelector('.settings-trigger-zone');
  const scrollHint = document.getElementById('scroll-hint');
  const timerPanel = document.getElementById('timer-panel');

  if (window.scrollY > 50) {
    scrollHint?.classList.add('hidden');
    timerPanel?.classList.add('hidden');
    activationZone?.classList.add('is-scrolled');
  } else {
    scrollHint?.classList.remove('hidden');
    timerPanel?.classList.remove('hidden');
    activationZone?.classList.remove('is-scrolled');
  }
});

