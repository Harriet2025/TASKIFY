const API = 'api/tasks.php';

const state = {
    tasks: [],
    editingTaskId: null,
    search: '',
    statusFilter: 'All',
    priorityFilter: 'All',
    loading: false,
};

const el = {
    statTotal:  document.getElementById('statTotal'),
    statActive: document.getElementById('statActive'),
    statDone:   document.getElementById('statDone'),
    statHigh:   document.getElementById('statHigh'),
    newTaskButton:       document.getElementById('newTaskButton'),
    searchInput:         document.getElementById('searchInput'),
    statusFilterInput:   document.getElementById('statusFilterInput'),
    priorityFilterInput: document.getElementById('priorityFilterInput'),
    taskCountHeading:    document.getElementById('taskCountHeading'),
    taskList:            document.getElementById('taskList'),
    modalBackdrop:  document.getElementById('modalBackdrop'),
    modalClose:     document.getElementById('modalClose'),
    formLabel:      document.getElementById('formLabel'),
    modalTitle:     document.getElementById('modalTitle'),
    taskForm:        document.getElementById('taskForm'),
    taskIdInput:     document.getElementById('taskIdInput'),
    titleInput:      document.getElementById('titleInput'),
    descriptionInput:document.getElementById('descriptionInput'),
    priorityInput:   document.getElementById('priorityInput'),
    statusInput:     document.getElementById('statusInput'),
    dueDateInput:    document.getElementById('dueDateInput'),
    submitButton:    document.getElementById('submitButton'),
    submitLabel:     document.getElementById('submitLabel'),
    clearButton:     document.getElementById('clearButton'),
    titleError:      document.getElementById('titleError'),
    priorityError:   document.getElementById('priorityError'),
    statusError:     document.getElementById('statusError'),
    dueDateError:    document.getElementById('dueDateError'),
    topbarDate:      document.getElementById('topbarDate'),
    sidebarDate:     document.getElementById('sidebarDate'),
};

// ── Date display ──────────────────────────────────────────────────────────────

(function setDate() {
    const now = new Date();
    const full = now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const short = now.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    if (el.topbarDate) el.topbarDate.textContent = full;
    if (el.sidebarDate) el.sidebarDate.textContent = short;
})();

// ── Modal ─────────────────────────────────────────────────────────────────────

function openModal() {
    el.modalBackdrop.classList.add('open');
    el.modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.titleInput.focus(), 80);
}

function closeModal() {
    el.modalBackdrop.classList.remove('open');
    el.modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

// ── API ───────────────────────────────────────────────────────────────────────

async function apiFetch(url, options = {}) {
    const res = await fetch(url, {
        headers: { 'Content-Type': 'application/json' },
        ...options,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
}

async function loadTasks() {
    state.loading = true;
    renderTaskList();
    try {
        state.tasks = await apiFetch(API);
    } catch (err) {
        showToast('Could not load tasks: ' + err.message, 'error');
        state.tasks = [];
    } finally {
        state.loading = false;
    }
    render();
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

async function createTask(payload) {
    const task = await apiFetch(API, { method: 'POST', body: JSON.stringify(payload) });
    state.tasks.unshift(task);
    showToast('✓  Task created successfully', 'success');
}

async function updateTask(id, payload) {
    const updated = await apiFetch(`${API}?id=${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    state.tasks = state.tasks.map((t) => (t.id == id ? updated : t));
    showToast('✓  Task saved', 'success');
}

async function deleteTask(id) {
    await apiFetch(`${API}?id=${id}`, { method: 'DELETE' });
    state.tasks = state.tasks.filter((t) => t.id != id);
    if (state.editingTaskId == id) state.editingTaskId = null;
    showToast('🗑  Task deleted', 'info');
}

async function toggleTask(id) {
    const task = state.tasks.find((t) => t.id == id);
    if (!task) return;
    const next = task.status === 'Done' ? 'To Do' : 'Done';
    const updated = await apiFetch(`${API}?id=${id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: next }),
    });
    state.tasks = state.tasks.map((t) => (t.id == id ? updated : t));
    if (next === 'Done') showToast('🎉  Task completed!', 'success');
}

// ── Events ────────────────────────────────────────────────────────────────────

el.newTaskButton.addEventListener('click', () => { resetForm(); openModal(); });
el.modalClose.addEventListener('click', () => { resetForm(); closeModal(); });
el.clearButton.addEventListener('click', () => { resetForm(); closeModal(); });

el.modalBackdrop.addEventListener('click', (e) => {
    if (e.target === el.modalBackdrop) { resetForm(); closeModal(); }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.modalBackdrop.classList.contains('open')) {
        resetForm(); closeModal();
    }
});

el.searchInput.addEventListener('input', (e) => { state.search = e.target.value; render(); });
el.statusFilterInput.addEventListener('change', (e) => { state.statusFilter = e.target.value; render(); });
el.priorityFilterInput.addEventListener('change', (e) => { state.priorityFilter = e.target.value; render(); });

el.taskForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const payload = {
        title:       el.titleInput.value.trim(),
        description: el.descriptionInput.value.trim(),
        priority:    el.priorityInput.value,
        status:      el.statusInput.value,
        due_date:    el.dueDateInput.value,
    };

    const errors = validateForm(payload);
    showErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const editingId = state.editingTaskId;
    el.submitButton.disabled = true;
    el.submitLabel.textContent = 'Saving…';

    try {
        if (editingId) {
            await updateTask(editingId, payload);
        } else {
            await createTask(payload);
        }
        resetForm();
        closeModal();
        render();
    } catch (err) {
        showToast(err.message, 'error');
        el.submitButton.disabled = false;
        el.submitLabel.textContent = editingId ? 'Save changes' : 'Create task';
    }
});

el.taskList.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const card = btn.closest('[data-task-id]');
    if (!card) return;

    const id = card.getAttribute('data-task-id');
    const action = btn.getAttribute('data-action');
    btn.disabled = true;

    try {
        if (action === 'delete') {
            if (!confirm('Delete this task? This cannot be undone.')) return;
            await deleteTask(id);
            render();
        } else if (action === 'edit') {
            startEdit(id);
        } else if (action === 'toggle') {
            await toggleTask(id);
            render();
        }
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
    }
});

// ── State helpers ─────────────────────────────────────────────────────────────

function startEdit(id) {
    const task = state.tasks.find((t) => t.id == id);
    if (!task) return;
    state.editingTaskId = id;
    el.taskIdInput.value     = id;
    el.titleInput.value      = task.title;
    el.descriptionInput.value= task.description || '';
    el.priorityInput.value   = task.priority;
    el.statusInput.value     = task.status;
    el.dueDateInput.value    = task.due_date;
    clearErrors();
    renderFormState();
    openModal();
}

function resetForm() {
    state.editingTaskId  = null;
    el.taskIdInput.value = '';
    el.taskForm.reset();
    el.priorityInput.value = 'Medium';
    el.statusInput.value   = 'To Do';
    clearErrors();
    renderFormState();
}

function getFiltered() {
    const q = state.search.trim().toLowerCase();
    return state.tasks.filter((t) => {
        const ms = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
        const mv = state.statusFilter   === 'All' || t.status   === state.statusFilter;
        const mp = state.priorityFilter === 'All' || t.priority === state.priorityFilter;
        return ms && mv && mp;
    });
}

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
    renderStats();
    renderTaskList();
    renderFormState();
}

// Animated counter
function animateCount(el, target) {
    const start = parseInt(el.textContent) || 0;
    if (start === target) return;
    const dur = 400, step = 16;
    let cur = start, elapsed = 0;
    const timer = setInterval(() => {
        elapsed += step;
        const progress = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        cur = Math.round(start + (target - start) * ease);
        el.textContent = cur;
        if (progress >= 1) clearInterval(timer);
    }, step);
}

function renderStats() {
    const total  = state.tasks.length;
    const active = state.tasks.filter((t) => t.status !== 'Done').length;
    const done   = state.tasks.filter((t) => t.status === 'Done').length;
    const high   = state.tasks.filter((t) => t.priority === 'High').length;

    animateCount(el.statTotal,  total);
    animateCount(el.statActive, active);
    animateCount(el.statDone,   done);
    animateCount(el.statHigh,   high);
}

function renderTaskList() {
    if (state.loading) {
        el.taskList.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading your tasks…</p>
            </div>`;
        el.taskCountHeading.textContent = 'Loading…';
        return;
    }

    const filtered = getFiltered();
    const count = filtered.length;
    el.taskCountHeading.textContent = `${count} task${count === 1 ? '' : 's'}`;

    if (count === 0) {
        el.taskList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <h4>No tasks found</h4>
                <p>Try adjusting your filters, or click <strong>New task</strong> to add your first one.</p>
            </div>`;
        return;
    }

    el.taskList.innerHTML = filtered.map((task) => {
        const pl = task.priority.toLowerCase();
        const isDone = task.status === 'Done';
        const statusCls = task.status === 'Done' ? 'badge-done'
                        : task.status === 'In Progress' ? 'badge-inprogress'
                        : 'badge-todo';

        const toggleCls   = isDone ? '' : 'btn-done-task';
        const toggleLabel = isDone ? svgIcon('rotate-ccw') + ' Reopen' : svgIcon('check') + ' Mark done';

        return `
        <article class="task-card${isDone ? ' task-done' : ''}" data-task-id="${task.id}">
            <div class="task-card-stripe stripe-${pl}"></div>
            <div class="task-card-body">
                <div class="task-top">
                    <div class="task-title-row">
                        ${isDone ? `<div class="done-indicator">
                            <span class="done-check">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                            Completed
                        </div>` : ''}
                        <div class="task-title${isDone ? ' done-text' : ''}">${escHtml(task.title)}</div>
                        ${task.description ? `<div class="task-desc">${escHtml(task.description)}</div>` : ''}
                    </div>
                    <div class="task-badges">
                        <span class="badge badge-${pl}">${task.priority}</span>
                        ${!isDone ? `<span class="badge ${statusCls}">${task.status}</span>` : ''}
                    </div>
                </div>

                <div class="task-meta">
                    <span class="task-meta-item">
                        ${svgIcon('calendar')} Due <strong>${fmtDate(task.due_date)}</strong>
                    </span>
                    <span class="task-meta-item">
                        ${svgIcon('clock')} Created ${fmtDate(task.created_at)}
                    </span>
                </div>

                <div class="task-actions">
                    <button class="btn-task ${toggleCls}" type="button" data-action="toggle">${toggleLabel}</button>
                    <button class="btn-task" type="button" data-action="edit">
                        ${svgIcon('edit')} Edit
                    </button>
                    <button class="btn-danger" type="button" data-action="delete">
                        ${svgIcon('trash')} Delete
                    </button>
                </div>
            </div>
        </article>`;
    }).join('');
}

function renderFormState() {
    const editing = state.editingTaskId != null;
    el.formLabel.textContent   = editing ? 'Edit task' : 'New task';
    el.modalTitle.textContent  = editing ? 'Update task details' : 'Add a new task';
    el.submitLabel.textContent = editing ? 'Save changes' : 'Create task';
}

// ── Validation ────────────────────────────────────────────────────────────────

function validateForm(v) {
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

function showToast(message, type = 'info') {
    const c = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    c.appendChild(t);
    requestAnimationFrame(() => t.classList.add('toast-show'));
    setTimeout(() => {
        t.classList.remove('toast-show');
        t.addEventListener('transitionend', () => t.remove(), { once: true });
    }, 3200);
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

function svgIcon(name) {
    const icons = {
        check:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        'rotate-ccw': `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
        edit:       `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        calendar:   `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        clock:      `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    };
    return icons[name] || '';
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(v) {
    if (!v) return '—';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v));
}

function escHtml(v) {
    return String(v)
        .replaceAll('&','&amp;').replaceAll('<','&lt;')
        .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadTasks();
