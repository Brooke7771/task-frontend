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

// --- 🎄 NEW DRAPED GARLAND LOGIC (NO PHYSICS) 🎄 ---
document.addEventListener('DOMContentLoaded', () => {
    // Функція запуску
    const initGarland = () => {
        const isXmas = localStorage.getItem('theme-xmas') === 'true';
        const containerId = 'xmas-garland-container';
        let container = document.getElementById(containerId);

        // Якщо тема вимкнена - видаляємо гірлянду і виходимо
        if (!isXmas) {
            if (container) container.remove();
            return;
        }

        // Якщо контейнер вже є - не перестворюємо
        if (container) return;

        // Створюємо контейнер
        container = document.createElement('div');
        container.id = containerId;
        document.body.appendChild(container);

        const colors = ['red', 'gold', 'green', 'blue'];
        let colorIdx = 0;

        // 1. ВЕРХНЯ ГІРЛЯНДА (ДУГИ)
        const drapeWidth = 120; // Ширина однієї дуги в px
        const screenWidth = window.innerWidth;
        const count = Math.ceil(screenWidth / drapeWidth);

        for (let i = 0; i < count; i++) {
            const drape = document.createElement('div');
            drape.className = 'garland-drape';
            drape.style.width = `${drapeWidth}px`;
            drape.style.left = `${i * drapeWidth}px`;
            
            // Додаємо лампочки на дугу (наприклад, 5 штук)
            for (let j = 1; j < 5; j++) {
                const bulb = document.createElement('div');
                // Вибираємо колір по черзі
                bulb.className = `bulb ${colors[colorIdx % colors.length]}`;
                colorIdx++;
                
                // Розміщуємо лампочки вздовж дуги
                // Проста формула для симуляції кривої: чим ближче до центру (2.5), тим нижче
                const percent = j * 20; // 20%, 40%, 60%, 80%
                bulb.style.left = `${percent}%`;
                
                // Y позиція (провисання)
                // Синусоїдальна імітація або просто parabola-like
                // Center dip amount: 35px
                const drop = Math.sin((percent / 100) * Math.PI) * 35;
                bulb.style.top = `${drop + 2}px`; 

                drape.appendChild(bulb);
            }
            container.appendChild(drape);
        }

        // 2. БОКОВІ ЛІНІЇ
        const createSide = (sideClass) => {
            const side = document.createElement('div');
            side.className = `garland-vertical ${sideClass}`;
            const bulbCount = Math.floor(window.innerHeight / 60); // Лампочка кожні 60px

            for (let k = 0; k < bulbCount; k++) {
                const bulb = document.createElement('div');
                bulb.className = `bulb ${colors[colorIdx % colors.length]}`;
                colorIdx++;
                bulb.style.top = `${k * 60 + 40}px`; // Відступ зверху
                side.appendChild(bulb);
            }
            container.appendChild(side);
        }

        createSide('side-left');
        createSide('side-right');
    };

    // Запускаємо одразу
    initGarland();

    // Слухаємо зміни розміру вікна, щоб перемалювати дуги (опціонально, але гарно)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            const container = document.getElementById('xmas-garland-container');
            if (container) container.remove();
            initGarland();
        }, 300);
    });
    
    // Експортуємо функцію для виклику з налаштувань
    window.refreshGarland = initGarland;
});