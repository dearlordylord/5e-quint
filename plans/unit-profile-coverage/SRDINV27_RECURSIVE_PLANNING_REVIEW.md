# SRDINV27 Recursive Planning Review

Task 197 reviewed SRDINV22-SRDINV26 and refreshed the generated SRD Unit
inventory. SRD level-1 inventory is now complete: every level-1 row is either
owner-evidence-present or a non-runtime table summary.

## Inventory State

Generated inventory metrics from
`plans/unit-profile-coverage/srd-unit-inventory.json`:

- Total generated rows: 367
- Level-1 rows: 156
- Spell-list pressure rows for cantrips and level-1 spells: 211
- Missing level-1 class containers: 0
- Level-1 `catalog-installed-owner-evidence-present` rows: 144
- Level-1 `non-runtime` rows: 12
- Level-1 owner-evidence-required rows: 0
- Level-1 catalog-only/dead-for-now rows: 0
- Spell Unit `catalog-authored-executable-follow-up` rows: 70
- Spell Unit `needs-surface-widening` rows: 33
- Spell Unit `catalog-installed-owner-evidence-required` rows: 10
- Spell Unit `missing-authored-record` rows: 6
- Spell Unit `catalog-only/dead-for-now` rows: 74

The SRDINV24 character-sheet evidence manifest had a stale
`arcaneRecoveryMechanics` symbol reference. Updating that reference to the
existing rest-recovery projection helper made Wizard Arcane Recovery evidence
checker-visible and closed the last level-1 catalog-only/dead-for-now row.

## Source Review

Local SRD 5.2.1 source check:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md` for Animal Friendship,
  Bane, Bless, Burning Hands, Chill Touch, Chromatic Orb, Color Spray, Divine
  Favor, and Divine Smite.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md` for Ensnaring Strike,
  Entangle, Faerie Fire, False Life, Grease, Guidance, Guiding Bolt, Heroism,
  Hunter's Mark, Ice Knife, Inflict Wounds, and Longstrider.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md` for Poison Spray,
  Produce Flame, and Protection from Evil and Good.
- `.references/srd-5.2.1/Spells/Descriptions-Q-R.md` for Resistance.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md` for Sacred Flame,
  Searing Smite, Shield of Faith, Shocking Grasp, Starry Wisp, True Strike,
  and Vicious Mockery.
- `.references/srd-5.2.1/Rules-Glossary.md` and
  `.references/srd-5.2.1/Playing-the-Game.md` for Spell, Spell Attack, Attack
  Roll, Saving Throw, Concentration, Area of Effect, Bright Light, Dim Light,
  Reaction, Bonus Action, Magic action, damage, and range terms.

`UBIQUITOUS_LANGUAGE.md` was checked for Spell Definition, Spell Access, Spell
Invocation, Spell Effect, Spell Slot, Base Spell Level, using a higher-level
Spell Slot, Spell Attack, Duration, Area of Effect, Attack Roll, Saving Throw,
Temporary Hit Points, Bonus Action, Reaction, Cover, Concentration, Bright
Light, Dim Light, and Magic Action.

## Appended Batch

Because level 1 is closed, the next frontier is the remaining spell Unit
pressure. SRDINV27 selects the 70 runtime-ready
`catalog-authored-executable-follow-up` spell rows before the 33 Surface
blockers, 10 installed unsupported spell rows, 6 missing Detect spell authoring
rows, and 74 catalog-only/dead-for-now rows.

The appended batch is grouped by spell-runtime invariant:

- `SRDINV28`: spell attack and save-damage runtime.
- `SRDINV29`: area, chain, and typed-damage spell runtime.
- `SRDINV30`: buff, debuff, and protection spell runtime.
- `SRDINV31`: attack-rider and smite spell runtime.
- `SRDINV32`: Produce Flame held-light and hurled attack runtime.
- `SRDINV33`: recursive review after the spell-runtime batch lands.

## reviewer loop Convergence

- Round 1: fixed the stale Arcane Recovery manifest reference instead of adding
  duplicate inventory state; the generated evidence validator remains the
  executable boundary for level-1 completion.
- Round 2: selected only the runtime-ready authored spell follow-up rows for
  the next batch. Spell Surface blockers, installed unsupported spell rows,
  missing Detect spell records, and catalog-only/dead-for-now rows remain
  counted in generated inventory for later recursive planning.
- Round 3: split the runtime-ready spell work by execution invariant rather
  than by class list or per-spell rows; no important changes found.
