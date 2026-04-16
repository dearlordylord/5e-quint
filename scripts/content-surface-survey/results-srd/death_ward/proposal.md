# Proposal: Death Ward — atom_widening

## Unit

- **Slug**: `death_ward`
- **Kind**: spell (Level 4 Abjuration)
- **Source**: srd-5.2.1
- **Outcome**: `atom_widening`

## What fits

Death Ward's outer structure maps cleanly onto the `ongoing_effect` family:

| Property | Value | Surface shape |
|---|---|---|
| Casting time | Action | `CastingTime { kind: "action" }` |
| Range | Touch | `Range { kind: "touch" }` |
| Components | V, S | `Components { v: true, s: true, m: false }` |
| Duration | 8 hours, non-concentration | `Duration { kind: "timed", value: { unit: "hour", amount: 8 } }` |
| Attachment | One creature | `Attachment { kind: "target", selection: { mode: "one" } }` |
| Family | Persistent effect on creature | `ongoing_effect` |

All of these shapes exist in `types.ts`. The spell would typecheck and trace up to `traceOngoingEffect`, where it would fail.

## What is missing

### Gap 1 — `prevent_hp_floor` (new atom)

**Text**: "The first time the target would drop to 0 Hit Points before the spell ends, the target instead drops to 1 Hit Point, and the spell ends."

The v4 effect atoms include `damage`, `heal`, `modify_max_hp`, and `negate_named_effect` — none of which captures this mechanic:

- `heal` restores HP *after* damage is applied; Death Ward intercepts *before* the HP reaches 0 (sets floor, not adds back).
- `modify_max_hp` changes the HP ceiling, not the floor of a single reduction event.
- `negate_named_effect` requires a named spell ID; Death Ward applies to *any* HP-reduction that would reach 0 — weapon damage, spell damage, falling, etc.

This is a **threshold interception on the HP-damage pipeline**: when an incoming reduction event would set HP ≤ 0, substitute the result with 1. It fires exactly once and then the spell self-terminates.

Proposed atom: **`prevent_hp_floor`**
- Category: `effect`
- Semantic: intercept any event that would reduce the attached creature's HP to ≤ 0, set HP to 1 instead; consumes the effect on firing.
- Relation pattern: `activate --grants--> prevent_hp_floor --attaches_to--> target`

### Gap 2 — `negate_instant_death` (new atom)

**Text**: "If the spell is still in effect when the target is subjected to an effect that would kill it instantly without dealing damage, that effect is negated against the target, and the spell ends."

This covers instant-kill effects that bypass the HP pipeline entirely — e.g. Power Word Kill when the target has ≤ 50 HP, the death-clause of Disintegrate at 0 HP, and similar. The effect is structurally different from `prevent_hp_floor`:

- No HP change occurs (no damage was dealt).
- The trigger is a specific *kill effect class* rather than an HP threshold crossing.
- `negate_named_effect` does not apply — this negates any qualifying effect regardless of name.

Proposed atom: **`negate_instant_death`**
- Category: `effect`
- Semantic: negate effects that would kill the attached creature instantly without dealing damage; consumes the effect on firing.
- Relation pattern: `activate --grants--> negate_instant_death --attaches_to--> target`

### Gap 3 — `OngoingOperation / death_guard` variant (surface widening)

The `OngoingOperation` union in `types.ts` currently has two variants:
```ts
type OngoingOperation = RollModifierOperation | DamageOnHitOperation;
```

Neither variant can carry the Death Ward protection. A new variant is needed:

```ts
type DeathGuardOperation = {
  readonly kind: "death_guard";
  readonly preventHpDropToZero: true;
  readonly negateInstantDeath: true;
};
```

Both flags are always true for Death Ward (the SRD defines both protections as one spell). The `oneShot` semantic — fires once then spell ends early — is also not currently expressed in `OngoingEffectMechanics`. Either a `oneShot: boolean` flag on `OngoingEffectMechanics`, or the lifecycle atom `self_break` triggered by the operation, would need to be added.

### Secondary gap — one-shot lifecycle

The current `ongoing_effect` family models operations as persistent for their full duration. Death Ward's protections are explicitly one-shot: the spell ends the moment either protection triggers. The `self_break` lifecycle atom exists in v4 but is not wired into the `OngoingEffectMechanics` shape. A surface addition (e.g. `oneShot: boolean` on the mechanics header, or an explicit `selfBreakOn` field) would be needed to express this accurately.

This is a secondary gap — the primary blocker is the missing effect atoms.

## Summary of proposed widenings

| # | Kind | Name | Needed for |
|---|---|---|---|
| 1 | `new_atom` | `prevent_hp_floor` | First trigger: HP-drop interception |
| 2 | `new_atom` | `negate_instant_death` | Second trigger: instant-kill negation |
| 3 | `new_variant` | `OngoingOperation / death_guard` | Surface encoding of both protections |
| 4 | `new_variant` | `OngoingEffectMechanics / oneShot` | One-shot-expire lifecycle (secondary) |

## Why not other families

- **`triggered_reaction`**: Death Ward is cast proactively (1 Action, not Reaction). It doesn't fit the Prepare/Prompt/Commit subgraph.
- **`anchored_trigger`**: `AnchorTarget` only allows `location` or `area`; Death Ward attaches to a *creature*. The `AnchoredSignal` atoms also have no death-prevention variant.
- **`activation`**: No phases — Death Ward doesn't roll attack dice or request saves at cast time.
