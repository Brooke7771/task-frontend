import { getSettings, updateSettings } from './api.js';

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
});