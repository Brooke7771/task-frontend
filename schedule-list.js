// frontend/schedule-list.js
import { getScheduledPosts, deleteScheduledPost, postScheduledNow } from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    const postListContainer = document.getElementById('postListContainer');
    // const backendUrl = '...'; // ВИДАЛЕНО

    const fetchPosts = async () => {
        try {
            // const response = await fetch(...); // ВИДАЛЕНО
            const posts = await getScheduledPosts(); // ОНОВЛЕНО
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
            
            card.innerHTML = `
                <h2>Пост на ${postDate}</h2>
                <div class="post-preview">${formatForPreview(post.text)}</div>
                <div class="post-actions">
                    <button class="post-now-btn" data-post-id="${post.id}">Опублікувати зараз</button>
                    <button class="delete-btn" data-post-id="${post.id}">Видалити</button>
                </div>
            `;
            postListContainer.appendChild(card);
        });
    };
    
    function formatForPreview(text) {
        return text.replace(/\\(.)/g, '$1').replace(/\*(.*?)\*/g, '<b>$1</b>').replace(/_(.*?)_/g, '<i>$1</i>').replace(/`(.*?)`/g, '<code>$1</code>').replace(/\n/g, '<br>');
    }

    postListContainer.addEventListener('click', async (event) => {
        const target = event.target;
        const postId = target.dataset.postId;
        if (!postId) return;

        let actionPromise;

        if (target.classList.contains('delete-btn')) {
            if (!confirm('Ви впевнені, що хочете видалити цей пост?')) return;
            actionPromise = deleteScheduledPost(postId); // ОНОВЛЕНО
        } else if (target.classList.contains('post-now-btn')) {
            actionPromise = postScheduledNow(postId); // ОНОВЛЕНО
        } else if (target.classList.contains('edit-btn')) {
            alert('Редагування ще не реалізовано.');
            return;
        } else {
            return;
        }

        try {
            target.disabled = true;
            await actionPromise; // Виконуємо дію
            fetchPosts(); // Оновити список
        } catch (error) {
            alert('Сталася помилка.');
            console.error(error);
            target.disabled = false;
        }
    });

    fetchPosts();
});