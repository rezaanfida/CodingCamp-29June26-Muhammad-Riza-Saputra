/**
 * app.js — Bootstrap module for the To-Do Life Dashboard.
 *
 * Responsibilities:
 *  1. Detect localStorage availability via a try/catch write test.
 *  2. Inject a warning banner into #storage-warning if localStorage
 *     is unavailable.
 *  3. Initialise all four widget modules on DOMContentLoaded.
 *
 * Requirements: 1.7
 */

import * as clockWidget from './clockWidget.js';
import * as timerWidget from './timerWidget.js';
import * as todoWidget from './todoWidget.js';
import * as quickLinksWidget from './quickLinksWidget.js';

/**
 * Detect whether localStorage is available and writable.
 *
 * Uses a try/catch write-then-remove test to cover environments where
 * localStorage exists but throws on access (e.g. private-browsing mode
 * in some browsers, or when cookies/storage are blocked by policy).
 *
 * @returns {boolean} true if localStorage is available, false otherwise.
 */
export function isLocalStorageAvailable() {
  try {
    const testKey = '__tld_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Inject a non-dismissible warning message into the #storage-warning
 * banner element and make it visible.
 *
 * The banner element already exists in index.html as:
 *   <div id="storage-warning" role="alert" aria-live="assertive" hidden>
 *
 * Calling this function populates it with accessible text and removes
 * the `hidden` attribute so it becomes visible at the top of the page.
 *
 * @returns {void}
 */
export function showStorageWarning() {
  const banner = document.getElementById('storage-warning');
  if (!banner) return;

  banner.textContent =
    'Data persistence unavailable: your browser does not support localStorage. ' +
    'Changes will not be saved.';

  // Make the banner visible by removing the hidden attribute
  banner.removeAttribute('hidden');
}

// ---------------------------------------------------------------------------
// Boot sequence — runs after the HTML document is fully parsed
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  // 1. Check storage availability
  const storageAvailable = isLocalStorageAvailable();

  // 2. Show warning banner before widget init if storage is unavailable
  if (!storageAvailable) {
    showStorageWarning();
  }

  // 3. Initialise all four widgets in prescribed order
  clockWidget.init();
  timerWidget.init();
  todoWidget.init();
  quickLinksWidget.init();
});
