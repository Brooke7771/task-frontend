// frontend/schedule-list.js
import { getScheduledPosts, deleteScheduledPost, postScheduledNow } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const postListContainer = document.getElementById('postListContainer');

    const fetchPosts = async () => {
        try {
            const posts = await getScheduledPosts();
            renderPosts(posts);
        } catch (error) {
            postListContainer.innerHTML = `<p class="error">Не вдалося завантажити пости.</p>`;
            console.error(error);
        }
    };

    const renderPosts = (posts) => {
        if (!posts || posts.length === 0) {
            postListContainer.innerHTML = '<p>Запланованих постів немає.</p>';
            return;
        }
        postListContainer.innerHTML = '';
        posts.forEach(post => {
            const card = document.createElement('div');
            card.className = 'task-card';
            const postDate = new Date(post.postAt).toLocaleString('uk-UA');
            
            // --- 🔥 ЗМІНА ТУТ (Додано кнопку "Редагувати") ---
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
    
    function formatForPreview(text) {
        // Замінюємо \n на <br>, але також екрануємо HTML-теги
        let safeText = (text || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        // Форматуємо Markdown *після* екранування
        safeText = safeText.replace(/\\(.)/g, '$1')
            .replace(/\*(.*?)\*/g, '<b>$1</b>')
            .replace(/_(.*?)_/g, '<i>$1</i>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br>');
        return safeText;
    }

    // --- 🔥 ОНОВЛЕНО: 'click' handler (Додано логіку "Edit") ---
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
            // Просто переходимо на нову сторінку редагування
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