# Inventory: authored identity retained by Battle runtime

Issue: [#224](https://github.com/dearlordylord/5e-quint/issues/224)  
Parent: [#202](https://github.com/dearlordylord/5e-quint/issues/202) — Complete battle-runtime import ownership migration  
Related: [#170](https://github.com/dearlordylord/5e-quint/issues/170), [#208](https://github.com/dearlordylord/5e-quint/issues/208)

## Decision

Authored data may be retained inertly in Battle composition, state, snapshots, active effects, companions, and execution-facing projections when it has a concrete domain purpose. Battle execution must not dispatch, replay, select mechanics, allocate procedures, or change outcomes based on authored identity.

This inventory records **every retained authored-identity field** inside the declared scope, its domain owner, its actual consumer, and whether it drives execution behavior. It distinguishes:

- **inert identity** — retained for settlement, catalog reference, composition selection, or presentation, with no execution behavior dependence;
- **behavior-driving identity** — retained authored IDs that currently select mechanics or alter outcomes.

Behavior-driving identity is documented here as **not inert** and, where it leaks into reducer execution, as a future cleanup target. No temporary exception is required; `pnpm check:authored-id-dispatch` and `pnpm check:battle-runtime-import-ownership` pass without broader allowlisting or a legacy mixed-owner exception.

## Scope

Covered:

- `BattleCreatureState` and `BattleCreatureOriginSnapshot`.
- `StatBlockBattleOrigin` and Stat Block form admissions used by Druid Wild Shape.
- Active effects that carry Stat Block identity.
- Companion/familiar settlement and snapshot fields.
- Character loadout and Weapon Mastery selections.
- Spell execution facts.
- Execution-facing projections (`SpellInvocationRef`, `BattleActPresentation`, `BattleSubject` rejected identity fields).

Not covered (outside Battle runtime or already removed):

- Catalog/schema authored identity owned by `@dnd/surface`.
- Character-creation support-profile boundaries (allowlisted separately).
- Authored-name replay keys removed in #170.

## Classification key

| Verdict                               | Meaning                                                                                                                                                                                                                                        |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Keep — inert`                        | Identity is retained for a legitimate non-execution purpose and does not select mechanics or alter outcomes.                                                                                                                                   |
| `Keep — composition boundary`         | Identity is owned by composition/selection; it selects which mechanical facts are admitted but does not drive reducer replay semantics. Still behavior-driving under a strict reading, so documented separately from inert identity.           |
| `Keep — settlement/catalog reference` | Identity is required to re-associate state with an authored record across snapshot or settlement boundaries.                                                                                                                                   |
| `Keep — presentation`                 | Identity is used only for caller-facing labels and discovery output.                                                                                                                                                                           |
| `Cleanup`                             | Identity is used inside reducer execution to choose mechanics or alter outcomes; this violates the "no execution dependence on authored identity" principle and should be replaced with typed execution references or parsed mechanical facts. |

## Inert identity

Fields in this section have no execution behavior dependence inside a single battle. Renaming them synthetically (while keeping their owning records consistent) changes no reducer outcome during battle execution.

### 1. Character identity on the character-origin branch of `BattleCreatureState`

| Field         | `BattleCreatureState.origin.kind === "character"`.`characterId: CharacterId`                                                                                                                                                                                                                                                                                                                   |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Settlement / catalog reference.                                                                                                                                                                                                                                                                                                                                                                |
| Consumer      | `battle-reducer/creature-state.ts` admits it from `CharacterBattleCreatureInit`; `battle-reducer/creature-state-execution.ts` copies it into `BattleCreatureOriginSnapshot`; `character-battle-runtime` settlement (`settleBattleCombatantIntoCharacterSheet`) matches it against the source `CharacterSheet.characterId`; MCP `battle-handoff.ts` reads it to finalize the character session. |
| Execution use | None. Reducer replay, discovery, and resolution never branch on `characterId`.                                                                                                                                                                                                                                                                                                                 |
| Verdict       | Keep — settlement/catalog reference.                                                                                                                                                                                                                                                                                                                                                           |

### 2. Character display name on the character-origin branch of `BattleCreatureState`

| Field         | `BattleCreatureState.origin.kind === "character"`.`displayName: string`                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join.                                                                                                                                                                                                                                                                                                                          |
| Consumer      | `stat-block-presentation.ts::battleCreaturePresentationDisplayName` reads it to produce `BattlePresentedSnapshot` labels. `battle-reducer/creature-state-execution.ts` copies it into the snapshot top-level `displayName` for characters.                                                                                                  |
| Execution use | None. No reducer file reads `origin.displayName`.                                                                                                                                                                                                                                                                                           |
| Verdict       | Keep — presentation. Retained in execution state as a snapshot convenience, symmetric to how Stat Block display names live in `BattleStatBlockPresentationSource`. It is purely presentation and could be moved to `CharacterBattleRuntimeContext` in a future cleanup; this inventory documents that it is inert and not behavior-driving. |

### 3. Character identity in `BattleCreatureOriginSnapshot`

| Field         | `BattleCreatureOriginSnapshot.kind === "character"`.`characterId: CharacterId`                                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Settlement / catalog reference mirror.                                                                                                                                                                                                                                                       |
| Consumer      | Snapshot consumers (`battle-reducer/battle-snapshot.ts`, `battle-reducer/interrupt-execution.ts`) copy it through. Settlement reads `BattleCreatureState.origin.characterId`, not the snapshot field; the snapshot value mirrors the execution-state field at the durable-snapshot boundary. |
| Execution use | None. The snapshot is produced from state, never read by the reducer. No production consumer reads the snapshot `characterId`.                                                                                                                                                               |
| Verdict       | Keep — settlement/catalog reference mirror. The snapshot field exists only to preserve the identity across serialization; it is not independently consumed.                                                                                                                                  |

### 4. Stat Block identity in `BattleCreatureOriginSnapshot`

| Field         | `BattleCreatureOriginSnapshot.kind === "statBlock"`.`statBlockId: string`                                                                                                                                                                                 |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Settlement / catalog reference mirror.                                                                                                                                                                                                                    |
| Consumer      | Snapshot consumers (`battle-reducer/battle-snapshot.ts`, `battle-reducer/interrupt-execution.ts`) copy it through. No production consumer reads the snapshot `statBlockId` independently; Stat Block presentation uses `BattleRuntimeContext.statBlocks`. |
| Execution use | None. The snapshot is produced from state, never read by the reducer.                                                                                                                                                                                     |
| Verdict       | Keep — settlement/catalog reference mirror. The snapshot field exists only to preserve the identity across serialization; it is not independently consumed.                                                                                               |

### 5. Spell identity in `SpellInvocationRef`

| Field         | `SpellInvocationRef.spellId: SpellId`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Consumer      | `battle-runtime-context.ts` stores `CharacterSpellPresentationSource` (which includes the `SpellInvocationRef`) so presentation can label cast/readied spells. Battle subjects carry `invocation: SpellInvocationRef` only through the explicit presentation-ref path (`spells-invocation-ref.ts`). Free-cast resource allocation (e.g., `afterHitDamage`, `markedDamageRider`) now consumes `BattleSpellAdmissionSource.classFeatureFreeCastResourcePoolRefs`, which are precomputed at admission; it no longer derives pool eligibility from `spellId`. |
| Execution use | None. The reducer dispatches by `procedure` (e.g., `"spellAttackDamage"`, `"saveGatedCondition"`) and by admitted mechanics, never by `spellId`. `check-authored-id-dispatch-boundary.cjs` enforces that authored `spell.name`/`id` keys do not appear in reducer execution files.                                                                                                                                                                                                                                                                        |
| Verdict       | Keep — presentation. The Spell Invocation Ref is a composition/selection record that joins back to the authored Spell record for labels and traceability; it is rejected as a replay or execution key.                                                                                                                                                                                                                                                                                                                                                    |

### 6. Unit and Stat Block references in presentation context

| Field         | `CharacterBattleRuntimeContext.unitPresentationSources: readonly BattleUnitRef[]` and `BattleStatBlockPresentationSource` / `BattleStatBlockProcedurePresentation` records carried in `BattleRuntimeContext.statBlocks`.                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                            |
| Consumer      | `stat-block-presentation.ts` and `battle-act-composition.ts` join execution procedure refs back to Unit/Stat Block authored names and labels for caller-facing discovery output. `battle-runtime-context.ts` stores these sources alongside the session, separate from `BattleState`. |
| Execution use | None. The reducer receives only the authored-free `BattleState`; `BattleRuntimeContext` is consumed by presentation and composition helpers after discovery.                                                                                                                          |
| Verdict       | Keep — presentation. These references are explicitly outside reducer execution and are the canonical place where authored identity is joined back to execution facts for labels.                                                                                                      |

### 7. Rejected identity fields in `BattleSubject`

| Field         | `unitId`, `sourceUnitId`, `resourceUnitId`, `componentWeaponObjectId`, `sourceSpellId`, `formStatBlockId`, `attackName`, `statBlockSection`, `statBlockDamageNotation` on `BattleSubject` variants.                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Execution boundary enforcement.                                                                                                                                                                                                                   |
| Consumer      | `battle-subjects.ts` schemas set these fields to `Schema.optionalWith(Schema.Never, { exact: true })`, proving they are not admitted as replay/execution keys. `componentWeaponObjectId` is a runtime `BattleObjectId`, not an authored identity. |
| Execution use | None by design.                                                                                                                                                                                                                                   |
| Verdict       | Keep — inert. They document the boundary: authored identity is not a replay key.                                                                                                                                                                  |

## Settlement/catalog reference (not inert)

Fields in this section are retained authored IDs required to re-associate execution state with an authored record across snapshot or settlement boundaries. They do not drive reducer execution inside a single battle, but they are **not inert** because renaming the source record changes which mechanics are admitted on reappearance or settlement.

### 8. Stat Block identity in `StatBlockBattleOrigin`

| Field         | `StatBlockBattleOrigin.statBlockId: StatBlockId`                                                                                                                                                                                                                                                                                                               |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Settlement / companion reappearance / catalog reference.                                                                                                                                                                                                                                                                                                       |
| Consumer      | `stat-block-combatant-admission.ts` admits it from the authored Stat Block record; `battle-reducer/battle-snapshot.ts` and `battle-reducer/interrupt-execution.ts` copy it through; `find-familiar-lifecycle-execution.ts` reads it to re-materialize a dismissed or zero-HP familiar; companion tests and settlement handoffs re-fetch the source Stat Block. |
| Execution use | **Behavior-driving at settlement/reappearance.** The reducer never dispatches on `statBlockId` during a single battle, but the stored ID selects which Stat Block's mechanics are used when a familiar reappears or is re-materialized across battles. Renaming the source Stat Block therefore changes future familiar mechanics.                             |
| Verdict       | Keep — settlement/catalog reference, but **not inert**. The ID is required for SRD Find Familiar/Pact of the Chain reappearance and cross-battle settlement; it cannot be inert because it selects the source record for mechanics.                                                                                                                            |

### 9. Companion/familiar resolved Stat Block identity

| Field         | `BattleCompanionStoredForm.resolvedStatBlockId: StatBlockId` and `BattleCompanionPresentSnapshotFields.resolvedStatBlockId: StatBlockId`.                                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Companion settlement / reappearance.                                                                                                                                                                                                                                                                                                                                                                    |
| Consumer      | `find-familiar-admission.ts::resolveStoredFindFamiliarReappearanceForm` uses the stored ID to fetch the Stat Block that supplies mechanics for reappearance. `find-familiar-lifecycle.ts` and `find-familiar-lifecycle-execution.ts` use it to re-materialize a dismissed or zero-HP familiar. `battle-reducer/battle-snapshot.ts` and `battle-reducer/interrupt-execution.ts` include it in snapshots. |
| Execution use | **Behavior-driving at settlement/reappearance.** The stored ID selects which Stat Block's mechanics are used when the familiar reappears. Once the familiar is present, reducer execution uses the admitted `mechanics`, not the ID. This is the companion-specific copy of the `StatBlockBattleOrigin.statBlockId` identity documented in item 8.                                                      |
| Verdict       | Keep — settlement/catalog reference, but **not inert**. The ID is required for SRD Find Familiar/Pact of the Chain reappearance and cross-battle settlement; it cannot be inert because it selects the source record for mechanics.                                                                                                                                                                     |

## Composition/admission boundary identity

Fields in this section are owned by composition/selection. They select which mechanical facts are admitted into battle state, but once admitted the same reducer semantics apply regardless of the specific identity. They are **not inert** under the issue's strict definition because synthetic renaming would change which facts are admitted, but they are kept at the composition boundary rather than inside reducer execution.

### 10. Druid Wild Shape form Stat Block identity

| Field         | `BattleCreatureState.origin.kind === "character"`.`druidWildShapeAvailableForms: StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>[]` carries `statBlock.id` and `execution`; the active effect `druidWildShapeForm.formScopeRef: BattleStatBlockExecutionScopeRef` references the admitted execution scope.                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → settlement / procedure presentation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Consumer      | `battle-init.ts::battleAvailableDruidWildShapeKnownForms` and `battle-reducer/creature-state.ts` admit forms by `statBlock.id`. `battle-reducer/druid-wild-shape.ts::assumeDruidWildShapeForm` selects an admission by Stat Block reference and stores its `execution.scopeRef` in the active effect. `battle-reducer/druid-wild-shape.ts::activeDruidWildShape` resolves the active effect back to the admission by matching `formScopeRef`, never by authored ID. `stat-block-presentation.ts::statBlockProcedurePresentationsForActor` uses the admission to project attack/action labels while the druid is shape-shifted. `battle-reducer/creature-state-execution.ts` persists `statBlockId` per form in snapshots. |
| Execution use | **Behavior-driving at admission only.** The form identity selects which admitted mechanical facts apply. Once admitted, the active effect carries a typed execution-scope reference; reducer execution resolves mechanics through that scope ref, not through authored Stat Block identity.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Verdict       | Keep — composition boundary. The form identity is the composition boundary's record of which Stat Block the player selected. It is **not inert**, but it no longer drives reducer execution: the active effect uses `formScopeRef` to resolve mechanical facts.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

### 11. Weapon Mastery composition selection

| Field | `CharacterBattleWeaponMasterySelection.weaponUnitId: UnitId` is admitted into battle state as `BattleCreatureState.origin.weaponMasteryObjectIds: readonly BattleObjectId[]`. |
| Domain owner | Composition / selection (player-chosen mastery weapons). |
| Consumer | `battle-reducer/creature-state.ts::characterBattleWeaponMasteryObjectIds` maps selected mastery `weaponUnitId`s to the corresponding loadout `BattleObjectId`s. `battle-reducer/attack-roll.ts::tacticalMasterReplacementSelection` checks `weaponMasteryObjectIds.includes(attack.weapon.weaponObjectId)`. |
| Execution use | The authored `weaponUnitId` is used only at admission to compute the runtime `weaponMasteryObjectIds`. The reducer no longer branches on authored Unit identity for mastery or Tactical Master. |
| Verdict | Keep — composition boundary. The selection uses authored identity, but reducer execution uses typed execution references. |

## Behavior-driving identity inside reducer execution

Fields in this section are retained authored IDs that currently choose mechanics or alter outcomes inside reducer execution. They are documented as cleanup targets.

### 12. Character loadout authored IDs

| Field         | `CharacterBattleLoadoutRef`: `armor.itemId`/`unitId`, `shield.itemId`/`unitId`, `weapon.itemId`/`unitId`, `offHandWeapon.itemId`/`unitId`; `BoundCharacterWeaponAttackActionOption.weapon.weaponUnitId` mirrors the Unit identity for presentation-source lookup.                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → equipment settlement.                                                                                                                                                                                                                                                                                                                                                                                 |
| Consumer      | `battle-reducer/wild-shape-equipment.ts` builds `WildShapeLoadoutObjectRef`s from the loadout IDs for Wild Shape equipment disposition. `battle-reducer/attack-damage-apply.ts` matches `weaponUnitId` against loadout entries to decide damage-type override, weapon property, and off-hand behavior. Weapon Mastery eligibility now uses `attack.weapon.weaponObjectId` against `weaponMasteryObjectIds`, not `weaponUnitId`. |
| Execution use | **Behavior-driving inside reducer execution** for loadout matching, damage-type override, off-hand behavior, and Wild Shape equipment disposition. Weapon Mastery no longer branches on these authored IDs.                                                                                                                                                                                                                     |
| Verdict       | Cleanup. Loadout `itemId`/`unitId` should be replaced with typed execution references or parsed mechanical facts where possible. `weaponUnitId` on the execution weapon is retained only for presentation-source lookup.                                                                                                                                                                                                        |

### 13. Active-effect weapon identity for Paladin Sacred Weapon

| Field         | `BattleActiveEffect` of kind `paladinSacredWeapon`.`weaponItemId: string`                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Composition / selection → weapon-targeting settlement.                                                                                                                                                                                                                                                                                                                                                                               |
| Consumer      | `battle-reducer/unit-features.ts::applyPaladinSacredWeaponEffect` stores the targeted weapon's `itemId` in the active effect. `battle-reducer/attack-damage-apply.ts` and `battle-reducer/attack-resolution.ts` match `weaponItemId` against the current attack's held weapon to apply the sacred-weapon bonus damage and light emission. `procedure-execution/weapon-attack-override.ts` resolves the bound weapon through this id. |
| Execution use | **Behavior-driving inside reducer execution.** Attack damage and light-emission eligibility branch on whether the attack's weapon matches the effect's stored `weaponItemId`.                                                                                                                                                                                                                                                        |
| Verdict       | Cleanup. The bound weapon should be represented by a typed execution reference (e.g., an attack-scope or object-scope ref) rather than an authored item id.                                                                                                                                                                                                                                                                          |

### 14. Druid Wild Shape equipment identity

| Field         | `WildShapeLoadoutObjectRef.unitId: UnitId` and the `unitId` carried inside `ActiveWildShapeEquipmentDisposition` items.                                                                                                                                                                                                                          |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Composition / selection → equipment settlement.                                                                                                                                                                                                                                                                                                  |
| Consumer      | `battle-reducer/wild-shape-equipment.ts` builds `WildShapeLoadoutObjectRef`s from loadout entries and matches `unitId` to decide which armor/shield/weapon is worn, falls, or merges during Wild Shape. `battle-reducer/creature-state-leaves.ts` and attack-damage paths use the disposition to determine whether worn equipment still applies. |
| Execution use | **Behavior-driving inside reducer execution.** Equipment disposition and Wild Shape worn-object usability branch on `unitId` equality.                                                                                                                                                                                                           |
| Verdict       | Cleanup. Wild Shape equipment disposition should reference typed execution objects or parsed mechanical facts rather than authored unit ids.                                                                                                                                                                                                     |

### 15. Active-effect weapon identity for Magic Weapon enhancement

| Field         | `BattleActiveEffect` of kind `spellMagicWeaponEnhancement`.`weaponItemId: string`                                                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → weapon-targeting settlement.                                                                                                                                                                  |
| Consumer      | `battle-reducer/attack-damage-apply.ts::battleWeaponItemMagicWeaponEnhancementBonus` matches the effect's `weaponItemId` against the current attack's held weapon to decide magic-weapon enhancement bonus eligibility. |
| Execution use | **Behavior-driving inside reducer execution.** Attack damage bonus eligibility branches on whether the attack's weapon matches the effect's stored `weaponItemId`.                                                      |
| Verdict       | Cleanup. The bound weapon should be represented by a typed execution reference rather than an authored item id.                                                                                                         |

### 16. Turn-state light-weapon-attack identity

| Field         | `BattleTurnResources.lightWeaponAttackMade.weaponItemId: string` and the mirrored `BattleTurnSnapshot.lightWeaponAttackMade?.weaponItemId: string`.                                                                                                                                                                    |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Two-weapon fighting eligibility tracking.                                                                                                                                                                                                                                                                              |
| Consumer      | `battle-reducer/attack-damage-apply.ts` uses the stored `weaponItemId` to enforce two-weapon-fighting restrictions (e.g., the off-hand attack must use a different light weapon). Both `battle-reducer/battle-snapshot.ts` and `battle-reducer/interrupt-execution.ts` copy the field through to `BattleTurnSnapshot`. |
| Execution use | **Behavior-driving inside reducer execution.** Action economy and bonus-action attack eligibility branch on authored weapon identity.                                                                                                                                                                                  |
| Verdict       | Cleanup. The prior light attack should be tracked by a typed execution reference to the weapon, not its authored item id.                                                                                                                                                                                              |

### 17. BattleSubject held-weapon Unit feature activation weapon identity

| Field         | `BattleSubject` of tag `unitFeatureHeldWeaponActivation`.`weaponItemId: string` (admitted at `battle-subjects.ts:729`).                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Composition / selection → held-weapon targeting settlement.                                                                                                                                |
| Consumer      | `battle-reducer/unit-features.ts` matches `input.subject.weaponItemId` against held weapon `itemId` to validate and execute the Paladin Sacred Weapon held-weapon Unit feature activation. |
| Execution use | **Behavior-driving inside reducer execution.** Activation eligibility and the targeted weapon branch on authored weapon identity.                                                          |
| Verdict       | Cleanup. The held-weapon selection should be represented by a typed execution reference rather than an authored item id.                                                                   |

## Runtime object references used by reducer execution (not authored identity)

These fields are typed execution references (`BattleObjectId`) that select a runtime object inside reducer execution. They are **not authored identity** and are therefore outside the strict scope of this inventory, but they are recorded here to avoid confusing them with the authored-identity fields above.

### A. Weapon-override procedure facts weapon object reference

| Field         | `SpellWeaponAttackOverrideTemplate.weaponItemId: BattleObjectId` and `WeaponAttackOverrideProcedureFacts.activeEffect.weaponItemId: BattleObjectId`.                                                                                          |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → runtime object reference.                                                                                                                                                                                           |
| Consumer      | `weapon-attack-override-admission.ts` maps the selected loadout item to a `BattleObjectId`; `procedure-execution/weapon-attack-override.ts` and `battle-reducer/attack-damage-apply.ts` resolve the weapon-override attack by that object id. |
| Execution use | Selects a runtime weapon object inside reducer execution. Because the reference is an execution `BattleObjectId` rather than an authored item id, it is not an authored-identity dependency.                                                  |
| Verdict       | Keep — runtime object reference. Not authored identity.                                                                                                                                                                                       |

### B. Spell-hosted weapon component object reference

| Field         | `SpellHostedWeaponAttackSpellProcedureExecution.componentWeaponObjectId: BattleObjectId` (and the corresponding `componentWeapon.objectId` on `SpellHostedWeaponAttackInvocation`).                                                                                   |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → runtime object reference.                                                                                                                                                                                                                   |
| Consumer      | `battle-reducer/spell-procedure-profiles/spell-hosted-weapon-attack.ts` resolves the component weapon by `componentWeaponObjectId` against the caster's held weapons. `character-execution-admission.ts` maps the admitted `componentWeapon.objectId` into execution. |
| Execution use | Selects a runtime weapon object inside reducer execution. Because the reference is an execution `BattleObjectId` rather than an authored item id, it is not an authored-identity dependency.                                                                          |
| Verdict       | Keep — runtime object reference. Not authored identity.                                                                                                                                                                                                               |

## Presentation identity in `BattleActPresentation`

| Field         | `BattleActPresentation` branches carry authored identity for caller-facing labels only: `attack.name: string`; `unit.unitId: string`; `spell.invocation.spellId: SpellId`; `druidWildShapeForm.unitId: string` and `druidWildShapeForm.formStatBlockId: BattleDruidWildShapeKnownForm["id"]`. |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                                    |
| Consumer      | `battle-act-composition.ts` and caller-facing discovery output use these to label available acts.                                                                                                                                                                                             |
| Execution use | None by design. `AvailableBattleAct` includes both execution references (`procedureRef`) and presentation (`presentation`); only the execution references are replayed.                                                                                                                       |
| Verdict       | Keep — presentation. The presentation branch is explicitly separate from reducer execution.                                                                                                                                                                                                   |

## Verification

- `pnpm check:authored-id-dispatch` passes with the existing narrow allowlist (catalog, composition-selection, test-fixture, character-creation, character-sheet-companion, battle-runtime unit-profile admission test support). No broader allowlisting was added.
- `pnpm check:battle-runtime-import-ownership` passes for the protected execution-root set.
- The inert fields documented in the first section have no reducer execution consumer.
- `SpellRuleExecutionFacts.spellId` was removed; it had no production consumer and was explicitly ignored by execution equality.
- Free-cast resource allocation no longer depends on `BattleSpellAdmissionSource.id`; it uses precomputed `classFeatureFreeCastResourcePoolRefs` populated at admission.
- Spell-hosted weapon execution no longer depends on a raw `componentWeaponItemId`; it uses `componentWeaponObjectId`, a runtime `BattleObjectId`.
- Weapon Mastery and Tactical Master execution no longer depend on authored `weaponUnitId`; they use `weaponMasteryObjectIds` (runtime `BattleObjectId`s) and `attack.weapon.weaponObjectId`.
- Druid Wild Shape reducer mechanics are resolved through `formScopeRef`; authored `formStatBlockId` is no longer read inside reducer execution. Stale unresolved `druidWildShapeForm` effects do not apply their equipment disposition.

## Notes

- The asymmetric placement of character `displayName` (execution state) versus Stat Block `displayName` (presentation context, `BattleStatBlockPresentationSource`) is noted. Both are presentation-only; the character path retains it in state as a snapshot convenience. A future cleanup may move it to `CharacterBattleRuntimeContext`.
- Several retained identity fields are currently behavior-driving. This inventory records them honestly; removing their behavioral dependence is follow-up work outside the inventory scope.
- Synthetic-renaming invariance for inert fields is demonstrated by `packages/battle-runtime/src/inert-authored-identity-renaming-witness.test.ts`. Behavior-driving fields are excluded from that witness because renaming them changes outcomes today.
