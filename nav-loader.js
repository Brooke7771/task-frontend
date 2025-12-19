document.addEventListener("DOMContentLoaded", () => {
    // 1. Видаляємо старі елементи навігації, якщо вони є в HTML
    const oldFab = document.querySelector('.fab-container');
    const oldMobileNav = document.querySelector('.mobile-nav');
    if (oldFab) oldFab.remove();
    if (oldMobileNav) oldMobileNav.remove();

    // 2. CSS стилі (вбудовані для зручності)
    const navStyles = `
    <style>
        /* --- CSS Змінні (базуються на вашому style.css) --- */
        :root {
            --nav-width-collapsed: 70px;
            --nav-width-expanded: 240px;
            --nav-bg: rgba(15, 23, 42, 0.7);
            --nav-border: 1px solid rgba(255, 255, 255, 0.08);
            --nav-blur: blur(20px);
            --nav-z-index: 9999;
        }

        /* --- DESKTOP SIDEBAR --- */
        .cosmic-sidebar {
            position: fixed;
            top: 0; left: 0;
            height: 100vh;
            width: var(--nav-width-collapsed);
            background: var(--nav-bg);
            backdrop-filter: var(--nav-blur);
            -webkit-backdrop-filter: var(--nav-blur);
            border-right: var(--nav-border);
            z-index: var(--nav-z-index);
            display: flex;
            flex-direction: column;
            transition: width 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
            overflow: hidden;
            padding: 20px 0;
        }

        .cosmic-sidebar:hover {
            width: var(--nav-width-expanded);
            background: rgba(15, 23, 42, 0.9);
            box-shadow: 10px 0 30px rgba(0,0,0,0.3);
        }

        /* Логотип */
        .nav-logo {
            display: flex;
            align-items: center;
            justify-content: center; /* Центруємо іконку */
            height: 50px;
            margin-bottom: 30px;
            color: white;
            font-weight: 800;
            font-size: 1.2rem;
            text-decoration: none;
            white-space: nowrap;
            overflow: hidden;
        }
        .nav-logo i { flex-shrink: 0; width: 24px; height: 24px; color: var(--color-primary); }
        .nav-logo span { opacity: 0; margin-left: 15px; transition: opacity 0.2s; }
        .cosmic-sidebar:hover .nav-logo span { opacity: 1; }
        .cosmic-sidebar:hover .nav-logo { justify-content: flex-start; padding-left: 22px; }

        /* Посилання */
        .nav-links {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 0 10px;
            overflow-y: auto;
            scrollbar-width: none; /* Firefox */
        }
        .nav-links::-webkit-scrollbar { display: none; }

        .nav-item {
            display: flex;
            align-items: center;
            height: 48px;
            padding: 0 12px;
            color: #94a3b8;
            text-decoration: none;
            border-radius: 12px;
            transition: all 0.2s;
            white-space: nowrap;
            cursor: pointer;
            position: relative;
        }

        .nav-item:hover {
            background: rgba(255, 255, 255, 0.05);
            color: white;
        }

        .nav-item.active {
            background: rgba(var(--color-primary-rgb), 0.15);
            color: white;
        }
        .nav-item.active::before {
            content: ''; position: absolute; left: 0; top: 10%; height: 80%; width: 3px;
            background: var(--color-primary); border-radius: 0 4px 4px 0;
            box-shadow: 0 0 10px var(--color-primary);
        }

        .nav-item i {
            width: 24px; height: 24px; flex-shrink: 0;
            transition: transform 0.2s;
        }
        .nav-item:hover i { transform: scale(1.1); }

        .nav-text {
            margin-left: 15px;
            opacity: 0;
            transform: translateX(-10px);
            transition: all 0.3s;
            font-weight: 500;
            font-size: 0.95rem;
        }
        
        .cosmic-sidebar:hover .nav-text {
            opacity: 1;
            transform: translateX(0);
        }

        /* Роздільник */
        .nav-divider {
            height: 1px;
            background: rgba(255,255,255,0.1);
            margin: 10px 15px;
        }

        /* Logout */
        .nav-bottom {
            margin-top: auto;
            padding: 0 10px;
        }
        .item-logout:hover { color: #f87171; background: rgba(220, 38, 38, 0.1); }

        /* --- MOBILE BOTTOM BAR --- */
        .cosmic-mobile-bar {
            display: none;
            position: fixed;
            bottom: 20px; left: 50%;
            transform: translateX(-50%);
            width: 92%; max-width: 450px;
            height: 70px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(25px);
            -webkit-backdrop-filter: blur(25px);
            border: 1px solid rgba(255, 255, 255, 0.15);
            border-radius: 25px;
            z-index: 9999;
            box-shadow: 0 10px 40px -10px rgba(0,0,0,0.5);
            justify-content: space-between;
            padding: 0 15px;
            align-items: center;
        }

        .mob-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            color: #94a3b8;
            text-decoration: none;
            font-size: 0.7rem;
            font-weight: 600;
            width: 60px;
            height: 100%;
            gap: 4px;
            transition: 0.2s;
            position: relative;
        }
        .mob-item i { width: 24px; height: 24px; }
        
        .mob-item.active { color: white; }
        .mob-item.active i { color: var(--color-primary); filter: drop-shadow(0 0 8px rgba(var(--color-primary-rgb), 0.6)); transform: translateY(-3px); }
        .mob-item.active span { opacity: 1; }

        /* Mobile Menu Overlay (More) */
        .mobile-overlay-menu {
            position: fixed; inset: 0;
            background: rgba(2, 6, 23, 0.95);
            backdrop-filter: blur(10px);
            z-index: 9998;
            display: flex;
            align-items: flex-end;
            padding-bottom: 100px; /* Space for bar */
            justify-content: center;
            opacity: 0; pointer-events: none;
            transition: opacity 0.3s;
        }
        .mobile-overlay-menu.open { opacity: 1; pointer-events: auto; }
        
        .overlay-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            width: 85%;
            transform: translateY(20px);
            transition: transform 0.3s;
        }
        .mobile-overlay-menu.open .overlay-grid { transform: translateY(0); }

        .overlay-item {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 20px;
            text-align: center;
            color: white;
            text-decoration: none;
            font-size: 0.9rem;
            display: flex; flex-direction: column; align-items: center; gap: 10px;
        }
        .overlay-item:hover { background: rgba(255,255,255,0.1); }

        /* Media Queries */
        @media (max-width: 850px) {
            .cosmic-sidebar { display: none; }
            .cosmic-mobile-bar { display: flex; }
            
            /* Add padding to body so content isn't hidden behind bar */
            body { padding-bottom: 100px !important; }
            
            /* Remove container margin that was for sidebar */
            .container-main { margin: 0 auto !important; padding: 15px !important; }
        }
        @media (min-width: 851px) {
            /* Shift main content to right to make space for sidebar */
            body { padding-left: var(--nav-width-collapsed); }
            .container-main { max-width: 1200px; margin: 0 auto; padding-top: 40px; }
        }
    </style>
    `;

    document.head.insertAdjacentHTML("beforeend", navStyles);

    // 3. HTML Структура
    // Основні посилання для мобільного (5 штук)
    const mobileLinks = [
        { href: 'index.html', icon: 'plus-circle', text: 'Створити' },
        { href: 'schedule-list.html', icon: 'clock', text: 'Черга' },
        { href: 'task-list.html', icon: 'list', text: 'Завдання' }, // Center
        { href: 'chat.html', icon: 'message-circle', text: 'AI Чат' },
        { id: 'mobile-more-btn', icon: 'grid', text: 'Меню' }
    ];

    // Всі посилання для десктопу та меню "Більше"
    const allLinks = [
        { href: 'index.html', icon: 'plus-circle', text: 'Створити пост' },
        { href: 'schedule.html', icon: 'calendar', text: 'Планер' },
        { href: 'task-list.html', icon: 'list', text: 'Завдання' },
        { href: 'schedule-list.html', icon: 'clock', text: 'Черга публікацій' },
        { href: 'chat.html', icon: 'message-circle', text: 'AI Асистент' },
        { href: 'ads.html', icon: 'megaphone', text: 'Реклама' },
        { href: 'history.html', icon: 'archive', text: 'Архів & Логи' },
        { isDivider: true },
        { href: 'settings.html', icon: 'settings', text: 'Налаштування' },
        { href: 'admin.html', icon: 'shield', text: 'Адмін-панель', class: 'highlight' }
    ];

    // 3.1 Генеруємо Desktop Sidebar
    const sidebar = document.createElement('nav');
    sidebar.className = 'cosmic-sidebar';
    
    let sidebarHTML = `
        <a href="index.html" class="nav-logo">
            <i data-feather="zap"></i> <span>TaskBot</span>
        </a>
        <div class="nav-links">
    `;

    allLinks.forEach(link => {
        if (link.isDivider) {
            sidebarHTML += `<div class="nav-divider"></div>`;
        } else {
            sidebarHTML += `
            <a href="${link.href}" class="nav-item ${link.class || ''}">
                <i data-feather="${link.icon}"></i>
                <span class="nav-text">${link.text}</span>
            </a>`;
        }
    });

    sidebarHTML += `</div>
        <div class="nav-bottom">
            <a href="#" onclick="logout(); return false;" class="nav-item item-logout">
                <i data-feather="log-out"></i>
                <span class="nav-text">Вийти</span>
            </a>
        </div>
    `;
    sidebar.innerHTML = sidebarHTML;
    document.body.appendChild(sidebar);

    // 3.2 Генеруємо Mobile Bar
    const mobileBar = document.createElement('nav');
    mobileBar.className = 'cosmic-mobile-bar';
    
    let mobileHTML = '';
    mobileLinks.forEach(link => {
        if (link.id) {
            // Кнопка "Меню"
            mobileHTML += `
            <div class="mob-item" id="${link.id}">
                <i data-feather="${link.icon}"></i>
            </div>`;
        } else {
            mobileHTML += `
            <a href="${link.href}" class="mob-item">
                <i data-feather="${link.icon}"></i>
            </a>`;
        }
    });
    mobileBar.innerHTML = mobileHTML;
    document.body.appendChild(mobileBar);

    // 3.3 Mobile Overlay Menu (Все що не влізло)
    const mobileOverlay = document.createElement('div');
    mobileOverlay.className = 'mobile-overlay-menu';
    mobileOverlay.id = 'mobileMenuOverlay';
    
    let overlayHTML = `<div class="overlay-grid">`;
    // Додаємо посилання, які не є основними
    const mainMobileHrefs = mobileLinks.map(l => l.href);
    
    allLinks.forEach(link => {
        if (!link.isDivider && !mainMobileHrefs.includes(link.href)) {
            overlayHTML += `
                <a href="${link.href}" class="overlay-item">
                    <i data-feather="${link.icon}" style="width:30px; height:30px;"></i>
                    <span>${link.text}</span>
                </a>
            `;
        }
    });
    
    // Додаємо Вихід
    overlayHTML += `
        <a href="#" onclick="logout(); return false;" class="overlay-item" style="color:#f87171; border-color: rgba(220,38,38,0.3);">
            <i data-feather="log-out" style="width:30px; height:30px;"></i>
            <span>Вийти</span>
        </a>
    </div>`;
    
    mobileOverlay.innerHTML = overlayHTML;
    document.body.appendChild(mobileOverlay);

    // 4. Ініціалізація іконок
    if (typeof feather !== 'undefined') feather.replace();

    // 5. Логіка "Active State" (Підсвітка поточної сторінки)
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    
    // Desktop active
    const desktopLinks = document.querySelectorAll('.cosmic-sidebar .nav-item');
    desktopLinks.forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // Mobile active
    const mobItems = document.querySelectorAll('.mob-item');
    mobItems.forEach(link => {
        if (link.getAttribute('href') === currentPath) link.classList.add('active');
    });

    // 6. Логіка відкриття мобільного меню
    const moreBtn = document.getElementById('mobile-more-btn');
    const overlay = document.getElementById('mobileMenuOverlay');

    if (moreBtn) {
        moreBtn.addEventListener('click', () => {
            const isOpen = overlay.classList.contains('open');
            if (isOpen) {
                overlay.classList.remove('open');
                moreBtn.classList.remove('active');
                moreBtn.innerHTML = `<i data-feather="grid"></i>`; // Повернути іконку
            } else {
                overlay.classList.add('open');
                moreBtn.classList.add('active');
                moreBtn.innerHTML = `<i data-feather="x"></i>`; // Іконка закриття
            }
            feather.replace();
        });
    }

    // Закриття меню при кліку на фон
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) {
            overlay.classList.remove('open');
            moreBtn.classList.remove('active');
            moreBtn.innerHTML = `<i data-feather="grid"></i>`;
            feather.replace();
        }
    });
});