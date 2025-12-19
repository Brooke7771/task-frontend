import { getScheduledPosts, deleteScheduledPost, postScheduledNow, updateScheduledPost } from './api.js';

let allPosts = [];
let selectedPosts = new Set();
let currentCalendarDate = new Date();
let selectedDate = null; // Зберігаємо обрану дату

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
});

// --- LOAD DATA ---
window.loadPosts = async () => {
    try {
        const posts = await getScheduledPosts();
        if(!Array.isArray(posts)) throw new Error("Invalid response");

        // Сортуємо від найближчого
        allPosts = posts.sort((a, b) => new Date(a.postAt) - new Date(b.postAt));
        
        renderTimeline();
        renderCalendar();
        
        // Якщо панель відкрита, оновлюємо і її (на випадок змін)
        if(selectedDate) selectDate(selectedDate);
        
        unselectAll();
    } catch (e) {
        console.error(e);
    }
};

// --- VIEW SWITCHER ---
window.switchView = (view) => {
    ['timeline', 'calendar'].forEach(v => {
        document.getElementById(`${v}View`)?.classList.remove('active');
        document.getElementById(`btn-${v}`)?.classList.remove('active');
    });
    document.getElementById(`${view}View`)?.classList.add('active');
    document.getElementById(`btn-${view}`)?.classList.add('active');
    
    // Закриваємо панель при перемиканні на список
    if(view === 'timeline') document.getElementById('selectedDayPanel').classList.remove('active');
};

// --- TIMELINE RENDER (Standard List) ---
function renderTimeline() {
    const container = document.getElementById('timelineView');
    if (!container) return;
    if(allPosts.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #64748b;">Немає запланованих постів</div>';
        return;
    }
    
    container.innerHTML = '';
    const groups = groupPostsByDate(allPosts);
    
    Object.keys(groups).forEach(dateLabel => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'date-group';
        groupDiv.innerHTML = `<div class="date-label"><i data-feather="calendar" style="width:16px"></i> ${dateLabel}</div>`;
        
        groups[dateLabel].forEach(post => {
            const date = new Date(post.postAt);
            const timeStr = date.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'});
            const rawText = post.text || "";
            const cleanText = rawText.replace(/<[^>]*>?/gm, '').substring(0, 120) + (rawText.length > 120 ? '...' : '');
            
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <input type="checkbox" class="card-select" value="${post.id}" onchange="toggleSelect('${post.id}')">
                <div class="post-time">${timeStr}<small>${post.targetChannelId || 'Канал'}</small></div>
                <div class="post-content">
                    <div class="post-text">${cleanText}</div>
                    <div class="post-meta">
                        <div class="meta-item"><i data-feather="user" style="width:14px"></i> ${post.createdBy || 'Admin'}</div>
                    </div>
                </div>
                <div class="post-actions">
                    <button class="icon-btn btn-now" onclick="singlePostNow('${post.id}')"><i data-feather="send"></i></button>
                    <button class="icon-btn btn-edit" onclick="window.location.href='schedule-edit.html?id=${post.id}'"><i data-feather="edit-2"></i></button>
                    <button class="icon-btn btn-delete" onclick="singleDelete('${post.id}')"><i data-feather="trash"></i></button>
                </div>
            `;
            groupDiv.appendChild(card);
        });
        container.appendChild(groupDiv);
    });
    if(window.feather) feather.replace();
}

function groupPostsByDate(posts) {
    const groups = {};
    const today = new Date().toDateString();
    posts.forEach(post => {
        const d = new Date(post.postAt);
        const dStr = d.toDateString();
        let label = d.toLocaleDateString('uk-UA', {weekday: 'long', day: 'numeric', month: 'long'});
        if(dStr === today) label = "Сьогодні (" + label + ")";
        if(!groups[label]) groups[label] = [];
        groups[label].push(post);
    });
    return groups;
}

// --- 🔥 CALENDAR LOGIC (FIXED) ---
window.changeMonth = (delta) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
};

function renderCalendar() {
    const grid = document.querySelector('.calendar-grid');
    if(!grid) return;

    // Очищаємо все, крім заголовків
    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    document.getElementById('calMonthLabel').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Коригування для Пн
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const today = new Date();
    today.setHours(0,0,0,0); // Скидаємо час для порівняння

    // Пусті клітинки
    for(let i=0; i<startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    // Дні
    for(let d=1; d<=daysInMonth; d++) {
        const currentDayDate = new Date(year, month, d);
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        
        // 1. Перевірка на минуле (блокуємо)
        if (currentDayDate < today) {
            dayCell.classList.add('past');
            // dayCell.title = "Минуле"; // Можна додати підказку
        } 
        
        // 2. Перевірка на "Сьогодні"
        if (currentDayDate.getTime() === today.getTime()) {
            dayCell.classList.add('today');
        }

        // 3. Перевірка на "Обраний"
        if (selectedDate && currentDayDate.getTime() === selectedDate.getTime()) {
            dayCell.classList.add('selected');
        }

        dayCell.innerHTML = `<div class="day-num">${d}</div>`;
        
        // Пости в цей день (точки)
        const postsForDay = allPosts.filter(p => {
            const pd = new Date(p.postAt);
            return pd.getDate() === d && pd.getMonth() === month && pd.getFullYear() === year;
        });

        postsForDay.forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'post-dot';
            const time = new Date(p.postAt).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
            dot.innerText = time;
            dayCell.appendChild(dot);
        });

        // 4. Обробка кліку
        if (currentDayDate >= today) {
            dayCell.onclick = () => selectDate(currentDayDate);
        }
        
        grid.appendChild(dayCell);
    }
}

// --- 🔥 SELECTED DAY PANEL & RESCHEDULE ---
window.selectDate = (date) => {
    selectedDate = date;
    renderCalendar(); // Перемалювати, щоб оновити клас .selected
    
    const panel = document.getElementById('selectedDayPanel');
    const list = document.getElementById('selectedDayList');
    const titleText = document.querySelector('#selectedDayTitle span');
    
    panel.classList.add('active');
    if(titleText) titleText.innerText = date.toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' });
    
    // Фільтруємо пости для цього дня
    const dayPosts = allPosts.filter(p => {
        const pd = new Date(p.postAt);
        return pd.toDateString() === date.toDateString();
    });

    if (dayPosts.length === 0) {
        list.innerHTML = '<div style="color:#94a3b8; padding:20px; text-align:center;">Немає завдань на цей день. Можете запланувати нове!</div>';
    } else {
        list.innerHTML = dayPosts.map(post => {
            const d = new Date(post.postAt);
            // Формуємо value для input type="datetime-local" (враховуючи часовий пояс)
            const tzOffset = d.getTimezoneOffset() * 60000;
            const isoTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);

            const rawText = post.text || "";
            const cleanText = rawText.replace(/<[^>]*>?/gm, '').substring(0, 60) + (rawText.length > 60 ? '...' : '');

            return `
            <div class="day-task-row">
                <div class="task-info-mini">
                    <span class="task-time-badge">${d.toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'})}</span>
                    <span style="font-weight:600; color:white;">${cleanText}</span>
                    <div style="font-size:0.8em; color:#94a3b8; margin-top:4px;">${post.targetChannelId || 'Канал'}</div>
                </div>
                
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="font-size:0.8em; color:#94a3b8;">Перенести:</label>
                    <input type="datetime-local" class="quick-reschedule-input" value="${isoTime}" 
                           onchange="quickReschedule('${post.id}', this.value)" title="Змінити час">
                           
                    <button class="icon-btn btn-edit" onclick="window.location.href='schedule-edit.html?id=${post.id}'"><i data-feather="edit-2"></i></button>
                </div>
            </div>
            `;
        }).join('');
    }
    
    if(window.feather) feather.replace();
    
    // Скрол до панелі для зручності
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

window.closeDayPanel = () => {
    document.getElementById('selectedDayPanel').classList.remove('active');
    selectedDate = null;
    renderCalendar();
};

window.quickReschedule = async (postId, newTimeStr) => {
    if (!newTimeStr) return;
    
    // Перевірка на минуле
    if (new Date(newTimeStr) < new Date()) {
        alert("Не можна планувати пости в минулому!");
        loadPosts(); // Скинути значення
        return;
    }

    if (!confirm('Перенести пост на цей час?')) {
        loadPosts(); 
        return;
    }

    try {
        const post = allPosts.find(p => p.id === postId);
        if(!post) return;

        // Використовуємо FormData, як вимагає ваш бекенд
        const formData = new FormData();
        formData.append('post_text', post.text); // Текст обов'язковий, передаємо старий
        formData.append('post_at', new Date(newTimeStr).toISOString());
        
        // Запит через fetch напряму (або через api.js wrapper)
        const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com';
        await fetch(`${backendUrl}/api/scheduled_posts/${postId}/update`, {
            method: 'POST',
            headers: { 'X-Username': localStorage.getItem('username') || 'Unknown' },
            body: formData
        });

        // Оновлюємо дані
        await loadPosts(); 
    } catch (e) {
        alert('Помилка при перенесенні');
        console.error(e);
    }
};

// --- BULK ACTIONS (Без змін) ---
window.toggleSelect = (id) => {
    if(selectedPosts.has(id)) selectedPosts.delete(id);
    else selectedPosts.add(id);
    updateBulkBar();
};
window.unselectAll = () => {
    selectedPosts.clear();
    document.querySelectorAll('.card-select').forEach(cb => cb.checked = false);
    updateBulkBar();
};
function updateBulkBar() {
    const bar = document.getElementById('bulkBar');
    const count = document.getElementById('selectedCount');
    if(!bar) return;
    count.innerText = selectedPosts.size;
    if(selectedPosts.size > 0) bar.classList.add('visible');
    else bar.classList.remove('visible');
}

// API WRAPPERS
window.singleDelete = async (id) => { if(confirm('Видалити?')) { await deleteScheduledPost(id); loadPosts(); } };
window.singlePostNow = async (id) => { if(confirm('Опублікувати зараз?')) { await postScheduledNow(id); loadPosts(); } };
window.bulkDelete = async () => { if(confirm(`Видалити ${selectedPosts.size}?`)) { for(let id of selectedPosts) await deleteScheduledPost(id); loadPosts(); } };
window.bulkPostNow = async () => { if(confirm(`Опублікувати ${selectedPosts.size}?`)) { for(let id of selectedPosts) await postScheduledNow(id); loadPosts(); } };