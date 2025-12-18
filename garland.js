// frontend/garland.js

// === 1. ГІРЛЯНДА (Ваш попередній код, трохи оптимізований) ===
class XmasGarland {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.constraints = [];
        this.bulbs = [];
        this.width = window.innerWidth;
        this.height = 400;
        
        this.gravity = 0.5;
        this.friction = 0.98;
        this.segmentLength = 20;
        
        this.bulbContainer = document.getElementById('garland-bulbs-container');
        if (!this.bulbContainer) {
            this.bulbContainer = document.createElement('div');
            this.bulbContainer.id = 'garland-bulbs-container';
            document.body.appendChild(this.bulbContainer);
        }

        this.colors = ['red', 'gold', 'green', 'blue', 'purple']; 
        this.bulbIndex = 0;
        
        this.init();
    }

    init() {
        this.createRope();
    }

    createRope() {
        this.points = [];
        this.constraints = [];
        this.bulbContainer.innerHTML = '';
        this.bulbs = [];

        const segments = Math.ceil(this.width / (this.segmentLength * 0.9)); 
        const startY = -15;

        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * this.width;
            const sag = Math.sin((i / segments) * Math.PI) * 80; 
            const y = startY + sag;
            const pinned = (i === 0 || i === segments || i % 8 === 0);
            
            this.points.push({ x, y, oldx: x, oldy: y, pinned });

            if (!pinned && i % 3 === 0 && i > 0 && i < segments) {
                const el = document.createElement('div');
                const color = this.colors[this.bulbIndex++ % this.colors.length];
                el.className = `physics-bulb ${color}`;
                el.innerHTML = `<div class="bulb-glass"></div><div class="bulb-cap"></div>`;
                this.bulbContainer.appendChild(el);
                this.bulbs.push({ el, pointIndex: i });
            }
        }

        for (let i = 0; i < this.points.length - 1; i++) {
            this.constraints.push({ p1: this.points[i], p2: this.points[i + 1], length: this.segmentLength });
        }
    }

    update(mouse, scrollDiff) {
        // Фізика точок
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * this.friction;
                const vy = (p.y - p.oldy) * this.friction;
                p.oldx = p.x;
                p.oldy = p.y;
                p.x += vx;
                p.y += vy + this.gravity;
                p.y -= scrollDiff * 0.15; // Реакція на скрол

                // Реакція на мишку
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 4;
                    p.y += Math.sin(angle) * force * 4;
                }
            }
        }

        // Жорсткість
        for (let k = 0; k < 6; k++) { 
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = (c.length - dist) / dist * 0.5;
                if (!c.p1.pinned) { c.p1.x -= dx * diff; c.p1.y -= dy * diff; }
                if (!c.p2.pinned) { c.p2.x += dx * diff; c.p2.y += dy * diff; }
            }
        }

        // Малювання
        this.ctx.clearRect(0, 0, this.width, this.height);
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#0f392b'; 
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = "black";
        
        if (this.points.length > 0) {
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length - 1; i++) {
                const xc = (this.points[i].x + this.points[i + 1].x) / 2;
                const yc = (this.points[i].y + this.points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
            }
            this.ctx.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
        }
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;

        // Лампочки
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prevP = this.points[b.pointIndex - 1];
            const nextP = this.points[b.pointIndex + 1];
            let angle = 0;
            if (prevP && nextP) angle = Math.atan2(nextP.y - prevP.y, nextP.x - prevP.x) + (Math.PI / 2);
            const angleDeg = angle * (180 / Math.PI);
            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angleDeg}deg) translate(-50%, 0)`;
        }
    }
}

// === 2. СИСТЕМА СНІГУ (Нова) ===
class SnowSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.groundMap = new Float32Array(window.innerWidth); // Висота снігу внизу
        this.obstacles = []; // Елементи, на які падає сніг
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.maxFlakes = 400; // Кількість сніжинок
        this.snowColor = "rgba(255, 255, 255, 0.9)";
        
        this.updateObstacles();
        // Оновлюємо перешкоди при скролі/ресайзі
        window.addEventListener('resize', () => { this.resize(); this.updateObstacles(); });
        window.addEventListener('scroll', () => this.updateObstacles());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.groundMap = new Float32Array(this.width); // Скидаємо землю при ресайзі
    }

    updateObstacles() {
        // Знаходимо всі картки, кнопки та інпути
        const elements = document.querySelectorAll('.card, .btn, input, textarea, .fab-main');
        this.obstacles = Array.from(elements).map(el => {
            const rect = el.getBoundingClientRect();
            // Нам цікаві тільки ті, що на екрані
            if (rect.bottom < 0 || rect.top > window.innerHeight) return null;
            
            // Якщо для цього елемента ще немає мапи снігу, створюємо її
            if (!el.snowMap) {
                el.snowMap = new Float32Array(Math.ceil(rect.width));
            }
            
            return {
                rect: rect,
                snowMap: el.snowMap // Зберігаємо мапу прямо в DOM об'єкті (хак для персистентності)
            };
        }).filter(Boolean);
    }

    update(mouse) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Генерація снігу
        if (this.flakes.length < this.maxFlakes) {
            this.flakes.push({
                x: Math.random() * this.width,
                y: -10,
                vx: (Math.random() - 0.5) * 1,
                vy: Math.random() * 2 + 1,
                size: Math.random() * 3 + 1
            });
        }

        // 2. Оновлення сніжинок
        for (let i = this.flakes.length - 1; i >= 0; i--) {
            const f = this.flakes[i];
            f.x += f.vx;
            f.y += f.vy;
            
            // Легкий вітер
            f.x += Math.sin(f.y * 0.01) * 0.5;

            let landed = false;

            // Перевірка перешкод (накопичення на блоках)
            for (const obs of this.obstacles) {
                if (f.x >= obs.rect.left && f.x <= obs.rect.right &&
                    f.y >= obs.rect.top && f.y <= obs.rect.top + 10) { // +10px допуск зверху
                    
                    const localX = Math.floor(f.x - obs.rect.left);
                    if (localX >= 0 && localX < obs.snowMap.length) {
                        // Накопичуємо, але не вище 15px
                        if (obs.snowMap[localX] < 15) {
                            obs.snowMap[localX] += f.size * 0.5;
                            // Розсипаємо трохи по боках (згладжування)
                            if (localX > 0) obs.snowMap[localX-1] += f.size * 0.2;
                            if (localX < obs.snowMap.length - 1) obs.snowMap[localX+1] += f.size * 0.2;
                        }
                        landed = true;
                        break;
                    }
                }
            }

            // Перевірка землі (низу екрана)
            if (!landed && f.y >= this.height - this.groundMap[Math.floor(f.x)]) {
                const gx = Math.floor(f.x);
                if (gx >= 0 && gx < this.width) {
                    if (this.groundMap[gx] < 100) { // Макс висота кучугури 100px
                        this.groundMap[gx] += f.size;
                        // Згладжування кучугури
                        for(let k=1; k<5; k++) {
                            if (gx-k >= 0) this.groundMap[gx-k] += f.size * (0.5/k);
                            if (gx+k < this.width) this.groundMap[gx+k] += f.size * (0.5/k);
                        }
                    }
                }
                landed = true;
            }

            if (landed || f.y > this.height) {
                this.flakes.splice(i, 1);
            } else {
                // Малюємо падаючу сніжинку
                this.ctx.fillStyle = this.snowColor;
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // 3. Малювання снігу на блоках
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
        for (const obs of this.obstacles) {
            this.ctx.beginPath();
            // Йдемо по ширині елемента
            let started = false;
            for (let x = 0; x < obs.snowMap.length; x++) {
                const h = obs.snowMap[x];
                if (h > 0) {
                    const screenX = obs.rect.left + x;
                    const screenY = obs.rect.top;
                    this.ctx.rect(screenX, screenY - h, 1, h); // Малюємо стовпчик снігу
                }
            }
            this.ctx.fill();
        }

        // 4. Малювання та взаємодія із землею
        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x < this.width; x++) {
            // Взаємодія з мишкою (розгортання снігу)
            const dx = x - mouse.x;
            const dist = Math.abs(dx);
            if (dist < 30 && mouse.y > this.height - 100) {
                // Якщо мишка внизу і близько до X
                if (this.groundMap[x] > 0) {
                    this.groundMap[x] *= 0.9; // Тане/розлітається
                }
            }
            this.ctx.lineTo(x, this.height - this.groundMap[x]);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
    }
}

// === 3. ГОЛОВНИЙ МЕНЕДЖЕР (Export) ===
export class PhysicsManager {
    constructor() {
        // Canvas для Гірлянди (зверху)
        this.garlandCanvas = document.createElement('canvas');
        this.garlandCanvas.id = 'physics-garland-canvas';
        this.setupCanvas(this.garlandCanvas, 99998);
        this.garland = new XmasGarland(this.garlandCanvas);

        // Canvas для Снігу (на весь екран, поверх усього, але transparent для кліків)
        this.snowCanvas = document.createElement('canvas');
        this.snowCanvas.id = 'physics-snow-canvas';
        this.setupCanvas(this.snowCanvas, 99999);
        this.snowCanvas.style.pointerEvents = 'none'; // Важливо!
        this.snow = new SnowSystem(this.snowCanvas);

        this.mouse = { x: -1000, y: -1000 };
        this.lastScrollY = window.scrollY;

        // Події
        this.resizeHandler = () => {
            this.resizeCanvas(this.garlandCanvas);
            this.resizeCanvas(this.snowCanvas);
            this.garland.resize();
            this.snow.resize();
        };
        this.mouseHandler = (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; };
        
        window.addEventListener('resize', this.resizeHandler);
        document.addEventListener('mousemove', this.mouseHandler);

        this.loop = this.update.bind(this);
        requestAnimationFrame(this.loop);
    }

    setupCanvas(canvas, zIndex) {
        canvas.style.position = 'fixed';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.zIndex = zIndex;
        canvas.style.pointerEvents = 'none';
        document.body.appendChild(canvas);
        this.resizeCanvas(canvas);
    }

    resizeCanvas(canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    update() {
        if (!document.body.contains(this.garlandCanvas)) return; // Перевірка на знищення

        const currentScroll = window.scrollY;
        const scrollDiff = currentScroll - this.lastScrollY;
        this.lastScrollY = currentScroll;

        this.garland.update(this.mouse, scrollDiff);
        this.snow.update(this.mouse);

        requestAnimationFrame(this.loop);
    }

    destroy() {
        this.garlandCanvas.remove();
        this.snowCanvas.remove();
        const bulbs = document.getElementById('garland-bulbs-container');
        if (bulbs) bulbs.remove();
        
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('mousemove', this.mouseHandler);
    }
}