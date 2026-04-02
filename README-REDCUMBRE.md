# Miniverse — REDCUMBRE OPERACIONES

Fork personalizado de [MiniVRS](https://www.minivrs.com/) que visualiza los agentes de Claude Code como ciudadanos pixel art en un mundo cyberpunk.

## Setup rápido

```bash
cd my-miniverse
npm install
npm run dev
# http://localhost:25051
```

## Deploy a producción

```bash
npm run deploy
# Despliega en https://miniverse.redcumbre.cl
```

Requiere acceso SSH al VPS (`ssh vps-fireraise`) y OpenResty configurado.

## Conectar Claude Code

En el proyecto donde usas Claude Code, agregar hooks en `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PreToolUse": [{"hooks": [{"type": "http", "url": "https://miniverse.redcumbre.cl/api/hooks/claude-code"}]}],
    "PostToolUse": [{"hooks": [{"type": "http", "url": "https://miniverse.redcumbre.cl/api/hooks/claude-code"}]}],
    "Stop": [{"hooks": [{"type": "http", "url": "https://miniverse.redcumbre.cl/api/hooks/claude-code"}]}]
  }
}
```

Para todos los eventos soportados, ver [CLAUDE.md](CLAUDE.md).

## Personalización

- **Mundo activo:** `redcumbre-nexus` (cyberpunk, 3 zonas: work/rest/social)
- **Sonidos 8-bit:** toggle con tecla M
- **Generar assets:** `node my-miniverse/generate-single.mjs "prompt" output.png` (requiere FAL_KEY)

## Upstream

```bash
git fetch upstream
git merge upstream/main
```
