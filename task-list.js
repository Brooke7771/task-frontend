// frontend/task-list.js
import { getTasks, handleTaskAction } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const taskListContainer = document.getElementById('taskListContainer');
    
    // const backendUrl = '...'; // ВИДАЛЕНО

    const fetchTasks = async () => {
        try {
            // const response = await fetch(...); // ВИДАЛЕНО
            const tasks = await getTasks(); // ОНОВЛЕНО
            renderTasks(tasks);
        } catch (error) {
            console.error('Не вдалося завантажити завдання:', error);
            taskListContainer.innerHTML = '<p class="error">Помилка! Не вдалося завантажити список завдань.</p>';
        }
    };

    const renderTasks = (tasks) => {
        if (!Array.isArray(tasks) || tasks.length === 0) {
            taskListContainer.innerHTML = '<p>Наразі немає активних завдань.</p>';
            return;
        }

        taskListContainer.innerHTML = '';

        tasks.forEach(task => {
            const card = document.createElement('div');
            card.className = 'task-card';

            const statusText = task.status === 'Open' ? '🟢 Вільне' : '🔴 В роботі';
            const statusClass = task.status === 'Open' ? 'status-open' : 'status-claimed';
            
            let claimedUsersHtml = '';
            if (task.claimedUsers?.length > 0) {
                const userItems = task.claimedUsers.map(info => {
                    const time = new Date(info.claimedAt).toLocaleString('uk-UA');
                    return `<li>@${info.user.username || 'невідомо'} (<em>${time}</em>)</li>`;
                }).join('');
                claimedUsersHtml = `<div class="user-list"><strong>Виконавці:</strong><ul>${userItems}</ul></div>`;
            }
            
            let pendingUsersHtml = '';
            if (task.pendingUsers?.length > 0) {
                const userItems = task.pendingUsers.map(user => `
                    <li class="pending-user">
                        <span>@${user.username || 'невідомо'}</span>
                        <div class="actions">
                            <button class="approve-btn" data-task-id="${task.id}" data-user-id="${user.id}">✅</button>
                            <button class="reject-btn" data-task-id="${task.id}" data-user-id="${user.id}">❌</button>
                        </div>
                    </li>
                `).join('');
                pendingUsersHtml = `<div class="user-list"><strong>Очікують підтвердження:</strong><ul>${userItems}</ul></div>`;
            }
            
            const peopleCount = task.claimedUsers?.length ?? 0;

            card.innerHTML = `
                <h2>Завдання #${task.id}</h2>
                <p>${task.text.replace(/\n/g, '<br>')}</p>
                <div class="task-info">
                    <span class="task-status ${statusClass}">${statusText}</span>
                    <span class="task-people"><strong>Потрібно:</strong> ${peopleCount}/${task.peopleNeeded}</span>
                </div>
                ${claimedUsersHtml}
                ${pendingUsersHtml}
            `;
            taskListContainer.appendChild(card);
        });
    };

    taskListContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const taskId = target.dataset.taskId;
        const userId = target.dataset.userId;

        if (!taskId || !userId) return;

        let action = '';
        if (target.classList.contains('approve-btn')) {
            action = 'approve';
        } else if (target.classList.contains('reject-btn')) {
            action = 'reject';
        } else {
            return;
        }

        try {
            target.disabled = true;
            // const response = await fetch(...); // ВИДАЛЕНО
            await handleTaskAction(taskId, action, userId); // ОНОВЛЕНО
            
            fetchTasks(); // Оновлюємо список завдань
        } catch (error) {
            console.error(`Помилка дії '${action}':`, error);
            alert(`Не вдалося ${action === 'approve' ? 'схвалити' : 'відхилити'} заявку.`);
            target.disabled = false;
        }
    });

    fetchTasks();
});