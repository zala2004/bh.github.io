// Fruit Crush Canvas Particle Engine
class ParticleEngine {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.texts = [];
        this.rings = [];
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop = this.loop.bind(this);
        requestAnimationFrame(this.loop);
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width || 400;
        this.height = rect.height || 400;
        this.canvas.width = Math.floor(this.width * dpr);
        this.canvas.height = Math.floor(this.height * dpr);
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Spawn juicy splatter particles
    createSplatter(x, y, color, count = 16) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2 + Math.random() * 6;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                radius: 4 + Math.random() * 6,
                color: color || '#ff4757',
                alpha: 1,
                decay: 0.02 + Math.random() * 0.02,
                gravity: 0.18,
                type: 'circle'
            });
        }
    }

    // Spawn sparkling stars for combos / power-ups
    createSparkles(x, y, count = 12) {
        const colors = ['#ffd700', '#ff9f43', '#ffffff', '#ff6b6b'];
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1.5 + Math.random() * 5;
            this.particles.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                alpha: 1,
                decay: 0.025,
                gravity: 0.05,
                type: 'star'
            });
        }
    }

    // Spawn an expanding shockwave ring
    createShockwave(x, y, color = 'rgba(255, 255, 255, 0.8)') {
        this.rings.push({
            x,
            y,
            radius: 5,
            maxRadius: 80,
            color,
            alpha: 1,
            lineWidth: 6,
            decay: 0.035
        });
    }

    // Floating score / combo text
    createFloatingText(x, y, text, color = '#ffd700', size = 22) {
        this.texts.push({
            x,
            y,
            text,
            color,
            size,
            alpha: 1,
            vy: -2,
            decay: 0.02
        });
    }

    loop() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Render shockwave rings
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            this.ctx.save();
            this.ctx.beginPath();
            this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = r.color;
            this.ctx.globalAlpha = Math.max(0, r.alpha);
            this.ctx.lineWidth = r.lineWidth;
            this.ctx.stroke();
            this.ctx.restore();

            r.radius += (r.maxRadius - r.radius) * 0.2 + 2;
            r.alpha -= r.decay;
            r.lineWidth = Math.max(0.5, r.lineWidth * 0.95);

            if (r.alpha <= 0 || r.radius >= r.maxRadius) {
                this.rings.splice(i, 1);
            }
        }

        // Render particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            this.ctx.save();
            this.ctx.globalAlpha = Math.max(0, p.alpha);
            this.ctx.fillStyle = p.color;

            if (p.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, Math.max(0.5, p.radius), 0, Math.PI * 2);
                this.ctx.fill();
            } else if (p.type === 'star') {
                this.drawStar(this.ctx, p.x, p.y, 5, p.radius * 1.5, p.radius * 0.7);
            }

            this.ctx.restore();

            p.x += p.vx;
            p.y += p.vy;
            p.vy += p.gravity;
            p.vx *= 0.98;
            p.radius *= 0.97;
            p.alpha -= p.decay;

            if (p.alpha <= 0 || p.radius < 0.5) {
                this.particles.splice(i, 1);
            }
        }

        // Render floating texts
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const t = this.texts[i];
            this.ctx.save();
            this.ctx.font = `bold ${t.size}px 'Segoe UI', system-ui, sans-serif`;
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillStyle = t.color;
            this.ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            this.ctx.lineWidth = 4;
            this.ctx.globalAlpha = Math.max(0, t.alpha);
            this.ctx.strokeText(t.text, t.x, t.y);
            this.ctx.fillText(t.text, t.x, t.y);
            this.ctx.restore();

            t.y += t.vy;
            t.alpha -= t.decay;

            if (t.alpha <= 0) {
                this.texts.splice(i, 1);
            }
        }

        requestAnimationFrame(this.loop);
    }

    drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
        let rot = Math.PI / 2 * 3;
        let x = cx;
        let y = cy;
        const step = Math.PI / spikes;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = cx + Math.cos(rot) * outerRadius;
            y = cy + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = cx + Math.cos(rot) * innerRadius;
            y = cy + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerRadius);
        ctx.closePath();
        ctx.fill();
    }
}
