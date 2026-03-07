import type { RenderLayer } from '../renderer/Renderer';

interface Bubble {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
}

export class SpeechBubbleSystem implements RenderLayer {
  readonly order = 25;
  private bubbles: Bubble[] = [];

  show(x: number, y: number, text: string, duration = 3) {
    // Remove existing bubble at same position
    this.bubbles = this.bubbles.filter(b => !(Math.abs(b.x - x) < 1 && Math.abs(b.y - y) < 1));
    this.bubbles.push({ x, y, text, life: duration, maxLife: duration });
  }

  clear() {
    this.bubbles = [];
  }

  render(ctx: CanvasRenderingContext2D, delta: number) {
    for (const b of this.bubbles) {
      b.life -= delta;
    }
    this.bubbles = this.bubbles.filter(b => b.life > 0);

    for (const b of this.bubbles) {
      const alpha = Math.min(1, b.life / 0.5);
      ctx.save();
      ctx.globalAlpha = alpha;

      ctx.font = '5px monospace';
      const metrics = ctx.measureText(b.text);
      const textWidth = Math.min(metrics.width, 60);
      const padding = 3;
      const bw = textWidth + padding * 2;
      const bh = 10;
      const bx = b.x - bw / 2;
      const by = b.y - bh - 4;

      // Bubble background
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#333333';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, bh, 2);
      ctx.fill();
      ctx.stroke();

      // Tail
      ctx.beginPath();
      ctx.moveTo(b.x - 2, by + bh);
      ctx.lineTo(b.x, by + bh + 3);
      ctx.lineTo(b.x + 2, by + bh);
      ctx.fill();

      // Text
      ctx.fillStyle = '#333333';
      ctx.fillText(b.text.substring(0, 15), bx + padding, by + bh - 3);

      ctx.restore();
    }
  }
}
