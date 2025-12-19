import { getScheduledPosts, deleteScheduledPost, postScheduledNow, updateScheduledPost } from './api.js';

let allPosts = [];
let selectedPosts = new Set();
let currentCalendarDate = new Date();
let selectedDate = null; // Зберігає обрану дату в календарі

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
});

// --- LOAD DATA ---
window.loadPosts = async () => {
    try {
        const posts = await getScheduledPosts();
        if(!Array.isArray(posts)) throw new Error("Invalid response");

        allPosts = posts.sort((a, b) => new Date(a.postAt) - new Date(b.postAt));
        
        renderTimeline();
        renderCalendar();
        
        // Якщо була обрана дата, оновити її список (на випадок змін)
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
    
    // Ховаємо панель деталей, якщо перемикаємось на таймлайн
    if(view === 'timeline') {
        document.getElementById('selectedDayPanel').classList.remove('active');
    }
};

// --- TIMELINE RENDER (Без змін) ---
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

// --- CALENDAR RENDER ---
window.changeMonth = (delta) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
};

function renderCalendar() {
    const grid = document.querySelector('.calendar-grid');
    if(!grid) return;

    // Очищаємо, зберігаючи заголовки
    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    document.getElementById('calMonthLabel').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Отримуємо поточну дату без часу для порівняння
    const today = new Date();
    today.setHours(0,0,0,0);

    // Пусті клітинки
    for(let i=0; i<startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    // Дні
    for(let d=1; d<=daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        
        // Перевірка на "Сьогодні"
        if(dateObj.getTime() === today.getTime()) dayCell.classList.add('today');
        
        // Перевірка на "Минуле" (блокуємо клік або стиль)
        if(dateObj < today) {
            dayCell.classList.add('past');
            // Можна заборонити клік, якщо треба: dayCell.style.pointerEvents = 'none';
        }

        // Перевірка на "Обраний"
        if (selectedDate && dateObj.toDateString() === selectedDate.toDateString()) {
            dayCell.classList.add('selected');
        }

        dayCell.innerHTML = `<div class="day-num">${d}</div>`;
        
        // Знаходимо пости
        const postsForDay = allPosts.filter(p => {
            const pd = new Date(p.postAt);
            return pd.getDate() === d && pd.getMonth() === month && pd.getFullYear() === year;
        });

        postsForDay.forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'post-dot';
            const time = new Date(p.postAt).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
            dot.innerText = `${time}`;
            dayCell.appendChild(dot);
        });

        // Клік по дню
        dayCell.onclick = () => selectDate(dateObj);
        
        grid.appendChild(dayCell);
    }
}

// --- 🔥 ЛОГІКА ОБРАНОГО ДНЯ І СПИСКУ ---
window.selectDate = (date) => {
    selectedDate = date;
    renderCalendar(); // Перемалювати, щоб показати .selected
    
    const panel = document.getElementById('selectedDayPanel');
    const list = document.getElementById('selectedDayList');
    const title = document.getElementById('selectedDayTitle');
    
    panel.classList.add('active');
    title.innerHTML = `<i data-feather="calendar"></i> Завдання на ${date.toLocaleDateString('uk-UA')}`;
    
    // Фільтруємо пости
    const dayPosts = allPosts.filter(p => {
        const pd = new Date(p.postAt);
        return pd.toDateString() === date.toDateString();
    });

    if (dayPosts.length === 0) {
        list.innerHTML = '<div style="color:#64748b; padding:10px;">Немає завдань на цей день.</div>';
    } else {
        list.innerHTML = dayPosts.map(post => {
            const d = new Date(post.postAt);
            // Для інпуту datetime-local потрібен формат YYYY-MM-DDTHH:mm
            // Коригуємо часовий пояс
            const tzOffset = d.getTimezoneOffset() * 60000; 
            const localISOTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);

            const rawText = post.text || "";
            const cleanText = rawText.replace(/<[^>]*>?/gm, '').substring(0, 50) + (rawText.length > 50 ? '...' : '');

            return `
            <div class="day-task-row">
                <div style="flex:1">
                    <div style="font-weight:bold; color:white;">${cleanText}</div>
                    <div style="font-size:0.8em; color:#94a3b8;">${post.targetChannelId || 'Основний канал'}</div>
                </div>
                
                <div style="display:flex; align-items:center; gap:10px;">
                    <input type="datetime-local" class="reschedule-input" value="${localISOTime}" 
                           onchange="quickReschedule('${post.id}', this.value)" title="Змінити час">
                           
                    <button class="icon-btn btn-edit" onclick="window.location.href='schedule-edit.html?id=${post.id}'"><i data-feather="edit-2"></i></button>
                </div>
            </div>
            `;
        }).join('');
    }
    
    if(window.feather) feather.replace();
    
    // Скрол до панелі
    panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
};

// 🔥 ШВИДКЕ ПЕРЕНЕСЕННЯ
window.quickReschedule = async (postId, newTimeStr) => {
    if (!newTimeStr) return;
    if (!confirm('Перенести пост на цей час?')) {
        loadPosts(); // Скинути значення
        return;
    }

    try {
        const post = allPosts.find(p => p.id === postId);
        if(!post) return;

        // Створюємо FormData для відправки (як вимагає ваш бекенд updateScheduledPost)
        const formData = new FormData();
        formData.append('post_text', post.text); // Текст залишаємо старим
        formData.append('post_at', new Date(newTimeStr).toISOString());
        
        // Якщо є медіа, їх треба передати або бекенд повинен не чіпати їх, якщо не передано нових
        // Ваша поточна реалізація update_scheduled_post_handler оновлює фото тільки якщо передані нові.
        // Тож можна відправляти пусті фото/відео.

        // Викликаємо функцію з api.js, яку ми імпортували, але тут прямий виклик fetch для простоти або імпорт updateScheduledPost
        // Краще використати існуючий метод, якщо він експортований. 
        // Припустимо, ми можемо перевикористати логіку. 
        
        // Але оскільки updateScheduledPost вимагає form-data і це складно емулювати без файлів,
        // простіше зробити запит тут:
        
        const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com';
        await fetch(`${backendUrl}/api/scheduled_posts/${postId}/update`, {
            method: 'POST',
            headers: { 'X-Username': localStorage.getItem('username') || 'Unknown' },
            body: formData
        });

        // Успіх
        loadPosts(); // Перезавантажити все
    } catch (e) {
        alert('Помилка при перенесенні');
        console.error(e);
    }
};

// --- BULK ACTIONS ---
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
    bar.classList.toggle('visible', selectedPosts.size > 0);
}

// API WRAPPERS
window.singleDelete = async (id) => { if(confirm('Видалити?')) { await deleteScheduledPost(id); loadPosts(); } };
window.singlePostNow = async (id) => { if(confirm('Опублікувати зараз?')) { await postScheduledNow(id); loadPosts(); } };
window.bulkDelete = async () => { if(confirm(`Видалити ${selectedPosts.size}?`)) { for(let id of selectedPosts) await deleteScheduledPost(id); loadPosts(); } };
window.bulkPostNow = async () => { if(confirm(`Опублікувати ${selectedPosts.size}?`)) { for(let id of selectedPosts) await postScheduledNow(id); loadPosts(); } };