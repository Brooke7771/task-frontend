import { schedulePost, postNewsNow } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const templateSelect = document.getElementById('template-select');
    const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
    const previewContent = document.getElementById('preview-content');
    const form = document.getElementById('postForm');
    const statusMessage = document.getElementById('statusMessage');
    const scheduleBtn = document.getElementById('scheduleBtn');
    const postNowBtn = document.getElementById('postNowBtn');
    const postAtInput = document.getElementById('post_at');

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

    // 1. Знаходимо нові кнопки
    const toolbarBold = document.getElementById('toolbar-bold');
    const toolbarItalic = document.getElementById('toolbar-italic');
    const toolbarStrike = document.getElementById('toolbar-strike');
    const toolbarCode = document.getElementById('toolbar-code');
    const toolbarLink = document.getElementById('toolbar-link');

    /**
     * Головна функція, що "обгортає" виділений текст тегами Markdown.
     * @param {string} startTag - Символ(и) на початку (напр. "*")
     * @param {string} endTag - Символ(и) в кінці (напр. "*")
     * @param {string} [defaultText=''] - Текст за замовчуванням, якщо нічого не виділено
     */
    function wrapText(startTag, endTag, defaultText = '') {
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

        // Оновлюємо виділення
        if (selectedText) {
            // Якщо текст був виділений, виділяємо його знову
            postTextInput.setSelectionRange(start + startTag.length, start + startTag.length + textToWrap.length);
        } else {
            // Якщо вставляли текст за замовчуванням, ставимо курсор всередину
            postTextInput.setSelectionRange(start + startTag.length, start + startTag.length + defaultText.length);
        }
        
        // Оновлюємо попередній перегляд
        updatePreview();
    }

    // 2. Прив'язуємо події до кнопок
    toolbarBold.addEventListener('click', () => {
        wrapText('*', '*', 'жирний текст');
    });

    toolbarItalic.addEventListener('click', () => {
        wrapText('_', '_', 'курсив');
    });

    toolbarStrike.addEventListener('click', () => {
        wrapText('~', '~', 'закреслений');
    });

    toolbarCode.addEventListener('click', () => {
        wrapText('`', '`', 'код');
    });

    toolbarLink.addEventListener('click', () => {
        const start = postTextInput.selectionStart;
        const end = postTextInput.selectionEnd;
        const selectedText = postTextInput.value.substring(start, end);

        const linkText = selectedText || 'текст посилання';
        const url = prompt('Введіть URL (посилання):', 'https://');

        if (url) { // Якщо користувач не натиснув "Скасувати"
            const textToInsert = `[${linkText}](${url})`;

            // Вставляємо текст
            postTextInput.value = 
                postTextInput.value.substring(0, start) +
                textToInsert +
                postTextInput.value.substring(end);
            
            postTextInput.focus();
            
            // Встановлюємо курсор/виділення
            if (selectedText) {
                postTextInput.setSelectionRange(start, start + textToInsert.length);
            } else {
                postTextInput.setSelectionRange(start + 1, start + 1 + linkText.length);
            }
            updatePreview();
        }
    });

    // 3. (Опціонально) Додаємо гарячі клавіші
    postTextInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            switch (e.key) {
                case 'b': // Ctrl+B
                    e.preventDefault();
                    wrapText('*', '*', 'жирний текст');
                    break;
                case 'i': // Ctrl+I
                    e.preventDefault();
                    wrapText('_', '_', 'курсив');
                    break;
                case 'k': // Ctrl+K (для посилань)
                    e.preventDefault();
                    toolbarLink.click(); // Імітуємо клік на кнопку посилання
                    break;
            }
        }
    });

    // --- (Далі логіка renderFormFields, updatePreview і т.д. без змін) ---

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
                inputElement.rows = 5;
            } else {
                inputElement = document.createElement('input');
                inputElement.type = 'text';
            }
            inputElement.id = field.id;
            inputElement.name = field.id;
            inputElement.placeholder = field.placeholder || '';
            inputElement.required = true;
            inputElement.addEventListener('input', updatePreview);
            group.appendChild(label);
            group.appendChild(inputElement);
            dynamicFieldsContainer.appendChild(group);
        });
    }

    function updatePreview() {
        const template = templates[templateSelect.value];
        if (!template) return;
        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) { data[key] = value; }
        const markdownText = template.formatter(data);
        previewContent.innerHTML = formatForPreview(markdownText);
    }

    function formatForPreview(text) {
        return text.replace(/\\(.)/g, '$1').replace(/\*(.*?)\*/g, '<b>$1</b>').replace(/_(.*?)_/g, '<i>$1</i>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    }

    function escapeMarkdown(text) {
        if (!text) return '';
        const charsToEscape = '_*[]()~`>#+-=|{}.!';
        return text.split('').map(char => charsToEscape.includes(char) ? '\\' + char : char).join('');
    }

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

        const template = templates[templateSelect.value];
        const formData = new FormData(form);
        const data = {};
        template.fields.forEach(field => data[field.id] = formData.get(field.id));
        const finalPostText = template.formatter(data);
        const submissionData = new FormData();
        submissionData.append('post_text', finalPostText);

        if (isScheduling) {
            submissionData.append('post_at', new Date(formData.get('post_at')).toISOString());
        }

        // --- 🔥 ОНОВЛЕНА ЛОГІКА ЗБОРУ ФАЙЛІВ ---
        const postPhotos = formData.getAll('post_photo');
        if (postPhotos.length > 0) {
            for (const photo of postPhotos) {
                if (photo.size > 0) {
                    submissionData.append('post_photo', photo, photo.name);
                }
            }
        }
        
        const postVideos = formData.getAll('post_video');
        if (postVideos.length > 0) {
            for (const video of postVideos) {
                if (video.size > 0) {
                    submissionData.append('post_video', video, video.name);
                }
            }
        }
        // --- КІНЕЦЬ ОНОВЛЕНОЇ ЛОГІКИ ---

        try {
            if (isScheduling) {
                await schedulePost(submissionData);
            } else {
                await postNewsNow(submissionData);
            }
            statusMessage.textContent = isScheduling ? 'Пост успішно заплановано!' : 'Пост успішно опубліковано!';
            statusMessage.className = 'success';
            form.reset();
            renderFormFields(templateSelect.value);
            updatePreview();
        } catch (error) {
            statusMessage.textContent = 'Помилка! Не вдалося виконати дію.';
            statusMessage.className = 'error';
            console.error(error);
        } finally {
            scheduleBtn.disabled = false;
            postNowBtn.disabled = false;
        }
    }

    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleFormSubmit(true); // Планування
    });

    postNowBtn.addEventListener('click', () => {
        handleFormSubmit(false); // Публікація зараз
    });

    templateSelect.addEventListener('change', () => {
        renderFormFields(templateSelect.value);
        updatePreview();
    });

    renderFormFields(templateSelect.value);
    updatePreview();
});