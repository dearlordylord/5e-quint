# Cleanroom Bootstrap Query

Use this query only after the owner has copied or rendered the cleanroom
package into the target repo:

- `AGENTS.md`
- `README.md`
- `BOOTSTRAP_QUERY.md`
- `target-profile.json`
- `tasks/**`
- `cleanroom-input/**`

The cleanroom session should have this target repo as its only working root. Do
not give it access to the dnd source repo, sibling repos, prior cleanroom
attempts, or external D&D rules sources.

```text
You are working in this cleanroom repo only. Do not read sibling repos, the dnd
source repo, prior cleanroom attempts, or external D&D rules sources.

Read AGENTS.md and tasks/WORK_LOOP.md, then keep implementing queued in-scope
branch sets from the selected tasks/ACTIVE_WORK.json assignment following the
Work Loop.

Use assignmentId `{{defaultAssignmentId}}` from tasks/ACTIVE_WORK.json unless I
explicitly name a different assignmentId.

Use only cleanroom-input/**, tasks/**, target-profile.json, README.md,
AGENTS.md, and target documentation allowed by AGENTS.md.

Before implementation, record the current `git rev-parse HEAD` and clean
`git status --short` result in tasks/START_GATE.json.

If the allowed corpus is insufficient, record the blocker exactly as instructed
instead of guessing or asking for source-repo context.

After each completed or blocked branch set, return to the Work Loop selection
step and continue with the next eligible queued branch set. Stop only when the
selected assignment has no eligible incomplete branch sets left, a repo-level
blocker prevents further selection, target verification cannot be made green,
or I explicitly stop you.
```
