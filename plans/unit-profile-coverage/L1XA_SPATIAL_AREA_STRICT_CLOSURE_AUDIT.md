# L1XA Spatial Area Strict Closure Audit

Task: L1XA-STRICT-CLOSURE-AUDIT

Base: `75f8e3b61e7d28dfd34631ca029cfefd4f6c57b6`

This artifact audits the strict level-1 accounting rows assigned to Execution
Frontier A after the Faerie Fire, Fog Cloud, Grease, and Thunderwave closure
tasks. It does not change runtime behavior, profile claims, evidence rows, or
generated reports.

## Source Artifacts Checked

- `plans/unit-profile-coverage/L1XA_SPATIAL_AREA_FRONTIER_PRECHECK.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `.references/srd-5.2.1/Spells/Descriptions-E-L.md`
- `.references/srd-5.2.1/Spells/Descriptions-S-Z.md`
- `.references/srd-5.2.1/Playing-the-Game.md`
- `.references/srd-5.2.1/Rules-Glossary.md`
- `UBIQUITOUS_LANGUAGE.md`

## Closure Result

`LEVEL1_FULL_SUPPORT.md` now reports strict runtime/profile support at `72/93`
and strict target closure at `88/93`. The post-task strict open frontier is
exactly five rows:

`feather_fall`, `hunters_mark`, `jump`, `light`, and
`ranger_favored_enemy`.

The four Execution Frontier A spatial rows from the precheck are absent from
the `open-profile-accounting` group and present in the `supported-profile`
group:

| Unit | Precheck strict status | Post-task strict status | Post-task claim | Profile | Required evidence |
| --- | --- | --- | --- | --- | --- |
| `faerie_fire` | `open-profile-accounting` | `supported-profile` | `supported-profile` | `spell.invocation-attack-roll-advantage-save` | `SRDINV58C`; `level1-spatial-witness` selected-identity replay |
| `fog_cloud` | `open-profile-accounting` | `supported-profile` | `supported-profile` | `spell.invocation-fog-cloud-obscurement` | `SRDINV84E`; `level1-spatial-witness` selected-identity replay |
| `grease` | `open-profile-accounting` | `supported-profile` | `supported-profile` | `spell.invocation-grease-ground-hazard` | `SRDINV40`; `level1-spatial-witness` selected-identity replay |
| `thunderwave` | `open-profile-accounting` | `supported-profile` | `supported-profile` | `spell.invocation-damage-save-or-attack` | `SRDINV51`; `level1-spatial-witness` selected-identity replay |

The JSON and Markdown reports agree on the closure:

- `level1-full-support.json` groups the four units under
  `supported-profile` and reports `open-profile-accounting` as the five
  non-A rows listed above.
- `LEVEL1_FULL_SUPPORT.md` mirrors the same status groups and open frontier.
- `UNIT_REPORT.md` lists deterministic admission/projection evidence and
  selected-identity replay evidence for each of the four units.
- `unit-claims.jsonl` records all four rows with `claim.tag:
  "supported-profile"` in collection `srd-5.2.1`.
- `unit-evidence.jsonl` records both deterministic admission/projection
  evidence and `level1-spatial-witness` selected-identity replay evidence for each
  of the four units.

## Runtime Boundary Retained

No new open row remains for this lane. The supported claims retain the intended
runtime/table split instead of broadening into map automation:

| Unit | Supported runtime profile | Runtime-detached boundary retained |
| --- | --- | --- |
| `faerie_fire` | Point-origin Cube membership supplied by the table; Dexterity Saving Throw gating; Concentration-owned outline effects; Attack Roll Advantage against visible outlined creatures and objects; Invisible benefit denial; Dim Light emitter and derived Lightly Obscured projection facts. | Color presentation, automatic line-of-sight drawing, and automatic map geometry/pathfinding derivation remain outside the runtime profile. |
| `fog_cloud` | Caller-supplied fog area identity; Concentration-owned Heavily Obscured area projection; level-1 20-foot radius and slot scaling; duration cleanup; table-supplied strong-wind dispersal cleanup. | Automatic area membership, line of sight, map illumination, pathfinding, wind derivation, and grid geometry remain runtime-detached table/spatial derivations. |
| `grease` | One-minute ground hazard lifecycle; on-cast Dexterity Saving Throw; failed-save Prone application; table-triggered enter-area and end-turn saves; caller-supplied Difficult Terrain movement facts. | Automatic area membership, pathfinding, and grid geometry derivation remain runtime-detached table/spatial derivations. |
| `thunderwave` | Self-origin Cube Saving Throw boundary; slot-scaled Thunder damage; half damage on successful saves; failed-save push from caller-supplied legal-destination or blocked-push facts; unsecured-object push disposition; 300-foot audible boom evidence. | Push geometry, collision/pathfinding, final-position derivation, broad object inventory simulation, and sound propagation simulation remain runtime-detached table/spatial derivations. |

## RAW And Language Check

No new D&D rule is modeled by this audit. The checked claims continue to trace
to SRD 5.2.1 text:

- Faerie Fire: 20-foot Cube, Dexterity Saving Throw, outlined objects and
  affected creatures, Dim Light, Invisible benefit denial, and Attack Roll
  Advantage.
- Fog Cloud: 20-foot-radius Sphere, Heavily Obscured area, Concentration
  duration, strong-wind dispersal, and radius scaling.
- Grease: 10-foot square, Difficult Terrain, Dexterity Saving Throw, and Prone.
- Thunderwave: self-origin 15-foot Cube, Constitution Saving Throw, Thunder
  damage, half damage on save, push, unsecured objects, audible boom, and
  damage scaling.

`UBIQUITOUS_LANGUAGE.md` terms used in this accounting are Spell Invocation,
Spell Effect, Saving Throw, Attack Roll, Advantage, Concentration, Dim Light,
Lightly Obscured, Heavily Obscured, Movement, Difficult Terrain, and Prone.

## Remaining Open Rows

No remaining `open-profile-accounting` row is owned by Execution Frontier A.
The post-task open rows stay with the future-work split already recorded in the
plan:

| Unit | Frontier owner | Reason |
| --- | --- | --- |
| `feather_fall` | B | Fall-distance derivation, map elevation, and landing geometry simulation remain table/spatial derivations. |
| `jump` | B | Jump arc, pathfinding, collision, final-position derivation, and Difficult Terrain landing Acrobatics derivation remain table/spatial derivations. |
| `light` | B | Colored-light presentation, automatic line-of-sight drawing, and map geometry/pathfinding derivation remain outside the object-emitter runtime boundary. |
| `hunters_mark` | D | Wisdom (Perception or Survival) Advantage to find the marked target remains ability-check roll-mode work outside the promoted damage-rider runtime. |
| `ranger_favored_enemy` | D | Later-level free-cast scaling and Hunter's Mark finding Advantage remain outside this lane. |

## Follow-Up Proposal

None. `faerie_fire`, `fog_cloud`, `grease`, and `thunderwave` are no longer
strict `open-profile-accounting` rows, so this lane has no A-owned follow-up to
append.

## Reviewer-Loop Notes

- RAW traceability pass: converged; this audit cites only existing SRD-backed
  claims and does not model a new rule.
- Ubiquitous-language/domain pass: converged; terms use the repo glossary and
  keep Spell Invocation, Spell Effect, table/spatial derivation, and runtime
  profile boundaries distinct.
- Architecture/connascence pass: converged; the audit reads generated reports,
  claims, and evidence without adding duplicated state or new classifier data.
- Code-review pass: converged; no code was changed, and the product change
  is this audit artifact.
