/**
 * 8-bit Sound System for Miniverse
 * Genera sonidos retro con Web Audio API — cero dependencias externas.
 * Toggle con tecla M o botón en la UI.
 *
 * Archivo separado del core de miniverse para sobrevivir actualizaciones.
 */

type SoundName = 'arrive' | 'working' | 'thinking' | 'error' | 'success' | 'leave' | 'click' | 'subagent' | 'sleeping' | 'idle' | 'collaborating' | 'waiting';

let audioCtx: AudioContext | null = null;
let muted = localStorage.getItem('miniverse-muted') === 'true';

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.08) {
  if (muted) return;
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

function playSequence(notes: [number, number][], type: OscillatorType = 'square', volume = 0.08) {
  if (muted) return;
  const ctx = getCtx();
  let offset = 0;
  for (const [freq, dur] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + dur);
    offset += dur * 0.8;
  }
}

const sounds: Record<SoundName, () => void> = {
  arrive: () => playSequence([[440, 0.08], [554, 0.08], [659, 0.12]], 'square', 0.06),
  working: () => playTone(330, 0.06, 'square', 0.04),
  thinking: () => playSequence([[220, 0.05], [277, 0.05]], 'triangle', 0.05),
  error: () => playSequence([[200, 0.12], [150, 0.18]], 'sawtooth', 0.06),
  success: () => playSequence([[523, 0.06], [659, 0.06], [784, 0.1]], 'square', 0.05),
  leave: () => playSequence([[659, 0.08], [554, 0.08], [440, 0.12]], 'square', 0.05),
  click: () => playTone(880, 0.03, 'square', 0.04),
  subagent: () => playSequence([[392, 0.06], [523, 0.06], [659, 0.08]], 'triangle', 0.05),
  sleeping: () => playSequence([[330, 0.1], [262, 0.1], [196, 0.15]], 'sine', 0.04),
  idle: () => playTone(262, 0.08, 'sine', 0.03),
  collaborating: () => playSequence([[440, 0.05], [523, 0.05], [440, 0.05], [523, 0.08]], 'triangle', 0.04),
  waiting: () => playSequence([[294, 0.08], [294, 0.12]], 'sine', 0.03),
};

export function playSound(name: SoundName) {
  sounds[name]?.();
}

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): boolean {
  muted = !muted;
  localStorage.setItem('miniverse-muted', String(muted));
  return muted;
}

/**
 * Conecta sonidos a los cambios de estado de los agentes.
 * Llama a esta función pasando el WebSocket URL para interceptar mensajes.
 */
export function connectSounds(wsUrl: string) {
  const knownStates = new Map<string, string>();

  const connect = () => {
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'agents') {
          for (const agent of msg.agents ?? []) {
            const prev = knownStates.get(agent.agent);
            const curr = agent.state;
            if (prev === curr) continue;
            knownStates.set(agent.agent, curr);
            if (!prev) { playSound('arrive'); continue; }
            if (curr === 'offline') { playSound('leave'); continue; }
            if (curr === 'working') { playSound('working'); continue; }
            if (curr === 'thinking') { playSound('thinking'); continue; }
            if (curr === 'error') { playSound('error'); continue; }
            if (curr === 'speaking') { playSound('success'); continue; }
            if (curr === 'sleeping') { playSound('sleeping'); continue; }
            if (curr === 'idle') { playSound('idle'); continue; }
            if (curr === 'collaborating') { playSound('collaborating'); continue; }
            if (curr === 'waiting') { playSound('waiting'); continue; }
          }
        }
        if (msg.type === 'event' && msg.event) {
          const evType = msg.event.type;
          if (evType === 'subagent_start') playSound('subagent');
          if (evType === 'tool_error') playSound('error');
        }
      } catch { /* ignore parse errors */ }
    };
    ws.onclose = () => setTimeout(connect, 5000);
  };

  connect();
}

/**
 * Crea el botón de mute/unmute en la UI.
 */
export function createMuteButton(): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.id = 'sound-toggle';
  const update = () => {
    btn.textContent = muted ? '🔇 Sound OFF' : '🔊 Sound ON';
    btn.title = 'Toggle sounds (M)';
  };
  update();
  Object.assign(btn.style, {
    background: 'transparent',
    border: '1px solid #444',
    color: '#888',
    padding: '3px 10px',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '10px',
    fontFamily: "'Courier New', monospace",
  });
  btn.addEventListener('click', () => { toggleMute(); update(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      toggleMute();
      update();
    }
  });
  return btn;
}
