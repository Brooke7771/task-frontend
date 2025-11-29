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