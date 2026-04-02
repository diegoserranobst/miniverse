# Harvest Standards

Automatically extract standards from the current conversation's findings, corrections, and decisions.

Unlike `/ds-discover-standards` (which explores the codebase), this command harvests knowledge from what happened during the session — bugs found, patterns corrected, design decisions made, conventions clarified.

## Important Guidelines

- **Fully autonomous analysis** — Do NOT ask the user what to document. Analyze the conversation and propose.
- **Show drafts as text** before asking for approval — the user must see the content to decide.
- **Use AskUserQuestion tool** only for approval/rejection, not for exploration.
- **Write concise standards** — Scannable by AI agents. Minimal words, max value.
- **Respect existing standards** — Read what exists before proposing. Prefer updating over creating duplicates.

## Process

### Step 1: Analyze the Conversation

Review the full conversation looking for:

1. **Corrections made** — Code that was wrong and why (the "why" is the standard)
2. **Non-obvious decisions** — Choices that could have gone differently, where context was needed
3. **Repeated patterns** — Something done multiple times that implies a convention
4. **Bugs caused by missing conventions** — If a bug happened because there was no documented rule
5. **Clarifications from the user** — "Actually we do it this way because..." moments
6. **Workarounds or gotchas discovered** — Things that wouldn't be obvious to a future agent

For each candidate, note:
- What the rule is
- Why it matters (what goes wrong without it)
- Category (api/, frontend/, global/, database/, etc.)

### Step 2: Check Existing Standards

1. Read `openspec/standards/index.yml` to get the full catalog
2. For each candidate from Step 1, check if a related standard already exists
3. If it exists, read the file to determine if it needs updating or if the finding is already covered
4. Classify each candidate as: **new standard**, **update to existing**, or **already covered** (skip)

### Step 3: Present Proposals

Output a summary as regular text:

```
## Estándares detectados en esta sesión

### Nuevos
1. **[category/name]** — [one-line description]
   Razón: [what happened in the session that revealed this]

2. **[category/name]** — [one-line description]
   Razón: [what happened]

### Actualizaciones
3. **[category/name]** (existente) — Agregar: [what to add]
   Razón: [what happened]

### Ya cubiertos (no action needed)
- [category/name] ya cubre [finding]
```

Then use AskUserQuestion:
"¿Procedo con todos, o quieres ajustar? (si / solo 1,3 / skip)"

Wait for user response before proceeding.

### Step 4: Create or Update Standards

For each approved proposal:

1. **Output the full draft as regular text** so the user can review it
2. Use AskUserQuestion: "¿Creo/actualizo este archivo? (si / editar: [cambios] / skip)"
3. On approval: create or update the file in `openspec/standards/[category]/`
4. Move to the next proposal

Standard file format:
```markdown
# [Standard Name]

[Rule statement — what to do or not do]

[Code example if applicable]

- [Key detail 1]
- [Key detail 2]
- [Common mistake to avoid]
```

### Step 5: Update Index & Ingest

After all files are created/updated:

1. Read `openspec/standards/index.yml`
2. Add/update entries for each new or modified standard (alphabetized by folder, then filename)
3. Write the updated index
4. **Ingest each created/modified file** using `ingest_file` tool with source name format `standards/{category}/{name}`
5. Output a final summary:

```
## Resumen

Creados:
- openspec/standards/category/name.md ✓ (ingestado)

Actualizados:
- openspec/standards/category/name.md ✓ (re-ingestado)

Skipped:
- [reason]
```

## What Makes a Good Harvested Standard

A session finding is worth documenting as a standard when:

- **It would bite another agent/developer** — The mistake is non-obvious
- **It's not in the code** — The code alone doesn't make the rule clear
- **It's repeatable** — The situation will come up again
- **It's not a one-off bug fix** — It represents a general principle

A session finding is NOT worth documenting when:

- The fix is self-evident from the code
- It's specific to one file/feature with no general lesson
- It's already documented in CLAUDE.md or an existing standard
- It's a temporary workaround, not a permanent convention

## Output Location

All standards: `openspec/standards/[category]/[standard].md`
Index file: `openspec/standards/index.yml`
