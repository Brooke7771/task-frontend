import { getChannels, backendUrl } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    const channelSelect = document.getElementById('channel_select');
    const form = document.getElementById('adForm');
    const adsList = document.getElementById('adsList');

    // 🔥 ОНОВЛЕНО: Тільки дозволені канали
    try {
        const channels = await getChannels();
        
        // Прибираємо хардкод "Основний канал"
        channelSelect.innerHTML = '<option value="" disabled selected>Оберіть канал...</option>';
        
        if (channels && channels.length > 0) {
            channels.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.telegram_id;
                opt.textContent = c.title;
                channelSelect.appendChild(opt);
            });
        } else {
            channelSelect.innerHTML = '<option value="" disabled>Немає доступних каналів</option>';
        }
    } catch (e) {
        console.error("Error loading channels", e);
    }
    
    // Завантаження списку реклам
    const loadAds = async () => {
        const res = await fetch(`${backendUrl}/api/ads`);
        const ads = await res.json();
        adsList.innerHTML = ads.map(ad => `
            <div class="task-card">
                <h3>Кампанія #${ad.id.substring(0,8)}</h3>
                <p>${ad.text.substring(0, 50)}...</p>
                <div class="task-info">
                    <span>Інтервал: ${ad.interval_minutes} хв</span>
                    <span>Залишилось: ${ad.remaining_count}</span>
                    <span>Статус: ${ad.active ? '🟢 Активна' : '🔴 Завершена'}</span>
                </div>
                <button onclick="deleteAd('${ad.id}')" class="btn btn-danger btn-sm" style="margin-top:10px">Видалити</button>
            </div>
        `).join('');
    };
    
    window.deleteAd = async (id) => {
        if(!confirm('Видалити?')) return;
        await fetch(`${backendUrl}/api/ads/${id}/delete`, { method: 'POST' });
        loadAds();
    };

    loadAds();

    // Створення реклами
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        // Тут ми відправляємо на новий endpoint. 
        // Переконайтеся, що на бекенді в parse_post_form додано обробку полів 'interval' та 'count'
        await fetch(`${backendUrl}/api/ads`, {
            method: 'POST',
            body: formData
        });
        
        alert('Кампанію створено!');
        form.reset();
        loadAds();
    });
});