import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Match } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import { DieRollResult, Hp, movementFeet } from "@dnd/shared/types";
import {
  buildStatBlockCatalog,
  srdStatBlockCollection,
} from "@dnd/surface/surface/stat-block-catalog";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";

import {
  battleId,
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

type MbtHole = "TargetChoice" | "AttackRoll" | "DamageRoll";
type MbtLastResult = "init" | "needsHoles" | "resolved" | "invalid";
type MbtLastInvalidReason = "" | "invalidFill" | "staleSubject";

type MbtProjection = {
  readonly skeletonHp: number;
  readonly skeletonDead: boolean;
  readonly actionAvailable: boolean;
  readonly holes: readonly MbtHole[];
  readonly lastResult: MbtLastResult;
  readonly lastInvalidReason: MbtLastInvalidReason;
};

const fighterId = combatantId("fighter");
const skeletonId = combatantId("skeleton");
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

const driverSchema = {
  init: {},
  doDiscoverAttack: {},
  doFillTarget: {},
  doRejectWrongTarget: {},
  doFillAttackRollMiss: {},
  doFillAttackRollHit: {},
  doFillDamageLow: {},
  doFillDamageHigh: {},
  doRejectStaleAfterResolved: {},
  step: {},
} as const;

function createBattleRuntimeDriver() {
  return defineDriver(driverSchema, () => {
    let state = fighterVsSkeletonBattle();
    let subject = fighterAttackSubject();
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
          attackRollFill(attackRoll, { total: 14, naturalD20: 10 }),
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
      doRejectStaleAfterResolved: () => {
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

function normalizeQuintState(raw: unknown): MbtProjection {
  const state = quintStateRecord(raw);

  return {
    skeletonHp: numberFromQuintInt(state["qSkeletonHp"], "qSkeletonHp"),
    skeletonDead: booleanField(state, "qSkeletonDead"),
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
  if (reason === "invalidFill" || reason === "staleSubject") {
    return reason;
  }

  throw new Error(`Unexpected battle-runtime MBT invalid reason: ${reason}`);
}

const battleRuntimeStateCheck = stateCheck(normalizeQuintState, compareState);

describe("promoted battle-runtime MBT", () => {
  it("replays Fighter weapon Attack traces against a Skeleton target", async () => {
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
    actionAvailable: snapshot.currentTurnResources.actionResources.some(
      (resource) => resource.kind === "action",
    ),
    holes: input.holes.map(projectHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function discoverAttackHoles(
  state: BattleState,
  subject: BattleSubject,
): readonly BattleHole[] {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === subject.tag &&
      candidate.subject.tag === "action" &&
      candidate.subject.attackName === "Flail",
  );
  if (act == null) {
    throw new Error("Expected Fighter Flail attack act.");
  }

  return act.initialHoles;
}

function fighterAttackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId: fighterId,
    action: "attack",
    attackName: "Flail",
  };
}

function fighterVsSkeletonBattle(): BattleState {
  return startBattle({
    battleId: battleId("battle-runtime-mbt-fighter-skeleton"),
    combatants: [
      fighterCreatureInit({ initiative: 20 }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}

function fighterCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: fighterId,
    displayName: "Fighter",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      characterId: characterId("fighter-character"),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      armorClass: defaultArmorClassState(),
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      zeroHpLifecyclePolicy: "usesDeathSavingThrows",
      selectedLoadout: {
        weapon: { unitId: "weapon_flail", grip: "one_handed" },
      },
      attack: flailAttack(),
    },
  };
}

function flailAttack(): NonNullable<
  Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["attack"]
> {
  const weapon = unitLibrary.requireUnit("weapon_flail");
  if (weapon.kind !== "weapon") {
    throw new Error("Expected Flail weapon Unit.");
  }

  return {
    kind: "weapon",
    weapon,
    ability: "str",
    abilityModifier: 3,
  };
}

function skeletonCreatureInit(input: {
  readonly initiative: number;
}): BattleCreatureInit {
  return {
    combatantId: skeletonId,
    displayName: "Skeleton",
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "statBlock",
      statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
      currentHp: Hp(13),
      maxHp: Hp(13),
      tempHp: Hp(0),
      zeroHpLifecyclePolicy: "diesAtZeroHp",
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
  };
}

function attackRollFill(
  hole: BattleHole,
  value: {
    readonly total: number;
    readonly naturalD20: number;
  },
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

function damageRollFill(
  hole: BattleHole,
  value: number,
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [{ results: [DieRollResult(value)] }],
  };
}

function projectHole(hole: BattleHole): MbtHole {
  return Match.value(hole).pipe(
    Match.when({ kind: "targetChoice" }, () => "TargetChoice" as const),
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
        throw new Error(
          "Battle runtime MBT expected a weapon damage roll hole.",
        );
      }
      return "DamageRoll" as const;
    }),
    Match.when({ kind: "deathSavingThrow" }, () => {
      throw new Error("Battle runtime MBT does not model death-save holes.");
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
    Match.exhaustive,
  );
}

function holeName(raw: unknown): MbtHole {
  const tag = quintVariantTag(raw);
  if (tag === "TargetChoice" || tag === "AttackRoll" || tag === "DamageRoll") {
    return tag;
  }

  throw new Error(`Unknown Quint battle hole variant: ${tag}`);
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
  if (raw === "" || raw === "invalidFill" || raw === "staleSubject") {
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
