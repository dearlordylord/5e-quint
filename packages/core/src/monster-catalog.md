# Monster Catalog

Core owns the runtime catalog for named monster stat blocks.

- Default source of truth: `.references/srd-5.2.1/`.
- SRD is provenance. 5e-tools is useful structured input and normalization inspiration, but it is never provenance.
- Non-SRD corpora require explicit owner approval before they become catalog inputs.
- Structured third-party corpora can be used to help normalize or cross-check SRD-backed data, but shipped SRD records must still cite SRD provenance directly.
- MCP and other adapters must reference catalog IDs rather than restating RAW numbers in their own registries.
- Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Current scope:

- Goblin records are authored in canonical SRD-facing sections: `traits`, `actions`, `bonusActions`, `reactions`, `legendaryActions`, and `spellcasting`.
- Pseudodragon extends the same `StatBlock` path without adding a monster-specific runtime surface: its `Bite` attack projects through the existing generic battle init flow, while `Sting` remains explicit text-authored data until a later generic saving-throw-action facility exists.
- Each owned record carries explicit SRD provenance (`edition`, `document`, `section`) directly on the stat block.
- Compatibility battle surfaces such as named attacks, multiattack slots, `battleBonusActionOptions`, and `battleReactionOptions` are derived from authored sections in `monster-catalog.ts`; they are no longer primary storage on `StatBlock`.
- Goblin stat blocks continue to project generic battle bonus-action options for `Nimble Escape` (`Hide` / `Disengage`) and the generic `redirectAttack` reaction without adding goblin-specific public action names.
