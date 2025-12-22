import { schedulePost, postNewsNow, getChannels, backendUrl } from './api.js';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Елементи DOM
        const templateSelect = document.getElementById('template-select');
        const channelSelect = document.getElementById('channel_select'); // 🔥 Додано селект каналів
        const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
        const previewContent = document.getElementById('preview-content');
        const form = document.getElementById('postForm');
        const statusMessage = document.getElementById('statusMessage');
        const scheduleBtn = document.getElementById('scheduleBtn');
        const draftBtn = document.getElementById('draftBtn'); // 🔥 Новая кнопка чернетки (может быть вставлена динамически)
        const postNowBtn = document.getElementById('postNowBtn');
        const postAtInput = document.getElementById('post_at');
        
        // Основне текстове поле
        const postTextInput = document.getElementById('post_text'); 
        try { window.postTextInput = postTextInput } catch(e) {}
        
        // Фото/відео
        const postPhotoInput = document.getElementById('post_photo');

        // Контейнери прев'ю
        const mediaContainer = document.getElementById('preview-media');
        const timeBadge = document.getElementById('preview-time');

        // 🔥 AI Elements
        const aiUrlInput = document.getElementById('ai_url_input');
        const aiUrlBtn = document.getElementById('ai_url_btn');
        const aiToneSelect = document.getElementById('ai_tone_select');
        const aiRewriteBtn = document.getElementById('ai_rewrite_btn');

        // --- 🔥 AI HANDLERS ---
        // 1. URL Scraper
        if (aiUrlBtn) {
            aiUrlBtn.addEventListener('click', async () => {
                const url = aiUrlInput.value.trim();
                if (!url) return alert('Введіть URL');
                
                const originalHtml = aiUrlBtn.innerHTML;
                aiUrlBtn.innerHTML = '<span class="loader" style="width:12px; height:12px; border-width:2px;"></span>';
                aiUrlBtn.disabled = true;

                try {
                    const res = await fetch(`${backendUrl}/api/ai/parse_url`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ url })
                    });
                    const data = await res.json();
                    
                    if (data.result) {
                        postTextInput.value = data.result;
                        updatePreview(true); // Update preview manually
                        aiUrlInput.value = ''; // Clear input
                    } else {
                        alert('Не вдалося отримати контент');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Помилка сервера');
                } finally {
                    aiUrlBtn.innerHTML = originalHtml;
                    aiUrlBtn.disabled = false;
                }
            });
        }

        // 2. Tone Rewriter
        if (aiRewriteBtn) {
            aiRewriteBtn.addEventListener('click', async () => {
                const text = postTextInput.value.trim();
                if (!text) return alert('Введіть текст для перепису');
                
                const tone = aiToneSelect.value;
                const originalHtml = aiRewriteBtn.innerHTML;
                aiRewriteBtn.innerHTML = '<span class="loader" style="width:12px; height:12px; border-width:2px;"></span>';
                aiRewriteBtn.disabled = true;

                try {
                    const res = await fetch(`${backendUrl}/api/ai/rewrite`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ text, tone })
                    });
                    const data = await res.json();
                    
                    if (data.result) {
                        postTextInput.value = data.result;
                        updatePreview(true);
                    } else {
                        alert('Помилка AI');
                    }
                } catch (e) {
                    console.error(e);
                    alert('Помилка мережі');
                } finally {
                    aiRewriteBtn.innerHTML = originalHtml;
                    aiRewriteBtn.disabled = false;
                }
            });
        }

        // --- 🔥 ЛОГІКА ЗАВАНТАЖЕННЯ КАНАЛІВ (МУЛЬТИ) ---
        const channelsDropdown = document.getElementById('channels-dropdown');
        const selectedCountSpan = document.getElementById('selected-count');
        const toggleBtn = document.getElementById('btn-toggle-channels');
        
        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                channelsDropdown.classList.toggle('hidden');
            });
        }

        const loadChannelsMulti = async () => {
            try {
                const channels = await getChannels();
                channelsDropdown.innerHTML = '';
                
                channels.forEach(ch => {
                    const label = document.createElement('label');
                    label.className = 'channel-checkbox';
                    label.innerHTML = `
                        <input type="checkbox" name="target_channel_id" value="${ch.telegram_id}">
                        <span>${ch.title}</span>
                    `;
                    
                    // Стилізація при кліку
                    const checkbox = label.querySelector('input');
                    checkbox.addEventListener('change', () => {
                        if(checkbox.checked) label.classList.add('checked');
                        else label.classList.remove('checked');
                        updateCount();
                    });
                    
                    channelsDropdown.appendChild(label);
                });
            } catch (e) { console.error(e); }
        };

        function updateCount() {
            const count = document.querySelectorAll('input[name="target_channel_id"]:checked').length;
            if(selectedCountSpan) selectedCountSpan.textContent = count;
        }

        // Завантажуємо канали по-новому
        loadChannelsMulti();

        // 🔥 НОВЕ: Логіка Груп
        const groupsModal = document.getElementById('groupsModal');
        const manageGroupsBtn = document.getElementById('btn-manage-groups');
        const createGroupBtn = document.getElementById('btn-create-group');
        const groupsList = document.getElementById('groups-list');

        if(manageGroupsBtn) {
            manageGroupsBtn.addEventListener('click', () => {
                groupsModal.style.display = 'flex';
                loadGroups();
            });
        }

        async function loadGroups() {
            // Треба додати getGroups в api.js
            const res = await fetch(`${backendUrl}/api/channel_groups`);
            const groups = await res.json();
            
            groupsList.innerHTML = groups.map(g => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:5px;">
                    <span style="font-weight:bold; color:white; cursor:pointer;" onclick="applyGroup('${g.id}')">${g.name} <small style="opacity:0.6">(${g.channel_ids.length} кан.)</small></span>
                    <button class="btn-danger" style="width:24px; height:24px; padding:0; font-size:12px;" onclick="deleteGroup(${g.id})">x</button>
                </div>
            `).join('');
            
            // Зберігаємо групи в пам'яті для застосування
            window.currentGroups = groups;
        }

        window.applyGroup = (groupId) => {
            const group = window.currentGroups.find(g => g.id == groupId);
            if(!group) return;
            
            // Скидаємо вибір
            document.querySelectorAll('input[name="target_channel_id"]').forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('checked');
            });

            // Ставимо галочки
            group.channel_ids.forEach(id => {
                const cb = document.querySelector(`input[value="${id}"]`);
                if(cb) {
                    cb.checked = true;
                    cb.parentElement.classList.add('checked');
                }
            });
            updateCount();
            groupsModal.style.display = 'none';
        };

        window.deleteGroup = async (id) => {
            if(!confirm('Видалити групу?')) return;
            await fetch(`${backendUrl}/api/channel_groups/${id}/delete`, { method: 'POST' });
            loadGroups();
        };

        if(createGroupBtn) {
            createGroupBtn.addEventListener('click', async () => {
                const name = document.getElementById('new_group_name').value;
                if(!name) return alert('Введіть назву');
                
                // Збираємо обрані канали
                const selected = Array.from(document.querySelectorAll('input[name="target_channel_id"]:checked')).map(cb => cb.value);
                
                if(selected.length === 0) return alert('Оберіть канали для групи');

                await fetch(`${backendUrl}/api/channel_groups`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', 'X-Username': localStorage.getItem('username')},
                    body: JSON.stringify({ name, channel_ids: selected })
                });
                
                document.getElementById('new_group_name').value = '';
                loadGroups();
            });
        }

        // --- ОНОВЛЕНА ФУНКЦІЯ ПРЕВ'Ю ---
        function updatePreview(isManualEdit = false) {
            let finalText = '';

            if (!isManualEdit) {
                // Якщо це не ручне редагування, збираємо дані з шаблону
                const templateId = templateSelect.value;
                const template = templates[templateId];
                if (template) {
                    const data = {};
                    template.fields.forEach(field => {
                        const input = document.getElementById(field.id);
                        if (input) data[field.id] = input.value;
                    });
                    // Форматуємо текст через шаблон
                    finalText = template.formatter(data);
                    
                    // 🔥 Оновлюємо головне приховане поле
                    if (postTextInput) postTextInput.value = finalText;
                }
            } else {
                // Якщо редагуємо вручну в великому полі
                finalText = postTextInput ? postTextInput.value : '';
            }

            // Оновлюємо HTML прев'ю
            if (previewContent) {
                previewContent.innerHTML = formatForPreview((finalText || '').trimStart());
            }

            // Керування класами для медіа (скруглення)
            const hasMedia = mediaContainer.style.display !== 'none' && mediaContainer.innerHTML !== '';
            const textIsEmpty = !finalText || finalText.trim() === '';
            
            const textContentDiv = document.querySelector('.tg-text-content');

            if (hasMedia && textIsEmpty) {
                if (textContentDiv) textContentDiv.style.display = 'none';
                mediaContainer.style.borderRadius = '12px'; 
            } else {
                if (textContentDiv) textContentDiv.style.display = 'block';
                mediaContainer.style.borderRadius = '12px 12px 0 0'; 
            }
        }

        // --- Форматування ---
        function formatForPreview(text) {
            if (!text) return '';
            let html = text
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/\*([\s\S]+?)\*/g, '<b>$1</b>')
                .replace(/_([\s\S]+?)_/g, '<i>$1</i>')
                .replace(/~([\s\S]+?)~/g, '<s>$1</s>')
                .replace(/\|\|([\s\S]+?)\|\|/g, '<span class="tg-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>')
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/\n/g, '<br>');
            return html;
        }

        function escapeMarkdown(text) {
            if (!text) return '';
            const charsToEscape = '_*[]()~`>#+-=|{}.!';
            return text.split('').map(char => charsToEscape.includes(char) ? '\\' + char : char).join('');
        }

        // --- 🔥 УНИВЕРСАЛЬНА ФУНКЦІЯ ПРИЙОМУ ФОРМИ ---
        async function handleFormSubmit(mode) {
            // mode: 'schedule', 'draft', 'now'
            let loadingText = 'Обробка...';
            if (mode === 'schedule') loadingText = 'Плануємо...';
            if (mode === 'draft') loadingText = 'Зберігаємо чернетку...';
            if (mode === 'now') loadingText = 'Публікуємо...';

            statusMessage.textContent = loadingText;
            statusMessage.className = '';
            if (scheduleBtn) scheduleBtn.disabled = true;
            if (draftBtn) draftBtn.disabled = true;
            if (postNowBtn) postNowBtn.disabled = true;

            // Валідація дати тільки для планування (не для чернеток)
            if (mode === 'schedule' && !postAtInput.value) {
                alert('Вкажіть дату та час для планування.');
                statusMessage.textContent = '';
                if(scheduleBtn) scheduleBtn.disabled = false;
                if(draftBtn) draftBtn.disabled = false;
                if(postNowBtn) postNowBtn.disabled = false;
                return;
            }

            const finalPostText = postTextInput ? postTextInput.value : '';
            if (!finalPostText && mode !== 'draft') { // Чернетка може бути без тексту (тільки фото)
                 alert('Текст поста порожній!');
                 if(scheduleBtn) scheduleBtn.disabled = false;
                 if(draftBtn) draftBtn.disabled = false;
                 if(postNowBtn) postNowBtn.disabled = false;
                 return;
            }

            const submissionData = new FormData();
            submissionData.append('post_text', finalPostText);

            // Збираємо мітки для мультиканальності
            const checkboxes = document.querySelectorAll('input[name="target_channel_id"]:checked');
            if (checkboxes.length === 0) {
                // Для планування і публікації вимагаємо хоча б один канал
                if (mode === 'now' || mode === 'schedule' || mode === 'draft') {
                    alert('Оберіть хоча б один канал!');
                    if(scheduleBtn) scheduleBtn.disabled = false;
                    if(draftBtn) draftBtn.disabled = false;
                    if(postNowBtn) postNowBtn.disabled = false;
                    return;
                }
            } else {
                checkboxes.forEach(cb => submissionData.append('target_channel_id', cb.value));
            }

            // 🔥 Передаємо прапорець is_draft
            if (mode === 'draft') {
                submissionData.append('is_draft', 'true');
                // Для чернетки дата необов'язкова, але якщо є - збережемо
                if (postAtInput.value) {
                    submissionData.append('post_at', new Date(postAtInput.value).toISOString());
                } else {
                    // Ставимо дату в далеке майбутнє або поточну, щоб сервер не лаявся
                    submissionData.append('post_at', new Date().toISOString()); 
                }
            } else if (mode === 'schedule') {
                submissionData.append('is_draft', 'false');
                submissionData.append('post_at', new Date(postAtInput.value).toISOString());
            }

            // Додаємо файли
            const formDataLocal = new FormData(form);
            const postPhotos = formDataLocal.getAll('post_photo');
            if (postPhotos.length > 0) {
                for (const photo of postPhotos) {
                    if (photo.size > 0) submissionData.append('post_photo', photo, photo.name);
                }
            }

            // Відправка даних на сервер
            try {
                let response;
                if (mode === 'now') {
                    response = await postNewsNow(submissionData);
                } else {
                    response = await schedulePost(submissionData);
                }

                if (response && response.success) {
                    statusMessage.textContent = 'Успішно надіслано!';
                    statusMessage.className = 'success';

                    // Очищення форми після успішної відправки
                    form.reset();
                    mediaContainer.innerHTML = '';
                    mediaContainer.style.display = 'none';
                    templateSelect.selectedIndex = 0;
                    dynamicFieldsContainer.innerHTML = '';

                    // Повторне завантаження каналів (якщо потрібно)
                    loadChannelsMulti();
                } else {
                    throw new Error(response.message || 'Невідома помилка');
                }
            } catch (e) {
                console.error("Помилка при відправці:", e);
                statusMessage.textContent = 'Помилка при відправці даних.';
                statusMessage.className = 'error';
            } finally {
                if (scheduleBtn) scheduleBtn.disabled = false;
                if (draftBtn) draftBtn.disabled = false;
                if (postNowBtn) postNowBtn.disabled = false;
            }
        }

        // --- Обробка подій ---
        templateSelect.addEventListener('change', (e) => {
            const templateId = e.target.value;
            renderFormFields(templateId);
            updatePreview(); // Оновлюємо прев'ю при зміні шаблону
        });

        // Ініціалізація
        loadChannelsForSelect();
        renderFormFields(templateSelect.value);
        updatePreview();

        // 🔥 ВИПРАВЛЕННЯ: Додаємо слухачі подій для кнопок
        // 1. Кнопка "Запланувати" (це сабміт форми)
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                handleFormSubmit('schedule');
            });
        }

        // 2. Кнопка "Чернетка"
        if (draftBtn) {
            draftBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleFormSubmit('draft');
            });
        }

        // 3. Кнопка "Опублікувати"
        if (postNowBtn) {
            postNowBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleFormSubmit('now');
            });
        }
    } catch (e) {
        console.error("Помилка ініціалізації:", e);
    }
});

// --- ГЛОБАЛЬНІ ФУНКЦІЇ ДЛЯ ТЕСТУВАННЯ ---
function testEscapeMarkdown() {
    const testCases = [
        "Привіт, *світ*!",
        "Це _курсив_ текст.",
        "Тут ~~закреслений~~ текст.",
        "`Код` в рядку.",
        "[Посилання](https://example.com) тут.",
        "Текст з `кодом` і *форматуванням*.",
        "Спойлер: ||Це прихований текст||.",
        "Текст з зображенням: ![alt текст](https://example.com/image.jpg)",
        "Текст з відео: [![alt текст](https://img.youtube.com/vi/VIDEO_ID/0.jpg)](https://www.youtube.com/watch?v=VIDEO_ID)"
    ];

    testCases.forEach(testCase => {
        console.log(`Тестуємо: ${testCase}`);
        const escaped = escapeMarkdown(testCase);
        console.log(`Результат: ${escaped}`);
        console.log(`Зворотнє перетворення: ${escapeMarkdown(escaped)}`);
        console.log('---');
    });
}

// Для тестування можна викликати цю функцію в консолі браузера
testEscapeMarkdown();