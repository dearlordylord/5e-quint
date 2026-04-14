# Monster Catalog

Core owns the runtime catalog for named monster stat blocks.

- Default source of truth: `.references/srd-5.2.1/`.
- SRD is provenance. 5e-tools is useful structured input and normalization inspiration, but it is never provenance.
- Non-SRD corpora require explicit owner approval before they become catalog inputs.
- Structured third-party corpora can be used to help normalize or cross-check SRD-backed data, but shipped SRD records must still cite SRD provenance directly.
- MCP and other adapters must reference catalog IDs rather than restating RAW numbers in their own registries.
- Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Current scope:

- The hand-authored SRD dataset currently includes `Goblin Minion`, `Goblin Warrior`, `Goblin Boss`, `Harpy`, `Pseudodragon`, `Centaur Trooper`, `Knight`, `Kobold Warrior`, `Mage`, `Ogre`, `Priest`, `Sahuagin Warrior`, and `Scout`.
- Goblin records are authored in canonical SRD-facing sections: `traits`, `actions`, `bonusActions`, `reactions`, and `legendaryActions`.
- Compatible stock-weapon attacks project through the shared SRD equipment weapon table by their canonical authored attack names, so the stat block keeps one source of weapon identity.
- Goblin tracer-bullet traceability: `.references/srd-5.2.1/Monsters/Monsters-E-G.md` (`Goblins > Goblin Minion`, `Goblin Warrior`, `Goblin Boss`) and `UBIQUITOUS_LANGUAGE.md` terms `Stat Block`, `Creature`, `Attack Roll`, `Bonus Action`, and `Reaction`.
- Harpy extends the same `StatBlock` path with one executable attack and one unsupported text-only action: `Claw` projects through the generic battle init/add path from authored natural-weapon metadata on the attack itself, while `Luring Song` stays explicit authored text until a later generic concentration/charm execution surface exists.
- Pseudodragon extends the same `StatBlock` path without adding a monster-specific runtime surface: its `Bite` attack projects through the existing generic battle init flow, while `Sting` remains explicit text-authored data until a later generic saving-throw-action facility exists.
- Centaur Trooper extends the path with authored `rechargeAbilities`: battle init/start-turn now read recharge availability and minimum d6 thresholds generically from stat-block data, while unsupported `Trampling Charge` resolution remains explicit text-authored data.
- `Mage` and `Priest` prove that spellcasting now lives directly inside authored action-economy sections instead of an unused parallel stat-block field.
- `Mage` now also proves the first advanced monster spellcasting slice: action-section `Fireball (2/Day Each)` projects through the same generic battle-owned AoE spell payload lane used by canonical spell actions, while unmodeled spell references remain explicit authored spellcasting data rather than monster-specific runtime handlers.
- `packages/core/src/monster-catalog-audit.ts` provides the code-derived unsupported-pattern audit for text-only abilities and structured spellcasting entries that still need generic runtime support.
- Each owned record carries explicit canonical provenance (`sourceKind`, `license`, and local SRD citation) directly on the stat block; supporting structured inputs are separate metadata and are not legal canonical provenance.
- Compatibility battle surfaces such as named attacks, multiattack slots, `battleBonusActionOptions`, and `battleReactionOptions` are derived from authored sections in `monster-catalog.ts`; they are no longer primary storage on `StatBlock`.
- Goblin stat blocks continue to project generic battle bonus-action options for `Nimble Escape` (`Hide` / `Disengage`) and the generic `redirectAttack` reaction without adding goblin-specific public action names.
