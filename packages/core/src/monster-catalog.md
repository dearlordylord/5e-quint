# Monster Catalog

Core owns the runtime catalog for named monster stat blocks.

- Default source of truth: `.references/srd-5.2.1/`.
- SRD is provenance. 5e-tools is useful structured input and normalization inspiration, but it is never provenance.
- Non-SRD corpora require explicit owner approval before they become catalog inputs.
- Structured third-party corpora can be used to help normalize or cross-check SRD-backed data, but shipped SRD records must still cite SRD provenance directly.
- MCP and other adapters must reference catalog IDs rather than restating RAW numbers in their own registries.
- Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Current scope:

- The hand-authored SRD dataset currently includes `Goblin Minion`, `Goblin Warrior`, `Goblin Boss`, `Pseudodragon`, `Centaur Trooper`, `Knight`, `Kobold Warrior`, `Mage`, `Ogre`, `Priest`, `Sahuagin Warrior`, and `Scout`.
- Goblin records are authored in canonical SRD-facing sections: `traits`, `actions`, `bonusActions`, `reactions`, and `legendaryActions`.
- Pseudodragon extends the same `StatBlock` path without adding a monster-specific runtime surface: its `Bite` attack projects through the existing generic battle init flow, while `Sting` remains explicit text-authored data until a later generic saving-throw-action facility exists.
- Centaur Trooper extends the path with authored `rechargeAbilities`: battle init/start-turn now read recharge availability and minimum d6 thresholds generically from stat-block data, while unsupported `Trampling Charge` resolution remains explicit text-authored data.
- `Mage` and `Priest` prove that spellcasting now lives directly inside authored action-economy sections instead of an unused parallel stat-block field.
- `packages/core/src/monster-catalog-audit.ts` provides the code-derived unsupported-pattern audit for text-only abilities and structured spellcasting entries that still need generic runtime support.
- Each owned record carries explicit SRD provenance (`edition`, `document`, `section`) directly on the stat block.
- Compatibility battle surfaces such as named attacks, multiattack slots, `battleBonusActionOptions`, and `battleReactionOptions` are derived from authored sections in `monster-catalog.ts`; they are no longer primary storage on `StatBlock`.
- Goblin stat blocks continue to project generic battle bonus-action options for `Nimble Escape` (`Hide` / `Disengage`) and the generic `redirectAttack` reaction without adding goblin-specific public action names.
