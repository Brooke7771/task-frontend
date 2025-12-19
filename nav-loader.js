document.addEventListener("DOMContentLoaded", () => {
    // 1. Очистка старих елементів навігації
    const oldElements = document.querySelectorAll('.fab-container, .mobile-nav, .cosmic-sidebar, .cosmic-mobile-bar, .mobile-overlay-menu, .nebula-sidebar, .orbital-bar, .orbital-menu');
    oldElements.forEach(el => el.remove());

    // 2. Перевірка прав доступу (для відображення адмінки)
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    // 3. Ін'єкція стилів "Nebula Dock v2"
    const navStyles = `
    <style>
        :root {
            --nav-z: 10000;
            --nav-bg: rgba(10, 15, 30, 0.75);
            --nav-border: 1px solid rgba(255, 255, 255, 0.08);
            --nav-glass: blur(20px) saturate(180%);
            --nav-width-collapsed: 72px;
            --nav-width-expanded: 260px;
            --primary: #6366f1;
            --primary-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
        }

        /* --- DESKTOP: NEBULA SIDEBAR --- */
        .nebula-sidebar {
            position: fixed;
            top: 0; left: 0; bottom: 0;
            width: var(--nav-width-collapsed);
            background: var(--nav-bg);
            backdrop-filter: var(--nav-glass);
            -webkit-backdrop-filter: var(--nav-glass);
            border-right: var(--nav-border);
            z-index: var(--nav-z);
            display: flex;
            flex-direction: column;
            padding: 20px 12px;
            transition: width 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            overflow: hidden;
            box-shadow: 5px 0 30px rgba(0,0,0,0.3);
        }

        .nebula-sidebar:hover {
            width: var(--nav-width-expanded);
            background: rgba(10, 15, 30, 0.95); /* Темнішає при відкритті */
        }

        /* Логотип */
        .nav-logo {
            display: flex; align-items: center; gap: 15px;
            padding: 10px 4px; margin-bottom: 30px;
            color: white; text-decoration: none;
            white-space: nowrap; overflow: hidden;
            transition: 0.3s;
        }
        
        .logo-icon {
            width: 40px; height: 40px; flex-shrink: 0;
            background: var(--primary-gradient);
            border-radius: 12px; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 15px rgba(99, 102, 241, 0.5);
            position: relative; z-index: 2;
        }
        .logo-icon svg { width: 24px; height: 24px; color: white; }
        
        .nav-logo span { 
            font-weight: 800; font-size: 1.2rem; opacity: 0; 
            transform: translateX(-20px); transition: 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
            background: linear-gradient(to right, #fff, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;
        }
        .nebula-sidebar:hover .nav-logo span { opacity: 1; transform: translateX(0); }

        /* Групи посилань */
        .nav-group {
            display: flex; flex-direction: column; gap: 5px;
        }
        .nav-group.main { flex: 1; overflow-y: auto; scrollbar-width: none; margin-bottom: 20px; }
        .nav-group.main::-webkit-scrollbar { display: none; }
        
        .nav-group.bottom { 
            border-top: 1px solid rgba(255,255,255,0.1); 
            padding-top: 15px; margin-top: auto; 
        }

        /* Посилання */
        .nav-link {
            display: flex; align-items: center; gap: 15px;
            padding: 12px 14px; border-radius: 14px;
            color: #94a3b8; text-decoration: none;
            transition: all 0.2s ease;
            white-space: nowrap; overflow: hidden;
            position: relative;
        }

        .nav-link i { 
            width: 20px; height: 20px; flex-shrink: 0; 
            transition: 0.3s; position: relative; z-index: 2; 
        }
        
        .nav-text { 
            font-weight: 500; font-size: 0.95rem; opacity: 0; 
            transform: translateX(-10px); transition: 0.3s; 
        }
        .nebula-sidebar:hover .nav-text { opacity: 1; transform: translateX(0); }

        /* Hover Effect */
        .nav-link:hover { 
            background: rgba(255,255,255,0.08); color: white; 
        }
        .nav-link:hover i { transform: scale(1.1); color: #fff; }

        /* Active State */
        .nav-link.active {
            background: rgba(99, 102, 241, 0.15); 
            color: white;
        }
        .nav-link.active i { color: var(--primary); filter: drop-shadow(0 0 8px var(--primary)); }
        .nav-link.active .nav-text { font-weight: 700; }
        
        /* Active Indicator Line */
        .nav-link.active::before {
            content: ''; position: absolute; left: 0; top: 10px; bottom: 10px; width: 4px;
            background: var(--primary); border-radius: 0 4px 4px 0;
            box-shadow: 0 0 10px var(--primary);
        }

        /* --- MOBILE: ORBITAL BAR (Bottom) --- */
        .orbital-bar {
            display: none;
            position: fixed; bottom: 20px; left: 15px; right: 15px;
            height: 70px;
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: var(--nav-glass);
            -webkit-backdrop-filter: var(--nav-glass);
            border: var(--nav-border);
            border-radius: 20px;
            z-index: var(--nav-z);
            justify-content: space-around;
            align-items: center;
            padding: 0 10px;
            box-shadow: 0 10px 40px -5px rgba(0,0,0,0.6);
        }

        .mob-link {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #64748b; text-decoration: none; gap: 4px;
            font-size: 0.65rem; font-weight: 600; 
            width: 60px; height: 100%; transition: 0.3s;
        }
        
        .mob-link.active { color: white; }
        .mob-link.active i { 
            color: var(--primary); transform: translateY(-3px); 
            filter: drop-shadow(0 0 10px var(--primary)); 
        }

        /* Central Floating Button */
        .orb-wrapper { position: relative; top: -25px; }
        .orb-btn {
            width: 60px; height: 60px; border-radius: 50%;
            background: var(--primary-gradient);
            border: 4px solid #020617; /* Колір фону body */
            display: flex; align-items: center; justify-content: center;
            color: white; box-shadow: 0 5px 20px rgba(99, 102, 241, 0.5);
            cursor: pointer; transition: 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .orb-btn:active { transform: scale(0.9); }
        .orb-btn.open { transform: rotate(45deg); background: #ef4444; box-shadow: 0 5px 20px rgba(239, 68, 68, 0.4); }

        /* Mobile Menu Overlay */
        .orbital-menu {
            position: fixed; inset: 0; background: rgba(2, 6, 23, 0.95);
            backdrop-filter: blur(10px); z-index: 9999;
            display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
            padding-bottom: 110px; opacity: 0; pointer-events: none; transition: 0.3s;
        }
        .orbital-menu.active { opacity: 1; pointer-events: auto; }
        
        .menu-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;
            width: 90%; max-width: 400px;
            transform: translateY(30px); transition: 0.3s;
        }
        .orbital-menu.active .menu-grid { transform: translateY(0); }

        .menu-card {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 16px; padding: 15px; text-align: center;
            color: white; text-decoration: none; display: flex; flex-direction: column; 
            align-items: center; gap: 10px; transition: 0.2s;
        }
        .menu-card:hover { background: rgba(255,255,255,0.1); transform: translateY(-3px); }
        .menu-card i { width: 24px; height: 24px; color: #a5f3fc; }
        .menu-card span { font-size: 0.8rem; font-weight: 500; }

        /* Медіа запити */
        @media (max-width: 1024px) {
            .nebula-sidebar { display: none; }
            .orbital-bar { display: flex; }
            body { padding-left: 0 !important; padding-bottom: 100px !important; }
        }
        @media (min-width: 1025px) {
            body { padding-left: var(--nav-width-collapsed); }
            .orbital-bar { display: none; }
        }
    </style>
    `;
    document.head.insertAdjacentHTML("beforeend", navStyles);

    // 4. Конфігурація посилань
    // Типи: 'main' (основне), 'system' (низ), 'mobile-main' (в барі), 'menu' (в сітці)
    const links = [
        // --- ОСНОВНІ ---
        { href: 'index.html', icon: 'plus-square', text: 'Створити Завдання', type: ['main', 'menu'] },
        { href: 'schedule.html', icon: 'edit-3', text: 'Створити Пост', type: ['main', 'menu'] }, // Додано
        { href: 'task-list.html', icon: 'trello', text: 'Завдання', type: ['main', 'mobile-main'] },
        { href: 'schedule-list.html', icon: 'clock', text: 'Черга', type: ['main', 'mobile-main'] },
        { href: 'chat.html', icon: 'message-circle', text: 'AI Асистент', type: ['main', 'mobile-main'] },
        { href: 'ads.html', icon: 'megaphone', text: 'Реклама', type: ['main', 'menu'] },
        { href: 'history.html', icon: 'archive', text: 'Історія', type: ['main', 'menu'] },
        
        // --- СИСТЕМНІ ---
        { href: 'settings.html', icon: 'settings', text: 'Налаштування', type: ['system', 'mobile-main'] },
        { href: 'admin.html', icon: 'shield', text: 'Адмін-панель', type: ['system', 'menu'], adminOnly: true },
        { href: '#', icon: 'log-out', text: 'Вийти', type: ['system', 'menu'], action: 'logout', danger: true }
    ];

    // 5. Рендер Desktop
    const sidebar = document.createElement('nav');
    sidebar.className = 'nebula-sidebar';
    
    // Логотип (веде на landing.html)
    let sidebarHTML = `
        <a href="landing.html" class="nav-logo" title="Про Бот">
            <div class="logo-icon"><i data-feather="zap"></i></div>
            <span>TaskBot</span>
        </a>
        <div class="nav-group main">
    `;

    // Основні лінки
    links.forEach(l => {
        if (l.type.includes('main')) {
            sidebarHTML += renderLink(l);
        }
    });

    sidebarHTML += `</div><div class="nav-group bottom">`;

    // Системні лінки
    links.forEach(l => {
        if (l.type.includes('system')) {
            if (l.adminOnly && !isAdmin) return; // Пропускаємо адмінку
            sidebarHTML += renderLink(l);
        }
    });

    sidebarHTML += `</div>`;
    sidebar.innerHTML = sidebarHTML;
    document.body.appendChild(sidebar);

    function renderLink(l) {
        const action = l.action === 'logout' ? 'onclick="logout(); return false;"' : '';
        const dangerClass = l.danger ? 'style="color: #f87171;"' : '';
        return `
            <a href="${l.href}" class="nav-link" ${action} ${dangerClass}>
                <i data-feather="${l.icon}"></i>
                <span class="nav-text">${l.text}</span>
            </a>
        `;
    }

    // 6. Рендер Mobile
    const mobileBar = document.createElement('nav');
    mobileBar.className = 'orbital-bar';
    
    // Фільтруємо 4 основні лінки для бару
    const mobLinks = links.filter(l => l.type.includes('mobile-main')).slice(0, 4);
    // Розбиваємо на 2 зліва і 2 справа
    const leftLinks = mobLinks.slice(0, 2);
    const rightLinks = mobLinks.slice(2, 4);

    const renderMobLink = l => `
        <a href="${l.href}" class="mob-link">
            <i data-feather="${l.icon}"></i>
            <span>${l.text.split(' ')[0]}</span>
        </a>
    `;

    mobileBar.innerHTML = `
        <a href="index.html" class="mob-link"><i data-feather="home"></i><span>Головна</span></a>
        ${leftLinks[1] ? renderMobLink(leftLinks[1]) : ''}
        
        <div class="orb-wrapper">
            <div class="orb-btn" id="orbBtn"><i data-feather="grid"></i></div>
        </div>

        ${rightLinks[0] ? renderMobLink(rightLinks[0]) : ''}
        ${rightLinks[1] ? renderMobLink(rightLinks[1]) : ''}
    `;
    document.body.appendChild(mobileBar);

    // 7. Мобільне меню (Grid)
    const menuOverlay = document.createElement('div');
    menuOverlay.className = 'orbital-menu';
    menuOverlay.id = 'orbitalMenu';
    
    let gridHTML = `<div class="menu-grid">`;
    links.forEach(l => {
        if (!l.type.includes('mobile-main') && (!l.adminOnly || isAdmin)) {
             const action = l.action === 'logout' ? 'onclick="logout(); return false;"' : '';
             const style = l.danger ? 'border-color: rgba(248, 113, 113, 0.3); color: #fca5a5;' : '';
             gridHTML += `
                <a href="${l.href}" class="menu-card" ${action} style="${style}">
                    <i data-feather="${l.icon}"></i>
                    <span>${l.text}</span>
                </a>
             `;
        }
    });
    gridHTML += `</div>`;
    menuOverlay.innerHTML = gridHTML;
    document.body.appendChild(menuOverlay);

    // 8. Логіка активного стану
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link, .mob-link').forEach(el => {
        if (el.getAttribute('href') === currentPath) el.classList.add('active');
    });

    // 9. Ініціалізація Feather
    if (typeof feather !== 'undefined') feather.replace();

    // 10. Логіка відкриття меню (мобільна)
    const orbBtn = document.getElementById('orbBtn');
    const orbitalMenu = document.getElementById('orbitalMenu');

    if (orbBtn) {
        orbBtn.addEventListener('click', () => {
            const isOpen = orbitalMenu.classList.contains('active');
            if (isOpen) {
                orbitalMenu.classList.remove('active');
                orbBtn.classList.remove('open');
                orbBtn.innerHTML = `<i data-feather="grid"></i>`;
            } else {
                orbitalMenu.classList.add('active');
                orbBtn.classList.add('open');
                orbBtn.innerHTML = `<i data-feather="x"></i>`;
            }
            feather.replace();
        });
        
        // Закриття при кліку на фон
        orbitalMenu.addEventListener('click', (e) => {
            if (e.target === orbitalMenu) orbBtn.click();
        });
    }
});