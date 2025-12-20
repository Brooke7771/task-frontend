// frontend/garland.js

// === CONFIGURATION ===
const CONFIG = {
    // Палітра кольорів (Neon Christmas)
    colors: [
        '#ff3b30', // Red
        '#ff9500', // Orange
        '#ffcc00', // Yellow
        '#4cd964', // Green
        '#5ac8fa', // Light Blue
        '#007aff', // Blue
        '#af52de', // Purple
        '#ff2d55', // Pink
        '#ffffff'  // White
    ],
    wireColor: '#2d3436', // Темно-сірий провід
    gravity: 0.6,
    friction: 0.94,
    stiffness: 1.0, 
    bulbChangeSpeed: 0.02, // Швидкість зміни кольору
    snowInteractionRadius: 100 // Радіус взаємодії снігу з мишкою
};

// === 1. CLASS: HYPER GARLAND (Реалістична Гірлянда) ===
class XmasGarland {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.constraints = [];
        this.bulbs = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        // Менша довжина сегмента для більш плавної лінії
        this.segmentLength = window.innerWidth < 600 ? 24 : 18;
        
        // DOM контейнер для лампочок
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
                width: 20px; height: 32px;
                /* Складний градієнт для об'єму скла */
                background: radial-gradient(circle at 35% 35%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 10%, transparent 50%),
                            linear-gradient(to bottom, rgba(255,255,255,0.1), rgba(0,0,0,0.1)),
                            var(--bulb-color);
                border-radius: 50% 50% 45% 45%;
                transform-origin: top center;
                box-shadow: 0 4px 20px var(--bulb-glow), inset 0 -4px 8px rgba(0,0,0,0.3);
                will-change: transform, background-color, box-shadow;
                transition: transform 0.05s linear; /* Плавний рух */
            }
            /* Цоколь (Патрон) */
            .physics-bulb::before {
                content: ''; position: absolute; top: -6px; left: 4px;
                width: 12px; height: 8px; 
                background: linear-gradient(90deg, #1a1a1a, #444, #1a1a1a);
                border-radius: 2px; 
                border-bottom: 1px solid #000;
            }
            /* Нитка розжарювання (Filament) */
            .physics-bulb::after {
                content: ''; position: absolute; top: 10px; left: 7px;
                width: 6px; height: 8px; 
                border: 1px solid rgba(255,255,255,0.8);
                border-top: none; border-radius: 0 0 10px 10px;
                opacity: 0.6; filter: blur(0.5px);
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
        const startY = -10;
        
        // Генерація точок
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const x = t * this.width;
            
            // === ВИПРАВЛЕННЯ ВИСОТИ ===
            // Зменшено множник з 0.15 до 0.08, щоб не висіло низько
            const sag = Math.sin(t * Math.PI) * (this.width * 0.08); 
            // Додаємо трохи "шуму" до Y, щоб не було ідеально рівно
            const y = startY + sag + (Math.random() * 5); 
            
            // Закріплюємо кути і кожну 12-ту точку (кріплення до стелі)
            const pinFrequency = window.innerWidth < 600 ? 8 : 12;
            const pinned = (i === 0 || i === totalSegments || i % pinFrequency === 0);

            this.points.push({ x, y, oldx: x, oldy: y, pinned });

            // Додаємо лампочки (пропускаємо точки біля кріплень)
            if (!pinned && i % 2 === 0 && i > 1 && i < totalSegments - 1) {
                // Додаткова перевірка, щоб не вішати лампочки надто близько до кріплень
                if ((i - 1) % pinFrequency !== 0 && (i + 1) % pinFrequency !== 0) {
                    this.addBulb(i);
                }
            }
        }

        // Генерація зв'язків (паличок)
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
        // Вибираємо випадковий стартовий колір
        const colorIdx = Math.floor(Math.random() * CONFIG.colors.length);
        const color = CONFIG.colors[colorIdx];
        
        el.className = 'physics-bulb';
        el.style.setProperty('--bulb-color', color);
        el.style.setProperty('--bulb-glow', color);
        
        this.bulbContainer.appendChild(el);
        
        this.bulbs.push({ 
            el, 
            pointIndex, 
            colorIndex: colorIdx,
            nextColorIndex: (colorIdx + 1) % CONFIG.colors.length,
            transitionProgress: 0,
            transitionSpeed: 0.01 + Math.random() * 0.03, // Різна швидкість зміни
            // === РЕАЛІСТИЧНИЙ НАХИЛ ===
            // angleOffset: початковий випадковий нахил (криво вкручена лампочка)
            angleOffset: (Math.random() - 0.5) * 0.6, 
            // swing: динамічне розгойдування
            swing: 0 
        });
    }

    update(mouse, scrollDiff) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Physics (Verlet)
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * CONFIG.friction;
                const vy = (p.y - p.oldy) * CONFIG.friction;
                
                p.oldx = p.x;
                p.oldy = p.y;
                
                p.x += vx;
                p.y += vy + CONFIG.gravity;
                p.y -= scrollDiff * 0.5;

                // Взаємодія з мишкою
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 60) {
                    const force = (60 - dist) / 60;
                    const angle = Math.atan2(dy, dx);
                    // Штовхаємо сильніше
                    p.x += Math.cos(angle) * force * 12;
                    p.y += Math.sin(angle) * force * 12;
                }
            }
        }

        // 2. Constraints
        for (let k = 0; k < 4; k++) { // Більше ітерацій для жорсткості
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.hypot(dx, dy);
                const diff = (c.length - dist) / dist * 0.5 * CONFIG.stiffness;
                
                if (!c.p1.pinned) { c.p1.x -= dx * diff; c.p1.y -= dy * diff; }
                if (!c.p2.pinned) { c.p2.x += dx * diff; c.p2.y += dy * diff; }
            }
        }

        // 3. Draw Wire
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Тінь від дроту
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'rgba(0,0,0,0.3)';
        this.ctx.lineWidth = 4;
        this.drawCurve(2, 2); // Offset shadow
        this.ctx.stroke();

        // Основний дріт (витий ефект)
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.wireColor;
        this.ctx.lineWidth = 3;
        this.drawCurve(0, 0);
        this.ctx.stroke();

        // 4. Update Bulbs
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prev = this.points[b.pointIndex - 1];
            const next = this.points[b.pointIndex + 1];
            
            // --- ЛОГІКА КОЛЬОРІВ (Плавний перехід) ---
            b.transitionProgress += b.transitionSpeed;
            if (b.transitionProgress >= 1) {
                b.transitionProgress = 0;
                b.colorIndex = b.nextColorIndex;
                b.nextColorIndex = (b.colorIndex + 1) % CONFIG.colors.length;
                // Інколи перескакуємо на випадковий колір для хаосу
                if (Math.random() > 0.8) b.nextColorIndex = Math.floor(Math.random() * CONFIG.colors.length);
            }
            
            // Інтерполяція кольору (в спрощеному вигляді через CSS змінну, 
            // для продуктивності краще міняти раз на цикл, але для плавності 
            // можна використовувати transition в CSS, який ми додали)
            
            // Тут ми просто оновлюємо цільовий колір, а CSS transition робить магію
            // Щоб не навантажувати DOM, робимо це тільки коли progress близький до 0
            if (b.transitionProgress < b.transitionSpeed * 1.5) {
                const newColor = CONFIG.colors[b.colorIndex];
                b.el.style.setProperty('--bulb-color', newColor);
                b.el.style.setProperty('--bulb-glow', newColor);
            }

            // --- ЛОГІКА ПОЗИЦІЇ ТА НАХИЛУ ---
            // Кут дроту
            let wireAngle = 0;
            if (prev && next) {
                wireAngle = Math.atan2(next.y - prev.y, next.x - prev.x);
            }

            // Розрахунок інерції (хитання)
            // Швидкість точки
            const vx = p.x - p.oldx;
            // Додаємо інерцію до кута
            b.swing = b.swing * 0.9 + vx * 0.03;
            
            // Фінальний кут: Перпендикуляр до дроту + Фіксований нахил + Динамічне хитання
            const finalAngle = wireAngle + (Math.PI / 2) + b.angleOffset + b.swing;

            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${finalAngle}rad) translate(-50%, 0)`;
        }
        
        // 5. Render Light Glows (Canvas Layer for Performance)
        this.ctx.globalCompositeOperation = 'lighter';
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            // Малюємо світіння тільки на Canvas, щоб не навантажувати DOM тінями
            const color = CONFIG.colors[b.colorIndex];
            
            const gradient = this.ctx.createRadialGradient(p.x, p.y + 10, 0, p.x, p.y + 10, 45);
            gradient.addColorStop(0, color + '33'); // 20% opacity
            gradient.addColorStop(1, 'transparent');
            
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y + 10, 45, 0, Math.PI * 2);
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

// === 2. CLASS: DEEP WINTER SNOW (Без віньєтки, стабільний низ) ===
class WinterSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Snow Accumulation (Ground)
        this.groundMap = new Float32Array(this.width);
        this.maxSnowHeight = 150; 
        
        this.initFlakes();
    }

    initFlakes() {
        const count = window.innerWidth < 800 ? 150 : 400; // Більше снігу
        for (let i = 0; i < count; i++) {
            this.flakes.push(this.createFlake(true));
        }
    }

    createFlake(initial = false) {
        return {
            x: Math.random() * this.width,
            y: initial ? Math.random() * this.height : -20,
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 2 + 1.5, // Швидший сніг
            size: Math.random() * 3.5 + 1.5,
            opacity: Math.random() * 0.5 + 0.3,
            oscillation: Math.random() * 0.1 // Для похитування
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        // Зберігаємо рельєф при ресайзі, якщо можливо, або просто ресет
        this.groundMap = new Float32Array(this.width);
    }

    update(mouse, mouseSpeed) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // --- A. SNOWFLAKES ---
        this.ctx.fillStyle = "white";
        
        for (let i = 0; i < this.flakes.length; i++) {
            const f = this.flakes[i];
            
            // Взаємодія з мишкою (Турбулентність)
            const dx = f.x - mouse.x;
            const dy = f.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            
            // === ВИПРАВЛЕННЯ: Не чіпаємо сніг, який дуже близько до землі, щоб не ламати кучугури ===
            const distanceToGround = (this.height - this.groundMap[Math.floor(f.x) || 0]) - f.y;
            
            if (dist < CONFIG.snowInteractionRadius && mouseSpeed > 2 && distanceToGround > 50) {
                const force = (CONFIG.snowInteractionRadius - dist) / CONFIG.snowInteractionRadius;
                f.vx += (dx / dist) * force * mouseSpeed * 0.08;
                f.vy += (dy / dist) * force * mouseSpeed * 0.08;
            }

            // Physics
            f.x += f.vx + Math.sin(f.y * f.oscillation) * 0.5;
            f.y += f.vy;
            f.vx *= 0.98; // Air resistance

            // --- B. GROUND COLLISION ---
            const floorX = Math.floor(f.x);
            let grounded = false;

            if (floorX >= 0 && floorX < this.width) {
                // Перевірка зіткнення з кучугурою
                if (f.y >= this.height - this.groundMap[floorX]) {
                    grounded = true;
                    // Нарощуємо сніг
                    if (this.groundMap[floorX] < this.maxSnowHeight) {
                        this.groundMap[floorX] += f.size * 0.6;
                        // Розсипаємо сніг в сторони (Smoothing)
                        const range = 2; // Радіус розсипання
                        for(let k = 1; k <= range; k++) {
                            if(floorX - k >= 0) this.groundMap[floorX - k] += f.size * 0.2 / k;
                            if(floorX + k < this.width) this.groundMap[floorX + k] += f.size * 0.2 / k;
                        }
                    }
                }
            }

            // Respawn
            if (grounded || f.y > this.height + 10 || f.x > this.width + 10 || f.x < -10) {
                this.flakes[i] = this.createFlake();
            } else {
                // Draw Flake
                this.ctx.globalAlpha = f.opacity;
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        // --- C. DRAW GROUND (SMOOTH) ---
        // Згладжуємо масив висот (Gaussian blur simulation)
        for (let j = 0; j < 2; j++) { // 2 проходи згладжування
            for (let x = 1; x < this.width - 1; x++) {
                this.groundMap[x] = (this.groundMap[x-1] + this.groundMap[x] * 2 + this.groundMap[x+1]) / 4;
            }
        }

        // Малюємо кучугури
        this.ctx.fillStyle = "#fff";
        // М'яка тінь для об'єму
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "rgba(200, 225, 255, 0.5)";
        
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
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', fontSize: '22px', cursor: 'pointer',
            zIndex: '100001', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '0.3s'
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