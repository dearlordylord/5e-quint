# Proposal: Surface Widenings for Suggestion

## Unit

**Suggestion** — Level 2 Enchantment spell (SRD 5.2.1)

## Outcome

`surface_widening` — the spell family (`activation` with a `save_gate` phase) already exists and is the right fit. All blockers are missing variants of existing surface types. No new v4 atoms or new families are needed.

## Mechanic summary

The deterministic core of Suggestion:

1. **WIS saving throw** (caster spell save DC) against one visible creature within 30 ft.
2. **On failure**: apply the Charmed condition for the duration.
3. **Duration**: Concentration, up to 8 hours.
4. **Early termination**: The spell ends early if the caster or their allies deal damage to the target.
5. **Behavioral compulsion** ("pursues the suggestion"): DM-adjudicated — out of core per ARCHITECTURE.md.

## Missing surface shapes

### 1. `apply_condition` variant in spell `Effect`

**Current state:**
```typescript
export type DamageEffect = { readonly kind: "damage"; ... };
export type NoneEffect = { readonly kind: "none" };
export type Effect = DamageEffect | NoneEffect;
```

**Needed:** A new variant:
```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};
export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

The mastery layer already has `apply_condition` in `SaveGateRiderResult`, but that type is not shared with the spell `Effect` union. Reuse or unify.

**Evidence:** "...or have the Charmed condition for the duration"

---

### 2. Widen `Condition` type to include standard SRD conditions

**Current state:**
```typescript
export type Condition = "prone";
```

**Needed:** At minimum `"charmed"`. Likely the full set of SRD conditions relevant to save-gated spells (blinded, charmed, frightened, incapacitated, paralyzed, poisoned, prone, restrained, stunned) should be represented as the type widens.

**Evidence:** "...or have the Charmed condition for the duration"

---

### 3. Damage-from-source early termination on concentration duration

**Current state:**
```typescript
export type Duration =
  | { readonly kind: "instantaneous" }
  | { readonly kind: "concentration"; readonly upTo: DurationValue }
  | { readonly kind: "timed"; readonly value: DurationValue };
```

**Needed:** A way to attach additional break triggers to concentration (and possibly timed) durations. One minimal design:

```typescript
export type BreakCondition =
  | { readonly kind: "damage_from_caster_or_allies" };

// Widen concentration variant:
| {
    readonly kind: "concentration";
    readonly upTo: DurationValue;
    readonly alsoBreaksOn?: ReadonlyArray<BreakCondition>;
  }
```

This maps to the v4 `break` lifecycle atom with a trigger edge. No new taxonomy atom is needed — only a surface shape to carry the trigger.

**Evidence:** "...until you or your allies deal damage to the target"

---

## What remains DM-agenda

- The specific wording of the suggestion (≤ 25 words, must sound achievable, no obvious self-harm).
- Whether the activity "can be completed in a shorter time" and the spell ends early on completion.
- How the target interprets and pursues the suggestion.

These are narrative/adjudication concerns with no deterministic mechanical resolution — legitimately out of scope per ARCHITECTURE.md.

## Proposed encoding (once widenings land)

With the three widenings above, Suggestion encodes as an `activation` spell with a single `save_gate` phase:

```
family: activation
phases:
  - kind: save_gate
    attachment: { kind: "target", selection: { mode: "one" } }
    ability: wis
    dc: { kind: "caster_spell_save_dc" }
    onFail: { kind: "apply_condition", condition: "charmed" }
    onSuccess: { kind: "none" }
duration:
  kind: concentration
  upTo: { unit: "hour", amount: 8 }
  alsoBreaksOn: [{ kind: "damage_from_caster_or_allies" }]
```
