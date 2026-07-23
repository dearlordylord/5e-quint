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

Fields in this section have no execution behavior dependence. Renaming them synthetically (while keeping their owning records consistent) changes no reducer outcome.

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

| Field         | `BattleCreatureOriginSnapshot.kind === "character"`.`characterId: CharacterId`                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Settlement / catalog reference.                                                                                                                                                                                                            |
| Consumer      | Snapshot consumers (`battle-reducer/battle-snapshot.ts`, `battle-reducer/interrupt-execution.ts`) copy it through. Settlement consumers (`character-battle-runtime`) use it to re-associate the combatant with the source Character Build. |
| Execution use | None. The snapshot is produced from state, never read by the reducer.                                                                                                                                                                      |
| Verdict       | Keep — settlement/catalog reference. Mirrors the execution-state field at the durable-snapshot boundary.                                                                                                                                   |

### 4. Stat Block identity in `BattleCreatureOriginSnapshot`

| Field         | `BattleCreatureOriginSnapshot.kind === "statBlock"`.`statBlockId: string`                                |
| ------------- | -------------------------------------------------------------------------------------------------------- |
| Domain owner  | Settlement / catalog reference.                                                                          |
| Consumer      | Snapshot consumers use it to re-associate the combatant with the source Stat Block record.               |
| Execution use | None.                                                                                                    |
| Verdict       | Keep — settlement/catalog reference. Mirrors the execution-state field at the durable-snapshot boundary. |

### 5. Spell identity in `SpellInvocationRef`

| Field         | `SpellInvocationRef.spellId: SpellId`                                                                                                                                                                                                                                                               |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                                          |
| Consumer      | `battle-runtime-context.ts` stores `CharacterSpellPresentationSource` (which includes the `SpellInvocationRef`) so presentation can label cast/readied spells. Battle subjects carry `invocation: SpellInvocationRef` only through the explicit presentation-ref path (`spells-invocation-ref.ts`). |
| Execution use | None. The reducer dispatches by `procedure` (e.g., `"spellAttackDamage"`, `"saveGatedCondition"`) and by admitted mechanics, never by `spellId`. `check-authored-id-dispatch-boundary.cjs` enforces that authored `spell.name`/`id` keys do not appear in reducer execution files.                  |
| Verdict       | Keep — presentation. The Spell Invocation Ref is a composition/selection record that joins back to the authored Spell record for labels and traceability; it is rejected as a replay or execution key.                                                                                              |

### 6. Unit and Stat Block references in presentation context

| Field         | `CharacterBattleRuntimeContext.unitPresentationSources: readonly BattleUnitRef[]` and `BattleStatBlockPresentationSource` / `BattleStatBlockProcedurePresentation` records carried in `BattleRuntimeContext.statBlocks`.                                                              |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                                                                                                                            |
| Consumer      | `stat-block-presentation.ts` and `battle-act-composition.ts` join execution procedure refs back to Unit/Stat Block authored names and labels for caller-facing discovery output. `battle-runtime-context.ts` stores these sources alongside the session, separate from `BattleState`. |
| Execution use | None. The reducer receives only the authored-free `BattleState`; `BattleRuntimeContext` is consumed by presentation and composition helpers after discovery.                                                                                                                          |
| Verdict       | Keep — presentation. These references are explicitly outside reducer execution and are the canonical place where authored identity is joined back to execution facts for labels.                                                                                                      |

### 7. Rejected identity fields in `BattleSubject`

| Field         | `unitId`, `sourceUnitId`, `resourceUnitId`, `componentWeaponItemId`, `sourceSpellId`, `formStatBlockId`, `attackName`, `statBlockSection`, `statBlockDamageNotation` on `BattleSubject` variants. |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Execution boundary enforcement.                                                                                                                                                                   |
| Consumer      | `battle-subjects.ts` schemas set these fields to `Schema.optionalWith(Schema.Never, { exact: true })`, proving they are not admitted as replay/execution keys.                                    |
| Execution use | None by design.                                                                                                                                                                                   |
| Verdict       | Keep — inert. They document the boundary: authored identity is not a replay key.                                                                                                                  |

## Composition/admission boundary identity

Fields in this section are owned by composition/selection. They select which mechanical facts are admitted into battle state, but once admitted the same reducer semantics apply regardless of the specific identity. They are **not inert** under the issue's strict definition because synthetic renaming would change which facts are admitted, but they are kept at the composition boundary rather than inside reducer execution.

### 8. Druid Wild Shape form Stat Block identity

| Field         | `BattleCreatureState.origin.kind === "character"`.`druidWildShapeAvailableForms: StatBlockExecutionAdmission<BattleDruidWildShapeKnownForm>[]` (carries `statBlock.id` and `execution`) and the active effect `druidWildShapeForm.formStatBlockId: string`.                                                                                                                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Composition / selection → settlement / procedure presentation.                                                                                                                                                                                                                                                                                                                                                                                                     |
| Consumer      | `battle-reducer/druid-wild-shape.ts` matches `formStatBlockId` against available form admissions to validate assume/dismiss and to derive the current form's mechanics (size, AC, abilities, skills, saves). `stat-block-presentation.ts::statBlockProcedurePresentationsForActor` uses the admission to project attack/action labels while the druid is shape-shifted. `battle-reducer/creature-state-execution.ts` persists `statBlockId` per form in snapshots. |
| Execution use | **Behavior-driving at admission.** The form identity selects which admitted mechanical facts apply. The same procedure families (attack, movement, size change, etc.) run regardless of which specific form is chosen, but the concrete mechanical values come from the selected admission.                                                                                                                                                                        |
| Verdict       | Keep — composition boundary. The form identity is the composition boundary's record of which Stat Block the player selected; it is needed to re-derive mechanical facts and presentation without duplicating the full Stat Block in battle state. It is **not inert**.                                                                                                                                                                                             |

### 9. Character loadout authored IDs

| Field         | `CharacterBattleLoadoutRef`: `armor.itemId`/`unitId`, `shield.itemId`/`unitId`, `weapon.itemId`/`unitId`, `offHandWeapon.itemId`/`unitId`; also mirrored in `BoundCharacterWeaponAttackActionOption.weapon.weaponUnitId`.                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection → equipment settlement.                                                                                                                                                                                                                                                                                                                                                     |
| Consumer      | `battle-reducer/wild-shape-equipment.ts` builds `WildShapeLoadoutObjectRef`s from the loadout IDs for Wild Shape equipment disposition. `battle-reducer/attack-damage-apply.ts` matches `weaponUnitId` against loadout entries to decide damage-type override, weapon property, and off-hand behavior. `battle-reducer/attack-roll.ts` uses `weaponUnitId` to determine Weapon Mastery eligibility. |
| Execution use | **Behavior-driving inside reducer execution.** Weapon matching, mastery eligibility, Wild Shape equipment disposition, and damage-type overrides all branch on these IDs.                                                                                                                                                                                                                           |
| Verdict       | Cleanup. These IDs should be replaced with typed execution references or parsed mechanical facts where possible. `itemId` is closer to catalog reference; `unitId`/`weaponUnitId` are actively used for equality checks that determine outcomes.                                                                                                                                                    |

### 10. Weapon Mastery selection Unit IDs

| Field         | `CharacterBattleWeaponMasterySelection.weaponUnitId: UnitId`                                                                                                                                                                                                                |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Composition / selection (player-chosen mastery weapons).                                                                                                                                                                                                                    |
| Consumer      | `battle-reducer/attack-roll.ts::tacticalMasterReplacementSelection` checks `weaponUnitId` against `attack.weapon.weaponUnitId` to decide whether Tactical Master replacement is available. `battle-reducer/creature-state.ts` validates uniqueness of selected mastery IDs. |
| Execution use | **Behavior-driving inside reducer execution.** A weapon's mastery property riders (Sap, Topple, Cleave, etc.) are gated by this ID match.                                                                                                                                   |
| Verdict       | Cleanup. Mastery eligibility should be carried as a parsed mechanical fact on the attack or weapon rather than an authored-ID equality check.                                                                                                                               |

### 11. Spell identity in `SpellRuleExecutionFacts`

| Field         | `SpellRuleExecutionFacts.spellId: SpellId`                                                                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Domain owner  | Composition / selection → class-feature free cast / reaction identification.                                                                                                                                                                           |
| Consumer      | `battle-reducer/spell-procedure-profiles/admission-context.ts` uses `spellId` to look up class-feature free-cast resource pools. `battle-reducer/spell-procedure-profiles/shield-reaction.ts` uses `spellId` to identify ongoing Shield spell effects. |
| Execution use | **Behavior-driving inside reducer execution.** Free-cast eligibility and reaction identification branch on the authored spell ID.                                                                                                                      |
| Verdict       | Cleanup. Spell-specific behavior should be encoded in the procedure profile or support-profile facts admitted at composition time, not in a raw authored-ID check inside the reducer.                                                                  |

### 12. Companion/familiar resolved Stat Block identity

| Field         | `BattleCompanionStoredForm.resolvedStatBlockId: StatBlockId` and `BattleCompanionPresentSnapshotFields.resolvedStatBlockId: StatBlockId`.                                                                                                                                                                                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Companion settlement / reappearance.                                                                                                                                                                                                                                                                                                                                                                    |
| Consumer      | `find-familiar-admission.ts::resolveStoredFindFamiliarReappearanceForm` uses the stored ID to fetch the Stat Block that supplies mechanics for reappearance. `find-familiar-lifecycle.ts` and `find-familiar-lifecycle-execution.ts` use it to re-materialize a dismissed or zero-HP familiar. `battle-reducer/battle-snapshot.ts` and `battle-reducer/interrupt-execution.ts` include it in snapshots. |
| Execution use | **Behavior-driving at settlement/reappearance.** The stored ID selects which Stat Block's mechanics are used when the familiar reappears. Once the familiar is present, reducer execution uses the admitted `mechanics`, not the ID.                                                                                                                                                                    |
| Verdict       | Keep — settlement/catalog reference, but **not inert**. The ID is required for SRD Find Familiar/Pact of the Chain reappearance and cross-battle settlement; it cannot be inert because it selects the source record for mechanics.                                                                                                                                                                     |

## Presentation identity in `BattleActPresentation`

| Field         | `BattleActPresentation` branches carry authored identity: `unit` has `unitId`; `spell` has `SpellInvocationRef.spellId`; `druidWildShapeForm` carries the form admission. |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain owner  | Presentation join / composition reference.                                                                                                                                |
| Consumer      | `battle-act-composition.ts` and caller-facing discovery output use these to label available acts.                                                                         |
| Execution use | None by design. `AvailableBattleAct` includes both execution references (`procedureRef`) and presentation (`presentation`); only the execution references are replayed.   |
| Verdict       | Keep — presentation. The presentation branch is explicitly separate from reducer execution.                                                                               |

## Verification

- `pnpm check:authored-id-dispatch` passes with the existing narrow allowlist (catalog, composition-selection, test-fixture, character-creation, character-sheet-companion, battle-runtime unit-profile admission test support). No broader allowlisting was added.
- `pnpm check:battle-runtime-import-ownership` passes for the protected execution-root set.
- The inert fields documented above have no reducer execution consumer.
- The behavior-driving fields documented above are flagged for future cleanup; their current use is admitted as existing code, not approved as a permanent pattern.

## Notes

- The asymmetric placement of character `displayName` (execution state) versus Stat Block `displayName` (presentation context, `BattleStatBlockPresentationSource`) is noted. Both are presentation-only; the character path retains it in state as a snapshot convenience. A future cleanup may move it to `CharacterBattleRuntimeContext`.
- Several retained identity fields are currently behavior-driving. This inventory records them honestly; removing their behavioral dependence is follow-up work outside the inventory scope.
- Synthetic-renaming invariance for inert fields is demonstrated by `packages/battle-runtime/src/inert-authored-identity-renaming-witness.test.ts`. Behavior-driving fields are excluded from that witness because renaming them changes outcomes today.
