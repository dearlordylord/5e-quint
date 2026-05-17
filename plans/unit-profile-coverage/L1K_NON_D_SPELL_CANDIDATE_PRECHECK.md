# L1K Non-D Spell Candidate Precheck

Date: 2026-05-17

## Decision

Loop K owns the plan-named non-D authored Spell Definition candidate groups
below. The current plan names 53 unique initial spell ids; all 53 are present
in `UNIT_REPORT.md` / `unit-matrix.json` as SRD authored spell records with
`srd-candidate` catalog-admission disposition.

Do not add Unit claims, catalog admission, runtime behavior, or MBT evidence in
this precheck. This artifact is a planning decision only; the generated report
and matrix remain the source of truth for current checker state.

## Source Check

Generated coverage artifacts checked:

- `plans/unit-profile-coverage/UNIT_REPORT.md`: authored Surface records absent
  from the installed Unit catalog include 127 SRD spell records with executable
  mechanics.
- `plans/unit-profile-coverage/unit-matrix.json`: the same 127 spell records
  have `catalogAdmission.status = "not-in-unit-catalog"` and
  `catalogAdmission.disposition.category = "srd-candidate"`.
- `plans/unit-profile-coverage/srd-unit-inventory.json`: 211 spell-list
  pressure rows are present; they collapse to 84 unique spell ids, split into
  61 installed owner-evidence spell ids and 23 catalog-only/dead-for-now spell
  ids.
- The 53 plan-named initial candidates have no duplicates and no missing
  authored `srd-candidate` records.

Local RAW and ubiquitous-language anchors checked:

- `UBIQUITOUS_LANGUAGE.md`: Spell Definition, Spell Access, Spell Invocation,
  Spell Effect, Concentration, Area of Effect, Stat Block, Controlled Mount,
  Independent Mount.
- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Animate Dead, Animate
  Objects, Charm Person, Conjure Minor Elementals, Conjure Woodland Beings,
  Disguise Self, Druidcraft.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Elementalism, Find
  Steed, Hunter's Mark, Illusory Script.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Message,
  Prestidigitation.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Summon Dragon,
  Thaumaturgy, Unseen Servant.

## Loop-Owned Groups

| Task | Group | Candidates |
| --- | --- | --- |
| L1K-DAMAGE-SPELL-CANDIDATES | Damage spell candidates | `acid_arrow`, `scorching_ray`, `shatter`, `lightning_bolt`, `cone_of_cold`, `blight`, `mind_spike` |
| L1K-CONDITION-CONTROL-CANDIDATES | Condition/control candidates | `blindness_deafness`, `hold_person`, `fear`, `hypnotic_pattern`, `ray_of_enfeeblement`, `dominate_person` |
| L1K-PROTECTION-RESTORATION-CANDIDATES | Protection/restoration candidates | `aid`, `barkskin`, `death_ward`, `lesser_restoration`, `protection_from_poison`, `protection_from_energy` |
| L1K-MOBILITY-TRANSFORMATION-CANDIDATES | Mobility/transformation candidates | `misty_step`, `fly`, `spider_climb`, `freedom_of_movement`, `alter_self`, `polymorph` |
| L1K-ZONE-WALL-CANDIDATES | Zone/wall/emanation candidates | `web`, `moonbeam`, `spike_growth`, `wall_of_fire`, `wall_of_force`, `wall_of_stone`, `stinking_cloud`, `conjure_minor_elementals`, `conjure_woodland_beings` |
| L1K-DETECTION-COMMUNICATION-CANDIDATES | Detection/communication candidates | `clairvoyance`, `arcane_eye`, `see_invisibility`, `tongues`, `true_seeing`, `water_breathing` |
| L1K-COUNTER-DISPEL-CANDIDATES | Counter/dispel candidates | `counterspell`, `dispel_magic`, `antimagic_field`, `sequester` |
| L1K-WEAPON-ITEM-HOSTED-CANDIDATES | Weapon/item-hosted candidates | `magic_weapon`, `flame_blade`, `spiritual_weapon`, `fire_shield`, `warding_bond` |

These groups are unblocked by this precheck as candidate-intake tasks. Each
later task still has to read the local SRD spell text and classify the exact
runtime boundary before adding any claims or implementation.

## D-Owned Exclusions

Exclude the D-owned spell ids named by the loop plan:

- Installed or subset-supported spell ids already represented in
  `UNIT_REPORT.md`: `charm_person`, `hunters_mark`.
- D-owned spell-list pressure currently closed as catalog-only/dead-for-now in
  `srd-unit-inventory.json`: `disguise_self`, `druidcraft`, `elementalism`,
  `illusory_script`, `message`, `prestidigitation`, `thaumaturgy`,
  `unseen_servant`.
- All D character/container selected identity Units remain excluded from this
  spell-candidate loop.

## Companion Lifecycle Exclusions

The true companion/stat-block lifecycle exclusions from the Task 10 seed list
are:

| Candidate | Exclusion reason |
| --- | --- |
| `animate_dead` | Creates Undead creatures from corpses or bones, with command/control duration and repeated control maintenance. |
| `animate_objects` | Turns objects into Construct creatures using the Animated Object stat block, with Initiative timing, command handling, HP, and object reversion. |
| `find_steed` | Summons an Otherworldly Steed stat block with mount behavior, replacement, disappearance, and level-scaled statistics. |
| `summon_dragon` | Summons a Draconic Spirit stat block with its own turn, command behavior, HP, disappearance, and level-scaled statistics. |

Do not implement those lifecycles in Loop K. Record closure or hand them to the
companion/summon owner.

## Misrouted Task 10 Seeds

`conjure_minor_elementals` and `conjure_woodland_beings` should not be closed as
companion lifecycle exclusions under SRD 5.2.1. Their local SRD text creates
self-origin Emanations with damage, Difficult Terrain, or Bonus Action
Disengage effects; it does not create a separate creature, stat block,
Initiative participant, mount, command protocol, or companion lifecycle.

Final plan impact: route them to `L1K-ZONE-WALL-CANDIDATES` as self-origin
Emanation spell candidates, not to `L1K-COMPANION-EXCLUSION-CANDIDATES`.

## Remaining Authored Spell Candidates

The current Loop K initial groups do not classify 74 of the 127 authored
not-in-catalog `srd-candidate` spell records:

`alarm`, `animal_shapes`, `antilife_shell`, `arcane_lock`, `arcane_sword`,
`aura_of_life`, `banishment`, `beacon_of_hope`, `blade_barrier`, `blur`,
`call_lightning`, `chain_lightning`, `charm_monster`, `circle_of_death`,
`cloudkill`, `comprehend_languages`, `compulsion`, `continual_flame`,
`create_food_and_water`, `create_undead`, `daylight`, `dimension_door`,
`disintegrate`, `dominate_beast`, `dominate_monster`, `earthquake`,
`fabricate`, `finger_of_death`, `fire_storm`, `flame_strike`,
`flesh_to_stone`, `forcecage`, `geas`, `gentle_repose`,
`greater_invisibility`, `harm`, `heal`, `heat_metal`, `hold_monster`,
`holy_aura`, `ice_storm`, `identify`, `incendiary_cloud`, `insect_plague`,
`invisibility`, `major_image`, `mass_suggestion`, `maze`, `meteor_swarm`,
`mind_blank`, `pass_without_trace`, `power_word_heal`, `power_word_kill`,
`power_word_stun`, `prayer_of_healing`, `prismatic_wall`, `reverse_gravity`,
`shining_smite`, `silent_image`, `speak_with_animals`, `spirit_guardians`,
`stoneskin`, `storm_of_vengeance`, `sunbeam`, `sunburst`, `telekinesis`,
`true_polymorph`, `tsunami`, `vampiric_touch`, `wall_of_ice`,
`wall_of_thorns`, `weird`, `wind_walk`, `wind_wall`.

Those ids should stay out of Tasks 2-10 unless the decider revises the plan.

## Reviewer Loop

Round 1: RAW and domain-language pass found that
`conjure_minor_elementals` and `conjure_woodland_beings` were conflated with
companion/summon lifecycle candidates by name. The artifact now separates true
stat-block companion lifecycles from self-origin Emanation spells.

Round 2: architecture/connascence pass verified that the decision artifact does
not add checker-visible state, Unit claims, generated inventory rows, runtime
support gates, or duplicate executable evidence. Candidate ids are copied only
as task planning boundaries, with generated artifacts cited as the source of
truth.

## Verification For Implementation

- `pnpm unit-profile-coverage:check --write`
- `pnpm unit-profile-coverage:check`
- `git diff --check`

MBT is not required for this precheck because no Quint, runtime, catalog,
claims, or evidence behavior changes.
