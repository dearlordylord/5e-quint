// RAW-COVERAGE: verification-owner:focused-mbt RAW-PTG-REACTIONS-003 RAW-QCORE7-MOVEMENT-GRAPPLE-001
// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
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
  quintVariantTag,
  run,
  stateCheck,
} from "./battle-runtime-mbt-driver-kit.ts";
import { Either } from "effect";
import { describe, expect, it } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
} from "@dnd/shared/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  initiativeScore,
  resolveBattleInterrupt,
  resolveBattleSubject,
  snapshotBattle,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleResolutionResult,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";

const ruleCoreMovementMbtHoles = [
  "Movement",
  "TargetChoice",
  "GrappleOutcome",
  "ReactionDecision",
] as const;
type RuleCoreMovementMbtHole = (typeof ruleCoreMovementMbtHoles)[number];
const ruleCoreMovementResults = [
  "init",
  "needsHoles",
  "resolved",
  "invalid",
] as const;
type RuleCoreMovementResult = (typeof ruleCoreMovementResults)[number];
const ruleCoreMovementInvalidReasons = [
  "none",
  "invalidFill",
  "staleSubject",
] as const;
type RuleCoreMovementInvalidReason =
  (typeof ruleCoreMovementInvalidReasons)[number];

type RuleCoreMovementProjection = {
  readonly currentActor: "Fighter" | "GrappledTarget";
  readonly movementSpentFeet: number;
  readonly movementRemainingFeet: number;
  readonly dashBonusFeet: number;
  readonly prone: boolean;
  readonly disengaged: boolean;
  readonly actionAvailable: boolean;
  readonly grappleActive: boolean;
  readonly grappleEscapeDc: number;
  readonly holes: readonly RuleCoreMovementMbtHole[];
  readonly pendingOpportunityAttack: boolean;
  readonly lastResult: RuleCoreMovementResult;
  readonly lastInvalidReason: RuleCoreMovementInvalidReason;
};

const fighterActor = "Fighter";
const grappledTargetActor = "GrappledTarget";
const actorId = combatantId("rule-core-mover");
const observerId = combatantId("rule-core-observer");
const partySide = battleCombatantSide("party");
const oppositionSide = battleCombatantSide("opposition");
const movementSpeedFeet = 30;
const movementShortCostFeet = 5;
const movementFillCostFeet = 10;
const movementFullCostFeet = 30;
const movementOverspendCostFeet = 35;

const driverSchema = {
  init: {},
  doDiscoverMovement: {},
  doSpendMovement: {},
  doSpendShortMovement: {},
  doSpendFullMovement: {},
  doMoveProvokesOpportunityAttack: {},
  doMoveThreatSuppressedByDisengage: {},
  doDeclineOpportunityAttack: {},
  doRejectMovementOverspend: {},
  doDash: {},
  doDisengage: {},
  doRejectDashAfterActionSpent: {},
  doStandFromProne: {},
  doDiscoverGrapple: {},
  doSelectGrappleTarget: {},
  doResolveGrappleSuccess: {},
  doResolveGrappleFailure: {},
  doStartGrappledTargetTurn: {},
  doDiscoverEscapeGrapple: {},
  doResolveEscapeSuccess: {},
  doResolveEscapeFailure: {},
  doReleaseGrapple: {},
  step: {},
} as const;

function createRuleCoreMovementDriver() {
  return defineDriver(driverSchema, () => {
    let state = ruleCoreMovementBattle();
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreMovementProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreMovementProjection["lastInvalidReason"] =
      "none";
    let currentActor: RuleCoreMovementProjection["currentActor"] = fighterActor;

    function reset(): void {
      state = ruleCoreMovementBattle();
      holes = [];
      lastResult = "init";
      lastInvalidReason = "none";
      currentActor = fighterActor;
    }

    function recordResult(result: BattleResolutionResult): void {
      if (result.tag === "resolved") {
        state = result.state;
        holes = [];
        lastResult = "resolved";
        lastInvalidReason = "none";
        return;
      }
      if (result.tag === "needsHoles") {
        state = result.state;
        holes = result.holes;
        lastResult = "needsHoles";
        lastInvalidReason = "none";
        return;
      }
      if (!isRuleCoreMovementInvalidReason(result.reason)) {
        throw new Error(
          `Unexpected rule-core Movement MBT invalid reason: ${result.reason}`,
        );
      }
      lastResult = "invalid";
      lastInvalidReason = result.reason;
    }

    function resolveSubject(
      subject: Parameters<typeof resolveBattleSubject>[0]["subject"],
      fills: readonly BattleFill[] = [],
    ): void {
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    function submitMovement(input: {
      readonly costFeet: number;
      readonly provokesOpportunityAttack: boolean;
    }): void {
      const hole = requireMovementHole(holes);
      recordResult(
        resolveBattleSubject({
          state,
          subject: { tag: "runtimeCommand", actorId, command: "move" },
          fills: [
            movementFill(hole, {
              movementCostFeet: input.costFeet,
              provokedOpportunityAttacks: input.provokesOpportunityAttack
                ? [{ reactorId: observerId, attackName: "Unarmed Strike" }]
                : [],
            }),
          ],
        }),
      );
    }

    return {
      init: reset,
      doDiscoverMovement: () =>
        resolveSubject({ tag: "runtimeCommand", actorId, command: "move" }),
      doSpendMovement: () =>
        submitMovement({
          costFeet: movementFillCostFeet,
          provokesOpportunityAttack: false,
        }),
      doSpendShortMovement: () =>
        submitMovement({
          costFeet: movementShortCostFeet,
          provokesOpportunityAttack: false,
        }),
      doSpendFullMovement: () =>
        submitMovement({
          costFeet: movementFullCostFeet,
          provokesOpportunityAttack: false,
        }),
      doMoveProvokesOpportunityAttack: () =>
        submitMovement({
          costFeet: movementFillCostFeet,
          provokesOpportunityAttack: true,
        }),
      doMoveThreatSuppressedByDisengage: () =>
        submitMovement({
          costFeet: movementFillCostFeet,
          provokesOpportunityAttack: true,
        }),
      doDeclineOpportunityAttack: () => {
        recordResult(
          resolveBattleInterrupt({
            state,
            fill: interruptDecisionFill(requireReactionDecisionHole(holes), {
              kind: "decline",
              responderId: observerId,
            }),
          }),
        );
      },
      doRejectMovementOverspend: () =>
        submitMovement({
          costFeet: movementOverspendCostFeet,
          provokesOpportunityAttack: false,
        }),
      doDash: () =>
        resolveSubject({
          tag: "action",
          actorId,
          action: "dash",
          speedKind: "walk",
        }),
      doDisengage: () =>
        resolveSubject({ tag: "action", actorId, action: "disengage" }),
      doRejectDashAfterActionSpent: () =>
        resolveSubject({
          tag: "action",
          actorId,
          action: "dash",
          speedKind: "walk",
        }),
      doStandFromProne: () =>
        resolveSubject({
          tag: "runtimeCommand",
          actorId,
          command: "standFromProne",
        }),
      doDiscoverGrapple: () =>
        resolveSubject({ tag: "action", actorId, action: "grapple" }),
      doSelectGrappleTarget: () =>
        resolveSubject({ tag: "action", actorId, action: "grapple" }, [
          grappleTargetFill(requireTargetChoiceHole(holes)),
        ]),
      doResolveGrappleSuccess: () =>
        resolveSubject({ tag: "action", actorId, action: "grapple" }, [
          grappleTargetFill(requireTargetChoiceHoleFromState()),
          grappleOutcomeFill(requireGrappleOutcomeHole(holes), false),
        ]),
      doResolveGrappleFailure: () =>
        resolveSubject({ tag: "action", actorId, action: "grapple" }, [
          grappleTargetFill(requireTargetChoiceHoleFromState()),
          grappleOutcomeFill(requireGrappleOutcomeHole(holes), true),
        ]),
      doStartGrappledTargetTurn: () => {
        resolveSubject({ tag: "runtimeCommand", actorId, command: "endTurn" });
        if (lastResult === "resolved") currentActor = grappledTargetActor;
      },
      doDiscoverEscapeGrapple: () =>
        resolveSubject({
          tag: "action",
          actorId: observerId,
          action: "escapeGrapple",
        }),
      doResolveEscapeSuccess: () =>
        resolveSubject(
          { tag: "action", actorId: observerId, action: "escapeGrapple" },
          [grappleOutcomeFill(requireGrappleOutcomeHole(holes), true)],
        ),
      doResolveEscapeFailure: () =>
        resolveSubject(
          { tag: "action", actorId: observerId, action: "escapeGrapple" },
          [grappleOutcomeFill(requireGrappleOutcomeHole(holes), false)],
        ),
      doReleaseGrapple: () =>
        resolveSubject({
          tag: "runtimeCommand",
          actorId,
          command: "releaseGrapple",
          targetId: observerId,
        }),
      step: () => {},
      getState: () =>
        projectRuleCoreMovementState({
          state,
          holes,
          lastResult,
          lastInvalidReason,
          currentActor,
        }),
    };

    function requireTargetChoiceHoleFromState(): Extract<
      BattleHole,
      { readonly kind: "targetChoice" }
    > {
      const result = resolveBattleSubject({
        state,
        subject: { tag: "action", actorId, action: "grapple" },
        fills: [],
      });
      return requireTargetChoiceHole(
        result.tag === "needsHoles" ? result.holes : holes,
      );
    }
  });
}

const movementStateCheck = stateCheck(
  normalizeRuleCoreMovementQuintState,
  compareRuleCoreMovementState,
);

const ruleCoreMovementDefaultMbtSteps = 6;

describe("rule-core Movement focused MBT", () => {
  it(
    "replays QCORE7 Movement, Grapple, and OA-decline against battle-runtime reducers",
    async () => {
      await run({
        spec: mbtSpecPath(import.meta.dirname, "rule-core-movement.mbt.qnt"),
        init: "init",
        step: "step",
        driver: createRuleCoreMovementDriver(),
        backend: "typescript",
        nTraces: mbtTraceCount(),
        maxSteps: focusedMbtMaxSteps(ruleCoreMovementDefaultMbtSteps),
        stateCheck: movementStateCheck,
      });
    },
    MBT_TEST_TIMEOUT_MS,
  );
});

function ruleCoreMovementBattle(): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-movement"),
    combatants: [
      movementCreature({
        combatantId: actorId,
        characterId: "rule-core-mover-character",
        displayName: "Rule Core Mover",
        initiative: 20,
        side: partySide,
        prone: true,
      }),
      movementCreature({
        combatantId: observerId,
        characterId: "rule-core-observer-character",
        displayName: "Rule Core Observer",
        initiative: 10,
        side: oppositionSide,
        prone: false,
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function movementCreature(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly side: typeof partySide | typeof oppositionSide;
  readonly prone: boolean;
}): BattleCreatureInit {
  const conditions = input.prone ? (["prone"] as const) : undefined;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    side: input.side,
    creatureInit: {
      kind: "character",
      characterId: characterId(input.characterId),
      characterUnitRefs: [],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(movementSpeedFeet) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      ...(conditions === undefined ? {} : { conditions }),
      selectedLoadout: {},
      attack: null,
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
    },
  };
}

function projectRuleCoreMovementState(input: {
  readonly state: BattleState;
  readonly holes: readonly BattleHole[];
  readonly lastResult: RuleCoreMovementProjection["lastResult"];
  readonly lastInvalidReason: RuleCoreMovementProjection["lastInvalidReason"];
  readonly currentActor: RuleCoreMovementProjection["currentActor"];
}): RuleCoreMovementProjection {
  const snapshot = snapshotBattle(input.state);
  const actor = snapshot.combatants.find(
    (combatant) => combatant.combatantId === actorId,
  );
  if (actor === undefined) {
    throw new Error("Expected rule-core Movement actor in battle snapshot.");
  }
  const grapple = input.state.grapples.find(
    (candidate) =>
      candidate.grapplerId === actorId && candidate.targetId === observerId,
  );
  return {
    currentActor: input.currentActor,
    movementSpentFeet: actor.movement.spentFeet,
    movementRemainingFeet: actor.movement.remainingFeet,
    dashBonusFeet: Number(snapshot.turn.dashMovementBonusFeet),
    prone: actor.conditions.includes("prone"),
    disengaged: snapshot.turn.disengaged,
    actionAvailable: snapshot.turn.actionResources.length > 0,
    grappleActive: grapple !== undefined,
    grappleEscapeDc: grapple === undefined ? 0 : Number(grapple.escapeDc),
    holes: input.holes.map(projectMovementHole),
    pendingOpportunityAttack:
      snapshot.pendingInterrupt?.trigger === "opportunityAttack",
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  };
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly movementCostFeet: number;
    readonly provokedOpportunityAttacks: readonly {
      readonly reactorId: CombatantId;
      readonly attackName: string;
    }[];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      movementCostFeet: movementFeet(value.movementCostFeet),
      provokedOpportunityAttacks: value.provokedOpportunityAttacks,
    },
  };
}

function grappleTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: observerId,
    spatialFacts: [
      {
        kind: "grappleTargetWithinReach",
        grapplerId: actorId,
        targetId: observerId,
      },
    ],
  };
}

function grappleOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "grappleOutcome" }>,
  succeeded: boolean,
): Extract<BattleFill, { readonly kind: "grappleOutcome" }> {
  return {
    kind: "grappleOutcome",
    holeId: hole.holeId,
    value: { succeeded },
  };
}

function interruptDecisionFill(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
  value: Extract<BattleFill, { readonly kind: "interruptDecision" }>["value"],
): Extract<BattleFill, { readonly kind: "interruptDecision" }> {
  return {
    kind: "interruptDecision",
    holeId: hole.holeId,
    value,
  };
}

function requireMovementHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "movement" }> {
  const hole = holes.find((candidate) => candidate.kind === "movement");
  if (hole === undefined) {
    throw new Error("Expected Movement hole.");
  }
  return hole;
}

function requireTargetChoiceHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "targetChoice" }> {
  const hole = holes.find((candidate) => candidate.kind === "targetChoice");
  if (hole === undefined) {
    throw new Error("Expected target choice hole.");
  }
  return hole;
}

function requireGrappleOutcomeHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "grappleOutcome" }> {
  const hole = holes.find((candidate) => candidate.kind === "grappleOutcome");
  if (hole === undefined) {
    throw new Error("Expected Grapple outcome hole.");
  }
  return hole;
}

function requireReactionDecisionHole(
  holes: readonly BattleHole[],
): Extract<BattleHole, { readonly kind: "interruptDecision" }> {
  const hole = holes.find(
    (candidate) => candidate.kind === "interruptDecision",
  );
  if (hole === undefined) {
    throw new Error("Expected interrupt decision hole.");
  }
  return hole;
}

function projectMovementHole(hole: BattleHole): RuleCoreMovementMbtHole {
  if (hole.kind === "movement") return "Movement";
  if (hole.kind === "targetChoice") return "TargetChoice";
  if (hole.kind === "grappleOutcome") return "GrappleOutcome";
  if (hole.kind === "interruptDecision") return "ReactionDecision";
  throw new Error(`Unexpected rule-core Movement MBT hole: ${hole.kind}`);
}

function normalizeRuleCoreMovementQuintState(
  raw: unknown,
): RuleCoreMovementProjection {
  const state = quintStateRecord(raw);
  const protocol = decodeWitnessProtocolState({
    state,
    protocolField: "qProtocol",
    noInvalidReason: "none",
    decodeHole: movementHoleName,
  });
  const movementSpentFeet = numberFromQuintInt(
    state["qMovementSpentFeet"],
    "qMovementSpentFeet",
  );
  const dashBonusFeet = numberFromQuintInt(
    state["qDashBonusFeet"],
    "qDashBonusFeet",
  );
  return {
    currentActor: currentActorName(state["qCurrentActor"]),
    movementSpentFeet,
    movementRemainingFeet: Math.max(
      0,
      movementSpeedFeet + dashBonusFeet - movementSpentFeet,
    ),
    dashBonusFeet,
    prone: booleanField(state, "qProne"),
    disengaged: booleanField(state, "qDisengaged"),
    actionAvailable: booleanField(state, "qActionAvailable"),
    grappleActive: booleanField(state, "qGrappleActive"),
    grappleEscapeDc: numberFromQuintInt(
      state["qGrappleEscapeDc"],
      "qGrappleEscapeDc",
    ),
    holes: protocol.holes,
    pendingOpportunityAttack: booleanField(state, "qPendingOpportunityAttack"),
    lastResult: movementResult(protocol.lastResult),
    lastInvalidReason: movementInvalidReason(protocol.lastInvalidReason),
  };
}

function compareRuleCoreMovementState(
  quint: RuleCoreMovementProjection,
  runtime: RuleCoreMovementProjection,
): boolean {
  try {
    expect(runtime).toEqual(quint);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error.message);
    }
    throw error;
  }
  return true;
}

function movementHoleName(raw: unknown): RuleCoreMovementMbtHole {
  const tag = quintVariantTag(raw);
  if (isRuleCoreMovementMbtHole(tag)) return tag;
  throw new Error(`Unknown Quint rule-core Movement hole variant: ${tag}`);
}

function isRuleCoreMovementMbtHole(
  raw: unknown,
): raw is RuleCoreMovementMbtHole {
  return ruleCoreMovementMbtHoles.some((hole) => hole === raw);
}

function movementResult(raw: unknown): RuleCoreMovementResult {
  if (isRuleCoreMovementResult(raw)) return raw;
  throw new Error(`Unknown Quint rule-core Movement result: ${String(raw)}.`);
}

function isRuleCoreMovementResult(raw: unknown): raw is RuleCoreMovementResult {
  return ruleCoreMovementResults.some((result) => result === raw);
}

function movementInvalidReason(raw: unknown): RuleCoreMovementInvalidReason {
  if (isRuleCoreMovementInvalidReason(raw)) return raw;
  throw new Error(
    `Unknown Quint rule-core Movement invalid reason: ${String(raw)}.`,
  );
}

function isRuleCoreMovementInvalidReason(
  raw: unknown,
): raw is RuleCoreMovementInvalidReason {
  return ruleCoreMovementInvalidReasons.some((reason) => reason === raw);
}

function currentActorName(
  raw: unknown,
): RuleCoreMovementProjection["currentActor"] {
  if (raw === fighterActor || raw === grappledTargetActor) return raw;
  throw new Error(`Unknown Quint rule-core Movement actor: ${String(raw)}.`);
}
