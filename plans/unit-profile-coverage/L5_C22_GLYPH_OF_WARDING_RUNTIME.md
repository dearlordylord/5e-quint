# L5-C22 Glyph of Warding Runtime Split

## Source Review

Task 22 was checked against `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Glyph of Warding and the spell-list rows in Bard, Cleric, and Wizard. The local ubiquitous language check used `UBIQUITOUS_LANGUAGE.md` terms for Spell Definition, Spell Invocation, Spell Effect, Concentration, Spell Slot, Saving Throw, Area of Effect, and table-owned runtime facts.

The SRD text combines several runtime domains under one durable glyph occurrence:

- a caster-selected surface or closeable-object inscription with up to a 10-foot covered area, a hidden-notice DC, table-owned cast location, trigger occurrence, movement invalidation, and trigger refinement/exclusion facts;
- Explosive Runes, which releases area damage from the glyph occurrence rather than from the original one-hour casting;
- Spell Glyph, which stores an eligible prepared spell with no immediate effect, retargets or centers it on the triggering creature, uses table placement for hostile summons/objects/traps, and overrides normal Concentration by lasting for the stored spell's full duration.

## Task Outcome

Glyph remains `unsupported-profile`. Surface catalog tests prove that the SRD facts are authored and decoded as typed facts, but they are not executable owner evidence for durable glyph occurrence or release. The coverage matrix must continue to show Glyph runtime work as open until a future task adds a real owner-package runtime path and focused verification.

No battle reducer behavior is promoted in this task. The current runtime spell paths are ordinary immediate Spell Invocations or readied-spell releases. Reusing them for Glyph would either spend and resolve the spell at glyph creation time, tie release to a creature-held readied state, or use ordinary caster Concentration ownership. Those shapes contradict the SRD boundary and would create duplicate table/object/location state or authored spell identity dispatch.

## Follow-Up Split

The remaining executable work is split into focused owners:

- `L3-FOLLOWUP-GLYPH-DURABLE-OCCURRENCE` owns durable glyph occurrence creation, trigger/end cleanup, notice, movement invalidation, and table object/location witnesses.
- `L3-FOLLOWUP-GLYPH-EXPLOSIVE-RUNE-RELEASE` owns the non-immediate explosive-rune release with area-membership witnesses, damage-type choice, save half damage, slot scaling, and cleanup.
- `L3-FOLLOWUP-GLYPH-STORED-SPELL-RELEASE` owns stored spell invocation identity for the executable non-Concentration subset, no-immediate-effect storage, trigger retargeting or area centering, save-gated release fills, represented hostile trap placement through stored Grease release, stored-Concentration rejection, and no trigger-time spell-slot spending.
- `L3-FOLLOWUP-GLYPH-STORED-CONCENTRATION` owns the stored Concentration full-duration override outside ordinary caster, triggering-creature, or readied-spell Concentration ownership.

## Reviewer Loop

Round 1 finding:

- Surface-only admission was incorrectly classified as runtime owner evidence. Fixed by removing the admission profile, Surface runtime marker, deterministic evidence marker, and supported/profile-subset claim.

Round 2 findings:

- RAW and ubiquitous-language pass: the unsupported claim keeps all represented Glyph clauses tied to the SRD text without claiming battle execution.
- Architecture and connascence pass: durable occurrence, explosive release, stored-spell release, and stored Concentration remain separate follow-up owners, which keeps table witnesses and invocation state from becoming one broad Glyph-specific adapter.
- Code-review pass: `pnpm unit-profile-coverage:check --write` regenerates reports with Glyph still unsupported and owner evidence still required; no reasonable findings remain.
