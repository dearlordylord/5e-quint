// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.attack-action-attack-count-scaling unit-feature.attack-damage-reduction-zero-damage-redirect unit-feature.bonus-action-dash-temporary-hit-points spell.invocation-beam-sequence spell.invocation-sleep-repeat-save-lifecycle spell.scalar-buff
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either, Match } from "effect";
import { describe, expect, it } from "vitest";

import {
  armorClass,
  defaultArmorClassState,
} from "@dnd/shared-algebras/armor-class-algebra";
import {
  DieRollResult,
  Hp,
  abilityModifier,
  attackBonus,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import eldritchBlastInput from "../../surface/content/eldritch_blast.json";
import magicMissileInput from "../../surface/content/magic_missile.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  battleUnitRefWithSupportProfiles,
  battleId,
  battleCombatantSide,
  battleObjectId,
  breakBattleConcentration,
  cantripSpellInvocationRef,
  characterBattleResourceUsage,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  objectInvisibleBenefitDenied,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleLightEmitter,
  type BattleLightEmitterAttachment,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

type MbtHole =
  | "TargetChoice"
  | "ObjectTargetChoice"
  | "SpellTargetAllocation"
  | "SavingThrowOutcome"
  | "AttackRoll"
  | "DamageRoll"
  | "SpellDamageRoll"
  | "DeathSavingThrow"
  | "StatBlockRechargeRoll";
type MbtLastResult = "init" | "needsHoles" | "resolved" | "invalid";
type MbtLastInvalidReason = "" | "invalidFill" | "staleSubject" | "wrongActor";
type DeathSavingThrowMbtTurnRole = "actor" | "target";

type MbtProjection = {
  readonly skeletonHp: number;
  readonly skeletonDead: boolean;
  readonly actionAvailable: boolean;
  readonly multiattackDispatchesAvailable: number;
  readonly sneakAttackUsedThisTurn: boolean;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type DeathSavingThrowMbtProjection = {
  readonly currentTurnRole: DeathSavingThrowMbtTurnRole;
  readonly targetHp: number;
  readonly targetUnconscious: boolean;
  readonly targetStable: boolean;
  readonly targetDead: boolean;
  readonly targetDeathSuccesses: number;
  readonly targetDeathFailures: number;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type ExtraAttackMbtProjection = {
  readonly skeletonHp: number;
  readonly actionAvailable: boolean;
  readonly extraAttackSlotsAvailable: number;
  readonly movementSpentFeet: number;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type AdrenalineRushMbtProjection = {
  readonly actorTempHp: number;
  readonly bonusActionAvailable: boolean;
  readonly dashBonusFeet: number;
  readonly featureUsesRemaining: number;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type ScalarBuffMbtProjection = {
  readonly fighterSpeed: number;
  readonly goblinSpeed: number;
  readonly actionAvailable: boolean;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type ObjectDamageMbtProjection =
  | { readonly tag: "none" }
  | {
      readonly tag: "hitPoints";
      readonly rolledDamage: number;
      readonly effectiveDamage: number;
      readonly nextHitPoints: number;
      readonly destroyed: boolean;
    };
type LightEmitterAttachmentMbtProjection =
  | {
      readonly kind: "combatant";
      readonly combatantId: string;
    }
  | {
      readonly kind: "object";
      readonly objectId: string;
    };
type LightEmissionMbtProjection =
  | {
      readonly kind: "dim";
      readonly radiusFeet: number;
    }
  | {
      readonly kind: "brightAndDim";
      readonly brightRadiusFeet: number;
      readonly dimAdditionalFeet: number;
    };
type LightEmitterExpirationMbtProjection =
  | {
      readonly kind: "startOfTurn";
      readonly combatantId: string;
    }
  | {
      readonly kind: "endOfTurn";
      readonly combatantId: string;
      readonly round: number;
    }
  | {
      readonly kind: "concentration";
      readonly combatantId: string;
    }
  | {
      readonly kind: "duration";
      readonly durationTicks: number;
    };
type LightEmitterMbtProjection =
  | {
      readonly kind: "spellLightEmitter";
      readonly sourceSpellId: string;
      readonly sourceCombatantId: string;
      readonly attachment: LightEmitterAttachmentMbtProjection;
      readonly emission: LightEmissionMbtProjection;
      readonly expiresAt: LightEmitterExpirationMbtProjection;
    }
  | {
      readonly kind: "objectInvisibleRevealLightEmitter";
      readonly sourceSpellId: string;
      readonly sourceCombatantId: string;
      readonly objectId: string;
      readonly emission: Extract<
        LightEmissionMbtProjection,
        { readonly kind: "dim" }
      >;
      readonly expiresAt: Extract<
        LightEmitterExpirationMbtProjection,
        { readonly kind: "endOfTurn" }
      >;
    };

type StarryWispObjectMbtProjection = {
  readonly actionAvailable: boolean;
  readonly holes: readonly MbtHole[];
  readonly objectDamage: ObjectDamageMbtProjection;
  readonly lightEmitters: readonly LightEmitterMbtProjection[];
  readonly objectInvisibleBenefitDenied: boolean;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type EldritchBlastMbtProjection = {
  readonly actionAvailable: boolean;
  readonly targetHp: number;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

type SleepRepeatSaveMbtTurnRole = "caster" | "target";

type SleepRepeatSaveMbtProjection = {
  readonly currentTurnRole: SleepRepeatSaveMbtTurnRole;
  readonly targetIncapacitated: boolean;
  readonly targetUnconscious: boolean;
  readonly targetProne: boolean;
  readonly casterConcentrating: boolean;
  readonly actionAvailable: boolean;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

const fighterId = combatantId("fighter");
const skeletonId = combatantId("skeleton");
const deathSavingThrowTargetId = combatantId("death-saving-throw-target");
const starryWispObjectId = battleObjectId("starry-wisp-object");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const statBlockCatalogResult = buildStatBlockCatalog({
  collections: [srdStatBlockCollection],
});
const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});

if (statBlockCatalogResult.tag !== "ok" || unitCatalogResult.tag !== "ok") {
  throw new Error("Battle runtime MBT catalogs must build successfully.");
}

const statBlockCatalog = statBlockCatalogResult.catalog;
const unitLibrary = unitCatalogResult.catalog;
const magicMissileUnit = decodeUnitRecordSync(magicMissileInput);
if (magicMissileUnit.kind !== "spell") {
  throw new Error("Expected Magic Missile content to decode as a spell Unit.");
}
const magicMissileSpell = magicMissileUnit satisfies SpellRecord;
const sleepUnit = unitLibrary.requireUnit("sleep");
if (sleepUnit.kind !== "spell") {
  throw new Error("Expected Sleep content to decode as a spell Unit.");
}
const sleepSpell = sleepUnit satisfies SpellRecord;

const driverSchema = {
  init: {},
  doDiscoverAttack: {},
  doFillTarget: {},
  doRejectWrongTarget: {},
  doFillAttackRollMiss: {},
  doFillAttackRollHit: {},
  doFillDamageLow: {},
  doFillDamageHigh: {},
  doFillDamageLowSneakAttack: {},
  doFillDamageHighSneakAttack: {},
  doRejectStaleAfterResolved: {},
  doStartSkeletonTurn: {},
  doResolveSkeletonMultiattack: {},
  doRejectRecursiveSkeletonMultiattack: {},
  doSpendSkeletonMultiattackDispatch: {},
  step: {},
} as const;

const deathSavingThrowDriverSchema = {
  init: {},
  doDiscoverEndTurnDeathSavingThrow: {},
  doFillDeathSavingThrowNaturalOne: {},
  doFillDeathSavingThrowFailure: {},
  doFillDeathSavingThrowSuccess: {},
  doFillDeathSavingThrowNaturalTwenty: {},
  doRejectWrongActorEndTurnAfterResolved: {},
  step: {},
} as const;

const magicMissileDriverSchema = {
  init: {},
  doFillMagicMissileAllocation: {},
  doFillMagicMissileDamageLow: {},
  doFillMagicMissileDamageHigh: {},
  step: {},
} as const;

const extraAttackDriverSchema = {
  init: {},
  doResolveFirstExtraAttackMiss: {},
  doMoveBetweenExtraAttackSlots: {},
  doResolveSecondExtraAttackMiss: {},
  doRejectThirdExtraAttack: {},
  doEndTurnClosesExtraAttackSlot: {},
  step: {},
} as const;

const adrenalineRushDriverSchema = {
  init: {},
  doAdrenalineRushDash: {},
  doRejectSecondDash: {},
  step: {},
} as const;

const scalarBuffDriverSchema = {
  init: {},
  doFillLongstriderTarget: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

const starryWispObjectDriverSchema = {
  init: {},
  doFillObjectTarget: {},
  doRejectObjectWithoutFact: {},
  doFillObjectAttackRollMiss: {},
  doFillObjectAttackRollHit: {},
  doFillObjectDamageLow: {},
  doFillObjectDamageHigh: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

const eldritchBlastDriverSchema = {
  init: {},
  doFillTwoCreatureTargets: {},
  doFillFirstAttackMiss: {},
  doFillFirstAttackHit: {},
  doFillFirstDamageLow: {},
  doFillSecondAttackMiss: {},
  doFillSecondAttackHit: {},
  doFillSecondDamageLow: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

const sleepRepeatSaveDriverSchema = {
  init: {},
  doFillInitialSaveFailure: {},
  doBreakConcentrationBeforeRepeat: {},
  doEndCasterTurn: {},
  doEndCasterTurnAfterConcentrationBreak: {},
  doEndTargetTurnAfterConcentrationBreak: {},
  doDiscoverRepeatSave: {},
  doFillRepeatSaveSuccess: {},
  doFillRepeatSaveFailure: {},
  step: {},
} as const;

function createBattleRuntimeDriver() {
  return defineDriver(driverSchema, () => {
    let state = fighterVsSkeletonBattle();
    let subject: BattleSubject = fighterAttackSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverAttackHoles(state, subject);
    let lastResult: MbtProjection["lastResult"] = "init";
    let lastInvalidReason: MbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      subject = fighterAttackSubject();
      fills = [];
      holes = discoverAttackHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doDiscoverAttack: () => {
        subject = fighterAttackSubject();
        holes = discoverAttackHoles(state, subject);
        lastResult = "needsHoles";
        lastInvalidReason = "";
      },
      doFillTarget: () => {
        const target = requireHole(holes, "targetChoice");
        submit([targetFill(target, skeletonId)]);
      },
      doRejectWrongTarget: () => {
        const target = requireHole(holes, "targetChoice");
        submit([targetFill(target, fighterId)]);
      },
      doFillAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 13, naturalD20: 9 }),
        ]);
      },
      doFillAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, {
            total: 14,
            naturalD20: 10,
            rollMode: "advantage",
          }),
        ]);
      },
      doFillDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFill(damage, 2)]);
      },
      doFillDamageHigh: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFill(damage, 4)]);
      },
      doFillDamageLowSneakAttack: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([
          ...fills,
          damageRollFillWithGroups(damage, [[2], [2]], ["rogue_sneak_attack"]),
        ]);
      },
      doFillDamageHighSneakAttack: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([
          ...fills,
          damageRollFillWithGroups(damage, [[4], [4]], ["rogue_sneak_attack"]),
        ]);
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doStartSkeletonTurn: () => {
        subject = endTurnSubject();
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doResolveSkeletonMultiattack: () => {
        subject = skeletonMultiattackSubject();
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doRejectRecursiveSkeletonMultiattack: () => {
        subject = skeletonMultiattackSubject();
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doSpendSkeletonMultiattackDispatch: () => {
        subject = skeletonShortswordSubject();
        const target = requireHole(
          discoverAttackHoles(state, subject),
          "targetChoice",
        );
        const targetChoice = targetFill(target, fighterId);
        const attackRoll = requireHole(
          holesAfterFills(state, subject, [targetChoice]),
          "attackRoll",
        );
        fills = [
          targetChoice,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createExtraAttackDriver() {
  return defineDriver(extraAttackDriverSchema, () => {
    let state = extraAttackBattle();
    let subject: BattleSubject = fighterAttackSubject();
    let lastResult: ExtraAttackMbtProjection["lastResult"] = "init";
    let lastInvalidReason: ExtraAttackMbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = extraAttackBattle();
      subject = fighterAttackSubject();
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function resolveAttackMiss(): void {
      subject = fighterAttackSubject();
      const target = requireHole(
        discoverAttackHoles(state, subject),
        "targetChoice",
      );
      const targetChoice = targetFill(target, skeletonId);
      const attackRoll = requireHole(
        holesAfterFills(state, subject, [targetChoice]),
        "attackRoll",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetChoice,
            attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
          ],
        }),
      );
    }

    return {
      init: reset,
      doResolveFirstExtraAttackMiss: resolveAttackMiss,
      doMoveBetweenExtraAttackSlots: () => {
        subject = moveSubject();
        const result = resolveBattleSubject({ state, subject, fills: [] });
        if (result.tag !== "needsHoles") {
          recordResult(result);
          return;
        }
        const movement = requireHole(result.holes, "movement");
        recordResult(
          resolveBattleSubject({
            state,
            subject,
            fills: [movementFill(movement, { movementCostFeet: 5 })],
          }),
        );
      },
      doResolveSecondExtraAttackMiss: resolveAttackMiss,
      doRejectThirdExtraAttack: () => {
        subject = fighterAttackSubject();
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
      },
      doEndTurnClosesExtraAttackSlot: () => {
        subject = endTurnSubject();
        recordResult(resolveBattleSubject({ state, subject, fills: [] }));
      },
      step: () => {},
      getState: () =>
        projectExtraAttackMbtState({
          state,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createMagicMissileDriver() {
  return defineDriver(magicMissileDriverSchema, () => {
    let state = fighterVsSkeletonBattle();
    const subject = magicMissileSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverMagicMissileHoles(
      state,
      subject,
    );
    let lastResult: MbtProjection["lastResult"] = "init";
    let lastInvalidReason: MbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      fills = [];
      holes = discoverMagicMissileHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      const result = resolveBattleSubject({ state, subject, fills });
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doFillMagicMissileAllocation: () => {
        const allocation = requireHole(holes, "spellTargetAllocation");
        submit([spellTargetAllocationFill(allocation, skeletonId, 3)]);
      },
      doFillMagicMissileDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[1, 1, 1]])]);
      },
      doFillMagicMissileDamageHigh: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[4, 4, 4]])]);
      },
      step: () => {},
      getState: () =>
        projectMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createScalarBuffDriver() {
  return defineDriver(scalarBuffDriverSchema, () => {
    let state = scalarBuffBattle();
    let subject: BattleSubject = longstriderSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverLongstriderHoles(state, subject);
    let lastResult: ScalarBuffMbtProjection["lastResult"] = "init";
    let lastInvalidReason: ScalarBuffMbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = scalarBuffBattle();
      subject = longstriderSubject();
      fills = [];
      holes = discoverLongstriderHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doFillLongstriderTarget: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [spellTargetChoiceFill(target, skeletonId, "longstrider")];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectScalarBuffMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createStarryWispObjectDriver() {
  return defineDriver(starryWispObjectDriverSchema, () => {
    let state = starryWispObjectBattle();
    const subject = starryWispSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverStarryWispHoles(state, subject);
    let objectDamage: ObjectDamageMbtProjection = { tag: "none" };
    let lastResult: StarryWispObjectMbtProjection["lastResult"] = "init";
    let lastInvalidReason: StarryWispObjectMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = starryWispObjectBattle();
      fills = [];
      holes = discoverStarryWispHoles(state, subject);
      objectDamage = { tag: "none" };
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        objectDamage = projectObjectDamage(result.objectDamages?.[0]);
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    return {
      init: reset,
      doFillObjectTarget: () => {
        const objectTarget = requireHole(holes, "objectTargetChoice");
        submit([starryWispObjectTargetFill(objectTarget)]);
      },
      doRejectObjectWithoutFact: () => {
        const objectTarget = requireHole(holes, "objectTargetChoice");
        submit([
          starryWispObjectTargetFill(objectTarget, { spatialFacts: [] }),
        ]);
      },
      doFillObjectAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
        ]);
      },
      doFillObjectAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillObjectDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[2, 2]])]);
      },
      doFillObjectDamageHigh: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[3, 3]])]);
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectStarryWispObjectMbtState({
          state,
          holes,
          objectDamage,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createEldritchBlastDriver() {
  return defineDriver(eldritchBlastDriverSchema, () => {
    let state = eldritchBlastBattle();
    const subject = eldritchBlastSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverSpellHoles(state, subject);
    let lastResult: EldritchBlastMbtProjection["lastResult"] = "init";
    let lastInvalidReason: EldritchBlastMbtProjection["lastInvalidReason"] = "";

    function reset(): void {
      state = eldritchBlastBattle();
      fills = [];
      holes = discoverSpellHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    return {
      init: reset,
      doFillTwoCreatureTargets: () => {
        const targets = holes.filter(
          (
            hole,
          ): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
            hole.kind === "targetChoice",
        );
        submit([
          spellTargetChoiceFill(targets[0]!, skeletonId, "eldritch_blast"),
          spellTargetChoiceFill(targets[1]!, skeletonId, "eldritch_blast"),
        ]);
      },
      doFillFirstAttackMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ]);
      },
      doFillFirstAttackHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillFirstDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[4]])]);
      },
      doFillSecondAttackMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 1, naturalD20: 1 }),
        ]);
      },
      doFillSecondAttackHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        submit([
          ...fills,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ]);
      },
      doFillSecondDamageLow: () => {
        const damage = requireHole(holes, "rolledDice");
        submit([...fills, damageRollFillWithGroups(damage, [[4]])]);
      },
      doRejectStaleAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectEldritchBlastMbtState(
          state,
          holes,
          lastResult,
          lastInvalidReason,
        ),
    };
  });
}

function createSleepRepeatSaveDriver() {
  return defineDriver(sleepRepeatSaveDriverSchema, () => {
    let state = sleepRepeatSaveBattle();
    let subject: BattleSubject = sleepSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = discoverSleepHoles(state, subject);
    let lastResult: SleepRepeatSaveMbtProjection["lastResult"] = "init";
    let lastInvalidReason: SleepRepeatSaveMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = sleepRepeatSaveBattle();
      subject = sleepSubject();
      fills = [];
      holes = discoverSleepHoles(state, subject);
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    function fillRepeatSave(succeeded: boolean): void {
      const repeatSave = requireHole(holes, "savingThrowOutcome");
      submit([savingThrowOutcomeFill(repeatSave, skeletonId, succeeded)]);
    }

    return {
      init: reset,
      doFillInitialSaveFailure: () => {
        const initialSave = requireHole(holes, "savingThrowOutcome");
        submit([savingThrowOutcomeFill(initialSave, skeletonId, false)]);
      },
      doBreakConcentrationBeforeRepeat: () => {
        state = breakBattleConcentration(state, fighterId);
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "";
      },
      doEndCasterTurn: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doEndCasterTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(fighterId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doEndTargetTurnAfterConcentrationBreak: () => {
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doDiscoverRepeatSave: () => {
        subject = endTurnSubjectFor(skeletonId);
        fills = [];
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      doFillRepeatSaveSuccess: () => fillRepeatSave(true),
      doFillRepeatSaveFailure: () => fillRepeatSave(false),
      step: () => {},
      getState: () =>
        projectSleepRepeatSaveMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createAdrenalineRushDriver() {
  return defineDriver(adrenalineRushDriverSchema, () => {
    let state = adrenalineRushBattle();
    let lastResult: AdrenalineRushMbtProjection["lastResult"] = "init";
    let lastInvalidReason: AdrenalineRushMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = adrenalineRushBattle();
      lastResult = "init";
      lastInvalidReason = "";
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    return {
      init: reset,
      doAdrenalineRushDash: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: adrenalineRushDashSubject(),
            fills: [],
          }),
        );
      },
      doRejectSecondDash: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: adrenalineRushDashSubject(),
            fills: [],
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectAdrenalineRushMbtState({
          state,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function createDeathSavingThrowDriver() {
  return defineDriver(deathSavingThrowDriverSchema, () => {
    let state = deathSavingThrowBattle();
    const subject = endTurnSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let lastResult: DeathSavingThrowMbtProjection["lastResult"] = "init";
    let lastInvalidReason: DeathSavingThrowMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = deathSavingThrowBattle();
      fills = [];
      holes = [];
      lastResult = "init";
      lastInvalidReason = "";
    }

    function submit(nextFills: readonly BattleFill[]): void {
      fills = nextFills;
      const result = resolveBattleSubject({ state, subject, fills });
      recordResult(result);
    }

    function recordResult(result: BattleResolutionResult): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastInvalidReason = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastInvalidReason = "";
        return;
      }
      lastInvalidReason = mbtInvalidReason(result.reason);
    }

    function fillDeathSavingThrow(roll: number): void {
      const deathSavingThrow = requireHole(holes, "deathSavingThrow");
      submit([deathSavingThrowFill(deathSavingThrow, roll)]);
    }

    return {
      init: reset,
      doDiscoverEndTurnDeathSavingThrow: () => {
        submit([]);
      },
      doFillDeathSavingThrowNaturalOne: () => {
        fillDeathSavingThrow(1);
      },
      doFillDeathSavingThrowFailure: () => {
        fillDeathSavingThrow(5);
      },
      doFillDeathSavingThrowSuccess: () => {
        fillDeathSavingThrow(10);
      },
      doFillDeathSavingThrowNaturalTwenty: () => {
        fillDeathSavingThrow(20);
      },
      doRejectWrongActorEndTurnAfterResolved: () => {
        recordResult(resolveBattleSubject({ state, subject, fills }));
      },
      step: () => {},
      getState: () =>
        projectDeathSavingThrowMbtState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
        }),
    };
  });
}

function normalizeQuintState(raw: unknown): MbtProjection {
  const state = quintStateRecord(raw);

  return {
    skeletonHp: numberFromQuintInt(state["qSkeletonHp"], "qSkeletonHp"),
    skeletonDead: booleanField(state, "qSkeletonDead"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    multiattackDispatchesAvailable: numberFromQuintInt(
      state["qMultiattackDispatchesAvailable"],
      "qMultiattackDispatchesAvailable",
    ),
    sneakAttackUsedThisTurn: booleanField(state, "qSneakAttackUsedThisTurn"),
    holes: quintHoleSet(state["qHoles"]).map(holeName).sort(),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeDeathSavingThrowQuintState(
  raw: unknown,
): DeathSavingThrowMbtProjection {
  const state = quintStateRecord(raw);

  return {
    currentTurnRole: deathSavingThrowMbtTurnRole(
      state["qCurrentTurnRole"],
      "qCurrentTurnRole",
    ),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetStable: booleanField(state, "qTargetStable"),
    targetDead: booleanField(state, "qTargetDead"),
    targetDeathSuccesses: numberFromQuintInt(
      state["qTargetDeathSuccesses"],
      "qTargetDeathSuccesses",
    ),
    targetDeathFailures: numberFromQuintInt(
      state["qTargetDeathFailures"],
      "qTargetDeathFailures",
    ),
    holes: quintHoleSet(state["qHoles"]).map(holeName).sort(),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeExtraAttackQuintState(
  raw: unknown,
): ExtraAttackMbtProjection {
  const state = quintStateRecord(raw);

  return {
    skeletonHp: numberFromQuintInt(state["qSkeletonHp"], "qSkeletonHp"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    extraAttackSlotsAvailable: numberFromQuintInt(
      state["qExtraAttackSlotsAvailable"],
      "qExtraAttackSlotsAvailable",
    ),
    movementSpentFeet: numberFromQuintInt(
      state["qMovementSpentFeet"],
      "qMovementSpentFeet",
    ),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeAdrenalineRushQuintState(
  raw: unknown,
): AdrenalineRushMbtProjection {
  const state = quintStateRecord(raw);

  return {
    actorTempHp: numberFromQuintInt(state["qActorTempHp"], "qActorTempHp"),
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    dashBonusFeet: numberFromQuintInt(
      state["qDashBonusFeet"],
      "qDashBonusFeet",
    ),
    featureUsesRemaining: numberFromQuintInt(
      state["qFeatureUsesRemaining"],
      "qFeatureUsesRemaining",
    ),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeScalarBuffQuintState(raw: unknown): ScalarBuffMbtProjection {
  const state = quintStateRecord(raw);

  return {
    fighterSpeed: numberFromQuintInt(state["qFighterSpeed"], "qFighterSpeed"),
    goblinSpeed: numberFromQuintInt(state["qGoblinSpeed"], "qGoblinSpeed"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    holes: quintHoleSet(state["qHoles"]).map(holeName).sort(),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeStarryWispObjectQuintState(
  raw: unknown,
): StarryWispObjectMbtProjection {
  const state = quintStateRecord(raw);

  const lightEmitters = lightEmittersFromQuint(state["qLightEmitters"]);
  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    holes: quintHoleSet(state["qHoles"]).map(holeName).sort(),
    objectDamage: objectDamageFromQuint(state["qObjectDamage"]),
    lightEmitters,
    objectInvisibleBenefitDenied:
      objectInvisibleBenefitDeniedFromLightEmitters(lightEmitters),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeEldritchBlastQuintState(
  raw: unknown,
): EldritchBlastMbtProjection {
  const state = quintStateRecord(raw);

  return {
    actionAvailable: booleanField(state, "qActionAvailable"),
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    holes: quintHoleSet(state["qHoles"]).map(holeName).sort(),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function normalizeSleepRepeatSaveQuintState(
  raw: unknown,
): SleepRepeatSaveMbtProjection {
  const state = quintStateRecord(raw);

  return {
    currentTurnRole: sleepRepeatSaveMbtTurnRole(
      state["qCurrentTurnRole"],
      "qCurrentTurnRole",
    ),
    targetIncapacitated: booleanField(state, "qTargetIncapacitated"),
    targetUnconscious: booleanField(state, "qTargetUnconscious"),
    targetProne: booleanField(state, "qTargetProne"),
    casterConcentrating: booleanField(state, "qCasterConcentrating"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    holes: quintHoleSet(state["qHoles"]).map(holeName).sort(),
    lastResult: mbtLastResult(state["qLastResult"]),
    lastInvalidReason: mbtLastInvalidReason(state["qLastInvalidReason"]),
  };
}

function compareState(spec: MbtProjection, impl: MbtProjection): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function compareDeathSavingThrowState(
  spec: DeathSavingThrowMbtProjection,
  impl: DeathSavingThrowMbtProjection,
): boolean {
  expect(impl).toEqual(spec);
  return true;
}

function mbtInvalidReason(
  reason: Extract<
    BattleResolutionResult,
    { readonly tag: "invalid" }
  >["reason"],
): MbtProjection["lastInvalidReason"] {
  if (
    reason === "invalidFill" ||
    reason === "staleSubject" ||
    reason === "wrongActor"
  ) {
    return reason;
  }

  throw new Error(`Unexpected battle-runtime MBT invalid reason: ${reason}`);
}

const battleRuntimeStateCheck = stateCheck(normalizeQuintState, compareState);
const deathSavingThrowStateCheck = stateCheck(
  normalizeDeathSavingThrowQuintState,
  compareDeathSavingThrowState,
);
const extraAttackStateCheck = stateCheck(
  normalizeExtraAttackQuintState,
  (spec: ExtraAttackMbtProjection, impl: ExtraAttackMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
const adrenalineRushStateCheck = stateCheck(
  normalizeAdrenalineRushQuintState,
  (spec: AdrenalineRushMbtProjection, impl: AdrenalineRushMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
const scalarBuffStateCheck = stateCheck(
  normalizeScalarBuffQuintState,
  (spec: ScalarBuffMbtProjection, impl: ScalarBuffMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
const starryWispObjectStateCheck = stateCheck(
  normalizeStarryWispObjectQuintState,
  (
    spec: StarryWispObjectMbtProjection,
    impl: StarryWispObjectMbtProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
const eldritchBlastStateCheck = stateCheck(
  normalizeEldritchBlastQuintState,
  (spec: EldritchBlastMbtProjection, impl: EldritchBlastMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
const sleepRepeatSaveStateCheck = stateCheck(
  normalizeSleepRepeatSaveQuintState,
  (spec: SleepRepeatSaveMbtProjection, impl: SleepRepeatSaveMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

describe("battle-runtime MBT", () => {
  it("replays Rogue weapon Attack and Sneak Attack traces against a Skeleton target", async () => {
    await run({
      spec: path.resolve(import.meta.dirname, "../battle-runtime.mbt.qnt"),
      init: "init",
      step: "step",
      driver: createBattleRuntimeDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 6),
      stateCheck: battleRuntimeStateCheck,
    });
  }, 120_000);

  it("replays Magic Missile target allocation against a Skeleton target", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-magic-missile.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createMagicMissileDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 2),
      stateCheck: battleRuntimeStateCheck,
    });
  }, 120_000);

  it("replays Extra Attack action spend, interleaved Movement, and slot closure", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-extra-attack.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createExtraAttackDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 4),
      stateCheck: extraAttackStateCheck,
    });
  }, 120_000);

  it("replays Orc Adrenaline Rush Bonus Action Dash and Temporary Hit Points", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-adrenaline-rush.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createAdrenalineRushDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 2),
      stateCheck: adrenalineRushStateCheck,
    });
  }, 120_000);

  it("replays Longstrider target-specific Speed increase", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-scalar-buff.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createScalarBuffDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 2),
      stateCheck: scalarBuffStateCheck,
    });
  }, 120_000);

  it("replays Starry Wisp object target attack and object damage outcomes", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-starry-wisp-object.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createStarryWispObjectDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 4),
      stateCheck: starryWispObjectStateCheck,
    });
  }, 120_000);

  it("replays Eldritch Blast beam sequencing", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-eldritch-blast.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createEldritchBlastDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 4),
      stateCheck: eldritchBlastStateCheck,
    });
  }, 120_000);

  it("replays Sleep pending repeat-save lifecycle and concentration cleanup", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-sleep-repeat-save.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createSleepRepeatSaveDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 1),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 4),
      stateCheck: sleepRepeatSaveStateCheck,
    });
  }, 120_000);

  it("replays start-turn Death Saving Throw holes for a Character Build combatant", async () => {
    await run({
      spec: path.resolve(
        import.meta.dirname,
        "../battle-runtime-death-saving-throw.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDeathSavingThrowDriver(),
      backend: "typescript",
      nTraces: Number(process.env["MBT_TRACES"] ?? 4),
      maxSteps: Number(process.env["MBT_STEPS"] ?? 3),
      stateCheck: deathSavingThrowStateCheck,
    });
  }, 120_000);
});

function projectMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: MbtProjection["lastResult"];
  readonly lastInvalidReason: MbtProjection["lastInvalidReason"];
}): MbtProjection {
  const snapshot = snapshotBattle(input.state);
  const skeleton = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (skeleton == null) {
    throw new Error("Expected Skeleton in battle snapshot.");
  }

  return {
    skeletonHp: skeleton.hp,
    skeletonDead:
      skeleton.zeroHpLifecycle.policy === "diesAtZeroHp" &&
      skeleton.zeroHpLifecycle.dead,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    multiattackDispatchesAvailable: snapshot.turn.actionResources.filter(
      (resource) =>
        resource.source === "statBlockMultiattack" &&
        resource.sourceOwnerId === skeletonId,
    ).length,
    sneakAttackUsedThisTurn: snapshot.turn.attackDamageRidersUsedThisTurn.some(
      (usage) =>
        usage.attackerId === fighterId && usage.unitId === "rogue_sneak_attack",
    ),
    holes: input.holes.map(projectHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectDeathSavingThrowMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: DeathSavingThrowMbtProjection["lastResult"];
  readonly lastInvalidReason: DeathSavingThrowMbtProjection["lastInvalidReason"];
}): DeathSavingThrowMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === deathSavingThrowTargetId,
  );
  if (target == null) {
    throw new Error("Expected Death Saving Throw target in battle snapshot.");
  }
  if (target.zeroHpLifecycle.policy !== "usesDeathSavingThrows") {
    throw new Error("Expected target to use Death Saving Throws.");
  }

  return {
    currentTurnRole:
      snapshot.currentActorId === deathSavingThrowTargetId ? "target" : "actor",
    targetHp: target.hp,
    targetUnconscious: target.conditions.includes("unconscious"),
    targetStable: target.zeroHpLifecycle.stable,
    targetDead: target.zeroHpLifecycle.dead,
    targetDeathSuccesses: target.zeroHpLifecycle.deathSaves.successes,
    targetDeathFailures: target.zeroHpLifecycle.deathSaves.failures,
    holes: input.holes.map(projectHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectExtraAttackMbtState(input: {
  readonly state: BattleState;
  readonly lastResult: ExtraAttackMbtProjection["lastResult"];
  readonly lastInvalidReason: ExtraAttackMbtProjection["lastInvalidReason"];
}): ExtraAttackMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const skeleton = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  const fighter = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (skeleton == null || fighter == null) {
    throw new Error("Expected Extra Attack MBT combatants.");
  }

  return {
    skeletonHp: skeleton.hp,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    extraAttackSlotsAvailable: snapshot.turn.actionResources.filter(
      (resource) =>
        resource.source === "classFeatureExtraAttack" &&
        resource.sourceOwnerId === fighterId,
    ).length,
    movementSpentFeet: Number(fighter.movement.spentFeet),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectAdrenalineRushMbtState(input: {
  readonly state: BattleState;
  readonly lastResult: AdrenalineRushMbtProjection["lastResult"];
  readonly lastInvalidReason: AdrenalineRushMbtProjection["lastInvalidReason"];
}): AdrenalineRushMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  if (actor == null) {
    throw new Error("Expected Adrenaline Rush MBT actor.");
  }
  return {
    actorTempHp: actor.tempHp,
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    dashBonusFeet: Number(snapshot.turn.dashMovementBonusFeet),
    featureUsesRemaining: resourceUsesRemaining(
      input.state,
      "orc_adrenaline_rush",
    ),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectScalarBuffMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: ScalarBuffMbtProjection["lastResult"];
  readonly lastInvalidReason: ScalarBuffMbtProjection["lastInvalidReason"];
}): ScalarBuffMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const fighter = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const skeleton = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (fighter == null || skeleton == null) {
    throw new Error("Expected scalar buff MBT combatants.");
  }
  return {
    fighterSpeed: Number(fighter.movement.speedFeet),
    goblinSpeed: Number(skeleton.movement.speedFeet),
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: input.holes.map(projectHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectStarryWispObjectMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly objectDamage: ObjectDamageMbtProjection;
  readonly lastResult: StarryWispObjectMbtProjection["lastResult"];
  readonly lastInvalidReason: StarryWispObjectMbtProjection["lastInvalidReason"];
}): StarryWispObjectMbtProjection {
  const snapshot = snapshotBattle(input.state);
  return {
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: input.holes.map(projectHole).sort(),
    objectDamage: input.objectDamage,
    lightEmitters: snapshot.lightEmitters
      .map(projectLightEmitter)
      .sort(compareJsonStable),
    objectInvisibleBenefitDenied: objectInvisibleBenefitDenied(
      input.state,
      starryWispObjectId,
    ),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectEldritchBlastMbtState(
  state: BattleState,
  holes: readonly BattleHole[],
  lastResult: EldritchBlastMbtProjection["lastResult"],
  lastInvalidReason: EldritchBlastMbtProjection["lastInvalidReason"],
): EldritchBlastMbtProjection {
  const snapshot = snapshotBattle(state);
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (target === undefined) {
    throw new Error("Expected Eldritch Blast target.");
  }
  return {
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    targetHp: target.hp,
    holes: [...new Set(holes.map(projectHole))].sort(),
    lastResult,
    lastInvalidReason,
  };
}

function projectSleepRepeatSaveMbtState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: SleepRepeatSaveMbtProjection["lastResult"];
  readonly lastInvalidReason: SleepRepeatSaveMbtProjection["lastInvalidReason"];
}): SleepRepeatSaveMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const caster = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const target = snapshot.combatants.find(
    (combatant) => combatant.combatantId === skeletonId,
  );
  if (caster == null || target == null) {
    throw new Error("Expected Sleep repeat-save MBT combatants.");
  }
  return {
    currentTurnRole:
      snapshot.currentActorId === fighterId ? "caster" : "target",
    targetIncapacitated: target.conditions.includes("incapacitated"),
    targetUnconscious: target.conditions.includes("unconscious"),
    targetProne: target.conditions.includes("prone"),
    casterConcentrating: caster.concentrating,
    actionAvailable: snapshot.turn.actionResources.some(
      (resource) => resource.source === "turn",
    ),
    holes: input.holes.map(projectHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function discoverAttackHoles(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      candidate.subject.attackName === subject.attackName,
  );
  if (act == null) {
    throw new Error(`Expected ${subject.attackName} attack act.`);
  }

  return act.initialHoles;
}

function discoverLongstriderHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Longstrider spell act.");
  }

  return act.initialHoles;
}

function discoverMagicMissileHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Magic Missile spell act.");
  }

  return act.initialHoles;
}

function discoverSleepHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error("Expected Sleep spell act.");
  }

  return act.initialHoles;
}

function discoverStarryWispHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  return discoverSpellHoles(state, subject, "Expected Starry Wisp spell act.");
}

function discoverSpellHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
  errorMessage = "Expected spell act.",
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.invocation.spellId === subject.invocation.spellId,
  );
  if (act == null) {
    throw new Error(errorMessage);
  }

  return act.initialHoles;
}

function holesAfterFills(
  state: BattleState,
  subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >,
  fills: readonly BattleFill[],
): readonly BattleHole[] {
  const result = resolveBattleSubject({ state, subject, fills });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected attack fills to request more holes.");
  }

  return result.holes;
}

function fighterAttackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName: "Dagger",
  };
}

function adrenalineRushDashSubject(): Extract<
  BattleSubject,
  { readonly tag: "bonusActionStandardAction"; readonly action: "dash" }
> {
  return {
    tag: "bonusActionStandardAction",
    actorId: fighterId,
    sourceUnitId: "orc_adrenaline_rush",
    action: "dash",
    speedKind: "walk",
  };
}

function skeletonMultiattackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "multiattack" }
> {
  return {
    tag: "action",
    actorId: skeletonId,
    action: "multiattack",
    multiattackName: "Multiattack",
  };
}

function skeletonShortswordSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: skeletonId,
    action: "attack",
    attackName: "Shortsword",
  };
}

function magicMissileSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef(
      "magic_missile",
      1,
      "repeatedDamageAllocation",
    ),
    mode: { tag: "cast" },
  };
}

function starryWispSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: cantripSpellInvocationRef("starry_wisp", "spellAttackDamage"),
    mode: { tag: "cast" },
  };
}

function eldritchBlastSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: cantripSpellInvocationRef(
      "eldritch_blast",
      "spellAttackBeamSequence",
    ),
    mode: { tag: "cast" },
  };
}

function sleepSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("sleep", 1, "sleepTargetAdmission"),
    mode: { tag: "cast" },
  };
}

function longstriderSubject(): Extract<
  BattleSubject,
  { readonly tag: "actionSpell" }
> {
  return {
    tag: "actionSpell",
    actorId: fighterId,
    invocation: spellSlotInvocationRef("longstrider", 1, "scalarBuff"),
    mode: { tag: "cast" },
  };
}

function moveSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "move" }
> {
  return { tag: "runtimeCommand", actorId: fighterId, command: "move" };
}

function fighterVsSkeletonBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-fighter-skeleton"),
    combatants: [
      rogueCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function extraAttackBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-extra-attack"),
    combatants: [
      extraAttackCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function adrenalineRushBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-adrenaline-rush"),
    combatants: [
      adrenalineRushCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function scalarBuffBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-scalar-buff"),
    combatants: [
      scalarBuffCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function starryWispObjectBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-starry-wisp-object"),
    combatants: [
      starryWispCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function eldritchBlastBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-eldritch-blast"),
    combatants: [
      eldritchBlastCasterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function deathSavingThrowBattle(): BattleState {
  const state = startBattleRight({
    battleId: battleId("battle-runtime-mbt-death-saving-throw"),
    combatants: [
      mbtCharacterCreatureInit({
        combatantId: fighterId,
        characterId: "death-saving-throw-actor-character",
        displayName: "Actor",
        initiative: 20,
        currentHp: 12,
      }),
      mbtCharacterCreatureInit({
        combatantId: deathSavingThrowTargetId,
        characterId: "death-saving-throw-target-character",
        displayName: "Target",
        initiative: 10,
        currentHp: 0,
        zeroHpLifecycle: {
          policy: "usesDeathSavingThrows",
          deathSaves: {
            deathSaves: { successes: 2, failures: 1 },
            stable: false,
            dead: false,
            hpRegained: false,
          },
        },
      }),
    ],
  });

  return state;
}

function sleepRepeatSaveBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-sleep-repeat-save"),
    combatants: [
      sleepCasterCreatureInit({ initiative: 20 }),
      sleepTargetCreatureInit({ initiative: 10 }),
    ],
  });
}

function mbtCharacterCreatureInit(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly currentHp: number;
  readonly zeroHpLifecycle?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["zeroHpLifecycle"];
}): BattleCreatureInit {
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(input.characterId),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(input.currentHp),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      ...(input.zeroHpLifecycle === undefined
        ? {}
        : { zeroHpLifecycle: input.zeroHpLifecycle }),
    },
  };
}

function endTurnSubject(): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return endTurnSubjectFor(fighterId);
}

function endTurnSubjectFor(
  actorId: CombatantId,
): Extract<
  BattleSubject,
  { readonly tag: "runtimeCommand"; readonly command: "endTurn" }
> {
  return { tag: "runtimeCommand", actorId, command: "endTurn" };
}

function rogueCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Rogue",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: [
        {
          unitId: "rogue_sneak_attack",
          supportProfiles: [ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE],
        },
      ],
      classLevels: [{ className: "rogue", level: 1 }],
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: "main:weapon_dagger",
          unitId: "weapon_dagger",
          grip: "one_handed",
        },
      },
      attack: daggerAttack(),
      unarmedStrike: baseUnarmedStrike(),
      unitFeatures: [{ unit: unitLibrary.requireUnit("rogue_sneak_attack") }],
      spellcasting: {
        sourceClassName: "rogue",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [magicMissileSpell],
        featurePreparedSpells: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function extraAttackCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("fighter_extra_attack");
  return {
    combatantId: fighterId,
    displayName: "Fighter",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("extra-attack-fighter-character"),
      characterUnitRefs: [extraAttackUnitRef(unit)],
      classLevels: [{ className: "fighter", level: 5 }],
      armorClass: {
        ...defaultArmorClassState(),
        rightHandUse: "mainWeapon",
      },
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {
        weapon: {
          itemId: "main:weapon_dagger",
          unitId: "weapon_dagger",
          grip: "one_handed",
        },
      },
      attack: daggerAttack(),
      unarmedStrike: baseUnarmedStrike(),
      unitFeatures: [{ unit }],
    },
  };
}

function adrenalineRushCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("orc_adrenaline_rush");
  return {
    combatantId: fighterId,
    displayName: "Orc",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("adrenaline-rush-character"),
      characterUnitRefs: [adrenalineRushUnitRef(unit)],
      classLevels: [{ className: "fighter", level: 5 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(1),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      resources: [{ unit, usesRemaining: 3 }],
      unitFeatures: [{ unit }],
    },
  };
}

function scalarBuffCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("longstrider");
  if (unit.kind !== "spell") {
    throw new Error("Expected Longstrider spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Longstrider Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("scalar-buff-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [unit],
        featurePreparedSpells: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function starryWispCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = unitLibrary.requireUnit("starry_wisp");
  if (unit.kind !== "spell") {
    throw new Error("Expected Starry Wisp spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Starry Wisp Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("starry-wisp-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 5 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [unit],
        preparedSpells: [],
        featurePreparedSpells: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    },
  };
}

function eldritchBlastCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const unit = decodeUnitRecordSync(eldritchBlastInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Eldritch Blast spell Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Eldritch Blast Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("eldritch-blast-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 5 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [unit],
        preparedSpells: [],
        featurePreparedSpells: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    },
  };
}

function sleepCasterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Sleep Caster",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("sleep-caster-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
      spellcasting: {
        sourceClassName: "fighter",
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [sleepSpell],
        featurePreparedSpells: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function sleepTargetCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Sleep Target",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "character",
      characterId: characterId("sleep-target-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: baseUnarmedStrike(),
    },
  };
}

function extraAttackUnitRef(
  unit: UnitRecord,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function adrenalineRushUnitRef(
  unit: UnitRecord,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return unitRef.right;
}

function resourceUsesRemaining(state: BattleState, unitId: string): number {
  const actor = state.combatants.get(fighterId);
  if (actor?.origin.kind !== "character") return 1;
  const resource = actor.origin.resources.find(
    (candidate) => candidate.unit.id === unitId,
  );
  if (
    resource === undefined ||
    characterBattleResourceUsage(resource) !== "limited"
  ) {
    return 1;
  }
  return "usesRemaining" in resource ? resource.usesRemaining : 1;
}

function daggerAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_dagger");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Dagger weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: abilityModifier(3),
  };
}

function baseUnarmedStrike(): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["unarmedStrike"] {
  return {
    kind: "unarmedStrike",
    effect: {
      kind: "damage",
      damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
    },
    attackAbility: "str",
    attackAbilityModifier: abilityModifier(3),
    attackBonus: attackBonus(5),
    damageAbilityModifier: abilityModifier(3),
  };
}

function skeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Skeleton",
    initiative: initiativeScore(input.initiative),
    side: oppositionSide,
    creatureInit: {
      kind: "statBlock",
      statBlock: skeletonMultiattackStatBlock(),
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
    },
  };
}

function skeletonMultiattackStatBlock(): StatBlockRecord {
  const base = statBlockCatalog.requireStatBlock("stat_block_skeleton");
  return {
    ...base,
    statBlock: {
      ...base.statBlock,
      actions: {
        ...base.statBlock.actions,
        multiattacks: [
          {
            name: "Multiattack",
            dispatches: [
              { name: "Shortsword", count: { kind: "literal", value: 2 } },
            ],
          },
        ],
      },
    },
  };
}

function requireHole(
  holes: readonly BattleHole[],
  kind: BattleHole["kind"],
): BattleHole {
  const hole = holes.find((candidate) => candidate.kind === kind);
  if (hole == null) {
    throw new Error(`Expected ${kind} hole.`);
  }

  return hole;
}

function targetFill(
  hole: BattleHole,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId: fighterId,
        targetId,
        attackName: "Dagger",
      },
      {
        kind: "attackTargetInMeleeReach",
        actorId: skeletonId,
        targetId,
        attackName: "Shortsword",
      },
      {
        kind: "sneakAttackAllyWithin5FeetOfTarget",
        attackerId: fighterId,
        targetId,
        allyId: combatantId("ally"),
      },
    ],
  };
}

function savingThrowOutcomeFill(
  hole: BattleHole,
  targetId: CombatantId,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  if (hole.kind !== "savingThrowOutcome") {
    throw new Error("Expected savingThrowOutcome hole.");
  }
  const outcomes = [{ targetId, succeeded }];
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value:
      "spell" in hole && hole.spell.targeting.kind !== "singleCombatant"
        ? {
            area: {
              originAnchorId: fighterId,
              affectedTargetIds: [targetId],
            },
            outcomes,
          }
        : { outcomes },
  };
}

function spellTargetChoiceFill(
  hole: BattleHole,
  targetId: CombatantId,
  spellId: string,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (hole.kind !== "targetChoice") {
    throw new Error("Expected target choice hole.");
  }
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId,
        spellId,
      },
    ],
  };
}

type ObjectTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "objectTargetChoice" }
>;

function starryWispObjectTargetFill(
  hole: BattleHole,
  input: {
    readonly spatialFacts?: ObjectTargetChoiceFill["spatialFacts"];
  } = {},
): ObjectTargetChoiceFill {
  if (hole.kind !== "objectTargetChoice") {
    throw new Error("Expected object target choice hole.");
  }

  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: starryWispObjectId,
    spatialFacts: input.spatialFacts ?? [
      {
        kind: "spellObjectTarget",
        casterId: fighterId,
        objectId: starryWispObjectId,
        spellId: "starry_wisp",
        rangeFeet: movementFeet(60),
        armorClass: armorClass(13),
        damageDisposition: {
          kind: "hitPoints",
          hitPoints: Hp(5),
        },
      },
    ],
  };
}

function movementFill(
  hole: BattleHole,
  value: { readonly movementCostFeet: number },
): Extract<BattleFill, { readonly kind: "movement" }> {
  if (hole.kind !== "movement") {
    throw new Error("Expected movement hole.");
  }

  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: [],
    },
  };
}

function spellTargetAllocationFill(
  hole: BattleHole,
  targetId: CombatantId,
  count: number,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  if (hole.kind !== "spellTargetAllocation") {
    throw new Error("Expected spell target allocation hole.");
  }

  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations: [{ targetId, count }] },
    spatialFacts: [
      {
        kind: "spellTarget",
        casterId: fighterId,
        targetId,
        spellId: hole.spell.spell.id,
      },
    ],
  };
}

function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
    readonly rollMode?: "normal" | "advantage" | "disadvantage";
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: value.total,
      naturalD20: DieRollResult(value.naturalD20),
      ...(value.rollMode === undefined ? {} : { rollMode: value.rollMode }),
    },
  };
}

function damageRollFill(
  hole: BattleHole,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return damageRollFillWithGroups(hole, [[value]]);
}

function damageRollFillWithGroups(
  hole: BattleHole,
  groups: readonly (readonly number[])[],
  selectedAttackDamageRiderUnitIds?: readonly string[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  if (groups.length === 0 || groups.some((group) => group.length === 0)) {
    throw new Error("Expected non-empty rolled damage groups.");
  }

  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    ...(selectedAttackDamageRiderUnitIds === undefined
      ? {}
      : { selectedAttackDamageRiderUnitIds }),
    value: rolledDiceGroups(groups),
  };
}

function rolledDiceGroups(
  groups: readonly (readonly number[])[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"] {
  const [firstGroup, ...restGroups] = groups;
  if (firstGroup === undefined) {
    throw new Error("Expected at least one rolled damage group.");
  }

  return [
    rolledDiceGroup(firstGroup),
    ...restGroups.map((group) => rolledDiceGroup(group)),
  ];
}

function rolledDiceGroup(
  group: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }>["value"][number] {
  const [first, ...rest] = group;
  if (first === undefined) {
    throw new Error("Expected at least one die result.");
  }

  return {
    results: [DieRollResult(first), ...rest.map(DieRollResult)],
  };
}

function projectObjectDamage(
  damage: Extract<
    NonNullable<
      Extract<
        BattleResolutionResult,
        { readonly tag: "resolved" }
      >["objectDamages"]
    >,
    readonly unknown[]
  > extends readonly (infer ObjectDamage)[]
    ? ObjectDamage | undefined
    : undefined,
): ObjectDamageMbtProjection {
  if (damage === undefined) {
    return { tag: "none" };
  }
  if (damage.kind === "hitPoints") {
    return {
      tag: "hitPoints",
      rolledDamage: Number(damage.rolledDamage),
      effectiveDamage: Number(damage.effectiveDamage),
      nextHitPoints: Number(damage.nextHitPoints),
      destroyed: damage.destroyed,
    };
  }

  throw new Error("Starry Wisp object MBT expected hit point object damage.");
}

function projectLightEmitter(
  emitter: BattleLightEmitter,
): LightEmitterMbtProjection {
  return Match.value(emitter).pipe(
    Match.when({ kind: "spellLightEmitter" }, (spellEmitter) => ({
      kind: "spellLightEmitter" as const,
      sourceSpellId: spellEmitter.sourceSpellId,
      sourceCombatantId: spellEmitter.sourceCombatantId,
      attachment: projectLightEmitterAttachment(spellEmitter.attachment),
      emission: projectLightEmission(spellEmitter.emission),
      expiresAt: projectLightEmitterExpiration(spellEmitter.expiresAt),
    })),
    Match.when(
      { kind: "objectInvisibleRevealLightEmitter" },
      (objectRevealEmitter) => ({
        kind: "objectInvisibleRevealLightEmitter" as const,
        sourceSpellId: objectRevealEmitter.sourceSpellId,
        sourceCombatantId: objectRevealEmitter.sourceCombatantId,
        objectId: objectRevealEmitter.objectId,
        emission: {
          kind: "dim" as const,
          radiusFeet: Number(objectRevealEmitter.emission.radiusFeet),
        },
        expiresAt: {
          kind: "endOfTurn" as const,
          combatantId: objectRevealEmitter.expiresAt.combatantId,
          round: Number(objectRevealEmitter.expiresAt.round),
        },
      }),
    ),
    Match.exhaustive,
  );
}

function projectLightEmitterAttachment(
  attachment: BattleLightEmitterAttachment,
): LightEmitterAttachmentMbtProjection {
  return Match.value(attachment).pipe(
    Match.when({ kind: "combatant" }, (combatant) => ({
      kind: "combatant" as const,
      combatantId: combatant.combatantId,
    })),
    Match.when({ kind: "object" }, (object) => ({
      kind: "object" as const,
      objectId: object.objectId,
    })),
    Match.exhaustive,
  );
}

function projectLightEmission(
  emission: BattleLightEmitter["emission"],
): LightEmissionMbtProjection {
  return Match.value(emission).pipe(
    Match.when({ kind: "dim" }, (dim) => ({
      kind: "dim" as const,
      radiusFeet: Number(dim.radiusFeet),
    })),
    Match.when({ kind: "brightAndDim" }, (brightAndDim) => ({
      kind: "brightAndDim" as const,
      brightRadiusFeet: Number(brightAndDim.brightRadiusFeet),
      dimAdditionalFeet: Number(brightAndDim.dimAdditionalFeet),
    })),
    Match.exhaustive,
  );
}

function projectLightEmitterExpiration(
  expiration: BattleLightEmitter["expiresAt"],
): LightEmitterExpirationMbtProjection {
  return Match.value(expiration).pipe(
    Match.when({ kind: "startOfTurn" }, (startOfTurn) => ({
      kind: "startOfTurn" as const,
      combatantId: startOfTurn.combatantId,
    })),
    Match.when({ kind: "endOfTurn" }, (endOfTurn) => ({
      kind: "endOfTurn" as const,
      combatantId: endOfTurn.combatantId,
      round: Number(endOfTurn.round),
    })),
    Match.when({ kind: "concentration" }, (concentration) => ({
      kind: "concentration" as const,
      combatantId: concentration.combatantId,
    })),
    Match.when({ kind: "duration" }, (duration) => ({
      kind: "duration" as const,
      durationTicks: Number(duration.durationTicks),
    })),
    Match.exhaustive,
  );
}

function objectDamageFromQuint(raw: unknown): ObjectDamageMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "NoObjectDamage") {
    return { tag: "none" };
  }
  if (tag !== "SomeObjectDamage") {
    throw new Error(`Unknown Quint object damage option: ${tag}`);
  }

  const damage = quintVariantValue(raw, "SomeObjectDamage");
  if (quintVariantTag(damage) !== "ObjectHitPointDamage") {
    throw new Error("Expected Quint object hit point damage.");
  }
  const fields = quintVariantRecordValue(damage, "ObjectHitPointDamage");
  return {
    tag: "hitPoints",
    rolledDamage: numberFromQuintInt(fields["rolledDamage"], "rolledDamage"),
    effectiveDamage: numberFromQuintInt(
      fields["effectiveDamage"],
      "effectiveDamage",
    ),
    nextHitPoints: numberFromQuintInt(fields["nextHitPoints"], "nextHitPoints"),
    destroyed: booleanField(fields, "destroyed"),
  };
}

function lightEmittersFromQuint(
  raw: unknown,
): readonly LightEmitterMbtProjection[] {
  return quintSet(raw, "qLightEmitters")
    .map(lightEmitterFromQuint)
    .sort(compareJsonStable);
}

function lightEmitterFromQuint(raw: unknown): LightEmitterMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "SpellLightEmitter") {
    const fields = quintVariantRecordValue(raw, "SpellLightEmitter");
    return {
      kind: "spellLightEmitter",
      sourceSpellId: spellIdFromQuint(fields["sourceSpell"], "sourceSpell"),
      sourceCombatantId: actorIdFromQuint(fields["source"], "source"),
      attachment: lightEmitterAttachmentFromQuint(fields["attachment"]),
      emission: lightEmissionFromQuint(fields["emission"]),
      expiresAt: lightEmitterExpirationFromQuint(fields["expiresAt"]),
    };
  }
  if (tag === "ObjectInvisibleRevealLightEmitter") {
    const fields = quintVariantRecordValue(
      raw,
      "ObjectInvisibleRevealLightEmitter",
    );
    return {
      kind: "objectInvisibleRevealLightEmitter",
      sourceSpellId: spellIdFromQuint(fields["sourceSpell"], "sourceSpell"),
      sourceCombatantId: actorIdFromQuint(fields["source"], "source"),
      objectId: objectIdFromQuint(fields["object"], "object"),
      emission: {
        kind: "dim",
        radiusFeet: numberFromQuintInt(
          fields["dimLightRadiusFeet"],
          "dimLightRadiusFeet",
        ),
      },
      expiresAt: {
        kind: "endOfTurn",
        combatantId: actorIdFromQuint(
          fields["expiresAtActor"],
          "expiresAtActor",
        ),
        round: numberFromQuintInt(fields["expiresAtRound"], "expiresAtRound"),
      },
    };
  }
  throw new Error(`Unknown Quint light emitter variant: ${tag}`);
}

function objectInvisibleBenefitDeniedFromLightEmitters(
  lightEmitters: readonly LightEmitterMbtProjection[],
): boolean {
  return lightEmitters.some(
    (emitter) =>
      emitter.kind === "objectInvisibleRevealLightEmitter" &&
      emitter.objectId === starryWispObjectId,
  );
}

function lightEmitterExpirationFromQuint(
  raw: unknown,
): LightEmitterExpirationMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "EndOfTurnLightEmitterExpiration") {
    const fields = quintVariantRecordValue(
      raw,
      "EndOfTurnLightEmitterExpiration",
    );
    return {
      kind: "endOfTurn",
      combatantId: actorIdFromQuint(fields["actor"], "actor"),
      round: numberFromQuintInt(fields["round"], "round"),
    };
  }
  if (tag === "DurationLightEmitterExpiration") {
    const fields = quintVariantRecordValue(
      raw,
      "DurationLightEmitterExpiration",
    );
    return {
      kind: "duration",
      durationTicks: numberFromQuintInt(
        fields["durationTicks"],
        "durationTicks",
      ),
    };
  }

  throw new Error(`Unknown Quint light emitter expiration variant: ${tag}`);
}

function lightEmitterAttachmentFromQuint(
  raw: unknown,
): LightEmitterAttachmentMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "CombatantLightEmitter") {
    const fields = quintVariantRecordValue(raw, "CombatantLightEmitter");
    return {
      kind: "combatant",
      combatantId: actorIdFromQuint(fields["actor"], "actor"),
    };
  }
  if (tag === "ObjectLightEmitter") {
    const fields = quintVariantRecordValue(raw, "ObjectLightEmitter");
    return {
      kind: "object",
      objectId: objectIdFromQuint(fields["object"], "object"),
    };
  }

  throw new Error(`Unknown Quint light emitter attachment variant: ${tag}`);
}

function lightEmissionFromQuint(raw: unknown): LightEmissionMbtProjection {
  const tag = quintVariantTag(raw);
  if (tag === "DimLightEmission") {
    const fields = quintVariantRecordValue(raw, "DimLightEmission");
    return {
      kind: "dim",
      radiusFeet: numberFromQuintInt(fields["radiusFeet"], "radiusFeet"),
    };
  }
  if (tag === "BrightAndDimLightEmission") {
    const fields = quintVariantRecordValue(raw, "BrightAndDimLightEmission");
    return {
      kind: "brightAndDim",
      brightRadiusFeet: numberFromQuintInt(
        fields["brightRadiusFeet"],
        "brightRadiusFeet",
      ),
      dimAdditionalFeet: numberFromQuintInt(
        fields["dimAdditionalFeet"],
        "dimAdditionalFeet",
      ),
    };
  }

  throw new Error(`Unknown Quint light emission variant: ${tag}`);
}

function actorIdFromQuint(raw: unknown, field: string): string {
  const tag = quintVariantTag(raw);
  if (tag === "Fighter") {
    return fighterId;
  }
  if (tag === "Goblin") {
    return skeletonId;
  }

  throw new Error(`Unknown Quint actor field ${field}: ${tag}`);
}

function spellIdFromQuint(raw: unknown, field: string): string {
  const tag = quintVariantTag(raw);
  if (tag === "StarryWisp") {
    return "starry_wisp";
  }
  if (tag === "Light") {
    return "light";
  }

  throw new Error(`Unknown Quint spell field ${field}: ${tag}`);
}

function objectIdFromQuint(raw: unknown, field: string): string {
  const tag = quintVariantTag(raw);
  if (tag === "StarryWispObjectTarget") {
    return starryWispObjectId;
  }
  if (tag === "LightObjectTarget") {
    return "light-object";
  }
  if (tag === "PriorLightObjectTarget") {
    return "prior-light-object";
  }

  throw new Error(`Unknown Quint object field ${field}: ${tag}`);
}

function compareJsonStable(left: unknown, right: unknown): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function projectHole(hole: BattleHole): MbtHole {
  if (hole.kind === "shoveOutcome") {
    throw new Error("Battle runtime MBT does not model Shove holes.");
  }
  if (hole.kind === "unitFeatureDecision") {
    throw new Error(
      "Battle runtime MBT does not model Unit Feature decision holes.",
    );
  }
  if (hole.kind === "abilityChoice") {
    throw new Error("Battle runtime MBT does not model ability choice holes.");
  }
  if (hole.kind === "spellAreaChoice") {
    throw new Error("Battle runtime MBT does not model spell area holes.");
  }
  return Match.value(hole).pipe(
    Match.when({ kind: "targetChoice" }, () => "TargetChoice" as const),
    Match.when(
      { kind: "objectTargetChoice" },
      () => "ObjectTargetChoice" as const,
    ),
    Match.when(
      { kind: "spellTargetAllocation" },
      () => "SpellTargetAllocation" as const,
    ),
    Match.when({ kind: "spellTargetList" }, () => {
      throw new Error(
        "Battle runtime MBT does not model spell target-list holes.",
      );
    }),
    Match.when({ kind: "attackRoll" }, () => {
      return "AttackRoll" as const;
    }),
    Match.when({ kind: "rolledDice" }, (rolledDice) => {
      if ("spell" in rolledDice) {
        return "SpellDamageRoll" as const;
      }
      return "DamageRoll" as const;
    }),
    Match.when({ kind: "deathSavingThrow" }, () => {
      return "DeathSavingThrow" as const;
    }),
    Match.when({ kind: "statBlockRechargeRoll" }, () => {
      return "StatBlockRechargeRoll" as const;
    }),
    Match.when({ kind: "savingThrowOutcome" }, () => {
      return "SavingThrowOutcome" as const;
    }),
    Match.when({ kind: "skillChoice" }, () => {
      throw new Error("Battle runtime MBT does not model skill choice holes.");
    }),
    Match.when({ kind: "commandOptionChoice" }, () => {
      throw new Error(
        "Battle runtime MBT does not model Command option holes.",
      );
    }),
    Match.when({ kind: "heldObjectFacts" }, () => {
      throw new Error(
        "Battle runtime MBT does not model held-object fact holes.",
      );
    }),
    Match.when({ kind: "concentrationSavingThrow" }, () => {
      throw new Error(
        "Battle runtime MBT does not model concentration saving throw holes.",
      );
    }),
    Match.when({ kind: "damageTypeChoice" }, () => {
      throw new Error("Battle runtime MBT does not model damage type holes.");
    }),
    Match.when({ kind: "reactionDecision" }, () => {
      throw new Error("Battle runtime MBT does not model reaction holes.");
    }),
    Match.when({ kind: "movement" }, () => {
      throw new Error("Battle runtime MBT does not model movement holes.");
    }),
    Match.when({ kind: "abilityCheck" }, () => {
      throw new Error("Battle runtime MBT does not model ability check holes.");
    }),
    Match.when({ kind: "grappleOutcome" }, () => {
      throw new Error("Battle runtime MBT does not model Grapple holes.");
    }),
    Match.when({ kind: "attackDamageDisposition" }, () => {
      throw new Error(
        "Battle runtime MBT does not model attack damage disposition holes.",
      );
    }),
    Match.exhaustive,
  );
}

function holeName(raw: unknown): MbtHole {
  const tag = quintVariantTag(raw);
  if (
    tag === "TargetChoice" ||
    tag === "ObjectTargetChoice" ||
    tag === "SpellTargetAllocation" ||
    tag === "SavingThrowOutcome" ||
    tag === "AttackRoll" ||
    tag === "DamageRoll" ||
    tag === "SpellDamageRoll" ||
    tag === "DeathSavingThrow" ||
    tag === "StatBlockRechargeRoll"
  ) {
    return tag;
  }

  throw new Error(`Unknown Quint battle hole variant: ${tag}`);
}

function deathSavingThrowMbtTurnRole(
  raw: unknown,
  field: string,
): DeathSavingThrowMbtTurnRole {
  if (raw === "actor" || raw === "target") {
    return raw;
  }

  throw new Error(`Expected Death Saving Throw MBT turn role field ${field}.`);
}

function sleepRepeatSaveMbtTurnRole(
  raw: unknown,
  field: string,
): SleepRepeatSaveMbtTurnRole {
  if (raw === "caster" || raw === "target") {
    return raw;
  }

  throw new Error(`Expected Sleep repeat-save MBT turn role field ${field}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
}

function deathSavingThrowFill(
  hole: BattleHole,
  roll: number,
): Extract<BattleFill, { readonly kind: "deathSavingThrow" }> {
  if (hole.kind !== "deathSavingThrow") {
    throw new Error("Expected Death Saving Throw hole.");
  }

  return {
    kind: "deathSavingThrow",
    holeId: hole.holeId,
    value: DieRollResult(roll),
  };
}

function numberFromQuintInt(raw: unknown, field: string): number {
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "bigint") {
    return Number(raw);
  }

  throw new Error(`Expected Quint integer field ${field}.`);
}

function booleanField(
  state: Readonly<Record<string, unknown>>,
  field: string,
): boolean {
  return booleanFromQuint(state[field], field);
}

function booleanFromQuint(value: unknown, field: string): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  return quintSet(raw, "qHoles");
}

function quintSet(raw: unknown, field: string): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error(`Expected Quint ${field} field to be a Set.`);
}

function mbtLastResult(raw: unknown): MbtLastResult {
  if (
    raw === "init" ||
    raw === "needsHoles" ||
    raw === "resolved" ||
    raw === "invalid"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint last result: ${String(raw)}.`);
}

function mbtLastInvalidReason(raw: unknown): MbtLastInvalidReason {
  if (
    raw === "" ||
    raw === "invalidFill" ||
    raw === "staleSubject" ||
    raw === "wrongActor"
  ) {
    return raw;
  }

  throw new Error(`Unknown Quint invalid reason: ${String(raw)}.`);
}

function quintVariantTag(raw: unknown): string {
  if (isRecord(raw) && typeof raw["tag"] === "string") {
    return raw["tag"];
  }

  if (typeof raw === "string") {
    return raw;
  }

  throw new Error(`Expected Quint variant tag, got ${String(raw)}.`);
}

function quintVariantValue(raw: unknown, tag: string): unknown {
  if (isRecord(raw) && raw["tag"] === tag && "value" in raw) {
    return raw["value"];
  }

  throw new Error(`Expected Quint ${tag} variant value.`);
}

function quintVariantRecordValue(
  raw: unknown,
  tag: string,
): Readonly<Record<string, unknown>> {
  const value = quintVariantValue(raw, tag);
  if (isRecord(value)) {
    return value;
  }

  throw new Error(`Expected Quint ${tag} variant record value.`);
}

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
