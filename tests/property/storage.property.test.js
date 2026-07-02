/**
 * Property-Based Tests for storage.js
 *
 * Feature: todo-life-dashboard
 * Property 17: Storage validation discards malformed elements
 * Validates: Requirements 6.3
 *
 * Strategy:
 *  - Build arrays that mix valid Task objects with various malformed objects.
 *  - Assert that readStorage returns ONLY the elements satisfying the
 *    validator, silently discarding the rest.
 *  - A local in-memory localStorage stub is used so no browser is needed.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { readStorage, writeStorage, TASKS_KEY } from '../../js/storage.js';

// ---------------------------------------------------------------------------
// Minimal in-memory localStorage stub
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

// ---------------------------------------------------------------------------
// Validator used by the storage layer for Task objects
// ---------------------------------------------------------------------------
/** @param {unknown} item */
function isValidTask(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    item.title.trim().length >= 1 &&
    item.title.trim().length <= 200 &&
    typeof item.completed === 'boolean'
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a well-formed Task object. */
const validTaskArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 40 }),
  title: fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length >= 1),
  completed: fc.boolean(),
});

/** Generates an object that will FAIL isValidTask. */
const malformedTaskArb = fc.oneof(
  // Missing fields
  fc.record({ id: fc.string({ minLength: 1 }) }),
  fc.record({ title: fc.string({ minLength: 1 }), completed: fc.boolean() }),
  fc.record({ id: fc.string({ minLength: 1 }), title: fc.string({ minLength: 1 }) }),
  // Wrong types
  fc.record({ id: fc.integer(), title: fc.string({ minLength: 1 }), completed: fc.boolean() }),
  fc.record({ id: fc.string({ minLength: 1 }), title: fc.integer(), completed: fc.boolean() }),
  fc.record({ id: fc.string({ minLength: 1 }), title: fc.string({ minLength: 1 }), completed: fc.string() }),
  // Empty/whitespace-only title (violates 1-200 char trimmed rule)
  fc.record({
    id: fc.string({ minLength: 1 }),
    title: fc.constant('   '),
    completed: fc.boolean(),
  }),
  // Non-object primitives
  fc.integer(),
  fc.string(),
  fc.boolean(),
  fc.constant(null),
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 17 — Storage validation discards malformed elements', () => {
  let localStorageStub;

  beforeEach(() => {
    localStorageStub = createLocalStorageStub();
    // Patch global localStorage for the duration of each test
    vi.stubGlobal('localStorage', localStorageStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns only valid elements from a mixed array', () => {
    // Feature: todo-life-dashboard, Property 17: Storage validation discards malformed elements
    fc.assert(
      fc.property(
        fc.array(validTaskArb, { minLength: 0, maxLength: 10 }),
        fc.array(malformedTaskArb, { minLength: 0, maxLength: 10 }),
        (validTasks, malformedItems) => {
          // Interleave valid and malformed items in a single array
          const mixed = [...validTasks, ...malformedItems].sort(() => Math.random() - 0.5);

          // Write the mixed array to the stub
          localStorageStub.setItem(TASKS_KEY, JSON.stringify(mixed));

          const result = readStorage(TASKS_KEY, isValidTask);

          // Must return exactly as many items as there are valid tasks
          expect(result).toHaveLength(validTasks.length);

          // Every returned item must satisfy the validator
          for (const item of result) {
            expect(isValidTask(item)).toBe(true);
          }

          // No malformed item should appear in the result
          for (const item of result) {
            // A returned item was valid — confirm it came from validTasks
            const matchesOriginal = validTasks.some(
              (t) =>
                t.id === item.id &&
                t.title === item.title &&
                t.completed === item.completed,
            );
            expect(matchesOriginal).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns [] when the stored value is not an array', () => {
    // Feature: todo-life-dashboard, Property 17: Storage validation discards malformed elements
    fc.assert(
      fc.property(
        // Non-array JSON values: objects, numbers, strings, booleans, null
        fc.oneof(
          fc.record({ foo: fc.string() }),
          fc.integer(),
          fc.string(),
          fc.boolean(),
          fc.constant(null),
        ),
        (nonArrayValue) => {
          localStorageStub.setItem(TASKS_KEY, JSON.stringify(nonArrayValue));

          const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
          const result = readStorage(TASKS_KEY, isValidTask);
          warnSpy.mockRestore();

          expect(result).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns [] and logs console.warn when stored value is malformed JSON', () => {
    // Feature: todo-life-dashboard, Property 17: Storage validation discards malformed elements
    const malformedStrings = [
      '{broken json',
      '[1,2,',
      'undefined',
      'NaN',
      '',
    ];

    for (const badJson of malformedStrings) {
      localStorageStub.setItem(TASKS_KEY, badJson);

      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const result = readStorage(TASKS_KEY, isValidTask);

      // Empty string → getItem returns '' which readStorage treats as empty
      if (badJson === '') {
        expect(result).toEqual([]);
      } else {
        expect(result).toEqual([]);
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(TASKS_KEY),
          expect.anything(),
        );
      }

      warnSpy.mockRestore();
    }
  });

  it('returns [] when the key is absent from storage', () => {
    // Feature: todo-life-dashboard, Property 17: Storage validation discards malformed elements
    // Do NOT set anything — key is absent
    const result = readStorage(TASKS_KEY, isValidTask);
    expect(result).toEqual([]);
  });

  it('returns all elements when every element is valid', () => {
    // Feature: todo-life-dashboard, Property 17: Storage validation discards malformed elements
    fc.assert(
      fc.property(
        fc.array(validTaskArb, { minLength: 0, maxLength: 20 }),
        (validTasks) => {
          localStorageStub.setItem(TASKS_KEY, JSON.stringify(validTasks));

          const result = readStorage(TASKS_KEY, isValidTask);

          expect(result).toHaveLength(validTasks.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
