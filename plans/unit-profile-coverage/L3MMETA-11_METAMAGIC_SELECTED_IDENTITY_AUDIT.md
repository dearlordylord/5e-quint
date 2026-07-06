# L3MMETA-11 Metamagic Selected Identity Audit

Task 11 audited selected-identity replay for the promoted Sorcerer Metamagic
support boundary. No runtime behavior, Surface shape, QNT owner, MBT driver, or
generated coverage ledger was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Classes/Sorcerer.md#Level 2: Metamagic` for selected
  Metamagic options, Sorcery Point costs, and the one-option-per-spell default.
- `.references/srd-5.2.1/Classes/Sorcerer.md#Metamagic Options` for Careful,
  Distant, Empowered, Extended, Heightened, Quickened, Seeking, Subtle,
  Transmuted, and Twinned Spell.
- `UBIQUITOUS_LANGUAGE.md` for Spell Invocation, Saving Throw, Attack Roll,
  Damage Roll, Magic Action, Bonus Action, Sorcery Points as a Pool, and Spend.

No new D&D rule was modeled in this task. The audit checks that existing
Metamagic selected identity witnesses remain connected to supported production
paths and that unsupported Metamagic options stay outside replay claims until
their typed owners are promoted.

## Existing Gate

`pnpm unit-profile-coverage:check` validates selected-identity replay through
the shared Unit profile coverage gate. For selected-identity replay rows, the gate
joins:

- the `unit-evidence.jsonl` `selected-identity-replay` row;
- the `UNIT-IDENTITY-EVIDENCE` and `UNIT-IDENTITY-REPLAY` markers;
- deterministic replay data declared through `defineSelectedIdentityReplayWitness`
  or split replay data consumed by that helper;
- the focused QNT driver action set when a joined
  `UNIT-IDENTITY-QNT-REPLAY` owner exists; and
- production runtime entrypoint reachability from the selected-identity owner.

The generated matrix reports `sorcerer_metamagic` as
`profile-subset-supported` with selected identity `witness-present`. The
remaining `selectedIdentityReplayGaps` rows are `dwarf_dwarven_resilience` and
`species_dragonborn_damage_resistance`; neither row is a Metamagic profile.

## Promoted Profile Audit

| Supported profile                                          | Replay status                                                                                                                                                                                                               | Evidence                                                                                                                                                                                                                                                                               |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `character-creation.class-feature-option-projection`       | Covered at the Metamagic Unit selection boundary.                                                                                                                                                                           | `packages/character-creation-runtime/src/class-feature-projections.mbt.test.ts` via `B6-CLASS-FEATURE-IDENTITY-BATCH-3`; `packages/character-creation-runtime/src/index.test.ts` also covers deterministic admission/projection.                                                       |
| `character-creation.class-feature-source-fact-projection`  | Covered by deterministic projection and the Unit selection boundary; no separate option-execution replay applies.                                                                                                           | `packages/character-creation-runtime/src/index.test.ts`.                                                                                                                                                                                                                               |
| `character-creation.class-feature-advancement-replacement` | Covered by deterministic replacement tests and the Unit selection boundary; no battle replay applies because this rewrites known-option ownership during Sorcerer level gain.                                               | `packages/character-creation-runtime/src/index.test.ts`.                                                                                                                                                                                                                               |
| `character-sheet.metamagic-battle-resource-bridge`         | Non-applicable for an option-specific replay action. It preserves selected Metamagic option facts and the shared Font of Magic point-pool link; option execution is replayed by the promoted Spell Invocation owners below. | `packages/character-sheet-runtime/src/index.test.ts`, `packages/character-battle-runtime/src/index.test.ts`, and `packages/battle-runtime/src/battle-runtime-metamagic-resource.test.ts`.                                                                                              |
| `unit-feature.metamagic-cast-governor-quickened`           | Covered.                                                                                                                                                                                                                    | `packages/battle-runtime/src/sorcerer-metamagic-selected-identity.mbt.test.ts`, `packages/battle-runtime/src/sorcerer-metamagic-spell-attack-selected-identity.mbt.test.ts`, and `packages/battle-runtime/src/sorcerer-metamagic-spell-attack-sequence-selected-identity.mbt.test.ts`. |
| `unit-feature.metamagic-careful-save-protection`           | Covered.                                                                                                                                                                                                                    | `packages/battle-runtime/src/sorcerer-metamagic-careful-selected-identity.mbt.test.ts`.                                                                                                                                                                                                |
| `unit-feature.metamagic-heightened-save-disadvantage`      | Covered for promoted action-time Saving Throw holes and the combatant-owned Hideous Laughter repeat-save lifecycle. Remaining area and multi-target repeat-save families stay deferred and are not claimed by this profile. | `packages/battle-runtime/src/sorcerer-metamagic-heightened-selected-identity.mbt.test.ts`.                                                                                                                                                                                             |
| `unit-feature.metamagic-damage-type-substitution`          | Covered.                                                                                                                                                                                                                    | `packages/battle-runtime/src/sorcerer-metamagic-transmuted-selected-identity.mbt.test.ts`.                                                                                                                                                                                             |
| `unit-feature.metamagic-effective-level-extra-target`      | Covered.                                                                                                                                                                                                                    | `packages/battle-runtime/src/sorcerer-metamagic-twinned-selected-identity.mbt.test.ts`.                                                                                                                                                                                                |

The promoted battle-runtime Metamagic replay actions are:

- Quickened: `doResolveQuickenedSaveGatedDamage`,
  `doResolveQuickenedSpellAttack`, and
  `doResolveQuickenedSpellAttackSequence`.
- Careful: `doResolveCarefulSaveGatedDamage` and
  `doResolveCarefulSaveGatedNoEffect`.
- Heightened: `doResolveHeightenedSaveGatedDamage` and
  `doResolveHeightenedHideousLaughter`.
- Transmuted: `doResolveTransmutedSaveGatedDamage` and
  `doResolveTransmutedSpellAttack`.
- Twinned: `doResolveTwinnedTargetCount`.

## Deferred Or Non-Applicable Metamagic Options

Distant, Extended, Subtle, and Empowered Spell are not promoted runtime
profiles in the current `sorcerer_metamagic` claim. They remain documented as
deferred mechanics:

- Distant, Extended, and Subtle belong to future typed cast-property owners for
  range, duration or Concentration maintenance, and components.
- Empowered belongs to a future typed post-roll spell damage dice reroll fill
  owner.

Seeking Spell is now promoted for the first missed spell Attack Roll replacement
owner: the single `spellAttackDamage` Ray of Frost slice. Repeated spell attack
procedures such as Scorching Ray remain deferred until invocation-local
one-use accounting exists.

No selected-identity replay should be added for those options until the
corresponding typed runtime owner, focused QNT parity, and runtime verification
exist. Adding replay rows before that would make unsupported option identity
look executable.

## Audit Result

Promoted Metamagic support has no selected-identity replay gap:

- `sorcerer_metamagic` has checker-visible selected-identity replay evidence.
- Every promoted option-execution profile has at least one replay action tied
  to a selected `sorcerer_metamagic` Unit identity.
- Projection and resource-bridge profiles are documented as deterministic or
  non-applicable for option-specific replay rather than receiving duplicate
  selected identity state.
- Unsupported Metamagic options remain explicitly deferred and should not be
  counted as selected-identity replay gaps.

The selected identity gate localizes the connascence between evidence rows,
test markers, replay action names, QNT driver actions, deterministic replay
data, and production entrypoint reachability. No separate Metamagic replay
registry or authored-identity dispatch is needed.

## Plan Impact

- `L3MMETA-11-METAMAGIC-SELECTED-IDENTITY-AUDIT` can close as audit complete.
- `L3MMETA-12-METAMAGIC-KERNEL-CONSOLIDATION` can treat promoted Metamagic
  selected identity replay as green while regenerating ledgers.
- `L3MMETA-13`, `L3MMETA-15`, `L3MMETA-16`, `L3MMETA-17`, `L3MMETA-18`, and
  `L3MMETA-19` should still add their own selected-identity evidence only
  after their typed runtime and QNT owners are promoted.

## Reviewer Loop Convergence

- Round 1: rejected adding new MBT drivers or ledger rows. Existing promoted
  option-execution profiles already have checker-visible selected-identity
  replay rows, and the generated replay gaps are unrelated non-Metamagic rows.
- Round 2: kept projection and resource-bridge profiles out of option-specific
  replay. They preserve or project selected facts, while Spell Invocation
  execution profiles own the selected Metamagic replay actions.
