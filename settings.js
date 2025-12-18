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
    deleteChannel,
    getAllPermissions, 
    grantPermission, 
    revokePermission
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

    const grantAccessForm = document.getElementById('grantAccessForm');
    const permUserSelect = document.getElementById('perm_user_select');
    const permChannelSelect = document.getElementById('perm_channel_select');
    const permissionsList = document.getElementById('permissionsList');

    // --- 🔥 ЛОГІКА ІНТЕРФЕЙСУ (ТЕМА + НОВИЙ РІК) ---
    const themeText = document.getElementById('theme-text');
    const themeBtn = document.getElementById('settings-theme-toggle');
    const xmasBtn = document.getElementById('settings-xmas-toggle');
    const htmlEl = document.documentElement;

    // Функція оновлення вигляду кнопок
    const updateButtonsState = () => {
        const isDark = htmlEl.classList.contains('dark');
        const isXmas = htmlEl.classList.contains('theme-xmas');

        // 1. Кнопка Теми
        if (themeBtn) {
            const iconMoon = themeBtn.querySelector('.icon-moon');
            const iconSun = themeBtn.querySelector('.icon-sun');
            const textSpan = themeBtn.querySelector('span');

            if (isDark) {
                iconMoon.style.display = 'block';
                iconSun.style.display = 'none';
                textSpan.textContent = 'Темна тема';
                themeBtn.style.background = 'var(--color-bg-card)';
                themeBtn.style.color = 'var(--color-text-dark)';
            } else {
                iconMoon.style.display = 'none';
                iconSun.style.display = 'block';
                textSpan.textContent = 'Світла тема';
                themeBtn.style.background = '#fff';
                themeBtn.style.color = '#333';
            }
        }

        // 2. Кнопка Свята
        if (xmasBtn) {
            if (isXmas) {
                xmasBtn.classList.add('btn-success');
                xmasBtn.style.background = 'var(--color-success)';
                xmasBtn.style.color = '#fff';
                xmasBtn.style.borderColor = 'transparent';
                xmasBtn.innerHTML = '<i data-feather="gift"></i> <span>Свято ввімкнено! 🎅</span>';
            } else {
                xmasBtn.classList.remove('btn-success');
                xmasBtn.style.background = 'transparent';
                xmasBtn.style.color = 'var(--color-danger)';
                xmasBtn.style.borderColor = 'var(--color-danger)';
                xmasBtn.innerHTML = '<i data-feather="gift"></i> <span>Ввімкнути свято 🎄</span>';
            }
            if (window.feather) feather.replace();
        }
    };

    // Ініціалізація стану при завантаженні сторінки
    if (localStorage.getItem('theme-xmas') === 'true') {
        htmlEl.classList.add('theme-xmas');
        htmlEl.classList.add('dark'); // Свято завжди темне
    } else if (localStorage.getItem('theme') === 'dark') {
        htmlEl.classList.add('dark');
    }
    updateButtonsState();

    // ОБРОБНИК: Темна/Світла тема
    if (themeBtn) {
        themeBtn.onclick = (e) => {
            e.preventDefault();
            htmlEl.classList.toggle('dark');
            const isDark = htmlEl.classList.contains('dark');
            
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            
            // Якщо вимикаємо темну тему -> вимикаємо і свято
            if (!isDark && htmlEl.classList.contains('theme-xmas')) {
                htmlEl.classList.remove('theme-xmas');
                localStorage.setItem('theme-xmas', 'false');
                // Оновлюємо гірлянду (якщо функція доступна)
                if (window.refreshGarland) window.refreshGarland();
            }
            
            updateButtonsState();
        };
    }

    // ОБРОБНИК: Свято
    if (xmasBtn) {
        xmasBtn.onclick = (e) => {
            e.preventDefault();
            const isActive = htmlEl.classList.contains('theme-xmas');
            
            if (!isActive) {
                // Вмикаємо
                htmlEl.classList.add('theme-xmas');
                htmlEl.classList.add('dark'); // Примусово темна
                localStorage.setItem('theme-xmas', 'true');
                localStorage.setItem('theme', 'dark');
            } else {
                // Вимикаємо
                htmlEl.classList.remove('theme-xmas');
                localStorage.setItem('theme-xmas', 'false');
                // Залишаємо темну тему, щоб не сліпити очі різко
            }
            
            // Викликаємо глобальну функцію з auth-guard.js для перемальовки гірлянди
            if (window.refreshGarland) window.refreshGarland();
            
            updateButtonsState();
        };
    }
});

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

    // Функція для заповнення Select-ів (оновлюється при зміні користувачів або каналів)
    const updateSelects = async () => {
        if (!permUserSelect || !permChannelSelect) return;
        
        try {
            const [users, channels] = await Promise.all([getWhitelist(), getChannels()]);
            
            // Оновлюємо селект юзерів
            permUserSelect.innerHTML = '<option value="">Оберіть користувача...</option>';
            users.forEach(u => {
                const opt = document.createElement('option');
                opt.value = u.telegram_id;
                opt.textContent = `${u.note || 'Без імені'} (${u.telegram_id})`;
                permUserSelect.appendChild(opt);
            });

            // Оновлюємо селект каналів
            permChannelSelect.innerHTML = '<option value="">Оберіть канал...</option>';
            channels.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id; // DB ID
                opt.textContent = c.title;
                permChannelSelect.appendChild(opt);
            });
        } catch (e) {
            console.error("Помилка оновлення списків:", e);
        }
    };

    // 🔥 Рендеринг списку прав
    const renderPermissions = async () => {
        if (!permissionsList) return;
        permissionsList.innerHTML = '<p>Завантаження...</p>';
        try {
            const perms = await getAllPermissions();
            
            if (!perms || perms.length === 0) {
                permissionsList.innerHTML = '<p style="color: var(--color-text-light);">Доступи ще не налаштовані.</p>';
                return;
            }

            permissionsList.innerHTML = '<ul style="list-style: none; padding: 0;">' + perms.map(p => `
                <li style="display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid var(--color-border);">
                    <div>
                        <strong>👤 ${p.user_note || p.telegram_user_id}</strong>
                        <span style="margin: 0 10px;">➡️</span>
                        <strong>📢 ${p.channel_title}</strong>
                    </div>
                    <button class="btn btn-danger btn-sm revoke-btn" data-uid="${p.telegram_user_id}" data-cid="${p.channel_db_id}" style="width: auto; padding: 5px 10px;">
                        Забрати
                    </button>
                </li>
            `).join('') + '</ul>';

            document.querySelectorAll('.revoke-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('Забрати доступ?')) {
                        try { 
                            await revokePermission(e.target.dataset.uid, e.target.dataset.cid); 
                            renderPermissions(); 
                        } catch (err) { alert('Помилка'); }
                    }
                });
            });

        } catch (e) {
            console.error(e);
            permissionsList.innerHTML = '<p class="error">Помилка завантаження прав.</p>';
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
        updateSelects();
    };

    // 4. Обробка форми додавання каналу (НОВЕ)
    if (addChannelForm) {
        // Видаляємо попередні слухачі (якщо є клонуванням) або просто вішаємо новий
        addChannelForm.onsubmit = async (e) => {
            e.preventDefault(); // 👈 Це найважливіше!
            console.log("Додавання каналу...");
            
            const idInput = document.getElementById('channel_id');
            const titleInput = document.getElementById('channel_title');

            if (!idInput.value || !titleInput.value) return alert("Заповніть всі поля");

            const btn = addChannelForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = '...';

            try {
                await addChannel(idInput.value.trim(), titleInput.value.trim());
                idInput.value = '';
                titleInput.value = '';
                
                // Оновлюємо обидва списки
                await renderChannels(); 
                await renderPermissions(); // На всяк випадок, хоча нові канали ще не мають прав
                
            } catch (err) {
                alert('Помилка додавання каналу. Перевірте консоль.');
                console.error(err);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        };
    }

    if (grantAccessForm) {
        grantAccessForm.onsubmit = async (e) => {
            e.preventDefault();
            const userVal = permUserSelect.value;
            const channelVal = permChannelSelect.value;

            if (!userVal || !channelVal) return alert("Оберіть і користувача, і канал.");

            const btn = grantAccessForm.querySelector('button');
            btn.disabled = true;

            try {
                await grantPermission(userVal, channelVal);
                renderPermissions();
            } catch (err) {
                alert('Помилка надання доступу');
                console.error(err);
            } finally {
                btn.disabled = false;
            }
        };
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
    renderPermissions();
    updateSelects();
});