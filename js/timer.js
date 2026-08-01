const TIMER_STORAGE_KEY = 'startpage_timer_state_v1';

// Canvas setup for PiP stream
const pipCanvas = document.createElement('canvas');
pipCanvas.width = 300;
pipCanvas.height = 150;
const pipCtx = pipCanvas.getContext('2d');

const pipVideo = document.createElement('video');
pipVideo.muted = true;
pipVideo.style.display = 'none';
document.body.appendChild(pipVideo);
pipVideo.srcObject = pipCanvas.captureStream(10);

function getTimerState() {
  const raw = localStorage.getItem(TIMER_STORAGE_KEY);
  if (!raw) return { running: false, startTime: 0, accumulated: 0 };
  try { return JSON.parse(raw); } catch { return { running: false, startTime: 0, accumulated: 0 }; }
}

function setTimerState(state) {
  localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  updateTimerUI();
}

function getElapsedSeconds() {
  const state = getTimerState();
  if (!state.running) return state.accumulated;
  const now = Date.now();
  const diff = Math.floor((now - state.startTime) / 1000);
  return state.accumulated + (diff > 0 ? diff : 0);
}

function formatTime(totalSeconds) {
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const s = String(totalSeconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function renderPipCanvas(formattedText) {
  pipCtx.fillStyle = '#141414';
  pipCtx.fillRect(0, 0, 300, 150);
  pipCtx.fillStyle = '#ffffff';
  pipCtx.font = 'bold 54px "Outfit", sans-serif';
  pipCtx.textAlign = 'center';
  pipCtx.textBaseline = 'middle';
  pipCtx.fillText(formattedText, 150, 75);
}

function updateTimerUI() {
  const state = getTimerState();
  const elapsed = getElapsedSeconds();
  const formatted = formatTime(elapsed);

  // 1. Update on-screen panel display
  document.getElementById('timer-display').textContent = formatted;

  // 1b. Update mirrored display above the clock
  const timerMirror = document.getElementById('timer-mirror');
  timerMirror.textContent = formatted;
  timerMirror.classList.toggle('visible', elapsed > 0);

  // 2. Update Browser Tab Title
  if (state.running) {
    document.title = `New tab | ${formatted}`;
  } else {
    document.title = 'New tab';
  }

  // 3. Render PiP Canvas continuously
  renderPipCanvas(formatted);
}

// Controls
document.getElementById('timer-start')?.addEventListener('click', () => {
  const state = getTimerState();
  if (state.running) return;
  state.running = true;
  state.startTime = Date.now();
  setTimerState(state);
});

document.getElementById('timer-pause')?.addEventListener('click', () => {
  const state = getTimerState();
  if (!state.running) return;
  state.accumulated = getElapsedSeconds();
  state.running = false;
  state.startTime = 0;
  setTimerState(state);
});

document.getElementById('timer-reset')?.addEventListener('click', () => {
  setTimerState({ running: false, startTime: 0, accumulated: 0 });
});

// PiP Button Trigger
document.getElementById('timer-pip')?.addEventListener('click', async () => {
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      renderPipCanvas(formatTime(getElapsedSeconds()));
      await pipVideo.play();
      await pipVideo.requestPictureInPicture();
    }
  } catch (err) {
    console.error("PiP error:", err);
  }
});

// Real-time synchronization across multiple tabs
window.addEventListener('storage', (e) => {
  if (e.key === TIMER_STORAGE_KEY) {
    updateTimerUI();
  }
});

setInterval(updateTimerUI, 500);
updateTimerUI();