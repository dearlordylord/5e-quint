# Prestidigitation Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:733` defines
  Prestidigitation as a Transmutation cantrip for Bard, Sorcerer, Warlock, and
  Wizard.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:737` through
  `.references/srd-5.2.1/Spells/Descriptions-M-P.md:740` define Action casting
  time, 10-foot range, Verbal/Somatic components, and duration up to 1 hour.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:742` makes the spell a
  choice among magical effects within range and caps multiple casts at three
  active non-instantaneous effects.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:744` defines Sensory
  Effect as an instantaneous harmless sensory effect.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:746` defines Fire Play as
  instantly lighting or snuffing a candle, torch, or small campfire.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:748` defines Clean or Soil
  as instantly cleaning or soiling an object no larger than 1 cubic foot.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:750` defines Minor
  Sensation as chilling, warming, or flavoring up to 1 cubic foot of nonliving
  material for 1 hour.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:752` defines Magic Mark as
  a color, small mark, or symbol on an object or surface for 1 hour.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md:754` defines Minor
  Creation as a hand-sized nonmagical trinket or illusory image until the end
  of the caster's next turn; a trinket deals no damage and has no monetary
  worth.
- `.references/srd-5.2.1/Classes/Bard.md:153`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:234`,
  `.references/srd-5.2.1/Classes/Warlock.md:341`, and
  `.references/srd-5.2.1/Classes/Wizard.md:153` are the level-1 spell-list
  pressure rows.
- `.references/srd-5.2.1/Character-Origins.md:168` grants High Elf
  Prestidigitation Spell Access, and
  `.references/srd-5.2.1/Character-Origins.md:192` defines Rock Gnome's
  Prestidigitation-powered clockwork device. Those are related Spell Access and
  species-trait pressures, not the spell-list no-matrix Unit pressure decided
  here.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:270` defines Transmutation as transformation magic.
- `UBIQUITOUS_LANGUAGE.md:284` through `UBIQUITOUS_LANGUAGE.md:285` define
  illumination and obscurement terms used by existing promoted battle-runtime
  light and obscured-area profiles.

## Generated State

- Unit pressure id: `prestidigitation`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has four level-1 spell
  pressure rows: Bard, Sorcerer, Warlock, and Wizard.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action says minor sensory, cleaning, flavoring, marking, and
  trinket effects are noncombat utility effects outside promoted runtime
  owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `prestidigitation`
  Unit matrix row.
- `packages/surface/content/prestidigitation.json` and
  `packages/surface/content/prestidigitation.dhall` do not exist.
- `packages/surface/content/class_sorcerer.*` references the spell id only as
  class spell-list source data, not as an authored/admitted Prestidigitation
  UnitRecord.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `prestidigitation`
  rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists
  `prestidigitation` under No Matrix SRD Pressure, outside the strict
  executable denominator.

## Owner Classification

- `packageOwner: null`
- `closureKind: catalog-only/no-runtime-profile`

No promoted runtime package currently owns harmless sensory presentation,
mundane candle/torch/campfire flame state, object cleanliness or soil state,
temperature or flavor of nonliving material, marks on objects or surfaces,
hand-sized temporary trinkets, hand-sized illusory images, inventory/economy
facts for such trinkets, or a concurrent-effect cap over unowned presentation
states. Existing battle-runtime light profiles own source-created spell
emitters such as Light object emitters and Produce Flame held emitters; they do
not own generic environmental flame inventory, fuel, ignition, extinguishing,
or map-light derivation for mundane objects.

## Effect Classification

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Sensory Effect | Runtime-detached presentation | The instantaneous harmless sensory effect has no damage, condition, targeting, save, attack, movement, illumination, or obscurement consequence. |
| Fire Play | Runtime-detached environment/object adjudication | Lighting or snuffing a candle, torch, or small campfire touches mundane flame state. Existing light-emitter profiles are source-owned spell effects, not a general mundane fire/light owner. |
| Clean or Soil | Runtime-detached object presentation | Object cleanliness and soil state for a 1-cubic-foot object are table-facing object presentation. No current CharacterBuild, Surface catalog, or battle-runtime owner consumes that state. |
| Minor Sensation | Runtime-detached utility/presentation | Chilling, warming, or flavoring nonliving material for 1 hour is temporary material presentation with no SRD damage, condition, resistance, vulnerability, or food/water inventory consequence. |
| Magic Mark | Runtime-detached object/surface presentation | A color, mark, or symbol on an object or surface is presentation state. No current runtime owner stores surface markings or consumes them for combat mechanics. |
| Minor Creation | Future object/presentation pressure only if such an owner is created | A hand-sized nonmagical trinket or illusory image persists until the end of the caster's next turn, but the trinket cannot deal damage and has no monetary worth. Modeling it honestly would require an object/presentation owner rather than a Prestidigitation-specific workaround. |
| Three non-instantaneous active effects | No standalone runtime owner | The cap is meaningful only over non-instantaneous Prestidigitation effects that a runtime owner already stores. With Minor Sensation, Magic Mark, and Minor Creation outside promoted runtime ownership, adding an independent counter would duplicate state that no owner consumes. |

## Decision

Keep `prestidigitation` as no-matrix spell pressure with no runtime profile. Its
SRD mechanics are harmless sensory presentation, mundane flame/object
adjudication, temporary material presentation, object or surface marking, and
short-lived trinket or illusion presentation. Those facts are utility,
presentation, and environment/object adjudication outside the promoted runtime
owner boundary.

Fire Play and Minor Creation can change table-facing objects, but promoting
them now would require inventing a general environment/object/presentation
subsystem. A spell-specific Prestidigitation workaround would duplicate or
preempt that future subsystem, and it still would not have a current consumer
for the spell's three-active-effect cap.

The existing Strict Level 1 report treatment is correct: the Bard, Sorcerer,
Warlock, and Wizard spell-list pressures are product readiness
accepted/no-battle-effect pressure and remain outside strict support accounting
because no executable Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `prestidigitation` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;

After those gates, promotion still needs one of these owner decisions:

- an environment/object/presentation owner explicitly accepts harmless sensory
  effects, mundane flame state, object cleanliness/soil, temporary
  temperature/flavor, surface marks, temporary trinkets or hand-sized images,
  and the three-active-effect cap as durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached utility,
  presentation, and table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No concrete non-duplicative owner gap is selected
for Task 12 because all six Prestidigitation choices are utility/presentation or
mundane object adjudication with no current promoted consumer. If a future
environment/object/presentation subsystem is created, add a separate
implementation atom to author/admit `prestidigitation` before adding any Unit
claim, runtime closure, or runtime behavior.

Rock Gnome's clockwork-device rule should remain a separate species-trait owner
question if that lineage work is reopened. It stores one chosen Prestidigitation
effect in a later-activated device with its own device cap and expiry, which is
not the same boundary as the spell-list no-matrix pressure decided here.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-M-P.md:733`
  through `.references/srd-5.2.1/Spells/Descriptions-M-P.md:754`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Bard.md:153`,
  `.references/srd-5.2.1/Classes/Sorcerer.md:234`,
  `.references/srd-5.2.1/Classes/Warlock.md:341`, and
  `.references/srd-5.2.1/Classes/Wizard.md:153`.
- Related High Elf and Rock Gnome Prestidigitation references checked against
  `.references/srd-5.2.1/Character-Origins.md:168` and
  `.references/srd-5.2.1/Character-Origins.md:192`; both are outside this
  spell-list Unit pressure boundary.
- Ubiquitous language checked for Magic Action, Spell Definition, Spell Access,
  Spell Invocation, Spell Effect, Transmutation, illumination, and obscurement
  terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths, and
  existing claim/profile/evidence row files.
