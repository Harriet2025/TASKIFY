/* Taskify — script.js v5 */
'use strict';

const API = 'api/tasks.php';

const state = {
    tasks:          [],
    editingTaskId:  null,
    deletingTaskId: null,
    search:         '',
    statusFilter:   'All',
    priorityFilter: 'All',
    sort:           'created_desc',
    loading:        false,
    darkMode:       localStorage.getItem('taskify_dark') === 'true',
};

// ── DOM refs ──────────────────────────────────────────────────────────────────
const el = {
    statTotal:           document.getElementById('statTotal'),
    statActive:          document.getElementById('statActive'),
    statDone:            document.getElementById('statDone'),
    statHigh:            document.getElementById('statHigh'),
    statOverdue:         document.getElementById('statOverdue'),
    progressBar:         document.getElementById('progressBar'),
    progressPct:         document.getElementById('progressPct'),
    statusStrip:         document.getElementById('statusStrip'),
    newTaskButton:       document.getElementById('newTaskButton'),
    searchInput:         document.getElementById('searchInput'),
    statusFilterInput:   document.getElementById('statusFilterInput'),
    priorityFilterInput: document.getElementById('priorityFilterInput'),
    sortInput:           document.getElementById('sortInput'),
    taskCountHeading:    document.getElementById('taskCountHeading'),
    taskList:            document.getElementById('taskList'),
    modalBackdrop:       document.getElementById('modalBackdrop'),
    modalClose:          document.getElementById('modalClose'),
    formLabel:           document.getElementById('formLabel'),
    modalTitle:          document.getElementById('modalTitle'),
    taskForm:            document.getElementById('taskForm'),
    taskIdInput:         document.getElementById('taskIdInput'),
    titleInput:          document.getElementById('titleInput'),
    descriptionInput:    document.getElementById('descriptionInput'),
    priorityInput:       document.getElementById('priorityInput'),
    statusInput:         document.getElementById('statusInput'),
    dueDateInput:        document.getElementById('dueDateInput'),
    submitButton:        document.getElementById('submitButton'),
    submitLabel:         document.getElementById('submitLabel'),
    clearButton:         document.getElementById('clearButton'),
    titleError:          document.getElementById('titleError'),
    priorityError:       document.getElementById('priorityError'),
    statusError:         document.getElementById('statusError'),
    dueDateError:        document.getElementById('dueDateError'),
    topbarDate:          document.getElementById('topbarDate'),
    sidebarDate:         document.getElementById('sidebarDate'),
    darkModeBtn:         document.getElementById('darkModeBtn'),
    confirmBackdrop:     document.getElementById('confirmBackdrop'),
    confirmCancel:       document.getElementById('confirmCancel'),
    confirmOk:           document.getElementById('confirmOk'),
    shortcutsBackdrop:   document.getElementById('shortcutsBackdrop'),
    shortcutsBtn:        document.getElementById('shortcutsBtn'),
    shortcutsClose:      document.getElementById('shortcutsClose'),
    toastContainer:      document.getElementById('toast-container'),
};

// ── Dark mode ─────────────────────────────────────────────────────────────────

const MOON_SVG = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG  = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function applyDarkMode() {
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    if (el.darkModeBtn) {
        el.darkModeBtn.innerHTML = state.darkMode ? SUN_SVG : MOON_SVG;
        el.darkModeBtn.setAttribute('aria-label', state.darkMode ? 'Switch to light mode' : 'Switch to dark mode');
    }
}

function toggleDark() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('taskify_dark', state.darkMode);
    applyDarkMode();
}

applyDarkMode();
if (el.darkModeBtn) el.darkModeBtn.addEventListener('click', toggleDark);

// ── Date display ──────────────────────────────────────────────────────────────
(function setDates() {
    const now = new Date();
    const full  = now.toLocaleDateString('en', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
    const short = now.toLocaleDateString('en', { month:'short', day:'numeric', year:'numeric' });
    if (el.topbarDate)  el.topbarDate.textContent  = full;
    if (el.sidebarDate) el.sidebarDate.textContent = short;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────
function isOverdue(task) {
    if (task.status === 'Done') return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(task.due_date + 'T00:00:00');
    return due < today;
}

function daysUntilDue(task) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due   = new Date(task.due_date + 'T00:00:00');
    return Math.ceil((due - today) / 86400000);
}

function escHtml(str) {
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fmtDate(v) {
    if (!v) return '—';
    return new Intl.DateTimeFormat('en', { month:'short', day:'numeric', year:'numeric' })
        .format(new Date(v + 'T00:00:00'));
}

function relativeTime(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
    if (diff < 60)     return 'just now';
    if (diff < 3600)   return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400)  return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return fmtDate(dateStr);
}

function highlight(text, query) {
    if (!query) return escHtml(text);
    const safe = escHtml(text);
    const re   = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')', 'gi');
    return safe.replace(re, '<mark class="search-highlight">$1</mark>');
}

// ── SVG icons ─────────────────────────────────────────────────────────────────
const ICONS = {
    check:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    reopen:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
    edit:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
    trash:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
    calendar:    `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    clock:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

// ── Modal open/close ──────────────────────────────────────────────────────────
function openModal() {
    el.modalBackdrop.style.display = 'flex';
    el.modalBackdrop.classList.add('open');
    el.modalBackdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.titleInput && el.titleInput.focus(), 100);
}

function closeModal() {
    el.modalBackdrop.style.display = 'none';
    el.modalBackdrop.classList.remove('open');
    el.modalBackdrop.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
}

// ── Confirm delete ────────────────────────────────────────────────────────────
function openConfirm(id) {
    state.deletingTaskId = id;
    el.confirmBackdrop.style.display = 'flex';
    el.confirmBackdrop.classList.add('open');
    el.confirmBackdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.confirmOk && el.confirmOk.focus(), 100);
}

function closeConfirm() {
    state.deletingTaskId = null;
    el.confirmBackdrop.style.display = 'none';
    el.confirmBackdrop.classList.remove('open');
    el.confirmBackdrop.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
}

el.confirmCancel.addEventListener('click', closeConfirm);
el.confirmBackdrop.addEventListener('click', (e) => { if (e.target === el.confirmBackdrop) closeConfirm(); });

el.confirmOk.addEventListener('click', async () => {
    const id = state.deletingTaskId;
    closeConfirm();
    if (!id) return;
    try {
        await animateCardOut(id);
        await apiDeleteTask(id);
        render();
    } catch(err) {
        showToast(err.message, 'error');
    }
});

// ── Shortcuts panel ───────────────────────────────────────────────────────────
function openShortcuts() {
    el.shortcutsBackdrop.style.display = 'flex';
    el.shortcutsBackdrop.classList.add('open');
    el.shortcutsBackdrop.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
}

function closeShortcuts() {
    el.shortcutsBackdrop.style.display = 'none';
    el.shortcutsBackdrop.classList.remove('open');
    el.shortcutsBackdrop.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
}

el.shortcutsBtn.addEventListener('click', openShortcuts);
el.shortcutsClose.addEventListener('click', closeShortcuts);
el.shortcutsBackdrop.addEventListener('click', (e) => { if (e.target === el.shortcutsBackdrop) closeShortcuts(); });

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
    const tag         = document.activeElement ? document.activeElement.tagName : '';
    const typing      = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const modalOpen   = el.modalBackdrop.classList.contains('open');
    const confirmOpen = el.confirmBackdrop.classList.contains('open');
    const shortOpen   = el.shortcutsBackdrop.classList.contains('open');

    if (e.key === 'Escape') {
        if (modalOpen)   { resetForm(); closeModal(); }
        if (confirmOpen) closeConfirm();
        if (shortOpen)   closeShortcuts();
        return;
    }
    if (typing || modalOpen || confirmOpen || shortOpen) return;
    if (e.key === 'n' || e.key === 'N') { e.preventDefault(); resetForm(); openModal(); }
    if (e.key === 'd' || e.key === 'D') toggleDark();
    if (e.key === '?') openShortcuts();
    if (e.key === '/') { e.preventDefault(); el.searchInput && el.searchInput.focus(); }
});

// ── API fetch wrapper ─────────────────────────────────────────────────────────
async function apiFetch(url, options = {}) {
    const res  = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...options });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

// ── API CRUD ──────────────────────────────────────────────────────────────────
async function loadTasks() {
    state.loading = true;
    renderTaskList();
    try {
        state.tasks = await apiFetch(API);
    } catch(err) {
        showToast('Could not load tasks: ' + err.message, 'error');
        state.tasks = [];
    } finally {
        state.loading = false;
    }
    render();
}

async function apiCreateTask(payload) {
    const task = await apiFetch(API, { method: 'POST', body: JSON.stringify(payload) });
    state.tasks.unshift(task);
    showToast('✓ Task created', 'success');
}

async function apiUpdateTask(id, payload) {
    const updated = await apiFetch(API + '?id=' + id, { method: 'PUT', body: JSON.stringify(payload) });
    state.tasks = state.tasks.map((t) => (t.id == id ? updated : t));
    showToast('✓ Task saved', 'success');
}

async function apiDeleteTask(id) {
    await apiFetch(API + '?id=' + id, { method: 'DELETE' });
    state.tasks = state.tasks.filter((t) => t.id != id);
    if (state.editingTaskId == id) state.editingTaskId = null;
    showToast('Task deleted', 'info');
}

async function apiToggleTask(id) {
    const task = state.tasks.find((t) => t.id == id);
    if (!task) return;
    const next    = task.status === 'Done' ? 'To Do' : 'Done';
    const updated = await apiFetch(API + '?id=' + id, { method: 'PUT', body: JSON.stringify({ status: next }) });
    state.tasks = state.tasks.map((t) => (t.id == id ? updated : t));
    showToast(next === 'Done' ? '🎉 Task completed!' : '↩ Task reopened', next === 'Done' ? 'success' : 'info');
}

// ── Animate card out before delete ───────────────────────────────────────────
function animateCardOut(id) {
    return new Promise((resolve) => {
        const card = el.taskList.querySelector('[data-task-id="' + id + '"]');
        if (!card) { resolve(); return; }
        card.classList.add('task-deleting');
        setTimeout(resolve, 420);
    });
}

// ── Form events ───────────────────────────────────────────────────────────────
el.newTaskButton.addEventListener('click', () => { resetForm(); openModal(); });
el.modalClose.addEventListener('click',   () => { resetForm(); closeModal(); });
el.clearButton.addEventListener('click',  () => { resetForm(); closeModal(); });
el.modalBackdrop.addEventListener('click', (e) => { if (e.target === el.modalBackdrop) { resetForm(); closeModal(); } });

el.searchInput.addEventListener('input',    (e) => { state.search        = e.target.value; render(); });
el.statusFilterInput.addEventListener('change',   (e) => { state.statusFilter   = e.target.value; render(); });
el.priorityFilterInput.addEventListener('change', (e) => { state.priorityFilter = e.target.value; render(); });
el.sortInput.addEventListener('change',    (e) => { state.sort          = e.target.value; render(); });

// Status strip — single delegated listener
el.statusStrip.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-filter]');
    if (!btn) return;
    state.statusFilter = btn.getAttribute('data-filter');
    el.statusFilterInput.value = (state.statusFilter === 'Overdue') ? 'All' : state.statusFilter;
    render();
});

// Task list — delegated for all card actions
el.taskList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('[data-task-id]');
    if (!card) return;
    const id     = card.getAttribute('data-task-id');
    const action = btn.getAttribute('data-action');
    btn.disabled = true;
    try {
        if (action === 'delete') {
            openConfirm(id);
        } else if (action === 'edit') {
            startEdit(id);
        } else if (action === 'toggle') {
            await apiToggleTask(id);
            render();
        }
    } catch(err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

// Form submit
el.taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        title:       el.titleInput.value.trim(),
        description: el.descriptionInput.value.trim(),
        priority:    el.priorityInput.value,
        status:      el.statusInput.value,
        due_date:    el.dueDateInput.value,
    };
    const errors = validatePayload(payload);
    showErrors(errors);
    if (Object.keys(errors).length) return;

    const editId = state.editingTaskId;
    el.submitButton.disabled = true;
    el.submitLabel.textContent = 'Saving…';

    try {
        if (editId) {
            await apiUpdateTask(editId, payload);
        } else {
            await apiCreateTask(payload);
        }
        resetForm();
        closeModal();
        render();
    } catch(err) {
        showToast(err.message, 'error');
        el.submitButton.disabled = false;
        el.submitLabel.textContent = editId ? 'Save changes' : 'Create task';
    }
});

// ── State helpers ─────────────────────────────────────────────────────────────
function startEdit(id) {
    const task = state.tasks.find((t) => t.id == id);
    if (!task) return;
    state.editingTaskId       = id;
    el.taskIdInput.value      = id;
    el.titleInput.value       = task.title;
    el.descriptionInput.value = task.description || '';
    el.priorityInput.value    = task.priority;
    el.statusInput.value      = task.status;
    el.dueDateInput.value     = task.due_date;
    clearErrors();
    renderFormState();
    openModal();
}

function resetForm() {
    state.editingTaskId   = null;
    el.taskIdInput.value  = '';
    el.taskForm.reset();
    el.priorityInput.value = 'Medium';
    el.statusInput.value   = 'To Do';
    clearErrors();
    renderFormState();
}

// ── Filtering & sorting ───────────────────────────────────────────────────────
const PRIORITY_RANK = { High: 3, Medium: 2, Low: 1 };

function getFiltered() {
    const q = state.search.trim().toLowerCase();
    return state.tasks
        .filter((t) => {
            const matchSearch  = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
            const matchStatus  = state.statusFilter === 'All'
                || (state.statusFilter === 'Overdue' && isOverdue(t))
                || (state.statusFilter !== 'Overdue' && t.status === state.statusFilter);
            const matchPriority = state.priorityFilter === 'All' || t.priority === state.priorityFilter;
            return matchSearch && matchStatus && matchPriority;
        })
        .sort((a, b) => {
            switch (state.sort) {
                case 'created_asc':   return a.id - b.id;
                case 'due_asc':       return new Date(a.due_date) - new Date(b.due_date);
                case 'due_desc':      return new Date(b.due_date) - new Date(a.due_date);
                case 'priority_desc': return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
                case 'priority_asc':  return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
                default:              return b.id - a.id;
            }
        });
}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
    renderStats();
    renderStatusStrip();
    renderTaskList();
    renderFormState();
}

function animateCount(node, target) {
    if (!node) return;
    const start = parseInt(node.textContent) || 0;
    if (start === target) { node.textContent = target; return; }
    const dur = 380, step = 16;
    let elapsed = 0;
    const timer = setInterval(() => {
        elapsed += step;
        const p = Math.min(elapsed / dur, 1);
        node.textContent = Math.round(start + (target - start) * (1 - Math.pow(1 - p, 3)));
        if (p >= 1) clearInterval(timer);
    }, step);
}

function renderStats() {
    const total   = state.tasks.length;
    const done    = state.tasks.filter((t) => t.status === 'Done').length;
    const active  = total - done;
    const high    = state.tasks.filter((t) => t.priority === 'High').length;
    const overdue = state.tasks.filter(isOverdue).length;
    const pct     = total ? Math.round((done / total) * 100) : 0;

    animateCount(el.statTotal,   total);
    animateCount(el.statActive,  active);
    animateCount(el.statDone,    done);
    animateCount(el.statHigh,    high);
    animateCount(el.statOverdue, overdue);

    if (el.progressBar) el.progressBar.style.width = pct + '%';
    if (el.progressPct) el.progressPct.textContent = pct + '%';

    const overdueCard = el.statOverdue ? el.statOverdue.closest('.stat-card') : null;
    if (overdueCard) overdueCard.classList.toggle('has-overdue', overdue > 0);
}

function renderStatusStrip() {
    const todo    = state.tasks.filter((t) => t.status === 'To Do').length;
    const inProg  = state.tasks.filter((t) => t.status === 'In Progress').length;
    const done    = state.tasks.filter((t) => t.status === 'Done').length;
    const overdue = state.tasks.filter(isOverdue).length;
    const sf = state.statusFilter;

    el.statusStrip.innerHTML =
        pill('All',         state.tasks.length, sf === 'All')         +
        pill('To Do',       todo,               sf === 'To Do')       +
        pill('In Progress', inProg,             sf === 'In Progress') +
        pill('Done',        done,               sf === 'Done')        +
        (overdue > 0 ? pill('Overdue', overdue, sf === 'Overdue', true) : '');
}

function pill(label, count, active, isOverdue) {
    const cls = 'strip-pill' + (isOverdue ? ' strip-pill-overdue' : '') + (active ? ' active' : '');
    const icon = isOverdue ? '⚠️ ' : '';
    return `<button class="${cls}" data-filter="${label}">${icon}${label} <span>${count}</span></button>`;
}

function getEmptyMsg() {
    if (state.search)                        return { icon:'🔍', title:`No results for "${state.search}"`,       body:'Try a different search term.' };
    if (state.statusFilter === 'Done')       return { icon:'🎉', title:'No completed tasks yet',                 body:'Mark tasks as done and they\'ll appear here.' };
    if (state.statusFilter === 'In Progress')return { icon:'⚡', title:'Nothing in progress',                   body:'Move a task to In Progress to track active work.' };
    if (state.statusFilter === 'To Do')      return { icon:'📋', title:'No tasks to do',                        body:'Click New task to add something.' };
    if (state.statusFilter === 'Overdue')    return { icon:'✅', title:'No overdue tasks!',                     body:'You\'re all caught up. Great work!' };
    if (state.priorityFilter !== 'All')      return { icon:'🏷️', title:`No ${state.priorityFilter.toLowerCase()} priority tasks`, body:'Try a different priority filter.' };
    return                                          { icon:'📭', title:'No tasks yet',                          body:'Click New task to get started.' };
}

function renderTaskList() {
    if (state.loading) {
        el.taskList.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Loading tasks…</p></div>`;
        el.taskCountHeading.textContent = 'Loading…';
        return;
    }

    const filtered = getFiltered();
    const q        = state.search.trim().toLowerCase();
    const count    = filtered.length;

    let heading = count + ' task' + (count === 1 ? '' : 's');
    if (state.statusFilter  !== 'All') heading += ' · ' + state.statusFilter;
    if (state.priorityFilter !== 'All') heading += ' · ' + state.priorityFilter + ' priority';
    el.taskCountHeading.textContent = heading;

    if (!count) {
        const m = getEmptyMsg();
        el.taskList.innerHTML = `<div class="empty-state"><span class="empty-icon">${m.icon}</span><h4>${m.title}</h4><p>${m.body}</p></div>`;
        return;
    }

    el.taskList.innerHTML = filtered.map((task) => buildCard(task, q)).join('');
}

function buildCard(task, q) {
    const pl      = task.priority.toLowerCase();
    const isDone  = task.status === 'Done';
    const overdue = isOverdue(task);
    const days    = daysUntilDue(task);

    const statusCls = isDone ? 'badge-done'
        : task.status === 'In Progress' ? 'badge-inprogress'
        : 'badge-todo';

    const toggleBtn = isDone
        ? `<button class="btn-task" type="button" data-action="toggle">${ICONS.reopen} Reopen</button>`
        : `<button class="btn-task btn-done-task" type="button" data-action="toggle">${ICONS.check} Mark done</button>`;

    // Due date label
    let dueHtml;
    if (overdue) {
        const daysOver = Math.abs(days);
        dueHtml = `<span class="overdue-badge">⚠ Overdue${daysOver > 0 ? ' · ' + daysOver + 'd' : ''}</span>`;
    } else if (!isDone && days === 0) {
        dueHtml = `<span class="due-today-badge">📅 Due today</span>`;
    } else if (!isDone && days === 1) {
        dueHtml = `<span class="due-soon-badge">⏰ Due tomorrow</span>`;
    } else {
        dueHtml = `Due <strong>${fmtDate(task.due_date)}</strong>`;
    }

    const updatedAt = task.updated_at || task.created_at;

    return `
    <article class="task-card${isDone ? ' task-done' : ''}${overdue ? ' task-overdue' : ''}" data-task-id="${task.id}">
        <div class="task-card-stripe stripe-${pl}${overdue ? ' stripe-overdue' : ''}"></div>
        <div class="task-card-body">
            <div class="task-top">
                <div class="task-title-row">
                    ${isDone ? `<div class="done-indicator"><span class="done-check">${ICONS.check}</span> Completed</div>` : ''}
                    <div class="task-title${isDone ? ' done-text' : ''}">${highlight(task.title, q)}</div>
                    ${task.description ? `<div class="task-desc">${highlight(task.description, q)}</div>` : ''}
                </div>
                <div class="task-badges">
                    <span class="badge badge-${pl}">${task.priority}</span>
                    ${!isDone ? `<span class="badge ${statusCls}">${task.status}</span>` : ''}
                </div>
            </div>
            <div class="task-meta">
                <span class="task-meta-item">${ICONS.calendar} ${dueHtml}</span>
                <span class="task-meta-item" title="${updatedAt}">${ICONS.clock} Updated <strong>${relativeTime(updatedAt)}</strong></span>
            </div>
            <div class="task-actions">
                ${toggleBtn}
                <button class="btn-task" type="button" data-action="edit">${ICONS.edit} Edit</button>
                <button class="btn-danger" type="button" data-action="delete">${ICONS.trash} Delete</button>
            </div>
        </div>
    </article>`;
}

function renderFormState() {
    const editing = state.editingTaskId != null;
    if (el.formLabel)   el.formLabel.textContent   = editing ? 'Edit task'           : 'New task';
    if (el.modalTitle)  el.modalTitle.textContent  = editing ? 'Update task details' : 'Add a new task';
    if (el.submitLabel) el.submitLabel.textContent = editing ? 'Save changes'        : 'Create task';
    if (el.submitButton) el.submitButton.disabled  = false;
}

// ── Validation ────────────────────────────────────────────────────────────────
function validatePayload(v) {
    const e = {};
    if (!v.title)    e.title    = 'Title is required.';
    if (!v.due_date) e.dueDate  = 'Due date is required.';
    if (!v.priority) e.priority = 'Priority is required.';
    if (!v.status)   e.status   = 'Status is required.';
    return e;
}

function showErrors(errors) {
    el.titleError.textContent    = errors.title    || '';
    el.priorityError.textContent = errors.priority || '';
    el.statusError.textContent   = errors.status   || '';
    el.dueDateError.textContent  = errors.dueDate  || '';
}

function clearErrors() { showErrors({}); }

// ── Toast ─────────────────────────────────────────────────────────────────────
function showToast(message, type) {
    type = type || 'info';
    const t = document.createElement('div');
    t.className = 'toast toast-' + type;
    t.textContent = message;
    el.toastContainer.appendChild(t);
    requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('toast-show')));
    setTimeout(() => {
        t.classList.remove('toast-show');
        t.addEventListener('transitionend', () => t.remove(), { once: true });
        setTimeout(() => t.remove(), 500);
    }, 3000);
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadTasks();
