# Character Creation Runtime Vocabulary

Technical vocabulary owned by `@dnd/character-creation-runtime`. Domain rules
language remains in [UBIQUITOUS_LANGUAGE.md](../../UBIQUITOUS_LANGUAGE.md).

## Terms

Character Draft - session-owned mutable character-creation state with holes
still to fill. It is not authored content. Draft holes may be opened by missing
draft structure (`cc:draft:<path>`) or by selected Units
(`cc:unit:<unit id>:<choice key>`). Filling a draft can reveal more holes.

Character Build - finalized build-only player-character boundary produced from
a complete legal Character Draft. It carries selected Unit references plus
derived build facts such as ability scores, proficiencies, HP maximum, and
loadout. It is not a Stat Block and not in-play Character Sheet state.

Creation Hole - a fillable requirement in a Character Draft. Holes can come
from draft structure or from selected authored Units. Hole ids are stable
runtime ids, not SRD terms.

Creation Fill - caller-submitted answer for one Creation Hole. Fills are
applied in atomic batches by `fillCreationHoles`; a rejected batch leaves the
draft unchanged.

Unit-backed selection - a character-creation choice whose accepted option
references a Surface Unit. The draft records the selected Unit reference rather
than treating the submitted option id as authored truth.

Support Profile - package-private runtime boundary that says which discovered
Surface-backed draft choices, Unit choice families, option ids, equipment
purchases, and loadout choices this package can currently finalize. It is not
authored provenance and not a Surface content classification. Legal choices
outside the profile can appear in holes, but fills are rejected as unsupported
until widening work adds support and projection behavior.

Finalization Gate - the remaining Phase 1 readiness check after all holes are
filled. The gate keeps the only finalizable vertical to Orc Soldier Fighter 1 and
requires the exact manifest-owned choices before producing a `CharacterBuild`.
