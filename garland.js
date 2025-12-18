// frontend/garland.js

export class XmasGarland {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.points = [];
        this.constraints = [];
        this.bulbs = []; // DOM елементи лампочок
        this.width = window.innerWidth;
        this.height = 300; // Висота області гірлянди
        this.physicsEnabled = true;
        
        // Налаштування фізики
        this.gravity = 0.4;
        this.friction = 0.96;
        this.stiffness = 1; // Жорсткість дроту
        
        this.mouseX = -1000;
        this.mouseY = -1000;
        this.lastScrollY = window.scrollY;
        
        this.colors = ['red', 'gold', 'green', 'blue'];
        this.bulbIndex = 0;

        this.init();
    }

    init() {
        // Створюємо Canvas для малювання дроту
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'garland-wire-canvas';
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '0';
        this.canvas.style.left = '0';
        this.canvas.style.zIndex = '99998'; // Під лампочками
        this.canvas.style.pointerEvents = 'none';
        document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext('2d');

        // Контейнер для лампочок
        this.bulbContainer = document.createElement('div');
        this.bulbContainer.id = 'garland-bulbs-container';
        document.body.appendChild(this.bulbContainer);

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Взаємодія
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
        });

        this.loop = this.update.bind(this);
        requestAnimationFrame(this.loop);
        
        this.createRope();
    }

    createRope() {
        // Очищаємо старе
        this.points = [];
        this.constraints = [];
        this.bulbContainer.innerHTML = '';
        this.bulbs = [];

        const segments = Math.floor(this.width / 40); // Кількість сегментів
        const segmentLength = 45; // Довжина сегмента (трохи більше відстані, щоб провисало)
        const startY = -10;

        // Створюємо точки
        for (let i = 0; i <= segments; i++) {
            const x = (i / segments) * this.width;
            const y = startY + Math.sin((i / segments) * Math.PI) * 50; // Початковий прогин
            // pinned: true для крайніх точок і кожної 5-ї (цвяшки)
            const pinned = (i === 0 || i === segments || i % 6 === 0); 
            
            this.points.push({
                x: x, y: y,
                oldx: x, oldy: y,
                pinned: pinned
            });

            // Додаємо лампочку, якщо точка не закріплена
            if (!pinned && i % 2 !== 0) {
                this.createBulbDOM(i);
            }
        }

        // Створюємо зв'язки (дріт)
        for (let i = 0; i < this.points.length - 1; i++) {
            this.constraints.push({
                p1: this.points[i],
                p2: this.points[i + 1],
                length: segmentLength
            });
        }
    }

    createBulbDOM(index) {
        const el = document.createElement('div');
        const color = this.colors[this.bulbIndex++ % this.colors.length];
        el.className = `physics-bulb ${color}`;
        this.bulbContainer.appendChild(el);
        // Зв'язуємо DOM елемент з фізичною точкою
        this.bulbs.push({ el: el, pointIndex: index });
    }

    update() {
        if (!document.getElementById('garland-wire-canvas')) return; // Якщо видалили

        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 1. Обробка фізики точок (Verlet Integration)
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

                // Реакція на скрол (інерція)
                p.y -= scrollDiff * 0.1;

                // Реакція на мишку
                const dx = p.x - this.mouseX;
                const dy = p.y - this.mouseY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 5;
                    p.y += Math.sin(angle) * force * 5;
                }
            }
        }

        // 2. Обробка зв'язків (Constraints)
        for (let i = 0; i < 5; i++) { // Кілька ітерацій для стабільності
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = (c.length - dist) / dist * 0.5; // push/pull factor

                const offsetX = dx * diff * 0.8; // Трохи пружності
                const offsetY = dy * diff * 0.8;

                if (!c.p1.pinned) {
                    c.p1.x -= offsetX;
                    c.p1.y -= offsetY;
                }
                if (!c.p2.pinned) {
                    c.p2.x += offsetX;
                    c.p2.y += offsetY;
                }
            }
        }

        // 3. Малювання дроту
        this.ctx.beginPath();
        this.ctx.strokeStyle = '#023020'; // Темно-зелений
        this.ctx.lineWidth = 3;
        this.ctx.lineCap = 'round';
        
        if (this.points.length > 0) {
            this.ctx.moveTo(this.points[0].x, this.points[0].y);
            for (let i = 1; i < this.points.length; i++) {
                // Крива Безьє для гладкості
                // this.ctx.lineTo(this.points[i].x, this.points[i].y);
                const xc = (this.points[i].oldx + this.points[i].x) / 2; // interpolation trick
                const yc = (this.points[i].oldy + this.points[i].y) / 2;
                this.ctx.lineTo(this.points[i].x, this.points[i].y);
            }
        }
        this.ctx.stroke();

        // 4. Оновлення позицій лампочок DOM
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            // Центруємо лампочку відносно точки
            b.el.style.transform = `translate(${p.x - 6}px, ${p.y + 4}px)`;
        }

        requestAnimationFrame(this.loop);
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight; // Можна на весь екран, якщо дріт довгий
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