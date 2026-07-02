/**
 * Property-Based Tests for todoWidget.js
 *
 * Feature: todo-life-dashboard
 * Properties 6–11 for the To-Do List widget.
 *
 * Strategy:
 *  - All tests operate on the pure logic functions exported by todoWidget.js.
 *  - A minimal in-memory localStorage stub is injected via _setStorage so no
 *    browser environment is needed.
 *  - Before each test the module state is reset via _setTasks([]) to ensure
 *    isolation between runs.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fc from 'fast-check';
import {
  validateTitle,
  addTask,
  editTask,
  toggleTask,
  deleteTask,
  loadTasks,
  saveTasks,
  isValidTask,
  _setStorage,
  _getTasks,
  _setTasks,
} from '../../js/todoWidget.js';
import { TASKS_KEY } from '../../js/storage.js';

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
// Storage wrappers that use the stub
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

/** Valid title strings: trimmed length in [1, 200]. */
const validTitleArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length >= 1 && s.trim().length <= 200);

/** Invalid title strings: empty or whitespace-only. */
const invalidTitleArb = fc.oneof(
  fc.constant(''),
  fc.constant('   '),
  fc.constant('\t\n'),
  fc.stringOf(fc.char().filter((c) => /\s/.test(c)), { minLength: 1, maxLength: 20 }),
);

/** Generates a valid Task object. */
const taskArb = fc.record({
  id: fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s.length > 0),
  title: validTitleArb,
  completed: fc.boolean(),
});

/** Generates a list of valid tasks with unique ids. */
const uniqueTaskListArb = fc
  .array(taskArb, { minLength: 0, maxLength: 20 })
  .map((arr) => {
    // Ensure unique ids by appending index
    return arr.map((t, i) => ({ ...t, id: `${t.id}_${i}` }));
  });

/** Generates a non-empty list of valid tasks with unique ids. */
const nonEmptyUniqueTaskListArb = fc
  .array(taskArb, { minLength: 1, maxLength: 20 })
  .map((arr) => arr.map((t, i) => ({ ...t, id: `${t.id}_${i}` })));

// ---------------------------------------------------------------------------
// Test setup helpers
// ---------------------------------------------------------------------------

let stub;

function resetModuleState(initialTasks = []) {
  stub = createLocalStorageStub();
  const storage = makeStorageWithStub(stub);
  _setStorage(storage);
  _setTasks(initialTasks);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Property 6 — Valid task addition grows the task list', () => {
  beforeEach(() => resetModuleState());

  it('addTask with valid title increases list length by exactly 1 and sets correct fields', () => {
    // Feature: todo-life-dashboard, Property 6: Valid task addition grows the task list
    // Validates: Requirements 4.2
    fc.assert(
      fc.property(
        uniqueTaskListArb,
        validTitleArb,
        (initialTasks, title) => {
          resetModuleState(initialTasks);
          const before = _getTasks().length;

          const result = addTask(title);

          expect(result.success).toBe(true);

          const after = _getTasks();
          expect(after).toHaveLength(before + 1);

          const added = result.task;
          expect(added.title).toBe(title.trim());
          expect(added.completed).toBe(false);
          expect(typeof added.id).toBe('string');
          expect(added.id.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------

describe('Property 7 — Invalid task input is rejected', () => {
  beforeEach(() => resetModuleState());

  it('addTask with empty/whitespace title returns error and leaves list unchanged', () => {
    // Feature: todo-life-dashboard, Property 7: Invalid task input is rejected
    // Validates: Requirements 4.3, 4.8
    fc.assert(
      fc.property(
        uniqueTaskListArb,
        invalidTitleArb,
        (initialTasks, badTitle) => {
          resetModuleState(initialTasks);
          const before = _getTasks().length;

          const result = addTask(badTitle);

          expect(result.success).toBe(false);
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
          expect(_getTasks()).toHaveLength(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('editTask with empty/whitespace title returns error and leaves list unchanged', () => {
    // Feature: todo-life-dashboard, Property 7: Invalid task input is rejected
    // Validates: Requirements 4.3, 4.8
    fc.assert(
      fc.property(
        nonEmptyUniqueTaskListArb,
        invalidTitleArb,
        (initialTasks, badTitle) => {
          resetModuleState(initialTasks);
          const snapshot = JSON.stringify(_getTasks());

          // Pick the first task's id to attempt edit
          const targetId = initialTasks[0].id;
          const result = editTask(targetId, badTitle);

          expect(result.success).toBe(false);
          expect(typeof result.error).toBe('string');
          // List must be unchanged
          expect(JSON.stringify(_getTasks())).toBe(snapshot);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------

describe('Property 8 — Task completion toggle is a round-trip', () => {
  beforeEach(() => resetModuleState());

  it('double-toggling a task restores its original completion state', () => {
    // Feature: todo-life-dashboard, Property 8: Task completion toggle is a round-trip
    // Validates: Requirements 4.4, 4.5
    fc.assert(
      fc.property(
        nonEmptyUniqueTaskListArb,
        fc.integer({ min: 0, max: 19 }),
        (initialTasks, idx) => {
          resetModuleState(initialTasks);
          const tasks = _getTasks();
          const target = tasks[idx % tasks.length];
          const originalCompleted = target.completed;

          // First toggle
          toggleTask(target.id);
          const afterFirst = _getTasks().find((t) => t.id === target.id);
          expect(afterFirst.completed).toBe(!originalCompleted);

          // Second toggle — must restore original
          toggleTask(target.id);
          const afterSecond = _getTasks().find((t) => t.id === target.id);
          expect(afterSecond.completed).toBe(originalCompleted);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------

describe('Property 9 — Valid task edit updates the title', () => {
  beforeEach(() => resetModuleState());

  it('editTask changes only the targeted task title, leaving all others intact', () => {
    // Feature: todo-life-dashboard, Property 9: Valid task edit updates the title
    // Validates: Requirements 4.6, 4.7
    fc.assert(
      fc.property(
        nonEmptyUniqueTaskListArb,
        fc.integer({ min: 0, max: 19 }),
        validTitleArb,
        (initialTasks, idx, newTitle) => {
          resetModuleState(initialTasks);
          const tasks = _getTasks();
          const target = tasks[idx % tasks.length];

          const result = editTask(target.id, newTitle);

          expect(result.success).toBe(true);

          const after = _getTasks();
          expect(after).toHaveLength(tasks.length);

          // Targeted task has updated title (trimmed), same id and completed
          const updated = after.find((t) => t.id === target.id);
          expect(updated).toBeDefined();
          expect(updated.title).toBe(newTitle.trim());
          expect(updated.id).toBe(target.id);
          expect(updated.completed).toBe(target.completed);

          // All other tasks are completely unchanged
          for (const original of tasks) {
            if (original.id === target.id) continue;
            const unchanged = after.find((t) => t.id === original.id);
            expect(unchanged).toBeDefined();
            expect(unchanged.title).toBe(original.title);
            expect(unchanged.completed).toBe(original.completed);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------

describe('Property 10 — Task deletion removes exactly one task', () => {
  beforeEach(() => resetModuleState());

  it('deleteTask reduces list length by exactly 1 and the deleted id is absent', () => {
    // Feature: todo-life-dashboard, Property 10: Task deletion removes exactly one task
    // Validates: Requirements 4.9
    fc.assert(
      fc.property(
        nonEmptyUniqueTaskListArb,
        fc.integer({ min: 0, max: 19 }),
        (initialTasks, idx) => {
          resetModuleState(initialTasks);
          const tasks = _getTasks();
          const target = tasks[idx % tasks.length];
          const before = tasks.length;

          deleteTask(target.id);

          const after = _getTasks();
          expect(after).toHaveLength(before - 1);
          expect(after.find((t) => t.id === target.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------

describe('Property 11 — Task persistence round-trip', () => {
  beforeEach(() => resetModuleState());

  it('JSON written to storage deserializes to an array matching in-memory state after operations', () => {
    // Feature: todo-life-dashboard, Property 11: Task persistence round-trip
    // Validates: Requirements 4.10, 4.11, 6.2, 6.5
    fc.assert(
      fc.property(
        // A sequence of operations encoded as booleans (true=add, false=delete if possible)
        fc.array(
          fc.record({
            op: fc.oneof(
              fc.constant('add'),
              fc.constant('toggle'),
              fc.constant('delete'),
              fc.constant('edit'),
            ),
            title: validTitleArb,
          }),
          { minLength: 1, maxLength: 10 },
        ),
        (operations) => {
          resetModuleState([]);

          for (const { op, title } of operations) {
            const current = _getTasks();

            if (op === 'add') {
              addTask(title);
            } else if (op === 'toggle' && current.length > 0) {
              toggleTask(current[0].id);
            } else if (op === 'delete' && current.length > 0) {
              deleteTask(current[0].id);
            } else if (op === 'edit' && current.length > 0) {
              editTask(current[0].id, title);
            } else {
              // fallback: add
              addTask(title);
            }
          }

          // Read persisted JSON from the stub
          const inMemory = _getTasks();
          const rawJson = stub.getItem(TASKS_KEY);

          // Must be valid JSON
          let parsed;
          expect(() => {
            parsed = JSON.parse(rawJson);
          }).not.toThrow();

          // Must be an array of the same length
          expect(Array.isArray(parsed)).toBe(true);
          expect(parsed).toHaveLength(inMemory.length);

          // Each persisted element must match the in-memory element
          for (let i = 0; i < inMemory.length; i++) {
            expect(parsed[i].id).toBe(inMemory[i].id);
            expect(parsed[i].title).toBe(inMemory[i].title);
            expect(parsed[i].completed).toBe(inMemory[i].completed);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
