document.addEventListener("DOMContentLoaded", () => {
    // 1. Очистка старих елементів (FAB, стара навігація)
    const oldElements = document.querySelectorAll('.fab-container, .mobile-nav, .cosmic-sidebar, .cosmic-mobile-bar, .mobile-overlay-menu');
    oldElements.forEach(el => el.remove());

    // 2. Ін'єкція стилів "Nebula Dock"
    const navStyles = `
    <style>
        :root {
            --nav-z: 10000;
            --nav-bg: rgba(10, 15, 30, 0.6);
            --nav-border: 1px solid rgba(255, 255, 255, 0.08);
            --nav-glass: blur(25px) saturate(180%);
            --nav-glow: radial-gradient(circle at var(--x, 50%) var(--y, 50%), rgba(99, 102, 241, 0.15) 0%, transparent 50%);
            --primary: #6366f1;
            --primary-glow: 0 0 20px rgba(99, 102, 241, 0.6);
        }

        /* --- DESKTOP: NEBULA SIDEBAR --- */
        .nebula-sidebar {
            position: fixed;
            top: 20px; left: 20px; bottom: 20px;
            width: 80px;
            background: var(--nav-bg);
            backdrop-filter: var(--nav-glass);
            -webkit-backdrop-filter: var(--nav-glass);
            border: var(--nav-border);
            border-radius: 24px;
            z-index: var(--nav-z);
            display: flex;
            flex-direction: column;
            padding: 20px 10px;
            transition: width 0.5s cubic-bezier(0.23, 1, 0.32, 1);
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
        }

        /* Ефект прожектора при наведенні */
        .nebula-sidebar::before {
            content: ''; position: absolute; inset: 0;
            background: var(--nav-glow);
            pointer-events: none; opacity: 0; transition: opacity 0.3s;
            z-index: 0;
        }
        .nebula-sidebar:hover::before { opacity: 1; }

        .nebula-sidebar:hover { width: 260px; }

        /* Логотип */
        .nav-logo {
            display: flex; align-items: center; gap: 15px;
            padding: 10px 14px; margin-bottom: 20px;
            color: white; text-decoration: none; position: relative; z-index: 1;
            white-space: nowrap; overflow: hidden;
        }
        .logo-icon-box {
            width: 32px; height: 32px; flex-shrink: 0;
            background: linear-gradient(135deg, var(--primary), #a855f7);
            border-radius: 10px; display: flex; align-items: center; justify-content: center;
            box-shadow: var(--primary-glow);
        }
        .nav-logo span { font-weight: 800; font-size: 1.1rem; opacity: 0; transition: 0.3s; transform: translateX(-10px); }
        .nebula-sidebar:hover .nav-logo span { opacity: 1; transform: translateX(0); }

        /* Меню */
        .nav-list {
            flex: 1; display: flex; flex-direction: column; gap: 8px;
            overflow-y: auto; scrollbar-width: none; position: relative; z-index: 1;
        }
        .nav-list::-webkit-scrollbar { display: none; }

        .nav-link {
            display: flex; align-items: center; gap: 16px;
            padding: 14px; border-radius: 16px;
            color: #94a3b8; text-decoration: none;
            transition: 0.3s; position: relative;
            white-space: nowrap; overflow: hidden;
        }
        
        .nav-link i { width: 24px; height: 24px; flex-shrink: 0; transition: 0.3s; position: relative; z-index: 2; }
        .nav-text { font-weight: 600; opacity: 0; transform: translateX(-10px); transition: 0.3s; position: relative; z-index: 2; }
        .nebula-sidebar:hover .nav-text { opacity: 1; transform: translateX(0); }

        /* Ховер ефект для пунктів */
        .nav-link:hover { color: white; background: rgba(255,255,255,0.05); }
        .nav-link:hover i { transform: scale(1.1); color: var(--primary); text-shadow: 0 0 10px var(--primary); }

        /* Активний стан */
        .nav-link.active { color: white; background: rgba(99, 102, 241, 0.15); border: 1px solid rgba(99, 102, 241, 0.3); }
        .nav-link.active i { color: var(--primary); }
        
        /* Маркер активного елемента (світиться зліва) */
        .nav-link.active::after {
            content: ''; position: absolute; left: 0; top: 15%; bottom: 15%; width: 4px;
            background: var(--primary); border-radius: 0 4px 4px 0;
            box-shadow: 0 0 15px var(--primary);
        }

        .nav-divider { height: 1px; background: rgba(255,255,255,0.1); margin: 10px 15px; }

        /* --- MOBILE: ORBITAL BAR --- */
        .orbital-bar {
            display: none;
            position: fixed; bottom: 20px; left: 20px; right: 20px;
            height: 75px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: var(--nav-glass);
            -webkit-backdrop-filter: var(--nav-glass);
            border: var(--nav-border);
            border-radius: 25px;
            z-index: var(--nav-z);
            display: flex; align-items: center; justify-content: space-between;
            padding: 0 10px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
        }

        .mob-link {
            flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
            height: 100%; color: #64748b; text-decoration: none; gap: 4px;
            font-size: 0.7rem; font-weight: 600; transition: 0.3s;
        }
        .mob-link.active { color: white; }
        .mob-link.active i { color: var(--primary); transform: translateY(-2px); filter: drop-shadow(0 0 8px var(--primary)); }

        /* Центральна кнопка (ORB) */
        .orb-wrapper {
            position: relative; top: -25px;
            width: 70px; height: 70px; flex-shrink: 0;
        }
        .orb-btn {
            width: 100%; height: 100%; border-radius: 50%;
            background: linear-gradient(135deg, #4f46e5, #ec4899);
            border: 4px solid #020617; /* Колір фону сторінки для "вирізу" */
            display: flex; align-items: center; justify-content: center;
            color: white; font-size: 1.5rem; cursor: pointer;
            box-shadow: 0 10px 25px rgba(236, 72, 153, 0.4);
            transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            position: relative; z-index: 10;
        }
        .orb-btn:active { transform: scale(0.9); }
        .orb-btn.open { transform: rotate(45deg); background: #ef4444; box-shadow: 0 10px 25px rgba(239, 68, 68, 0.4); }

        /* Меню оверлей */
        .orbital-menu {
            position: fixed; inset: 0;
            background: rgba(2, 6, 23, 0.96);
            backdrop-filter: blur(15px);
            z-index: 9999;
            display: flex; flex-direction: column; align-items: center; justify-content: flex-end;
            padding-bottom: 120px; /* Над баром */
            opacity: 0; pointer-events: none;
            transition: 0.3s ease;
        }
        .orbital-menu.active { opacity: 1; pointer-events: auto; }

        .menu-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
            width: 90%; max-width: 400px;
            transform: translateY(50px) scale(0.9); transition: 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        .orbital-menu.active .menu-grid { transform: translateY(0) scale(1); }

        .menu-item-card {
            background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
            border-radius: 20px; aspect-ratio: 1;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            text-decoration: none; color: white; gap: 10px; transition: 0.2s;
        }
        .menu-item-card:hover { background: rgba(255,255,255,0.1); transform: translateY(-5px); border-color: var(--primary); }
        .menu-item-card i { width: 28px; height: 28px; }
        .menu-item-card span { font-size: 0.8rem; font-weight: 500; }

        @media (max-width: 1000px) {
            .nebula-sidebar { display: none; }
            .orbital-bar { display: flex; }
            /* Відступи для контенту */
            body { padding-bottom: 110px !important; padding-left: 0 !important; }
            .container-main { margin: 0 auto !important; padding: 15px !important; }
        }
        @media (min-width: 1001px) {
            .orbital-bar, .orbital-menu { display: none !important; }
            /* Відсуваємо контент */
            body { padding-left: 100px; }
            .container-main { max-width: 1400px; margin: 0 auto; padding-top: 40px; }
        }
    </style>
    `;
    document.head.insertAdjacentHTML("beforeend", navStyles);

    // 3. Структура посилань
    const links = [
        { href: 'index.html', icon: 'plus-square', text: 'Створити', mobile: true },
        { href: 'schedule-list.html', icon: 'clock', text: 'Черга', mobile: true },
        { href: 'task-list.html', icon: 'trello', text: 'Завдання', mobile: false }, // Center on Desktop
        { href: 'chat.html', icon: 'message-circle', text: 'AI Чат', mobile: true },
        { href: 'settings.html', icon: 'settings', text: 'Меню', mobile: true }, // Opens menu on mobile? No, menu is center
        // Extra links for menu
        { href: 'ads.html', icon: 'megaphone', text: 'Реклама', menu: true },
        { href: 'history.html', icon: 'archive', text: 'Архів', menu: true },
        { href: 'admin.html', icon: 'shield', text: 'Admin', menu: true, special: true },
        { href: '#', icon: 'log-out', text: 'Вийти', menu: true, action: 'logout' }
    ];

    // 4. Рендер Desktop Sidebar
    const desktopNav = document.createElement('nav');
    desktopNav.className = 'nebula-sidebar';
    desktopNav.innerHTML = `
        <a href="index.html" class="nav-logo">
            <div class="logo-icon-box"><i data-feather="zap" style="color:white"></i></div>
            <span>TaskBot</span>
        </a>
        <div class="nav-list">
            ${links.map(l => {
                if (l.action === 'logout') return ''; // Вихід окремо
                return `<a href="${l.href}" class="nav-link ${l.special ? 'special' : ''}">
                    <i data-feather="${l.icon}"></i>
                    <span class="nav-text">${l.text}</span>
                </a>`;
            }).join('')}
        </div>
        <div class="nav-divider"></div>
        <a href="#" onclick="logout(); return false;" class="nav-link" style="margin-top:auto; color:#f87171;">
            <i data-feather="log-out"></i> <span class="nav-text">Вийти</span>
        </a>
    `;
    document.body.appendChild(desktopNav);

    // 5. Рендер Mobile Orbital Bar
    const mobileBar = document.createElement('nav');
    mobileBar.className = 'orbital-bar';
    
    // Ліва частина (2 лінки)
    const leftLinks = links.filter(l => l.mobile).slice(0, 2);
    const rightLinks = links.filter(l => l.mobile).slice(2, 4);

    const renderMobLink = l => `
        <a href="${l.href}" class="mob-link">
            <i data-feather="${l.icon}"></i>
            <span>${l.text}</span>
        </a>`;

    mobileBar.innerHTML = `
        ${leftLinks.map(renderMobLink).join('')}
        
        <div class="orb-wrapper">
            <div class="orb-btn" id="orbBtn">
                <i data-feather="grid"></i>
            </div>
        </div>

        ${rightLinks.map(renderMobLink).join('')}
    `;
    document.body.appendChild(mobileBar);

    // 6. Рендер Mobile Overlay Menu (Grid)
    const menuOverlay = document.createElement('div');
    menuOverlay.className = 'orbital-menu';
    menuOverlay.id = 'orbitalMenu';
    
    // Фільтруємо лінки для Grid меню (всі, крім 4 основних мобільних)
    const mainMobileHrefs = links.filter(l => l.mobile).map(l => l.href);
    const menuItems = links.filter(l => !mainMobileHrefs.includes(l.href) || l.menu);

    menuOverlay.innerHTML = `
        <div class="menu-grid">
            ${menuItems.map(l => `
                <a href="${l.href}" class="menu-item-card" ${l.action === 'logout' ? 'onclick="logout(); return false;"' : ''} 
                   style="${l.action === 'logout' ? 'color:#f87171; border-color:rgba(220,38,38,0.3)' : ''}">
                    <i data-feather="${l.icon}"></i>
                    <span>${l.text}</span>
                </a>
            `).join('')}
        </div>
    `;
    document.body.appendChild(menuOverlay);

    // 7. Ініціалізація
    if (typeof feather !== 'undefined') feather.replace();

    // Логіка активного стану
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const allNavLinks = document.querySelectorAll('.nav-link, .mob-link');
    allNavLinks.forEach(l => {
        if(l.getAttribute('href') === currentPath) l.classList.add('active');
    });

    // 8. Логіка "Spotlight" (Прожектора) для Desktop
    const sidebarEl = document.querySelector('.nebula-sidebar');
    if(sidebarEl) {
        sidebarEl.addEventListener('mousemove', (e) => {
            const rect = sidebarEl.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            sidebarEl.style.setProperty('--x', `${x}px`);
            sidebarEl.style.setProperty('--y', `${y}px`);
        });
    }

    // 9. Логіка Mobile Menu
    const orbBtn = document.getElementById('orbBtn');
    const orbitalMenu = document.getElementById('orbitalMenu');

    const toggleMenu = () => {
        const isOpen = orbitalMenu.classList.contains('active');
        if (isOpen) {
            orbitalMenu.classList.remove('active');
            orbBtn.classList.remove('open');
            orbBtn.innerHTML = `<i data-feather="grid"></i>`;
        } else {
            orbitalMenu.classList.add('active');
            orbBtn.classList.add('open');
            orbBtn.innerHTML = `<i data-feather="x"></i>`;
            // Haptic
            if(navigator.vibrate) navigator.vibrate(10);
        }
        feather.replace();
    };

    if(orbBtn) orbBtn.addEventListener('click', toggleMenu);
    
    // Закриття при кліку на фон
    if(orbitalMenu) {
        orbitalMenu.addEventListener('click', (e) => {
            if(e.target === orbitalMenu) toggleMenu();
        });
    }
});