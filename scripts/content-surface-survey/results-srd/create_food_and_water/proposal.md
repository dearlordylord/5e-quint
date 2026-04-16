# Widening Proposal: Create Food and Water

**Outcome:** `surface_widening`

## Unit

- **Name:** Create Food and Water
- **Level:** 3 Conjuration
- **Casting Time:** 1 action
- **Range:** 30 ft (point)
- **Components:** V, S
- **Duration:** Instantaneous
- **Effect:** Creates 45 lbs food + 30 gallons water at a point within range. No roll, no save.

## Why the unit does not fit

The spell is an instantaneous activation with no attack roll and no saving throw. It directly conjures physical objects at a target location.

**Gap 1 — `ActivationPhase` has no `direct` kind.**

`ActivationPhase` is currently:
```
attack_roll | save_gate
```
Every existing activation spell gates its effect behind a roll or a save. Create Food and Water fires unconditionally — the caster expends the action + slot and the food and water appear. There is no roll-gated branch. A new phase kind is needed:

```typescript
| {
    readonly kind: "direct";
    readonly attachment: Attachment;
    readonly effect: Effect;
  }
```

This maps to the v4 `activate` procedure → direct `effect` edge, with no intervening window or resolution node.

**Gap 2 — `Effect` has no `create_object` variant.**

`Effect` is currently:
```
DamageEffect | NoneEffect
```
The spell's effect is `create_object` — an atom that already exists in the v4 taxonomy (§9 Effect Atoms). A new surface variant is needed:

```typescript
export type CreateObjectEffect = {
  readonly kind: "create_object";
  readonly description: string;   // narrative hint for the trace label
};
```

The `description` field carries authoring intent ("45 lbs food + 30 gal water") without introducing a runtime agenda — the core only records that objects were created, not their exact quantities or narrative properties.

## Atom graph shape (if widening were applied)

```
spell_root → activate → action_quota
                      → spell_slot (≥3)
                      → target/area (point within 30 ft)
                      → [direct phase] → create_object
```

Relations: `roots`, `consumes`, `attaches_to`, `grants`.

## Spoilage note

The text "the food spoils after 24 hours if uneaten" is a world-state side effect, not a combat mechanic. Per `ARCHITECTURE.md` §Boundary, temporal decay of conjured objects is out-of-scope for the core atom graph.

## Scope

Both proposed widenings are new variants of existing surface types. No new top-level family or new v4 atom is required. The `activation` family name and `spell_root → activate` subgraph are unchanged.
