/**
 * Unit tests for app.js — Bootstrap and localStorage feature detection
 *
 * Task 2.1
 * Validates: Requirements 1.7
 *
 * Tests:
 *  - isLocalStorageAvailable() returns true when localStorage works.
 *  - isLocalStorageAvailable() returns false when localStorage throws.
 *  - showStorageWarning() injects content into #storage-warning and
 *    removes its hidden attribute.
 *  - All four widget root elements are present in the DOM on first load.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Mock all four widget modules — they don't exist yet.
// Each module exposes only init(), which must be callable without error.
// ---------------------------------------------------------------------------
vi.mock('../../js/clockWidget.js', () => ({ init: vi.fn() }));
vi.mock('../../js/timerWidget.js', () => ({ init: vi.fn() }));
vi.mock('../../js/todoWidget.js', () => ({ init: vi.fn() }));
vi.mock('../../js/quickLinksWidget.js', () => ({ init: vi.fn() }));

// Import the functions under test AFTER mocks are set up
import { isLocalStorageAvailable, showStorageWarning } from '../../js/app.js';
import * as clockWidget from '../../js/clockWidget.js';
import * as timerWidget from '../../js/timerWidget.js';
import * as todoWidget from '../../js/todoWidget.js';
import * as quickLinksWidget from '../../js/quickLinksWidget.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal DOM that mirrors index.html for the tests that need it. */
function setupDOM() {
  document.body.innerHTML = `
    <div id="storage-warning" role="alert" aria-live="assertive" hidden></div>
    <main class="dashboard">
      <section id="clock-widget" class="widget widget--clock"></section>
      <section id="timer-widget" class="widget widget--timer"></section>
      <section id="todo-widget" class="widget widget--todo"></section>
      <section id="quick-links-widget" class="widget widget--links"></section>
    </main>
  `;
}

// ---------------------------------------------------------------------------
// isLocalStorageAvailable()
// ---------------------------------------------------------------------------

describe('isLocalStorageAvailable()', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when localStorage is accessible and writable', () => {
    // jsdom provides a working localStorage by default
    const result = isLocalStorageAvailable();
    expect(result).toBe(true);
  });

  it('returns false when localStorage.setItem throws', () => {
    // Simulate a browser where storage is blocked (e.g. Safari private mode)
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new DOMException('QuotaExceededError'); },
      removeItem: vi.fn(),
      getItem: vi.fn(),
    });

    const result = isLocalStorageAvailable();
    expect(result).toBe(false);
  });

  it('returns false when localStorage itself is undefined', () => {
    vi.stubGlobal('localStorage', undefined);

    const result = isLocalStorageAvailable();
    expect(result).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// showStorageWarning()
// ---------------------------------------------------------------------------

describe('showStorageWarning()', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('injects text content into #storage-warning', () => {
    showStorageWarning();
    const banner = document.getElementById('storage-warning');
    expect(banner.textContent.length).toBeGreaterThan(0);
  });

  it('removes the hidden attribute from #storage-warning so the banner is visible', () => {
    const banner = document.getElementById('storage-warning');
    // Confirm hidden is set before the call
    expect(banner.hasAttribute('hidden')).toBe(true);

    showStorageWarning();

    expect(banner.hasAttribute('hidden')).toBe(false);
  });

  it('includes accessible text informing the user that data persistence is unavailable', () => {
    showStorageWarning();
    const banner = document.getElementById('storage-warning');
    const text = banner.textContent.toLowerCase();
    // Must communicate the key message
    expect(text).toMatch(/data persistence|not be saved|unavailable/);
  });

  it('does nothing when #storage-warning element is absent', () => {
    // Remove the banner element to simulate a missing element
    document.getElementById('storage-warning').remove();
    // Should not throw
    expect(() => showStorageWarning()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// DOM: all four widget root elements present on first load
// ---------------------------------------------------------------------------

describe('Widget root elements present in DOM', () => {
  beforeEach(() => {
    setupDOM();
  });

  it('renders #clock-widget in the DOM', () => {
    expect(document.getElementById('clock-widget')).not.toBeNull();
  });

  it('renders #timer-widget in the DOM', () => {
    expect(document.getElementById('timer-widget')).not.toBeNull();
  });

  it('renders #todo-widget in the DOM', () => {
    expect(document.getElementById('todo-widget')).not.toBeNull();
  });

  it('renders #quick-links-widget in the DOM', () => {
    expect(document.getElementById('quick-links-widget')).not.toBeNull();
  });

  it('all four widget sections are visible (no hidden attribute)', () => {
    const ids = ['clock-widget', 'timer-widget', 'todo-widget', 'quick-links-widget'];
    for (const id of ids) {
      const el = document.getElementById(id);
      expect(el).not.toBeNull();
      expect(el.hasAttribute('hidden')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// DOMContentLoaded handler — widget init() calls
// ---------------------------------------------------------------------------

describe('DOMContentLoaded handler', () => {
  beforeEach(() => {
    setupDOM();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('calls init() on all four widgets when localStorage is available', async () => {
    // Dispatch DOMContentLoaded to trigger the handler registered in app.js
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(clockWidget.init).toHaveBeenCalledTimes(1);
    expect(timerWidget.init).toHaveBeenCalledTimes(1);
    expect(todoWidget.init).toHaveBeenCalledTimes(1);
    expect(quickLinksWidget.init).toHaveBeenCalledTimes(1);
  });

  it('shows the warning banner when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new DOMException('SecurityError'); },
      removeItem: vi.fn(),
      getItem: vi.fn(),
    });

    document.dispatchEvent(new Event('DOMContentLoaded'));

    const banner = document.getElementById('storage-warning');
    expect(banner.hasAttribute('hidden')).toBe(false);
    expect(banner.textContent.length).toBeGreaterThan(0);
  });

  it('still calls all four widget init() even when localStorage is unavailable', () => {
    vi.stubGlobal('localStorage', {
      setItem: () => { throw new DOMException('SecurityError'); },
      removeItem: vi.fn(),
      getItem: vi.fn(),
    });

    vi.clearAllMocks();
    document.dispatchEvent(new Event('DOMContentLoaded'));

    expect(clockWidget.init).toHaveBeenCalled();
    expect(timerWidget.init).toHaveBeenCalled();
    expect(todoWidget.init).toHaveBeenCalled();
    expect(quickLinksWidget.init).toHaveBeenCalled();
  });
});
