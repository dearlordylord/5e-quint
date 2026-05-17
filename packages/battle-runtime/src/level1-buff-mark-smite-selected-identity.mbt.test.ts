// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-DIVINE-FAVOR divine_favor
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-DIVINE-SMITE divine_smite
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-ENSNARING-STRIKE ensnaring_strike
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-FALSE-LIFE false_life
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-HEROISM heroism
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-HUNTERS-MARK hunters_mark
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-HEX hex
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-LONGSTRIDER longstrider
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-SEARING-SMITE searing_smite
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-SHILLELAGH shillelagh
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L1E-TRUE-STRIKE true_strike
// UNIT-IDENTITY-MBT-REPLAY: L1E-DIVINE-FAVOR divine_favor doDivineFavorWeaponDamageRider
// UNIT-IDENTITY-MBT-REPLAY: L1E-DIVINE-SMITE divine_smite doDivineSmiteAfterHitDamage
// UNIT-IDENTITY-MBT-REPLAY: L1E-ENSNARING-STRIKE ensnaring_strike doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape
// UNIT-IDENTITY-MBT-REPLAY: L1E-FALSE-LIFE false_life doFalseLifeTemporaryHitPoints
// UNIT-IDENTITY-MBT-REPLAY: L1E-HEROISM heroism doHeroismFrightenedImmunityTurnStartTemporaryHitPoints
// UNIT-IDENTITY-MBT-REPLAY: L1E-HUNTERS-MARK hunters_mark doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer
// UNIT-IDENTITY-MBT-REPLAY: L1E-HEX hex doHexMarkedDamageRiderAndLaterTurnTransfer
// UNIT-IDENTITY-MBT-REPLAY: L1E-LONGSTRIDER longstrider doLongstriderSpeedIncrease
// UNIT-IDENTITY-MBT-REPLAY: L1E-SEARING-SMITE searing_smite doSearingSmiteAfterHitTimedDamageAndSaveCleanup
// UNIT-IDENTITY-MBT-REPLAY: L1E-SHILLELAGH shillelagh doShillelaghWeaponAttackOverride
// UNIT-IDENTITY-MBT-REPLAY: L1E-TRUE-STRIKE true_strike doTrueStrikeSpellHostedWeaponAttack
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { applyCondition } from "@dnd/shared-algebras/conditions-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
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
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  endTurn,
  initiativeScore,
  resolveBattleReaction,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type AvailableBattleAct,
  type BattleAttackRollHole,
  type BattleCreatureInit,
  type BattleDamageRollHole,
  type BattleFill,
  type BattleHole,
  type BattleReactionProcedureChoice,
  type BattleResolutionResult,
  type BattleRolledDiceFill,
  type BattleSpellHealingRollHole,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import type {
  BattleActiveEffect,
  BattleSpellTurnStartDamageRollHole,
  BattleSpellTurnStartSavingThrowOutcomeHole,
} from "./battle-reducer.ts";
import { KnockedOutConditionState } from "./battle-reducer.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";

const level1BuffMarkSmiteSelectedIdentityDriverSchema = {
  init: {},
  doDivineFavorWeaponDamageRider: {},
  doDivineSmiteAfterHitDamage: {},
  doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape: {},
  doFalseLifeTemporaryHitPoints: {},
  doHeroismFrightenedImmunityTurnStartTemporaryHitPoints: {},
  doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer: {},
  doHexMarkedDamageRiderAndLaterTurnTransfer: {},
  doLongstriderSpeedIncrease: {},
  doSearingSmiteAfterHitTimedDamageAndSaveCleanup: {},
  doShillelaghWeaponAttackOverride: {},
  doTrueStrikeSpellHostedWeaponAttack: {},
  step: {},
} as const;
type Level1BuffMarkSmiteSelectedIdentityDriverAction = Exclude<
  keyof typeof level1BuffMarkSmiteSelectedIdentityDriverSchema,
  "init" | "step"
>;

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
const level1BuffMarkSmiteSpellIds = [
  divineFavorUnitId,
  divineSmiteUnitId,
  ensnaringStrikeUnitId,
  falseLifeUnitId,
  heroismUnitId,
  huntersMarkUnitId,
  hexUnitId,
  longstriderUnitId,
  searingSmiteUnitId,
  shillelaghUnitId,
  trueStrikeUnitId,
] as const;
type Level1BuffMarkSmiteSpellId = (typeof level1BuffMarkSmiteSpellIds)[number];
const spellWeaponDamageRiderSourceSpellIds = [
  divineFavorUnitId,
  divineSmiteUnitId,
  searingSmiteUnitId,
] as const satisfies ReadonlyArray<Level1BuffMarkSmiteSpellId>;
type SpellWeaponDamageRiderSourceSpellId =
  (typeof spellWeaponDamageRiderSourceSpellIds)[number];
const damageRiderSourceSpellIds = [
  divineFavorUnitId,
  divineSmiteUnitId,
] as const satisfies ReadonlyArray<SpellWeaponDamageRiderSourceSpellId>;
type DamageRiderSourceSpellId =
  | (typeof damageRiderSourceSpellIds)[number]
  | "none";
const hexDamageHoleSourceSpellIds = [
  hexUnitId,
] as const satisfies ReadonlyArray<Level1BuffMarkSmiteSpellId>;
type HexSourceSpellId = (typeof hexDamageHoleSourceSpellIds)[number] | "none";
const markedDamageRiderSourceSpellIds = [
  huntersMarkUnitId,
  hexUnitId,
] as const satisfies ReadonlyArray<Level1BuffMarkSmiteSpellId>;
type MarkedDamageRiderSourceSpellId =
  (typeof markedDamageRiderSourceSpellIds)[number];
type HuntersMarkSourceSpellId = typeof huntersMarkUnitId | "none";
type EnsnaringStrikeSourceSpellId = typeof ensnaringStrikeUnitId | "none";
type BonusActionCastSpellId =
  | typeof divineFavorUnitId
  | typeof huntersMarkUnitId
  | typeof hexUnitId
  | typeof shillelaghUnitId;
type AttackHitBonusActionSpellId =
  | typeof divineSmiteUnitId
  | typeof ensnaringStrikeUnitId
  | typeof searingSmiteUnitId;
type ActionCastSpellId =
  | typeof falseLifeUnitId
  | typeof heroismUnitId
  | typeof longstriderUnitId
  | typeof trueStrikeUnitId;
type TemporaryHitPointsSourceSpellId = typeof falseLifeUnitId | "none";
type HeroismSourceSpellId = typeof heroismUnitId | "none";
type LongstriderSourceSpellId = typeof longstriderUnitId | "none";
type LongstriderSpeedEffectTarget = "target" | "none";
type ShillelaghSourceSpellId = typeof shillelaghUnitId | "none";
const shillelaghQuarterstaffUnitId = "weapon_quarterstaff";
type ShillelaghQuarterstaffUnitId = typeof shillelaghQuarterstaffUnitId;
const shillelaghQuarterstaffForceAttackName = "Quarterstaff (force)";
type ShillelaghForceAttackName =
  | typeof shillelaghQuarterstaffForceAttackName
  | "none";
type TrueStrikeSourceSpellId = typeof trueStrikeUnitId | "none";
const trueStrikeDaggerUnitId = "weapon_dagger";
type TrueStrikeDaggerUnitId = typeof trueStrikeDaggerUnitId;
const trueStrikeDaggerItemId = `main:${trueStrikeDaggerUnitId}`;
type TrueStrikeDaggerItemId = typeof trueStrikeDaggerItemId;
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
  | "hexActiveMarkTransferKind"
  | "hexActiveMarkRetargetTiming"
>;
type SearingSmiteDamageProjection = {
  readonly sourceSpellId: typeof searingSmiteUnitId;
  readonly damageType: "fire";
  readonly dice: number;
  readonly dieSize: number;
};
type SearingSmiteTurnStartSaveProjection = {
  readonly sourceSpellId: typeof searingSmiteUnitId;
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
      readonly sourceSpellId: Exclude<ShillelaghSourceSpellId, "none">;
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
      readonly sourceSpellId: Exclude<TrueStrikeSourceSpellId, "none">;
      readonly componentWeaponItemId: TrueStrikeDaggerItemId;
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
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityDriverAction[];
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
  readonly actions: readonly Level1BuffMarkSmiteSelectedIdentityDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence[];
};

type BonusActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "bonusActionSpell" }
  >;
};
type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>;
};
type ScalarBuffTemporaryHitPointsRollHole = BattleSpellHealingRollHole & {
  readonly spell: Extract<
    BattleSpellHealingRollHole["spell"],
    { readonly procedure: "scalarBuff" }
  > & {
    readonly effect: Extract<
      Extract<
        BattleSpellHealingRollHole["spell"],
        { readonly procedure: "scalarBuff" }
      >["effect"],
      { readonly kind: "temporaryHitPoints" }
    >;
  };
};

const casterId = combatantId("level1-buff-mark-smite-caster");
const targetId = combatantId("level1-buff-mark-smite-target");
const markedDamageTransferTargetId = combatantId(
  "level1-buff-mark-smite-marked-damage-transfer-target",
);
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");

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
    actions: ["doHeroismFrightenedImmunityTurnStartTemporaryHitPoints"],
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
              sourceSpellId: "searing_smite",
              damageType: "fire",
              dice: 1,
              dieSize: 6,
            },
            activeBeforeSuccessfulSave: true,
            turnStartDamage: {
              sourceSpellId: "searing_smite",
              damageType: "fire",
              dice: 1,
              dieSize: 6,
            },
            turnStartSave: {
              sourceSpellId: "searing_smite",
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
            componentWeaponItemId: trueStrikeDaggerItemId,
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

describe("Level 1 buff mark smite selected identity MBT", () => {
  it("replays selected Unit identities deterministically", async () => {
    for (const replay of selectedUnitIdentityReplays) {
      const replayedActions =
        new Set<Level1BuffMarkSmiteSelectedIdentityDriverAction>();

      for (const sequence of replay.sequences) {
        const driver = createLevel1BuffMarkSmiteSelectedIdentityDriver()();

        for (const actionName of sequence.actions) {
          replayedActions.add(actionName);
          const action = driver.actions[actionName];
          if (action === undefined) {
            throw new Error(
              `Missing Level 1 buff mark smite selected identity driver action ${actionName}.`,
            );
          }
          await action.handler({});
        }

        const runtime = driver.getState?.();
        if (runtime === undefined) {
          throw new Error(
            "Level 1 buff mark smite selected identity driver must expose getState.",
          );
        }
        expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
          sequence.expected,
        );
      }

      expect(replayedActions).toEqual(new Set(replay.actions));
    }
  });

  it("replays Level 1 buff mark smite selected identity parity", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-level1-buff-mark-smite-selected-identity.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createLevel1BuffMarkSmiteSelectedIdentityDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 1),
      stateCheck: level1BuffMarkSmiteSelectedIdentityStateCheck,
    });
  }, 120_000);
});

function createLevel1BuffMarkSmiteSelectedIdentityDriver() {
  return defineDriver(level1BuffMarkSmiteSelectedIdentityDriverSchema, () => {
    let state = level1BuffMarkSmiteBattle();
    let damageRider:
      | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
      | undefined;
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
      hexDamageHoleRider = undefined;
      huntersMarkDamageHoleRider = undefined;
      huntersMarkTransferKindOnDropTurn = "none";
      huntersMarkTransferVisibleOnDropTurn = false;
      hexTransferKindOnDropTurn = "none";
      hexTransferVisibleOnDropTurn = false;
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
      state = level1BuffMarkSmiteBattle();
      resetProcedureProjections();
      lastResult = "init";
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
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(divineFavorUnitId)],
        });
        resetProcedureProjections();

        const cast = resolveBattleSubject({
          state,
          subject: bonusActionSpellAct(state, divineFavorUnitId).subject,
          fills: [],
        });
        if (cast.tag !== "resolved") {
          throw new Error(`Expected Divine Favor to resolve, got ${cast.tag}.`);
        }
        state = cast.state;

        const attack = resolveLongswordHit({ state });
        damageRider = attack.damageRider;
        recordResolvedResult(attack.result, "divineFavor");
      },
      doDivineSmiteAfterHitDamage: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(divineSmiteUnitId)],
        });
        resetProcedureProjections();

        const hit = resolveLongswordHitWithAttackRoll({ state });
        const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
        const smiteChoice = attackHitBonusActionSpellChoice(
          attackHitWindow,
          divineSmiteUnitId,
        );
        const afterSmite = resolveBattleReaction({
          state: attackHitWindow.state,
          fill: reactionDecisionFill(
            requireHole(attackHitWindow.holes, "reactionDecision"),
            {
              kind: "resolve",
              reactorId: casterId,
              choice: {
                kind: "castAttackHitBonusActionSpell",
                invocation: smiteChoice.invocation,
                fills: [],
              },
            },
          ),
        });
        const afterSmiteDamage = requireNeedsHoles(afterSmite);
        const damage = requireDamageRollHole(afterSmiteDamage);
        damageRider = spellWeaponDamageRider(damage, divineSmiteUnitId);
        recordResolvedResult(
          resolveBattleSubject({
            state: afterSmiteDamage.state,
            subject: hit.subject,
            fills: [
              hit.targetFill,
              hit.attackFill,
              damageRollFillWithGroups(damage, [[4], [3, 4]]),
            ],
          }),
          "divineSmite",
        );
      },
      doEnsnaringStrikeAfterHitRestraintTurnStartDamageAndEscape: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(ensnaringStrikeUnitId)],
          sourceClassName: "ranger",
        });
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
        const afterEnsnaring = resolveBattleReaction({
          state: attackHitWindow.state,
          fill: reactionDecisionFill(
            requireHole(attackHitWindow.holes, "reactionDecision"),
            {
              kind: "resolve",
              reactorId: casterId,
              choice: {
                kind: "castAttackHitBonusActionSpell",
                invocation: ensnaringChoice.invocation,
                fills: [
                  savingThrowOutcomeFill(save, [
                    { targetId, succeeded: false },
                  ]),
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
        recordResolvedResult(
          resolveBattleSubject({
            state: targetTurn.state,
            subject: escapeAct.subject,
            fills: [abilityCheckFill(escapeCheck, 13)],
          }),
          "ensnaringStrike",
        );
        ensnaringStrikeLifecycle = {
          ensnaringStrikeRestrainedBeforeEscape: restrainedBeforeEscape,
          ensnaringStrikeSaveSourceSpellId:
            ensnaringStrikeSaveSourceSpellId(save),
          ensnaringStrikeSaveAbility: save.ability === "str" ? "str" : "none",
          turnStartDamageSourceSpellId:
            ensnaringStrikeTurnStartDamageSourceSpellId(turnStartDamage),
          turnStartDamageDamageType:
            turnStartDamage.spellTurnStartDamage.damage.damageType ===
            "piercing"
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
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(falseLifeUnitId)],
          sourceClassName: "wizard",
        });
        resetProcedureProjections();

        const act = actionSpellAct(state, falseLifeUnitId);
        const temporaryHitPointsRoll =
          requireScalarBuffTemporaryHitPointsRollHole(
            requireHole(act.initialHoles, "rolledDice"),
          );
        falseLifeTemporaryHitPoints = falseLifeTemporaryHitPointsProjection(
          temporaryHitPointsRoll,
        );
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [damageRollFillWithGroups(temporaryHitPointsRoll, [[4, 3]])],
          }),
          "falseLife",
        );
      },
      doHeroismFrightenedImmunityTurnStartTemporaryHitPoints: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(heroismUnitId)],
        });
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

        const act = actionSpellAct(state, heroismUnitId);
        const target = requireHole(act.initialHoles, "targetChoice");
        const cast = resolveBattleSubject({
          state,
          subject: act.subject,
          fills: [spellTargetFill(target, heroismUnitId, casterId, casterId)],
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
        recordResolvedResult(
          endTurn({
            state: targetTurn.state,
            actorId: targetId,
          }),
          "heroism",
        );
        heroismEffects = heroismEffectsProjection(state);
      },
      doHuntersMarkMarkedDamageRiderConcentrationAndSameTurnTransfer: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(huntersMarkUnitId)],
          sourceClassName: "ranger",
          targetKind: "statBlock",
          includeMarkedDamageTransferTarget: true,
        });
        resetProcedureProjections();

        const castAct = bonusActionSpellAct(state, huntersMarkUnitId);
        const castTarget = requireHole(castAct.initialHoles, "targetChoice");
        const cast = resolveBattleSubject({
          state,
          subject: castAct.subject,
          fills: [
            spellTargetFill(castTarget, huntersMarkUnitId, casterId, targetId),
          ],
        });
        if (cast.tag !== "resolved") {
          throw new Error(
            `Expected Hunter's Mark to resolve, got ${cast.tag}.`,
          );
        }

        state = advanceMarkedDamageRoundToCasterTurn(cast.state);
        const hit = resolveLongswordHitWithAttackRoll({ state });
        const damage = requireDamageRollHole(
          requireNeedsHoles(hit.afterAttackRoll),
        );
        huntersMarkDamageHoleRider = spellMarkedDamageRider(
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
        huntersMarkTransferVisibleOnDropTurn = markedDamageTransferActVisible(
          state,
          huntersMarkUnitId,
        );
        huntersMarkTransferKindOnDropTurn = huntersMarkActiveMarkTransferKind(
          huntersMarkActiveMarkEffect(state),
        );

        const transferAct = markedDamageTransferAct(state, huntersMarkUnitId);
        const transferTarget = requireHole(
          transferAct.initialHoles,
          "targetChoice",
        );
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: transferAct.subject,
            fills: [
              spellTargetFill(
                transferTarget,
                huntersMarkUnitId,
                casterId,
                markedDamageTransferTargetId,
              ),
            ],
          }),
          "huntersMark",
        );
      },
      doHexMarkedDamageRiderAndLaterTurnTransfer: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(hexUnitId)],
          sourceClassName: "warlock",
          targetKind: "statBlock",
          includeMarkedDamageTransferTarget: true,
        });
        resetProcedureProjections();

        const castAct = bonusActionSpellAct(state, hexUnitId);
        const castTarget = requireHole(castAct.initialHoles, "targetChoice");
        const chosenAbility = requireHole(
          castAct.initialHoles,
          "abilityChoice",
        );
        const cast = resolveBattleSubject({
          state,
          subject: castAct.subject,
          fills: [
            spellTargetFill(castTarget, hexUnitId, casterId, targetId),
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
        hexDamageHoleRider = spellMarkedDamageRider(damage, hexUnitId);
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
            `Expected Hex attack to resolve, got ${damaged.tag}.`,
          );
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
        hexTransferVisibleOnDropTurn = markedDamageTransferActVisible(
          state,
          hexUnitId,
        );
        hexTransferKindOnDropTurn = hexActiveMarkTransferKind(
          hexActiveMarkEffect(state),
        );

        state = advanceMarkedDamageRoundToCasterTurn(state);
        const transferAct = markedDamageTransferAct(state, hexUnitId);
        const transferTarget = requireHole(
          transferAct.initialHoles,
          "targetChoice",
        );
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: transferAct.subject,
            fills: [
              spellTargetFill(
                transferTarget,
                hexUnitId,
                casterId,
                markedDamageTransferTargetId,
              ),
            ],
          }),
          "hex",
        );
      },
      doLongstriderSpeedIncrease: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(longstriderUnitId)],
          sourceClassName: "ranger",
        });
        resetProcedureProjections();

        const act = actionSpellAct(state, longstriderUnitId);
        const target = requireHole(act.initialHoles, "targetChoice");
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [
              spellTargetFill(target, longstriderUnitId, casterId, targetId),
            ],
          }),
          "longstrider",
        );
      },
      doSearingSmiteAfterHitTimedDamageAndSaveCleanup: () => {
        state = level1BuffMarkSmiteBattle({
          preparedSpells: [spellRecord(searingSmiteUnitId)],
        });
        resetProcedureProjections();

        const hit = resolveLongswordHitWithAttackRoll({ state });
        const attackHitWindow = requireAttackHitWindow(hit.afterAttackRoll);
        const searingSmiteChoice = attackHitBonusActionSpellChoice(
          attackHitWindow,
          searingSmiteUnitId,
        );
        const afterSearingSmite = resolveBattleReaction({
          state: attackHitWindow.state,
          fill: reactionDecisionFill(
            requireHole(attackHitWindow.holes, "reactionDecision"),
            {
              kind: "resolve",
              reactorId: casterId,
              choice: {
                kind: "castAttackHitBonusActionSpell",
                invocation: searingSmiteChoice.invocation,
                fills: [],
              },
            },
          ),
        });
        const afterSearingSmiteDamage = requireNeedsHoles(afterSearingSmite);
        const weaponDamage = requireDamageRollHole(afterSearingSmiteDamage);
        const immediateDamage = spellWeaponDamageRider(
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
        recordResolvedResult(
          endTurn({
            state: afterWeaponDamage.state,
            actorId: casterId,
            fills: [
              damageRollFillWithGroups(turnStartDamage, [[4]]),
              savingThrowOutcomeFill(turnStartSave, [
                { targetId, succeeded: true },
              ]),
            ],
          }),
          "searingSmite",
        );
        searingSmiteLifecycle = searingSmiteLifecycleProjection({
          immediateDamage,
          activeBeforeSuccessfulSave,
          turnStartDamage,
          turnStartSave,
          stateAfterSuccessfulSave: state,
        });
      },
      doShillelaghWeaponAttackOverride: () => {
        state = level1BuffMarkSmiteBattle({
          cantrips: [spellRecord(shillelaghUnitId)],
          sourceClassName: "druid",
          attack: zeroAbilityWeaponAttack(shillelaghQuarterstaffUnitId),
        });
        resetProcedureProjections();

        const cast = resolveBattleSubject({
          state,
          subject: bonusActionSpellAct(state, shillelaghUnitId).subject,
          fills: [],
        });
        if (cast.tag !== "resolved") {
          throw new Error(`Expected Shillelagh to resolve, got ${cast.tag}.`);
        }
        state = cast.state;

        const hit = resolveWeaponHitWithAttackRoll({
          state,
          attackName: shillelaghQuarterstaffForceAttackName,
        });
        const damage = requireDamageRollHole(
          requireNeedsHoles(hit.afterAttackRoll),
        );
        shillelaghWeaponAttackOverride =
          shillelaghWeaponAttackOverrideProjection({
            state,
            attackRoll: hit.attackRoll,
            damage,
          });
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: hit.subject,
            fills: [
              hit.targetFill,
              hit.attackFill,
              damageRollFillWithGroups(damage, [[4]]),
            ],
          }),
          "shillelagh",
        );
      },
      doTrueStrikeSpellHostedWeaponAttack: () => {
        state = level1BuffMarkSmiteBattle({
          cantrips: [spellRecord(trueStrikeUnitId)],
          sourceClassName: "wizard",
          attack: zeroAbilityWeaponAttack(trueStrikeDaggerUnitId),
          weaponProficiencies: [
            { kind: "weapon_category", category: "simple" },
          ],
        });
        resetProcedureProjections();

        const act = actionSpellAct(state, trueStrikeUnitId);
        const damageType = requireHole(act.initialHoles, "damageTypeChoice");
        const target = requireHole(act.initialHoles, "targetChoice");
        const damageTypeFill = damageTypeChoiceFill(damageType, "radiant");
        const targetFill = attackTargetFill(target, trueStrikeDaggerAttackName);
        const attackRoll = requireBattleAttackRollHole(
          requireResultHole(
            resolveBattleSubject({
              state,
              subject: act.subject,
              fills: [damageTypeFill, targetFill],
            }),
            "attackRoll",
          ),
        );
        const attackFill = attackRollFill(attackRoll, {
          total: 15,
          naturalD20: 10,
        });
        const damage = requireDamageRollHole(
          requireNeedsHoles(
            resolveBattleSubject({
              state,
              subject: act.subject,
              fills: [damageTypeFill, targetFill, attackFill],
            }),
          ),
        );
        trueStrikeSpellHostedWeaponAttack =
          trueStrikeSpellHostedWeaponAttackProjection({
            state,
            act,
            attackRoll,
            damage,
          });
        recordResolvedResult(
          resolveBattleSubject({
            state,
            subject: act.subject,
            fills: [
              damageTypeFill,
              targetFill,
              attackFill,
              damageRollFillWithGroups(damage, [[4]]),
            ],
          }),
          "trueStrike",
        );
      },
      step: () => {},
      getState: () =>
        projectLevel1BuffMarkSmiteSelectedIdentityState(
          state,
          damageRider,
          huntersMarkDamageHoleRider,
          huntersMarkTransferKindOnDropTurn,
          huntersMarkTransferVisibleOnDropTurn,
          hexDamageHoleRider,
          hexTransferKindOnDropTurn,
          hexTransferVisibleOnDropTurn,
          ensnaringStrikeLifecycle,
          falseLifeTemporaryHitPoints,
          heroismEffects,
          searingSmiteLifecycle,
          shillelaghWeaponAttackOverride,
          trueStrikeSpellHostedWeaponAttack,
          lastResult,
        ),
    };
  });
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

function level1BuffMarkSmiteBattle(
  input: {
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
  } = {},
): BattleState {
  const sourceClassName = input.sourceClassName ?? "paladin";
  const target =
    input.targetKind === "statBlock"
      ? level1BuffMarkSmiteStatBlockCreature({
          combatantId: targetId,
          displayName: "Level 1 buff target",
          initiative: 10,
          side: oppositionSide,
        })
      : level1BuffMarkSmiteCreature({
          combatantId: targetId,
          displayName: "Level 1 buff target",
          initiative: 10,
          side: oppositionSide,
          className: "fighter",
        });
  const result = startBattle({
    battleId: battleId("level1-buff-mark-smite-selected-identity"),
    combatants: [
      level1BuffMarkSmiteCreature({
        combatantId: casterId,
        displayName: "Level 1 buff caster",
        initiative: 20,
        side: partySide,
        attack: input.attack ?? zeroAbilityLongswordAttack(),
        className: sourceClassName,
        ...(input.weaponProficiencies === undefined
          ? {}
          : { weaponProficiencies: input.weaponProficiencies }),
        spellcasting: {
          sourceClassName,
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: input.cantrips ?? [],
          preparedSpells: input.preparedSpells ?? [],
          featurePreparedSpells: [],
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
              side: oppositionSide,
            }),
          ]
        : []),
    ],
  });
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function level1BuffMarkSmiteCreature(input: {
  readonly combatantId: CombatantId;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
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
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${input.combatantId}-character`),
      characterUnitRefs: [],
      classLevels: [{ className, level: 1 }],
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
      selectedLoadout:
        attack === null
          ? {}
          : {
              weapon: {
                itemId: `main:${attack.weapon.id}`,
                unitId: attack.weapon.id,
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
  readonly side: typeof partySide | typeof oppositionSide;
}): BattleCreatureInit {
  const statBlock = statBlockLibrary.requireStatBlock(
    "stat_block_goblin_warrior",
  );
  const maxHp = statBlockHp(statBlock);
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "statBlock",
      statBlock,
      currentHp: maxHp,
      maxHp,
      tempHp: Hp(0),
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

function bonusActionSpellAct(
  state: BattleState,
  spellId: BonusActionCastSpellId,
): BonusActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is BonusActionSpellAct =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Bonus Action Spell act.`);
  }
  return act;
}

function actionSpellAct(
  state: BattleState,
  spellId: ActionCastSpellId,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.invocation.spellId === spellId,
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} Action Spell act.`);
  }
  return act;
}

function resolveLongswordHit(input: { readonly state: BattleState }): {
  readonly damageRider: NonNullable<
    BattleDamageRollHole["spellWeaponDamageRiders"]
  >[number];
  readonly result: BattleResolutionResult;
} {
  const hit = resolveLongswordHitWithAttackRoll(input);
  const damage = requireDamageRollHole(requireNeedsHoles(hit.afterAttackRoll));
  const damageRider = spellWeaponDamageRider(damage, divineFavorUnitId);
  return {
    damageRider,
    result: resolveBattleSubject({
      state: input.state,
      subject: hit.subject,
      fills: [
        hit.targetFill,
        hit.attackFill,
        damageRollFillWithGroups(damage, [[4], [3]]),
      ],
    }),
  };
}

function resolveLongswordHitWithAttackRoll(input: {
  readonly state: BattleState;
}): ReturnType<typeof resolveWeaponHitWithAttackRoll> {
  return resolveWeaponHitWithAttackRoll({
    state: input.state,
    attackName: "Longsword",
  });
}

type Level1WeaponAttackName =
  | "Longsword"
  | typeof trueStrikeDaggerAttackName
  | typeof shillelaghQuarterstaffForceAttackName;

function resolveWeaponHitWithAttackRoll(input: {
  readonly state: BattleState;
  readonly attackName: Level1WeaponAttackName;
}): {
  readonly subject: Extract<BattleSubject, { readonly tag: "action" }>;
  readonly targetFill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
  readonly attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
  readonly attackRoll: BattleAttackRollHole;
  readonly afterAttackRoll: BattleResolutionResult;
} {
  const subject = weaponAttackSubject(input.attackName);
  const target = requireResultHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  const targetFill = attackTargetFill(target, input.attackName);
  const attack = requireBattleAttackRollHole(
    requireResultHole(
      resolveBattleSubject({
        state: input.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    ),
  );
  const attackFill = attackRollFill(attack, {
    total: 15,
    naturalD20: 10,
  });
  return {
    subject,
    targetFill,
    attackFill,
    attackRoll: attack,
    afterAttackRoll: resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetFill, attackFill],
    }),
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
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(0),
  };
}

function weaponAttackSubject(
  attackName: Level1WeaponAttackName,
): Extract<BattleSubject, { readonly tag: "action" }> {
  return {
    tag: "action",
    actorId: casterId,
    action: "attack",
    attackName,
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  attackName: Level1WeaponAttackName,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: casterId,
        targetId,
        attackName,
      },
    ],
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: Level1BuffMarkSmiteSpellId,
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
        spellId,
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

function damageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
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

function reactionDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "reactionDecision" }>,
  value: Extract<BattleFill, { readonly kind: "reactionDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "reactionDecision" }> {
  return { kind: "reactionDecision", holeId: hole.holeId, value };
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
  hole: BattleDamageRollHole,
  spellId: SpellWeaponDamageRiderSourceSpellId,
): NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number] {
  const rider = hole.spellWeaponDamageRiders?.find(
    (candidate) => candidate.sourceSpellId === spellId,
  );
  if (rider === undefined) {
    throw new Error(`Expected ${spellId} spell weapon damage rider.`);
  }
  return rider;
}

function spellMarkedDamageRider(
  hole: BattleDamageRollHole,
  spellId: MarkedDamageRiderSourceSpellId,
): NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number] {
  const rider = hole.spellMarkedDamageRiders?.find(
    (candidate) => candidate.sourceSpellId === spellId,
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
  return (
    "spell" in hole &&
    hole.spell.procedure === "scalarBuff" &&
    hole.spell.effect.kind === "temporaryHitPoints"
  );
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
    result.snapshot.pendingReaction?.trigger !== "attackHit"
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
    throw new Error(`${message} Got ${result.tag}.`);
  }
  return result;
}

function markedDamageTransferActVisible(
  state: BattleState,
  spellId: MarkedDamageRiderSourceSpellId,
): boolean {
  return discoverBattleActs(state).some((candidate) =>
    isMarkedDamageTransferAct(candidate, spellId),
  );
}

function markedDamageTransferAct(
  state: BattleState,
  spellId: MarkedDamageRiderSourceSpellId,
): BonusActionSpellAct {
  const act = discoverBattleActs(state).find((candidate) =>
    isMarkedDamageTransferAct(candidate, spellId),
  );
  if (act === undefined) {
    throw new Error(`Expected ${spellId} marked damage transfer act.`);
  }
  return act;
}

function isMarkedDamageTransferAct(
  candidate: AvailableBattleAct,
  spellId: MarkedDamageRiderSourceSpellId,
): candidate is BonusActionSpellAct {
  return (
    candidate.subject.tag === "bonusActionSpell" &&
    candidate.subject.invocation.tag === "spellEffect" &&
    candidate.subject.invocation.spellId === spellId
  );
}

function attackHitBonusActionSpellChoice(
  result: Extract<BattleResolutionResult, { readonly tag: "needsHoles" }>,
  spellId: AttackHitBonusActionSpellId,
): Extract<
  BattleReactionProcedureChoice,
  { readonly kind: "castAttackHitBonusActionSpell" }
> {
  const choice = result.snapshot.pendingReaction?.choices.find(
    (
      candidate,
    ): candidate is Extract<
      BattleReactionProcedureChoice,
      { readonly kind: "castAttackHitBonusActionSpell" }
    > =>
      candidate.kind === "castAttackHitBonusActionSpell" &&
      candidate.reactorId === casterId &&
      candidate.invocation.spellId === spellId,
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
  const act = discoverBattleActs(state).find(
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
        effect.sourceSpellId === ensnaringStrikeUnitId &&
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
  return "spell" in hole && hole.spell.spell.id === ensnaringStrikeUnitId
    ? ensnaringStrikeUnitId
    : "none";
}

function ensnaringStrikeTurnStartDamageSourceSpellId(
  hole: BattleSpellTurnStartDamageRollHole,
): EnsnaringStrikeSourceSpellId {
  return hole.spellTurnStartDamage.sourceSpellId === ensnaringStrikeUnitId
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
      effect.sourceSpellId === searingSmiteUnitId &&
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
    sourceSpellId: rider.sourceSpellId,
    damageType: rider.damage.damageType,
    dice: rider.damage.expr.dice,
    dieSize: rider.damage.expr.dieSize,
  });
}

function searingSmiteTurnStartDamageProjection(
  hole: BattleSpellTurnStartDamageRollHole,
): SearingSmiteDamageProjection {
  return searingSmiteDamageProjection({
    sourceSpellId: hole.spellTurnStartDamage.sourceSpellId,
    damageType: hole.spellTurnStartDamage.damage.damageType,
    dice: hole.spellTurnStartDamage.damage.expr.dice,
    dieSize: hole.spellTurnStartDamage.damage.expr.dieSize,
  });
}

function searingSmiteDamageProjection(input: {
  readonly sourceSpellId: string;
  readonly damageType: string;
  readonly dice: number;
  readonly dieSize: number;
}): SearingSmiteDamageProjection {
  if (input.sourceSpellId !== searingSmiteUnitId) {
    throw new Error(
      `Unexpected Searing Smite source spell id ${input.sourceSpellId}.`,
    );
  }
  if (input.damageType !== "fire") {
    throw new Error(
      `Unexpected Searing Smite damage type ${input.damageType}.`,
    );
  }
  return {
    sourceSpellId: searingSmiteUnitId,
    damageType: "fire",
    dice: input.dice,
    dieSize: input.dieSize,
  };
}

function searingSmiteTurnStartSaveProjection(
  hole: BattleSpellTurnStartSavingThrowOutcomeHole,
): SearingSmiteTurnStartSaveProjection {
  const save = hole.spellTurnStartSave.save;
  if (hole.spellTurnStartSave.sourceSpellId !== searingSmiteUnitId) {
    throw new Error(
      `Unexpected Searing Smite source spell id ${hole.spellTurnStartSave.sourceSpellId}.`,
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
    sourceSpellId: searingSmiteUnitId,
    ability: "con",
    successEnds: "spell",
  };
}

function shillelaghWeaponAttackOverrideProjection(input: {
  readonly state: BattleState;
  readonly attackRoll: BattleAttackRollHole;
  readonly damage: BattleDamageRollHole;
}): ShillelaghWeaponAttackOverrideProjection {
  const effect = shillelaghWeaponAttackOverrideEffect(input.state);
  if (effect === undefined) {
    throw new Error("Expected Shillelagh weapon attack override effect.");
  }
  return {
    tag: "quarterstaffForceAttack",
    sourceSpellId: shillelaghRequiredSourceSpellId(effect),
    weaponUnitId: shillelaghEffectWeaponUnitId(input.state, effect),
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
      effect.sourceSpellId === shillelaghUnitId &&
      effect.sourceCombatantId === casterId,
  );
}

function shillelaghRequiredSourceSpellId(
  effect: ShillelaghWeaponAttackOverrideEffect,
): typeof shillelaghUnitId {
  if (effect.sourceSpellId === shillelaghUnitId) {
    return shillelaghUnitId;
  }
  throw new Error(
    `Unexpected Shillelagh source spell id ${effect.sourceSpellId}.`,
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
  const attackName = attackRoll.attack.weapon.name;
  if (attackName !== shillelaghQuarterstaffForceAttackName) {
    throw new Error(`Unexpected Shillelagh attack name ${attackName}.`);
  }
  if (damage.attack.weapon.name !== attackName) {
    throw new Error(
      `Expected Shillelagh damage attack ${damage.attack.weapon.name} to match ${attackName}.`,
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
    attackName,
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
  readonly state: BattleState;
  readonly act: ActionSpellAct;
  readonly attackRoll: BattleAttackRollHole;
  readonly damage: BattleDamageRollHole;
}): TrueStrikeSpellHostedWeaponAttackProjection {
  return {
    tag: "materialDaggerRadiantAttack",
    sourceSpellId: trueStrikeRequiredSourceSpellId(input.act),
    componentWeaponItemId: trueStrikeComponentWeaponItemId(input.act),
    weaponUnitId: trueStrikeWeaponUnitId(input.state, input.act),
    ...trueStrikeRadiantAttackProjection(input.attackRoll, input.damage),
  };
}

function trueStrikeRequiredSourceSpellId(
  act: ActionSpellAct,
): typeof trueStrikeUnitId {
  if (
    act.subject.invocation.spellId === trueStrikeUnitId &&
    act.subject.invocation.procedure === "spellHostedWeaponAttack"
  ) {
    return trueStrikeUnitId;
  }
  throw new Error(
    `Unexpected True Strike invocation ${act.subject.invocation.spellId}.`,
  );
}

function trueStrikeComponentWeaponItemId(
  act: ActionSpellAct,
): TrueStrikeDaggerItemId {
  if (act.subject.componentWeaponItemId === trueStrikeDaggerItemId) {
    return trueStrikeDaggerItemId;
  }
  throw new Error(
    `Unexpected True Strike component weapon item ${act.subject.componentWeaponItemId}.`,
  );
}

function trueStrikeWeaponUnitId(
  state: BattleState,
  act: ActionSpellAct,
): TrueStrikeDaggerUnitId {
  const selectedWeaponUnitId = selectedLoadoutWeaponUnitIdForItem({
    state,
    itemId: trueStrikeComponentWeaponItemId(act),
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
  const attackName = attackRoll.attack.weapon.name;
  if (attackName !== trueStrikeDaggerAttackName) {
    throw new Error(`Unexpected True Strike attack name ${attackName}.`);
  }
  if (damage.attack.weapon.name !== attackName) {
    throw new Error(
      `Expected True Strike damage attack ${damage.attack.weapon.name} to match ${attackName}.`,
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
    attackName,
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
  state: BattleState,
  damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined,
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
  ensnaringStrikeLifecycle: EnsnaringStrikeLifecycleProjection,
  falseLifeTemporaryHitPoints: FalseLifeTemporaryHitPointsProjection,
  heroismEffects: HeroismEffectsProjection,
  searingSmiteLifecycle: SearingSmiteLifecycleProjection,
  shillelaghWeaponAttackOverride: ShillelaghWeaponAttackOverrideProjection,
  trueStrikeSpellHostedWeaponAttack: TrueStrikeSpellHostedWeaponAttackProjection,
  lastResult: Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"],
): Level1BuffMarkSmiteSelectedIdentityProjection {
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
    ...longstriderSpeedEffectProjection(state),
    casterTempHp: caster.tempHp,
    casterFrightened: snapshotHasCondition(caster.conditions, "frightened"),
    spellSlotSpentThisTurn:
      state.currentTurnResources.spellSlotUsesThisTurn.some((use) => use.kind === "committed"),
    level1SlotsRemaining: level1SlotsRemaining(state),
    divineFavorActiveRiderCount: divineFavorActiveRiderCount(state),
    damageRiderSourceSpellId: damageRiderSourceSpellId(damageRider),
    damageRiderDamageType:
      damageRider?.damage.damageType === "radiant" ? "radiant" : "none",
    damageRiderDice: damageRider?.damage.expr.dice ?? 0,
    damageRiderDieSize: damageRider?.damage.expr.dieSize ?? 0,
    ...falseLifeTemporaryHitPoints,
    ...heroismEffects,
    targetRestrained: snapshotHasCondition(target.conditions, "restrained"),
    casterConcentrating: caster.concentrating,
    ...ensnaringStrikeLifecycle,
    ...huntersMarkDamageHoleProjection(huntersMarkDamageHoleRider),
    ...huntersMarkActiveMarkProjection(state),
    huntersMarkTransferKindOnDropTurn,
    huntersMarkTransferVisibleOnDropTurn,
    ...hexDamageHoleProjection(hexDamageHoleRider),
    ...hexActiveMarkProjection(state),
    hexTransferKindOnDropTurn,
    hexTransferVisibleOnDropTurn,
    searingSmiteLifecycle,
    shillelaghWeaponAttackOverride,
    trueStrikeSpellHostedWeaponAttack,
    lastResult,
  };
}

function falseLifeTemporaryHitPointsProjection(
  hole: ScalarBuffTemporaryHitPointsRollHole,
): FalseLifeTemporaryHitPointsProjection {
  const expr = hole.spell.effect.amount.expr;
  return {
    temporaryHitPointsSourceSpellId: temporaryHitPointsSourceSpellId(hole),
    temporaryHitPointsDice: expr.dice,
    temporaryHitPointsDieSize: expr.dieSize,
    temporaryHitPointsFlat: expr.flat ?? 0,
  };
}

function temporaryHitPointsSourceSpellId(
  hole: ScalarBuffTemporaryHitPointsRollHole,
): TemporaryHitPointsSourceSpellId {
  if (hole.spell.spell.id === falseLifeUnitId) {
    return falseLifeUnitId;
  }
  throw new Error(
    `Unexpected Temporary Hit Points spell id ${hole.spell.spell.id}.`,
  );
}

function heroismEffectsProjection(
  state: BattleState,
): HeroismEffectsProjection {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Heroism caster.");
  }
  const frightenedImmunity = caster.activeEffects.find(
    (effect): effect is HeroismFrightenedImmunityEffect =>
      effect.kind === "conditionImmunity" &&
      effect.sourceSpellId === heroismUnitId &&
      effect.sourceCombatantId === casterId,
  );
  const turnStartTemporaryHitPoints = caster.activeEffects.find(
    (effect): effect is HeroismTurnStartTemporaryHitPointsEffect =>
      effect.kind === "turnStartTemporaryHitPoints" &&
      effect.sourceSpellId === heroismUnitId &&
      effect.sourceCombatantId === casterId,
  );
  return {
    frightenedImmunitySourceSpellId: heroismSourceSpellId(frightenedImmunity),
    frightenedImmunityCondition:
      heroismFrightenedImmunityCondition(frightenedImmunity),
    turnStartTemporaryHitPointsSourceSpellId: heroismSourceSpellId(
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
  effect: { readonly sourceSpellId: string } | undefined,
): HeroismSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (effect.sourceSpellId === heroismUnitId) {
    return heroismUnitId;
  }
  throw new Error(
    `Unexpected Heroism source spell id ${effect.sourceSpellId}.`,
  );
}

function longstriderSpeedEffectProjection(
  state: BattleState,
): Pick<
  Level1BuffMarkSmiteSelectedIdentityProjection,
  | "longstriderSpeedEffectSourceSpellId"
  | "longstriderSpeedEffectTarget"
  | "longstriderSpeedDeltaFeet"
> {
  const trackedEffect = longstriderSpeedEffect(state);
  return {
    longstriderSpeedEffectSourceSpellId: longstriderSourceSpellId(
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
      candidate.sourceSpellId === longstriderUnitId &&
      candidate.sourceCombatantId === casterId,
  );
  return effect === undefined ? undefined : { target: "target", effect };
}

function longstriderSourceSpellId(
  effect: { readonly sourceSpellId: string } | undefined,
): LongstriderSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (effect.sourceSpellId === longstriderUnitId) {
    return longstriderUnitId;
  }
  throw new Error(
    `Unexpected Longstrider source spell id ${effect.sourceSpellId}.`,
  );
}

function huntersMarkDamageHoleProjection(
  rider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined,
): HuntersMarkDamageHoleProjection {
  return {
    huntersMarkDamageHoleSourceSpellId: huntersMarkSourceSpellId(rider),
    huntersMarkDamageHoleDamageType:
      rider?.damage.damageType === "force" ? "force" : "none",
    huntersMarkDamageHoleDice: rider?.damage.expr.dice ?? 0,
    huntersMarkDamageHoleDieSize: rider?.damage.expr.dieSize ?? 0,
  };
}

function huntersMarkActiveMarkProjection(
  state: BattleState,
): HuntersMarkActiveMarkProjection {
  const effect = huntersMarkActiveMarkEffect(state);
  return {
    huntersMarkActiveMarkSourceSpellId: huntersMarkSourceSpellId(effect),
    huntersMarkActiveMarkTarget: huntersMarkActiveMarkTarget(effect),
    huntersMarkConcentrationSourceSpellId:
      effect === undefined
        ? "none"
        : huntersMarkConcentrationSourceSpellId(state),
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
      effect.sourceSpellId === huntersMarkUnitId &&
      effect.sourceCombatantId === casterId,
  );
}

function huntersMarkSourceSpellId(
  effect: { readonly sourceSpellId: string } | undefined,
): HuntersMarkSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (effect.sourceSpellId === huntersMarkUnitId) {
    return huntersMarkUnitId;
  }
  throw new Error(
    `Unexpected Hunter's Mark source spell id ${effect.sourceSpellId}.`,
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
  state: BattleState,
): HuntersMarkSourceSpellId {
  const caster = state.combatants.get(casterId);
  if (caster === undefined) {
    throw new Error("Expected Hunter's Mark caster.");
  }
  if (caster.concentration === null) {
    return "none";
  }
  if (caster.concentration.sourceSpellId === huntersMarkUnitId) {
    return huntersMarkUnitId;
  }
  throw new Error(
    `Unexpected Hunter's Mark Concentration source spell id ${caster.concentration.sourceSpellId}.`,
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
  rider:
    | NonNullable<BattleDamageRollHole["spellMarkedDamageRiders"]>[number]
    | undefined,
): HexDamageHoleProjection {
  return {
    hexDamageHoleSourceSpellId: hexSourceSpellId(rider),
    hexDamageHoleDamageType:
      rider?.damage.damageType === "necrotic" ? "necrotic" : "none",
    hexDamageHoleDice: rider?.damage.expr.dice ?? 0,
    hexDamageHoleDieSize: rider?.damage.expr.dieSize ?? 0,
  };
}

function hexActiveMarkProjection(state: BattleState): HexActiveMarkProjection {
  const effect = hexActiveMarkEffect(state);
  return {
    hexActiveMarkSourceSpellId: hexSourceSpellId(effect),
    hexActiveMarkTarget: hexActiveMarkTarget(effect),
    hexAbilityCheckAbility: hexAbilityCheckAbility(effect),
    hexActiveMarkTransferKind: hexActiveMarkTransferKind(effect),
    hexActiveMarkRetargetTiming: hexActiveMarkRetargetTiming(effect),
  };
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
      effect.sourceSpellId === hexUnitId &&
      effect.sourceCombatantId === casterId,
  );
}

function hexSourceSpellId(
  effect: { readonly sourceSpellId: string } | undefined,
): HexSourceSpellId {
  if (effect === undefined) {
    return "none";
  }
  if (effect.sourceSpellId === hexUnitId) {
    return hexUnitId;
  }
  throw new Error(`Unexpected Hex source spell id ${effect.sourceSpellId}.`);
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

function damageRiderSourceSpellId(
  damageRider:
    | NonNullable<BattleDamageRollHole["spellWeaponDamageRiders"]>[number]
    | undefined,
): Level1BuffMarkSmiteSelectedIdentityProjection["damageRiderSourceSpellId"] {
  if (damageRider === undefined) {
    return "none";
  }
  if (isDamageRiderSourceSpellId(damageRider.sourceSpellId)) {
    return damageRider.sourceSpellId;
  }
  throw new Error(
    `Unexpected damage rider source spell id ${damageRider.sourceSpellId}.`,
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
          effect.sourceSpellId === divineFavorUnitId,
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
  const state = quintStateRecord(raw);
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
    lastResult: mbtLastResult(state["qLastResult"]),
  };
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    throw new Error("Expected Quint state record.");
  }
  return Object.fromEntries(Object.entries(raw));
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") return raw;
  if (typeof raw === "bigint") return Number(raw);
  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  const value = state[field];
  if (typeof value === "boolean") return value;
  throw new Error(`Expected Quint boolean field ${field}.`);
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
      sourceSpellId: searingSmiteRequiredSourceSpellIdFromQuint(
        immediateSource,
        "immediate damage",
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
      sourceSpellId: searingSmiteRequiredSourceSpellIdFromQuint(
        state["qSearingSmiteTurnStartDamageSourceSpellId"],
        "turn-start damage",
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
      sourceSpellId: searingSmiteRequiredSourceSpellIdFromQuint(
        state["qSearingSmiteTurnStartSaveSourceSpellId"],
        "turn-start save",
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
    componentWeaponItemId: trueStrikeComponentWeaponItemIdFromQuint(
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

function trueStrikeComponentWeaponItemIdFromQuint(
  raw: unknown,
): TrueStrikeDaggerItemId {
  if (raw === trueStrikeDaggerItemId) {
    return trueStrikeDaggerItemId;
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

function mbtLastResult(
  raw: unknown,
): Level1BuffMarkSmiteSelectedIdentityProjection["lastResult"] {
  if (
    raw === "init" ||
    raw === "divineFavor" ||
    raw === "divineSmite" ||
    raw === "ensnaringStrike" ||
    raw === "falseLife" ||
    raw === "heroism" ||
    raw === "huntersMark" ||
    raw === "hex" ||
    raw === "longstrider" ||
    raw === "searingSmite" ||
    raw === "shillelagh" ||
    raw === "trueStrike"
  ) {
    return raw;
  }
  throw new Error(`Unexpected MBT result ${String(raw)}.`);
}

const level1BuffMarkSmiteSelectedIdentityStateCheck = stateCheck(
  normalizeLevel1BuffMarkSmiteSelectedIdentityQuintState,
  (
    spec: Level1BuffMarkSmiteSelectedIdentityProjection,
    impl: Level1BuffMarkSmiteSelectedIdentityProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
