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

    // --- 🤖 AI IMAGE GENERATION UI ---
    // Inject "Generate Image" button into the form
    const photoGroup = postPhotoInput.closest('.form-group');
    if (photoGroup) {
        // Clear old buttons if any (simple approach: remove custom container if exists)
        const oldContainer = photoGroup.querySelector('.ai-tools-container');
        if(oldContainer) oldContainer.remove();

        // Create container
        const aiContainer = document.createElement('div');
        aiContainer.className = 'ai-tools-container';
        aiContainer.style.cssText = 'display:flex; gap:10px; margin-top:10px; flex-wrap: wrap;';
        photoGroup.appendChild(aiContainer);

        const aiImgBtn = document.createElement('button');
        aiImgBtn.type = 'button';
        aiImgBtn.className = 'btn-sm'; 
        aiImgBtn.style.cssText = 'background: linear-gradient(45deg, #8b5cf6, #d946ef); color:white; border:none; display:flex; align-items:center; gap:6px; font-size:0.85em; padding:6px 12px; border-radius: 6px; cursor: pointer; transition: filter 0.2s;';
        aiImgBtn.innerHTML = '<i data-feather="image" style="width:14px"></i> AI Image (DALL-E)';
        
        aiImgBtn.onmouseover = () => aiImgBtn.style.filter = 'brightness(1.1)';
        aiImgBtn.onmouseout = () => aiImgBtn.style.filter = 'brightness(1)';

        aiImgBtn.onclick = async () => {
             const prompt = prompt("Опишіть зображення, яке хочете згенерувати:");
             if(!prompt) return;

             const origHtml = aiImgBtn.innerHTML;
             aiImgBtn.disabled = true;
             aiImgBtn.innerHTML = '<i data-feather="loader" class="spin" style="width:14px"></i> Creating...';
             feather.replace();

             try {
                const res = await fetch('/api/ai/generate_image', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                
                if(!res.ok) throw new Error(await res.text());
                
                const data = await res.json();
                
                // Show preview directly
                let previewArea = document.getElementById('ai-image-preview');
                if(!previewArea) {
                     previewArea = document.createElement('div');
                     previewArea.id = 'ai-image-preview';
                     previewArea.style.cssText = 'margin-top:15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px; text-align: center;';
                     photoGroup.appendChild(previewArea);
                }
                
                previewArea.innerHTML = `
                    <div style="font-size:0.8em; color:#94a3b8; margin-bottom:8px; text-align: left;">Згенеровано AI:</div>
                    <img src="${data.url}" style="max-width:100%; border-radius:8px; border:1px solid rgba(255,255,255,0.1); box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                    <div style="margin-top:8px; display:flex; gap:10px; justify-content: center;">
                        <a href="${data.url}" target="_blank" class="btn-sm" style="text-decoration:none; background:#334155; color:white; padding: 4px 10px; border-radius:4px; font-size:0.8em;">Відкрити оригінал</a>
                        <button type="button" class="btn-sm" style="background:#ef4444; border:none; color:white; padding: 4px 10px; border-radius:4px; font-size:0.8em;" onclick="this.closest('#ai-image-preview').remove()">Видалити</button>
                    </div>
                `;
             } catch (e) {
                alert("Помилка генерації: " + e.message);
             } finally {
                aiImgBtn.disabled = false;
                aiImgBtn.innerHTML = origHtml;
                feather.replace();
             }
        };
        aiContainer.appendChild(aiImgBtn);
    }

    // --- 🤖 AI SENTIMENT ANALYSIS UI ---
    const aiAnalyzeBtn = document.createElement('button');
    aiAnalyzeBtn.type = 'button'; 
    aiAnalyzeBtn.className = 'btn';
    aiAnalyzeBtn.innerHTML = '<i data-feather="activity"></i> Аналіз тональності';
    aiAnalyzeBtn.style.cssText = 'background: rgba(16, 185, 129, 0.2); border: 1px solid rgba(16, 185, 129, 0.4); color: #34d399; margin-left: 10px;';
    
    // Add inside toolbar if possible, or near text area
    const toolbar = document.querySelector('.markdown-toolbar');
    if(toolbar) {
        toolbar.appendChild(aiAnalyzeBtn);
    } else {
        postTextInput.parentNode.insertBefore(aiAnalyzeBtn, postTextInput);
    }

    aiAnalyzeBtn.onclick = async () => {
        const text = postTextInput.value;
        if (!text) return alert("Введіть текст для аналізу!");

        aiAnalyzeBtn.disabled = true;
        aiAnalyzeBtn.innerHTML = '...';

        try {
            const res = await fetch('/api/ai/analyze_sentiment', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ text })
            });
            const data = await res.json();
            
            let msg = `Вердикт: ${data.verdict}\nОцінка: ${data.score}/10\n`;
            if(data.suggestions && data.suggestions.length > 0) {
                msg += `\nПоради:\n- ${data.suggestions.join('\n- ')}`;
            }
            alert(msg);
        } catch(e) {
            console.error(e);
            alert("Помилка аналізу.");
        } finally {
            aiAnalyzeBtn.disabled = false;
            aiAnalyzeBtn.innerHTML = '<i data-feather="activity"></i> Аналіз тональності';
            feather.replace();
        }
    };
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

    // COMMENTS LOGIC
    const commentsList = document.getElementById('commentsList');
    const newCommentInput = document.getElementById('newCommentInput');
    const sendCommentBtn = document.getElementById('sendCommentBtn');

    if (postId) {
        // Load comments
        fetch(`/api/posts/${postId}/comments`)
            .then(r => r.json())
            .then(comments => {
                commentsList.innerHTML = '';
                if(comments.length === 0) {
                     commentsList.innerHTML = '<div style="text-align: center; color: #64748b; font-size: 0.8em;">Немає коментарів</div>';
                } else {
                    comments.forEach(c => {
                        const div = document.createElement('div');
                        div.style.cssText = 'background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; font-size: 0.9em;';
                        div.innerHTML = `
                            <div style="display:flex; justify-content:space-between; color: #94a3b8; font-size:0.8em; margin-bottom: 4px;">
                                <span>${c.username}</span> 
                                <span>${new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <div style="color: #e2e8f0; white-space: pre-wrap;">${c.text}</div>
                        `;
                        commentsList.appendChild(div);
                    });
                }
            })
            .catch(e => console.error("Error loading comments:", e));

        // Send Comment
        sendCommentBtn.onclick = async () => {
            const text = newCommentInput.value.trim();
            if(!text) return;
            
            try {
                const res = await fetch(`/api/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                if(res.ok) {
                    newCommentInput.value = '';
                    // Reload comments simply by triggering the fetch again or appending
                    // For simplicity, let's just append
                    const c = await res.json();
                     const div = document.createElement('div');
                        div.style.cssText = 'background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px; font-size: 0.9em;';
                        div.innerHTML = `
                            <div style="display:flex; justify-content:space-between; color: #94a3b8; font-size:0.8em; margin-bottom: 4px;">
                                <span>${c.username}</span> 
                                <span>Just now</span>
                            </div>
                            <div style="color: #e2e8f0; white-space: pre-wrap;">${c.text}</div>
                        `;
                    commentsList.appendChild(div);
                    // Remove "No comments" if present
                    if(commentsList.innerText.includes('Немає коментарів')) {
                         commentsList.firstChild.remove();
                    }
                }
            } catch(e) {
                alert("Error sending comment");
            }
        };
    }

    loadPost();
});