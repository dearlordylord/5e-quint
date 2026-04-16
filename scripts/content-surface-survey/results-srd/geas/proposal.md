# Proposal: Geas — surface_widening

## Unit

**Geas** — Level 5 Enchantment, 1-minute cast, 60 ft, V only, 30 days timed (slot-scaled).

## Why it does not fit

Geas mostly fits the `activation` family with a single `save_gate` phase (WIS save, 60 ft target), but two surface shapes are missing and one secondary mechanic is DM agenda.

---

### Widening 1: `apply_condition` variant in spell `Effect`

Spell `Effect` is currently `DamageEffect | NoneEffect`. Geas applies the Charmed condition on a failed save:

> "the target must succeed on a Wisdom saving throw or have the Charmed condition for the duration"

`ActivationPhase.onFail` needs to express "apply Charmed condition." There is an `apply_condition` shape in the mastery surface (`SaveGateRiderResult`), but it is not reachable from spell `Effect`. The fix is a new variant:

```typescript
export type ApplyConditionEffect = {
  readonly kind: "apply_condition";
  readonly condition: Condition;   // requires widening Condition beyond "prone"
};

export type Effect = DamageEffect | NoneEffect | ApplyConditionEffect;
```

This also requires widening `Condition` to include `"charmed"`.

---

### Widening 2: Slot-threshold `Duration`

`Duration` supports `instantaneous`, `concentration { upTo }`, and `timed { value }`. Geas duration jumps at slot thresholds:

- L5: 30 days
- L7–8: 365 days
- L9: until ended by Remove Curse / Greater Restoration / Wish (effectively permanent / until-dispelled)

There is no slot-threshold variant of `Duration`. The fix:

```typescript
export type Duration =
  | { readonly kind: "instantaneous" }
  | { readonly kind: "concentration"; readonly upTo: DurationValue }
  | { readonly kind: "timed"; readonly value: DurationValue }
  | {
      readonly kind: "slot_threshold";
      readonly base: DurationValue;
      readonly tiers: ReadonlyArray<{
        readonly atSlotLevel: number;
        readonly value: DurationValue | { readonly kind: "until_dispelled" };
      }>;
    };
```

The L9 "lasts until ended by named spells" also introduces a new `DurationValue` concept — "permanent until dispelled by specific spell" — which currently has no representation. This is a secondary surface gap.

---

### DM-agenda component: conditional compliance damage

Even after both widenings above, the ongoing enforcement mechanic cannot be encoded:

> "the creature takes 5d10 Psychic damage if it acts in a manner directly counter to your command. It takes this damage no more than once each day."

The trigger "acts in a manner directly counter to your command" requires DM judgment to evaluate. It is not a deterministic game event (unlike Hunter's Mark's "attack roll hit against marked creature"). The per-day cap and the compliance evaluation are entirely DM-owned. This piece stays out of core.

The spell's initial save gate (WIS save → Charmed) is deterministic and modelable. The compliance-enforcement rider is not. This is a hybrid unit: deterministic cast + DM-agenda ongoing enforcement.

---

## Proposed encoding (after widenings)

If the two widenings above are accepted, Geas would encode as:

```
activation spell:
  save_gate phase (WIS, caster spell save DC, target 1 at 60 ft)
    onFail:  apply_condition(charmed)   [needs widening 1]
    onSuccess: none
  duration: slot_threshold             [needs widening 2]
    base: 30 days
    tier L7: 365 days
    tier L9: until_dispelled
```

The ongoing 5d10-if-counter-command rider would remain unencodable — caller-owned DM agenda, noted in description only.
