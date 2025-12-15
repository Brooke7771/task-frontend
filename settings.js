// TG/frontend/settings.js

import { 
    getSettings, 
    updateSettings, 
    getWhitelist, 
    addWhitelistUser, 
    deleteWhitelistUser,
    // 🔥 Імпортуємо нові функції
    getChannels,
    addChannel,
    deleteChannel
} from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const promptInput = document.getElementById('system_prompt');
    const settingsForm = document.getElementById('settingsForm');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMessage = document.getElementById('statusMessage');
    
    // Whitelist elements
    const whitelistContainer = document.getElementById('whitelistItems');
    const addUserForm = document.getElementById('addUserForm');

    // 🔥 Channels elements
    const channelsContainer = document.getElementById('channelsList');
    const addChannelForm = document.getElementById('addChannelForm');

    const defaultPrompt = "Ти – професійний редактор новин для Telegram-каналу...";

    // 1. Завантаження налаштувань AI
    const loadSettings = async () => {
        try {
            const data = await getSettings();
            if (data && data.system_prompt) {
                promptInput.value = data.system_prompt;
            }
        } catch (error) {
            console.error(error);
            if(statusMessage) {
                statusMessage.textContent = "Не вдалося завантажити налаштування.";
                statusMessage.className = "error";
            }
        }
    };

    // 2. Рендеринг списку користувачів (Whitelist)
    const renderWhitelist = async () => {
        try {
            whitelistContainer.innerHTML = '<p>Завантаження...</p>';
            const users = await getWhitelist();
            
            if (!users || users.length === 0) {
                whitelistContainer.innerHTML = '<p>Список порожній.</p>';
                return;
            }
            
            whitelistContainer.innerHTML = '<ul style="list-style: none; padding: 0;">' + users.map(u => `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--color-border);">
                    <div>
                        <strong>${u.note || 'Без імені'}</strong> 
                        <code style="margin-left: 10px; background: rgba(0,0,0,0.1); padding: 2px 5px; border-radius: 4px;">${u.telegram_id}</code>
                    </div>
                    <button class="btn btn-danger btn-sm delete-user-btn" data-id="${u.telegram_id}" style="width: auto; padding: 5px 10px;">
                        Видалити
                    </button>
                </li>
            `).join('') + '</ul>';

            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('Видалити користувача?')) {
                        try { await deleteWhitelistUser(e.target.dataset.id); renderWhitelist(); } catch (err) { alert('Помилка'); }
                    }
                });
            });

        } catch (e) {
            console.error(e);
            whitelistContainer.innerHTML = '<p class="error">Помилка завантаження.</p>';
        }
    };

    // 3. 🔥 Рендеринг списку Каналів (НОВЕ)
    const renderChannels = async () => {
        if (!channelsContainer) return;
        try {
            channelsContainer.innerHTML = '<p>Завантаження каналів...</p>';
            const channels = await getChannels();

            if (!channels || channels.length === 0) {
                channelsContainer.innerHTML = '<p style="color: var(--color-text-light);">Канали не додані. Бот використовуватиме канал з конфігурації за замовчуванням.</p>';
                return;
            }

            channelsContainer.innerHTML = '<ul style="list-style: none; padding: 0;">' + channels.map(c => `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--color-border);">
                    <div>
                        <strong>${c.title}</strong> 
                        <br><small style="color: var(--color-text-light);">ID: ${c.telegram_id}</small>
                    </div>
                    <button class="btn btn-danger btn-sm delete-channel-btn" data-id="${c.id}" style="width: auto; padding: 5px 10px;">
                        Видалити
                    </button>
                </li>
            `).join('') + '</ul>';

            document.querySelectorAll('.delete-channel-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('Видалити канал зі списку?')) {
                        try { await deleteChannel(e.target.dataset.id); renderChannels(); } catch (err) { alert('Помилка видалення'); }
                    }
                });
            });

        } catch (e) {
            console.error(e);
            channelsContainer.innerHTML = '<p class="error">Помилка завантаження каналів.</p>';
        }
    };

    // 4. Обробка форми додавання каналу (НОВЕ)
    if (addChannelForm) {
        addChannelForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idInput = document.getElementById('channel_id');
            const titleInput = document.getElementById('channel_title');

            if (!idInput.value || !titleInput.value) return alert("Заповніть всі поля");

            const btn = addChannelForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = '...';

            try {
                await addChannel(idInput.value, titleInput.value);
                idInput.value = '';
                titleInput.value = '';
                renderChannels(); // Оновлюємо список
            } catch (e) {
                alert('Помилка додавання каналу. Перевірте консоль.');
                console.error(e);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // 5. Обробка форми додавання користувача
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idInput = document.getElementById('new_tg_id');
            const noteInput = document.getElementById('new_note');
            
            if (!idInput.value) return alert("Введіть ID");

            const btn = addUserForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = '...';

            try {
                await addWhitelistUser(idInput.value, noteInput.value);
                idInput.value = '';
                noteInput.value = '';
                renderWhitelist();
            } catch (e) {
                alert('Помилка додавання.');
                console.error(e);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // 6. Збереження налаштувань AI
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            saveBtn.disabled = true;
            statusMessage.textContent = "Збереження...";
            statusMessage.className = "";

            try {
                await updateSettings({ system_prompt: promptInput.value });
                statusMessage.textContent = "Налаштування успішно збережено!";
                statusMessage.className = "success";
            } catch (error) {
                console.error(error);
                statusMessage.textContent = "Помилка збереження.";
                statusMessage.className = "error";
            } finally {
                saveBtn.disabled = false;
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            if (confirm("Скинути промпт до базового?")) {
                promptInput.value = defaultPrompt;
            }
        });
    }

    // 🔥 Запускаємо все при старті сторінки
    loadSettings();
    renderWhitelist();
    renderChannels();
});