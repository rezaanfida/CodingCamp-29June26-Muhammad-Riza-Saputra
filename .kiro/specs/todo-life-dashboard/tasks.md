
## Overview

Implement a zero-dependency, single-page web application using HTML5, CSS3, and Vanilla JavaScript. The application is structured as a flat module architecture: one HTML entry point loads a single `app.js` bootstrap file that initialises four independent widget modules. All state is persisted via `localStorage`. No build tools, bundlers, or frameworks are required.

## Tasks

- [x] 1. Set up project structure, HTML shell, and shared storage utilities
  - Create the directory structure: `css/`, `js/`, `tests/unit/`, `tests/property/`
  - Create `index.html` with semantic landmark elements for all four widget regions, Google Fonts `<link>` for Inter (primary) and Poppins (fallback), and `<script type="module">` loading `js/app.js`
  - Create `css/style.css` with CSS custom properties for the colour theme (dark or light), base typography using Inter/Poppins/sans-serif stack, and a CSS Grid/Flexbox layout that displays all four widgets simultaneously
  - Add a responsive media query (`max-width: 768px`) that reflows widgets into a single-column vertical stack in the order: Clock → Timer → ToDo → Quick Links
  - Create `js/storage.js` with `readStorage(key, validator)` and `writeStorage(key, data)` functions, and export the constants `TASKS_KEY = 'tld_tasks'` and `LINKS_KEY = 'tld_links'`
  - Implement `readStorage` with full error handling: wrap in `try/catch`, verify the parsed value is an array, filter elements through the validator, log `console.warn` with the failing key on any exception, and return `[]` on failure
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 1.1 Write property test for storage validation (Property 17)
    - **Property 17: Storage validation discards malformed elements**
    - **Validates: Requirements 6.3**
    - Generate arrays mixing valid and invalid Task/Link objects; assert `readStorage` returns only valid elements

- [x] 2. Implement `app.js` bootstrap and localStorage feature detection
  - Create `js/app.js` with `isLocalStorageAvailable()` using a `try/catch` write/remove test
  - Implement `showStorageWarning()` that injects a non-dismissible, fixed-position banner at the top of `<body>` with accessible text informing the user that data persistence is unavailable
  - Implement the `DOMContentLoaded` handler that calls `isLocalStorageAvailable()`, conditionally calls `showStorageWarning()`, then calls `init()` on all four widget modules
  - _Requirements: 1.7_

  - [ ]* 2.1 Write unit tests for localStorage detection and warning banner
    - Mock `localStorage` to throw; assert warning banner is injected into the DOM
    - Assert all four widget root elements are present on first load

- [x] 3. Implement `clockWidget.js` — Greeting & Clock
  - Create `js/clockWidget.js` exporting `init()`, `formatTime(date)`, `formatDate(date)`, `getGreeting(hour)`, and `tick()`
  - Implement `formatTime(date)` returning `HH:MM:SS` with zero-padding using `String.prototype.padStart`
  - Implement `formatDate(date)` using `Intl.DateTimeFormat` or manual construction to produce `[Full Weekday Name], [D] [Full Month Name] [YYYY]`
  - Implement `getGreeting(hour)` as a pure function: return `"Good Morning"` for hours 5–11, `"Good Afternoon"` for 12–17, `"Good Evening"` for 18–23 and 0–4
  - Implement `tick()` to call `new Date()` inside a `try/catch`; on failure render `"--:--:--"` / `"Date unavailable"` placeholders; otherwise update the DOM with formatted time, date, and greeting
  - Start a `setInterval(tick, 1000)` in `init()` and call `tick()` immediately on init
  
  - [ ]* 3.1 Write property test for clock time format (Property 1)
    - **Property 1: Clock time format correctness**
    - **Validates: Requirements 2.1**
    - Generate arbitrary `Date` objects; assert `formatTime(date)` matches `/^\d{2}:\d{2}:\d{2}$/` and values equal the date's hours/minutes/seconds

  - [ ]* 3.2 Write property test for clock date format (Property 2)
    - **Property 2: Clock date format correctness**
    - **Validates: Requirements 2.2**
    - Generate arbitrary `Date` objects; assert `formatDate(date)` contains the correct weekday name, numeric day, month name, and four-digit year

  - [ ]* 3.3 Write property test for greeting correctness (Property 3)
    - **Property 3: Greeting correctness for all hours**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6**
    - Generate integers in [0, 23]; assert `getGreeting(hour)` returns exactly the correct greeting string for every possible hour

- [x] 4. Checkpoint — clock widget
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement `timerWidget.js` — Focus Timer state machine
  - Create `js/timerWidget.js` exporting `init()`, `start()`, `stop()`, `reset()`, `formatTime(seconds)`, and `getButtonStates(status)`
  - Define the `TimerState` shape: `{ remaining: number, status: 'idle' | 'running' | 'paused' | 'completed' }`
  - Implement `formatTime(seconds)` returning `MM:SS` with zero-padded values (`MM = Math.floor(seconds / 60)`, `SS = seconds % 60`)
  - Implement `getButtonStates(status)` returning the correct `{ start, stop, reset }` enabled/disabled object per the state machine table in the design
  - Implement `start()`: transition `idle → running` or `paused → running`; start a 1-second `setInterval` that decrements `remaining`, calls `renderTimer()`, and triggers completion logic when `remaining` reaches 0
  - Implement `stop()`: transition `running → paused`; clear the interval
  - Implement `reset()`: clear the interval; transition any status `→ idle`; set `remaining = 1500`; call `renderTimer()`
  - Implement completion logic: transition `running → completed`; clear interval; call `playBeep()` exactly once; add a CSS animation class to the timer display element, remove it after ≥2 seconds using `setTimeout`
  - Implement `playBeep()` using the Web Audio API (`AudioContext`, `OscillatorNode`); wrap in `try/catch` for silent failure
  - Wire Start, Stop, and Reset button `click` listeners in `init()`; call `renderTimer()` on init to display `25:00`
  - Sync button enabled/disabled state and visual styling via `getButtonStates` after every state transition
  
  - [ ]* 5.1 Write property test for timer display format (Property 4)
    - **Property 4: Timer display format correctness**
    - **Validates: Requirements 3.2**
    - Generate integers in [0, 1500]; assert `formatTime(seconds)` matches `/^\d{2}:\d{2}$/` and arithmetic is correct

  - [ ]* 5.2 Write property test for timer state machine (Property 5)
    - **Property 5: Timer state machine correctness**
    - **Validates: Requirements 3.3, 3.4, 3.5, 3.6, 3.10, 3.11, 3.12**
    - Generate all four status values and remaining values in [0, 1500]; assert `getButtonStates(status)` returns the exact enabled/disabled combination from the design table for every input

- [x] 6. Checkpoint — timer widget
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement `todoWidget.js` — To-Do List CRUD
  - Create `js/todoWidget.js` exporting `init()`, `addTask(title)`, `editTask(id, newTitle)`, `toggleTask(id)`, `deleteTask(id)`, `loadTasks()`, `saveTasks(tasks)`, and `validateTitle(title)`
  - Define the `Task` shape: `{ id: string, title: string, completed: boolean }`
  - Implement `validateTitle(title)`: trim the input; return a `ValidationResult` with `valid: false` and message `"Task title cannot be empty."` if `trimmed.length` is 0 or > 200; otherwise return `valid: true`
  - Implement `loadTasks()` using `readStorage(TASKS_KEY, isValidTask)` where `isValidTask` checks `id` is a string, `title` is a string of 1–200 chars, and `completed` is a boolean
  - Implement `saveTasks(tasks)` using `writeStorage(TASKS_KEY, tasks)`
  - Implement `addTask(title)`: validate first; on failure return error and render inline validation message without mutating state; on success create a new `Task` with a timestamp-based ID, `completed: false`, append to the in-memory array, call `saveTasks`, and re-render the list
 
  - Implement `toggleTask(id)`: flip `completed` for the matching task, call `saveTasks`, re-render; apply strike-through and reduced-opacity styles for completed tasks
  - Implement `deleteTask(id)`: remove the task, call `saveTasks`, re-render
  - Implement `renderTaskList()`: build DOM elements for each task including complete-toggle, inline edit control, and delete button; bind event listeners
  - Wire the Add button and input field in `init()`; call `loadTasks()` and `renderTaskList()` on init; handle `localStorage` unavailability by displaying inline notice
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 4.10, 4.11, 4.12_

  - [ ]* 7.1 Write property test for valid task addition (Property 6)
    - **Property 6: Valid task addition grows the task list**
    - **Validates: Requirements 4.2**
    - Generate non-empty strings trimmed to [1, 200] chars; assert list length increases by exactly 1 and new task has correct title and `completed: false`

  - [ ]* 7.2 Write property test for invalid task input rejection (Property 7)
    - **Property 7: Invalid task input is rejected**
    - **Validates: Requirements 4.3, 4.8**
    - Generate empty or whitespace-only strings; assert `addTask` and `editTask` return validation errors and list remains unchanged

  - [ ]* 7.3 Write property test for task completion toggle round-trip (Property 8)
    - **Property 8: Task completion toggle is a round-trip**
    - **Validates: Requirements 4.4, 4.5**
    - Generate arbitrary tasks with any `completed` state; assert double-toggle returns original completion state

  - [ ]* 7.4 Write property test for valid task edit (Property 9)
    - **Property 9: Valid task edit updates the title**
    - **Validates: Requirements 4.6, 4.7**
    - Generate valid task lists and valid `newTitle` strings; assert only the targeted task's title changes and all other fields remain intact

  - [ ]* 7.5 Write property test for task deletion (Property 10)
    - **Property 10: Task deletion removes exactly one task**
    - **Validates: Requirements 4.9**
    - Generate task lists with at least one task; assert `deleteTask` reduces list length by exactly 1 and the deleted ID is absent

  - [ ]* 7.6 Write property test for task persistence round-trip (Property 11)
    - **Property 11: Task persistence round-trip**
    - **Validates: Requirements 4.10, 4.11, 6.2, 6.5**
    - Generate sequences of add/edit/toggle/delete operations; assert the JSON written to `localStorage[TASKS_KEY]` deserializes to an array equivalent to the in-memory task list

- [x] 8. Checkpoint — to-do widget
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement `quickLinksWidget.js` — Quick Links CRUD
  - Create `js/quickLinksWidget.js` exporting `init()`, `addLink(name, url)`, `deleteLink(id)`, `loadLinks()`, `saveLinks(links)`, and `validateLink(name, url)`
  - Define the `Link` shape: `{ id: string, name: string, url: string }`
  - Implement `validateLink(name, url)`: return field-specific errors — `"Name cannot be empty or over 100 characters."` if `name.trim().length` is 0 or > 100; `"URL must start with http:// or https://"` if `url` does not start with `http://` or `https://`; return all applicable errors in a single result
  - Implement `loadLinks()` using `readStorage(LINKS_KEY, isValidLink)` where `isValidLink` checks `id` is a string, `name` is a string of 1–100 chars, and `url` starts with `http://` or `https://`
  - Implement `saveLinks(links)` using `writeStorage(LINKS_KEY, links)`
  - Implement `addLink(name, url)`: validate first; on failure display field-specific inline validation messages without mutating state; on success create a new `Link` with timestamp-based ID, append to in-memory array, call `saveLinks`, re-render
  - Enforce the 50-link limit: disable the Add Link button when `links.length >= 50`; re-enable after a deletion brings the count below 50
  - Implement `deleteLink(id)`: remove the link, call `saveLinks`, re-render, re-evaluate Add button state
  - Implement `renderLinkList()`: render each link as an `<a>` element with `target="_blank"` and a delete button; bind event listeners
  - Implement the Add Link form toggle (show/hide inline form) wired to the Add Link control in `init()`
  - Call `loadLinks()` and `renderLinkList()` on init; handle localStorage unavailability by displaying inline notice
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_

  - [ ]* 9.1 Write property test for valid link addition (Property 12)
    - **Property 12: Valid link addition is accepted**
    - **Validates: Requirements 5.4**
    - Generate valid name strings (1–100 chars) and URLs starting with `http://` or `https://`; assert list length increases by exactly 1 for lists with fewer than 50 links

  - [ ]* 9.2 Write property test for invalid link rejection (Property 13)
    - **Property 13: Invalid link submissions are rejected with field-specific errors**
    - **Validates: Requirements 5.5, 5.11**
    - Generate invalid name/URL combinations; assert field-specific errors are returned and link list is unchanged

  - [ ]* 9.3 Write property test for link deletion (Property 14)
    - **Property 14: Link deletion removes exactly one link**
    - **Validates: Requirements 5.6**
    - Generate link lists with at least one link; assert `deleteLink` reduces list length by exactly 1 and deleted ID is absent

  - [ ]* 9.4 Write property test for link persistence round-trip (Property 15)
    - **Property 15: Link persistence round-trip**
    - **Validates: Requirements 5.7, 5.8, 6.2, 6.6**
    - Generate sequences of add/delete operations; assert JSON written to `localStorage[LINKS_KEY]` deserializes to an array equivalent to the in-memory link list

  - [ ]* 9.5 Write property test for link count limit (Property 16)
    - **Property 16: Link count limit enforces Add button state**
    - **Validates: Requirements 5.10**
    - Generate link lists of lengths 0–51; assert Add Link control is enabled iff `links.length < 50`

- [x] 10. Checkpoint — quick links widget
  
- [x] 11. Wire all modules together in `app.js` and finalize `index.html`
  - [x] 11.1 Import and wire all four widget modules in `app.js`
    - Add `import` statements for `clockWidget`, `timerWidget`, `todoWidget`, `quickLinksWidget`
    - Verify the `DOMContentLoaded` handler calls `init()` on each module in the correct order
    - Confirm the localStorage warning banner is rendered before any widget `init()` is called when storage is unavailable
    - _Requirements: 1.1, 1.4, 1.7_

  - [x] 11.2 Apply final CSS styles and responsive layout
    - Verify all four widgets are visible simultaneously on first load (no hidden widget)
    - Confirm single-column reflow at ≤768px in the correct order: Clock → Timer → ToDo → Quick Links
    - Apply contrast-compliant colour theme (background luminance ≤ 0.15 or ≥ 0.85; text contrast ratio ≥ 4.5:1)
    - _Requirements: 1.2, 1.4, 1.5_

  - [ ]* 11.3 Write unit tests for full-page widget presence
    - Assert all four widget root elements are present in the DOM after `init()`
    - Assert links render with `target="_blank"`
    - Assert separate localStorage keys `tld_tasks` ≠ `tld_links`
    - _Requirements: 1.4, 5.2, 6.1_

- [ ] 12. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP delivery
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each major widget
- Property-based tests use Vitest + fast-check and cover all 17 correctness properties from the design document
- Unit tests cover localStorage unavailability, error paths, and integration points
- The application ships as a static file bundle — no build step is required to run it in the browser

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["3.1", "3.2", "3.3"] },
    { "id": 3, "tasks": ["5.1", "5.2"] },
    { "id": 4, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5", "7.6"] },
    { "id": 5, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] },
    { "id": 6, "tasks": ["11.1", "11.2"] },
    { "id": 7, "tasks": ["11.3"] }
  ]
}
```
