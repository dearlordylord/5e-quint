# Cleanroom Bootstrap Query

Use this query only after the owner has copied or rendered the cleanroom
package into the target repo:

- `AGENTS.md`
- `README.md`
- `BOOTSTRAP_QUERY.md`
- `target-profile.json`
- `tasks/**`
- `cleanroom-input/**`

Before pasting the query, replace `<TARGET_BASE_SHA>` with the 40-character
Git SHA that the cleanroom task branch must be based on. The completed pasted
query is authoritative for that SHA; this file may remain a reusable template.

The cleanroom session should have this target repo as its only working root. Do
not give it access to the dnd source repo, sibling repos, prior cleanroom
attempts, or external D&D rules sources.

```text
You are working in this cleanroom repo only. Do not read sibling repos, the dnd
source repo, prior cleanroom attempts, or external D&D rules sources.

Target Base SHA for this run: <TARGET_BASE_SHA>

Read AGENTS.md and tasks/WORK_LOOP.md, then implement the next in-scope branch
set from tasks/LEVEL_1_2_SCOPE.md following the Work Loop.

Use only cleanroom-input/**, tasks/**, target-profile.json, README.md,
AGENTS.md, and target documentation allowed by AGENTS.md.

Use the Target Base SHA above as the declared Base SHA in tasks/START_GATE.json.
If it was not replaced with a full 40-character Git SHA, stop before
implementation and record a bootstrap blocker in tasks/BLOCKERS.md.

If the allowed corpus is insufficient, record the blocker exactly as instructed
instead of guessing or asking for source-repo context.
```
