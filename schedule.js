import { schedulePost, postNewsNow, getChannels, backendUrl } from './api.js';

// 1. Визначаємо шаблони (те, чого не вистачало)
const templates = {
    simple: {
        name: '📝 Простий пост',
        fields: [], // Порожньо, бо використовується основне поле
        formatter: (data) => '' // Повертає порожній рядок, щоб не перезаписувати ручний ввід
    },
    news: {
        name: '📰 Новина з заголовком',
        fields: [
            { id: 'news_title', label: 'Заголовок', type: 'input', placeholder: 'Гучний заголовок' },
            { id: 'news_body', label: 'Текст новини', type: 'textarea', placeholder: 'Основний текст...' },
            { id: 'news_source', label: 'Джерело (посилання)', type: 'input', placeholder: 'https://...' }
        ],
        formatter: (data) => {
            let text = `*${escapeMarkdown(data.news_title || 'Заголовок')}*\n\n${escapeMarkdown(data.news_body || '')}`;
            if(data.news_source) text += `\n\n[Джерело](${data.news_source})`;
            return text;
        }
    },
    promo: {
        name: '📢 Рекламний пост',
        fields: [
            { id: 'promo_header', label: 'Заклик', type: 'input', placeholder: 'Увага! Акція!' },
            { id: 'promo_desc', label: 'Опис пропозиції', type: 'textarea', placeholder: 'Деталі...' },
            { id: 'promo_link', label: 'Посилання на кнопку', type: 'input', placeholder: 'https://t.me/...' }
        ],
        formatter: (data) => `*${escapeMarkdown(data.promo_header || 'Акція')}*\n\n${escapeMarkdown(data.promo_desc || '')}\n\n👉 [Детальніше](${data.promo_link || '#'})`
    }
};

// 2. Допоміжна функція екранування (виправляємо помилку в консолі)
function escapeMarkdown(text) {
    if (!text) return '';
    // Екрануємо символи для MarkdownV2, крім тих, що ми хочемо дозволити у простій розмітці
    // Для простоти тут базове екранування, щоб не ламало структуру
    return text.replace(/[_*[\]()~>#+=|{}.!-]/g, '\\$&');
}

document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Елементи DOM
        const templateSelect = document.getElementById('template-select');
        const dynamicFieldsContainer = document.getElementById('dynamic-form-fields');
        const previewContent = document.getElementById('preview-content');
        const form = document.getElementById('postForm');
        const statusMessage = document.getElementById('statusMessage');
        
        // Кнопки
        const scheduleBtn = document.getElementById('scheduleBtn');
        const draftBtn = document.getElementById('draftBtn');
        const postNowBtn = document.getElementById('postNowBtn');
        
        // Поля
        const postAtInput = document.getElementById('post_at');
        const postTextInput = document.getElementById('post_text');
        const postPhotoInput = document.getElementById('post_photo');
        const mediaContainer = document.getElementById('preview-media');

        // Buttons (URL-кнопки): логіка додавання/видалення та оновлення прев'ю
        const buttonsContainer = document.getElementById('buttons-container');
        const addBtn = document.getElementById('add-button-row');

        if (addBtn && buttonsContainer) {
            addBtn.addEventListener('click', () => {
                const row = document.createElement('div');
                row.className = 'button-row';
                row.style.cssText = 'display: flex; gap: 10px; margin-bottom: 8px; align-items: center;';
                
                row.innerHTML = `
                    <input type="text" class="btn-label" placeholder="Текст (напр. Купити)" style="flex:1;">
                    <input type="text" class="btn-url" placeholder="https://..." style="flex:2;">
                    <button type="button" class="btn-remove" style="background:none; border:none; color:#ef4444; cursor:pointer; padding:5px;">
                        <i data-feather="x"></i>
                    </button>
                `;

                // Видалення рядка
                row.querySelector('.btn-remove').addEventListener('click', () => {
                    row.remove();
                    updatePreviewButtons();
                });

                // Оновлення прев'ю при введенні
                row.querySelectorAll('input').forEach(input => {
                    input.addEventListener('input', updatePreviewButtons);
                });

                buttonsContainer.appendChild(row);
                if (window.feather) feather.replace();
                updatePreviewButtons();
            });
        }

        // Збір даних кнопок (URL-кнопки)
        const buttonsData = [];
        document.querySelectorAll('.button-row').forEach(row => {
            const labelEl = row.querySelector('.btn-label');
            const urlEl = row.querySelector('.btn-url');
            const label = labelEl ? labelEl.value.trim() : '';
            const url = urlEl ? urlEl.value.trim() : '';
            
            // Проста валідація
            if (label && url) {
                buttonsData.push([label, url]);
            }
        });
        // Додаємо масив як JSON-рядок
        formData.append('buttons', JSON.stringify(buttonsData));

        // Глобальний доступ для дебагу
        window.postTextInput = postTextInput;

        // --- 1. ІНІЦІАЛІЗАЦІЯ ШАБЛОНІВ ---
        if (templateSelect) {
            // Очищаємо та наповнюємо селект
            templateSelect.innerHTML = '';
            Object.keys(templates).forEach(key => {
                const opt = document.createElement('option');
                opt.value = key;
                opt.textContent = templates[key].name;
                templateSelect.appendChild(opt);
            });

            // Обробник зміни шаблону
            templateSelect.addEventListener('change', (e) => {
                const templateId = e.target.value;
                renderFormFields(templateId);
                updatePreview();
            });
        }

        // Функція рендерингу полів
        function renderFormFields(templateId) {
            if(!dynamicFieldsContainer) return;
            dynamicFieldsContainer.innerHTML = '';
            
            const template = templates[templateId];
            if (!template || !template.fields) return;

            template.fields.forEach(field => {
                const group = document.createElement('div');
                group.className = 'form-group';
                
                const label = document.createElement('label');
                label.textContent = field.label;
                label.style.fontSize = '0.85em';
                label.style.color = '#94a3b8';
                
                let input;
                if (field.type === 'textarea') {
                    input = document.createElement('textarea');
                    input.rows = 3;
                } else {
                    input = document.createElement('input');
                    input.type = 'text';
                }
                
                input.id = field.id;
                input.placeholder = field.placeholder || '';
                input.style.width = '100%';
                
                // Оновлюємо прев'ю при введенні в динамічні поля
                input.addEventListener('input', () => updatePreview(false));

                group.appendChild(label);
                group.appendChild(input);
                dynamicFieldsContainer.appendChild(group);
            });
        }

        // --- 2. МУЛЬТИКАНАЛЬНІСТЬ (Групи та канали) ---
        const channelsDropdown = document.getElementById('channels-dropdown');
        const selectedCountSpan = document.getElementById('selected-count');
        const toggleBtn = document.getElementById('btn-toggle-channels');
        const groupsModal = document.getElementById('groupsModal');
        const manageGroupsBtn = document.getElementById('btn-manage-groups');
        const createGroupBtn = document.getElementById('btn-create-group');
        const groupsList = document.getElementById('groups-list');

        if(toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                channelsDropdown.classList.toggle('hidden');
            });
        }

        const loadChannelsMulti = async () => {
            try {
                const channels = await getChannels();
                if(channelsDropdown) {
                    channelsDropdown.innerHTML = '';
                    channels.forEach(ch => {
                        const label = document.createElement('label');
                        label.className = 'channel-checkbox';
                        label.innerHTML = `
                            <input type="checkbox" name="target_channel_id" value="${ch.telegram_id}">
                            <span>${ch.title}</span>
                        `;
                        const checkbox = label.querySelector('input');
                        checkbox.addEventListener('change', () => {
                            if(checkbox.checked) label.classList.add('checked');
                            else label.classList.remove('checked');
                            updateCount();
                        });
                        channelsDropdown.appendChild(label);
                    });
                }
            } catch (e) { console.error(e); }
        };

        function updateCount() {
            const count = document.querySelectorAll('input[name="target_channel_id"]:checked').length;
            if(selectedCountSpan) selectedCountSpan.textContent = count;
        }

        // Логіка груп
        if(manageGroupsBtn) {
            manageGroupsBtn.addEventListener('click', () => {
                if(groupsModal) groupsModal.style.display = 'flex';
                loadGroups();
            });
        }

        async function loadGroups() {
            try {
                const res = await fetch(`${backendUrl}/api/channel_groups`);
                const groups = await res.json();
                if(groupsList) {
                    groupsList.innerHTML = groups.map(g => `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; background:rgba(255,255,255,0.05); border-radius:8px; margin-bottom:5px;">
                            <span style="font-weight:bold; color:white; cursor:pointer;" onclick="applyGroup('${g.id}')">${g.name} <small style="opacity:0.6">(${g.channel_ids.length} кан.)</small></span>
                            <button class="btn-danger" style="width:24px; height:24px; padding:0; font-size:12px;" onclick="deleteGroup(${g.id})">x</button>
                        </div>
                    `).join('');
                }
                window.currentGroups = groups;
            } catch(e) {}
        }

        window.applyGroup = (groupId) => {
            const group = window.currentGroups.find(g => g.id == groupId);
            if(!group) return;
            document.querySelectorAll('input[name="target_channel_id"]').forEach(cb => {
                cb.checked = false;
                cb.parentElement.classList.remove('checked');
            });
            group.channel_ids.forEach(id => {
                const cb = document.querySelector(`input[value="${id}"]`);
                if(cb) {
                    cb.checked = true;
                    cb.parentElement.classList.add('checked');
                }
            });
            updateCount();
            if(groupsModal) groupsModal.style.display = 'none';
        };

        window.deleteGroup = async (id) => {
            if(!confirm('Видалити групу?')) return;
            await fetch(`${backendUrl}/api/channel_groups/${id}/delete`, { method: 'POST' });
            loadGroups();
        };

        if(createGroupBtn) {
            createGroupBtn.addEventListener('click', async () => {
                const name = document.getElementById('new_group_name').value;
                if(!name) {
                    if (typeof showToast === 'function') showToast('Введіть назву', 'error'); else alert('Введіть назву');
                    return;
                }
                const selected = Array.from(document.querySelectorAll('input[name="target_channel_id"]:checked')).map(cb => cb.value);
                if(selected.length === 0) { if (typeof showToast === 'function') showToast('Оберіть канали для групи', 'error'); else alert('Оберіть канали для групи'); return; }

                await fetch(`${backendUrl}/api/channel_groups`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}`},
                    body: JSON.stringify({ name, channel_ids: selected })
                });
                document.getElementById('new_group_name').value = '';
                loadGroups();
            });
        }

        // --- 3. AI HANDLERS ---
        const aiUrlBtn = document.getElementById('ai_url_btn');
        const aiRewriteBtn = document.getElementById('ai_rewrite_btn');

        if (aiUrlBtn) {
            aiUrlBtn.addEventListener('click', async () => {
                const url = document.getElementById('ai_url_input').value.trim();
                if (!url) { if (typeof showToast === 'function') showToast('Введіть URL', 'error'); else alert('Введіть URL'); return; }
                
                const orig = aiUrlBtn.innerHTML;
                aiUrlBtn.innerHTML = '...'; aiUrlBtn.disabled = true;
                try {
                    const res = await fetch(`${backendUrl}/api/ai/parse_url`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url })
                    });
                    const data = await res.json();
                    if (data.result && postTextInput) {
                        postTextInput.value = data.result;
                        updatePreview(true);
                    }
                } catch (e) { if (typeof showToast === 'function') showToast('Помилка AI', 'error'); else alert('Помилка AI'); }
                finally { aiUrlBtn.innerHTML = orig; aiUrlBtn.disabled = false; }
            });
        }

        if (aiRewriteBtn) {
            aiRewriteBtn.addEventListener('click', async () => {
                const text = postTextInput ? postTextInput.value : '';
                if (!text) { if (typeof showToast === 'function') showToast('Текст порожній', 'error'); else alert('Текст порожній'); return; }
                const tone = document.getElementById('ai_tone_select').value;
                
                const orig = aiRewriteBtn.innerHTML;
                aiRewriteBtn.innerHTML = '...'; aiRewriteBtn.disabled = true;
                try {
                    const res = await fetch(`${backendUrl}/api/ai/rewrite`, {
                        method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ text, tone })
                    });
                    const data = await res.json();
                    if (data.result && postTextInput) {
                        postTextInput.value = data.result;
                        updatePreview(true);
                    }
                } catch (e) { if (typeof showToast === 'function') showToast('Помилка AI', 'error'); else alert('Помилка AI'); }
                finally { aiRewriteBtn.innerHTML = orig; aiRewriteBtn.disabled = false; }
            });
        }

        // --- 4. PREVIEW LOGIC ---
        function updatePreview(isManualEdit = false) {
            let finalText = '';

            if (!isManualEdit && templateSelect) {
                const templateId = templateSelect.value;
                const template = templates[templateId];
                if (template && template.fields.length > 0) {
                    const data = {};
                    template.fields.forEach(field => {
                        const input = document.getElementById(field.id);
                        if (input) data[field.id] = input.value;
                    });
                    finalText = template.formatter(data);
                    if (postTextInput) postTextInput.value = finalText;
                } else {
                    // Якщо шаблон "simple", беремо з основного поля
                    finalText = postTextInput ? postTextInput.value : '';
                }
            } else {
                finalText = postTextInput ? postTextInput.value : '';
            }

            if (previewContent) {
                previewContent.innerHTML = formatForPreview((finalText || '').trimStart());
            }
            
            // Media Preview Handling
            const hasMedia = mediaContainer && mediaContainer.innerHTML !== '';
            const textContentDiv = document.querySelector('.tg-text-content');
            if (hasMedia && (!finalText || finalText.trim() === '') && textContentDiv) {
                textContentDiv.style.display = 'none';
                mediaContainer.style.borderRadius = '12px'; 
            } else if (textContentDiv) {
                textContentDiv.style.display = 'block';
                if(mediaContainer) mediaContainer.style.borderRadius = '12px 12px 0 0';
            }

            // Оновлюємо прев'ю кнопок (якщо є)
            if (typeof updatePreviewButtons === 'function') updatePreviewButtons();
        }

        function formatForPreview(text) {
            if (!text) return '';
            return text
                .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
                .replace(/\*([\s\S]+?)\*/g, '<b>$1</b>') // Bold
                .replace(/_([\s\S]+?)_/g, '<i>$1</i>') // Italic
                .replace(/~([\s\S]+?)~/g, '<s>$1</s>') // Strike
                .replace(/`([^`]+)`/g, '<code>$1</code>') // Code
                .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>') // Link
                .replace(/\n/g, '<br>');
        }

        // --- New: preview buttons rendering ---
        function updatePreviewButtons() {
            const previewContainer = document.getElementById('preview-buttons');
            if (!previewContainer) return;
            
            previewContainer.innerHTML = '';
            const rows = document.querySelectorAll('.button-row');
            
            rows.forEach(row => {
                const textEl = row.querySelector('.btn-label');
                const text = textEl ? textEl.value : '';
                if (text && text.trim()) {
                    const btnDiv = document.createElement('div');
                    btnDiv.style.cssText = 'background: rgba(255,255,255,0.1); padding: 8px 15px; border-radius: 8px; font-size: 0.9em; cursor: default; text-align: center; color: #5eb5f7; font-weight: 600;';
                    btnDiv.textContent = text;
                    previewContainer.appendChild(btnDiv);
                }
            });
        }

        // --- 5. ОБРОБКА ВІДПРАВКИ ---
        async function handleFormSubmit(mode) {
            if(statusMessage) {
                statusMessage.textContent = 'Обробка...';
                statusMessage.className = '';
                statusMessage.style.display = 'block';
            }
            
            if (scheduleBtn) scheduleBtn.disabled = true;
            if (draftBtn) draftBtn.disabled = true;
            if (postNowBtn) postNowBtn.disabled = true;

            const finalText = postTextInput ? postTextInput.value : '';
            
            // Перевірки
            if (mode === 'schedule' && postAtInput && !postAtInput.value) {
                if (typeof showToast === 'function') showToast('Вкажіть дату для планування', 'error'); else alert('Вкажіть дату для планування');
                resetBtns(); return;
            }
            if (!finalText && mode !== 'draft') {
                if (typeof showToast === 'function') showToast('Текст не може бути порожнім', 'error'); else alert('Текст не може бути порожнім');
                resetBtns(); return;
            }

            const formData = new FormData();
            formData.append('post_text', finalText);
            
            // Канали
            const checkboxes = document.querySelectorAll('input[name="target_channel_id"]:checked');
            if (checkboxes.length === 0 && mode !== 'draft') {
                if (typeof showToast === 'function') showToast('Оберіть хоча б один канал', 'error'); else alert('Оберіть хоча б один канал');
                resetBtns(); return;
            }
            checkboxes.forEach(cb => formData.append('target_channel_id', cb.value));

            // Статус і Дата
            if (mode === 'draft') {
                formData.append('is_draft', 'true');
                formData.append('post_at', postAtInput && postAtInput.value ? new Date(postAtInput.value).toISOString() : new Date().toISOString());
            } else if (mode === 'schedule') {
                formData.append('is_draft', 'false');
                formData.append('post_at', new Date(postAtInput.value).toISOString());
            }

            // Файли
            if (form) {
                const nativeFormData = new FormData(form);
                const files = nativeFormData.getAll('post_photo');
                files.forEach(file => {
                    if (file.size > 0) formData.append('post_photo', file, file.name);
                });
            }

            try {
                let response;
                if (mode === 'now') response = await postNewsNow(formData);
                else response = await schedulePost(formData);

                if (response && response.success) {
                    statusMessage.textContent = 'Успішно!';
                    statusMessage.className = 'success';
                    if(form) form.reset();
                    if(mediaContainer) mediaContainer.innerHTML = '';
                    if(postTextInput) postTextInput.value = '';
                    // Очищаємо кнопки після успішної відправки
                    if (buttonsContainer) buttonsContainer.innerHTML = '';
                    updatePreview();
                    setTimeout(() => { if(statusMessage) statusMessage.style.display='none'; }, 3000);
                } else {
                    throw new Error('Помилка сервера');
                }
            } catch (e) {
                console.error(e);
                statusMessage.textContent = 'Помилка відправки';
                statusMessage.className = 'error';
            } finally {
                resetBtns();
            }
        }

        function resetBtns() {
            if (scheduleBtn) scheduleBtn.disabled = false;
            if (draftBtn) draftBtn.disabled = false;
            if (postNowBtn) postNowBtn.disabled = false;
        }

        // Прив'язка кнопок
        if(form) form.addEventListener('submit', (e) => { e.preventDefault(); handleFormSubmit('schedule'); });
        if(draftBtn) draftBtn.addEventListener('click', (e) => { e.preventDefault(); handleFormSubmit('draft'); });
        if(postNowBtn) postNowBtn.addEventListener('click', (e) => { e.preventDefault(); handleFormSubmit('now'); });
        if(postTextInput) postTextInput.addEventListener('input', () => updatePreview(true));

        // Auto Tags
        const btnTags = document.getElementById('btn-auto-tags');
        if(btnTags) {
            btnTags.addEventListener('click', async () => {
                const textArea = document.getElementById('post_text');
                const text = textArea.value;
                if(!text) return alert("Спочатку введіть текст поста");
                
                const originalHtml = btnTags.innerHTML;
                btnTags.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Thinking...';
                btnTags.disabled = true;
                
                try {
                    const res = await fetch('/api/ai/generate_tags', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': localStorage.getItem('token') },
                        body: JSON.stringify({ text })
                    });
                    
                    if(res.ok) {
                        const data = await res.json();
                        if(data.tags && data.tags.length > 0) {
                            textArea.value += "\n\n" + data.tags.join(' ');
                        }
                    } else {
                        console.error("AI Error");
                    }
                } catch(e) {
                    console.error(e);
                } finally {
                    btnTags.innerHTML = originalHtml;
                    btnTags.disabled = false;
                    if(window.feather) feather.replace();
                }
            });
        }

        // Ініціалізація сторінки
        if (typeof loadChannelsMulti === 'function') {
             loadChannelsMulti();
        } else {
             console.warn("loadChannelsMulti is not defined");
        }
        
        if(templateSelect) renderFormFields(templateSelect.value);
        if (typeof updatePreview === 'function') updatePreview();

    } catch (e) {
        console.error("Initialization error:", e);
    }
});