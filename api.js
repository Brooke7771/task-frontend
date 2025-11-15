// frontend/api.js

export const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com';

async function apiFetch(endpoint, options = {}) {
    try {
        const response = await fetch(`${backendUrl}${endpoint}`, options);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Помилка сервера: ${response.status} - ${errorText}`);
        }
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            return response.json();
        }
        return true;
    } catch (error) {
        console.error(`Помилка API запиту до ${endpoint}:`, error);
        throw error;
    }
}

// --- API для завдань ---
export const getTasks = () => apiFetch('/api/tasks');
export const createTask = (formData) => apiFetch('/submit_task', { method: 'POST', body: formData });
export const handleTaskAction = (taskId, action, userId) => apiFetch(`/api/tasks/${taskId}/${action}/${userId}`, { method: 'POST' });

// --- API для запланованих постів ---
export const getScheduledPosts = () => apiFetch('/api/scheduled_posts');
export const schedulePost = (formData) => apiFetch('/api/schedule_post', { method: 'POST', body: formData });
export const deleteScheduledPost = (postId) => apiFetch(`/api/scheduled_posts/${postId}/delete`, { method: 'POST' });
export const postScheduledNow = (postId) => apiFetch(`/api/scheduled_posts/${postId}/post_now`, { method: 'POST' });
// --- 🔥 НОВІ ФУНКЦІЇ ДЛЯ РЕДАГУВАННЯ ---
export const getScheduledPostById = (postId) => apiFetch(`/api/scheduled_posts/${postId}`);
export const updateScheduledPost = (postId, formData) => apiFetch(`/api/scheduled_posts/${postId}/update`, { method: 'POST', body: formData });


// --- API для публікації новин ---
export const postNewsNow = (formData) => apiFetch('/api/post_now', { method: 'POST', body: formData });

// --- API для чат-бота ---
export const sendChatMessage = (prompt) => apiFetch('/api/chat', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({ prompt }),
});