/**
 * clockWidget.js — Greeting & Clock widget for the To-Do Life Dashboard.
 *
 * Responsibilities:
 *  - Display the current local time in HH:MM:SS format, updating every second.
 *  - Display the current date in long format: "Weekday, D Month YYYY".
 *  - Display a time-of-day greeting based on the current hour.
 *
 * Public interface:
 *   init()               — Wire up the widget and start the 1-second tick.
 *   formatTime(date)     — Returns "HH:MM:SS" string.
 *   formatDate(date)     — Returns "Weekday, D Month YYYY" string.
 *   getGreeting(hour)    — Pure function returning the greeting for a given hour.
 *   tick()               — Updates the DOM with current time, date, and greeting.
 */

// ---------------------------------------------------------------------------
// DOM element references (resolved lazily to avoid top-level query failures)
// ---------------------------------------------------------------------------
function getElements() {
  return {
    greeting: document.getElementById('clock-greeting'),
    time: document.getElementById('clock-time'),
    date: document.getElementById('clock-date'),
  };
}

// ---------------------------------------------------------------------------
// Pure formatting functions
// ---------------------------------------------------------------------------

/**
 * Format a Date object as a zero-padded HH:MM:SS string.
 *
 * @param {Date} date
 * @returns {string} e.g. "09:05:03"
 */
export function formatTime(date) {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * Format a Date object as "[Full Weekday Name], [D] [Full Month Name] [YYYY]".
 * Example: "Monday, 30 June 2025"
 *
 * Uses Intl.DateTimeFormat for locale-aware, full-length weekday and month names.
 *
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const day = date.getDate();                          // numeric, no zero-pad
  const month = date.toLocaleDateString('en-GB', { month: 'long' });
  const year = date.getFullYear();
  return `${weekday}, ${day} ${month} ${year}`;
}

/**
 * Return the appropriate greeting for the given hour (0–23).
 *
 * This is a pure function — no side effects, no DOM access.
 *
 * | Hour range    | Greeting         |
 * |---------------|------------------|
 * | 05 – 11       | "Good Morning"   |
 * | 12 – 17       | "Good Afternoon" |
 * | 18 – 23, 0–4  | "Good Evening"   |
 *
 * @param {number} hour — Integer in [0, 23]
 * @returns {"Good Morning" | "Good Afternoon" | "Good Evening"}
 */
export function getGreeting(hour) {
  if (hour >= 5 && hour <= 11) return 'Good Morning';
  if (hour >= 12 && hour <= 17) return 'Good Afternoon';
  return 'Good Evening';
}

// ---------------------------------------------------------------------------
// Tick — called every second
// ---------------------------------------------------------------------------

/**
 * Retrieve the current time and update the DOM.
 *
 * Wraps `new Date()` in a try/catch; on any failure, renders placeholder
 * strings so the widget remains visible and informative.
 */
export function tick() {
  const els = getElements();

  try {
    const now = new Date();

    // Validate that we actually got a usable Date
    if (isNaN(now.getTime())) {
      throw new Error('Invalid date returned by system clock');
    }

    const timeStr = formatTime(now);
    const dateStr = formatDate(now);
    const greetingStr = getGreeting(now.getHours());

    if (els.time) {
      els.time.textContent = timeStr;
      els.time.setAttribute('datetime', now.toISOString());
    }
    if (els.date) {
      els.date.textContent = dateStr;
    }
    if (els.greeting) {
      els.greeting.textContent = greetingStr;
    }
  } catch (_err) {
    if (els.time) els.time.textContent = '--:--:--';
    if (els.date) els.date.textContent = 'Date unavailable';
    if (els.greeting) els.greeting.textContent = '';
  }
}

// ---------------------------------------------------------------------------
// init — entry point called by app.js
// ---------------------------------------------------------------------------

/**
 * Initialise the clock widget.
 *
 * Calls tick() immediately so the display is populated before the first
 * second elapses, then schedules subsequent ticks every 1 000 ms.
 */
export function init() {
  tick();
  setInterval(tick, 1000);
}
