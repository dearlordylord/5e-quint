# Monster Catalog

Core owns the runtime catalog for named monster stat blocks.

- Default source of truth: `.references/srd-5.2.1/`.
- Non-SRD corpora require explicit owner approval before they become catalog inputs.
- 5etools and similar corpora remain research-only unless a later plan change promotes them.
- MCP and other adapters must reference catalog IDs rather than restating RAW numbers in their own registries.
- Existing named stat blocks in `creature.qnt` remain MBT/proof fixtures unless a later task explicitly unifies Quint with the runtime catalog.

Current scope:

- `goblinMinion` is the first runtime catalog entry, sourced from `.references/srd-5.2.1/Monsters/Monsters-E-G.md`.
- Goblin Warrior and Goblin Boss are internal-only SRD stat blocks for named-attack metadata. They are not exposed as public catalog IDs until the follow-up goblin tasks land.
- Goblin stat blocks now project generic battle bonus-action options for `Nimble Escape` (`Hide` / `Disengage`) without adding goblin-specific public action names.
