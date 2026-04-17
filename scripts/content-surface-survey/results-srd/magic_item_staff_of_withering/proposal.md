# Staff of Withering

## Verdict

`Staff of Withering` does not fit the current `MagicItemRecord` mechanics families honestly.

The item is not:

- a pure `passive` grant, because nothing happens continuously;
- a normal `activation`, because the meaningful choice happens only after a quarterstaff hit lands.

Its actual shape is:

1. wield the item as a quarterstaff;
2. hit with the weapon;
3. optionally expend 1 charge in that on-hit window;
4. deal extra Necrotic damage;
5. force a fixed-DC Constitution save;
6. on failure, apply a 1-hour disadvantage rider keyed to Strength/Constitution checks and saves.

That is a weapon-hit-triggered item rider, not an action-shaped activation.

## Required widening

### Structural: magic-item on-hit rider family

The surface needs a magic-item mechanics family or shared subgraph for:

- weapon hit as the trigger;
- optional charge spend at that trigger point;
- nested rider resolution after the hit.

Evidence from the unit text:

> On a hit, it deals damage as a normal Quarterstaff, and you can expend 1 charge to deal an extra 2d10 Necrotic damage to the target and force it to make a DC 15 Constitution saving throw.

Existing pieces are close but not sufficient:

- `MagicItemMechanics` only allows `passive | activation`;
- `on_hit_trigger` exists only for `MasteryRecord`;
- `activationCost` models action/bonus/reaction/replace_attack, not post-hit optional expenditure.

### Surface: ability-based filter for ability checks

Even after the structural gap is filled, the failed-save rider still does not fit cleanly in the current `EffectAtom` surface.

Current status:

- `modify_roll_advantage.saveAbilityFilter` can express `Strength` / `Constitution` saving throws.
- `modify_roll_advantage.skillFilter` can express only named skills for ability checks.

But the item says:

> the target has Disadvantage for 1 hour on any ability check or saving throw that uses Strength or Constitution.

That includes raw Strength and Constitution checks, not just skill checks. A new ability-check ability filter is needed to encode that honestly.

## Non-blocking parts that already fit

These aspects are already representable:

- `magic_item` top-level kind;
- `rarity = rare`;
- `requiresAttunement = true`;
- charge pool of 3;
- dawn recharge of `1d3`.

Those are not enough to justify authoring a misleading placeholder record, so no `content/magic_item_staff_of_withering.dhall` was created.
