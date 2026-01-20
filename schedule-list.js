import { getScheduledPosts, deleteScheduledPost, postScheduledNow, updateScheduledPost, getMyProfile, approveScheduledPost, backendUrl } from './api.js';

let allPosts = [];
let selectedPosts = new Set();
let currentCalendarDate = new Date();
let selectedDate = null;
let isAdmin = false;

// 🔥 SSE INIT
function initSSE() {
    const eventSource = new EventSource(`${backendUrl}/api/events`);
    
    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            if (data.type === 'UPDATE_SCHEDULE') {
                console.log('Received update event, reloading...');
                loadPosts(); // Auto reload
                
                const toast = document.createElement('div');
                toast.style.cssText = "position:fixed; bottom:20px; left:50%; transform:translateX(-50%); background:#10b981; color:white; padding:10px 20px; border-radius:20px; z-index:9999; animation:fadeIn 0.5s; box-shadow: 0 5px 15px rgba(0,0,0,0.3); font-weight:bold;";
                toast.innerText = "🔄 Дані оновлено";
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);
            }
        } catch(e) {}
    };
    
    eventSource.onerror = () => {
        console.log("SSE Error, reconnecting...");
        eventSource.close();
        setTimeout(initSSE, 5000);
    };
}

document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    initSSE(); // Start listening
});

// --- LOAD DATA ---
window.loadPosts = async () => {
    try {
        try {
            const profile = await getMyProfile();
            isAdmin = profile && profile.is_admin;
        } catch (e) { isAdmin = false; }

        const posts = await getScheduledPosts();
        if(!Array.isArray(posts)) throw new Error("Invalid response");

        allPosts = posts.sort((a, b) => new Date(a.postAt) - new Date(b.postAt));
        
        renderTimeline();
        renderCalendar();
        
        if(selectedDate) selectDate(selectedDate);
        unselectAll();
    } catch (e) {
        console.error(e);
    }
};

window.switchView = (view) => {
    ['timeline', 'calendar'].forEach(v => {
        document.getElementById(`${v}View`)?.classList.remove('active');
        document.getElementById(`btn-${v}`)?.classList.remove('active');
    });
    document.getElementById(`${view}View`)?.classList.add('active');
    document.getElementById(`btn-${view}`)?.classList.add('active');
    
    if(view === 'timeline') document.getElementById('selectedDayPanel').classList.remove('active');
};

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
            
            let statusBadge = '';
            if (post.status === 'Draft') statusBadge = '<span class="badge" style="background:#64748b; color:white">Чернетка</span>'; 
            else if (post.status === 'PendingReview') statusBadge = '<span class="badge" style="background:#f59e0b; color:black">На перевірці</span>'; 
            else if (post.status === 'Scheduled') statusBadge = '<span class="badge" style="background:#10b981; color:white">Заплановано</span>'; 
            else if (post.status === 'Sent') statusBadge = '<span class="badge" style="background:#64748b; color:white">Відправлено</span>'; 

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

// --- 🔥 CALENDAR LOGIC WITH DRAG & DROP ---
window.changeMonth = (delta) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
};

function renderCalendar() {
    const grid = document.querySelector('.calendar-grid');
    if(!grid) return;

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

    for(let i=0; i<startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    for(let d=1; d<=daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        
        // --- DRAG & DROP: Drop Zone ---
        dayCell.setAttribute('data-date', dateObj.toISOString());
        dayCell.ondragover = (e) => {
            e.preventDefault();
            if(!dayCell.classList.contains('past')) {
                dayCell.style.background = 'rgba(124, 58, 237, 0.2)';
                dayCell.style.borderColor = 'var(--color-primary)';
            }
        };
        dayCell.ondragleave = (e) => {
            dayCell.style.background = '';
            dayCell.style.borderColor = '';
        };
        dayCell.ondrop = async (e) => {
            e.preventDefault();
            dayCell.style.background = ''; // Очистка стилю
            dayCell.style.transform = '';
            dayCell.style.borderColor = '';

            const postId = e.dataTransfer.getData('text/plain');
            if (!postId) return;

            // Логіка зміни дати (збереження часу)
            const post = allPosts.find(p => p.id === postId);
            if (!post) return;

            const oldDate = new Date(post.postAt);
            // dateObj - це дата цієї клітинки (з циклу renderCalendar)
            const newDate = new Date(dateObj); 
            newDate.setHours(oldDate.getHours(), oldDate.getMinutes());

            if (newDate < new Date()) {
                showToast('Не можна перенести в минуле!', 'error');
                return;
            }

            if (confirm(`Перенести пост на ${newDate.toLocaleDateString()}?`)) {
                try {
                    // Create FormData to replicate edit form submission (simplest way backend handles updates)
                    const fd = new FormData();
                    fd.append('post_text', post.text); 
                    fd.append('post_at', newDate.toISOString());
                    // Important: preserve other fields if required by backend, or ensure backend patch support
                    // For now we assume backend handles partial updates or we re-send critical text/date
                    
                    await updateScheduledPost(postId, fd);
                    showToast('Пост перенесено', 'success');
                    loadPosts(); // Повне оновлення
                } catch (err) {
                    showToast('Помилка перенесення', 'error');
                    console.error(err);
                }
            }
        };

        if(dateObj < today) dayCell.classList.add('past');
        if(dateObj.getTime() === today.getTime()) dayCell.classList.add('today');
        if (selectedDate && dateObj.toDateString() === selectedDate.toDateString()) {
            dayCell.classList.add('selected');
        }

        dayCell.innerHTML = `<div class="day-num">${d}</div>`;
        
        const postsForDay = allPosts.filter(p => {
            const pd = new Date(p.postAt);
            return pd.getDate() === d && pd.getMonth() === month && pd.getFullYear() === year;
        });

        const maxDots = 3;
        postsForDay.slice(0, maxDots).forEach(p => {
            const dot = document.createElement('div');
            dot.className = 'post-dot';
            
            // --- DRAG & DROP: Draggable Item ---
            if(dateObj >= today) {
                dot.draggable = true;
                dot.style.cursor = 'grab';
                dot.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('text/plain', p.id);
                    e.dataTransfer.effectAllowed = 'move';
                    dot.style.opacity = '0.5';
                });
                dot.addEventListener('dragend', () => {
                    dot.style.opacity = '1';
                });
            }

            const time = new Date(p.postAt).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
            const plainText = (p.text || "").replace(/<[^>]*>?/gm, ''); 
            dot.innerText = `${time} ${plainText.substring(0, 10)}...`;
            dayCell.appendChild(dot);
        });
        
        if(postsForDay.length > maxDots) {
            const more = document.createElement('div');
            more.style.fontSize = '0.7em'; more.style.color='#64748b'; more.style.textAlign='center';
            more.innerText = `+ ще ${postsForDay.length - maxDots}`;
            dayCell.appendChild(more);
        }

        if(dateObj >= today) {
            dayCell.onclick = (e) => {
                // Prevent click if dropped
                if(e.target.className.includes('post-dot')) return;
                selectDate(dateObj);
            };
        }
        
        grid.appendChild(dayCell);
    }
}

// --- 🔥 DRAG & DROP HANDLER ---
async function handleDrop(e, targetDate) {
    e.preventDefault();
    const postId = e.dataTransfer.getData('text/plain');
    
    // Скидання стилів
    const cell = e.target.closest('.cal-day');
    if(cell) {
        cell.style.background = '';
        cell.style.borderColor = '';
    }

    if (!postId) return;
    
    // Перевірка на минуле
    if (targetDate < new Date().setHours(0,0,0,0)) {
        if (typeof showToast === 'function') showToast('Неможливо перенести пост у минуле!', 'error'); else alert('Неможливо перенести пост у минуле!');
        return;
    }

    const post = allPosts.find(p => p.id === postId);
    if (!post) return;

    // Зберігаємо час, змінюємо тільки дату
    const oldDate = new Date(post.postAt);
    const newDate = new Date(targetDate);
    newDate.setHours(oldDate.getHours(), oldDate.getMinutes());

    if(!confirm(`Перенести пост на ${newDate.toLocaleDateString()} ${newDate.toLocaleTimeString()}?`)) return;

    try {
        const formData = new FormData();
        formData.append('post_text', post.text);
        formData.append('post_at', newDate.toISOString());
        // Додаємо канали, щоб не збилися
        if (post.targetChannelId) {
             // Backend очікує target_channel_id як масив або одиночне значення, 
             // але в API update логіка трохи інша. Спростимо:
             // Якщо бекенд не змінює канали при відсутності поля, то ок. 
             // Але краще передати явно, якщо підтримується.
        }

        // Використовуємо існуючий метод
        await updateScheduledPost(postId, formData);

        // Оновлюємо UI
        await loadPosts();
    } catch (err) {
        console.error(err);
        if (typeof showToast === 'function') showToast('Помилка при перенесенні', 'error'); else alert('Помилка при перенесенні');
    }
}

// ... (Rest of logic: selectDate, closeDayPanel, quickReschedule, bulk actions - remains same) ...
window.selectDate = (date) => {
    selectedDate = date;
    renderCalendar();
    
    const panel = document.getElementById('selectedDayPanel');
    const list = document.getElementById('selectedDayList');
    const titleText = document.querySelector('#selectedDayTitle span');
    
    panel.classList.add('active');
    
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
            
            let mediaIcon = '';
            if(post.photoIds?.length) mediaIcon = '<i data-feather="image" style="width:14px"></i>';
            if(post.videoIds?.length) mediaIcon = '<i data-feather="video" style="width:14px"></i>';

            let statusBadge = '';
            if (post.status === 'Draft') statusBadge = '<span class="badge" style="background:#64748b; color:white; margin-right:8px;">Чернетка</span>';
            else if (post.status === 'PendingReview') statusBadge = '<span class="badge" style="background:#f59e0b; color:black; margin-right:8px;">На перевірці</span>';
            else if (post.status === 'Scheduled') statusBadge = '<span class="badge" style="background:#10b981; color:white; margin-right:8px;">Заплановано</span>';

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
    if (new Date(newTimeStr) < new Date()) {
        if (typeof showToast === 'function') showToast('Не можна планувати пости в минулому!', 'error'); else alert('Не можна планувати пости в минулому!');
        loadPosts(); 
        return;
    }
    if (!confirm('Перенести пост на цей час?')) {
        loadPosts(); 
        return;
    }
    try {
        const post = allPosts.find(p => p.id === postId);
        if(!post) return;
        const formData = new FormData();
        formData.append('post_text', post.text);
        formData.append('post_at', new Date(newTimeStr).toISOString());
        // Використовуємо існуючий метод
        await updateScheduledPost(postId, formData);
        await loadPosts(); 
    } catch (e) {
        if (typeof showToast === 'function') showToast('Помилка при перенесенні', 'error'); else alert('Помилка при перенесенні');
        console.error(e);
    }
};

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

window.singleDelete = async (id) => { if(confirm('Видалити?')) { await deleteScheduledPost(id); loadPosts(); } };
window.singlePostNow = async (id) => { if(confirm('Опублікувати зараз?')) { await postScheduledNow(id); loadPosts(); } };
window.bulkDelete = async () => { if(confirm(`Видалити ${selectedPosts.size}?`)) { for(let id of selectedPosts) await deleteScheduledPost(id); loadPosts(); } };
window.bulkPostNow = async () => { if(confirm(`Опублікувати ${selectedPosts.size}?`)) { for(let id of selectedPosts) await postScheduledNow(id); loadPosts(); } };
window.approvePost = async (postId) => {
    if(!confirm('Схвалити цей пост?')) return;
    try {
        await approveScheduledPost(postId);
        await loadPosts();
        if (typeof showToast === 'function') showToast('Пост схвалено', 'success'); else alert('Пост схвалено');
     } catch (e) {
         console.error(e);
         if (typeof showToast === 'function') showToast('Не вдалося схвалити пост', 'error'); else alert('Не вдалося схвалити пост');
     }
};