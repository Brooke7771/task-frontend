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
        msg.innerHTML = text.replace(/\n/g, '<br>');
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    }

    const handleSendMessage = async () => {
        const prompt = messageInput.value.trim();
        if (!prompt) return;

        appendMessage(prompt, 'user');
        messageInput.value = '';
        sendBtn.disabled = true;

        try {
            // виклик функції API
            const response = await sendChatMessage(prompt);
            appendMessage(response.reply, 'ai');
        } catch (error) {
            appendMessage('Сталася помилка при отриманні відповіді.', 'ai');
            console.error(error);
        } finally {
            sendBtn.disabled = false;
            messageInput.focus();
        }
    };

    sendBtn.addEventListener('click', handleSend);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    });

    appendMessage('Вітаю! Я ваш AI помічник. Чим можу допомогти?', 'ai');
});