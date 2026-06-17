// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt stat-block.attack-control
// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
import { isDeepStrictEqual } from "node:util";

import { describe, it } from "vitest";

import type { StatBlockRecord } from "@dnd/surface/surface/types";

import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  quintVariantMappedValue,
  run,
  stateCheck,
  type MbtWitnessLastInvalidReason,
  type MbtWitnessLastResult,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  battleId,
  combatantId,
  damageRollFill,
  DieRollResult,
  hasCondition,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  statBlockRecord,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";
import type { BattleResolutionResult } from "./index.ts";

const sizeGatedConditionRiderHoles = [
  "TargetChoice",
  "AttackRoll",
  "DamageRoll",
] as const;
type SizeGatedConditionRiderHole =
  (typeof sizeGatedConditionRiderHoles)[number];

const targetSizeGates = [
  "mediumOrSmaller",
  "larger",
  "mediumOrSmallerProneImmune",
] as const;
type TargetSizeGate = (typeof targetSizeGates)[number];

type SizeGatedConditionRiderProjection = {
  readonly targetHp: number;
  readonly targetProne: boolean;
  readonly targetSizeGate: TargetSizeGate;
  readonly holes: readonly SizeGatedConditionRiderHole[];
  readonly lastResult: MbtWitnessLastResult;
  readonly lastInvalidReason: MbtWitnessLastInvalidReason<"none">;
};

type StatBlockAttack = NonNullable<
  NonNullable<StatBlockRecord["statBlock"]["actions"]>["attacks"]
>[number];

const actorId = combatantId("stat-block-size-rider-mbt-actor");
const targetId = combatantId("stat-block-size-rider-mbt-target");
const biteAttackName = "Bite";

const TARGET_SIZE_GATE_BY_TAG = {
  MediumOrSmallerTarget: "mediumOrSmaller",
  LargerTarget: "larger",
  MediumOrSmallerProneImmuneTarget: "mediumOrSmallerProneImmune",
} as const satisfies Readonly<Record<string, TargetSizeGate>>;

const HOLE_BY_TAG = {
  TargetChoice: "TargetChoice",
  AttackRoll: "AttackRoll",
  DamageRoll: "DamageRoll",
} as const satisfies Readonly<Record<string, SizeGatedConditionRiderHole>>;

const driverSchema = {
  initMediumOrSmallerTarget: {},
  initLargerTarget: {},
  initMediumOrSmallerProneImmuneTarget: {},
  doFillTargetChoice: {},
  doFillHitAttackRoll: {},
  doResolveDamage: {},
  step: {},
} as const;

function createSizeGatedConditionRiderDriver() {
  return defineDriver(driverSchema, () => {
    let state = sizeGatedConditionRiderBattle("mediumOrSmaller");
    let targetSizeGate: TargetSizeGate = "mediumOrSmaller";
    let holes: readonly BattleHole[] = [];
    let targetChoice: Extract<
      BattleFill,
      { readonly kind: "targetChoice" }
    > | null = null;
    let attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }> | null =
      null;
    let lastResult: MbtWitnessLastResult = "init";

    function reset(nextTargetSizeGate: TargetSizeGate): void {
      state = sizeGatedConditionRiderBattle(nextTargetSizeGate);
      targetSizeGate = nextTargetSizeGate;
      targetChoice = null;
      attackRoll = null;
      const result = resolveBattleSubject({
        state,
        subject: attackSubject(),
        fills: [],
      });
      if (result.tag !== "needsHoles") {
        throw new Error(
          `Expected initial Stat Block size-gated condition target choice, got ${result.tag}.`,
        );
      }
      state = result.state;
      holes = result.holes;
      lastResult = "init";
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastResult = "resolved";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastResult = "needsHoles";
        return;
      }
      throw new Error(
        `Unexpected Stat Block size-gated condition MBT invalid result: ${result.reason}`,
      );
    }

    function resolveCurrentSubject(fills: readonly BattleFill[]): void {
      recordResult(
        resolveBattleSubject({
          state,
          subject: attackSubject(),
          fills,
        }),
      );
    }

    return {
      initMediumOrSmallerTarget: () => reset("mediumOrSmaller"),
      initLargerTarget: () => reset("larger"),
      initMediumOrSmallerProneImmuneTarget: () =>
        reset("mediumOrSmallerProneImmune"),
      doFillTargetChoice: () => {
        targetChoice = targetChoiceFill(
          requireHole(holes, "targetChoice"),
        );
        resolveCurrentSubject([targetChoice]);
      },
      doFillHitAttackRoll: () => {
        const selectedTargetChoice = requireTargetChoice(targetChoice);
        attackRoll = attackRollFillForHit(
          requireHole(holes, "attackRoll"),
        );
        resolveCurrentSubject([selectedTargetChoice, attackRoll]);
      },
      doResolveDamage: () => {
        const selectedTargetChoice = requireTargetChoice(targetChoice);
        const selectedAttackRoll = requireAttackRoll(attackRoll);
        resolveCurrentSubject([
          selectedTargetChoice,
          selectedAttackRoll,
          damageRollFill(requireHole(holes, "rolledDice"), 1),
        ]);
      },
      step: () => {},
      getState: () =>
        projectSizeGatedConditionRiderState({
          state,
          targetSizeGate,
          holes,
          lastResult,
        }),
    };
  });
}

function attackRollFillForHit(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: {
      total: 20,
      naturalD20: DieRollResult(12),
    },
  };
}

const sizeGatedConditionRiderStateCheck = stateCheck(
  normalizeSizeGatedConditionRiderQuintState,
  compareSizeGatedConditionRiderStates,
);

const sizeGatedConditionRiderDefaultMbtSteps = 3;

describe("Stat Block size-gated condition rider focused MBT", () => {
  it(
    "replays a hit applying Prone to a Medium-or-smaller target",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt",
        ),
        init: "initMediumOrSmallerTarget",
        step: "step",
        driver: createSizeGatedConditionRiderDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          sizeGatedConditionRiderDefaultMbtSteps,
        ),
        stateCheck: sizeGatedConditionRiderStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays a hit withholding Prone from a larger target",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt",
        ),
        init: "initLargerTarget",
        step: "step",
        driver: createSizeGatedConditionRiderDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          sizeGatedConditionRiderDefaultMbtSteps,
        ),
        stateCheck: sizeGatedConditionRiderStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );

  it(
    "replays a hit withholding Prone from an immune Medium-or-smaller target",
    async () => {
      await run({
        spec: mbtSpecPath(
          import.meta.dirname,
          "battle-runtime-stat-block-size-gated-condition-rider.mbt.qnt",
        ),
        init: "initMediumOrSmallerProneImmuneTarget",
        step: "step",
        driver: createSizeGatedConditionRiderDriver(),
        backend: "typescript",
        seed: process.env["QUINT_SEED"],
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(
          sizeGatedConditionRiderDefaultMbtSteps,
        ),
        stateCheck: sizeGatedConditionRiderStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function attackSubject(): Extract<
  BattleSubject,
  { readonly tag: "action"; readonly action: "attack" }
> {
  return {
    tag: "action",
    actorId,
    action: "attack",
    attackName: biteAttackName,
  };
}

function sizeGatedConditionRiderBattle(
  targetSizeGate: TargetSizeGate,
): BattleState {
  return startBattleRight({
    battleId: battleId("stat-block-size-gated-condition-rider-mbt"),
    combatants: [
      statBlockCreatureInit({
        combatantId: actorId,
        displayName: "Stat Block Size-Gated Condition Attacker",
        initiative: 20,
        statBlock: sizeGatedConditionRiderAttackerStatBlock(),
      }),
      statBlockCreatureInit({
        combatantId: targetId,
        displayName: sizeGatedConditionRiderTargetDisplayName(
          targetSizeGate,
        ),
        initiative: 10,
        statBlock: sizeGatedConditionRiderTargetStatBlock(targetSizeGate),
      }),
    ],
  });
}

function sizeGatedConditionRiderAttackerStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  return {
    ...base,
    id: "stat_block_size_gated_condition_rider_mbt_attacker",
    name: "Stat Block Size-Gated Condition Attacker",
    provenance: {
      kind: "srd-5.2.1",
      section: "Stat Block size-gated condition rider MBT fixture",
    },
    statBlock: {
      ...base.statBlock,
      displayName: "Stat Block Size-Gated Condition Attacker",
      actions: { attacks: [biteAttack()] },
    },
  };
}

function sizeGatedConditionRiderTargetStatBlock(
  targetSizeGate: TargetSizeGate,
): StatBlockRecord {
  const base = statBlockRecord();
  return {
    ...base,
    id: sizeGatedConditionRiderTargetStatBlockId(targetSizeGate),
    name: sizeGatedConditionRiderTargetDisplayName(targetSizeGate),
    provenance: {
      kind: "srd-5.2.1",
      section: "Stat Block size-gated condition rider MBT fixture",
    },
    statBlock: {
      ...base.statBlock,
      displayName: sizeGatedConditionRiderTargetDisplayName(
        targetSizeGate,
      ),
      hp: { kind: "literal", value: 20 },
      ...(targetSizeGate === "mediumOrSmallerProneImmune"
        ? { immunities: { conditions: ["prone"] } }
        : {}),
      size: targetSizeGate === "larger" ? "large" : "medium",
    },
  };
}

function sizeGatedConditionRiderTargetDisplayName(
  targetSizeGate: TargetSizeGate,
): string {
  if (targetSizeGate === "mediumOrSmaller") {
    return "Medium Size-Gated Condition Target";
  }
  if (targetSizeGate === "mediumOrSmallerProneImmune") {
    return "Prone-Immune Medium Size-Gated Condition Target";
  }
  return "Large Size-Gated Condition Target";
}

function sizeGatedConditionRiderTargetStatBlockId(
  targetSizeGate: TargetSizeGate,
): StatBlockRecord["id"] {
  if (targetSizeGate === "mediumOrSmaller") {
    return "stat_block_medium_size_gated_condition_rider_mbt_target";
  }
  if (targetSizeGate === "mediumOrSmallerProneImmune") {
    return "stat_block_prone_immune_size_gated_condition_rider_mbt_target";
  }
  return "stat_block_large_size_gated_condition_rider_mbt_target";
}

function biteAttack(): StatBlockAttack {
  return {
    attackBonus: { kind: "literal", value: 4 },
    attackType: "melee",
    name: biteAttackName,
    onHit: [
      {
        amount: {
          kind: "fixed",
          expr: { dice: 1, dieSize: 6, flat: 2 },
          static: 5,
        },
        damageType: "piercing",
        kind: "damage",
      },
      {
        condition: "prone",
        kind: "apply_condition_if_target_size_at_most",
        maxCreatureSize: "medium",
      },
    ],
    reachFeet: 5,
  };
}

function targetChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "attackTargetInMeleeReach",
        actorId,
        targetId,
        attackName: biteAttackName,
      },
    ],
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holesOfKind(holes, kind)[0];
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function holesOfKind<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }>[] {
  return holes.filter(
    (hole): hole is Extract<BattleHole, { readonly kind: K }> =>
      hole.kind === kind,
  );
}

function requireTargetChoice(
  targetChoice: Extract<
    BattleFill,
    { readonly kind: "targetChoice" }
  > | null,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  if (targetChoice === null) {
    throw new Error(
      "Expected selected Stat Block size-gated condition target.",
    );
  }
  return targetChoice;
}

function requireAttackRoll(
  attackRoll: Extract<BattleFill, { readonly kind: "attackRoll" }> | null,
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  if (attackRoll === null) {
    throw new Error(
      "Expected selected Stat Block size-gated condition attack roll.",
    );
  }
  return attackRoll;
}

function projectSizeGatedConditionRiderState(input: {
  readonly state: BattleState;
  readonly targetSizeGate: TargetSizeGate;
  readonly holes: readonly BattleHole[];
  readonly lastResult: MbtWitnessLastResult;
}): SizeGatedConditionRiderProjection {
  const target = input.state.combatants.get(targetId);
  if (target === undefined) {
    throw new Error(`Expected combatant ${targetId}.`);
  }
  return {
    targetHp: Number(target.hp),
    targetProne: hasCondition(target.conditions, "prone"),
    targetSizeGate: input.targetSizeGate,
    holes: input.holes.map(projectSizeGatedConditionRiderHole).sort(),
    lastResult: input.lastResult,
    lastInvalidReason: "none",
  };
}

function projectSizeGatedConditionRiderHole(
  hole: BattleHole,
): SizeGatedConditionRiderHole {
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "attackRoll") return "AttackRoll";
  if (hole.kind === "rolledDice") return "DamageRoll";
  throw new Error(
    `Unexpected Stat Block size-gated condition MBT hole: ${hole.kind}`,
  );
}

function normalizeSizeGatedConditionRiderQuintState(
  raw: unknown,
): SizeGatedConditionRiderProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: sizeGatedConditionRiderHole,
    compareHoles: (left, right) => left.localeCompare(right),
  });

  return {
    targetHp: numberFromQuintInt(state["qTargetHp"], "qTargetHp"),
    targetProne: booleanField(state, "qTargetProne"),
    targetSizeGate: quintVariantMappedValue(
      state["qTargetSizeGate"],
      "qTargetSizeGate",
      TARGET_SIZE_GATE_BY_TAG,
      "Stat Block size-gated condition target size gate",
    ),
    holes: protocol.holes,
    lastResult: protocol.lastResult,
    lastInvalidReason: protocol.lastInvalidReason,
  };
}

function sizeGatedConditionRiderHole(
  raw: unknown,
): SizeGatedConditionRiderHole {
  return quintVariantMappedValue(
    raw,
    "qProtocol.holes",
    HOLE_BY_TAG,
    "Stat Block size-gated condition hole",
  );
}

function compareSizeGatedConditionRiderStates(
  quint: SizeGatedConditionRiderProjection,
  runtime: SizeGatedConditionRiderProjection,
): boolean {
  if (!isDeepStrictEqual(runtime, quint)) {
    throw new Error(
      `Stat Block size-gated condition MBT mismatch:\nruntime=${JSON.stringify(
        runtime,
      )}\nquint=${JSON.stringify(quint)}`,
    );
  }
  return true;
}
