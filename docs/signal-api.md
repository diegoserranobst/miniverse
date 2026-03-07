# Signal API

The Signal connects Miniverse to your agent system.

## REST Polling

```typescript
const mv = new Miniverse({
  signal: {
    type: 'rest',
    url: 'http://localhost:8080/api/agents/status',
    interval: 3000, // ms
  },
  // ...
});
```

Your endpoint should return:

```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "Agent One",
      "state": "working",
      "task": "Processing data",
      "energy": 0.8,
      "metadata": {}
    }
  ]
}
```

## WebSocket

```typescript
const mv = new Miniverse({
  signal: {
    type: 'websocket',
    url: 'ws://localhost:8080/agents/ws',
  },
  // ...
});
```

The WebSocket should send the same JSON format as messages.

## Mock (for development)

```typescript
const mv = new Miniverse({
  signal: {
    type: 'mock',
    interval: 2000,
    mockData: () => [
      { id: 'agent-1', name: 'Agent', state: 'working', task: 'Demo', energy: 1 },
    ],
  },
  // ...
});
```

## Valid Agent States

`working` | `idle` | `thinking` | `error` | `waiting` | `collaborating` | `sleeping` | `listening` | `speaking` | `offline`
