# L1XB Movement Light Strict Closure Audit

Task 5 audit for `ralph/level1-exec-b/movement-light` at base
`151831a4317445a399ba44787b5d8b150dea932c`.

## Inputs Checked

- `plans/unit-profile-coverage/L1XB_MOVEMENT_LIGHT_FRONTIER_PRECHECK.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `UBIQUITOUS_LANGUAGE.md`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`

## Strict Closure Result

The Task 1 precheck recorded 9 strict `open-profile-accounting` Units and
assigned `feather_fall`, `jump`, and `light` to Frontier B. After Tasks 2-4,
the generated strict report records 6 strict `open-profile-accounting` Units:
`faerie_fire`, `fog_cloud`, `grease`, `hunters_mark`,
`ranger_favored_enemy`, and `thunderwave`.

| Report | Strict runtime/profile support | Strict target closure | Strict open-profile-accounting Units |
| --- | ---: | ---: | --- |
| Task 1 precheck | 68/93 | 84/93 | 9, including `feather_fall`, `jump`, and `light` |
| Post-Task-4 generated report | 71/93 | 87/93 | 6, excluding `feather_fall`, `jump`, and `light` |

The delta is exactly the three Frontier B Units. No Frontier B row remains in
strict `open-profile-accounting`.

## Unit Proof

| Unit | Precheck strict status | Post-Task-4 strict status | Generated evidence |
| --- | --- | --- | --- |
| `feather_fall` | `open-profile-accounting` with `profile-subset-supported` | `supported-profile` | `unit-claims.jsonl` claims `spell.invocation-feather-fall-mitigation`; `unit-evidence.jsonl` records deterministic `SRDINV56A` and selected identity `level1-spatial-witness`; `UNIT_REPORT.md` records the same deterministic and MBT evidence. |
| `jump` | `open-profile-accounting` with `profile-subset-supported` | `supported-profile` | `unit-claims.jsonl` claims `spell.invocation-jump-movement-replacement`; `unit-evidence.jsonl` records deterministic `SRDINV53` and selected identity `level1-spatial-witness`; `UNIT_REPORT.md` records the same deterministic and MBT evidence. |
| `light` | `open-profile-accounting` with `profile-subset-supported` | `supported-profile` | `unit-claims.jsonl` claims `spell.invocation-object-light`; `unit-evidence.jsonl` records deterministic `SRDINV70B` and selected identity `level1-spatial-witness`; `UNIT_REPORT.md` records the same deterministic and MBT evidence. |

## Boundary Check

The closure keeps the Task 1 runtime/table split intact:

- `feather_fall` owns the falling Reaction trigger, target admission,
  Reaction and Spell Slot spend, mitigation effect, descent-rate cap
  projection, landing cleanup, no-fall-damage outcome, and Falling-Prone
  suppression. Fall-distance derivation, map elevation, and landing geometry
  remain table adjudication.
- `jump` owns Bonus Action casting, willing touched targets, slot-scaled target
  count, duration, per-target-turn use, 10-foot Movement spend for up to
  30 feet of jump movement, legal landing witnesses, and failed Difficult
  Terrain landing Prone outcomes. Jump arc, pathfinding, collision,
  final-position derivation, legal-destination derivation, and the
  Difficult Terrain landing Dexterity (Acrobatics) check derivation remain
  table adjudication.
- `light` owns Magic Action cantrip casting, object admission, worn/carried
  rejection, object-attached Bright/Dim Light emitter state, duration cleanup,
  same-caster recast replacement, opaque-cover witness handling, and derived
  sight-obscurement/Darkvision consequences. Colored-light presentation,
  automatic line-of-sight drawing, and automatic map geometry/pathfinding
  derivation remain table adjudication or presentation.

No new data shape, duplicate state, runtime behavior, or generated support
status was introduced by this audit.

## RAW And Ubiquitous-Language Check

The audit checked the closure claims against the local SRD 5.2.1 corpus:

- `Descriptions-E-L.md` for Feather Fall, Jump, and Light spell text.
- `Playing-the-Game.md` for Vision and Light.
- `Rules-Glossary.md` for Falling, Jumping, Long Jump, High Jump, Bright
  Light, Dim Light, Lightly Obscured, and Darkvision.
- `UBIQUITOUS_LANGUAGE.md` for Long Jump, High Jump, Illumination,
  Obscurement, Darkvision, and Falling terminology.

The generated claims continue to model only the runtime-owned spell boundaries.
The remaining table/presentation derivations are intentionally not promoted
into Frontier B runtime state.

## Follow-Up Proposal

None. The Task 5 target Units are absent from strict `open-profile-accounting`,
so no Frontier B follow-up task is needed.

## Plan Impact

- Task 5 (`L1XB-STRICT-CLOSURE-AUDIT`) can be marked done.
- Tasks 1-4 remain done.
- Frontier A rows `faerie_fire`, `fog_cloud`, `grease`, and `thunderwave`
  remain unchanged.
- Frontier D rows `hunters_mark` and `ranger_favored_enemy` remain unchanged.
- No new task is required for Frontier B movement/light closure.
