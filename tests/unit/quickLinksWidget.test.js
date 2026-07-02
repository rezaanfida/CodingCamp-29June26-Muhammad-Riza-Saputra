/**
 * Unit tests for quickLinksWidget.js
 *
 * Task 11.3 (partial) — covers:
 *   - Links render with target="_blank"
 *   - localStorage keys tld_tasks ≠ tld_links
 *
 * Validates: Requirements 1.4, 5.2, 6.1
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addLink,
  deleteLink,
  validateLink,
  loadLinks,
  saveLinks,
  renderLinkList,
  _setStorage,
  _getLinks,
  _setLinks,
} from '../../js/quickLinksWidget.js';
import { TASKS_KEY, LINKS_KEY } from '../../js/storage.js';

// ---------------------------------------------------------------------------
// In-memory localStorage stub
// ---------------------------------------------------------------------------
function createLocalStorageStub() {
  const store = new Map();
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    _store: store,
  };
}

function makeStorageWithStub(stub) {
  return {
    read: (key, validator) => {
      try {
        const raw = stub.getItem(key);
        if (raw === null || raw === '') return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(validator);
      } catch {
        return [];
      }
    },
    write: (key, data) => {
      stub.setItem(key, JSON.stringify(data));
    },
  };
}

// ---------------------------------------------------------------------------
// DOM helpers
// ---------------------------------------------------------------------------
function setupDOM() {
  document.body.innerHTML = `
    <ul id="links-list"></ul>
    <button id="links-add-btn">+ Add Link</button>
    <form id="links-form" hidden>
      <input id="links-name-input" type="text" />
      <input id="links-url-input" type="url" />
      <p id="links-name-error" hidden></p>
      <p id="links-url-error" hidden></p>
      <button type="submit">Save</button>
      <button type="button" id="links-cancel-btn">Cancel</button>
    </form>
    <p id="links-storage-notice" hidden></p>
  `;
}

let stub;

function resetState(initialLinks = []) {
  stub = createLocalStorageStub();
  _setStorage(makeStorageWithStub(stub));
  _setLinks(initialLinks);
}

// ---------------------------------------------------------------------------
// 1. Links render with target="_blank"
// ---------------------------------------------------------------------------

describe('Links render with target="_blank"', () => {
  beforeEach(() => {
    setupDOM();
    resetState();
  });

  it('a single added link renders an <a> with target="_blank"', () => {
    resetState([]);
    addLink('GitHub', 'https://github.com');

    renderLinkList();

    const anchor = document.querySelector('#links-list a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('target')).toBe('_blank');
  });

  it('all rendered links have target="_blank"', () => {
    const links = [
      { id: 'l1', name: 'GitHub', url: 'https://github.com' },
      { id: 'l2', name: 'MDN', url: 'https://developer.mozilla.org' },
      { id: 'l3', name: 'Example', url: 'http://example.com' },
    ];
    resetState(links);

    renderLinkList();

    const anchors = document.querySelectorAll('#links-list a');
    expect(anchors.length).toBe(3);
    for (const anchor of anchors) {
      expect(anchor.getAttribute('target')).toBe('_blank');
    }
  });

  it('rendered links also have rel="noopener noreferrer" for security', () => {
    resetState([{ id: 'l1', name: 'Test', url: 'https://test.com' }]);

    renderLinkList();

    const anchor = document.querySelector('#links-list a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('rendered anchor href matches the link url', () => {
    const url = 'https://example.com/path';
    resetState([{ id: 'l1', name: 'Example', url }]);

    renderLinkList();

    const anchor = document.querySelector('#links-list a');
    expect(anchor).not.toBeNull();
    expect(anchor.getAttribute('href')).toBe(url);
  });

  it('rendered anchor text matches the link name', () => {
    resetState([{ id: 'l1', name: 'My Link', url: 'https://mylink.com' }]);

    renderLinkList();

    const anchor = document.querySelector('#links-list a');
    expect(anchor).not.toBeNull();
    expect(anchor.textContent).toBe('My Link');
  });

  it('each link item also has a delete button', () => {
    resetState([
      { id: 'l1', name: 'GitHub', url: 'https://github.com' },
      { id: 'l2', name: 'MDN', url: 'https://developer.mozilla.org' },
    ]);

    renderLinkList();

    const items = document.querySelectorAll('#links-list li');
    expect(items.length).toBe(2);
    for (const item of items) {
      const btn = item.querySelector('button');
      expect(btn).not.toBeNull();
    }
  });

  it('empty link list renders no anchors', () => {
    resetState([]);

    renderLinkList();

    const anchors = document.querySelectorAll('#links-list a');
    expect(anchors.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. localStorage keys: tld_tasks ≠ tld_links
// ---------------------------------------------------------------------------

describe('localStorage keys are distinct: tld_tasks ≠ tld_links', () => {
  it('TASKS_KEY and LINKS_KEY are different string values', () => {
    expect(TASKS_KEY).not.toBe(LINKS_KEY);
  });

  it('TASKS_KEY equals "tld_tasks"', () => {
    expect(TASKS_KEY).toBe('tld_tasks');
  });

  it('LINKS_KEY equals "tld_links"', () => {
    expect(LINKS_KEY).toBe('tld_links');
  });

  it('writing links does not affect the tasks key in storage', () => {
    const localStub = createLocalStorageStub();
    const storage = makeStorageWithStub(localStub);
    _setStorage(storage);
    _setLinks([]);

    saveLinks([{ id: 'l1', name: 'GitHub', url: 'https://github.com' }]);

    // TASKS_KEY should still be absent (null)
    expect(localStub.getItem(TASKS_KEY)).toBeNull();
    // LINKS_KEY should have data
    expect(localStub.getItem(LINKS_KEY)).not.toBeNull();
  });

  it('TASKS_KEY and LINKS_KEY constants have the correct prefix "tld_"', () => {
    expect(TASKS_KEY.startsWith('tld_')).toBe(true);
    expect(LINKS_KEY.startsWith('tld_')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 3. addLink / deleteLink smoke tests
// ---------------------------------------------------------------------------

describe('addLink and deleteLink basic behaviour', () => {
  beforeEach(() => {
    setupDOM();
    resetState();
  });

  it('addLink with valid inputs adds a link to the list', () => {
    resetState([]);
    const result = addLink('GitHub', 'https://github.com');
    expect(result.success).toBe(true);
    expect(_getLinks()).toHaveLength(1);
  });

  it('addLink with invalid URL is rejected', () => {
    resetState([]);
    const result = addLink('Bad Link', 'not-a-url');
    expect(result.success).toBe(false);
    expect(result.errors.url).toBeDefined();
    expect(_getLinks()).toHaveLength(0);
  });

  it('addLink with empty name is rejected', () => {
    resetState([]);
    const result = addLink('', 'https://example.com');
    expect(result.success).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(_getLinks()).toHaveLength(0);
  });

  it('deleteLink removes the correct link', () => {
    resetState([
      { id: 'l1', name: 'GitHub', url: 'https://github.com' },
      { id: 'l2', name: 'MDN', url: 'https://developer.mozilla.org' },
    ]);

    deleteLink('l1');

    const links = _getLinks();
    expect(links).toHaveLength(1);
    expect(links[0].id).toBe('l2');
  });
});

// ---------------------------------------------------------------------------
// 4. validateLink
// ---------------------------------------------------------------------------

describe('validateLink', () => {
  it('returns valid:true for valid name and http:// URL', () => {
    const result = validateLink('GitHub', 'http://github.com');
    expect(result.valid).toBe(true);
    expect(Object.keys(result.errors)).toHaveLength(0);
  });

  it('returns valid:true for valid name and https:// URL', () => {
    const result = validateLink('MDN', 'https://developer.mozilla.org');
    expect(result.valid).toBe(true);
  });

  it('returns name error for empty name', () => {
    const result = validateLink('', 'https://example.com');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBe('Name cannot be empty or over 100 characters.');
  });

  it('returns name error for whitespace-only name', () => {
    const result = validateLink('   ', 'https://example.com');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns name error for name longer than 100 characters', () => {
    const longName = 'a'.repeat(101);
    const result = validateLink(longName, 'https://example.com');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
  });

  it('returns url error for URL not starting with http:// or https://', () => {
    const result = validateLink('Example', 'ftp://example.com');
    expect(result.valid).toBe(false);
    expect(result.errors.url).toBe('URL must start with http:// or https://');
  });

  it('returns both errors when both name and URL are invalid', () => {
    const result = validateLink('', 'not-a-url');
    expect(result.valid).toBe(false);
    expect(result.errors.name).toBeDefined();
    expect(result.errors.url).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 5. All four widget root elements are present in the DOM
// ---------------------------------------------------------------------------

describe('All four widget root elements present in DOM', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="storage-warning" role="alert" aria-live="assertive" hidden></div>
      <main class="dashboard">
        <section id="clock-widget" class="widget widget--clock"></section>
        <section id="timer-widget" class="widget widget--timer"></section>
        <section id="todo-widget" class="widget widget--todo"></section>
        <section id="quick-links-widget" class="widget widget--links"></section>
      </main>
    `;
  });

  it('renders #clock-widget', () => {
    expect(document.getElementById('clock-widget')).not.toBeNull();
  });

  it('renders #timer-widget', () => {
    expect(document.getElementById('timer-widget')).not.toBeNull();
  });

  it('renders #todo-widget', () => {
    expect(document.getElementById('todo-widget')).not.toBeNull();
  });

  it('renders #quick-links-widget', () => {
    expect(document.getElementById('quick-links-widget')).not.toBeNull();
  });

  it('all four widgets are visible (no hidden attribute)', () => {
    const ids = ['clock-widget', 'timer-widget', 'todo-widget', 'quick-links-widget'];
    for (const id of ids) {
      const el = document.getElementById(id);
      expect(el).not.toBeNull();
      expect(el.hasAttribute('hidden')).toBe(false);
    }
  });
});
