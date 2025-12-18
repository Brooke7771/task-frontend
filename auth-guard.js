// frontend/auth-guard.js

// Перевіряємо, чи є маркер входу
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const currentPage = window.location.pathname.split('/').pop() || 'chat.html'; // Обробка кореня

    // Сторінки, які не потребують авторизації
    if (currentPage === 'login.html') return;

    // 1. Перевірка логіну
    if (isLoggedIn !== 'true') {
        window.location.href = 'login.html';
        return;
    }

    // 2. Перевірка прав (якщо не Адмін)
    const isAdmin = localStorage.getItem('isAdmin') === 'true';
    if (isAdmin) return; // Адміну можна все

    const allowedPagesJson = localStorage.getItem('allowedPages');
    const allowedPages = allowedPagesJson ? JSON.parse(allowedPagesJson) : [];

    // Додаємо 'index.html' до дозволених за замовчуванням, якщо його там немає, 
    // але тільки якщо це "базова" сторінка. 
    // Хоча краще суворо: якщо немає в списку - до побачення.
    
    if (!allowedPages.includes(currentPage)) {
        // Якщо це task-list.html або index.html, іноді варто дати доступ всім, 
        // але за вашим запитом робимо суворо.
        
        alert("⛔️ У вас немає доступу до цієї сторінки.");
        
        // Якщо є доступ хоча б до чогось, кидаємо туди, інакше на логін
        if (allowedPages.length > 0) {
            window.location.href = allowedPages[0];
        } else {
            window.location.href = 'login.html';
        }
    }
}

function logout() {
    if(confirm('Вийти з акаунту?')) {
        localStorage.clear(); // Чистимо все
        window.location.href = 'login.html';
    }
}

checkAuth();
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
        const flySantaId = 'santa-fly-container';

        let tree = document.getElementById(treeId);
        let santa = document.getElementById(santaId);
        let flySanta = document.getElementById(flySantaId);

        if (show) {
            // 🎄 Створення ЯЛИНКИ
            if (!tree) {
                tree = document.createElement('div');
                tree.id = treeId;
                tree.className = 'xmas-tree-container';
                // Оновлений, деталізований HTML ялинки
                tree.innerHTML = `
                    <div class="tree-trunk"></div>
                    <div class="tree-layer tree-bot"></div>
                    <div class="tree-layer tree-mid"></div>
                    <div class="tree-layer tree-top"></div>
                    <div class="tree-garland"></div>
                    <div class="tree-star">★</div>
                    <div class="tree-bauble t-1"></div><div class="tree-bauble t-2"></div>
                    <div class="tree-bauble t-3"></div><div class="tree-bauble t-4"></div>
                    <div class="tree-bauble t-5"></div>
                    <div class="tree-gift"><div class="gift-bow"></div></div>
                `;
                document.body.appendChild(tree);

                // 🔥 ДОДАЄМО ОБРОБНИК КЛІКУ ДЛЯ АНІМАЦІЇ
                tree.addEventListener('click', () => {
                    const container = document.getElementById(flySantaId);
                    if (container) {
                        // Відтворюємо звук (опціонально)
                        // new Audio('hohoho.mp3').play();

                        container.style.display = 'block'; // Показуємо контейнер
                        
                        // Перезапуск анімації (клон елемента)
                        const santaEl = container.querySelector('.flying-santa');
                        const newSanta = santaEl.cloneNode(true);
                        container.replaceChild(newSanta, santaEl);

                        // Ховаємо після завершення
                        setTimeout(() => { container.style.display = 'none'; }, 4000);
                    }
                });
            }

            // 🎅 Створення контейнера для ЛЕТЮЧОГО САНТИ
            if (!flySanta) {
                flySanta = document.createElement('div');
                flySanta.id = flySantaId;
                flySanta.innerHTML = '<div class="flying-santa">🎅🛷</div>';
                document.body.appendChild(flySanta);
            }
            
            // Кнопка Санти (стара, якщо треба)
            if (!santa) {
                santa = document.createElement('div');
                santa.id = santaId;
                santa.onclick = () => alert("🎅 Хо-хо-хо! Щасливого кодингу!");
                document.body.appendChild(santa);
            }
        } else {
            if (tree) tree.remove();
            if (santa) santa.remove();
            if (flySanta) flySanta.remove();
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