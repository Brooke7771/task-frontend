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
    // Видаляємо/ховаємо старий блок "Поточне медіа" — прев'ю показуємо в inline preview
    if (currentMediaContainer) currentMediaContainer.style.display = 'none';
    
    // Додамо кнопку "Зберегти як чернетку" динамічно, якщо її немає
    let draftBtn = document.getElementById('draftBtn');
    if (!draftBtn) {
        draftBtn = document.createElement('button');
        draftBtn.type = 'button';
        draftBtn.id = 'draftBtn';
        draftBtn.className = 'btn';
        draftBtn.style.cssText = 'background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); margin-right: 10px;';
        draftBtn.innerHTML = '<i data-feather="file-text"></i> В чернетку';
        // Вставляємо перед кнопкою Save
        saveBtn.parentNode.insertBefore(draftBtn, saveBtn);
        if (typeof feather !== 'undefined') feather.replace();
    }

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
        postTextInput.value = postTextInput.value.substring(0, start) + startTag + textToWrap + endTag + postTextInput.value.substring(end);
        postTextInput.focus();
        postTextInput.setSelectionRange(start + startTag.length, start + startTag.length + textToWrap.length);
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
        const url = prompt('URL:', 'https://');
        if (url) wrapText('[', `](${url})`, 'текст');
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
            // .trimStart() видаляє порожні рядки на самому початку тексту
            const text = (postTextInput.value || '').trimStart(); 
            previewContent.innerHTML = formatForPreview(text);
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
                // show placeholder in inline preview instead of old block
                // currentMediaPreview.textContent = `[Поточне медіа: ФОТО (${post.photoIds.length} шт)]`;
                if (currentMediaContainer) currentMediaContainer.style.display = 'none';
            } else if (post.videoIds && post.videoIds.length > 0) {
                // currentMediaPreview.textContent = `[Поточне медіа: ВІДЕО (${post.videoIds.length} шт)]`;
                if (currentMediaContainer) currentMediaContainer.style.display = 'none';
            } else {
                if (currentMediaContainer) currentMediaContainer.style.display = 'none';
            }

        } catch (error) {
            statusMessage.textContent = 'Не вдалося завантажити пост для редагування.';
            statusMessage.className = 'error';
            console.error(error);
        }
    };

    // 🔥 УНІВЕРСАЛЬНА ФУНКЦІЯ ЗБЕРЕЖЕННЯ
    const handleUpdate = async (isDraft) => {
        statusMessage.textContent = 'Збереження...';
        statusMessage.className = '';
        saveBtn.disabled = true;
        draftBtn.disabled = true;

        const formData = new FormData(form);
        
        // Форматуємо дату
        const dateVal = formData.get('post_at');
        if (dateVal) {
            const localDate = new Date(dateVal);
            formData.set('post_at', localDate.toISOString());
        }

        // 🔥 Передаємо статус
        formData.append('is_draft', isDraft ? 'true' : 'false');

        try {
            await updateScheduledPost(postId, formData);
            statusMessage.textContent = isDraft ? 'Збережено як чернетка' : 'Успішно заплановано!';
            statusMessage.className = 'success';
            
            setTimeout(() => {
                window.location.href = 'schedule-list.html';
            }, 1500);

        } catch (error) {
            statusMessage.textContent = 'Помилка оновлення.';
            statusMessage.className = 'error';
            console.error(error);
            saveBtn.disabled = false;
            draftBtn.disabled = false;
        }
    };

    // 1. Кнопка "Зберегти зміни" (Запланувати) -> is_draft = false
    form.addEventListener('submit', (event) => {
        event.preventDefault();
        handleUpdate(false); 
    });

    // 2. Кнопка "В чернетку" -> is_draft = true
    draftBtn.addEventListener('click', (event) => {
        event.preventDefault();
        handleUpdate(true);
    });

    // --- 🔥 ДОДАНО: Слухач для оновлення прев'ю під час друку ---
    postTextInput.addEventListener('input', updatePreview);

    loadPost();
});