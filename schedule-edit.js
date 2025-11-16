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

    let postId = null;

    // Функція для форматування дати для <input type="datetime-local">
    const formatDateTimeLocal = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        // Віднімаємо часовий зсув, щоб отримати "локальний" час
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        // Повертаємо у форматі YYYY-MM-DDTHH:MM
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

            // --- 🔥 ОНОВЛЕНА ЛОГІКА ВІДОБРАЖЕННЯ МЕДІА ---
            // (Використовуємо 'photoIds' та 'videoIds' з моделі 'ScheduledPost')
            if (post.photoIds && post.photoIds.length > 0) {
                currentMediaPreview.textContent = `[Поточне медіа: ФОТО (${post.photoIds.length} шт)]`;
                currentMediaContainer.style.display = 'block';
            } else if (post.videoIds && post.videoIds.length > 0) {
                currentMediaPreview.textContent = `[Поточне медіа: ВІДЕО (${post.videoIds.length} шт)]`;
                currentMediaContainer.style.display = 'block';
            } else {
                // Ховаємо блок, якщо медіа немає (або якщо це старий пост без 'photoIds')
                currentMediaContainer.style.display = 'none';
            }
            // --- КІНЕЦЬ ОНОВЛЕНОЇ ЛОГІКИ ---

        } catch (error) {
            statusMessage.textContent = 'Не вдалося завантажити пост для редагування.';
            statusMessage.className = 'error';
            console.error(error);
        }
    };

    // Обробник збереження форми
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        statusMessage.textContent = 'Збереження змін...';
        statusMessage.className = '';
        saveBtn.disabled = true;

        const formData = new FormData(form);
        
        // Переконуємось, що дата відправлена у UTC (ISO)
        const localDate = new Date(formData.get('post_at'));
        formData.set('post_at', localDate.toISOString());

        try {
            // 'updateScheduledPost' на бекенді вже очікує 'multiple' файли,
            // оскільки 'new FormData(form)' автоматично їх збирає.
            // Бекенд-логіка замінить старі медіа, лише якщо нові були завантажені.
            await updateScheduledPost(postId, formData);
            statusMessage.textContent = 'Пост успішно оновлено!';
            statusMessage.className = 'success';
            
            // Перенаправляємо назад до списку через 2 секунди
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

    loadPost();
});