# L1XA Spatial Area Frontier Precheck

Task: L1XA-PRECHECK

Base: `e19da96bec7b04c62d1915419a28dd1ea2abaa53`

This artifact records the strict level-1 frontier split before the spatial area
closure tasks. It does not change runtime behavior, profile claims, evidence, or
generated reports.

## Source Artifacts Checked

- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `packages/battle-runtime/src/level1-spatial-witness-selected-identity.mbt.test.ts`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `.references/srd-5.2.1/Classes/Ranger.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

## Strict Snapshot

`LEVEL1_FULL_SUPPORT.md` reports strict runtime/profile support at `68/93`
and strict target closure at `84/93`. The strict open frontier is exactly these
nine `open-profile-accounting` Units:

`faerie_fire`, `feather_fall`, `fog_cloud`, `grease`, `hunters_mark`, `jump`,
`light`, `ranger_favored_enemy`, and `thunderwave`.

Each of the nine open Units has an installed catalog row and a
`profile-subset-supported` claim. The open status means strict support or
closure accounting still needs profile, evidence, or classifier work; it does
not mean there is no runtime evidence.

## Execution Frontier A Rows

| Unit | Strict status | Closure kind | Evidence | Remaining frontier |
| --- | --- | --- | --- | --- |
| `faerie_fire` | `open-profile-accounting` | `table-spatial-derivation` | `SRDINV58C`; `level1-spatial-witness` selected-identity MBT | Color rendering, automatic line-of-sight drawing, and automatic map geometry/pathfinding derivation. |
| `fog_cloud` | `open-profile-accounting` | `table-spatial-derivation` | `SRDINV84E`; `level1-spatial-witness` selected-identity MBT | Automatic area membership, line of sight, map illumination, pathfinding, wind derivation, and grid geometry. |
| `grease` | `open-profile-accounting` | `table-spatial-derivation` | `SRDINV40`; `level1-spatial-witness` selected-identity MBT | Automatic area membership, pathfinding, and grid geometry derivation for Grease movement. |
| `thunderwave` | `open-profile-accounting` | `table-spatial-derivation` | `SRDINV51`; `level1-spatial-witness` selected-identity MBT | Push geometry, collision/pathfinding, final-position derivation, broad object inventory simulation, and sound propagation simulation. |

These four rows are the only Task A spatial area closure rows. Their SRD source
texts are Faerie Fire, Fog Cloud, and Grease in
`.references/srd-5.2.1/Spells/Descriptions-E-L.md`, and Thunderwave in
`.references/srd-5.2.1/Spells/Descriptions-S-Z.md`.

## Other Strict Open Rows

| Frontier owner | Units | Confirmation |
| --- | --- | --- |
| B | `feather_fall`, `jump`, `light` | These are strict-open `table-spatial-derivation` rows with selected-identity MBT evidence in `level1-spatial-witness`; they belong to Execution Frontier B, not Task A. |
| D | `hunters_mark`, `ranger_favored_enemy` | These are the only D-owned rows among the remaining strict open Units. `hunters_mark` is open on the Wisdom (Perception or Survival) ability-check roll-mode gap, and `ranger_favored_enemy` is open on later-level free-cast scaling plus the same Hunter's Mark finding-Advantage gap. |

No remaining strict open row is assigned to K in this frontier split.

## RAW And Language Check

No new D&D rule is modeled here. The precheck reuses existing claims and
evidence, then confirms their RAW anchors:

- Faerie Fire: 20-foot Cube outlines, Dexterity Saving Throw, Dim Light,
  Invisible denial, and Attack Roll Advantage.
- Fog Cloud: 20-foot-radius Sphere, Heavily Obscured area, Concentration
  duration, strong-wind dispersal, and radius scaling.
- Grease: 10-foot square, Difficult Terrain, Dexterity Saving Throw, and Prone.
- Thunderwave: self-origin 15-foot Cube, Constitution Saving Throw, Thunder
  damage, push, unsecured objects, audible boom, and damage scaling.
- Feather Fall, Jump, Light, Hunter's Mark, and Favored Enemy were checked only
  to confirm ownership boundaries.

`UBIQUITOUS_LANGUAGE.md` terminology used for this accounting includes Spell
Invocation, Spell Effect, Saving Throw, Attack Roll, Movement, Difficult
Terrain, Illumination, Obscurement, Lightly Obscured, Heavily Obscured,
Advantage, and Prone.

## Implementation Boundary

Task 1 is a precheck artifact only. Runtime reducers, Quint specs, MBT bridge
code, profile claims, and evidence rows remain unchanged.
