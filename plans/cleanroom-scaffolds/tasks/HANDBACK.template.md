# Handback Contract

Use this file when the implementer hands work to a reviewer or decider.

## Required Artifact List

- `tasks/START_GATE.json`
- `tasks/ENGINE_DEPTH_MANIFEST.json`
- `tasks/STATE_OWNER_MANIFEST.json`
- `tasks/target-replay-evidence/*.json`
- `tasks/VALIDATION_REPORT.md`
- `tasks/BLOCKERS.md`
- changed files under `{{enginePath}}/**`

## Handback Summary Shape

```md
## <task id>

- Start HEAD: `<start HEAD SHA>`
- Current HEAD: `<current HEAD SHA>`
- Selected drivers:
  - `<cleanroom-input/qnt/.../*.mbt.qnt>`
- Production modules extended:
  - `<{{enginePath}}/...>`
- Adapter modules touched:
  - `<{{enginePath}}/...>`
- Target replay evidence:
  - `tasks/target-replay-evidence/<file>.json`
- Verification:
{{verificationChecklistMarkdown}}
- Blockers:
  - `_none_` or `<blocker id>`
```

The summary does not replace machine-readable manifests. If the summary and
manifests disagree, the manifests and deterministic checker win.
