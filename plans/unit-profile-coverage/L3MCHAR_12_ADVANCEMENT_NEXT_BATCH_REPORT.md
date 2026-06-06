# L3MCHAR-12 Advancement Next Batch Report

Date: 2026-06-06

Task: L3MCHAR-12-ADVANCEMENT-NEXT-BATCH-REPORT

## Decision

The next parallel split should keep row-level evidence reconciliation separate
from battle-runtime promotion work.

The generated SRD inventory still reports four named advancement rows as
`owner-evidence-required`, even though the Unit matrix already contains
supported-profile claims and evidence rows for the same Unit ids. Treat this as
a checker-visible reconciliation frontier, not as permission to close inventory
rows from catalog or profile admission alone.

Recommended next split:

| Task | Units | Owner Shape | Scope |
| --- | --- | --- | --- |
| `L3MCHAR-NB-01-JACK-OF-ALL-TRADES-ROW-EVIDENCE` | `bard_jack_of_all_trades` | Character Sheet Ability Check Proficiency Bonus projection | Connect the existing character-sheet owner evidence for the Bard level-2 row to the generated SRD inventory readiness path; do not add skill or Expertise state. |
| `L3MCHAR-NB-02-DISCIPLE-OF-LIFE-ROW-EVIDENCE` | `cleric_disciple_of_life` | Battle spell-slot Hit Point restoration modifier | Reconcile or complete the direct spell Hit Point restoration owner for the inventory row. If runtime behavior is not already present on the target branch, promote it with QNT and focused runtime/MBT evidence. |
| `L3MCHAR-NB-03-REMARKABLE-ATHLETE-ROW-EVIDENCE` | `fighter_remarkable_athlete` | Battle roll-mode projection plus critical-hit movement release | Reconcile or complete Initiative Advantage, Strength (Athletics) Advantage, and optional post-Critical-Hit half-Speed movement without Opportunity Attacks. Keep movement and Opportunity Attack facts in the existing battle owners. |
| `L3MCHAR-NB-04-STEADY-AIM-ROW-EVIDENCE` | `rogue_steady_aim` | Battle Bonus Action, movement history, next-attack Advantage, and Speed projection | Reconcile or complete Steady Aim as a Bonus Action gated by no prior Movement on the current turn, granting next-attack Advantage and Speed 0 until turn end. |

Do not bundle these four into one omnibus closure. The Bard row is character
sheet only. The three battle rows touch different reducers and QNT obligations,
and each should remain independently reviewable and independently MBT-scoped.

## Current Inventory State

Generated from `plans/unit-profile-coverage/srd-unit-inventory.json`:

- Character levels 1-3 battle readiness remains 600/607 (98.8%).
- Level-3 class/subclass battle readiness remains 48/51 (94.1%).
- Open named rows for this report:
  - `bard_jack_of_all_trades`: level-2, `owner-evidence-required`.
  - `cleric_disciple_of_life`: level-3, `owner-evidence-required`.
  - `fighter_remarkable_athlete`: level-3, `owner-evidence-required`.
  - `rogue_steady_aim`: level-3, `owner-evidence-required`.

Other visible level-2 diagnostic rows are not part of this next split:

- `druid_wild_shape` remains `partial-battle-runtime` with owner evidence
  present for the supported subset.
- `sorcerer_metamagic` remains a separate Metamagic owner-evidence frontier.

## Matrix Cross-Check

`plans/unit-profile-coverage/unit-matrix.json`,
`unit-claims.jsonl`, `unit-evidence.jsonl`, and
`plans/rules-kernel-coverage/profile-obligations.jsonl` already contain current
supported-profile evidence for the four named Unit ids:

| Unit | Profile | Current Evidence Signal |
| --- | --- | --- |
| `bard_jack_of_all_trades` | `character-sheet.ability-check-proficiency-bonus` | Character Sheet runtime tests and selected-identity replay evidence exist. |
| `cleric_disciple_of_life` | `unit-feature.spell-slot-healing-modifier` | Unit claim, deterministic admission/projection evidence, selected-identity MBT evidence, and rules-kernel obligation mapping exist. |
| `fighter_remarkable_athlete` | `unit-feature.remarkable-athlete` | Unit claim, deterministic admission/projection evidence, selected-identity MBT evidence for roll modes and critical movement, and rules-kernel obligation mapping exist. |
| `rogue_steady_aim` | `unit-feature.rogue-steady-aim` | Unit claim, deterministic admission/projection evidence, selected-identity MBT evidence, and rules-kernel obligation mapping exist. |

The next tasks should therefore begin by checking whether their target branch
needs implementation or only row-level checker reconciliation. In either case,
inventory closure must be executable through the generator; hand-editing
generated inventory output is not enough.

## RAW And Language Check

Local SRD 5.2.1 source checked:

- `.references/srd-5.2.1/Classes/Bard.md:99-103` for Jack of All Trades.
- `.references/srd-5.2.1/Classes/Cleric.md:313-316` for Disciple of Life.
- `.references/srd-5.2.1/Classes/Fighter.md:140-145` for Remarkable Athlete.
- `.references/srd-5.2.1/Classes/Rogue.md:89-92` for Steady Aim.

`UBIQUITOUS_LANGUAGE.md` checked for Ability Check, Proficiency Bonus,
Advantage, Attack Roll, Critical Hit, Initiative, Bonus Action, Opportunity
Attack, Speed, Movement, Spell Slot, Hit Points, and Character Sheet.

## Reviewer Loop

Round 1 findings:

- The task-context candidate list is still valid as an inventory planning
  frontier, but the current Unit matrix already has supported-profile evidence
  for the same ids. The report must preserve that distinction rather than
  restating stale "no owner exists" wording.
- Jack of All Trades should not enter battle MBT. It is a Character Sheet
  ability-check proficiency projection over existing skill, Expertise, class
  progression, and feature ownership facts.

Round 2 findings:

- Disciple of Life, Remarkable Athlete, and Steady Aim are separate battle
  frontiers because their coupled runtime facts differ: spell-slot healing
  amount, roll-mode plus critical movement, and Bonus Action/movement/Speed
  sequencing.
- No generated artifact should be hand-edited for closure. Future tasks must
  change the checker input or generator owner path so `pnpm
  unit-profile-coverage:check --write` produces the closed inventory rows.

## Verification For This Report

- `pnpm unit-profile-coverage:check`
- `git diff --check`

Battle MBT was not run. This task changes planning/report artifacts only and
does not modify reducer behavior, QNT, or runtime profile evidence.
