# Authored ID Dispatch Cleanup Plan

## Context

The repository rule is not "SRD ids are allowed in runtime." SRD content is
publishable in this repo, but concrete authored Unit, Spell, Stat Block, feature
names, and slugs are not runtime abstractions. Production runtime semantics must
come from Surface records, support-profile readers, and typed procedure facts.

Concrete authored ids may appear only at explicit boundaries:

- Surface catalog/schema/content boundaries.
- Tests and fixtures.
- Composition or user-selection boundaries that retain identity selected
  elsewhere.
- Narrow documented support-profile boundary files.
- Data references whose domain is "reference another authored record" when the
  source rule actually names that other record.

PHB+ or private non-SRD content is stricter: publishable code and tests must not
copy real private ids, names, prose, or source references. Use visibly synthetic
records for non-SRD examples.

## Findings

`pnpm check:authored-id-dispatch` currently reports these production violations:

| Site | Violation | Fix class |
| --- | --- | --- |
| `packages/battle-runtime/src/battle-reducer/spells-profile-shared.ts` | `spellAttackSequencePartName` maps concrete Spell ids to `beam`/`ray` display words. | Cosmetic implementation mistake |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts` | Scorching Ray support gates on `scorching_ray`. | Support-profile parser mistake |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-attack-damage.ts` | Eldritch Blast support gates on `eldritch_blast`. | Support-profile parser mistake |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Warding Bond support gates on `warding_bond`. | Support-profile parser mistake |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Warding Bond support gates on authored `bondId` value `warding_bond_mystic_connection`. | Surface language mistake |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Blur support gates on `blur`. | Support-profile parser mistake |
| `packages/battle-runtime/src/battle-reducer/spells-profiles-support.ts` | Mirror Image support gates on `mirror_image`. | Support-profile parser mistake with taxonomy smell |
| `packages/battle-runtime/src/battle-reducer/spells-resolve-fill-set.ts` | Thaumaturgy runtime hole protocol embeds `thaumaturgy` in a hard-coded id. | Runtime protocol naming mistake |
| `packages/character-creation-runtime/src/druid-wild-shape.ts` | Wild Shape feature parser gates on `druid_wild_shape` outside the documented support boundary. | Boundary placement or parser mistake |
| `packages/character-sheet-runtime/src/index.ts` | Magical Cunning parser gates on `warlock_magical_cunning`. | Support-profile parser mistake |

The guard only catches known authored ids. A follow-up sweep should also remove
production support gates that dispatch on `spell.name`, `unit.name`, and
`provenance.section` strings. Those strings are useful diagnostics and catalog
facts, but they must not be required to select runtime support.

## Fix Plan

### Phase 1: Cosmetic Runtime Labels

Replace the spell-id-derived `beam` and `ray` label selection with a generic
non-authored label such as `attack`. This changes user-facing wording only and
does not touch reducer semantics, holes, resources, damage, or Surface schema.

Expected files:

- `packages/battle-runtime/src/battle-reducer/spells-profile-shared.ts`
- callers that import `spellAttackSequencePartName`

### Phase 2: Generic Spell Attack Sequence Profiles

Replace the Eldritch Blast and Scorching Ray id gates with reusable parsers over
Surface shape:

- cantrip spell attack sequence: activation cantrip, Magic Action, ranged spell
  attack, creature/object target, character-level attack count, force damage;
- prepared spell attack sequence: level-2+ prepared spell, Magic Action, ranged
  spell attack, repeated creature/object target choice, slot-level attack count,
  fire damage.

The parsed profile should carry any runtime-facing facts needed downstream,
including attack count, count source, damage expression, attack kind, range, and
optional generic part label if labels still need a better word than `attack`.

### Phase 3: Ongoing Support Profiles

Convert Warding Bond, Blur, Mirror Image, and Magical Cunning from authored-id
checks to shape parsers:

- Warding Bond: parse `ongoing_effect`, caster-target bond attachment, paired
  worn platinum rings, timed duration, early-end triggers, and AC/save/resistance
  plus damage-share operations.
- Blur: parse self concentration attack-roll disadvantage against the caster.
- Mirror Image: parse `passive_hit_intercept` duplicate-pool mechanics and
  carry duplicate-roll facts as generic duplicate-intercept state.
- Magical Cunning: parse `pact_slot_recovery`, one-minute rite, pact-slot
  resource, expended-slot requirement, half-maximum recovery, and Long Rest reset.

Mirror Image has a naming debt: runtime procedure/effect names are still
spell-specific. Do not block the id cleanup on a large rename, but record a
follow-up to move toward generic duplicate-hit-intercept language.

### Phase 4: Surface Attachment Language

Replace Warding Bond's spell-specific `bondId` with a structural local reference.
If a spell has one caster-target bond attachment, operations should refer to that
attached bond by relationship rather than by authored spell slug.

This is a Surface schema/content/tracer change before runtime cleanup. Update the
Surface readers, generated content, trace tests, and Warding Bond runtime parser
together.

### Phase 5: Runtime Hole Protocol Names

Remove authored spell slugs from runtime hole ids. For Thaumaturgy, derive the
active one-minute-effect count hole from the selected invocation/procedure or
from a generic spell-effect-count protocol id.

If the procedure itself remains spell-specific, treat it as a separate taxonomy
follow-up. The immediate violation is the hard-coded authored slug in the hole
identity.

### Phase 6: Wild Shape Character-Creation Boundary

Move the concrete Wild Shape identity check into an existing documented support
boundary or replace it entirely with a shape parser:

- Druid class feature;
- activation mechanics;
- use-count resource and reset cadence;
- timed half-class-level duration;
- known-forms roster.

The better end state is shape parsing. If a concrete Unit id remains necessary
temporarily, it must live in a documented narrow support boundary and not in
downstream finalization or projection code.

## Verification

1. Run `pnpm check:authored-id-dispatch` after each phase that removes a reported
   violation. Do not broaden allowlists unless the file is proven to be an
   explicit boundary and the allowlist is narrow.
2. Run package-local typechecks for touched packages.
3. Run focused deterministic tests for affected profiles. Use MBT only after
   completed behavior changes that need promoted end-to-end validation.
4. RAW/ubiquitous-language check: before changing any rule-bearing parser, read
   the relevant SRD 5.2.1 passage in `.references/srd-5.2.1/` and check
   `UBIQUITOUS_LANGUAGE.md`. Confirm modeled rules trace to specific SRD text and
   that names use repo domain language rather than migration or authored-id
   language.
5. Reviewer-loop convergence: after implementation, run RAW traceability,
   ubiquitous-language/domain, architecture/connascence, and code-review passes.
   Fix every reasonable finding, explicitly reject only findings with concrete
   reasons, and repeat until no reasonable findings remain.

