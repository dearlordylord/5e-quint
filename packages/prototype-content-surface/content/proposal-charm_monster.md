# Proposal: Charm Monster — surface_widening

## Unit

**Charm Monster** — Enchantment 4, SRD 5.2.1, `srd52: true`

## Why encoding was blocked

Charm Monster is structurally an `activation` spell with a single `save_gate` phase: the target makes a Wisdom saving throw, and on failure receives the **Charmed condition** for up to 1 hour.

The blocking gap is that the spell `Effect` type does not have an `apply_condition` variant:

```typescript
// current
export type Effect = DamageEffect | NoneEffect;
```

The `apply_condition` atom exists in v4 (§9 Effect Atoms) and is already reachable from mastery `SaveGateRiderResult`. It simply has not been promoted to the spell `Effect` type.

## Required widenings

### 1 (blocking) — `apply_condition` variant on spell `Effect`

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

With this widening, the encoding would be:

```
activation / save_gate:
  attachment: { kind: "target", selection: { mode: "choose_up_to", count: { kind: "linear", base: 1, perSlotAboveBase: 1, baseLevel: 4 } } }
  ability: "wis"
  dc: { kind: "caster_spell_save_dc" }
  onFail: { kind: "apply_condition", condition: "charmed" }
  onSuccess: { kind: "none" }
```

The `Condition` type would also need `"charmed"` added (currently only `"prone"` is present):

```typescript
export type Condition = "prone" | "charmed";
```

### 2 (secondary) — conditional break on `timed` Duration

The charm ends early "until you or your allies damage it." The `timed` duration variant carries only a `DurationValue`. A break-event extension is needed:

```typescript
// Option A: add optional field on timed
| {
    readonly kind: "timed";
    readonly value: DurationValue;
    readonly breaksOn?: ReadonlyArray<DurationBreakEvent>;
  }
```

Where `DurationBreakEvent` could start with:

```typescript
export type DurationBreakEvent =
  | { readonly kind: "damage_dealt_by_caster_or_allies" };
```

This is a narrow pressure — Charm Person and Charm Monster share exactly this break condition. Animal Friendship (another charm spell) likely shares it too.

### 3 (tertiary) — contextual save advantage on `save_gate` phase

"It does so with Advantage if you or your allies are fighting it." This is a contextual modifier: the target's Wisdom save has advantage under a specific game state. There is no field on `ActivationPhase.save_gate` for this.

A possible minimal extension:

```typescript
export type SaveAdvantageCondition =
  | { readonly kind: "target_in_combat_with_caster_or_ally" };

// added to save_gate phase:
readonly targetAdvantageWhen?: SaveAdvantageCondition;
```

This is the narrowest pressure seen so far for this pattern. It may recur with other enchantment spells (Charm Person has the same clause). Defer widening until a second pressure case is confirmed.

## Atom inventory check

All atoms needed for a full encoding already exist in v4:
- `save_gate` (resolution)
- `apply_condition` (effect — needs promotion to spell Effect)
- `target` (attachment)
- `scale_target_count` (scaling)
- `spell_slot` (resource)
- `action_quota` (resource)
- `persist` / `expire` (lifecycle)

No new atoms are needed; only surface type widening.

## Recommended priority

**Widening 1 is blocking** — without `apply_condition` on `Effect`, the entire family of condition-inflicting save spells (Charm Monster, Charm Person, Hold Person, Hold Monster, Blindness/Deafness, etc.) cannot be encoded.

Widening 2 (conditional break) is high-value given how many charm spells share the "until you damage it" clause.

Widening 3 (contextual save advantage) can be deferred pending a second pressure case.
