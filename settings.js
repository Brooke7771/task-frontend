// TG/frontend/settings.js

import { 
    getSettings, 
    updateSettings, 
    getWhitelist, 
    addWhitelistUser, 
    deleteWhitelistUser 
} from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const promptInput = document.getElementById('system_prompt');
    const settingsForm = document.getElementById('settingsForm');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMessage = document.getElementById('statusMessage');
    const whitelistContainer = document.getElementById('whitelistItems');
    const addUserForm = document.getElementById('addUserForm');

    const defaultPrompt = "Ти – професійний редактор новин для Telegram-каналу...";

    // 1. Завантаження налаштувань
    const loadSettings = async () => {
        try {
            const data = await getSettings();
            if (data && data.system_prompt) {
                promptInput.value = data.system_prompt;
            }
        } catch (error) {
            console.error(error);
            statusMessage.textContent = "Не вдалося завантажити налаштування.";
            statusMessage.className = "error";
        }
    };

    // 2. Завантаження списку користувачів
    const renderWhitelist = async () => {
        try {
            whitelistContainer.innerHTML = '<p>Завантаження...</p>';
            const users = await getWhitelist();
            
            if (!users || users.length === 0) {
                whitelistContainer.innerHTML = '<p>Список порожній. Доступ має лише головний Адмін.</p>';
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

            // Кнопки видалення
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('Видалити користувача?')) {
                        try {
                            await deleteWhitelistUser(e.target.dataset.id);
                            renderWhitelist(); 
                        } catch (err) {
                            alert('Помилка видалення');
                        }
                    }
                });
            });

        } catch (e) {
            console.error(e);
            whitelistContainer.innerHTML = '<p class="error">Помилка завантаження списку.</p>';
        }
    };

    // 3. Додавання користувача
    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const idInput = document.getElementById('new_tg_id');
            const noteInput = document.getElementById('new_note');
            
            // Валідація
            if (!idInput.value) {
                alert("Введіть ID");
                return;
            }

            const btn = addUserForm.querySelector('button');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.textContent = '...';

            try {
                // Використовуємо функцію з api.js
                await addWhitelistUser(idInput.value, noteInput.value);
                idInput.value = '';
                noteInput.value = '';
                renderWhitelist();
            } catch (e) {
                alert('Помилка додавання. Перевірте консоль.');
                console.error(e);
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // 4. Збереження налаштувань AI
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

    // Старт
    loadSettings();
    renderWhitelist();
});