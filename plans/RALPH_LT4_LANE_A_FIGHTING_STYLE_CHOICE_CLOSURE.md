# Ralph LT4 Lane A: Fighting Style Choice Closure

<!-- ralph-task-index
{
  "schema": "ralph-plan.v1",
  "tasks": [
    {
      "number": 1,
      "id": "LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR",
      "status": "done",
      "title": "Admit all SRD Fighting Style feat targets"
    },
    {
      "number": 2,
      "id": "LT4-A02-FIGHTER-FIGHTING-STYLE-ALL-TARGETS",
      "status": "done",
      "title": "Prove Fighter level-1 Fighting Style can select every SRD target"
    },
    {
      "number": 3,
      "id": "LT4-A03-PALADIN-RANGER-FIGHTING-STYLE-ALL-TARGETS",
      "status": "ready-for-research",
      "title": "Prove Paladin and Ranger level-2 Fighting Style can select every SRD target"
    }
  ]
}
-->

## Lane Scope

This lane closes the generated level <4 blockers for
`feat_great_weapon_fighting` and `feat_two_weapon_fighting`.

The old system counted the feature containers
`fighter_fighting_style`, `paladin_fighting_style`, and
`ranger_fighting_style` without requiring the full SRD Fighting Style feat
target set. This lane makes the target set explicit and executable at character
creation.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL_LT4_CHOICE_CLOSURE.md`
- `plans/unit-profile-coverage/level-lt4-choice-closure.json`
- `packages/character-creation-runtime/src/phase1-manifest.ts`
- `packages/character-creation-runtime/src/support-gates.ts`
- `packages/character-creation-runtime/src/index.test.ts`
- `packages/character-creation-runtime/src/fighter-fighting-style-selected-identity.mbt.test.ts`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `.references/srd-5.2.1/Feats.md`
- `.references/srd-5.2.1/Classes/Fighter.md`
- `.references/srd-5.2.1/Classes/Paladin.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `UBIQUITOUS_LANGUAGE.md`

## Lane Rules

- Run the Ralph task-base check before research or implementation.
- The SRD Fighting Style target set is:
  `feat_archery`, `defense`, `feat_great_weapon_fighting`,
  `feat_two_weapon_fighting`.
- Do not dispatch runtime behavior on the selected feat's authored identity.
  Character creation should retain the selected Unit identity; battle runtime
  consumes typed support profiles already installed for the selected Unit.
- Do not duplicate Fighting Style target lists in tests and runtime if a shared
  constant can be exported safely.

## Task DAG

| Task | Depends on | Dependency reason |
| --- | --- | --- |
| LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR | LT4-CHOICE-CLOSURE-PREWORK | Widen the supported character-creation target set first. |
| LT4-A02-FIGHTER-FIGHTING-STYLE-ALL-TARGETS | LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR | Fighter level-1 tests consume the widened target set. |
| LT4-A03-PALADIN-RANGER-FIGHTING-STYLE-ALL-TARGETS | LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR | Paladin/Ranger level-2 tests consume the widened target set. |

## Shared Verification

- RAW and ubiquitous-language check against the local SRD feat and class
  anchors plus `UBIQUITOUS_LANGUAGE.md`.
- Reviewer-loop convergence: RAW traceability, ubiquitous-language/domain,
  architecture/connascence, and code-review passes until no reasonable findings
  remain.
- `pnpm --filter @dnd/character-creation-runtime exec vitest run src/index.test.ts src/fighter-fighting-style-selected-identity.mbt.test.ts`
- `pnpm --filter @dnd/character-creation-runtime typecheck`
- `pnpm level-lt4-choice-closure:check -- --write`
- `pnpm level-lt4-choice-closure:check`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

### Task 1 - LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR

Status: `done`

Depends on:

- LT4-CHOICE-CLOSURE-PREWORK

Units:

- `feat_archery`
- `defense`
- `feat_great_weapon_fighting`
- `feat_two_weapon_fighting`

SRD anchors:

- `.references/srd-5.2.1/Feats.md:89-113`
- `.references/srd-5.2.1/Classes/Fighter.md:56-60`
- `.references/srd-5.2.1/Classes/Paladin.md:90-94`
- `.references/srd-5.2.1/Classes/Ranger.md:96-100`

Current state:

- All four feat Units are cataloged.
- `SUPPORTED_FIGHTING_STYLE_OPTION_IDS` admits all four SRD Fighting Style
  feat Units.
- The generated level <4 choice closure report no longer marks GWF/TWF as
  `missing-character-creation-admission`.

Output:

- Make all four SRD Fighting Style feat Units character-creation selectable
  through the class-feature feat choice key.
- Keep the selected feat Unit as the execution boundary.

Acceptance:

- `pnpm level-lt4-choice-closure:check -- --write` moves
  `feat_great_weapon_fighting` and `feat_two_weapon_fighting` out of blockers.
- No battle reducer dispatches on Fighting Style authored identity.

Verification:

- Shared lane verification.

### Task 2 - LT4-A02-FIGHTER-FIGHTING-STYLE-ALL-TARGETS

Status: `done`

Depends on:

- LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR

Unit:

- `fighter_fighting_style`

SRD anchor:

- `.references/srd-5.2.1/Classes/Fighter.md:56-60`

Current state:

- Fighter level 1 discovery exposes all four SRD Fighting Style feat targets.
- Fighter Fighting Style selected-identity evidence covers finalization for all
  four targets and replacement into the same complete target set.

Output:

- Add focused Fighter level-1 discovery/finalization evidence for all four SRD
  Fighting Style feat targets.
- Preserve replacement evidence: replacing the selected Fighting Style on a
  later Fighter level should use the same complete target set.

Acceptance:

- Fighter level 1 exposes all four Fighting Style options.
- Finalized build retains the selected feat Unit identity.

Verification:

- Shared lane verification.

### Task 3 - LT4-A03-PALADIN-RANGER-FIGHTING-STYLE-ALL-TARGETS

Status: `ready-for-research`

Depends on:

- LT4-A01-FIGHTING-STYLE-OPTION-DENOMINATOR

Units:

- `paladin_fighting_style`
- `ranger_fighting_style`

SRD anchors:

- `.references/srd-5.2.1/Classes/Paladin.md:90-94`
- `.references/srd-5.2.1/Classes/Ranger.md:96-100`

Current state:

- Paladin/Ranger can choose the Fighting Style feat branch.
- The nested feat target set still only admits Defense and Archery.

Output:

- Add Paladin and Ranger level-2 evidence that the Fighting Style feat branch
  exposes all four SRD Fighting Style feat targets.
- Preserve Blessed Warrior and Druidic Warrior as separate branch options.

Acceptance:

- Paladin/Ranger level 2 expose all four Fighting Style feat options after the
  `fighting_style_feat` branch is selected.
- Branch choice identity and selected feat identity remain distinct facts.

Verification:

- Shared lane verification.
