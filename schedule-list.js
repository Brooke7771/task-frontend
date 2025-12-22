import { getScheduledPosts, deleteScheduledPost, postScheduledNow, updateScheduledPost, getMyProfile, approveScheduledPost } from './api.js';

let allPosts = [];
let selectedPosts = new Set();
let currentCalendarDate = new Date();
let selectedDate = null; // Зберігаємо обрану дату
let isAdmin = false; // визначаємо, чи поточний користувач адмін

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
});

// --- LOAD DATA ---
window.loadPosts = async () => {
    try {
        // Отримуємо профіль (щоб знати, чи показувати кнопки адміну)
        try {
            const profile = await getMyProfile();
            isAdmin = profile && profile.is_admin;
        } catch (e) { isAdmin = false; }

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
            
            // Статусна бейджка
            let statusBadge = '';
            if (post.status === 'Draft') {
                statusBadge = '<span class="badge" style="background:#64748b; color:white">Чернетка</span>'; 
            } else if (post.status === 'PendingReview') {
                statusBadge = '<span class="badge" style="background:#f59e0b; color:black">На перевірці</span>'; 
            } else if (post.status === 'Scheduled') {
                statusBadge = '<span class="badge" style="background:#10b981; color:white">Заплановано</span>'; 
            } else if (post.status === 'Sent') {
                statusBadge = '<span class="badge" style="background:#64748b; color:white">Відправлено</span>'; 
            }

            // Кнопка схвалення (тільки для адмінів та коли статус PendingReview)
            let approveBtn = '';
            if (isAdmin && post.status === 'PendingReview') {
                approveBtn = `<button class="icon-btn btn-approve" onclick="approvePost('${post.id}')" title="Схвалити">✅</button>`;
            }

            card.innerHTML = `
                <input type="checkbox" class="card-select" value="${post.id}" onchange="toggleSelect('${post.id}')">
                <div class="post-header">
                    ${statusBadge}
                    <div class="post-time">${timeStr}<small>${post.targetChannelId || 'Канал'}</small></div>
                </div>
                <div class="post-content">
                    <div class="post-text">${cleanText}</div>
                    <div class="post-meta">
                        <div class="meta-item"><i data-feather="user" style="width:14px"></i> ${post.createdBy || 'Admin'}</div>
                    </div>
                </div>
                <div class="post-actions">
                    ${approveBtn}
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

    // Зберігаємо заголовки днів тижня
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

    const today = new Date();
    today.setHours(0,0,0,0);

    // Пусті клітинки
    for(let i=0; i<startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        // empty.style.visibility = 'hidden'; // Можна сховати, або лишити пустими
        grid.appendChild(empty);
    }

    // Дні
    for(let d=1; d<=daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        
        if(dateObj < today) dayCell.classList.add('past');
        if(dateObj.getTime() === today.getTime()) dayCell.classList.add('today');
        if (selectedDate && dateObj.toDateString() === selectedDate.toDateString()) {
            dayCell.classList.add('selected');
        }

        // Номер дня
        dayCell.innerHTML = `<div class="day-num">${d}</div>`;
        
        // Фільтруємо пости для цього дня
        const postsForDay = allPosts.filter(p => {
            const pd = new Date(p.postAt);
            return pd.getDate() === d && pd.getMonth() === month && pd.getFullYear() === year;
        });

        // Додаємо точки постів (максимум 3, щоб не розтягувати)
        const maxDots = 3;
        postsForDay.slice(0, maxDots).forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'post-dot';
            const time = new Date(p.postAt).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
            // Вирізаємо HTML теги для прев'ю
            const plainText = (p.text || "").replace(/<[^>]*>?/gm, ''); 
            dot.innerText = `${time} ${plainText.substring(0, 10)}...`;
            dayCell.appendChild(dot);
        });
        
        // Якщо постів більше
        if(postsForDay.length > maxDots) {
            const more = document.createElement('div');
            more.style.fontSize = '0.7em'; more.style.color='#64748b'; more.style.textAlign='center';
            more.innerText = `+ ще ${postsForDay.length - maxDots}`;
            dayCell.appendChild(more);
        }

        // Клік (блокуємо минуле)
        if(dateObj >= today) {
            dayCell.onclick = () => selectDate(dateObj);
        }
        
        grid.appendChild(dayCell);
    }
}

// --- 🔥 SELECTED DAY PANEL & RESCHEDULE ---
window.selectDate = (date) => {
    selectedDate = date;
    renderCalendar(); // Оновити підсвітку
    
    const panel = document.getElementById('selectedDayPanel');
    const list = document.getElementById('selectedDayList');
    const titleText = document.querySelector('#selectedDayTitle span');
    
    panel.classList.add('active');
    
    // Форматуємо дату для заголовка: "20 Грудня, П'ятниця"
    const dateOptions = { day: 'numeric', month: 'long', weekday: 'long' };
    titleText.innerText = date.toLocaleDateString('uk-UA', dateOptions);
    
    const dayPosts = allPosts.filter(p => {
        const pd = new Date(p.postAt);
        return pd.toDateString() === date.toDateString();
    });

    if (dayPosts.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding:30px; color:#64748b;">
                <i data-feather="coffee" style="width:40px; height:40px; opacity:0.5; margin-bottom:10px;"></i>
                <div style="font-size:1.1em;">Вільний день</div>
                <div style="font-size:0.9em; margin-top:5px;">Запланованих постів немає</div>
                <button onclick="window.location.href='schedule.html'" class="btn btn-primary" style="width:auto; margin-top:15px; padding:8px 20px;">
                    <i data-feather="plus"></i> Запланувати
                </button>
            </div>`;
    } else {
        list.innerHTML = dayPosts.map(post => {
            const d = new Date(post.postAt);
            const tzOffset = d.getTimezoneOffset() * 60000;
            const isoTime = (new Date(d - tzOffset)).toISOString().slice(0, 16);

            const rawText = post.text || "Без тексту";
            const cleanText = rawText.replace(/<[^>]*>?/gm, '').substring(0, 60) + (rawText.length > 60 ? '...' : '');
            
            // Визначаємо тип медіа для іконки
            let mediaIcon = '';
            if(post.photoIds?.length) mediaIcon = '<i data-feather="image" style="width:14px"></i>';
            if(post.videoIds?.length) mediaIcon = '<i data-feather="video" style="width:14px"></i>';

            // Статусна бейджка
            let statusBadge = '';
            if (post.status === 'Draft') statusBadge = '<span class="badge" style="background:#64748b; color:white; margin-right:8px;">Чернетка</span>';
            else if (post.status === 'PendingReview') statusBadge = '<span class="badge" style="background:#f59e0b; color:black; margin-right:8px;">На перевірці</span>';
            else if (post.status === 'Scheduled') statusBadge = '<span class="badge" style="background:#10b981; color:white; margin-right:8px;">Заплановано</span>';

            // Кнопка схвалення тільки для адмінів
            let approveBtn = '';
            if (isAdmin && post.status === 'PendingReview') {
                approveBtn = `<button class="icon-btn btn-approve" onclick="approvePost('${post.id}')" title="Схвалити" style="width:32px; height:32px; margin-right:6px;">✅</button>`;
            }

            return `
            <div class="day-task-row">
                <div class="task-time-box">
                    ${d.toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'})}
                </div>
                
                <div class="task-content">
                    <h4 title="${rawText.replace(/"/g, '&quot;')}">${statusBadge}${cleanText}</h4>
                    <p>
                        ${mediaIcon} ${post.targetChannelId || 'Основний канал'} 
                        <span style="opacity:0.5; margin-left:10px;">👤 ${post.createdBy || 'Admin'}</span>
                    </p>
                </div>
                
                <div class="task-actions-area">
                    <input type="datetime-local" class="quick-reschedule-input" value="${isoTime}" 
                           onchange="quickReschedule('${post.id}', this.value)" title="Перенести">
                           
                    ${approveBtn}
                    <button class="icon-btn btn-edit" onclick="window.location.href='schedule-edit.html?id=${post.id}'" title="Редагувати" style="width:32px; height:32px;">
                        <i data-feather="edit-2" style="width:14px;"></i>
                    </button>
                    
                    <button class="icon-btn btn-delete" onclick="singleDelete('${post.id}')" title="Видалити" style="width:32px; height:32px; color:#ef4444;">
                        <i data-feather="trash-2" style="width:14px;"></i>
                    </button>
                </div>
            </div>
            `;
        }).join('');
    }
    
    if(window.feather) feather.replace();
    
    // Плавний скрол до панелі
    setTimeout(() => {
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
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
// Approve post (Admin only)
window.approvePost = async (postId) => {
    if(!confirm('Схвалити цей пост?')) return;
    try {
        await approveScheduledPost(postId);
        await loadPosts();
        alert('Пост схвалено');
    } catch (e) {
        console.error(e);
        alert('Не вдалося схвалити пост');
    }
};