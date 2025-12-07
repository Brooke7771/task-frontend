import { getSettings, updateSettings } from './api.js';

async function getWhitelist() {
    const res = await fetch(`${backendUrl}/api/whitelist`);
    return res.json();
}
async function addWhitelistUser(id, note) {
    await fetch(`${backendUrl}/api/whitelist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ telegram_id: parseInt(id), note: note })
    });
}
async function deleteWhitelistUser(id) {
    await fetch(`${backendUrl}/api/whitelist/${id}/delete`, { method: 'POST' });
}

document.addEventListener('DOMContentLoaded', () => {
    const promptInput = document.getElementById('system_prompt');
    const form = document.getElementById('settingsForm');
    const saveBtn = document.getElementById('saveBtn');
    const resetBtn = document.getElementById('resetBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Базовий промпт (копія з Rust коду для кнопки Reset)
    const defaultPrompt = "Ти – професійний редактор новин для Telegram-каналу. \
    Твоє завдання: \
    1. Переписати новину українською мовою, зробивши її чіткою, цікавою та лаконічною. \
    2. 🔥 ВАЖЛИВО: Текст має бути до 900 символів (включно з пробілами), щоб поміститися в підпис до фото. \
    3. Використовуй HTML-теги для форматування: <b>жирний</b>, <i>курсив</i>, <s>закреслений</s>, <code>код</code>. Не використовуй Markdown (*, _). \
    4. Не використовуй вкладені теги. \
    5. Структуруй текст: Заголовок (жирним), основна суть, деталі.";

    // Завантаження поточних налаштувань
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

    // --- ЛОГІКА БІЛОГО СПИСКУ ---
    const whitelistContainer = document.getElementById('whitelistItems');
    const addUserForm = document.getElementById('addUserForm');
    
    const renderWhitelist = async () => {
        try {
            const users = await getWhitelist();
            if (users.length === 0) {
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

            // Прив'язка кнопок видалення
            document.querySelectorAll('.delete-user-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('Видалити користувача?')) {
                        await deleteWhitelistUser(e.target.dataset.id);
                        renderWhitelist();
                    }
                });
            });

        } catch (e) {
            console.error(e);
            whitelistContainer.innerHTML = '<p class="error">Помилка завантаження.</p>';
        }
    };

    if (addUserForm) {
        addUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('new_tg_id').value;
            const note = document.getElementById('new_note').value;
            
            try {
                await addWhitelistUser(id, note);
                document.getElementById('new_tg_id').value = '';
                document.getElementById('new_note').value = '';
                renderWhitelist();
            } catch (e) {
                alert('Помилка додавання');
            }
        });
    }

    // Збереження
    form.addEventListener('submit', async (e) => {
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

    // Скидання до дефолту
    resetBtn.addEventListener('click', () => {
        if (confirm("Ви впевнені, що хочете скинути промпт до базового значення?")) {
            promptInput.value = defaultPrompt;
        }
    });

    loadSettings();
    renderWhitelist();
});