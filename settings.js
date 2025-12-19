import { 
    getSettings, 
    updateSettings, 
    getMyProfile,
    changePassword
} from './api.js';

document.addEventListener('DOMContentLoaded', () => {
    // UI Helpers
    const showToast = (msg, type = 'success') => {
        const toast = document.getElementById('statusMessage');
        const icon = type === 'success' ? 'check-circle' : 'alert-circle';
        
        toast.innerHTML = `<i data-feather="${icon}"></i> <span>${msg}</span>`;
        toast.className = type === 'visible' ? 'visible' : `visible ${type}`;
        
        if(window.feather) feather.replace();

        setTimeout(() => {
            toast.className = '';
        }, 3000);
    };

    // --- 1. ТЕМИ ТА ЕФЕКТИ ---
    const initUI = () => {
        const themeBtn = document.getElementById('theme-toggle');
        const xmasBtn = document.getElementById('xmas-toggle');
        const physicsBtn = document.getElementById('physics-toggle');
        const htmlEl = document.documentElement;

        const updateState = () => {
            // Theme
            const isDark = htmlEl.classList.contains('dark');
            themeBtn.classList.toggle('active', isDark);
            document.getElementById('theme-text').textContent = isDark ? 'Темна' : 'Світла';

            // Xmas
            const isXmas = htmlEl.classList.contains('theme-xmas');
            xmasBtn.classList.toggle('active', isXmas);

            // Physics
            const isPhysics = localStorage.getItem('theme-physics') === 'true';
            physicsBtn.classList.toggle('active', isPhysics);
            
            // Disable physics if xmas is off
            if (!isXmas) {
                physicsBtn.style.opacity = '0.5';
                physicsBtn.style.pointerEvents = 'none';
            } else {
                physicsBtn.style.opacity = '1';
                physicsBtn.style.pointerEvents = 'auto';
            }
        };

        themeBtn.onclick = () => {
            htmlEl.classList.toggle('dark');
            localStorage.setItem('theme', htmlEl.classList.contains('dark') ? 'dark' : 'light');
            updateState();
        };

        xmasBtn.onclick = () => {
            htmlEl.classList.toggle('theme-xmas');
            // Force dark mode for xmas
            if(htmlEl.classList.contains('theme-xmas')) htmlEl.classList.add('dark');
            
            localStorage.setItem('theme-xmas', htmlEl.classList.contains('theme-xmas'));
            if(window.refreshGarland) window.refreshGarland();
            updateState();
        };

        physicsBtn.onclick = () => {
            const newState = !(localStorage.getItem('theme-physics') === 'true');
            localStorage.setItem('theme-physics', newState);
            if(window.refreshGarland) window.refreshGarland();
            updateState();
        };

        updateState();
    };
    initUI();

    // --- 2. ПРОФІЛЬ ---
    const loadProfile = async () => {
        try {
            const user = await getMyProfile();
            
            // Set Avatar
            const initial = (user.username || 'U').charAt(0).toUpperCase();
            document.getElementById('avatarText').textContent = initial;
            
            // Set Text
            document.getElementById('profile-name').textContent = user.username;
            document.getElementById('profile-tg').textContent = user.telegram_username || '@не вказано';
            document.getElementById('profile-id').textContent = '#' + user.id;

            // Set Role Badge
            const roleEl = document.getElementById('profile-role');
            if (user.is_admin) {
                roleEl.textContent = 'Administrator';
                roleEl.className = 'profile-badge badge-admin';
            } else {
                roleEl.textContent = 'Editor';
                roleEl.className = 'profile-badge';
                // Hide AI settings for non-admins
                const aiCard = document.getElementById('aiSettingsCard');
                if(aiCard) aiCard.style.display = 'none';
            }

        } catch (e) {
            console.error("Failed to load profile", e);
        }
    };

    // --- 3. ПАРОЛЬ ---
    const passwordForm = document.getElementById('passwordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const p1 = document.getElementById('new_pass').value;
            const p2 = document.getElementById('confirm_pass').value;

            if (p1 !== p2) {
                showToast("Паролі не співпадають!", "error");
                return;
            }
            if (p1.length < 6) {
                showToast("Пароль надто короткий (мін. 6)", "error");
                return;
            }

            try {
                await changePassword(p1);
                showToast("Пароль успішно змінено!");
                passwordForm.reset();
            } catch (e) {
                showToast("Помилка зміни паролю", "error");
            }
        });
    }

    // --- 4. AI PROMPT ---
    const loadAiSettings = async () => {
        try {
            const data = await getSettings();
            if (data && data.system_prompt) {
                document.getElementById('system_prompt').value = data.system_prompt;
            }
        } catch (error) { console.error(error); }
    };

    const aiForm = document.getElementById('aiForm');
    if (aiForm) {
        aiForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveAiBtn');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="loader"></span> Збереження...';
            
            try {
                await updateSettings({ system_prompt: document.getElementById('system_prompt').value });
                showToast("AI конфігурацію оновлено!");
            } catch (error) {
                showToast("Помилка збереження", "error");
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }

    // Init
    loadProfile();
    loadAiSettings();
});