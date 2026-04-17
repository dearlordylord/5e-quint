## Rod of Lordly Might

Outcome: `structural_widening`

### Why it does not fit honestly

`MagicItemRecord` currently allows exactly one `mechanics` payload:

- `passive`
- `activation`

`Rod of Lordly Might` is neither.

It is a stateful bundle with four distinct mechanical layers:

1. A baseline passive weapon bonus.
   Evidence: "functions as a magic Mace that grants a +3 bonus to attack rolls and damage rolls made with it."

2. Six mutually exclusive persistent button modes entered with a Bonus Action and exited by switching/toggling.
   Evidence: "You can press one of the following buttons as a Bonus Action; a button's effect lasts until you push a different button or until you push the same button again"

3. Two optional on-hit riders with their own dawn resets.
   Evidence: "When you hit a creature with a melee attack using the rod, you can force the target to make a DC 17 Constitution saving throw... Once used, this property can't be used again until the next dawn."

4. A separate action-based save ability with its own dawn reset.
   Evidence: "While holding the rod, you can take a Magic action to force each creature you can see within 30 feet of yourself to make a DC 17 Wisdom saving throw... Once used, this property can't be used again until the next dawn."

No honest encoding can collapse that into one existing family without dropping real mechanics or inventing false ones.

### Narrowest widening

This is primarily a `structural_widening`, not just an atom gap.

The surface needs one of:

- a composite magic-item mechanics container that can hold multiple independent sub-abilities, or
- a dedicated stateful mode-switch item family, plus permission for magic items to also carry passive and on-hit-trigger properties alongside it.

### Secondary gaps after the structural fix

Even after the family issue is solved, several subparts still pressure the surface:

- Button 1 emits Bright/Dim light.
  Current surface has no authored light-emission effect.

- Button 4 is a utility object transformation into an anchored climbing pole/ladder with length, load, and revert conditions.
  This is not representable with current magic-item mechanics.

- Button 6 provides directional/elevation information.
  That is informational utility rather than a current surfaced mechanical atom.

- Drain Life and Paralyze want a magic-item-owned `on_hit_trigger` family or equivalent composition path.

### Why no placeholder content file was written

Any attempted `content/magic_item_rod_of_lordly_might.dhall` would have to lie by:

- pretending the item is only passive,
- pretending the item is only one activation,
- or dropping the mutually exclusive button-state system and on-hit properties.

That would produce a misleading trace, which the task explicitly forbids.
