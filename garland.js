// frontend/garland.js

export class XmasGarland {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.points = [];
        this.constraints = [];
        this.bulbs = []; 
        this.width = window.innerWidth;
        this.height = 400; // Трохи більше місця
        this.physicsEnabled = true;
        
        // --- ⚙️ НАЛАШТУВАННЯ ФІЗИКИ ---
        this.gravity = 0.5;
        this.friction = 0.98; // Менше тертя = більше коливань
        this.segmentLength = 20; // 🔥 Менша довжина = більше точок = плавніший дріт
        this.stiffness = 1;
        
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.lastScrollY = window.scrollY;
        
        // Кольори для CSS класів
        this.colors = ['red', 'gold', 'green', 'blue', 'purple']; 
        this.bulbIndex = 0;

        this.init();
    }

    init() {
        // Canvas для дроту
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'garland-wire-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '99998'; 
        this.canvas.style.pointerEvents = 'none';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Контейнер для лампочок
        this.bulbContainer = document.createElement('div');
        this.bulbContainer.id = 'garland-bulbs-container';
        document.body.appendChild(this.bulbContainer);

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Взаємодія з мишкою
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        this.loop = this.update.bind(this);
        requestAnimationFrame(this.loop);
        
        this.createRope();
    }

    createRope() {
        this.points = [];
        this.constraints = [];
        this.bulbContainer.innerHTML = '';
        this.bulbs = [];

        // Розрахунок кількості точок
        const segments = Math.ceil(this.width / (this.segmentLength * 0.9)); 
        const startY = -15;

        // --- СТВОРЕННЯ ТОЧОК ---
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * this.width;
            // Робимо природне провисання (синусоїда)
            const sag = Math.sin((i / segments) * Math.PI) * 80; 
            const y = startY + sag;
            
            // Закріплюємо краї та кожну 8-му точку ("цвяшки")
            const pinned = (i === 0 || i === segments || i % 8 === 0);
            
            this.points.push({
                x: x, y: y,
                oldx: x, oldy: y,
                pinned: pinned
            });

            // Додаємо лампочку кожну 3-тю точку (щоб не було занадто густо)
            if (!pinned && i % 3 === 0 && i > 0 && i < segments) {
                this.createBulbDOM(i);
            }
        }

        // --- СТВОРЕННЯ ЗВ'ЯЗКІВ (Constraint) ---
        for (let i = 0; i < this.points.length - 1; i++) {
            this.constraints.push({
                p1: this.points[i],
                p2: this.points[i + 1],
                length: this.segmentLength
            });
        }
    }

    createBulbDOM(index) {
        const el = document.createElement('div');
        const color = this.colors[this.bulbIndex++ % this.colors.length];
        
        // Створюємо структуру лампочки
        el.className = `physics-bulb ${color}`;
        el.innerHTML = `<div class="bulb-glass"></div><div class="bulb-cap"></div>`;
        
        this.bulbContainer.appendChild(el);
        this.bulbs.push({ el: el, pointIndex: index });
    }

    update() {
        if (!document.getElementById('garland-wire-canvas')) return;

        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 1. ФІЗИКА (Verlet)
        const scrollDiff = window.scrollY - this.lastScrollY;
        this.lastScrollY = window.scrollY;

        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * this.friction;
                const vy = (p.y - p.oldy) * this.friction;

                p.oldx = p.x;
                p.oldy = p.y;

                p.x += vx;
                p.y += vy;
                p.y += this.gravity;

                // Інерція від скролу
                p.y -= scrollDiff * 0.15; 

                // Взаємодія з мишкою (відштовхування)
                const dx = p.x - this.mouseX;
                const dy = p.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 100) {
                    const force = (100 - dist) / 100;
                    const angle = Math.atan2(dy, dx);
                    // М'який поштовх
                    p.x += Math.cos(angle) * force * 4;
                    p.y += Math.sin(angle) * force * 4;
                }
            }
        }

        // 2. ЖОРСТКІСТЬ (Constraints)
        // Більше ітерацій = стабільніша мотузка
        for (let k = 0; k < 6; k++) { 
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = (c.length - dist) / dist * 0.5;

                if (!c.p1.pinned) {
                    c.p1.x -= dx * diff;
                    c.p1.y -= dy * diff;
                }
                if (!c.p2.pinned) {
                    c.p2.x += dx * diff;
                    c.p2.y += dy * diff;
                }
            }
        }

        // 3. МАЛЮВАННЯ ДРОТУ (Гладкі криві)
        this.ctx.beginPath();
        // Темно-зелений дріт з тінню
        this.ctx.strokeStyle = '#0f392b'; 
        this.ctx.lineWidth = 2.5;
        this.ctx.shadowBlur = 2;
        this.ctx.shadowColor = "black";
        
        if (this.points.length > 0) {
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            
            // Використовуємо середини відрізків для quadraticCurveTo
            for (let i = 1; i < this.points.length - 1; i++) {
                const xc = (this.points[i].x + this.points[i + 1].x) / 2;
                const yc = (this.points[i].y + this.points[i + 1].y) / 2;
                this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
            }
            // Домальовуємо останній сегмент
            const last = this.points[this.points.length - 1];
            this.ctx.lineTo(last.x, last.y);
        }
        this.ctx.stroke();
        this.ctx.shadowBlur = 0; // Скидаємо тінь

        // 4. ОНОВЛЕННЯ ЛАМПОЧОК (З обертанням!)
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prevP = this.points[b.pointIndex - 1];
            const nextP = this.points[b.pointIndex + 1];

            // Вираховуємо кут нахилу дроту в цій точці
            let angle = 0;
            if (prevP && nextP) {
                // Кут перпендикулярний до дроту
                angle = Math.atan2(nextP.y - prevP.y, nextP.x - prevP.x) + (Math.PI / 2);
            }

            // Конвертуємо в градуси
            const angleDeg = angle * (180 / Math.PI);

            // Застосовуємо позицію та обертання
            // translate(-50%, 0) центрує лампочку по горизонталі відносно точки кріплення
            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angleDeg}deg) translate(-50%, 0)`;
        }

        requestAnimationFrame(this.loop);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.createRope();
    }

    destroy() {
        if (this.canvas) this.canvas.remove();
        if (this.bulbContainer) this.bulbContainer.remove();
        window.removeEventListener('resize', this.resize);
    }
}