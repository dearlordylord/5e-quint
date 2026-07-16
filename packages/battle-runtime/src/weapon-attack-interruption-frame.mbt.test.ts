// RAW trace:
// - .references/srd-5.2.1/Playing-the-Game.md#reactions
// - .references/srd-5.2.1/Playing-the-Game.md#making-an-attack
// - .references/srd-5.2.1/Playing-the-Game.md#attack-rolls
// - .references/srd-5.2.1/Playing-the-Game.md#critical-hits
// - .references/srd-5.2.1/Playing-the-Game.md#damage-at-0-hit-points
// - UBIQUITOUS_LANGUAGE.md: Reaction, Attack Roll, Critical Hit, Resolve,
//   Apply, Advance, Offer, and Decline.
// KERNEL-COVERAGE: parity-witness BATTLE.PROTOCOL.INTERRUPT_STACK_RESUME_REPLAY
import { expect, it } from "vitest";

import {
  MBT_TEST_TIMEOUT_MS,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  quintVariantTag,
  quintVariantValue,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import {
  attackDamageEventAmountBeforeTargetAdjustments,
  currentInterruptCheckpoint,
  interruptDecisionHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  type BattleAttackDamageInterruptionFrame,
  type BattleHole,
  type BattleState,
} from "./battle-reducer.ts";
import type { BattleSubject } from "./battle-subjects.ts";
import {
  attackDamageHoleAfterHit,
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  damageRollFill,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinId,
  interruptDecisionFill,
  movementFill,
  targetFill,
} from "./battle-runtime-test-support.ts";

const driverSchema = {
  init: {},
  doOfferWeaponAttackInterruption: {},
  doInterruptWeaponAttack: {},
  doHandOffWeaponAttackInterruption: {},
  step: {},
} as const;

type DeliveryStage = "init" | "offered" | "interrupted" | "handedOff";
type FrameProjection = {
  readonly participant: "weaponAttacker";
  readonly target: "weaponTarget";
  readonly attackTotal: number;
  readonly naturalD20: number;
  readonly damageAmount: number;
  readonly criticalConsequence: "ordinaryHit" | "criticalHit";
  readonly phase: "attackDamage";
  readonly continuation: "applyWeaponAttackDamage";
};
type DeliveryProjection = {
  readonly stage: DeliveryStage;
  readonly frame: FrameProjection | null;
  readonly damageApplied: boolean;
};
type RuntimeState = {
  readonly battle: BattleState;
  readonly releaseSubject: BattleSubject | null;
  readonly releaseHole: BattleHole | null;
};

it(
  "matches computed weapon-attack offer, interruption, and handoff against Quint",
  async () => {
    await run({
      spec: mbtSpecPath(
        import.meta.dirname,
        "battle-runtime-weapon-attack-interruption-frame.mbt.qnt",
      ),
      init: "init",
      step: "step",
      driver: createDriver(),
      backend: "typescript",
      nTraces: mbtTraceCount(),
      maxSteps: focusedMbtMaxSteps(3),
      stateCheck: deliveryStateCheck,
    });
  },
  MBT_TEST_TIMEOUT_MS,
);

function createDriver() {
  return defineDriver(driverSchema, () => {
    let state = initialRuntimeState();
    return {
      init: () => {
        state = initialRuntimeState();
      },
      doOfferWeaponAttackInterruption: () => {
        state = offerWeaponAttackInterruption(state);
      },
      doInterruptWeaponAttack: () => {
        state = interruptWeaponAttack(state);
      },
      doHandOffWeaponAttackInterruption: () => {
        state = handOffWeaponAttackInterruption(state);
      },
      step: () => {},
      getState: (): DeliveryProjection => projectRuntimeDelivery(state),
    };
  });
}

function initialRuntimeState(): RuntimeState {
  const battle = fighterVsGoblinBattle();
  return {
    battle: {
      ...battle,
      readiedMovements: new Map(battle.readiedMovements).set(goblinId, {
        trigger: "attackDamage",
        expiresAt: { kind: "startOfTurn", combatantId: goblinId },
      }),
    },
    releaseSubject: null,
    releaseHole: null,
  };
}

function offerWeaponAttackInterruption(state: RuntimeState): RuntimeState {
  const subject = fighterAttackSubject();
  const target = attackInitialTargetHole(state.battle, subject);
  const targetChoice = targetFill(target, goblinId);
  const attackRoll = attackRollHoleAfterTarget(
    state.battle,
    target,
    subject,
    goblinId,
  );
  const attackResult = { total: 15, naturalD20: 10 } as const;
  const damage = attackDamageHoleAfterHit(
    state.battle,
    target,
    attackRoll,
    attackResult,
    subject,
    goblinId,
  );
  const offered = resolveBattleSubject({
    state: state.battle,
    subject,
    fills: [
      targetChoice,
      attackRollFill(attackRoll, attackResult),
      damageRollFill(damage, 5),
    ],
  });
  if (offered.tag !== "needsHoles") {
    throw new Error("Expected an Attack Damage Reaction offer.");
  }
  const checkpoint = currentInterruptCheckpoint(offered.state);
  if (checkpoint?.trigger !== "attackDamage") {
    throw new Error("Expected the narrowed Attack Damage checkpoint.");
  }
  const choice = offered.snapshot.pendingInterrupt?.choices.find(
    (candidate) =>
      candidate.kind === "releaseReadiedMovement" &&
      candidate.readiedMovementActorId === goblinId,
  );
  if (choice?.kind !== "releaseReadiedMovement") {
    throw new Error("Expected the readied movement Reaction choice.");
  }
  const releaseHole = choice.initialHoles[0];
  if (releaseHole === undefined) {
    throw new Error("Expected the readied movement fill hole.");
  }
  return {
    battle: offered.state,
    releaseSubject: choice.subject,
    releaseHole,
  };
}

function interruptWeaponAttack(state: RuntimeState): RuntimeState {
  if (state.releaseSubject === null) {
    throw new Error("Expected an offered readied movement subject.");
  }
  const checkpoint = currentInterruptCheckpoint(state.battle);
  if (checkpoint === null) {
    throw new Error("Expected an offered Attack Damage checkpoint.");
  }
  const result = resolveBattleInterrupt({
    state: state.battle,
    fill: interruptDecisionFill(interruptDecisionHole(checkpoint), {
      kind: "resolve",
      responderId: goblinId,
      choice: {
        kind: "releaseReadiedMovement",
        readiedMovementActorId: goblinId,
        fills: [],
      },
    }),
  });
  if (result.tag !== "needsHoles") {
    throw new Error("Expected the active readied movement interruption.");
  }
  const interrupted = currentInterruptCheckpoint(result.state);
  if (
    interrupted?.trigger !== "attackDamage" ||
    interrupted.activeInterrupt === undefined
  ) {
    throw new Error("Expected an active interruption over the stored frame.");
  }
  return {
    ...state,
    battle: result.state,
    releaseHole: findHole(result.holes, "movement"),
  };
}

function handOffWeaponAttackInterruption(state: RuntimeState): RuntimeState {
  if (state.releaseSubject === null || state.releaseHole === null) {
    throw new Error("Expected an active readied movement interruption.");
  }
  const resolved = resolveBattleSubject({
    state: state.battle,
    subject: state.releaseSubject,
    fills: [
      movementFill(state.releaseHole, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (
    resolved.tag !== "resolved" ||
    currentInterruptCheckpoint(resolved.state) !== null
  ) {
    throw new Error("Expected frame handoff to apply damage and close.");
  }
  const hpBefore = state.battle.combatants.get(goblinId)?.hp;
  const hpAfter = resolved.state.combatants.get(goblinId)?.hp;
  if (
    hpBefore === undefined ||
    hpAfter === undefined ||
    Number(hpAfter) >= Number(hpBefore)
  ) {
    throw new Error("Expected frame handoff to preserve weapon damage.");
  }
  return { ...state, battle: resolved.state };
}

function projectRuntimeDelivery(state: RuntimeState): DeliveryProjection {
  const checkpoint = currentInterruptCheckpoint(state.battle);
  if (checkpoint?.trigger === "attackDamage") {
    return {
      stage:
        checkpoint.activeInterrupt === undefined ? "offered" : "interrupted",
      frame: projectFrame(checkpoint.continuation),
      damageApplied: false,
    };
  }
  const target = state.battle.combatants.get(goblinId);
  const damageApplied =
    target !== undefined && Number(target.hp) < Number(target.maxHp);
  return {
    stage: damageApplied ? "handedOff" : "init",
    frame: null,
    damageApplied,
  };
}

function projectFrame(
  frame: BattleAttackDamageInterruptionFrame,
): FrameProjection {
  if (
    frame.participant.tag !== "action" ||
    frame.participant.actorId !== fighterId ||
    frame.participant.action !== "attack" ||
    frame.participant.attackName !== "Longsword"
  ) {
    throw new Error("Expected the weapon attacker participant.");
  }
  if (frame.target.combatantId !== goblinId) {
    throw new Error("Expected the weapon attack target.");
  }
  return {
    participant: "weaponAttacker",
    target: "weaponTarget",
    attackTotal: frame.attackResult.total,
    naturalD20: Number(frame.attackResult.naturalD20),
    damageAmount: Number(
      attackDamageEventAmountBeforeTargetAdjustments(frame.damageInput),
    ),
    criticalConsequence: frame.criticalConsequence.kind,
    phase: frame.phase,
    continuation: "applyWeaponAttackDamage",
  };
}

const deliveryStateCheck = stateCheck(
  normalizeQuintDelivery,
  (spec: DeliveryProjection, impl: DeliveryProjection) => {
    expect(impl).toEqual(spec);
    return true;
  },
);

function normalizeQuintDelivery(raw: unknown): DeliveryProjection {
  const state = quintStateRecord(raw);
  const delivery = state["qDelivery"];
  const tag = quintVariantTag(delivery, "qDelivery");
  if (tag === "NoWeaponAttackInterruption") {
    return { stage: "init", frame: null, damageApplied: false };
  }
  const stage: DeliveryStage | null =
    tag === "WeaponAttackInterruptionOffered"
      ? "offered"
      : tag === "WeaponAttackInterrupted"
        ? "interrupted"
        : tag === "WeaponAttackInterruptionHandedOff"
          ? "handedOff"
          : null;
  if (stage === null) {
    throw new Error(`Unexpected weapon attack delivery tag ${tag}.`);
  }
  if (stage === "handedOff") {
    const outcome = quintStateRecord(
      quintVariantValue(delivery, tag, "qDelivery"),
    );
    normalizeQuintDamageInput(outcome["damageInput"]);
    return { stage, frame: null, damageApplied: true };
  }
  return {
    stage,
    frame: normalizeQuintFrame(quintVariantValue(delivery, tag, "qDelivery")),
    damageApplied: false,
  };
}

function normalizeQuintFrame(raw: unknown): FrameProjection {
  const frame = quintStateRecord(raw);
  const attackResult = quintStateRecord(
    quintVariantValue(frame["attackResult"], "WeaponAttackHit", "attackResult"),
  );
  const damageAmount = normalizeQuintDamageInput(frame["damageInput"]);
  const criticalConsequence = quintVariantTag(
    frame["criticalConsequence"],
    "criticalConsequence",
  );
  const projectedCriticalConsequence =
    criticalConsequence === "CriticalHitDeathFailureConsequence"
      ? "criticalHit"
      : criticalConsequence === "OrdinaryHitDeathFailureConsequence"
        ? "ordinaryHit"
        : null;
  if (projectedCriticalConsequence === null) {
    throw new Error(`Unexpected critical consequence ${criticalConsequence}.`);
  }
  return {
    participant: "weaponAttacker",
    target: "weaponTarget",
    attackTotal: numberFromQuintInt(attackResult["total"], "total"),
    naturalD20: numberFromQuintInt(attackResult["naturalD20"], "naturalD20"),
    damageAmount,
    criticalConsequence: projectedCriticalConsequence,
    phase: "attackDamage",
    continuation: "applyWeaponAttackDamage",
  };
}

function normalizeQuintDamageInput(raw: unknown): number {
  const damageInput = quintStateRecord(
    quintVariantValue(raw, "RolledWeaponDamage", "damageInput"),
  );
  return numberFromQuintInt(damageInput["amount"], "amount");
}
