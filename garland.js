// frontend/garland.js

// === CONSTANTS & CONFIG ===
const CONFIG = {
    colors: ['#ff3b30', '#ffcc00', '#4cd964', '#007aff', '#af52de', '#ff2d55'], // iOS style vibrant colors
    wireColor: '#1a472a',
    wireHighlight: '#2d6a4f',
    snowColor: '255, 255, 255',
    gravity: 0.45,
    friction: 0.96,
    wind: 0,
    quality: window.innerWidth < 800 ? 'low' : 'high' // Auto-quality for mobile
};

// === 1. CLASS: HYPER GARLAND (Гірлянда) ===
class XmasGarland {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.constraints = [];
        this.bulbs = [];
        this.width = window.innerWidth;
        this.height = 500; // Increased height for deeper swing
        this.segmentLength = window.innerWidth < 600 ? 25 : 18;
        
        // Container for HTML Bulbs (for CSS glowing effects)
        this.bulbContainer = document.getElementById('garland-bulbs-container');
        if (!this.bulbContainer) {
            this.bulbContainer = document.createElement('div');
            this.bulbContainer.id = 'garland-bulbs-container';
            this.bulbContainer.style.position = 'fixed';
            this.bulbContainer.style.top = '0';
            this.bulbContainer.style.left = '0';
            this.bulbContainer.style.width = '100%';
            this.bulbContainer.style.height = '0';
            this.bulbContainer.style.overflow = 'visible';
            this.bulbContainer.style.zIndex = '99998'; // Same as canvas
            this.bulbContainer.style.pointerEvents = 'none';
            document.body.appendChild(this.bulbContainer);
        }
        
        // Inject CSS for Bulbs
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
                width: 16px; height: 24px;
                border-radius: 50% 50% 40% 40%;
                transform-origin: top center;
                transition: transform 0.1s linear;
                z-index: 10;
                will-change: transform, box-shadow, opacity;
            }
            /* Socket (base) */
            .physics-bulb::before {
                content: ''; position: absolute; top: -4px; left: 3px;
                width: 10px; height: 6px; background: #333;
                border-radius: 2px; border-bottom: 1px solid #555;
            }
            /* Glass Shine */
            .physics-bulb::after {
                content: ''; position: absolute; top: 4px; left: 4px;
                width: 4px; height: 6px; background: rgba(255,255,255,0.4);
                border-radius: 50%; filter: blur(1px);
            }
            /* Glow Animation */
            @keyframes bulb-pulse {
                0%, 100% { opacity: 0.8; transform: scale(1); filter: brightness(1); }
                50% { opacity: 1; transform: scale(1.1); filter: brightness(1.3); }
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        this.createRope();
    }

    createRope() {
        this.points = [];
        this.constraints = [];
        this.bulbContainer.innerHTML = '';
        this.bulbs = [];

        // Sagging curve calculation
        const totalSegments = Math.ceil(this.width / this.segmentLength);
        const startY = -10;
        
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const x = t * this.width;
            // Catenary-like curve (droop)
            const sag = Math.sin(t * Math.PI) * 120; 
            // Add some randomness to initial y to make it look less perfect
            const y = startY + sag + (Math.random() * 10); 
            
            // Pin points: Ends and every ~15th point
            const pinFrequency = window.innerWidth < 600 ? 8 : 12;
            const pinned = (i === 0 || i === totalSegments || i % pinFrequency === 0);

            this.points.push({ x, y, oldx: x, oldy: y, pinned });

            // Add Bulb in the middle of segments
            if (!pinned && i % 2 === 0 && i > 0 && i < totalSegments) {
                this.addBulb(i);
            }
        }

        // Create constraints (sticks)
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
        const color = CONFIG.colors[Math.floor(Math.random() * CONFIG.colors.length)];
        el.className = 'physics-bulb';
        
        // Inline styles for performance and dynamic colors
        el.style.backgroundColor = color;
        // Realistic glow using box-shadow
        el.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}, inset 0 -5px 10px rgba(0,0,0,0.2)`;
        
        // Random animation delay for natural twinkling
        el.style.animation = `bulb-pulse ${2 + Math.random()}s infinite ease-in-out`;
        el.style.animationDelay = `${Math.random() * 2}s`;
        
        this.bulbContainer.appendChild(el);
        this.bulbs.push({ el, pointIndex });
    }

    update(mouse, scrollDiff) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 1. Physics Verlet Integration
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * CONFIG.friction;
                const vy = (p.y - p.oldy) * CONFIG.friction;
                
                p.oldx = p.x;
                p.oldy = p.y;
                
                p.x += vx;
                p.y += vy + CONFIG.gravity;
                p.y -= scrollDiff * 0.2; // React to scroll inertia

                // Mouse Interaction (Push)
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 80) {
                    const force = (80 - dist) / 80;
                    const angle = Math.atan2(dy, dx);
                    // Add "Magic" push
                    p.x += Math.cos(angle) * force * 5;
                    p.y += Math.sin(angle) * force * 5;
                }
            }
        }

        // 2. Constraints Solving (Stiffness)
        const iterations = 5; 
        for (let k = 0; k < iterations; k++) { 
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.hypot(dx, dy);
                const diff = (c.length - dist) / dist * 0.5;
                if (!c.p1.pinned) { c.p1.x -= dx * diff; c.p1.y -= dy * diff; }
                if (!c.p2.pinned) { c.p2.x += dx * diff; c.p2.y += dy * diff; }
            }
        }

        // 3. Rendering Wire (Twisted look)
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Dark base
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.wireColor;
        this.ctx.lineWidth = 3;
        this.drawCurve();
        this.ctx.stroke();

        // Lighter twist pattern (dashed line)
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.wireHighlight;
        this.ctx.lineWidth = 1.5;
        this.ctx.setLineDash([3, 4]); // Create twist effect
        this.drawCurve();
        this.ctx.stroke();
        this.ctx.setLineDash([]); // Reset

        // 4. Update Bulbs Position
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prevP = this.points[b.pointIndex - 1];
            const nextP = this.points[b.pointIndex + 1];
            
            // Calculate angle based on neighbors
            let angle = 0;
            if (prevP && nextP) {
                angle = Math.atan2(nextP.y - prevP.y, nextP.x - prevP.x) + (Math.PI / 2);
            }
            
            // Apply transform
            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angle}rad) translate(-50%, 0)`;
        }
    }

    drawCurve() {
        if (this.points.length === 0) return;
        this.ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length - 1; i++) {
            const xc = (this.points[i].x + this.points[i + 1].x) / 2;
            const yc = (this.points[i].y + this.points[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
        }
        this.ctx.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
    }
}

// === 2. CLASS: SOFT SNOW & FROST (Сніг та Лід) ===
class SnowSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.magicParticles = []; // For cursor trail
        
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        this.groundMap = new Float32Array(this.width);
        this.maxSnowHeight = 80;
        
        // Generate initial frost vignette intensity (0 to 1)
        this.frostLevel = 0.8; 
        
        this.initFlakes();
    }

    initFlakes() {
        const count = CONFIG.quality === 'low' ? 150 : 400;
        for (let i = 0; i < count; i++) {
            this.flakes.push(this.createFlake(true));
        }
    }

    createFlake(initial = false) {
        return {
            x: Math.random() * this.width,
            y: initial ? Math.random() * this.height : -20,
            vx: (Math.random() - 0.5) * 1.5,
            vy: Math.random() * 1.5 + 0.5,
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.5 + 0.3,
            sway: Math.random() * 0.05
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.groundMap = new Float32Array(this.width);
    }

    update(mouse) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // --- A. FROST VIGNETTE (Малюємо мороз по кутах) ---
        // (Optimized: draw gradient instead of complex image)
        const gradient = this.ctx.createRadialGradient(
            this.width / 2, this.height / 2, this.height * 0.4,
            this.width / 2, this.height / 2, this.height * 0.9
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(1, `rgba(200, 220, 255, ${this.frostLevel * 0.15})`);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0,0, this.width, this.height);

        // --- B. SNOWFLAKES ---
        this.ctx.fillStyle = "white";
        
        for (let i = 0; i < this.flakes.length; i++) {
            const f = this.flakes[i];
            
            // Movement
            f.x += f.vx + Math.sin(f.y * 0.01) * 0.5; // Wind sway
            f.y += f.vy;

            // Interaction with Mouse (Avoidance)
            const dx = f.x - mouse.x;
            const dy = f.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 100) {
                const angle = Math.atan2(dy, dx);
                f.vx += Math.cos(angle) * 0.1;
                f.vy += Math.sin(angle) * 0.1;
            }

            // Ground collision
            const floorX = Math.floor(f.x);
            let grounded = false;
            
            if (floorX >= 0 && floorX < this.width) {
                if (f.y >= this.height - this.groundMap[floorX]) {
                    grounded = true;
                    if (this.groundMap[floorX] < this.maxSnowHeight) {
                        this.groundMap[floorX] += f.size * 0.5;
                    }
                }
            }

            // Reset or Draw
            if (grounded || f.y > this.height || f.x > this.width || f.x < 0) {
                this.flakes[i] = this.createFlake();
            } else {
                this.ctx.globalAlpha = f.opacity;
                this.ctx.beginPath();
                // Soft glow for snowflakes
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        // --- C. MAGIC PARTICLES (Cursor Trail) ---
        // Spawn particles
        if (mouse.x > -100 && mouse.y > -100) {
            for(let i=0; i<2; i++) { // Spawn rate
                this.magicParticles.push({
                    x: mouse.x + (Math.random() - 0.5) * 20,
                    y: mouse.y + (Math.random() - 0.5) * 20,
                    vx: (Math.random() - 0.5) * 2,
                    vy: (Math.random() - 0.5) * 2,
                    life: 1.0,
                    color: `hsl(${Math.random() * 40 + 40}, 100%, 70%)` // Gold/Yellow
                });
            }
        }

        for (let i = this.magicParticles.length - 1; i >= 0; i--) {
            const p = this.magicParticles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy -= 0.05; // Float up slightly
            p.life -= 0.02;

            if (p.life <= 0) {
                this.magicParticles.splice(i, 1);
            } else {
                this.ctx.globalAlpha = p.life;
                this.ctx.fillStyle = p.color;
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        // --- D. GROUND PHYSICS (Smoothing) ---
        for (let k = 0; k < 2; k++) {
            for (let x = 0; x < this.width; x++) {
                const currentH = this.groundMap[x];
                if (x > 0) {
                    const diff = currentH - this.groundMap[x-1];
                    if (diff > 1) {
                        const flow = diff * 0.3;
                        this.groundMap[x] -= flow;
                        this.groundMap[x-1] += flow;
                    }
                }
                if (x < this.width - 1) {
                    const diff = currentH - this.groundMap[x+1];
                    if (diff > 1) {
                        const flow = diff * 0.3;
                        this.groundMap[x] -= flow;
                        this.groundMap[x+1] += flow;
                    }
                }
            }
        }

        // --- E. DRAW GROUND ---
        this.ctx.fillStyle = "white";
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = "rgba(255,255,255,0.9)";
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x < this.width; x+=2) { // Skip pixels for performance
            this.ctx.lineTo(x, this.height - this.groundMap[x]);
        }
        this.ctx.lineTo(this.width, this.height);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
    }
}

// === 3. MAIN MANAGER & UI ===
export class PhysicsManager {
    constructor() {
        this.isActive = true;
        
        // Canvases
        this.garlandCanvas = this.createCanvas('physics-garland-canvas', 99998);
        this.snowCanvas = this.createCanvas('physics-snow-canvas', 99999);
        this.snowCanvas.style.pointerEvents = 'none';

        // Systems
        this.garland = new XmasGarland(this.garlandCanvas);
        this.snow = new SnowSystem(this.snowCanvas);

        // State
        this.mouse = { x: -1000, y: -1000 };
        this.lastScrollY = window.scrollY;

        // Listeners
        this.bindEvents();
        
        // Create UI Controls
        this.createControls();

        // Start Loop
        this.loop = this.animate.bind(this);
        requestAnimationFrame(this.loop);
    }

    createCanvas(id, zIndex) {
        const c = document.createElement('canvas');
        c.id = id;
        c.style.position = 'fixed';
        c.style.top = '0';
        c.style.left = '0';
        c.style.width = '100vw';
        c.style.height = '100vh';
        c.style.zIndex = zIndex;
        c.style.pointerEvents = 'none';
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
            width: '40px', height: '40px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', fontSize: '20px', cursor: 'pointer',
            zIndex: '100001', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: '0.3s'
        });
        
        btn.onmouseenter = () => { btn.style.background = 'rgba(255,255,255,0.3)'; btn.style.transform = 'scale(1.1)'; };
        btn.onmouseleave = () => { btn.style.background = 'rgba(255,255,255,0.1)'; btn.style.transform = 'scale(1)'; };
        
        btn.onclick = () => {
            this.isActive = !this.isActive;
            btn.style.opacity = this.isActive ? '1' : '0.5';
            btn.innerHTML = this.isActive ? '❄️' : '🚫';
            this.garlandCanvas.style.display = this.isActive ? 'block' : 'none';
            this.snowCanvas.style.display = this.isActive ? 'block' : 'none';
            const bulbs = document.getElementById('garland-bulbs-container');
            if (bulbs) bulbs.style.display = this.isActive ? 'block' : 'none';
        };
        
        document.body.appendChild(btn);
        this.controlBtn = btn;
    }

    bindEvents() {
        this.resizeHandler = () => {
            this.garlandCanvas.width = window.innerWidth;
            this.garlandCanvas.height = window.innerHeight;
            this.snowCanvas.width = window.innerWidth;
            this.snowCanvas.height = window.innerHeight;
            this.garland.init(); // Re-init garland points
            this.snow.resize();
        };
        
        this.mouseHandler = (e) => { 
            this.mouse.x = e.clientX; 
            this.mouse.y = e.clientY; 
        };

        window.addEventListener('resize', this.resizeHandler);
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

        this.garland.update(this.mouse, scrollDiff);
        this.snow.update(this.mouse);

        requestAnimationFrame(this.loop);
    }

    destroy() {
        this.garlandCanvas.remove();
        this.snowCanvas.remove();
        const bulbs = document.getElementById('garland-bulbs-container');
        if (bulbs) bulbs.remove();
        if (this.controlBtn) this.controlBtn.remove();
        
        window.removeEventListener('resize', this.resizeHandler);
        document.removeEventListener('mousemove', this.mouseHandler);
    }
}