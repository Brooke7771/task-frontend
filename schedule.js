document.addEventListener('DOMContentLoaded', () => {
    const templateSelect = document.getElementById('template-select');
    const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
    const previewContent = document.getElementById('preview-content');
    const form = document.getElementById('postForm');
    const statusMessage = document.getElementById('statusMessage');
    const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com';

    const templates = {
        // ... (тут можна додати багато шаблонів)
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
        }
        // ... додайте ще шаблонів за аналогією
    };

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

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        statusMessage.textContent = 'Плануємо пост...';
        statusMessage.className = '';
        const template = templates[templateSelect.value];
        const formData = new FormData(form);
        const data = {};
        template.fields.forEach(field => data[field.id] = formData.get(field.id));
        const finalPostText = template.formatter(data);
        const submissionData = new FormData();
        submissionData.append('post_text', finalPostText);
        const postAtValue = formData.get('post_at');
        if (postAtValue) {
            submissionData.append('post_at', new Date(postAtValue).toISOString());
        }
        if (formData.get('post_photo')?.size > 0) {
            submissionData.append('post_photo', formData.get('post_photo'));
        }
        try {
            const response = await fetch(`${backendUrl}/api/schedule_post`, {
                method: 'POST',
                body: submissionData,
            });
            if (!response.ok) throw new Error(`Помилка сервера: ${response.status}`);
            statusMessage.textContent = 'Пост успішно заплановано!';
            statusMessage.className = 'success';
            form.reset();
            renderFormFields(templateSelect.value);
            updatePreview();
        } catch (error) {
            statusMessage.textContent = 'Помилка! Не вдалося запланувати пост.';
            statusMessage.className = 'error';
            console.error(error);
        }
    });

    templateSelect.addEventListener('change', () => {
        renderFormFields(templateSelect.value);
        updatePreview();
    });

    renderFormFields(templateSelect.value);
    updatePreview();
});