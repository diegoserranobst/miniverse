# CLAUDE.md — Miniverse (Fork REDCUMBRE)

Fork personalizado de [MiniVRS](https://www.minivrs.com/) para visualizar agentes de Claude Code como ciudadanos pixel art.

**GitHub repo:** `diegoserranobst/miniverse`
**Upstream:** `ianscott313/miniverse`

## Siempre responder en español

## Estructura del proyecto

```
miniverse/                    # Monorepo (upstream + customizaciones)
├── packages/
│   ├── core/                 # @miniverse/core — renderer, sprites, pathfinding, ciudadanos
│   ├── server/               # @miniverse/server — API HTTP + WebSocket, agente store
│   └── generate/             # @miniverse/generate — generación de assets con fal.ai
├── my-miniverse/             # Proyecto personalizado REDCUMBRE
│   ├── src/
│   │   ├── main.ts           # Entry point — config del mundo, conexión WS, sonidos
│   │   └── sounds.ts         # Sistema de sonidos 8-bit (Web Audio API)
│   ├── public/worlds/
│   │   ├── redcumbre-nexus/  # Mundo cyberpunk personalizado (activo)
│   │   ├── ocean-lab/        # Mundo submarino (alternativo)
│   │   └── cozy-startup/     # Mundo original upstream
│   ├── index.html            # UI con título "REDCUMBRE OPERACIONES"
│   ├── generate-world.mjs    # Script para generar mundos completos con fal.ai
│   ├── generate-single.mjs   # Script para generar props individuales con fal.ai
│   ├── .env.development      # FAL_KEY (NO commitear)
│   └── package.json          # Dev server: vite:25051 + miniverse:25050
└── CLAUDE.md                 # Este archivo
```

## Puertos

| Puerto | Servicio | Entorno |
|--------|----------|---------|
| 25050  | Miniverse Server (API + WebSocket) | Local DEV |
| 25051  | Miniverse Frontend (Vite dev) | Local DEV |

Producción usa `miniverse.redcumbre.cl` con OpenResty reverse proxy.

## Desarrollo local

```bash
cd my-miniverse
npm run dev
# Abre http://localhost:25051
```

El servidor se levanta automáticamente via systemd user service (`miniverse.service`).

## Deploy a producción

```bash
npm run deploy
```

Ejecuta `scripts/deploy.sh` que:
1. Build del core y server
2. Build del frontend (vite build)
3. rsync al VPS (`vps-fireraise:/opt/miniverse/`)
4. Reinicia el servicio PM2 en el VPS

**VPS:** `ssh vps-fireraise`
**Dominio:** `miniverse.redcumbre.cl`
**Proceso:** PM2 (`pm2 restart miniverse`)

## Hooks de Claude Code

Los hooks se configuran en el proyecto que usa Claude Code (ej: rCAPI `.claude/settings.local.json`).
Todos los eventos envían POST a:

- **Local:** `http://localhost:25050/api/hooks/claude-code`
- **Producción:** `https://miniverse.redcumbre.cl/api/hooks/claude-code`

Eventos configurados: SessionStart, UserPromptSubmit, PreToolUse, PostToolUse, PostToolUseFailure, Stop, SubagentStart, SubagentStop, SessionEnd, TaskCompleted, TeammateIdle, StopFailure.

## Mundo activo: redcumbre-nexus

Mundo cyberpunk con 3 zonas separadas por barrera neon:

- **WORK** (arriba): 16 standing terminals con anchors `work`
- **REST** (abajo-izquierda): 2 sofás con anchors `rest` — para estado `sleeping`
- **SOCIAL** (abajo-derecha): globo + café con anchors `social` — para estado `speaking`

La barrera (row 6) usa tiles `wall_` que se renderizan pero no son caminables. Los agentes se teletransportan entre zonas al cambiar de estado.

## Generación de assets con fal.ai

```bash
# Mundo completo (~$5 USD)
cd my-miniverse
node generate-world.mjs redcumbre-nexus

# Prop individual (~$0.17 USD)
node generate-single.mjs "prompt del asset" output.png
```

La API key está en `.env.development` (NO commitear).

## Sonidos

8 sonidos + 4 extras generados con Web Audio API (cero archivos):
- arrive, leave, working, thinking, error, success, click, subagent
- sleeping, idle, collaborating, waiting

Toggle: tecla **M** o botón en UI. Preferencia persiste en localStorage.

## Actualizar desde upstream

```bash
git fetch upstream
git merge upstream/main
# Resolver conflictos en main.ts e index.html si los hay
npm run build  # Rebuild core
```

## VPS de producción — CUIDADO

El VPS (`ssh vps-fireraise`) es una máquina **compartida** que hospeda múltiples servicios en producción:

- **rCAPI** (api.redcumbre.cl, app.redcumbre.cl) — ERP/SaaS multi-tenant, el negocio principal
- **ValidaFirma** (validafirma.cl) — servicio de firma electrónica
- **Cooperadores** (cooperadores.cl, bots, admin) — plataforma de cooperativas
- **ONEXO** (onexo.cl) — contratos digitales
- **Monitoring** (grafana, loki, clickhouse) — observabilidad

**OpenResty** es el reverse proxy central que maneja TODOS estos dominios. La config está en:
- `/usr/local/openresty/nginx/conf/nginx.conf` — config principal
- `/usr/local/openresty/nginx/conf/sites-enabled/` — un archivo por dominio
- `/usr/local/openresty/nginx/conf/sites-available/` — configs disponibles (symlinked)

**SSL** se maneja con Let's Encrypt (certbot) + lua-resty-auto-ssl para dominios dinámicos.

**PM2** gestiona los procesos Node.js: rcapi-api, validafirma (varias instancias), miniverse.

**Docker Compose** corre la infraestructura: PostgreSQL (25432), Redis (25379), Redpanda (25092), ClickHouse (25123).

### Reglas críticas del VPS

1. **NUNCA modificar** configs de OpenResty de otros dominios — solo tocar `miniverse.redcumbre.cl`
2. **NUNCA reiniciar** OpenResty sin `openresty -t` primero (test de config)
3. **NUNCA tocar** Docker containers, PM2 apps de otros servicios, ni puertos que no sean de miniverse
4. **NUNCA hacer** `rm -rf`, `systemctl stop`, `pm2 delete` de servicios que no sean miniverse
5. **Siempre preguntar** al usuario antes de ejecutar cualquier comando destructivo en el VPS
6. Los puertos 25050-25051 están reservados para miniverse. No usar otros puertos
7. Para el primer deploy, pedir confirmación al usuario antes de crear directorios o configurar OpenResty

## Reglas

1. **NUNCA modificar** archivos en `packages/` sin necesidad — son del upstream. Si hay bugs, documentar y hacer PR al upstream o workaround en `my-miniverse/`.
2. **NO commitear** `.env.development` ni API keys.
3. **Rebuild core** después de modificar `packages/core/`: `cd packages/core && npm run build`
4. **Rebuild server** después de modificar `packages/server/`: `cd packages/server && npm run build`
5. Después de rebuild, reiniciar: `systemctl --user restart miniverse`
