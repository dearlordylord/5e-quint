# Frontier Decision Artifacts

This directory holds task-local decision artifacts for the level-support
frontier now summarized by `plans/LEVEL1_2_FULL_SUPPORT_BACKLOG.md` and the
generated reports in `plans/unit-profile-coverage/`.

Use these artifacts for `AT-L1X-*` no-matrix spell expansion decisions and
`AT-L1Y-*` non-executable class/profile expansion decisions. Each artifact
records the local source review, current generated coverage state, owner
classification, promotion-gate result, and any follow-up implementation work.

Decision artifacts are research outputs. They do not, by themselves, change Unit
claims, support profiles, evidence, runtime behavior, generated coverage files,
or the strict level-1 denominator. If a decision requires those changes, record
the follow-up task explicitly and let that task edit the owning files.

## Naming

- `AT-L1X-*` artifacts use the candidate Unit id:
  `plans/unit-profile-coverage/frontier-decisions/<unit-id>.md`.
- `AT-L1Y-*` artifacts use the row-family id:
  `plans/unit-profile-coverage/frontier-decisions/<row-family>.md`.

Use lowercase kebab-case or existing Unit ids exactly as they appear in
`plans/unit-profile-coverage/srd-unit-inventory.json` and
`plans/unit-profile-coverage/unit-matrix.json`.

## Required Headings

Each decision artifact must contain these top-level headings, in this order:

1. `RAW Sources`
2. `Current Generated State`
3. `Owner Classification`
4. `Decision`
5. `Promotion Gate`
6. `Follow-Up Tasks`
7. `Verification`

## Artifact Template

```markdown
# <Unit Or Row Family> Frontier Decision

## RAW Sources

- `<local SRD path>`: <specific passage, heading, or line range checked>.
- `UBIQUITOUS_LANGUAGE.md`: <terms checked, if any>.

## Current Generated State

- Inventory row family or Unit id: `<id>`.
- Source files checked:
  - `plans/unit-profile-coverage/srd-unit-inventory.json`
  - `plans/unit-profile-coverage/unit-matrix.json` when a matrix row exists
  - relevant owner-evidence files when the row is already owner-evidenced
- Current states:
  - `surface.state`: `<state or not applicable>`
  - `authoredContent.state`: `<state or not applicable>`
  - `catalogAdmission.state`: `<state or not applicable>`
  - `finalDisposition`: `<state or not applicable>`
  - `battleReadinessStatus`: `<state or not applicable>`
  - row count: `<count or not applicable>`

## Owner Classification

- `packageOwner`: `<package name or null>`.
- `closureKind`: `<closure kind>`.
- Owner notes: <why that package owns it, or why no current package owns it>.

## Decision

State one decision:

- author/admit a real Unit before support claims;
- create or extend a support profile;
- keep owner-evidence-only closure;
- classify as runtime-detached table adjudication;
- keep catalog-only/no-runtime-profile;
- require a durable owner decision before implementation.

Do not mix these decisions in one sentence if they apply to different rule
parts. Split by rule part so each part has one owner and one closure path.

## Promotion Gate

Name the executable boundary that justifies promotion, or state that no
promotion is justified.

Valid promotion boundaries are:

- runtime API;
- parser or authored-content admission path;
- support gate;
- hole/fill or action-resolution boundary;
- finalization behavior;
- `CharacterBuild` projection;
- owner evidence that already represents the source fact without duplicating it.

If no boundary exists, say so and do not propose Unit claims, support profiles,
or evidence changes.

## Follow-Up Tasks

- <task id or proposed task>: <specific owning files and expected output>.

Use `none` when the decision closes without implementation.

## Verification

- RAW/source files read: <checked paths>.
- Coverage verification: `pnpm unit-profile-coverage:check` when coverage files
  changed, or `not run` with the reason.
- MBT: `not run` unless a later implementation task changes promoted runtime
  behavior.
```

## Decision Vocabulary

For `AT-L1X-*` no-matrix spell expansion artifacts, use the owner fields from
the umbrella plan:

- `packageOwner`: an existing package owner such as `@dnd/battle-runtime`,
  `@dnd/character-sheet-runtime`, `@dnd/character-creation-runtime`, or `null`.
- `closureKind`: `table-supplied-runtime-witness`,
  `runtime-detached-table-adjudication`, `catalog-only/no-runtime-profile`, or
  `owner-decision-required`.

For `AT-L1Y-*` non-executable class/profile artifacts, use one of these decision
outcomes:

- `profile`: the task found a concrete executable boundary that is not already
  represented by owner evidence.
- `owner-evidence-only`: existing owner evidence is the canonical source of the
  represented fact, and a profile would duplicate derived state.
- `runtime-detached-table-adjudication`: the row is closed because execution is
  table adjudication, not runtime support.

Do not introduce support-status labels that have no checker, type, or runtime
consequence. If a future decision needs a new vocabulary term, update this
README and the checker-owned unit-profile coverage artifacts in the
integration-owned task that adopts the term.

## Scope Guardrails

- Read the cited local SRD text under `.references/srd-5.2.1/` and check
  `UBIQUITOUS_LANGUAGE.md` before making a rule or owner decision.
- Keep SRD provenance, structured generated state, and runtime projection
  separate. Do not cite 5e-tools as provenance.
- Do not add Unit claims, profiles, evidence, runtime code, or generated
  coverage artifact edits from a pure decision artifact.
- Do not update the umbrella frontier plan summary from individual `AT-L1X-*`
  or `AT-L1Y-*` worktrees. Record required plan changes under `Follow-Up Tasks`
  or in the final Plan Impact section for the integration owner.
- Do not store facts beside source facts when they can be derived from
  `srd-unit-inventory.json`, `unit-matrix.json`, or owner-evidence files.
