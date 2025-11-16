// frontend/schedule-edit.js
import { getScheduledPostById, updateScheduledPost } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editForm');
    const postTextInput = document.getElementById('post_text');
    const postAtInput = document.getElementById('post_at');
    const saveBtn = document.getElementById('saveBtn');
    const statusMessage = document.getElementById('statusMessage');
    const currentMediaContainer = document.getElementById('currentMedia');
    const currentMediaPreview = document.getElementById('currentMediaPreview');
    
    // --- 🔥 ДОДАНО ---
    const previewContent = document.getElementById('preview-content');

    let postId = null;

    // --- 🔥 НОВА ФУНКЦІЯ: форматування для попереднього перегляду ---
    // (Вона обробляє і старий, і новий Markdown, щоб ви бачили коректний результат)
    function formatForPreview(text) {
        if (!text) text = '';
        let safeText = (text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Спочатку обробляємо екрановані символи
        safeText = safeText.replace(/\\(.)/g, '$1');

        // Обробляємо і V1, і V2 форматування для коректного прев'ю
        safeText = safeText
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **bold** (Legacy)
            .replace(/__(.*?)__/g, '<i>$1</i>')   // __italic__ (Legacy)
            .replace(/\*(.*?)\*/g, '<b>$1</b>')   // *bold* (V2)
            .replace(/_(.*?)_/g, '<i>$1</i>')     // _italic_ (V2)
            .replace(/~(.*?)~/g, '<s>$1</s>')     // ~strikethrough~ (V2)
            .replace(/`(.*?)`/g, '<code>$1</code>') // `code`
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // [link](url)
            .replace(/\n/g, '<br>'); // Newlines
        
        return safeText;
    }

    // --- 🔥 НОВА ФУНКЦІЯ: оновлення прев'ю ---
    const updatePreview = () => {
        const text = postTextInput.value || '';
        previewContent.innerHTML = formatForPreview(text);
    };
    // --- (кінець нових функцій) ---


    // Функція для форматування дати для <input type="datetime-local">
    const formatDateTimeLocal = (isoString) => {
        // ... (без змін)
        if (!isoString) return '';
        const date = new Date(isoString);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    };

    // Завантажуємо дані поста при відкритті сторінки
    const loadPost = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            postId = params.get('id');
            if (!postId) {
                statusMessage.textContent = 'Помилка: ID поста не знайдено.';
                statusMessage.className = 'error';
                return;
            }

            const post = await getScheduledPostById(postId);

            postTextInput.value = post.text;
            postAtInput.value = formatDateTimeLocal(post.postAt);
            
            updatePreview(); // <-- 🔥 ОНОВЛЮЄМО ПРЕВ'Ю ПІСЛЯ ЗАВАНТАЖЕННЯ

            // --- (Логіка відображення медіа без змін) ---
            if (post.photoIds && post.photoIds.length > 0) {
                currentMediaPreview.textContent = `[Поточне медіа: ФОТО (${post.photoIds.length} шт)]`;
                currentMediaContainer.style.display = 'block';
            } else if (post.videoIds && post.videoIds.length > 0) {
                currentMediaPreview.textContent = `[Поточне медіа: ВІДЕО (${post.videoIds.length} шт)]`;
                currentMediaContainer.style.display = 'block';
            } else {
                currentMediaContainer.style.display = 'none';
            }

        } catch (error) {
            statusMessage.textContent = 'Не вдалося завантажити пост для редагування.';
            statusMessage.className = 'error';
            console.error(error);
        }
    };

    // Обробник збереження форми
    form.addEventListener('submit', async (event) => {
        // ... (логіка submit без змін) ...
        event.preventDefault();
        statusMessage.textContent = 'Збереження змін...';
        statusMessage.className = '';
        saveBtn.disabled = true;

        const formData = new FormData(form);
        
        const localDate = new Date(formData.get('post_at'));
        formData.set('post_at', localDate.toISOString());

        try {
            await updateScheduledPost(postId, formData);
            statusMessage.textContent = 'Пост успішно оновлено!';
            statusMessage.className = 'success';
            
            setTimeout(() => {
                window.location.href = 'schedule-list.html';
            }, 2000);

        } catch (error) {
            statusMessage.textContent = 'Помилка! Не вдалося оновити пост.';
            statusMessage.className = 'error';
            console.error(error);
            saveBtn.disabled = false;
        }
    });

    // --- 🔥 ДОДАНО: Слухач для оновлення прев'ю під час друку ---
    postTextInput.addEventListener('input', updatePreview);

    loadPost();
});