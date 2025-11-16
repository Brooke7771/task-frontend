// frontend/schedule-list.js
import { getScheduledPosts, deleteScheduledPost, postScheduledNow } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const postListContainer = document.getElementById('postListContainer');

    const fetchPosts = async () => {
        // ... (без змін)
        try {
            const posts = await getScheduledPosts();
            renderPosts(posts);
        } catch (error) {
            postListContainer.innerHTML = `<p class="error">Не вдалося завантажити пости.</p>`;
            console.error(error);
        }
    };

    const renderPosts = (posts) => {
        // ... (без змін)
        if (!posts || posts.length === 0) {
            postListContainer.innerHTML = '<p>Запланованих постів немає.</p>';
            return;
        }
        postListContainer.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'task-card';
            const postDate = new Date(post.postAt).toLocaleString('uk-UA');
            
            card.innerHTML = `
                <h2>Пост на ${postDate}</h2>
                <div class="post-preview">${formatForPreview(post.text)}</div>
                <div class="post-actions">
                    <button class="post-now-btn" data-post-id="${post.id}">Опублікувати зараз</button>
                    <button class="edit-btn" data-post-id="${post.id}">Редагувати</button>
                    <button class="delete-btn" data-post-id="${post.id}">Видалити</button>
                </div>
            `;
            postListContainer.appendChild(card);
        });
    };
    
    // --- 🔥 ОНОВЛЕНА ФУНКЦІЯ форматування ---
    function formatForPreview(text) {
        if (!text) text = '';
        let safeText = (text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Спочатку обробляємо екрановані символи
        safeText = safeText.replace(/\\(.)/g, '$1');

        // Обробляємо і V1, і V2 форматування
        safeText = safeText
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // **bold** (Legacy)
            .replace(/__(.*?)__/g, '<i>$1</i>')   // __italic__ (Legacy)
            .replace(/\*(.*?)\*/g, '<b>$1</b>')   // *bold* (V2)
            .replace(/_(.*?)_/g, '<i>$1</i>')     // _italic_ (V2)
            .replace(/~(.*?)~/g, '<s>$1</s>')     // ~strikethrough~ (V2)
            .replace(/`(.*?)`/g, '<code>$1</code>') // `code`
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>') // [link](url)
            .replace(/\n/g, '<br>'); // Newlines
        
        return safeText;
    }

    // ... (обробник 'click' без змін) ...
    postListContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const postId = target.dataset.postId;
        if (!postId) return;

        let actionPromise;

        if (target.classList.contains('delete-btn')) {
            if (!confirm('Ви впевнені, що хочете видалити цей пост?')) return;
            actionPromise = deleteScheduledPost(postId);
        } else if (target.classList.contains('post-now-btn')) {
            actionPromise = postScheduledNow(postId);
        } else if (target.classList.contains('edit-btn')) {
            window.location.href = `schedule-edit.html?id=${postId}`;
            return;
        } else {
            return;
        }

        try {
            target.disabled = true;
            await actionPromise;
            fetchPosts(); // Оновити список
        } catch (error) {
            alert('Сталася помилка.');
            console.error(error);
            target.disabled = false;
        }
    });

    fetchPosts();
});