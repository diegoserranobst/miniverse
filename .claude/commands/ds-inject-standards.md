# Inject Standards

Inject relevant standards into the current context, formatted appropriately for the situation.

## Usage Modes

### Auto-Suggest Mode (no arguments)
```
/inject-standards
```
Analyzes context via RAG + index and suggests relevant standards.

### Explicit Mode (with arguments)
```
/inject-standards api                           # All standards in api/
/inject-standards api/response-format           # Single file
/inject-standards api/response-format api/auth  # Multiple files
/inject-standards root                          # All standards in the root folder
/inject-standards root/naming                   # Single file from root folder
```
Directly injects specified standards without suggestions.

**Note:** `root` is a reserved keyword — it refers to `.md` files directly in `openspec/standards/` (not in a subfolder).

---

## Auto-Suggest Mode Process

### Step 1: Detect Context Scenario

Determine which scenario we're in:

1. **Conversation** — Regular chat, implementing code, answering questions
2. **Creating a Skill** — Building a `.claude/skills/` file
3. **Shaping/Planning** — In plan mode, building a spec

**Detection logic:**
- If in plan mode OR conversation mentions "spec", "plan", "shape" → **Shaping/Planning**
- If conversation mentions creating a skill, editing `.claude/skills/` → **Creating a Skill**
- Otherwise → **Conversation** (default for implementation work)

### Step 2: Extract Context Keywords

Build a keyword profile from the current conversation. Be thorough — check ALL of these sources:

1. **Active change** — If there's an OpenSpec change in context, read its artifacts (delta-spec, tasks, design) and extract: domain, technologies, file types, patterns mentioned
2. **Files discussed** — What files/modules has the user referenced? (e.g., `.service.ts` → backend, `.vue` → frontend, `template` → PDF)
3. **Technologies** — NestJS, Vue, Prisma, BullMQ, Kafka, Redis, PDF, XML, etc.
4. **Domain** — DTE, payments, domains, billing, auth, onexo, etc.
5. **Patterns** — CRUD, emission, templates, migrations, websockets, cron jobs, etc.

Produce a mental list of 5-15 keywords. Example for a DTE template change:
`[DTE, template, PDF, HTML, backend, XML, field propagation, logging]`

### Step 3: RAG Search

Run **2-3 `query_documents` calls** with different keyword combinations to maximize recall:

- Query 1: Domain-specific terms (e.g., `"DTE template PDF emisión"`)
- Query 2: Technical patterns (e.g., `"backend service logging NestJS"`)
- Query 3: Cross-cutting concerns if applicable (e.g., `"field propagation XML layers"`)

From results, collect any standard file paths that appear with score < 0.5.

### Step 4: Cross-Reference with Index

Read `openspec/standards/index.yml`. For EACH entry in the index, evaluate its `description` against the keyword profile from Step 2. Mark as relevant if:

- The description mentions any of the extracted keywords
- The standard's category matches the domain (e.g., `dte/*` for DTE work, `frontend/*` for Vue work)
- The standard covers a pattern being used (e.g., `infrastructure/pdf-templates` for template work)

### Step 5: Include Mandatory Standards

These standards apply to ANY backend code change — always include them if the work touches backend:

- `api/logging-policy` — Required by CLAUDE.md rule #21
- `global/no-fallbacks` — Required by CLAUDE.md rule #5

For any code change (frontend or backend):
- `global/no-provisional-solutions` — Required by CLAUDE.md rule #8

### Step 6: Deduplicate and Classify

Merge results from RAG (Step 3) + Index scan (Step 4) + Mandatory (Step 5). Remove duplicates. Classify each match:

- **High relevance** — Directly related to the domain/task (e.g., `dte/xml-field-passthrough` for a DTE field change)
- **Medium relevance** — Related to the technology/pattern (e.g., `infrastructure/pdf-templates` for template work)
- **Mandatory** — Always-on standards (`logging-policy`, `no-fallbacks`, `no-provisional-solutions`)

### Step 7: Present ALL Matches for Confirmation

NEVER inject without confirming first. Present grouped by relevance:

```
Estándares relevantes para este trabajo:

**Directamente relacionados:**
1. dte/xml-field-passthrough — Checklist para propagar campos nuevos a través de las capas
2. infrastructure/pdf-templates — Naming y reglas de templates HTML para PDF

**Por tecnología/patrón:**
3. api/prisma-usage — Direct Prisma import, JSON field handling

**Obligatorios (backend):**
4. api/logging-policy — Logger obligatorio en toda clase backend
5. global/no-fallbacks — Fallar explícitamente, sin valores por defecto

¿Inyecto estos? (sí / solo 1,2,4,5 / agregar: otro/standard / ninguno)
```

Typical count: 3-8 standards. If more than 10 match, prioritize High + Mandatory and mention the rest are available.

### Step 8: Inject Based on Scenario

After user confirms, inject according to the detected scenario:

---

#### Scenario: Conversation

Read the confirmed standard files and present them:

```
Estándares inyectados:

--- Standard: dte/xml-field-passthrough ---

[full content of the standard file]

--- End Standard ---

--- Standard: infrastructure/pdf-templates ---

[full content of the standard file]

--- End Standard ---

**Puntos clave:**
- [2-4 bullet points summarizing the most important rules from ALL injected standards]
```

---

#### Scenario: Creating a Skill

Ask how to include:

```
¿Cómo incluir los estándares en el skill?

1. **Referencias** — Paths @ a los archivos (ligero, se mantiene actualizado)
2. **Contenido** — Pegar contenido completo (autocontenido, no se actualiza)

¿Cuál? (1 o 2)
```

**References (1):**
```
Incluir estas referencias en el skill:

@openspec/standards/dte/xml-field-passthrough.md
@openspec/standards/infrastructure/pdf-templates.md
```

**Content (2):** Same as Conversation format.

---

#### Scenario: Shaping/Planning

Same question as Creating a Skill, but framed for the plan:

```
¿Cómo incluir los estándares en el plan?

1. **Referencias** — Paths @ (ligero)
2. **Contenido** — Completo (autocontenido)
```

Same output formats.

---

### Step 9: Surface Related Skills (Conversation only)

Check `.claude/skills/` for skills related to the injected standards. Mention but don't invoke:

```
Skills relacionados:
- skill-name — descripción breve
```

---

## Explicit Mode

When arguments are provided, skip the suggestion/matching steps.

### Step 1: Detect Scenario
Same as auto-suggest.

### Step 2: Parse Arguments

- **Folder name** — `api` → all `.md` files in `openspec/standards/api/`
- **Folder/file** — `api/response-format` → `openspec/standards/api/response-format.md`
- **Root folder** — `root` → `.md` files directly in `openspec/standards/` (not subfolders)
- **Root file** — `root/naming` → `openspec/standards/naming.md`

Multiple arguments inject multiple standards.

### Step 3: Validate

Check files/folders exist. If not:
```
Estándar no encontrado: api/nonexistent

Disponibles en api/:
- response-format
- error-handling
- authentication

¿Quisiste decir alguno de estos?
```

### Step 4: Inject Based on Scenario
Same formatting as auto-suggest, based on scenario. No confirmation needed — explicit mode means the user knows what they want.

---

## Tips

- **Ejecutar temprano** — Inyectar estándares al inicio de una tarea, antes de implementar
- **Ser específico** — Si sabes qué estándares aplican, usar modo explícito
- **Revisar el índice** — Si las sugerencias parecen incorrectas, ejecutar `/ds-index-standards` para reconstruir

## Integration

This command is called internally by other skills/commands to inject relevant standards. Can also be invoked directly.
