import { getTasks, handleTaskAction } from './api.js';

let allTasks = [];

document.addEventListener('DOMContentLoaded', () => {
    window.loadTasks();

    // Event listeners for filters
    document.getElementById('searchInput').addEventListener('input', renderTasks);
    document.getElementById('statusFilter').addEventListener('change', renderTasks);
});

window.loadTasks = async () => {
    const container = document.getElementById('taskListContainer');
    // container.innerHTML = '<div style="text-align: center; color: #64748b;">Оновлення...</div>';
    
    try {
        allTasks = await getTasks();
        renderTasks();
        updateStats();
    } catch (error) {
        console.error('Error:', error);
        container.innerHTML = '<div style="text-align: center; color: #ef4444;">Помилка завантаження</div>';
    }
};

function updateStats() {
    if(!allTasks) return;
    document.getElementById('stat-total').textContent = allTasks.length;
    document.getElementById('stat-open').textContent = allTasks.filter(t => t.status === 'Open').length;
    document.getElementById('stat-busy').textContent = allTasks.filter(t => t.status !== 'Open').length;
}

function renderTasks() {
    const container = document.getElementById('taskListContainer');
    const searchVal = document.getElementById('searchInput').value.toLowerCase();
    const statusVal = document.getElementById('statusFilter').value;

    if (!Array.isArray(allTasks) || allTasks.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #64748b;">Немає активних завдань</div>';
        return;
    }

    // Filter
    const filtered = allTasks.filter(task => {
        const matchesSearch = task.text.toLowerCase().includes(searchVal) || String(task.id).includes(searchVal);
        const matchesStatus = statusVal === 'all' || task.status === statusVal;
        return matchesSearch && matchesStatus;
    });

    if (filtered.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 30px; color: #64748b;">Нічого не знайдено</div>';
        return;
    }

    container.innerHTML = '';

    filtered.forEach(task => {
        const card = document.createElement('div');
        card.className = 'task-card';

        // 1. Status Badge
        const isOpen = task.status === 'Open';
        const statusBadge = isOpen 
            ? `<span class="status-badge status-open"><i data-feather="check-circle" style="width:14px"></i> Вільне</span>`
            : `<span class="status-badge status-busy"><i data-feather="clock" style="width:14px"></i> В роботі</span>`;
            
        // 2. People Count
        const currentPeople = task.claimedUsers?.length || 0;
        const neededPeople = task.peopleNeeded;

        // 3. Claimed Users
        let claimedHtml = '';
        if (task.claimedUsers?.length > 0) {
            claimedHtml += `<div class="users-section"><div class="section-title">Виконавці</div>`;
            task.claimedUsers.forEach(info => {
                const username = info.user.username || 'unknown';
                const time = new Date(info.claimedAt).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
                claimedHtml += `<span class="user-chip"><i data-feather="user" style="width:12px"></i> ${username} <small style="opacity:0.6; margin-left:5px">${time}</small></span>`;
            });
            claimedHtml += `</div>`;
        }

        // 4. Pending Users (with actions)
        let pendingHtml = '';
        if (task.pendingUsers?.length > 0) {
            pendingHtml += `<div class="users-section" style="margin-top:10px; border-color:rgba(250, 204, 21, 0.3)"><div class="section-title" style="color:#facc15">Очікують підтвердження</div>`;
            task.pendingUsers.forEach(user => {
                const username = user.username || 'unknown';
                pendingHtml += `
                <div class="user-chip pending">
                    <span>@${username}</span>
                    <div class="user-chip-actions">
                        <button class="mini-btn btn-approve" onclick="processTaskAction('${task.id}', 'approve', '${user.id}')" title="Схвалити"><i data-feather="check" style="width:14px"></i></button>
                        <button class="mini-btn btn-reject" onclick="processTaskAction('${task.id}', 'reject', '${user.id}')" title="Відхилити"><i data-feather="x" style="width:14px"></i></button>
                    </div>
                </div>`;
            });
            pendingHtml += `</div>`;
        }

        // Combine HTML
        card.innerHTML = `
            <div class="task-header">
                <span class="task-id">#${task.id}</span>
                ${statusBadge}
            </div>
            
            <div class="task-text">${task.text}</div>
            
            ${claimedHtml}
            ${pendingHtml}

            <div class="task-footer">
                <div class="people-count">
                    <i data-feather="users" style="color: #94a3b8;"></i>
                    <span>${currentPeople} / ${neededPeople} виконавців</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
    
    if(window.feather) feather.replace();
}

// Action Handler Wrapper
window.processTaskAction = async (taskId, action, userId) => {
    if(!confirm(`Ви впевнені, що хочете ${action === 'approve' ? 'схвалити' : 'відхилити'} цього користувача?`)) return;
    
    try {
        await handleTaskAction(taskId, action, userId);
        loadTasks(); // Reload to see changes
    } catch (e) {
        showToast('Сталася помилка при обробці запиту.', 'error');
    }
};