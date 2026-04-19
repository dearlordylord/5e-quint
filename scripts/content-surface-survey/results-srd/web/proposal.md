# Proposal: Web surface gaps

**Unit:** Web (spell, level 2, conjuration, SRD 5.2.1)
**Outcome:** `surface_widening`

## What encodes cleanly

- `ongoing_effect` family with area attachment (20-ft cube, point within range, concentration up to 1 hour)
- `area_is_difficult_terrain` (passive operation) — the webs create Difficult Terrain
- `on_creature_enters_area` → `save_gate` (Dex vs spell save DC) → `apply_condition restrained` — first-time-enter save
- `on_attached_turn_start` → `save_gate` (Dex vs spell save DC) → `apply_condition restrained` — turn-start save

Typecheck and tracer both pass cleanly.

## Gap 1: Escape mechanic (surface_widening — primary)

**RAW:** "A creature Restrained by the webs can take an action to make a Strength (Athletics) check against your spell save DC. If it succeeds, it is no longer Restrained."

**Gap:** There is no `OngoingTrigger` variant for "the attached (restrained) creature spends an Action." The existing `on_caster_spends_action` trigger is caster-scoped; it does not model the *target* creature spending its action economy.

**Proposed widening:** New `OngoingTrigger` variant:

```typescript
| {
    readonly kind: "on_attached_creature_spends_action";
    readonly cost: { readonly kind: "standard_action"; readonly action: StandardActionKind };
  }
```

With this, the escape operation would be:
```typescript
{
  trigger: { kind: "on_attached_creature_spends_action", cost: { kind: "standard_action", action: "utilize" } },
  effect: {
    kind: "ability_check_gate",
    ability: "str",
    dc: { kind: "caster_spell_save_dc" },
    onPass: { kind: "remove_condition", condition: "restrained" },
  }
}
```

Note: the escape is conditioned on the creature being Restrained, but `OngoingPredicate` only supports `at_hp_threshold` today. A `condition_active` predicate variant (analogous to `PassiveSuppressor.conditions`) would also be needed to gate the trigger correctly, but this is a secondary gap.

## Gap 2: "First time on a turn" deduplication

**RAW:** "The first time a creature enters the webs on a turn or starts its turn there, it must succeed on a Dexterity saving throw."

**Gap:** Two triggers (`on_creature_enters_area` + `on_attached_turn_start`) approximate this rule. However, the "first time on a turn" guard — preventing double-trigger if a creature exits and re-enters the area in the same turn — has no `OngoingPredicate` counterpart.

**Proposed widening:** New `OngoingPredicate` variant:
```typescript
| { readonly kind: "first_time_this_turn" }
```
or, alternatively, a `count` field on `OngoingOperation` analogous to the `count` field on `modify_roll_advantage` effect atoms.

This is a lower-priority gap since the double-trigger case is rare in normal play.

## Gap 3: Lightly Obscured (atom_widening)

**RAW:** "the area within them is Lightly Obscured"

**Gap:** No `EffectAtom` exists for area-level obscurement. `area_is_difficult_terrain` handles movement cost; no parallel atom handles visibility reduction. Lightly Obscured has a concrete mechanical consequence (Wisdom (Perception) checks to see into/through the area have Disadvantage per SRD Rules Glossary).

**Proposed widening:** New `EffectAtom`:
```typescript
| { readonly kind: "area_is_lightly_obscured" }
```
Paired with a potential `area_is_heavily_obscured` for completeness (Cloudkill and Fog Cloud both create Heavily Obscured areas currently noted as DM agenda).

## Omitted as DM agenda (not proposed for encoding)

- **Fire damage:** "Any 5-foot Cube of webs exposed to fire burns away in 1 round, dealing 2d4 Fire damage." Fire exposure requires a DM/environment-resolved trigger (what constitutes fire contact, how sections burn, etc.). This is caller-owned spatial agenda.
- **Web collapse:** "If the webs aren't anchored between two solid masses… the web collapses." Physical anchoring is a DM geometry judgment; no deterministic trigger exists.
