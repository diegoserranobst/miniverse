#!/bin/bash
# PreToolUse hook: remind to inject standards before first code edit
# Uses a temp file flag to only remind ONCE per session

INPUT=$(cat)
TOOL_NAME="$TOOL_USE_TOOL_NAME"

# Only process Edit and Write tools
if [[ "$TOOL_NAME" != "Edit" && "$TOOL_NAME" != "Write" ]]; then
  exit 0
fi

# Extract file path from tool input
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# Only trigger for application code (apps/ or packages/), not openspec, .claude, docs, etc.
if ! echo "$FILE_PATH" | grep -qE '(apps|packages)/.*\.(ts|tsx|vue|js|jsx|hbs)$'; then
  exit 0
fi

# Use a temp flag file to only remind once per session
FLAG_FILE="/tmp/claude-standards-injected-$$"

# If CLAUDE_SESSION_ID is available, use it for a more stable flag
if [[ -n "$CLAUDE_SESSION_ID" ]]; then
  FLAG_FILE="/tmp/claude-standards-injected-${CLAUDE_SESSION_ID}"
fi

if [[ -f "$FLAG_FILE" ]]; then
  exit 0
fi

# Create the flag so we only remind once
touch "$FLAG_FILE"

echo "{\"hookSpecificOutput\":{\"additionalContext\":\"⚠️ ESTÁNDARES: Estás por editar código de aplicación ($FILE_PATH). ¿Ejecutaste /ds-inject-standards en esta sesión? Si no, hazlo ANTES de continuar implementando. Los estándares son la fuente de verdad — no copiar patrones de código existente sin validar.\"}}"