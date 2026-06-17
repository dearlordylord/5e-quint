// UNIT-PROFILE-COVERAGE: verification-owner:focused-mbt unit-feature.grappler
// UNIT-IDENTITY-EVIDENCE: selected-identity-mbt L3-FOLLOWUP-GRAPPLER-RUNTIME feat_grappler
// UNIT-IDENTITY-MBT-REPLAY: L3-FOLLOWUP-GRAPPLER-RUNTIME feat_grappler doFastWrestlerExemptsSameSizeDragCost doAttackAdvantageAgainstGrappledTarget doPunchAndGrabFailedSaveGrapple
import { mbtSpecPath } from "./battle-runtime-mbt-driver-kit.ts";
import { defineSelectedIdentityWitness } from "./selected-identity-witness.ts";
import {
  attackInitialTargetHole,
  attackRollFill,
  attackRollHoleAfterTarget,
  difficultyClass,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  grappleOutcomeFill,
  grapplerUnitRefs,
  movementFill,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  targetFill,
  unitFeatureDecisionFill,
  type BattleSubject,
} from "./battle-runtime-test-support.ts";

type GrapplerAttackRollMode = "none" | "normal" | "advantage" | "disadvantage";
type GrapplerLastResult =
  | "init"
  | "fastWrestler"
  | "attackAdvantage"
  | "punchAndGrab";
type GrapplerProjection = {
  readonly fastWrestlerDragExempt: boolean;
  readonly attackRollMode: GrapplerAttackRollMode;
  readonly punchAndGrabUsed: boolean;
  readonly grappleActive: boolean;
  readonly lastResult: GrapplerLastResult;
};

const GRAPPLER_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG = {
  Init: "init",
  FastWrestler: "fastWrestler",
  AttackAdvantage: "attackAdvantage",
  PunchAndGrab: "punchAndGrab",
} as const satisfies Readonly<Record<string, GrapplerLastResult>>;

defineSelectedIdentityWitness({
  describeLabel: "Grappler selected identity MBT",
  taskId: "L3-FOLLOWUP-GRAPPLER-RUNTIME",
  specFile: mbtSpecPath(
    import.meta.dirname,
    "battle-runtime-grappler-selected-identity.mbt.qnt",
  ),
  projectionSchema: {
    fastWrestlerDragExempt: "bool",
    attackRollMode: "str",
    punchAndGrabUsed: "bool",
    grappleActive: "bool",
    lastResult: "variant",
  },
  witnessProtocolField: "qProtocol",
  quintFieldNames: { lastResult: "qScenarioOutcome" },
  quintVariantFieldTags: {
    lastResult: GRAPPLER_SELECTED_IDENTITY_SCENARIO_OUTCOME_BY_TAG,
  },
  initialProjection: expectedProjection(),
  units: [
    {
      unitId: "feat_grappler",
      procedures: [
        {
          actionName: "doFastWrestlerExemptsSameSizeDragCost",
          projectionAfter: expectedProjection({
            fastWrestlerDragExempt: true,
            grappleActive: true,
            lastResult: "fastWrestler",
          }),
          discover: projectFastWrestlerExemptsSameSizeDragCost,
        },
        {
          actionName: "doAttackAdvantageAgainstGrappledTarget",
          projectionAfter: expectedProjection({
            attackRollMode: "advantage",
            grappleActive: true,
            lastResult: "attackAdvantage",
          }),
          discover: projectAttackAdvantageAgainstGrappledTarget,
        },
        {
          actionName: "doPunchAndGrabFailedSaveGrapple",
          projectionAfter: expectedProjection({
            punchAndGrabUsed: true,
            grappleActive: true,
            lastResult: "punchAndGrab",
          }),
          discover: projectPunchAndGrabFailedSaveGrapple,
        },
      ],
    },
  ],
});

function expectedProjection(
  overrides: Partial<GrapplerProjection> = {},
): GrapplerProjection {
  return {
    fastWrestlerDragExempt: false,
    attackRollMode: "none",
    punchAndGrabUsed: false,
    grappleActive: false,
    lastResult: "init",
    ...overrides,
  };
}

function projectFastWrestlerExemptsSameSizeDragCost(): GrapplerProjection {
  const state = fighterVsGoblinBattle({
    characterUnitRefs: grapplerUnitRefs(),
  });
  const subject: BattleSubject = {
    tag: "action",
    actorId: fighterId,
    action: "grapple",
  };
  const target = requireHole(
    resolveBattleSubject({ state, subject, fills: [] }),
    "targetChoice",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [targetFill(target, goblinId)],
    }),
    "grappleOutcome",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        grappleOutcomeFill(outcome, false),
      ],
    }),
  );
  const link = resolved.state.grapples.find(
    (candidate) =>
      candidate.grapplerId === fighterId && candidate.targetId === goblinId,
  );
  const moveSubject: BattleSubject = {
    tag: "runtimeCommand",
    actorId: fighterId,
    command: "move",
  };
  const moveHole = requireHole(
    resolveBattleSubject({
      state: resolved.state,
      subject: moveSubject,
      fills: [],
    }),
    "movement",
  );
  const moved = resolveBattleSubject({
    state: resolved.state,
    subject: moveSubject,
    fills: [
      movementFill(moveHole, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        grappleDrag: {
          kind: "grappleDrag",
          totalDistanceFeet: movementFeet(10),
          targets: [
            {
              targetId: goblinId,
              distanceFeet: movementFeet(10),
            },
          ],
        },
      }),
    ],
  });

  return expectedProjection({
    fastWrestlerDragExempt:
      link !== undefined &&
      moved.tag === "resolved" &&
      moved.state.combatants.get(fighterId)?.movementSpentFeet ===
        movementFeet(10),
    grappleActive: link !== undefined,
    lastResult: "fastWrestler",
  });
}

function projectAttackAdvantageAgainstGrappledTarget(): GrapplerProjection {
  const state = {
    ...fighterVsGoblinBattle({
      characterUnitRefs: grapplerUnitRefs(),
    }),
    grapples: [
      {
        grapplerId: fighterId,
        targetId: goblinId,
        escapeDc: difficultyClass(13),
        reachFeet: movementFeet(5),
        hand: "left" as const,
      },
    ],
  };
  const subject = fighterAttackSubject();
  const target = attackInitialTargetHole(state, subject);
  const attackRoll = attackRollHoleAfterTarget(
    state,
    target,
    subject,
    goblinId,
  );

  return expectedProjection({
    attackRollMode:
      attackRoll.kind === "attackRoll"
        ? (attackRoll.rollMode ?? "normal")
        : "none",
    grappleActive: state.grapples.length === 1,
    lastResult: "attackAdvantage",
  });
}

function projectPunchAndGrabFailedSaveGrapple(): GrapplerProjection {
  const state = fighterVsGoblinBattle({
    characterUnitRefs: grapplerUnitRefs(),
  });
  const subject = fighterAttackSubject("Unarmed Strike");
  const target = attackInitialTargetHole(state, subject);
  const attackRoll = attackRollHoleAfterTarget(
    state,
    target,
    subject,
    goblinId,
  );
  const decision = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
      ],
    }),
    "unitFeatureDecision",
  );
  const outcome = requireHole(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
        unitFeatureDecisionFill(decision, "use"),
      ],
    }),
    "grappleOutcome",
  );
  const resolved = requireResolved(
    resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFill(target, goblinId),
        attackRollFill(attackRoll, { naturalD20: 12, total: 17 }),
        unitFeatureDecisionFill(decision, "use"),
        grappleOutcomeFill(outcome, false),
      ],
    }),
  );
  const grappleActive = resolved.state.grapples.some(
    (candidate) =>
      candidate.grapplerId === fighterId && candidate.targetId === goblinId,
  );

  return expectedProjection({
    punchAndGrabUsed:
      resolved.state.currentTurnResources.grapplerPunchAndGrabUsedThisTurn.includes(
        fighterId,
      ),
    grappleActive,
    lastResult: "punchAndGrab",
  });
}
