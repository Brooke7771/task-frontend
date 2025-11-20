// frontend/schedule-edit.js
import { getScheduledPostById, updateScheduledPost } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('editForm');
    const postTextInput = document.getElementById('post_text');
    const postAtInput = document.getElementById('post_at');
    const saveBtn = document.getElementById('saveBtn');
    const statusMessage = document.getElementById('statusMessage');
    const currentMediaContainer = document.getElementById('currentMedia');
    const currentMediaPreview = document.getElementById('currentMediaPreview');
    
    // --- 🔥 ДОДАНО ---
    const previewContent = document.getElementById('preview-content');
    const postPhotoInput = document.getElementById('post_photo');
    const postVideoInput = document.getElementById('post_video');
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
    let postId = null;

    // --- 🔥 НОВА ФУНКЦІЯ: форматування для попереднього перегляду (Telegram-like MarkdownV2) ---
    // (Вона обробляє і старий, і новий Markdown, щоб ви бачили коректний результат)
    function formatForPreview(text) {
        if (!text) return '';
        // 1. Escape HTML tags to avoid XSS
        let html = text
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. Telegram-like MarkdownV2 handling (spoiler, bold, italic, strike, code, code block, links)
        html = html.replace(/\|\|(.*?)\|\|/g, '<span class="tg-spoiler" onclick="this.classList.toggle(\'revealed\')">$1</span>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
        html = html.replace(/(?<!\\)\*(.*?)(?<!\\)\*/g, '<b>$1</b>');
        html = html.replace(/__(.*?)__/g, '<i>$1</i>');
        html = html.replace(/(?<!\\)_(.*?)(?<!\\)_/g, '<i>$1</i>');
        html = html.replace(/(?<!\\)~(.*?)(?<!\\)~/g, '<s>$1</s>');
        html = html.replace(/(?<!\\)`(.*?)(?<!\\)`/g, '<code>$1</code>');
        html = html.replace(/```(.*?)```/gs, '<pre>$1</pre>');
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');
        html = html.replace(/\\(.)/g, '$1');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    // === Медійний preview: використовуємо контейнер з HTML і оновлюємо час ===
    const mediaContainer = document.getElementById('preview-media');
    const timeBadge = document.getElementById('preview-time');
    const updateTime = () => {
        if (timeBadge) {
            const now = new Date();
            timeBadge.textContent = now.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' });
        }
    };
    updateTime();
    setInterval(updateTime, 60000);

    const handleFilePreview = (input) => {
        if (!input) return;
        input.addEventListener('change', function() {
            if (currentMediaPreview) currentMediaPreview.style.display = 'none';
            if (!mediaContainer) return;
            mediaContainer.innerHTML = '';
            mediaContainer.style.display = 'none';
            if (this.files && this.files.length > 0) {
                const file = this.files[0];
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
    };

    if (postPhotoInput) handleFilePreview(postPhotoInput);
    if (postVideoInput) handleFilePreview(postVideoInput);

    // --- 🔥 НОВА ФУНКЦІЯ: оновлення прев'ю ---
    function updatePreview(isManualEdit = false) {
        // ... код отримання шаблону ...

        // 1. Оновлюємо текст
        if (postTextInput && previewContent) {
            previewContent.innerHTML = formatForPreview(postTextInput.value);
        }

        // 2. 🔥 ДОДАНО: Керування класами для медіа
        const textIsEmpty = !postTextInput.value || postTextInput.value.trim() === '';
        const hasMedia = mediaContainer.style.display !== 'none' && mediaContainer.innerHTML !== '';
        
        if (hasMedia && textIsEmpty) {
            // Якщо є тільки фото без тексту, ховаємо блок тексту, щоб фото мало правильні кути знизу
            document.querySelector('.tg-text-content').style.display = 'none';
            mediaContainer.style.borderRadius = '12px'; // Скруглюємо все фото
        } else {
            // Якщо є текст, показуємо його
            document.querySelector('.tg-text-content').style.display = 'block';
            mediaContainer.style.borderRadius = '12px 12px 0 0'; // Скруглюємо тільки верх
        }
    }
    // --- (кінець нових функцій) ---


    // Функція для форматування дати для <input type="datetime-local">
    const formatDateTimeLocal = (isoString) => {
        // ... (без змін)
        if (!isoString) return '';
        const date = new Date(isoString);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    };

    // Завантажуємо дані поста при відкритті сторінки
    const loadPost = async () => {
        try {
            const params = new URLSearchParams(window.location.search);
            postId = params.get('id');
            if (!postId) {
                statusMessage.textContent = 'Помилка: ID поста не знайдено.';
                statusMessage.className = 'error';
                return;
            }

            const post = await getScheduledPostById(postId);

            postTextInput.value = post.text;
            postAtInput.value = formatDateTimeLocal(post.postAt);
            
            updatePreview(); // <-- 🔥 ОНОВЛЮЄМО ПРЕВ'Ю ПІСЛЯ ЗАВАНТАЖЕННЯ

            // --- (Логіка відображення медіа без змін) ---
            if (post.photoIds && post.photoIds.length > 0) {
                currentMediaPreview.textContent = `[Поточне медіа: ФОТО (${post.photoIds.length} шт)]`;
                currentMediaContainer.style.display = 'block';
            } else if (post.videoIds && post.videoIds.length > 0) {
                currentMediaPreview.textContent = `[Поточне медіа: ВІДЕО (${post.videoIds.length} шт)]`;
                currentMediaContainer.style.display = 'block';
            } else {
                currentMediaContainer.style.display = 'none';
            }

        } catch (error) {
            statusMessage.textContent = 'Не вдалося завантажити пост для редагування.';
            statusMessage.className = 'error';
            console.error(error);
        }
    };

    // Обробник збереження форми
    form.addEventListener('submit', async (event) => {
        // ... (логіка submit без змін) ...
        event.preventDefault();
        statusMessage.textContent = 'Збереження змін...';
        statusMessage.className = '';
        saveBtn.disabled = true;

        const formData = new FormData(form);
        
        const localDate = new Date(formData.get('post_at'));
        formData.set('post_at', localDate.toISOString());

        try {
            await updateScheduledPost(postId, formData);
            statusMessage.textContent = 'Пост успішно оновлено!';
            statusMessage.className = 'success';
            
            setTimeout(() => {
                window.location.href = 'schedule-list.html';
            }, 2000);

        } catch (error) {
            statusMessage.textContent = 'Помилка! Не вдалося оновити пост.';
            statusMessage.className = 'error';
            console.error(error);
            saveBtn.disabled = false;
        }
    });

    // --- 🔥 ДОДАНО: Слухач для оновлення прев'ю під час друку ---
    postTextInput.addEventListener('input', updatePreview);

    loadPost();
});