import { createTask } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // Елементи DOM
    const templateSelect = document.getElementById('template-select');
    const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
    const previewContent = document.getElementById('preview-content');
    const form = document.getElementById('taskForm');
    const statusMessage = document.getElementById('statusMessage');
    
    // Видалено: const backendUrl = '...'; // Тепер це не потрібно, бо URL є в api.js

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
                // --- ОСНОВНА ЗМІНА ТУТ ---
                // Додаємо екранування для дефіса, який створює список
                const itemsList = (data.items || '')
                    .split('\n')
                    .filter(item => item.trim() !== '') // Ігноруємо порожні рядки
                    .map(item => `\\- ${escapeMarkdown(item.trim())}`) // Додаємо \\-
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
            inputElement.addEventListener('input', updatePreview);

            group.appendChild(label);
            group.appendChild(inputElement);
            dynamicFieldsContainer.appendChild(group);
        });
    }
    
    // Функція для оновлення попереднього перегляду
    function updatePreview() {
        const templateId = templateSelect.value;
        const template = templates[templateId];
        if (!template) return;

        const formData = new FormData(form);
        const data = {};
        for (const [key, value] of formData.entries()) {
            data[key] = value;
        }
        
        const markdownText = template.formatter(data);
        previewContent.innerHTML = formatForPreview(markdownText);
    }
    
    // Функція для перетворення Markdown в HTML для прев'ю
    // 🔥 Оновлена функція форматування (Виправляє баг №2)
    function formatForPreview(text) {
        if (!text) return '';

        // 1. Спочатку екрануємо HTML, щоб уникнути ін'єкцій, 
        // але НЕ чіпаємо поки що символи Markdown
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. Обробка MarkdownV2
        // Використовуємо [\s\S] замість ., щоб захоплювати переноси рядків
        
        // Code Block: ```code```
        html = html.replace(/```([\s\S]*?)```/g, '<pre>$1</pre>');

        // Inline Code: `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Bold: *text* (Telegram style) та **text** (Markdown style)
        // Важливо: спочатку обробляємо жирний, потім курсив
        html = html.replace(/\*([\s\S]+?)\*/g, '<b>$1</b>'); 
        
        // Italic: _text_ та __text__
        html = html.replace(/_([\s\S]+?)_/g, '<i>$1</i>');

        // Strikethrough: ~text~
        html = html.replace(/~([\s\S]+?)~/g, '<s>$1</s>');

        // Spoiler: ||text||
        html = html.replace(/\|\|([\s\S]+?)\|\|/g, '<span class="tg-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');

        // Links: [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

        // 3. Обробка переносів рядків
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    // Функція для екранування символів MarkdownV2
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

        // --- ВИПРАВЛЕНИЙ БЛОК ---
        try {
            // Використовуємо імпортовану функцію 'createTask' замість 'fetch'
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
        // --- КІНЕЦЬ ВИПРАВЛЕНОГО БЛОКУ ---
    });

    // Ініціалізація
    templateSelect.addEventListener('change', () => {
        renderFormFields(templateSelect.value);
        updatePreview();
    });
    renderFormFields(templateSelect.value);
    updatePreview();
});