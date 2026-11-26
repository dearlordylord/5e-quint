import {
  ordinaryMovementPath,
  plainStepMovementActivity,
} from "./battle-reducer/movement-path.ts";
import { battleResolutionHolesForTest } from "./battle-runtime.test-support.ts";
// RAW-COVERAGE: verification-owner:focused-mbt RAW-PTG-REACTIONS-003 RAW-QCORE7-MOVEMENT-GRAPPLE-001
// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
// KERNEL-COVERAGE: parity-witness BATTLE.EQUIPMENT.WEAPON_GRIP_CHANGE
import {
  MBT_TEST_TIMEOUT_MS,
  booleanField,
  decodeWitnessProtocolState,
  defineDriver,
  focusedMbtMaxSteps,
  mbtSpecPath,
  mbtPickSchemas,
  mbtTraceCount,
  numberFromQuintInt,
  quintStateRecord,
  quintVariantTag,
  run,
  stateCheck,
  stringLiteralField,
} from "./battle-runtime-mbt-driver-kit.test-support.ts";
import {
  decodeRuleCoreComponentRoute,
  type RuleCoreComponentRoutedProjection,
  withRuleCoreComponentRoute,
} from "./rule-core-component-route.test-support.ts";
import { Array, Result } from "effect";
import { describe, expect, it } from "vitest";

import {
  defaultArmorClassState,
  loadoutHandUses,
} from "@dnd/shared-algebras/armor-class-algebra";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import {
  abilityModifier,
  attackBonus,
  Hp,
  movementFeet,
  WEAPON_GRIPS,
  type HandUse,
  type WeaponGrip,
} from "@dnd/shared/types";

import {
  battleId,
  battleObjectId,
  battleFrontierInterruptDecisionForState,
  characterId,
  combatantId,
  initiativeScore,
  resolveBattleInterrupt,
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
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { battleInitializationIssueMessage } from "./battle-reducer/api-lifecycle.ts";
import { combatantHandUses } from "./battle-reducer/creature-state-leaves.ts";
import {
  resolveBattleSubject,
  attackExecutionSelectionForSubjectForTest,
  characterAttackSubjectForTest,
  testLongswordAttack,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { attackActionOptionsForActor } from "./battle-reducer/attack-damage-apply.ts";

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

type RuleCoreMovementProjection = RuleCoreComponentRoutedProjection & {
  readonly currentActor: "Fighter" | "GrappledTarget";
  readonly movementSpentFeet: number;
  readonly movementRemainingFeet: number;
  readonly dashBonusFeet: number;
  readonly prone: boolean;
  readonly disengaged: boolean;
  readonly actionAvailable: boolean;
  readonly grappleActive: boolean;
  readonly grappleEscapeDc: number;
  readonly mainWeaponGrip: WeaponGrip;
  readonly mainWeaponDamageDieSize: number;
  readonly leftHandUse: HandUse;
  readonly rightHandUse: HandUse;
  readonly holes: readonly RuleCoreMovementMbtHole[];
  readonly pendingOpportunityAttack: boolean;
  readonly lastResult: RuleCoreMovementResult;
  readonly lastInvalidReason: RuleCoreMovementInvalidReason;
};

const fighterActor = "Fighter";
const grappledTargetActor = "GrappledTarget";
const actorId = combatantId("rule-core-mover");
const observerId = combatantId("rule-core-observer");
const movementSpeedFeet = 30;
const movementShortDistanceFeet = 5;
const movementFillDistanceFeet = 10;
const movementFullDistanceFeet = 30;
const movementOverspendDistanceFeet = 35;
const componentOwner = "RuleCoreMovementGrappleOwner";

const driverSchema = {
  init: { mainWeaponGrip: mbtPickSchemas.stringLiteral(...WEAPON_GRIPS) },
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
  doDropProne: {},
  doDiscoverGrapple: {},
  doSelectGrappleTarget: {},
  doRejectGrappleWithoutFreeHand: {},
  doResolveGrappleSuccess: {},
  doResolveGrappleFailure: {},
  doStartGrappledTargetTurn: {},
  doDiscoverEscapeGrapple: {},
  doResolveEscapeSuccess: {},
  doResolveEscapeFailure: {},
  doReleaseGrapple: {},
  doChangeMainWeaponGripToTwoHanded: {},
  doChangeMainWeaponGripToOneHanded: {},
  doRejectTwoHandedGripWithoutFreeHand: {},
  step: {},
} as const;

function createRuleCoreMovementDriver() {
  return defineDriver(driverSchema, () => {
    let state = ruleCoreMovementBattle("one_handed");
    let holes: readonly BattleHole[] = [];
    let lastResult: RuleCoreMovementProjection["lastResult"] = "init";
    let lastInvalidReason: RuleCoreMovementProjection["lastInvalidReason"] =
      "none";
    let currentActor: RuleCoreMovementProjection["currentActor"] = fighterActor;

    function reset(mainWeaponGrip: WeaponGrip): void {
      state = ruleCoreMovementBattle(mainWeaponGrip);
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
        holes = battleResolutionHolesForTest(result);
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
      subject: BattleSubject,
      fills: readonly BattleFill[] = [],
    ): void {
      recordResult(resolveBattleSubject({ state, subject, fills }));
    }

    function submitMovement(input: {
      readonly distanceFeet: number;
      readonly provokesOpportunityAttack: boolean;
    }): void {
      const hole = requireMovementHole(holes);
      const mover = state.combatants.get(actorId);
      if (mover === undefined)
        throw new Error("Expected the fixed Movement fixture actor.");
      recordResult(
        resolveBattleSubject({
          state,
          subject: { tag: "runtimeCommand", actorId, command: "move" },
          fills: [
            movementFill(hole, {
              distanceFeet: input.distanceFeet,
              activity: plainStepMovementActivity(mover),
              provokedOpportunityAttacks: input.provokesOpportunityAttack
                ? [
                    {
                      reactorId: observerId,
                      distanceFeet: movementFeet(5),
                      ...attackExecutionSelectionForSubjectForTest(
                        characterAttackSubjectForTest(
                          state,
                          observerId,
                          "Unarmed Strike",
                        ),
                      ),
                    },
                  ]
                : [],
            }),
          ],
        }),
      );
    }

    function changeGrip(grip: WeaponGrip): void {
      resolveSubject({
        tag: "runtimeCommand",
        actorId,
        command: "changeWeaponGrip",
        grip,
      });
    }

    function selectGrappleTarget(): void {
      resolveSubject({ tag: "action", actorId, action: "grapple" }, [
        grappleTargetFill(requireTargetChoiceHole(holes)),
      ]);
    }

    return {
      init: ({ mainWeaponGrip }) => reset(mainWeaponGrip),
      doDiscoverMovement: () =>
        resolveSubject({ tag: "runtimeCommand", actorId, command: "move" }),
      doSpendMovement: () =>
        submitMovement({
          distanceFeet: movementFillDistanceFeet,
          provokesOpportunityAttack: false,
        }),
      doSpendShortMovement: () =>
        submitMovement({
          distanceFeet: movementShortDistanceFeet,
          provokesOpportunityAttack: false,
        }),
      doSpendFullMovement: () =>
        submitMovement({
          distanceFeet: movementFullDistanceFeet,
          provokesOpportunityAttack: false,
        }),
      doMoveProvokesOpportunityAttack: () =>
        submitMovement({
          distanceFeet: movementFillDistanceFeet,
          provokesOpportunityAttack: true,
        }),
      doMoveThreatSuppressedByDisengage: () =>
        submitMovement({
          distanceFeet: movementFillDistanceFeet,
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
          distanceFeet: movementOverspendDistanceFeet,
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
      doDropProne: () =>
        resolveSubject({
          tag: "runtimeCommand",
          actorId,
          command: "dropProne",
        }),
      doDiscoverGrapple: () =>
        resolveSubject({ tag: "action", actorId, action: "grapple" }),
      doSelectGrappleTarget: selectGrappleTarget,
      doRejectGrappleWithoutFreeHand: selectGrappleTarget,
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
          skill: "athletics",
        }),
      doResolveEscapeSuccess: () =>
        resolveSubject(
          {
            tag: "action",
            actorId: observerId,
            action: "escapeGrapple",
            skill: "athletics",
          },
          [grappleOutcomeFill(requireGrappleOutcomeHole(holes), true)],
        ),
      doResolveEscapeFailure: () =>
        resolveSubject(
          {
            tag: "action",
            actorId: observerId,
            action: "escapeGrapple",
            skill: "athletics",
          },
          [grappleOutcomeFill(requireGrappleOutcomeHole(holes), false)],
        ),
      doReleaseGrapple: () =>
        resolveSubject({
          tag: "runtimeCommand",
          actorId,
          command: "releaseGrapple",
          targetId: observerId,
        }),
      doChangeMainWeaponGripToTwoHanded: () => changeGrip("two_handed"),
      doChangeMainWeaponGripToOneHanded: () => changeGrip("one_handed"),
      doRejectTwoHandedGripWithoutFreeHand: () => changeGrip("two_handed"),
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
        result.tag === "needsHoles"
          ? battleResolutionHolesForTest(result)
          : holes,
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

function ruleCoreMovementBattle(mainWeaponGrip: WeaponGrip): BattleState {
  return startBattleRight({
    battleId: battleId("rule-core-movement"),
    combatants: [
      movementCreature({
        combatantId: actorId,
        characterId: "rule-core-mover-character",
        displayName: "Rule Core Mover",
        initiative: 20,
        prone: true,
        mainWeaponGrip,
      }),
      movementCreature({
        combatantId: observerId,
        characterId: "rule-core-observer-character",
        displayName: "Rule Core Observer",
        initiative: 10,
        prone: false,
        mainWeaponGrip: undefined,
      }),
    ],
  });
}

function startBattleRight(
  input: Parameters<typeof startBattle>[0],
): BattleState {
  const result = startBattle(input);
  if (Result.isFailure(result)) {
    throw new Error(battleInitializationIssueMessage(result.failure));
  }
  return result.success.state;
}

function movementCreature(input: {
  readonly combatantId: CombatantId;
  readonly characterId: string;
  readonly displayName: string;
  readonly initiative: number;
  readonly prone: boolean;
  readonly mainWeaponGrip: WeaponGrip | undefined;
}): BattleCreatureInit {
  const conditions = input.prone ? (["prone"] as const) : undefined;
  return {
    combatantId: input.combatantId,
    displayName: input.displayName,
    initiative: initiativeScore(input.initiative),
    creatureInit: {
      kind: "character",
      ammunitionStocks: [],
      characterId: characterId(input.characterId),
      characterUnitRefs:
        input.mainWeaponGrip === undefined ? [] : [longswordPresentationRef()],
      classLevels: [{ className: "fighter", level: 1 }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      weaponMasteries: [],
      armorClass: {
        ...defaultArmorClassState(),
        ...loadoutHandUses({
          holdsShield: false,
          holdsOffHandWeapon: false,
          mainWeaponGrip: input.mainWeaponGrip,
        }),
      },
      size: "medium",
      speed: { walkFeet: movementFeet(movementSpeedFeet) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      ...(conditions === undefined ? {} : { conditions }),
      selectedLoadout:
        input.mainWeaponGrip === undefined
          ? {}
          : {
              weapon: {
                itemId: battleObjectId("main:weapon_longsword"),
                unitId: parseSharedUnitId("weapon_longsword"),
                grip: input.mainWeaponGrip,
              },
            },
      attack: input.mainWeaponGrip === undefined ? null : testLongswordAttack(),
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

/** The Longsword's Unit, which presents the mover's weapon attack. */
function longswordPresentationRef() {
  const unit = unitLibrary.requireUnit("weapon_longsword");
  if (unit.kind !== "weapon") throw new Error("Expected the Longsword Unit.");
  return { unit, supportProfiles: [] };
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
  const actorState = input.state.combatants.get(actorId);
  if (actorState === undefined || actorState.origin.kind !== "character") {
    throw new Error("Expected rule-core Movement character actor state.");
  }
  const mainWeaponGrip = actorState.origin.selectedLoadout.weapon?.grip;
  if (mainWeaponGrip === undefined) {
    throw new Error("Expected rule-core Movement actor main weapon grip.");
  }
  const hands = combatantHandUses(
    input.state,
    actorState,
    input.state.grapples,
  );
  const mainWeaponDamage = attackActionOptionsForActor(
    input.state,
    actorId,
  ).find(
    (option) => option.kind === "weapon" && option.weaponDelivery === undefined,
  );
  const grapple = input.state.grapples.find(
    (candidate) =>
      candidate.grapplerId === actorId && candidate.targetId === observerId,
  );
  return withRuleCoreComponentRoute(componentOwner, {
    currentActor: input.currentActor,
    movementSpentFeet: actor.movement.spentFeet,
    movementRemainingFeet: actor.movement.remainingFeet,
    dashBonusFeet: Number(snapshot.turn.dashMovementBonusFeet),
    prone: actor.conditions.includes("prone"),
    disengaged: snapshot.turn.disengaged,
    actionAvailable: snapshot.turn.actionResources.length > 0,
    grappleActive: grapple !== undefined,
    grappleEscapeDc: grapple === undefined ? 0 : Number(grapple.escapeDc),
    mainWeaponGrip,
    mainWeaponDamageDieSize:
      mainWeaponDamage?.kind === "weapon" &&
      mainWeaponDamage.weapon.damage.kind === "dice"
        ? mainWeaponDamage.weapon.damage.dieSize
        : 0,
    leftHandUse: hands.left,
    rightHandUse: hands.right,
    holes: input.holes.map(projectMovementHole),
    pendingOpportunityAttack:
      battleFrontierInterruptDecisionForState(input.state)?.trigger ===
      "opportunityAttack",
    lastResult: input.lastResult,
    lastInvalidReason: input.lastInvalidReason,
  });
}

function movementFill(
  hole: Extract<BattleHole, { readonly kind: "movement" }>,
  value: {
    readonly distanceFeet: number;
    readonly activity: ReturnType<typeof plainStepMovementActivity>;
    readonly provokedOpportunityAttacks: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): Extract<BattleFill, { readonly kind: "movement" }> {
  return {
    kind: "movement",
    holeId: hole.holeId,
    value: {
      speedKind: "walk",
      path: Array.map(
        ordinaryMovementPath(movementFeet(value.distanceFeet)),
        (segment) => ({
          ...segment,
          activity: value.activity,
        }),
      ),
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
  const grappleActive = booleanField(state, "qGrappleActive");
  const mainWeaponGrip = stringLiteralField(
    state,
    "qMainWeaponGrip",
    WEAPON_GRIPS,
  );
  return {
    componentRoute: decodeRuleCoreComponentRoute(state["qComponentRoute"]),
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
    grappleActive,
    grappleEscapeDc: numberFromQuintInt(
      state["qGrappleEscapeDc"],
      "qGrappleEscapeDc",
    ),
    mainWeaponGrip,
    mainWeaponDamageDieSize: numberFromQuintInt(
      state["qMainWeaponDamageDieSize"],
      "qMainWeaponDamageDieSize",
    ),
    // The hands the Quint grip and Grapple hold: the main weapon takes the
    // right hand, a two-handed grip the left too, and a Grapple the free one.
    leftHandUse: grappleActive
      ? "grapple"
      : mainWeaponGrip === "two_handed"
        ? "mainWeapon"
        : "free",
    rightHandUse: "mainWeapon",
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
  expect(runtime).toEqual(quint);
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
