// TG/frontend/kanban.js
import { getTasks, backendUrl } from './api.js';

let allTasks = [];

document.addEventListener('DOMContentLoaded', () => {
    loadKanban();
});

async function loadKanban() {
    try {
        allTasks = await getTasks();
        renderColumns();
    } catch (e) {
        console.error(e);
        // showToast('Помилка завантаження', 'error');
    }
}

function renderColumns() {
    // Очищення колонок
    document.getElementById('col-Open').innerHTML = '';
    document.getElementById('col-InProgress').innerHTML = '';
    document.getElementById('col-Done').innerHTML = ''; // Якщо є візуальна колонка Done

    // Лічильники
    let counts = { Open: 0, InProgress: 0, Done: 0 };

    allTasks.forEach(task => {
        // Якщо статус в базі 'Open' або 'InProgress', відображаємо.
        // Якщо у вас немає статусу 'Done' в БД, можна використовувати логіку "архіву"
        const status = task.status || 'Open'; 
        if (counts[status] !== undefined) {
             counts[status]++;
        } else {
             // fallback for unknown status
             counts['Open']++;
        }
       
        const card = createCardElement(task);
        const col = document.getElementById(`col-${status}`) || document.getElementById('col-Open');
        if (col) col.appendChild(card);
    });

    document.getElementById('count-open').innerText = counts.Open;
    document.getElementById('count-prog').innerText = counts.InProgress;
}

function createCardElement(task) {
    const el = document.createElement('div');
    el.className = 'k-card';
    el.draggable = true;
    el.setAttribute('data-id', task.id);
    
    // Вміст картки
    el.innerHTML = `
        <div style="font-size:0.8rem; color:#94a3b8; margin-bottom:5px;">#${task.id}</div>
        <div style="color:white; margin-bottom:10px;">${task.text.substring(0, 100)}...</div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="people-badge"><i data-feather="users" style="width:12px"></i> ${task.claimedUsers ? task.claimedUsers.length : 0}/${task.peopleNeeded}</div>
            ${task.photoId ? '<i data-feather="image" style="width:14px; color:#a78bfa"></i>' : ''}
        </div>
    `;

    // Події Drag & Drop
    el.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', task.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => el.style.opacity = '0.5', 0);
    });

    el.addEventListener('dragend', () => {
        el.style.opacity = '1';
    });

    return el;
}

// Глобальні обробники Drop Zone (прив'язані в HTML)
window.allowDrop = (e) => e.preventDefault();

window.drop = async (e, newStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain');
    const card = document.querySelector(`.k-card[data-id="${taskId}"]`);
    
    if (!card) return;

    // Оптимістичне оновлення UI
    document.getElementById(`col-${newStatus}`).appendChild(card);
    
    // Оновлення на сервері
    try {
        const token = localStorage.getItem('token');
        await fetch(`${backendUrl}/api/tasks/${taskId}/status`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        // Оновити локальний масив
        const task = allTasks.find(t => t.id == taskId);
        if(task) task.status = newStatus;
        
    } catch (err) {
        console.error(err);
        alert('Помилка збереження статусу');
        loadKanban(); // Відкат змін
    }
    
    if(window.feather) feather.replace();
};
