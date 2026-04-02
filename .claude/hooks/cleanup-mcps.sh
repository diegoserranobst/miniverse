#!/bin/bash
# Cleanup de procesos MCP huérfanos al terminar sesión de Claude Code.
# Bug conocido: anthropics/claude-code#1935
# Los MCPs spawneados por Claude Code no se limpian al cerrar sesión.

# Matar procesos MCP cuyo padre ya es init/systemd (PPID=1 = huérfanos)
ORPHANS=$(ps -eo pid,ppid,args | awk '$2==1 && /mcp-local-rag|postgres-mcp/ && !/awk/' | awk '{print $1}')

if [ -n "$ORPHANS" ]; then
  echo "$ORPHANS" | xargs -r kill -TERM 2>/dev/null
  logger -t claude-cleanup "Killed orphan MCP processes: $(echo $ORPHANS | tr '\n' ' ')"
fi

exit 0