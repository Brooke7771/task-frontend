import { getScheduledPosts, deleteScheduledPost, postScheduledNow } from './api.js';

let allPosts = [];
let selectedPosts = new Set();
let currentCalendarDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    // Безпечна ініціалізація
    loadPosts();
    renderCalendar();
});

// --- LOAD DATA ---
window.loadPosts = async () => {
    const timeline = document.getElementById('timelineView');
    if(timeline) {
        // timeline.innerHTML = '<div style="text-align: center; padding: 50px; color: #64748b;"><span class="loader"></span> Оновлення...</div>';
    }
    
    try {
        const posts = await getScheduledPosts();
        if(!Array.isArray(posts)) throw new Error("Invalid response");

        // Сортуємо за датою (від найближчої)
        allPosts = posts.sort((a, b) => new Date(a.postAt) - new Date(b.postAt));
        
        renderTimeline();
        renderCalendar();
        unselectAll();
    } catch (e) {
        console.error(e);
        if(timeline) {
            timeline.innerHTML = '<div style="text-align: center; color: #ef4444;">Помилка завантаження даних. Перевірте з\'єднання.</div>';
        }
    }
};

// --- VIEW SWITCHER ---
window.switchView = (view) => {
    const views = ['timeline', 'calendar'];
    views.forEach(v => {
        const el = document.getElementById(`${v}View`);
        const btn = document.getElementById(`btn-${v}`);
        if(el) el.classList.remove('active');
        if(btn) btn.classList.remove('active');
    });

    const activeEl = document.getElementById(`${view}View`);
    const activeBtn = document.getElementById(`btn-${view}`);
    if(activeEl) activeEl.classList.add('active');
    if(activeBtn) activeBtn.classList.add('active');
};

// --- TIMELINE RENDER ---
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
        
        const label = document.createElement('div');
        label.className = 'date-label';
        label.innerHTML = `<i data-feather="calendar" style="width:16px"></i> ${dateLabel}`;
        groupDiv.appendChild(label);
        
        groups[dateLabel].forEach(post => {
            const date = new Date(post.postAt);
            const timeStr = date.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'});
            
            // 🔥 FIX: Check if post.text exists
            const rawText = post.text || "";
            const cleanText = rawText.replace(/<[^>]*>?/gm, '').substring(0, 120) + (rawText.length > 120 ? '...' : '');
            
            const mediaIcon = (post.photoIds?.length > 0 || post.videoIds?.length > 0) 
                ? `<i data-feather="image" style="width:14px; vertical-align:middle; margin-left:5px;"></i>` 
                : '';

            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <input type="checkbox" class="card-select" value="${post.id}" onchange="toggleSelect('${post.id}')">
                
                <div class="post-time">
                    ${timeStr}
                    <small>${post.targetChannelId || 'Канал'}</small>
                </div>
                
                <div class="post-content">
                    <div class="post-text">${cleanText}</div>
                    <div class="post-meta">
                        <div class="meta-item">${mediaIcon} ${post.photoIds?.length || 0} фото</div>
                        <div class="meta-item"><i data-feather="user" style="width:14px"></i> ${post.createdBy || 'Admin'}</div>
                    </div>
                </div>
                
                <div class="post-actions">
                    <button class="icon-btn btn-now" onclick="singlePostNow('${post.id}')" title="Опублікувати зараз"><i data-feather="send" style="width:18px"></i></button>
                    <button class="icon-btn btn-edit" onclick="window.location.href='schedule-edit.html?id=${post.id}'" title="Редагувати"><i data-feather="edit-2" style="width:18px"></i></button>
                    <button class="icon-btn btn-delete" onclick="singleDelete('${post.id}')" title="Видалити"><i data-feather="trash" style="width:18px"></i></button>
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toDateString();

    posts.forEach(post => {
        const d = new Date(post.postAt);
        const dStr = d.toDateString();
        
        let label = d.toLocaleDateString('uk-UA', {weekday: 'long', day: 'numeric', month: 'long'});
        if(dStr === today) label = "Сьогодні (" + label + ")";
        else if(dStr === tomorrowStr) label = "Завтра (" + label + ")";
        
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
    if(!grid) return; // Safety check

    // Зберігаємо заголовки
    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Оновлюємо заголовок
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    const labelEl = document.getElementById('calMonthLabel');
    if(labelEl) labelEl.innerText = `${monthNames[month]} ${year}`;

    // Логіка календаря
    const firstDay = new Date(year, month, 1).getDay(); // 0 = Sun
    // Коригуємо для Пн = 0 (укр стандарт)
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Пусті клітинки
    for(let i=0; i<startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    // Дні
    for(let d=1; d<=daysInMonth; d++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        
        const checkDate = new Date(year, month, d).toDateString();
        const todayStr = new Date().toDateString();
        if(checkDate === todayStr) dayCell.classList.add('today');

        dayCell.innerHTML = `<div class="day-num">${d}</div>`;
        
        // Знаходимо пости для цього дня
        const postsForDay = allPosts.filter(p => {
            const pd = new Date(p.postAt);
            return pd.getDate() === d && pd.getMonth() === month && pd.getFullYear() === year;
        });

        postsForDay.forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'post-dot';
            const time = new Date(p.postAt).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
            const rawText = p.text || "";
            dot.innerText = `${time} ${rawText.replace(/<[^>]*>?/gm, '')}`;
            dot.title = rawText; // Tooltip
            // Клік по посту в календарі
            dot.onclick = (e) => {
                e.stopPropagation();
                window.location.href = `schedule-edit.html?id=${p.id}`;
            };
            dayCell.appendChild(dot);
        });
        
        grid.appendChild(dayCell);
    }
}

// --- BULK ACTIONS LOGIC ---
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
    if(!bar || !count) return;

    count.innerText = selectedPosts.size;
    
    if(selectedPosts.size > 0) bar.classList.add('visible');
    else bar.classList.remove('visible');
}

// --- API WRAPPERS ---
window.singleDelete = async (id) => {
    if(!confirm('Видалити цей пост?')) return;
    try {
        await deleteScheduledPost(id);
        loadPosts();
    } catch(e) { alert('Помилка'); }
};

window.singlePostNow = async (id) => {
    if(!confirm('Опублікувати зараз?')) return;
    try {
        await postScheduledNow(id);
        loadPosts();
    } catch(e) { alert('Помилка'); }
};

window.bulkDelete = async () => {
    if(!confirm(`Видалити обрані пости (${selectedPosts.size})?`)) return;
    for(let id of selectedPosts) {
        await deleteScheduledPost(id);
    }
    loadPosts();
};

window.bulkPostNow = async () => {
    if(!confirm(`Опублікувати обрані пости (${selectedPosts.size}) зараз?`)) return;
    for(let id of selectedPosts) {
        await postScheduledNow(id);
    }
    loadPosts();
};