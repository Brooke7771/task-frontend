document.addEventListener("DOMContentLoaded", () => {
    // 1. HTML структура компонента
    const fabHTML = `
    <div class="fab-wrapper" id="fabWrapper">
        <div class="fab-menu">
            <div class="fab-menu-header">Навігація</div>
            <div class="fab-grid">
                <a href="index.html" class="fab-item">
                    <i data-feather="plus-circle"></i> <span>Створити</span>
                </a>
                <a href="schedule.html" class="fab-item">
                    <i data-feather="calendar"></i> <span>Планер</span>
                </a>
                <a href="task-list.html" class="fab-item">
                    <i data-feather="list"></i> <span>Завдання</span>
                </a>
                <a href="schedule-list.html" class="fab-item">
                    <i data-feather="clock"></i> <span>Черга</span>
                </a>
                <a href="chat.html" class="fab-item">
                    <i data-feather="message-circle"></i> <span>AI Чат</span>
                </a>
                <a href="ads.html" class="fab-item">
                    <i data-feather="megaphone"></i> <span>Реклама</span>
                </a>
                <a href="history.html" class="fab-item">
                    <i data-feather="archive"></i> <span>Архів</span>
                </a>
                <a href="settings.html" class="fab-item">
                    <i data-feather="settings"></i> <span>Меню</span>
                </a>
                <a href="admin.html" class="fab-item highlight">
                    <i data-feather="shield"></i> <span>Admin</span>
                </a>
                <a href="#" onclick="logout(); return false;" class="fab-item logout">
                    <i data-feather="log-out"></i> <span>Вийти</span>
                </a>
            </div>
        </div>
        
        <button class="fab-main-btn" id="fabMainBtn">
            <i data-feather="grid" class="fab-icon-open"></i>
            <i data-feather="x" class="fab-icon-close"></i>
        </button>
    </div>
    `;

    // 2. Вставка HTML в кінець body
    document.body.insertAdjacentHTML('beforeend', fabHTML);

    // 3. Ініціалізація іконок (Feather Icons)
    // Перевіряємо, чи підключена бібліотека Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }

    // 4. Логіка роботи (Клік, Закриття)
    const fabWrapper = document.getElementById('fabWrapper');
    const fabBtn = document.getElementById('fabMainBtn');

    fabBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Зупиняємо спливання, щоб не спрацював клік по документ
        fabWrapper.classList.toggle('open');
        fabBtn.classList.toggle('active');
    });

    // Закриття при кліку за межами
    document.addEventListener('click', (e) => {
        if (fabWrapper.classList.contains('open') && !fabWrapper.contains(e.target)) {
            fabWrapper.classList.remove('open');
            fabBtn.classList.remove('active');
        }
    });

    // 5. (БОНУС) Автоматична підсвітка поточної сторінки
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const menuLinks = document.querySelectorAll('.fab-item');
    
    menuLinks.forEach(link => {
        const linkHref = link.getAttribute('href');
        if (linkHref === currentPath) {
            link.style.borderColor = 'var(--color-primary, #6366f1)';
            link.style.background = 'rgba(99, 102, 241, 0.1)';
            link.style.color = 'white';
        }
    });
});