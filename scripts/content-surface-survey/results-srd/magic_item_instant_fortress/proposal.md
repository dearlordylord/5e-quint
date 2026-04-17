## Instant Fortress

Outcome: `surface_widening`

`Instant Fortress` does fit the existing top-level `magic_item` kind, but not honestly within the current authored surface.

Why it does not fit cleanly:

- The item is activated repeatedly by command word with no uses, charges, or rest reset.
- The main payload is deployment of a persistent tower object into the world, not a creature-facing buff or a spell-access grant.
- The revert action is conditional: it only works if the tower is empty.
- A secondary Bonus Action command targets the created door/object state, not the wielder or a creature target.

Required widenings:

1. `ActivatedAbilityMechanics` needs a no-resource activation shape.
   Evidence:
   `"As a Magic action, you can ... cause it to grow ... Repeating the command word causes the tower to revert..."`

2. `Attachment` needs an `object` variant.
   Evidence:
   `"square adamantine tower"`

3. `EffectAtom` needs `create_object` in the authored surface.
   This already exists in v4 taxonomy, so this is a surface catch-up, not a new taxonomy atom.
   Evidence:
   `"cause it to grow rapidly into a square adamantine tower"`

4. Activated abilities need a precondition / guard shape for stateful object operations.
   Evidence:
   `"which works only if the tower is empty"`

Why I did not force a placeholder encoding:

- `alter_item_kind` is too weak and misleading here. The item does not merely change kind; it deploys a persistent, damageable structure with occupancy and door-command state.
- Encoding it as charge-based or limited-use would be false.
- Encoding the tower as a creature-target or area-only effect would produce a misleading trace.

Secondary mechanics not reached because the primary shape already fails:

- push creatures and unattended objects clear of the footprint;
- door opens only on your Bonus Action command;
- immunity to `Knock` and similar magic;
- persistent damage state and `Wish`-only repair.
