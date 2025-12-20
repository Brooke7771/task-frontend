// frontend/garland.js

// === CONFIGURATION ===
const CONFIG = {
    // Яскраві неонові кольори для лампочок
    colors: ['#ff3b30', '#ffcc00', '#4cd964', '#007aff', '#af52de', '#ff2d55', '#00f2ff'],
    wireColor: '#2f3542', // Темний кабель
    wireHighlight: '#57606f', // Блік на кабелі
    gravity: 0.5,
    friction: 0.95,
    stiffness: 1.0, // Жорсткість дроту (щоб не розтягувався як гумка)
    frostSpeed: 0.003, // Швидкість замерзання
    thawSpeed: 0.05    // Швидкість танення від мишки
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
        this.height = window.innerHeight;
        this.segmentLength = window.innerWidth < 600 ? 28 : 22;
        
        // DOM Container for Bulbs (CSS render is sharper for UI elements)
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
                width: 18px; height: 28px;
                background: radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), transparent), var(--bulb-color);
                border-radius: 50% 50% 45% 45%;
                transform-origin: top center;
                box-shadow: 0 5px 15px var(--bulb-glow);
                will-change: transform, opacity;
                transition: transform 0.05s linear; /* Smooth physics update */
            }
            .physics-bulb::before { /* Socket */
                content: ''; position: absolute; top: -5px; left: 4px;
                width: 10px; height: 6px; background: #222;
                border-radius: 2px; border-bottom: 2px solid #444;
            }
            .physics-bulb::after { /* Filament glow center */
                content: ''; position: absolute; top: 8px; left: 6px;
                width: 6px; height: 8px; background: rgba(255,255,255,0.6);
                border-radius: 50%; filter: blur(2px); opacity: 0.7;
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        this.createRope();
    }

    createRope() {
        // Clear existing
        this.bulbContainer.innerHTML = '';
        this.bulbs = [];
        this.points = [];
        this.constraints = [];

        const totalSegments = Math.ceil(this.width / this.segmentLength);
        const startY = -15;
        
        // Generate Points
        for (let i = 0; i <= totalSegments; i++) {
            const t = i / totalSegments;
            const x = t * this.width;
            // Natural sagging curve (Catenary approx)
            const sag = Math.sin(t * Math.PI) * (this.width * 0.15); // Sag depends on width
            const y = startY + sag; 
            
            // Pin strategy: Pin corners + every Nth point to create "loops"
            const pinFrequency = window.innerWidth < 600 ? 6 : 10;
            const pinned = (i === 0 || i === totalSegments || i % pinFrequency === 0);

            this.points.push({ x, y, oldx: x, oldy: y, pinned });

            // Add Bulb logic (skip pinned points and adjacent ones for clearance)
            if (!pinned && i % 2 === 0 && i > 1 && i < totalSegments - 1) {
                this.addBulb(i);
            }
        }

        // Generate Constraints (Sticks)
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
        
        // CSS Variables for dynamic coloring
        el.style.setProperty('--bulb-color', color);
        el.style.setProperty('--bulb-glow', color);
        
        // Initial random swing
        el.style.transform = `translate(-100px, -100px)`; 
        
        this.bulbContainer.appendChild(el);
        this.bulbs.push({ el, pointIndex, intensity: 1.0 });
    }

    update(mouse, scrollDiff) {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // --- 1. PHYSICS (Verlet) ---
        for (let i = 0; i < this.points.length; i++) {
            const p = this.points[i];
            if (!p.pinned) {
                const vx = (p.x - p.oldx) * CONFIG.friction;
                const vy = (p.y - p.oldy) * CONFIG.friction;
                
                p.oldx = p.x;
                p.oldy = p.y;
                
                p.x += vx;
                p.y += vy + CONFIG.gravity;
                p.y -= scrollDiff * 0.5; // Inertia from scrolling

                // Mouse Interaction (Plucking the string)
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 50) { // Mouse radius
                    const force = (50 - dist) / 50;
                    const angle = Math.atan2(dy, dx);
                    p.x += Math.cos(angle) * force * 15; // Push hard
                    p.y += Math.sin(angle) * force * 15;
                }
            }
        }

        // --- 2. CONSTRAINTS (Solving rigidity) ---
        for (let k = 0; k < 3; k++) { // 3 iterations for stability
            for (const c of this.constraints) {
                const dx = c.p2.x - c.p1.x;
                const dy = c.p2.y - c.p1.y;
                const dist = Math.hypot(dx, dy);
                const diff = (c.length - dist) / dist * 0.5 * CONFIG.stiffness;
                
                if (!c.p1.pinned) { c.p1.x -= dx * diff; c.p1.y -= dy * diff; }
                if (!c.p2.pinned) { c.p2.x += dx * diff; c.p2.y += dy * diff; }
            }
        }

        // --- 3. RENDER GLOW (Canvas Behind) ---
        // We draw the glow on canvas for performance, keeping DOM elements for crispness
        this.ctx.globalCompositeOperation = 'screen'; // Additive blending for light
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            // Ambient light cast by bulb
            const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 60);
            gradient.addColorStop(0, b.el.style.getPropertyValue('--bulb-color') + '44'); // Transparent hex
            gradient.addColorStop(1, 'transparent');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, 60, 0, Math.PI * 2);
            this.ctx.fill();
        }
        this.ctx.globalCompositeOperation = 'source-over';

        // --- 4. RENDER WIRE ---
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Base wire
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.wireColor;
        this.ctx.lineWidth = 3;
        this.drawCurve();
        this.ctx.stroke();

        // Highlight (Twisted effect)
        this.ctx.beginPath();
        this.ctx.strokeStyle = CONFIG.wireHighlight;
        this.ctx.lineWidth = 1;
        this.ctx.setLineDash([2, 3]);
        this.drawCurve();
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        // --- 5. UPDATE DOM BULBS ---
        for (const b of this.bulbs) {
            const p = this.points[b.pointIndex];
            const prev = this.points[b.pointIndex - 1];
            const next = this.points[b.pointIndex + 1];
            
            // Calculate angle based on rope segment
            let angle = 0;
            if (prev && next) {
                angle = Math.atan2(next.y - prev.y, next.x - prev.x) + (Math.PI / 2);
            }
            
            // Apply physics position to DOM element
            b.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${angle}rad) translate(-50%, 0)`;
            
            // Dynamic flickering based on movement speed (energy)
            const speed = Math.hypot(p.x - p.oldx, p.y - p.oldy);
            const flicker = 1 + (speed * 0.1); // Brighter when moving
            b.el.style.opacity = Math.min(1, 0.8 + Math.random() * 0.2); // Natural flicker
            b.el.style.filter = `brightness(${flicker})`;
        }
    }

    drawCurve() {
        if (!this.points.length) return;
        this.ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length - 1; i++) {
            const xc = (this.points[i].x + this.points[i + 1].x) / 2;
            const yc = (this.points[i].y + this.points[i + 1].y) / 2;
            this.ctx.quadraticCurveTo(this.points[i].x, this.points[i].y, xc, yc);
        }
        this.ctx.lineTo(this.points[this.points.length - 1].x, this.points[this.points.length - 1].y);
    }
}

// === 2. CLASS: LIVING FROST & SNOW (Живий Лід та Сніг) ===
class WinterSystem {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.flakes = [];
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        
        // Snow Accumulation
        this.groundMap = new Float32Array(this.width);
        this.maxSnowHeight = 120; // Higher snow piles
        
        // Dynamic Frost State
        this.frostIntensity = 0; // 0.0 to 1.0
        this.idleTime = 0;
        
        // Frost Noise Texture (Pre-rendered for performance)
        this.frostTexture = this.createFrostTexture();
        
        this.initFlakes();
    }

    createFrostTexture() {
        // Creates a seamless noise pattern off-screen
        const c = document.createElement('canvas');
        c.width = 200; c.height = 200;
        const ctx = c.getContext('2d');
        const imgData = ctx.createImageData(200, 200);
        for (let i = 0; i < imgData.data.length; i += 4) {
            const val = Math.random() * 255;
            imgData.data[i] = 200; // R
            imgData.data[i+1] = 220; // G
            imgData.data[i+2] = 255; // B
            imgData.data[i+3] = Math.random() > 0.5 ? val * 0.3 : 0; // Alpha noise
        }
        ctx.putImageData(imgData, 0, 0);
        return c;
    }

    initFlakes() {
        const count = window.innerWidth < 800 ? 100 : 350;
        for (let i = 0; i < count; i++) {
            this.flakes.push(this.createFlake(true));
        }
    }

    createFlake(initial = false) {
        return {
            x: Math.random() * this.width,
            y: initial ? Math.random() * this.height : -20,
            vx: (Math.random() - 0.5) * 1,
            vy: Math.random() * 2 + 1, // Faster fall
            size: Math.random() * 3 + 1,
            opacity: Math.random() * 0.6 + 0.4,
            sway: Math.random() * 0.1,
            spin: Math.random() * 0.2
        };
    }

    resize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.groundMap = new Float32Array(this.width); // Reset ground on resize
    }

    update(mouse, mouseSpeed) {
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // --- A. DYNAMIC FROST LOGIC (Heat/Cold) ---
        if (mouseSpeed > 5) {
            // High movement melts frost
            this.idleTime = 0;
            this.frostIntensity = Math.max(0, this.frostIntensity - CONFIG.thawSpeed);
        } else {
            // Idle freezes screen
            this.idleTime++;
            if (this.idleTime > 60) { // Start freezing after ~1s idle
                this.frostIntensity = Math.min(1, this.frostIntensity + CONFIG.frostSpeed);
            }
        }

        // --- B. DRAW FROST VIGNETTE ---
        if (this.frostIntensity > 0.01) {
            this.ctx.save();
            this.ctx.globalAlpha = this.frostIntensity * 0.8;
            this.ctx.globalCompositeOperation = 'source-over';
            
            // Draw Gradient Mask
            const gradient = this.ctx.createRadialGradient(
                this.width / 2, this.height / 2, this.height * 0.3,
                this.width / 2, this.height / 2, this.height * 1.2
            );
            gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
            gradient.addColorStop(0.5, 'rgba(200, 230, 255, 0.2)');
            gradient.addColorStop(1, 'rgba(180, 220, 255, 0.9)'); // Deep freeze at edges
            
            this.ctx.fillStyle = gradient;
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            // Overlay Noise Texture for "Ice Crystal" look
            this.ctx.globalCompositeOperation = 'overlay';
            this.ctx.fillStyle = this.ctx.createPattern(this.frostTexture, 'repeat');
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }

        // --- C. SNOWFLAKES (Turbulence) ---
        this.ctx.fillStyle = "white";
        for (let i = 0; i < this.flakes.length; i++) {
            const f = this.flakes[i];
            
            // Add mouse wind/turbulence
            const dx = f.x - mouse.x;
            const dy = f.y - mouse.y;
            const dist = Math.hypot(dx, dy);
            
            // Physics
            if (dist < 150 && mouseSpeed > 2) {
                const force = (150 - dist) / 150;
                f.vx += (dx / dist) * force * mouseSpeed * 0.05;
                f.vy += (dy / dist) * force * mouseSpeed * 0.05;
            }

            f.x += f.vx + Math.sin(f.y * 0.02) * 0.5;
            f.y += f.vy;
            f.vx *= 0.99; // Air resistance
            
            // Ground Collision (Accumulation)
            const floorX = Math.floor(f.x);
            if (floorX >= 0 && floorX < this.width) {
                if (f.y >= this.height - this.groundMap[floorX]) {
                    // Pile up snow
                    if (this.groundMap[floorX] < this.maxSnowHeight) {
                        // Add to pile, forming a heap
                        this.groundMap[floorX] += f.size * 0.8;
                        // Spilling over to neighbors (smoothing)
                        if (floorX > 0) this.groundMap[floorX-1] += f.size * 0.2;
                        if (floorX < this.width-1) this.groundMap[floorX+1] += f.size * 0.2;
                    }
                    // Respawn
                    this.flakes[i] = this.createFlake();
                    continue;
                }
            }

            // Screen wrap
            if (f.y > this.height || f.x > this.width || f.x < 0) {
                this.flakes[i] = this.createFlake();
            } else {
                this.ctx.globalAlpha = f.opacity;
                this.ctx.beginPath();
                this.ctx.arc(f.x, f.y, f.size, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
        this.ctx.globalAlpha = 1;

        // --- D. DRAW GROUND (Smooth Piles) ---
        // Smooth the ground array
        for (let x = 1; x < this.width - 1; x++) {
            this.groundMap[x] = (this.groundMap[x-1] + this.groundMap[x] + this.groundMap[x+1]) / 3;
        }

        this.ctx.fillStyle = "#fff";
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = "rgba(200, 220, 255, 0.8)";
        
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.height);
        for (let x = 0; x < this.width; x+=3) { // Optimize drawing
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
        
        // Setup Canvases
        this.garlandCanvas = this.createCanvas('physics-garland-canvas', 99998);
        this.snowCanvas = this.createCanvas('physics-snow-canvas', 99999);
        this.snowCanvas.style.pointerEvents = 'none';

        // Init Systems
        this.garland = new XmasGarland(this.garlandCanvas);
        this.winter = new WinterSystem(this.snowCanvas);

        // State Tracking
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
        // Toggle Button (Snowflake)
        const btn = document.createElement('button');
        btn.innerHTML = '❄️';
        Object.assign(btn.style, {
            position: 'fixed', bottom: '20px', left: '20px',
            width: '45px', height: '45px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)',
            color: 'white', fontSize: '22px', cursor: 'pointer',
            zIndex: '100001', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.3s ease', boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
        });
        
        btn.onmouseenter = () => { btn.style.background = 'rgba(255,255,255,0.3)'; btn.style.transform = 'scale(1.1) rotate(15deg)'; };
        btn.onmouseleave = () => { btn.style.background = 'rgba(255,255,255,0.15)'; btn.style.transform = 'scale(1) rotate(0deg)'; };
        
        btn.onclick = () => {
            this.isActive = !this.isActive;
            btn.innerHTML = this.isActive ? '❄️' : '🌙';
            btn.style.filter = this.isActive ? 'none' : 'grayscale(1)';
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
            this.garland.width = w; // Update internals
            this.garland.height = h;
            this.garland.init(); // Re-calc ropes
            this.winter.resize();
        };
        
        this.mouseHandler = (e) => { 
            this.mouse.x = e.clientX; 
            this.mouse.y = e.clientY; 
        };

        // Debounce resize to prevent flashing
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

        // Calc mouse speed for interaction
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