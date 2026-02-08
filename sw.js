const CACHE_NAME = 'taskbot-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/api.js',
  '/auth-guard.js',
  '/nav-loader.js',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('fetch', (e) => {
  // Для API запитів - завжди мережа
  if (e.request.url.includes('/api/')) {
    return; 
  }

  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request);
    })
  );
});

    // Конфігурація посилань
    const links = [
        { href: 'index.html', icon: 'plus-square', text: 'Нове Завдання', type: ['main', 'menu'] },
        { href: 'schedule.html', icon: 'edit-3', text: 'Новий Пост', type: ['main', 'menu'] },
        { href: 'task-list.html', icon: 'trello', text: 'Завдання', type: ['main', 'mobile-main'] },
        { href: 'schedule-list.html', icon: 'clock', text: 'Розклад', type: ['main', 'mobile-main'] }, 
        { href: 'ads.html', icon: 'volume-2', text: 'Реклама', type: ['main', 'menu'] }, // Replacedmegaphone with volume-2
        { href: 'analytics.html', icon: 'bar-chart-2', text: 'Аналітика', type: ['main', 'menu'], adminOnly: true },
        { href: 'ai-strategy.html', icon: 'zap', text: 'AI Strategy', type: ['main', 'menu'], adminOnly: true },
        { href: 'settings.html', icon: 'settings', text: 'Налаштування', type: ['main', 'menu'] },
        { href: 'profile.html', icon: 'user', text: 'Профіль', type: ['main', 'menu'] },
        { href: 'help.html', icon: 'help-circle', text: 'Допомога', type: ['main', 'menu'] },
        { href: 'logout.html', icon: 'log-out', text: 'Вихід', type: ['main', 'menu'] },
    ];