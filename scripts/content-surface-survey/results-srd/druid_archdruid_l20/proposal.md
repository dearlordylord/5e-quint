# Proposal: Archdruid (druid L20) — `structural_widening`

## Unit overview

The Archdruid feature bundles three sub-features, each of which hits a different gap in the current surface:

| Sub-feature | Gap | Classification |
|---|---|---|
| Evergreen Wild Shape | No passive/triggered class-feature family | structural_widening |
| Nature Magician | No cross-resource conversion effect | atom_widening |
| Longevity | Pure narrative, no mechanical state | out-of-core |

---

## Sub-feature 1: Evergreen Wild Shape

> "Whenever you roll Initiative and have no uses of Wild Shape left, you regain one expended use of it."

### Gap

`ClassFeatureMechanics` currently has exactly one family: `activation`. That family models features the player explicitly triggers (e.g., Action Surge, Second Wind). Evergreen Wild Shape fires **automatically** when the initiative window opens — the player makes no decision, and the refund happens unconditionally (subject to the "no uses left" gate).

This is a **passive triggered** shape. The trigger is `initiative_window` (v4 atom, exists), but there is no `ClassFeatureMechanics` family that represents:

- a feature that fires on an engine event (not player activation)
- a conditional guard ("only if uses = 0")
- a partial resource refund ("regain one expended use")

### Proposed widening

**New family: `passive_trigger`** on `ClassFeatureMechanics`.

Minimal shape:

```typescript
export type PassiveTriggerMechanics = {
  readonly family: "passive_trigger";
  readonly trigger: ClassFeatureTrigger;   // new type: initiative_window | turn_start | etc.
  readonly condition?: PassiveCondition;   // new type: resource_depleted | etc.
  readonly effect: ClassFeaturePassiveEffect; // new union: refund_resource, etc.
};
```

The tracer would emit:
- `initiative_window` node (window category, v4 atom)
- `use_count` node for the Wild Shape pool
- A `refund` edge from the effect back to the use_count
- An optional `condition_check` node (resource_depleted guard)

---

## Sub-feature 2: Nature Magician

> "You can convert uses of Wild Shape into a single spell slot, with each use contributing 2 spell levels. Once you use this benefit, you can't do so again until you finish a Long Rest."

### Gap

The `activation` family can model:
- `activationCost: { kind: "free" }` ✓
- `resource: { kind: "use_count", cap: { kind: "fixed", uses: 1 } }` ✓
- `resetCadence: { kind: "long_rest" }` ✓

But the **effect** is a cross-resource conversion:
- Input: N uses of Wild Shape (chosen by player, variable)
- Output: one spell slot of level 2N

This is not `grant_extra_action` or `heal_hp`. No `ClassFeatureEffect` variant covers resource exchange, and no v4 atom covers the "convert N units of resource A into one unit of resource B at a fixed exchange rate" operation.

### Proposed widening

**New effect atom: `convert_resource`** (or `exchange_resource`).

Minimal shape in `ClassFeatureEffect`:

```typescript
export type ConvertResourceEffect = {
  readonly kind: "convert_resource";
  readonly fromResource: "wild_shape_use";    // source pool id / reference
  readonly toResource: "spell_slot";          // target resource kind
  readonly exchangeRate: number;              // 1 use = 2 spell levels
  readonly unitLabel?: string;                // "spell levels" — for tracer label
};
```

The tracer would emit:
- a `convert_resource` effect atom
- edges: `consumes` from Wild Shape `use_count` pool, `grants` to `spell_slot` resource
- a scaling node representing the variable exchange (N × 2 spell levels)

---

## Sub-feature 3: Longevity

> "For every ten years that pass, your body ages only one year."

This is pure narrative — a biological/cosmetic property of the character with no effect on any game mechanical state (HP, saves, actions, resources, conditions). It is out-of-core per ARCHITECTURE.md ("narrative description…stays out of the core atom inventory"). No encoding is proposed.

---

## Summary of required widenings

1. **`passive_trigger` family** on `ClassFeatureMechanics` — new top-level mechanics shape for engine-triggered (not player-activated) features.
2. **`ClassFeatureTrigger` type** — closed enum of engine event triggers (`initiative_window`, possibly `turn_start_window`, `rest_window`, etc.).
3. **`PassiveCondition` type** — optional guard predicates (`resource_depleted`, etc.).
4. **`convert_resource` effect** on `ClassFeatureEffect` — cross-resource exchange with fixed exchange rate and variable input count.

All four are coherent reusable mechanics concerns:
- Passive triggers appear in other classes (Barbarian Feral Instinct on initiative, Monk Perfect Focus, etc.)
- Resource conversion appears in Sorcerer Font of Magic (sorcery points ↔ spell slots)
