# Lane B - Battle Core Level 1-2

Goal: implement a cleanroom Rust battle core for level 1-2 reducer semantics
using only `input/**`.

Primary inputs:

- `input/cleanroom-input-manifest.json`
- semantic-core QNT paths listed under battle obligations
- `input/.references/srd-5.2.1/Playing-the-Game.md`
- `input/.references/srd-5.2.1/Rules-Glossary.md`
- `input/.references/srd-5.2.1/Spells/*.md`
- `input/.references/srd-5.2.1/Classes/*.md`
- `input/UBIQUITOUS_LANGUAGE.md`
- `input/ASSUMPTIONS.md`

Write scope:

- `engine/src/battle.rs`
- `engine/src/types.rs` only for shared character/battle domain types
- `engine/tests/battle_*.rs`
- `tasks/CLEANROOM_RESEARCH_LOG.md`

Tasks:

1. Implement hit point damage/recovery and zero-HP lifecycle first.
2. Implement attack damage composition and damage adjustments.
3. Implement action/resource/reaction primitives needed by level 1-2 battle.
4. Implement table-owned witness inputs explicitly for spatial/player-choice
   facts.
5. Add Rust tests for each implemented semantic-core slice.
