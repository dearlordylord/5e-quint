# Lane A - Character Creation Level 1-2

Goal: implement a cleanroom Rust character-creation core for level 1-2 using
only `input/**`.

Primary inputs:

- `input/packages/character-creation-runtime/character-creation-runtime-slice.qnt`
- `input/packages/character-creation-runtime/character-creation-runtime.mbt.qnt`
- `input/.references/srd-5.2.1/Character-Creation.md`
- `input/.references/srd-5.2.1/Character-Origins.md`
- `input/.references/srd-5.2.1/Classes/*.md`
- `input/.references/srd-5.2.1/Equipment.md`
- `input/UBIQUITOUS_LANGUAGE.md`
- `input/ASSUMPTIONS.md`

Write scope:

- `engine/src/character_creation.rs`
- `engine/src/types.rs` only for shared character/battle domain types
- `engine/tests/character_creation_*.rs`
- `tasks/CLEANROOM_RESEARCH_LOG.md`

Tasks:

1. Implement the draft/hole/fill protocol from the QNT slice.
2. Implement accepted/rejected batch behavior, including stale revision and
   atomic rejection.
3. Implement finalization for at least one level-1 and one level-2 build path.
4. Add Rust tests that mirror QNT slice tests without reading TS tests.
5. Record any missing QNT/RAW facts needed for broader level 1-2 creation.
