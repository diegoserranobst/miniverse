import type { RenderLayer } from '../renderer/Renderer';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  text: string;
  size: number;
  alpha: number;
}

export class ParticleSystem implements RenderLayer {
  readonly order = 20;
  private particles: Particle[] = [];

  emitZzz(x: number, y: number) {
    this.particles.push({
      x: x + Math.random() * 8,
      y,
      vx: 0.2 + Math.random() * 0.3,
      vy: -0.5 - Math.random() * 0.3,
      life: 2,
      maxLife: 2,
      text: 'Z',
      size: 6 + Math.random() * 4,
      alpha: 1,
    });
  }

  emitExclamation(x: number, y: number) {
    this.particles.push({
      x,
      y: y - 4,
      vx: 0,
      vy: -0.3,
      life: 1.5,
      maxLife: 1.5,
      text: '!',
      size: 8,
      alpha: 1,
    });
  }

  emitThought(x: number, y: number) {
    this.particles.push({
      x: x + 6,
      y: y - 2,
      vx: 0,
      vy: -0.2,
      life: 2,
      maxLife: 2,
      text: '...',
      size: 5,
      alpha: 1,
    });
  }

  update(delta: number) {
    for (const p of this.particles) {
      p.x += p.vx * delta * 10;
      p.y += p.vy * delta * 10;
      p.life -= delta;
      p.alpha = Math.max(0, p.life / p.maxLife);
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  render(ctx: CanvasRenderingContext2D, delta: number) {
    this.update(delta);

    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 0.5;
      ctx.font = `bold ${p.size}px monospace`;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
      ctx.restore();
    }
  }
}
