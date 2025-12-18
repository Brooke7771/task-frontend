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

// --- 🎄 GLOBAL GARLAND LOGIC 🎄 ---
document.addEventListener('DOMContentLoaded', () => {
    const isXmas = localStorage.getItem('theme-xmas') === 'true';
    if (!isXmas) return;

    // Якщо ми не на сторінці налаштувань (там свій скрипт), додаємо гірлянду
    // Або просто перевіряємо, чи вона вже є
    if (document.getElementById('xmas-garland-container')) return;

    // Функція створення (дублюється для глобального доступу)
    const container = document.createElement('div');
    container.id = 'xmas-garland-container';

    const topStrand = document.createElement('div');
    topStrand.className = 'garland-strand garland-top';
    for (let i = 0; i < 20; i++) { const b = document.createElement('div'); b.className = 'bulb'; topStrand.appendChild(b); }

    const leftStrand = document.createElement('div');
    leftStrand.className = 'garland-strand garland-side garland-left';
    for (let i = 0; i < 15; i++) { const b = document.createElement('div'); b.className = 'bulb'; leftStrand.appendChild(b); }

    const rightStrand = document.createElement('div');
    rightStrand.className = 'garland-strand garland-side garland-right';
    for (let i = 0; i < 15; i++) { const b = document.createElement('div'); b.className = 'bulb'; rightStrand.appendChild(b); }

    container.appendChild(topStrand);
    container.appendChild(leftStrand);
    container.appendChild(rightStrand);
    document.body.appendChild(container);

    // Фізика
    let lastScrollY = window.scrollY;
    let velocity = 0;
    const loop = () => {
        const current = window.scrollY;
        const diff = current - lastScrollY;
        lastScrollY = current;
        velocity += diff * 0.05; 
        velocity *= 0.9; 
        
        // Обмеження
        const rot = Math.max(-15, Math.min(15, velocity));
        
        leftStrand.style.transform = `rotate(${rot}deg)`;
        rightStrand.style.transform = `rotate(${-rot}deg)`;
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
});