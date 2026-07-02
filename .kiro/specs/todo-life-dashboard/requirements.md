# Requirements Document

## Introduction

The "To-Do List Life Dashboard" is a single-page web application (SPA) built with HTML5, CSS3, and Vanilla JavaScript. It consolidates four productivity widgets — a Greeting & Clock, a Focus Timer (Pomodoro-style), a To-Do List, and a Quick Links manager — into a clean, minimal, modern dashboard. All user data is persisted via the Browser Local Storage API. The application requires no backend and must work in all modern browsers (Chrome, Firefox, Edge, Safari). The layout is fully responsive and uses modern typography (Inter or Poppins via Google Fonts).

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **Widget**: A self-contained UI section responsible for a specific feature area.
- **Clock_Widget**: The widget displaying the current time, date, and dynamic greeting.
- **Timer**: The Focus Timer widget implementing a Pomodoro-style countdown.
- **ToDo_Widget**: The widget managing the user's task list.
- **QuickLinks_Widget**: The widget managing user-defined bookmark links.
- **Task**: An individual to-do item with a title and a completion state.
- **Link**: A user-defined record consisting of a display name and a URL.
- **Local_Storage**: The browser's `localStorage` API used for data persistence.
- **Session**: The period during which the Dashboard is open in a browser tab.

---

## Requirements

### Requirement 1: Application Shell & Layout

**User Story:** As a user, I want a clean, responsive single-page dashboard, so that I can access all productivity widgets from one place on any device.

#### Acceptance Criteria

1. THE Dashboard SHALL render as a single HTML page (`index.html`) that loads `css/style.css` and `js/app.js`.
2. THE Dashboard SHALL use a visual theme where all background colours have a luminance value consistent with either a dark mode (background luminance ≤ 0.15) or a light minimalist mode (background luminance ≥ 0.85), and all primary text colours SHALL meet a minimum contrast ratio of 4.5:1 against their background.
3. THE Dashboard SHALL load the Inter font family as the primary typeface via Google Fonts, with Poppins as the explicit fallback, followed by a generic sans-serif stack.
4. THE Dashboard SHALL display all four widgets — Clock_Widget, Timer, ToDo_Widget, and QuickLinks_Widget — simultaneously on first load, with no widget hidden or omitted, arranged in a CSS Grid or Flexbox layout.
5. WHEN the viewport width is 768px or less, THE Dashboard SHALL reflow widget columns into a single-column vertical stack in the order: Clock_Widget, Timer, ToDo_Widget, QuickLinks_Widget (top to bottom).

7. IF a browser does not support Local_Storage, THEN THE Dashboard SHALL display a non-dismissible warning banner at the top of the page, visible without scrolling, informing the user that data persistence is unavailable.

---

### Requirement 2: Greeting & Clock Widget

**User Story:** As a user, I want to see the current time, date, and a personalized greeting, so that I am oriented and welcomed when I open the Dashboard.

#### Acceptance Criteria

1. THE Clock_Widget SHALL display the current local time in `HH:MM:SS` format, updating every second.
2. THE Clock_Widget SHALL display the current date in the format `[Full Weekday Name], [D] [Full Month Name] [YYYY]` (e.g., "Monday, 30 June 2025").
3. WHEN the local hour is between 05:00 and 11:59 (inclusive), THE Clock_Widget SHALL display the greeting "Good Morning".
4. WHEN the local hour is between 12:00 and 17:59 (inclusive), THE Clock_Widget SHALL display the greeting "Good Afternoon".
5. IF the local hour is between 18:00 and 23:59 (inclusive) or between 00:00 and 04:59 (inclusive), THEN THE Clock_Widget SHALL display the greeting "Good Evening".
6. WHILE the Dashboard page is open, THE Clock_Widget SHALL evaluate the current local hour on every one-second tick and update the displayed greeting immediately when a greeting-period boundary is crossed, without requiring a page reload.
7. IF the local time cannot be retrieved from the system clock, THEN THE Clock_Widget SHALL display a placeholder indicating time is unavailable in place of the time, date, and greeting fields.

---

### Requirement 3: Focus Timer (Pomodoro Style)

**User Story:** As a user, I want a Pomodoro-style countdown timer, so that I can manage focused work sessions and take structured breaks.

#### Acceptance Criteria

1. THE Timer SHALL initialize with a countdown value of 25 minutes (25:00) when the Dashboard first loads or after a reset.
2. THE Timer SHALL display the remaining time in `MM:SS` format.
3. WHEN the user activates the Start control, THE Timer SHALL begin decrementing the displayed time by one second every second.
4. WHEN the user activates the Stop (Pause) control while the Timer is running, THE Timer SHALL pause the countdown and retain the remaining time.
5. WHEN the user activates the Start control while the Timer is paused, THE Timer SHALL resume the countdown from the retained remaining time.
6. WHEN the user activates the Reset control, THE Timer SHALL stop any active countdown and reset the displayed time to 25:00.
7. WHEN the countdown reaches 00:00, THE Timer SHALL stop the countdown automatically.
8. WHEN the countdown reaches 00:00, THE Timer SHALL produce exactly one audible alert (a short beep sound) using a browser-native audio mechanism.
9. WHEN the countdown reaches 00:00, THE Timer SHALL apply a visible CSS animation — specifically a colour change on the timer display element — that lasts for a minimum of 2 seconds before the display returns to its default style.
10. WHEN the Timer is actively counting down, THE Start control SHALL be disabled (non-interactive and visually distinct from its enabled state).
11. WHEN the Timer is stopped or paused, THE Stop control SHALL be disabled (non-interactive and visually distinct from its enabled state).
12. WHEN the countdown reaches 00:00, THE Start control SHALL be disabled and THE Reset control SHALL remain enabled.

---

### Requirement 4: To-Do List Widget

**User Story:** As a user, I want to manage a personal task list with add, edit, complete, and delete capabilities, so that I can track my daily responsibilities.

#### Acceptance Criteria

1. THE ToDo_Widget SHALL display a text input field and an "Add" button for creating new Tasks.
2. WHEN the user enters a title between 1 and 200 characters (inclusive) into the input field and activates the Add control, THE ToDo_Widget SHALL append a new Task with that title to the task list in an incomplete state.
3. WHEN the user activates the Add control with an empty input field, THE ToDo_Widget SHALL display an inline validation message and SHALL NOT create a Task.
4. WHEN the user activates the complete toggle on a Task, THE ToDo_Widget SHALL mark that Task as complete by applying both a visible strike-through style and a visual dimming (reduced opacity) to the task title.
5. WHEN the user activates the complete toggle on an already-complete Task, THE ToDo_Widget SHALL restore that Task to an incomplete state by removing the strike-through and dimming styles.
6. WHEN the user activates the edit control on a Task, THE ToDo_Widget SHALL replace the task title display with an inline text input field pre-populated with the current task title, allowing the user to modify it.
7. WHEN the user confirms an edit with a title between 1 and 200 characters (inclusive), THE ToDo_Widget SHALL update the Task title to the new value.
8. WHEN the user confirms an edit with an empty title, THE ToDo_Widget SHALL display a validation message and SHALL retain the original Task title.
9. WHEN the user activates the delete control on a Task, THE ToDo_Widget SHALL remove that Task from the task list permanently.
10. WHEN any Task is added, edited, completed, uncompleted, or deleted, THE ToDo_Widget SHALL persist the full task list to Local_Storage synchronously before that operation is considered complete.
11. WHEN the Dashboard loads, THE ToDo_Widget SHALL read the task list from Local_Storage and render all previously saved Tasks with their correct completion states.
12. IF Local_Storage is unavailable or returns malformed data on load, THEN THE ToDo_Widget SHALL initialize with an empty task list and display an inline notice informing the user that saved tasks could not be loaded.

---

### Requirement 5: Quick Links Widget

**User Story:** As a user, I want to manage a set of quick-access bookmark links, so that I can navigate to my favourite websites with a single click.

#### Acceptance Criteria

1. THE QuickLinks_Widget SHALL display all saved Links as clickable buttons or anchor elements.
2. WHEN the user activates a Link, THE QuickLinks_Widget SHALL open the associated URL in a new browser tab.
3. WHEN the user activates the "Add Link" control, THE QuickLinks_Widget SHALL reveal an input form (inline or modal) requesting a display name and a URL.
4. WHEN the user submits the Add Link form with both a non-empty name and a valid URL (beginning with `http://` or `https://`), THE QuickLinks_Widget SHALL add the Link to the list.
5. WHEN the user submits the Add Link form with an empty name or an invalid URL, THE QuickLinks_Widget SHALL display a validation message identifying which specific field failed validation, and SHALL NOT add the Link.
6. WHEN the user activates the delete control on a Link, THE QuickLinks_Widget SHALL remove that Link from the list permanently.
7. WHEN any Link is added or deleted, THE QuickLinks_Widget SHALL persist the full link list to Local_Storage synchronously before rendering the updated list.
8. WHEN the Dashboard loads, THE QuickLinks_Widget SHALL read the link list from Local_Storage and render all previously saved Links.
9. IF Local_Storage is unavailable or returns malformed data on load, THEN THE QuickLinks_Widget SHALL initialize with an empty link list and display an inline notice informing the user that saved links could not be loaded.
10. THE QuickLinks_Widget SHALL support a maximum of 50 saved Links; WHEN the limit is reached, THE "Add Link" control SHALL be disabled until a Link is deleted.
11. THE QuickLinks_Widget SHALL enforce a maximum display name length of 100 characters; WHEN the user submits a name exceeding 100 characters, THE QuickLinks_Widget SHALL display a validation message and SHALL NOT add the Link.

---

### Requirement 6: Data Persistence & Integrity

**User Story:** As a user, I want my tasks and quick links to be saved automatically, so that my data survives page refreshes and browser restarts.

#### Acceptance Criteria

1. THE Dashboard SHALL use separate, distinct Local_Storage keys for the task list and the link list to prevent data collisions.
2. THE Dashboard SHALL serialize task and link data as JSON strings before writing to Local_Storage.
3. WHEN Local_Storage data is read on load, THE Dashboard SHALL verify that the parsed value is an array and that each element contains the required fields with correct types before rendering; any element failing validation SHALL be silently discarded.
4. IF Local_Storage data is malformed or cannot be parsed as JSON, THEN THE Dashboard SHALL discard the corrupted data, initialize with an empty list, and log a console warning containing the storage key that failed.
5. WHEN a sequence of add, edit, and delete operations is performed on Tasks and the page is reloaded, THE Dashboard SHALL render the task list in a state identical to the state present immediately before the reload.
6. WHEN a sequence of add and delete operations is performed on Links and the page is reloaded, THE Dashboard SHALL render the link list in a state identical to the state present immediately before the reload.
