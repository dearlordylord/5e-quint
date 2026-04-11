# Monster Catalog

Core owns the runtime catalog for named monster stat blocks.

- Default source of truth: `.references/srd-5.2.1/`.
- Non-SRD corpora require explicit owner approval before they become catalog inputs.
- 5etools and similar corpora remain research-only unless a later plan change promotes them.
- MCP and other adapters must reference catalog IDs rather than restating RAW numbers in their own registries.
- Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Current scope:

- Goblin records are authored in canonical SRD-facing sections: `traits`, `actions`, `bonusActions`, `reactions`, `legendaryActions`, and `spellcasting`.
- Each owned record carries explicit SRD provenance (`edition`, `document`, `section`) directly on the stat block.
- Compatibility battle surfaces such as named attacks, multiattack slots, `battleBonusActionOptions`, and `battleReactionOptions` are derived from authored sections in `monster-catalog.ts`; they are no longer primary storage on `StatBlock`.
- Goblin stat blocks continue to project generic battle bonus-action options for `Nimble Escape` (`Hide` / `Disengage`) and the generic `redirectAttack` reaction without adding goblin-specific public action names.
