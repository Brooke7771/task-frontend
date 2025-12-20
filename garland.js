// frontend/garland.js

// === CONFIGURATION ===
const CONFIG = {
    colors: [
        '#ff3b30', '#ff9500', '#ffcc00', '#4cd964', 
        '#5ac8fa', '#007aff', '#af52de', '#ff2d55', '#ffffff'
    ],
    wireColor: '#2f3640', 
    gravity: 0.6,
    friction: 0.96, // Трохи більше ковзання для плавності
    stiffness: 1.0, 
    snowInteractionRadius: 100,
    windForce: 0.002 // Сила автоматичного вітру
};

// === 1. CLASS: HYPER GARLAND (Хаос та 3D Ефект) ===
class XmasGarland {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.constraints = [];
        this.bulbs = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.segmentLength = window.innerWidth < 600 ? 22 : 16;
        this.time = 0; // Для вітру

        // Створюємо контейнер
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
            .physics-bulb {
                position: absolute;
                width: 22px; height: 34px;
                /* Скляний ефект з відблиском */
                background: radial-gradient(60% 60% at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.1) 40%, transparent 80%),
                            var(--bulb-bg); 
                border-radius: 50% 50% 45% 45%;
                transform-origin: center -4px; /* Точка кріплення вище лампочки */
                box-shadow: 0 0 15px var(--bulb-glow), inset 0 -5px 10px rgba(0,0,0,0.4);
                will-change: transform, filter;
                transition: filter 0.1s ease;
            }
            .physics-bulb::before { /* Патрон */
                content: ''; position: absolute; top: -8px; left: 4px;
                width: 14px; height: 10px; 
                background: linear-gradient(90deg, #222, #555, #222);
                border-radius: 3px; border-bottom: 2px solid #111;
            }
            /* Ефект "Спрямованості" - деякі лампочки яскравіші */
            .bulb-front { z-index: 10; filter: brightness(1.2); }
            .bulb-back { z-index: 0; filter: brightness(0.7) blur(0.5px); transform: scale(0.9); }
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
        const startY = -15;
        
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const x = t * this.width;
            // Природне провисання + нерівності
            const sag = Math.sin(t * Math.PI) * (this.width * 0.09); 
            const y = startY + sag + (Math.random() * 8 - 4); 
            
            // Кріплення: краї + кожні ~10 точок
            const pinFrequency = window.innerWidth < 600 ? 7 : 10;
            const pinned = (i === 0 || i === totalSegments || i % pinFrequency === 0);

            this.points.push({ x, y, oldx: x, oldy: y, pinned, mass: pinned ? 0 : 1 });

            // Додаємо лампочки
            if (!pinned && i % 2 === 0 && i > 1 && i < totalSegments - 1) {
                // Не вішаємо прямо біля кріплень
                if ((i - 1) % pinFrequency !== 0 && (i + 1) % pinFrequency !== 0) {
                    this.addBulb(i);
                }
            }
        }

        // Зв'язки
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
        
        // 3D Ефект: Випадкова орієнтація (Front/Back/Side)
        const orientation = Math.random(); 
        let typeClass = '';
        let zScale = 1;
        
        if (orientation > 0.7) { typeClass = 'bulb-front'; zScale = 1.1; } // До нас
        else if (orientation < 0.3) { typeClass = 'bulb-back'; zScale = 0.85; } // Від нас
        
        el.className = `physics-bulb ${typeClass}`;
        el.style.setProperty('--bulb-bg', color);
        el.style.setProperty('--bulb-glow', color);
        
        this.bulbContainer.appendChild(el);
        
        this.bulbs.push({ 
            el, 
            pointIndex, 
            colorIndex: colorIdx,
            nextColorIndex: (colorIdx + 1) % CONFIG.colors.length,
            transitionProgress: Math.random(), // Всі у різній фазі
            transitionSpeed: 0.005 + Math.random() * 0.015,
            // Хаотичний кут: лампочка стирчить вбік, а не тільки вниз
            angleOffset: (Math.random() - 0.5) * 1.5, 
            swing: 0,
            zScale: zScale
        });
    }

    update(mouse, scrollDiff) {
        this.time += 0.05;
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Фізика точок
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * CONFIG.friction;
                const vy = (p.y - p.oldy) * CONFIG.friction;
                
                p.oldx = p.x;
                p.oldy = p.y;
                
                // Вітер (синусоїдальна хвиля)
                const wind = Math.sin(this.time + p.y * 0.05) * CONFIG.windForce + Math.cos(this.time * 0.5) * CONFIG.windForce * 0.5;
                
                p.x += vx + wind;
                p.y += vy + CONFIG.gravity;
                p.y -= scrollDiff * 0.4;

                // Мишка (поштовх)
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 10;
                    p.y += Math.sin(angle) * force * 10;
                }
            }
        }

        // 2. Жорсткість (Constraints)
        for (let k = 0; k < 4; k++) { 
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.hypot(dx, dy);
                const diff = (c.length - dist) / dist * 0.5 * CONFIG.stiffness;
                
                if (!c.p1.pinned) { c.p1.x -= dx * diff; c.p1.y -= dy * diff; }
                if (!c.p2.pinned) { c.p2.x += dx * diff; c.p2.y += dy * diff; }
            }
        }

        // 3. Малюємо провід (Витий, з тінями)
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Тінь
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        this.ctx.lineWidth = 5;
        this.drawCurve(3, 10); 
        this.ctx.stroke();

        // Основний кабель
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#2d3436';
        this.ctx.lineWidth = 3;
        this.drawCurve(0, 0);
        this.ctx.stroke();
        
        // Світлий "вит" кабелю
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#636e72';
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 4]);
        this.drawCurve(0, 0);
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // 4. Оновлення лампочок
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prev = this.points[b.pointIndex - 1];
            const next = this.points[b.pointIndex + 1];
            
            // Зміна кольору
            b.transitionProgress += b.transitionSpeed;
            if (b.transitionProgress >= 1) {
                b.transitionProgress = 0;
                b.colorIndex = b.nextColorIndex;
                b.nextColorIndex = (b.colorIndex + 1) % CONFIG.colors.length;
                if (Math.random() > 0.7) b.nextColorIndex = Math.floor(Math.random() * CONFIG.colors.length);
                
                const newColor = CONFIG.colors[b.colorIndex];
                b.el.style.setProperty('--bulb-bg', newColor);
                b.el.style.setProperty('--bulb-glow', newColor);
            }

            // Розрахунок кута
            let wireAngle = 0;
            if (prev && next) {
                wireAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
            }

            // Динаміка
            const vx = p.x - p.oldx;
            b.swing = b.swing * 0.92 + vx * 0.05; // Інерція

            // Фінальний кут: Дріт + 90 градусів + Власний нахил (хаос) + Розгойдування
            const finalAngle = wireAngle + (Math.PI / 2) + b.angleOffset + b.swing;

            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${finalAngle}rad) scale(${b.zScale}) translate(-50%, 0)`;
        }
        
        // 5. Малюємо світіння (Glow) на Canvas для швидкості
        this.ctx.globalCompositeOperation = 'screen';
        for (const b of this.bulbs) {
            if (b.zScale < 1) continue; // Тьмяні задні лампочки майже не світять
            const p = this.points[b.pointIndex];
            const color = CONFIG.colors[b.colorIndex];
            
            const gradient = this.ctx.createRadialGradient(p.x, p.y + 12, 0, p.x, p.y + 12, 50);
            gradient.addColorStop(0, color + '44');
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y + 12, 50, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';
    }

    drawCurve(offsetX, offsetY) {
        if (!this.points.length) return;
        this.ctx.moveTo(this.points[0].x + offsetX, this.points[0].y + offsetY);
        for (let i = 1; i < this.points.length - 1; i++) {
            const xc = (this.points[i].x + this.points[i + 1].x) / 2 + offsetX;
            const yc = (this.points[i].y + this.points[i + 1].y) / 2 + offsetY;
            this.ctx.quadraticCurveTo(this.points[i].x + offsetX, this.points[i].y + offsetY, xc, yc);
        }
        this.ctx.lineTo(this.points[this.points.length - 1].x + offsetX, this.points[this.points.length - 1].y + offsetY);
    }
}

// === 2. CLASS: INTERACTIVE WINTER (Сніг, що тане) ===
class WinterSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.groundMap = new Float32Array(this.width);
        this.maxSnowHeight = 160; 
        
        this.initFlakes();
    }

    initFlakes() {
        const count = window.innerWidth < 800 ? 180 : 450;
        for (let i = 0; i < count; i++) {
            this.flakes.push(this.createFlake(true));
        }
    }

    createFlake(initial = false) {
        return {
            x: Math.random() * this.width,
            y: initial ? Math.random() * this.height : -20,
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 2 + 1,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.6 + 0.2,
            sparkle: Math.random() > 0.95 // 5% сніжинок блищать
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.groundMap = new Float32Array(this.width);
    }

    update(mouse, mouseSpeed) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // --- A. ЛОГІКА ТАНЕННЯ (ERASER) ---
        // Якщо мишка внизу - "плавимо" сніг
        if (mouse.y > this.height - this.maxSnowHeight - 50) {
            const meltRadius = 30; // Радіус пензля
            const startX = Math.floor(Math.max(0, mouse.x - meltRadius));
            const endX = Math.floor(Math.min(this.width, mouse.x + meltRadius));
            
            for (let x = startX; x < endX; x++) {
                // Перевіряємо, чи мишка торкається снігу
                const groundY = this.height - this.groundMap[x];
                // Сила танення залежить від близькості до центру курсора
                const dist = Math.abs(x - mouse.x);
                if (mouse.y >= groundY - 20) { // Якщо курсор близько до поверхні
                    const meltAmount = (1 - dist / meltRadius) * 5; 
                    if (meltAmount > 0) {
                        this.groundMap[x] = Math.max(0, this.groundMap[x] - meltAmount);
                    }
                }
            }
        }

        // --- B. SNOWFLAKES ---
        this.ctx.fillStyle = "white";
        
        for (let i = 0; i < this.flakes.length; i++) {
            const f = this.flakes[i];
            
            // Вітер від мишки
            const dx = f.x - mouse.x;
            const dy = f.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            
            const distToGround = (this.height - this.groundMap[Math.floor(f.x) || 0]) - f.y;
            
            // Відштовхуємо сніжинки, якщо вони не надто низько (щоб не псувати кучугури при падінні)
            if (dist < 120 && mouseSpeed > 1 && distToGround > 30) {
                const force = (120 - dist) / 120;
                f.vx += (dx / dist) * force * mouseSpeed * 0.1;
                f.vy += (dy / dist) * force * mouseSpeed * 0.1;
            }

            f.x += f.vx;
            f.y += f.vy;
            f.vx *= 0.98;

            // Зіткнення з землею
            const floorX = Math.floor(f.x);
            let grounded = false;

            if (floorX >= 0 && floorX < this.width) {
                if (f.y >= this.height - this.groundMap[floorX]) {
                    grounded = true;
                    if (this.groundMap[floorX] < this.maxSnowHeight) {
                        this.groundMap[floorX] += f.size * 0.5;
                        // Розсипання (Smoothing)
                        if (floorX > 0) this.groundMap[floorX-1] += f.size * 0.15;
                        if (floorX < this.width-1) this.groundMap[floorX+1] += f.size * 0.15;
                    }
                }
            }

            if (grounded || f.y > this.height || f.x > this.width || f.x < 0) {
                this.flakes[i] = this.createFlake();
            } else {
                this.ctx.globalAlpha = f.sparkle ? Math.random() : f.opacity; // Мерехтіння
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        // --- C. DRAW GROUND ---
        // Сильне згладжування для ефекту м'яких заметів
        for (let j = 0; j < 3; j++) { 
            for (let x = 1; x < this.width - 1; x++) {
                this.groundMap[x] = (this.groundMap[x-1] + this.groundMap[x] * 4 + this.groundMap[x+1]) / 6;
            }
        }

        // Градієнт для снігу (білий зверху, блакитний знизу)
        const snowGrad = this.ctx.createLinearGradient(0, this.height - this.maxSnowHeight, 0, this.height);
        snowGrad.addColorStop(0, '#ffffff');
        snowGrad.addColorStop(1, '#ddeeff');

        this.ctx.fillStyle = snowGrad;
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "rgba(255,255,255,0.5)";
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x < this.width; x+=2) {
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
            width: '45px', height: '45px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
            color: 'white', fontSize: '22px', cursor: 'pointer',
            zIndex: '100001', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '0.3s', boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
        });
        
        btn.onclick = () => {
            this.isActive = !this.isActive;
            btn.innerHTML = this.isActive ? '❄️' : '🌙';
            btn.style.opacity = this.isActive ? '1' : '0.5';
            this.garlandCanvas.style.opacity = this.isActive ? '1' : '0';
            this.snowCanvas.style.opacity = this.isActive ? '1' : '0';
            const bulbs = document.getElementById('garland-bulbs-container');
            if (bulbs) bulbs.style.opacity = this.isActive ? '1' : '0';
        };
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