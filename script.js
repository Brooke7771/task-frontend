import { createTask } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const templateSelect = document.getElementById('template-select');
    const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
    const previewContent = document.getElementById('preview-content');
    const form = document.getElementById('taskForm');
    const statusMessage = document.getElementById('statusMessage');
    
    // Визначення шаблонів
    const templates = {
        simple: {
            name: 'Просте повідомлення',
            fields: [
                { id: 'main_text', label: 'Основний текст', type: 'textarea', placeholder: 'Введіть текст повідомлення...' }
            ],
            formatter: (data) => escapeMarkdown(data.main_text || '')
        },
        announcement: {
            name: 'Оголошення',
            fields: [
                { id: 'title', label: 'Заголовок', type: 'input', placeholder: 'Важлива новина' },
                { id: 'body', label: 'Текст оголошення', type: 'textarea', placeholder: 'Що сталося...' }
            ],
            formatter: (data) => `*${escapeMarkdown(data.title || 'Без заголовка')}*\n\n${escapeMarkdown(data.body || '')}`
        },
        checklist: {
            name: 'Завдання зі списком',
            fields: [
                { id: 'topic', label: 'Тема завдання', type: 'input', placeholder: 'Наприклад, підготовка до заходу' },
                { id: 'items', label: 'Список пунктів (кожен з нового рядка)', type: 'textarea', placeholder: 'Пункт 1\nПункт 2' },
                { id: 'details', label: 'Додаткова інформація', type: 'textarea', placeholder: 'Будь-які деталі...' }
            ],
            formatter: (data) => {
                const itemsList = (data.items || '')
                    .split('\n')
                    .filter(item => item.trim() !== '') 
                    .map(item => `\\- ${escapeMarkdown(item.trim())}`) 
                    .join('\n');
                return `*${escapeMarkdown(data.topic || 'Завдання')}*\n\n${itemsList}\n\n_${escapeMarkdown(data.details || '')}_`;
            }
        },
        report: {
            name: 'Звіт про роботу',
            fields: [
                { id: 'report_name', label: 'Назва звіту', type: 'input', placeholder: 'Звіт за тиждень' },
                { id: 'done_work', label: 'Що зроблено?', type: 'textarea', placeholder: 'Опис виконаної роботи...' },
                { id: 'issues', label: 'Проблеми/Питання', type: 'textarea', placeholder: 'З якими труднощами зіткнулися...' }
            ],
            formatter: (data) => `*Звіт: ${escapeMarkdown(data.report_name || 'Без назви')}*\n\n*Що зроблено:*\n${escapeMarkdown(data.done_work || 'Нічого не вказано')}\n\n*Проблеми:*\n${escapeMarkdown(data.issues || 'Немає')}`
        },
        urgent: {
            name: 'Термінове завдання',
            fields: [
                { id: 'task_summary', label: 'Суть завдання', type: 'input', placeholder: 'Що потрібно зробити терміново' },
                { id: 'deadline', label: 'Кінцевий термін', type: 'input', placeholder: 'Наприклад, 2 години або 18:00' }
            ],
            formatter: (data) => `*❗️ ТЕРМІНОВО: ${escapeMarkdown(data.task_summary || 'Не вказано')}* ❗️\n\n_Кінцевий термін:_ \`${escapeMarkdown(data.deadline || 'Негайно')}\``
        }
    };

    // Функція для генерації полів форми
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
            
            // Додаємо слухач для оновлення прев'ю при введенні
            inputElement.addEventListener('input', () => updatePreview());

            group.appendChild(label);
            group.appendChild(inputElement);
            dynamicFieldsContainer.appendChild(group);
        });
    }
    
    // --- 🔥 ВИПРАВЛЕНА ФУНКЦІЯ updatePreview ---
    function updatePreview() {
        const templateId = templateSelect.value;
        const template = templates[templateId];
        if (!template) return;

        // Збираємо дані з форми
        const formData = new FormData(form);
        const data = {};
        // Важливо: проходимося по полях шаблону, щоб взяти значення за ID
        template.fields.forEach(field => {
            const input = document.getElementById(field.id);
            if (input) data[field.id] = input.value;
        });
        
        // Генеруємо Markdown текст
        const markdownText = template.formatter(data);
        
        // Оновлюємо HTML прев'ю
        if (previewContent) {
            previewContent.innerHTML = formatForPreview(markdownText);
        }
    }
    
    // Функція форматування для HTML-прев'ю
    function formatForPreview(text) {
        if (!text) return '';

        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // Обробка MarkdownV2
        html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
        html = html.replace(/\*([\s\S]+?)\*/g, '<b>$1</b>'); 
        html = html.replace(/_([\s\S]+?)_/g, '<i>$1</i>');
        html = html.replace(/~([\s\S]+?)~/g, '<s>$1</s>');
        html = html.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="tg-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/\\([-.!])/g, '$1'); // Прибираємо екранування символів для прев'ю
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    // Функція для екранування символів MarkdownV2 (для відправки на сервер)
    function escapeMarkdown(text) {
        if (!text) return '';
        const charsToEscape = '_*[]()~`>#+-=|{}.!';
        return text.split('').map(char => charsToEscape.includes(char) ? '\\' + char : char).join('');
    }

    // Обробник відправки форми
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        statusMessage.textContent = 'Надсилаємо завдання...';
        statusMessage.className = '';

        const templateId = templateSelect.value;
        const template = templates[templateId];

        // Збираємо фінальний текст
        const formData = new FormData(form);
        const data = {};
        template.fields.forEach(field => data[field.id] = formData.get(field.id));
        
        const finalTaskText = template.formatter(data);
        
        const submissionData = new FormData();
        submissionData.append('task_text', finalTaskText);
        submissionData.append('people_needed', formData.get('people_needed'));
        if (formData.get('task_photo')?.size > 0) {
            submissionData.append('task_photo', formData.get('task_photo'));
        }

        try {
            await createTask(submissionData);

            statusMessage.textContent = 'Завдання успішно створено!';
            statusMessage.className = 'success';
            form.reset();
            renderFormFields(templateSelect.value);
            updatePreview();
        } catch (error) {
            console.error('Не вдалося відправити завдання:', error);
            statusMessage.textContent = 'Помилка! Не вдалося створити завдання.';
            statusMessage.className = 'error';
        }
    });

    // Ініціалізація
    templateSelect.addEventListener('change', () => {
        renderFormFields(templateSelect.value);
        updatePreview();
    });
    renderFormFields(templateSelect.value);
    updatePreview();
});