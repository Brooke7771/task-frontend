import { 
    createChatSession, 
    getChatSessions, 
    deleteChatSession, 
    getChatMessages, 
    sendChatMessageToSession, 
    backendUrl
} from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const chatBox = document.getElementById('chatBox');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const newChatBtn = document.getElementById('newChatBtn');
    const sessionsList = document.getElementById('sessionsList');
    const sidebar = document.querySelector('.chat-sidebar');
    const backBtn = document.getElementById('backToList');
    const genPlanBtn = document.getElementById('genPlanBtn');

    if(backBtn) {
        backBtn.addEventListener('click', () => {
            sidebar.classList.remove('hidden-mobile'); // Показати список
        });
    }

    let currentSessionId = null;

    // --- ФУНКЦІЇ UI ---

    const renderMessage = (content, sender) => {
        const msg = document.createElement('div');
        msg.className = `message ${sender === 'user' ? 'user-message' : 'ai-message'}`;
        // Простий парсинг markdown для AI відповідей
        let html = content
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/`([^`]+)`/g, '<code>$1</code>');
        msg.innerHTML = html;
        chatBox.appendChild(msg);
        chatBox.scrollTop = chatBox.scrollHeight;
    };

    const renderSessions = async () => {
        sessionsList.innerHTML = '';
        try {
            const sessions = await getChatSessions();
            if (sessions.length === 0) {
                sessionsList.innerHTML = '<li style="padding:15px; color:#aaa; text-align:center">Немає історії</li>';
                return;
            }

            sessions.forEach(s => {
                const li = document.createElement('li');
                li.className = `chat-item ${s.id === currentSessionId ? 'active' : ''}`;
                li.innerHTML = `
                    <span class="chat-item-title">${s.title || 'Новий чат'}</span>
                    <button class="delete-chat-btn" title="Видалити">✖</button>
                `;
                
                // Клік на чат
                li.addEventListener('click', (e) => {
                    if(!e.target.classList.contains('delete-chat-btn')) {
                        loadChat(s.id);
                    }
                });

                // Клік на видалення
                li.querySelector('.delete-chat-btn').addEventListener('click', async (e) => {
                    e.stopPropagation();
                    if(confirm('Видалити цей чат?')) {
                        await deleteChatSession(s.id);
                        if (currentSessionId === s.id) {
                            currentSessionId = null;
                            chatBox.innerHTML = '<div style="text-align: center; color: var(--color-text-light); margin-top: 50px;">Чат видалено.</div>';
                            messageInput.disabled = true;
                            sendBtn.disabled = true;
                        }
                        renderSessions();
                    }
                });

                sessionsList.appendChild(li);
            });
        } catch (e) {
            console.error(e);
            sessionsList.innerHTML = '<li style="color:red; padding:10px">Помилка завантаження</li>';
        }
    };

    const loadChat = async (id) => {
        currentSessionId = id;
        renderSessions(); // Оновити підсвітку активного
        
        chatBox.innerHTML = '<div style="text-align:center; padding:20px;">Завантаження...</div>';
        messageInput.disabled = false;
        sendBtn.disabled = false;
        messageInput.focus();

        if (window.innerWidth <= 768) {
        sidebar.classList.add('hidden-mobile'); // Сховати список, показати чат
        }

        try {
            const messages = await getChatMessages(id);
            chatBox.innerHTML = '';
            
            if (messages.length === 0) {
                chatBox.innerHTML = '<div style="text-align: center; color: var(--color-text-light); margin-top: 50px;">Почніть розмову...</div>';
            } else {
                messages.forEach(m => renderMessage(m.content, m.sender));
            }
        } catch (e) {
            chatBox.innerHTML = '<div style="color:red; text-align:center">Помилка завантаження повідомлень</div>';
        }
    };

    const handleSend = async () => {
        const text = messageInput.value.trim();
        if (!text || !currentSessionId) return;

        // Очистити ввід і додати в UI
        messageInput.value = '';
        renderMessage(text, 'user');
        
        // Видалити плейсхолдер "Почніть розмову", якщо він є
        if(chatBox.innerText.includes("Почніть розмову")) {
             // Видаляємо перший елемент (div)
             if(chatBox.firstChild) chatBox.removeChild(chatBox.firstChild);
        }

        try {
            sendBtn.disabled = true;
            // Відправляємо на сервер
            const aiMsg = await sendChatMessageToSession(currentSessionId, text);
            renderMessage(aiMsg.content, 'ai');
            
            // Якщо це перший меседж, назва чату змінилась, оновимо список
            renderSessions(); 
        } catch (e) {
            console.error(e);
            renderMessage('Помилка з\'єднання. Спробуйте ще раз.', 'ai');
        } finally {
            sendBtn.disabled = false;
            messageInput.focus();
        }
    };

    // --- ПОДІЇ ---

    if (genPlanBtn) {
        genPlanBtn.addEventListener('click', async () => {
            try {
                // 1. Create new chat automatically
                const session = await createChatSession();
                await loadChat(session.id);
                
                // 2. Add fake user message
                renderMessage("Склади контент-план на тиждень", 'user');
                
                // 3. Add loading AI message
                const loadingDiv = document.createElement('div');
                loadingDiv.className = 'message ai-message';
                loadingDiv.innerHTML = '<span class="loader"></span> Аналізую тренди...';
                chatBox.appendChild(loadingDiv);

                try {
                    // 4. Call special API endpoint
                    const res = await fetch(`${backendUrl}/api/ai/generate_plan`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' }
                    });
                    const data = await res.json();
                    
                    loadingDiv.remove(); // Remove loader
                    if (data.result) {
                        // Save to DB so it persists in chat history (we trigger a simple session message)
                        await sendChatMessageToSession(session.id, "Склади контент-план (System Trigger)");
                        renderMessage(data.result, 'ai');
                        renderSessions();
                    } else {
                        renderMessage('Не вдалося згенерувати план.', 'ai');
                    }
                } catch (e) {
                    loadingDiv.innerText = "Помилка генерації.";
                }
            } catch (e) {
                console.error(e);
                alert('Не вдалося створити чат для плану');
            }
        });
    }
     
    newChatBtn.addEventListener('click', async () => {
         try {
             const session = await createChatSession();
             await loadChat(session.id);
             renderSessions();
         } catch (e) {
             alert('Не вдалося створити чат');
         }
     });
    sendBtn.addEventListener('click', handleSend);
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSend();
    });

    // Ініціалізація
    renderSessions();
});