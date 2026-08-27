const TIMER_STORAGE_KEY = 'startpage_timer_state_v2';
const DEFAULT_TIMER_STATE = {
  running: false,
  mode: 'stopwatch',
  targetDuration: 0,
  startTime: 0,
  accumulated: 0,
  finished: false,
};

// Draw the timer into a canvas so the same readout can be shown in PiP.
const canUsePip = typeof HTMLCanvasElement.prototype.captureStream === 'function'
  && typeof HTMLVideoElement.prototype.requestPictureInPicture === 'function';
let pipCanvas = null;
let pipCtx = null;
let pipVideo = null;

if (canUsePip) {
  pipCanvas = document.createElement('canvas');
  pipCanvas.width = 300;
  pipCanvas.height = 150;
  pipCtx = pipCanvas.getContext('2d');

  pipVideo = document.createElement('video');
  pipVideo.muted = true;
  pipVideo.playsInline = true;
  pipVideo.style.display = 'none';
  document.body.appendChild(pipVideo);
  pipVideo.srcObject = pipCanvas.captureStream(10);
}

function getTimerState() {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TIMER_STATE };

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_TIMER_STATE };
    }

    return {
      running: parsed.running === true,
      mode: parsed.mode === 'timer' ? 'timer' : 'stopwatch',
      targetDuration: Number.isFinite(parsed.targetDuration) ? Math.max(0, parsed.targetDuration) : 0,
      startTime: Number.isFinite(parsed.startTime) ? Math.max(0, parsed.startTime) : 0,
      accumulated: Number.isFinite(parsed.accumulated) ? Math.max(0, parsed.accumulated) : 0,
      finished: parsed.finished === true,
    };
  } catch {
    return { ...DEFAULT_TIMER_STATE };
  }
}

function setTimerState(state) {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error('Could not save timer state:', err);
  }
  updateTimerUI();
}

// Accept HH:MM:SS, MM:SS, a single numeric field, or six raw digits (HHMMSS).
function parseTimeToSeconds(inputStr) {
  if (!inputStr) return 0;
  const cleanStr = inputStr.trim();
  
  if (cleanStr.includes(':')) {
    const parts = cleanStr.split(':').map(p => parseInt(p, 10) || 0);
    if (parts.length === 3) return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
    if (parts.length === 2) return (parts[0] * 60) + parts[1];
    if (parts.length === 1) return parts[0];
  } else {
    // Interpret digit-only input from right to left as HHMMSS.
    const digits = cleanStr.replace(/\D/g, '').padStart(6, '0').slice(-6);
    const h = parseInt(digits.slice(0, 2), 10) || 0;
    const m = parseInt(digits.slice(2, 4), 10) || 0;
    const s = parseInt(digits.slice(4, 6), 10) || 0;
    return (h * 3600) + (m * 60) + s;
  }
  return 0;
}

function formatTime(totalSeconds) {
  const safeSecs = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(safeSecs / 3600)).padStart(2, '0');
  const m = String(Math.floor((safeSecs % 3600) / 60)).padStart(2, '0');
  const s = String(safeSecs % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

function getElapsedSeconds() {
  const state = getTimerState();
  if (!state.running) return state.accumulated;
  const now = Date.now();
  const diff = Math.floor((now - state.startTime) / 1000);
  return state.accumulated + Math.max(0, diff);
}

function renderPipCanvas(formattedText) {
  if (!pipCtx) return;

  pipCtx.fillStyle = '#141414';
  pipCtx.fillRect(0, 0, 300, 150);
  pipCtx.fillStyle = '#ffffff';
  pipCtx.font = 'bold 54px "Outfit", system-ui, sans-serif';
  pipCtx.textAlign = 'center';
  pipCtx.textBaseline = 'middle';
  pipCtx.fillText(formattedText, 150, 75);
}

function updateTimerUI() {
  const state = getTimerState();
  const elapsed = getElapsedSeconds();
  const displayInput = document.getElementById('timer-display');
  
  let displayValue = 0;

  if (state.mode === 'timer') {
    const remaining = state.targetDuration - elapsed;
    if (remaining <= 0 && state.running) {
      state.finished = true;
      state.running = false;
      state.accumulated = state.targetDuration;
      localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(state));
    }
    displayValue = Math.max(0, remaining);
  } else {
    displayValue = elapsed;
  }

  const formatted = formatTime(displayValue);

  // Do not overwrite text while the user is editing the field.
  if (displayInput && document.activeElement !== displayInput) {
    displayInput.value = formatted;
    displayInput.disabled = state.running;
  }

  // Keep the mirror visible after a completed countdown until Reset or Start.
  const timerMirror = document.getElementById('timer-mirror');
  if (timerMirror) {
    timerMirror.textContent = formatted;
    timerMirror.classList.toggle('visible', state.finished || displayValue > 0 || state.running);
  }

  // A completed countdown keeps its title until the user starts or resets it.
  if (state.finished) {
    document.title = `⏰ TIME'S UP!`;
  } else if (state.running) {
    const prefix = state.mode === 'timer' ? '⏳' : '⏱️';
    document.title = `${prefix} ${formatted} | New tab`;
  } else {
    document.title = 'New tab';
  }

  // Keep Start available after completion so a new duration can be entered
  // without requiring a separate Reset action.
  const startBtn = document.getElementById('timer-start');
  const pauseBtn = document.getElementById('timer-pause');
  const resetBtn = document.getElementById('timer-reset');

  if (startBtn) startBtn.disabled = state.running;
  if (pauseBtn) pauseBtn.disabled = !state.running;
  if (resetBtn) resetBtn.disabled = (!state.running && displayValue === 0 && state.accumulated === 0 && !state.finished);

  // Keep the PiP frame synchronized with the main display.
  renderPipCanvas(formatted);
}

// --- TIME INPUT FORMATTING ---
const displayInput = document.getElementById('timer-display');
if (displayInput) {
  // Select the current value so a new duration can be typed immediately.
  displayInput.addEventListener('focus', () => {
    displayInput.select();
  });

  // Format numeric input as HH:MM:SS while it is entered.
  displayInput.addEventListener('input', (e) => {
    let digits = e.target.value.replace(/\D/g, '');
    
    // Limit the input to hours, minutes, and seconds.
    if (digits.length > 6) {
      digits = digits.slice(-6);
    }

    // Preserve a stable six-digit display.
    const padded = digits.padStart(6, '0');
    const h = padded.slice(0, 2);
    const m = padded.slice(2, 4);
    const s = padded.slice(4, 6);

    e.target.value = `${h}:${m}:${s}`;
  });

  displayInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      displayInput.blur();
      document.getElementById('timer-start')?.click();
    }
  });
}

// --- TIMER CONTROLS ---

document.getElementById('timer-start')?.addEventListener('click', () => {
  const state = getTimerState();
  if (state.running) return;

  const typedSeconds = parseTimeToSeconds(displayInput ? displayInput.value : '0');

  // A completed countdown may still have accumulated time, but Start should
  // treat it as a new entry and read the value currently shown in the field.
  if (state.accumulated === 0 || state.finished) {
    if (typedSeconds > 0) {
      state.mode = 'timer';
      state.targetDuration = typedSeconds;
    } else {
      state.mode = 'stopwatch';
      state.targetDuration = 0;
    }
    state.accumulated = 0;
  }

  state.finished = false;
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
  setTimerState({ running: false, mode: 'stopwatch', targetDuration: 0, startTime: 0, accumulated: 0, finished: false });
});

// Toggle the browser's Picture-in-Picture window.
document.getElementById('timer-pip')?.addEventListener('click', async () => {
  if (!canUsePip || !pipVideo) return;

  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      renderPipCanvas(displayInput?.value || '00:00:00');
      await pipVideo.play();
      await pipVideo.requestPictureInPicture();
    }
  } catch (err) {
    console.error("PiP error:", err);
  }
});

// Reflect timer changes made in another tab.
window.addEventListener('storage', (e) => {
  if (e.key === TIMER_STORAGE_KEY) {
    updateTimerUI();
  }
});

if (document.fonts) {
  document.fonts.ready.then(() => updateTimerUI());
}

const pipButton = document.getElementById('timer-pip');
if (pipButton && !canUsePip) pipButton.disabled = true;

setInterval(updateTimerUI, 500);
updateTimerUI();