# Proposal: Dispel Magic — structural_widening

## Unit

**Dispel Magic** — 3rd-level Abjuration spell (SRD 5.2.1)

> Choose one creature, object, or magical effect within range. Any ongoing spell of level 3 or lower on the target ends. For each ongoing spell of level 4 or higher on the target, make an ability check using your spellcasting ability (DC 10 plus that spell's level). On a successful check, the spell ends.

## Why no encoding was produced

Dispel Magic is instantaneous and action-cost, which points to the `activation` family. But three independent structural gaps block an honest encoding.

---

## Gap 1 — Per-effect dynamic iteration (structural)

The spell's mechanic is *for each qualifying active spell on the target, attempt a check*. The count of attempts is determined at cast time by runtime state (how many spells of level > threshold are on the target), not at encode time.

The current `phases: ReadonlyArray<ActivationPhase>` is a fixed array authored in the JSON. There is no "iterate over runtime active effects" construct in any existing family.

**What is needed:** A new subgraph shape — something like `for_each_active_spell_matching(predicate) { resolve: ... }` — that emits a dynamic edge per qualifying effect. This is a family-level structural extension.

---

## Gap 2 — Caster-side ability check phase (surface_widening)

The resolution is a check *the caster makes*, not the target. The v4 taxonomy has `ability_check` as a resolution atom, but the surface schema's `ActivationPhase` only offers:

- `attack_roll` — caster attacks, target is passive
- `save_gate` — target makes a saving throw against caster's spell save DC

Neither models "caster makes an ability check against a DC derived from target's ongoing spell level." The direction is inverted from `save_gate`, and the DC is dynamic (per spell: 10 + that spell's level).

**What is needed:** A new `ActivationPhase` variant, e.g.:

```typescript
{
  readonly kind: "ability_check_by_caster";
  readonly ability: Ability;
  readonly dc: DcSource;   // needs new variant: { kind: "target_spell_level_dc"; base: number }
  readonly onSuccess: Effect;
  readonly onFailure: Effect;
}
```

The DC source also needs a new variant: `{ kind: "target_spell_level_dc"; base: number }` — "DC = base + the level of the spell being checked against" — which is not represented by either existing `DcSource` variant.

---

## Gap 3 — Missing `end_ongoing_effect` atom (atom_widening)

The effect of a successful check is forcibly terminating an ongoing spell on the target. No v4 atom covers this:

| Candidate atom | Why it fails |
|---|---|
| `negate_named_effect` | Requires naming a specific spell at encode time; Dispel Magic targets whatever is present at cast time |
| `expire` (lifecycle) | Describes natural expiry; not a caster-applied effect |
| `break` (lifecycle) | Ends concentration; not general spell termination |
| `suppress` (procedure) | Suspends an effect; does not terminate it |

**What is needed:** A new v4 effect atom — tentatively `end_ongoing_effect` or `dispel_effect` — that represents "the referenced active spell or magical effect is permanently ended by caster action."

---

## Summary of proposed widenings

| Kind | Name | Tier |
|---|---|---|
| `new_subgraph` | `for_each_active_effect_iteration` | structural |
| `new_variant` | `ability_check_by_caster` in `ActivationPhase` | surface |
| `new_variant` | `target_spell_level_dc` in `DcSource` | surface |
| `new_atom` | `end_ongoing_effect` | atom |

The iteration subgraph is the primary blocker and cannot be resolved by adding variants alone. A new family-level composition shape is required before Dispel Magic can be honestly encoded.

---

## Notes on scope

The auto-terminate path (spells ≤ slot level) is slightly simpler — it requires no check — but still needs `end_ongoing_effect` and a level-threshold predicate over active spells. Even that sub-mechanic does not fit cleanly into an `ActivationPhase`.

The higher-level casting rule (threshold rises with slot) would require the level threshold on the auto-terminate effect to be slot-scaling — expressible with `SlotScaling<number>` once the effect atom exists.
