## Carpet of Flying

`Carpet of Flying` does not fit the current authored surface honestly, so no `content/magic_item_carpet_of_flying.dhall` was written.

### Why it does not fit

The correct top-level kind is still `magic_item`, but the current mechanics families do not model this item cleanly:

- The item is activated by taking a Magic action and speaking a command word, but it has no use-count, charge pool, or reset cadence. Current `ActivatedAbilityMechanics` requires `resource` and `resetCadence`, so any authored activation would invent a false depletion model.
- The thing being moved is the carpet itself, not the wielder or another creature. Current activation phases can attach only to `self`, `target`, `area`, or `mark`; there is no `item` / `object` attachment in the surface even though the v4 taxonomy includes those attachment atoms.
- The effect is controlled movement / hovering of that item. The current `EffectAtom` surface has `force_move`, `teleport`, and creature-speed grants, but not the v4-style plain `move` atom needed for an object that flies according to commands.

### Secondary pressure

Two additional deterministic riders would still need representation once the core shape exists:

- command range: "It moves according to your directions if you are within 30 feet of it."
- load-sensitive speed: the carpet carries up to twice its listed capacity, but its Fly Speed is halved when carrying more than its normal capacity.

The four carpet sizes can be represented as magic-item variants once the mechanics family exists, but the motion/control payload is the blocker.
