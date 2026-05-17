# L1I Class Species Druid Nature's Ward Closure

Task 11 closes `druid_natures_ward` as an explicit unsupported-profile
disposition. No runtime behavior, Surface schema, Unit catalog admission,
Circle of the Land state, or D-owned `druid_primal_order` selected-identity
work changed.

## RAW Sources

- `.references/srd-5.2.1/Classes/Druid.md:366-420`: Circle of the Land
  chooses arid, polar, temperate, or tropical land whenever the Druid finishes
  a Long Rest; Nature's Ward is acquired at Druid level 10 and grants immunity
  to the Poisoned condition plus Resistance keyed to the Circle Spells land
  choice.
- `.references/srd-5.2.1/Classes/Druid.md:422-427`: Nature's Ward maps Arid
  to Fire Resistance, Polar to Cold Resistance, Temperate to Lightning
  Resistance, and Tropical to Poison Resistance.
- `.references/srd-5.2.1/Playing-the-Game.md:716-730`: Damage Types,
  Resistance, no-stacking, and order-of-application rules define the
  target-side damage boundary for the Resistance half of the feature.
- `.references/srd-5.2.1/Playing-the-Game.md:734-736` and
  `.references/srd-5.2.1/Rules-Glossary.md:788-792`: Immunity to a condition
  means the creature is not affected by it, and Poisoned is the named
  condition affected by Nature's Ward.
- `UBIQUITOUS_LANGUAGE.md:86-90`: Damage Type, Resistance, Immunity, and
  Condition Immunity are the canonical damage and condition terms.
- `UBIQUITOUS_LANGUAGE.md:97-107`: Poisoned is the named condition affected by
  the immunity clause.
- `UBIQUITOUS_LANGUAGE.md:318-321` and `UBIQUITOUS_LANGUAGE.md:359-360`:
  Character Sheets and Stat Blocks both produce creature-level battle facts;
  class-feature grants should feed that projection rather than duplicate
  target-side damage or condition state.

## Surface Record Read

- `packages/surface/content/druid_natures_ward.json`
- `packages/surface/content/druid_natures_ward.dhall`

## Existing Owners Read

- `packages/surface/src/surface/unit-catalog.ts:40-41` and
  `packages/surface/src/surface/unit-catalog.ts:284-285`: the installed SRD
  Unit catalog includes `druid_druidic` and D-owned `druid_primal_order`, but
  not `druid_natures_ward`.
- `packages/surface/src/surface/schema-spell.ts:164-167`,
  `packages/surface/src/surface/schema-spell.ts:541-547`, and
  `packages/surface/src/surface/schema-spell.ts:793-794`: the Surface grammar
  can express fixed or choice-table `grant_resistance` and
  `grant_condition_immunity`, but not a Resistance damage type projected from
  another class feature's selected land state.
- `packages/battle-runtime/src/unit-feature-support.ts:2173-2195` and
  `packages/battle-runtime/src/unit-feature-support.ts:2969-2990`: promoted
  Unit feature parsing handles fixed ongoing-feature `grant_resistance` values,
  not absent passive subclass feature Units or land-choice-derived damage-type
  projection.
- `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts:628-685`
  and `packages/battle-runtime/src/battle-reducer/spell-condition-effects-helpers.ts:632-652`:
  condition-immunity execution exists for supported spell active effects, not
  for an uninstalled passive class-feature Unit.
- `packages/character-creation-runtime/src/support-gates.ts:283-284` and
  `packages/surface/content/class_druid.json`: subclass admission covers
  supported Fighter Champion and Wizard Evoker choices; Druid has no Circle of
  the Land subclass choice or Long Rest selected-land source fact in the
  installed character-creation boundary.

## Generated State Before This Task

Before this task, `druid_natures_ward` was an authored SRD Surface record with
a partial passive mechanics payload and no `unit-claims.jsonl` disposition.
`UNIT_REPORT.md` therefore listed it as `unsupported-widening-pressure`.

The Dhall source intentionally encodes only `grant_condition_immunity` for
Poisoned and documents the deferred land-keyed Resistance. Promoting the
condition-immunity half alone would overstate RAW support for the single
Nature's Ward feature identity because the Resistance clause depends on the
Circle Spells land choice.

## Decision

Add an `unsupported-profile` Unit claim for `druid_natures_ward`.

Nature's Ward is a level-10 Circle of the Land subclass feature with two
target-side passive effects: Poisoned condition immunity and Resistance whose
damage type is derived from the Druid's Circle Spells land choice. It should
become a future supported profile only after the system has one source fact for
Circle of the Land land selection and a passive target-side
Resistance/condition-immunity projection that can read that fact without
duplicating Stat Block resistances, spell active-effect resistances, or
Character Sheet feature state.

Do not install `druid_natures_ward`, widen `DamageTypeRef`, or reuse generic
fixed `grant_resistance` support in this task. Do not touch
`druid_primal_order`.

## Follow-Up Tasks

- Add an atomic Circle of the Land selected-land state task before promoting
  Nature's Ward. That task should model the Long Rest land choice as one
  character-owned source fact shared by Circle Spells, Nature's Ward, and
  Nature's Sanctuary rather than storing separate land or Resistance state per
  feature.
- Add an atomic passive target-side class-feature profile for Nature's Ward
  after the selected-land source fact exists. The profile should project
  Poisoned condition immunity and the Nature's Ward table's derived Resistance
  together so the single RAW feature identity cannot be partially admitted as
  supported.
- Any future passive Resistance work should share the damage-modifier owner
  with species passive Resistance support and Stat Block/active-effect
  resistance application instead of adding a Druid-only adapter.

## Review Notes

- RAW and ubiquitous-language pass: the closure traces Nature's Ward, Circle
  Spells land choice, Damage Type, Resistance, Poisoned, and Condition Immunity
  to the local corpus and vocabulary.
- Architecture/domain pass: no lower-layer workaround or duplicate state was
  added. The authored Surface record remains the source record, and the
  unsupported claim keeps future Circle of the Land selected-land state
  separate from runtime projection.
- Connascence pass: the strong coupling between Arid/Fire, Polar/Cold,
  Temperate/Lightning, and Tropical/Poison is intentionally left in one future
  selected-land table owner. This task does not copy that mapping into runtime
  or report metadata beyond the RAW trace above.
- Code-review pass: no executable code, casts, assertions, parsers, schemas, or
  runtime reducers changed.
- Round 1: confirmed the claim does not install Nature's Ward and does not
  touch `druid_primal_order`.
- Round 2: rechecked the generated report and matrix output after `--write`;
  the only task-owned generated changes are the new unsupported-profile claim
  projection for `druid_natures_ward`.

## Verification

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`
- MBT not run: this changes coverage/decision metadata and generated reports,
  with no promoted battle runtime behavior.
