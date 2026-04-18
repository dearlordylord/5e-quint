# Proposal: Deck of Illusions — atom_widening

## Summary

The Deck of Illusions fits the `activation` family (MagicItemRecord) and uses the existing `random_table` ActivationPhase for creature selection. However, the core effect — creating a persistent, insubstantial illusion of a creature — has no atom in v4 or the current TS surface. Additionally, the card-anchored lifecycle and the secondary "move illusion" action require new subgraph support.

## What Fits

| Element | Status |
|---|---|
| `activation` family (MagicItemRecord) | ✓ exists |
| `random_table` ActivationPhase with d100 outcome table | ✓ exists structurally |
| `charge_pool` resource (34 cards) | ✓ exists |
| `never` reset cadence | ✓ exists |
| `permanent_on_empty` destruction policy | ✓ exists |
| Magic action activation cost | ✓ exists |

## What Is Missing

### 1. `create_illusion` atom (new_atom)

The deck's primary effect is creating a persistent *illusory* creature. This is fundamentally distinct from `create_companion`:

- Illusion has no physical substance — objects pass through it
- It can do no harm
- It is anchored to the thrown card's location, not free-roaming
- It "looks and behaves like a real creature of its kind" only visually — no real action economy or stat block applies

Using `create_companion` would be a lie about the rule: companions are real creatures with physical substance and their own turns. The illusion here is a purely visual effect with creature-like appearance.

**Proposed atom shape:**
```typescript
{
  readonly kind: "create_illusion";
  readonly form: IllusionForm;  // creature catalog ref or drawer's own appearance
  readonly anchoredToCard: true;
  readonly insubstantial: true;
}
```

### 2. `move_illusion` atom or equivalent (new_atom)

A second Magic action (while within 120 feet and able to see the illusion) repositions the illusion within 30 feet of its card. This secondary activation modifies an already-existing illusion rather than creating anything new. No existing atom covers repositioning a persistent illusion effect.

### 3. Card-anchored illusion lifecycle (new_subgraph)

The illusion's persistence model is unusual:
- The illusion is tied to the card's physical position — if the card moves, the illusion ends
- When the illusion ends (via dispel OR card movement), the card's image disappears and the card is permanently consumed
- Each of the 34 cards tracks independently: a specific creature drawing is associated with each card, and once consumed it cannot be used again

This does not fit `expire` (timed), `dismiss` (owner-initiated), or `companion` dismissal models. The dual end condition (card moved OR dispelled) and per-card consumption tracking need new lifecycle primitives.

**SRD text:** "The illusion lasts until its card is moved or the illusion is dispelled (using a *Dispel Magic* spell or a similar effect). When the illusion ends, the image on its card disappears, and that card can't be used again."

## Authoring Path When Atoms Exist

Once `create_illusion` is added, the encoding would follow:

```
MagicItemRecord (activation family)
  activationCost: { kind: "standard_action", action: "magic" }
  resource: { kind: "charge_pool", cap: { kind: "fixed", uses: 34 }, ... }
  resetCadence: { kind: "never" }
  destruction: { kind: "permanent_on_empty" }
  phases:
    [{ kind: "random_table",
       roll: { die: 100 },
       outcomes: [
         { min: 1,  max: 3,  label: "Adult Red Dragon",  phases: [direct create_illusion(adult_red_dragon)] },
         { min: 4,  max: 6,  label: "Archmage",          phases: [direct create_illusion(archmage)] },
         ...  (33 outcome ranges)
         { min: 97, max: 100, label: "The card drawer",  phases: [direct create_illusion(self)] }
       ]
    }]
```

A secondary `composite` or additional activation part would encode the "move illusion" action.

## Classification

**`atom_widening`** — The structural family and phases mechanism exist. The gap is the missing `create_illusion` effect atom (not in v4 taxonomy) and the missing card-anchored lifecycle subgraph.

The `random_table` ActivationPhase with 33 d100 outcome ranges is structurally available; the blocker is solely that the outcome effects have no honest atom to express.
