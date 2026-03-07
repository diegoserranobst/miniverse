import { Animator } from '../sprites/Animator';
import { SpriteSheet } from '../sprites/SpriteSheet';
import type { RenderLayer } from '../renderer/Renderer';
import type { Pathfinder } from '../scene/Pathfinder';

export type AgentState =
  | 'working'
  | 'idle'
  | 'thinking'
  | 'error'
  | 'waiting'
  | 'collaborating'
  | 'sleeping'
  | 'listening'
  | 'speaking'
  | 'offline';

export interface ResidentConfig {
  agentId: string;
  name: string;
  sprite: string;
  position: string;
}

const STATE_ANIMATION_MAP: Record<AgentState, string> = {
  working: 'working',
  idle: 'idle_down',
  thinking: 'idle_down',
  error: 'idle_down',
  waiting: 'idle_down',
  collaborating: 'walk_down',
  sleeping: 'sleeping',
  listening: 'idle_down',
  speaking: 'talking',
  offline: 'idle_down',
};

export class Resident {
  readonly agentId: string;
  readonly name: string;
  readonly animator: Animator;
  readonly spriteSheet: SpriteSheet;

  x = 0;
  y = 0;
  state: AgentState = 'idle';
  task: string | null = null;
  energy = 1;
  visible = true;

  private path: { x: number; y: number }[] = [];
  private pathIndex = 0;
  private moveSpeed = 2; // tiles per second
  private moveProgress = 0;
  private homePosition = '';
  private tileWidth = 16;
  private tileHeight = 16;
  private frameWidth: number;
  private frameHeight: number;

  private idleBehaviorTimer = 0;
  private idleBehaviorInterval = 5 + Math.random() * 5;

  constructor(
    config: ResidentConfig,
    spriteSheet: SpriteSheet,
    tileWidth: number,
    tileHeight: number,
  ) {
    this.agentId = config.agentId;
    this.name = config.name;
    this.spriteSheet = spriteSheet;
    this.animator = new Animator(spriteSheet);
    this.homePosition = config.position;
    this.tileWidth = tileWidth;
    this.tileHeight = tileHeight;
    this.frameWidth = spriteSheet.config.frameWidth;
    this.frameHeight = spriteSheet.config.frameHeight;
  }

  getHomePosition(): string {
    return this.homePosition;
  }

  setPixelPosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  setTilePosition(tileX: number, tileY: number) {
    this.x = tileX * this.tileWidth;
    this.y = tileY * this.tileHeight;
  }

  getTilePosition(): { x: number; y: number } {
    return {
      x: Math.round(this.x / this.tileWidth),
      y: Math.round(this.y / this.tileHeight),
    };
  }

  walkTo(path: { x: number; y: number }[]) {
    if (path.length <= 1) return;
    this.path = path;
    this.pathIndex = 1;
    this.moveProgress = 0;
  }

  isMoving(): boolean {
    return this.pathIndex < this.path.length;
  }

  updateState(state: AgentState, task: string | null, energy: number) {
    const prevState = this.state;
    this.state = state;
    this.task = task;
    this.energy = energy;
    this.visible = state !== 'offline';

    if (prevState !== state && !this.isMoving()) {
      const anim = STATE_ANIMATION_MAP[state] ?? 'idle_down';
      this.animator.play(anim);
    }
  }

  faceDirection(dir: 'up' | 'down' | 'left' | 'right') {
    const base = this.state === 'idle' ? 'idle' : 'walk';
    const animName = `${base}_${dir}`;
    if (this.spriteSheet.config.animations[animName]) {
      this.animator.play(animName);
    }
  }

  update(delta: number, pathfinder: Pathfinder, locations: Record<string, { x: number; y: number }>) {
    if (this.isMoving()) {
      this.updateMovement(delta);
    } else if (this.state === 'idle') {
      this.updateIdleBehavior(delta, pathfinder, locations);
    } else {
      const anim = STATE_ANIMATION_MAP[this.state] ?? 'idle_down';
      if (this.animator.getCurrentAnimation() !== anim) {
        this.animator.play(anim);
      }
    }

    this.animator.update(delta);
  }

  private updateMovement(delta: number) {
    if (this.pathIndex >= this.path.length) return;

    const target = this.path[this.pathIndex];
    const targetX = target.x * this.tileWidth;
    const targetY = target.y * this.tileHeight;

    const dx = targetX - this.x;
    const dy = targetY - this.y;

    // Set walk animation based on direction
    if (Math.abs(dx) > Math.abs(dy)) {
      this.animator.play(dx > 0 ? 'walk_right' : 'walk_left');
    } else {
      this.animator.play(dy > 0 ? 'walk_down' : 'walk_up');
    }

    this.moveProgress += delta * this.moveSpeed;

    if (this.moveProgress >= 1) {
      this.x = targetX;
      this.y = targetY;
      this.moveProgress = 0;
      this.pathIndex++;

      if (this.pathIndex >= this.path.length) {
        this.path = [];
        this.pathIndex = 0;
        const anim = STATE_ANIMATION_MAP[this.state] ?? 'idle_down';
        this.animator.play(anim);
      }
    } else {
      const prevTarget = this.path[this.pathIndex - 1];
      const prevX = prevTarget.x * this.tileWidth;
      const prevY = prevTarget.y * this.tileHeight;
      this.x = prevX + (targetX - prevX) * this.moveProgress;
      this.y = prevY + (targetY - prevY) * this.moveProgress;
    }
  }

  private updateIdleBehavior(
    delta: number,
    pathfinder: Pathfinder,
    locations: Record<string, { x: number; y: number }>,
  ) {
    this.idleBehaviorTimer += delta;
    if (this.idleBehaviorTimer < this.idleBehaviorInterval) return;

    this.idleBehaviorTimer = 0;
    this.idleBehaviorInterval = 5 + Math.random() * 8;

    const locationNames = Object.keys(locations);
    if (locationNames.length === 0) return;

    const target = locationNames[Math.floor(Math.random() * locationNames.length)];
    const loc = locations[target];
    const tile = this.getTilePosition();
    const path = pathfinder.findPath(tile.x, tile.y, loc.x, loc.y);
    if (path.length > 1) {
      this.walkTo(path);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    if (!this.visible) return;

    // Draw sprite centered on tile
    const drawX = this.x + (this.tileWidth - this.frameWidth) / 2;
    const drawY = this.y + (this.tileHeight - this.frameHeight);
    this.animator.draw(ctx, drawX, drawY);
  }

  containsPoint(px: number, py: number): boolean {
    const drawX = this.x + (this.tileWidth - this.frameWidth) / 2;
    const drawY = this.y + (this.tileHeight - this.frameHeight);
    return (
      px >= drawX &&
      px <= drawX + this.frameWidth &&
      py >= drawY &&
      py <= drawY + this.frameHeight
    );
  }
}

export class ResidentLayer implements RenderLayer {
  readonly order = 10;
  private residents: Resident[] = [];

  setResidents(residents: Resident[]) {
    this.residents = residents;
  }

  render(ctx: CanvasRenderingContext2D, _delta: number) {
    // Sort by y position for depth
    const sorted = [...this.residents].sort((a, b) => a.y - b.y);
    for (const resident of sorted) {
      resident.draw(ctx);
    }
  }
}
