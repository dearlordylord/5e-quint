# In peace a character, in combat a creature; Quint owns semantics, runtime projects one way

A player character and a battle combatant are related but not the same domain. Character creation chooses and validates authored sheet facts; combat consumes a projection of those facts. The repo therefore keeps three distinct authored domains and one shared combat abstraction: a **character sheet** is the PC-authored record, a **stat block** is the monster-authored record (see ADR-0003), and **Creature** is the shared combat abstraction both project into one way. The governing rule is "in peace you're a character; in combat you're a creature": outside combat the canonical player-facing object is a character; entering runtime projects character facts into creature-facing execution facts; combat never becomes the owner of character-creation facts.

Quint owns the creation and advancement semantics; TypeScript is the adapter/runtime implementation and the parity guardrail. The landed shape splits the work across `@dnd/character-creation-runtime` (drafts, holes, batch fills, finalization, the finalized `CharacterBuild`), `@dnd/character-sheet-runtime` (finalized sheet semantics and rest/resource derivations), and `@dnd/character-battle-runtime` (one-way projection into battle-owned creature initialization). Creation models incompleteness as first-class **holes/fills/discovery**, kept distinct from **advancement**; a higher-level start is level-1 creation followed by repeated legal advancement transitions, not a separate product. MCP and the app are downstream consumers of stored canonical draft/sheet records (see `packages/mcp/src/character-tools.ts`), never parallel owners. See ARCHITECTURE.md "Runtime Boundaries" for the standing statement of this boundary.

## Considered options

- **Put character creation into `battle.qnt` / make battle initialization the character builder** — rejected; it conflates two domains and makes battle state the owner of creation facts such as background, languages, alignment, and loadout.
- **A second TypeScript rules engine parallel to Quint** — rejected; two sources of truth for the same rules drift, and the repo already owns the full stack, so the spec can change to serve the runtime instead.
- **Flatten PC and monster into one authored type** — rejected; it breaks the ubiquitous language (a character sheet is not a stat block) even though both project into Creature.
- **An MCP-owned alternate character schema** — rejected; the adapter would become a parallel owner. MCP stores canonical `CharacterDraft`/`CharacterSheet` shapes and calls core-owned operations.
- **Preview-before-commit as the editability model** — rejected/superseded; see Refinement below.

## Consequences

- Incompleteness (open required choices / holes) and illegality (validation issues) are distinct at the result boundary, not conflated into one "invalid" state.
- New character semantics land in Quint first; TypeScript, MCP, and the app follow as parity-checked adapters. Parity targets the handoff operators (sheet↔draft reconstruction, legality, advancement, character-creature projection), not only end results.
- Projection is one-way: finalized sheet → creature-facing projection → battle init. Battle may retain origin data (selected Unit refs, resolved Surface records) for later act discovery or replay, but that is not authored ownership.

## Refinement: editability shipped as holes/fills, not preview/commit

The original character PRDs proposed a mandatory `previewCharacterDraftUpdate()` / `previewCharacterSheetAdvancement()` "preview-of-loss before commit" boundary. That design did not ship. The implementation instead made incompleteness first-class through holes, batch fills, and discovery, so an edit's consequences are expressed as the resulting open holes and validation issues rather than as a separate preview diff. Treat preview-before-commit as superseded, not pending.
