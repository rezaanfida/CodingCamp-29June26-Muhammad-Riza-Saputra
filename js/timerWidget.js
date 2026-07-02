/**
 * timerWidget.js — Focus Timer state machine for the To-Do Life Dashboard.
 *
 * Implements a Pomodoro-style countdown timer with four states:
 *   idle → running → paused → running → completed → (reset) → idle
 *
 * Public API:
 *   init()                          – Wire DOM, render initial state
 *   start()                         – idle|paused → running
 *   stop()                          – running → paused
 *   reset()                         – any → idle
 *   formatTime(seconds)             – number → "MM:SS"
 *   getButtonStates(status)         – status → { start, stop, reset }
 */

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/**
 * @typedef {'idle'|'running'|'paused'|'completed'} TimerStatus
 *
 * @typedef {{ remaining: number, status: TimerStatus }} TimerState
 */

/** @type {TimerState} */
let state = {
  remaining: 1500, // 25 minutes in seconds
  status: 'idle',
};

/** @type {number|null} */
let intervalId = null;

// ---------------------------------------------------------------------------
// Pure helper functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Format a seconds value as "MM:SS" with zero-padded components.
 *
 * MM = Math.floor(seconds / 60)
 * SS = seconds % 60
 *
 * @param {number} seconds – Integer in [0, 1500]
 * @returns {string} e.g. "25:00", "04:37", "00:00"
 */
export function formatTime(seconds) {
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  return `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
}

/**
 * Return the correct enabled/disabled state for each button based on the
 * current timer status.
 *
 * | Status    | Start    | Stop     | Reset   |
 * |-----------|----------|----------|---------|
 * | idle      | enabled  | disabled | enabled |
 * | running   | disabled | enabled  | enabled |
 * | paused    | enabled  | disabled | enabled |
 * | completed | disabled | disabled | enabled |
 *
 * @param {TimerStatus} status
 * @returns {{ start: boolean, stop: boolean, reset: boolean }}
 *   true = enabled, false = disabled
 */
export function getButtonStates(status) {
  switch (status) {
    case 'idle':
      return { start: true, stop: false, reset: true };
    case 'running':
      return { start: false, stop: true, reset: true };
    case 'paused':
      return { start: true, stop: false, reset: true };
    case 'completed':
      return { start: false, stop: false, reset: true };
    default:
      return { start: false, stop: false, reset: true };
  }
}

// ---------------------------------------------------------------------------
// Audio
// ---------------------------------------------------------------------------

/**
 * Play a short beep using the Web Audio API.
 * Silently swallows any errors (e.g. suspended AudioContext, missing API).
 */
function playBeep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, ctx.currentTime); // A5

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);

    // Close context after beep finishes to free resources
    oscillator.onended = () => ctx.close();
  } catch (_) {
    // Silent failure — timer visual/functional behaviour is unaffected
  }
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------

/** @returns {HTMLElement} */
function getDisplay() {
  return document.getElementById('timer-display');
}

/** @returns {HTMLButtonElement} */
function getBtnStart() {
  return document.getElementById('timer-start');
}

/** @returns {HTMLButtonElement} */
function getBtnStop() {
  return document.getElementById('timer-stop');
}

/** @returns {HTMLButtonElement} */
function getBtnReset() {
  return document.getElementById('timer-reset');
}

/**
 * Reflect current state to the DOM:
 *  – Update display text
 *  – Sync button disabled attributes
 */
function renderTimer() {
  const display = getDisplay();
  if (display) {
    display.textContent = formatTime(state.remaining);
  }

  const btnStates = getButtonStates(state.status);

  const btnStart = getBtnStart();
  const btnStop = getBtnStop();
  const btnReset = getBtnReset();

  if (btnStart) btnStart.disabled = !btnStates.start;
  if (btnStop) btnStop.disabled = !btnStates.stop;
  if (btnReset) btnReset.disabled = !btnStates.reset;
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/**
 * Clear any running interval.
 */
function clearTimer() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/**
 * Completion logic: transition running → completed, play beep once,
 * apply animation class for ≥2 s.
 */
function handleCompletion() {
  clearTimer();
  state.status = 'completed';
  renderTimer();

  playBeep();

  const display = getDisplay();
  if (display) {
    display.classList.add('timer__display--complete');
    setTimeout(() => {
      display.classList.remove('timer__display--complete');
    }, 2000);
  }
}

/**
 * Start the timer (idle → running  or  paused → running).
 * No-op for other states.
 */
export function start() {
  if (state.status !== 'idle' && state.status !== 'paused') return;

  state.status = 'running';
  renderTimer();

  intervalId = setInterval(() => {
    state.remaining -= 1;

    if (state.remaining <= 0) {
      state.remaining = 0;
      renderTimer();
      handleCompletion();
    } else {
      renderTimer();
    }
  }, 1000);
}

/**
 * Stop/pause the timer (running → paused).
 * No-op for other states.
 */
export function stop() {
  if (state.status !== 'running') return;

  clearTimer();
  state.status = 'paused';
  renderTimer();
}

/**
 * Reset the timer to idle (any → idle).
 */
export function reset() {
  clearTimer();
  state.status = 'idle';
  state.remaining = 1500;
  renderTimer();
}

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Wire button click listeners and render the initial 25:00 display.
 * Called once by app.js on DOMContentLoaded.
 */
export function init() {
  const btnStart = getBtnStart();
  const btnStop = getBtnStop();
  const btnReset = getBtnReset();

  if (btnStart) btnStart.addEventListener('click', () => start());
  if (btnStop) btnStop.addEventListener('click', () => stop());
  if (btnReset) btnReset.addEventListener('click', () => reset());

  renderTimer();
}
