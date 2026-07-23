# Inventory: inert authored identity retained by Battle runtime

Issue: [#224](https://github.com/dearlordylord/5e-quint/issues/224)  
Parent: [#202](https://github.com/dearlordylord/5e-quint/issues/202) — Complete battle-runtime import ownership migration  
Related: [#170](https://github.com/dearlordylord/5e-quint/issues/170), [#208](https://github.com/dearlordylord/5e-quint/issues/208)

## Decision

Authored data may be retained inertly in Battle composition, state, snapshots, active effects, companions, and execution-facing projections when it has a concrete domain purpose. Battle execution must not dispatch, replay, select mechanics, allocate procedures, or change outcomes based on authored identity.

This inventory records every retained authored-identity field, its domain owner, its actual consumer, and a proof that it does not drive execution behavior. No temporary exception is required; `pnpm check:authored-id-dispatch` and `pnpm check:battle-runtime-import-ownership` pass without broader allowlisting or a legacy mixed-owner exception.

## Scope

Covered:

- `BattleCreatureState` and `BattleCreatureOriginSnapshot`.
- `StatBlockBattleOrigin` and Stat Block form admissions used by Druid Wild Shape.
- Active effects that carry Stat Block identity.
- Companion/familiar settlement and snapshot fields.
- Execution-facing projections (`SpellInvocationRef`, `BattleSubject` rejected identity fields).

Not covered (outside Battle runtime or already removed):

- Catalog/schema authored identity owned by `@dnd/surface`.
- Character-creation support-profile boundaries (allowlisted separately).
- Authored-name replay keys removed in #170.

## Inventory

### 1. Character identity on the character-origin branch of `BattleCreatureState`

| Field         | `BattleCreatureState.origin.kind === "character"`.`characterId: CharacterId`                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Composition / selection → settlement / catalog reference.                                                                                                                                                                                  |
| Consumer      | `battle-reducer/creature-state.ts` admits it from `CharacterBattleCreatureInit`; `battle-reducer/creature-state-execution.ts` copies it into `BattleCreatureOriginSnapshot` so snapshots can restore or settle the owning Character Build. |
| Execution use | None. Reducer replay, discovery, and resolution never branch on `characterId`.                                                                                                                                                             |
| Verdict       | Keep. The field is required to map a battle combatant back to its source Character Build across snapshot and settlement boundaries.                                                                                                        |

### 2. Character display name on the character-origin branch of `BattleCreatureState`

| Field         | `BattleCreatureState.origin.kind === "character"`.`displayName: string`                                                                                                                                                                                                                                                |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join.                                                                                                                                                                                                                                                                                                     |
| Consumer      | `stat-block-presentation.ts::battleCreaturePresentationDisplayName` reads it to produce `BattlePresentedSnapshot` labels. `battle-reducer/creature-state-execution.ts` copies it into the snapshot top-level `displayName` for characters.                                                                             |
| Execution use | None. No reducer file reads `origin.displayName`.                                                                                                                                                                                                                                                                      |
| Verdict       | Retained in execution state as a snapshot convenience, symmetric to how Stat Block display names live in `BattleStatBlockPresentationSource`. It is purely presentation and could be moved to `CharacterBattleRuntimeContext` in a future cleanup; this inventory documents that it is inert and not behavior-driving. |

### 3. Character identity in `BattleCreatureOriginSnapshot`

| Field         | `BattleCreatureOriginSnapshot.kind === "character"`.`characterId: CharacterId`                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Settlement / catalog reference.                                                                                                                   |
| Consumer      | Snapshot consumers (session restore, settlement, caller-facing diagnostics) use it to re-associate the combatant with the source Character Build. |
| Execution use | None. The snapshot is produced from state, never read by the reducer.                                                                             |
| Verdict       | Keep. Mirrors the execution-state field at the durable-snapshot boundary.                                                                         |

### 4. Stat Block identity in `StatBlockBattleOrigin`

| Field         | `StatBlockBattleOrigin.statBlockId: StatBlockId`                                                                                                                                                                                                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Catalog reference / companion settlement.                                                                                                                                                                                                                                                                                                             |
| Consumer      | `battle-reducer/battle-snapshot.ts`, `battle-reducer/interrupt-execution.ts`, and `find-familiar-lifecycle-execution.ts` read `origin.statBlockId` to resolve the Stat Block ID of a present familiar/companion for snapshots and stored-form settlement. `battle-reducer/creature-state-execution.ts` copies it into `BattleCreatureOriginSnapshot`. |
| Execution use | None. The reducer derives all mechanics from `StatBlockBattleOrigin.mechanics` and `execution`; `statBlockId` is never used to select procedure behavior.                                                                                                                                                                                             |
| Verdict       | Keep. Required for companion reappearance and for callers that must know which authored Stat Block a combatant represents.                                                                                                                                                                                                                            |

### 5. Stat Block identity in `BattleCreatureOriginSnapshot`

| Field         | `BattleCreatureOriginSnapshot.kind === "statBlock"`.`statBlockId: string`                  |
| ------------- | ------------------------------------------------------------------------------------------ |
| Domain owner  | Settlement / catalog reference.                                                            |
| Consumer      | Snapshot consumers use it to re-associate the combatant with the source Stat Block record. |
| Execution use | None.                                                                                      |
| Verdict       | Keep. Mirrors the execution-state field at the durable-snapshot boundary.                  |

### 6. Druid Wild Shape form Stat Block identity

| Field         | `BattleCreatureState.origin.kind === "character"`.`druidWildShapeAvailableForms: StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>[]` (carries `statBlock.id` and `execution`) and the active effect `druidWildShapeForm.formStatBlockId: string`.                                                                                                                                                                   |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → settlement / procedure presentation.                                                                                                                                                                                                                                                                                                                                                                |
| Consumer      | `battle-reducer/druid-wild-shape.ts` matches `formStatBlockId` against available form admissions to validate assume/dismiss and to derive the current form's mechanics. `stat-block-presentation.ts::statBlockProcedurePresentationsForActor` uses the admission to project attack/action labels while the druid is shape-shifted. `battle-reducer/creature-state-execution.ts` persists `statBlockId` per form in snapshots. |
| Execution use | The form identity selects which admitted mechanical facts apply; it does not select reducer semantics. The same procedure families (attack, movement, size change, etc.) run regardless of which specific form is chosen.                                                                                                                                                                                                     |
| Verdict       | Keep. The form identity is the composition boundary's record of which Stat Block the player selected; it is needed to re-derive mechanical facts and presentation without duplicating the full Stat Block in battle state.                                                                                                                                                                                                    |

### 7. Companion/familiar resolved Stat Block identity

| Field         | `BattleCompanionStoredForm.resolvedStatBlockId: StatBlockId` and `BattleCompanionPresentSnapshotFields.resolvedStatBlockId: StatBlockId`.                                                                                                             |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Companion settlement / reappearance.                                                                                                                                                                                                                  |
| Consumer      | `find-familiar-lifecycle.ts` and `find-familiar-lifecycle-execution.ts` use the stored ID to re-materialize a dismissed or zero-HP familiar. `battle-reducer/battle-snapshot.ts` and `battle-reducer/interrupt-execution.ts` include it in snapshots. |
| Execution use | None. The reducer does not branch on the stored ID; it only copies it through settlement and snapshot paths.                                                                                                                                          |
| Verdict       | Keep. Required for SRD Find Familiar/Pact of the Chain reappearance and cross-battle settlement.                                                                                                                                                      |

### 8. Spell identity in `SpellInvocationRef`

| Field         | `SpellInvocationRef.spellId: SpellId`                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                                          |
| Consumer      | `battle-runtime-context.ts` stores `CharacterSpellPresentationSource` (which includes the `SpellInvocationRef`) so presentation can label cast/readied spells. Battle subjects carry `invocation: SpellInvocationRef` only through the explicit presentation-ref path (`spells-invocation-ref.ts`). |
| Execution use | None. The reducer dispatches by `procedure` (e.g., `"spellAttackDamage"`, `"saveGatedCondition"`) and by admitted mechanics, never by `spellId`. `check-authored-id-dispatch-boundary.cjs` enforces that authored `spell.name`/`id` keys do not appear in reducer execution files.                  |
| Verdict       | Keep. The Spell Invocation Ref is a composition/selection record that joins back to the authored Spell record for labels and traceability; it is rejected as a replay or execution key.                                                                                                             |

### 9. Unit and Stat Block references in presentation context

| Field         | `CharacterBattleRuntimeContext.unitPresentationSources: readonly BattleUnitRef[]` and `BattleStatBlockPresentationSource` / `BattleStatBlockProcedurePresentation` records carried in `BattleRuntimeContext.statBlocks`.                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                            |
| Consumer      | `stat-block-presentation.ts` and `battle-act-composition.ts` join execution procedure refs back to Unit/Stat Block authored names and labels for caller-facing discovery output. `battle-runtime-context.ts` stores these sources alongside the session, separate from `BattleState`. |
| Execution use | None. The reducer receives only the authored-free `BattleState`; `BattleRuntimeContext` is consumed by presentation and composition helpers after discovery.                                                                                                                          |
| Verdict       | Keep. These references are explicitly outside reducer execution and are the canonical place where authored identity is joined back to execution facts for labels.                                                                                                                     |

### 10. Rejected identity fields in `BattleSubject`

| Field         | `unitId`, `sourceUnitId`, `resourceUnitId`, `componentWeaponItemId`, `sourceSpellId`, `formStatBlockId`, `attackName`, `statBlockSection`, `statBlockDamageNotation` on `BattleSubject` variants. |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Execution boundary enforcement.                                                                                                                                                                   |
| Consumer      | `battle-subjects.ts` schemas set these fields to `Schema.optionalWith(Schema.Never, { exact: true })`, proving they are not admitted as replay/execution keys.                                    |
| Execution use | None by design.                                                                                                                                                                                   |
| Verdict       | Keep as explicit rejection. They document the boundary: authored identity is not a replay key.                                                                                                    |

## Verification

- `pnpm check:authored-id-dispatch` passes with the existing narrow allowlist (catalog, composition-selection, test-fixture, character-creation, character-sheet-companion, battle-runtime unit-profile admission test support). No broader allowlisting was added.
- `pnpm check:battle-runtime-import-ownership` passes for the protected execution-root set.
- No reducer file branches on `characterId`, `statBlockId`, `formStatBlockId`, `spellId`, or `displayName` to choose mechanics, allocate procedures, or alter outcomes.

## Notes

- The asymmetric placement of character `displayName` (execution state) versus Stat Block `displayName` (presentation context, `BattleStatBlockPresentationSource`) is noted. Both are presentation-only; the character path retains it in state as a snapshot convenience. A future cleanup may move it to `CharacterBattleRuntimeContext`; this inventory is the authoritative record of that deferred decision.
- All other retained identity fields have a non-presentation domain consumer (settlement, catalog reference, companion reappearance, or form selection).
