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

// This script and its functions are what enables the timer to update and function properly.
// It can be edited if you want to change the format of the timer, 
// but it is not recommended to change it unless you know what you are doing.
// Breaking this function will cause the timer to stop working and will require
// grabbing a clean copy of timer.js from the repository and replacing the broken
// one with it.

// Note: The timer state is stored in localStorage under the key 'startpage_timer_state_v1'.
// Note 2: The timer supports Picture-in-Picture (PiP) mode, which allows the timer 
// to be displayed in a small overlay window while you work in other tabs or applications.
// Note 3: The timer state is synchronized across multiple tabs in real-time. If you start, 
// pause, or reset the timer in one tab, the changes will be reflected in 
// all other open tabs of the same origin.

// IMPORTANT: This script is one of the core functionalities, using six functions and a few event 
// listeners to manage the timer's state, display, and PiP functionality. It is very easy to
// break the timer by editing this script.
