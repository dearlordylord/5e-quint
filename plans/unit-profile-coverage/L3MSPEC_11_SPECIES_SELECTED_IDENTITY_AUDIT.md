# L3MSPEC-11 Species Selected Identity Audit

Task 11 audited promoted species trait selected-identity replay evidence and
added the missing passive trait replay witness. No Surface shape, support
profile, reducer behavior, rule-core semantics, or authored catalog identity
dispatch was added.

## Source Review

Local RAW sources checked:

- `.references/srd-5.2.1/Character-Origins.md:107-123` for Draconic
  Ancestry, Breath Weapon, and Dragonborn Damage Resistance.
- `.references/srd-5.2.1/Character-Origins.md:139` for Dwarven Resilience:
  Poison damage Resistance plus Advantage on Saving Throws made to avoid or end
  Poisoned.
- `.references/srd-5.2.1/Character-Origins.md:213` for Goliath Powerful
  Build: Advantage on Ability Checks made to end Grappled, with carrying
  capacity outside battle-runtime.
- `.references/srd-5.2.1/Rules-Glossary.md:514` for ending a Grapple with a
  Strength (Athletics) or Dexterity (Acrobatics) Ability Check.
- `.references/srd-5.2.1/Rules-Glossary.md:828-830` for Resistance halving
  matching damage.
- `UBIQUITOUS_LANGUAGE.md:7-8`, `UBIQUITOUS_LANGUAGE.md:87`,
  `UBIQUITOUS_LANGUAGE.md:102`, `UBIQUITOUS_LANGUAGE.md:107`, and
  `UBIQUITOUS_LANGUAGE.md:354-362` for Ability Check, Saving Throw,
  Resistance, Grappled, Poisoned, and d20 roll-mode terms.

## Audit Result

Before this task, the generated selected identity replay gap view listed three
promoted species traits with `missing-witness`:

- `species_dragonborn_damage_resistance`
- `dwarf_dwarven_resilience`
- `species_goliath_powerful_build`

`species_dragonborn_breath_weapon` already had selected-identity MBT replay
through `packages/battle-runtime/src/dragonborn-breath-weapon-runtime.mbt.test.ts`.
`barbarian_frenzy` also already had selected-identity replay, but it is a class
feature rather than a species trait.

The new
`packages/battle-runtime/src/species-passive-trait-selected-identity.mbt.test.ts`
witness binds those three missing authored Unit ids to production
battle-runtime entrypoints and existing typed support profiles:

- Dragonborn Damage Resistance discovers the selected Draconic Ancestry damage
  type from Character Build source facts and verifies only matching Fire damage
  is halved.
- Dwarven Resilience verifies Poison damage Resistance and Advantage on Saving
  Throws scoped to Poisoned, while non-Poison damage and unrelated conditions do
  not match.
- Goliath Powerful Build verifies Advantage on the Escape Grapple Ability Check
  only when the selected Unit support profile is retained; ordinary Poisoned
  Ability Check Disadvantage still cancels that advantage to a normal roll. The
  replay projection preserves the full `advantage` / `disadvantage` / `normal`
  roll-mode domain, mapping only an absent runtime `rollMode` to `normal`.

The paired
`packages/battle-runtime/battle-runtime-species-passive-trait-selected-identity.mbt.qnt`
driver is a self-contained literal projection witness. The TypeScript side
discovers the projected facts from runtime, so the QNT driver does not import a
behavioral rule module or duplicate reducer logic.

## Boundary Decision

Selected species identity remains a selection/composition boundary fact. Runtime
behavior still consumes parsed Surface mechanics, selected Draconic Ancestry
source facts, `BattleUnitRef` support profiles, target-side damage adjustment,
Saving Throw roll-mode projection, and Escape Grapple holes. No reducer path
branches on authored species, ancestry, or trait identity.

## Reviewer Loop Convergence

Round 1 RAW and ubiquitous-language pass:

- Confirmed the three passive species traits are battle-runtime executable only
  through Resistance, Saving Throw roll mode, and Ability Check roll mode facts.
- Confirmed the carrying-capacity sentence in Powerful Build remains outside
  battle-runtime.

Round 2 architecture and connascence pass:

- The strongest coupling is between `UNIT-IDENTITY-EVIDENCE` rows,
  `UNIT-IDENTITY-MBT-REPLAY` actions, QNT `step` actions, and runtime
  discovery functions. The selected-identity witness localizes those facts in
  one test/QNT pair.
- No duplicate damage-type state was added. Dragonborn Damage Resistance
  continues to consume the same selected Draconic Ancestry source fact used by
  Breath Weapon.
- No duplicate Resistance, Saving Throw, or Ability Check algorithms were added;
  the witness calls existing runtime projection and damage-adjustment helpers.

## Plan Impact

- L3MSPEC-11 can close after verification.
- L3MSPEC-12 should be unblocked after the generated coverage reports are
  refreshed, because promoted species trait selected-identity gaps are now
  covered by checker-visible replay evidence.
