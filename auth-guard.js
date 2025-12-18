// frontend/auth-guard.js

// Перевіряємо, чи є маркер входу
function checkAuth() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const path = window.location.pathname;
    const currentPage = path.split('/').pop() || 'landing.html'; // Якщо корінь - то landing

    // 🔥 СПИСОК ПУБЛІЧНИХ СТОРІНОК
    const publicPages = ['login.html', 'landing.html', '404.html'];

    // Якщо це публічна сторінка - пускаємо
    if (publicPages.includes(currentPage)) {
        // (Опціонально) Якщо юзер вже залогінений і зайшов на landing/login,
        // можна перекинути його в адмінку/індекс.
        // if (isLoggedIn === 'true' && (currentPage === 'login.html' || currentPage === 'landing.html')) {
        //     window.location.href = 'index.html';
        // }
        return; 
    }

    // 1. Перевірка логіну для інших сторінок
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

    const assets = {
        // Фотореалістична ялинка (PNG з прозорим фоном)
        treeImage: '/assets/tree.png', // Наприклад: './assets/real-tree.png'
        
        // Силует Санти на санях (PNG з прозорим фоном)
        santaImage: '/assets/santa.png', // Наприклад: './assets/santa-silhouette.png'
        
        // Звук дзвіночків (MP3, короткий, тихий)
        jingleSound: '/assets/bell.mp3' // Наприклад: './assets/jingle-bells.mp3'
    };

    let jingleAudio = null;

    // 2. Декорації (Ялинка HTML)
    const toggleDecorations = (show) => {
        const treeId = 'xmas-tree-real';
        const santaId = 'santa-silhouette';

        let treeImg = document.getElementById(treeId);
        let santaImg = document.getElementById(santaId);

        if (show) {
            // 1. Створюємо та додаємо ЯЛИНКУ
            if (!treeImg) {
                treeImg = document.createElement('img');
                treeImg.id = treeId;
                treeImg.src = assets.treeImage; // Використовуємо шлях до картинки
                treeImg.alt = "Christmas Tree Easter Egg";
                // Додаємо підказку при наведенні
                treeImg.title = "Натисни мене... якщо віриш у дива ✨"; 
                document.body.appendChild(treeImg);

                // Ініціалізуємо звук
                if (assets.jingleSound && !jingleAudio) {
                    jingleAudio = new Audio(assets.jingleSound);
                    jingleAudio.volume = 0.4; // Не дуже голосно
                }

                // 🔥 ГОЛОВНА ПАСХАЛКА: Обробник кліку
                treeImg.addEventListener('click', () => {
                    const santa = document.getElementById(santaId);
                    if (santa) {
                        // Якщо анімація вже йде, не запускаємо знову
                        if (santa.classList.contains('santa-flying-animation')) return;

                        // Запускаємо звук
                        if (jingleAudio) {
                            jingleAudio.currentTime = 0;
                            jingleAudio.play().catch(e => console.log("Audio play blocked:", e));
                        }

                        // Запускаємо анімацію
                        santa.classList.add('santa-flying-animation');

                        // Прибираємо клас після завершення анімації (6 секунд), щоб можна було клікнути знову
                        setTimeout(() => {
                            santa.classList.remove('santa-flying-animation');
                        }, 6000); // Час має співпадати з CSS animation duration
                    }
                });
            }

            // 2. Створюємо (прихованого) САНТУ
            if (!santaImg) {
                santaImg = document.createElement('img');
                santaImg.id = santaId;
                santaImg.src = assets.santaImage; // Використовуємо шлях до картинки
                santaImg.alt = "Flying Santa";
                document.body.appendChild(santaImg);
            }

        } else {
            // Якщо тему вимкнено, прибираємо елементи
            if (treeImg) treeImg.remove();
            if (santaImg) santaImg.remove();
            jingleAudio = null;
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