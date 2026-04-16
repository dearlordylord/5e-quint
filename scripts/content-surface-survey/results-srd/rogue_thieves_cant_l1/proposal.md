# Proposal: rogue_thieves_cant_l1

## Outcome: `dm_agenda`

## Unit

**Thieves' Cant (Rogue L1)** — SRD 5.2.1, `Classes/Rogue#Level 1: Thieves' Cant`

> "You know Thieves' Cant and one other language of your choice, which you choose from the language tables in 'Character Creation.'"

## Why dm_agenda

Thieves' Cant grants permanent knowledge of a secret language (Thieves' Cant) plus one additional language of the player's choice. Language proficiency has no mechanical footprint in the combat core:

- No dice rolls
- No saving throws
- No resource (use count, spell slot, charge)
- No activation event
- No reset cadence
- No modification to attack rolls, saves, AC, HP, speed, or conditions

Whether Thieves' Cant is useful is entirely determined by narrative context (does the NPC also know it?) and DM adjudication. This is structurally identical to Alarm's notification mechanism — the signal is "caller-owned" per ARCHITECTURE.md. The core engine has nothing to model here.

This is a legitimate out-of-core outcome, not a surface or atom gap.

## What Would Be Needed If The Surface Were Widened

If the content surface were ever extended to cover passive, character-creation-time grants (a reasonable future direction for completeness), two additions would be required:

### 1. New `ClassFeatureMechanics` family: `passive_grant`

The current `ClassFeatureMechanics` is:
```typescript
export type ClassFeatureMechanics = ClassFeatureActivationMechanics;
```

`ClassFeatureActivationMechanics` mandates `activationCost`, `resource` (use_count), `resetCadence`, and `effect`. None of these concepts apply to a permanent language grant. A new family would be needed:

```typescript
export type ClassFeaturePassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: ClassFeaturePassiveEffect;
};
```

### 2. New `ClassFeatureEffect` variant: `grant_proficiency` (language)

The existing `ClassFeatureEffect = GrantExtraActionEffect | HealHpEffect` has no language proficiency variant. A `grant_proficiency` variant with a `language` subtype would be needed. Note that `grant_proficiency` already exists as a v4 atom in `TAXONOMY_atoms_graph.md` — it would just need a surface representation.

### 3. Tracer handling for the new family

`traceClassFeatureMechanics` in `tracer.ts` would need a new `case "passive_grant":` branch.

## Note on the language choice

"One other language of your choice" is a character-creation selection, not a runtime decision. The surface has no current mechanism for modeling open player choices at character creation (as opposed to slot-scaled target counts or similar bounded choices). This would be a further widening if modeling the second language grant's optionality mattered.
