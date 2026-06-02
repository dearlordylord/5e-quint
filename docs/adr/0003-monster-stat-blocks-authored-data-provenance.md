# Monster Stat Blocks are authored data with explicit provenance, not per-monster code

Monsters are authored content, not engine code. The repo ships monsters as `StatBlockRecord`s owned by `@dnd/surface` (`packages/surface/src/surface/stat-block-catalog.ts`). A Stat Block is the full authored rules record the SRD places in a monster entry — traits, actions, bonus actions, reactions, legendary actions, spellcasting, resources, senses, languages — not just the numeric line. The canonical type name is `StatBlock`/`StatBlockRecord`; the `Monster` prefix is redundant because "Stat Block" is already the repo's monster-only domain term. Adding a new SRD monster should usually mean adding normalized data, not engine code.

Three layers stay separate and are never collapsed into one mutable shape: the **source record** (provenance plus any supporting structured input), the **canonical normalized stat block**, and the **one-way runtime battle projection** into creature initialization. Provenance, structured input, and runtime projection are distinct concepts (see the "Provenance and modeling discipline" rule in CLAUDE.md and "Authored Content" in ARCHITECTURE.md): SRD is provenance for shipped SRD monsters; 5e-tools is valuable structured input and normalization inspiration but is **never** provenance. The collection boundary makes mixed-provenance or mixed-license states unrepresentable, so "the SRD catalog" cannot silently hold a non-SRD record.

## Considered options

- **Per-monster TypeScript handlers (`runMonsterX()`) and monster-named MCP/UI commands** — rejected; they special-case every creature and do not scale to a full SRD corpus. Executable abilities target a closed set of generic facilities (attack, multiattack, save-effect, condition rider, forced movement, spellcast reference, bonus/reaction option, recharge gate, legendary-action menu). A new mechanic adds one generic facility that many monsters map to.
- **A second MCP- or app-owned monster registry** — rejected; it duplicates authored facts into a parallel owner. Adapters reference stat block ids or consume the one runtime projection.
- **5e-tools as provenance** — rejected; it crosses the licensing/provenance boundary. 5e-tools may appear only as supporting structured input with role `normalizationInput`/`crossCheck`.
- **A `supported`/status enum on abilities with no type or runtime consequence** — rejected; the executable-vs-text-only distinction lives in the type system (an executable ability carries an execution form; a text-only ability carries a `nonExecutableReason`), so the split is visible to both the type checker and runtime.
- **Blocking the catalog on full automation coverage** — rejected; an ability may exist as a text-only entry with an explicit reason. Rules text stays available even when execution support is absent.

## Consequences

- The first SRD dataset is hand-authored with provenance shown directly on records; some non-DRY repetition is accepted to keep provenance explicit and the dataset inspectable. Generation/import is not required, though later tooling may validate or cross-check.
- Runtime reads monsters through Surface readers, support-profile parsers, and typed procedure facts — it does not dispatch on monster names or stat block ids (ARCHITECTURE.md "Authored Content").
- A Stat Block-derived battle creature comes from the Stat Block record; it does not own Units merely because Stat Blocks may reuse shared Surface sub-shapes. Multiattack stays monster-authored data, not a fake PC-style Extra Attack.
