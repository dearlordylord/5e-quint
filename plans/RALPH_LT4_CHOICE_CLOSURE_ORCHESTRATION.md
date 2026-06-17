# Ralph Level <4 Choice Closure Orchestration

Status: ready to launch after commit.

## Scope

This orchestration closes the level <4 SRD choice-target accounting hole that
let `fighter_fighting_style`, `paladin_fighting_style`, and
`ranger_fighting_style` count as covered while not forcing every legal SRD
Fighting Style feat into character-creation admission.

The pre-work gate is generated at:

- `plans/unit-profile-coverage/LEVEL_LT4_CHOICE_CLOSURE.md`
- `plans/unit-profile-coverage/level-lt4-choice-closure.json`

Current generated state:

- 19 RAW-backed level <4 choice targets.
- 19/19 cataloged.
- 16/19 character-creation selectable.
- 3 blockers: `feat_great_weapon_fighting`, `feat_two_weapon_fighting`,
  and `species_gnome`.

## Lane Shape

Run three implementation lanes in parallel, then run the final gate activation
task after all three lanes merge.

| Lane | Plan | Ralph tasks | Parallel? | Purpose |
| --- | --- | ---: | --- | --- |
| A | `plans/RALPH_LT4_LANE_A_FIGHTING_STYLE_CHOICE_CLOSURE.md` | 3 | yes | Make all SRD Fighting Style feat targets selectable where the Fighting Style feature grants them. |
| B | `plans/RALPH_LT4_LANE_B_SPECIES_ADMISSION_CLOSURE.md` | 4 | yes | Make the SRD Gnome species choice admissible by giving Gnomish Lineage a typed owner. |
| C | `plans/RALPH_LT4_LANE_C_ORIGIN_FEAT_CHOICE_CLOSURE.md` | 3 | yes | Keep Human Versatile and Origin feat spell/proficiency closures checker-visible. |
| Final | `plans/RALPH_LT4_FINAL_CHOICE_CLOSURE_GATE.md` | 1 | no | Flip the generated level <4 choice closure gate to strict after A-C land. |

Total expected Ralph tasks: 11.

## Launch Notes

- Each Ralph task must run the task-base check from `AGENTS.md`.
- Use local SRD 5.2.1 only.
- Do not add PHB+ identities.
- Keep authored identity selection separate from runtime support profiles.
- Prefer changing lower layers directly when the Surface or runtime model needs
  a better shape; do not add adapter state to preserve an old boundary.

## Verification

- RAW/ubiquitous-language check: every modeled rule must trace to
  `.references/srd-5.2.1/Feats.md`, `.references/srd-5.2.1/Character-Origins.md`,
  or the relevant class file, and terminology must match
  `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: after implementation, run RAW traceability,
  ubiquitous-language/domain, architecture/connascence, and code-review passes.
  Fix every reasonable finding, reject only with a concrete reason, and repeat
  until no reasonable findings remain.
- Non-strict pre-work check:
  `pnpm level-lt4-choice-closure:check`.
- Regenerate after lane merges:
  `pnpm level-lt4-choice-closure:check -- --write`.
- Strict final gate:
  `pnpm level-lt4-choice-closure:check -- --strict`.

