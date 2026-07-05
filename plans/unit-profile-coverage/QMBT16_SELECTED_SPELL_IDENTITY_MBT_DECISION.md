# QMBT16 Selected Spell Identity MBT Decision

Date: 2026-05-07

## Decision

QMBT16 adds no new `selected-identity-replay` evidence rows for spell Units.

The current supported SRD spell Unit identities are `acid_splash`,
`ray_of_frost`, `mage_armor`, and `magic_missile`. They are already covered by
two different boundaries:

- QMBT5 procedure parity replays the spell profiles through production
  battle-runtime reducers with concrete authored spell ids.
- QMBT14 deterministic admission/projection evidence proves each supported
  spell Unit enters the runtime through the production Unit catalog, creature
  Spell Access, `startBattle`, and `discoverBattleActs`.

Under the QMBT10 evidence semantics, selected identity replay is not just an owner
file marker. It requires replay markers, deterministic replay data, and a
deterministic replay consumer that proves the claimed Unit id is bound at a
Unit-bearing production boundary. The existing spell MBT is valuable procedure
parity evidence, but QMBT16 does not reclassify it as selected identity replay
without adding those selected-replay witnesses.

## RAW And Vocabulary Check

This task does not model new spell behavior. It reviews the existing spell
identity evidence against already-modeled SRD anchors:

- `.references/srd-5.2.1/Spells/Gaining-and-Casting.md`: Spell Slots,
  Casting Time, one spell-slot spell per turn, spell targets, saving throws,
  and attack rolls.
- `.references/srd-5.2.1/Rules-Glossary.md`: Ready action and readied spell
  release requirements.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Acid Splash.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Mage Armor and Magic
  Missile.
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md`: Ray of Frost.
- `UBIQUITOUS_LANGUAGE.md`: Magic Action, Spell Slot, Spell Definition, Spell
  Access, Spell Invocation, Spell Effect, Spell Attack, and Readied Spell
  Response.

## Per-Identity Assessment

- `acid_splash`: QMBT5 covers save-gated cantrip procedure replay, and
  QMBT14 covers catalog/access/invocation admission. No selected identity replay
  is added because the remaining risk is profile-level save/AOE parity plus
  admission identity, already split across those two gates.
- `ray_of_frost`: QMBT5 covers spell-attack and speed-effect procedure replay,
  and QMBT14 covers catalog/access/invocation admission. No selected identity
  replay is added because the remaining risk is attack-roll and active-effect
  projection with this concrete id plus admission identity.
- `mage_armor`: QMBT5 covers persistent spell procedure replay, and QMBT14
  covers catalog/access/invocation admission. No selected identity replay is added
  because the remaining risk is persistent AC effect projection with this
  concrete id plus admission identity.
- `magic_missile`: QMBT5 covers slot-spell, dart-allocation, and readied-spell
  procedure replay, and QMBT14 covers catalog/access/invocation admission. No
  selected identity replay is added because the remaining risk is repeated target
  allocation, slot spend, and readied release with this concrete id plus
  admission identity.

## Follow-On Criteria

Add selected spell identity replay or a paired QNT replay later only when a
spell identity introduces risk not already closed by procedure parity plus
deterministic admission, such as:

- multiple supported spell Units share one procedure profile but differ in
  authored mechanics facts that affect reducer behavior;
- a spell identity reaches a new Unit-bearing runtime boundary not covered by
  QMBT14 admission, such as triggered-Reaction Spell Access;
- selected identity evidence becomes necessary for QMBT19 metric semantics
  after the report review decides spell procedure MBT should count separately
  from feature selected identity replay.

Until one of those conditions appears, adding selected identity replay would
duplicate QMBT5 procedure coverage without increasing the matrix's executable
confidence.
