# Synthesis: Do Feats And Traits Reuse The Same Surface Families?

Purpose:

- compare enriched feat and trait pilots against the spell/item pilots;
- answer whether the emerging extension surface mostly generalizes, or whether new families are being forced;
- keep the answer grounded in corpus enrichment first, competitor handling second.

Primary inputs:

- [`ENRICHED_spells_pilot.md`](./ENRICHED_spells_pilot.md)
- [`ENRICHED_equipment_magic_items_pilot.md`](./ENRICHED_equipment_magic_items_pilot.md)
- [`ENRICHED_feats_pilot.md`](./ENRICHED_feats_pilot.md)
- [`ENRICHED_species_background_traits_pilot.md`](./ENRICHED_species_background_traits_pilot.md)
- competitor cross-check notes already indexed in this workspace

## Short Answer

Mostly yes.

Feats and traits mostly reuse the same extension-surface families already visible in spells and items. They do not yet force a completely separate execution model.

What they add is:

- denser prerequisite and grant vocabulary;
- more frequent source-local mode choice;
- more combinations of small typed atoms inside one unit;
- stronger need to preserve source-root identity and provenance boundaries.

## Reused Families

### Timing / trigger families

Already visible in spells/items, reused by feats/traits:

- `Action`-bound effects
- `Bonus Action` activation
- `Reaction` activation
- on-hit rider
- on-miss rider
- post-action follow-up
- post-roll / post-test intervention

Evidence:

- `Shield`, `Counterspell`, `Light`, `Nick`
- `Boon of Dimensional Travel`, `Boon of Combat Prowess`, `Boon of Fate`
- `Dragonborn > Breath Weapon`, `Goliath > Giant Ancestry`

### Reset / quota families

Already visible, reused broadly:

- once per turn
- until start of next turn
- PB-per-long-rest
- once per long rest
- short/long rest reset
- initiative-reset

Evidence:

- spell and item pilots already showed turn-boundary and lifecycle resets
- feats/traits add more combinations rather than fundamentally new reset semantics

### Grant families

Already emerging, now clearly reinforced:

- grant spell
- grant cantrip
- grant feat
- grant temporary effect
- grant condition
- grant movement mode

Evidence:

- `Magic Initiate`
- `Acolyte > Feat`
- `Elf > Elven Lineage`
- `Dragonborn > Draconic Flight`
- `Boon of the Night Spirit`

### Cleanup / ownership families

Already visible, now reinforced:

- concentration-owned cleanup
- start/end/next-turn expiry
- manual end or voluntary end
- end on condition change
- end on action use
- end on leaving lifecycle prerequisite

Evidence:

- `Shield`
- `Polymorph`
- `Attunement`
- `Boon of the Night Spirit`
- `Dragonborn > Draconic Flight`
- `Gnome > Gnomish Lineage` created object

## Pressures That Look New Or Stronger

### 1. Prerequisite vocabulary

Feats add a stronger prerequisite layer than the spell/item pilots showed:

- level prerequisite
- ability-score prerequisite
- feature prerequisite
- category gate

This may not require a whole new execution family, but it likely requires a distinct eligibility/gating vocabulary.

### 2. Source-local choice families

Traits especially strengthen the need for source-local choice payloads:

- lineage choice
- ancestry mode choice
- spell-list choice
- repeatable feat with constrained different-choice rule

This pressure existed before, but feats/traits make it much more central.

### 3. Root-identity-coupled payloads

Traits show a stronger coupling between payload and source identity:

- ancestry/root matters to the payload family itself;
- some trait sets are not generic effects but named bundles tied to a source root.

This means the extension surface likely needs to support:

- typed payload family
- plus strong source-root identity

without flattening everything into anonymous effect atoms.

## Competitor Cross-Check Reading

This matches the better competitor lesson:

- closed vocabulary still looks right;
- item/feature-scoped payloads still look right;
- phase ownership still looks right;
- package/provenance boundaries still matter.

What the enriched feat/trait pilots do **not** support is:

- open scripting
- giant mutable hook registries
- creature-global boolean soup

## Current Working Conclusion

The current evidence suggests the future extension surface should probably separate:

- trigger/timing families
- resolution families
- reset/quota families
- grant/link families
- transform/summon/create families
- legality/gating families
- source-root choice families

Feats and traits do not overturn the spell/item direction.
They make it richer, more compositional, and more explicit about prerequisites, choices, and source identity.
