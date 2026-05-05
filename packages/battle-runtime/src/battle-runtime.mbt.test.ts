import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Either, Match } from "effect";
import { describe, expect, it } from "vitest";

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
import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  ATTACK_DAMAGE_RIDER_SUPPORT_PROFILE,
  battleId,
  battleCombatantSide,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
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
  | "SpellTargetAllocation"
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

const fighterId = combatantId("fighter");
const skeletonId = combatantId("skeleton");
const deathSavingThrowTargetId = combatantId("death-saving-throw-target");
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
    multiattackDispatchesAvailable:
      snapshot.turn.actionResources.filter(
        (resource) =>
          resource.source === "statBlockMultiattack" &&
          resource.sourceOwnerId === skeletonId,
      ).length,
    sneakAttackUsedThisTurn:
      snapshot.turn.attackDamageRidersUsedThisTurn.some(
        (usage) =>
          usage.attackerId === fighterId &&
          usage.unitId === "rogue_sneak_attack",
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

function discoverMagicMissileHoles(
  state: BattleState,
  subject: Extract<BattleSubject, { readonly tag: "actionSpell" }>,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      candidate.subject.actorId === subject.actorId &&
      candidate.subject.spellId === subject.spellId,
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
    spellId: "magic_missile",
    spellActId: "preparedSlotSpell:magic_missile:slot:1",
  };
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
  return {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "endTurn",
  };
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
        spellcastingAbilityModifier: 3,
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [magicMissileSpell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      },
    },
  };
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

function projectHole(hole: BattleHole): MbtHole {
  return Match.value(hole).pipe(
    Match.when({ kind: "targetChoice" }, () => "TargetChoice" as const),
    Match.when(
      { kind: "spellTargetAllocation" },
      () => "SpellTargetAllocation" as const,
    ),
    Match.when({ kind: "attackRoll" }, (attackRoll) => {
      if ("spell" in attackRoll) {
        throw new Error(
          "Battle runtime MBT expected a weapon attack roll hole.",
        );
      }
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
      throw new Error(
        "Battle runtime MBT does not model spell saving throw holes.",
      );
    }),
    Match.when({ kind: "concentrationSavingThrow" }, () => {
      throw new Error(
        "Battle runtime MBT does not model concentration saving throw holes.",
      );
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
    tag === "SpellTargetAllocation" ||
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
  const value = state[field];
  if (typeof value === "boolean") {
    return value;
  }

  throw new Error(`Expected Quint boolean field ${field}.`);
}

function quintHoleSet(raw: unknown): readonly unknown[] {
  if (raw instanceof Set) {
    return [...raw];
  }

  throw new Error("Expected Quint qHoles field to be a Set.");
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
