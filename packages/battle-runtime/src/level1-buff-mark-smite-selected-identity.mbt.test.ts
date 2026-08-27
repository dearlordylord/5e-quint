import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  characterSpellInvocationRefForProcedureRefForTest,
  characterSpellProcedureRefMatchesSpellForTest,
  type MembersOf,
} from "./battle-runtime.test-support.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MARKED_DAMAGE_RIDER_TRANSFER BATTLE.SPELL.CONDITION_IMMUNITY_TURN_START_TEMPORARY_HIT_POINTS
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-DIVINE-FAVOR divine_favor
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-DIVINE-SMITE divine_smite
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-ENSNARING-STRIKE ensnaring_strike
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-FALSE-LIFE false_life
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-HEROISM heroism
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-HUNTERS-MARK hunters_mark
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-HEX hex
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-LONGSTRIDER longstrider
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-SEARING-SMITE searing_smite
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-SHILLELAGH shillelagh
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L1E-TRUE-STRIKE true_strike
// UNIT-IDENTITY-REPLAY: L1E-DIVINE-FAVOR divine_favor doDivineFavorWeaponDamageRider
// UNIT-IDENTITY-REPLAY: L1E-DIVINE-SMITE divine_smite doDivineSmiteAfterHitDamage
// UNIT-IDENTITY-REPLAY: L1E-ENSNARING-STRIKE ensnaring_strike doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape
// UNIT-IDENTITY-REPLAY: L1E-FALSE-LIFE false_life doFalseLifeTemporaryHitPoints
// UNIT-IDENTITY-REPLAY: L1E-HEROISM heroism doHeroismFrightenedImmunityTurnStartTemporaryHitPoints doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup
// UNIT-IDENTITY-REPLAY: L1E-HUNTERS-MARK hunters_mark doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer
// UNIT-IDENTITY-REPLAY: L1E-HEX hex doHexMarkedDamageRiderAndLaterTurnTransfer
// UNIT-IDENTITY-REPLAY: L1E-LONGSTRIDER longstrider doLongstriderSpeedIncrease
// UNIT-IDENTITY-REPLAY: L1E-SEARING-SMITE searing_smite doSearingSmiteAfterHitTimedDamageAndSaveCleanup
// UNIT-IDENTITY-REPLAY: L1E-SHILLELAGH shillelagh doShillelaghWeaponAttackOverride
// UNIT-IDENTITY-REPLAY: L1E-TRUE-STRIKE true_strike doTrueStrikeSpellHostedWeaponAttack
import { Either } from "effect";
import { battleStatBlockCombatantSource } from "./stat-block-combatant-admission.ts";
import { describe, expect, it } from "vitest";
import { resolveBattleSubject } from "./battle-runtime.test-support.ts";
import { admitCharacterWeaponAttackExecutionWeapon } from "./character-weapon-execution-admission.ts";
import { battleObjectId } from "./identity.ts";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  difficultyClass,
  movementFeet,
  proficiencyBonus,
  resourceCount,
  type Condition,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import type {
  SpellRecord,
  StatBlockRecord,
  WeaponProficiency,
} from "@dnd/surface/surface/types";

import {
  battleId,
  battleFrontierInterruptDecisionForState,
  battleReducerStartRouteEvent,
  characterId,
  combatantId,
  discoverBattleActs,
  discoverBattleActCandidates,
  endTurn,
  initiativeScore,
  resolveBattleInterrupt,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleAttackRollHole,
  type BattleCreatureInit,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHole,
  type BattleInterruptProcedureChoice,
  type BattleProcedureExecutionRef,
  type BattleReducerRouteEvent,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleRuntimeSession,
  type BattleSpellHealingRollHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import type {
  BattleActiveEffect,
  BattleSpellTurnStartDamageRollHole,
  BattleSpellTurnStartSavingThrowOutcomeHole,
} from "./battle-state-execution.ts";
import { KnockedOutConditionState } from "./battle-reducer/knocked-out-state.ts";
import {
  applyBattleHitPointDamage,
  breakBattleConcentration,
} from "./battle-reducer/damage-apply.ts";
import { attackActionOptionForSubject } from "./battle-reducer/attack-damage-apply.ts";
import { requiredAbilityCheckRollMode } from "./battle-reducer/hole-helpers.ts";
import { attackActionOptionName } from "./battle-reducer/statblock-attacks.ts";
import {
  assertWitnessProtocolConsistentWithScenario,
  booleanField,
  decodeReducerRoute,
  decodeWitnessProtocolState,
  focusedMbtMaxSteps,
  MBT_TEST_TIMEOUT_MS,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintField,
  quintRecordField,
  quintStateRecord,
  quintVariantTag,
  reducerRoutedLevel1WeaponHostedSelectedRouteStateCheck,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import { damageTypeChoiceFill } from "./unit-profile-admission-spell-fill.test-support.ts";
import { battleStateInitIssueMessage } from "./battle-reducer/domain-helpers.ts";

type Level1BuffMarkSmiteSelectedIdentityAction =
  | "doDivineFavorWeaponDamageRider"
  | "doDivineSmiteAfterHitDamage"
  | "doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape"
  | "doFalseLifeTemporaryHitPoints"
  | "doHeroismFrightenedImmunityTurnStartTemporaryHitPoints"
  | "doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup"
  | "doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer"
  | "doHexMarkedDamageRiderAndLaterTurnTransfer"
  | "doLongstriderSpeedIncrease"
  | "doSearingSmiteAfterHitTimedDamageAndSaveCleanup"
  | "doShillelaghWeaponAttackOverride"
  | "doTrueStrikeSpellHostedWeaponAttack";

const divineFavorUnitId = "divine_favor";
const divineSmiteUnitId = "divine_smite";
const ensnaringStrikeUnitId = "ensnaring_strike";
const falseLifeUnitId = "false_life";
const heroismUnitId = "heroism";
const huntersMarkUnitId = "hunters_mark";
const hexUnitId = "hex";
const longstriderUnitId = "longstrider";
const searingSmiteUnitId = "searing_smite";
const shillelaghUnitId = "shillelagh";
const trueStrikeUnitId = "true_strike";
type Level1BuffMarkSmiteSpellId =
  | typeof divineFavorUnitId
  | typeof divineSmiteUnitId
  | typeof ensnaringStrikeUnitId
  | typeof falseLifeUnitId
  | typeof heroismUnitId
  | typeof huntersMarkUnitId
  | typeof hexUnitId
  | typeof longstriderUnitId
  | typeof searingSmiteUnitId
  | typeof shillelaghUnitId
  | typeof trueStrikeUnitId;
type SpellWeaponDamageRiderSourceSpellId = MembersOf<
  Level1BuffMarkSmiteSpellId,
  | typeof divineFavorUnitId
  | typeof divineSmiteUnitId
  | typeof searingSmiteUnitId
>;
const damageRiderSourceSpellIds = [
  divineFavorUnitId,
  divineSmiteUnitId,
] as const satisfies ReadonlyArray<SpellWeaponDamageRiderSourceSpellId>;
type DamageRiderSourceSpellId =
  | (typeof damageRiderSourceSpellIds)[number]
  | "none";
type HexSourceSpellId =
  | MembersOf<Level1BuffMarkSmiteSpellId, typeof hexUnitId>
  | "none";
type MarkedDamageRiderSourceSpellId = MembersOf<
  Level1BuffMarkSmiteSpellId,
  typeof huntersMarkUnitId | typeof hexUnitId
>;
type HuntersMarkSourceSpellId = typeof huntersMarkUnitId | "none";
type EnsnaringStrikeSourceSpellId = typeof ensnaringStrikeUnitId | "none";
type BonusActionCastSpellId = MembersOf<
  Level1BuffMarkSmiteSpellId,
  | typeof divineFavorUnitId
  | typeof huntersMarkUnitId
  | typeof hexUnitId
  | typeof shillelaghUnitId
>;
type AttackHitBonusActionSpellId = MembersOf<
  Level1BuffMarkSmiteSpellId,
  | typeof divineSmiteUnitId
  | typeof ensnaringStrikeUnitId
  | typeof searingSmiteUnitId
>;
type ActionCastSpellId = MembersOf<
  Level1BuffMarkSmiteSpellId,
  | typeof falseLifeUnitId
  | typeof heroismUnitId
  | typeof longstriderUnitId
  | typeof trueStrikeUnitId
>;
type TemporaryHitPointsSourceSpellId = typeof falseLifeUnitId | "none";
type HeroismSourceSpellId = typeof heroismUnitId | "none";
type LongstriderSourceSpellId = typeof longstriderUnitId | "none";
type LongstriderSpeedEffectTarget = "target" | "none";
const shillelaghQuarterstaffUnitId = "weapon_quarterstaff";
type ShillelaghQuarterstaffUnitId = typeof shillelaghQuarterstaffUnitId;
const shillelaghQuarterstaffForceAttackName = "Quarterstaff (force)";
type ShillelaghForceAttackName =
  | typeof shillelaghQuarterstaffForceAttackName
  | "none";
const trueStrikeDaggerUnitId = "weapon_dagger";
type TrueStrikeDaggerUnitId = typeof trueStrikeDaggerUnitId;
const trueStrikeDaggerItemId = `main:${trueStrikeDaggerUnitId}`;
const trueStrikeDaggerObjectId = battleObjectId(trueStrikeDaggerItemId);
type TrueStrikeDaggerObjectId = typeof trueStrikeDaggerObjectId;
const trueStrikeDaggerAttackName = "Dagger";
type TrueStrikeDaggerAttackName = typeof trueStrikeDaggerAttackName | "none";
type HeroismFrightenedImmunityEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "conditionImmunity" }
>;
type HeroismTurnStartTemporaryHitPointsEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "turnStartTemporaryHitPoints" }
>;
type LongstriderSpeedDeltaEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "speedDelta" }
>;
type SearingSmiteTurnStartDamageAndSaveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellTurnStartDamageAndSave" }
>;
type ShillelaghWeaponAttackOverrideEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellWeaponAttackOverride" }
>;
type HexMarkedTarget = "target" | "transferTarget" | "none";
type HexTransferKind = "awaitingTargetDrop" | "availableAfterTurn" | "none";
type HexRetargetTiming = "laterTurn" | "none";
type HexAbilityCheckAbility = "wis" | "none";
type HexAbilityCheckRollMode = "disadvantage" | "normal" | "none";
type MarkedDamageRiderActiveEffect = Extract<
  BattleActiveEffect,
  { readonly kind: "spellMarkedDamageRider" }
>;
type HexActiveMarkEffect = MarkedDamageRiderActiveEffect;
type HuntersMarkActiveMarkEffect = MarkedDamageRiderActiveEffect;
type HuntersMarkMarkedTarget = "target" | "transferTarget" | "none";
type HuntersMarkTransferKind = "awaitingTargetDrop" | "available" | "none";
type HuntersMarkRetargetTiming = "sameTurn" | "none";
type CharacterCreatureInit = Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>;
type CharacterClassName =
  CharacterCreatureInit["classLevels"][number]["className"];

type Level1BuffMarkSmiteSelectedIdentityProjection = {
  readonly divineFavorActiveRiderCount: number;
  readonly targetHp: number;
  readonly longstriderTargetSpeedFeet: number;
  readonly longstriderSpeedEffectSourceSpellId: LongstriderSourceSpellId;
  readonly longstriderSpeedEffectTarget: LongstriderSpeedEffectTarget;
  readonly longstriderSpeedDeltaFeet: number;
  readonly casterTempHp: number;
  readonly casterFrightened: boolean;
  readonly spellSlotSpentThisTurn: boolean;
  readonly level1SlotsRemaining: number;
  readonly damageRiderSourceSpellId: DamageRiderSourceSpellId;
  readonly damageRiderDamageType: "radiant" | "none";
  readonly damageRiderDice: number;
  readonly damageRiderDieSize: number;
  readonly temporaryHitPointsSourceSpellId: TemporaryHitPointsSourceSpellId;
  readonly temporaryHitPointsDice: number;
  readonly temporaryHitPointsDieSize: number;
  readonly temporaryHitPointsFlat: number;
  readonly frightenedImmunitySourceSpellId: HeroismSourceSpellId;
  readonly frightenedImmunityCondition: "frightened" | "none";
  readonly turnStartTemporaryHitPointsSourceSpellId: HeroismSourceSpellId;
  readonly turnStartTemporaryHitPointsAmount: number;
  readonly ensnaringStrikeRestrainedBeforeEscape: boolean;
  readonly targetRestrained: boolean;
  readonly casterConcentrating: boolean;
  readonly ensnaringStrikeSaveSourceSpellId: EnsnaringStrikeSourceSpellId;
  readonly ensnaringStrikeSaveAbility: "str" | "none";
  readonly turnStartDamageSourceSpellId: EnsnaringStrikeSourceSpellId;
  readonly turnStartDamageDamageType: "piercing" | "none";
  readonly turnStartDamageDice: number;
  readonly turnStartDamageDieSize: number;
  readonly escapeCheckAbility: "str" | "none";
  readonly escapeCheckSkill: "athletics" | "none";
  readonly huntersMarkDamageHoleSourceSpellId: HuntersMarkSourceSpellId;
  readonly huntersMarkDamageHoleDamageType: "force" | "none";
  readonly huntersMarkDamageHoleDice: number;
  readonly huntersMarkDamageHoleDieSize: number;
  readonly huntersMarkActiveMarkSourceSpellId: HuntersMarkSourceSpellId;
  readonly huntersMarkActiveMarkTarget: HuntersMarkMarkedTarget;
  readonly huntersMarkConcentrationSourceSpellId: HuntersMarkSourceSpellId;
  readonly huntersMarkTransferKindOnDropTurn: HuntersMarkTransferKind;
  readonly huntersMarkActiveMarkTransferKind: HuntersMarkTransferKind;
  readonly huntersMarkActiveMarkRetargetTiming: HuntersMarkRetargetTiming;
  readonly huntersMarkTransferVisibleOnDropTurn: boolean;
  readonly hexDamageHoleSourceSpellId: HexSourceSpellId;
  readonly hexDamageHoleDamageType: "necrotic" | "none";
  readonly hexDamageHoleDice: number;
  readonly hexDamageHoleDieSize: number;
  readonly hexActiveMarkSourceSpellId: HexSourceSpellId;
  readonly hexActiveMarkTarget: HexMarkedTarget;
  readonly hexAbilityCheckAbility: HexAbilityCheckAbility;
  readonly hexMatchingTargetAbilityRollMode: HexAbilityCheckRollMode;
  readonly hexNonmatchingAbilityRollMode: HexAbilityCheckRollMode;
  readonly hexNonmarkedActorAbilityRollMode: HexAbilityCheckRollMode;
  readonly hexAfterCleanupAbilityRollMode: HexAbilityCheckRollMode;
  readonly hexTransferKindOnDropTurn: HexTransferKind;
  readonly hexActiveMarkTransferKind: HexTransferKind;
  readonly hexActiveMarkRetargetTiming: HexRetargetTiming;
  readonly hexTransferVisibleOnDropTurn: boolean;
  readonly searingSmiteLifecycle: SearingSmiteLifecycleProjection;
  readonly shillelaghWeaponAttackOverride: ShillelaghWeaponAttackOverrideProjection;
  readonly trueStrikeSpellHostedWeaponAttack: TrueStrikeSpellHostedWeaponAttackProjection;
  readonly lastResult:
    | "init"
    | "divineFavor"
    | "divineSmite"
    | "ensnaringStrike"
    | "falseLife"
    | "heroism"
    | "huntersMark"
    | "hex"
    | "longstrider"
    | "searingSmite"
    | "shillelagh"
    | "trueStrike";
};
type EnsnaringStrikeLifecycleProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "ensnaringStrikeRestrainedBeforeEscape"
  | "ensnaringStrikeSaveSourceSpellId"
  | "ensnaringStrikeSaveAbility"
  | "turnStartDamageSourceSpellId"
  | "turnStartDamageDamageType"
  | "turnStartDamageDice"
  | "turnStartDamageDieSize"
  | "escapeCheckAbility"
  | "escapeCheckSkill"
>;
type FalseLifeTemporaryHitPointsProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "temporaryHitPointsSourceSpellId"
  | "temporaryHitPointsDice"
  | "temporaryHitPointsDieSize"
  | "temporaryHitPointsFlat"
>;
type HeroismEffectsProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "frightenedImmunitySourceSpellId"
  | "frightenedImmunityCondition"
  | "turnStartTemporaryHitPointsSourceSpellId"
  | "turnStartTemporaryHitPointsAmount"
>;
type HexDamageHoleProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "hexDamageHoleSourceSpellId"
  | "hexDamageHoleDamageType"
  | "hexDamageHoleDice"
  | "hexDamageHoleDieSize"
>;
type HuntersMarkDamageHoleProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "huntersMarkDamageHoleSourceSpellId"
  | "huntersMarkDamageHoleDamageType"
  | "huntersMarkDamageHoleDice"
  | "huntersMarkDamageHoleDieSize"
>;
type HuntersMarkActiveMarkProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "huntersMarkActiveMarkSourceSpellId"
  | "huntersMarkActiveMarkTarget"
  | "huntersMarkConcentrationSourceSpellId"
  | "huntersMarkActiveMarkTransferKind"
  | "huntersMarkActiveMarkRetargetTiming"
>;
type HexActiveMarkProjection = Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "hexActiveMarkSourceSpellId"
  | "hexActiveMarkTarget"
  | "hexAbilityCheckAbility"
  | "hexMatchingTargetAbilityRollMode"
  | "hexNonmatchingAbilityRollMode"
  | "hexNonmarkedActorAbilityRollMode"
  | "hexActiveMarkTransferKind"
  | "hexActiveMarkRetargetTiming"
>;
type SearingSmiteDamageProjection = {
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly damageType: "fire";
  readonly dice: number;
  readonly dieSize: number;
};
type SearingSmiteTurnStartSaveProjection = {
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly ability: "con";
  readonly successEnds: "spell";
};
type SearingSmiteLifecycleProjection =
  | { readonly tag: "none" }
  | {
      readonly tag: "afterHitTimedDamageAndSaveCleanup";
      readonly immediateDamage: SearingSmiteDamageProjection;
      readonly activeBeforeSuccessfulSave: true;
      readonly turnStartDamage: SearingSmiteDamageProjection;
      readonly turnStartSave: SearingSmiteTurnStartSaveProjection;
      readonly activeAfterSuccessfulSave: false;
    };
type ShillelaghWeaponAttackOverrideProjection =
  | { readonly tag: "none" }
  | {
      readonly tag: "quarterstaffForceAttack";
      readonly sourceSpellId: typeof shillelaghUnitId;
      readonly weaponUnitId: ShillelaghQuarterstaffUnitId;
      readonly spellcastingAbilityModifier: number;
      readonly effectAttackBonus: number;
      readonly effectDamageDice: number;
      readonly effectDamageDieSize: number;
      readonly attackName: Exclude<ShillelaghForceAttackName, "none">;
      readonly attackBonus: number;
      readonly damageType: "force";
      readonly damageDice: number;
      readonly damageDieSize: number;
      readonly damageModifier: number;
    };
type TrueStrikeSpellHostedWeaponAttackProjection =
  | { readonly tag: "none" }
  | {
      readonly tag: "materialDaggerRadiantAttack";
      readonly sourceSpellId: typeof trueStrikeUnitId;
      readonly componentWeaponObjectId: TrueStrikeDaggerObjectId;
      readonly weaponUnitId: TrueStrikeDaggerUnitId;
      readonly attackName: Exclude<TrueStrikeDaggerAttackName, "none">;
      readonly attackBonus: number;
      readonly damageType: "radiant";
      readonly damageDice: number;
      readonly damageDieSize: number;
      readonly damageModifier: number;
    };
type SelectedUnitIdentityReplaySequence = {
  readonly name: string;
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityAction[];
  readonly expected: Level1BuffMarkSmiteSelectedIdentityProjection;
};
type SelectedUnitIdentityReplay = {
  readonly taskId:
    | "L1E-DIVINE-FAVOR"
    | "L1E-DIVINE-SMITE"
    | "L1E-ENSNARING-STRIKE"
    | "L1E-FALSE-LIFE"
    | "L1E-HEROISM"
    | "L1E-HUNTERS-MARK"
    | "L1E-HEX"
    | "L1E-LONGSTRIDER"
    | "L1E-SEARING-SMITE"
    | "L1E-SHILLELAGH"
    | "L1E-TRUE-STRIKE";
  readonly unitId: Level1BuffMarkSmiteSpellId;
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type PublicBonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type MechanicalBonusActionSpellAct = ReturnType<
  typeof discoverBattleActCandidates
>[number] & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type PublicActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type ScalarBuffTemporaryHitPointsRollHole = BattleSpellHealingRollHole;

const casterId = combatantId("level1-buff-mark-smite-caster");
const targetId = combatantId("level1-buff-mark-smite-target");
const markedDamageTransferTargetId = combatantId(
  "level1-buff-mark-smite-marked-damage-transfer-target",
);

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 buff mark smite selected identity Unit catalog must build.",
  );
}
const unitLibrary = unitCatalogResult.catalog;
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
if (statBlockCatalogResult.tag !== "ok") {
  throw new Error(
    "Level 1 buff mark smite selected identity Stat Block catalog must build.",
  );
}
const statBlockLibrary = statBlockCatalogResult.catalog;

const selectedUnitIdentityReplays = [
  {
    taskId: "L1E-DIVINE-FAVOR",
    unitId: "divine_favor",
    actions: ["doDivineFavorWeaponDamageRider"],
    sequences: [
      {
        name: "self-bonus-action-radiant-weapon-damage-rider",
        actions: ["doDivineFavorWeaponDamageRider"],
        expected: expectedProjection({
          divineFavorActiveRiderCount: 1,
          targetHp: 5,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          damageRiderSourceSpellId: "divine_favor",
          damageRiderDamageType: "radiant",
          damageRiderDice: 1,
          damageRiderDieSize: 4,
          lastResult: "divineFavor",
        }),
      },
    ],
  },
  {
    taskId: "L1E-DIVINE-SMITE",
    unitId: "divine_smite",
    actions: ["doDivineSmiteAfterHitDamage"],
    sequences: [
      {
        name: "after-hit-radiant-damage-uses-selected-spell-identity",
        actions: ["doDivineSmiteAfterHitDamage"],
        expected: expectedProjection({
          targetHp: 1,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          damageRiderSourceSpellId: "divine_smite",
          damageRiderDamageType: "radiant",
          damageRiderDice: 2,
          damageRiderDieSize: 8,
          lastResult: "divineSmite",
        }),
      },
    ],
  },
  {
    taskId: "L1E-ENSNARING-STRIKE",
    unitId: "ensnaring_strike",
    actions: ["doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape"],
    sequences: [
      {
        name: "after-hit-restraint-turn-start-damage-and-escape",
        actions: ["doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape"],
        expected: expectedProjection({
          targetHp: 5,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          ensnaringStrikeRestrainedBeforeEscape: true,
          targetRestrained: false,
          casterConcentrating: false,
          ensnaringStrikeSaveSourceSpellId: "ensnaring_strike",
          ensnaringStrikeSaveAbility: "str",
          turnStartDamageSourceSpellId: "ensnaring_strike",
          turnStartDamageDamageType: "piercing",
          turnStartDamageDice: 1,
          turnStartDamageDieSize: 6,
          escapeCheckAbility: "str",
          escapeCheckSkill: "athletics",
          lastResult: "ensnaringStrike",
        }),
      },
    ],
  },
  {
    taskId: "L1E-FALSE-LIFE",
    unitId: "false_life",
    actions: ["doFalseLifeTemporaryHitPoints"],
    sequences: [
      {
        name: "self-action-temporary-hit-points",
        actions: ["doFalseLifeTemporaryHitPoints"],
        expected: expectedProjection({
          casterTempHp: 11,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          temporaryHitPointsSourceSpellId: "false_life",
          temporaryHitPointsDice: 2,
          temporaryHitPointsDieSize: 4,
          temporaryHitPointsFlat: 4,
          lastResult: "falseLife",
        }),
      },
    ],
  },
  {
    taskId: "L1E-HEROISM",
    unitId: "heroism",
    actions: [
      "doHeroismFrightenedImmunityTurnStartTemporaryHitPoints",
      "doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup",
    ],
    sequences: [
      {
        name: "frightened-immunity-and-turn-start-temporary-hit-points",
        actions: ["doHeroismFrightenedImmunityTurnStartTemporaryHitPoints"],
        expected: expectedProjection({
          casterTempHp: 3,
          casterFrightened: false,
          level1SlotsRemaining: 1,
          casterConcentrating: true,
          frightenedImmunitySourceSpellId: "heroism",
          frightenedImmunityCondition: "frightened",
          turnStartTemporaryHitPointsSourceSpellId: "heroism",
          turnStartTemporaryHitPointsAmount: 3,
          lastResult: "heroism",
        }),
      },
      {
        name: "frightened-immunity-turn-start-temporary-hit-points-cleanup",
        actions: [
          "doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup",
        ],
        expected: expectedProjection({
          casterTempHp: 3,
          casterFrightened: true,
          level1SlotsRemaining: 1,
          casterConcentrating: false,
          frightenedImmunitySourceSpellId: "none",
          frightenedImmunityCondition: "none",
          turnStartTemporaryHitPointsSourceSpellId: "none",
          turnStartTemporaryHitPointsAmount: 0,
          lastResult: "heroism",
        }),
      },
    ],
  },
  {
    taskId: "L1E-HEX",
    unitId: "hex",
    actions: ["doHexMarkedDamageRiderAndLaterTurnTransfer"],
    sequences: [
      {
        name: "marked-necrotic-damage-and-later-turn-transfer",
        actions: ["doHexMarkedDamageRiderAndLaterTurnTransfer"],
        expected: expectedProjection({
          targetHp: 0,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          casterConcentrating: true,
          hexDamageHoleSourceSpellId: "hex",
          hexDamageHoleDamageType: "necrotic",
          hexDamageHoleDice: 1,
          hexDamageHoleDieSize: 6,
          hexActiveMarkSourceSpellId: "hex",
          hexActiveMarkTarget: "transferTarget",
          hexAbilityCheckAbility: "wis",
          hexMatchingTargetAbilityRollMode: "disadvantage",
          hexNonmatchingAbilityRollMode: "normal",
          hexNonmarkedActorAbilityRollMode: "normal",
          hexAfterCleanupAbilityRollMode: "normal",
          hexTransferKindOnDropTurn: "availableAfterTurn",
          hexActiveMarkTransferKind: "awaitingTargetDrop",
          hexActiveMarkRetargetTiming: "laterTurn",
          hexTransferVisibleOnDropTurn: false,
          lastResult: "hex",
        }),
      },
    ],
  },
  {
    taskId: "L1E-HUNTERS-MARK",
    unitId: "hunters_mark",
    actions: ["doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer"],
    sequences: [
      {
        name: "marked-force-damage-concentration-and-same-turn-transfer",
        actions: [
          "doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer",
        ],
        expected: expectedProjection({
          targetHp: 0,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          casterConcentrating: true,
          huntersMarkDamageHoleSourceSpellId: "hunters_mark",
          huntersMarkDamageHoleDamageType: "force",
          huntersMarkDamageHoleDice: 1,
          huntersMarkDamageHoleDieSize: 6,
          huntersMarkActiveMarkSourceSpellId: "hunters_mark",
          huntersMarkActiveMarkTarget: "transferTarget",
          huntersMarkConcentrationSourceSpellId: "hunters_mark",
          huntersMarkTransferKindOnDropTurn: "available",
          huntersMarkActiveMarkTransferKind: "awaitingTargetDrop",
          huntersMarkActiveMarkRetargetTiming: "sameTurn",
          huntersMarkTransferVisibleOnDropTurn: true,
          lastResult: "huntersMark",
        }),
      },
    ],
  },
  {
    taskId: "L1E-LONGSTRIDER",
    unitId: "longstrider",
    actions: ["doLongstriderSpeedIncrease"],
    sequences: [
      {
        name: "target-speed-increase-uses-selected-spell-identity",
        actions: ["doLongstriderSpeedIncrease"],
        expected: expectedProjection({
          longstriderTargetSpeedFeet: 40,
          longstriderSpeedEffectSourceSpellId: "longstrider",
          longstriderSpeedEffectTarget: "target",
          longstriderSpeedDeltaFeet: 10,
          spellSlotSpentThisTurn: true,
          level1SlotsRemaining: 1,
          lastResult: "longstrider",
        }),
      },
    ],
  },
  {
    taskId: "L1E-SEARING-SMITE",
    unitId: "searing_smite",
    actions: ["doSearingSmiteAfterHitTimedDamageAndSaveCleanup"],
    sequences: [
      {
        name: "after-hit-fire-damage-turn-start-damage-and-save-cleanup",
        actions: ["doSearingSmiteAfterHitTimedDamageAndSaveCleanup"],
        expected: expectedProjection({
          targetHp: 1,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 1,
          searingSmiteLifecycle: {
            tag: "afterHitTimedDamageAndSaveCleanup",
            immediateDamage: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("searing_smite"),
              ),
              damageType: "fire",
              dice: 1,
              dieSize: 6,
            },
            activeBeforeSuccessfulSave: true,
            turnStartDamage: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("searing_smite"),
              ),
              damageType: "fire",
              dice: 1,
              dieSize: 6,
            },
            turnStartSave: {
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String("searing_smite"),
              ),
              ability: "con",
              successEnds: "spell",
            },
            activeAfterSuccessfulSave: false,
          },
          lastResult: "searingSmite",
        }),
      },
    ],
  },
  {
    taskId: "L1E-SHILLELAGH",
    unitId: "shillelagh",
    actions: ["doShillelaghWeaponAttackOverride"],
    sequences: [
      {
        name: "held-quarterstaff-force-attack-override",
        actions: ["doShillelaghWeaponAttackOverride"],
        expected: expectedProjection({
          targetHp: 5,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 2,
          shillelaghWeaponAttackOverride: {
            tag: "quarterstaffForceAttack",
            sourceSpellId: shillelaghUnitId,
            weaponUnitId: shillelaghQuarterstaffUnitId,
            spellcastingAbilityModifier: 3,
            effectAttackBonus: 5,
            effectDamageDice: 1,
            effectDamageDieSize: 8,
            attackName: shillelaghQuarterstaffForceAttackName,
            attackBonus: 5,
            damageType: "force",
            damageDice: 1,
            damageDieSize: 8,
            damageModifier: 3,
          },
          lastResult: "shillelagh",
        }),
      },
    ],
  },
  {
    taskId: "L1E-TRUE-STRIKE",
    unitId: "true_strike",
    actions: ["doTrueStrikeSpellHostedWeaponAttack"],
    sequences: [
      {
        name: "material-dagger-radiant-spell-hosted-weapon-attack",
        actions: ["doTrueStrikeSpellHostedWeaponAttack"],
        expected: expectedProjection({
          targetHp: 5,
          spellSlotSpentThisTurn: false,
          level1SlotsRemaining: 2,
          trueStrikeSpellHostedWeaponAttack: {
            tag: "materialDaggerRadiantAttack",
            sourceSpellId: trueStrikeUnitId,
            componentWeaponObjectId: trueStrikeDaggerObjectId,
            weaponUnitId: trueStrikeDaggerUnitId,
            attackName: trueStrikeDaggerAttackName,
            attackBonus: 5,
            damageType: "radiant",
            damageDice: 1,
            damageDieSize: 4,
            damageModifier: 3,
          },
          lastResult: "trueStrike",
        }),
      },
    ],
  },
] as const satisfies ReadonlyArray<SelectedUnitIdentityReplay>;

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Level 1 buff mark smite selected identity replay",
  taskId: "level1-buff-mark-smite-selected-identity",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  quintStateFieldPrefix: "q",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  projectionSchema: {},
  initialProjection: expectedProjection(),
  normalizeQuintState: normalizeLevel1BuffMarkSmiteSelectedIdentityQuintState,
  units: selectedUnitIdentityReplays.map((replay) => ({
    unitId: replay.unitId,
    procedures: replay.sequences.map((sequence) => {
      const actionName = singleReplayAction(
        replay.unitId,
        sequence.name,
        sequence.actions,
      );
      return {
        actionName,
        discover: () => replayLevel1BuffMarkSmiteAction(actionName),
      };
    }),
  })),
});

describe("Level 1 buff mark smite copied qRoute connector replay", () => {
  it(
    "matches copied weapon-hosted qRoute through public reducer entrypoints",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-level1-weapon-hosted-selected-identity.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createPublicLevel1WeaponHostedSelectedRouteDriver,
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(2),
        stateCheck: reducerRoutedLevel1WeaponHostedSelectedRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
  it(
    "matches copied marked/immunity qRoute through public reducer entrypoints",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-marked-damage-immunity-active-effects.route.mbt.qnt",
        ),
        init: "init",
        step: "step",
        driver: createPublicMarkedDamageImmunityRouteDriver,
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(5),
        stateCheck: reducerRoutedMarkedDamageImmunityPublicRouteStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function createPublicLevel1WeaponHostedSelectedRouteDriver() {
  let route: readonly BattleReducerRouteEvent[] = [
    battleReducerStartRouteEvent(),
  ];
  const replay = (
    actionName: Extract<
      Level1BuffMarkSmiteSelectedIdentityAction,
      | "doDivineFavorWeaponDamageRider"
      | "doShillelaghWeaponAttackOverride"
      | "doTrueStrikeSpellHostedWeaponAttack"
    >,
  ): void => {
    const runtime = createLevel1BuffMarkSmiteSelectedIdentityRuntime();
    runtime[actionName]();
    route = publicConnectorRouteProjection(runtime.getRoute());
  };
  return {
    actions: {
      init: {
        picks: {},
        handler: () => {
          route = [battleReducerStartRouteEvent()];
        },
      },
      doDivineFavorWeaponDamageRider: {
        picks: {},
        handler: () => replay("doDivineFavorWeaponDamageRider"),
      },
      doShillelaghWeaponAttackOverride: {
        picks: {},
        handler: () => replay("doShillelaghWeaponAttackOverride"),
      },
      doTrueStrikeSpellHostedWeaponAttack: {
        picks: {},
        handler: () => replay("doTrueStrikeSpellHostedWeaponAttack"),
      },
      doStutterAfterTerminalSurface: {
        picks: {},
        handler: () => {},
      },
      step: { picks: {}, handler: () => {} },
    },
    getState: () => ({ route }),
  };
}

type PublicReducerRouteProjection = {
  readonly route: readonly unknown[];
};

const reducerRoutedMarkedDamageImmunityPublicRouteStateCheck = stateCheck(
  (raw: unknown): PublicReducerRouteProjection => {
    if (isPublicReducerRouteProjection(raw)) {
      return raw;
    }
    const state = quintStateRecord(raw);
    return {
      route: decodeReducerRoute(quintField(state, "qRoute")),
    };
  },
  (spec: PublicReducerRouteProjection, impl: PublicReducerRouteProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function isPublicReducerRouteProjection(
  raw: unknown,
): raw is PublicReducerRouteProjection {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "route" in raw &&
    Array.isArray(raw.route)
  );
}

type MarkedDamageImmunityRouteAction =
  | "doAdmitMarkedDamageRider"
  | "doProjectMarkedDamageRiderOnHit"
  | "doOpenMarkedDamageRiderTransferAfterTargetDrop"
  | "doTransferMarkedDamageRiderSameTurn"
  | "doTransferMarkedDamageRiderLaterTurn"
  | "doAdmitTargetedAbilityCheckMarkedDamageRider"
  | "doProjectTargetedAbilityCheckRollMode"
  | "doCleanupTargetedAbilityCheckRollMode"
  | "doAdmitConditionImmunityTemporaryHitPoints"
  | "doProjectConditionImmunity"
  | "doGrantTurnStartTemporaryHitPoints"
  | "doCleanupConditionImmunityTemporaryHitPoints";

function createPublicMarkedDamageImmunityRouteDriver() {
  let route: readonly BattleReducerRouteEvent[] = [
    battleReducerStartRouteEvent(),
  ];
  const segments = createPublicMarkedDamageImmunityRouteSegments();
  const appendSegment = (action: MarkedDamageImmunityRouteAction): void => {
    route = [...route, ...segments[action]];
  };
  return {
    actions: {
      init: {
        picks: {},
        handler: () => {
          route = [battleReducerStartRouteEvent()];
        },
      },
      doAdmitMarkedDamageRider: {
        picks: {},
        handler: () => appendSegment("doAdmitMarkedDamageRider"),
      },
      doProjectMarkedDamageRiderOnHit: {
        picks: {},
        handler: () => appendSegment("doProjectMarkedDamageRiderOnHit"),
      },
      doOpenMarkedDamageRiderTransferAfterTargetDrop: {
        picks: {},
        handler: () =>
          appendSegment("doOpenMarkedDamageRiderTransferAfterTargetDrop"),
      },
      doTransferMarkedDamageRiderSameTurn: {
        picks: {},
        handler: () => appendSegment("doTransferMarkedDamageRiderSameTurn"),
      },
      doTransferMarkedDamageRiderLaterTurn: {
        picks: {},
        handler: () => appendSegment("doTransferMarkedDamageRiderLaterTurn"),
      },
      doAdmitTargetedAbilityCheckMarkedDamageRider: {
        picks: {},
        handler: () =>
          appendSegment("doAdmitTargetedAbilityCheckMarkedDamageRider"),
      },
      doProjectTargetedAbilityCheckRollMode: {
        picks: {},
        handler: () => appendSegment("doProjectTargetedAbilityCheckRollMode"),
      },
      doCleanupTargetedAbilityCheckRollMode: {
        picks: {},
        handler: () => appendSegment("doCleanupTargetedAbilityCheckRollMode"),
      },
      doAdmitConditionImmunityTemporaryHitPoints: {
        picks: {},
        handler: () =>
          appendSegment("doAdmitConditionImmunityTemporaryHitPoints"),
      },
      doProjectConditionImmunity: {
        picks: {},
        handler: () => appendSegment("doProjectConditionImmunity"),
      },
      doGrantTurnStartTemporaryHitPoints: {
        picks: {},
        handler: () => appendSegment("doGrantTurnStartTemporaryHitPoints"),
      },
      doCleanupConditionImmunityTemporaryHitPoints: {
        picks: {},
        handler: () =>
          appendSegment("doCleanupConditionImmunityTemporaryHitPoints"),
      },
      doStutterAfterTerminalSurface: {
        picks: {},
        handler: () => {},
      },
      step: { picks: {}, handler: () => {} },
    },
    getState: () => ({ route }),
  };
}

function createPublicMarkedDamageImmunityRouteSegments(): Record<
  MarkedDamageImmunityRouteAction,
  readonly BattleReducerRouteEvent[]
> {
  return {
    doAdmitMarkedDamageRider: observeMarkedRiderAdmissionRoute(),
    doProjectMarkedDamageRiderOnHit: observeMarkedRiderAttackHitRoute(),
    doOpenMarkedDamageRiderTransferAfterTargetDrop:
      observeMarkedRiderTransferAvailabilityRoute(),
    doTransferMarkedDamageRiderSameTurn:
      observeMarkedRiderSameTurnTransferRoute(),
    doTransferMarkedDamageRiderLaterTurn:
      observeMarkedRiderLaterTurnTransferRoute(),
    doAdmitTargetedAbilityCheckMarkedDamageRider:
      observeTargetedAbilityCheckMarkedRiderAdmissionRoute(),
    doProjectTargetedAbilityCheckRollMode:
      observeTargetedAbilityCheckRollModeProjectionRoute(),
    doCleanupTargetedAbilityCheckRollMode:
      observeTargetedAbilityCheckRollModeCleanupRoute(),
    doAdmitConditionImmunityTemporaryHitPoints:
      observeConditionImmunityTemporaryHitPointAdmissionRoute(),
    doProjectConditionImmunity: observeConditionImmunityProjectionRoute(),
    doGrantTurnStartTemporaryHitPoints:
      observeTurnStartTemporaryHitPointRoute(),
    doCleanupConditionImmunityTemporaryHitPoints:
      observeConditionImmunityTemporaryHitPointCleanupRoute(),
  };
}

function observeMarkedRiderAdmissionRoute(): readonly BattleReducerRouteEvent[] {
  return castHuntersMarkForRoute().routeEvents;
}

function observeMarkedRiderAttackHitRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHuntersMarkForRoute();
  const state = advanceMarkedDamageRoundToCasterTurn(cast.state);
  return markedDamageRiderRouteEvents(
    resolveMarkedDamageRiderAttack({
      state,
      damageGroups: [[4], [1]],
    }),
  ).filter(
    (event) =>
      event.kind !== "resolveBattleSubjectWithoutFill" &&
      event.owner !== "battleHitPointAndZeroHpLifecycle",
  );
}

function observeMarkedRiderTransferAvailabilityRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHuntersMarkForRoute();
  const state = advanceMarkedDamageRoundToCasterTurn(cast.state);
  return markedDamageRiderRouteEvents(
    resolveMarkedDamageRiderAttack({
      state,
      damageGroups: [[8], [6]],
    }),
  ).filter((event) => event.kind === "resolveBattleSubjectWithoutFill");
}

function observeMarkedRiderSameTurnTransferRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHuntersMarkForRoute();
  const state = advanceMarkedDamageRoundToCasterTurn(cast.state);
  const damaged = resolveMarkedDamageRiderAttack({
    state,
    damageGroups: [[8], [6]],
  });
  const transferAct = markedDamageTransferAct(damaged.state, huntersMarkUnitId);
  const transferTarget = requireHole(transferAct.initialHoles, "targetChoice");
  const transferred = resolveBattleSubject({
    state: damaged.state,
    subject: transferAct.subject,
    fills: [
      spellTargetFill(
        transferTarget,
        transferAct.subject.procedureRef,
        casterId,
        markedDamageTransferTargetId,
      ),
    ],
  });
  return markedDamageRiderRouteEvents(transferAct, transferred);
}

function observeMarkedRiderLaterTurnTransferRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHexForRoute();
  const state = advanceMarkedDamageRoundToCasterTurn(cast.state);
  const damaged = resolveMarkedDamageRiderAttack({
    state,
    damageGroups: [[8], [6]],
  });
  const advanced = advanceMarkedDamageRoundToCasterTurnWithRoute(damaged.state);
  const transferAct = markedDamageTransferAct(advanced.state, hexUnitId);
  const transferTarget = requireHole(transferAct.initialHoles, "targetChoice");
  const transferred = resolveBattleSubject({
    state: advanced.state,
    subject: transferAct.subject,
    fills: [
      spellTargetFill(
        transferTarget,
        transferAct.subject.procedureRef,
        casterId,
        markedDamageTransferTargetId,
      ),
    ],
  });
  return [
    ...advanced.routeEvents.filter(
      (event) =>
        event.kind === "resolveBattleSubjectWithoutFill" &&
        event.owner === "battleTurnBoundary",
    ),
    ...markedDamageRiderRouteEvents(transferAct, transferred),
  ];
}

function observeTargetedAbilityCheckMarkedRiderAdmissionRoute(): readonly BattleReducerRouteEvent[] {
  return castHexForRoute().routeEvents;
}

function observeTargetedAbilityCheckRollModeProjectionRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHexForRoute();
  const state = withHiddenCasterForSearch(
    requireResolvedResult(
      endTurn({ state: cast.state, actorId: casterId }),
      "Expected caster turn to end before Hex target Search.",
    ).state,
  );
  const searchAct = searchActForActor(state, targetId);
  const target = requireHole(searchAct.initialHoles, "targetChoice");
  const targetFill = targetChoiceFill(target, casterId);
  const awaitingCheck = resolveBattleSubject({
    state,
    subject: searchAct.subject,
    fills: [targetFill],
  });
  const check = requireResultHole(awaitingCheck, "abilityCheck");
  const resolved = resolveBattleSubject({
    state,
    subject: searchAct.subject,
    fills: [targetFill, abilityCheckFill(check, 12)],
  });
  return routeEventsFrom(searchAct, awaitingCheck, resolved);
}

function observeTargetedAbilityCheckRollModeCleanupRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHexForRoute();
  const endConcentration = endConcentrationAct(cast.state);
  const ended = resolveBattleSubject({
    state: cast.state,
    subject: endConcentration.subject,
    fills: [],
  });
  return markedDamageRiderRouteEvents(ended);
}

function observeConditionImmunityTemporaryHitPointAdmissionRoute(): readonly BattleReducerRouteEvent[] {
  return castHeroismForRoute({ frightenedBeforeCast: false }).routeEvents;
}

function observeConditionImmunityProjectionRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHeroismForRoute({ frightenedBeforeCast: true });
  const routeEvents = conditionImmunityTemporaryHitPointRouteEvents(
    ...cast.sources,
  );
  const conditionLifecycleIndex = routeEvents.findIndex(
    (event) =>
      event.kind === "resolveBattleSubjectWithoutFill" &&
      event.owner === "battleConditionLifecycle",
  );
  return conditionLifecycleIndex === -1
    ? []
    : routeEvents.slice(conditionLifecycleIndex);
}

function observeTurnStartTemporaryHitPointRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHeroismForRoute({ frightenedBeforeCast: false });
  const targetTurn = endTurn({
    state: cast.state,
    actorId: casterId,
  });
  const refreshed = endTurn({
    state: requireResolvedResult(
      targetTurn,
      "Expected Heroism caster turn to end before target turn.",
    ).state,
    actorId: targetId,
  });
  return conditionImmunityTemporaryHitPointRouteEvents(refreshed);
}

function observeConditionImmunityTemporaryHitPointCleanupRoute(): readonly BattleReducerRouteEvent[] {
  const cast = castHeroismForRoute({ frightenedBeforeCast: false });
  const endConcentration = endConcentrationAct(cast.state);
  const ended = resolveBattleSubject({
    state: cast.state,
    subject: endConcentration.subject,
    fills: [],
  });
  return conditionImmunityTemporaryHitPointRouteEvents(ended);
}

function castHuntersMarkForRoute(): {
  readonly state: BattleState;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const session = level1BuffMarkSmiteSession({
    preparedSpells: [spellRecord(huntersMarkUnitId)],
    sourceClassName: "ranger",
    targetKind: "statBlock",
    includeMarkedDamageTransferTarget: true,
  });
  const state = session.state;
  const act = publicBonusActionSpellAct(session, huntersMarkUnitId);
  const target = requireHole(act.initialHoles, "targetChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(target, act.subject.procedureRef, casterId, targetId),
    ],
  });
  return {
    state: requireResolvedResult(
      cast,
      "Expected Hunter's Mark public cast route to resolve.",
    ).state,
    routeEvents: markedDamageRiderRouteEvents(act, cast),
  };
}

function castHexForRoute(): {
  readonly state: BattleState;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const session = level1BuffMarkSmiteSession({
    preparedSpells: [spellRecord(hexUnitId)],
    sourceClassName: "warlock",
    targetKind: "statBlock",
    includeMarkedDamageTransferTarget: true,
  });
  const state = session.state;
  const act = publicBonusActionSpellAct(session, hexUnitId);
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetFill(
    target,
    act.subject.procedureRef,
    casterId,
    targetId,
  );
  const awaitingAbility = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetFill],
  });
  const ability = requireResultHole(awaitingAbility, "abilityChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetFill, abilityChoiceFill(ability, "wis")],
  });
  return {
    state: requireResolvedResult(
      cast,
      "Expected Hex public cast route to resolve.",
    ).state,
    routeEvents: markedDamageRiderRouteEvents(act, awaitingAbility, cast),
  };
}

function castHeroismForRoute(input: {
  readonly frightenedBeforeCast: boolean;
}): {
  readonly state: BattleState;
  readonly sources: readonly RouteEventSource[];
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const session = level1BuffMarkSmiteSession({
    preparedSpells: [spellRecord(heroismUnitId)],
  });
  const initial = session.state;
  const state = input.frightenedBeforeCast
    ? withFrightenedCaster(initial)
    : initial;
  const act = publicActionSpellAct(
    battleRuntimeSessionForTest({ ...session, state }),
    heroismUnitId,
  );
  const target = requireHole(act.initialHoles, "targetChoice");
  const cast = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      spellTargetFill(target, act.subject.procedureRef, casterId, casterId),
    ],
  });
  const sources = [act, cast] as const;
  return {
    state: requireResolvedResult(
      cast,
      "Expected Heroism public cast route to resolve.",
    ).state,
    sources,
    routeEvents: conditionImmunityTemporaryHitPointRouteEvents(...sources),
  };
}

function resolveMarkedDamageRiderAttack(input: {
  readonly state: BattleState;
  readonly damageGroups: readonly (readonly number[])[];
}): {
  readonly state: BattleState;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const hit = resolveLongswordHitWithAttackRoll({ state: input.state });
  const damage = requireDamageRollHole(requireNeedsHoles(hit.afterAttackRoll));
  const damageFill = damageRollFillWithGroups(damage, input.damageGroups);
  const baseFills = [hit.targetFill, hit.attackFill, damageFill] as const;
  let damaged = resolveBattleSubject({
    state: input.state,
    subject: hit.subject,
    fills: baseFills,
  });
  const routeEvents = [...hit.routeEvents, ...(damaged.routeEvents ?? [])];
  if (damaged.tag === "needsHoles") {
    const disposition = damaged.holes.find(
      (
        hole,
      ): hole is Extract<
        BattleHole,
        { readonly kind: "attackDamageDisposition" }
      > => hole.kind === "attackDamageDisposition",
    );
    if (disposition !== undefined) {
      damaged = resolveBattleSubject({
        state: input.state,
        subject: hit.subject,
        fills: [
          ...baseFills,
          attackDamageDispositionFill(disposition, { kind: "ordinaryDamage" }),
        ],
      });
      routeEvents.push(...(damaged.routeEvents ?? []));
    }
  }
  return {
    state: requireResolvedResult(
      damaged,
      "Expected marked damage rider attack route to resolve.",
    ).state,
    routeEvents,
  };
}

function advanceMarkedDamageRoundToCasterTurnWithRoute(state: BattleState): {
  readonly state: BattleState;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const targetTurn = endTurn({ state, actorId: casterId });
  const transferTargetTurn = endTurn({
    state: requireResolvedResult(
      targetTurn,
      "Expected marked damage caster turn to end.",
    ).state,
    actorId: targetId,
  });
  const casterTurn = endTurn({
    state: requireResolvedResult(
      transferTargetTurn,
      "Expected marked damage target turn to end.",
    ).state,
    actorId: markedDamageTransferTargetId,
  });
  return {
    state: requireResolvedResult(
      casterTurn,
      "Expected marked damage transfer target turn to end.",
    ).state,
    routeEvents: markedDamageRiderRouteEvents(
      targetTurn,
      transferTargetTurn,
      casterTurn,
    ),
  };
}

function withFrightenedCaster(state: BattleState): BattleState {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Heroism caster.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(casterId, {
      ...caster,
      conditions: KnockedOutConditionState(
        applyCondition(caster.conditions, "frightened"),
      ),
    }),
  };
}

function withHiddenCasterForSearch(state: BattleState): BattleState {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected hidden Search target caster.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(casterId, {
      ...caster,
      hidden: { discoveryDc: difficultyClass(15) },
    }),
  };
}

function searchActForActor(state: BattleState, actorId: CombatantId) {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "search" &&
      candidate.subject.actorId === actorId,
  );
  if (act === undefined) {
    throw new Error("Expected public Search act for Hex ability-check route.");
  }
  return act;
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  value: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value,
  };
}

function attackDamageDispositionFill(
  hole: Extract<BattleHole, { readonly kind: "attackDamageDisposition" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "attackDamageDisposition" }
  >["value"],
): Extract<BattleFill, { readonly kind: "attackDamageDisposition" }> {
  return {
    kind: "attackDamageDisposition",
    holeId: hole.holeId,
    value,
  };
}

const publicConnectorRouteSubjects = [
  "afterHitSpell",
  "scalarBuffEffect",
  "weaponDamageRider",
  "spellHostedWeaponAttack",
  "heldWeaponActiveEffect",
  "markedDamageRiderEffect",
  "conditionImmunityTemporaryHitPointEffect",
] as const satisfies ReadonlyArray<
  Extract<BattleReducerRouteEvent, { readonly subject: string }>["subject"]
>;

function publicConnectorRouteProjection(
  route: readonly BattleReducerRouteEvent[],
): readonly BattleReducerRouteEvent[] {
  return route.filter(
    (event) =>
      event.kind === "startBattle" ||
      publicConnectorRouteSubjects.some(
        (subject) =>
          "subject" in event &&
          event.subject === subject &&
          (event.subject !== "heldWeaponActiveEffect" ||
            !(
              event.kind === "resolveBattleSubject" &&
              event.fill === "targetChoice"
            )),
      ),
  );
}

type RouteEventSource = {
  readonly routeEvents?: readonly BattleReducerRouteEvent[];
};

function markedDamageRiderRouteEvents(
  ...sources: readonly RouteEventSource[]
): readonly BattleReducerRouteEvent[] {
  return routeEventsFrom(...sources).filter(
    (event) =>
      "subject" in event && event.subject === "markedDamageRiderEffect",
  );
}

function conditionImmunityTemporaryHitPointRouteEvents(
  ...sources: readonly RouteEventSource[]
): readonly BattleReducerRouteEvent[] {
  return routeEventsFrom(...sources).filter(
    (event) =>
      "subject" in event &&
      event.subject === "conditionImmunityTemporaryHitPointEffect",
  );
}

function routeEventsFrom(
  ...sources: readonly RouteEventSource[]
): readonly BattleReducerRouteEvent[] {
  return sources.flatMap((source) => source.routeEvents ?? []);
}

function singleReplayAction(
  unitId: Level1BuffMarkSmiteSpellId,
  sequenceName: string,
  actions: readonly Level1BuffMarkSmiteSelectedIdentityAction[],
): Level1BuffMarkSmiteSelectedIdentityAction {
  if (actions.length !== 1 || actions[0] === undefined) {
    throw new Error(
      `Expected single Level 1 buff mark smite selected identity replay action for ${unitId}:${sequenceName}.`,
    );
  }
  return actions[0];
}

function replayLevel1BuffMarkSmiteAction(
  actionName: Level1BuffMarkSmiteSelectedIdentityAction,
): Level1BuffMarkSmiteSelectedIdentityProjection {
  const runtime = createLevel1BuffMarkSmiteSelectedIdentityRuntime();
  runtime[actionName]();
  return runtime.getState();
}

function createLevel1BuffMarkSmiteSelectedIdentityRuntime() {
  let session = level1BuffMarkSmiteSession();
  let state = session.state;
  let route: readonly BattleReducerRouteEvent[] = [
    battleReducerStartRouteEvent(),
  ];
  let damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined;
  let projectedDamageRiderSourceSpellId: DamageRiderSourceSpellId = "none";
  let hexDamageHoleRider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined;
  let huntersMarkDamageHoleRider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined;
  let huntersMarkTransferKindOnDropTurn: HuntersMarkTransferKind = "none";
  let huntersMarkTransferVisibleOnDropTurn = false;
  let hexTransferKindOnDropTurn: HexTransferKind = "none";
  let hexTransferVisibleOnDropTurn = false;
  let hexAfterCleanupAbilityRollMode: HexAbilityCheckRollMode = "none";
  let ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
  let falseLifeTemporaryHitPoints =
    defaultFalseLifeTemporaryHitPointsProjection();
  let heroismEffects = defaultHeroismEffectsProjection();
  let searingSmiteLifecycle = defaultSearingSmiteLifecycleProjection();
  let shillelaghWeaponAttackOverride =
    defaultShillelaghWeaponAttackOverrideProjection();
  let trueStrikeSpellHostedWeaponAttack =
    defaultTrueStrikeSpellHostedWeaponAttackProjection();
  let lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] =
    "init";

  function resetProcedureProjections(): void {
    damageRider = undefined;
    projectedDamageRiderSourceSpellId = "none";
    hexDamageHoleRider = undefined;
    huntersMarkDamageHoleRider = undefined;
    huntersMarkTransferKindOnDropTurn = "none";
    huntersMarkTransferVisibleOnDropTurn = false;
    hexTransferKindOnDropTurn = "none";
    hexTransferVisibleOnDropTurn = false;
    hexAfterCleanupAbilityRollMode = "none";
    ensnaringStrikeLifecycle = defaultEnsnaringStrikeLifecycleProjection();
    falseLifeTemporaryHitPoints =
      defaultFalseLifeTemporaryHitPointsProjection();
    heroismEffects = defaultHeroismEffectsProjection();
    searingSmiteLifecycle = defaultSearingSmiteLifecycleProjection();
    shillelaghWeaponAttackOverride =
      defaultShillelaghWeaponAttackOverrideProjection();
    trueStrikeSpellHostedWeaponAttack =
      defaultTrueStrikeSpellHostedWeaponAttackProjection();
  }

  function reset(): void {
    session = level1BuffMarkSmiteSession();
    state = session.state;
    route = [battleReducerStartRouteEvent()];
    resetProcedureProjections();
    lastResult = "init";
  }

  function level1BuffMarkSmiteSessionAtState(
    mechanicalState: BattleState,
  ): BattleRuntimeSession {
    return battleRuntimeSessionForTest({ ...session, state: mechanicalState });
  }

  function recordRouteEvents(
    ...sources: readonly {
      readonly routeEvents?: readonly BattleReducerRouteEvent[];
    }[]
  ): void {
    route = [
      ...route,
      ...sources.flatMap((source) => source.routeEvents ?? []),
    ];
  }

  function resolveHeroismThroughCasterStartTurn(): void {
    session = level1BuffMarkSmiteSession({
      preparedSpells: [spellRecord(heroismUnitId)],
    });
    state = session.state;
    const caster = state.combatants.get(casterId);
    if (caster === undefined) {
      throw new Error("Expected Heroism caster.");
    }
    state = {
      ...state,
      combatants: new Map(state.combatants).set(casterId, {
        ...caster,
        conditions: KnockedOutConditionState(
          applyCondition(caster.conditions, "frightened"),
        ),
      }),
    };
    resetProcedureProjections();

    const act = publicActionSpellAct(
      level1BuffMarkSmiteSessionAtState(state),
      heroismUnitId,
    );
    const target = requireHole(act.initialHoles, "targetChoice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(target, act.subject.procedureRef, casterId, casterId),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error(`Expected Heroism to resolve, got ${cast.tag}.`);
    }

    const targetTurn = endTurn({
      state: cast.state,
      actorId: casterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error(
        `Expected Heroism caster turn to end, got ${targetTurn.tag}.`,
      );
    }
    const refreshed = endTurn({
      state: targetTurn.state,
      actorId: targetId,
    });
    recordRouteEvents(act, cast, targetTurn, refreshed);
    recordResolvedResult(refreshed, "heroism");
    heroismEffects = heroismEffectsProjection(
      level1BuffMarkSmiteSessionAtState(state),
    );
  }

  function recordResolvedResult(
    result: BattleResolutionResult,
    resultKind: Exclude<
      Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"],
      "init"
    >,
  ): void {
    if (result.tag !== "resolved") {
      throw new Error(
        `Expected Level 1 buff mark smite action to resolve, got ${result.tag}.`,
      );
    }
    state = result.state;
    lastResult = resultKind;
  }

  return {
    init: reset,
    doDivineFavorWeaponDamageRider: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(divineFavorUnitId)],
      });
      state = session.state;
      resetProcedureProjections();

      const act = publicBonusActionSpellAct(session, divineFavorUnitId);
      const cast = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [],
      });
      if (cast.tag !== "resolved") {
        throw new Error(`Expected Divine Favor to resolve, got ${cast.tag}.`);
      }
      state = cast.state;

      const attack = resolveLongswordHit({
        session: level1BuffMarkSmiteSessionAtState(state),
      });
      damageRider = attack.damageRider;
      projectedDamageRiderSourceSpellId = divineFavorUnitId;
      recordRouteEvents(act, cast, attack);
      recordResolvedResult(attack.result, "divineFavor");
    },
    doDivineSmiteAfterHitDamage: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(divineSmiteUnitId)],
      });
      state = session.state;
      resetProcedureProjections();

      const hit = resolveLongswordHitWithAttackRoll({ state });
      const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
      const smiteChoice = attackHitBonusActionSpellChoice(
        attackHitWindow,
        divineSmiteUnitId,
      );
      const afterSmite = resolveBattleInterrupt({
        state: attackHitWindow.state,
        fill: interruptDecisionFill(
          requireHole(attackHitWindow.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: casterId,
            choice: {
              kind: "castAttackHitBonusActionSpell",
              procedureRef: smiteChoice.subject.procedureRef,
              fills: [],
            },
          },
        ),
      });
      const afterSmiteDamage = requireNeedsHoles(afterSmite);
      const damage = requireDamageRollHole(afterSmiteDamage);
      damageRider = spellWeaponDamageRider(
        level1BuffMarkSmiteSessionAtState(afterSmiteDamage.state),
        damage,
        divineSmiteUnitId,
      );
      projectedDamageRiderSourceSpellId = divineSmiteUnitId;
      const resolved = resolveBattleSubject({
        state: afterSmiteDamage.state,
        subject: hit.subject,
        fills: [
          hit.targetFill,
          hit.attackFill,
          damageRollFillWithGroups(damage, [[4], [3, 4]]),
        ],
      });
      recordRouteEvents(hit, afterSmite, resolved);
      recordResolvedResult(resolved, "divineSmite");
    },
    doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(ensnaringStrikeUnitId)],
        sourceClassName: "ranger",
      });
      state = session.state;
      resetProcedureProjections();

      const hit = resolveLongswordHitWithAttackRoll({ state });
      const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
      const ensnaringChoice = attackHitBonusActionSpellChoice(
        attackHitWindow,
        ensnaringStrikeUnitId,
      );
      const save = requireHole(
        ensnaringChoice.initialHoles,
        "savingThrowOutcome",
      );
      const afterEnsnaring = resolveBattleInterrupt({
        state: attackHitWindow.state,
        fill: interruptDecisionFill(
          requireHole(attackHitWindow.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: casterId,
            choice: {
              kind: "castAttackHitBonusActionSpell",
              procedureRef: ensnaringChoice.subject.procedureRef,
              fills: [
                savingThrowOutcomeFill(save, [{ targetId, succeeded: false }]),
              ],
            },
          },
        ),
      });
      const afterEnsnaringDamage = requireNeedsHoles(afterEnsnaring);
      const weaponDamage = requireDamageRollHole(afterEnsnaringDamage);
      const afterWeaponDamage = resolveBattleSubject({
        state: afterEnsnaringDamage.state,
        subject: hit.subject,
        fills: [
          hit.targetFill,
          hit.attackFill,
          damageRollFillWithGroups(weaponDamage, [[3]]),
        ],
      });
      if (afterWeaponDamage.tag !== "resolved") {
        throw new Error("Expected Ensnaring Strike host attack to resolve.");
      }
      const restrainedBeforeEscape = ensnaringStrikeRestrainsTarget(
        afterWeaponDamage.state,
      );
      if (!restrainedBeforeEscape) {
        throw new Error("Expected Ensnaring Strike to restrain the target.");
      }

      const awaitingTurnStartDamage = requireNeedsHoles(
        endTurn({
          state: afterWeaponDamage.state,
          actorId: casterId,
        }),
      );
      const turnStartDamage = requireSpellTurnStartDamageRollHole(
        awaitingTurnStartDamage,
      );
      const targetTurn = endTurn({
        state: afterWeaponDamage.state,
        actorId: casterId,
        fills: [damageRollFillWithGroups(turnStartDamage, [[4]])],
      });
      if (targetTurn.tag !== "resolved") {
        throw new Error(
          "Expected Ensnaring Strike turn-start damage to resolve.",
        );
      }

      const escapeAct = spellRestraintEscapeAct(targetTurn.state);
      const escapeCheck = requireHole(escapeAct.initialHoles, "abilityCheck");
      const escaped = resolveBattleSubject({
        state: targetTurn.state,
        subject: escapeAct.subject,
        fills: [abilityCheckFill(escapeCheck, 13)],
      });
      recordRouteEvents(
        hit,
        afterEnsnaring,
        afterWeaponDamage,
        awaitingTurnStartDamage,
        targetTurn,
        escapeAct,
        escaped,
      );
      recordResolvedResult(escaped, "ensnaringStrike");
      ensnaringStrikeLifecycle = {
        ensnaringStrikeRestrainedBeforeEscape: restrainedBeforeEscape,
        ensnaringStrikeSaveSourceSpellId:
          ensnaringStrikeSaveSourceSpellId(save),
        ensnaringStrikeSaveAbility: save.ability === "str" ? "str" : "none",
        turnStartDamageSourceSpellId:
          ensnaringStrikeTurnStartDamageSourceSpellId(
            level1BuffMarkSmiteSessionAtState(awaitingTurnStartDamage.state),
            turnStartDamage,
          ),
        turnStartDamageDamageType:
          turnStartDamage.spellTurnStartDamage.damage.damageType === "piercing"
            ? "piercing"
            : "none",
        turnStartDamageDice:
          turnStartDamage.spellTurnStartDamage.damage.expr.dice,
        turnStartDamageDieSize:
          turnStartDamage.spellTurnStartDamage.damage.expr.dieSize,
        escapeCheckAbility: escapeCheck.ability === "str" ? "str" : "none",
        escapeCheckSkill:
          escapeCheck.skill === "athletics" ? "athletics" : "none",
      };
    },
    doFalseLifeTemporaryHitPoints: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(falseLifeUnitId)],
        sourceClassName: "wizard",
      });
      state = session.state;
      resetProcedureProjections();

      const act = publicActionSpellAct(session, falseLifeUnitId);
      const temporaryHitPointsRoll =
        requireScalarBuffTemporaryHitPointsRollHole(
          requireHole(act.initialHoles, "rolledDice"),
        );
      falseLifeTemporaryHitPoints = falseLifeTemporaryHitPointsProjection(
        temporaryHitPointsRoll,
      );
      const resolved = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageRollFillWithGroups(temporaryHitPointsRoll, [[4, 3]])],
      });
      recordRouteEvents(act, resolved);
      recordResolvedResult(resolved, "falseLife");
    },
    doHeroismFrightenedImmunityTurnStartTemporaryHitPoints: () => {
      resolveHeroismThroughCasterStartTurn();
    },
    doHeroismFrightenedImmunityTurnStartTemporaryHitPointsCleanup: () => {
      resolveHeroismThroughCasterStartTurn();
      const endConcentration = endConcentrationAct(state);
      const ended = resolveBattleSubject({
        state,
        subject: endConcentration.subject,
        fills: [],
      });
      recordRouteEvents(endConcentration, ended);
      recordResolvedResult(ended, "heroism");
      heroismEffects = heroismEffectsProjection(
        level1BuffMarkSmiteSessionAtState(state),
      );
    },
    doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(huntersMarkUnitId)],
        sourceClassName: "ranger",
        targetKind: "statBlock",
        includeMarkedDamageTransferTarget: true,
      });
      state = session.state;
      resetProcedureProjections();

      const castAct = publicBonusActionSpellAct(session, huntersMarkUnitId);
      const castTarget = requireHole(castAct.initialHoles, "targetChoice");
      const cast = resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [
          spellTargetFill(
            castTarget,
            castAct.subject.procedureRef,
            casterId,
            targetId,
          ),
        ],
      });
      if (cast.tag !== "resolved") {
        throw new Error(`Expected Hunter's Mark to resolve, got ${cast.tag}.`);
      }

      state = advanceMarkedDamageRoundToCasterTurn(cast.state);
      const hit = resolveLongswordHitWithAttackRoll({ state });
      const damage = requireDamageRollHole(
        requireNeedsHoles(hit.afterAttackRoll),
      );
      huntersMarkDamageHoleRider = spellMarkedDamageRider(
        level1BuffMarkSmiteSessionAtState(state),
        damage,
        huntersMarkUnitId,
      );
      const damaged = resolveBattleSubject({
        state,
        subject: hit.subject,
        fills: [
          hit.targetFill,
          hit.attackFill,
          damageRollFillWithGroups(damage, [[4], [5]]),
        ],
      });
      if (damaged.tag !== "resolved") {
        throw new Error(
          `Expected Hunter's Mark attack to resolve, got ${damaged.tag}.`,
        );
      }

      state = damaged.state;
      const markedTarget = state.combatants.get(targetId);
      if (markedTarget === undefined) {
        throw new Error("Expected Hunter's Mark target.");
      }
      state = applyBattleHitPointDamage({
        state,
        target: markedTarget,
        damageAmount: 1,
        deathFailuresAtZeroHp: 1,
        damageSourceId: casterId,
      });
      huntersMarkTransferVisibleOnDropTurn =
        markedDamageTransferActVisible(state);
      huntersMarkTransferKindOnDropTurn = huntersMarkActiveMarkTransferKind(
        huntersMarkActiveMarkEffect(state),
      );

      const transferAct = markedDamageTransferAct(state, huntersMarkUnitId);
      const transferTarget = requireHole(
        transferAct.initialHoles,
        "targetChoice",
      );
      const transferred = resolveBattleSubject({
        state,
        subject: transferAct.subject,
        fills: [
          spellTargetFill(
            transferTarget,
            transferAct.subject.procedureRef,
            casterId,
            markedDamageTransferTargetId,
          ),
        ],
      });
      recordRouteEvents(castAct, cast, hit, damaged, transferAct, transferred);
      recordResolvedResult(transferred, "huntersMark");
    },
    doHexMarkedDamageRiderAndLaterTurnTransfer: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(hexUnitId)],
        sourceClassName: "warlock",
        targetKind: "statBlock",
        includeMarkedDamageTransferTarget: true,
      });
      state = session.state;
      resetProcedureProjections();

      const castAct = publicBonusActionSpellAct(session, hexUnitId);
      const castTarget = requireHole(castAct.initialHoles, "targetChoice");
      const chosenAbility = requireHole(castAct.initialHoles, "abilityChoice");
      const cast = resolveBattleSubject({
        state,
        subject: castAct.subject,
        fills: [
          spellTargetFill(
            castTarget,
            castAct.subject.procedureRef,
            casterId,
            targetId,
          ),
          abilityChoiceFill(chosenAbility, "wis"),
        ],
      });
      if (cast.tag !== "resolved") {
        throw new Error(`Expected Hex to resolve, got ${cast.tag}.`);
      }

      state = advanceMarkedDamageRoundToCasterTurn(cast.state);
      const hit = resolveLongswordHitWithAttackRoll({ state });
      const damage = requireDamageRollHole(
        requireNeedsHoles(hit.afterAttackRoll),
      );
      hexDamageHoleRider = spellMarkedDamageRider(
        level1BuffMarkSmiteSessionAtState(state),
        damage,
        hexUnitId,
      );
      const damaged = resolveBattleSubject({
        state,
        subject: hit.subject,
        fills: [
          hit.targetFill,
          hit.attackFill,
          damageRollFillWithGroups(damage, [[4], [5]]),
        ],
      });
      if (damaged.tag !== "resolved") {
        throw new Error(`Expected Hex attack to resolve, got ${damaged.tag}.`);
      }

      state = advanceMarkedDamageRoundToCasterTurn(damaged.state);
      const cursedTarget = state.combatants.get(targetId);
      if (cursedTarget === undefined) {
        throw new Error("Expected Hex cursed target.");
      }
      state = applyBattleHitPointDamage({
        state,
        target: cursedTarget,
        damageAmount: 1,
        deathFailuresAtZeroHp: 1,
        damageSourceId: casterId,
      });
      hexTransferVisibleOnDropTurn = markedDamageTransferActVisible(state);
      hexTransferKindOnDropTurn = hexActiveMarkTransferKind(
        hexActiveMarkEffect(state),
      );

      state = advanceMarkedDamageRoundToCasterTurn(state);
      const transferAct = markedDamageTransferAct(state, hexUnitId);
      const transferTarget = requireHole(
        transferAct.initialHoles,
        "targetChoice",
      );
      const transferred = resolveBattleSubject({
        state,
        subject: transferAct.subject,
        fills: [
          spellTargetFill(
            transferTarget,
            transferAct.subject.procedureRef,
            casterId,
            markedDamageTransferTargetId,
          ),
        ],
      });
      recordRouteEvents(castAct, cast, hit, damaged, transferAct, transferred);
      recordResolvedResult(transferred, "hex");
      hexAfterCleanupAbilityRollMode = hexAbilityCheckRollModeFor(
        breakBattleConcentration(state, casterId),
        markedDamageTransferTargetId,
        "wis",
      );
    },
    doLongstriderSpeedIncrease: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(longstriderUnitId)],
        sourceClassName: "ranger",
      });
      state = session.state;
      resetProcedureProjections();

      const act = publicActionSpellAct(session, longstriderUnitId);
      const target = requireHole(act.initialHoles, "targetChoice");
      const resolved = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetFill(target, act.subject.procedureRef, casterId, targetId),
        ],
      });
      recordRouteEvents(act, resolved);
      recordResolvedResult(resolved, "longstrider");
    },
    doSearingSmiteAfterHitTimedDamageAndSaveCleanup: () => {
      session = level1BuffMarkSmiteSession({
        preparedSpells: [spellRecord(searingSmiteUnitId)],
      });
      state = session.state;
      resetProcedureProjections();

      const hit = resolveLongswordHitWithAttackRoll({ state });
      const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
      const searingSmiteChoice = attackHitBonusActionSpellChoice(
        attackHitWindow,
        searingSmiteUnitId,
      );
      const afterSearingSmite = resolveBattleInterrupt({
        state: attackHitWindow.state,
        fill: interruptDecisionFill(
          requireHole(attackHitWindow.holes, "interruptDecision"),
          {
            kind: "resolve",
            responderId: casterId,
            choice: {
              kind: "castAttackHitBonusActionSpell",
              procedureRef: searingSmiteChoice.subject.procedureRef,
              fills: [],
            },
          },
        ),
      });
      const afterSearingSmiteDamage = requireNeedsHoles(afterSearingSmite);
      const weaponDamage = requireDamageRollHole(afterSearingSmiteDamage);
      const immediateDamage = spellWeaponDamageRider(
        level1BuffMarkSmiteSessionAtState(afterSearingSmiteDamage.state),
        weaponDamage,
        searingSmiteUnitId,
      );
      const afterWeaponDamage = resolveBattleSubject({
        state: afterSearingSmiteDamage.state,
        subject: hit.subject,
        fills: [
          hit.targetFill,
          hit.attackFill,
          damageRollFillWithGroups(weaponDamage, [[4], [3]]),
        ],
      });
      if (afterWeaponDamage.tag !== "resolved") {
        throw new Error("Expected Searing Smite host attack to resolve.");
      }
      const activeBeforeSuccessfulSave =
        searingSmiteActiveEffect(afterWeaponDamage.state) !== undefined;

      const awaitingTurnStart = requireNeedsHoles(
        endTurn({
          state: afterWeaponDamage.state,
          actorId: casterId,
        }),
      );
      const turnStartDamage =
        requireSpellTurnStartDamageRollHole(awaitingTurnStart);
      const turnStartSave =
        requireSpellTurnStartSavingThrowOutcomeHole(awaitingTurnStart);
      const successfulSave = endTurn({
        state: afterWeaponDamage.state,
        actorId: casterId,
        fills: [
          damageRollFillWithGroups(turnStartDamage, [[4]]),
          savingThrowOutcomeFill(turnStartSave, [
            { targetId, succeeded: true },
          ]),
        ],
      });
      recordRouteEvents(
        hit,
        afterSearingSmite,
        afterWeaponDamage,
        awaitingTurnStart,
        successfulSave,
      );
      recordResolvedResult(successfulSave, "searingSmite");
      searingSmiteLifecycle = searingSmiteLifecycleProjection({
        immediateDamage,
        activeBeforeSuccessfulSave,
        turnStartDamage,
        turnStartSave,
        stateAfterSuccessfulSave: state,
      });
    },
    doShillelaghWeaponAttackOverride: () => {
      session = level1BuffMarkSmiteSession({
        cantrips: [spellRecord(shillelaghUnitId)],
        sourceClassName: "druid",
        attack: zeroAbilityWeaponAttack(shillelaghQuarterstaffUnitId),
      });
      state = session.state;
      resetProcedureProjections();

      const act = publicBonusActionSpellAct(session, shillelaghUnitId);
      const cast = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [],
      });
      if (cast.tag !== "resolved") {
        throw new Error(`Expected Shillelagh to resolve, got ${cast.tag}.`);
      }
      state = cast.state;

      const hit = resolveWeaponHitWithAttackRoll({
        state,
        weaponUnitId: shillelaghQuarterstaffUnitId,
      });
      const damage = requireDamageRollHole(
        requireNeedsHoles(hit.afterAttackRoll),
      );
      shillelaghWeaponAttackOverride = shillelaghWeaponAttackOverrideProjection(
        {
          session: level1BuffMarkSmiteSessionAtState(state),
          attackRoll: hit.attackRoll,
          damage,
        },
      );
      const resolved = resolveBattleSubject({
        state,
        subject: hit.subject,
        fills: [
          hit.targetFill,
          hit.attackFill,
          damageRollFillWithGroups(damage, [[4]]),
        ],
      });
      recordRouteEvents(act, cast, hit, resolved);
      recordResolvedResult(resolved, "shillelagh");
    },
    doTrueStrikeSpellHostedWeaponAttack: () => {
      session = level1BuffMarkSmiteSession({
        cantrips: [spellRecord(trueStrikeUnitId)],
        sourceClassName: "wizard",
        attack: zeroAbilityWeaponAttack(trueStrikeDaggerUnitId),
        weaponProficiencies: [{ kind: "weapon_category", category: "simple" }],
      });
      state = session.state;
      resetProcedureProjections();

      const act = publicActionSpellAct(session, trueStrikeUnitId);
      const damageType = requireHole(act.initialHoles, "damageTypeChoice");
      const target = requireHole(act.initialHoles, "targetChoice");
      const damageTypeFill = damageTypeChoiceFill(damageType, "radiant");
      const targetFill = attackTargetFill(target);
      const awaitingTargetChoice = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill],
      });
      const awaitingAttackRoll = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill, targetFill],
      });
      const attackRoll = requireBattleAttackRollHole(
        requireResultHole(awaitingAttackRoll, "attackRoll"),
      );
      const attackFill = attackRollFill(attackRoll, {
        total: 15,
        naturalD20: 10,
      });
      const awaitingDamage = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [damageTypeFill, targetFill, attackFill],
      });
      const damage = requireDamageRollHole(requireNeedsHoles(awaitingDamage));
      trueStrikeSpellHostedWeaponAttack =
        trueStrikeSpellHostedWeaponAttackProjection({
          session,
          state,
          act,
          attackRoll,
          damage,
        });
      const resolved = resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          damageTypeFill,
          targetFill,
          attackFill,
          damageRollFillWithGroups(damage, [[4]]),
        ],
      });
      recordRouteEvents(
        act,
        awaitingTargetChoice,
        awaitingAttackRoll,
        awaitingDamage,
        resolved,
      );
      recordResolvedResult(resolved, "trueStrike");
    },
    step: () => {},
    getRoute: () => route,
    getState: () =>
      projectLevel1BuffMarkSmiteSelectedIdentityState(
        level1BuffMarkSmiteSessionAtState(state),
        damageRider,
        projectedDamageRiderSourceSpellId,
        huntersMarkDamageHoleRider,
        huntersMarkTransferKindOnDropTurn,
        huntersMarkTransferVisibleOnDropTurn,
        hexDamageHoleRider,
        hexTransferKindOnDropTurn,
        hexTransferVisibleOnDropTurn,
        hexAfterCleanupAbilityRollMode,
        ensnaringStrikeLifecycle,
        falseLifeTemporaryHitPoints,
        heroismEffects,
        searingSmiteLifecycle,
        shillelaghWeaponAttackOverride,
        trueStrikeSpellHostedWeaponAttack,
        lastResult,
      ),
  };
}

function expectedProjection(
  overrides: Partial<Level1BuffMarkSmiteSelectedIdentityProjection> = {},
): Level1BuffMarkSmiteSelectedIdentityProjection {
  return {
    divineFavorActiveRiderCount: 0,
    targetHp: 12,
    longstriderTargetSpeedFeet: 30,
    longstriderSpeedEffectSourceSpellId: "none",
    longstriderSpeedEffectTarget: "none",
    longstriderSpeedDeltaFeet: 0,
    casterTempHp: 0,
    casterFrightened: false,
    spellSlotSpentThisTurn: false,
    level1SlotsRemaining: 2,
    damageRiderSourceSpellId: "none",
    damageRiderDamageType: "none",
    damageRiderDice: 0,
    damageRiderDieSize: 0,
    temporaryHitPointsSourceSpellId: "none",
    temporaryHitPointsDice: 0,
    temporaryHitPointsDieSize: 0,
    temporaryHitPointsFlat: 0,
    frightenedImmunitySourceSpellId: "none",
    frightenedImmunityCondition: "none",
    turnStartTemporaryHitPointsSourceSpellId: "none",
    turnStartTemporaryHitPointsAmount: 0,
    ensnaringStrikeRestrainedBeforeEscape: false,
    targetRestrained: false,
    casterConcentrating: false,
    ensnaringStrikeSaveSourceSpellId: "none",
    ensnaringStrikeSaveAbility: "none",
    turnStartDamageSourceSpellId: "none",
    turnStartDamageDamageType: "none",
    turnStartDamageDice: 0,
    turnStartDamageDieSize: 0,
    escapeCheckAbility: "none",
    escapeCheckSkill: "none",
    huntersMarkDamageHoleSourceSpellId: "none",
    huntersMarkDamageHoleDamageType: "none",
    huntersMarkDamageHoleDice: 0,
    huntersMarkDamageHoleDieSize: 0,
    huntersMarkActiveMarkSourceSpellId: "none",
    huntersMarkActiveMarkTarget: "none",
    huntersMarkConcentrationSourceSpellId: "none",
    huntersMarkTransferKindOnDropTurn: "none",
    huntersMarkActiveMarkTransferKind: "none",
    huntersMarkActiveMarkRetargetTiming: "none",
    huntersMarkTransferVisibleOnDropTurn: false,
    hexDamageHoleSourceSpellId: "none",
    hexDamageHoleDamageType: "none",
    hexDamageHoleDice: 0,
    hexDamageHoleDieSize: 0,
    hexActiveMarkSourceSpellId: "none",
    hexActiveMarkTarget: "none",
    hexAbilityCheckAbility: "none",
    hexMatchingTargetAbilityRollMode: "none",
    hexNonmatchingAbilityRollMode: "none",
    hexNonmarkedActorAbilityRollMode: "none",
    hexAfterCleanupAbilityRollMode: "none",
    hexTransferKindOnDropTurn: "none",
    hexActiveMarkTransferKind: "none",
    hexActiveMarkRetargetTiming: "none",
    hexTransferVisibleOnDropTurn: false,
    searingSmiteLifecycle: defaultSearingSmiteLifecycleProjection(),
    shillelaghWeaponAttackOverride:
      defaultShillelaghWeaponAttackOverrideProjection(),
    trueStrikeSpellHostedWeaponAttack:
      defaultTrueStrikeSpellHostedWeaponAttackProjection(),
    lastResult: "init",
    ...overrides,
  };
}

function defaultEnsnaringStrikeLifecycleProjection(): EnsnaringStrikeLifecycleProjection {
  return {
    ensnaringStrikeRestrainedBeforeEscape: false,
    ensnaringStrikeSaveSourceSpellId: "none",
    ensnaringStrikeSaveAbility: "none",
    turnStartDamageSourceSpellId: "none",
    turnStartDamageDamageType: "none",
    turnStartDamageDice: 0,
    turnStartDamageDieSize: 0,
    escapeCheckAbility: "none",
    escapeCheckSkill: "none",
  };
}

function defaultFalseLifeTemporaryHitPointsProjection(): FalseLifeTemporaryHitPointsProjection {
  return {
    temporaryHitPointsSourceSpellId: "none",
    temporaryHitPointsDice: 0,
    temporaryHitPointsDieSize: 0,
    temporaryHitPointsFlat: 0,
  };
}

function defaultHeroismEffectsProjection(): HeroismEffectsProjection {
  return {
    frightenedImmunitySourceSpellId: "none",
    frightenedImmunityCondition: "none",
    turnStartTemporaryHitPointsSourceSpellId: "none",
    turnStartTemporaryHitPointsAmount: 0,
  };
}

function defaultSearingSmiteLifecycleProjection(): SearingSmiteLifecycleProjection {
  return { tag: "none" };
}

function defaultShillelaghWeaponAttackOverrideProjection(): ShillelaghWeaponAttackOverrideProjection {
  return { tag: "none" };
}

function defaultTrueStrikeSpellHostedWeaponAttackProjection(): TrueStrikeSpellHostedWeaponAttackProjection {
  return { tag: "none" };
}

type Level1BuffMarkSmiteBattleInput = {
  readonly cantrips?: readonly SpellRecord[];
  readonly preparedSpells?: readonly SpellRecord[];
  readonly sourceClassName?: CharacterClassName;
  readonly weaponProficiencies?: readonly WeaponProficiency[];
  readonly attack?: NonNullable<
    Extract<
      BattleCreatureInit["creatureInit"],
      { readonly kind: "character" }
    >["attack"]
  >;
  readonly targetKind?: "character" | "statBlock";
  readonly includeMarkedDamageTransferTarget?: boolean;
};

function level1BuffMarkSmiteSession(
  input: Level1BuffMarkSmiteBattleInput = {},
): BattleRuntimeSession {
  const sourceClassName = input.sourceClassName ?? "paladin";
  const target =
    input.targetKind === "statBlock"
      ? level1BuffMarkSmiteStatBlockCreature({
          combatantId: targetId,
          displayName: "Level 1 buff target",
          initiative: 10,
        })
      : level1BuffMarkSmiteCreature({
          combatantId: targetId,
          displayName: "Level 1 buff target",
          initiative: 10,
          className: "fighter",
        });
  const result = startBattle({
    battleId: battleId("level1-buff-mark-smite-selected-identity"),
    combatants: [
      level1BuffMarkSmiteCreature({
        combatantId: casterId,
        displayName: "Level 1 buff caster",
        initiative: 20,
        attack: input.attack ?? zeroAbilityLongswordAttack(),
        className: sourceClassName,
        ...(input.weaponProficiencies === undefined
          ? {}
          : { weaponProficiencies: input.weaponProficiencies }),
        spellcasting: {
          spellcastingSource: {
            tag: "classSpellcasting",
            className: sourceClassName,
            abilityModifier: abilityModifier(3),
          },
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
          spellAccesses: [],
          invocationSpellAccesses: [],
          spellbookRitualSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
      }),
      target,
      ...(input.includeMarkedDamageTransferTarget === true
        ? [
            level1BuffMarkSmiteStatBlockCreature({
              combatantId: markedDamageTransferTargetId,
              displayName: "Level 1 buff marked damage transfer target",
              initiative: 5,
            }),
          ]
        : []),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(battleStateInitIssueMessage(result.left));
  }
  return result.right;
}

function level1BuffMarkSmiteCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly className?: CharacterClassName;
  readonly weaponProficiencies?: readonly WeaponProficiency[];
  readonly attack?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"];
  readonly spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"];
}): BattleCreatureInit {
  const attack = input.attack ?? null;
  const className = input.className ?? "paladin";
  const weaponUnit =
    attack === null
      ? null
      : unitLibrary.requireUnit(attack.weapon.weaponUnitId);
  if (weaponUnit !== null && weaponUnit.kind !== "weapon") {
    throw new Error(
      `Expected ${attack?.weapon.weaponUnitId ?? "missing"} Unit to be a weapon.`,
    );
  }
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs:
        weaponUnit === null ? [] : [{ unit: weaponUnit, supportProfiles: [] }],
      classLevels: [{ className, level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      ...(input.weaponProficiencies === undefined
        ? {}
        : { weaponProficiencies: input.weaponProficiencies }),
      armorClass:
        attack === null
          ? defaultArmorClassState()
          : { ...defaultArmorClassState(), rightHandUse: "mainWeapon" },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      ammunitionStocks: [],
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: battleObjectId(`main:${attack.weapon.weaponUnitId}`),
                unitId: attack.weapon.weaponUnitId,
                grip: "one_handed" as const,
              },
            },
      attack,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(input.spellcasting === undefined
        ? {}
        : { spellcasting: input.spellcasting }),
    },
  };
}

function level1BuffMarkSmiteStatBlockCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
}): BattleCreatureInit {
  const statBlock = statBlockLibrary.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  const maxHp = statBlockHp(statBlock);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      source: Either.getOrThrow(battleStatBlockCombatantSource(statBlock)),
      currentHp: maxHp,
      tempHp: Hp(0),
      ammunitionStocks: [{ ammunition: "arrow", remaining: resourceCount(20) }],
      conditions: [],
    },
  };
}

function statBlockHp(statBlock: StatBlockRecord): Hp {
  const hp = statBlock.statBlock.hp;
  if (typeof hp === "number") {
    return Hp(hp);
  }
  if (hp.kind === "literal") {
    return Hp(hp.value);
  }
  throw new Error("Expected literal Stat Block Hit Points.");
}

function spellRecord(spellId: Level1BuffMarkSmiteSpellId): SpellRecord {
  const unit = unitLibrary.requireUnit(spellId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${spellId} to be a Spell.`);
  }
  return unit;
}

function publicBonusActionSpellAct(
  session: BattleRuntimeSession,
  spellId: BonusActionCastSpellId,
): PublicBonusActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is PublicBonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      characterSpellProcedureRefMatchesSpellForTest(
        session,
        candidate.subject.actorId,
        candidate.subject.procedureRef,
        spellId,
      ),
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action Spell act.`);
  }
  return act;
}

function publicActionSpellAct(
  session: BattleRuntimeSession,
  spellId: ActionCastSpellId,
): PublicActionSpellAct {
  const act = discoverBattleActs(session).find(
    (candidate): candidate is PublicActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      characterSpellProcedureRefMatchesSpellForTest(
        session,
        candidate.subject.actorId,
        candidate.subject.procedureRef,
        spellId,
      ),
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Action Spell act.`);
  }
  return act;
}

function resolveLongswordHit(input: {
  readonly session: BattleRuntimeSession;
}): {
  readonly damageRider: NonNullable<
    BattleDamageRollHole["spellWeaponDamageRiders"]
  >[number];
  readonly result: BattleResolutionResult;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const hit = resolveLongswordHitWithAttackRoll({ state: input.session.state });
  const damage = requireDamageRollHole(requireNeedsHoles(hit.afterAttackRoll));
  const damageRider = spellWeaponDamageRider(
    input.session,
    damage,
    divineFavorUnitId,
  );
  const result = resolveBattleSubject({
    state: input.session.state,
    subject: hit.subject,
    fills: [
      hit.targetFill,
      hit.attackFill,
      damageRollFillWithGroups(damage, [[4], [3]]),
    ],
  });
  return {
    damageRider,
    result,
    routeEvents: [...hit.routeEvents, ...(result.routeEvents ?? [])],
  };
}

function resolveLongswordHitWithAttackRoll(input: {
  readonly state: BattleState;
}): ReturnType<typeof resolveWeaponHitWithAttackRoll> {
  return resolveWeaponHitWithAttackRoll({
    state: input.state,
    weaponUnitId: "weapon_longsword",
  });
}

type Level1WeaponUnitId =
  | "weapon_longsword"
  | TrueStrikeDaggerUnitId
  | ShillelaghQuarterstaffUnitId;

function resolveWeaponHitWithAttackRoll(input: {
  readonly state: BattleState;
  readonly weaponUnitId: Level1WeaponUnitId;
}): {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
  readonly targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
  readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
  readonly attackRoll: BattleAttackRollHole;
  readonly afterAttackRoll: BattleResolutionResult;
  readonly routeEvents: readonly BattleReducerRouteEvent[];
} {
  const act = weaponAttackAct(input.state, input.weaponUnitId);
  const subject = act.subject;
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetFill = attackTargetFill(target);
  const awaitingAttackRoll = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [targetFill],
  });
  const attack = requireBattleAttackRollHole(
    requireResultHole(awaitingAttackRoll, "attackRoll"),
  );
  const attackFill = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  const afterAttackRoll = resolveBattleSubject({
    state: input.state,
    subject,
    fills: [targetFill, attackFill],
  });
  return {
    subject,
    targetFill,
    attackFill,
    attackRoll: attack,
    afterAttackRoll,
    routeEvents: [
      ...(act.routeEvents ?? []),
      ...(awaitingAttackRoll.routeEvents ?? []),
      ...(afterAttackRoll.routeEvents ?? []),
    ],
  };
}

function zeroAbilityLongswordAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  return zeroAbilityWeaponAttack("weapon_longsword");
}

function zeroAbilityWeaponAttack(
  unitId:
    | "weapon_longsword"
    | ShillelaghQuarterstaffUnitId
    | TrueStrikeDaggerUnitId,
): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit(unitId);
  if (weapon.kind !== "weapon") {
    throw new Error(`Expected ${unitId} Unit to be a weapon.`);
  }
  return {
    kind: "weapon",
    ...admitCharacterWeaponAttackExecutionWeapon(
      weapon,
      battleObjectId(`main:${weapon.id}`),
      [],
    ),
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

function weaponAttackAct(
  state: BattleState,
  weaponUnitId: Level1WeaponUnitId,
): ReturnType<typeof discoverBattleActCandidates>[number] & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
} {
  const act = discoverBattleActCandidates(state).find((candidate) => {
    if (
      candidate.subject.tag !== "action" ||
      candidate.subject.action !== "attack"
    ) {
      return false;
    }
    const attack = attackActionOptionForSubject(state, candidate.subject);
    return (
      attack !== undefined && attackActionOptionName(attack) === weaponUnitId
    );
  });
  if (
    act === undefined ||
    act.subject.tag !== "action" ||
    act.subject.action !== "attack"
  ) {
    throw new Error(
      `Expected discovered ${weaponUnitId} attack for ${casterId}.`,
    );
  }
  return { ...act, subject: act.subject };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.attack === undefined) {
    throw new Error("Expected bound level-1 weapon attack selection.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetDistance",
        actorId: casterId,
        targetId,
        distanceFeet: movementFeet(5),
        ...hole.attack.selection,
      },
    ],
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  sourceProcedureRef: BattleProcedureExecutionRef,
  casterId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId,
        targetId,
        sourceProcedureRef,
      },
    ],
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
    },
  };
}

function damageRollFillWithGroups(
  hole: Pick<BattleHole, "kind" | "holeId">,
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill {
  if (hole.kind !== "rolledDice") {
    throw new Error("Expected rolledDice hole.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): BattleRolledDiceFill["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled dice group.");
  }
  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): BattleRolledDiceFill["value"][number] {
  const [firstRoll, ...restRolls] = group;
  if (firstRoll === undefined) {
    throw new Error("Expected at least one die result.");
  }
  return {
    results: [DieRollResult(firstRoll), ...restRolls.map(DieRollResult)],
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return { kind: "interruptDecision", holeId: hole.holeId, value };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: { outcomes },
  };
}

function abilityChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "abilityChoice" }>,
  value: Exclude<HexAbilityCheckAbility, "none">,
): Extract<BattleFill, { readonly kind: "abilityChoice" }> {
  return { kind: "abilityChoice", holeId: hole.holeId, value };
}

function abilityCheckFill(
  hole: Extract<BattleHole, { readonly kind: "abilityCheck" }>,
  total: number,
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  return {
    kind: "abilityCheck",
    holeId: hole.holeId,
    value: { total },
  };
}

function spellWeaponDamageRider(
  session: BattleRuntimeSession,
  hole: BattleDamageRollHole,
  spellId: SpellWeaponDamageRiderSourceSpellId,
): NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number] {
  const rider = hole.spellWeaponDamageRiders?.find((candidate) =>
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      candidate.sourceCombatantId,
      candidate.sourceProcedureRef,
      spellId,
    ),
  );
  if (rider === undefined) {
    throw new Error(`Expected ${spellId} spell weapon damage rider.`);
  }
  return rider;
}

function spellMarkedDamageRider(
  session: BattleRuntimeSession,
  hole: BattleDamageRollHole,
  spellId: MarkedDamageRiderSourceSpellId,
): NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number] {
  const rider = hole.spellMarkedDamageRiders?.find((candidate) =>
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      candidate.sourceCombatantId,
      candidate.sourceProcedureRef,
      spellId,
    ),
  );
  if (rider === undefined) {
    throw new Error(`Expected ${spellId} spell marked damage rider.`);
  }
  return rider;
}

function requireScalarBuffTemporaryHitPointsRollHole(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): ScalarBuffTemporaryHitPointsRollHole {
  if (!isScalarBuffTemporaryHitPointsRollHole(hole)) {
    throw new Error("Expected scalar buff Temporary Hit Points roll hole.");
  }
  return hole;
}

function isScalarBuffTemporaryHitPointsRollHole(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): hole is ScalarBuffTemporaryHitPointsRollHole {
  return !("critical" in hole) && !("spell" in hole);
}

function requireResultHole<K extends BattleHole["kind"]>(
  result: BattleResolutionResult,
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  return requireHole(requireNeedsHoles(result).holes, kind);
}

function requireNeedsHoles(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected needsHoles result, got ${result.tag}.`);
  }
  return result;
}

function requireBattleAttackRollHole(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): BattleAttackRollHole {
  if (!("attack" in hole)) {
    throw new Error("Expected weapon attack roll hole.");
  }
  return hole;
}

function requireDamageRollHole(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): BattleDamageRollHole {
  const hole = requireHole(result.holes, "rolledDice");
  if (!("attack" in hole)) {
    throw new Error("Expected attack damage roll hole.");
  }
  return hole;
}

function requireSpellTurnStartDamageRollHole(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): BattleSpellTurnStartDamageRollHole {
  const hole = requireHole(result.holes, "rolledDice");
  if (!("spellTurnStartDamage" in hole)) {
    throw new Error("Expected spell turn-start damage roll hole.");
  }
  return hole;
}

function requireSpellTurnStartSavingThrowOutcomeHole(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
): BattleSpellTurnStartSavingThrowOutcomeHole {
  const hole = requireHole(result.holes, "savingThrowOutcome");
  if (!("spellTurnStartSave" in hole)) {
    throw new Error("Expected spell turn-start Saving Throw outcome hole.");
  }
  return hole;
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function requireAttackHitWindow(
  result: BattleResolutionResult,
): Extract<BattleResolutionResult, { readonly tag: "needsHoles" }> {
  if (
    result.tag !== "needsHoles" ||
    battleFrontierInterruptDecisionForState(result.state)?.trigger !==
      "attackHit"
  ) {
    throw new Error("Expected attack-hit reaction window.");
  }
  return result;
}

function advanceMarkedDamageRoundToCasterTurn(state: BattleState): BattleState {
  const targetTurn = requireResolvedResult(
    endTurn({ state, actorId: casterId }),
    "Expected marked damage rider caster turn to end.",
  ).state;
  const transferTargetTurn = requireResolvedResult(
    endTurn({ state: targetTurn, actorId: targetId }),
    "Expected marked damage rider target turn to end.",
  ).state;
  return requireResolvedResult(
    endTurn({
      state: transferTargetTurn,
      actorId: markedDamageTransferTargetId,
    }),
    "Expected marked damage transfer target turn to end.",
  ).state;
}

function requireResolvedResult(
  result: BattleResolutionResult,
  message: string,
): Extract<BattleResolutionResult, { readonly tag: "resolved" }> {
  if (result.tag !== "resolved") {
    const detail =
      result.tag === "invalid"
        ? ` ${result.reason}: ${result.message}`
        : ` holes=${result.holes.map((hole) => `${hole.kind}:${hole.label}`).join(", ")}`;
    throw new Error(`${message} Got ${result.tag}.${detail}`);
  }
  return result;
}

function markedDamageTransferActVisible(state: BattleState): boolean {
  return discoverBattleActCandidates(state).some((candidate) =>
    isMarkedDamageTransferAct(candidate),
  );
}

function markedDamageTransferAct(
  state: BattleState,
  spellId: MarkedDamageRiderSourceSpellId,
): MechanicalBonusActionSpellAct {
  const act = discoverBattleActCandidates(state).find((candidate) =>
    isMarkedDamageTransferAct(candidate),
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} marked damage transfer act.`);
  }
  return act;
}

function isMarkedDamageTransferAct(
  candidate: ReturnType<typeof discoverBattleActCandidates>[number],
): candidate is MechanicalBonusActionSpellAct {
  return candidate.subject.tag === "bonusActionSpell";
}

function attackHitBonusActionSpellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  spellId: AttackHitBonusActionSpellId,
): Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "castAttackHitBonusActionSpell" }
> {
  const choice = battleFrontierInterruptDecisionForState(
    result.state,
  )?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleInterruptProcedureChoice,
      { readonly kind: "castAttackHitBonusActionSpell" }
    > => {
      if (
        candidate.kind !== "castAttackHitBonusActionSpell" ||
        candidate.reactorId !== casterId
      )
        return false;
      return true;
    },
  );
  if (choice === undefined) {
    throw new Error(`Expected ${spellId} after-hit Bonus Action Spell choice.`);
  }
  return choice;
}

function spellRestraintEscapeAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
  >;
} {
  const act = discoverBattleActCandidates(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "action"; readonly action: "escapeSpellRestraint" }
      >;
    } =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "escapeSpellRestraint" &&
      candidate.subject.actorId === targetId &&
      candidate.subject.targetId === targetId,
  );
  if (act === undefined) {
    throw new Error("Expected Ensnaring Strike spell restraint escape act.");
  }
  return act;
}

function endConcentrationAct(state: BattleState): AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
  >;
} {
  const act = discoverBattleActCandidates(state).find(
    (
      candidate,
    ): candidate is AvailableBattleAct & {
      readonly subject: Extract<
        BattleSubject,
        { readonly tag: "runtimeCommand"; readonly command: "endConcentration" }
      >;
    } =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "endConcentration" &&
      candidate.subject.actorId === casterId,
  );
  if (act === undefined) {
    throw new Error("Expected public Heroism End Concentration act.");
  }
  return act;
}

function ensnaringStrikeRestrainsTarget(state: BattleState): boolean {
  const target = state.combatants.get(targetId);
  return (
    target !== undefined &&
    snapshotHasCondition(
      snapshotBattle(state).combatants.find(
        (combatant) => combatant.combatantId === targetId,
      )?.conditions ?? [],
      "restrained",
    ) &&
    target.activeEffects.some(
      (effect) =>
        effect.kind === "spellCondition" &&
        effect.sourceCombatantId === casterId &&
        effect.condition === "restrained" &&
        effect.turnStartDamage?.damageType === "piercing" &&
        effect.turnStartDamage.expr.dice === 1 &&
        effect.turnStartDamage.expr.dieSize === 6,
    )
  );
}

function ensnaringStrikeSaveSourceSpellId(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): EnsnaringStrikeSourceSpellId {
  return "spell" in hole ? "none" : ensnaringStrikeUnitId;
}

function ensnaringStrikeTurnStartDamageSourceSpellId(
  session: BattleRuntimeSession,
  hole: BattleSpellTurnStartDamageRollHole,
): EnsnaringStrikeSourceSpellId {
  if (hole.spellTurnStartDamage.sourceProcedureRef === undefined) return "none";
  return characterSpellProcedureRefMatchesSpellForTest(
    session,
    hole.spellTurnStartDamage.sourceCombatantId,
    hole.spellTurnStartDamage.sourceProcedureRef,
    ensnaringStrikeUnitId,
  )
    ? ensnaringStrikeUnitId
    : "none";
}

function searingSmiteActiveEffect(
  state: BattleState,
): SearingSmiteTurnStartDamageAndSaveEffect | undefined {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected Searing Smite target.");
  }
  return target.activeEffects.find(
    (effect): effect is SearingSmiteTurnStartDamageAndSaveEffect =>
      effect.kind === "spellTurnStartDamageAndSave" &&
      effect.sourceCombatantId === casterId,
  );
}

function searingSmiteLifecycleProjection(input: {
  readonly immediateDamage: NonNullable<
    BattleDamageRollHole["spellWeaponDamageRiders"]
  >[number];
  readonly activeBeforeSuccessfulSave: boolean;
  readonly turnStartDamage: BattleSpellTurnStartDamageRollHole;
  readonly turnStartSave: BattleSpellTurnStartSavingThrowOutcomeHole;
  readonly stateAfterSuccessfulSave: BattleState;
}): SearingSmiteLifecycleProjection {
  if (!input.activeBeforeSuccessfulSave) {
    throw new Error("Expected Searing Smite timed damage to be active.");
  }
  if (searingSmiteActiveEffect(input.stateAfterSuccessfulSave) !== undefined) {
    throw new Error(
      "Expected Searing Smite successful save to remove timed damage.",
    );
  }
  return {
    tag: "afterHitTimedDamageAndSaveCleanup",
    immediateDamage: searingSmiteDamageProjectionFromRider(
      input.immediateDamage,
    ),
    activeBeforeSuccessfulSave: true,
    turnStartDamage: searingSmiteTurnStartDamageProjection(
      input.turnStartDamage,
    ),
    turnStartSave: searingSmiteTurnStartSaveProjection(input.turnStartSave),
    activeAfterSuccessfulSave: false,
  };
}

function searingSmiteDamageProjectionFromRider(
  rider: NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number],
): SearingSmiteDamageProjection {
  return searingSmiteDamageProjection({
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(rider.sourceProcedureRef),
    ),
    damageType: rider.damage.damageType,
    dice: rider.damage.expr.dice,
    dieSize: rider.damage.expr.dieSize,
  });
}

function searingSmiteTurnStartDamageProjection(
  hole: BattleSpellTurnStartDamageRollHole,
): SearingSmiteDamageProjection {
  return searingSmiteDamageProjection({
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(hole.spellTurnStartDamage.sourceProcedureRef),
    ),
    damageType: hole.spellTurnStartDamage.damage.damageType,
    dice: hole.spellTurnStartDamage.damage.expr.dice,
    dieSize: hole.spellTurnStartDamage.damage.expr.dieSize,
  });
}

function searingSmiteDamageProjection(input: {
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly damageType: string;
  readonly dice: number;
  readonly dieSize: number;
}): SearingSmiteDamageProjection {
  if (
    input.sourceProcedureRef !==
    battleProcedureExecutionRefForTest(String(searingSmiteUnitId))
  ) {
    throw new Error(
      `Unexpected Searing Smite source spell id ${input.sourceProcedureRef}.`,
    );
  }
  if (input.damageType !== "fire") {
    throw new Error(
      `Unexpected Searing Smite damage type ${input.damageType}.`,
    );
  }
  return {
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(searingSmiteUnitId),
    ),
    damageType: "fire",
    dice: input.dice,
    dieSize: input.dieSize,
  };
}

function searingSmiteTurnStartSaveProjection(
  hole: BattleSpellTurnStartSavingThrowOutcomeHole,
): SearingSmiteTurnStartSaveProjection {
  const save = hole.spellTurnStartSave.save;
  if (
    hole.spellTurnStartSave.sourceProcedureRef !==
    battleProcedureExecutionRefForTest(String(searingSmiteUnitId))
  ) {
    throw new Error(
      `Unexpected Searing Smite source spell id ${hole.spellTurnStartSave.sourceProcedureRef}.`,
    );
  }
  if (save.ability !== "con") {
    throw new Error(`Unexpected Searing Smite save ability ${save.ability}.`);
  }
  if (save.successEnds !== "spell") {
    throw new Error(
      `Unexpected Searing Smite save success end ${save.successEnds}.`,
    );
  }
  return {
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(searingSmiteUnitId),
    ),
    ability: "con",
    successEnds: "spell",
  };
}

function shillelaghWeaponAttackOverrideProjection(input: {
  readonly session: BattleRuntimeSession;
  readonly attackRoll: BattleAttackRollHole;
  readonly damage: BattleDamageRollHole;
}): ShillelaghWeaponAttackOverrideProjection {
  const effect = shillelaghWeaponAttackOverrideEffect(input.session.state);
  if (effect === undefined) {
    throw new Error("Expected Shillelagh weapon attack override effect.");
  }
  const sourceSpellId = characterSpellInvocationRefForProcedureRefForTest(
    input.session,
    casterId,
    effect.sourceProcedureRef,
  ).spellId;
  if (sourceSpellId !== shillelaghUnitId) {
    throw new Error(`Unexpected Shillelagh source spell ${sourceSpellId}.`);
  }
  return {
    tag: "quarterstaffForceAttack",
    sourceSpellId: shillelaghUnitId,
    weaponUnitId: shillelaghEffectWeaponUnitId(input.session.state, effect),
    spellcastingAbilityModifier: Number(effect.spellcastingAbilityModifier),
    effectAttackBonus: Number(effect.attackBonus),
    effectDamageDice: effect.damage.expr.dice,
    effectDamageDieSize: effect.damage.expr.dieSize,
    ...shillelaghForceAttackProjection(input.attackRoll, input.damage),
  };
}

function shillelaghWeaponAttackOverrideEffect(
  state: BattleState,
): ShillelaghWeaponAttackOverrideEffect | undefined {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Shillelagh caster.");
  }
  return caster.activeEffects.find(
    (effect): effect is ShillelaghWeaponAttackOverrideEffect =>
      effect.kind === "spellWeaponAttackOverride" &&
      effect.sourceCombatantId === casterId,
  );
}

function shillelaghEffectWeaponUnitId(
  state: BattleState,
  effect: ShillelaghWeaponAttackOverrideEffect,
): ShillelaghQuarterstaffUnitId {
  const selectedWeaponUnitId = selectedLoadoutWeaponUnitIdForItem({
    state,
    itemId: effect.weaponItemId,
    sourceName: "Shillelagh",
  });
  if (selectedWeaponUnitId === shillelaghQuarterstaffUnitId) {
    return shillelaghQuarterstaffUnitId;
  }
  throw new Error(
    `Unexpected Shillelagh weapon Unit id ${selectedWeaponUnitId}.`,
  );
}

function shillelaghForceAttackProjection(
  attackRoll: BattleAttackRollHole,
  damage: BattleDamageRollHole,
): Pick<
  Extract<
    ShillelaghWeaponAttackOverrideProjection,
    { readonly tag: "quarterstaffForceAttack" }
  >,
  | "attackName"
  | "attackBonus"
  | "damageType"
  | "damageDice"
  | "damageDieSize"
  | "damageModifier"
> {
  if (attackRoll.attack.kind !== "weapon" || damage.attack.kind !== "weapon") {
    throw new Error("Expected Shillelagh weapon attack projection.");
  }
  const weaponUnitId = attackRoll.attack.weapon.weaponUnitId;
  if (weaponUnitId !== "weapon_quarterstaff") {
    throw new Error(`Unexpected Shillelagh weapon ${weaponUnitId}.`);
  }
  if (damage.attack.weapon.weaponUnitId !== weaponUnitId) {
    throw new Error(
      `Expected Shillelagh damage weapon ${damage.attack.weapon.weaponUnitId} to match ${weaponUnitId}.`,
    );
  }
  const weaponDamage = damage.attack.weapon.damage;
  if (weaponDamage.kind !== "dice") {
    throw new Error("Expected Shillelagh dice weapon damage.");
  }
  if (weaponDamage.damageType !== "force") {
    throw new Error(
      `Unexpected Shillelagh damage type ${weaponDamage.damageType}.`,
    );
  }
  return {
    attackName: shillelaghQuarterstaffForceAttackName,
    attackBonus: Number(attackRoll.attackBonus),
    damageType: "force",
    damageDice: weaponDamage.dice,
    damageDieSize: weaponDamage.dieSize,
    damageModifier: Number(
      damage.attack.damageAbilityModifier ?? damage.attack.abilityModifier,
    ),
  };
}

function trueStrikeSpellHostedWeaponAttackProjection(input: {
  readonly session: BattleRuntimeSession;
  readonly state: BattleState;
  readonly act: PublicActionSpellAct;
  readonly attackRoll: BattleAttackRollHole;
  readonly damage: BattleDamageRollHole;
}): TrueStrikeSpellHostedWeaponAttackProjection {
  const sourceSpellId = characterSpellInvocationRefForProcedureRefForTest(
    input.session,
    input.act.subject.actorId,
    input.act.subject.procedureRef,
  ).spellId;
  if (sourceSpellId !== trueStrikeUnitId) {
    throw new Error(`Unexpected True Strike source spell ${sourceSpellId}.`);
  }
  return {
    tag: "materialDaggerRadiantAttack",
    sourceSpellId: trueStrikeUnitId,
    componentWeaponObjectId: trueStrikeComponentWeaponObjectId(
      input.state,
      input.act,
    ),
    weaponUnitId: trueStrikeWeaponUnitId(input.state),
    ...trueStrikeRadiantAttackProjection(input.attackRoll, input.damage),
  };
}

function trueStrikeComponentWeaponObjectId(
  state: BattleState,
  act: PublicActionSpellAct,
): TrueStrikeDaggerObjectId {
  const actor = state.combatants.get(act.subject.actorId);
  const binding =
    actor?.origin.kind === "character"
      ? actor.origin.execution.procedureBindings.find(
          (candidate) => candidate.procedureRef === act.subject.procedureRef,
        )
      : undefined;
  const componentWeaponObjectId =
    binding?.procedure.kind === "spellInvocation" &&
    binding.procedure.execution.procedure === "spellHostedWeaponAttack"
      ? binding.procedure.execution.componentWeaponObjectId
      : undefined;
  if (componentWeaponObjectId === trueStrikeDaggerObjectId) {
    return trueStrikeDaggerObjectId;
  }
  throw new Error(
    `Unexpected True Strike component weapon object ${componentWeaponObjectId}.`,
  );
}

function trueStrikeWeaponUnitId(state: BattleState): TrueStrikeDaggerUnitId {
  const selectedWeaponUnitId = selectedLoadoutWeaponUnitIdForItem({
    state,
    itemId: trueStrikeDaggerItemId,
    sourceName: "True Strike",
  });
  if (selectedWeaponUnitId === trueStrikeDaggerUnitId) {
    return trueStrikeDaggerUnitId;
  }
  throw new Error(
    `Unexpected True Strike weapon Unit id ${selectedWeaponUnitId}.`,
  );
}

function trueStrikeRadiantAttackProjection(
  attackRoll: BattleAttackRollHole,
  damage: BattleDamageRollHole,
): Pick<
  Extract<
    TrueStrikeSpellHostedWeaponAttackProjection,
    { readonly tag: "materialDaggerRadiantAttack" }
  >,
  | "attackName"
  | "attackBonus"
  | "damageType"
  | "damageDice"
  | "damageDieSize"
  | "damageModifier"
> {
  if (attackRoll.attack.kind !== "weapon" || damage.attack.kind !== "weapon") {
    throw new Error("Expected True Strike weapon attack projection.");
  }
  const weaponUnitId = attackRoll.attack.weapon.weaponUnitId;
  if (weaponUnitId !== "weapon_dagger") {
    throw new Error(`Unexpected True Strike weapon ${weaponUnitId}.`);
  }
  if (damage.attack.weapon.weaponUnitId !== weaponUnitId) {
    throw new Error(
      `Expected True Strike damage weapon ${damage.attack.weapon.weaponUnitId} to match ${weaponUnitId}.`,
    );
  }
  const weaponDamage = damage.attack.weapon.damage;
  if (weaponDamage.kind !== "dice") {
    throw new Error("Expected True Strike dice weapon damage.");
  }
  if (weaponDamage.damageType !== "radiant") {
    throw new Error(
      `Unexpected True Strike damage type ${weaponDamage.damageType}.`,
    );
  }
  return {
    attackName: trueStrikeDaggerAttackName,
    attackBonus: Number(attackRoll.attackBonus),
    damageType: "radiant",
    damageDice: weaponDamage.dice,
    damageDieSize: weaponDamage.dieSize,
    damageModifier: Number(
      damage.attack.damageAbilityModifier ?? damage.attack.abilityModifier,
    ),
  };
}

function selectedLoadoutWeaponUnitIdForItem(input: {
  readonly state: BattleState;
  readonly itemId: string;
  readonly sourceName: "Shillelagh" | "True Strike";
}): string {
  const caster = input.state.combatants.get(casterId);
  if (caster?.origin.kind !== "character") {
    throw new Error(`Expected ${input.sourceName} character caster.`);
  }
  const selectedWeapon = [
    caster.origin.selectedLoadout.weapon,
    caster.origin.selectedLoadout.offHandWeapon,
  ].find((candidate) => candidate?.itemId === input.itemId);
  if (selectedWeapon === undefined) {
    throw new Error(
      `Expected ${input.sourceName} selected weapon item ${input.itemId}.`,
    );
  }
  return selectedWeapon.unitId;
}

function projectLevel1BuffMarkSmiteSelectedIdentityState(
  session: BattleRuntimeSession,
  damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined,
  projectedDamageRiderSourceSpellId: DamageRiderSourceSpellId,
  huntersMarkDamageHoleRider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined,
  huntersMarkTransferKindOnDropTurn: HuntersMarkTransferKind,
  huntersMarkTransferVisibleOnDropTurn: boolean,
  hexDamageHoleRider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined,
  hexTransferKindOnDropTurn: HexTransferKind,
  hexTransferVisibleOnDropTurn: boolean,
  hexAfterCleanupAbilityRollMode: HexAbilityCheckRollMode,
  ensnaringStrikeLifecycle: EnsnaringStrikeLifecycleProjection,
  falseLifeTemporaryHitPoints: FalseLifeTemporaryHitPointsProjection,
  heroismEffects: HeroismEffectsProjection,
  searingSmiteLifecycle: SearingSmiteLifecycleProjection,
  shillelaghWeaponAttackOverride: ShillelaghWeaponAttackOverrideProjection,
  trueStrikeSpellHostedWeaponAttack: TrueStrikeSpellHostedWeaponAttackProjection,
  lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"],
): Level1BuffMarkSmiteSelectedIdentityProjection {
  const state = session.state;
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === targetId,
  );
  if (target === undefined) {
    throw new Error("Expected Level 1 buff mark smite target.");
  }
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === casterId,
  );
  if (caster === undefined) {
    throw new Error("Expected Level 1 buff mark smite caster.");
  }
  return {
    targetHp: target.hp,
    longstriderTargetSpeedFeet: Number(target.movement.speedFeet),
    ...longstriderSpeedEffectProjection(session),
    casterTempHp: caster.tempHp,
    casterFrightened: snapshotHasCondition(caster.conditions, "frightened"),
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    level1SlotsRemaining: level1SlotsRemaining(state),
    divineFavorActiveRiderCount: divineFavorActiveRiderCount(state),
    damageRiderSourceSpellId: projectedDamageRiderSourceSpellId,
    damageRiderDamageType:
      damageRider?.damage.damageType === "radiant" ? "radiant" : "none",
    damageRiderDice: damageRider?.damage.expr.dice ?? 0,
    damageRiderDieSize: damageRider?.damage.expr.dieSize ?? 0,
    ...falseLifeTemporaryHitPoints,
    ...heroismEffects,
    targetRestrained: snapshotHasCondition(target.conditions, "restrained"),
    casterConcentrating: caster.concentrating,
    ...ensnaringStrikeLifecycle,
    ...huntersMarkDamageHoleProjection(session, huntersMarkDamageHoleRider),
    ...huntersMarkActiveMarkProjection(session),
    huntersMarkTransferKindOnDropTurn,
    huntersMarkTransferVisibleOnDropTurn,
    ...hexDamageHoleProjection(session, hexDamageHoleRider),
    ...hexActiveMarkProjection(session),
    hexTransferKindOnDropTurn,
    hexTransferVisibleOnDropTurn,
    hexAfterCleanupAbilityRollMode,
    searingSmiteLifecycle,
    shillelaghWeaponAttackOverride,
    trueStrikeSpellHostedWeaponAttack,
    lastResult,
  };
}

function falseLifeTemporaryHitPointsProjection(
  hole: ScalarBuffTemporaryHitPointsRollHole,
): FalseLifeTemporaryHitPointsProjection {
  return {
    temporaryHitPointsSourceSpellId: temporaryHitPointsSourceSpellId(hole),
    temporaryHitPointsDice: 2,
    temporaryHitPointsDieSize: 4,
    temporaryHitPointsFlat: 4,
  };
}

function temporaryHitPointsSourceSpellId(
  hole: ScalarBuffTemporaryHitPointsRollHole,
): TemporaryHitPointsSourceSpellId {
  if (!("spell" in hole)) {
    return falseLifeUnitId;
  }
  throw new Error(
    "Temporary Hit Points roll leaked an authored spell payload.",
  );
}

function heroismEffectsProjection(
  session: BattleRuntimeSession,
): HeroismEffectsProjection {
  const state = session.state;
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Heroism caster.");
  }
  const frightenedImmunity = caster.activeEffects.find(
    (effect): effect is HeroismFrightenedImmunityEffect =>
      effect.kind === "conditionImmunity" &&
      effect.sourceCombatantId === casterId,
  );
  const turnStartTemporaryHitPoints = caster.activeEffects.find(
    (effect): effect is HeroismTurnStartTemporaryHitPointsEffect =>
      effect.kind === "turnStartTemporaryHitPoints" &&
      effect.sourceCombatantId === casterId,
  );
  return {
    frightenedImmunitySourceSpellId: heroismSourceSpellId(
      session,
      frightenedImmunity,
    ),
    frightenedImmunityCondition:
      heroismFrightenedImmunityCondition(frightenedImmunity),
    turnStartTemporaryHitPointsSourceSpellId: heroismSourceSpellId(
      session,
      turnStartTemporaryHitPoints,
    ),
    turnStartTemporaryHitPointsAmount: turnStartTemporaryHitPoints?.amount ?? 0,
  };
}

function heroismFrightenedImmunityCondition(
  effect:
    | {
        readonly condition: Condition;
      }
    | undefined,
): Level1BuffMarkSmiteSelectedIdentityProjection["frightenedImmunityCondition"] {
  if (effect === undefined) {
    return "none";
  }
  if (effect.condition === "frightened") {
    return "frightened";
  }
  throw new Error(`Unexpected Heroism immunity condition ${effect.condition}.`);
}

function heroismSourceSpellId(
  session: BattleRuntimeSession,
  effect:
    | { readonly sourceProcedureRef: BattleProcedureExecutionRef }
    | undefined,
): HeroismSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      casterId,
      effect.sourceProcedureRef,
      heroismUnitId,
    )
  ) {
    return heroismUnitId;
  }
  throw new Error(
    `Unexpected Heroism source spell id ${effect.sourceProcedureRef}.`,
  );
}

function longstriderSpeedEffectProjection(
  session: BattleRuntimeSession,
): Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "longstriderSpeedEffectSourceSpellId"
  | "longstriderSpeedEffectTarget"
  | "longstriderSpeedDeltaFeet"
> {
  const trackedEffect = longstriderSpeedEffect(session.state);
  return {
    longstriderSpeedEffectSourceSpellId: longstriderSourceSpellId(
      session,
      trackedEffect?.effect,
    ),
    longstriderSpeedEffectTarget: trackedEffect?.target ?? "none",
    longstriderSpeedDeltaFeet: Number(trackedEffect?.effect.deltaFeet ?? 0),
  };
}

function longstriderSpeedEffect(state: BattleState):
  | {
      readonly target: Exclude<LongstriderSpeedEffectTarget, "none">;
      readonly effect: LongstriderSpeedDeltaEffect;
    }
  | undefined {
  const target = state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error("Expected Longstrider target.");
  }
  const effect = target.activeEffects.find(
    (candidate): candidate is LongstriderSpeedDeltaEffect =>
      candidate.kind === "speedDelta" &&
      candidate.sourceCombatantId === casterId,
  );
  return effect === undefined ? undefined : { target: "target", effect };
}

function longstriderSourceSpellId(
  session: BattleRuntimeSession,
  effect:
    | { readonly sourceProcedureRef: BattleProcedureExecutionRef }
    | undefined,
): LongstriderSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      casterId,
      effect.sourceProcedureRef,
      longstriderUnitId,
    )
  ) {
    return longstriderUnitId;
  }
  throw new Error(
    `Unexpected Longstrider source spell id ${effect.sourceProcedureRef}.`,
  );
}

function huntersMarkDamageHoleProjection(
  session: BattleRuntimeSession,
  rider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined,
): HuntersMarkDamageHoleProjection {
  return {
    huntersMarkDamageHoleSourceSpellId: huntersMarkSourceSpellId(
      session,
      rider,
    ),
    huntersMarkDamageHoleDamageType:
      rider?.damage.damageType === "force" ? "force" : "none",
    huntersMarkDamageHoleDice: rider?.damage.expr.dice ?? 0,
    huntersMarkDamageHoleDieSize: rider?.damage.expr.dieSize ?? 0,
  };
}

function huntersMarkActiveMarkProjection(
  session: BattleRuntimeSession,
): HuntersMarkActiveMarkProjection {
  const effect = huntersMarkActiveMarkEffect(session.state);
  return {
    huntersMarkActiveMarkSourceSpellId: huntersMarkSourceSpellId(
      session,
      effect,
    ),
    huntersMarkActiveMarkTarget: huntersMarkActiveMarkTarget(effect),
    huntersMarkConcentrationSourceSpellId:
      effect === undefined
        ? "none"
        : huntersMarkConcentrationSourceSpellId(session),
    huntersMarkActiveMarkTransferKind:
      huntersMarkActiveMarkTransferKind(effect),
    huntersMarkActiveMarkRetargetTiming:
      huntersMarkActiveMarkRetargetTiming(effect),
  };
}

function huntersMarkActiveMarkEffect(
  state: BattleState,
): HuntersMarkActiveMarkEffect | undefined {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Hunter's Mark caster.");
  }
  return caster.activeEffects.find(
    (effect): effect is HuntersMarkActiveMarkEffect =>
      effect.kind === "spellMarkedDamageRider" &&
      effect.sourceCombatantId === casterId,
  );
}

function huntersMarkSourceSpellId(
  session: BattleRuntimeSession,
  effect:
    | { readonly sourceProcedureRef: BattleProcedureExecutionRef }
    | undefined,
): HuntersMarkSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      casterId,
      effect.sourceProcedureRef,
      huntersMarkUnitId,
    )
  ) {
    return huntersMarkUnitId;
  }
  throw new Error(
    `Unexpected Hunter's Mark source spell id ${effect.sourceProcedureRef}.`,
  );
}

function huntersMarkActiveMarkTarget(
  effect: Pick<HuntersMarkActiveMarkEffect, "targetCombatantId"> | undefined,
): HuntersMarkMarkedTarget {
  if (effect === undefined) {
    return "none";
  }
  if (effect.targetCombatantId === targetId) {
    return "target";
  }
  if (effect.targetCombatantId === markedDamageTransferTargetId) {
    return "transferTarget";
  }
  throw new Error(
    `Unexpected Hunter's Mark target id ${effect.targetCombatantId}.`,
  );
}

function huntersMarkConcentrationSourceSpellId(
  session: BattleRuntimeSession,
): HuntersMarkSourceSpellId {
  const state = session.state;
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Hunter's Mark caster.");
  }
  if (caster.concentration === null) {
    return "none";
  }
  if (
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      casterId,
      caster.concentration.sourceProcedureRef,
      huntersMarkUnitId,
    )
  ) {
    return huntersMarkUnitId;
  }
  throw new Error(
    `Unexpected Hunter's Mark Concentration source spell id ${caster.concentration.sourceProcedureRef}.`,
  );
}

function huntersMarkActiveMarkTransferKind(
  effect: Pick<HuntersMarkActiveMarkEffect, "transfer"> | undefined,
): HuntersMarkTransferKind {
  if (effect === undefined) {
    return "none";
  }
  if (
    effect.transfer.kind === "awaitingTargetDrop" ||
    effect.transfer.kind === "available"
  ) {
    return effect.transfer.kind;
  }
  throw new Error(
    `Unexpected Hunter's Mark transfer kind ${effect.transfer.kind}.`,
  );
}

function huntersMarkActiveMarkRetargetTiming(
  effect: Pick<HuntersMarkActiveMarkEffect, "transfer"> | undefined,
): HuntersMarkRetargetTiming {
  if (effect === undefined) {
    return "none";
  }
  if (effect.transfer.retargetTiming === "sameTurn") {
    return "sameTurn";
  }
  throw new Error(
    `Unexpected Hunter's Mark retarget timing ${effect.transfer.retargetTiming}.`,
  );
}

function hexDamageHoleProjection(
  session: BattleRuntimeSession,
  rider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined,
): HexDamageHoleProjection {
  return {
    hexDamageHoleSourceSpellId: hexSourceSpellId(session, rider),
    hexDamageHoleDamageType:
      rider?.damage.damageType === "necrotic" ? "necrotic" : "none",
    hexDamageHoleDice: rider?.damage.expr.dice ?? 0,
    hexDamageHoleDieSize: rider?.damage.expr.dieSize ?? 0,
  };
}

function hexActiveMarkProjection(
  session: BattleRuntimeSession,
): HexActiveMarkProjection {
  const state = session.state;
  const effect = hexActiveMarkEffect(state);
  if (effect === undefined) {
    return {
      hexActiveMarkSourceSpellId: "none",
      hexActiveMarkTarget: "none",
      hexAbilityCheckAbility: "none",
      hexMatchingTargetAbilityRollMode: "none",
      hexNonmatchingAbilityRollMode: "none",
      hexNonmarkedActorAbilityRollMode: "none",
      hexActiveMarkTransferKind: "none",
      hexActiveMarkRetargetTiming: "none",
    };
  }
  return {
    hexActiveMarkSourceSpellId: hexSourceSpellId(session, effect),
    hexActiveMarkTarget: hexActiveMarkTarget(effect),
    hexAbilityCheckAbility: hexAbilityCheckAbility(effect),
    hexMatchingTargetAbilityRollMode: hexAbilityCheckRollModeFor(
      state,
      effect.targetCombatantId,
      "wis",
    ),
    hexNonmatchingAbilityRollMode: hexAbilityCheckRollModeFor(
      state,
      effect.targetCombatantId,
      "str",
    ),
    hexNonmarkedActorAbilityRollMode: hexAbilityCheckRollModeFor(
      state,
      casterId,
      "wis",
    ),
    hexActiveMarkTransferKind: hexActiveMarkTransferKind(effect),
    hexActiveMarkRetargetTiming: hexActiveMarkRetargetTiming(effect),
  };
}

function hexAbilityCheckRollModeFor(
  state: BattleState,
  actorId: CombatantId | undefined,
  ability: "str" | "wis",
): HexAbilityCheckRollMode {
  if (actorId === undefined) {
    return "none";
  }
  const mode = requiredAbilityCheckRollMode(state, actorId, ability);
  if (mode === undefined || mode === "normal") {
    return "normal";
  }
  if (mode === "disadvantage") {
    return "disadvantage";
  }
  throw new Error(`Unexpected Hex ability-check roll mode ${mode}.`);
}

function hexActiveMarkEffect(
  state: BattleState,
): HexActiveMarkEffect | undefined {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Hex caster.");
  }
  return caster.activeEffects.find(
    (effect): effect is HexActiveMarkEffect =>
      effect.kind === "spellMarkedDamageRider" &&
      effect.sourceCombatantId === casterId,
  );
}

function hexSourceSpellId(
  session: BattleRuntimeSession,
  effect:
    | { readonly sourceProcedureRef: BattleProcedureExecutionRef }
    | undefined,
): HexSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (
    characterSpellProcedureRefMatchesSpellForTest(
      session,
      casterId,
      effect.sourceProcedureRef,
      hexUnitId,
    )
  ) {
    return hexUnitId;
  }
  throw new Error(
    `Unexpected Hex source spell id ${effect.sourceProcedureRef}.`,
  );
}

function hexActiveMarkTarget(
  effect: Pick<HexActiveMarkEffect, "targetCombatantId"> | undefined,
): HexMarkedTarget {
  if (effect === undefined) {
    return "none";
  }
  if (effect.targetCombatantId === targetId) {
    return "target";
  }
  if (effect.targetCombatantId === markedDamageTransferTargetId) {
    return "transferTarget";
  }
  throw new Error(
    `Unexpected Hex marked target id ${effect.targetCombatantId}.`,
  );
}

function hexAbilityCheckAbility(
  effect: Pick<HexActiveMarkEffect, "abilityCheckBehavior"> | undefined,
): HexAbilityCheckAbility {
  if (effect === undefined || effect.abilityCheckBehavior.kind === "none") {
    return "none";
  }
  if (
    effect.abilityCheckBehavior.kind === "abilityDisadvantage" &&
    effect.abilityCheckBehavior.ability === "wis"
  ) {
    return "wis";
  }
  throw new Error("Unexpected Hex ability check behavior.");
}

function hexActiveMarkTransferKind(
  effect: Pick<HexActiveMarkEffect, "transfer"> | undefined,
): HexTransferKind {
  if (effect === undefined) {
    return "none";
  }
  if (
    effect.transfer.kind === "awaitingTargetDrop" ||
    effect.transfer.kind === "availableAfterTurn"
  ) {
    return effect.transfer.kind;
  }
  throw new Error(`Unexpected Hex transfer kind ${effect.transfer.kind}.`);
}

function hexActiveMarkRetargetTiming(
  effect: Pick<HexActiveMarkEffect, "transfer"> | undefined,
): HexRetargetTiming {
  if (effect === undefined) {
    return "none";
  }
  if (effect.transfer.retargetTiming === "laterTurn") {
    return "laterTurn";
  }
  throw new Error(
    `Unexpected Hex retarget timing ${effect.transfer.retargetTiming}.`,
  );
}

function isDamageRiderSourceSpellId(
  value: string,
): value is Exclude<DamageRiderSourceSpellId, "none"> {
  return damageRiderSourceSpellIds.some((spellId) => spellId === value);
}

function snapshotHasCondition(
  conditions: readonly Condition[],
  condition: Condition,
): boolean {
  return conditions.includes(condition);
}

function divineFavorActiveRiderCount(state: BattleState): number {
  return (
    state.combatants
      .get(casterId)
      ?.activeEffects.filter(
        (effect) =>
          effect.kind === "spellWeaponDamageRider" &&
          effect.sourceCombatantId === casterId,
      ).length ?? 0
  );
}

function level1SlotsRemaining(state: BattleState): number {
  const actor = state.combatants.get(casterId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spellcaster.");
  }
  const slot = actor.origin.spellcasting?.spellSlots.find(
    (candidate) => Number(candidate.spellLevel) === 1,
  );
  return slot === undefined ? 0 : Number(slot.count) - Number(slot.expended);
}

function normalizeLevel1BuffMarkSmiteSelectedIdentityQuintState(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection {
  const state = quintRecordField(quintStateRecord(raw), "qState");
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "protocol",
    noInvalidReason: "",
    decodeHole: level1BuffMarkSmiteUnexpectedHole,
  });
  if (protocol.holes.length !== 0) {
    throw new Error(
      "Expected level-1 buff/mark/smite witness holes to be empty.",
    );
  }
  const scenarioResult = mbtLastResult(state["qScenarioOutcome"]);
  assertWitnessProtocolConsistentWithScenario({
    label: "level-1 buff/mark/smite selected identity",
    scenarioOutcome: scenarioResult,
    protocol,
  });
  return {
    divineFavorActiveRiderCount: numberFromQuintInt(
      state["qDivineFavorActiveRiderCount"],
      "qDivineFavorActiveRiderCount",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    longstriderTargetSpeedFeet: numberFromQuintInt(
      state["qLongstriderTargetSpeedFeet"],
      "qLongstriderTargetSpeedFeet",
    ),
    longstriderSpeedEffectSourceSpellId: longstriderSourceSpellIdFromQuint(
      state["qLongstriderSpeedEffectSourceSpellId"],
    ),
    longstriderSpeedEffectTarget: longstriderSpeedEffectTargetFromQuint(
      state["qLongstriderSpeedEffectTarget"],
    ),
    longstriderSpeedDeltaFeet: numberFromQuintInt(
      state["qLongstriderSpeedDeltaFeet"],
      "qLongstriderSpeedDeltaFeet",
    ),
    casterTempHp: numberFromQuintInt(state["qCasterTempHp"], "qCasterTempHp"),
    casterFrightened: booleanField(state, "qCasterFrightened"),
    spellSlotSpentThisTurn: booleanField(state, "qSpellSlotSpentThisTurn"),
    level1SlotsRemaining: numberFromQuintInt(
      state["qLevel1SlotsRemaining"],
      "qLevel1SlotsRemaining",
    ),
    damageRiderSourceSpellId: damageRiderSourceSpellIdFromQuint(
      state["qDamageRiderSourceSpellId"],
    ),
    damageRiderDamageType: damageRiderDamageType(
      state["qDamageRiderDamageType"],
    ),
    damageRiderDice: numberFromQuintInt(
      state["qDamageRiderDice"],
      "qDamageRiderDice",
    ),
    damageRiderDieSize: numberFromQuintInt(
      state["qDamageRiderDieSize"],
      "qDamageRiderDieSize",
    ),
    temporaryHitPointsSourceSpellId: temporaryHitPointsSourceSpellIdFromQuint(
      state["qTemporaryHitPointsSourceSpellId"],
    ),
    temporaryHitPointsDice: numberFromQuintInt(
      state["qTemporaryHitPointsDice"],
      "qTemporaryHitPointsDice",
    ),
    temporaryHitPointsDieSize: numberFromQuintInt(
      state["qTemporaryHitPointsDieSize"],
      "qTemporaryHitPointsDieSize",
    ),
    temporaryHitPointsFlat: numberFromQuintInt(
      state["qTemporaryHitPointsFlat"],
      "qTemporaryHitPointsFlat",
    ),
    frightenedImmunitySourceSpellId: heroismSourceSpellIdFromQuint(
      state["qFrightenedImmunitySourceSpellId"],
    ),
    frightenedImmunityCondition: frightenedImmunityConditionFromQuint(
      state["qFrightenedImmunityCondition"],
    ),
    turnStartTemporaryHitPointsSourceSpellId: heroismSourceSpellIdFromQuint(
      state["qTurnStartTemporaryHitPointsSourceSpellId"],
    ),
    turnStartTemporaryHitPointsAmount: numberFromQuintInt(
      state["qTurnStartTemporaryHitPointsAmount"],
      "qTurnStartTemporaryHitPointsAmount",
    ),
    ensnaringStrikeRestrainedBeforeEscape: booleanField(
      state,
      "qEnsnaringStrikeRestrainedBeforeEscape",
    ),
    targetRestrained: booleanField(state, "qTargetRestrained"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    ensnaringStrikeSaveSourceSpellId: ensnaringStrikeSourceSpellIdFromQuint(
      state["qEnsnaringStrikeSaveSourceSpellId"],
    ),
    ensnaringStrikeSaveAbility: strengthAbilityFromQuint(
      state["qEnsnaringStrikeSaveAbility"],
      "saving throw",
    ),
    turnStartDamageSourceSpellId: ensnaringStrikeSourceSpellIdFromQuint(
      state["qTurnStartDamageSourceSpellId"],
    ),
    turnStartDamageDamageType: turnStartDamageDamageType(
      state["qTurnStartDamageDamageType"],
    ),
    turnStartDamageDice: numberFromQuintInt(
      state["qTurnStartDamageDice"],
      "qTurnStartDamageDice",
    ),
    turnStartDamageDieSize: numberFromQuintInt(
      state["qTurnStartDamageDieSize"],
      "qTurnStartDamageDieSize",
    ),
    escapeCheckAbility: strengthAbilityFromQuint(
      state["qEscapeCheckAbility"],
      "escape check",
    ),
    escapeCheckSkill: athleticsSkillFromQuint(state["qEscapeCheckSkill"]),
    huntersMarkDamageHoleSourceSpellId: huntersMarkSourceSpellIdFromQuint(
      state["qHuntersMarkDamageHoleSourceSpellId"],
    ),
    huntersMarkDamageHoleDamageType: huntersMarkDamageTypeFromQuint(
      state["qHuntersMarkDamageHoleDamageType"],
    ),
    huntersMarkDamageHoleDice: numberFromQuintInt(
      state["qHuntersMarkDamageHoleDice"],
      "qHuntersMarkDamageHoleDice",
    ),
    huntersMarkDamageHoleDieSize: numberFromQuintInt(
      state["qHuntersMarkDamageHoleDieSize"],
      "qHuntersMarkDamageHoleDieSize",
    ),
    huntersMarkActiveMarkSourceSpellId: huntersMarkSourceSpellIdFromQuint(
      state["qHuntersMarkActiveMarkSourceSpellId"],
    ),
    huntersMarkActiveMarkTarget: huntersMarkMarkedTargetFromQuint(
      state["qHuntersMarkActiveMarkTarget"],
    ),
    huntersMarkConcentrationSourceSpellId: huntersMarkSourceSpellIdFromQuint(
      state["qHuntersMarkConcentrationSourceSpellId"],
    ),
    huntersMarkTransferKindOnDropTurn: huntersMarkTransferKindFromQuint(
      state["qHuntersMarkTransferKindOnDropTurn"],
    ),
    huntersMarkActiveMarkTransferKind: huntersMarkTransferKindFromQuint(
      state["qHuntersMarkActiveMarkTransferKind"],
    ),
    huntersMarkActiveMarkRetargetTiming: huntersMarkRetargetTimingFromQuint(
      state["qHuntersMarkActiveMarkRetargetTiming"],
    ),
    huntersMarkTransferVisibleOnDropTurn: booleanField(
      state,
      "qHuntersMarkTransferVisibleOnDropTurn",
    ),
    hexDamageHoleSourceSpellId: hexSourceSpellIdFromQuint(
      state["qHexDamageHoleSourceSpellId"],
    ),
    hexDamageHoleDamageType: hexDamageTypeFromQuint(
      state["qHexDamageHoleDamageType"],
    ),
    hexDamageHoleDice: numberFromQuintInt(
      state["qHexDamageHoleDice"],
      "qHexDamageHoleDice",
    ),
    hexDamageHoleDieSize: numberFromQuintInt(
      state["qHexDamageHoleDieSize"],
      "qHexDamageHoleDieSize",
    ),
    hexActiveMarkSourceSpellId: hexSourceSpellIdFromQuint(
      state["qHexActiveMarkSourceSpellId"],
    ),
    hexActiveMarkTarget: hexMarkedTargetFromQuint(
      state["qHexActiveMarkTarget"],
    ),
    hexAbilityCheckAbility: hexAbilityFromQuint(
      state["qHexAbilityCheckAbility"],
    ),
    hexMatchingTargetAbilityRollMode: hexAbilityCheckRollModeFromQuint(
      state["qHexMatchingTargetAbilityRollMode"],
    ),
    hexNonmatchingAbilityRollMode: hexAbilityCheckRollModeFromQuint(
      state["qHexNonmatchingAbilityRollMode"],
    ),
    hexNonmarkedActorAbilityRollMode: hexAbilityCheckRollModeFromQuint(
      state["qHexNonmarkedActorAbilityRollMode"],
    ),
    hexAfterCleanupAbilityRollMode: hexAbilityCheckRollModeFromQuint(
      state["qHexAfterCleanupAbilityRollMode"],
    ),
    hexTransferKindOnDropTurn: hexTransferKindFromQuint(
      state["qHexTransferKindOnDropTurn"],
    ),
    hexActiveMarkTransferKind: hexTransferKindFromQuint(
      state["qHexActiveMarkTransferKind"],
    ),
    hexActiveMarkRetargetTiming: hexRetargetTimingFromQuint(
      state["qHexActiveMarkRetargetTiming"],
    ),
    hexTransferVisibleOnDropTurn: booleanField(
      state,
      "qHexTransferVisibleOnDropTurn",
    ),
    searingSmiteLifecycle: searingSmiteLifecycleFromQuint(state),
    shillelaghWeaponAttackOverride:
      shillelaghWeaponAttackOverrideFromQuint(state),
    trueStrikeSpellHostedWeaponAttack:
      trueStrikeSpellHostedWeaponAttackFromQuint(state),
    lastResult: scenarioResult,
  };
}

function level1BuffMarkSmiteUnexpectedHole(raw: unknown): never {
  throw new Error(
    `Unexpected level-1 buff/mark/smite witness hole ${String(raw)}.`,
  );
}

function damageRiderSourceSpellIdFromQuint(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderSourceSpellId"] {
  if (raw === "none") {
    return raw;
  }
  if (typeof raw === "string" && isDamageRiderSourceSpellId(raw)) {
    return raw;
  }
  throw new Error(`Unexpected damage rider source spell id ${String(raw)}.`);
}

function damageRiderDamageType(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderDamageType"] {
  if (raw === "radiant" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected damage rider damage type ${String(raw)}.`);
}

function temporaryHitPointsSourceSpellIdFromQuint(
  raw: unknown,
): TemporaryHitPointsSourceSpellId {
  if (raw === "none" || raw === falseLifeUnitId) {
    return raw;
  }
  throw new Error(
    `Unexpected Temporary Hit Points source spell id ${String(raw)}.`,
  );
}

function heroismSourceSpellIdFromQuint(raw: unknown): HeroismSourceSpellId {
  if (raw === "none" || raw === heroismUnitId) {
    return raw;
  }
  throw new Error(`Unexpected Heroism source spell id ${String(raw)}.`);
}

function longstriderSourceSpellIdFromQuint(
  raw: unknown,
): LongstriderSourceSpellId {
  if (raw === "none" || raw === longstriderUnitId) {
    return raw;
  }
  throw new Error(`Unexpected Longstrider source spell id ${String(raw)}.`);
}

function longstriderSpeedEffectTargetFromQuint(
  raw: unknown,
): LongstriderSpeedEffectTarget {
  if (raw === "target" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Longstrider speed target ${String(raw)}.`);
}

function frightenedImmunityConditionFromQuint(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["frightenedImmunityCondition"] {
  if (raw === "frightened" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Frightened immunity condition ${String(raw)}.`);
}

function ensnaringStrikeSourceSpellIdFromQuint(
  raw: unknown,
): EnsnaringStrikeSourceSpellId {
  if (raw === "none" || raw === ensnaringStrikeUnitId) {
    return raw;
  }
  throw new Error(
    `Unexpected Ensnaring Strike source spell id ${String(raw)}.`,
  );
}

function strengthAbilityFromQuint(raw: unknown, label: string): "str" | "none" {
  if (raw === "str" || raw === "none") {
    return raw;
  }
  throw new Error(
    `Unexpected Ensnaring Strike ${label} ability ${String(raw)}.`,
  );
}

function turnStartDamageDamageType(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["turnStartDamageDamageType"] {
  if (raw === "piercing" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected turn-start damage type ${String(raw)}.`);
}

function athleticsSkillFromQuint(raw: unknown): "athletics" | "none" {
  if (raw === "athletics" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected escape check skill ${String(raw)}.`);
}

function huntersMarkSourceSpellIdFromQuint(
  raw: unknown,
): HuntersMarkSourceSpellId {
  if (raw === "none" || raw === huntersMarkUnitId) {
    return raw;
  }
  throw new Error(`Unexpected Hunter's Mark source spell id ${String(raw)}.`);
}

function huntersMarkDamageTypeFromQuint(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["huntersMarkDamageHoleDamageType"] {
  if (raw === "force" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hunter's Mark damage type ${String(raw)}.`);
}

function huntersMarkMarkedTargetFromQuint(
  raw: unknown,
): HuntersMarkMarkedTarget {
  if (raw === "target" || raw === "transferTarget" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hunter's Mark target ${String(raw)}.`);
}

function huntersMarkTransferKindFromQuint(
  raw: unknown,
): HuntersMarkTransferKind {
  if (raw === "awaitingTargetDrop" || raw === "available" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hunter's Mark transfer kind ${String(raw)}.`);
}

function huntersMarkRetargetTimingFromQuint(
  raw: unknown,
): HuntersMarkRetargetTiming {
  if (raw === "sameTurn" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hunter's Mark retarget timing ${String(raw)}.`);
}

function hexSourceSpellIdFromQuint(raw: unknown): HexSourceSpellId {
  if (raw === "none" || raw === hexUnitId) {
    return raw;
  }
  throw new Error(`Unexpected Hex source spell id ${String(raw)}.`);
}

function hexDamageTypeFromQuint(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["hexDamageHoleDamageType"] {
  if (raw === "necrotic" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hex damage type ${String(raw)}.`);
}

function hexMarkedTargetFromQuint(raw: unknown): HexMarkedTarget {
  if (raw === "target" || raw === "transferTarget" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hex marked target ${String(raw)}.`);
}

function hexAbilityFromQuint(raw: unknown): HexAbilityCheckAbility {
  if (raw === "wis" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hex ability ${String(raw)}.`);
}

function hexAbilityCheckRollModeFromQuint(
  raw: unknown,
): HexAbilityCheckRollMode {
  if (raw === "disadvantage" || raw === "normal" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hex ability-check roll mode ${String(raw)}.`);
}

function hexTransferKindFromQuint(raw: unknown): HexTransferKind {
  if (
    raw === "awaitingTargetDrop" ||
    raw === "availableAfterTurn" ||
    raw === "none"
  ) {
    return raw;
  }
  throw new Error(`Unexpected Hex transfer kind ${String(raw)}.`);
}

function hexRetargetTimingFromQuint(raw: unknown): HexRetargetTiming {
  if (raw === "laterTurn" || raw === "none") {
    return raw;
  }
  throw new Error(`Unexpected Hex retarget timing ${String(raw)}.`);
}

function searingSmiteLifecycleFromQuint(
  state: Readonly<Record<string, unknown>>,
): SearingSmiteLifecycleProjection {
  const immediateSource = state["qSearingSmiteImmediateDamageSourceSpellId"];
  if (immediateSource === "none") {
    assertSearingSmiteNoLifecycleFromQuint(state);
    return { tag: "none" };
  }
  return {
    tag: "afterHitTimedDamageAndSaveCleanup",
    immediateDamage: {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        searingSmiteRequiredSourceSpellIdFromQuint(
          immediateSource,
          "immediate damage",
        ),
      ),
      damageType: searingSmiteRequiredDamageTypeFromQuint(
        state["qSearingSmiteImmediateDamageDamageType"],
        "immediate damage",
      ),
      dice: numberFromQuintInt(
        state["qSearingSmiteImmediateDamageDice"],
        "qSearingSmiteImmediateDamageDice",
      ),
      dieSize: numberFromQuintInt(
        state["qSearingSmiteImmediateDamageDieSize"],
        "qSearingSmiteImmediateDamageDieSize",
      ),
    },
    activeBeforeSuccessfulSave: searingSmiteRequiredBooleanFromQuint(
      state,
      "qSearingSmiteActiveBeforeSuccessfulSave",
      true,
    ),
    turnStartDamage: {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        searingSmiteRequiredSourceSpellIdFromQuint(
          state["qSearingSmiteTurnStartDamageSourceSpellId"],
          "turn-start damage",
        ),
      ),
      damageType: searingSmiteRequiredDamageTypeFromQuint(
        state["qSearingSmiteTurnStartDamageDamageType"],
        "turn-start damage",
      ),
      dice: numberFromQuintInt(
        state["qSearingSmiteTurnStartDamageDice"],
        "qSearingSmiteTurnStartDamageDice",
      ),
      dieSize: numberFromQuintInt(
        state["qSearingSmiteTurnStartDamageDieSize"],
        "qSearingSmiteTurnStartDamageDieSize",
      ),
    },
    turnStartSave: {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        searingSmiteRequiredSourceSpellIdFromQuint(
          state["qSearingSmiteTurnStartSaveSourceSpellId"],
          "turn-start save",
        ),
      ),
      ability: searingSmiteRequiredSaveAbilityFromQuint(
        state["qSearingSmiteTurnStartSaveAbility"],
      ),
      successEnds: searingSmiteRequiredSaveSuccessEndsFromQuint(
        state["qSearingSmiteTurnStartSaveSuccessEnds"],
      ),
    },
    activeAfterSuccessfulSave: searingSmiteRequiredBooleanFromQuint(
      state,
      "qSearingSmiteActiveAfterSuccessfulSave",
      false,
    ),
  };
}

function assertSearingSmiteNoLifecycleFromQuint(
  state: Readonly<Record<string, unknown>>,
): void {
  assertQuintField(
    state["qSearingSmiteImmediateDamageDamageType"],
    "none",
    "qSearingSmiteImmediateDamageDamageType",
  );
  assertQuintIntField(state, "qSearingSmiteImmediateDamageDice", 0);
  assertQuintIntField(state, "qSearingSmiteImmediateDamageDieSize", 0);
  assertQuintField(
    state["qSearingSmiteActiveBeforeSuccessfulSave"],
    false,
    "qSearingSmiteActiveBeforeSuccessfulSave",
  );
  assertQuintField(
    state["qSearingSmiteTurnStartDamageSourceSpellId"],
    "none",
    "qSearingSmiteTurnStartDamageSourceSpellId",
  );
  assertQuintField(
    state["qSearingSmiteTurnStartDamageDamageType"],
    "none",
    "qSearingSmiteTurnStartDamageDamageType",
  );
  assertQuintIntField(state, "qSearingSmiteTurnStartDamageDice", 0);
  assertQuintIntField(state, "qSearingSmiteTurnStartDamageDieSize", 0);
  assertQuintField(
    state["qSearingSmiteTurnStartSaveSourceSpellId"],
    "none",
    "qSearingSmiteTurnStartSaveSourceSpellId",
  );
  assertQuintField(
    state["qSearingSmiteTurnStartSaveAbility"],
    "none",
    "qSearingSmiteTurnStartSaveAbility",
  );
  assertQuintField(
    state["qSearingSmiteTurnStartSaveSuccessEnds"],
    "none",
    "qSearingSmiteTurnStartSaveSuccessEnds",
  );
  assertQuintField(
    state["qSearingSmiteActiveAfterSuccessfulSave"],
    false,
    "qSearingSmiteActiveAfterSuccessfulSave",
  );
}

function searingSmiteRequiredSourceSpellIdFromQuint(
  raw: unknown,
  label: string,
): typeof searingSmiteUnitId {
  if (raw === searingSmiteUnitId) {
    return raw;
  }
  throw new Error(
    `Unexpected Searing Smite ${label} source spell id ${String(raw)}.`,
  );
}

function searingSmiteRequiredDamageTypeFromQuint(
  raw: unknown,
  label: string,
): "fire" {
  if (raw === "fire") {
    return raw;
  }
  throw new Error(
    `Unexpected Searing Smite ${label} damage type ${String(raw)}.`,
  );
}

function searingSmiteRequiredSaveAbilityFromQuint(raw: unknown): "con" {
  if (raw === "con") {
    return raw;
  }
  throw new Error(
    `Unexpected Searing Smite turn-start save ability ${String(raw)}.`,
  );
}

function searingSmiteRequiredSaveSuccessEndsFromQuint(raw: unknown): "spell" {
  if (raw === "spell") {
    return raw;
  }
  throw new Error(
    `Unexpected Searing Smite turn-start save success end ${String(raw)}.`,
  );
}

function searingSmiteRequiredBooleanFromQuint<const T extends boolean>(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: T,
): T {
  const value = booleanField(state, field);
  if (value === expected) {
    return expected;
  }
  throw new Error(`Expected Quint field ${field} to be ${String(expected)}.`);
}

function assertQuintIntField(
  state: Readonly<Record<string, unknown>>,
  field: string,
  expected: number,
): void {
  const value = numberFromQuintInt(state[field], field);
  if (value !== expected) {
    throw new Error(`Expected Quint field ${field} to be ${expected}.`);
  }
}

function assertQuintField(
  raw: unknown,
  expected: string | boolean,
  field: string,
): void {
  if (raw !== expected) {
    throw new Error(`Expected Quint field ${field} to be ${String(expected)}.`);
  }
}

function shillelaghWeaponAttackOverrideFromQuint(
  state: Readonly<Record<string, unknown>>,
): ShillelaghWeaponAttackOverrideProjection {
  const source = state["qShillelaghOverrideSourceSpellId"];
  if (source === "none") {
    assertShillelaghNoWeaponAttackOverrideFromQuint(state);
    return { tag: "none" };
  }
  return {
    tag: "quarterstaffForceAttack",
    sourceSpellId: shillelaghRequiredSourceSpellIdFromQuint(source),
    weaponUnitId: shillelaghWeaponUnitIdFromQuint(
      state["qShillelaghOverrideWeaponUnitId"],
    ),
    spellcastingAbilityModifier: numberFromQuintInt(
      state["qShillelaghSpellcastingAbilityModifier"],
      "qShillelaghSpellcastingAbilityModifier",
    ),
    effectAttackBonus: numberFromQuintInt(
      state["qShillelaghOverrideAttackBonus"],
      "qShillelaghOverrideAttackBonus",
    ),
    effectDamageDice: numberFromQuintInt(
      state["qShillelaghOverrideDamageDice"],
      "qShillelaghOverrideDamageDice",
    ),
    effectDamageDieSize: numberFromQuintInt(
      state["qShillelaghOverrideDamageDieSize"],
      "qShillelaghOverrideDamageDieSize",
    ),
    attackName: shillelaghForceAttackNameFromQuint(
      state["qShillelaghForceAttackName"],
    ),
    attackBonus: numberFromQuintInt(
      state["qShillelaghForceAttackBonus"],
      "qShillelaghForceAttackBonus",
    ),
    damageType: shillelaghForceDamageTypeFromQuint(
      state["qShillelaghForceDamageType"],
    ),
    damageDice: numberFromQuintInt(
      state["qShillelaghForceDamageDice"],
      "qShillelaghForceDamageDice",
    ),
    damageDieSize: numberFromQuintInt(
      state["qShillelaghForceDamageDieSize"],
      "qShillelaghForceDamageDieSize",
    ),
    damageModifier: numberFromQuintInt(
      state["qShillelaghForceDamageModifier"],
      "qShillelaghForceDamageModifier",
    ),
  };
}

function assertShillelaghNoWeaponAttackOverrideFromQuint(
  state: Readonly<Record<string, unknown>>,
): void {
  assertQuintField(
    state["qShillelaghOverrideWeaponUnitId"],
    "none",
    "qShillelaghOverrideWeaponUnitId",
  );
  assertQuintIntField(state, "qShillelaghSpellcastingAbilityModifier", 0);
  assertQuintIntField(state, "qShillelaghOverrideAttackBonus", 0);
  assertQuintIntField(state, "qShillelaghOverrideDamageDice", 0);
  assertQuintIntField(state, "qShillelaghOverrideDamageDieSize", 0);
  assertQuintField(
    state["qShillelaghForceAttackName"],
    "none",
    "qShillelaghForceAttackName",
  );
  assertQuintIntField(state, "qShillelaghForceAttackBonus", 0);
  assertQuintField(
    state["qShillelaghForceDamageType"],
    "none",
    "qShillelaghForceDamageType",
  );
  assertQuintIntField(state, "qShillelaghForceDamageDice", 0);
  assertQuintIntField(state, "qShillelaghForceDamageDieSize", 0);
  assertQuintIntField(state, "qShillelaghForceDamageModifier", 0);
}

function shillelaghRequiredSourceSpellIdFromQuint(
  raw: unknown,
): typeof shillelaghUnitId {
  if (raw === shillelaghUnitId) {
    return raw;
  }
  throw new Error(`Unexpected Shillelagh source spell id ${String(raw)}.`);
}

function shillelaghWeaponUnitIdFromQuint(
  raw: unknown,
): ShillelaghQuarterstaffUnitId {
  if (raw === shillelaghQuarterstaffUnitId) {
    return shillelaghQuarterstaffUnitId;
  }
  throw new Error(`Unexpected Shillelagh weapon Unit id ${String(raw)}.`);
}

function shillelaghForceAttackNameFromQuint(
  raw: unknown,
): Exclude<ShillelaghForceAttackName, "none"> {
  if (raw === shillelaghQuarterstaffForceAttackName) {
    return raw;
  }
  throw new Error(`Unexpected Shillelagh force attack ${String(raw)}.`);
}

function shillelaghForceDamageTypeFromQuint(raw: unknown): "force" {
  if (raw === "force") {
    return raw;
  }
  throw new Error(`Unexpected Shillelagh damage type ${String(raw)}.`);
}

function trueStrikeSpellHostedWeaponAttackFromQuint(
  state: Readonly<Record<string, unknown>>,
): TrueStrikeSpellHostedWeaponAttackProjection {
  const source = state["qTrueStrikeSourceSpellId"];
  if (source === "none") {
    assertTrueStrikeNoSpellHostedWeaponAttackFromQuint(state);
    return { tag: "none" };
  }
  return {
    tag: "materialDaggerRadiantAttack",
    sourceSpellId: trueStrikeRequiredSourceSpellIdFromQuint(source),
    componentWeaponObjectId: trueStrikeComponentWeaponObjectIdFromQuint(
      state["qTrueStrikeComponentWeaponItemId"],
    ),
    weaponUnitId: trueStrikeWeaponUnitIdFromQuint(
      state["qTrueStrikeWeaponUnitId"],
    ),
    attackName: trueStrikeAttackNameFromQuint(state["qTrueStrikeAttackName"]),
    attackBonus: numberFromQuintInt(
      state["qTrueStrikeAttackBonus"],
      "qTrueStrikeAttackBonus",
    ),
    damageType: trueStrikeDamageTypeFromQuint(state["qTrueStrikeDamageType"]),
    damageDice: numberFromQuintInt(
      state["qTrueStrikeDamageDice"],
      "qTrueStrikeDamageDice",
    ),
    damageDieSize: numberFromQuintInt(
      state["qTrueStrikeDamageDieSize"],
      "qTrueStrikeDamageDieSize",
    ),
    damageModifier: numberFromQuintInt(
      state["qTrueStrikeDamageModifier"],
      "qTrueStrikeDamageModifier",
    ),
  };
}

function assertTrueStrikeNoSpellHostedWeaponAttackFromQuint(
  state: Readonly<Record<string, unknown>>,
): void {
  assertQuintField(
    state["qTrueStrikeComponentWeaponItemId"],
    "none",
    "qTrueStrikeComponentWeaponItemId",
  );
  assertQuintField(
    state["qTrueStrikeWeaponUnitId"],
    "none",
    "qTrueStrikeWeaponUnitId",
  );
  assertQuintField(
    state["qTrueStrikeAttackName"],
    "none",
    "qTrueStrikeAttackName",
  );
  assertQuintIntField(state, "qTrueStrikeAttackBonus", 0);
  assertQuintField(
    state["qTrueStrikeDamageType"],
    "none",
    "qTrueStrikeDamageType",
  );
  assertQuintIntField(state, "qTrueStrikeDamageDice", 0);
  assertQuintIntField(state, "qTrueStrikeDamageDieSize", 0);
  assertQuintIntField(state, "qTrueStrikeDamageModifier", 0);
}

function trueStrikeRequiredSourceSpellIdFromQuint(
  raw: unknown,
): typeof trueStrikeUnitId {
  if (raw === trueStrikeUnitId) {
    return raw;
  }
  throw new Error(`Unexpected True Strike source spell id ${String(raw)}.`);
}

function trueStrikeComponentWeaponObjectIdFromQuint(
  raw: unknown,
): TrueStrikeDaggerObjectId {
  if (raw === trueStrikeDaggerItemId) {
    return trueStrikeDaggerObjectId;
  }
  throw new Error(
    `Unexpected True Strike component weapon item ${String(raw)}.`,
  );
}

function trueStrikeWeaponUnitIdFromQuint(raw: unknown): TrueStrikeDaggerUnitId {
  if (raw === trueStrikeDaggerUnitId) {
    return trueStrikeDaggerUnitId;
  }
  throw new Error(`Unexpected True Strike weapon Unit id ${String(raw)}.`);
}

function trueStrikeAttackNameFromQuint(
  raw: unknown,
): Exclude<TrueStrikeDaggerAttackName, "none"> {
  if (raw === trueStrikeDaggerAttackName) {
    return raw;
  }
  throw new Error(`Unexpected True Strike attack name ${String(raw)}.`);
}

function trueStrikeDamageTypeFromQuint(raw: unknown): "radiant" {
  if (raw === "radiant") {
    return raw;
  }
  throw new Error(`Unexpected True Strike damage type ${String(raw)}.`);
}

const LEVEL1_BUFF_MARK_SMITE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG: Readonly<
  Record<string, Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"]>
> = {
  Init: "init",
  DivineFavor: "divineFavor",
  DivineSmite: "divineSmite",
  EnsnaringStrike: "ensnaringStrike",
  FalseLife: "falseLife",
  Heroism: "heroism",
  HuntersMark: "huntersMark",
  Hex: "hex",
  Longstrider: "longstrider",
  SearingSmite: "searingSmite",
  Shillelagh: "shillelagh",
  TrueStrike: "trueStrike",
};

function mbtLastResult(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] {
  const tag = quintVariantTag(raw, "qScenarioOutcome");
  const value =
    LEVEL1_BUFF_MARK_SMITE_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG[tag];
  if (value !== undefined) {
    return value;
  }
  throw new Error(`Unexpected level-1 buff/mark/smite result ${tag}.`);
}
