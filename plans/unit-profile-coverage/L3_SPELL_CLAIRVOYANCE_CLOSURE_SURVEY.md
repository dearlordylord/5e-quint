# L3 Spell Clairvoyance Closure Survey

Date: 2026-05-21

## Decision

Task 27 closes `clairvoyance` as an accepted runtime-detached
`unsupported-profile` Unit claim. No battle-runtime behavior, QNT behavior,
catalog admission, companion/control model, or autonomous sensor behavior is
introduced.

The spell creates a table-placed remote sensor and remote perception channel.
Promoted battle runtime must not treat that sensor as ordinary caster sight, a
target-selection proxy, an attack-visibility proxy, a companion, or an actor.

## Source Check

Local RAW checked:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Clairvoyance.
- `.references/srd-5.2.1/Classes/Bard.md`: Level 3 Bard spell list.
- `.references/srd-5.2.1/Classes/Cleric.md`: Level 3 Cleric spell list.
- `.references/srd-5.2.1/Classes/Sorcerer.md`: Level 3 Sorcerer spell list.
- `.references/srd-5.2.1/Classes/Wizard.md`: Level 3 Wizard spell list.

Ubiquitous-language terms checked:

- Spell Definition, Spell Access, Spell Invocation, Spell Effect,
  Concentration, Duration, Bonus Action, Invisible, Deafened, Truesight, Vision
  and Light, and Senses.

Current artifacts checked:

- `packages/surface/content/clairvoyance.json` records the SRD spell as a
  level-3 Divination Spell Definition with 10-minute casting, 1-mile range,
  V/S/M 100+ GP focus, Concentration up to 10 minutes, a familiar-or-obvious
  location hole, `create_sensor`, and `remote_perception`.
- `packages/surface/content/clairvoyance.dhall` matches that JSON source shape.
- `plans/unit-profile-coverage/L1K_DETECTION_COMMUNICATION_SPELL_CANDIDATE_INTAKE.md`
  already classified Clairvoyance as runtime-detached remote sense and
  information state.
- `plans/unit-profile-coverage/unit-matrix.json` and
  `plans/unit-profile-coverage/srd-unit-inventory.json` previously left the
  Bard, Cleric, Sorcerer, and Wizard spell-list rows as
  `catalog-authored-review-required`.

## Closure

RAW requires:

- a location familiar to the caster or an obvious unfamiliar location;
- an Invisible, intangible, invulnerable sensor that remains in place;
- a cast-time seeing-or-hearing choice;
- a remote sense used as if in the sensor's space;
- Bonus Action switching between seeing and hearing;
- luminous-orb presentation to creatures that can see the sensor, such as with
  See Invisibility or Truesight.

Those facts are table/perception/exploration facts, not promoted battle Unit
profiles. Location familiarity, obviousness, sensor placement, remote
information disclosure, observer-specific visibility of the sensor, and
luminous-orb presentation require table witnesses or presentation owners. The
existing battle runtime has no promoted owner for active remote-sensor state,
and adding one here would create unsupported targeting and visibility semantics.

The checker-visible owner is therefore:

- `unsupported-profile`
- `battleReadinessClosure.kind`: `outside-runtime-presentation-exploration`
- `battleReadinessClosure.owner`: runtime-detached table/perception and
  remote-sensor owner

## Reviewer Loop

Round 1 RAW and ubiquitous-language pass:

- Confirmed the RAW grants remote seeing or hearing through a sensor, not
  ordinary caster sight from the caster's space.
- Confirmed no RAW companion, autonomous control, attack, damage, condition,
  movement, or target-selection behavior is introduced.
- Kept the luminous-orb observer clause with table/perception presentation
  ownership instead of creating battle reducer visibility state.

Round 2 architecture and connascence pass:

- Added one Unit claim rather than duplicating catalog state, profile evidence,
  or runtime support gates.
- The closure is keyed by the Unit claim boundary only; runtime code does not
  dispatch on authored identity.
- Strong remaining coupling is local to the claim text and this report: if
  Clairvoyance later receives a remote-sensor owner, both documents and the
  generated coverage artifacts must be updated together.

## Verification For This Closure

- `pnpm unit-profile-coverage:check -- --write`
- `pnpm unit-profile-coverage:check`
- `pnpm rules-kernel-coverage:check`
- `git diff --check`

MBT is not required because this task changes only profile/planning artifacts
and does not modify QNT, runtime behavior, catalog admission, or supported
profile evidence.
