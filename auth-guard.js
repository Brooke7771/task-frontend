// frontend/auth-guard.js

// Перевіряємо, чи є маркер входу
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'login.html' || currentPage === '') return;

    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // Перевірка прав доступу до сторінки
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (isAdmin) return; // Адміну можна все

    const allowedPages = JSON.parse(localStorage.getItem('allowedPages') || "[]");
    
    // Якщо сторінки немає в списку дозволених (і це не спільні сторінки типу task-list)
    // Можна налаштувати логіку жорсткіше
    if (!allowedPages.includes(currentPage) && 
        currentPage !== 'index.html' && 
        currentPage !== 'task-list.html') { // Базові сторінки, які доступні всім затвердженим
        
       // alert("У вас немає доступу до цієї сторінки.");
       // window.location.href = 'index.html';
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

    // 1. Імпорт фізики
    const loadPhysicsGarland = async () => {
        if (physicsGarlandInstance) return;
        try {
            const module = await import('./garland.js');
            // Тепер ми ініціалізуємо Менеджера, який керує всім
            physicsGarlandInstance = new module.PhysicsManager(); 
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

    // 2. Декорації (Ялинка HTML)
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
                // HTML для CSS-ялинки
                tree.innerHTML = `
                    <div class="tree-trunk"></div>
                    <div class="tree-layer tree-bot"></div>
                    <div class="tree-layer tree-mid"></div>
                    <div class="tree-layer tree-top"></div>
                    <div class="tree-star">★</div>
                    <div class="tree-bauble t-1"></div>
                    <div class="tree-bauble t-2"></div>
                    <div class="tree-bauble t-3"></div>
                    <div class="tree-bauble t-4"></div>
                    <div class="tree-gift"></div>
                `;
                document.body.appendChild(tree);
            }
            if (!santa) {
                santa = document.createElement('div');
                santa.id = santaId;
                santa.onclick = () => {
                    alert("🎅 Хо-хо-хо! Щасливого кодингу!");
                    // Тут можна додати запуск феєрверку або музики
                };
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