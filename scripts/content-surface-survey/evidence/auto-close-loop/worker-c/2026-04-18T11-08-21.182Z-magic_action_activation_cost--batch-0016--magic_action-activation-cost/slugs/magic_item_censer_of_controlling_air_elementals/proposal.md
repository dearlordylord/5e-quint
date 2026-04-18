## Censer of Controlling Air Elementals

Outcome: `surface_widening`

The unit fits the existing `magic_item` + `spawned_creature` family honestly, and the current surface can carry the core summon / control / duration / dawn-reset loop. The non-clean verdict comes from three omitted or underspecified details that the current surface cannot express without either dropping rules text or inventing facts.

### Missing surface shapes

1. Spawn placement rooted on the item, using nearest valid space

The current `MagicItemSpawnedCreatureMechanics` only gives a coarse `range` header. That can say `Self`, but it cannot say "the creature appears in an unoccupied space as close to the censer as possible."

Suggested widening:

- add a placement field or range-origin subshape for spawned-creature mechanics that can express nearest-valid-space placement relative to the item / source object.

Evidence:

> "The elemental appears in an unoccupied space as close to the censer as possible"

2. Catalog-ref summon cannot override understood languages

`SpawnedCreatureStatBlock.kind = "catalog_ref"` only names the referenced creature. It cannot add the rider that the summoned elemental understands the user's languages.

Suggested widening:

- widen `SpawnedCreatureStatBlock.catalog_ref` with bounded summon-time overrides such as `languages`.

Evidence:

> "understands your languages"

3. `CreatureControl` requires facts the item text does not provide

The item says the elemental obeys your commands and acts immediately after you, but it does not specify a command range or what the elemental does if you do not command it. The current `CreatureControl` shape requires both `commandRangeFeet` and `defaultBehavior`, so the encoding had to use conservative placeholders (`0`, `"dodge_and_avoid"`).

Suggested widening:

- make `commandRangeFeet` optional for commandable companions when the text gives no range;
- make `defaultBehavior` optional when the source text does not define an uncommanded fallback.

Evidence:

> "obeys your commands, and takes its turn immediately after you on your Initiative count"

### What encoded cleanly

- `magic_item` record kind
- `spawned_creature` mechanics family
- `holding_item` activation gate via "gently swinging this censer"
- `Magic action` activation cost
- `use_count` resource with `dawn` reset
- `timed` 1-hour duration
- `catalog_ref` creature identity for `Air Elemental`
- shared initiative with `immediately_after_caster`
- bonus-action dismissal
