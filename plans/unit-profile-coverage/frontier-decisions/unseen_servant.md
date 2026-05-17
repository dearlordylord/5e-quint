# Unseen Servant Frontier Decision

## RAW Sources

- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1058` defines Unseen
  Servant as a level 1 Conjuration spell for Bards, Warlocks, and Wizards.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1062` through
  `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1065` define Action or
  Ritual casting time, 60-foot range, Verbal/Somatic/Material components, and
  1-hour duration.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1067` creates an
  Invisible, mindless, shapeless, Medium force in an unoccupied ground space,
  gives it AC 10, 1 Hit Point, and Strength 2, prohibits attacks, and ends the
  spell when it drops to 0 Hit Points.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1069` lets the caster
  mentally command the servant once on each turn as a Bonus Action to move up
  to 15 feet and interact with an object, then lists simple human-capable
  tasks.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1071` ends the spell if a
  commanded task would move the servant more than 60 feet from the caster.
- `.references/srd-5.2.1/Classes/Bard.md:184`,
  `.references/srd-5.2.1/Classes/Warlock.md:359`, and
  `.references/srd-5.2.1/Classes/Wizard.md:191` are the level-1 spell-list
  pressure rows.
- `.references/srd-5.2.1/Playing-the-Game.md:304` defines the Magic action for
  spellcasting, and `.references/srd-5.2.1/Playing-the-Game.md:308` defines
  Utilize as using a nonmagical object.
- `.references/srd-5.2.1/Playing-the-Game.md:407` through
  `.references/srd-5.2.1/Playing-the-Game.md:427` define object interactions,
  carrying objects, and breaking objects as GM-adjudicated object procedures.
- `.references/srd-5.2.1/Playing-the-Game.md:509` through
  `.references/srd-5.2.1/Playing-the-Game.md:511` define free object
  interaction and additional Utilize-action object use.
- `.references/srd-5.2.1/Rules-Glossary.md:142` through
  `.references/srd-5.2.1/Rules-Glossary.md:175` define breaking objects, object
  AC/HP guidance, and the rule that objects lack ability scores unless a rule
  assigns scores.
- `.references/srd-5.2.1/Rules-Glossary.md:636` through
  `.references/srd-5.2.1/Rules-Glossary.md:644` define the Invisible
  condition.
- `UBIQUITOUS_LANGUAGE.md:32` confirms Action casting maps to a Magic Action
  spell invocation when modeled at runtime.
- `UBIQUITOUS_LANGUAGE.md:186` through `UBIQUITOUS_LANGUAGE.md:193`
  distinguish creature Speed and Movement from Carrying Capacity.
- `UBIQUITOUS_LANGUAGE.md:234` through `UBIQUITOUS_LANGUAGE.md:244`
  distinguish Spell Definition, Spell Access, Spell Invocation, and Spell
  Effect ownership.
- `UBIQUITOUS_LANGUAGE.md:268` defines Duration, and
  `UBIQUITOUS_LANGUAGE.md:270` defines Conjuration as transport/summon magic.
- `UBIQUITOUS_LANGUAGE.md:314` through `UBIQUITOUS_LANGUAGE.md:321`
  distinguish Creature and Stat Block boundaries.

## Current Generated State

- Unit pressure id: `unseen_servant`.
- `plans/unit-profile-coverage/srd-unit-inventory.json` has three level-1
  spell pressure rows: Bard spell list Unseen Servant, Warlock spell list
  Unseen Servant, and Wizard spell list Unseen Servant.
- Each row has `surface.state: outside-surface-runtime-mechanics`,
  `authoredContent.state: missing-authored-record`,
  `catalogAdmission.state: not-installed`, no owner evidence, and
  `finalDisposition: catalog-only/dead-for-now`.
- Each row has `battleReadinessStatus: accepted-no-battle-effect`.
- Each row's next action classifies servant AC/HP/Strength facts,
  object-interaction commands, Bonus Action control, HP, and distance-based
  expiry as summoned helper/exploration state outside promoted runtime owners.
- `plans/unit-profile-coverage/unit-matrix.json` has no `unseen_servant` Unit
  matrix row.
- `packages/surface/content/unseen_servant.json` and
  `packages/surface/content/unseen_servant.dhall` do not exist.
- `plans/unit-profile-coverage/unit-claims.jsonl`,
  `plans/unit-profile-coverage/profiles.jsonl`,
  `plans/unit-profile-coverage/unit-evidence.jsonl`, and
  `plans/unit-profile-coverage/task-claims.jsonl` have no `unseen_servant`
  rows.
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md` lists
  `unseen_servant` under No Matrix SRD Pressure, outside the strict executable
  denominator, and this task adopts this decision artifact for that row.
- `packages/battle-runtime/README.md:3` through
  `packages/battle-runtime/README.md:23` scope battle runtime to
  already-composed creature battle inputs and implemented battle behavior from
  caller inputs.
- `packages/battle-runtime/README.md:55` through
  `packages/battle-runtime/README.md:88` require reusable SRD procedure
  families and durable runtime state before widening reducer behavior.
- `packages/character-sheet-runtime/README.md:14` through
  `packages/character-sheet-runtime/README.md:66` list current Character Sheet
  executable state as HP, conditions, spent Hit Dice, feature and spell-slot
  expenditures, rest workflows, Lay On Hands, ritual invocation, AC projection,
  and parsing.
- `packages/character-sheet-runtime/README.md:68` through
  `packages/character-sheet-runtime/README.md:75` defer mutable
  carried/equipped equipment to a future equipment module.

## Owner Classification

- `packageOwner`: `null`
- `closureKind`: `catalog-only/no-runtime-profile`

No promoted runtime package currently owns a durable commanded servant force, a
servant force as a battle participant, servant position separate from a
creature, caster-to-servant distance expiry, Bonus Action command state, object
interaction tasks, ongoing task completion, carried or manipulated object
state, or the servant's fragile AC/HP/Strength facts as a reusable procedure
family.

Battle runtime owns already-composed creature battle inputs and implemented
creature procedure families. Unseen Servant's SRD subject is an Invisible,
mindless, shapeless Medium force, not an authored Stat Block or Character Sheet
input with a normal creature turn. Its consequential payload is object
interaction and simple task adjudication. Modeling only the AC, Hit Point, or
Invisible facts would drop the command, object, distance-expiry, and
non-attacking clauses that make the spell coherent. Character Sheet can store
player-character HP and resources, but it does not own mutable equipment,
object interaction, or spell-created helper position.

Effect classification for the current plan:

| RAW effect | Classification | Rationale |
| --- | --- | --- |
| Create an Invisible, mindless, shapeless, Medium force in an unoccupied ground space for 1 hour | Runtime-detached summoned-helper adjudication | Servant identity, map position, space selection, and fixed-duration lifetime require a represented helper that no current package owns. |
| AC 10, 1 Hit Point, Strength 2, and spell ends at 0 Hit Points | Future helper/object-damage owner pressure only if such an owner is created | These are executable facts only if the servant itself is represented. Adding a partial damage target would create a one-off helper battle participant without command or object-task semantics. |
| Cannot attack | No battle-runtime behavior to add | This prohibits using the servant as an attack source. Adding an attack subject solely to reject attacks would invent runtime state for a prohibited action. |
| Once on each caster turn, Bonus Action command moves the servant up to 15 feet and interacts with an object | Runtime-detached object-control adjudication | The command depends on turn-scoped command permission, servant movement, object state, and object interaction outcomes that are table-facing object facts in the current system. |
| Performs simple human-capable tasks such as fetching, cleaning, mending, folding, lighting fires, serving food, and pouring drinks | Runtime-detached task adjudication | Task feasibility, task progress, object ownership, mundane fire state, food/drink handling, and completion are exploration or object facts outside promoted runtime owners. |
| Ends if a commanded task would move it more than 60 feet from the caster | Runtime-detached distance and task adjudication | The distance threshold requires represented servant and caster positions plus task-path assessment that no current package owns. |

## Decision

Do not author or admit `unseen_servant` as a Surface Unit in this task. Keep
`unseen_servant` as no-matrix spell pressure with no runtime profile. The
selected current closure is catalog-only/no-runtime-profile: there is no
SRD-provenance `unseen_servant` Surface UnitRecord, no catalog admission, no
Unit matrix row, and no package owner that can consume the spell's commanded
servant, object interaction, simple task, movement, HP, and distance-expiry
facts without inventing a spell-specific helper subsystem.

For the current plan, classify Unseen Servant execution as runtime-detached
summoned-helper, object-control, and exploration table adjudication. Do not add
a future summoned-helper or object-control subsystem task solely for this
spell. If the product later creates a general helper/object-control owner,
Unseen Servant is a candidate input to that owner, but the owner must exist
before Unit claims, support profiles, evidence rows, or runtime behavior are
added.

The existing Strict Level 1 report treatment is correct: the Bard, Warlock, and
Wizard spell-list pressures are product readiness accepted/no-battle-effect
pressure and remain outside strict support accounting because no executable
Unit matrix row exists.

## Promotion Gate

Do not promote this pressure into a Unit claim or strict-support closure until
the base Unit gates are true:

- a SRD-provenance `unseen_servant` Surface UnitRecord exists;
- the UnitRecord is admitted into the relevant catalog boundary;
- the UnitRecord can represent Action or Ritual casting, 60-foot range,
  1-hour duration, helper creation in an unoccupied ground space, Invisible
  mindless shapeless Medium force identity, AC 10, 1 Hit Point, Strength 2,
  prohibited attacks, HP-based expiry, once-per-turn Bonus Action command,
  15-foot servant movement, object interaction, simple task completion, and
  60-foot caster-distance expiry without storing contradictory helper, object,
  movement, or command facts.

After those gates, promotion still needs one of these owner decisions:

- a summoned-helper or object-control owner explicitly accepts servant identity,
  servant position, command timing, represented object and task state,
  servant HP/AC/Strength facts, attack prohibition, and expiry behavior as
  durable runtime state; or
- the decider chooses to close an admitted Unit as runtime-detached
  summoned-helper and object-control table adjudication.

Without those gates, adding a Unit claim, support profile, evidence row, or
runtime behavior would treat a spell-list pressure row as a Unit that does not
exist.

## Follow-Up Tasks

None for the current plan. No current owner is selected by Task 25. If a future
summoned-helper, object-control, or mutable equipment/inventory subsystem is
created, add a separate implementation atom to author/admit `unseen_servant`
before adding any Unit claim, runtime closure, support profile, or runtime
behavior.

## Verification

- RAW checked against `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1058`
  through `.references/srd-5.2.1/Spells/Descriptions-S-Z.md:1071`.
- Spell-list pressure checked against `.references/srd-5.2.1/Classes/Bard.md:184`,
  `.references/srd-5.2.1/Classes/Warlock.md:359`, and
  `.references/srd-5.2.1/Classes/Wizard.md:191`.
- Object, object interaction, Magic action, Utilize, and Invisible RAW checked
  against the cited Playing the Game and Rules Glossary passages.
- Ubiquitous language checked for Magic Action, Movement, Carrying Capacity,
  Spell Definition, Spell Access, Spell Invocation, Spell Effect, Duration,
  Conjuration, Creature, and Stat Block terminology.
- Generated state checked against `srd-unit-inventory.json`,
  `unit-matrix.json`, `LEVEL1_FULL_SUPPORT.md`, Surface content paths,
  existing claim/profile/evidence row files, and battle/Character Sheet package
  owner boundaries.
- Coverage verification: `pnpm unit-profile-coverage:check`.
- MBT: not run; this decision artifact changes no promoted runtime behavior.
