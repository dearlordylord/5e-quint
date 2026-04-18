# Proposal: Gentle Repose — atom_widening

## Unit

**Gentle Repose** (SRD 5.2.1, Level 2 Necromancy)  
Casting Time: Action or Ritual | Range: Touch | Duration: 10 days (timed, non-concentration)  
Components: V, S, M (2 CP, consumed)

## What Fits

The structural shell encodes without widening:

- `spell` kind, `activation` family (single `direct` phase)
- `{ kind: "timed", value: { unit: "day", amount: 10 } }` duration
- `{ kind: "action", ritual: true }` casting time
- `{ kind: "touch" }` range
- `{ kind: "object", count: 1 }` attachment (targets a corpse/remains)
- M component: `{ m: "2 Copper Pieces, which the spell consumes", materialCostGp: ..., materialConsumed: true }`

## What Doesn't Fit

### Effect 1 — "can't become Undead"

RAW: "the target… can't become Undead"

This is a deterministic mechanical protection: any spell or effect that would animate the target as undead fails while Gentle Repose persists. It is distinct from:

- `block_targeting` — that prevents targeting of a *creature* by spells/effects (Globe of Invulnerability idiom). This protection applies to a *corpse/object* against a specific category of transformation.
- `grant_condition_immunity` — covers the 15 SRD conditions only; "undead" is a creature type, not a condition.
- `grant_damage_immunity` — wrong domain entirely.

**Proposed atom: `block_reanimation`**

```typescript
| {
    readonly kind: "block_reanimation";
  }
```

Emits in the v4 effect category. No parameters needed — the scope is always "undead creation" and applies to the attached object while the spell persists. Could optionally carry a `creatureType` field if future spells block other type-transitions (e.g., "can't become a Construct"), but single-unit pressure doesn't warrant it now.

### Effect 2 — "days don't count against raise dead time limit"

RAW: "days spent under the influence of this spell don't count against the time limit of spells such as Raise Dead"

This pauses countdown timers associated with resurrection-window mechanics. It is not:

- A delta on any numeric stat (HP, speed, AC, save, ability score)
- A condition, resistance, or immunity
- A blocking or negation of a spell being cast

It's a meta-mechanic that modifies how another spell's time constraint is evaluated. The closest analog would be a DurationEndTrigger suppressor, but that concept doesn't exist as a first-class atom and the current `earlyEnd` field on `Duration` only adds new termination triggers, not suppresses existing progression.

**Proposed atom: `pause_deadline`**

```typescript
| {
    readonly kind: "pause_deadline";
    readonly scope: "resurrection_window";
  }
```

`scope` is closed to `"resurrection_window"` for now (the only RAW example). If other deadline-pausing effects surface (e.g., a feature that pauses a curse's countdown), the scope could be widened.

### Minor: ObjectFilter lacks `corpse` discriminant

The existing `ObjectFilter` supports `material`, `heldOrWorn`, and `manufactured`. A corpse is none of these (it's not metal, not flammable, and its held/worn or manufactured status is irrelevant). Authoring the attachment would require omitting the filter entirely, which permits any object. This is a minor `surface_widening` — a `biological_remains?: true` flag or a `kind: "corpse"` variant would close it — but it's secondary to the atom gaps above.

## Classification

`atom_widening` — the spell's family, duration, range, and casting-time shapes all fit; two effect atoms (`block_reanimation`, `pause_deadline`) are absent from both the v4 taxonomy and the TS surface.
