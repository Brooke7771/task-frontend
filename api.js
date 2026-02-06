// TG/frontend/api.js

// 🔥 Ваша адреса бекенду
// export const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com';
export const backendUrl = 'http://localhost:8080';

async function apiFetch(endpoint, options = {}) {
    try {
        // 🔥 ОТРИМУЄМО ПОТОЧНИЙ ТОКЕН
        const token = localStorage.getItem('token');

        // Додаємо заголовок
        if (!options.headers) {
            options.headers = {};
        }

        // Додаємо Authorization якщо є токен
        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        // Якщо це не FormData (де headers встановлюються автоматично браузером для Content-Type), додаємо
        if (!(options.body instanceof FormData)) {
             // Для JSON запитів
        }
        
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

// --- API для постів ---
export const getScheduledPosts = () => apiFetch('/api/scheduled_posts');
export const schedulePost = (formData) => apiFetch('/api/schedule_post', { method: 'POST', body: formData });
export const deleteScheduledPost = (postId) => apiFetch(`/api/scheduled_posts/${postId}/delete`, { method: 'POST' });
export const postScheduledNow = (postId) => apiFetch(`/api/scheduled_posts/${postId}/post_now`, { method: 'POST' });
export const getScheduledPostById = (postId) => apiFetch(`/api/scheduled_posts/${postId}`);
export const updateScheduledPost = (postId, formData) => apiFetch(`/api/scheduled_posts/${postId}/update`, { method: 'POST', body: formData });
export const postNewsNow = (formData) => apiFetch('/api/post_now', { method: 'POST', body: formData });
export const approveScheduledPost = (postId) => apiFetch(`/api/scheduled_posts/${postId}/approve`, { method: 'POST' });

// --- API для чат-бота ---
export const sendChatMessage = (prompt) => apiFetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
});

// --- API для Налаштувань ---
export const getSettings = () => apiFetch('/api/settings');
export const updateSettings = (data) => apiFetch('/api/settings', { 
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data) 
});

// --- 🔥 ВАЖЛИВО: API для Білого Списку ---
export const getWhitelist = () => apiFetch('/api/whitelist');

export const addWhitelistUser = (telegram_id, note) => apiFetch('/api/whitelist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ telegram_id: parseInt(telegram_id), note: note })
});

export const deleteWhitelistUser = (telegram_id) => apiFetch(`/api/whitelist/${telegram_id}/delete`, { 
    method: 'POST' 
});
export const getChannels = () => apiFetch('/api/channels');

export const addChannel = (telegram_id, title) => apiFetch('/api/channels', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        telegram_id: String(telegram_id), // Перетворюємо в рядок
        title: title 
    })
});

export const deleteChannel = (db_id) => apiFetch(`/api/channels/${db_id}/delete`, { 
    method: 'POST' 
});

export const getAllPermissions = () => apiFetch('/api/permissions');

export const grantPermission = (userTgId, channelDbId) => apiFetch('/api/permissions/grant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        user_telegram_id: String(userTgId), 
        channel_db_id: parseInt(channelDbId)
    })
});

export const revokePermission = (userTgId, channelDbId) => apiFetch('/api/permissions/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
        user_telegram_id: String(userTgId), 
        channel_db_id: parseInt(channelDbId)
    })
});

export const createChatSession = () => apiFetch('/api/chat/sessions', { method: 'POST' });
export const getChatSessions = () => apiFetch('/api/chat/sessions');
export const deleteChatSession = (id) => apiFetch(`/api/chat/sessions/${id}`, { method: 'DELETE' });
export const getChatMessages = (id) => apiFetch(`/api/chat/sessions/${id}/messages`);
export const sendChatMessageToSession = (id, content) => apiFetch(`/api/chat/sessions/${id}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
});

// --- API ПРОФІЛЮ ---
export const getMyProfile = () => apiFetch('/api/user/me');

export const changePassword = (newPassword) => apiFetch('/api/user/change_password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_password: newPassword })
});

// --- Channel groups API ---
export const getChannelGroups = () => apiFetch('/api/channel_groups');
export const createChannelGroup = (name, channel_ids) => apiFetch('/api/channel_groups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, channel_ids })
});
export const deleteChannelGroup = (id) => apiFetch(`/api/channel_groups/${id}/delete`, { method: 'POST' });