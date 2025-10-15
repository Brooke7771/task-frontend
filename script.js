document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('taskForm');
    const statusMessage = document.getElementById('statusMessage');
    
    // ВАЖЛИВО: Замініть на URL вашого бек-енду, коли він буде в інтернеті
    const backendUrl = 'https://my-telegram-task-bot-5c4258bd3f9b.herokuapp.com/submit_task';

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Зупиняємо стандартну відправку форми

        statusMessage.textContent = 'Надсилаємо завдання...';
        statusMessage.className = '';

        // Збираємо дані з форми за допомогою FormData
        const formData = new FormData(form);

        try {
            const response = await fetch(backendUrl, {
                method: 'POST',
                body: formData,
                // Для FormData браузер сам встановить правильний Content-Type з boundary
            });

            if (response.ok) {
                statusMessage.textContent = 'Завдання успішно створено!';
                statusMessage.className = 'success';
                form.reset(); // Очищуємо форму
            } else {
                const errorText = await response.text();
                throw new Error(`Помилка сервера: ${response.status} ${errorText}`);
            }
        } catch (error) {
            console.error('Не вдалося відправити завдання:', error);
            statusMessage.textContent = 'Помилка! Не вдалося створити завдання.';
            statusMessage.className = 'error';
        }
    });
});