/**
 * Property-Based Tests for timerWidget.js
 *
 * Feature: todo-life-dashboard
 *
 * Property 4: Timer display format correctness
 * Validates: Requirements 3.2
 *
 * Property 5: Timer state machine correctness
 * Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.10, 3.11, 3.12
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatTime, getButtonStates } from '../../js/timerWidget.js';

// ---------------------------------------------------------------------------
// Property 4: Timer display format correctness
// ---------------------------------------------------------------------------

describe('Property 4 — Timer display format correctness', () => {
  it('formatTime matches /^\\d{2}:\\d{2}$/ for all seconds in [0, 1500]', () => {
    // Feature: todo-life-dashboard, Property 4: Timer display format correctness
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1500 }),
        (seconds) => {
          const result = formatTime(seconds);

          // Must match MM:SS pattern with exactly two digits each side
          expect(result).toMatch(/^\d{2}:\d{2}$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('formatTime arithmetic is correct: MM=floor(s/60), SS=s%60', () => {
    // Feature: todo-life-dashboard, Property 4: Timer display format correctness
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1500 }),
        (seconds) => {
          const result = formatTime(seconds);
          const [mmStr, ssStr] = result.split(':');

          const expectedMM = Math.floor(seconds / 60);
          const expectedSS = seconds % 60;

          // Parse back to integers and compare
          expect(parseInt(mmStr, 10)).toBe(expectedMM);
          expect(parseInt(ssStr, 10)).toBe(expectedSS);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('formatTime zero-pads both components', () => {
    // Feature: todo-life-dashboard, Property 4: Timer display format correctness
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1500 }),
        (seconds) => {
          const result = formatTime(seconds);
          const [mmStr, ssStr] = result.split(':');

          // Both components must be exactly 2 characters
          expect(mmStr).toHaveLength(2);
          expect(ssStr).toHaveLength(2);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Timer state machine correctness
// ---------------------------------------------------------------------------

/**
 * Expected button states per status from the design table:
 *
 * | Status    | Start    | Stop     | Reset   |
 * |-----------|----------|----------|---------|
 * | idle      | enabled  | disabled | enabled |
 * | running   | disabled | enabled  | enabled |
 * | paused    | enabled  | disabled | enabled |
 * | completed | disabled | disabled | enabled |
 */
const EXPECTED_BUTTON_STATES = {
  idle:      { start: true,  stop: false, reset: true },
  running:   { start: false, stop: true,  reset: true },
  paused:    { start: true,  stop: false, reset: true },
  completed: { start: false, stop: false, reset: true },
};

describe('Property 5 — Timer state machine correctness', () => {
  it('getButtonStates returns exact enabled/disabled combination for every status', () => {
    // Feature: todo-life-dashboard, Property 5: Timer state machine correctness
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'running', 'paused', 'completed'),
        (status) => {
          const result = getButtonStates(status);
          const expected = EXPECTED_BUTTON_STATES[status];

          expect(result.start).toBe(expected.start);
          expect(result.stop).toBe(expected.stop);
          expect(result.reset).toBe(expected.reset);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Reset button is always enabled regardless of status', () => {
    // Feature: todo-life-dashboard, Property 5: Timer state machine correctness
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'running', 'paused', 'completed'),
        (status) => {
          const result = getButtonStates(status);
          expect(result.reset).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('Start and Stop are never both enabled simultaneously', () => {
    // Feature: todo-life-dashboard, Property 5: Timer state machine correctness
    fc.assert(
      fc.property(
        fc.constantFrom('idle', 'running', 'paused', 'completed'),
        (status) => {
          const result = getButtonStates(status);
          // Start enabled XOR Stop enabled (or both disabled in completed)
          const bothEnabled = result.start && result.stop;
          expect(bothEnabled).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('getButtonStates covers all four statuses with correct combinations', () => {
    // Feature: todo-life-dashboard, Property 5: Timer state machine correctness
    // Exhaustive check — verify every status explicitly
    for (const [status, expected] of Object.entries(EXPECTED_BUTTON_STATES)) {
      const result = getButtonStates(status);
      expect(result, `status="${status}"`).toEqual(expected);
    }
  });
});
