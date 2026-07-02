/**
 * todoWidget.js — To-Do List CRUD widget for the To-Do Life Dashboard.
 *
 * Responsibilities:
 *  - Render a task list read from localStorage on init.
 *  - Add, edit, toggle-complete, and delete tasks.
 *  - Validate all inputs at the boundary (1–200 chars, non-empty after trim).
 *  - Persist the full task array to localStorage synchronously after every mutation.
 *
 * Requirements: 4.1–4.12
 *
 * Design note: pure logic functions (validateTitle, addTask, editTask,
 * toggleTask, deleteTask, loadTasks, saveTasks) are exported and operate on
 * a passed-in or module-level tasks array so they are testable without a DOM.
 * The module exposes a _setStorage helper for test injection.
 */

import { readStorage, writeStorage, TASKS_KEY } from './storage.js';

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
// In-memory task list (module-level state)
// ---------------------------------------------------------------------------

/** @type {Task[]} */
let tasks = [];

// ---------------------------------------------------------------------------
// Type definitions (JSDoc only — no build step required)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, title: string, completed: boolean }} Task
 * @typedef {{ valid: true } | { valid: false, message: string }} ValidationResult
 */

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Validate a task title string.
 *
 * Trims the input; returns `{ valid: false, message }` when the trimmed
 * length is 0 or > 200, otherwise `{ valid: true }`.
 *
 * @param {string} title
 * @returns {ValidationResult}
 */
export function validateTitle(title) {
  const trimmed = typeof title === 'string' ? title.trim() : '';
  if (trimmed.length === 0 || trimmed.length > 200) {
    return { valid: false, message: 'Task title cannot be empty.' };
  }
  return { valid: true };
}

// ---------------------------------------------------------------------------
// isValidTask — schema guard used by readStorage
// ---------------------------------------------------------------------------

/**
 * Type guard: returns true when an unknown value is a well-formed Task.
 *
 * @param {unknown} item
 * @returns {item is Task}
 */
export function isValidTask(item) {
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
// Persistence helpers
// ---------------------------------------------------------------------------

/**
 * Load tasks from localStorage (via readStorage) and return the array.
 * Also updates the module-level `tasks` variable.
 *
 * @returns {Task[]}
 */
export function loadTasks() {
  tasks = _storage.read(TASKS_KEY, isValidTask);
  return tasks;
}

/**
 * Persist the given task array to localStorage.
 *
 * @param {Task[]} taskList
 * @returns {void}
 */
export function saveTasks(taskList) {
  _storage.write(TASKS_KEY, taskList);
}

// ---------------------------------------------------------------------------
// CRUD operations
// ---------------------------------------------------------------------------

/**
 * Add a new task with the given title.
 *
 * Validates first; on failure returns `{ success: false, error }` without
 * mutating state. On success appends a new Task (timestamp-based id,
 * completed: false), persists, and re-renders.
 *
 * @param {string} title
 * @returns {{ success: true, task: Task } | { success: false, error: string }}
 */
export function addTask(title) {
  const validation = validateTitle(title);
  if (!validation.valid) {
    _showError(validation.message);
    return { success: false, error: validation.message };
  }

  const newTask = {
    id: `task_${Date.now()}_${tasks.length}`,
    title: title.trim(),
    completed: false,
  };

  tasks = [...tasks, newTask];
  saveTasks(tasks);
  renderTaskList();
  _clearError();
  return { success: true, task: newTask };
}

/**
 * Edit the title of an existing task.
 *
 * Validates newTitle; on failure returns error and shows inline message.
 * On success updates the task in the array, persists, and re-renders.
 *
 * @param {string} id
 * @param {string} newTitle
 * @returns {{ success: true, task: Task } | { success: false, error: string }}
 */
export function editTask(id, newTitle) {
  const validation = validateTitle(newTitle);
  if (!validation.valid) {
    _showError(validation.message);
    return { success: false, error: validation.message };
  }

  let updatedTask = null;
  tasks = tasks.map((t) => {
    if (t.id === id) {
      updatedTask = { ...t, title: newTitle.trim() };
      return updatedTask;
    }
    return t;
  });

  if (!updatedTask) {
    return { success: false, error: 'Task not found.' };
  }

  saveTasks(tasks);
  renderTaskList();
  _clearError();
  return { success: true, task: updatedTask };
}

/**
 * Toggle the `completed` state of the task with the given id.
 * Persists and re-renders.
 *
 * @param {string} id
 * @returns {Task | null} The updated task, or null if not found.
 */
export function toggleTask(id) {
  let toggled = null;
  tasks = tasks.map((t) => {
    if (t.id === id) {
      toggled = { ...t, completed: !t.completed };
      return toggled;
    }
    return t;
  });

  if (toggled) {
    saveTasks(tasks);
    renderTaskList();
  }
  return toggled;
}

/**
 * Remove the task with the given id from the list.
 * Persists and re-renders.
 *
 * @param {string} id
 * @returns {void}
 */
export function deleteTask(id) {
  tasks = tasks.filter((t) => t.id !== id);
  saveTasks(tasks);
  renderTaskList();
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Build and mount the full task list into #todo-list.
 * Safe to call in environments where the DOM element is absent
 * (it exits silently if #todo-list is not found).
 *
 * @returns {void}
 */
export function renderTaskList() {
  const list = _getElement('todo-list');
  if (!list) return;

  // Clear existing children
  list.innerHTML = '';

  if (tasks.length === 0) {
    const empty = document.createElement('li');
    empty.className = 'todo__empty';
    empty.textContent = 'No tasks yet. Add one above!';
    empty.setAttribute('aria-label', 'No tasks');
    list.appendChild(empty);
    return;
  }

  for (const task of tasks) {
    list.appendChild(_buildTaskItem(task));
  }
}

/**
 * Build a single <li> element for a task.
 *
 * @param {Task} task
 * @returns {HTMLLIElement}
 */
function _buildTaskItem(task) {
  const li = document.createElement('li');
  li.className = 'todo__item' + (task.completed ? ' todo__item--completed' : '');
  li.setAttribute('data-id', task.id);

  // ---- Checkbox (complete toggle) ----------------------------------------
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'todo__checkbox';
  checkbox.checked = task.completed;
  checkbox.setAttribute('aria-label', `Mark "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`);
  checkbox.addEventListener('change', () => toggleTask(task.id));

  // ---- Title span (static display) ----------------------------------------
  const titleSpan = document.createElement('span');
  titleSpan.className = 'todo__title';
  titleSpan.textContent = task.title;
  if (task.completed) {
    titleSpan.style.textDecoration = 'line-through';
    titleSpan.style.opacity = '0.5';
  }

  // ---- Edit button --------------------------------------------------------
  const editBtn = document.createElement('button');
  editBtn.type = 'button';
  editBtn.className = 'btn btn--ghost todo__edit-btn';
  editBtn.textContent = 'Edit';
  editBtn.setAttribute('aria-label', `Edit task "${task.title}"`);
  editBtn.addEventListener('click', () => _startInlineEdit(li, task));

  // ---- Delete button -------------------------------------------------------
  const deleteBtn = document.createElement('button');
  deleteBtn.type = 'button';
  deleteBtn.className = 'btn btn--ghost todo__delete-btn';
  deleteBtn.textContent = 'Delete';
  deleteBtn.setAttribute('aria-label', `Delete task "${task.title}"`);
  deleteBtn.addEventListener('click', () => deleteTask(task.id));

  li.appendChild(checkbox);
  li.appendChild(titleSpan);
  li.appendChild(editBtn);
  li.appendChild(deleteBtn);

  return li;
}

/**
 * Replace the static title span with an inline text input for editing.
 *
 * @param {HTMLLIElement} li
 * @param {Task} task
 */
function _startInlineEdit(li, task) {
  // Prevent double-editing
  if (li.querySelector('.todo__edit-input')) return;

  const titleSpan = li.querySelector('.todo__title');
  const editBtn = li.querySelector('.todo__edit-btn');

  // Create inline input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'input todo__edit-input';
  input.value = task.title;
  input.maxLength = 200;
  input.setAttribute('aria-label', 'Edit task title');

  // Create confirm button
  const confirmBtn = document.createElement('button');
  confirmBtn.type = 'button';
  confirmBtn.className = 'btn btn--primary todo__confirm-btn';
  confirmBtn.textContent = 'Save';
  confirmBtn.setAttribute('aria-label', 'Save task title');

  // Create cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'btn btn--ghost todo__cancel-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.setAttribute('aria-label', 'Cancel edit');

  const confirmEdit = () => editTask(task.id, input.value);
  const cancelEdit = () => renderTaskList();

  confirmBtn.addEventListener('click', confirmEdit);
  cancelBtn.addEventListener('click', cancelEdit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmEdit();
    if (e.key === 'Escape') cancelEdit();
  });

  // Swap span for input + buttons
  titleSpan.replaceWith(input);
  editBtn.replaceWith(confirmBtn);
  // Insert cancel after confirm
  confirmBtn.insertAdjacentElement('afterend', cancelBtn);

  input.focus();
  input.select();
}

// ---------------------------------------------------------------------------
// Error display helpers
// ---------------------------------------------------------------------------

/**
 * Show an inline validation message in #todo-error.
 *
 * @param {string} message
 */
function _showError(message) {
  const el = _getElement('todo-error');
  if (!el) return;
  el.textContent = message;
  el.removeAttribute('hidden');
}

/**
 * Clear and hide the #todo-error element.
 */
function _clearError() {
  const el = _getElement('todo-error');
  if (!el) return;
  el.textContent = '';
  el.setAttribute('hidden', '');
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
// init
// ---------------------------------------------------------------------------

/**
 * Initialise the To-Do widget.
 *  - Wire the Add button and input field.
 *  - Load tasks from localStorage and render the list.
 *  - Show a notice if localStorage is unavailable or data is malformed.
 *
 * @returns {void}
 */
export function init() {
  // Detect and display storage notice
  try {
    // A quick write test — if it throws, storage is unavailable
    const testKey = '__tld_todo_test__';
    localStorage.setItem(testKey, '1');
    localStorage.removeItem(testKey);
  } catch {
    const notice = _getElement('todo-storage-notice');
    if (notice) {
      notice.textContent = 'Storage unavailable: tasks will not be saved.';
      notice.removeAttribute('hidden');
    }
    renderTaskList();
    return;
  }

  // Load and render existing tasks
  loadTasks();
  renderTaskList();

  // Wire Add button
  const addBtn = _getElement('todo-add');
  const input = _getElement('todo-input');

  if (addBtn && input) {
    addBtn.addEventListener('click', () => {
      const result = addTask(input.value);
      // Clear input only on successful add
      if (result.success) {
        input.value = '';
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });
  }
}

// ---------------------------------------------------------------------------
// Expose internal tasks array for testing
// ---------------------------------------------------------------------------

/**
 * Get the current in-memory task list (for testing).
 *
 * @returns {Task[]}
 */
export function _getTasks() {
  return tasks;
}

/**
 * Set the in-memory task list directly (for testing).
 *
 * @param {Task[]} newTasks
 */
export function _setTasks(newTasks) {
  tasks = [...newTasks];
}
