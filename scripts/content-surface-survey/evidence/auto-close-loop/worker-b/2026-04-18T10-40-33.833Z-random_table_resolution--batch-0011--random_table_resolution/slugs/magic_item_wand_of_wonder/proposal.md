# Wand of Wonder

`Wand of Wonder` fits the existing top-level `magic_item` kind and broadly fits the `activation` family because the item is a held, charge-based activation that resolves through a random table. I did not author `content/magic_item_wand_of_wonder.dhall`, because several table branches cannot be represented honestly with the current surface.

## Why it is not clean

1. Spell branches need cast-time overrides the surface does not expose.

The item can cast existing spells, but not in their printed shape:

- the wand picks a point within 120 feet first;
- spells originate from that chosen point;
- any spell whose range is normally shorter than 120 feet becomes 120 feet;
- `Gust of Wind` and `Lightning Bolt` instead create a line from the wielder to the chosen point.

Current `grant_spell_access` only supports `dcOverride`, `areaOverride`, `targetRestriction`, and `durationOverride`. It cannot honestly express remote-origin casting or range replacement.

2. One branch targets an unattended object, but activation attachments cannot.

The branch that sends an object into the Ethereal Plane needs an object target, not a creature target or area. `types.ts` has no `Attachment.object` or equivalent noncreature target selector in activation phases.

3. One branch spawns an uncontrolled creature.

The current summon surfaces encode companions you can command. This branch explicitly says the creature is not under your control and acts normally, so reusing the companion payload would produce a misleading trace.

4. Several direct table outcomes need their own timed persistence or repeat-save behavior.

Examples:

- stunned until the start of your next turn;
- shrink on yourself for 1 minute;
- blinded for 1 minute with repeat save;
- restrained, then petrified on a second failed save, lasting until freed by `Greater Restoration` or similar magic.

`ActivatedAbilityMechanics` has only one optional top-level `duration`, not a branch-local persistence wrapper for direct random-table outcomes.

5. One branch needs shared-pool damage distribution.

The gem-stream branch rolls a total quantity of gems and divides that total damage equally among all creatures in the line. The current surface can model per-target damage, but not one rolled pool split across multiple targets.

## Proposed widenings

- `grant_spell_access.rangeOverride` and/or explicit remote-origin override
- `Attachment.object` or equivalent noncreature target attachment
- uncontrolled spawn payload separate from commanded companions
- branch-local persistence for random-table direct outcomes
- new damage-distribution subgraph for shared-pool damage split across multiple affected creatures

## Non-blocking residue

These parts look secondary or caller-owned rather than the core blocker:

- Lightly/Heavily Obscured from rain or butterflies
- grass overgrowth
- leaves growing on a creature
- GM-random subject choice when an effect has multiple possible subjects

Those may still deserve later surface treatment, but the unit already fails honestly before reaching them.
