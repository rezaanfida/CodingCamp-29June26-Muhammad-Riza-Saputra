/**
 * quickLinksWidget.js — Quick Links widget for the To-Do Life Dashboard.
 *
 * Responsibilities:
 *  - Render saved links from localStorage on init.
 *  - Add and delete links.
 *  - Validate name (non-empty, ≤100 chars) and URL (must start with http:// or https://).
 *  - Enforce maximum 50 links; disable Add button at the limit.
 *  - Persist full link array synchronously after every mutation.
 *
 * Public interface:
 *   init()                         — Wire up the widget, load links, and render.
 *   addLink(name, url)             — Validate and add a new link.
 *   deleteLink(id)                 — Remove a link by ID.
 *   loadLinks()                    — Read + validate links from localStorage.
 *   saveLinks(links)               — Persist links to localStorage.
 *   validateLink(name, url)        — Pure validation returning field-specific errors.
 *
 * Link shape: { id: string, name: string, url: string }
 *
 * Requirements: 5.1–5.11
 */

import { readStorage, writeStorage, LINKS_KEY } from './storage.js';

// ---------------------------------------------------------------------------
// Storage injection (allows tests to substitute a mock)
// ---------------------------------------------------------------------------

/** @type {{ read: typeof readStorage, write: typeof writeStorage }} */
let _storage = { read: readStorage, write: writeStorage };

/**
 * Override the storage backend — intended for tests only.
 *
 * @param {{ read: Function, write: Function }} storageOverride
 */
export function _setStorage(storageOverride) {
  _storage = storageOverride;
}

// ---------------------------------------------------------------------------
// In-memory state
// ---------------------------------------------------------------------------

/** @type {{ id: string, name: string, url: string }[]} */
let links = [];

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a link name and URL, returning field-specific errors.
 *
 * Rules:
 *  - name.trim().length must be in [1, 100]; error: "Name cannot be empty or over 100 characters."
 *  - url must start with "http://" or "https://"; error: "URL must start with http:// or https://"
 *
 * @param {string} name
 * @param {string} url
 * @returns {{ valid: boolean, errors: { name?: string, url?: string } }}
 */
export function validateLink(name, url) {
  const errors = {};

  const trimmedName = (name ?? '').trim();
  if (trimmedName.length === 0 || trimmedName.length > 100) {
    errors.name = 'Name cannot be empty or over 100 characters.';
  }

  const trimmedUrl = (url ?? '').trim();
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    errors.url = 'URL must start with http:// or https://';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---------------------------------------------------------------------------
// localStorage validator for Link objects
// ---------------------------------------------------------------------------

/**
 * Schema validator for a single Link object.
 *
 * Checks:
 *  - id is a non-empty string
 *  - name is a string of 1–100 chars (trimmed)
 *  - url starts with "http://" or "https://"
 *
 * @param {unknown} item
 * @returns {boolean}
 */
function isValidLink(item) {
  if (item === null || typeof item !== 'object') return false;
  if (typeof item.id !== 'string' || item.id.length === 0) return false;
  if (typeof item.name !== 'string') return false;
  const trimmedName = item.name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 100) return false;
  if (typeof item.url !== 'string') return false;
  if (!item.url.startsWith('http://') && !item.url.startsWith('https://')) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

/**
 * Load links from localStorage using the shared storage utility.
 * Returns an empty array on any failure.
 * Also updates the module-level `links` variable.
 *
 * @returns {{ id: string, name: string, url: string }[]}
 */
export function loadLinks() {
  links = _storage.read(LINKS_KEY, isValidLink);
  return links;
}

/**
 * Persist the current links array to localStorage.
 *
 * @param {{ id: string, name: string, url: string }[]} linksToSave
 * @returns {void}
 */
export function saveLinks(linksToSave) {
  _storage.write(LINKS_KEY, linksToSave);
}

// ---------------------------------------------------------------------------
// Add / Delete
// ---------------------------------------------------------------------------

/**
 * Add a new link.
 *
 * On validation failure: display field-specific inline errors without
 * mutating state. On success: append link, persist, re-render.
 *
 * @param {string} name
 * @param {string} url
 * @returns {{ success: boolean, errors?: { name?: string, url?: string }, link?: object }}
 */
export function addLink(name, url) {
  const validation = validateLink(name, url);

  if (!validation.valid) {
    // Display field-specific inline error messages without mutating state
    _showFieldErrors(validation.errors);
    return { success: false, errors: validation.errors };
  }

  // Enforce 50-link limit (guard for non-DOM callers too)
  if (links.length >= 50) {
    return { success: false, errors: { name: 'Maximum 50 links allowed.' } };
  }

  const newLink = {
    id: `link_${Date.now()}_${links.length}`,
    name: name.trim(),
    url: url.trim(),
  };

  links = [...links, newLink];
  saveLinks(links);
  renderLinkList();
  _updateAddButtonState();

  // Hide the form on success
  _hideForm();

  return { success: true, link: newLink };
}

/**
 * Delete a link by ID.
 *
 * Removes the link from the in-memory array, persists, re-renders,
 * and re-evaluates the Add button state.
 *
 * @param {string} id
 * @returns {void}
 */
export function deleteLink(id) {
  links = links.filter((link) => link.id !== id);
  saveLinks(links);
  renderLinkList();
  _updateAddButtonState();
}

// ---------------------------------------------------------------------------
// DOM helper
// ---------------------------------------------------------------------------

/**
 * Safe getElementById that returns null when running outside a browser.
 *
 * @param {string} id
 * @returns {HTMLElement | null}
 */
function _getElement(id) {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id);
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Render the links list into #links-list.
 *
 * Each link is rendered as an <li> containing:
 *  - An <a> with target="_blank" and rel="noopener noreferrer"
 *  - A delete <button>
 *
 * @returns {void}
 */
export function renderLinkList() {
  const list = _getElement('links-list');
  if (!list) return;

  list.innerHTML = '';

  for (const link of links) {
    const li = document.createElement('li');
    li.className = 'links__item';
    li.dataset.id = link.id;

    // Anchor element
    const anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.textContent = link.name;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.className = 'links__anchor';
    anchor.setAttribute('aria-label', `Open ${link.name} in new tab`);

    // Delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn btn--ghost links__delete';
    deleteBtn.textContent = '✕';
    deleteBtn.setAttribute('aria-label', `Delete link: ${link.name}`);
    deleteBtn.addEventListener('click', () => {
      deleteLink(link.id);
    });

    li.appendChild(anchor);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  }
}

// ---------------------------------------------------------------------------
// Form helpers (internal)
// ---------------------------------------------------------------------------

/**
 * Show the add-link form and update aria-expanded on the Add button.
 * @private
 */
function _showForm() {
  const form = _getElement('links-form');
  const addBtn = _getElement('links-add-btn');
  if (form) form.removeAttribute('hidden');
  if (addBtn) addBtn.setAttribute('aria-expanded', 'true');
}

/**
 * Hide the add-link form, clear inputs and errors, and reset aria-expanded.
 * @private
 */
function _hideForm() {
  const form = _getElement('links-form');
  const addBtn = _getElement('links-add-btn');
  const nameInput = _getElement('links-name-input');
  const urlInput = _getElement('links-url-input');

  if (form) form.setAttribute('hidden', '');
  if (addBtn) addBtn.setAttribute('aria-expanded', 'false');
  if (nameInput) nameInput.value = '';
  if (urlInput) urlInput.value = '';

  _clearFieldErrors();
}

/**
 * Display field-specific inline validation error messages.
 * @param {{ name?: string, url?: string }} errors
 * @private
 */
function _showFieldErrors(errors) {
  const nameError = _getElement('links-name-error');
  const urlError = _getElement('links-url-error');

  if (nameError) {
    if (errors.name) {
      nameError.textContent = errors.name;
      nameError.removeAttribute('hidden');
    } else {
      nameError.textContent = '';
      nameError.setAttribute('hidden', '');
    }
  }

  if (urlError) {
    if (errors.url) {
      urlError.textContent = errors.url;
      urlError.removeAttribute('hidden');
    } else {
      urlError.textContent = '';
      urlError.setAttribute('hidden', '');
    }
  }
}

/**
 * Clear all inline validation error messages.
 * @private
 */
function _clearFieldErrors() {
  const nameError = _getElement('links-name-error');
  const urlError = _getElement('links-url-error');

  if (nameError) {
    nameError.textContent = '';
    nameError.setAttribute('hidden', '');
  }
  if (urlError) {
    urlError.textContent = '';
    urlError.setAttribute('hidden', '');
  }
}

/**
 * Enable or disable the Add Link button based on the current link count.
 *
 * The button is disabled when links.length >= 50, and re-enabled when
 * a deletion brings the count back below 50.
 *
 * @private
 */
function _updateAddButtonState() {
  const addBtn = _getElement('links-add-btn');
  if (!addBtn) return;

  if (links.length >= 50) {
    addBtn.disabled = true;
    addBtn.setAttribute('aria-disabled', 'true');
  } else {
    addBtn.disabled = false;
    addBtn.removeAttribute('aria-disabled');
  }
}

// ---------------------------------------------------------------------------
// init — entry point called by app.js
// ---------------------------------------------------------------------------

/**
 * Initialise the Quick Links widget.
 *
 * - Tries to load links from localStorage.
 * - Shows a storage notice if localStorage is unavailable.
 * - Renders the list.
 * - Wires up Add, Cancel, and form submit event listeners.
 *
 * @returns {void}
 */
export function init() {
  // Try to load persisted links; handle localStorage unavailability gracefully
  try {
    links = loadLinks();
  } catch (_err) {
    links = [];
    const notice = _getElement('links-storage-notice');
    if (notice) {
      notice.textContent =
        'Saved links could not be loaded. Data persistence may be unavailable.';
      notice.removeAttribute('hidden');
    }
  }

  renderLinkList();
  _updateAddButtonState();

  // Wire Add Link button → show form
  const addBtn = _getElement('links-add-btn');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      // Only toggle if not disabled (limit not reached)
      if (!addBtn.disabled) {
        _showForm();
      }
    });
  }

  // Wire Cancel button → hide form
  const cancelBtn = _getElement('links-cancel-btn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', () => {
      _hideForm();
    });
  }

  // Wire form submit
  const form = _getElement('links-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const nameInput = _getElement('links-name-input');
      const urlInput = _getElement('links-url-input');

      const name = nameInput ? nameInput.value : '';
      const url = urlInput ? urlInput.value : '';

      addLink(name, url);
    });
  }
}

// ---------------------------------------------------------------------------
// Expose internal links array for testing
// ---------------------------------------------------------------------------

/**
 * Get the current in-memory link list (for testing).
 *
 * @returns {{ id: string, name: string, url: string }[]}
 */
export function _getLinks() {
  return links;
}

/**
 * Set the in-memory link list directly (for testing).
 *
 * @param {{ id: string, name: string, url: string }[]} newLinks
 */
export function _setLinks(newLinks) {
  links = [...newLinks];
}
