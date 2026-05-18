# L1H Special And Tail Precheck

Task 1 reconciles Loop H against the generated strict level-1 report and the
selected identity MBT denominator. No runtime behavior or rule model changed in
this precheck.

## Source Artifacts

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- historical D/G/E/F/H loop run artifacts; the standalone top-level plan files
  have since been removed from master

## Metrics

The generated coverage artifacts report:

| Metric | Value |
| --- | ---: |
| Strict executable denominator | 93 |
| Strict runtime/profile support | 67/93 (72%) |
| Strict target closure | 82/93 (88.2%) |
| Selected identity MBT coverage | 47/93 (50.5%) |

There are 46 supported-profile Unit ids still missing
`selected-identity-mbt` evidence. Of those, 38 are strict supported-profile
Units in the level-1 report and 8 are outside the strict level-1 denominator.

## Loop H Reconciliation

The five strict Loop H spell Units are still strict supported-profile Units and
still lack selected identity MBT evidence:

| Task | Unit | Profile |
| --- | --- | --- |
| L1H-ANIMAL-FRIENDSHIP | `animal_friendship` | `spell.creature-type-protection-and-charm` |
| L1H-PROTECTION-EVIL-GOOD | `protection_from_evil_and_good` | `spell.creature-type-protection-and-charm` |
| L1H-ELDRITCH-BLAST | `eldritch_blast` | `spell.invocation-independent-attack-sequence` |
| L1H-MAGE-ARMOR | `mage_armor` | `spell.invocation-damage-save-or-attack`, `spell.readied-action-time-spell` |
| L1H-SANCTUARY | `sanctuary` | `spell.invocation-sanctuary-targeting-interdiction` |

Keep those five strict tasks ahead of the non-strict tail tasks.

The seven planned SRD tail tasks are all supported-profile Unit ids in the
selected identity denominator and still lack selected identity MBT evidence:

| Task | Unit | Strict level-1 status | Profile |
| --- | --- | --- | --- |
| L1H-MASS-CURE-WOUNDS | `mass_cure_wounds` | outside strict denominator | `spell.hit-point-restoration` |
| L1H-MASS-HEALING-WORD | `mass_healing_word` | outside strict denominator | `spell.hit-point-restoration` |
| L1H-FIGHTER-TACTICAL-MIND | `fighter_tactical_mind` | outside strict denominator | `unit-feature.failed-ability-check-resource-boost` |
| L1H-BOON-COMBAT-PROWESS | `feat_boon_of_combat_prowess` | outside strict denominator | `unit-feature.attack-roll-miss-to-hit-replacement` |
| L1H-ORC-ADRENALINE-RUSH | `orc_adrenaline_rush` | outside strict denominator | `unit-feature.bonus-action-dash-temporary-hit-points` |
| L1H-PALADIN-EXTRA-ATTACK | `paladin_extra_attack` | outside strict denominator | `unit-feature.attack-action-attack-count-scaling` |
| L1H-RANGER-EXTRA-ATTACK | `ranger_extra_attack` | outside strict denominator | `unit-feature.attack-action-attack-count-scaling` |

These SRD tail tasks remain valid denominator work after the strict Loop H
spell tasks, provided sibling strict loops keep their existing ownership.

## Other Strict Gaps

No additional strict supported-profile Unit is unowned by the selected identity
loop family:

- Loop D owns the strict damage and chained-damage spell identities:
  `burning_hands`, `chromatic_orb`, `ice_knife`, `poison_spray`,
  `ray_of_sickness`, `sacred_flame`, `sorcerous_burst`, `starry_wisp`, and
  `vicious_mockery`.
- Loop E owns the strict buff, mark, smite, and weapon-attack spell identities:
  `divine_favor`, `divine_smite`, `ensnaring_strike`, `false_life`, `heroism`,
  `hex`, `hunters_mark`, `longstrider`, `searing_smite`, `shillelagh`, and
  `true_strike`.
- Loop F owns the strict spatial or table-witness spell identities:
  `dancing_lights`, `faerie_fire`, `feather_fall`, `fog_cloud`, `grease`,
  `jump`, `light`, `produce_flame`, and `thunderwave`.
- Loop G owns the strict character or class-selected identities:
  `barbarian_unarmored_defense`, `monk_unarmored_defense`,
  `sorcerer_innate_sorcery`, and `wizard_ritual_adept`.

## Classic Non-SRD Tail Gap

`mycelium_step` is the only additional supported-profile Unit in the selected
identity denominator that is outside the strict level-1 report, lacks selected
identity MBT evidence, and was not named by the original Loop H task list. It
belongs to the `classic-2024-non-srd-mechanics` collection, not the SRD
collection:

| Unit | Collection | Profile |
| --- | --- | --- |
| `mycelium_step` | `classic-2024-non-srd-mechanics` | `unit-feature.alternate-action-cost` |

The source plan keeps this denominator work visible as
`L1H-MYCELIUM-STEP`, ordered after the SRD tail tasks. That task must stay
inside the QMBT17 Classic non-SRD mechanics-only policy boundary and must not
add protected non-SRD source identity or SRD RAW claims.

## RAW And Vocabulary Check

No new D&D rule behavior was modeled. The strict Loop H spell names were checked
against the local SRD 5.2.1 corpus:

- `.references/srd-5.2.1/Spells/Descriptions-A-D.md`: Animal Friendship.
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`: Eldritch Blast.
- `.references/srd-5.2.1/Spells/Descriptions-M-P.md`: Mage Armor and
  Protection from Evil and Good.
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`: Sanctuary.
- `UBIQUITOUS_LANGUAGE.md`: Magic Action, Spell Invocation, Attack Roll,
  Saving Throw, Armor Class, Charmed, Frightened, and target terminology.

The Classic non-SRD tail gap was checked against
`plans/unit-profile-coverage/QMBT17_CLASSIC_NON_SRD_MECHANICS_INTAKE_POLICY.md`
and `plans/unit-profile-coverage/fixtures/classic-non-srd/mycelium_step.json`.

## Verification Notes

- This task made documentation-only reconciliation changes.
- No MBT was run because no reducer, QNT, or selected replay behavior changed.
- reviewer loop round 1: keep Tasks 2-6 first because they are strict supported
  spell Units still missing selected identity evidence.
- reviewer loop round 2: keep Tasks 7-13 as SRD tail denominator work and add
  Task 14 for the Classic non-SRD denominator gap.
