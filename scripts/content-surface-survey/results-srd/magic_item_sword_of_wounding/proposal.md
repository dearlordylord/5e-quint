`Sword of Wounding` does not fit the current authored surface honestly.

Primary blocker: `MagicItemRecord.mechanics` only allows `passive` or `activation`. This item is neither:

- not `passive`, because its mechanics apply only when you hit with the weapon;
- not `activation`, because it does not spend an action, bonus action, reaction, use-count, or charge pool.

The natural shape is an `on_hit_trigger`-style weapon rider attached to a magic item, parallel to masteries.

Why this forces a structural widening

- The rules text is event-gated: "When you hit a creature with an attack using this magic weapon..."
- The current `on_hit_trigger` family exists only under `MasteryRecord`, not `MagicItemRecord`.
- Encoding this as a passive grant would be false, because the extra damage and rider are not always on in the sense required by `PassiveMechanics.grants`; they resolve only after a weapon hit.

Secondary gaps that remain even after the family issue

1. Fixed save DC source

- The rider says: "must succeed on a DC 15 Constitution saving throw"
- Existing `DcSource` variants are:
  - `caster_spell_save_dc`
  - `weapon_attack_dc`
  - `innate_dc`
- None represents a fixed item DC like 15.

Suggested widening:

- `new_variant`: `DcSource.fixed`
- Shape: `{ kind: "fixed", dc: 15 }`

2. Preventing HP regain

- The rider says: "be unable to regain Hit Points for 1 hour"
- The current effect surface has `heal_hp`, `maximize_healing_received`, `modify_max_hp`, and `block_max_hp_reduction`, but nothing that blocks healing / HP regain.
- This is not the same as damage, reduced max HP, or a condition in the closed condition list.

Suggested widening:

- `new_atom`: `block_hp_regain`
- Semantics: while attached, the target cannot regain HP from any source until the effect ends or the repeat save ends it.

What would fit after widening

- A magic-item mechanics family that can express an on-hit weapon rider, either by:
  - allowing `MagicItemMechanics` to include `on_hit_trigger`, or
  - adding a dedicated magic-item rider family with the same subgraph shape.
- Inside that rider:
  - on-hit extra `damage` 2d6 necrotic;
  - `save_gate` with `ability = "con"` and `dc = { kind = "fixed", dc = 15 }`;
  - on-fail ongoing effect applying `block_hp_regain`;
  - duration `1 hour`;
  - `repeatSave` at end of target turn, ending on success.
