import { schedulePost, postNewsNow } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    try {
    // Елементи DOM
    const templateSelect = document.getElementById('template-select');
    const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
    const previewContent = document.getElementById('preview-content');
    const form = document.getElementById('postForm');
    const statusMessage = document.getElementById('statusMessage');
    const scheduleBtn = document.getElementById('scheduleBtn');
    const postNowBtn = document.getElementById('postNowBtn');
    const postAtInput = document.getElementById('post_at');
    
    // --- 🔥 ВАЖЛИВО: Оголошення змінної текстового поля ---
    const postTextInput = document.getElementById('post_text'); 
    // Expose for debugging and external scripts (safe guard)
    try { window.postTextInput = postTextInput } catch(e) {}
    // Фото/відео (для прев'ю медіа)
    const postPhotoInput = document.getElementById('post_photo');

    // 1. Створюємо контейнер для медіа в прев'ю, якщо його немає в HTML
    let mediaContainer = document.querySelector('.media-preview-container');
    if (!mediaContainer && previewContent) {
        mediaContainer = document.createElement('div');
        mediaContainer.className = 'media-preview-container';
        // Вставляємо перед текстом у message-bubble
        previewContent.parentNode.insertBefore(mediaContainer, previewContent);
    }

    // Кнопки тулбару
    const toolbarBold = document.getElementById('toolbar-bold');
    const toolbarItalic = document.getElementById('toolbar-italic');
    const toolbarStrike = document.getElementById('toolbar-strike');
    const toolbarCode = document.getElementById('toolbar-code');
    const toolbarLink = document.getElementById('toolbar-link');

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
        updatePreview(true);
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
        // Оновлюємо прев'ю при ручному вводі
        postTextInput.addEventListener('input', () => updatePreview(true));
    }

    // --- 🔥 ФУНКЦІЯ: Прев'ю завантажених фото/відео ---
    if (postPhotoInput) {
        postPhotoInput.addEventListener('change', function() {
            if (!mediaContainer) return;
            mediaContainer.innerHTML = ''; // Очистити старе
            mediaContainer.style.display = 'none';

            const files = this.files;
            if (files && files.length > 0) {
                const file = files[0]; // Беремо перше для прев'ю
                const reader = new FileReader();

                reader.onload = function(e) {
                    mediaContainer.style.display = 'block';
                    if (file.type.startsWith('video/')) {
                        const video = document.createElement('video');
                        video.src = e.target.result;
                        video.controls = true;
                        mediaContainer.appendChild(video);
                    } else {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        mediaContainer.appendChild(img);
                    }
                }
                reader.readAsDataURL(file);
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
            inputElement.addEventListener('input', () => updatePreview(false)); // false = оновлення від шаблону
            group.appendChild(label);
            group.appendChild(inputElement);
            dynamicFieldsContainer.appendChild(group);
        });
    }

    function updatePreview(isManualEdit = false) {
        // Якщо це не ручне редагування, беремо дані з полів шаблону
        if (!isManualEdit) {
            const template = templates[templateSelect.value];
            if (template) {
                const data = {};
                template.fields.forEach(field => {
                    const el = document.getElementById(field.id);
                    data[field.id] = el ? el.value : '';
                });
                const markdownText = template.formatter(data);
                
                // Вставляємо згенерований текст у головне поле
                if (postTextInput) postTextInput.value = markdownText;
            }
        }

        // Формуємо HTML для прев'ю з головного поля
        if (postTextInput && previewContent) {
            previewContent.innerHTML = formatForPreview(postTextInput.value);
        }
    }

    function formatForPreview(text) {
        if (!text) return '';

        // 1. Escape HTML tags to avoid XSS
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. Telegram-like MarkdownV2 handling
        // Spoiler: ||text||
        html = html.replace(/\|\|(.*?)\|\|/g, '<span class="tg-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

        // Bold: **text** and *text*
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        html = html.replace(/(?<!\\)\*(.*?)(?<!\\)\*/g, '<b>$1</b>');

        // Italic: __text__ and _text_
        html = html.replace(/__(.*?)__/g, '<i>$1</i>');
        html = html.replace(/(?<!\\)_(.*?)(?<!\\)_/g, '<i>$1</i>');

        // Strike-through: ~text~
        html = html.replace(/(?<!\\)~(.*?)(?<!\\)~/g, '<s>$1</s>');

        // Inline code: `text`
        html = html.replace(/(?<!\\)`(.*?)(?<!\\)`/g, '<code>$1</code>');

        // Code block: ```lang code```
        html = html.replace(/```(.*?)```/gs, '<pre>$1</pre>');

        // Links: [text](url)
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

        // 3. Unescape escaped symbols: \x => x
        html = html.replace(/\\(.)/g, '$1');

        // 4. New lines -> <br>
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    function escapeMarkdown(text) {
        if (!text) return '';
        const charsToEscape = '_*[]()~`>#+-=|{}.!';
        return text.split('').map(char => charsToEscape.includes(char) ? '\\' + char : char).join('');
    }

    // --- Відправка форми ---
    async function handleFormSubmit(isScheduling) {
        statusMessage.textContent = isScheduling ? 'Плануємо пост...' : 'Публікуємо пост...';
        statusMessage.className = '';
        scheduleBtn.disabled = true;
        postNowBtn.disabled = true;

        if (isScheduling && !postAtInput.value) {
            alert('Будь ласка, вкажіть дату та час для планування.');
            statusMessage.textContent = '';
            scheduleBtn.disabled = false;
            postNowBtn.disabled = false;
            return;
        }

        // Беремо фінальний текст з великого поля (щоб врахувати ручні правки)
        const finalPostText = postTextInput ? postTextInput.value : '';
        if (!finalPostText) {
             alert('Текст поста порожній!');
             scheduleBtn.disabled = false;
             postNowBtn.disabled = false;
             return;
        }

        const submissionData = new FormData();
        submissionData.append('post_text', finalPostText);

        if (isScheduling) {
            submissionData.append('post_at', new Date(postAtInput.value).toISOString());
        }

        // Збір файлів
        const formData = new FormData(form);
        const postPhotos = formData.getAll('post_photo');
        if (postPhotos.length > 0) {
            for (const photo of postPhotos) {
                if (photo.size > 0) submissionData.append('post_photo', photo, photo.name);
            }
        }
        
        // Якщо у вас є поле для відео (хоча в HTML його не видно, але в логіці було)
        const postVideos = formData.getAll('post_video');
        if (postVideos.length > 0) {
            for (const video of postVideos) {
                if (video.size > 0) submissionData.append('post_video', video, video.name);
            }
        }

        try {
            if (isScheduling) {
                await schedulePost(submissionData);
            } else {
                await postNewsNow(submissionData);
            }
            statusMessage.textContent = isScheduling ? 'Пост успішно заплановано!' : 'Пост успішно опубліковано!';
            statusMessage.className = 'success';
            form.reset();
            // Скидаємо вибір шаблону і поля
            renderFormFields(templateSelect.value);
            if (postTextInput) postTextInput.value = '';
            updatePreview(true);
        } catch (error) {
            statusMessage.textContent = 'Помилка! Не вдалося виконати дію.';
            statusMessage.className = 'error';
            console.error(error);
        } finally {
            scheduleBtn.disabled = false;
            postNowBtn.disabled = false;
        }
    }

    if (form) {
        form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleFormSubmit(true);
    });
    }

    if (postNowBtn) postNowBtn.addEventListener('click', () => {
        handleFormSubmit(false);
    });

    if (templateSelect) templateSelect.addEventListener('change', () => {
        renderFormFields(templateSelect.value);
        updatePreview(false);
    });

    // Ініціалізація
    try { renderFormFields(templateSelect.value); } catch (e) { console.error('Failed to render fields at init', e); }
    try { updatePreview(false) } catch(e) { console.error('Failed to update preview at init', e); }
    } catch (e) {
        console.error('Error initializing schedule page:', e);
    }
});