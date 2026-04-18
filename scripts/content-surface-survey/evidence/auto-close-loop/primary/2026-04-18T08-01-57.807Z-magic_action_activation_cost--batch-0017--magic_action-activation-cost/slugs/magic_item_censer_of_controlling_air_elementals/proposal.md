## Censer of Controlling Air Elementals

Outcome: `structural_widening`

### Why it does not fit honestly

The unit is a `magic_item`, and that top-level kind already exists. The problem is the mechanics family:

- the item is activated with a `Magic` action;
- the activation creates a controlled companion;
- that companion has deterministic control semantics:
  - appears in an unoccupied space as close to the censer as possible;
  - understands your languages;
  - obeys your commands;
  - acts immediately after you on your Initiative count;
  - disappears after 1 hour, at 0 HP, or when dismissed as a Bonus Action;
- the item itself has a recharge cadence: unusable again until next dawn.

The current surface can express the recharge side on a magic item (`activation` + `resetCadence.dawn`), and it can express summoned-companion payloads on spells (`spawned_creature`, `reanimated_creature`). What it cannot do is combine those honestly on a magic item:

- `MagicItemMechanics` does not include `spawned_creature`;
- `MagicItemMechanics` does not include `reanimated_creature`;
- `ActivatedAbilityMechanics` for non-spell units only runs `ActivationPhase`s, and `ActivationPhase` has no companion-creation phase;
- `EffectAtom` also does not expose `create_companion` / `command_companion`, so the summon cannot be smuggled through a direct phase without inventing unsupported JSON.

Encoding this as `grant_spell_access` would be false, because the item text does not say it casts a named spell. Encoding it as a plain `activation` with no summon payload would omit the unit's core mechanic.

### Narrowest honest widening

Add a new magic-item-capable summoned-companion mechanics variant. Two plausible shapes:

1. Widen `MagicItemMechanics` to admit the existing companion families used by spells.
2. Extract a shared non-spell/spell companion payload family that both spells and magic items can reference.

Either shape must carry:

- activation cost: `standard_action.magic`;
- recharge: `elapsed until next dawn` or existing dawn-style reset;
- summon placement near the item;
- command semantics;
- initiative ordering immediately after the wielder;
- dismissal semantics, including `bonus_action` manual dismiss.

### Evidence

> While gently swinging this censer, you can take a Magic action to summon an Air Elemental.

> The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count.

> The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.

> The censer can't be used this way again until the next dawn.
