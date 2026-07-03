# L3MSPELL-12 Spell Boundary Consolidation

Task 12 regenerated the Unit profile ledgers, closed stale lane status, and
recorded the remaining spell-level-3 pressure after the spell-boundary lane.
No runtime behavior, Surface shape, QNT owner, or MBT driver was added.

## Source Review

No new D&D rule was modeled in this task. The consolidation rechecked the
existing task notes against local RAW and project vocabulary:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md#Continual Flame` and
  `.references/srd-5.2.1/Spells/Gaining-and-Casting.md#Components` for the
  Continual Flame light and consumed Material component boundary.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md#Enlarge/Reduce`,
  `#Fireball`, `#Fly`, and `#Levitate` for the object lifecycle, area-object,
  falling/spatial, and loose-object boundaries.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md#Moonbeam` and
  `.references/srd-5.2.1/Rules-Glossary.md#Shape-Shifting` for the
  shape-shift rider closure.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md#Spike Growth` and
  `.references/srd-5.2.1/Rules-Glossary.md#Search [Action]` for the
  Search/perception terrain-recognition boundary.
- `UBIQUITOUS_LANGUAGE.md` Spell Ownership Terms, Action Lifecycle, Movement,
  Equipment, Vision and Light, and spellcasting vocabulary.

The lane keeps `in reducer = in QNT` as the executable battle support rule.
Table-only, object-system-only, and future-owner decisions remain explicit
boundaries, not promoted Unit tracer bullets.

## Consolidated Lane Outcomes

- Task 3: Continual Flame consumed Material component availability, hand/access
  legality, focus/component substitution eligibility, and inventory mutation
  belong to a future character equipment/component legality owner. Battle
  runtime owns Spell Slot spending and the admitted object-attached light Spell
  Effect, not ruby-dust stock or component-spend state.
- Task 4: Continual Flame light projection is already represented by
  `spell.invocation-object-light`. Surface content, QNT, production reducer
  admission/resolution, deterministic admission tests, selected-identity MBT
  replay, and generated ledgers all point at the shared object-light path.
- Task 5: Enlarge/Reduce creature support remains promoted under
  `spell.invocation-creature-size-change`. Object Size-category lifecycle,
  carried/worn item resizing, dropped-item normalization, and thrown
  weapon/ammunition normalization stay outside battle runtime until a generic
  object/item lifecycle owner exists.
- Task 6: Levitate creature support remains promoted under
  `spell.invocation-levitated-creature`. The loose-object branch remains outside
  battle runtime until a generic loose-object/spatial lifecycle owner exists.
- Task 7: Fireball remains promoted through
  `spell.invocation-damage-save-or-attack`, including caller-supplied
  unattended flammable-object ignition facts and emitted starts-burning
  outcomes. Automatic area membership, line of effect, object discovery,
  material flammability discovery, worn/carried discovery, grid geometry, and
  ongoing Burning hazard damage remain outside the Fireball reducer.
- Task 8: Spike Growth movement hazard support remains promoted under
  `spell.invocation-spike-growth-movement-hazard`. The camouflaged-terrain
  recognition clause is per creature and remains a runtime-detached
  Search/perception witness, not Spike Growth-local recognized terrain state.
- Task 10: Moonbeam shape-shift support is resolved through shared
  class-feature and spell-effect shape-shift owners. Stat-block Shape-Shift
  specials remain outside this profile until a generic Stat Block
  special-action active-form owner exists.
- Task 11: Promoted spell profiles have selected-identity replay evidence
  connected to production reducer or package-public runtime paths. The
  remaining selected-identity denominator gap is non-spell deterministic
  projection work and does not block spell-boundary consolidation.

## Regenerated Ledgers

`pnpm unit-profile-coverage:check -- --write` completed cleanly with 275 Units
and 159 profiles. The regenerated artifacts report:

- `plans/unit-profile-coverage/srd-unit-inventory.json`: 735 total inventory
  rows; 607 level-1 through level-3 rows; level-1 through level-3 battle
  readiness remains 600/607 (98.8%).
- Spell-level-3 pressure remains 128 rows: 24 accepted, 13 accepted with no
  battle effect, 33 owner-evidence-required, and 58 battle-runtime-required.
- The 24 installed spell-level-3 pressure rows are all accepted. No installed
  spell-level-3 spell row remains in `battle-runtime-required`.
- `plans/unit-profile-coverage/unit-matrix.json`: 275 Units, 159 profiles,
  profile classification 275/275, rules-kernel supported Unit coverage
  165/165, runtime mapping 109/109, runtime parity 109/109, selected-identity
  MBT coverage 167/172.

## Remaining Spell Pressure

The remaining spell-level-3 pressure is concrete future work, not a blocker for
this lane:

- Missing SRD-authored records with battle-runtime pressure:
  `bestow_curse`, `blink`, `conjure_animals`, `gaseous_form`,
  `glyph_of_warding`, `haste`, `magic_circle`, `meld_into_stone`,
  `nondetection`, `phantom_steed`, `plant_growth`, `remove_curse`, `revivify`,
  `sending`, `sleet_storm`, `slow`, `speak_with_dead`, `speak_with_plants`,
  `tiny_hut`, and `water_walk`.
- Authored records that still need checker-visible runtime-detached closure or
  a precise executable follow-up: `animate_dead`, `beacon_of_hope`,
  `call_lightning`, `create_food_and_water`, `daylight`, `fear`,
  `major_image`, `protection_from_energy`, `spirit_guardians`,
  `stinking_cloud`, `vampiric_touch`, and `wind_wall`.
- Accepted no-battle-effect spell-level-3 closures remain `clairvoyance`,
  `tongues`, and `water_breathing`.
- Accepted installed spell-level-3 runtime rows remain `counterspell`,
  `dispel_magic`, `fireball`, `fly`, `hypnotic_pattern`, `lightning_bolt`,
  and `mass_healing_word`.

## Plan Impact

- The deleted L3 morning spell boundary batch should stay closed; Task 12 is
  the final lane consolidation.
- `plans/ACTIVE_PLAN.md` should not advertise a non-existent promoted-unit lane
  as the next runnable queue. Future work should launch from a concrete new
  spell-level-3 pressure lane or another existing lane plan.
- Future spell work should choose narrow candidates from the remaining pressure
  lists above and either author SRD-provenance Surface records first or record
  checker-visible non-runtime closure before claiming readiness.

## Reviewer Loop Convergence

- Round 1: rejected adding runtime, Surface, QNT, MBT, or selected-identity
  evidence for Task 12. The generated ledgers already validate the existing
  evidence chain, and this task did not model a new executable rule.
- Round 2: retained the remaining pressure as explicit future work rather than
  reclassifying table/object-system-only boundaries as promoted tracer bullets.
  No duplicated battle state or authored-identity dispatch is introduced.
