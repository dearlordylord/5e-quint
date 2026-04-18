`Censer of Controlling Air Elementals` fits the existing `magic_item` + `spawned_creature` family, but not cleanly.

Needed surface widenings:

1. `MagicItemSpawnedCreatureMechanics` / `SpawnedCreaturePayload` needs a summon-placement shape beyond coarse `range`.
Evidence: "The elemental appears in an unoccupied space as close to the censer as possible."
Why: the current surface can only say `range: self | touch | point`, which forced a placeholder `range = self` and lost the nearest-valid-space rule rooted on the item.

2. Catalog-ref summoned creatures need a way to carry summon-time language overrides.
Evidence: "understands your languages"
Why: `SpawnedCreatureStatBlock.kind = "catalog_ref"` only carries `monsterId` and `displayName`; there is no place to express rules text that changes the summoned creature's language comprehension without replacing the whole stat block inline.

3. `CreatureControl.commandRangeFeet` needs an honest "unspecified / unlimited by text" shape.
Evidence: "obeys your commands"
Why: the item defines that commands work, but gives no distance limit. The current surface requires a finite numeric range, which forced the placeholder `commandRangeFeet = 0` in the authored unit and produced a misleading trace.

The rest of the item fits the current surface: held-item activation, Magic action cost, once-per-dawn recharge, shared initiative immediately after the user, and disappearance on 1 hour / 0 HP / bonus-action dismissal.
