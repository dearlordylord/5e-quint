# Proposal: species_orc_darkvision — structural_widening

## Unit

**Darkvision (Orc)** — SRD 5.2.1, Character-Origins.md §Orc

> You have Darkvision with a range of 120 feet.

## Why it does not fit

### 1. No `SpeciesTraitRecord` kind

`UnitRecord` in `types.ts` is:

```typescript
export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord;
```

`species_trait` is not a member. The tracer's top-level switch is exhaustive — it throws immediately on any unknown kind. The v4 taxonomy lists `species_trait_root` as a source atom, but neither the surface type system nor the tracer has a corresponding record type.

### 2. No mechanics family for passive always-on grants

Darkvision is:
- Always on — no activation required
- No resource consumed
- No rest reset
- No roll, no save, no phase
- No duration — permanent (for the lifetime of the character)

The existing mechanics families are all activity-oriented:
- `activation` (class feature) — requires an activation cost + resource + effect
- `ongoing_effect` (spell) — requires a spell header, concentration or timed duration
- `activation` (spell) — phases with attack rolls or saves
- `triggered_reaction` (spell) — fires on a trigger event
- `anchored_trigger` (spell) — plants a deferred release
- `on_hit_trigger` (mastery) — fires on weapon hit

None of these fit a permanent passive state grant. A new mechanics family is needed — tentatively `passive_grant` — for traits that simply state "you have X" with no conditions.

### 3. No `grant_sense` surface type

The v4 atom `grant_sense` exists in the taxonomy (§9 Effect Atoms), but `types.ts` has no surface type for it. A typed shape is needed:

```typescript
export type SenseName = "darkvision" | "blindsight" | "tremorsense" | "truesight";

export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: SenseName;
  readonly rangeFeet: number;
};
```

## Proposed widening

### New: `SpeciesTraitRecord`

```typescript
export type SpeciesTraitMechanics = PassiveGrantMechanics; // extensible

export type SpeciesTraitRecord = UnitMetadata & {
  readonly kind: "species_trait";
  readonly mechanics: SpeciesTraitMechanics;
};

export type UnitRecord = SpellRecord | ClassFeatureRecord | MasteryRecord | SpeciesTraitRecord;
```

### New: `PassiveGrantMechanics` family

```typescript
export type PassiveGrantEffect = GrantSenseEffect; // widen as more species traits land

export type PassiveGrantMechanics = {
  readonly family: "passive_grant";
  readonly effect: PassiveGrantEffect;
};
```

### New: `GrantSenseEffect`

```typescript
export type SenseName = "darkvision" | "blindsight" | "tremorsense" | "truesight";

export type GrantSenseEffect = {
  readonly kind: "grant_sense";
  readonly sense: SenseName;
  readonly rangeFeet: number;
};
```

### Tracer additions required

- New branch in `traceUnit` for `species_trait`
- New `traceSpeciesTraitUnit` function
- New `tracePassiveGrant` function emitting `species_trait_root → grant_sense` with a `grants` edge

## Graph shape (anticipated)

```
species_trait_root[Darkvision (Orc)]
  --grants-->
grant_sense[darkvision, 120 ft]
```

Atoms: `species_trait_root`, `grant_sense`  
Relations: `roots`, `grants`

## Other Orc traits for context

The Orc block contains three traits. Only Darkvision is assigned to this worker, but the others will encounter related widening pressure:

- **Adrenaline Rush** — bonus action Dash + temporary HP equal to PB; use-count resource reset on short/long rest. This could map to a `SpeciesTraitRecord` with `activation` mechanics (similar to a class feature) once `SpeciesTraitRecord` exists, but the temporary HP effect (`grant_temp_hp` scaled by `proficiency_bonus`) needs a surface type not yet present.
- **Relentless Endurance** — "drop to 1 HP instead of 0" reactive effect; once per long rest. This is a triggered reaction on a HP threshold event — a new trigger kind not yet in the surface.

All three traits share the need for `SpeciesTraitRecord` as a prerequisite.

## Classification

`structural_widening` — the unit's kind and its mechanics family are both missing from the current surface. The gap is at the record and family level, not just a missing atom variant.
