// frontend/garland.js

// === CONFIGURATION ===
const CONFIG = {
    // Палітра "Warm & Cozy" + трохи "Cyber"
    colors: [
        '#ff3b30', // Red Neon
        '#ff9500', // Deep Orange
        '#ffcc00', // Warm Gold
        '#34c759', // Matrix Green
        '#5ac8fa', // Ice Blue
        '#007aff', // Electric Blue
        '#af52de', // Purple Haze
        '#ff2d55', // Hot Pink
        '#ffffff'  // Pure White
    ],
    wireColor: '#1a1a1a', // Майже чорний
    wireHighlight: '#333333', // Блік
    gravity: 0.65, // Трохи важче
    friction: 0.95, 
    stiffness: 1.0, 
    snowInteractionRadius: 120,
    windForce: 0.0015 // Легкий вітерець
};

// === 1. CLASS: HYPER GARLAND (Cinematic Visuals) ===
class XmasGarland {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.constraints = [];
        this.bulbs = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.segmentLength = window.innerWidth < 600 ? 24 : 18;
        this.time = 0;

        // Контейнер для DOM-елементів (лампочок)
        this.bulbContainer = document.getElementById('garland-bulbs-container');
        if (!this.bulbContainer) {
            this.bulbContainer = document.createElement('div');
            this.bulbContainer.id = 'garland-bulbs-container';
            Object.assign(this.bulbContainer.style, {
                position: 'fixed', top: '0', left: '0', width: '100%', height: '0',
                overflow: 'visible', zIndex: '99998', pointerEvents: 'none'
            });
            document.body.appendChild(this.bulbContainer);
        }
        
        this.injectStyles();
        this.init();
    }

    injectStyles() {
        if (document.getElementById('garland-styles')) return;
        const style = document.createElement('style');
        style.id = 'garland-styles';
        style.innerHTML = `
            /* Основна колба */
            .physics-bulb {
                position: absolute;
                width: 24px; height: 36px;
                /* Скляний градієнт: прозорість + колір */
                background: 
                    radial-gradient(circle at 30% 30%, rgba(255,255,255,0.9), rgba(255,255,255,0.1) 20%, transparent 60%),
                    linear-gradient(to bottom, rgba(255,255,255,0.1), var(--bulb-color-transparent));
                border-radius: 50% 50% 45% 45%;
                transform-origin: center -6px; /* Точка кріплення трохи вище */
                box-shadow: 0 0 20px var(--bulb-glow), inset 0 -5px 15px rgba(0,0,0,0.2);
                will-change: transform, box-shadow;
                transition: transform 0.1s linear;
                z-index: 10;
            }

            /* Цоколь (Метал) */
            .physics-bulb::before { 
                content: ''; position: absolute; top: -10px; left: 5px;
                width: 14px; height: 12px; 
                background: repeating-linear-gradient(
                    90deg, 
                    #222, #222 2px, 
                    #444 3px, #444 4px
                );
                border-radius: 2px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.5);
            }

            /* Нитка розжарювання (Filament) */
            .physics-bulb::after {
                content: ''; position: absolute; top: 8px; left: 8px;
                width: 8px; height: 10px;
                border: 2px solid rgba(255, 255, 200, 0.8);
                border-top: none;
                border-radius: 0 0 10px 10px;
                filter: drop-shadow(0 0 2px rgba(255, 255, 0, 0.8));
                opacity: 0.8;
                animation: filament-flicker 4s infinite;
            }

            @keyframes filament-flicker {
                0%, 100% { opacity: 0.8; filter: drop-shadow(0 0 2px rgba(255, 255, 0, 0.8)); }
                50% { opacity: 0.6; filter: drop-shadow(0 0 1px rgba(255, 200, 0, 0.5)); }
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        this.createRope();
    }

    createRope() {
        this.bulbContainer.innerHTML = '';
        this.bulbs = [];
        this.points = [];
        this.constraints = [];

        const totalSegments = Math.ceil(this.width / this.segmentLength);
        // Починаємо трохи вище екрану, щоб дріт "виходив" зі стелі
        const startY = -20;
        
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const x = t * this.width;
            
            // Catenary Curve (Ланцюгова лінія) для природного провисання
            // Math.cosh - це гіперболічний косинус, ідеально описує провисаючий кабель
            const sagFactor = 100; // Глибина провисання
            const catenary = Math.sin(t * Math.PI) * sagFactor; 
            
            // Додаємо мікро-шум для реалізму (кабель не ідеально рівний)
            const noise = (Math.random() - 0.5) * 2;
            const y = startY + catenary + noise; 
            
            // Кріплення (Pinning)
            // Закріплюємо краї та кілька точок посередині ("цвяхи")
            const pinFrequency = window.innerWidth < 600 ? 6 : 9;
            const pinned = (i === 0 || i === totalSegments || i % pinFrequency === 0);

            this.points.push({ x, y, oldx: x, oldy: y, pinned });

            // Додаємо лампочки
            // Не вішаємо на самому кріпленні і поруч (щоб не билися об стіну/стелю)
            if (!pinned && i % 2 === 0 && i > 1 && i < totalSegments - 1) {
                const distToPin = Math.min(i % pinFrequency, pinFrequency - (i % pinFrequency));
                if (distToPin > 1) { // Безпечна відстань від "цвяха"
                    this.addBulb(i);
                }
            }
        }

        // Constraints (Зв'язки)
        for (let i = 0; i < this.points.length - 1; i++) {
            this.constraints.push({ 
                p1: this.points[i], 
                p2: this.points[i + 1], 
                length: Math.hypot(this.points[i+1].x - this.points[i].x, this.points[i+1].y - this.points[i].y)
            });
        }
    }

    addBulb(pointIndex) {
        const el = document.createElement('div');
        const colorIdx = Math.floor(Math.random() * CONFIG.colors.length);
        const color = CONFIG.colors[colorIdx];
        
        el.className = 'physics-bulb';
        
        // CSS змінні для кольору
        // --bulb-color-transparent: для градієнту скла (напівпрозорий)
        // --bulb-glow: для світіння (яскравий)
        el.style.setProperty('--bulb-color-transparent', color + '66'); // Hex + opacity
        el.style.setProperty('--bulb-glow', color);
        
        this.bulbContainer.appendChild(el);
        
        this.bulbs.push({ 
            el, 
            pointIndex, 
            colorIndex: colorIdx,
            nextColorIndex: (colorIdx + 1) % CONFIG.colors.length,
            transitionProgress: Math.random(), 
            transitionSpeed: 0.003 + Math.random() * 0.005, // Дуже повільна зміна кольору
            angleOffset: (Math.random() - 0.5) * 0.5, // Невеликий випадковий нахил
            swing: 0
        });
    }

    update(mouse, scrollDiff) {
        this.time += 0.02;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // --- 1. ФІЗИКА (VERLET INTEGRATION) ---
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * CONFIG.friction;
                const vy = (p.y - p.oldy) * CONFIG.friction;
                
                p.oldx = p.x;
                p.oldy = p.y;
                
                // Вітер: сума кількох синусоїд для "турбулентності"
                const wind = (
                    Math.sin(this.time + p.y * 0.02) + 
                    Math.cos(this.time * 0.5 + p.x * 0.01)
                ) * CONFIG.windForce;
                
                p.x += vx + wind;
                p.y += vy + CONFIG.gravity;
                p.y -= scrollDiff * 0.5; // Реакція на скрол

                // Інтерактивність (Мишка)
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 8; // М'який поштовх
                    p.y += Math.sin(angle) * force * 8;
                }
            }
        }

        // --- 2. ЖОРСТКІСТЬ (CONSTRAINTS SOLVING) ---
        // 5 ітерацій для супер-стабільного дроту
        for (let k = 0; k < 5; k++) { 
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.hypot(dx, dy);
                const diff = (c.length - dist) / dist * 0.5 * CONFIG.stiffness;
                
                if (!c.p1.pinned) { c.p1.x -= dx * diff; c.p1.y -= dy * diff; }
                if (!c.p2.pinned) { c.p2.x += dx * diff; c.p2.y += dy * diff; }
            }
        }

        // --- 3. МАЛЮВАННЯ ДРОТУ (High Quality) ---
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // A. Тінь дроту (для об'єму)
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        this.ctx.lineWidth = 6;
        this.drawCurve(4, 8); // Зсув тіні
        this.ctx.stroke();

        // B. Основний кабель (Чорний)
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.wireColor;
        this.ctx.lineWidth = 4;
        this.drawCurve(0, 0);
        this.ctx.stroke();
        
        // C. Блік зверху (для ефекту гуми/пластику)
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        this.ctx.lineWidth = 1.5;
        this.drawCurve(0, -1); // Трохи вище центру
        this.ctx.stroke();

        // --- 4. ОНОВЛЕННЯ ЛАМПОЧОК ---
        // Малюємо світіння на підлозі (Canvas)
        this.ctx.globalCompositeOperation = 'lighter';
        
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prev = this.points[b.pointIndex - 1];
            const next = this.points[b.pointIndex + 1];
            
            // 1. Color morphing
            b.transitionProgress += b.transitionSpeed;
            if (b.transitionProgress >= 1) {
                b.transitionProgress = 0;
                b.colorIndex = b.nextColorIndex;
                b.nextColorIndex = (b.colorIndex + 1) % CONFIG.colors.length;
                if (Math.random() > 0.8) b.nextColorIndex = Math.floor(Math.random() * CONFIG.colors.length);
                
                const newColor = CONFIG.colors[b.colorIndex];
                b.el.style.setProperty('--bulb-color-transparent', newColor + '66');
                b.el.style.setProperty('--bulb-glow', newColor);
            }

            // 2. Розрахунок кута (Tangent vector)
            let wireAngle = 0;
            if (prev && next) {
                wireAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
            }

            // 3. Інерція для хитання
            const vx = p.x - p.oldx;
            b.swing = b.swing * 0.93 + vx * 0.04; 

            // 4. Фінальний кут + Позиція
            const finalAngle = wireAngle + (Math.PI / 2) + b.angleOffset + b.swing;
            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${finalAngle}rad) translate(-50%, 0)`;

            // 5. Glow Reflection on Snow (Світіння внизу екрану)
            // Тільки якщо лампочка низько
            if (p.y > this.height - 250) {
                const color = CONFIG.colors[b.colorIndex];
                const intensity = Math.max(0, (p.y - (this.height - 250)) / 250); // Чим нижче, тим яскравіше на снігу
                
                if (intensity > 0) {
                    const groundY = this.height - 20; // Приблизний рівень землі
                    const grad = this.ctx.createRadialGradient(p.x, groundY, 0, p.x, groundY, 120);
                    grad.addColorStop(0, color + Math.floor(intensity * 40).toString(16)); // Hex opacity approx
                    grad.addColorStop(1, 'transparent');
                    
                    this.ctx.fillStyle = grad;
                    this.ctx.beginPath();
                    this.ctx.ellipse(p.x, groundY, 100, 30, 0, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        }
        this.ctx.globalCompositeOperation = 'source-over';
    }

    drawCurve(offsetX, offsetY) {
        if (!this.points.length) return;
        this.ctx.moveTo(this.points[0].x + offsetX, this.points[0].y + offsetY);
        
        // Використовуємо Quadratic Curve через серединні точки для максимальної плавності
        for (let i = 1; i < this.points.length - 1; i++) {
            const xc = (this.points[i].x + this.points[i + 1].x) / 2 + offsetX;
            const yc = (this.points[i].y + this.points[i + 1].y) / 2 + offsetY;
            this.ctx.quadraticCurveTo(this.points[i].x + offsetX, this.points[i].y + offsetY, xc, yc);
        }
        
        this.ctx.lineTo(this.points[this.points.length - 1].x + offsetX, this.points[this.points.length - 1].y + offsetY);
    }
}

// === 2. CLASS: INTERACTIVE WINTER (Сніг) ===
class WinterSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.groundMap = new Float32Array(this.width);
        this.maxSnowHeight = 140; 
        
        this.initFlakes();
    }

    initFlakes() {
        const count = window.innerWidth < 800 ? 150 : 350;
        for (let i = 0; i < count; i++) {
            this.flakes.push(this.createFlake(true));
        }
    }

    createFlake(initial = false) {
        return {
            x: Math.random() * this.width,
            y: initial ? Math.random() * this.height : -20,
            vx: (Math.random() - 0.5) * 1, // Повільніший горизонтальний рух
            vy: Math.random() * 1.5 + 0.5, // Повільніше падіння
            size: Math.random() * 2.5 + 1,
            opacity: Math.random() * 0.5 + 0.3,
            blur: Math.random() > 0.5 // Деякі сніжинки розмиті (глибина різкості)
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.groundMap = new Float32Array(this.width);
    }

    update(mouse, mouseSpeed) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // A. СНІГОПРИБИРАННЯ (Melting Logic)
        if (mouse.y > this.height - this.maxSnowHeight - 100) {
            const meltRadius = 40;
            const startX = Math.floor(Math.max(0, mouse.x - meltRadius));
            const endX = Math.floor(Math.min(this.width, mouse.x + meltRadius));
            
            for (let x = startX; x < endX; x++) {
                const dist = Math.abs(x - mouse.x);
                // "Копаємо" тільки якщо мишка реально в снігу
                const snowTop = this.height - this.groundMap[x];
                if (mouse.y >= snowTop - 30) {
                    const meltAmount = Math.max(0, (1 - dist / meltRadius) * 4);
                    this.groundMap[x] = Math.max(0, this.groundMap[x] - meltAmount);
                }
            }
        }

        // B. СНІЖИНКИ
        this.ctx.fillStyle = "white";
        
        for (let i = 0; i < this.flakes.length; i++) {
            const f = this.flakes[i];
            
            // Взаємодія (вітер від мишки)
            const dx = f.x - mouse.x;
            const dy = f.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < CONFIG.snowInteractionRadius && mouseSpeed > 1) {
                const force = (CONFIG.snowInteractionRadius - dist) / CONFIG.snowInteractionRadius;
                f.vx += (dx / dist) * force * mouseSpeed * 0.05;
                f.vy += (dy / dist) * force * mouseSpeed * 0.05;
            }

            f.x += f.vx;
            f.y += f.vy;
            f.vx *= 0.99; // Air resistance

            // Ground Collision
            const floorX = Math.floor(f.x);
            let grounded = false;

            if (floorX >= 0 && floorX < this.width) {
                if (f.y >= this.height - this.groundMap[floorX]) {
                    grounded = true;
                    if (this.groundMap[floorX] < this.maxSnowHeight) {
                        this.groundMap[floorX] += f.size * 0.4;
                        // Розсипання (Smoothing)
                        if (floorX > 0) this.groundMap[floorX-1] += f.size * 0.1;
                        if (floorX < this.width-1) this.groundMap[floorX+1] += f.size * 0.1;
                    }
                }
            }

            if (grounded || f.y > this.height || f.x > this.width || f.x < 0) {
                this.flakes[i] = this.createFlake();
            } else {
                this.ctx.globalAlpha = f.opacity;
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        // C. ЗЕМЛЯ (SNOW GROUND)
        // 1. Smoothing (Згладжування кучугур)
        for (let j = 0; j < 2; j++) { 
            for (let x = 1; x < this.width - 1; x++) {
                this.groundMap[x] = (this.groundMap[x-1] + this.groundMap[x] + this.groundMap[x+1]) / 3;
            }
        }

        // 2. Draw
        const snowGrad = this.ctx.createLinearGradient(0, this.height - this.maxSnowHeight, 0, this.height);
        snowGrad.addColorStop(0, '#ffffff'); // Білий верх
        snowGrad.addColorStop(1, '#cce0ff'); // Блакитний низ (тінь)

        this.ctx.fillStyle = snowGrad;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "rgba(255,255,255,0.4)";
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x < this.width; x+=3) { // Оптимізація кроку малювання
            this.ctx.lineTo(x, this.height - this.groundMap[x]);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
}

// === 3. MANAGER ===
export class PhysicsManager {
    constructor() {
        this.isActive = true;
        this.garlandCanvas = this.createCanvas('physics-garland-canvas', 99998);
        this.snowCanvas = this.createCanvas('physics-snow-canvas', 99999);
        this.snowCanvas.style.pointerEvents = 'none';

        this.garland = new XmasGarland(this.garlandCanvas);
        this.winter = new WinterSystem(this.snowCanvas);

        this.mouse = { x: -100, y: -100 };
        this.lastMouse = { x: -100, y: -100 };
        this.mouseSpeed = 0;
        this.lastScrollY = window.scrollY;

        this.bindEvents();
        this.createControls();
        
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    createCanvas(id, zIndex) {
        const c = document.createElement('canvas');
        c.id = id;
        Object.assign(c.style, {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            zIndex: zIndex, pointerEvents: 'none'
        });
        document.body.appendChild(c);
        c.width = window.innerWidth;
        c.height = window.innerHeight;
        return c;
    }

    createControls() {
        const btn = document.createElement('button');
        btn.innerHTML = '❄️';
        Object.assign(btn.style, {
            position: 'fixed', bottom: '20px', left: '20px',
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(30, 41, 59, 0.6)', // Темний фон під стиль Nebula
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white', fontSize: '20px', cursor: 'pointer',
            zIndex: '100001', backdropFilter: 'blur(10px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
            boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
        });
        
        btn.onclick = () => {
            this.isActive = !this.isActive;
            btn.innerHTML = this.isActive ? '❄️' : '🌙';
            btn.style.opacity = this.isActive ? '1' : '0.6';
            btn.style.transform = this.isActive ? 'scale(1)' : 'scale(0.9)';
            
            this.garlandCanvas.style.opacity = this.isActive ? '1' : '0';
            this.snowCanvas.style.opacity = this.isActive ? '1' : '0';
            const bulbs = document.getElementById('garland-bulbs-container');
            if (bulbs) bulbs.style.opacity = this.isActive ? '1' : '0';
        };

        // Hover ефекти
        btn.onmouseenter = () => { if(this.isActive) btn.style.transform = 'scale(1.1)'; };
        btn.onmouseleave = () => { if(this.isActive) btn.style.transform = 'scale(1)'; };
        
        document.body.appendChild(btn);
        this.controlBtn = btn;
    }

    bindEvents() {
        this.resizeHandler = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            this.garlandCanvas.width = w;
            this.garlandCanvas.height = h;
            this.snowCanvas.width = w;
            this.snowCanvas.height = h;
            this.garland.width = w; 
            this.garland.height = h;
            this.garland.init(); 
            this.winter.resize();
        };
        
        this.mouseHandler = (e) => { 
            this.mouse.x = e.clientX; 
            this.mouse.y = e.clientY; 
        };

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(this.resizeHandler, 100);
        });
        document.addEventListener('mousemove', this.mouseHandler);
    }

    animate() {
        if (!this.isActive) {
            requestAnimationFrame(this.loop);
            return;
        }
        const currentScroll = window.scrollY;
        const scrollDiff = currentScroll - this.lastScrollY;
        this.lastScrollY = currentScroll;

        const dx = this.mouse.x - this.lastMouse.x;
        const dy = this.mouse.y - this.lastMouse.y;
        this.mouseSpeed = Math.hypot(dx, dy);
        this.lastMouse.x = this.mouse.x;
        this.lastMouse.y = this.mouse.y;

        this.garland.update(this.mouse, scrollDiff);
        this.winter.update(this.mouse, this.mouseSpeed);

        requestAnimationFrame(this.loop);
    }

    destroy() {
        this.garlandCanvas.remove();
        this.snowCanvas.remove();
        const bulbs = document.getElementById('garland-bulbs-container');
        if (bulbs) bulbs.remove();
        if (this.controlBtn) this.controlBtn.remove();
    }
}