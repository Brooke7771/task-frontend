// TG/frontend/settings.js

import { 
    getSettings, 
    updateSettings, 
    getWhitelist, 
    addWhitelistUser, 
    deleteWhitelistUser,
    getChannels,
    addChannel,
    deleteChannel,
    getAllPermissions, 
    grantPermission, 
    revokePermission, 
    getMyProfile,
    changePassword
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

    // --- 1. ІНІЦІАЛІЗАЦІЯ ІНТЕРФЕЙСУ (Тема + Свято) ---
    const initUI = () => {
        const themeBtn = document.getElementById('settings-theme-toggle');
        const xmasBtn = document.getElementById('settings-xmas-toggle');
        const physicsBtn = document.getElementById('settings-physics-toggle');
        const htmlEl = document.documentElement;

        const updateButtonsState = () => {
            const isDark = htmlEl.classList.contains('dark');
            const isXmas = htmlEl.classList.contains('theme-xmas');
            const isPhysics = localStorage.getItem('theme-physics') === 'true';

            if (themeBtn) {
                const iconMoon = themeBtn.querySelector('.icon-moon');
                const iconSun = themeBtn.querySelector('.icon-sun');
                const textSpan = themeBtn.querySelector('span'); // Fix selectors if needed
                if (isDark) {
                    if(iconMoon) iconMoon.style.display = 'block';
                    if(iconSun) iconSun.style.display = 'none';
                    if(textSpan) textSpan.textContent = 'Темна тема';
                } else {
                    if(iconMoon) iconMoon.style.display = 'none';
                    if(iconSun) iconSun.style.display = 'block';
                    if(textSpan) textSpan.textContent = 'Світла тема';
                }
            }

            // Кнопка Свята
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

        // Завантаження стану
        const savedXmas = localStorage.getItem('theme-xmas') === 'true';
        const isXmas = localStorage.getItem('theme-xmas') === 'true';
        const isPhysics = localStorage.getItem('theme-physics') === 'true';
        if (savedXmas) {
            htmlEl.classList.add('theme-xmas');
            htmlEl.classList.add('dark');
        }
        updateButtonsState();

        // 3. Кнопка Фізики
        if (physicsBtn) {
            // Кнопка активна тільки якщо ввімкнено свято
            physicsBtn.disabled = !isXmas;
            physicsBtn.style.opacity = isXmas ? '1' : '0.5';

            if (isPhysics) {
                physicsBtn.style.background = 'rgba(251, 191, 36, 0.2)';
                physicsBtn.querySelector('span').textContent = 'Фізика ввімкнена (CPU)';
            } else {
                physicsBtn.style.background = 'transparent';
                physicsBtn.querySelector('span').textContent = 'Ввімкнути фізику';
            }
        }

        // --- Відновлення існуючих обробників ---
        if (themeBtn) themeBtn.onclick = (e) => {
            e.preventDefault(); htmlEl.classList.toggle('dark');
            localStorage.setItem('theme', htmlEl.classList.contains('dark') ? 'dark' : 'light');
            updateButtonsState();
        };
        if (xmasBtn) xmasBtn.onclick = (e) => {
            e.preventDefault(); htmlEl.classList.toggle('theme-xmas');
            htmlEl.classList.contains('theme-xmas') ? htmlEl.classList.add('dark') : null;
            localStorage.setItem('theme-xmas', htmlEl.classList.contains('theme-xmas'));
            if(window.refreshGarland) window.refreshGarland();
            updateButtonsState();
        };
        if(physicsBtn) physicsBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.setItem('theme-physics', !(localStorage.getItem('theme-physics')==='true'));
            if(window.refreshGarland) window.refreshGarland();
            updateButtonsState();
        }
        updateButtonsState();
    };
    initUI();

    // --- 2. ЗАВАНТАЖЕННЯ ПРОФІЛЮ ---
    const loadProfile = async () => {
        try {
            const user = await getMyProfile();
            document.getElementById('profile-username').value = user.username;
            document.getElementById('profile-role').value = user.is_admin ? 'Адміністратор 👑' : 'Редактор 📝';
            document.getElementById('profile-tg').value = user.telegram_username || '-';
            
            // Якщо користувач не адмін, ховаємо налаштування AI
            if (!user.is_admin) {
                const aiCard = document.getElementById('aiSettingsCard');
                if(aiCard) aiCard.style.display = 'none';
            }
        } catch (e) {
            console.error("Failed to load profile", e);
        }
    };

    // --- 3. ЗМІНА ПАРОЛЮ ---
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const p1 = document.getElementById('new_pass').value;
            const p2 = document.getElementById('confirm_pass').value;

            if (p1 !== p2) {
                alert("Паролі не співпадають!");
                return;
            }
            if (p1.length < 6) {
                alert("Пароль надто короткий!");
                return;
            }

            try {
                await changePassword(p1);
                alert("Пароль успішно змінено!");
                document.getElementById('new_pass').value = '';
                document.getElementById('confirm_pass').value = '';
            } catch (e) {
                alert("Помилка зміни паролю");
                console.error(e);
            }
        });
    }

    // --- 4. НАЛАШТУВАННЯ AI (Залишаємо) ---
    const loadAiSettings = async () => {
        try {
            const data = await getSettings();
            if (data && data.system_prompt) {
                document.getElementById('system_prompt').value = data.system_prompt;
            }
        } catch (error) { console.error(error); }
    };

    const aiForm = document.getElementById('aiForm');
    if (aiForm) {
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveAiBtn');
            btn.disabled = true;
            statusMessage.textContent = "Збереження...";
            
            try {
                await updateSettings({ system_prompt: document.getElementById('system_prompt').value });
                statusMessage.textContent = "Промпт оновлено!";
                statusMessage.className = "success";
            } catch (error) {
                statusMessage.textContent = "Помилка.";
                statusMessage.className = "error";
            } finally {
                btn.disabled = false;
            }
        });
    }

    // 🔥 Запускаємо все при старті сторінки
    loadProfile();
    loadAiSettings();
});