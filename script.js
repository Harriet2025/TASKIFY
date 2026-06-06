const API = 'api/tasks.php';

const state = {
    tasks: [],
    editingTaskId: null,
    deletingTaskId: null,
    search: '',
    statusFilter: 'All',
    priorityFilter: 'All',
    sort: 'created_desc',
    loading: false,
    darkMode: localStorage.getItem('taskify_dark') === 'true',
};

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
    darkIcon:            document.getElementById('darkIcon'),
    confirmBackdrop:     document.getElementById('confirmBackdrop'),
    confirmCancel:       document.getElementById('confirmCancel'),
    confirmOk:           document.getElementById('confirmOk'),
    shortcutsBackdrop:   document.getElementById('shortcutsBackdrop'),
    shortcutsBtn:        document.getElementById('shortcutsBtn'),
    shortcutsClose:      document.getElementById('shortcutsClose'),
};

// ── Dark mode ─────────────────────────────────────────────────────────────────

function applyDarkMode() {
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    el.darkIcon.innerHTML = state.darkMode
        ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`
        : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function toggleDark() {
    state.darkMode = !state.darkMode;
    localStorage.setItem('taskify_dark', state.darkMode);
    applyDarkMode();
}

applyDarkMode();
el.darkModeBtn.addEventListener('click', toggleDark);

// ── Date display ──────────────────────────────────────────────────────────────

(function setDate() {
    const now = new Date();
    const full = now.toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
    const short = now.toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' });
    if (el.topbarDate) el.topbarDate.textContent = full;
    if (el.sidebarDate) el.sidebarDate.textContent = short;
})();

// ── Overdue helper ────────────────────────────────────────────────────────────

function isOverdue(task) {
    if (task.status === 'Done') return false;
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(task.due_date + 'T00:00:00');
    return due < today;
}

function daysUntilDue(task) {
    const today = new Date(); today.setHours(0,0,0,0);
    const due = new Date(task.due_date + 'T00:00:00');
    return Math.ceil((due - today) / 86400000);
}

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

// ── Confirm delete dialog ─────────────────────────────────────────────────────

function openConfirm(id) {
    state.deletingTaskId = id;
    el.confirmBackdrop.classList.add('open');
    el.confirmBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => el.confirmOk.focus(), 80);
}

function closeConfirm() {
    state.deletingTaskId = null;
    el.confirmBackdrop.classList.remove('open');
    el.confirmBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
}

el.confirmCancel.addEventListener('click', closeConfirm);
el.confirmOk.addEventListener('click', async () => {
    const id = state.deletingTaskId;
    closeConfirm();
    if (!id) return;
    try {
        await animateDelete(id);
        await deleteTask(id);
        render();
    } catch (err) {
        showToast(err.message, 'error');
    }
});

el.confirmBackdrop.addEventListener('click', (e) => {
    if (e.target === el.confirmBackdrop) closeConfirm();
});

// ── Shortcuts dialog ──────────────────────────────────────────────────────────

el.shortcutsBtn.addEventListener('click', () => {
    el.shortcutsBackdrop.classList.add('open');
    el.shortcutsBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
});

el.shortcutsClose.addEventListener('click', () => {
    el.shortcutsBackdrop.classList.remove('open');
    el.shortcutsBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
});

el.shortcutsBackdrop.addEventListener('click', (e) => {
    if (e.target === el.shortcutsBackdrop) {
        el.shortcutsBackdrop.classList.remove('open');
        el.shortcutsBackdrop.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
});

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
    else showToast('↩  Task reopened', 'info');
}

// ── Animated delete ───────────────────────────────────────────────────────────

function animateDelete(id) {
    return new Promise((resolve) => {
        const card = el.taskList.querySelector(`[data-task-id="${id}"]`);
        if (!card) { resolve(); return; }
        card.classList.add('task-deleting');
        card.addEventListener('animationend', resolve, { once: true });
        setTimeout(resolve, 500);
    });
}

// ── Events ────────────────────────────────────────────────────────────────────

el.newTaskButton.addEventListener('click', () => { resetForm(); openModal(); });
el.modalClose.addEventListener('click', () => { resetForm(); closeModal(); });
el.clearButton.addEventListener('click', () => { resetForm(); closeModal(); });

el.modalBackdrop.addEventListener('click', (e) => {
    if (e.target === el.modalBackdrop) { resetForm(); closeModal(); }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    const tag = document.activeElement.tagName;
    const typing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    const modalOpen = el.modalBackdrop.classList.contains('open');
    const confirmOpen = el.confirmBackdrop.classList.contains('open');
    const shortcutsOpen = el.shortcutsBackdrop.classList.contains('open');

    if (e.key === 'Escape') {
        if (modalOpen) { resetForm(); closeModal(); }
        if (confirmOpen) closeConfirm();
        if (shortcutsOpen) { el.shortcutsBackdrop.classList.remove('open'); document.body.style.overflow = ''; }
        return;
    }
    if (typing || modalOpen || confirmOpen) return;
    if (e.key === 'n' || e.key === 'N') { resetForm(); openModal(); }
    if (e.key === 'd' || e.key === 'D') toggleDark();
    if (e.key === '?') { el.shortcutsBackdrop.classList.add('open'); el.shortcutsBackdrop.setAttribute('aria-hidden','false'); document.body.style.overflow = 'hidden'; }
    if (e.key === '/') { e.preventDefault(); el.searchInput.focus(); }
});

el.searchInput.addEventListener('input', (e) => { state.search = e.target.value; render(); });
el.statusFilterInput.addEventListener('change', (e) => { state.statusFilter = e.target.value; render(); });
el.priorityFilterInput.addEventListener('change', (e) => { state.priorityFilter = e.target.value; render(); });
el.sortInput.addEventListener('change', (e) => { state.sort = e.target.value; render(); });

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
            openConfirm(id);
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

// ── Filtering & sorting ───────────────────────────────────────────────────────

const PRIORITY_ORDER = { High: 3, Medium: 2, Low: 1 };

function getFiltered() {
    const q = state.search.trim().toLowerCase();
    return state.tasks
        .filter((t) => {
            const ms = !q || t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q);
            const overdue = isOverdue(t);
            const mv = state.statusFilter === 'All'
                || (state.statusFilter === 'Overdue' && overdue)
                || (state.statusFilter !== 'Overdue' && t.status === state.statusFilter);
            const mp = state.priorityFilter === 'All' || t.priority === state.priorityFilter;
            return ms && mv && mp;
        })
        .sort((a, b) => {
            switch (state.sort) {
                case 'created_asc':   return a.id - b.id;
                case 'due_asc':       return new Date(a.due_date) - new Date(b.due_date);
                case 'due_desc':      return new Date(b.due_date) - new Date(a.due_date);
                case 'priority_desc': return PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
                case 'priority_asc':  return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
                default:              return b.id - a.id; // created_desc
            }
        });
}

// ── Highlight search matches ──────────────────────────────────────────────────

function highlight(text, query) {
    if (!query) return escHtml(text);
    const escaped = escHtml(text);
    const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${escapedQ})`, 'gi'), '<mark class="search-highlight">$1</mark>');
}

// ── State helpers ─────────────────────────────────────────────────────────────

function startEdit(id) {
    const task = state.tasks.find((t) => t.id == id);
    if (!task) return;
    state.editingTaskId      = id;
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

// ── Render ────────────────────────────────────────────────────────────────────

function render() {
    renderStats();
    renderStatusStrip();
    renderTaskList();
    renderFormState();
}

function animateCount(el, target) {
    const start = parseInt(el.textContent) || 0;
    if (start === target) { el.textContent = target; return; }
    const dur = 400, step = 16;
    let elapsed = 0;
    const timer = setInterval(() => {
        elapsed += step;
        const progress = Math.min(elapsed / dur, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(start + (target - start) * ease);
        if (progress >= 1) clearInterval(timer);
    }, step);
}

function renderStats() {
    const total   = state.tasks.length;
    const active  = state.tasks.filter((t) => t.status !== 'Done').length;
    const done    = state.tasks.filter((t) => t.status === 'Done').length;
    const high    = state.tasks.filter((t) => t.priority === 'High').length;
    const overdue = state.tasks.filter(isOverdue).length;
    const pct     = total ? Math.round((done / total) * 100) : 0;

    animateCount(el.statTotal,   total);
    animateCount(el.statActive,  active);
    animateCount(el.statDone,    done);
    animateCount(el.statHigh,    high);
    animateCount(el.statOverdue, overdue);

    el.progressBar.style.width = pct + '%';
    el.progressPct.textContent = pct + '%';
    el.statOverdue.closest('.stat-card').classList.toggle('has-overdue', overdue > 0);
}

function renderStatusStrip() {
    const todo = state.tasks.filter((t) => t.status === 'To Do').length;
    const inProg = state.tasks.filter((t) => t.status === 'In Progress').length;
    const done = state.tasks.filter((t) => t.status === 'Done').length;
    const overdue = state.tasks.filter(isOverdue).length;

    el.statusStrip.innerHTML = `
        <button class="strip-pill ${state.statusFilter==='All'?'active':''}" data-filter="All">All <span>${state.tasks.length}</span></button>
        <button class="strip-pill ${state.statusFilter==='To Do'?'active':''}" data-filter="To Do">To Do <span>${todo}</span></button>
        <button class="strip-pill ${state.statusFilter==='In Progress'?'active':''}" data-filter="In Progress">In Progress <span>${inProg}</span></button>
        <button class="strip-pill ${state.statusFilter==='Done'?'active':''}" data-filter="Done">Done <span>${done}</span></button>
        ${overdue > 0 ? `<button class="strip-pill strip-pill-overdue ${state.statusFilter==='Overdue'?'active':''}" data-filter="Overdue">⚠️ Overdue <span>${overdue}</span></button>` : ''}
    `;
    el.statusStrip.querySelectorAll('.strip-pill').forEach((btn) => {
        btn.addEventListener('click', () => {
            state.statusFilter = btn.getAttribute('data-filter');
            el.statusFilterInput.value = state.statusFilter === 'Overdue' ? 'All' : state.statusFilter;
            render();
        });
    });
}

function getEmptyMessage() {
    if (state.search) return { icon: '🔍', title: `No results for "${state.search}"`, body: 'Try a different search term or clear the search.' };
    if (state.statusFilter === 'Done') return { icon: '🎉', title: 'No completed tasks yet', body: 'Mark tasks as done and they will appear here.' };
    if (state.statusFilter === 'In Progress') return { icon: '⚡', title: 'Nothing in progress', body: 'Move a task to "In Progress" to track active work.' };
    if (state.statusFilter === 'To Do') return { icon: '📋', title: 'No tasks to do', body: 'Click New task to add something to your list.' };
    if (state.statusFilter === 'Overdue') return { icon: '✅', title: 'No overdue tasks!', body: 'You\'re all caught up. Great work!' };
    if (state.priorityFilter !== 'All') return { icon: '🏷️', title: `No ${state.priorityFilter.toLowerCase()} priority tasks`, body: 'Try a different priority filter.' };
    return { icon: '📭', title: 'No tasks yet', body: 'Click New task to add your first one.' };
}

function relativeTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff/86400)}d ago`;
    return fmtDate(dateStr);
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
    const q = state.search.trim().toLowerCase();

    // count heading with context
    let heading = `${count} task${count === 1 ? '' : 's'}`;
    if (state.statusFilter !== 'All') heading += ` · ${state.statusFilter}`;
    if (state.priorityFilter !== 'All') heading += ` · ${state.priorityFilter} priority`;
    el.taskCountHeading.textContent = heading;

    if (count === 0) {
        const msg = getEmptyMessage();
        el.taskList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">${msg.icon}</span>
                <h4>${msg.title}</h4>
                <p>${msg.body}</p>
            </div>`;
        return;
    }

    el.taskList.innerHTML = filtered.map((task) => {
        const pl = task.priority.toLowerCase();
        const isDone = task.status === 'Done';
        const overdue = isOverdue(task);
        const days = daysUntilDue(task);

        const statusCls = isDone ? 'badge-done'
            : task.status === 'In Progress' ? 'badge-inprogress'
            : 'badge-todo';

        const toggleCls   = isDone ? '' : 'btn-done-task';
        const toggleLabel = isDone ? svgIcon('rotate-ccw') + ' Reopen' : svgIcon('check') + ' Mark done';

        // Due date label
        let dueLabelCls = 'task-meta-item';
        let dueLabel = `Due <strong>${fmtDate(task.due_date)}</strong>`;
        if (overdue) {
            dueLabelCls += ' overdue-label';
            const daysOver = Math.abs(days);
            dueLabel = `<span class="overdue-badge">⚠ Overdue${daysOver > 0 ? ` · ${daysOver}d` : ''}</span>`;
        } else if (!isDone && days === 0) {
            dueLabelCls += ' due-today-label';
            dueLabel = `<span class="due-today-badge">📅 Due today</span>`;
        } else if (!isDone && days === 1) {
            dueLabelCls += ' due-soon-label';
            dueLabel = `<span class="due-soon-badge">⏰ Due tomorrow</span>`;
        }

        const updatedAt = task.updated_at || task.created_at;

        return `
        <article class="task-card${isDone ? ' task-done' : ''}${overdue ? ' task-overdue' : ''}" data-task-id="${task.id}">
            <div class="task-card-stripe stripe-${pl}${overdue ? ' stripe-overdue' : ''}"></div>
            <div class="task-card-body">
                <div class="task-top">
                    <div class="task-title-row">
                        ${isDone ? `<div class="done-indicator">
                            <span class="done-check">
                                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                            </span>
                            Completed
                        </div>` : ''}
                        <div class="task-title${isDone ? ' done-text' : ''}">${highlight(task.title, q)}</div>
                        ${task.description ? `<div class="task-desc">${highlight(task.description, q)}</div>` : ''}
                    </div>
                    <div class="task-badges">
                        <span class="badge badge-${pl}">${task.priority}</span>
                        ${!isDone ? `<span class="badge ${statusCls}">${task.status}</span>` : ''}
                    </div>
                </div>

                <div class="task-meta">
                    <span class="${dueLabelCls}">
                        ${svgIcon('calendar')} ${dueLabel}
                    </span>
                    <span class="task-meta-item" title="${task.updated_at || task.created_at}">
                        ${svgIcon('clock')} Updated <strong>${relativeTime(updatedAt)}</strong>
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
    el.submitButton.disabled   = false;
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
        check:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>`,
        'rotate-ccw': `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.5"/></svg>`,
        edit:         `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
        trash:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`,
        calendar:     `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
        clock:        `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
    };
    return icons[name] || '';
}

// ── Utilities ─────────────────────────────────────────────────────────────────

function fmtDate(v) {
    if (!v) return '—';
    return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(v + 'T00:00:00'));
}

function escHtml(v) {
    return String(v)
        .replaceAll('&','&amp;').replaceAll('<','&lt;')
        .replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
}

// ── Init ──────────────────────────────────────────────────────────────────────
loadTasks();
