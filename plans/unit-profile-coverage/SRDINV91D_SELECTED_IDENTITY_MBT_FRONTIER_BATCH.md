# SRDINV91D Selected Identity MBT Frontier Batch

Task 339 raises selected identity MBT coverage from 10/85 to 17/85 by adding
checker-visible `selected-identity-mbt` rows for a representative batch that
already had deterministic admission/projection evidence and focused MBT owner
actions.

## Selected Identities

| Unit                       | Representative frontier                                                                   | MBT owner                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `fighter_extra_attack`     | Attack action count scaling, including Unit-owned extra attack slot creation and spending. | `packages/battle-runtime/src/battle-runtime.mbt.test.ts`     |
| `defense`                  | Passive Armor Class feature projection.                                                   | `packages/battle-runtime/src/rule-core-features.mbt.test.ts` |
| `feat_archery`             | Passive ranged Attack Roll bonus projection.                                              | `packages/battle-runtime/src/rule-core-features.mbt.test.ts` |
| `orc_relentless_endurance` | Zero-Hit-Point replacement with limited-use Unit ownership.                                | `packages/battle-runtime/src/rule-core-features.mbt.test.ts` |
| `magic_missile`            | Slot-spell repeated target allocation plus Readied Spell release.                         | `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`   |
| `ray_of_frost`             | Spell Attack cantrip damage plus Speed reduction effect.                                  | `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`   |
| `acid_splash`              | Saving Throw cantrip damage with area target allocation.                                  | `packages/battle-runtime/src/rule-core-spells.mbt.test.ts`   |

This batch intentionally uses existing focused MBT owner files instead of broad
exploratory MBT. The new evidence rows are paired with owner-local
`UNIT-IDENTITY-MBT-REPLAY` markers and deterministic replay data that proves the
claimed Unit id is bound during the named driver actions.

## RAW And Vocabulary Check

No new D&D rule behavior was modeled. The evidence was checked against existing
local SRD 5.2.1 anchors before wiring the selected rows:

- `.references/srd-5.2.1/Classes/Fighter.md`: Extra Attack.
- `.references/srd-5.2.1/Feats.md`: Defense and Archery Fighting Style feats.
- `.references/srd-5.2.1/Character-Origins.md`: Orc Relentless Endurance.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Acid Splash.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Magic Missile.
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`: Ray of Frost.
- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: Spell Slots,
  Casting Time, spell targets, and one spell-slot spell per turn.
- `UBIQUITOUS_LANGUAGE.md`: Action, Bonus Action, Reaction, Ready Action,
  Readied Spell Response, Armor Class, Attack Roll, Saving Throw, Speed, Spell
  Slot, and Spell Invocation terminology.

## Follow-On Observations

`bard_bardic_inspiration` and `monk_martial_arts` remain
`profile-subset-supported`, so selected identity MBT rows for those Units would
not increase the current 85-row selected identity MBT denominator. Weapon
mastery identities have deterministic admission/projection evidence from
`packages/character-battle-runtime/src/index.test.ts`; a later selected MBT
batch should add a focused MBT owner for at least one mastery profile rather
than counting the existing runtime-test owner as selected MBT.

## Verification

- `pnpm --filter @dnd/battle-runtime exec vitest run src/rule-core-features.mbt.test.ts src/rule-core-spells.mbt.test.ts src/battle-runtime.mbt.test.ts -t "replays selected Unit identities deterministically"`
- Focused Rule Core Features MBT with prior-run checks and timing wrapper:
  `MBT_TRACES=1 MBT_STEPS=6 pnpm --filter @dnd/battle-runtime exec vitest run src/rule-core-features.mbt.test.ts`
- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `pnpm --filter @dnd/battle-runtime typecheck`
- Touched-file Prettier check

`pnpm quality` was attempted and stopped at unrelated baseline lint in
`packages/mcp/src/battle-tools.ts` (`max-lines`, 432 > 420), outside this
task's touched surface.

`/simplify` convergence notes:

- Round 1: kept the batch to existing focused MBT owners and avoided adding a
  parallel selected-identity registry.
- Round 2: left Bardic Inspiration, Martial Arts, and Weapon Mastery as
  explicit follow-on observations because their current evidence/status shape
  needs a separate selected-MBT owner decision.
