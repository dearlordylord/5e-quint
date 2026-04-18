## Censer of Controlling Air Elementals

Outcome: `structural_widening`

### Why it does not fit honestly

The unit is a `magic_item`, but its core mechanic is a summon-and-control companion workflow:

- Magic action to summon a named creature
- summoned creature obeys your commands
- shared initiative count, turn immediately after you
- disappears on timer / death / manual dismissal
- item recharges at next dawn

The existing surface already has a close family for the summon side: `spawned_creature`. But that family is only available under `SpellMechanics`; `MagicItemMechanics` does not admit it. Encoding this as a plain magic-item `activation` would be dishonest because the activation family can only run `ActivationPhase`s, and there is no `EffectAtom` that creates and controls a companion in that path.

### Specific gaps

1. Magic items need access to the summon-companion family.

Current blocker:

- `MagicItemComponentMechanics` allows only `PassiveMechanics | ActivatedAbilityMechanics | TriggeredReactionAbilityMechanics`.
- The item needs the same structure spells use for summoned creatures: stat block or monster reference, control, dismissal, initiative behavior.

Suggested widening:

- Add a magic-item summon component, or widen `MagicItemComponentMechanics` to admit the existing `spawned_creature` family.

2. Named monster summons need a catalog-ref source, not forced inline stats.

Current blocker:

- `spawned_creature` requires an inline `CreatureStatBlock`.
- This item does not provide bespoke stat-block data; it says to summon an `Air Elemental`, which is a named monster entry.

Suggested widening:

- Add a `catalog_ref` source for summoned-creature mechanics, parallel to how polymorph/reanimation can refer to external creature records.

### Evidence

> While gently swinging this censer, you can take a Magic action to summon an Air Elemental.

> The elemental appears in an unoccupied space as close to the censer as possible, understands your languages, obeys your commands, and takes its turn immediately after you on your Initiative count.

> The elemental disappears after 1 hour, when it dies, or when you dismiss it as a Bonus Action.

> The censer can't be used this way again until the next dawn.

### Why this is not just a surface-only tweak

Even if `spawned_creature` were widened to support catalog references, the current `magic_item` mechanics union still has no honest place to put that family. The top-level mechanics shape needs to widen first.
