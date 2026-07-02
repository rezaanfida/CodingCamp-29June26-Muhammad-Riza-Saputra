/**
 * storage.js — Shared localStorage utilities for the To-Do Life Dashboard.
 *
 * Provides consistent serialization, deserialization, and schema validation
 * for all localStorage access across widget modules.
 */

/** localStorage key for the task list. */
export const TASKS_KEY = 'tld_tasks';

/** localStorage key for the quick-links list. */
export const LINKS_KEY = 'tld_links';

/**
 * Read an array from localStorage, filtering each element through a
 * caller-supplied validator.
 *
 * Behaviour:
 *  - If the key is absent or the stored value is empty, returns [].
 *  - If the parsed value is not an array, discards it and returns [].
 *  - Any element that does not satisfy `validator` is silently dropped.
 *  - If any exception occurs (JSON parse error, localStorage access error,
 *    etc.) a console.warn is emitted with the failing key and [] is returned.
 *
 * @template T
 * @param {string} key - The localStorage key to read from.
 * @param {(item: unknown) => item is T} validator - Predicate that returns
 *   true for well-formed elements and false for malformed ones.
 * @returns {T[]} Array of valid elements, or [] on any failure.
 */
export function readStorage(key, validator) {
  try {
    const raw = localStorage.getItem(key);

    // Nothing stored yet — treat as empty list
    if (raw === null || raw === '') {
      return [];
    }

    const parsed = JSON.parse(raw);

    // Guard: persisted value must be an array
    if (!Array.isArray(parsed)) {
      throw new Error(`Expected array, got ${typeof parsed}`);
    }

    // Filter out any elements that fail schema validation
    return parsed.filter(validator);
  } catch (e) {
    console.warn(`[tld] Failed to read storage key "${key}":`, e);
    return [];
  }
}

/**
 * Serialize and write an array to localStorage.
 *
 * If the write fails (e.g. storage quota exceeded, private-browsing
 * restrictions) the exception is re-thrown so callers can handle it.
 *
 * @template T
 * @param {string} key - The localStorage key to write to.
 * @param {T[]} data - Array of items to persist.
 * @returns {void}
 */
export function writeStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}
