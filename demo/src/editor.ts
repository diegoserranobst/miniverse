/**
 * Tabbed editor: furniture | characters | behavior
 * Owns the panel chrome, tab switching, and input routing.
 * Delegates to FurnitureSystem for furniture data/rendering.
 */

import type { Miniverse, Resident } from 'miniverse';
import {
  FurnitureSystem,
  ANCHOR_COLORS,
  ANCHOR_TYPES,
  type AnchorType,
  type Anchor,
  type LoadedPiece,
} from './furniture';

export type EditorTab = 'furniture' | 'characters' | 'behavior';

export class Editor {
  private active = false;
  private tab: EditorTab = 'furniture';

  private canvas: HTMLCanvasElement;
  private scale: number;
  private tileSize: number;
  private furniture: FurnitureSystem;
  private mv: Miniverse;

  // DOM
  private wrapper: HTMLElement | null = null;
  private panel: HTMLElement | null = null;
  private tabBtns: Map<EditorTab, HTMLElement> = new Map();
  private tabContent: HTMLElement | null = null;

  // Characters state
  private selectedResidentId: string | null = null;

  // Behavior state
  private selAnchorPiece: LoadedPiece | null = null;
  private selAnchorIdx = -1;
  private draggingAnchor = false;
  private dragAnchorOx = 0;
  private dragAnchorOy = 0;

  constructor(
    canvas: HTMLCanvasElement,
    furniture: FurnitureSystem,
    mv: Miniverse,
  ) {
    this.canvas = canvas;
    this.scale = furniture.getScale();
    this.tileSize = furniture.getTileSize();
    this.furniture = furniture;
    this.mv = mv;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    window.addEventListener('keydown', this.onKeyDown);
  }

  isActive(): boolean { return this.active; }
  getTab(): EditorTab { return this.tab; }

  // --- Rendering (called from addLayer) ---

  renderOverlay(ctx: CanvasRenderingContext2D) {
    if (!this.active) return;
    ctx.save();
    this.renderGrid(ctx);

    switch (this.tab) {
      case 'furniture': this.renderFurnitureOverlay(ctx); break;
      case 'characters': this.renderCharactersOverlay(ctx); break;
      case 'behavior': this.renderBehaviorOverlay(ctx); break;
    }
    ctx.restore();
  }

  // --- Grid (shared across tabs) ---

  private renderGrid(ctx: CanvasRenderingContext2D) {
    const T = this.tileSize;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 0.5;
    const cw = ctx.canvas.width / this.scale;
    const ch = ctx.canvas.height / this.scale;
    for (let x = 0; x <= cw; x += T) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, ch); ctx.stroke();
    }
    for (let y = 0; y <= ch; y += T) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(cw, y); ctx.stroke();
    }
  }

  // --- Furniture overlay ---

  private renderFurnitureOverlay(ctx: CanvasRenderingContext2D) {
    const T = this.tileSize;

    // Small anchor dots
    for (const p of this.furniture.pieces) {
      for (const a of p.anchors) {
        this.drawAnchorDot(ctx, (p.x + a.ox) * T + T / 2, (p.y + a.oy) * T + T / 2, a.type, 3);
      }
    }

    // Selected piece highlight
    const s = this.furniture.selected;
    if (s) {
      ctx.strokeStyle = '#00ff88';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(s.x * T, s.y * T, s.w * T, s.h * T);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.font = '7px monospace';
      const label = `${s.id} (${s.x.toFixed(1)}, ${s.y.toFixed(1)})`;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(s.x * T, s.y * T - 10, tw + 4, 10);
      ctx.fillStyle = '#00ff88';
      ctx.fillText(label, s.x * T + 2, s.y * T - 2);
    }

    this.refreshTabContent();
  }

  // --- Characters overlay ---

  private renderCharactersOverlay(ctx: CanvasRenderingContext2D) {
    const T = this.tileSize;
    for (const r of this.mv.getResidents()) {
      if (!r.visible) continue;
      const cx = r.x + T / 2;
      const cy = r.y + T / 2;
      const selected = r.agentId === this.selectedResidentId;

      ctx.beginPath();
      ctx.arc(cx, cy, selected ? 14 : 10, 0, Math.PI * 2);
      ctx.strokeStyle = selected ? '#00ff88' : 'rgba(255,255,255,0.4)';
      ctx.lineWidth = selected ? 2 : 1;
      ctx.stroke();

      if (selected) {
        ctx.fillStyle = 'rgba(0,255,136,0.1)';
        ctx.fill();
      }
    }
    this.refreshTabContent();
  }

  // --- Behavior overlay ---

  private renderBehaviorOverlay(ctx: CanvasRenderingContext2D) {
    const T = this.tileSize;

    // Piece outlines (dimmed)
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    for (const p of this.furniture.pieces) {
      ctx.strokeRect(p.x * T, p.y * T, p.w * T, p.h * T);
    }

    // All anchor dots (large)
    for (const p of this.furniture.pieces) {
      for (let i = 0; i < p.anchors.length; i++) {
        const a = p.anchors[i];
        const ax = (p.x + a.ox) * T + T / 2;
        const ay = (p.y + a.oy) * T + T / 2;
        const isSel = p === this.selAnchorPiece && i === this.selAnchorIdx;
        this.drawAnchorDot(ctx, ax, ay, a.type, isSel ? 7 : 5);

        if (isSel) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(ax, ay, 9, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Label
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = '#ccc';
        ctx.font = '6px monospace';
        ctx.fillText(a.name, (p.x + a.ox) * T + 2, (p.y + a.oy) * T - 2);
        ctx.globalAlpha = 1;
      }
    }

    // Wander points
    for (const wp of this.furniture.wanderPoints) {
      const wx = wp.x * T + T / 2;
      const wy = wp.y * T + T / 2;
      this.drawAnchorDot(ctx, wx, wy, 'wander', 5);
      ctx.strokeStyle = '#888';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(wx, wy, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 0.5;
      ctx.font = '6px monospace';
      ctx.fillStyle = '#888';
      ctx.fillText(wp.name, wp.x * T + 2, wp.y * T - 2);
      ctx.globalAlpha = 1;
    }

    this.refreshTabContent();
  }

  private drawAnchorDot(ctx: CanvasRenderingContext2D, x: number, y: number, type: AnchorType, r: number) {
    ctx.fillStyle = ANCHOR_COLORS[type];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- Panel ---

  private buildPanel() {
    if (this.panel) return;

    const container = this.canvas.parentElement!;
    this.wrapper = document.createElement('div');
    this.wrapper.id = 'editor-wrapper';
    this.wrapper.style.cssText = 'display:flex; gap:0; align-items:stretch;';
    container.parentElement!.insertBefore(this.wrapper, container);
    this.wrapper.appendChild(container);

    this.panel = document.createElement('div');
    this.panel.style.cssText = `
      width: 190px;
      background: #111;
      border: 2px solid #00ff88;
      border-left: none;
      border-radius: 0 4px 4px 0;
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #ccc;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.style.cssText = 'display:flex; border-bottom:1px solid #333;';
    const tabs: EditorTab[] = ['furniture', 'characters', 'behavior'];
    for (const t of tabs) {
      const btn = document.createElement('div');
      btn.textContent = t.charAt(0).toUpperCase() + t.slice(1, 4);
      btn.style.cssText = `
        flex:1; text-align:center; padding:6px 0; cursor:pointer;
        font-size:10px; text-transform:uppercase; letter-spacing:1px;
        transition: background 0.1s, color 0.1s;
      `;
      btn.addEventListener('click', () => this.switchTab(t));
      tabBar.appendChild(btn);
      this.tabBtns.set(t, btn);
    }
    this.panel.appendChild(tabBar);

    // Content area
    this.tabContent = document.createElement('div');
    this.tabContent.style.cssText = 'flex:1; overflow-y:auto; display:flex; flex-direction:column;';
    this.panel.appendChild(this.tabContent);

    this.wrapper.appendChild(this.panel);
    this.updateTabStyles();
    this.buildTabContent();
  }

  private updateTabStyles() {
    for (const [t, btn] of this.tabBtns) {
      if (t === this.tab) {
        btn.style.background = '#00ff8825';
        btn.style.color = '#00ff88';
        btn.style.borderBottom = '2px solid #00ff88';
      } else {
        btn.style.background = 'transparent';
        btn.style.color = '#666';
        btn.style.borderBottom = '2px solid transparent';
      }
    }
  }

  private switchTab(tab: EditorTab) {
    if (tab === this.tab) return;
    this.tab = tab;
    this.furniture.selected = null;
    this.selAnchorPiece = null;
    this.selAnchorIdx = -1;
    this.selectedResidentId = null;
    this.updateTabStyles();
    this.buildTabContent();
  }

  private buildTabContent() {
    if (!this.tabContent) return;
    this.tabContent.innerHTML = '';
    switch (this.tab) {
      case 'furniture': this.buildFurnitureTab(); break;
      case 'characters': this.buildCharactersTab(); break;
      case 'behavior': this.buildBehaviorTab(); break;
    }
  }

  private refreshTabContent() {
    switch (this.tab) {
      case 'furniture': this.refreshFurnitureTab(); break;
      case 'characters': this.refreshCharactersTab(); break;
      case 'behavior': this.refreshBehaviorTab(); break;
    }
  }

  // --- Furniture tab ---

  private furnitureInfo: HTMLElement | null = null;

  private buildFurnitureTab() {
    const c = this.tabContent!;

    // Controls
    const controls = this.el('div', 'padding:6px 10px; border-bottom:1px solid #333; line-height:1.6;');
    controls.innerHTML = [
      '<span style="color:#00ff88">Drag</span> move',
      '<span style="color:#00ff88">Arrows</span> nudge',
      '<span style="color:#00ff88">+ / -</span> resize',
      '<span style="color:#00ff88">L</span> layer',
      '<span style="color:#00ff88">Del</span> remove',
      '<span style="color:#00ff88">S</span> save',
    ].join('<br>');
    c.appendChild(controls);

    // Selected info
    this.furnitureInfo = this.el('div', 'padding:6px 10px; border-bottom:1px solid #333; min-height:36px; color:#888;');
    this.furnitureInfo.innerHTML = '<span style="color:#555">Click a piece</span>';
    c.appendChild(this.furnitureInfo);

    // Inventory
    const invLabel = this.el('div', 'padding:4px 10px; color:#555; font-size:9px; text-transform:uppercase; letter-spacing:1px;');
    invLabel.textContent = 'Inventory';
    c.appendChild(invLabel);

    const grid = this.el('div', 'padding:4px 8px; display:flex; flex-wrap:wrap; gap:4px;');
    for (const [id, src] of this.furniture.getImageSrcs()) {
      const item = this.el('div', `
        width:40px; height:40px; border:1px solid #333; border-radius:3px;
        display:flex; align-items:center; justify-content:center;
        cursor:pointer; background:#1a1a2e;
      `);
      item.title = id;
      const thumb = document.createElement('img');
      thumb.src = src;
      thumb.style.cssText = 'max-width:34px; max-height:34px; image-rendering:pixelated;';
      item.appendChild(thumb);
      item.addEventListener('mouseenter', () => { item.style.borderColor = '#00ff88'; });
      item.addEventListener('mouseleave', () => { item.style.borderColor = '#333'; });
      item.addEventListener('click', () => {
        const p = this.furniture.addPiece(id);
        if (p) this.furniture.selected = p;
      });
      grid.appendChild(item);
    }
    c.appendChild(grid);
  }

  private refreshFurnitureTab() {
    if (!this.furnitureInfo) return;
    const s = this.furniture.selected;
    if (!s) {
      this.furnitureInfo.innerHTML = '<span style="color:#555">Click a piece</span>';
      return;
    }
    const anchors = s.anchors.length > 0
      ? s.anchors.map(a => `<span style="color:${ANCHOR_COLORS[a.type]}">\u25CF</span> ${a.name}`).join('<br>')
      : '<span style="color:#555">no anchors</span>';
    this.furnitureInfo.innerHTML = [
      `<span style="color:#00ff88">${s.id}</span>`,
      `pos: ${s.x.toFixed(2)}, ${s.y.toFixed(2)}`,
      `size: ${s.w.toFixed(1)}\u00D7${s.h.toFixed(1)}  layer: <span style="color:${s.layer === 'above' ? '#ff8844' : '#4488ff'}">${s.layer}</span>`,
      anchors,
    ].join('<br>');
  }

  // --- Characters tab ---

  private charsInfo: HTMLElement | null = null;
  private charsList: HTMLElement | null = null;

  private buildCharactersTab() {
    const c = this.tabContent!;

    const hint = this.el('div', 'padding:6px 10px; border-bottom:1px solid #333; line-height:1.6;');
    hint.innerHTML = [
      '<span style="color:#00ff88">Click</span> select resident',
      '<span style="color:#00ff88">Desk</span> assign work anchor',
    ].join('<br>');
    c.appendChild(hint);

    // Residents list
    this.charsList = this.el('div', 'padding:4px 8px; border-bottom:1px solid #333;');
    this.rebuildCharsList();
    c.appendChild(this.charsList);

    // Selected info
    this.charsInfo = this.el('div', 'padding:6px 10px; min-height:40px; color:#888;');
    this.charsInfo.innerHTML = '<span style="color:#555">Select a resident</span>';
    c.appendChild(this.charsInfo);
  }

  private rebuildCharsList() {
    if (!this.charsList) return;
    this.charsList.innerHTML = '';
    for (const r of this.mv.getResidents()) {
      const row = this.el('div', `
        padding:4px 6px; cursor:pointer; display:flex; align-items:center; gap:6px;
        border-radius:3px; margin-bottom:2px;
        border:1px solid ${r.agentId === this.selectedResidentId ? '#00ff88' : 'transparent'};
        background:${r.agentId === this.selectedResidentId ? '#00ff8815' : 'transparent'};
      `);
      const dot = this.el('span', `
        width:6px; height:6px; border-radius:50%; display:inline-block;
        background:${this.stateColor(r.state)};
      `);
      row.appendChild(dot);
      const name = this.el('span', 'flex:1;');
      name.textContent = r.name;
      row.appendChild(name);
      const pos = this.el('span', 'color:#555; font-size:9px;');
      pos.textContent = r.getHomePosition();
      row.appendChild(pos);
      row.addEventListener('click', () => {
        this.selectedResidentId = r.agentId;
        this.charsBuiltFor = null;
        this.rebuildCharsList();
      });
      this.charsList.appendChild(row);
    }
  }

  private charsBuiltFor: string | null = null;

  private refreshCharactersTab() {
    if (!this.charsInfo) return;
    if (!this.selectedResidentId) {
      this.charsBuiltFor = null;
      this.charsInfo.innerHTML = '<span style="color:#555">Select a resident</span>';
      return;
    }

    // Only rebuild if selection changed — avoids destroying active dropdowns
    if (this.charsBuiltFor === this.selectedResidentId) return;
    this.charsBuiltFor = this.selectedResidentId;

    const r = this.mv.getResident(this.selectedResidentId);
    if (!r) return;

    // Build map of which work anchors are assigned to whom
    const assigned = new Map<string, string>();
    for (const res of this.mv.getResidents()) {
      assigned.set(res.getHomePosition(), res.name);
    }

    // Only show work anchors
    const workAnchors = this.furniture.getLocations().filter(l => l.type === 'work');
    const currentHome = r.getHomePosition();
    const isWorkAnchor = workAnchors.some(a => a.name === currentHome);
    const unassignedOpt = !isWorkAnchor
      ? `<option value="${currentHome}" selected style="color:#f44">${currentHome} (not a desk)</option>`
      : '';
    const homeOptions = unassignedOpt + workAnchors.map(a => {
      const owner = assigned.get(a.name);
      const isOwn = currentHome === a.name;
      const taken = owner && !isOwn;
      return `<option value="${a.name}" ${isOwn ? 'selected' : ''} ${taken ? 'disabled' : ''}>${a.name}${taken ? ` (${owner})` : ''}</option>`;
    }).join('');

    this.charsInfo.innerHTML = [
      `<span style="color:#00ff88">${r.name}</span> <span style="color:#555">(${r.agentId})</span>`,
      `state: ${r.state}`,
      `desk: <select id="ed-home-select" style="background:#222;border:1px solid #444;color:#ccc;font-family:inherit;font-size:10px;padding:1px 2px;border-radius:2px;">${homeOptions}</select>`,
    ].join('<br>');

    const sel = this.charsInfo.querySelector('#ed-home-select') as HTMLSelectElement | null;
    sel?.addEventListener('change', () => {
      r.setHomePosition(sel.value);
      this.saveCharacterAssignments();
      this.charsBuiltFor = null; // force info panel rebuild
      this.rebuildCharsList();
    });
  }

  private stateColor(state: string): string {
    const map: Record<string, string> = {
      working: '#4ade80', idle: '#fbbf24', sleeping: '#818cf8',
      thinking: '#f472b6', error: '#ef4444', speaking: '#22d3ee',
    };
    return map[state] ?? '#555';
  }

  // --- Behavior tab ---

  private behaviorInfo: HTMLElement | null = null;

  private buildBehaviorTab() {
    const c = this.tabContent!;

    const hint = this.el('div', 'padding:6px 10px; border-bottom:1px solid #333; line-height:1.6;');
    hint.innerHTML = [
      '<span style="color:#00ff88">Click</span> select anchor',
      '<span style="color:#00ff88">Drag</span> reposition',
      '<span style="color:#00ff88">T</span> cycle type',
      '<span style="color:#00ff88">Del</span> remove anchor',
      '<span style="color:#00ff88">S</span> save',
    ].join('<br>');
    c.appendChild(hint);

    // Anchor legend
    const legend = this.el('div', 'padding:4px 10px; border-bottom:1px solid #333; font-size:10px; line-height:1.6;');
    legend.innerHTML = Object.entries(ANCHOR_COLORS).map(([type, color]) =>
      `<span style="color:${color}">\u25CF</span> ${type}`
    ).join('&nbsp;&nbsp;');
    c.appendChild(legend);

    // Selected anchor info
    this.behaviorInfo = this.el('div', 'padding:6px 10px; min-height:40px; color:#888;');
    this.behaviorInfo.innerHTML = '<span style="color:#555">Click an anchor</span>';
    c.appendChild(this.behaviorInfo);

    // Anchor list (grouped by piece)
    const list = this.el('div', 'padding:4px 8px; overflow-y:auto; flex:1;');
    for (const p of this.furniture.pieces) {
      if (p.anchors.length === 0) continue;
      const group = this.el('div', 'margin-bottom:6px;');
      const header = this.el('div', 'color:#555; font-size:9px; padding:2px 0;');
      header.textContent = `${p.id} (${p.x.toFixed(1)}, ${p.y.toFixed(1)})`;
      group.appendChild(header);
      for (let i = 0; i < p.anchors.length; i++) {
        const a = p.anchors[i];
        const row = this.el('div', `
          padding:2px 4px; cursor:pointer; border-radius:2px;
          border:1px solid ${(p === this.selAnchorPiece && i === this.selAnchorIdx) ? '#fff' : 'transparent'};
        `);
        row.innerHTML = `<span style="color:${ANCHOR_COLORS[a.type]}">\u25CF</span> ${a.name} <span style="color:#555">(${a.type})</span>`;
        const pi = this.furniture.pieces.indexOf(p);
        row.addEventListener('click', () => {
          this.selAnchorPiece = this.furniture.pieces[pi];
          this.selAnchorIdx = i;
          this.buildTabContent();
        });
        group.appendChild(row);
      }
      list.appendChild(group);
    }
    c.appendChild(list);
  }

  private refreshBehaviorTab() {
    if (!this.behaviorInfo) return;
    if (!this.selAnchorPiece || this.selAnchorIdx < 0) {
      this.behaviorInfo.innerHTML = '<span style="color:#555">Click an anchor</span>';
      return;
    }
    const a = this.selAnchorPiece.anchors[this.selAnchorIdx];
    if (!a) return;
    this.behaviorInfo.innerHTML = [
      `<span style="color:${ANCHOR_COLORS[a.type]}">\u25CF</span> <span style="color:#fff">${a.name}</span>`,
      `type: <span style="color:${ANCHOR_COLORS[a.type]}">${a.type}</span>`,
      `offset: ${a.ox.toFixed(2)}, ${a.oy.toFixed(2)}`,
      `world: ${(this.selAnchorPiece.x + a.ox).toFixed(1)}, ${(this.selAnchorPiece.y + a.oy).toFixed(1)}`,
    ].join('<br>');
  }

  // --- Input ---

  private toWorld(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / this.scale,
      y: (e.clientY - rect.top) / this.scale,
    };
  }

  private onMouseDown(e: MouseEvent) {
    const { x, y } = this.toWorld(e);

    if (this.tab === 'furniture') {
      if (this.furniture.handleMouseDown(x, y)) e.preventDefault();
    } else if (this.tab === 'characters') {
      this.pickResident(x, y);
    } else if (this.tab === 'behavior') {
      this.pickAnchor(x, y);
      e.preventDefault();
    }
  }

  private onMouseMove(e: MouseEvent) {
    const { x, y } = this.toWorld(e);

    if (this.tab === 'furniture') {
      this.furniture.handleMouseMove(x, y);
      e.preventDefault();
    } else if (this.tab === 'behavior' && this.draggingAnchor && this.selAnchorPiece) {
      const T = this.tileSize;
      const a = this.selAnchorPiece.anchors[this.selAnchorIdx];
      if (a) {
        a.ox = Math.round((x / T - this.selAnchorPiece.x) * 4) / 4;
        a.oy = Math.round((y / T - this.selAnchorPiece.y) * 4) / 4;
      }
      e.preventDefault();
    }
  }

  private onMouseUp(_e: MouseEvent) {
    if (this.tab === 'furniture') this.furniture.handleMouseUp();
    this.draggingAnchor = false;
  }

  private pickResident(wx: number, wy: number) {
    const T = this.tileSize;
    for (const r of this.mv.getResidents()) {
      if (!r.visible) continue;
      const dx = wx - (r.x + T / 2);
      const dy = wy - (r.y + T / 2);
      if (dx * dx + dy * dy < T * T) {
        this.selectedResidentId = r.agentId;
        this.charsBuiltFor = null;
        this.rebuildCharsList();
        return;
      }
    }
    this.selectedResidentId = null;
    this.charsBuiltFor = null;
    this.rebuildCharsList();
  }

  private pickAnchor(wx: number, wy: number) {
    const T = this.tileSize;
    const hitR = 8;
    for (const p of this.furniture.pieces) {
      for (let i = 0; i < p.anchors.length; i++) {
        const a = p.anchors[i];
        const ax = (p.x + a.ox) * T + T / 2;
        const ay = (p.y + a.oy) * T + T / 2;
        const dx = wx - ax, dy = wy - ay;
        if (dx * dx + dy * dy < hitR * hitR) {
          this.selAnchorPiece = p;
          this.selAnchorIdx = i;
          this.draggingAnchor = true;
          return;
        }
      }
    }
    this.selAnchorPiece = null;
    this.selAnchorIdx = -1;
  }

  private onKeyDown(e: KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;

    // E toggles editor
    if (e.key === 'e' || e.key === 'E') {
      this.active = !this.active;
      if (this.active) {
        this.buildPanel();
        this.panel!.style.display = 'flex';
        this.canvas.addEventListener('mousedown', this.onMouseDown);
        this.canvas.addEventListener('mousemove', this.onMouseMove);
        this.canvas.addEventListener('mouseup', this.onMouseUp);
      } else {
        if (this.panel) this.panel.style.display = 'none';
        this.canvas.removeEventListener('mousedown', this.onMouseDown);
        this.canvas.removeEventListener('mousemove', this.onMouseMove);
        this.canvas.removeEventListener('mouseup', this.onMouseUp);
        this.furniture.selected = null;
        this.selAnchorPiece = null;
        this.selectedResidentId = null;
      }
      return;
    }

    if (!this.active) return;

    // Global save — works on any tab
    if (e.key === 's' || e.key === 'S') {
      this.furniture.save();
      this.saveScene();
      return;
    }

    // Tab-specific keys
    if (this.tab === 'furniture') {
      this.furniture.handleKey(e);
    } else if (this.tab === 'behavior') {
      this.handleBehaviorKey(e);
    }
  }

  private handleBehaviorKey(e: KeyboardEvent) {
    if (!this.selAnchorPiece || this.selAnchorIdx < 0) return;
    const a = this.selAnchorPiece.anchors[this.selAnchorIdx];
    if (!a) return;

    if (e.key === 't' || e.key === 'T') {
      const idx = ANCHOR_TYPES.indexOf(a.type);
      a.type = ANCHOR_TYPES[(idx + 1) % ANCHOR_TYPES.length];
      this.buildTabContent();
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      this.selAnchorPiece.anchors.splice(this.selAnchorIdx, 1);
      this.selAnchorPiece = null;
      this.selAnchorIdx = -1;
      this.buildTabContent();
    }

    if (e.key.startsWith('Arrow')) {
      const step = e.shiftKey ? 1 : 0.25;
      if (e.key === 'ArrowLeft') a.ox -= step;
      if (e.key === 'ArrowRight') a.ox += step;
      if (e.key === 'ArrowUp') a.oy -= step;
      if (e.key === 'ArrowDown') a.oy += step;
      e.preventDefault();
    }
  }

  // --- Scene persistence ---

  private saveCharacterAssignments() {
    // No-op locally — full scene save handles it
  }

  async saveScene() {
    const characters: Record<string, string> = {};
    for (const r of this.mv.getResidents()) {
      characters[r.agentId] = r.getHomePosition();
    }
    const scene = {
      furniture: this.furniture.getLayout(),
      characters,
      wanderPoints: this.furniture.wanderPoints,
    };
    try {
      const res = await fetch('/api/save-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(scene),
      });
      if (res.ok) {
        console.log('[editor] Scene saved to scene.json');
      } else {
        console.error('[editor] Save failed:', await res.text());
      }
    } catch (e) {
      console.error('[editor] Save failed (is dev server running?):', e);
    }
  }

  /** Apply saved character assignments from scene data */
  loadCharacterAssignments(assignments?: Record<string, string>) {
    if (!assignments) return;
    for (const r of this.mv.getResidents()) {
      if (assignments[r.agentId]) {
        r.setHomePosition(assignments[r.agentId]);
      }
    }
  }

  // --- Helpers ---

  private el(tag: string, style: string): HTMLElement {
    const el = document.createElement(tag);
    el.style.cssText = style;
    return el;
  }

  destroy() {
    window.removeEventListener('keydown', this.onKeyDown);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    if (this.wrapper) {
      const container = this.canvas.parentElement!;
      this.wrapper.parentElement!.insertBefore(container, this.wrapper);
      this.wrapper.remove();
    }
  }
}
