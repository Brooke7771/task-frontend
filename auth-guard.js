// frontend/auth-guard.js

// Перевіряємо, чи є маркер входу
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname.split('/').pop();

    // Якщо це сторінка логіну - нічого не робимо (або редірект на index, якщо вже ввійшли)
    if (currentPage === 'login.html' || currentPage === '') {
        return;
    }

    if (isLoggedIn !== 'true') {
        // Якщо не ввійшли - кидаємо на логін
        window.location.href = 'login.html';
    }
}

// Функція виходу
function logout() {
    if(confirm('Вийти з акаунту?')) {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        window.location.href = 'login.html';
    }
}

// Запускаємо перевірку одразу
checkAuth();

// Експортуємо для використання в інших скриптах (наприклад, для кнопки Logout)
// Або просто робимо глобальною, якщо не використовуємо модулі скрізь
window.logout = logout;

// --- 🎄 GLOBAL CHRISTMAS MANAGER 🎄 ---
document.addEventListener('DOMContentLoaded', async () => {
    let physicsGarlandInstance = null;

    // 1. Імпорт фізики (динамічний, щоб не вантажити, якщо не треба)
    const loadPhysicsGarland = async () => {
        if (physicsGarlandInstance) return;
        try {
            const module = await import('./garland.js');
            physicsGarlandInstance = new module.XmasGarland();
        } catch (e) {
            console.error("Failed to load physics garland:", e);
        }
    };

    const destroyPhysicsGarland = () => {
        if (physicsGarlandInstance) {
            physicsGarlandInstance.destroy();
            physicsGarlandInstance = null;
        }
    };

    // 2. Декорації (Ялинка + Санта)
    const toggleDecorations = (show) => {
        const treeId = 'xmas-tree-decor';
        const santaId = 'santa-btn';
        
        let tree = document.getElementById(treeId);
        let santa = document.getElementById(santaId);

        if (show) {
            if (!tree) {
                tree = document.createElement('div');
                tree.id = treeId;
                tree.className = 'xmas-tree-container';
                // SVG Ялинки
                tree.innerHTML = `
                <svg class="xmas-tree-svg" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
                    <path d="M50 10 L20 50 H40 L15 80 H35 L10 110 H90 L65 80 H85 L55 50 H80 L50 10 Z" fill="#10b981" stroke="#064e3b" stroke-width="2"/>
                    <rect x="45" y="110" width="10" height="10" fill="#8B4513"/>
                    <circle cx="30" cy="100" r="3" fill="#fbbf24" />
                    <circle cx="70" cy="90" r="3" fill="#ef4444" />
                    <circle cx="50" cy="65" r="3" fill="#3b82f6" />
                    <rect x="60" y="105" width="15" height="15" fill="#ef4444" stroke="#fff" stroke-width="1"/> <rect x="66" y="105" width="3" height="15" fill="#fbbf24"/>
                </svg>`;
                document.body.appendChild(tree);
            }
            if (!santa) {
                santa = document.createElement('div');
                santa.id = santaId;
                santa.title = "Хо-хо-хо!";
                santa.onclick = () => alert("🎅 Санта каже: Зберігайте спокій та пишіть код!");
                document.body.appendChild(santa);
            }
        } else {
            if (tree) tree.remove();
            if (santa) santa.remove();
        }
    };

    // 3. Головна функція оновлення
    window.refreshGarland = () => {
        const isXmas = localStorage.getItem('theme-xmas') === 'true';
        const usePhysics = localStorage.getItem('theme-physics') === 'true';

        // Базові декорації
        toggleDecorations(isXmas);

        // Гірлянда
        if (isXmas && usePhysics) {
            loadPhysicsGarland();
        } else {
            destroyPhysicsGarland();
        }
    };

    // Запуск
    window.refreshGarland();
});