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

// --- 🎄 STATIC DRAPED GARLAND LOGIC 🎄 ---
document.addEventListener('DOMContentLoaded', () => {
    // Експортуємо функцію для виклику з налаштувань
    window.refreshGarland = () => {
        const isXmas = localStorage.getItem('theme-xmas') === 'true';
        const containerId = 'xmas-garland-container';
        let container = document.getElementById(containerId);

        // Якщо тема вимкнена - прибираємо гірлянду
        if (!isXmas) {
            if (container) container.remove();
            return;
        }

        // Якщо контейнер вже є - очищаємо його, щоб перемалювати (наприклад при зміні розміру вікна)
        if (container) container.innerHTML = '';
        else {
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);
        }

        const colors = ['red', 'gold', 'green', 'blue'];
        let colorIdx = 0;

        // 1. ВЕРХНІ ДУГИ (Розрахунок)
        const drapeWidth = 100; // Ширина однієї дуги в пікселях
        const screenWidth = window.innerWidth;
        // Додаємо +1, щоб перекрити краї
        const count = Math.ceil(screenWidth / drapeWidth) + 1; 

        for (let i = -1; i < count; i++) { // Починаємо з -1 для лівого краю
            const drape = document.createElement('div');
            drape.className = 'garland-drape';
            drape.style.width = `${drapeWidth}px`;
            drape.style.left = `${i * drapeWidth}px`;
            
            // Лампочки на дузі (розміщуємо по кривій)
            // 5 лампочок на дугу
            for (let j = 1; j < 5; j++) {
                const bulb = document.createElement('div');
                bulb.className = `bulb ${colors[colorIdx % colors.length]}`;
                colorIdx++;
                
                // X: Рівномірно
                const percent = j * 20; 
                bulb.style.left = `${percent}%`;
                
                // Y: Формула параболи для провисання
                // (x - 0.5)^2 * 4 * depth
                const x = percent / 100;
                const drop = Math.sin(x * Math.PI) * 25; // 25px глибина
                bulb.style.top = `${drop}px`; 

                drape.appendChild(bulb);
            }
            container.appendChild(drape);
        }

        // 2. БОКОВІ ЛІНІЇ
        const createSide = (sideClass) => {
            const side = document.createElement('div');
            side.className = `garland-vertical ${sideClass}`;
            // Лампочка кожні 50px
            const bulbCount = Math.ceil(window.innerHeight / 50); 

            for (let k = 0; k < bulbCount; k++) {
                const bulb = document.createElement('div');
                bulb.className = `bulb ${colors[colorIdx % colors.length]}`;
                colorIdx++;
                bulb.style.top = `${k * 50 + 40}px`; // +40px відступ від верху
                side.appendChild(bulb);
            }
            container.appendChild(side);
        }

        createSide('side-left');
        createSide('side-right');
    };

    // Запускаємо при завантаженні
    window.refreshGarland();

    // Перемальовуємо при зміні розміру вікна (щоб дуги не ламались)
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => window.refreshGarland(), 200);
    });
});