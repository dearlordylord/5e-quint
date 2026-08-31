// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.creature-space-movement-permission
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME species_halfling_nimbleness
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME species_halfling_nimbleness doMoveThroughLargerCreatureSpace doRejectOccupiedStop doRejectMissingProfile doRejectSameSizeTraversal
import { expect, it } from "vitest";
import { movementFeet, NonNegativeInteger } from "@dnd/shared/types";

import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.test-support.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.test-support.ts";
import {
  battleId,
  battleTablePositionId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  discoverBattleActCandidates,
  type BattleState,
  type BattleFill,
  type BattleReducerRouteEvent,
  type BattleSubject,
} from "./index.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  characterBattleFeatureInitForTest,
  resolveBattleSubject,
  characterSeed,
  characterAttackSubjectForTest,
  attackExecutionSelectionForSubjectForTest,
  movementFill,
  requireHole,
  startBattleRight,
} from "./battle-runtime.test-support.ts";
import {
  battleAttackExecutionScopeRefForProcedureRef,
  battleAttackProcedureExecutionRef,
} from "./identity.ts";
import { Result } from "effect";

type HalflingNimblenessLastResult =
  | "init"
  | "moveThroughLargerCreatureSpace"
  | "rejectOccupiedStop"
  | "rejectMissingProfile"
  | "rejectSameSizeTraversal";

type HalflingNimblenessProjection = {
  readonly traversalAccepted: boolean;
  readonly acceptedMovementSpentFeet: number;
  readonly occupiedStopRejected: boolean;
  readonly missingProfileRejected: boolean;
  readonly sameSizeRejected: boolean;
  readonly lastResult: HalflingNimblenessLastResult;
};

const speciesHalflingNimblenessUnitId = "species_halfling_nimbleness";
const nimbleMoverId = combatantId(
  "halfling-nimbleness-selected-identity-mover",
);
const blockerId = combatantId("halfling-nimbleness-selected-identity-blocker");
const occupiedPositionId = battleTablePositionId(
  "halfling-nimbleness-occupied-space",
);

it("observes selected Halfling Nimbleness qRoute through public reducer events", () => {
  expect(
    observeAcceptedMovementRoute(halflingNimblenessBattle({ selected: true })),
  ).toEqual(acceptedCreatureSpaceMovementRoute());
  expect(
    observeRejectedMovementRoute({
      state: halflingNimblenessBattle({ selected: true }),
      destination: {
        kind: "occupiedCreatureSpace",
        occupantId: blockerId,
        positionId: occupiedPositionId,
      },
    }),
  ).toEqual(rejectedCreatureSpaceMovementRoute());
  expect(
    observeRejectedMovementRoute({
      state: halflingNimblenessBattle({ selected: false }),
      destination: {
        kind: "unoccupiedSpace",
        positionId: battleTablePositionId("halfling-nimbleness-beyond-blocker"),
      },
    }),
  ).toEqual(rejectedCreatureSpaceMovementRoute());
  expect(
    observeRejectedMovementRoute({
      state: halflingNimblenessBattle({ selected: true, blockerSize: "small" }),
      destination: {
        kind: "unoccupiedSpace",
        positionId: battleTablePositionId(
          "halfling-nimbleness-beyond-small-blocker",
        ),
      },
    }),
  ).toEqual(rejectedCreatureSpaceMovementRoute());
  expect(
    observeOrdinaryMovementRoute(
      halflingNimblenessBattle({ selected: true }),
    ).some(isCreatureSpaceMovementPermissionRoute),
  ).toBe(false);
  const opportunityAttackTraversal = observeMovementRouteResult(
    halflingNimblenessBattle({ selected: true }),
    {
      destination: {
        kind: "unoccupiedSpace",
        positionId: battleTablePositionId(
          "halfling-nimbleness-beyond-blocker-opportunity-attack",
        ),
      },
      provokedOpportunityAttacks: [
        {
          reactorId: blockerId,
          distanceFeet: movementFeet(5),
          ...attackExecutionSelectionForSubjectForTest(
            characterAttackSubjectForTest(
              halflingNimblenessBattle({ selected: true }),
              blockerId,
              "Longsword",
            ),
          ),
        },
      ],
    },
  );
  expect(opportunityAttackTraversal.result).toMatchObject({
    tag: "needsHoles",
    holes: [{ kind: "interruptDecision", trigger: "opportunityAttack" }],
  });
  expect(
    opportunityAttackTraversal.route.some(
      isCreatureSpaceMovementPermissionRoute,
    ),
  ).toBe(false);
  const movementBudgetFailure = observeMovementRouteResult(
    halflingNimblenessBattle({ selected: true }),
    {
      destination: {
        kind: "unoccupiedSpace",
        positionId: battleTablePositionId(
          "halfling-nimbleness-beyond-blocker-budget-failure",
        ),
      },
      movementCostFeet: 40,
    },
  );
  expect(movementBudgetFailure.result).toMatchObject({
    tag: "invalid",
    message: "Movement cost exceeds the combatant's remaining Movement.",
  });
  expect(
    movementBudgetFailure.route.some(isCreatureSpaceMovementPermissionRoute),
  ).toBe(false);
  const opportunityAttackThreatFailureState = halflingNimblenessBattle({
    selected: true,
  });
  const blockerAttackSelection = attackExecutionSelectionForSubjectForTest(
    characterAttackSubjectForTest(
      opportunityAttackThreatFailureState,
      blockerId,
      "Longsword",
    ),
  );
  const opportunityAttackThreatFailure = observeMovementRouteResult(
    opportunityAttackThreatFailureState,
    {
      destination: {
        kind: "unoccupiedSpace",
        positionId: battleTablePositionId(
          "halfling-nimbleness-beyond-blocker-opportunity-attack-failure",
        ),
      },
      provokedOpportunityAttacks: [
        {
          reactorId: blockerId,
          distanceFeet: movementFeet(5),
          ...blockerAttackSelection,
          procedureRef: battleAttackProcedureExecutionRef(
            battleAttackExecutionScopeRefForProcedureRef(
              blockerAttackSelection.procedureRef,
            ),
            NonNegativeInteger(999),
          ),
        },
      ],
    },
  );
  expect(opportunityAttackThreatFailure.result).toMatchObject({
    tag: "invalid",
    message:
      "Movement Opportunity Attack threat references an unknown attack option.",
  });
  expect(
    opportunityAttackThreatFailure.route.some(
      isCreatureSpaceMovementPermissionRoute,
    ),
  ).toBe(false);
});

defineSelectedIdentityReplayAndQntReplay({
  describeLabel: "Halfling Nimbleness selected identity replay",
  taskId: "L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-halfling-nimbleness-selected-identity.mbt.qnt",
  ),
  quintStateField: "qState",
  witnessProtocolField: "protocol",
  quintFieldNames: { lastResult: "scenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: {
      Init: "init",
      MoveThroughLargerCreatureSpace: "moveThroughLargerCreatureSpace",
      RejectOccupiedStop: "rejectOccupiedStop",
      RejectMissingProfile: "rejectMissingProfile",
      RejectSameSizeTraversal: "rejectSameSizeTraversal",
    },
  },
  projectionSchema: {
    traversalAccepted: "bool",
    acceptedMovementSpentFeet: "int",
    occupiedStopRejected: "bool",
    missingProfileRejected: "bool",
    sameSizeRejected: "bool",
    lastResult: "variant",
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: speciesHalflingNimblenessUnitId,
      procedures: [
        {
          actionName: "doMoveThroughLargerCreatureSpace",
          discover: () =>
            projectAcceptedTraversal(
              halflingNimblenessBattle({ selected: true }),
            ),
        },
        {
          actionName: "doRejectOccupiedStop",
          discover: () =>
            projectRejectedTraversal({
              state: halflingNimblenessBattle({ selected: true }),
              destination: {
                kind: "occupiedCreatureSpace",
                occupantId: blockerId,
                positionId: occupiedPositionId,
              },
              expectedMessage:
                "Creature-space traversal cannot end in an occupied creature space.",
              lastResult: "rejectOccupiedStop",
              rejectedField: "occupiedStopRejected",
            }),
        },
        {
          actionName: "doRejectMissingProfile",
          discover: () =>
            projectRejectedTraversal({
              state: halflingNimblenessBattle({ selected: false }),
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId(
                  "halfling-nimbleness-beyond-blocker",
                ),
              },
              expectedMessage:
                "Creature-space traversal requires a selected occupied-creature-space movement permission profile.",
              lastResult: "rejectMissingProfile",
              rejectedField: "missingProfileRejected",
            }),
        },
        {
          actionName: "doRejectSameSizeTraversal",
          discover: () =>
            projectRejectedTraversal({
              state: halflingNimblenessBattle({
                selected: true,
                blockerSize: "small",
              }),
              destination: {
                kind: "unoccupiedSpace",
                positionId: battleTablePositionId(
                  "halfling-nimbleness-beyond-small-blocker",
                ),
              },
              expectedMessage:
                "Creature-space traversal requires each occupied creature to be larger than the mover.",
              lastResult: "rejectSameSizeTraversal",
              rejectedField: "sameSizeRejected",
            }),
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<HalflingNimblenessProjection> = {},
): HalflingNimblenessProjection {
  return {
    traversalAccepted: false,
    acceptedMovementSpentFeet: 0,
    occupiedStopRejected: false,
    missingProfileRejected: false,
    sameSizeRejected: false,
    lastResult: "init",
    ...overrides,
  };
}

function halflingNimblenessBattle(input: {
  readonly selected: boolean;
  readonly blockerSize?: "small" | "medium";
}): BattleState {
  const unit = unitLibrary.requireUnit(speciesHalflingNimblenessUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Result.isFailure(unitRef)) {
    throw new Error(unitRef.failure.message);
  }
  return startBattleRight({
    battleId: battleId(
      input.blockerSize === "small"
        ? "halfling-nimbleness-selected-identity-small-blocker"
        : input.selected
          ? "halfling-nimbleness-selected-identity"
          : "halfling-nimbleness-selected-identity-missing-profile",
    ),
    combatants: [
      characterSeed({
        combatantId: nimbleMoverId,
        displayName: "Nimble Mover",
        initiative: 20,
        size: "small",
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
        characterUnitRefs: input.selected ? [unitRef.success] : [],
      }),
      characterSeed({
        combatantId: blockerId,
        displayName: "Blocker",
        initiative: 10,
        size: input.blockerSize ?? "medium",
      }),
    ],
  });
}

function projectAcceptedTraversal(
  state: BattleState,
): HalflingNimblenessProjection {
  const result = resolveMovement(state, {
    destination: {
      kind: "unoccupiedSpace",
      positionId: battleTablePositionId("halfling-nimbleness-beyond-blocker"),
    },
  });
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected accepted Nimbleness Movement, got ${result.tag}.`,
    );
  }
  return expectedProjection({
    traversalAccepted: true,
    acceptedMovementSpentFeet: Number(
      requireCombatant(result.state, nimbleMoverId).movementSpentFeet,
    ),
    lastResult: "moveThroughLargerCreatureSpace",
  });
}

type RejectedTraversalField =
  | "occupiedStopRejected"
  | "missingProfileRejected"
  | "sameSizeRejected";

function projectRejectedTraversal(input: {
  readonly state: BattleState;
  readonly destination: NonNullable<
    Parameters<typeof resolveMovement>[1]["destination"]
  >;
  readonly expectedMessage: string;
  readonly lastResult: HalflingNimblenessLastResult;
  readonly rejectedField: RejectedTraversalField;
}): HalflingNimblenessProjection {
  const result = resolveMovement(input.state, {
    destination: input.destination,
  });
  if (result.tag !== "invalid") {
    throw new Error(
      `Expected rejected Nimbleness Movement, got ${result.tag}.`,
    );
  }
  if (result.message !== input.expectedMessage) {
    throw new Error(result.message);
  }
  return expectedProjection({
    occupiedStopRejected: input.rejectedField === "occupiedStopRejected",
    missingProfileRejected: input.rejectedField === "missingProfileRejected",
    sameSizeRejected: input.rejectedField === "sameSizeRejected",
    lastResult: input.lastResult,
  });
}

function resolveMovement(
  state: BattleState,
  input: {
    readonly destination:
      | {
          readonly kind: "unoccupiedSpace";
          readonly positionId: ReturnType<typeof battleTablePositionId>;
        }
      | {
          readonly kind: "occupiedCreatureSpace";
          readonly occupantId: typeof blockerId;
          readonly positionId: typeof occupiedPositionId;
        };
  },
): ReturnType<typeof resolveBattleSubject> {
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: nimbleMoverId,
    command: "move",
  };
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "movement",
  );
  return resolveBattleSubject({
    state,
    subject,
    fills: [
      movementFill(hole, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        creatureSpaceTraversal: {
          kind: "occupiedCreatureSpaceTraversal",
          occupiedSpaces: [
            {
              occupantId: blockerId,
              positionId: occupiedPositionId,
            },
          ],
          destination: input.destination,
        },
      }),
    ],
  });
}

function observeAcceptedMovementRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  return observeMovementRoute(state, {
    destination: {
      kind: "unoccupiedSpace",
      positionId: battleTablePositionId("halfling-nimbleness-beyond-blocker"),
    },
  });
}

function observeRejectedMovementRoute(input: {
  readonly state: BattleState;
  readonly destination: NonNullable<
    Parameters<typeof observeMovementRouteResult>[1]["destination"]
  >;
}): readonly BattleReducerRouteEvent[] {
  return observeMovementRoute(input.state, { destination: input.destination });
}

function observeMovementRoute(
  state: BattleState,
  input: Parameters<typeof observeMovementRouteResult>[1],
): readonly BattleReducerRouteEvent[] {
  return observeMovementRouteResult(state, input).route;
}

function observeMovementRouteResult(
  state: BattleState,
  input: Parameters<typeof resolveMovement>[1] & {
    readonly movementCostFeet?: number;
    readonly provokedOpportunityAttacks?: Extract<
      BattleFill,
      { readonly kind: "movement" }
    >["value"]["provokedOpportunityAttacks"];
  },
): {
  readonly route: readonly BattleReducerRouteEvent[];
  readonly result: ReturnType<typeof resolveBattleSubject>;
} {
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: nimbleMoverId,
    command: "move",
  };
  const moveAct = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.actorId === nimbleMoverId &&
      act.subject.command === "move",
  );
  if (moveAct === undefined) {
    throw new Error("Expected public Movement act for Halfling Nimbleness.");
  }
  const hole = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "movement",
  );
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      movementFill(hole, {
        movementCostFeet: input.movementCostFeet ?? 10,
        provokedOpportunityAttacks: input.provokedOpportunityAttacks ?? [],
        creatureSpaceTraversal: {
          kind: "occupiedCreatureSpaceTraversal",
          occupiedSpaces: [
            {
              occupantId: blockerId,
              positionId: occupiedPositionId,
            },
          ],
          destination: input.destination,
        },
      }),
    ],
  });
  return {
    route: [...(moveAct.routeEvents ?? []), ...(result.routeEvents ?? [])],
    result,
  };
}

function observeOrdinaryMovementRoute(
  state: BattleState,
): readonly BattleReducerRouteEvent[] {
  const subject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: nimbleMoverId,
    command: "move",
  };
  const moveAct = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.actorId === nimbleMoverId &&
      act.subject.command === "move",
  );
  if (moveAct === undefined) {
    throw new Error("Expected public Movement act for ordinary Movement.");
  }
  const awaitingMovement = resolveBattleSubject({ state, subject, fills: [] });
  const hole = requireHole(awaitingMovement, "movement");
  const result = resolveBattleSubject({
    state,
    subject,
    fills: [
      movementFill(hole, {
        movementCostFeet: 5,
        provokedOpportunityAttacks: [],
      }),
    ],
  });
  if (result.tag !== "resolved") {
    throw new Error(
      `Expected ordinary Movement to resolve, got ${result.tag}.`,
    );
  }
  return [
    ...(moveAct.routeEvents ?? []),
    ...(awaitingMovement.routeEvents ?? []),
    ...(result.routeEvents ?? []),
  ];
}

function isCreatureSpaceMovementPermissionRoute(
  event: BattleReducerRouteEvent,
): boolean {
  return (
    "subject" in event && event.subject === "creatureSpaceMovementPermission"
  );
}

function acceptedCreatureSpaceMovementRoute(): readonly BattleReducerRouteEvent[] {
  return [
    creatureSpaceMovementResolveRoute([]),
    creatureSpaceMovementResolveWithoutFillRoute(),
  ];
}

function rejectedCreatureSpaceMovementRoute(): readonly BattleReducerRouteEvent[] {
  return [creatureSpaceMovementResolveRoute(["movement"])];
}

function creatureSpaceMovementResolveRoute(
  holes: readonly ["movement"] | readonly [],
): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubject",
    subject: "creatureSpaceMovementPermission",
    fill: "movement",
    holes,
    owner: "battleCreatureSpaceMovement",
  };
}

function creatureSpaceMovementResolveWithoutFillRoute(): BattleReducerRouteEvent {
  return {
    kind: "resolveBattleSubjectWithoutFill",
    subject: "creatureSpaceMovementPermission",
    holes: [],
    owner: "battleMovementResource",
  };
}
