---
name: "ds-bug-close"
description: >
  Close a GitHub bug after fixing it — commit changes, comment on the issue with a
  summary, and close it. Use after completing a bug fix from /ds-req-to-change workflow,
  e.g. "ds-bug-close 12", "close bug #5".
category: Workflow
tags: [workflow, bugs, git, github]
---

Wrap up a bug fix: commit + push changes, comment on the GitHub issue with a summary
of what was done, and close the issue.

## Usage

```
/ds-bug-close <issue-number>
```

The issue number is **required**. If not provided, look for it in the conversation
context (from a prior `/ds-req-to-change` or `/ds-bug-plan` invocation). If still not found, ask the user.

## Workflow

### Step 1: Identify and Verify the Issue

Get the issue number from the argument or conversation context.

Verify the issue exists and is open:

```bash
gh issue view <ID> --json state,title,number,url
```

- If the issue is already **CLOSED**, inform the user and stop.
- If the command fails (not found, auth error), inform the user and stop.

### Step 2: Analyze Git Changes

Run via Bash:

```bash
git status
git diff
git diff --cached
git log --oneline -5
```

Identify:
- **Modified files** (staged and unstaged)
- **Untracked files** relevant to the fix (e.g., new openspec artifacts)
- Whether there are changes to commit at all

### Step 3: Proceed Directly (No Confirmation)

**Do NOT ask for confirmation.** Proceed immediately to commit, push, comment, and
close. Show a brief summary of what will be committed as you execute, but do not
pause or wait for user input.

### Step 4: Git Add, Commit, and Push

Stage the relevant files (only files related to the bug fix):

```bash
git add <file1> <file2> ...
```

Commit with a message that references the issue:

```bash
git commit -m "fix(<scope>): <description> (closes #<ID>)"
```

Where:
- `<scope>` is derived from the affected area (e.g., `dte`, `api`, `web`)
- `<description>` is a concise summary of the fix
- `closes #<ID>` links the commit to the GitHub issue

Then push:

```bash
git push
```

### Step 5: Comment and Close the Issue

Post a summary comment on the issue:

```bash
gh issue comment <ID> --body "$(cat <<'EOF'
## Fix aplicado

**Commit:** `<commit-hash>`

### Cambios realizados
- `<file>` — <brief description>
...

### Verificación
- <verification steps executed>
EOF
)"
```

Then close the issue:

```bash
gh issue close <ID>
```

### Step 6: Notify Public Issue (if applicable)

After closing the internal issue, check if the bug originated from a client report in the
public repo `diegoserranobst/rCapi-issues`.

**Detection:** Search the issue body for a pattern like:

```
Solicitud de cliente — issue público #<N>
```

or

```
Requerimiento de cliente — issue público #<N>
```

Extract `<N>` (the public issue number). If no match is found, skip this step entirely.

**If a public issue is found:**

1. Fetch the public issue to get the original author:

```bash
gh issue view <N> --repo diegoserranobst/rCapi-issues --json author,title --jq '{author: .author.login, title: .title}'
```

2. Post a closing comment on the public issue mentioning the original author.
   The comment must be **user-facing only** — NEVER expose file paths, service names,
   class names, internal architecture, or technical implementation details.

   Write a brief functional description of what was fixed/implemented, derived from the
   internal issue title and the changes made, but expressed in terms the client understands
   (e.g., "Se corrigió el cálculo de totales en el módulo de facturación" instead of
   "Fixed TotalsService.calculate() in apps/api/src/dte/...").

```bash
gh issue comment <N> --repo diegoserranobst/rCapi-issues --body "$(cat <<'EOF'
@<author> 👋

Tu solicitud ha sido resuelta.

**¿Qué se hizo?**
<brief functional description of the fix/feature — user-facing language only>

Este cambio entrará en funcionamiento con la próxima versión de la aplicación. Estate atento/a a las actualizaciones en pantalla.

¡Gracias por reportar!
EOF
)"
```

3. Close the public issue:

```bash
gh issue close <N> --repo diegoserranobst/rCapi-issues
```

4. Log the action to the user: `Issue público #<N> comentado y cerrado en rCapi-issues`

### Step 7: Confirm Completion

Show the user:

```
Bug #<ID> cerrado.
- Commit: <hash> pushed to <branch>
- Comentario publicado en el issue
- Issue cerrado: <url>
```

If a public issue was notified, also show:

```
- Notificación enviada a issue público #<N> (repo rCapi-issues)
```

## Guardrails

- **Do NOT** ask for confirmation — proceed directly with commit, push, comment, and close
- Do NOT close an already-closed issue
- If there are no git changes, warn the user but allow closing the issue anyway (the fix may have been committed earlier)
- Do NOT stage files unrelated to the bug fix (e.g., `.env`, credentials, unrelated WIP)
- The commit message MUST include `closes #<ID>` so GitHub auto-links the commit
- If push fails, do NOT proceed to comment/close — inform the user
- **Public issue comments:** NEVER expose internal details (file paths, service/class names, DB schemas, infrastructure, stack traces, credentials). Use user-facing functional language only
- The public issue notification (Step 6) is **best-effort** — if the `gh` command fails (e.g., permissions, issue not found), log the error but do NOT fail the overall workflow. The internal issue is already closed at this point
