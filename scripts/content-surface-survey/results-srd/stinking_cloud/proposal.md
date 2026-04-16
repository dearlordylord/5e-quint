# Proposal: Stinking Cloud — structural_widening

## Unit

**Stinking Cloud** — Level 3 Conjuration, Concentration up to 1 minute.  
SRD 5.2.1 provenance.

## Why no honest encoding is possible

Stinking Cloud's mechanic is: cast → place a sphere → while concentrating, **every creature that starts its turn inside the sphere makes a CON save** (fail → Poisoned until end of turn + can't action/bonus action; success → nothing).

This "repeating start-of-turn area save" pattern doesn't fit any existing `SpellMechanics` family:

| Family | Why it fails |
|---|---|
| `ongoing_effect` | `operation` must be `roll_modifier` or `damage_on_hit` — both are passive riders, not per-turn save gates |
| `activation` | `phases[]` are one-shot resolutions at cast time, not repeating per-creature-turn triggers |
| `triggered_reaction` | Reaction shape; wrong sourcing model entirely |
| `anchored_trigger` | Planted on a location/area and released once by an event — not a repeating turn-start check |

The gap is at the **family level**, not at the atom or variant level. Forcing the spell into `ongoing_effect` would require lying about what the operation does; forcing it into `activation` would drop the repeating nature entirely.

## Required widenings (in priority order)

### 1. New family: `repeating_area_trigger` (structural)

A concentration area spell whose active mechanic recurs on a per-entity, per-turn basis. Candidate shape:

```typescript
export type RepeatingAreaTriggerMechanics = SpellMechanicsHeader & {
  readonly family: "repeating_area_trigger";
  readonly attachment: Attachment;      // area attachment (sphere, etc.)
  readonly triggerTiming: "turn_start" | "turn_end";
  readonly resolution: ActivationPhase; // save_gate or attack_roll phase
};
```

The `turn_start_window` atom already exists in v4. The subgraph shape would be:  
`activate → area attachment → turn_start_window (per creature in area) → save_gate → ...`

Spells that share this pattern: Cloudkill, Spirit Guardians, Moonbeam, Hunger of Hadar.

### 2. Widen `Condition` to include `"poisoned"` (surface)

Currently `Condition = "prone"` only. The full SRD condition set should be added. At minimum: `"poisoned" | "prone" | "blinded" | "charmed" | "deafened" | "exhaustion" | "frightened" | "grappled" | "incapacitated" | "invisible" | "paralyzed" | "petrified" | "restrained" | "stunned" | "unconscious"`.

### 3. Compound `SaveGateRiderResult` (surface)

The Poisoned condition in this spell carries a secondary effect: "can't take an action or a Bonus Action." The current `SaveGateRiderResult` only supports `apply_condition | none`. Needs either:

- A compound variant: `{ kind: "apply_condition_with_rider"; condition: Condition; rider: ClassFeatureEffect }`, or
- A list of results: `onFail: ReadonlyArray<SaveGateRiderResult>`

The latter is more general (Spirit Guardians, Moonbeam fail branches often have multiple effects).

### 4. New atom: `obscure_area` (atom)

The cloud is Heavily Obscured. This is mechanically deterministic (attacks from/into the area have disadvantage; hiding is possible; visibility rules apply). No v4 atom covers it. Candidate: `obscure_area` effect atom that attaches to an area attachment and encodes the obscurement level (`lightly` | `heavily`).

### 5. Secondary termination: `dispersed_by_condition` (surface)

The cloud can be dispersed by a strong wind (Gust of Wind). This is an alternative to concentration dropping. The current `Duration` type has no variant for "also ends when X external event occurs." Candidate:

```typescript
| { readonly kind: "concentration_or_condition"; readonly upTo: DurationValue; readonly alsoEndsOn: string }
```

The `alsoEndsOn` string could be kept as a description for now, with a closed enum deferred until more pressure cases land (Fog Cloud, Darkness share the wind-disperse pattern).

## Summary table

| Gap | Kind | Blocking? |
|---|---|---|
| No `repeating_area_trigger` family | `structural_widening` | Yes — primary blocker |
| `Condition` missing `"poisoned"` | `surface_widening` | Yes — needed for any condition-inflicting spell |
| Compound save-gate result | `surface_widening` | Yes — secondary action restriction can't be expressed |
| No `obscure_area` atom | `atom_widening` | Yes — Heavily Obscured is a core spell effect |
| Wind-disperse termination | `surface_widening` | Partial — spell works without it but trace is incomplete |

All five gaps must be addressed before a clean Stinking Cloud encoding is possible.
