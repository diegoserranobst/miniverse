import { Miniverse } from 'miniverse';
import type { AgentState, AgentStatus, SceneConfig, SpriteSheetConfig } from 'miniverse';
import { generateTileset, generateCharacterSprite } from './generateAssets';

const STATES: AgentState[] = ['working', 'idle', 'thinking', 'sleeping', 'speaking', 'error', 'waiting'];
const TASKS = [
  'Reviewing PR #42',
  'Fixing auth bug',
  'Writing tests',
  'Code review',
  'Deploying v2.1',
  'Refactoring API',
  'Updating docs',
  null,
];

const agentStates: Record<string, { state: AgentState; task: string | null; energy: number }> = {
  morty: { state: 'working', task: 'Reviewing PR #42', energy: 0.8 },
  dexter: { state: 'idle', task: null, energy: 0.5 },
};

function mockAgentData(): AgentStatus[] {
  return Object.entries(agentStates).map(([id, data]) => ({
    id,
    name: id.charAt(0).toUpperCase() + id.slice(1),
    state: data.state,
    task: data.task,
    energy: data.energy,
  }));
}

// Build the scene config
function buildSceneConfig(): SceneConfig {
  const cols = 16;
  const rows = 12;

  const floor: number[][] = [];
  const walkable: boolean[][] = [];

  for (let r = 0; r < rows; r++) {
    floor[r] = [];
    walkable[r] = [];
    for (let c = 0; c < cols; c++) {
      if (r === 0 || r === rows - 1 || c === 0 || c === cols - 1) {
        floor[r][c] = 1;
        walkable[r][c] = false;
      } else {
        floor[r][c] = 0;
        walkable[r][c] = true;
      }
    }
  }

  // Desk areas (non-walkable furniture)
  for (const [dr, dc] of [[2, 2], [2, 3], [2, 7], [2, 8]]) {
    walkable[dr][dc] = false;
  }

  // Couch
  walkable[8][11] = false;
  walkable[8][12] = false;
  walkable[8][13] = false;

  return {
    name: 'main',
    tileWidth: 16,
    tileHeight: 16,
    layers: [floor],
    walkable,
    locations: {
      desk_1: { x: 3, y: 3, label: 'Desk 1' },
      desk_2: { x: 8, y: 3, label: 'Desk 2' },
      coffee_machine: { x: 13, y: 2, label: 'Coffee' },
      couch: { x: 12, y: 7, label: 'Couch' },
      whiteboard: { x: 8, y: 1, label: 'Board' },
      intercom: { x: 1, y: 1, label: 'Intercom' },
      center: { x: 7, y: 6, label: 'Center' },
      lounge: { x: 5, y: 8, label: 'Lounge' },
    },
    tilesets: [{
      image: 'tilesets/office.png',
      tileWidth: 16,
      tileHeight: 16,
      columns: 16,
    }],
  };
}

async function main() {
  const container = document.getElementById('miniverse-container')!;
  const tooltip = document.getElementById('tooltip')!;
  const statusBar = document.getElementById('status-bar')!;

  // Generate placeholder assets
  const tilesetUrl = await generateTileset();
  const mortySprite = await generateCharacterSprite('#f4c89e', '#8b4513', '#e94560');
  const dexterSprite = await generateCharacterSprite('#d4a574', '#2a2a3a', '#16213e');

  const sceneConfig = buildSceneConfig();

  // Override tileset URL to use generated blob
  sceneConfig.tilesets[0].image = tilesetUrl;

  const spriteSheets: Record<string, SpriteSheetConfig> = {
    morty: {
      sheets: { base: mortySprite },
      animations: {
        idle_down: { sheet: 'base', row: 0, frames: 2, speed: 0.5 },
        idle_up: { sheet: 'base', row: 1, frames: 2, speed: 0.5 },
        walk_down: { sheet: 'base', row: 0, frames: 4, speed: 0.15 },
        walk_up: { sheet: 'base', row: 1, frames: 4, speed: 0.15 },
        walk_left: { sheet: 'base', row: 2, frames: 4, speed: 0.15 },
        walk_right: { sheet: 'base', row: 3, frames: 4, speed: 0.15 },
        working: { sheet: 'base', row: 0, frames: 2, speed: 0.3 },
        sleeping: { sheet: 'base', row: 0, frames: 2, speed: 0.8 },
        talking: { sheet: 'base', row: 0, frames: 4, speed: 0.12 },
      },
      frameWidth: 16,
      frameHeight: 24,
    },
    dexter: {
      sheets: { base: dexterSprite },
      animations: {
        idle_down: { sheet: 'base', row: 0, frames: 2, speed: 0.5 },
        idle_up: { sheet: 'base', row: 1, frames: 2, speed: 0.5 },
        walk_down: { sheet: 'base', row: 0, frames: 4, speed: 0.15 },
        walk_up: { sheet: 'base', row: 1, frames: 4, speed: 0.15 },
        walk_left: { sheet: 'base', row: 2, frames: 4, speed: 0.15 },
        walk_right: { sheet: 'base', row: 3, frames: 4, speed: 0.15 },
        working: { sheet: 'base', row: 0, frames: 2, speed: 0.3 },
        sleeping: { sheet: 'base', row: 0, frames: 2, speed: 0.8 },
        talking: { sheet: 'base', row: 0, frames: 4, speed: 0.12 },
      },
      frameWidth: 16,
      frameHeight: 24,
    },
  };

  const mv = new Miniverse({
    container,
    world: 'pixel-office',
    scene: 'main',
    signal: {
      type: 'mock',
      mockData: mockAgentData,
      interval: 2000,
    },
    residents: [
      { agentId: 'morty', name: 'Morty', sprite: 'morty', position: 'desk_1' },
      { agentId: 'dexter', name: 'Dexter', sprite: 'dexter', position: 'desk_2' },
    ],
    scale: 3,
    width: 256,
    height: 192,
    sceneConfig,
    spriteSheets,
    objects: [
      { id: 'intercom', type: 'intercom', x: 18, y: 4, width: 8, height: 10 },
      { id: 'whiteboard', type: 'whiteboard', x: 120, y: 2, width: 30, height: 14 },
      { id: 'coffee', type: 'coffee_machine', x: 210, y: 20, width: 10, height: 14 },
      { id: 'monitor_morty', type: 'monitor', x: 36, y: 28, width: 12, height: 8 },
      { id: 'monitor_dexter', type: 'monitor', x: 116, y: 28, width: 12, height: 8 },
    ],
  });

  // Click handler for tooltip
  mv.on('resident:click', (data: unknown) => {
    const d = data as { name: string; state: string; task: string | null; energy: number };
    tooltip.style.display = 'block';
    tooltip.querySelector('.name')!.textContent = d.name;
    tooltip.querySelector('.state')!.textContent = `State: ${d.state}`;
    tooltip.querySelector('.task')!.textContent = d.task ? `Task: ${d.task}` : 'No active task';

    // Position near mouse, hide after 3s
    setTimeout(() => { tooltip.style.display = 'none'; }, 3000);
  });

  container.addEventListener('mousemove', (e) => {
    tooltip.style.left = e.clientX + 12 + 'px';
    tooltip.style.top = e.clientY + 12 + 'px';
  });

  // Update status bar
  setInterval(() => {
    statusBar.innerHTML = Object.entries(agentStates)
      .map(([id, data]) => {
        const name = id.charAt(0).toUpperCase() + id.slice(1);
        return `<div class="agent"><span class="status-dot ${data.state}"></span>${name}: ${data.state}</div>`;
      })
      .join('');
  }, 500);

  await mv.start();

  // Expose controls to window
  (window as unknown as Record<string, unknown>).triggerIntercom = () => {
    mv.triggerEvent('intercom', { message: 'Hey team, status update?' });
  };

  (window as unknown as Record<string, unknown>).cycleState = (agentId: string) => {
    const agent = agentStates[agentId];
    if (!agent) return;
    const currentIdx = STATES.indexOf(agent.state);
    agent.state = STATES[(currentIdx + 1) % STATES.length];
    agent.task = TASKS[Math.floor(Math.random() * TASKS.length)];
    agent.energy = Math.random();
  };
}

main().catch(console.error);
