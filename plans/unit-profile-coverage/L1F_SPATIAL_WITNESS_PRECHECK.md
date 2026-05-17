# L1F Spatial Witness Selected Identity Precheck

Task: `L1F-SPATIAL-PRECHECK`.

This note reconciles the Loop F task list against the current strict
level-1 report and selected-identity frontier. It records no behavior changes,
adds no Unit evidence rows, and does not change the generated matrix.

## Sources Checked

- `plans/unit-profile-coverage/UNIT_REPORT.md`
- `plans/unit-profile-coverage/LEVEL1_FULL_SUPPORT.md`
- `plans/unit-profile-coverage/level1-full-support.json`
- `plans/unit-profile-coverage/unit-matrix.json`
- `plans/unit-profile-coverage/unit-evidence.jsonl`
- `plans/unit-profile-coverage/unit-claims.jsonl`
- `UBIQUITOUS_LANGUAGE.md` terms for Reaction, Movement, Area of Effect,
  Illumination, Obscurement, and Falling.

No new D&D rule behavior is modeled here. The RAW burden remains with the later
selected-identity implementation tasks that add executable replay evidence.

## Report Snapshot

| Metric | Current value |
| --- | ---: |
| Installed collection inventory count | 144 Units |
| Deterministic admission/projection coverage | 93/93 (100%) |
| Selected identity MBT coverage | 47/93 (50.5%) |
| Strict runtime/profile support | 67/93 (72%) |
| Strict target closure | 82/93 (88.2%) |
| Product readiness | 367/367 (100%) |

## Loop F Frontier

Every planned Loop F Unit is installed, classified as `supported-profile`,
covered by deterministic admission/projection evidence, and still lacks
`selected-identity-mbt` evidence.

| Task | Unit | Supported profile ids | Current deterministic owner | Selected identity MBT |
| --- | --- | --- | --- | --- |
| L1F-DANCING-LIGHTS | `dancing_lights` | `spell.invocation-dancing-lights-movable-dim-light` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |
| L1F-FAERIE-FIRE | `faerie_fire` | `spell.invocation-attack-roll-advantage-save` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |
| L1F-FEATHER-FALL | `feather_fall` | `spell.invocation-feather-fall-mitigation` | `packages/battle-runtime/src/feather-fall-reaction-spell.test.ts` | missing |
| L1F-FOG-CLOUD | `fog_cloud` | `spell.invocation-fog-cloud-obscurement` | `packages/battle-runtime/src/index.test.ts` | missing |
| L1F-GREASE-CAST, L1F-GREASE-MOVEMENT | `grease` | `spell.invocation-grease-ground-hazard` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |
| L1F-JUMP | `jump` | `spell.invocation-jump-movement-replacement` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |
| L1F-LIGHT | `light` | `spell.invocation-object-light` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |
| L1F-PRODUCE-FLAME | `produce_flame` | `spell.invocation-damage-save-or-attack`, `spell.invocation-held-light-emitter` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |
| L1F-THUNDERWAVE | `thunderwave` | `spell.invocation-damage-save-or-attack` | `packages/battle-runtime/src/unit-profile-admission.test.ts` | missing |

## Moved Unit Check

No planned Loop F Unit moved out of scope after the current reports were
generated. No additional Unit needs to be moved into this loop from the strict
frontier based on the current checker-visible `table-caller` profiles:

| Unit | Current selected-identity state | Reconciliation outcome |
| --- | --- | --- |
| `command` | already has `selected-identity-mbt` evidence in `packages/battle-runtime/src/movement-forced-movement-selected-identity.mbt.test.ts` | leave outside Loop F |
| `sleep` | already has `selected-identity-mbt` evidence in `packages/battle-runtime/src/condition-saving-throw-selected-identity.mbt.test.ts` | leave outside Loop F |

The strict report's remaining open-profile-accounting rows are class-choice or
outside-battle-runtime accounting work, not selected spatial/table-witness Unit
identity replay work for this loop.

## Follow-On Notes

- Tasks 2 through 5 and 8 through 11 remain unblocked by this precheck.
- Tasks 6 and 7 still share the single `grease` Unit identity. Add one
  `selected-identity-mbt` evidence row for the eventual shared owner path, not
  duplicate evidence rows.
- `produce_flame` has both damage and held-light profile ids, but
  selected-identity evidence is Unit-level. Its replay should bind
  `produce_flame` through the held-light lifecycle and hurl cleanup, not only a
  generic damage profile path.
- `thunderwave` is classified under the generic damage-save profile, while its
  supported mechanics include caller-supplied push, object, and sound
  witnesses. Its replay should exercise those Unit-specific witness bindings.
