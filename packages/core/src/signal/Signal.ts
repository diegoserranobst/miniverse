import type { AgentState } from '../residents/Resident';

export interface AgentStatus {
  id: string;
  name: string;
  state: AgentState;
  task: string | null;
  energy: number;
  metadata?: Record<string, unknown>;
}

export interface SignalConfig {
  type: 'rest' | 'websocket' | 'mock';
  url?: string;
  interval?: number;
  mockData?: () => AgentStatus[];
}

export type SignalCallback = (agents: AgentStatus[]) => void;

export class Signal {
  private config: SignalConfig;
  private callbacks: SignalCallback[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private ws: WebSocket | null = null;

  constructor(config: SignalConfig) {
    this.config = config;
  }

  onUpdate(cb: SignalCallback) {
    this.callbacks.push(cb);
  }

  private emit(agents: AgentStatus[]) {
    for (const cb of this.callbacks) {
      cb(agents);
    }
  }

  start() {
    switch (this.config.type) {
      case 'rest':
        this.startPolling();
        break;
      case 'websocket':
        this.startWebSocket();
        break;
      case 'mock':
        this.startMock();
        break;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private async startPolling() {
    const url = this.config.url!;
    const interval = this.config.interval ?? 3000;

    const poll = async () => {
      try {
        const res = await fetch(url);
        const data = await res.json();
        this.emit(data.agents ?? []);
      } catch {
        // Silent fail on network errors
      }
    };

    await poll();
    this.intervalId = setInterval(poll, interval);
  }

  private startWebSocket() {
    const url = this.config.url!;
    this.ws = new WebSocket(url);

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        this.emit(data.agents ?? []);
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      // Reconnect after delay
      setTimeout(() => {
        if (this.ws) this.startWebSocket();
      }, 5000);
    };
  }

  private startMock() {
    if (!this.config.mockData) return;
    const interval = this.config.interval ?? 3000;

    this.emit(this.config.mockData());
    this.intervalId = setInterval(() => {
      this.emit(this.config.mockData!());
    }, interval);
  }
}
