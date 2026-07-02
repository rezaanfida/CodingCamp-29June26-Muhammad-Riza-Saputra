/**
 * Property-Based Tests for clockWidget.js
 *
 * Feature: todo-life-dashboard
 *
 * Covers:
 *   Property 1: Clock time format correctness  (Validates: Requirements 2.1)
 *   Property 2: Clock date format correctness  (Validates: Requirements 2.2)
 *   Property 3: Greeting correctness for all hours (Validates: Requirements 2.3, 2.4, 2.5, 2.6)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { formatTime, formatDate, getGreeting } from '../../js/clockWidget.js';

// ---------------------------------------------------------------------------
// Arbitrary: generate arbitrary Date objects spanning a wide range of times.
// We generate a timestamp in [0, 2^32) ms (covers years 1970–2106) so that
// all hours, minutes, seconds, weekdays, and months are exercised.
// ---------------------------------------------------------------------------
const dateArb = fc
  .integer({ min: 0, max: 2 ** 32 - 1 })
  .map((ts) => new Date(ts));

// ---------------------------------------------------------------------------
// Property 1: Clock time format correctness
// Validates: Requirements 2.1
// ---------------------------------------------------------------------------
describe('Property 1 — Clock time format correctness', () => {
  it('formatTime returns HH:MM:SS matching the date components', () => {
    // Feature: todo-life-dashboard, Property 1: Clock time format correctness
    fc.assert(
      fc.property(dateArb, (date) => {
        const result = formatTime(date);

        // Must match HH:MM:SS pattern exactly
        expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);

        const [hh, mm, ss] = result.split(':').map(Number);

        // Each component must equal the corresponding Date field
        expect(hh).toBe(date.getHours());
        expect(mm).toBe(date.getMinutes());
        expect(ss).toBe(date.getSeconds());

        // Zero-padding: each segment must be exactly 2 characters
        const parts = result.split(':');
        for (const part of parts) {
          expect(part).toHaveLength(2);
        }
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Clock date format correctness
// Validates: Requirements 2.2
// ---------------------------------------------------------------------------
describe('Property 2 — Clock date format correctness', () => {
  // Full weekday names (en-GB locale, same locale used in formatDate)
  const WEEKDAY_NAMES = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];

  // Full month names (en-GB locale)
  const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  it('formatDate contains the correct weekday, day, month, and year', () => {
    // Feature: todo-life-dashboard, Property 2: Clock date format correctness
    fc.assert(
      fc.property(dateArb, (date) => {
        const result = formatDate(date);

        const expectedWeekday = WEEKDAY_NAMES[date.getDay()];
        const expectedDay = String(date.getDate());        // no zero-padding
        const expectedMonth = MONTH_NAMES[date.getMonth()];
        const expectedYear = String(date.getFullYear());

        // Result must contain the full weekday name
        expect(result).toContain(expectedWeekday);

        // Result must contain the numeric day (un-padded)
        expect(result).toContain(expectedDay);

        // Result must contain the full month name
        expect(result).toContain(expectedMonth);

        // Result must contain the four-digit year
        expect(result).toContain(expectedYear);

        // Overall structure: "Weekday, D Month YYYY"
        // Validate format with a regex that allows 1 or 2-digit day numbers
        expect(result).toMatch(/^[A-Za-z]+,\s\d{1,2}\s[A-Za-z]+\s\d{4}$/);
      }),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3: Greeting correctness for all hours
// Validates: Requirements 2.3, 2.4, 2.5, 2.6
// ---------------------------------------------------------------------------
describe('Property 3 — Greeting correctness for all hours', () => {
  it('getGreeting returns "Good Morning" for hours 5–11', () => {
    // Feature: todo-life-dashboard, Property 3: Greeting correctness for all hours
    fc.assert(
      fc.property(fc.integer({ min: 5, max: 11 }), (hour) => {
        expect(getGreeting(hour)).toBe('Good Morning');
      }),
      { numRuns: 100 },
    );
  });

  it('getGreeting returns "Good Afternoon" for hours 12–17', () => {
    // Feature: todo-life-dashboard, Property 3: Greeting correctness for all hours
    fc.assert(
      fc.property(fc.integer({ min: 12, max: 17 }), (hour) => {
        expect(getGreeting(hour)).toBe('Good Afternoon');
      }),
      { numRuns: 100 },
    );
  });

  it('getGreeting returns "Good Evening" for hours 18–23', () => {
    // Feature: todo-life-dashboard, Property 3: Greeting correctness for all hours
    fc.assert(
      fc.property(fc.integer({ min: 18, max: 23 }), (hour) => {
        expect(getGreeting(hour)).toBe('Good Evening');
      }),
      { numRuns: 100 },
    );
  });

  it('getGreeting returns "Good Evening" for hours 0–4', () => {
    // Feature: todo-life-dashboard, Property 3: Greeting correctness for all hours
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 4 }), (hour) => {
        expect(getGreeting(hour)).toBe('Good Evening');
      }),
      { numRuns: 100 },
    );
  });

  it('getGreeting covers all 24 hours exhaustively', () => {
    // Feature: todo-life-dashboard, Property 3: Greeting correctness for all hours
    // Deterministic exhaustive check across the full [0, 23] domain
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 23 }), (hour) => {
        const greeting = getGreeting(hour);

        if (hour >= 5 && hour <= 11) {
          expect(greeting).toBe('Good Morning');
        } else if (hour >= 12 && hour <= 17) {
          expect(greeting).toBe('Good Afternoon');
        } else {
          // 0–4 and 18–23
          expect(greeting).toBe('Good Evening');
        }
      }),
      { numRuns: 100 },
    );
  });
});
