import { defineDriver, stateCheck } from "@firfi/quint-connect";
import { Either, Match } from "effect";
import { expect } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
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
import magicMissileInput from "../../surface/content/magic_missile.json";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type {
  SpellRecord,
  StatBlockRecord,
  UnitRecord,
} from "@dnd/surface/surface/types";

import {
  ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
  ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
} from "./battle-reducer/attack-main.ts";
import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  battleUnitRefWithSupportProfiles,
  battleId,
  battleCombatantSide,
  characterBattleResourceUsage,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type BattleSubject,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

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
  | "StatBlockRechargeRoll"
  | "LevitateAltitudeChange"
  | "LevitateInitialRise";
type MbtLastResult = "init" | "needsHoles" | "resolved" | "invalid";
type MbtLastInvalidReason = "" | "invalidFill" | "staleSubject" | "wrongActor";
type WeaponAttackOrderingStage =
  | "actSelection"
  | "targetChoice"
  | "attackRoll"
  | "damageDice"
  | "resolved";
type WeaponAttackOrderingError =
  | ""
  | "targetChoiceRequired"
  | "attackRollRequired";
type WeaponAttackOrderingHole = "targetChoice" | "attackRoll" | "rolledDice";
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
type WeaponAttackOrderingProjection = {
  readonly stage: WeaponAttackOrderingStage;
  readonly holes: readonly WeaponAttackOrderingHole[];
  readonly lastResult: MbtLastResult;
  readonly orderingError: WeaponAttackOrderingError;
};

export type ExtraAttackMbtProjection = {
  readonly skeletonHp: number;
  readonly actionAvailable: boolean;
  readonly extraAttackSlotsAvailable: number;
  readonly movementSpentFeet: number;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

export type AdrenalineRushMbtProjection = {
  readonly actorTempHp: number;
  readonly bonusActionAvailable: boolean;
  readonly dashBonusFeet: number;
  readonly featureUsesRemaining: number;
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

export type RogueSteadyAimMbtProjection = {
  readonly bonusActionAvailable: boolean;
  readonly actorSpeedFeet: number;
  readonly nextAttackAdvantageActive: boolean;
  readonly speedZeroActive: boolean;
  readonly attackRollMode: "normal" | "advantage";
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

const fighterId = combatantId("fighter");
const skeletonId = combatantId("skeleton");
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

const weaponAttackOrderingDriverSchema = {
  init: {},
  doDiscoverAttack: {},
  doRejectAttackRollBeforeTargetChoice: {},
  doFillTargetChoice: {},
  doRejectDamageBeforeAttackRoll: {},
  doFillAttackRollMiss: {},
  doFillAttackRollHit: {},
  doFillDamageDice: {},
  step: {},
} as const;

export const promotedMbtTraces = Number(process.env["MBT_TRACES"] ?? 1);

// These specs are finite scenario witnesses. The promoted
// command supplies a broad step count, but each witness keeps its domain limit
// so MBT cannot spend extra steps only replaying stale invalid operations.
export function focusedMbtMaxSteps(domainMaxSteps: number): number {
  const requestedSteps = Number(process.env["MBT_STEPS"] ?? domainMaxSteps);
  return Math.min(requestedSteps, domainMaxSteps);
}

const magicMissileDriverSchema = {
  init: {},
  doFillMagicMissileAllocation: {},
  doFillMagicMissileDamageLow: {},
  doFillMagicMissileDamageHigh: {},
  step: {},
} as const;

const extraAttackDriverSchema = {
  init: {},
  initOneAdditionalAttack: {},
  initTwoAdditionalAttacks: {},
  initThreeAdditionalAttacks: {},
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

const rogueSteadyAimDriverSchema = {
  init: {},
  doSteadyAim: {},
  doRejectAfterMoved: {},
  doRejectSecondAim: {},
  doAttackConsumesAdvantage: {},
  doEndTurnCleanup: {},
  step: {},
} as const;

const scalarBuffDriverSchema = {
  init: {},
  doFillLongstriderTarget: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

export type ExtraAttackDriverAction = Exclude<
  keyof typeof extraAttackDriverSchema,
  | "init"
  | "initOneAdditionalAttack"
  | "initTwoAdditionalAttacks"
  | "initThreeAdditionalAttacks"
  | "step"
>;
export type AdrenalineRushDriverAction = Exclude<
  keyof typeof adrenalineRushDriverSchema,
  "init" | "step"
>;
export type RogueSteadyAimDriverAction = Exclude<
  keyof typeof rogueSteadyAimDriverSchema,
  "init" | "step"
>;
const extraAttackSelectedUnitIds = [
  "fighter_extra_attack",
  "paladin_extra_attack",
  "ranger_extra_attack",
] as const;
type ExtraAttackSelectedUnitId = (typeof extraAttackSelectedUnitIds)[number];
export const extraAttackMbtAdditionalAttackCounts = [1, 2, 3] as const;
type ExtraAttackMbtAdditionalAttackCount =
  (typeof extraAttackMbtAdditionalAttackCounts)[number];
const syntheticExtraAttackMbtUnitIds = [
  "test_synthetic_attack_count_2",
  "test_synthetic_attack_count_3",
] as const;
type SyntheticExtraAttackMbtUnitId =
  (typeof syntheticExtraAttackMbtUnitIds)[number];
type ExtraAttackMbtUnitId =
  | ExtraAttackSelectedUnitId
  | SyntheticExtraAttackMbtUnitId;
type ExtraAttackMbtInitAction =
  | "initOneAdditionalAttack"
  | "initTwoAdditionalAttacks"
  | "initThreeAdditionalAttacks";
export type SelectedUnitIdentityReplaySequence<
  ActionName extends string,
  Projection,
> = {
  readonly name: string;
  readonly actions: readonly ActionName[];
  readonly expected: Projection;
};
export type ExtraAttackSelectedUnitIdentityReplay = {
  readonly driver: "extraAttack";
  readonly taskId: "extra-attack-count-scaling";
  readonly unitId: ExtraAttackSelectedUnitId;
  readonly actions: readonly ExtraAttackDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence<
    ExtraAttackDriverAction,
    ExtraAttackMbtProjection
  >[];
};
export type AdrenalineRushSelectedUnitIdentityReplay = {
  readonly driver: "adrenalineRush";
  readonly taskId: "L1H-ORC-ADRENALINE-RUSH";
  readonly unitId: "orc_adrenaline_rush";
  readonly actions: readonly AdrenalineRushDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence<
    AdrenalineRushDriverAction,
    AdrenalineRushMbtProjection
  >[];
};
export type RogueSteadyAimSelectedUnitIdentityReplay = {
  readonly driver: "rogueSteadyAim";
  readonly taskId: "L3PUTB-01-ROGUE-STEADY-AIM-RUNTIME";
  readonly unitId: "rogue_steady_aim";
  readonly actions: readonly RogueSteadyAimDriverAction[];
  readonly sequences: readonly SelectedUnitIdentityReplaySequence<
    RogueSteadyAimDriverAction,
    RogueSteadyAimMbtProjection
  >[];
};
export type SelectedUnitIdentityReplay =
  | ExtraAttackSelectedUnitIdentityReplay
  | AdrenalineRushSelectedUnitIdentityReplay
  | RogueSteadyAimSelectedUnitIdentityReplay;
type SelectedUnitIdentityReplayUnitId = SelectedUnitIdentityReplay["unitId"];
type SelectedReplayDriver<ActionName extends string, Projection> = {
  readonly actions: Readonly<
    Record<
      ActionName,
      { readonly handler: (input: Record<string, never>) => unknown }
    >
  >;
  readonly getState?: () => Projection;
};

async function runSelectedIdentityReplay<ActionName extends string, Projection>(
  replay: {
    readonly unitId: SelectedUnitIdentityReplayUnitId;
    readonly actions: readonly ActionName[];
    readonly sequences: readonly SelectedUnitIdentityReplaySequence<
      ActionName,
      Projection
    >[];
  },
  createDriver: () => SelectedReplayDriver<ActionName, Projection>,
): Promise<void> {
  const replayedActions = new Set<ActionName>();

  for (const sequence of replay.sequences) {
    const driver = createDriver();

    for (const actionName of sequence.actions) {
      resetSelectedUnitRuntimeBoundaryIds();
      replayedActions.add(actionName);
      await driver.actions[actionName].handler({});
      expect(
        selectedUnitRuntimeBoundaryIds.has(replay.unitId),
        `${replay.unitId}:${sequence.name}:${actionName} must bind its Unit id`,
      ).toBe(true);
    }

    const runtime = driver.getState?.();
    if (runtime === undefined) {
      throw new Error("Selected identity replay driver must expose getState.");
    }
    expect(runtime, `${replay.unitId}:${sequence.name}`).toEqual(
      sequence.expected,
    );
  }

  expect(replayedActions).toEqual(new Set(replay.actions));
}

export async function runSelectedUnitIdentityReplay(
  replay: SelectedUnitIdentityReplay,
): Promise<void> {
  if (replay.driver === "extraAttack") {
    await runSelectedIdentityReplay(
      replay,
      createExtraAttackDriver(replay.unitId),
    );
    return;
  }
  if (replay.driver === "adrenalineRush") {
    await runSelectedIdentityReplay(replay, createAdrenalineRushDriver());
    return;
  }
  await runSelectedIdentityReplay(replay, createRogueSteadyAimDriver());
}

const selectedUnitRuntimeBoundaryIds = new Set<string>();

function resetSelectedUnitRuntimeBoundaryIds(): void {
  selectedUnitRuntimeBoundaryIds.clear();
}

function recordSelectedUnitRuntimeBoundaryId<UnitId extends string>(
  unitId: UnitId,
): UnitId {
  selectedUnitRuntimeBoundaryIds.add(unitId);
  return unitId;
}

export function createBattleRuntimeDriver() {
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
      fills = fillsWithMbtSpellCastReactionFacts(holes, nextFills);
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

export function createWeaponAttackOrderingDriver() {
  return defineDriver(weaponAttackOrderingDriverSchema, () => {
    let state = fighterVsSkeletonBattle();
    const subject = fighterAttackSubject();
    let fills: readonly BattleFill[] = [];
    let holes: readonly BattleHole[] = [];
    let stage: WeaponAttackOrderingProjection["stage"] = "actSelection";
    let lastResult: WeaponAttackOrderingProjection["lastResult"] = "init";
    let orderingError: WeaponAttackOrderingProjection["orderingError"] = "";

    function reset(): void {
      state = fighterVsSkeletonBattle();
      fills = [];
      holes = [];
      stage = "actSelection";
      lastResult = "init";
      orderingError = "";
    }

    function recordAccepted(
      result: BattleResolutionResult,
      nextStage: WeaponAttackOrderingProjection["stage"],
    ): void {
      lastResult = result.tag;
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        stage = nextStage;
        orderingError = "";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        stage = nextStage;
        orderingError = "";
        return;
      }
      throw new Error(`Expected accepted weapon attack ordering fill.`);
    }

    function recordOrderingRejection(
      result: BattleResolutionResult,
      expectedOrderingError: Exclude<
        WeaponAttackOrderingProjection["orderingError"],
        ""
      >,
      expectedMessage: string,
    ): void {
      if (
        result.tag !== "invalid" ||
        result.reason !== "invalidFill" ||
        result.message !== expectedMessage
      ) {
        throw new Error(
          `Expected weapon attack ordering fill rejection: ${expectedMessage}`,
        );
      }
      lastResult = result.tag;
      orderingError = expectedOrderingError;
    }

    return {
      init: reset,
      doDiscoverAttack: () => {
        holes = discoverAttackHoles(state, subject);
        stage = "targetChoice";
        lastResult = "needsHoles";
        orderingError = "";
      },
      doRejectAttackRollBeforeTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        const attackRoll = requireHole(
          holesAfterFills(state, subject, [targetFill(target, skeletonId)]),
          "attackRoll",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state,
            subject,
            fills: [attackRollFill(attackRoll, { total: 14, naturalD20: 10 })],
          }),
          "targetChoiceRequired",
          ATTACK_TARGET_REQUIRED_BEFORE_ROLL_OR_DAMAGE_MESSAGE,
        );
      },
      doFillTargetChoice: () => {
        const target = requireHole(holes, "targetChoice");
        fills = [targetFill(target, skeletonId)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "attackRoll",
        );
      },
      doRejectDamageBeforeAttackRoll: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        const damage = requireHole(
          holesAfterFills(state, subject, [
            ...fills,
            attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
          ]),
          "rolledDice",
        );
        recordOrderingRejection(
          resolveBattleSubject({
            state,
            subject,
            fills: [...fills, damageRollFill(damage, 3)],
          }),
          "attackRollRequired",
          ATTACK_ROLL_REQUIRED_BEFORE_DAMAGE_MESSAGE,
        );
      },
      doFillAttackRollMiss: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 13, naturalD20: 9 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      doFillAttackRollHit: () => {
        const attackRoll = requireHole(holes, "attackRoll");
        fills = [
          ...fills,
          attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
        ];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "damageDice",
        );
      },
      doFillDamageDice: () => {
        const damage = requireHole(holes, "rolledDice");
        fills = [...fills, damageRollFill(damage, 3)];
        recordAccepted(
          resolveBattleSubject({ state, subject, fills }),
          "resolved",
        );
      },
      step: () => {},
      getState: () =>
        projectWeaponAttackOrderingState({
          holes,
          stage,
          lastResult,
          orderingError,
        }),
    };
  });
}

export function createExtraAttackDriver(
  unitId: ExtraAttackMbtUnitId = "fighter_extra_attack",
  schema: typeof extraAttackDriverSchema = extraAttackDriverSchema,
) {
  return defineDriver(schema, () => {
    let state = extraAttackBattle(unitId);
    let currentUnitId = unitId;
    let subject: BattleSubject = fighterAttackSubject();
    let lastResult: ExtraAttackMbtProjection["lastResult"] = "init";
    let lastInvalidReason: ExtraAttackMbtProjection["lastInvalidReason"] = "";

    function resetUnit(nextUnitId: ExtraAttackMbtUnitId): void {
      currentUnitId = nextUnitId;
      state = extraAttackBattle(nextUnitId);
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
      recordExtraAttackBoundaryFromState(state, currentUnitId);
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
      recordExtraAttackBoundaryFromState(state, currentUnitId);
    }

    return {
      init: () => {
        resetUnit(unitId);
      },
      initOneAdditionalAttack: () => {
        resetUnit(extraAttackMbtUnitIdForAdditionalAttacks(1));
      },
      initTwoAdditionalAttacks: () => {
        resetUnit(extraAttackMbtUnitIdForAdditionalAttacks(2));
      },
      initThreeAdditionalAttacks: () => {
        resetUnit(extraAttackMbtUnitIdForAdditionalAttacks(3));
      },
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

export function createMagicMissileDriver() {
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
      fills = fillsWithMbtSpellCastReactionFacts(holes, nextFills);
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

export function createScalarBuffDriver() {
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

export function createAdrenalineRushDriver(
  schema: typeof adrenalineRushDriverSchema = adrenalineRushDriverSchema,
) {
  return defineDriver(schema, () => {
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

export function createRogueSteadyAimDriver(
  schema: typeof rogueSteadyAimDriverSchema = rogueSteadyAimDriverSchema,
) {
  return defineDriver(schema, () => {
    let state = rogueSteadyAimBattle();
    let lastResult: RogueSteadyAimMbtProjection["lastResult"] = "init";
    let lastInvalidReason: RogueSteadyAimMbtProjection["lastInvalidReason"] =
      "";

    function reset(): void {
      state = rogueSteadyAimBattle();
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

    function resolveAttack(): void {
      const subject = fighterAttackSubject();
      const targetHole = requireHole(
        discoverAttackHoles(state, subject),
        "targetChoice",
      );
      const target = targetFill(targetHole, skeletonId);
      const attackRollHole = requireHole(
        holesAfterFills(state, subject, [target]),
        "attackRoll",
      );
      const attackRoll = attackRollFill(attackRollHole, {
        total: 16,
        naturalD20: 11,
        rollMode: "advantage",
      });
      const damageHole = requireHole(
        holesAfterFills(state, subject, [target, attackRoll]),
        "rolledDice",
      );
      recordResult(
        resolveBattleSubject({
          state,
          subject,
          fills: [target, attackRoll, damageRollFill(damageHole, 4)],
        }),
      );
    }

    return {
      init: reset,
      doSteadyAim: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: rogueSteadyAimSubject(),
            fills: [],
          }),
        );
      },
      doRejectAfterMoved: () => {
        state = rogueSteadyAimBattleWithMovementSpent();
        recordResult(
          resolveBattleSubject({
            state,
            subject: rogueSteadyAimSubject(),
            fills: [],
          }),
        );
      },
      doRejectSecondAim: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: rogueSteadyAimSubject(),
            fills: [],
          }),
        );
      },
      doAttackConsumesAdvantage: resolveAttack,
      doEndTurnCleanup: () => {
        recordResult(
          resolveBattleSubject({
            state,
            subject: endTurnSubject(),
            fills: [],
          }),
        );
      },
      step: () => {},
      getState: () =>
        projectRogueSteadyAimMbtState({
          state,
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

function normalizeWeaponAttackOrderingQuintState(
  raw: unknown,
): WeaponAttackOrderingProjection {
  const state = quintStateRecord(raw);

  return {
    stage: weaponAttackOrderingStage(state["qStage"]),
    holes: quintSet(state["qHoles"], "qHoles")
      .map(weaponAttackOrderingHole)
      .sort(),
    lastResult: mbtLastResult(state["qLastResult"]),
    orderingError: weaponAttackOrderingError(state["qLastOrderingError"]),
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

function normalizeRogueSteadyAimQuintState(
  raw: unknown,
): RogueSteadyAimMbtProjection {
  const state = quintStateRecord(raw);

  return {
    bonusActionAvailable: booleanField(state, "qBonusActionAvailable"),
    actorSpeedFeet: numberFromQuintInt(
      state["qActorSpeedFeet"],
      "qActorSpeedFeet",
    ),
    nextAttackAdvantageActive: booleanField(
      state,
      "qNextAttackAdvantageActive",
    ),
    speedZeroActive: booleanField(state, "qSpeedZeroActive"),
    attackRollMode: booleanField(state, "qAttackRollAdvantage")
      ? "advantage"
      : "normal",
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

function compareState(spec: MbtProjection, impl: MbtProjection): boolean {
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

export const battleRuntimeStateCheck = stateCheck(
  normalizeQuintState,
  compareState,
);
export const weaponAttackOrderingStateCheck = stateCheck(
  normalizeWeaponAttackOrderingQuintState,
  (
    spec: WeaponAttackOrderingProjection,
    impl: WeaponAttackOrderingProjection,
  ) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const extraAttackStateCheck = stateCheck(
  normalizeExtraAttackQuintState,
  (spec: ExtraAttackMbtProjection, impl: ExtraAttackMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const adrenalineRushStateCheck = stateCheck(
  normalizeAdrenalineRushQuintState,
  (spec: AdrenalineRushMbtProjection, impl: AdrenalineRushMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const rogueSteadyAimStateCheck = stateCheck(
  normalizeRogueSteadyAimQuintState,
  (spec: RogueSteadyAimMbtProjection, impl: RogueSteadyAimMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
export const scalarBuffStateCheck = stateCheck(
  normalizeScalarBuffQuintState,
  (spec: ScalarBuffMbtProjection, impl: ScalarBuffMbtProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);
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
    holes: projectHoles(input.holes),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function projectWeaponAttackOrderingState(input: {
  readonly holes: readonly BattleHole[];
  readonly stage: WeaponAttackOrderingProjection["stage"];
  readonly lastResult: WeaponAttackOrderingProjection["lastResult"];
  readonly orderingError: WeaponAttackOrderingProjection["orderingError"];
}): WeaponAttackOrderingProjection {
  return {
    stage: input.stage,
    holes: input.holes.map(weaponAttackOrderingHoleFromRuntime).sort(),
    lastResult: input.lastResult,
    orderingError: input.orderingError,
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

function recordExtraAttackBoundaryFromState(
  state: BattleState,
  unitId: ExtraAttackMbtUnitId,
): void {
  if (
    state.currentTurnResources.actionResources.some(
      (resource) =>
        resource.source === "classFeatureExtraAttack" &&
        resource.sourceUnitId === unitId,
    )
  ) {
    recordSelectedUnitRuntimeBoundaryId(unitId);
  }
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

function projectRogueSteadyAimMbtState(input: {
  readonly state: BattleState;
  readonly lastResult: RogueSteadyAimMbtProjection["lastResult"];
  readonly lastInvalidReason: RogueSteadyAimMbtProjection["lastInvalidReason"];
}): RogueSteadyAimMbtProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === fighterId,
  );
  const actorState = input.state.combatants.get(fighterId);
  if (actor == null || actorState === undefined) {
    throw new Error("Expected Steady Aim MBT actor.");
  }
  const nextAttackAdvantageActive = actorState.activeEffects.some(
    (effect) =>
      effect.kind === "nextAttackRollBySelf" &&
      "sourceUnitId" in effect &&
      effect.sourceUnitId === "rogue_steady_aim" &&
      effect.mode === "advantage",
  );
  const speedZeroActive = actorState.activeEffects.some(
    (effect) =>
      effect.kind === "selfSpeedZero" &&
      effect.sourceUnitId === "rogue_steady_aim",
  );
  return {
    bonusActionAvailable: snapshot.turn.bonusActionAvailable,
    actorSpeedFeet: Number(actor.movement.speedFeet),
    nextAttackAdvantageActive,
    speedZeroActive,
    attackRollMode: nextAttackAdvantageActive ? "advantage" : "normal",
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
    holes: projectHoles(input.holes),
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
    sourceUnitId: recordSelectedUnitRuntimeBoundaryId("orc_adrenaline_rush"),
    action: "dash",
    speedKind: "walk",
  };
}

function rogueSteadyAimSubject(): Extract<
  BattleSubject,
  { readonly tag: "unitFeature" }
> {
  return {
    tag: "unitFeature",
    actorId: fighterId,
    unitId: recordSelectedUnitRuntimeBoundaryId("rogue_steady_aim"),
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

function extraAttackBattle(
  unitId: ExtraAttackMbtUnitId = "fighter_extra_attack",
): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-extra-attack"),
    combatants: [
      extraAttackCreatureInit({ initiative: 20, unitId }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function extraAttackMbtUnitIdForAdditionalAttacks(
  additionalAttacks: ExtraAttackMbtAdditionalAttackCount,
): ExtraAttackMbtUnitId {
  if (additionalAttacks === 1) return "fighter_extra_attack";
  if (additionalAttacks === 2) return "test_synthetic_attack_count_2";
  return "test_synthetic_attack_count_3";
}

export function extraAttackMbtInitAction(
  additionalAttacks: ExtraAttackMbtAdditionalAttackCount,
): ExtraAttackMbtInitAction {
  if (additionalAttacks === 1) return "initOneAdditionalAttack";
  if (additionalAttacks === 2) return "initTwoAdditionalAttacks";
  return "initThreeAdditionalAttacks";
}

function extraAttackMbtUnit(unitId: ExtraAttackMbtUnitId): UnitRecord {
  if (unitId === "test_synthetic_attack_count_2") {
    return syntheticExtraAttackMbtUnit(2);
  }
  if (unitId === "test_synthetic_attack_count_3") {
    return syntheticExtraAttackMbtUnit(3);
  }
  return unitLibrary.requireUnit(unitId);
}

function syntheticExtraAttackMbtUnit(
  additionalAttacks: Exclude<ExtraAttackMbtAdditionalAttackCount, 1>,
): UnitRecord {
  const unit = unitLibrary.requireUnit("fighter_extra_attack");
  if (unit.kind !== "class_feature" || unit.mechanics.family !== "passive") {
    throw new Error("Expected passive Fighter Extra Attack Unit.");
  }
  return {
    ...unit,
    id: `test_synthetic_attack_count_${additionalAttacks}`,
    name: `Synthetic Attack Count ${additionalAttacks}`,
    description: `Synthetic fixture for ${additionalAttacks} additional Attack action attack(s).`,
    provenance: {
      kind: "srd-5.2.1",
      section:
        additionalAttacks === 2
          ? "Classes/Fighter#Two Extra Attacks"
          : "Classes/Fighter#Three Extra Attacks",
    },
    mechanics: {
      ...unit.mechanics,
      grants: [{ kind: "scale_attack_count", additional: additionalAttacks }],
    },
  };
}

function extraAttackMbtClassLevel(unitId: ExtraAttackMbtUnitId): number {
  if (unitId === "test_synthetic_attack_count_2") return 11;
  if (unitId === "test_synthetic_attack_count_3") return 20;
  return 5;
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

function rogueSteadyAimBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("battle-runtime-mbt-rogue-steady-aim"),
    combatants: [
      rogueSteadyAimCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function rogueSteadyAimBattleWithMovementSpent(): BattleState {
  const state = rogueSteadyAimBattle();
  const actor = state.combatants.get(fighterId);
  if (actor === undefined) {
    throw new Error("Expected Steady Aim MBT actor.");
  }
  return {
    ...state,
    combatants: new Map(state.combatants).set(fighterId, {
      ...actor,
      movementSpentFeet: movementFeet(5),
    }),
  };
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
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
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
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
}

function rogueSteadyAimCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  const steadyAim = unitLibrary.requireUnit("rogue_steady_aim");
  if (steadyAim.kind !== "class_feature") {
    throw new Error("Expected Steady Aim class feature Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: "Rogue",
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId("steady-aim-rogue-character"),
      characterUnitRefs: [rogueSteadyAimUnitRef(steadyAim)],
      classLevels: [{ className: "rogue", level: 3 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
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
      unitFeatures: [{ unit: steadyAim }],
    },
  };
}

function extraAttackCreatureInit(input: {
  readonly initiative: number;
  readonly unitId: ExtraAttackMbtUnitId;
}): BattleCreatureInit {
  const unit = extraAttackMbtUnit(input.unitId);
  if (unit.kind !== "class_feature") {
    throw new Error("Expected Extra Attack class-feature Unit.");
  }
  return {
    combatantId: fighterId,
    displayName: `${unit.className} Extra Attacker`,
    initiative: initiativeScore(input.initiative),
    side: partySide,
    creatureInit: {
      kind: "character",
      characterId: characterId(`extra-attack-${unit.className}-character`),
      characterUnitRefs: [extraAttackUnitRef(unit)],
      classLevels: [
        {
          className: unit.className,
          level: extraAttackMbtClassLevel(input.unitId),
        },
      ],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
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
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
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
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics({ str: 16 }),
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
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
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

function rogueSteadyAimUnitRef(
  unit: UnitRecord,
): Extract<
  BattleCreatureInit["creatureInit"],
  { readonly kind: "character" }
>["characterUnitRefs"][number] {
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
    classLevels: [{ className: "rogue", level: 3 }],
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

function fillsWithMbtSpellCastReactionFacts(
  holes: readonly BattleHole[],
  fills: readonly BattleFill[],
): readonly BattleFill[] {
  const filledHoleIds = new Set(
    fills
      .filter((fill) => fill.kind === "targetSpatialFacts")
      .map((fill) => fill.holeId),
  );
  const spellCastReactionFactFills = holes.flatMap(
    (
      hole,
    ): readonly Extract<
      BattleFill,
      { readonly kind: "targetSpatialFacts" }
    >[] =>
      hole.kind === "targetSpatialFacts" && !filledHoleIds.has(hole.holeId)
        ? [
            {
              kind: "targetSpatialFacts",
              holeId: hole.holeId,
              spatialFacts: [],
            },
          ]
        : [],
  );
  return spellCastReactionFactFills.length === 0
    ? fills
    : [...fills, ...spellCastReactionFactFills];
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

function projectHoles(holes: readonly BattleHole[]): readonly MbtHole[] {
  return holes.flatMap(projectHole).sort();
}

function projectHole(hole: BattleHole): readonly MbtHole[] {
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
  if (hole.kind === "conditionChoice") {
    throw new Error(
      "Battle runtime MBT does not model condition choice holes.",
    );
  }
  if (hole.kind === "spellAreaChoice") {
    throw new Error("Battle runtime MBT does not model spell area holes.");
  }
  if (hole.kind === "sanctuaryInterdictionOutcome") {
    throw new Error("Battle runtime MBT does not model Sanctuary holes.");
  }
  if (hole.kind === "dancingLightsPlacement") {
    throw new Error(
      "Battle runtime MBT does not model Dancing Lights placement holes.",
    );
  }
  if (hole.kind === "thaumaturgyActiveOneMinuteEffectCount") {
    throw new Error(
      "Battle runtime MBT does not model Thaumaturgy active-effect count holes.",
    );
  }
  if (hole.kind === "targetSpatialFacts") {
    // The active MBT suites do not branch on Counterspell table facts; they
    // prefill this projection-only hole with an empty fact set before submit.
    return [];
  }
  if (hole.kind === "teleportDestination") {
    throw new Error(
      "Battle runtime MBT does not model teleport destination holes.",
    );
  }
  if (hole.kind === "spiritualWeaponForcePosition") {
    throw new Error(
      "Battle runtime aggregate MBT does not model Spiritual Weapon force-position holes.",
    );
  }
  if (hole.kind === "movableZoneRamMovement") {
    throw new Error(
      "Battle runtime MBT does not model movable zone ram movement holes.",
    );
  }
  if (hole.kind === "movableZoneRepositionMovement") {
    throw new Error(
      "Battle runtime MBT does not model movable zone reposition movement holes.",
    );
  }
  if (hole.kind === "selfTransformationModeChoice") {
    throw new Error(
      "Battle runtime MBT does not model self-transformation mode holes.",
    );
  }
  if (hole.kind === "objectContactTargets") {
    throw new Error(
      "Battle runtime MBT does not model object contact target holes.",
    );
  }
  if (hole.kind === "gustOfWindLineDirectionChoice") {
    throw new Error(
      "Battle runtime MBT does not model Gust of Wind direction-choice holes.",
    );
  }
  if (hole.kind === "objectDropResolution") {
    throw new Error(
      "Battle runtime MBT does not model object drop resolution holes.",
    );
  }
  if (hole.kind === "magicWeaponTargetItem") {
    throw new Error(
      "Battle runtime MBT does not model Magic Weapon target-item holes.",
    );
  }
  if (hole.kind === "ongoingSpellTargetChoice") {
    throw new Error(
      "Battle runtime MBT does not model ongoing spell target holes.",
    );
  }
  if (hole.kind === "spellcastingAbilityCheck") {
    throw new Error(
      "Battle runtime MBT does not model spellcasting ability check holes.",
    );
  }
  if (hole.kind === "levitateAltitudeChange") {
    return ["LevitateAltitudeChange"];
  }
  if (hole.kind === "levitateInitialRise") {
    return ["LevitateInitialRise"];
  }
  if (hole.kind === "targetAbilityChoices") {
    throw new Error(
      "Battle runtime MBT does not model target ability choices holes.",
    );
  }
  if (hole.kind === "hitPointHealingDistribution") {
    throw new Error(
      "Battle runtime MBT does not model Hit Point healing distribution holes.",
    );
  }
  if (hole.kind === "wildShapeEquipmentDisposition") {
    throw new Error(
      "Generic battle runtime MBT leaves Wild Shape equipment disposition holes to focused Wild Shape equipment witnesses.",
    );
  }
  if (hole.kind === "findFamiliarConnection") {
    throw new Error(
      "Generic battle runtime MBT leaves companion connection holes to focused companion witnesses.",
    );
  }
  if (
    hole.kind === "companionReappearancePlacement" ||
    hole.kind === "companionReappearanceInitiative"
  ) {
    throw new Error(
      "Generic battle runtime MBT leaves companion reappearance holes to focused companion witnesses.",
    );
  }
  return [
    Match.value(hole).pipe(
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
        throw new Error(
          "Battle runtime aggregate MBT does not model Death Saving Throw holes.",
        );
      }),
      Match.when({ kind: "statBlockRechargeRoll" }, () => {
        return "StatBlockRechargeRoll" as const;
      }),
      Match.when({ kind: "savingThrowOutcome" }, () => {
        return "SavingThrowOutcome" as const;
      }),
      Match.when({ kind: "skillChoice" }, () => {
        throw new Error(
          "Battle runtime MBT does not model skill choice holes.",
        );
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
      Match.when({ kind: "interruptDecision" }, () => {
        throw new Error("Battle runtime MBT does not model reaction holes.");
      }),
      Match.when({ kind: "movement" }, () => {
        throw new Error("Battle runtime MBT does not model movement holes.");
      }),
      Match.when({ kind: "abilityCheck" }, () => {
        throw new Error(
          "Battle runtime MBT does not model ability check holes.",
        );
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
    ),
  ];
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
    tag === "StatBlockRechargeRoll" ||
    tag === "LevitateAltitudeChange" ||
    tag === "LevitateInitialRise"
  ) {
    return tag;
  }

  throw new Error(`Unknown Quint battle hole variant: ${tag}`);
}

function weaponAttackOrderingStage(raw: unknown): WeaponAttackOrderingStage {
  const tag = quintVariantTag(raw);
  if (tag === "WeaponAttackActSelectionStage") return "actSelection";
  if (tag === "WeaponAttackTargetChoiceStage") return "targetChoice";
  if (tag === "WeaponAttackAttackRollStage") return "attackRoll";
  if (tag === "WeaponAttackDamageDiceStage") return "damageDice";
  if (tag === "WeaponAttackResolvedStage") return "resolved";

  throw new Error(`Unknown weapon attack ordering stage: ${tag}`);
}

function weaponAttackOrderingHole(raw: unknown): WeaponAttackOrderingHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoiceHoleKind") return "targetChoice";
  if (tag === "AttackRollHoleKind") return "attackRoll";
  if (tag === "RolledDiceHoleKind") return "rolledDice";

  throw new Error(`Unknown weapon attack ordering hole: ${tag}`);
}

function weaponAttackOrderingHoleFromRuntime(
  hole: Pick<BattleHole, "kind">,
): WeaponAttackOrderingHole {
  if (hole.kind === "targetChoice") return "targetChoice";
  if (hole.kind === "attackRoll") return "attackRoll";
  if (hole.kind === "rolledDice") return "rolledDice";

  throw new Error(`Unexpected weapon attack ordering hole: ${hole.kind}`);
}

function weaponAttackOrderingError(raw: unknown): WeaponAttackOrderingError {
  if (
    raw === "" ||
    raw === "targetChoiceRequired" ||
    raw === "attackRollRequired"
  ) {
    return raw;
  }

  throw new Error(`Unknown weapon attack ordering error: ${String(raw)}.`);
}

function quintStateRecord(raw: unknown): Readonly<Record<string, unknown>> {
  if (!isRecord(raw)) {
    throw new Error("Expected Quint state to be an object.");
  }

  return raw;
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

function isRecord(raw: unknown): raw is Readonly<Record<string, unknown>> {
  return typeof raw === "object" && raw !== null;
}
