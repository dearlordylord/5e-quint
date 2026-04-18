`Talisman of Pure Good` does not fit the current surface honestly enough to justify an authored subset.

Why I stopped instead of authoring a partial item:

- The item's main activation, `Pure Rebuke`, cannot be represented faithfully.
- The talisman's hostile-touch rider also needs event-driven passive machinery the current magic-item surface does not have.
- Even the shared gate text is `while wearing or holding`, which the current equipment predicate grammar cannot express.

Required widenings:

1. `EffectAtom.kind = "destroy_target"` (or equivalent)
Evidence: "On a failed save, the target falls into the fissure and is destroyed, leaving no remains."
Why: this is not damage, exile, condition application, or transformation. The failed-save branch is deterministic creature destruction.

2. Event-driven magic-item contact / possession damage subgraph
Evidence: "A Fiend or an Undead that touches the talisman takes 8d6 Radiant damage and takes the damage again each time it ends its turn holding or carrying the talisman."
Why: current `PassiveMechanics` supports always-on grants, and `PassiveOperation` only supports elapsed-time cadence. This item needs:
- an initial contact trigger keyed to touching the item
- a repeated end-of-turn trigger keyed to a creature still holding/carrying the item
- target-type qualification (`Fiend` or `Undead`)

3. Equipment-predicate disjunction for `wearing OR holding`
Evidence: "You gain a +2 bonus to spell attack rolls while you wear or hold it. While wearing or holding the talisman, you can take a Magic action..."
Why: current equipment predicates have `holding_item`, `wearing_item`, and `all_of`, but no honest way to say either state qualifies.

4. Conditional disadvantage on a save by target type
Evidence: "If the target is a Fiend or an Undead, it has Disadvantage on the save."
Why: existing `save_gate` can set DCs and branches, but it cannot modify the save mode only for a closed set of target creature types.

5. Grounded-only target predicate
Evidence: "target one creature you can see on the ground within 120 feet of yourself"
Why: current targeting can filter by creature type and count, but not by positional state such as being on the ground.

Supported parts that are not the blocker:

- `magic_item` top-level kind
- attunement restriction by class list (`cleric` or `paladin`)
- passive `+2` to `spell_attack_roll`
- charge pool (`7`)
- `Magic` action activation cost
- fixed `DC 20`
- success branch `4d6 psychic`
- deterministic destruction on last charge (`permanent_on_empty`)

I did not author a `content/magic_item_talisman_of_pure_good.dhall` subset because omitting both the touch rider and the failed-save destruction branch would erase the item's defining mechanics, not a secondary rider.
