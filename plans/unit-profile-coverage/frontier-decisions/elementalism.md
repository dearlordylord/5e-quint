# Elementalism Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:45` defines
  Elementalism as a Transmutation cantrip for Druid, Sorcerer, and Wizard.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:49` through
  `.references/srd-5.2.1/Spells/Descriptions-E-L.md:52` define Action casting
  time, 30-foot range, Verbal/Somatic components, and Instantaneous duration.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:54` makes the spell a
  choice among effects within range.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:56` defines Beckon Air:
  a breeze in a 5-foot Cube that can ripple cloth, stir dust, rustle leaves,
  and close open doors or shutters not being held open.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:58` defines Beckon Earth:
  dust or sand covering surfaces in a 5-foot-square area, or one handwritten
  word in dirt or sand.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:60` defines Beckon Fire:
  harmless embers plus colored, scented smoke in a 5-foot Cube, candle/torch/
  lamp ignition in that area, and scent lingering for 1 minute.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:62` defines Beckon Water:
  cool mist that lightly dampens creatures and objects in a 5-foot Cube, or
  1 cup of clean water in an open container or on a surface that evaporates in
  1 minute.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md:64` defines Sculpt
  Element: dirt, sand, fire, smoke, mist, or water fitting in a 1-foot Cube
  assumes a crude shape for 1 hour.
- `.references/srd-5.2.1/Classes/Druid.md:189`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:226`, and
  `.references/srd-5.2.1/Classes/Wizard.md:145` are the level-1 spell-list
  pressure rows.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.
- `UBIQUITOUS_LANGUAGE.md:284` through `UBIQUITOUS_LANGUAGE.md:285` define
  illumination and obscurement terms used by existing promoted battle-runtime
  light and obscured-area profiles.

## Current Generated State

- Unit pressure id: `elementalism`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has three level-1
  spell pressure rows: Druid, Sorcerer, and Wizard.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- `plans/unit-profile-coverage/unit-matrix.json` has no `elementalism` Unit
  matrix row.
- `packages/surface/content/elementalism.json` and
  `packages/surface/content/elementalism.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `elementalism` rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists `elementalism`
  under No Matrix SRD Pressure, outside the strict executable denominator.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

No promoted runtime package currently owns ambient air movement, dust/sand
surface covering, handwriting marks in dirt or sand, scented smoke persistence,
mundane candle/torch/lamp flame state, dampness on creatures or objects, small
water inventory/evaporation, or crude environmental element shapes. Existing
battle-runtime light and obscured-area profiles own source-created spell effects
such as Light object emitters, Produce Flame held emitters, Dancing Lights
emitters, and Fog Cloud obscurement; they do not own generic environmental
object state, mundane flame inventory, scent trails, water containers, wetness,
door/shutter disposition, or map-light derivation for ordinary objects.

## Effect Classification

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Beckon Air | Runtime-detached environment/object adjudication | The breeze can move presentation-scale environmental details and close unheld doors or shutters. Door/shutter state is environmental object disposition, not a promoted battle-runtime reducer boundary. |
| Beckon Earth | Runtime-detached utility/presentation | Surface dust/sand coverage and a one-word mark in dirt or sand are table-facing presentation and environmental marks with no current catalog or runtime owner. |
| Beckon Fire | Runtime-detached environment/object adjudication | Harmless embers, colored/scented smoke, lingering scent, and candle/torch/lamp ignition touch mundane flame and sensory state. Existing light emitters are source-owned spell effects, not a general mundane fire/light owner. |
| Beckon Water | Runtime-detached utility/presentation | Light dampening and 1 cup of temporary clean water are creature/object presentation and small environmental water state. No current runtime owner consumes wetness, water containers, or evaporation. |
| Sculpt Element | Future environment/object pressure only if such an owner is created | The 1-hour crude shape is persistent environmental/object presentation. It has no current battle, character sheet, or character creation consequence, but would belong with a future environment/object persistence subsystem if the product creates one. |

## Decision

Keep `elementalism` as no-matrix spell pressure with no runtime profile. Its
SRD mechanics are utility, sensory presentation, and environment/object
adjudication outside the promoted runtime owner boundary. Several choices can
change mundane object or environmental state, but selecting an owner now would
require inventing a general environment/object subsystem. A spell-specific
Elementalism workaround would duplicate or preempt that future subsystem.

The existing Strict Level 1 report treatment is correct: the Druid, Sorcerer,
and Wizard spell-list pressures are product readiness accepted/no-battle-effect
pressure and remain outside strict support accounting because no executable Unit
matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `elementalism` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- an environment/object owner explicitly accepts air movement, environmental
  marks, mundane flame/light state, smoke/scent, dampness/water, and crude
  shape persistence as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached utility and
  table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No real owner is selected for Task 9, so no concrete
implementation atom should be added. If a future environment/object subsystem
is created, add a separate implementation atom to author/admit `elementalism`
before adding any Unit claim, runtime closure, or runtime behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-E-L.md:45`
  through `.references/srd-5.2.1/Spells/Descriptions-E-L.md:64`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Druid.md:189`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:226`, and
  `.references/srd-5.2.1/Classes/Wizard.md:145`.
- Ubiquitous language checked for Magic Action, Spell Definition, Spell Access,
  Spell Invocation, Spell Effect, Transmutation, illumination, and obscurement
  terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
