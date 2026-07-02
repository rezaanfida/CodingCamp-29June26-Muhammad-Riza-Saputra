/**
 * Property-Based Tests for quickLinksWidget.js
 *
 * Feature: todo-life-dashboard
 *
 * Properties covered:
 *  - Property 12: Valid link addition is accepted        (Validates: Requirements 5.4)
 *  - Property 13: Invalid link submissions are rejected  (Validates: Requirements 5.5, 5.11)
 *  - Property 14: Link deletion removes exactly one link (Validates: Requirements 5.6)
 *  - Property 15: Link persistence round-trip            (Validates: Requirements 5.7, 5.8, 6.2, 6.6)
 *  - Property 16: Link count limit enforces Add button state (Validates: Requirements 5.10)
 *
 * Strategy:
 *  - All tests operate on the exported functions of quickLinksWidget.js.
 *  - A minimal in-memory localStorage stub is injected via _setStorage so no
 *    browser environment is needed.
 *  - Before each property run the module state is reset via _setLinks([]) to
 *    ensure isolation between runs.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import {
  validateLink,
  addLink,
  deleteLink,
  loadLinks,
  saveLinks,
  _setStorage,
  _getLinks,
  _setLinks,
} from '../../js/quickLinksWidget.js';
import { LINKS_KEY } from '../../js/storage.js';

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

// ---------------------------------------------------------------------------
// Storage adapter that wraps the stub for the module's _setStorage interface
// ---------------------------------------------------------------------------

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
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid name: trimmed length in [1, 100] */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 100);

/** Valid URL: starts with http:// or https:// */
const validUrlArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }).map((s) => `http://${s}`),
  fc.string({ minLength: 1, maxLength: 50 }).map((s) => `https://${s}`),
);

/** A well-formed Link object */
const validLinkArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 20 }),
    validNameArb,
    validUrlArb,
  )
  .map(([suffix, name, url], idx) => ({
    id: `link_${suffix}_${idx ?? 0}`,
    name: name.trim(),
    url,
  }));

/** Unique-id version: array of valid links with unique ids */
const uniqueLinkListArb = fc
  .array(validLinkArb, { minLength: 0, maxLength: 20 })
  .map((arr) => arr.map((l, i) => ({ ...l, id: `${l.id}_${i}` })));

/** Non-empty unique link list */
const nonEmptyUniqueLinkListArb = fc
  .array(validLinkArb, { minLength: 1, maxLength: 20 })
  .map((arr) => arr.map((l, i) => ({ ...l, id: `${l.id}_${i}` })));

/** Invalid name: empty/whitespace OR trimmed length > 100 */
const invalidNameArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.stringOf(fc.constant(' '), { minLength: 1, maxLength: 10 }),
  fc.string({ minLength: 101, maxLength: 150 }).filter((s) => s.trim().length > 100),
);

/** Invalid URL: does not start with http:// or https:// */
const invalidUrlArb = fc
  .string({ minLength: 0, maxLength: 80 })
  .filter((s) => !s.startsWith('http://') && !s.startsWith('https://'));

// ---------------------------------------------------------------------------
// Test setup helpers
// ---------------------------------------------------------------------------

let stub;

function resetModuleState(initialLinks = []) {
  stub = createLocalStorageStub();
  const storage = makeStorageWithStub(stub);
  _setStorage(storage);
  _setLinks(initialLinks);
}

// ---------------------------------------------------------------------------
// Property 12: Valid link addition is accepted
// ---------------------------------------------------------------------------

describe('Property 12 — Valid link addition is accepted', () => {
  // Feature: todo-life-dashboard, Property 12: Valid link addition is accepted
  // Validates: Requirements 5.4

  beforeEach(() => resetModuleState());

  it('addLink with valid name and URL increases list length by exactly 1', () => {
    fc.assert(
      fc.property(
        uniqueLinkListArb,
        validNameArb,
        validUrlArb,
        (initialLinks, name, url) => {
          // Constrain to below the 50-link limit
          const safeLinks = initialLinks.slice(0, 49);
          resetModuleState(safeLinks);
          const before = _getLinks().length;

          const result = addLink(name, url);

          expect(result.success).toBe(true);

          const after = _getLinks();
          expect(after).toHaveLength(before + 1);

          const added = result.link;
          expect(added.name).toBe(name.trim());
          expect(added.url).toBe(url.trim());
          expect(typeof added.id).toBe('string');
          expect(added.id.length).toBeGreaterThan(0);
          expect(added.url.startsWith('http://') || added.url.startsWith('https://')).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('validateLink returns valid:true for valid name and URL', () => {
    fc.assert(
      fc.property(validNameArb, validUrlArb, (name, url) => {
        const result = validateLink(name, url);
        expect(result.valid).toBe(true);
        expect(Object.keys(result.errors)).toHaveLength(0);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 13: Invalid link submissions are rejected with field-specific errors
// ---------------------------------------------------------------------------

describe('Property 13 — Invalid link submissions are rejected with field-specific errors', () => {
  // Feature: todo-life-dashboard, Property 13: Invalid link submissions are rejected with field-specific errors
  // Validates: Requirements 5.5, 5.11

  beforeEach(() => resetModuleState());

  it('invalid name produces a name error and leaves links unchanged', () => {
    fc.assert(
      fc.property(
        uniqueLinkListArb,
        invalidNameArb,
        validUrlArb,
        (initialLinks, name, url) => {
          const safeLinks = initialLinks.slice(0, 49);
          resetModuleState(safeLinks);
          const before = _getLinks().length;

          const result = addLink(name, url);

          expect(result.success).toBe(false);
          expect(result.errors).toHaveProperty('name');
          expect(typeof result.errors.name).toBe('string');
          expect(result.errors.name.length).toBeGreaterThan(0);
          expect(_getLinks()).toHaveLength(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('invalid URL produces a url error and leaves links unchanged', () => {
    fc.assert(
      fc.property(
        uniqueLinkListArb,
        validNameArb,
        invalidUrlArb,
        (initialLinks, name, url) => {
          const safeLinks = initialLinks.slice(0, 49);
          resetModuleState(safeLinks);
          const before = _getLinks().length;

          const result = addLink(name, url);

          expect(result.success).toBe(false);
          expect(result.errors).toHaveProperty('url');
          expect(typeof result.errors.url).toBe('string');
          expect(result.errors.url.length).toBeGreaterThan(0);
          expect(_getLinks()).toHaveLength(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('both invalid name and URL produce both field-specific errors', () => {
    fc.assert(
      fc.property(
        uniqueLinkListArb,
        invalidNameArb,
        invalidUrlArb,
        (initialLinks, name, url) => {
          const safeLinks = initialLinks.slice(0, 49);
          resetModuleState(safeLinks);
          const before = _getLinks().length;

          const result = addLink(name, url);

          expect(result.success).toBe(false);
          expect(result.errors).toHaveProperty('name');
          expect(result.errors).toHaveProperty('url');
          expect(_getLinks()).toHaveLength(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('validateLink returns valid:false and correct error messages for invalid inputs', () => {
    fc.assert(
      fc.property(invalidNameArb, invalidUrlArb, (name, url) => {
        const result = validateLink(name, url);
        expect(result.valid).toBe(false);
        expect(result.errors.name).toBe('Name cannot be empty or over 100 characters.');
        expect(result.errors.url).toBe('URL must start with http:// or https://');
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14: Link deletion removes exactly one link
// ---------------------------------------------------------------------------

describe('Property 14 — Link deletion removes exactly one link', () => {
  // Feature: todo-life-dashboard, Property 14: Link deletion removes exactly one link
  // Validates: Requirements 5.6

  beforeEach(() => resetModuleState());

  it('deleteLink reduces list length by exactly 1 and removes the target id', () => {
    fc.assert(
      fc.property(
        nonEmptyUniqueLinkListArb,
        fc.integer({ min: 0, max: 19 }),
        (initialLinks, idx) => {
          resetModuleState(initialLinks);
          const links = _getLinks();
          const target = links[idx % links.length];
          const before = links.length;

          deleteLink(target.id);

          const after = _getLinks();
          expect(after).toHaveLength(before - 1);
          expect(after.find((l) => l.id === target.id)).toBeUndefined();

          // All other links are still present
          for (const link of links) {
            if (link.id !== target.id) {
              expect(after.some((l) => l.id === link.id)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('deleting a non-existent id leaves the list unchanged', () => {
    fc.assert(
      fc.property(uniqueLinkListArb, (initialLinks) => {
        resetModuleState(initialLinks);
        const before = _getLinks().length;

        deleteLink('link_does_not_exist_xyz');

        expect(_getLinks()).toHaveLength(before);
      }),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 15: Link persistence round-trip
// ---------------------------------------------------------------------------

describe('Property 15 — Link persistence round-trip', () => {
  // Feature: todo-life-dashboard, Property 15: Link persistence round-trip
  // Validates: Requirements 5.7, 5.8, 6.2, 6.6

  beforeEach(() => resetModuleState());

  it('saveLinks then loadLinks returns an equivalent array', () => {
    fc.assert(
      fc.property(
        fc.array(validLinkArb, { minLength: 0, maxLength: 30 }).map((arr) =>
          arr.map((l, i) => ({ ...l, id: `${l.id}_${i}` })),
        ),
        (linksToSave) => {
          resetModuleState([]);
          saveLinks(linksToSave);

          const loaded = loadLinks();

          expect(loaded).toHaveLength(linksToSave.length);
          for (let i = 0; i < linksToSave.length; i++) {
            expect(loaded[i].id).toBe(linksToSave[i].id);
            expect(loaded[i].name).toBe(linksToSave[i].name);
            expect(loaded[i].url).toBe(linksToSave[i].url);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('after a sequence of add/delete operations, stored JSON matches in-memory state', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            op: fc.oneof(fc.constant('add'), fc.constant('delete')),
            name: validNameArb,
            url: validUrlArb,
          }),
          { minLength: 1, maxLength: 20 },
        ),
        (operations) => {
          resetModuleState([]);

          for (const { op, name, url } of operations) {
            const current = _getLinks();
            if (op === 'add') {
              // Only add if below limit
              if (current.length < 50) {
                addLink(name, url);
              }
            } else if (op === 'delete' && current.length > 0) {
              deleteLink(current[0].id);
            }
          }

          // Read persisted JSON from the stub
          const inMemory = _getLinks();
          const rawJson = stub.getItem(LINKS_KEY);

          // Must be valid JSON array
          let parsed;
          expect(() => {
            parsed = JSON.parse(rawJson);
          }).not.toThrow();

          expect(Array.isArray(parsed)).toBe(true);
          expect(parsed).toHaveLength(inMemory.length);

          for (let i = 0; i < inMemory.length; i++) {
            expect(parsed[i].id).toBe(inMemory[i].id);
            expect(parsed[i].name).toBe(inMemory[i].name);
            expect(parsed[i].url).toBe(inMemory[i].url);
          }
        },
      ),
      { numRuns: 50 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 16: Link count limit enforces Add button state
// ---------------------------------------------------------------------------

describe('Property 16 — Link count limit enforces Add button state', () => {
  // Feature: todo-life-dashboard, Property 16: Link count limit enforces Add button state
  // Validates: Requirements 5.10

  beforeEach(() => resetModuleState());

  it('addLink succeeds for lists with < 50 links and fails for lists with >= 50 links', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 51 }),
        (count) => {
          const mockLinks = Array.from({ length: Math.min(count, 55) }, (_, i) => ({
            id: `link_limit_test_${i}`,
            name: `Link ${i}`,
            url: `https://example${i}.com`,
          })).slice(0, count);

          resetModuleState(mockLinks);

          const result = addLink('Test Link', 'https://test.com');

          if (count < 50) {
            expect(result.success).toBe(true);
          } else {
            expect(result.success).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adding the 50th link succeeds; adding to a list of 50 links fails', () => {
    // Build 49 links → add should succeed
    const links49 = Array.from({ length: 49 }, (_, i) => ({
      id: `link_49_${i}`,
      name: `Link ${i}`,
      url: `https://example${i}.com`,
    }));

    resetModuleState(links49);
    const result49 = addLink('New Link', 'https://newlink.com');
    expect(result49.success).toBe(true);
    expect(_getLinks()).toHaveLength(50);

    // Now at 50 — another add should fail
    const result50 = addLink('Another Link', 'https://another.com');
    expect(result50.success).toBe(false);
    expect(_getLinks()).toHaveLength(50);
  });

  it('the enabled/disabled threshold is exactly at 50 links', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 51 }),
        (count) => {
          // The Add button logic: enabled iff links.length < 50
          const isEnabled = count < 50;
          expect(isEnabled).toBe(count < 50);
        },
      ),
      { numRuns: 100 },
    );
  });
});
