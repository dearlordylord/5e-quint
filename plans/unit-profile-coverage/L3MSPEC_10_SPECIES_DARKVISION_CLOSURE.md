# L3MSPEC-10 Species Darkvision Closure

Task 10 closes species Darkvision as a sense source fact for sight and
illumination projection. This task changes no runtime behavior, QNT, Surface
schema, or Unit catalog admission. It adds this closure artifact plus a
checker-visible task claim and its generated coverage report/matrix
projections.

## RAW And Vocabulary Checked

- `.references/srd-5.2.1/Character-Origins.md:125`: Dragonborn Darkvision has
  a range of 60 feet.
- `.references/srd-5.2.1/Character-Origins.md:137`: Dwarf Darkvision has a
  range of 120 feet.
- `.references/srd-5.2.1/Character-Origins.md:155`: Elf Darkvision has a range
  of 60 feet.
- `.references/srd-5.2.1/Character-Origins.md:167`: Drow changes Elf
  Darkvision range to 120 feet through a selected lineage fact, outside this
  task's species Darkvision records.
- `.references/srd-5.2.1/Character-Origins.md:257`: Orc Darkvision has a range
  of 120 feet.
- `.references/srd-5.2.1/Character-Origins.md:269`: Tiefling Darkvision has a
  range of 60 feet.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1324-1333`: the
  Darkvision spell grants a willing touched creature Darkvision with a 150-foot
  range for 8 hours.
- `.references/srd-5.2.1/Playing-the-Game.md:374-388`: Lightly Obscured,
  Heavily Obscured, Bright Light, Dim Light, and Darkness define the
  exploration visibility consequences.
- `.references/srd-5.2.1/Rules-Glossary.md:357-359`: Darkvision changes how a
  creature sees Dim Light and Darkness within the specified range.
- `UBIQUITOUS_LANGUAGE.md:295-299` and `UBIQUITOUS_LANGUAGE.md:365-366`:
  Illumination, Obscurement, and special senses are sight-projection terms.

## Current Evidence Checked

- `plans/unit-profile-coverage/unit-claims.jsonl`: `elf_darkvision`,
  `species_dragonborn_darkvision`, `dwarf_darkvision`,
  `species_tiefling_darkvision`, and installed `orc_darkvision` all have
  unsupported-profile closure claims that keep authored sense grants out of
  standalone promoted Unit execution.
- `plans/unit-profile-coverage/unit-claims.jsonl`: the `darkvision` spell has
  an unsupported-profile closure claim for spell-granted Darkvision because the
  current battle runtime does not own active spell-granted sense projection.
- `packages/surface/content/darkvision_elf.json`,
  `packages/surface/content/species_dragonborn_darkvision.json`,
  `packages/surface/content/species_dwarf_darkvision.json`,
  `packages/surface/content/species_orc_darkvision.json`,
  `packages/surface/content/species_tiefling_darkvision.json`, and
  `packages/surface/content/darkvision.json` record `grant_sense` facts with
  authored SRD provenance.
- `packages/battle-runtime/src/battle-reducer.ts` defines
  `BattleSightObserver` as ordinary sight or Darkvision with range and distance
  facts supplied to the projection boundary.
- `packages/battle-runtime/src/battle-reducer/spells-active-effects.ts`
  derives Darkvision-adjusted illumination and obscurement from caller-supplied
  observer facts. It does not derive those observer facts from species trait or
  spell Unit identity.
- `packages/battle-runtime/src/unit-profile-admission-object-light-spells.test.ts`
  covers Dim Light, Darkness, and Darkvision-adjusted sight projection through
  explicit observer range and distance facts.

## Closure Decision

Do not promote a species Darkvision runtime profile in this task.

Darkvision records are authored source facts that can feed a future shared
creature sense projection, but the current promoted battle owner consumes
observer facts rather than deriving them from Character Sheet species traits,
spell-granted active effects, lineage choices, or item-granted senses.

The nearest existing owner is the light/obscurement projection boundary, and it
already handles Darkvision once the caller supplies:

- observer sense kind;
- Darkvision range;
- distance to the viewed space or subject;
- relevant illumination or magical Darkness facts.

That boundary is not a shared Character Sheet sense-source projection owner. It
does not own character species selection, active spell-granted sense duration,
item sense grants, automatic sight-line derivation, map geometry, or color-only
darkness presentation.

## Invalid States Rejected

- A standalone `unit-feature.darkvision` or spell profile that executes because
  the authored Unit id is `elf_darkvision`, `dwarf_darkvision`,
  `species_dragonborn_darkvision`, `species_tiefling_darkvision`,
  `orc_darkvision`, or `darkvision` is invalid. Runtime behavior must consume
  typed sense facts, not authored identity.
- Copying Darkvision range into battle state beside Character Sheet species,
  active spell, item, or Stat Block sense facts is invalid unless a future
  projection owner makes that battle copy executable at the handoff boundary.
- Adding spell Darkvision as a special active-effect case without a generic
  creature sense-source projection would duplicate future item, species,
  familiar, Wild Shape, and Stat Block sense paths.
- Treating color-only darkness presentation as battle execution is invalid for
  this task. The promoted battle facts are illumination and obscurement
  consequences.

## Follow-Up Boundary

If the decider wants promoted sense-source projection later, create a separate
shared creature perception projection lane. That lane should derive effective
special senses from existing source facts, including Character Sheet species
traits, selected lineage facts, active spell effects, item effects, Stat Block
senses, Find Familiar shared senses, and Wild Shape active form senses. It
should expose typed observer facts to existing light, obscurement, magical
Darkness, Blur, Mirror Image, and similar consumers without duplicating source
state or dispatching on authored identity.

Task 10 does not add that lane because no concrete shared owner is available to
extend in the current code. The correct closure is to leave the species
Darkvision Unit claims unsupported-profile and keep battle light/obscurement
projection as the consumer of typed observer facts supplied at its boundary.

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Confirmed SRD species and spell Darkvision rules grant a special sense with a
  specified range.
- Confirmed RAW sight consequences are expressed through Dim Light, Darkness,
  Lightly Obscured, Heavily Obscured, and the Darkvision range adjustment.
- Confirmed ubiquitous language treats Darkvision as a special sense and
  illumination/obscurement projection fact, not an action procedure.

Round 2 architecture and connascence pass:

- The strongest coupling is between source sense grants and downstream sight
  consumers. The existing code weakens that coupling by passing typed
  `BattleSightObserver` facts into projection functions.
- The four non-Orc species records, installed Orc record, and Darkvision spell
  share the same closure invariant with different source ranges. Keeping the
  invariant in Unit claims plus this artifact is preferable to adding parallel
  runtime state.
- No redundant state was added. No authored identity dispatch was added.

## Verification

- RAW/ubiquitous-language check performed from the local SRD and
  `UBIQUITOUS_LANGUAGE.md` references above.
- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `pnpm quality` failed in existing typecheck lanes outside this closure
  task's touched ownership surface:
  `packages/mcp/src/battle-tools.ts` still imports/uses removed reaction
  helpers and `reactionDecision`, while
  `packages/app/src/battle-scene/wizard-battle-demo-runtime.ts` and
  `packages/app/src/battle-scene/wizard-battle-demo.ts` have the same reaction
  field/helper drift plus missing `knownLanguages` on a demo character init.
  Broad verification stopped there.
- MBT not run: this task records a closure decision and task claim only; it
  changes no promoted battle runtime behavior, QNT, profile parser, or MBT
  bridge behavior.
