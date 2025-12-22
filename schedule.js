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

        // --- 🔥 ЛОГІКА ЗАВАНТАЖЕННЯ КАНАЛІВ ---
        const loadChannelsForSelect = async () => {
            if (!channelSelect) return;
            try {
                const channels = await getChannels();
                
                // Очищаємо. Більше НЕМАЄ опції "За замовчуванням"
                channelSelect.innerHTML = '<option value="" disabled selected>Оберіть канал...</option>';
                
                if (channels && channels.length > 0) {
                    channels.forEach(channel => {
                        const option = document.createElement('option');
                        option.value = channel.telegram_id; 
                        option.textContent = channel.title;
                        channelSelect.appendChild(option);
                    });
                } else {
                    channelSelect.innerHTML = '<option value="" disabled>Немає доступних каналів</option>';
                }
            } catch (e) {
                console.error("Не вдалося завантажити канали:", e);
            }
        };

        // Оновлення часу
        const updateTime = () => {
            if (timeBadge) {
                const now = new Date();
                timeBadge.textContent = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
            }
        };
        updateTime();
        setInterval(updateTime, 60000);

        // Кнопки тулбару
        const toolbarBold = document.getElementById('toolbar-bold');
        const toolbarItalic = document.getElementById('toolbar-italic');
        const toolbarStrike = document.getElementById('toolbar-strike');
        const toolbarCode = document.getElementById('toolbar-code');
        const toolbarLink = document.getElementById('toolbar-link');

        // (Раніше тут був глобальний formData, убран — використовуємо локальні FormData при відправці)

        // --- Шаблони ---
        const templates = {
            news_simple: {
                name: 'Проста новина',
                fields: [{ id: 'text', label: 'Текст', type: 'textarea', placeholder: 'Що нового?' }],
                formatter: (data) => escapeMarkdown(data.text || '')
            },
            news_breaking: {
                name: 'Термінова новина',
                fields: [
                    { id: 'headline', label: 'Заголовок', type: 'input', placeholder: 'Головна подія' },
                    { id: 'details', label: 'Деталі', type: 'textarea', placeholder: 'Що сталося...' }
                ],
                formatter: (data) => `*⚡️ ТЕРМІНОВО: ${escapeMarkdown(data.headline || '')}*\n\n${escapeMarkdown(data.details || '')}`
            },
            news_event: {
                name: 'Анонс події',
                fields: [
                    { id: 'event_name', label: 'Назва події', type: 'input' },
                    { id: 'event_date', label: 'Дата і час', type: 'input', placeholder: 'Наприклад, 25 жовтня о 19:00' },
                    { id: 'event_place', label: 'Місце проведення', type: 'input' },
                    { id: 'event_desc', label: 'Опис', type: 'textarea' }
                ],
                formatter: (data) => `*Анонс: ${escapeMarkdown(data.event_name || '')}*\n\n🗓 *Коли:* ${escapeMarkdown(data.event_date || '')}\n📍 *Де:* ${escapeMarkdown(data.event_place || '')}\n\n${escapeMarkdown(data.event_desc || '')}`
            },
            market_update: {
                name: 'Аналітика ринку',
                fields: [
                    { id: 'market_title', label: 'Тема аналітики', type: 'input', placeholder: 'Наприклад, Ринок акцій сьогодні' },
                    { id: 'analysis', label: 'Ключові тези', type: 'textarea', placeholder: 'Теза 1\nТеза 2\nТеза 3' }
                ],
                formatter: (data) => {
                    const items = (data.analysis || '').split('\n').filter(i => i.trim()).map(i => `\\- ${escapeMarkdown(i.trim())}`).join('\n');
                    return `*📈 Аналітика: ${escapeMarkdown(data.market_title || 'Огляд ринку')}*\n\n${items}`;
                }
            },
            quote_of_day: {
                name: 'Цитата дня',
                fields: [
                    { id: 'quote', label: 'Текст цитати', type: 'textarea' },
                    { id: 'author', label: 'Автор', type: 'input' }
                ],
                formatter: (data) => `_"${escapeMarkdown(data.quote || '')}"_\n\n*${escapeMarkdown(data.author || 'Невідомий автор')}*`
            },
            link_digest: {
                name: 'Дайджест посилань',
                fields: [
                    { id: 'digest_title', label: 'Тема дайджесту', type: 'input', placeholder: 'Корисні матеріали за тиждень' },
                    { id: 'links', label: 'Посилання (формат: Опис - https://... )', type: 'textarea', placeholder: 'Назва статті 1 - https://link1.com\nНазва статті 2 - https://link2.com' }
                ],
                formatter: (data) => {
                    const links = (data.links || '').split('\n').filter(l => l.includes('-')).map(l => {
                        const parts = l.split('-');
                        const desc = (parts[0] || '').trim();
                        const url = (parts.slice(1).join('-') || '').trim();
                        return `\\[${escapeMarkdown(desc)}]\\(${escapeMarkdown(url)})`;
                    }).join('\n');
                    return `*🔗 ${escapeMarkdown(data.digest_title || 'Дайджест')}*\n\n${links}`;
                }
            }
        };

        // --- Логіка тулбару (Markdown) ---
        function wrapText(startTag, endTag, defaultText = '') {
            if (!postTextInput) return;
            const start = postTextInput.selectionStart;
            const end = postTextInput.selectionEnd;
            const selectedText = postTextInput.value.substring(start, end);
            const textToWrap = selectedText || defaultText;

            const newText = 
                postTextInput.value.substring(0, start) +
                startTag + textToWrap + endTag +
                postTextInput.value.substring(end);

            postTextInput.value = newText;
            postTextInput.focus();

            if (selectedText) {
                postTextInput.setSelectionRange(start + startTag.length, start + startTag.length + textToWrap.length);
            } else {
                postTextInput.setSelectionRange(start + startTag.length, start + startTag.length + defaultText.length);
            }
            updatePreview(true); // true = ручне редагування
        }

        if (toolbarBold) toolbarBold.addEventListener('click', () => wrapText('*', '*', 'жирний текст'));
        if (toolbarItalic) toolbarItalic.addEventListener('click', () => wrapText('_', '_', 'курсив'));
        if (toolbarStrike) toolbarStrike.addEventListener('click', () => wrapText('~', '~', 'закреслений'));
        if (toolbarCode) toolbarCode.addEventListener('click', () => wrapText('`', '`', 'код'));

        if (toolbarLink && postTextInput) {
            toolbarLink.addEventListener('click', () => {
                const start = postTextInput.selectionStart;
                const end = postTextInput.selectionEnd;
                const selectedText = postTextInput.value.substring(start, end);
                const linkText = selectedText || 'текст посилання';
                const url = prompt('Введіть URL (посилання):', 'https://');

                if (url) {
                    const textToInsert = `[${linkText}](${url})`;
                    postTextInput.value = 
                        postTextInput.value.substring(0, start) +
                        textToInsert +
                        postTextInput.value.substring(end);
                    
                    postTextInput.focus();
                    if (selectedText) {
                        postTextInput.setSelectionRange(start, start + textToInsert.length);
                    } else {
                        postTextInput.setSelectionRange(start + 1, start + 1 + linkText.length);
                    }
                    updatePreview(true);
                }
            });
        }

        if (postTextInput) {
            postTextInput.addEventListener('keydown', (e) => {
                if (e.ctrlKey) {
                    switch (e.key) {
                        case 'b': e.preventDefault(); wrapText('*', '*', 'жирний текст'); break;
                        case 'i': e.preventDefault(); wrapText('_', '_', 'курсив'); break;
                        case 'k': e.preventDefault(); toolbarLink.click(); break;
                    }
                }
            });
            // Оновлюємо прев'ю при ручному вводі в головне поле
            postTextInput.addEventListener('input', () => updatePreview(true));
        }

        // --- Прев'ю файлів ---
        if (postPhotoInput) {
            postPhotoInput.addEventListener('change', function() {
                if (!mediaContainer) return;
                mediaContainer.innerHTML = '';
                mediaContainer.style.display = 'none';

                const files = this.files;
                if (files && files.length > 0) {
                    const file = files[0];
                    const reader = new FileReader();

                    reader.onload = function(e) {
                        if (mediaContainer) {
                            mediaContainer.style.display = 'block';
                            if (file.type.startsWith('video/')) {
                                const video = document.createElement('video');
                                video.src = e.target.result;
                                video.controls = false;
                                video.autoplay = true;
                                video.muted = true;
                                video.loop = true;
                                mediaContainer.appendChild(video);
                            } else {
                                const img = document.createElement('img');
                                img.src = e.target.result;
                                mediaContainer.appendChild(img);
                            }
                            // Оновлюємо, щоб застосувати правильні скруглення
                            updatePreview(true);
                        }
                    }
                    reader.readAsDataURL(file);
                } else {
                    updatePreview(true);
                }
            });
        }

        // --- Логіка шаблонів ---
        Object.keys(templates).forEach(key => {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = templates[key].name;
            templateSelect.appendChild(option);
        });

        function renderFormFields(templateId) {
            dynamicFieldsContainer.innerHTML = '';
            const template = templates[templateId];
            if (!template) return;
            template.fields.forEach(field => {
                const group = document.createElement('div');
                group.className = 'form-group';
                const label = document.createElement('label');
                label.htmlFor = field.id;
                label.textContent = field.label + ':';
                let inputElement;
                if (field.type === 'textarea') {
                    inputElement = document.createElement('textarea');
                    inputElement.rows = 3;
                } else {
                    inputElement = document.createElement('input');
                    inputElement.type = 'text';
                }
                inputElement.id = field.id;
                inputElement.name = field.id;
                inputElement.placeholder = field.placeholder || '';
                
                // 🔥 Коли користувач пише в полях шаблону, викликаємо updatePreview(false)
                inputElement.addEventListener('input', () => updatePreview(false));
                
                group.appendChild(label);
                group.appendChild(inputElement);
                dynamicFieldsContainer.appendChild(group);
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

            if (channelSelect && channelSelect.value) {
                submissionData.append('target_channel_id', channelSelect.value);
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
                    loadChannelsForSelect();
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