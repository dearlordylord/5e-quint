// RAW-COVERAGE: runtime-owner RAW-QCORE9-UNIT-FEATURE-PROFILES-001
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.PROCEDURE_PROFILE_SEMANTICS
// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.creature-space-movement-permission
// UNIT-IDENTITY-EVIDENCE: selected-identity-replay L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME species_halfling_nimbleness
// UNIT-IDENTITY-REPLAY: L3-FOLLOWUP-HALFLING-NIMBLENESS-RUNTIME species_halfling_nimbleness doMoveThroughLargerCreatureSpace doRejectOccupiedStop doRejectMissingProfile doRejectSameSizeTraversal
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityReplayAndQntReplay } from "./selected-identity-witness.ts";
import {
  battleId,
  battleTablePositionId,
  battleUnitRefWithSupportProfiles,
  combatantId,
  resolveBattleSubject,
  type BattleState,
  type BattleSubject,
} from "./index.ts";
import {
  oppositionSide,
  partySide,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { requireCombatant } from "./unit-profile-admission-creature-fixture-support.ts";
import {
  characterSeed,
  movementFill,
  requireHole,
  startBattleRight,
} from "./battle-runtime-test-support.ts";
import * as Either from "effect/Either";

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
const nimbleMoverId = combatantId("halfling-nimbleness-selected-identity-mover");
const blockerId = combatantId("halfling-nimbleness-selected-identity-blocker");
const occupiedPositionId = battleTablePositionId(
  "halfling-nimbleness-occupied-space",
);

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
          projectionAfter: expectedProjection({
            traversalAccepted: true,
            acceptedMovementSpentFeet: 10,
            lastResult: "moveThroughLargerCreatureSpace",
          }),
          discover: () =>
            projectAcceptedTraversal(
              halflingNimblenessBattle({ selected: true }),
            ),
        },
        {
          actionName: "doRejectOccupiedStop",
          projectionAfter: expectedProjection({
            occupiedStopRejected: true,
            lastResult: "rejectOccupiedStop",
          }),
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
          projectionAfter: expectedProjection({
            missingProfileRejected: true,
            lastResult: "rejectMissingProfile",
          }),
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
          projectionAfter: expectedProjection({
            sameSizeRejected: true,
            lastResult: "rejectSameSizeTraversal",
          }),
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
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
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
        side: partySide,
        size: "small",
        unitFeatures: [{ unit }],
        characterUnitRefs: input.selected ? [unitRef.right] : [],
      }),
      characterSeed({
        combatantId: blockerId,
        displayName: "Blocker",
        initiative: 10,
        side: oppositionSide,
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
    throw new Error(`Expected accepted Nimbleness Movement, got ${result.tag}.`);
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
    throw new Error(`Expected rejected Nimbleness Movement, got ${result.tag}.`);
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
