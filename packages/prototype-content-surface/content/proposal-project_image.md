# Proposal: Project Image — surface_widening

## Unit

**Project Image** — Level 7 Illusion, Concentration (up to 1 day), 500-mile range

SRD provenance: `Spells/Descriptions-N-R#Project Image`

## Why the unit doesn't fit

Project Image is an `ongoing_effect` spell — concentration, persistent, attachment-scoped. The family is correct. But three surface type gaps block honest encoding.

---

## Gap 1 — `OngoingOperation` missing a remote-object-creation variant

**Current surface type:**
```typescript
export type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

**What Project Image requires:**

The primary ongoing operation is:
1. Create an illusory duplicate (`create_object` v4 atom) at a remote location
2. Grant the caster remote sensing through the duplicate (`grant_sense` / `telepathic_link` v4 atoms)
3. Provide a repeatable control action (Magic action to move + direct the duplicate up to 60 ft) that persists for the duration

None of these fit `roll_modifier` or `damage_on_hit`. A new variant is needed, something like:

```typescript
export type CreateRemoteObjectOperation = {
  readonly kind: "create_remote_object";
  readonly objectKind: "illusory_duplicate";
  readonly sensing: { readonly kind: "remote_sense"; readonly senses: ReadonlyArray<"sight" | "hearing"> };
  readonly control: {
    readonly kind: "repeatable_action";
    readonly actionKind: "magic";
    readonly moveSpeed: number; // feet per use
  };
  readonly terminatesOn: "damage_taken";
};
```

**v4 atoms involved:** `create_object`, `grant_sense`, `telepathic_link` — all in v4 taxonomy, none yet in `OngoingOperation`.

**Evidence:**
> "You create an illusory copy of yourself... You can see through the illusion's eyes and hear through its ears as if you were in its space. As a Magic action, you can move it up to 60 feet..."

---

## Gap 2 — `Range.point` doesn't support a miles unit

**Current surface type:**
```typescript
| { readonly kind: "point"; readonly feet: number }
```

**What Project Image requires:** Range 500 miles. The SRD explicitly uses miles. Encoding as 2,640,000 feet would pass typecheck but is dishonest to the source text and creates a misleading trace.

**Proposed fix** — generalize the distance field:
```typescript
| {
    readonly kind: "point";
    readonly distance: {
      readonly amount: number;
      readonly unit: "feet" | "miles";
    };
  }
```

Existing `feet`-ranged spells would migrate to `{ amount: N, unit: "feet" }`. All v4 atoms and tracer logic that consume `Range` would need to handle the new shape (display only — no mechanical consequence in the tracer).

**Evidence:**
> `"range": { "type": "point", "distance": { "type": "miles", "amount": 500 } }` (5etools source)

---

## Gap 3 (secondary) — `ActivationPhase` missing an `ability_check` variant

**Current surface type:**
```typescript
export type ActivationPhase =
  | { readonly kind: "attack_roll"; ... }
  | { readonly kind: "save_gate"; ... };
```

**What Project Image requires:** The detection mechanic — a creature takes the Study action and makes an Intelligence (Investigation) check against the caster's spell save DC. Success lets the creature see through the illusion. This is an ability-check resolution (v4 `ability_check` atom exists) with a binary outcome, not a saving throw.

A new variant:
```typescript
| {
    readonly kind: "ability_check";
    readonly attachment: Attachment;
    readonly skill: string;          // "investigation"
    readonly ability: Ability;       // "int"
    readonly dc: DcSource;
    readonly onSuccess: Effect;
    readonly onFail: Effect;
  }
```

This gap is secondary — the detection mechanic is a player-facing interaction, not a damage or condition effect. It could be deferred and the core mechanic encoded without it. But honest completeness requires noting it.

**Evidence:**
> "A creature that takes the Study action to examine the image can determine that it is an illusion with a successful Intelligence (Investigation) check against your spell save DC."

---

## Summary of widenings

| # | Kind | Name | v4 atoms | Urgency |
|---|------|------|----------|---------|
| 1 | `new_variant` | `OngoingOperation.create_remote_object` | `create_object`, `grant_sense`, `telepathic_link` | Blocking |
| 2 | `new_variant` | `Range.point` distance unit (miles) | — (display only) | Blocking |
| 3 | `new_variant` | `ActivationPhase.ability_check` | `ability_check` | Secondary |

All required atoms are already in the v4 taxonomy. No `atom_widening` is needed. This is purely a surface vocabulary gap.

## Related patterns

- **Scrying** (similar remote-sensing ongoing effect) will hit the same Gap 1 and Gap 2.
- **Arcane Eye** (ranged invisible sensor) will hit Gap 1.
- **Clairvoyance** (remote sensor) will hit Gap 1.

Gap 1 should be considered a family-level widening for the "remote-sensor/remote-duplicate" spell subclass.
