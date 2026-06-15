# Cleanroom {{targetLabel}} Engine - Agent Rules

This repo is a cleanroom experiment. If a file is not in this repo, it is not
an allowed input. Do not read `/workspace/typescript/dnd`, any sibling
directory, or any prior cleanroom attempt.

## Goal

Implement a {{targetLabel}} character-creation and battle rules engine for D&D
SRD 5.2.1 character levels 1-2, derived exclusively from the copied
RAW/QNT/domain corpus in `cleanroom-input/`.

Target profile: `{{targetProfileId}}`. Target package/tooling:
{{packageManager}}. Target source extensions: {{sourceFileExtensionsMarkdown}}.

## Allowed Inputs

- `cleanroom-input/raw/**` — SRD 5.2.1 rules text.
- `cleanroom-input/qnt/**` — Quint specs, MBT driver specs, and rule-core
  slices. Treat `.qnt` files as formal rule statements. Treat `.mbt.qnt`
  files as conformance specifications to be exercised through
  {{quintBindingName}}.
- `cleanroom-input/branch-coverage/source-branch-inventory.json` — the source
  branch obligations each target task must satisfy.
- `cleanroom-input/guidance/**` — curated language-independent architecture
  guidance, including the boundary between reusable source harness improvements
  and target implementation polishing.
- `cleanroom-input/domain/UBIQUITOUS_LANGUAGE.md` — canonical terminology. Use
  these terms in code, tests, and reports.
- `cleanroom-input/domain/CLEANROOM_ASSUMPTIONS.md` — curated RAW-ambiguity
  decisions. Where it speaks, follow it.
- `cleanroom-input/MANIFEST.md` — the snapshot you are implementing against.
- Repo-local files: `tasks/**`, `{{enginePath}}/**`, this file, `README.md`.
- Target documentation allowed by the profile:
{{allowedTargetDocsMarkdown}}

## Forbidden Inputs

- Production TypeScript implementation code or tests, generated JS/TS bridge
  code, MBT traces, generated matrices.
- The source repo's plans, work logs, agent instructions, or any of its files
  not deliberately copied into `cleanroom-input/`.
- Previous cleanroom attempts.
- External D&D rules sources (books, wikis, forums, memory of them). If the
  copied corpus does not state a rule, it does not exist for this repo.

## Snapshot Declaration

`cleanroom-input/MANIFEST.md` records the source commit SHA of the corpus.
Every task report must state the manifest source commit SHA it implemented
against. Never edit files under `cleanroom-input/` — the corpus is refreshed
only by the source repo's sync script, which rewrites the manifest.

## Operating Rules

- Do not ask the project owner clarifying questions during a run.
- Treat this cleanroom implementation as a probe of the copied source-owned
  corpus, scaffold, and harness process. Improve target code only to complete
  the selected task. Record source QNT/corpus/process gaps as blockers; do not
  expand scope into polishing unrelated target implementation issues.
- Before implementation begins, write `tasks/START_GATE.json` with the Target
  Base SHA supplied in the owner-pasted bootstrap query, current `HEAD`, and the
  `git merge-base --is-ancestor <Base SHA> HEAD` result. Stop if the query did
  not provide a full 40-character Git SHA or if the ancestor check fails.
- If RAW, QNT, the Ubiquitous Language, the curated assumptions, source branch
  inventory, and guidance pack together are insufficient to implement a
  behavior, record a blocker in `tasks/BLOCKERS.md` and move on. Do not guess,
  and do not fill gaps from memory of D&D rules.
- Cite sources: tests and rule-bearing code comments reference the exact corpus
  file (for example `cleanroom-input/raw/srd-5.2.1/Playing-the-Game.md`,
  heading or rule name) and/or the QNT module/definition they implement.
- When a task has an applicable `.mbt.qnt` branch obligation, the target
  implementation must be verified through {{quintBindingName}}. Focused
  target-language tests may supplement diagnosis, but must not replace target
  replay evidence.
- QNT/MBT action names, witness state names, trace ids, nondet pick names,
  projection hashes, and `mbt::actionTaken` are harness protocol. Keep them in
  adapter modules, harness tests, target replay evidence, and task artifacts;
  do not expose them as production rules-engine state or public domain APIs.
- The Quint CLI is allowed only when invoked by {{quintBindingName}} during
  target conformance tests. Do not manually generate, import, or commit MBT
  traces or generated matrices.
- If a source branch obligation is not replayable from QNT, record a source
  QNT blocker. If a target implementation cannot satisfy a replayable branch,
  record a target implementation blocker.

## Verification

All profile verification commands must pass. The target test command includes
any {{quintBindingName}} MBT/conformance tests in the target suite:

{{verificationCommandsMarkdown}}

Do not run source-repo commands. Use only the target-profile commands above.

## MBT Conventions

{{quintDriverGuidanceMarkdown}}

- Record harness-generated target replay evidence under
  `tasks/target-replay-evidence/`.
- Each replay evidence file must name `cleanroomManifestSourceCommitSha` from
  `cleanroom-input/MANIFEST.md`, `sourceBranchInventorySha256`, target profile
  id, and `targetProfileSha256` computed from canonical JSON with sorted keys.
  Each run must name the QNT file hash, driver path, branch family, branch
  action, observed `mbt::actionTaken`, sampled `mbt::nondetPicks` when present,
  trace id or seed, pass/fail result, and a state/projection check with a
  comparator id, expected and observed projection SHA-256 values, and checked
  target state fields.
- Diagnostic target-language tests are allowed, but a diagnostic row is not
  target replay evidence and cannot close branch coverage.

## Reporting

Every implementation task must update:

- tests for the behavior implemented;
- `tasks/START_GATE.json` — recorded Base SHA, `HEAD`, and ancestor check
  result for the task;
- `tasks/ENGINE_DEPTH_MANIFEST.json` — production modules extended, domain APIs
  introduced or reused, adapter modules touched, quarantined witness names,
  accumulator growth, and expected next reuse;
- `tasks/STATE_OWNER_MANIFEST.json` — every durable target field introduced or
  changed by the task, with owner and derivability;
- `tasks/target-replay-evidence/*.json` — harness-generated target replay
  evidence for every in-scope branch exercised by the task;
- `tasks/REVIEW_LOOP.json` and `tasks/DECIDER_DECISION.json` — reviewer-loop
  convergence and deterministic gate decision when a task is accepted;
- `tasks/VALIDATION_REPORT.md` — manifest source commit SHA, source branch
  inventory hash, allowed inputs used, behavior implemented, generated branch
  coverage table, verification results, seeds or relevant reproduction data for
  failures, and remaining gaps;
- `tasks/BLOCKERS.md` — only when an allowed input is insufficient or a target
  implementation blocker remains; classify each blocker as source QNT/corpus or
  target implementation.

## Work Loop

The corpus is the backlog: each in-scope branch obligation from
`cleanroom-input/branch-coverage/source-branch-inventory.json` is a unit of
conformance work. `tasks/LEVEL_1_2_SCOPE.md` records which drivers are in scope
for character levels 1-2, in dependency order.
`tasks/LEVEL_1_2_SCOPE.md` is source-owned; do not reorder it in the target
repo.

Each iteration:

1. Pick the next in-scope driver/branch set that is not yet conformant per
   `tasks/LEVEL_1_2_SCOPE.md`, source branch inventory, and
   `tasks/VALIDATION_REPORT.md`.
2. Implement it in `{{enginePath}}`, deriving the rule from the RAW/QNT/domain
   inputs and guidance pack.
3. Make every in-scope branch conform through {{quintBindingName}} under the
   target test command.
4. Record harness-generated target replay evidence and update the validation
   report, or record a blocker if the allowed corpus or target implementation
   cannot satisfy the branch.

Conventions — module layout, test style, citation style, driver style, and
target replay evidence style — are target-profile owned and recorded in
`tasks/VALIDATION_REPORT.md`; follow them unless an iteration explicitly
revises one.
