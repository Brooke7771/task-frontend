// frontend/api.js

// Єдине місце, де зберігається адреса вашого сервера
export const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com';

// Функція для надсилання запитів, яка обробляє помилки
async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(`${backendUrl}${endpoint}`, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Помилка сервера: ${response.status} - ${errorText}`);
        }
        // Повертаємо JSON, якщо відповідь не порожня
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return true; // Для успішних запитів без тіла відповіді
    } catch (error) {
        console.error(`Помилка API запиту до ${endpoint}:`, error);
        throw error; // Передаємо помилку далі для обробки в UI
    }
}

// --- API для завдань ---
export const getTasks = () => apiFetch('/api/tasks');

export const createTask = (formData) => apiFetch('/submit_task', {
    method: 'POST',
    body: formData,
});

export const handleTaskAction = (taskId, action, userId) => apiFetch(`/api/tasks/${taskId}/${action}/${userId}`, {
    method: 'POST',
});

// --- API для запланованих постів ---
export const getScheduledPosts = () => apiFetch('/api/scheduled_posts');

export const schedulePost = (formData) => apiFetch('/api/schedule_post', {
    method: 'POST',
    body: formData,
});

export const deleteScheduledPost = (postId) => apiFetch(`/api/scheduled_posts/${postId}/delete`, {
    method: 'POST',
});

export const postScheduledNow = (postId) => apiFetch(`/api/scheduled_posts/${postId}/post_now`, {
    method: 'POST',
});