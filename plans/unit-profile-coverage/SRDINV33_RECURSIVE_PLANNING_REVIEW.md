# SRDINV33 Recursive Planning Review

Task 223 reviewed the SRDINV28A-SRDINV28E, SRDINV29A-SRDINV29E,
SRDINV29F3, and SRDINV30A-SRDINV32B spell-runtime closure batch.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json` after
`pnpm unit-profile-coverage:check --write`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `catalog-installed-owner-evidence-present` rows: 144
- Level-1 `non-runtime` rows: 12
- Spell Unit `catalog-installed-owner-evidence-present` rows: 84
- Spell Unit `catalog-installed-owner-evidence-required` rows: 10
- Spell Unit `catalog-authored-executable-follow-up` rows: 2
- Spell Unit `missing-authored-record` rows: 6
- Spell Unit `needs-surface-widening` rows: 35
- Spell Unit `catalog-only/dead-for-now` rows: 74

The review found two checker-visible closure gaps in the landed dependency
batch: Heroism and Ensnaring Strike had promoted runtime tests and scanned
`UNIT-IDENTITY-EVIDENCE` markers, but no matching `unit-claims.jsonl` and
`unit-evidence.jsonl` rows. The fix records distinct execution profiles for
Heroism's condition-immunity plus turn-start Temporary Hit Points lifecycle and
Ensnaring Strike's after-hit Restrained plus turn-start damage and escape
lifecycle. Those profiles intentionally do not reuse scalar-buff or Searing
Smite profile ids because the trigger and cleanup invariants differ.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Ensnaring Strike,
  Eldritch Blast, Fire Bolt, Grease, Hellish Rebuke, Heroism, Hex, Hideous
  Laughter, and Jump.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for Charm Person,
  Command, Detect Evil and Good, Detect Poison and Disease, and Dissonant
  Whispers.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Sanctuary,
  Shillelagh, Sleep, Sorcerous Burst, Spare the Dying, Starry Wisp, and
  Thunderwave.
- `.references/srd-5.2.1/Rules-Glossary.md` for Frightened, Restrained,
  Temporary Hit Points, Charmed, Incapacitated, Unconscious, Prone, Reaction,
  Saving Throw, Attack Roll, Spell Attack, and Damage Roll terms.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Slot, Base Spell Level, Spell Attack, Duration,
Area of Effect, Attack Roll, Saving Throw, Temporary Hit Points, Bonus Action,
Reaction, Concentration, Charmed, Frightened, Restrained, Incapacitated,
Unconscious, Prone, Target, Creature, Armor Class, Hit Points, Bright Light,
Dim Light, and Magic Action.

## Appended Batch

The remaining spell pressure is not one coherent runtime task. SRDINV33
selects one concrete batch from the next frontier and keeps each task split by
execution invariant:

- `SRDINV34`: Starry Wisp object target runtime. This unblocks the existing
  object-target task, but keeps Fire Bolt ignition and broad object simulation
  out of scope.
- `SRDINV35`: Detect Evil and Good plus Detect Poison and Disease authoring.
  This is authoring-only and must not claim detection/occlusion runtime support.
- `SRDINV36`: Hellish Rebuke damage-triggered Reaction runtime.
- `SRDINV37`: Charm Person Humanoid charm lifecycle.
- `SRDINV38`: Sleep research for the SRD 5.2.1 save loop and
  Incapacitated/Unconscious wake-up lifecycle.
- `SRDINV39`: Eldritch Blast independent beam runtime.
- `SRDINV40`: Grease recurring ground-hazard retry. This remains standalone
  because the rejected SRDINV29D support claim showed that stored area metadata
  is not executable support without enter-area and end-turn save procedures.
- `SRDINV41`: recursive review after the batch lands.

Remaining Surface blockers such as Command, Dissonant Whispers, Expeditious
Retreat, Feather Fall, Fire Bolt, Fog Cloud, Hex, Hideous Laughter, Jump,
Sanctuary, Shillelagh, Sorcerous Burst, Spare the Dying, and Thunderwave remain
counted in generated inventory for SRDINV41 or later batches.

## /simplify Convergence

- Round 1: fixed checker-visible Heroism and Ensnaring Strike support evidence
  instead of leaving installed supported Spell Units in executable-follow-up
  pressure. The added profiles encode distinct SRD execution invariants rather
  than reusing nearby profile names.
- Round 2: split the appended frontier by execution invariant: object target,
  authoring-only detection, reaction timing, charm lifecycle, Sleep condition
  loop, independent beam attacks, and Grease recurring hazard events. No
  omnibus spell-runtime or passive backlog task remains in the appended batch.
