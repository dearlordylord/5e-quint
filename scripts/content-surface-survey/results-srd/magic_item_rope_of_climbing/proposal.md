## Rope of Climbing

Verdict: `structural_widening`

`Rope of Climbing` does not fit the current `MagicItemRecord` honestly because the item combines multiple independent mechanic families at once:

- an activated commandable behavior: "you can take a Magic action to command the other end of the rope to animate and move toward a destination you choose"
- a stateful mode change with a passive rider: "If you tell the rope to knot ... grants Advantage on ability checks made to climb using the rope"
- item-object durability and regeneration: "The rope has AC 20, HP 20 ... regains 1 Hit Point every 5 minutes ... If the rope drops to 0 Hit Points, it is destroyed"

The current surface allows `MagicItemMechanics = PassiveMechanics | ActivatedAbilityMechanics`. That forces the author to pick exactly one family. Encoding only the command behavior would omit the knotted climbing advantage and object durability. Encoding only the passive rider would omit the commanded movement. Either choice would produce a misleading trace.

### Required widening

1. `new_variant`: `MagicItemMechanics.composite`
   - Justification: this item needs both an activated ability and persistent/item-state behavior simultaneously.
   - Evidence: "you can take a Magic action to command ...", plus "If you tell the rope to knot ... grants Advantage ...", plus "The rope has AC 20, HP 20 ..."

### Likely follow-on gaps after structural widening

These are secondary; the family-composition problem blocks authoring first.

1. `new_variant`: item mode/stateful predicate for passive grants
   - Justification: the climb advantage applies only while the rope is in its knotted mode, not always.
   - Evidence: "While knotted, the rope shortens to a 50-foot length and grants Advantage on ability checks made to climb using the rope."

2. `new_subgraph`: commanded object movement toward a chosen destination over multiple turns
   - Justification: this is not teleportation or a companion; it is a commanded item endpoint moving 10 feet now and 10 feet at each later turn start until a destination is reached or the command stops.
   - Evidence: "That end moves 10 feet on your turn when you first command it and 10 feet at the start of each of your subsequent turns until reaching its destination or until you tell it to stop."

3. `new_variant`: item/object durability profile with timed regeneration
   - Justification: the item carries AC, HP, immunities, periodic healing, and destruction-on-0-HP. Current magic-item records only model attunement and destruction policy.
   - Evidence: "The rope has AC 20, HP 20, and Immunity to Poison and Psychic damage. It regains 1 Hit Point every 5 minutes as long as it has at least 1 Hit Point. If the rope drops to 0 Hit Points, it is destroyed."
