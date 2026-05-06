# Monster Catalog

Core owns the runtime catalog for named monster stat blocks.

- Default source of truth: `.references/srd-5.2.1/`.
- SRD is provenance. 5e-tools is useful structured input and normalization inspiration, but it is never provenance.
- Non-SRD corpora require explicit owner approval before they become catalog inputs.
- Structured third-party corpora can be used to help normalize or cross-check SRD-backed data, but shipped SRD records must still cite SRD provenance directly.
- MCP and other adapters must reference catalog IDs rather than restating RAW numbers in their own registries.
- Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Current scope:

- The hand-authored SRD dataset currently includes `Bandit`, `Bandit Captain`, `Berserker`, `Commoner`, `Cultist`, `Cultist Fanatic`, `Gladiator`, `Goblin Minion`, `Goblin Warrior`, `Goblin Boss`, `Guard`, `Guard Captain`, `Harpy`, `Knight`, `Kobold Warrior`, `Mage`, `Noble`, `Ogre`, `Pirate`, `Pirate Captain`, `Priest`, `Pseudodragon`, `Sahuagin Warrior`, `Scout`, `Spy`, `Tough`, `Tough Boss`, `Warrior Infantry`, and `Warrior Veteran`.
- Goblin records are authored in canonical SRD-facing sections: `traits`, `actions`, `bonusActions`, `reactions`, and `legendaryActions`.
- Compatible stock-weapon attacks project through the shared SRD equipment weapon table by their canonical authored attack names, so the stat block keeps one source of weapon identity.
- Goblin tracer-bullet traceability: `.references/srd-5.2.1/Monsters/Monsters-E-G.md` (`Goblins > Goblin Minion`, `Goblin Warrior`, `Goblin Boss`) and `UBIQUITOUS_LANGUAGE.md` terms `Stat Block`, `Creature`, `Attack Roll`, `Bonus Action`, and `Reaction`.
- Harpy extends the same `StatBlock` path with one executable attack and one unsupported text-only action: `Claw` projects through the generic battle init/add path from authored natural-weapon metadata on the attack itself, while `Luring Song` stays explicit authored text until a later generic concentration/charm execution surface exists.
- Pseudodragon extends the same `StatBlock` path without adding a monster-specific runtime surface: `Magic Resistance` now projects as a generic save-modifier trait through battle init/save resolution, `Bite` projects through the existing generic battle init flow, and `Sting` remains explicit text-authored data until a later generic saving-throw-action facility exists.
- Centaur Trooper now proves the first generic movement-owned traversal lane: authored recharge metadata still owns availability, and `Trampling Charge` projects through the authored action-economy slot as a traversal movement action with explicit destination, movement-spend, pass-through-size, and entered-creature save facts rather than another single-target save-effect special case.
- `Mage` and `Priest` prove that spellcasting now lives directly inside authored action-economy sections instead of an unused parallel stat-block field.
- `Mage` now also proves the first advanced monster spellcasting slice: action-section `Fireball (2/Day Each)` projects through the same generic battle-owned AoE spell payload lane used by canonical spell actions, while unmodeled spell references remain explicit authored spellcasting data rather than monster-specific runtime handlers.
- The martial-humanoid slice adds the first bounded bulk SRD roster expansion without widening runtime ownership: stock-weapon attacks continue to project through the existing generic battle path, while unsupported clauses such as `Parry`, `Pack Tactics`, charm riders, poison riders, push/prone riders, and non-AoE spellcasting stay preserved as explicit text-only or structured spellcasting entries for later facility tasks.
- `packages/v0/src/monster-catalog-audit.ts` provides the code-derived unsupported-pattern report for text-only abilities and structured spellcasting entries that still need generic runtime support, including stable row fields, authored blocker-family classification on text-only abilities, SRD citations, grouped counts, and a generated markdown summary for planning review.
- Each owned record carries explicit canonical provenance (`sourceKind`, `license`, and local SRD citation) directly on the stat block; supporting structured inputs are separate metadata and are not legal canonical provenance.
- Compatibility battle surfaces such as named attacks, multiattack slots, `battleBonusActionOptions`, and `battleReactionOptions` are derived from authored sections in `monster-catalog.ts`; they are no longer primary storage on `StatBlock`.
- Goblin stat blocks continue to project generic battle bonus-action options for `Nimble Escape` (`Hide` / `Disengage`) and the generic `redirectAttack` reaction without adding goblin-specific public action names.
