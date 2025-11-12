// frontend/chat.js
import { sendChatMessage } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    // Функція для додавання повідомлення в чат
    const appendMessage = (text, sender) => {
        const msg = document.createElement('div');
        msg.className = `message ${sender}-message`;
        // Додано перевірку на випадок невірної відповіді
        msg.innerHTML = (text || 'Помилка: Не вдалося розпізнати відповідь.').replace(/\n/g, '<br>');
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    // --- ВИПРАВЛЕННЯ 1: Назву змінено на 'handleSend' ---
    const handleSend = async () => {
        const prompt = messageInput.value.trim();
        if (!prompt) return;

        appendMessage(prompt, 'user');
        messageInput.value = '';
        sendBtn.disabled = true;

        try {
            // Виклик функції API
            const response = await sendChatMessage(prompt);
            
            // --- ВИПРАВЛЕННЯ 2: 'response.response' замість 'response.reply' ---
            appendMessage(response.response, 'ai');

        } catch (error) {
            appendMessage('Сталася помилка при отриманні відповіді.', 'ai');
            console.error(error);
        } finally {
            sendBtn.disabled = false;
            messageInput.focus();
        }
    };

    // Тепер ці слухачі подій працюватимуть коректно
    sendBtn.addEventListener('click', handleSend);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    appendMessage('Вітаю! Я ваш AI помічник. Чим можу допомогти?', 'ai');
});