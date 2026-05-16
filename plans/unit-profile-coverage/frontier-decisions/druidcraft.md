# Druidcraft Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1729` defines
  Druidcraft as a Transmutation cantrip for Druids.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1733` through
  `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1736` define Action
  casting time, 30-foot range, Verbal/Somatic components, and Instantaneous
  duration.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1738` makes the spell a
  choice among effects within range.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1740` defines Weather
  Sensor: a Tiny harmless sensory effect predicting local weather for the next
  24 hours, persisting for 1 round.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1741` defines Bloom:
  instantly making a flower blossom, seed pod open, or leaf bud bloom.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1742` defines Sensory
  Effect: a harmless sensory effect fitting in a 5-foot Cube.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1743` defines Fire Play:
  lighting or snuffing out a candle, torch, or campfire.
- `.references/srd-5.2.1/Classes/Druid.md:61` recommends Druidcraft as a
  level-1 Druid cantrip, and `.references/srd-5.2.1/Classes/Druid.md:188`
  lists it on the Druid cantrip list.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244` distinguish
  Spell Definition, Spell Access, Spell Invocation, and Spell Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.
- `UBIQUITOUS_LANGUAGE.md:284` through `UBIQUITOUS_LANGUAGE.md:285` define
  illumination and obscurement terms used by existing light-emitter profiles.

## Current Generated State

- Unit pressure id: `druidcraft`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has one level-1 spell
  pressure row: Druid spell list Druidcraft.
- That row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- The row has `battleReadinessStatus: accepted-no-battle-effect`.
- `plans/unit-profile-coverage/unit-matrix.json` has no `druidcraft` Unit
  matrix row.
- `packages/surface/content/druidcraft.json` and
  `packages/surface/content/druidcraft.dhall` do not exist.
- `packages/surface/content/class_druid.*` references `druidcraft` only as
  cantrip Spell Access source data, not as an authored/admitted Druidcraft
  UnitRecord.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `druidcraft` under
  No Matrix SRD Pressure, outside the strict executable denominator.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

No promoted runtime package currently owns local weather prediction, ephemeral
sensory presentation, plant-growth presentation, or mundane candle/torch/campfire
flame state. Existing battle-runtime light profiles own source-created spell
emitters such as Light object emitters and Produce Flame held emitters; they do
not own generic environmental flame inventory, fuel, ignition, extinguishing, or
map-light derivation for mundane objects.

## Effect Classification

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Weather Sensor | Runtime-detached utility | The predictive sign is a Tiny harmless sensory effect and local weather information. It creates no battle-owned Spell Effect beyond presentation and a 1-round table-facing sign. |
| Bloom | Runtime-detached utility | Flower, seed pod, and leaf bud changes are environmental/narrative object state. No current CharacterBuild, Surface catalog, or battle-runtime owner consumes that state. |
| Sensory Effect | Runtime-detached presentation | The harmless effect is bounded by a 5-foot Cube but has no damage, condition, targeting, save, attack, movement, illumination, or obscurement consequence. |
| Fire Play | Runtime-detached environment/object adjudication | Lighting or snuffing a candle, torch, or campfire touches mundane environmental flame state. Existing light-emitter profiles are source-owned spell effects, not a general fire/light inventory owner. |

## Decision

Keep `druidcraft` as no-matrix spell pressure with no runtime profile. Its SRD
mechanics are utility, presentation, and environment/object adjudication outside
the promoted battle-runtime owner boundary. Fire Play can matter to table
lighting fiction, but promoting it now would require inventing a general owner
for mundane flame objects and map illumination. That owner does not exist, and
adding a Druidcraft-specific workaround would duplicate or preempt a future
environment/object subsystem.

The existing Strict Level 1 report treatment is correct: the Druid spell-list
pressure is product readiness accepted/no-battle-effect pressure and remains
outside strict support accounting because no executable Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `druidcraft` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- an environment/object owner explicitly accepts weather signs, transient
  sensory effects, plant changes, and mundane flame state as durable runtime
  state; or
- the decider chooses to close an admitted Unit as runtime-detached utility and
  table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. Environment persistence is not genuinely needed for
Task 8 because all four Druidcraft choices are noncombat utility/presentation or
mundane object adjudication with no current promoted consumer. If a future
environment/object subsystem is created, add a separate implementation atom to
author/admit `druidcraft` before adding any Unit claim or runtime closure.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1729`
  through `.references/srd-5.2.1/Spells/Descriptions-A-D.md:1743`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Druid.md:61`
  and `.references/srd-5.2.1/Classes/Druid.md:188`.
- Ubiquitous language checked for Magic Action, Spell Definition, Spell Access,
  Spell Invocation, Spell Effect, Transmutation, illumination, and obscurement
  terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing light-emitter profile/claim boundaries.
