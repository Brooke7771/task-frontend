// frontend/garland.js

// === 1. ГІРЛЯНДА (Без змін, залишаємо як було для стабільності) ===
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
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // Фізика
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * this.friction;
                const vy = (p.y - p.oldy) * this.friction;
                p.oldx = p.x;
                p.oldy = p.y;
                p.x += vx;
                p.y += vy + this.gravity;
                p.y -= scrollDiff * 0.15; 

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

// === 2. REALISTIC ACCUMULATING SNOW SYSTEM ===
class SnowSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Мапа висоти снігу (один елемент на кожен піксель ширини)
        this.groundMap = new Float32Array(this.width); 
        this.maxSnowHeight = 120; // 🔥 Максимальна висота кучугури (в пікселях)
        
        this.maxFlakes = 600; // Кількість сніжинок
        this.snowColor = "rgba(255, 255, 255, 0.9)";
        
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        // При ресайзі скидаємо землю, щоб не було артефактів
        this.groundMap = new Float32Array(this.width); 
    }

    update(mouse) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // --- 1. ГЕНЕРАЦІЯ ---
        if (this.flakes.length < this.maxFlakes) {
            this.flakes.push({
                x: Math.random() * this.width,
                y: -10,
                vx: (Math.random() - 0.5) * 1.5, // Легкий вітер в сторони
                vy: Math.random() * 2 + 1.5,     // Швидкість падіння
                size: Math.random() * 2 + 1      // Розмір сніжинки
            });
        }

        // --- 2. ОНОВЛЕННЯ СНІЖИНОК ---
        for (let i = this.flakes.length - 1; i >= 0; i--) {
            const f = this.flakes[i];
            f.x += f.vx;
            f.y += f.vy;
            
            // Турбулентність
            f.x += Math.sin(f.y * 0.02) * 0.5;

            // Перевірка зіткнення з "землею" (groundMap)
            const floorX = Math.floor(f.x);
            
            // Якщо сніжинка вилетіла за межі екрану по X - видаляємо
            if (floorX < 0 || floorX >= this.width) {
                this.flakes.splice(i, 1);
                continue;
            }

            // Висота снігу в цій точці
            const currentSnowHeight = this.groundMap[floorX];
            
            // Якщо сніжинка торкнулася землі
            if (f.y >= this.height - currentSnowHeight) {
                // Додаємо сніг, ТІЛЬКИ якщо не досягнуто ліміту
                if (currentSnowHeight < this.maxSnowHeight) {
                    this.groundMap[floorX] += f.size * 0.8; // Накопичуємо
                }
                
                this.flakes.splice(i, 1); // Сніжинка "розтанула" в кучугуру
            } 
            // Або просто вилетіла вниз (якщо раптом глюк)
            else if (f.y > this.height) {
                this.flakes.splice(i, 1);
            } else {
                // Малюємо падаючу сніжинку
                this.ctx.fillStyle = this.snowColor;
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }

        // --- 3. ФІЗИКА КУЧУГУР (AVALANCHE EFFECT) ---
        // Сніг повинен осипатися, щоб бути рівномірним
        for (let k = 0; k < 2; k++) { // Кілька проходів для швидкості осипання
            for (let x = 0; x < this.width; x++) {
                const currentH = this.groundMap[x];
                
                // Перевірка сусіда зліва
                if (x > 0) {
                    const leftH = this.groundMap[x - 1];
                    if (currentH > leftH + 1.5) { // Якщо різниця висот > 1.5px
                        const flow = (currentH - leftH) * 0.4; // Пересипаємо 40% різниці
                        this.groundMap[x] -= flow;
                        this.groundMap[x - 1] += flow;
                    }
                }
                
                // Перевірка сусіда справа
                if (x < this.width - 1) {
                    const rightH = this.groundMap[x + 1];
                    if (currentH > rightH + 1.5) {
                        const flow = (currentH - rightH) * 0.4;
                        this.groundMap[x] -= flow;
                        this.groundMap[x + 1] += flow;
                    }
                }
            }
        }

        // --- 4. ВЗАЄМОДІЯ З МИШКОЮ (РОЗКИДАННЯ) ---
        // Якщо мишка внизу, вона "топить" або розкидає сніг
        if (mouse.y > this.height - this.maxSnowHeight) {
            const range = 40; // Радіус дії
            const mouseXInt = Math.floor(mouse.x);
            
            for (let x = mouseXInt - range; x < mouseXInt + range; x++) {
                if (x >= 0 && x < this.width) {
                    // Перевіряємо, чи мишка "всередині" кучугури
                    if (mouse.y > this.height - this.groundMap[x]) {
                        // Зменшуємо висоту (тиснемо сніг)
                        this.groundMap[x] *= 0.92; 
                    }
                }
            }
        }

        // --- 5. МАЛЮВАННЯ ЗЕМЛІ ---
        this.ctx.fillStyle = "white";
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        
        // Малюємо контур снігу
        for (let x = 0; x < this.width; x++) {
            this.ctx.lineTo(x, this.height - this.groundMap[x]);
        }
        
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Додаємо легке світіння верхівки снігу
        // (Можна пропустити для оптимізації, але виглядає гарно)
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = "rgba(255,255,255,0.8)";
        this.ctx.stroke(); 
        this.ctx.shadowBlur = 0;
    }
}

// === 3. ГОЛОВНИЙ МЕНЕДЖЕР ===
export class PhysicsManager {
    constructor() {
        this.garlandCanvas = document.createElement('canvas');
        this.garlandCanvas.id = 'physics-garland-canvas';
        this.setupCanvas(this.garlandCanvas, 99998);
        this.garland = new XmasGarland(this.garlandCanvas);

        this.snowCanvas = document.createElement('canvas');
        this.snowCanvas.id = 'physics-snow-canvas';
        this.setupCanvas(this.snowCanvas, 99999);
        this.snowCanvas.style.pointerEvents = 'none'; 
        this.snow = new SnowSystem(this.snowCanvas);

        this.mouse = { x: -1000, y: -1000 };
        this.lastScrollY = window.scrollY;

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
        if (!document.body.contains(this.garlandCanvas)) return;

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