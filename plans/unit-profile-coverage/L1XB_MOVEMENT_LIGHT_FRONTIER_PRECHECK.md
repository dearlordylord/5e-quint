# L1XB Movement Light Frontier Precheck

Task 1 precheck for `ralph/level1-exec-b/movement-light` at base
`e19da96bec7b04c62d1915419a28dd1ea2abaa53`.

## Inputs Checked

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/feather-fall-reaction-spell.test.ts`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

## Strict Frontier Snapshot

`LEVEL1_FULL_SUPPORT.md` reports strict runtime/profile support at `68/93`
and strict target closure at `84/93`. The strict open-profile-accounting set
has 9 Units:

| Unit | Assigned lane | Strict status | Claim | Closure kind |
| --- | --- | --- | --- | --- |
| `faerie_fire` | A | open-profile-accounting | profile-subset-supported | table-spatial-derivation |
| `feather_fall` | B | open-profile-accounting | profile-subset-supported | table-spatial-derivation |
| `fog_cloud` | A | open-profile-accounting | profile-subset-supported | table-spatial-derivation |
| `grease` | A | open-profile-accounting | profile-subset-supported | table-spatial-derivation |
| `hunters_mark` | D | open-profile-accounting | profile-subset-supported | social-knowledge-effect |
| `jump` | B | open-profile-accounting | profile-subset-supported | table-spatial-derivation |
| `light` | B | open-profile-accounting | profile-subset-supported | table-spatial-derivation |
| `ranger_favored_enemy` | D | open-profile-accounting | profile-subset-supported | later-level-only, social-knowledge-effect |
| `thunderwave` | A | open-profile-accounting | profile-subset-supported | table-spatial-derivation |

The ownership split is exact for the remaining strict open rows:

- Frontier B owns `feather_fall`, `jump`, and `light`.
- Frontier D owns `hunters_mark` and `ranger_favored_enemy`, and no other
  strict open-profile-accounting row.
- Frontier A owns `faerie_fire`, `fog_cloud`, `grease`, and `thunderwave`.
- Frontier K owns no strict open-profile-accounting row in this snapshot.
- No strict open-profile-accounting row is unassigned by this split.

## Frontier B Rows

| Unit | Runtime-supported subset already claimed | Deferred accounting reason | Evidence |
| --- | --- | --- | --- |
| `feather_fall` | Falling Reaction trigger, up-to-five falling targets, Reaction and level-1 Spell Slot spend, per-target one-minute mitigation, 60-foot-per-round descent cap projection, landing cleanup, no-fall-damage outcome, and Falling-Prone suppression. | Fall-distance derivation, map elevation, and landing geometry simulation remain table/spatial derivations. | deterministic `SRDINV56A` in `feather-fall-reaction-spell.test.ts`; selected identity `level1-spatial-witness` in `level1-spatial-witness-selected-identity.mbt.test.ts`. |
| `jump` | Bonus Action Spell Slot casting, touched willing targets, slot-scaled target count, one-minute duration, once-per-target-turn use marker, 10-foot Movement spend for up to 30 feet of jump movement, legal landing witness, and failed Difficult Terrain landing Prone outcome. | Runtime-owned jump arc, pathfinding, collision, final-position derivation, and Difficult Terrain landing Acrobatics check derivation remain table/spatial derivations. | deterministic `SRDINV53` in `unit-profile-admission.test.ts`; selected identity `level1-spatial-witness` in `level1-spatial-witness-selected-identity.mbt.test.ts`. |
| `light` | Magic Action cantrip cast, touched Large-or-smaller object admission, worn/carried rejection, object-attached Bright/Dim Light emitter, one-hour duration cleanup, same-caster recast replacement, opaque-cover suppression witness, and derived sight-obscurement/Darkvision consequences. | Colored-light presentation, automatic line-of-sight drawing, and automatic map geometry/pathfinding derivation remain outside the object-emitter runtime boundary. | deterministic `SRDINV70B` in `unit-profile-admission.test.ts`; selected identity `level1-spatial-witness` in `level1-spatial-witness-selected-identity.mbt.test.ts`. |

## RAW And Ubiquitous-Language Check

No rule behavior is changed by this precheck. The terminology and frontier
labels above were checked against:

- Feather Fall, Jump, and Light in `Descriptions-E-L.md`.
- Vision and Light plus Difficult Terrain in `Playing-the-Game.md`.
- Falling, Jumping, Long Jump, Bright Light, Dim Light, and Lightly Obscured in
  `Rules-Glossary.md`.
- Movement, Difficult Terrain, Long Jump, High Jump, Illumination,
  Obscurement, Darkvision, and Falling in `UBIQUITOUS_LANGUAGE.md`.

The existing claims preserve the boundary between runtime-owned executable
facts and table/spatial or presentation derivations. This precheck introduces
no duplicate state, no new support status, and no runtime behavior changes.

## Task Impact

- Task 2 (`L1XB-FEATHER-FALL-CLOSURE`) remains the B-owned closure task for
  `feather_fall`.
- Task 3 (`L1XB-JUMP-CLOSURE`) remains the B-owned closure task for `jump`.
- Task 4 (`L1XB-LIGHT-CLOSURE`) remains the B-owned closure task for `light`.
- Task 5 (`L1XB-STRICT-CLOSURE-AUDIT`) remains blocked on Tasks 2-4.
- Frontier A, D, and K rows should remain out of scope for this lane.
