# Units: Classes And Features

Pass 1 inventory for first-class class and subclass units extracted from the PHB class chapter.

Class count: 12
Subclass count: 48

Important note:

- the book spine exposes classes and subclasses cleanly;
- feature subunits are not exposed as cleanly in `book-xphb.json` as spells or feats;
- this file is still the canonical home for those future feature units once the deeper extraction pass is done.

## Barbarian

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: first-class unit only in Pass 1; class feature subunits deferred to a deeper extraction pass.

## Bard

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: first-class unit only in Pass 1; class feature subunits deferred to a deeper extraction pass.

## Cleric

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: representative feature tranche promoted below; full class-feature coverage still deferred.

Representative promoted feature subunits:

- `Cleric > Channel Divinity > Divine Spark`
  - Kind: `class-feature-option`
  - Provenance: `srd-overlap`
  - Level gate: `2`
  - PHB location: `Chapter 3 > Character Classes > Cleric`
  - Notes: shared-pool Channel Divinity option; representative of heal-or-harm mode choice and scaling option payloads.

- `Cleric > Turn Undead`
  - Kind: `class-feature-option`
  - Provenance: `srd-overlap`
  - Level gate: `2`
  - PHB location: `Chapter 3 > Character Classes > Cleric`
  - Notes: representative of action-bound typed condition bundle with early-end cleanup.

## Druid

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: first-class unit only in Pass 1; class feature subunits deferred to a deeper extraction pass.

## Fighter

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: representative feature tranche promoted below; full class-feature coverage still deferred.

Representative promoted feature subunits:

- `Fighter > Second Wind`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `1`
  - PHB location: `Chapter 3 > Character Classes > Fighter`
  - Notes: representative pooled self-heal with partial short-rest recharge and level-scaled uses.

- `Fighter > Action Surge`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `2`
  - PHB location: `Chapter 3 > Character Classes > Fighter`
  - Notes: representative action-economy expansion with explicit `Magic` exclusion and per-turn fence at higher levels.

- `Fighter > Tactical Master`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `9`
  - PHB location: `Chapter 3 > Character Classes > Fighter`
  - Notes: representative cross-family rewrite that substitutes mastery payloads on a qualifying attack.

## Monk

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: representative feature tranche promoted below; full class-feature coverage still deferred.

Representative promoted feature subunits:

- `Monk > Monk's Focus`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `2`
  - PHB location: `Chapter 3 > Character Classes > Monk`
  - Notes: representative named resource pool with shared option registry and class-local save DC.

- `Monk > Stunning Strike`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `5`
  - PHB location: `Chapter 3 > Character Classes > Monk`
  - Notes: representative pool-spending on-hit rider with failure/success split and start-of-next-turn boundary.

## Paladin

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: first-class unit only in Pass 1; class feature subunits deferred to a deeper extraction pass.

## Ranger

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: first-class unit only in Pass 1; class feature subunits deferred to a deeper extraction pass.

## Rogue

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: representative feature tranche promoted below; full class-feature coverage still deferred.

Representative promoted feature subunits:

- `Rogue > Sneak Attack`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `1`
  - PHB location: `Chapter 3 > Character Classes > Rogue`
  - Notes: representative once-per-turn on-hit rider with relation/advantage gating and level-scaled damage.

- `Rogue > Cunning Strike`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `5`
  - PHB location: `Chapter 3 > Character Classes > Rogue`
  - Notes: representative rider menu that spends Sneak Attack dice as an internal die-cost currency.

## Sorcerer

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: first-class unit only in Pass 1; class feature subunits deferred to a deeper extraction pass.

## Warlock

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: representative feature tranche promoted below; full class-feature coverage still deferred.

Representative promoted feature subunits:

- `Warlock > Eldritch Invocation`
  - Kind: `class-feature-system`
  - Provenance: `srd-overlap`
  - Level gate: `1`
  - PHB location: `Chapter 3 > Character Classes > Warlock`
  - Notes: representative typed option registry with prerequisites, replacement constraints, and repeatable-with-different-choice rules.

- `Warlock > Magical Cunning`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `2`
  - PHB location: `Chapter 3 > Character Classes > Warlock`
  - Notes: representative non-rest ritual recharge that partially restores Pact Magic slots.

## Wizard

- Kind: `class`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes`
- Notes: representative feature tranche promoted below; full class-feature coverage still deferred.

Representative promoted feature subunits:

- `Wizard > Memorize Spell`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `5`
  - PHB location: `Chapter 3 > Character Classes > Wizard`
  - Notes: representative short-rest prepared-spell replacement feature tied to spellbook ownership.

- `Wizard > Spell Mastery`
  - Kind: `class-feature`
  - Provenance: `srd-overlap`
  - Level gate: `18`
  - PHB location: `Chapter 3 > Character Classes > Wizard`
  - Notes: representative always-prepared plus no-slot cast feature with long-rest replacement.

## Berserker

- Kind: `subclass`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes > Barbarian`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Wild Heart

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Barbarian`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## World Tree

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Barbarian`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Zealot

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Barbarian`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Dance

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Bard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Glamour

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Bard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Lore

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Bard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Valor

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Bard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Life

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Cleric`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Light

- Kind: `subclass`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes > Cleric`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Trickery

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Cleric`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## War

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Cleric`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Land

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Druid`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Moon

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Druid`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Sea

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Druid`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Stars

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Druid`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Battle Master

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Fighter`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Champion

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Fighter`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Eldritch Knight

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Fighter`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Psi Warrior

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Fighter`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Mercy

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Monk`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Shadow

- Kind: `subclass`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes > Monk`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Elements

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Monk`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Open Hand

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Monk`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Devotion

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Paladin`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Glory

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Paladin`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Vengeance

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Paladin`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Ancients

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Paladin`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Beast Master

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Ranger`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Fey Wanderer

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Ranger`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Gloom Stalker

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Ranger`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Hunter

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Ranger`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Arcane Trickster

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Rogue`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Assassin

- Kind: `subclass`
- Provenance: `srd-overlap`
- PHB location: `Chapter 3 > Character Classes > Rogue`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Soulknife

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Rogue`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Thief

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Rogue`
- Notes: representative subclass-feature tranche promoted below; full subclass-feature coverage still deferred.

Representative promoted feature subunits:

- `Rogue > Thief > Use Magic Device`
  - Kind: `subclass-feature`
  - Provenance: `srd-overlap`
  - Level gate: `13`
  - PHB location: `Chapter 3 > Character Classes > Rogue > Thief`
  - Notes: representative cross-family rewrite of attunement cap, charge spending, and spell-scroll use.

## Aberrant

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Sorcerer`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Clockwork

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Sorcerer`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Draconic

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Sorcerer`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Wild Magic

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Sorcerer`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Archfey

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Warlock`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Celestial

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Warlock`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Fiend

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Warlock`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Great Old One

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Warlock`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Abjurer

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Wizard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Diviner

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Wizard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Evoker

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Wizard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.

## Illusionist

- Kind: `subclass`
- Provenance: `phb-only`
- PHB location: `Chapter 3 > Character Classes > Wizard`
- Notes: first-class unit only in Pass 1; subclass feature subunits deferred to a deeper extraction pass.
