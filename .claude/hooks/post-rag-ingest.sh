#!/bin/bash
# PostToolUse hook: remind to ingest files in openspec/specs/ or openspec/standards/
# Receives tool input as JSON on stdin

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

# Check if file is in openspec/specs/ or openspec/standards/
if echo "$FILE_PATH" | grep -qE 'openspec/(specs|standards)/'; then
  echo "{\"hookSpecificOutput\":{\"additionalContext\":\"⚠️ AUTO-INGEST: Acabas de modificar $FILE_PATH que está en openspec/specs/ o openspec/standards/. DEBES ejecutar ingest_file con este archivo AHORA.\"}}"
fi
