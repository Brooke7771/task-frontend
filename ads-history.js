import { backendUrl } from './api.js';

let allHistory = [];
let adHistory = [];
let currentCalendarDate = new Date();

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
});

// --- LOAD DATA ---
async function loadHistory() {
    try {
        // Використовуємо існуючий API історії
        const res = await fetch(`${backendUrl}/api/history`);
        allHistory = await res.json();
        
        // 🔥 Фільтруємо ТІЛЬКИ РЕКЛАМУ
        adHistory = allHistory.filter(item => item.post_type === 'ad' || item.post_type === 'ads');
        
        // Сортуємо від нових до старих
        adHistory.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));

        renderList();
        renderCalendar();
    } catch (e) {
        console.error("Error loading history:", e);
        document.getElementById('listView').innerHTML = `<div style="text-align: center; color: #ef4444;">Помилка завантаження</div>`;
    }
}

// --- VIEW SWITCHER ---
window.switchView = (view) => {
    if(view === 'list') {
        document.getElementById('listView').style.display = 'flex';
        document.getElementById('calendarView').classList.remove('active');
        document.getElementById('btn-list').classList.add('active');
        document.getElementById('btn-calendar').classList.remove('active');
    } else {
        document.getElementById('listView').style.display = 'none';
        document.getElementById('calendarView').classList.add('active');
        document.getElementById('btn-list').classList.remove('active');
        document.getElementById('btn-calendar').classList.add('active');
        renderCalendar(); // Re-render to ensure size is correct
    }
};

// --- RENDER LIST ---
function renderList() {
    const container = document.getElementById('listView');
    if (adHistory.length === 0) {
        container.innerHTML = '<div style="text-align: center; padding: 50px; color: #64748b;">Історія реклами порожня</div>';
        return;
    }

    container.innerHTML = adHistory.map(item => {
        const date = new Date(item.sent_at);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const time = date.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'});
        
        return `
        <div class="history-card">
            <div class="history-date">
                <div class="date-day">${day}.${month}</div>
                <div class="date-time">${time}</div>
            </div>
            <div class="history-content">
                <div class="history-text">${item.content_preview}</div>
                <div class="history-meta">
                    <span><i data-feather="radio" style="width:12px"></i> ${item.channel_title || item.channel_id}</span>
                    <span><i data-feather="check-circle" style="width:12px; color:#4ade80"></i> Успішно</span>
                </div>
            </div>
            <a href="https://t.me/c/${String(item.channel_id).replace('-100','')}/${item.message_id}" target="_blank" class="btn" style="width:40px; height:40px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:50%;">
                <i data-feather="external-link" style="width:16px"></i>
            </a>
        </div>
        `;
    }).join('');
    
    if(window.feather) feather.replace();
}

// --- RENDER CALENDAR ---
window.changeMonth = (delta) => {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
};

function renderCalendar() {
    const grid = document.querySelector('.calendar-grid');
    if(!grid) return;

    // Зберігаємо заголовки (дні тижня)
    const headers = Array.from(grid.querySelectorAll('.cal-day-name'));
    grid.innerHTML = '';
    headers.forEach(h => grid.appendChild(h));
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    const monthNames = ["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"];
    document.getElementById('calMonthLabel').innerText = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Start on Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Пусті клітинки на початку
    for(let i=0; i<startOffset; i++) {
        const empty = document.createElement('div');
        empty.className = 'cal-day empty';
        grid.appendChild(empty);
    }

    // Дні
    for(let d=1; d<=daysInMonth; d++) {
        const dayCell = document.createElement('div');
        dayCell.className = 'cal-day';
        
        // Знаходимо рекламу за цей день
        const adsForDay = adHistory.filter(ad => {
            const adDate = new Date(ad.sent_at);
            return adDate.getDate() === d && adDate.getMonth() === month && adDate.getFullYear() === year;
        });

        if (adsForDay.length > 0) dayCell.classList.add('has-ads');

        let dotsHtml = adsForDay.map(ad => {
            const time = new Date(ad.sent_at).toLocaleTimeString('uk-UA', {hour:'2-digit', minute:'2-digit'});
            return `<div class="ad-dot">${time} ${ad.content_preview.substring(0, 8)}...</div>`;
        }).join('');

        dayCell.innerHTML = `<div class="day-num">${d}</div>${dotsHtml}`;
        grid.appendChild(dayCell);
    }
}