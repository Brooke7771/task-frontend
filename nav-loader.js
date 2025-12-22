document.addEventListener("DOMContentLoaded", () => {
    // 1. Очистка старих елементів
    const oldElements = document.querySelectorAll('.fab-container, .mobile-nav, .cosmic-sidebar, .cosmic-mobile-bar, .mobile-overlay-menu, .nebula-sidebar, .orbital-bar, .orbital-menu');
    oldElements.forEach(el => el.remove());

    // 2. Перевірка прав
    const isAdmin = localStorage.getItem('isAdmin') === 'true';

    // 3. Ін'єкція стилів "Nebula Dock v3 Ultimate"
    const navStyles = `
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

        :root {
            --nav-z: 10000;
            --nav-bg-glass: rgba(10, 15, 30, 0.65);
            --nav-bg-solid: #0f172a;
            --nav-border: 1px solid rgba(255, 255, 255, 0.08);
            --nav-glass-filter: blur(20px) saturate(180%);
            --nav-width-collapsed: 76px;
            --nav-width-expanded: 280px;
            
            /* Primary Colors - Cyber Violet */
            --primary: #8b5cf6;
            --primary-glow: rgba(139, 92, 246, 0.5);
            --primary-gradient: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
            --danger: #ef4444;
            
            /* Text Colors */
            --text-main: #f8fafc;
            --text-muted: #94a3b8;

            /* Spotlight Dynamic Vars */
            --spotlight-x: 50%;
            --spotlight-y: 50%;
        }

        /* Глобальні налаштування шрифту для меню */
        .nebula-sidebar, .orbital-bar, .orbital-menu {
            font-family: 'Inter', sans-serif;
            box-sizing: border-box;
        }

        /* --- DESKTOP: NEBULA SIDEBAR v3 --- */
        .nebula-sidebar {
            position: fixed; top: 0; left: 0; bottom: 0;
            width: var(--nav-width-collapsed);
            background: var(--nav-bg-glass);
            backdrop-filter: var(--nav-glass-filter);
            -webkit-backdrop-filter: var(--nav-glass-filter);
            border-right: var(--nav-border);
            z-index: var(--nav-z);
            display: flex; flex-direction: column;
            padding: 24px 14px;
            transition: width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1);
            overflow: hidden;
            box-shadow: 10px 0 40px rgba(0,0,0,0.4);
        }

        /* Spotlight Effect Container */
        .nebula-sidebar::before {
            content: ''; position: absolute; inset: 0;
            background: radial-gradient(
                800px circle at var(--spotlight-x) var(--spotlight-y), 
                rgba(139, 92, 246, 0.08), transparent 40%
            );
            opacity: 0; transition: opacity 0.5s ease;
            pointer-events: none; z-index: 0;
        }
        .nebula-sidebar:hover { width: var(--nav-width-expanded); background: rgba(8, 12, 25, 0.95); }
        .nebula-sidebar:hover::before { opacity: 1; }

        /* LOGO AREA */
        .nav-logo {
            display: flex; align-items: center; gap: 16px;
            padding: 8px 4px; margin-bottom: 35px;
            text-decoration: none; position: relative; z-index: 2;
        }
        
        .logo-icon {
            width: 44px; height: 44px; flex-shrink: 0;
            background: var(--primary-gradient);
            border-radius: 14px; display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 20px var(--primary-glow);
            position: relative; overflow: hidden;
        }
        
        /* Shimmer effect on logo */
        .logo-icon::after {
            content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
            background: linear-gradient(to bottom right, transparent, rgba(255,255,255,0.4), transparent);
            transform: rotate(45deg) translate(-100%, -100%);
            animation: shimmer 4s infinite;
        }
        @keyframes shimmer {
            0%, 90% { transform: translate(-100%, -100%) rotate(45deg); }
            100% { transform: translate(100%, 100%) rotate(45deg); }
        }

        .logo-icon svg { width: 24px; height: 24px; color: white; stroke-width: 2.5px; }
        
        .nav-logo span { 
            font-weight: 800; font-size: 1.35rem; opacity: 0; color: white;
            transform: translateX(-15px); transition: 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
            letter-spacing: -0.5px;
        }
        .nebula-sidebar:hover .nav-logo span { opacity: 1; transform: translateX(0); }

        /* LINKS */
        .nav-group { display: flex; flex-direction: column; gap: 8px; position: relative; z-index: 2; }
        .nav-group.main { flex: 1; overflow-y: auto; scrollbar-width: none; margin-bottom: 20px; }
        .nav-group.main::-webkit-scrollbar { display: none; }
        .nav-group.bottom { padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.06); margin-top: auto; }

        .nav-link {
            display: flex; align-items: center; gap: 16px;
            padding: 14px 16px; border-radius: 16px;
            color: var(--text-muted); text-decoration: none;
            transition: all 0.3s ease; white-space: nowrap; position: relative;
            overflow: hidden;
        }

        .nav-link i { 
            width: 22px; height: 22px; flex-shrink: 0; transition: 0.3s; 
            filter: grayscale(1) brightness(0.7); opacity: 0.7;
        }
        .nav-text { 
            font-size: 0.95rem; font-weight: 500; opacity: 0; transform: translateX(-10px); transition: 0.3s;
        }

        /* Hover States */
        .nebula-sidebar:hover .nav-text { opacity: 1; transform: translateX(0); }
        .nav-link:hover { background: rgba(255,255,255,0.04); color: white; }
        .nav-link:hover i { filter: grayscale(0) brightness(1.2); opacity: 1; transform: scale(1.1); }

        /* ACTIVE STATE (The "Jewel" Effect) */
        .nav-link.active {
            background: linear-gradient(90deg, rgba(99, 102, 241, 0.15) 0%, transparent 100%);
            color: white;
        }
        .nav-link.active i {
            color: #a78bfa; /* Light purple */
            filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.6));
            opacity: 1;
        }
        .nav-link.active::before {
            content: ''; position: absolute; left: 0; top: 12px; bottom: 12px; width: 4px;
            background: #a78bfa; border-radius: 0 4px 4px 0;
            box-shadow: 2px 0 15px rgba(139, 92, 246, 0.8);
        }

        /* Notification Dot Support */
        .has-alert::after {
            content: ''; position: absolute; top: 12px; left: 28px; width: 8px; height: 8px;
            background: var(--danger); border-radius: 50%; border: 2px solid var(--nav-bg-solid);
            box-shadow: 0 0 5px var(--danger);
        }

        /* --- MOBILE: ORBITAL BAR v3 --- */
        .orbital-bar {
            display: none;
            position: fixed; bottom: 25px; left: 20px; right: 20px;
            height: 76px;
            background: rgba(15, 23, 42, 0.85);
            backdrop-filter: blur(25px) saturate(200%);
            -webkit-backdrop-filter: blur(25px) saturate(200%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 24px;
            z-index: var(--nav-z);
            justify-content: space-between;
            align-items: center;
            padding: 0 24px;
            box-shadow: 0 15px 40px -10px rgba(0,0,0,0.8);
        }

        .mob-link {
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            color: #64748b; text-decoration: none; gap: 5px;
            font-size: 0.7rem; font-weight: 600; 
            width: 50px; height: 100%; transition: 0.3s;
            position: relative;
        }
        
        .mob-link.active { color: white; }
        .mob-link.active i { 
            color: #a78bfa; transform: translateY(-4px); 
            filter: drop-shadow(0 0 12px var(--primary)); 
        }
        .mob-link.active span { opacity: 1; transform: translateY(-2px); }
        
        /* Floating Central Button (ORB) */
        .orb-wrapper { position: relative; top: -35px; width: 72px; height: 72px; }
        .orb-btn {
            width: 100%; height: 100%; border-radius: 50%;
            background: var(--primary-gradient);
            border: 5px solid #020617; /* Matches body bg */
            display: flex; align-items: center; justify-content: center;
            color: white; 
            box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6);
            cursor: pointer; transition: 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
            animation: pulse-soft 3s infinite;
        }
        
        @keyframes pulse-soft {
            0% { box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6); }
            50% { box-shadow: 0 15px 35px rgba(99, 102, 241, 0.8); transform: scale(1.05); }
            100% { box-shadow: 0 8px 25px rgba(99, 102, 241, 0.6); }
        }

        .orb-btn svg { width: 32px; height: 32px; transition: 0.4s; }
        .orb-btn.open { 
            transform: rotate(135deg) scale(0.9); 
            background: var(--danger); 
            box-shadow: 0 5px 25px rgba(239, 68, 68, 0.5); 
            animation: none;
        }

        /* --- MOBILE MENU OVERLAY v3 --- */
        .orbital-menu {
            position: fixed; inset: 0; 
            background: rgba(5, 7, 20, 0.6); /* Dimmed background */
            backdrop-filter: blur(8px);
            z-index: 9998; /* Under the bar */
            display: flex; flex-direction: column; justify-content: flex-end; align-items: center;
            padding-bottom: 120px;
            opacity: 0; pointer-events: none; transition: 0.4s;
        }
        .orbital-menu.active { opacity: 1; pointer-events: auto; }
        
        /* Gradient Background for Menu Area */
        .orbital-menu::before {
            content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 70%;
            background: linear-gradient(to top, rgba(15, 23, 42, 0.98), rgba(15, 23, 42, 0));
            z-index: -1; pointer-events: none;
        }

        .menu-grid {
            display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;
            width: 90%; max-width: 420px;
            perspective: 1000px; /* For 3D effect */
        }

        .menu-card {
            background: rgba(255,255,255,0.07); border: 1px solid rgba(255,255,255,0.12);
            border-radius: 20px; padding: 18px 10px; text-align: center;
            color: white; text-decoration: none; display: flex; flex-direction: column; 
            align-items: center; gap: 12px;
            opacity: 0; transform: translateY(40px) scale(0.9);
            transition: 0.3s;
        }
        
        /* Staggered Animation Classes will be added by JS */
        .orbital-menu.active .menu-card {
            animation: card-enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes card-enter {
            to { opacity: 1; transform: translateY(0) scale(1); }
        }

        .menu-card:active { transform: scale(0.95) !important; background: rgba(255,255,255,0.15); }
        
        .menu-card i { width: 28px; height: 28px; color: #a5f3fc; margin-bottom: 2px; }
        .menu-card span { font-size: 0.85rem; font-weight: 500; color: #cbd5e1; }
        
        /* Danger Item */
        .menu-card.danger i { color: #fca5a5; }
        .menu-card.danger { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); }

        /* Media Queries */
        @media (max-width: 1024px) {
            .nebula-sidebar { display: none; }
            .orbital-bar { display: flex; }
            body { padding-left: 0 !important; padding-bottom: 120px !important; }
        }
        @media (min-width: 1025px) {
            body { padding-left: var(--nav-width-collapsed); }
            .orbital-bar { display: none; }
        }
    </style>
    `;
    document.head.insertAdjacentHTML("beforeend", navStyles);

    // 4. Конфігурація посилань (Оновлена)
    const links = [
        // --- ОСНОВНІ ---
        { href: 'index.html', icon: 'plus-square', text: 'Нове Завдання', type: ['main', 'menu'] },
        { href: 'schedule.html', icon: 'edit-3', text: 'Новий Пост', type: ['main', 'menu'] },
        { href: 'task-list.html', icon: 'trello', text: 'Завдання', type: ['main', 'mobile-main'] },
        { href: 'schedule-list.html', icon: 'clock', text: 'Розклад', type: ['main', 'mobile-main'] }, 
        { href: 'ads.html', icon: 'megaphone', text: 'Реклама', type: ['main', 'menu'] },
        { href: 'analytics.html', icon: 'bar-chart-2', text: 'Аналітика', type: ['main', 'menu'], adminOnly: true },
        { href: 'chat.html', icon: 'cpu', text: 'AI Brain', type: ['main', 'mobile-main'] }, // Змінив іконку на більш "розумну"
        { href: 'history.html', icon: 'archive', text: 'Архів', type: ['main', 'menu'] },
        
        // --- СИСТЕМНІ ---
        { href: 'settings.html', icon: 'sliders', text: 'Налаштування', type: ['system', 'menu'] },
        { href: 'admin.html', icon: 'shield', text: 'Admin Panel', type: ['system', 'menu'], adminOnly: true },
        { href: '#', icon: 'power', text: 'Вихід', type: ['system', 'menu'], action: 'logout', danger: true }
    ];

    // 5. Рендер Desktop Sidebar
    const sidebar = document.createElement('nav');
    sidebar.className = 'nebula-sidebar';
    
    let sidebarHTML = `
        <a href="landing.html" class="nav-logo" title="TaskBot AI">
            <div class="logo-icon"><i data-feather="zap"></i></div>
            <span>TaskBot</span>
        </a>
        <div class="nav-group main">
    `;

    links.forEach(l => {
        if (l.type.includes('main')) sidebarHTML += renderLink(l);
    });

    sidebarHTML += `</div><div class="nav-group bottom">`;

    links.forEach(l => {
        if (l.type.includes('system')) {
            if (l.adminOnly && !isAdmin) return;
            sidebarHTML += renderLink(l);
        }
    });

    sidebarHTML += `</div>`;
    sidebar.innerHTML = sidebarHTML;
    document.body.appendChild(sidebar);

    // Spotlight Listener
    sidebar.addEventListener('mousemove', (e) => {
        const rect = sidebar.getBoundingClientRect();
        sidebar.style.setProperty('--spotlight-x', `${e.clientX - rect.left}px`);
        sidebar.style.setProperty('--spotlight-y', `${e.clientY - rect.top}px`);
    });

    function renderLink(l) {
        const action = l.action === 'logout' ? 'onclick="logout(); return false;"' : '';
        const activeClass = isActive(l.href) ? 'active' : '';
        // Можна додати клас has-alert сюди, якщо є логіка сповіщень
        return `
            <a href="${l.href}" class="nav-link ${activeClass}" ${action}>
                <i data-feather="${l.icon}"></i>
                <span class="nav-text">${l.text}</span>
            </a>
        `;
    }

    // 6. Рендер Mobile Bar
    const mobileBar = document.createElement('nav');
    mobileBar.className = 'orbital-bar';
    
    const mobLinks = links.filter(l => l.type.includes('mobile-main'));
    const slot1 = mobLinks[0];
    const slot2 = mobLinks[1];
    const slot3 = mobLinks[2];
    
    const renderMobLink = l => {
        const activeClass = isActive(l.href) ? 'active' : '';
        return `
        <a href="${l.href}" class="mob-link ${activeClass}">
            <i data-feather="${l.icon}"></i>
            <span>${l.text.split(' ')[0]}</span>
        </a>`;
    };

    const homeActive = isActive('index.html') ? 'active' : '';

    mobileBar.innerHTML = `
        <a href="index.html" class="mob-link ${homeActive}"><i data-feather="home"></i><span>Дім</span></a>
        ${slot1 ? renderMobLink(slot1) : ''}
        
        <div class="orb-wrapper">
            <div class="orb-btn" id="orbBtn"><i data-feather="grid"></i></div>
        </div>

        ${slot2 ? renderMobLink(slot2) : ''}
        ${slot3 ? renderMobLink(slot3) : ''}
    `;
    document.body.appendChild(mobileBar);

    // 7. Мобільне меню (Overlay) з Staggered Animation
    const menuOverlay = document.createElement('div');
    menuOverlay.className = 'orbital-menu';
    menuOverlay.id = 'orbitalMenu';
    
    let gridHTML = `<div class="menu-grid">`;
    let delayCounter = 0;

    links.forEach(l => {
        const isInBar = l.type.includes('mobile-main') || l.href === 'index.html';
        
        if ((!isInBar || l.href === 'ads.html') && (!l.adminOnly || isAdmin)) {
             const action = l.action === 'logout' ? 'onclick="logout(); return false;"' : '';
             const dangerClass = l.danger ? 'danger' : '';
             const activeClass = isActive(l.href) ? 'style="border-color: var(--primary); background: rgba(99, 102, 241, 0.1);"' : '';
             
             // Додаємо delay для анімації
             const animStyle = `animation-delay: ${delayCounter * 0.05}s`;
             delayCounter++;

             gridHTML += `
                <a href="${l.href}" class="menu-card ${dangerClass}" ${action} ${activeClass} style="${animStyle}">
                    <i data-feather="${l.icon}"></i>
                    <span>${l.text}</span>
                </a>
             `;
        }
    });
    gridHTML += `</div>`;
    menuOverlay.innerHTML = gridHTML;
    document.body.appendChild(menuOverlay);

    // Допоміжна функція активного стану
    function isActive(href) {
        const currentPath = window.location.pathname.split('/').pop() || 'index.html';
        return href === currentPath || (href !== '#' && currentPath.includes(href));
    }

    // 8. Ініціалізація іконок
    if (typeof feather !== 'undefined') feather.replace();

    // 9. Логіка відкриття меню
    const orbBtn = document.getElementById('orbBtn');
    const orbitalMenu = document.getElementById('orbitalMenu');

    if (orbBtn) {
        orbBtn.addEventListener('click', () => {
            toggleMenu();
        });
        
        // Закриття при кліку на фон
        orbitalMenu.addEventListener('click', (e) => {
            if (e.target === orbitalMenu) toggleMenu();
        });

        function toggleMenu() {
            const isOpen = orbitalMenu.classList.contains('active');
            if (isOpen) {
                orbitalMenu.classList.remove('active');
                orbBtn.classList.remove('open');
                setTimeout(() => { orbBtn.innerHTML = `<i data-feather="grid"></i>`; feather.replace(); }, 200);
            } else {
                orbitalMenu.classList.add('active');
                orbBtn.classList.add('open');
                orbBtn.innerHTML = `<i data-feather="x"></i>`;
                feather.replace();
            }
        }
    }
});