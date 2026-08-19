// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.ORDINARY_CREATURE_SPACE_TABLE_ROUTE
// KERNEL-COVERAGE: parity-witness BATTLE.MOVEMENT.FRONTIER_AND_RESOURCE_SPEND
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { Either } from "effect";
import {
  battleAttackExecutionScopeRef,
  battleAttackProcedureExecutionRef,
  battleActSpellPresentation,
  battleExecutionScopeOrdinal,
  battleId,
  battleObjectId,
  combatantId,
  discoverBattleActs,
  readyTriggerDescription,
  resolveBattleRuntimeSubject,
} from "../../../packages/battle-runtime/src/index.ts";
import {
  battleRuntimeContextFromCharacterAdmission,
  battleRuntimeSessionFromAdmittedContext,
  battleRuntimeSessionWithRetainedCompanionTransition,
  battleRuntimeSessionWithState,
} from "../../../packages/battle-runtime/src/battle-runtime-context.ts";
import { applyCondition } from "../../../packages/shared-algebras/src/conditions-algebra.ts";

import { FIGHTER_EXAMPLE_DRAFT } from "../../../packages/app/src/components/character-creation/characterCreationPresets.ts";
import { finalizeCharacterDraft } from "../../../packages/character-creation-runtime/src/index.ts";
import {
  characterSheetId,
  createFreshCharacterSheet,
} from "../../../packages/character-sheet-runtime/src/index.ts";
import { armorClass } from "../../../packages/shared-algebras/src/armor-class-algebra.ts";
import {
  damageAmount,
  DieRollResult,
  Hp,
  movementFeet,
  NonNegativeInteger,
} from "../../../packages/shared/src/types.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "../../../packages/surface/src/surface/unit-catalog.ts";
import { repoRoot, sha256Canonical } from "../transcript.ts";
import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";
import { evaluateScenarioSetup } from "./scenario-setup-runtime.ts";
import { jsonValue } from "./json-value.ts";
import {
  createScenarioSession,
  continueScenarioMovement,
  scenarioDistanceFeet,
  scenarioTableSpatialFingerprint,
  scenarioBattleActs,
  scenarioBattleFills,
  scenarioBattleSubject,
  scenarioCreatureSpellTargetFills,
  scenarioTableSpatialFactFills,
  scenarioAttackTargetFills,
  scenarioRelation,
  scenarioEnemyWithinFiveFeetCanSeeAttacker,
  scenarioObjectAttackFills,
  scenarioOpportunityAttackExecutionCandidates,
  planScenarioMovement,
  scenarioSessionWithBattleResult,
  tableAuthoredSpatialDecision,
} from "./scenario-session.ts";
import type {
  ScenarioSession,
  ScenarioSpatialSetupInput,
} from "./scenario-session.ts";

const TRACER_SCENARIO_ID = "tracer-001-goblin-warrior-vs-skeleton";

describe("scenario setup public-SDK boundary", () => {
  test("passes controller-authored Character Sheets into neutral setup", async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), "dnd-scenario-characters-"),
    );
    try {
      const unitCatalog = buildUnitCatalog({
        collections: [srdUnitCollection],
      });
      expect(unitCatalog.tag).toBe("ok");
      if (unitCatalog.tag === "invalid") return;
      const finalized = finalizeCharacterDraft({
        draft: FIGHTER_EXAMPLE_DRAFT,
        unitLibrary: unitCatalog.catalog,
      });
      expect(finalized.tag).toBe("ready");
      if (finalized.tag !== "ready") return;
      const createdSheet = createFreshCharacterSheet({
        characterId: characterSheetId("raw-swarm:test:external-fighter"),
        build: finalized.build,
        tempHp: Hp(0),
        hitPointMaximumReduction: Hp(0),
        conditions: [],
        unitLibrary: unitCatalog.catalog,
      });
      expect(Either.isRight(createdSheet)).toBe(true);
      if (Either.isLeft(createdSheet)) return;
      const charactersPath = resolve(directory, "characters.ts");
      const invalidCharactersPath = resolve(directory, "invalid-characters.ts");
      writeFileSync(
        invalidCharactersPath,
        `export const composeScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: ${JSON.stringify([createdSheet.right, {}, createdSheet.right])},
  observation: { attempted: 3 },
});
`,
      );
      await expect(
        evaluateScenarioCharacters(invalidCharactersPath),
      ).resolves.toEqual({
        tag: "invalid",
        message:
          "Character Sheet 2 is invalid. Scenario characters returned duplicate Character Sheet ids.",
      });
      writeFileSync(
        charactersPath,
        `export const composeScenarioCharacters = () => ({
  kind: "ready",
  characterSheets: ${JSON.stringify([createdSheet.right])},
  observation: { characterIds: [${JSON.stringify(createdSheet.right.characterId)}] },
});
`,
      );
      const setupPath = resolve(directory, "setup.ts");
      writeFileSync(
        setupPath,
        readFileSync(
          resolve(
            repoRoot,
            "scripts/raw-swarm/sdk-player/test-fixtures/ready-mixed.setup.ts",
          ),
          "utf8",
        ),
      );

      const characters = await evaluateScenarioCharacters(charactersPath);
      expect(characters).toMatchObject({
        tag: "ready",
        characterSheets: [{ characterId: createdSheet.right.characterId }],
      });
      if (characters.tag !== "ready") return;

      const readySetup = await evaluateScenarioSetup(
        setupPath,
        characters.characterSheets,
      );
      expect(readySetup.tag).toBe("ready");
      if (readySetup.tag !== "ready") return;

      const foreignContextBattle =
        battleRuntimeSessionWithRetainedCompanionTransition(
          readySetup.session.battle,
          combatantId("external-fighter"),
          readySetup.session.battle.state,
          {
            formAccess: "findFamiliar",
            selectedForm: { tag: "normalNamedForm", formId: "cat" },
          },
        );
      expect(foreignContextBattle).toBeDefined();
      if (foreignContextBattle === undefined) return;
      expect(foreignContextBattle.context).not.toBe(
        readySetup.session.battle.context,
      );
      expect(
        scenarioSessionWithBattleResult(
          readySetup.session,
          foreignContextBattle,
        ),
      ).toMatchObject({
        _tag: "Left",
        left: {
          tag: "spatial-decision-lineage-conflict",
          decisionId: "scenario-session",
          message:
            "ScenarioSession cannot adopt a same-battle BattleRuntime session from a different admitted context.",
        },
      });

      const ready = await evaluateScenarioSetup(
        setupPath,
        characters.characterSheets,
      );
      expect(ready).toMatchObject({
        tag: "ready",
        observation: { combatants: 2 },
      });
      await expect(
        evaluateScenarioSetup(setupPath, characters.characterSheets),
      ).resolves.toBe(ready);
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toEqual({
        tag: "obstructed",
        obstruction:
          "Mixed setup requires exactly one controller-authored Character Sheet.",
        observation: { phase: "character-cardinality", count: 0 },
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("evaluates an adjacent ordinary TypeScript setup", async () => {
    const setupPath = resolve(
      repoRoot,
      `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
    );
    const result = await evaluateScenarioSetup(setupPath, []);

    expect(result).toMatchObject({
      tag: "ready",
      observation: {
        combatants: ["goblin-warrior", "skeleton"],
        initiatives: [15, 10],
      },
    });
    if (result.tag === "ready") {
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toBe(result);
      expect(
        scenarioEnemyWithinFiveFeetCanSeeAttacker(
          result.session,
          combatantId("goblin-warrior"),
        ),
      ).toBe(true);
    }
  }, 120_000);

  test("reconstructs an equivalent SDK successor with the same transcript lineage", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        "scripts/raw-swarm/sdk-player/scenarios/generated-battle-013.setup.ts",
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;

    const subject = {
      tag: "action" as const,
      actorId: combatantId("brine"),
      action: "shove" as const,
    };
    const fill = {
      kind: "targetChoice" as const,
      holeId: "battle:shove:target",
      value: combatantId("rivet"),
      spatialFacts: [],
    };
    const resolveRetainedCall = () => {
      const canonicalSubject = scenarioBattleSubject(setup.session, subject);
      const projected = scenarioTableSpatialFactFills({
        session: setup.session,
        subject: canonicalSubject,
        fills: scenarioBattleFills(setup.session, canonicalSubject, [fill]),
      });
      expect(Either.isRight(projected)).toBe(true);
      if (Either.isLeft(projected)) return undefined;
      return resolveBattleRuntimeSubject({
        session: setup.session.battle,
        subject: canonicalSubject,
        fills: projected.right,
      });
    };
    const firstBattleResolution = resolveRetainedCall();
    const replayedBattleResolution = resolveRetainedCall();
    expect(firstBattleResolution?.tag).toBe("needsHoles");
    expect(replayedBattleResolution?.tag).toBe("needsHoles");
    if (
      firstBattleResolution?.tag !== "needsHoles" ||
      replayedBattleResolution?.tag !== "needsHoles"
    ) {
      return;
    }
    const firstSuccessor = scenarioSessionWithBattleResult(
      setup.session,
      firstBattleResolution.session,
    );
    const replayedSuccessor = scenarioSessionWithBattleResult(
      setup.session,
      replayedBattleResolution.session,
    );
    expect(Either.isRight(firstSuccessor)).toBe(true);
    expect(Either.isRight(replayedSuccessor)).toBe(true);
    if (Either.isLeft(firstSuccessor) || Either.isLeft(replayedSuccessor)) {
      return;
    }

    expect(sha256Canonical(jsonValue(replayedSuccessor.right))).toBe(
      sha256Canonical(jsonValue(firstSuccessor.right)),
    );

    const foreignContext = battleRuntimeContextFromCharacterAdmission(
      setup.session.battle.context.characters,
      setup.session.battle.context.statBlocks,
    );
    const foreignContextBattle = battleRuntimeSessionFromAdmittedContext(
      setup.session.battle.state,
      foreignContext,
    );
    expect(foreignContextBattle.context).not.toBe(setup.session.battle.context);
    expect(
      scenarioSessionWithBattleResult(setup.session, foreignContextBattle),
    ).toMatchObject({
      _tag: "Left",
      left: {
        tag: "spatial-decision-lineage-conflict",
        decisionId: "scenario-session",
        message:
          "ScenarioSession cannot adopt an unrelated same-battle BattleRuntime session; results must follow the current runtime session directly.",
      },
    });
  });

  test("accepts a table-authored exact relation without tactical-space", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;

    const sourceId = combatantId("goblin-warrior");
    const targetId = combatantId("skeleton");
    const geometryRelation = scenarioRelation({
      session: setup.session,
      sourceId,
      targetId,
    });
    expect(geometryRelation.tag).toBe("relation");
    if (geometryRelation.tag !== "relation") return;
    const authoredDistance = scenarioDistanceFeet(
      Number(geometryRelation.relation.distanceFeet),
    );
    expect(Either.isRight(authoredDistance)).toBe(true);
    if (Either.isLeft(authoredDistance)) return;

    const ordinaryAttack = discoverBattleActs(setup.session.battle).find(
      ({ subject }) => subject.tag === "action" && subject.action === "attack",
    );
    expect(ordinaryAttack).toBeDefined();
    if (ordinaryAttack === undefined) return;
    const attackFrontier = resolveBattleRuntimeSubject({
      session: setup.session.battle,
      subject: ordinaryAttack.subject,
      fills: [],
    });
    expect(attackFrontier.tag).toBe("needsHoles");
    if (attackFrontier.tag !== "needsHoles") return;
    const attackTargetHole = attackFrontier.holes.find(
      (hole) => hole.kind === "targetChoice" && hole.attack !== undefined,
    );
    expect(attackTargetHole?.kind).toBe("targetChoice");
    if (
      attackTargetHole?.kind !== "targetChoice" ||
      attackTargetHole.attack === undefined
    ) {
      return;
    }
    const attackTarget = attackTargetHole.choices[0];
    expect(attackTarget).toBeDefined();
    if (attackTarget === undefined) return;
    const projectedAttack = scenarioAttackTargetFills({
      session: setup.session,
      subject: ordinaryAttack.subject,
      fills: [
        {
          kind: "targetChoice",
          holeId: attackTargetHole.holeId,
          value: attackTarget,
          spatialFacts: [],
        },
      ],
    });
    expect(Either.isRight(projectedAttack)).toBe(true);
    if (Either.isLeft(projectedAttack)) return;
    const expectedAttackFactKind =
      attackTargetHole.attack.targetConstraint.kind === "meleeReach"
        ? "attackTargetInMeleeReach"
        : "attackTargetInRangedRange";
    expect(projectedAttack.right).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        holeId: attackTargetHole.holeId,
        value: attackTarget,
        spatialFacts: [
          expect.objectContaining({
            kind: expectedAttackFactKind,
            actorId: attackTargetHole.attack.actorId,
            targetId: attackTarget,
          }),
        ],
      }),
    ]);
    const playerSightOverride = scenarioAttackTargetFills({
      session: setup.session,
      subject: ordinaryAttack.subject,
      fills: [
        {
          kind: "targetChoice",
          holeId: attackTargetHole.holeId,
          value: attackTarget,
          spatialFacts: [
            {
              kind: "attackAttackerCannotSeeTarget" as const,
              attackerId: attackTargetHole.attack.actorId,
              targetId: attackTarget,
            },
            {
              kind: "attackTargetCannotSeeAttacker" as const,
              attackerId: attackTargetHole.attack.actorId,
              targetId: attackTarget,
            },
          ],
        },
      ],
    });
    expect(playerSightOverride).toMatchObject({ _tag: "Right" });
    if (Either.isRight(playerSightOverride)) {
      expect(playerSightOverride.right[0]?.spatialFacts).not.toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: "attackAttackerCannotSeeTarget" }),
          expect.objectContaining({ kind: "attackTargetCannotSeeAttacker" }),
        ]),
      );
    }

    const tableRelationDecision = {
      decisionId: "table-relation",
      question: { kind: "relation" as const, sourceId, targetId },
      answer: {
        direction: geometryRelation.relation.direction,
        distanceFeet: authoredDistance.right,
        attackerCanSeeTarget: geometryRelation.relation.attackerCanSeeTarget,
        cover: geometryRelation.relation.cover,
        traversal: geometryRelation.relation.traversal,
      },
    };
    const tableSessionInput = {
      battle: setup.session.battle,
      ambientIllumination: setup.session.battlefield.ambientIllumination,
      statBlockDamageNotation:
        setup.session.battlefield.statBlockDamageNotation,
      environment: setup.session.battlefield.environment,
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: [],
    } as const;
    const tableSession = createScenarioSession({
      ...tableSessionInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [tableRelationDecision],
      },
    });
    expect(Either.isRight(tableSession)).toBe(true);
    if (Either.isLeft(tableSession)) return;

    expect(tableSession.right.battlefield.spatial).toMatchObject({
      kind: "tableAuthored",
      tableAuthoredDecisions: [
        {
          source: "tableAuthored",
          decision: { decisionId: "table-relation" },
          lineage: {
            battleId: setup.session.battle.state.battleId,
            spatialFingerprint: expect.any(String),
          },
        },
      ],
    });
    expect(Object.keys(tableSession.right.battlefield)).not.toEqual(
      expect.arrayContaining(["arena", "space"]),
    );
    expect(
      scenarioRelation({
        session: tableSession.right,
        sourceId,
        targetId,
      }),
    ).toMatchObject({
      tag: "relation",
      relation: {
        distanceFeet: geometryRelation.relation.distanceFeet,
        spatialSource: {
          kind: "tableAuthored",
          decisionId: "table-relation",
        },
      },
    });
    const unrelatedSameBattleSession = battleRuntimeSessionFromAdmittedContext(
      tableSession.right.battle.state,
      tableSession.right.battle.context,
    );
    const unrelatedSessionResult = scenarioSessionWithBattleResult(
      tableSession.right,
      unrelatedSameBattleSession,
    );
    expect(unrelatedSessionResult).toMatchObject({
      _tag: "Left",
      left: { tag: "spatial-decision-lineage-conflict" },
    });
    if (tableSession.right.battlefield.spatial.kind === "tableAuthored") {
      const staleDecision =
        tableSession.right.battlefield.spatial.tableAuthoredDecisions[0];
      expect(staleDecision).toBeDefined();
      if (staleDecision !== undefined) {
        const staleSession = {
          ...tableSession.right,
          battlefield: {
            ...tableSession.right.battlefield,
            spatial: {
              ...tableSession.right.battlefield.spatial,
              tableAuthoredDecisions: [
                {
                  ...staleDecision,
                  lineage: {
                    ...staleDecision.lineage,
                    spatialFingerprint: scenarioTableSpatialFingerprint(
                      "stale-spatial-revision",
                    ),
                  },
                },
              ],
            },
          },
        } as ScenarioSession;
        expect(
          scenarioRelation({
            session: staleSession,
            sourceId,
            targetId,
          }),
        ).toMatchObject({
          tag: "stale-spatial-decision",
          decisionId: "table-relation",
        });
      }
    }

    const duplicateDecision = createScenarioSession({
      ...tableSessionInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          tableRelationDecision,
          { ...tableRelationDecision, decisionId: "table-relation-duplicate" },
        ],
      },
    });
    expect(duplicateDecision).toMatchObject({
      _tag: "Left",
      left: {
        issues: [{ tag: "duplicate-spatial-decision" }],
      },
    });
    const contradictoryDecision = createScenarioSession({
      ...tableSessionInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          tableRelationDecision,
          {
            ...tableRelationDecision,
            decisionId: "table-relation-contradiction",
            answer: {
              ...tableRelationDecision.answer,
              direction:
                tableRelationDecision.answer.direction === "north"
                  ? "south"
                  : "north",
            },
          },
        ],
      },
    });
    expect(contradictoryDecision).toMatchObject({
      _tag: "Left",
      left: {
        issues: [{ tag: "contradictory-spatial-decision" }],
      },
    });
    const malformedDecision = createScenarioSession({
      ...tableSessionInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [{ ...tableRelationDecision, decisionId: "  " }],
      },
    });
    expect(malformedDecision).toMatchObject({
      _tag: "Left",
      left: {
        issues: [{ tag: "invalid-spatial-decision" }],
      },
    });
    const blankRelationIdentity = tableAuthoredSpatialDecision({
      ...tableRelationDecision,
      decisionId: "blank-relation-identity",
      question: { ...tableRelationDecision.question, sourceId: "" },
    });
    expect(blankRelationIdentity).toMatchObject({
      _tag: "Left",
      left: { tag: "invalid-spatial-decision" },
    });

    const tableRoute = [{ x: 1, y: 0 }] as const;
    const postMoveFingerprint = scenarioTableSpatialFingerprint({
      kind: "table-post-move",
      battleId: String(setup.session.battle.state.battleId),
      route: tableRoute,
    });
    const tableMovementDecision = {
      decisionId: "table-movement",
      question: {
        kind: "movementRoute" as const,
        moverId: sourceId,
        route: tableRoute,
        speedKind: "walk" as const,
      },
      answer: {
        kind: "movementRoute" as const,
        movementCostFeet: movementFeet(5),
        provokedOpportunityAttacks: [],
        creatureSpaceTraversal: { kind: "notRequired" as const },
        postMoveSpatialState: {
          kind: "tableAuthored" as const,
          spatialFingerprint: postMoveFingerprint,
          tableAuthoredDecisions: [],
        },
      },
    };
    const tableMovementSession = createScenarioSession({
      battle: setup.session.battle,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [tableMovementDecision],
      },
      ambientIllumination: setup.session.battlefield.ambientIllumination,
      statBlockDamageNotation:
        setup.session.battlefield.statBlockDamageNotation,
      environment: setup.session.battlefield.environment,
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: [],
    });
    expect(Either.isRight(tableMovementSession)).toBe(true);
    if (Either.isLeft(tableMovementSession)) return;

    const malformedMovementCost = tableAuthoredSpatialDecision({
      decisionId: "malformed-movement-cost",
      question: tableMovementDecision.question,
      answer: {
        ...tableMovementDecision.answer,
        movementCostFeet: "5",
      },
    });
    expect(malformedMovementCost).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("finite non-negative movement cost"),
      },
    });
    const fractionalMovementCost = tableAuthoredSpatialDecision({
      decisionId: "fractional-movement-cost",
      question: tableMovementDecision.question,
      answer: {
        ...tableMovementDecision.answer,
        movementCostFeet: 2.5,
      },
    });
    expect(fractionalMovementCost).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("movement cost"),
      },
    });
    const malformedMovementThreat = tableAuthoredSpatialDecision({
      decisionId: "malformed-movement-threat",
      question: tableMovementDecision.question,
      answer: {
        ...tableMovementDecision.answer,
        provokedOpportunityAttacks: [
          {
            reactorId: sourceId,
            procedureRef: "movement-threat-procedure",
            selection: { procedureRef: "nested-selection" },
          },
        ],
      },
    });
    expect(malformedMovementThreat).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("malformed Opportunity Attack threat"),
      },
    });
    const blankThreatReactor = tableAuthoredSpatialDecision({
      decisionId: "blank-threat-reactor",
      question: tableMovementDecision.question,
      answer: {
        ...tableMovementDecision.answer,
        provokedOpportunityAttacks: [
          { reactorId: "", procedureRef: "movement-threat-procedure" },
        ],
      },
    });
    expect(blankThreatReactor).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("malformed Opportunity Attack threat"),
      },
    });
    const characterAttackProcedureRef = battleAttackProcedureExecutionRef(
      battleAttackExecutionScopeRef(
        battleId("mixed-threat-fields"),
        sourceId,
        battleExecutionScopeOrdinal(0),
      ),
      NonNegativeInteger(0),
    );
    const mixedThreatFields = tableAuthoredSpatialDecision({
      decisionId: "mixed-threat-fields",
      question: tableMovementDecision.question,
      answer: {
        ...tableMovementDecision.answer,
        provokedOpportunityAttacks: [
          {
            reactorId: sourceId,
            procedureRef: characterAttackProcedureRef,
            attackAbility: "strength",
            attackDamageType: "slashing",
            statBlockDamageNotation: "static",
          },
        ],
      },
    });
    expect(mixedThreatFields).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("malformed Opportunity Attack threat"),
      },
    });
    const malformedTraversalIdentity = tableAuthoredSpatialDecision({
      decisionId: "malformed-traversal-identity",
      question: tableMovementDecision.question,
      answer: {
        ...tableMovementDecision.answer,
        creatureSpaceTraversal: {
          kind: "fact",
          value: {
            kind: "occupiedCreatureSpaceTraversal",
            occupiedSpaces: [
              { occupantId: " ", positionId: "occupied-position" },
            ],
            destination: {
              kind: "unoccupiedSpace",
              positionId: "destination-position",
            },
          },
        },
      },
    });
    expect(malformedTraversalIdentity).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("invalid occupied-space"),
      },
    });
    const trimmedProcedureRef = tableAuthoredSpatialDecision({
      decisionId: "trimmed-procedure-ref",
      question: {
        kind: "attackTarget",
        actorId: sourceId,
        targetId,
        sourceProcedureRef: " attack-procedure ",
        targetConstraint: "meleeReach",
      },
      answer: {
        direction: geometryRelation.relation.direction,
        distanceFeet: geometryRelation.relation.distanceFeet,
        attackerCanSeeTarget: geometryRelation.relation.attackerCanSeeTarget,
        cover: "none",
        traversal: geometryRelation.relation.traversal,
      },
    });
    expect(trimmedProcedureRef).toMatchObject({ _tag: "Right" });
    if (Either.isRight(trimmedProcedureRef)) {
      expect(trimmedProcedureRef.right.question).toMatchObject({
        sourceProcedureRef: "attack-procedure",
      });
    }
    const whitespaceProcedureRef = tableAuthoredSpatialDecision({
      decisionId: "whitespace-procedure-ref",
      question: {
        kind: "attackTarget",
        actorId: sourceId,
        targetId,
        sourceProcedureRef: " \t\n ",
        targetConstraint: "meleeReach",
      },
      answer: {
        direction: geometryRelation.relation.direction,
        distanceFeet: geometryRelation.relation.distanceFeet,
        attackerCanSeeTarget: geometryRelation.relation.attackerCanSeeTarget,
        cover: "none",
        traversal: geometryRelation.relation.traversal,
      },
    });
    expect(whitespaceProcedureRef).toMatchObject({
      _tag: "Left",
      left: {
        tag: "invalid-spatial-decision",
        message: expect.stringContaining("non-empty sourceProcedureRef"),
      },
    });
    if (
      tableMovementSession.right.battlefield.spatial.kind === "tableAuthored"
    ) {
      const acceptedMovement =
        tableMovementSession.right.battlefield.spatial
          .tableAuthoredDecisions[0];
      expect(acceptedMovement).toBeDefined();
      if (acceptedMovement !== undefined) {
        expect(Object.isFrozen(acceptedMovement)).toBe(true);
        expect(Object.isFrozen(acceptedMovement.decision)).toBe(true);
        expect(Object.isFrozen(acceptedMovement.decision.question.route)).toBe(
          true,
        );
        expect(Object.isFrozen(acceptedMovement.decision.answer)).toBe(true);
        if (acceptedMovement.decision.answer.kind === "movementRoute") {
          expect(
            Object.isFrozen(
              acceptedMovement.decision.answer.provokedOpportunityAttacks,
            ),
          ).toBe(true);
          expect(
            Object.isFrozen(
              acceptedMovement.decision.answer.postMoveSpatialState,
            ),
          ).toBe(true);
          expect(
            Object.isFrozen(
              acceptedMovement.decision.answer.postMoveSpatialState
                .tableAuthoredDecisions,
            ),
          ).toBe(true);
        }
      }
    }

    const duplicateDecisionIdAcrossQuestions = createScenarioSession({
      ...tableSessionInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          tableRelationDecision,
          {
            ...tableRelationDecision,
            question: {
              kind: "relation" as const,
              sourceId: targetId,
              targetId: sourceId,
            },
          },
        ],
      },
    });
    expect(duplicateDecisionIdAcrossQuestions).toMatchObject({
      _tag: "Left",
      left: {
        issues: [
          {
            tag: "duplicate-spatial-decision",
            decisionId: "table-relation",
            message: expect.stringContaining("reused"),
          },
        ],
      },
    });
    const duplicateNestedDecisionId = createScenarioSession({
      ...tableSessionInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          tableRelationDecision,
          {
            ...tableMovementDecision,
            decisionId: "table-movement-with-nested-id-reuse",
            answer: {
              ...tableMovementDecision.answer,
              postMoveSpatialState: {
                ...tableMovementDecision.answer.postMoveSpatialState,
                tableAuthoredDecisions: [tableRelationDecision],
              },
            },
          },
        ],
      },
    });
    expect(duplicateNestedDecisionId).toMatchObject({
      _tag: "Left",
      left: {
        issues: [
          {
            tag: "duplicate-spatial-decision",
            decisionId: "table-relation",
            message: expect.stringContaining("reused"),
          },
        ],
      },
    });

    const unknownNestedPostMoveTarget = createScenarioSession({
      battle: setup.session.battle,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          {
            ...tableMovementDecision,
            decisionId: "table-movement-unknown-post-move-target",
            answer: {
              ...tableMovementDecision.answer,
              postMoveSpatialState: {
                ...tableMovementDecision.answer.postMoveSpatialState,
                tableAuthoredDecisions: [
                  {
                    ...tableRelationDecision,
                    decisionId: "nested-unknown-target",
                    question: {
                      ...tableRelationDecision.question,
                      targetId: combatantId("missing-post-move-target"),
                    },
                  },
                ],
              },
            },
          },
        ],
      },
      ambientIllumination: setup.session.battlefield.ambientIllumination,
      statBlockDamageNotation:
        setup.session.battlefield.statBlockDamageNotation,
      environment: setup.session.battlefield.environment,
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: [],
    });
    expect(unknownNestedPostMoveTarget).toMatchObject({
      _tag: "Left",
      left: {
        issues: [
          {
            tag: "invalid-spatial-decision",
            decisionId: "table-movement-unknown-post-move-target",
            message: expect.stringContaining("missing-post-move-target"),
          },
        ],
      },
    });

    const lineageConflictSession = {
      ...tableMovementSession.right,
      lineage: {
        ...tableMovementSession.right.lineage,
        battleRuntimeSessionIdentity: `${tableMovementSession.right.lineage.battleRuntimeSessionIdentity}:foreign`,
      },
    } as ScenarioSession;
    const lineageConflictMovementPlan = planScenarioMovement({
      session: lineageConflictSession,
      subject: {
        tag: "runtimeCommand",
        actorId: sourceId,
        command: "move",
      },
      route: tableRoute,
      speedKind: "walk",
      fills: [],
    });
    expect(lineageConflictMovementPlan).toMatchObject({
      _tag: "Left",
      left: {
        tag: "spatial-decision-lineage-conflict",
        decisionId: "table-movement",
        question: { kind: "movementRoute", moverId: sourceId },
        message: expect.stringContaining(
          "different ScenarioSession/BattleRuntime lineage",
        ),
      },
    });

    const tableMovementPlan = planScenarioMovement({
      session: tableMovementSession.right,
      subject: {
        tag: "runtimeCommand",
        actorId: sourceId,
        command: "move",
      },
      route: tableRoute,
      speedKind: "walk",
      fills: [],
    });
    expect(tableMovementPlan).toMatchObject({
      _tag: "Right",
      right: {
        fills: [{ kind: "movement", value: { movementCostFeet: 5 } }],
        session: {
          movementResolution: { kind: "tableAuthoredPending" },
        },
      },
    });
    if (Either.isLeft(tableMovementPlan)) return;
    const resolvedTableMovement = resolveBattleRuntimeSubject({
      session: tableMovementPlan.right.session.battle,
      subject: tableMovementPlan.right.subject,
      fills: tableMovementPlan.right.fills,
    });
    expect(resolvedTableMovement.tag).toBe("resolved");
    if (resolvedTableMovement.tag !== "resolved") return;
    const committedTableMovement = scenarioSessionWithBattleResult(
      tableMovementPlan.right.session,
      resolvedTableMovement.session,
      resolvedTableMovement.objectDamages,
      resolvedTableMovement.movements,
    );
    expect(committedTableMovement).toMatchObject({
      _tag: "Right",
      right: {
        movementResolution: { kind: "idle" },
        battlefield: {
          spatial: {
            kind: "tableAuthored",
            spatialFingerprint: postMoveFingerprint,
          },
        },
      },
    });

    const mixedGeometrySpatial = {
      kind: "geometryDerived" as const,
      arena: {
        cells: [
          { x: 0, y: 0, terrain: "ordinary" as const },
          { x: 1, y: 0, terrain: "ordinary" as const },
        ],
        boundaries: [],
      },
      placements: [
        { tokenId: sourceId, coordinate: { x: 0, y: 0 } },
        { tokenId: targetId, coordinate: { x: 1, y: 0 } },
      ],
      spatialDecisions: [tableRelationDecision],
    } as ScenarioSpatialSetupInput;
    const mixedGeometry = createScenarioSession({
      ...tableSessionInput,
      spatial: mixedGeometrySpatial,
    });
    expect(mixedGeometry).toMatchObject({
      _tag: "Left",
      left: {
        issues: [
          {
            tag: "contradictory-spatial-decision",
            decisionId: "table-relation",
            message: expect.stringContaining("geometry-derived"),
          },
        ],
      },
    });
  }, 120_000);

  test("crosses dead and Incapacitated creature spaces without ending there", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;

    const moverId = combatantId("goblin-warrior");
    const occupantId = combatantId("skeleton");
    const occupant = setup.session.battle.state.combatants.get(occupantId);
    expect(occupant).toBeDefined();
    if (occupant === undefined) return;
    const movementSubject = {
      tag: "runtimeCommand" as const,
      actorId: moverId,
      command: "move" as const,
    };
    const scenarioWithOccupant = (
      battle: typeof setup.session.battle,
      allies: boolean = false,
    ) =>
      createScenarioSession({
        battle,
        spatial: {
          kind: "geometryDerived",
          arena: {
            cells: [0, 1, 2].map((x) => ({
              x,
              y: 0,
              terrain: "ordinary" as const,
            })),
            boundaries: [],
          },
          placements: [
            { tokenId: moverId, coordinate: { x: 0, y: 0 } },
            { tokenId: occupantId, coordinate: { x: 1, y: 0 } },
          ],
          spatialDecisions: [],
        },
        ambientIllumination: "brightLight",
        statBlockDamageNotation: "rolled",
        environment: { overhead: { kind: "open" }, barrierHeights: [] },
        initialRangedAttackEnemyRelationships: [],
        movementAllyRelationships: allies
          ? [{ moverId, allyId: occupantId }]
          : [],
        opportunityAttackEnemyRelationships: [],
        objects: [],
      });
    const plan = (session: typeof setup.session) =>
      planScenarioMovement({
        session,
        subject: movementSubject,
        route: [
          { x: 1, y: 0 },
          { x: 2, y: 0 },
        ],
        speedKind: "walk",
        fills: [],
      });

    const liveScenario = scenarioWithOccupant(setup.session.battle);
    expect(Either.isRight(liveScenario)).toBe(true);
    if (Either.isLeft(liveScenario)) return;
    expect(plan(liveScenario.right)).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("skeleton") },
    });

    const incapacitatedBattle = battleRuntimeSessionWithState(
      setup.session.battle,
      {
        ...setup.session.battle.state,
        combatants: new Map(setup.session.battle.state.combatants).set(
          occupantId,
          {
            ...occupant,
            conditions: applyCondition(occupant.conditions, "incapacitated"),
          },
        ),
      },
    );
    const incapacitatedScenario = scenarioWithOccupant(incapacitatedBattle);
    expect(Either.isRight(incapacitatedScenario)).toBe(true);
    if (Either.isLeft(incapacitatedScenario)) return;
    const incapacitatedPlan = plan(incapacitatedScenario.right);
    expect(incapacitatedPlan).toMatchObject({
      _tag: "Right",
      right: {
        fills: [
          {
            kind: "movement",
            value: {
              movementCostFeet: 15,
              creatureSpaceTraversal: {
                occupiedSpaces: [{ occupantId: "skeleton" }],
                destination: { kind: "unoccupiedSpace" },
              },
            },
          },
        ],
      },
    });
    if (Either.isRight(incapacitatedPlan)) {
      expect(
        resolveBattleRuntimeSubject({
          session: incapacitatedPlan.right.session.battle,
          subject: incapacitatedPlan.right.subject,
          fills: incapacitatedPlan.right.fills,
        }),
      ).toMatchObject({
        tag: "resolved",
        movements: [
          {
            movementCostFeet: 15,
            creatureSpaceTraversal: {
              occupiedSpaces: [{ occupantId: "skeleton" }],
            },
          },
        ],
      });
    }
    expect(
      planScenarioMovement({
        session: incapacitatedScenario.right,
        subject: movementSubject,
        route: [{ x: 1, y: 0 }],
        speedKind: "walk",
        fills: [],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("cannot willingly end") },
    });

    const deadBattle = battleRuntimeSessionWithState(setup.session.battle, {
      ...setup.session.battle.state,
      combatants: new Map(setup.session.battle.state.combatants).set(
        occupantId,
        { ...occupant, hp: Hp(0) },
      ),
    });
    const deadScenario = scenarioWithOccupant(deadBattle);
    expect(Either.isRight(deadScenario)).toBe(true);
    if (Either.isLeft(deadScenario)) return;
    expect(plan(deadScenario.right)).toMatchObject({
      _tag: "Right",
      right: {
        fills: [
          {
            kind: "movement",
            value: {
              movementCostFeet: 10,
            },
          },
        ],
      },
    });
    expect(
      plan(
        scenarioWithOccupant(
          battleRuntimeSessionWithState(setup.session.battle, {
            ...setup.session.battle.state,
            combatants: new Map(setup.session.battle.state.combatants).set(
              occupantId,
              { ...occupant, size: "tiny" },
            ),
          }),
        ).pipe(Either.getOrThrow),
      ),
    ).toMatchObject({
      _tag: "Right",
      right: { fills: [{ value: { movementCostFeet: 10 } }] },
    });
    expect(
      plan(
        scenarioWithOccupant(setup.session.battle, true).pipe(
          Either.getOrThrow,
        ),
      ),
    ).toMatchObject({
      _tag: "Right",
      right: { fills: [{ value: { movementCostFeet: 10 } }] },
    });
    const deadAndIncapacitated = battleRuntimeSessionWithState(
      setup.session.battle,
      {
        ...setup.session.battle.state,
        combatants: new Map(setup.session.battle.state.combatants).set(
          occupantId,
          {
            ...occupant,
            hp: Hp(0),
            conditions: applyCondition(occupant.conditions, "incapacitated"),
          },
        ),
      },
    );
    expect(
      plan(scenarioWithOccupant(deadAndIncapacitated).pipe(Either.getOrThrow)),
    ).toMatchObject({
      _tag: "Right",
      right: { fills: [{ value: { movementCostFeet: 10 } }] },
    });
    expect(
      planScenarioMovement({
        session: deadScenario.right,
        subject: movementSubject,
        route: [{ x: 1, y: 0 }],
        speedKind: "walk",
        fills: [],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("corpse") },
    });
  }, 120_000);

  test("derives an ordinary Opportunity Attack threat when a visible enemy leaves reach", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;
    const moverId = combatantId("goblin-warrior");
    const reactorId = combatantId("skeleton");
    const scenarioInput = {
      battle: setup.session.battle,
      spatial: {
        kind: "geometryDerived" as const,
        arena: {
          cells: [-1, 0, 1].map((x) => ({
            x,
            y: 0,
            terrain: "ordinary" as const,
          })),
          boundaries: [],
        },
        placements: [
          { tokenId: moverId, coordinate: { x: 0, y: 0 } },
          { tokenId: reactorId, coordinate: { x: 1, y: 0 } },
        ],
        spatialDecisions: [],
      },
      ambientIllumination: "brightLight",
      statBlockDamageNotation: "rolled",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [{ reactorId, moverId }],
      objects: [],
    } as const;
    const scenario = createScenarioSession(scenarioInput);
    expect(Either.isRight(scenario)).toBe(true);
    if (Either.isLeft(scenario)) return;
    const planned = planScenarioMovement({
      session: scenario.right,
      subject: { tag: "runtimeCommand", actorId: moverId, command: "move" },
      route: [{ x: -1, y: 0 }],
      speedKind: "walk",
      fills: [],
    });
    const expectedThreats = scenarioOpportunityAttackExecutionCandidates({
      session: scenario.right,
      reactorId,
      moverId,
    }).map(({ reactorId: candidateReactorId, selection }) => ({
      reactorId: candidateReactorId,
      ...selection,
    }));
    expect(expectedThreats).toHaveLength(2);
    const staticScenario = createScenarioSession({
      ...scenarioInput,
      statBlockDamageNotation: "static",
    });
    expect(Either.isRight(staticScenario)).toBe(true);
    if (Either.isRight(staticScenario)) {
      const staticThreats = scenarioOpportunityAttackExecutionCandidates({
        session: staticScenario.right,
        reactorId,
        moverId,
      });
      const staticStatBlockThreats = staticThreats.filter(
        ({ selection }) => selection.attackAbility === undefined,
      );
      expect(staticStatBlockThreats).not.toEqual([]);
      expect(
        staticStatBlockThreats.every(
          ({ selection }) => selection.statBlockDamageNotation === "static",
        ),
      ).toBe(true);
      const staticPlan = planScenarioMovement({
        session: staticScenario.right,
        subject: { tag: "runtimeCommand", actorId: moverId, command: "move" },
        route: [{ x: -1, y: 0 }],
        speedKind: "walk",
        fills: [],
      });
      expect(Either.isRight(staticPlan)).toBe(true);
      if (Either.isRight(staticPlan)) {
        const staticResolution = resolveBattleRuntimeSubject({
          session: staticPlan.right.session.battle,
          subject: staticPlan.right.subject,
          fills: staticPlan.right.fills,
        });
        expect(staticResolution.snapshot.pendingInterrupt?.choices).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: "opportunityAttack",
              subject: expect.objectContaining({
                statBlockDamageNotation: "static",
              }),
            }),
          ]),
        );
      }
    }
    expect(planned).toMatchObject({
      _tag: "Right",
      right: {
        fills: [
          {
            kind: "movement",
            value: {
              provokedOpportunityAttacks: expectedThreats,
            },
          },
        ],
      },
    });
    if (Either.isLeft(planned)) return;
    const resolution = resolveBattleRuntimeSubject({
      session: planned.right.session.battle,
      subject: planned.right.subject,
      fills: planned.right.fills,
    });
    expect(resolution).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingInterrupt: {
          trigger: "opportunityAttack",
        },
      },
    });
    expect(resolution.snapshot.pendingInterrupt?.choices).toHaveLength(
      expectedThreats.length,
    );
    expect(
      resolution.snapshot.pendingInterrupt?.choices.map(
        ({ reactorId: choiceReactorId, kind }) => ({
          reactorId: choiceReactorId,
          kind,
        }),
      ),
    ).toEqual(
      expectedThreats.map(({ reactorId: expectedReactorId }) => ({
        reactorId: expectedReactorId,
        kind: "opportunityAttack",
      })),
    );
  }, 120_000);

  test("reports every missing tactical placement at composition", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;

    const result = createScenarioSession({
      battle: setup.session.battle,
      spatial: {
        kind: "geometryDerived",
        arena: {
          cells: [
            { x: 0, y: 0, terrain: "ordinary" },
            { x: 1, y: 0, terrain: "ordinary" },
          ],
          boundaries: [],
        },
        placements: [],
        spatialDecisions: [],
      },
      ambientIllumination: "brightLight",
      statBlockDamageNotation: "rolled",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: [],
    });
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.issues).toEqual([
      expect.objectContaining({
        tag: "missing-placement",
        tokenId: "goblin-warrior",
      }),
      expect.objectContaining({
        tag: "missing-placement",
        tokenId: "skeleton",
      }),
    ]);
  }, 120_000);

  test("accumulates independent arena, object, and placement issues", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;
    const collidingObjectId = battleObjectId("goblin-warrior");
    const object = {
      objectId: collidingObjectId,
      armorClass: armorClass(15),
      damageDisposition: { kind: "hitPoints" as const, hitPoints: Hp(5) },
      traversal: "blocked" as const,
      sight: "open" as const,
      interveningCover: "half" as const,
    };

    const result = createScenarioSession({
      battle: setup.session.battle,
      spatial: {
        kind: "geometryDerived",
        arena: {
          cells: [
            { x: 0, y: 0, terrain: "ordinary" },
            { x: 0, y: 0, terrain: "ordinary" },
          ],
          boundaries: [],
        },
        placements: [
          {
            tokenId: setup.session.battle.state.activeCombatantId,
            coordinate: { x: Number.NaN, y: 0 },
          },
        ],
        spatialDecisions: [],
      },
      ambientIllumination: "brightLight",
      statBlockDamageNotation: "rolled",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: [object, object],
    });
    expect(Either.isLeft(result)).toBe(true);
    if (Either.isRight(result)) return;
    expect(result.left.issues.map(({ tag }) => tag)).toEqual([
      "arena-definition",
      "combatant-object-id-collision",
      "duplicate-object-id",
      "combatant-object-id-collision",
      "placement",
    ]);
  }, 120_000);

  test("projects object obstruction and attack facts from one scenario session", async () => {
    const setup = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );
    expect(setup.tag).toBe("ready");
    if (setup.tag !== "ready") return;
    const objectId = battleObjectId("synthetic-intervening-object");
    const composed = createScenarioSession({
      battle: setup.session.battle,
      spatial: {
        kind: "geometryDerived",
        arena: {
          cells: [0, 1, 2].map((x) => ({
            x,
            y: 0,
            terrain: "ordinary" as const,
          })),
          boundaries: [],
        },
        placements: [
          {
            tokenId: combatantId("goblin-warrior"),
            coordinate: { x: 0, y: 0 },
          },
          { tokenId: objectId, coordinate: { x: 1, y: 0 } },
          { tokenId: combatantId("skeleton"), coordinate: { x: 2, y: 0 } },
        ],
        spatialDecisions: [],
      },
      ambientIllumination: "brightLight",
      statBlockDamageNotation: "rolled",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [
        {
          attackerId: combatantId("goblin-warrior"),
          enemyId: combatantId("skeleton"),
        },
      ],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: [
        {
          objectId,
          armorClass: armorClass(17),
          damageDisposition: {
            kind: "hitPointsWithDamageThreshold",
            hitPoints: Hp(24),
            damageThreshold: damageAmount(6),
          },
          traversal: "blocked",
          sight: "blocked",
          interveningCover: "three-quarters",
        },
      ],
    });
    expect(Either.isRight(composed)).toBe(true);
    if (Either.isLeft(composed)) return;

    expect(
      scenarioRelation({
        session: composed.right,
        sourceId: combatantId("goblin-warrior"),
        targetId: combatantId("skeleton"),
      }),
    ).toMatchObject({
      tag: "relation",
      relation: {
        attackerCanSeeTarget: false,
        cover: "threeQuarters",
        traversal: "blocked",
      },
    });

    const attack = discoverBattleActs(composed.right.battle).find(
      ({ subject }) => subject.tag === "action" && subject.action === "attack",
    );
    expect(attack).toBeDefined();
    if (attack === undefined) return;
    const scenarioActs = scenarioBattleActs(composed.right);
    expect(scenarioActs).not.toEqual([]);
    const rawReadyAct = discoverBattleActs(composed.right.battle).find(
      ({ subject }) => subject.tag === "action" && subject.action === "ready",
    );
    const rawReadyHole = rawReadyAct?.initialHoles.find(
      (hole) => hole.kind === "readyDeclaration",
    );
    const rawStaticResponse = rawReadyHole?.responseChoices.find(
      (response) =>
        response.kind === "attack" &&
        response.selection.attackAbility === undefined &&
        response.selection.statBlockDamageNotation === "static" &&
        rawReadyHole.responseChoices.some(
          (candidate) =>
            candidate.kind === "attack" &&
            candidate.selection.attackAbility === undefined &&
            candidate.selection.procedureRef ===
              response.selection.procedureRef &&
            candidate.selection.statBlockDamageNotation === undefined,
        ),
    );
    const scenarioReadyAct = scenarioActs.find(
      ({ subject }) => subject.tag === "action" && subject.action === "ready",
    );
    const scenarioReadyHole = scenarioReadyAct?.initialHoles.find(
      (hole) => hole.kind === "readyDeclaration",
    );
    expect(rawStaticResponse).toBeDefined();
    expect(
      scenarioReadyHole?.responseChoices.some(
        (response) =>
          response.kind === "attack" &&
          response.selection.attackAbility === undefined &&
          response.selection.procedureRef ===
            rawStaticResponse?.selection.procedureRef &&
          response.selection.statBlockDamageNotation === "static",
      ),
    ).toBe(false);
    if (
      rawStaticResponse !== undefined &&
      scenarioReadyAct?.subject.tag === "action" &&
      scenarioReadyAct.subject.action === "ready" &&
      scenarioReadyHole !== undefined
    ) {
      const projectedReadyFills = scenarioBattleFills(
        composed.right,
        scenarioReadyAct.subject,
        [
          {
            kind: "readyDeclaration",
            holeId: scenarioReadyHole.holeId,
            value: {
              trigger: readyTriggerDescription("a target enters reach"),
              response: rawStaticResponse,
            },
          },
        ],
      );
      expect(projectedReadyFills).toEqual([
        expect.objectContaining({
          value: expect.objectContaining({
            response: expect.objectContaining({
              kind: "attack",
              selection: expect.not.objectContaining({
                statBlockDamageNotation: "static",
              }),
            }),
          }),
        }),
      ]);
      expect(
        resolveBattleRuntimeSubject({
          session: composed.right.battle,
          subject: scenarioReadyAct.subject,
          fills: projectedReadyFills,
        }).tag,
      ).toBe("resolved");
    }
    if (
      attack.subject.tag === "action" &&
      attack.subject.action === "attack" &&
      !("attackAbility" in attack.subject)
    ) {
      expect(
        scenarioActs.some(
          ({ subject }) =>
            subject.tag === "action" &&
            subject.action === "attack" &&
            subject.procedureRef === attack.subject.procedureRef &&
            "statBlockDamageNotation" in subject &&
            subject.statBlockDamageNotation === "static",
        ),
      ).toBe(false);
      expect(
        discoverBattleActs(composed.right.battle).some(
          ({ subject }) =>
            subject.tag === "action" &&
            subject.action === "attack" &&
            subject.procedureRef === attack.subject.procedureRef &&
            subject.statBlockDamageNotation === "static",
        ),
      ).toBe(true);
      expect(
        scenarioBattleSubject(composed.right, {
          ...attack.subject,
          statBlockDamageNotation: "static",
        }),
      ).not.toHaveProperty("statBlockDamageNotation");
    }
    const frontier = resolveBattleRuntimeSubject({
      session: composed.right.battle,
      subject: attack.subject,
      fills: [],
    });
    expect(frontier.tag).toBe("needsHoles");
    if (frontier.tag !== "needsHoles") return;
    const targetHole = frontier.holes.find(
      (hole) =>
        hole.kind === "targetChoice" &&
        hole.attack?.acceptsObjectTarget === true,
    );
    expect(targetHole?.kind).toBe("targetChoice");
    if (targetHole?.kind !== "targetChoice") return;
    const projected = scenarioObjectAttackFills({
      session: composed.right,
      subject: attack.subject,
      fills: [
        {
          kind: "objectTargetChoice",
          holeId: targetHole.holeId,
          value: objectId,
          spatialFacts: [],
        },
      ],
    });
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;
    expect(projected.right).toEqual([
      {
        kind: "objectTargetChoice",
        holeId: targetHole.holeId,
        value: objectId,
        spatialFacts: [
          {
            kind: "attackObjectTarget",
            actorId: "goblin-warrior",
            objectId,
            range: { kind: "meleeReach" },
            attackerCanSeeObject: true,
            cover: "none",
            armorClass: 17,
            damageDisposition: {
              kind: "hitPointsWithDamageThreshold",
              hitPoints: 24,
              damageThreshold: 6,
            },
          },
        ],
      },
    ]);
  }, 120_000);

  test("retains the generated battle's tactical and interactive setup", async () => {
    const scenarioDirectory = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    );
    const characters = await evaluateScenarioCharacters(
      resolve(scenarioDirectory, "generated-battle-example.characters.ts"),
    );
    expect(characters.tag).toBe("ready");
    if (characters.tag !== "ready") return;
    const result = await evaluateScenarioSetup(
      resolve(scenarioDirectory, "generated-battle-example.setup.ts"),
      characters.characterSheets,
    );
    expect(result).toMatchObject({
      tag: "ready",
      observation: {
        setup: "ready",
        combatantCount: 10,
        arenaCellCount: 120,
        battlefieldObjectIds: ["beacon-crystal"],
      },
    });
    if (result.tag !== "ready") return;
    expect(result.session.battle.state.combatants.size).toBe(10);
    const resultSpatial = result.session.battlefield.spatial;
    expect(resultSpatial.kind).toBe("geometryDerived");
    if (resultSpatial.kind !== "geometryDerived") return;
    expect(result.session.battlefield).toMatchObject({
      spatial: {
        kind: "geometryDerived",
        arena: { cellSizeFeet: 5 },
        space: { revision: 11 },
      },
      ambientIllumination: "brightLight",
      statBlockDamageNotation: "rolled",
      environment: {
        overhead: { kind: "open" },
        barrierHeights: expect.any(Array),
      },
      objects: [
        {
          objectId: "beacon-crystal",
          armorClass: 15,
          damageDisposition: { kind: "hitPoints", hitPoints: 30 },
          traversal: "blocked",
          sight: "open",
          interveningCover: "half",
        },
      ],
    });
    expect(resultSpatial.arena.cells).toHaveLength(120);
    expect(resultSpatial.arena.boundaries).toHaveLength(28);
    expect(resultSpatial.space.placements).toHaveLength(11);
    expect(result.session.battlefield.environment.barrierHeights).toHaveLength(
      20,
    );
    expect(
      result.session.battlefield.environment.barrierHeights.every(
        ({ heightFeet }) => heightFeet === 15,
      ),
    ).toBe(true);

    const crystalId = result.session.battlefield.objects[0]!.objectId;
    expect(
      scenarioRelation({
        session: result.session,
        sourceId: combatantId("beacon-warden-ember"),
        targetId: crystalId,
      }),
    ).toMatchObject({
      tag: "relation",
      relation: {
        source: "beacon-warden-ember",
        target: "beacon-crystal",
        distanceFeet: 5,
        attackerCanSeeTarget: true,
        cover: "none",
        traversal: "open",
      },
    });
    expect(
      scenarioRelation({
        session: result.session,
        sourceId: combatantId("missing-scout"),
        targetId: crystalId,
      }),
    ).toEqual({
      tag: "unknown-token",
      tokenId: "missing-scout",
      message: "Scenario token missing-scout has no current placement.",
    });

    const magicMissileAct = discoverBattleActs(result.session.battle).find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.procedure ===
        "repeatedDamageAllocation",
    );
    expect(magicMissileAct).toBeDefined();
    if (magicMissileAct === undefined) return;
    const magicMissileFrontier = resolveBattleRuntimeSubject({
      session: result.session.battle,
      subject: magicMissileAct.subject,
      fills: [],
    });
    expect(magicMissileFrontier.tag).toBe("needsHoles");
    if (magicMissileFrontier.tag !== "needsHoles") return;
    const allocationHole = magicMissileFrontier.holes.find(
      (hole) => hole.kind === "spellTargetAllocation",
    );
    expect(allocationHole?.kind).toBe("spellTargetAllocation");
    if (allocationHole?.kind !== "spellTargetAllocation") return;
    expect(allocationHole.spellTargetSpatialFactRequest).toMatchObject({
      casterId: "beacon-warden-ember",
      rangeFeet: 120,
      visibility: "requiresSight",
    });

    const forgedOccludedTarget = scenarioCreatureSpellTargetFills({
      session: result.session,
      subject: magicMissileAct.subject,
      fills: [
        {
          kind: "spellTargetAllocation",
          holeId: allocationHole.holeId,
          value: {
            allocations: [{ targetId: combatantId("wolf-3b"), count: 3 }],
          },
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: combatantId("beacon-warden-ember"),
              targetId: combatantId("wolf-3b"),
              sourceProcedureRef:
                allocationHole.spellTargetSpatialFactRequest.sourceProcedureRef,
            },
          ],
        },
      ],
    });
    expect(forgedOccludedTarget).toMatchObject({
      _tag: "Right",
      right: [
        {
          kind: "spellTargetAllocation",
          spatialFacts: [],
        },
      ],
    });
    if (Either.isLeft(forgedOccludedTarget)) return;
    expect(
      resolveBattleRuntimeSubject({
        session: result.session.battle,
        subject: magicMissileAct.subject,
        fills: forgedOccludedTarget.right,
      }).tag,
    ).toBe("invalid");

    const projectedVisibleTarget = scenarioCreatureSpellTargetFills({
      session: result.session,
      subject: magicMissileAct.subject,
      fills: [
        {
          kind: "spellTargetAllocation",
          holeId: allocationHole.holeId,
          value: {
            allocations: [
              { targetId: combatantId("beacon-warden-aegis"), count: 3 },
            ],
          },
          spatialFacts: [],
        },
      ],
    });
    expect(projectedVisibleTarget).toMatchObject({
      _tag: "Right",
      right: [
        {
          kind: "spellTargetAllocation",
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: "beacon-warden-ember",
              targetId: "beacon-warden-aegis",
            },
          ],
        },
      ],
    });
    if (Either.isLeft(projectedVisibleTarget)) return;

    const genericTargetActs = discoverBattleActs(result.session.battle);
    const scalarTargetAct = genericTargetActs.find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.procedure ===
        "persistentArmorEffect",
    );
    expect(scalarTargetAct).toBeDefined();
    if (scalarTargetAct === undefined) return;
    const scalarFrontier = resolveBattleRuntimeSubject({
      session: result.session.battle,
      subject: scalarTargetAct.subject,
      fills: [],
    });
    expect(scalarFrontier.tag).toBe("needsHoles");
    if (scalarFrontier.tag !== "needsHoles") return;
    const scalarTargetHole = scalarFrontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    expect(scalarTargetHole?.kind).toBe("targetChoice");
    if (scalarTargetHole?.kind !== "targetChoice") return;
    expect(scalarTargetHole.spellTargetSpatialFactRequest).toMatchObject({
      casterId: "beacon-warden-ember",
      visibility: "notSpecifiedByProcedure",
    });

    const pointOriginAct = genericTargetActs.find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.procedure ===
        "greaseGroundHazard",
    );
    expect(pointOriginAct).toBeDefined();
    if (pointOriginAct === undefined) return;
    const pointOriginFrontier = resolveBattleRuntimeSubject({
      session: result.session.battle,
      subject: pointOriginAct.subject,
      fills: [],
    });
    expect(pointOriginFrontier.tag).toBe("needsHoles");
    if (pointOriginFrontier.tag !== "needsHoles") return;
    expect(
      pointOriginFrontier.holes.some(
        (hole) => "spellTargetSpatialFactRequest" in hole,
      ),
    ).toBe(false);

    const ordinarySpellAttackAct = genericTargetActs.find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.procedure ===
        "spellAttackDamage",
    );
    expect(ordinarySpellAttackAct).toBeDefined();
    if (ordinarySpellAttackAct === undefined) return;
    const ordinarySpellAttackFrontier = resolveBattleRuntimeSubject({
      session: result.session.battle,
      subject: ordinarySpellAttackAct.subject,
      fills: [],
    });
    expect(ordinarySpellAttackFrontier.tag).toBe("needsHoles");
    if (ordinarySpellAttackFrontier.tag !== "needsHoles") return;
    const ordinaryTargetHole = ordinarySpellAttackFrontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    expect(ordinaryTargetHole?.kind).toBe("targetChoice");
    if (
      ordinaryTargetHole?.kind !== "targetChoice" ||
      ordinaryTargetHole.spellTargetSpatialFactRequest === undefined
    ) {
      return;
    }
    const ordinaryRequest = ordinaryTargetHole.spellTargetSpatialFactRequest;
    const tableWithoutSpellDecision = createScenarioSession({
      battle: result.session.battle,
      spatial: { kind: "tableAuthored", spatialDecisions: [] },
      ambientIllumination: result.session.battlefield.ambientIllumination,
      statBlockDamageNotation:
        result.session.battlefield.statBlockDamageNotation,
      environment: {
        ...result.session.battlefield.environment,
        barrierHeights: [],
      },
      initialRangedAttackEnemyRelationships:
        result.session.battlefield.initialRangedAttackEnemyRelationships,
      movementAllyRelationships:
        result.session.battlefield.movementAllyRelationships,
      opportunityAttackEnemyRelationships:
        result.session.battlefield.opportunityAttackEnemyRelationships,
      objects: result.session.battlefield.objects,
    });
    expect(tableWithoutSpellDecision).toMatchObject({ _tag: "Right" });
    if (Either.isRight(tableWithoutSpellDecision)) {
      const missingSpellDecision = scenarioCreatureSpellTargetFills({
        session: tableWithoutSpellDecision.right,
        subject: ordinarySpellAttackAct.subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: ordinaryTargetHole.holeId,
            value: ordinaryTargetHole.choices[0]!,
            spatialFacts: [],
          },
        ],
      });
      expect(missingSpellDecision).toMatchObject({
        _tag: "Left",
        left: {
          tag: "spell-target-projection",
          message: expect.stringContaining("requires a Table-authored"),
        },
      });
    }
    const forgedOrdinaryTarget = scenarioCreatureSpellTargetFills({
      session: result.session,
      subject: ordinarySpellAttackAct.subject,
      fills: [
        {
          kind: "targetChoice",
          holeId: ordinaryTargetHole.holeId,
          value: combatantId("wolf-3b"),
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: ordinaryRequest.casterId,
              targetId: combatantId("wolf-3b"),
              sourceProcedureRef: ordinaryRequest.sourceProcedureRef,
            },
          ],
        },
      ],
    });
    expect(forgedOrdinaryTarget).toMatchObject({
      _tag: "Right",
      right: [
        {
          kind: "targetChoice",
          spatialFacts: [],
        },
      ],
    });
    if (Either.isLeft(forgedOrdinaryTarget)) return;

    const visibleOrdinaryTarget = ordinaryTargetHole.choices.find(
      (targetId) => {
        const relation = scenarioRelation({
          session: result.session,
          sourceId: ordinaryRequest.casterId,
          targetId,
        });
        return (
          relation.tag === "relation" &&
          relation.relation.cover !== "total" &&
          Number(relation.relation.distanceFeet) <=
            Number(ordinaryRequest.rangeFeet)
        );
      },
    );
    expect(visibleOrdinaryTarget).toBeDefined();
    if (visibleOrdinaryTarget === undefined) return;
    const visibleRelation = scenarioRelation({
      session: result.session,
      sourceId: ordinaryRequest.casterId,
      targetId: visibleOrdinaryTarget,
    });
    expect(visibleRelation.tag).toBe("relation");
    if (visibleRelation.tag !== "relation") return;
    const staleSpellDecisionSession = createScenarioSession({
      battle: result.session.battle,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          {
            decisionId: "stale-spell-projection",
            question: {
              kind: "spellTarget" as const,
              casterId: ordinaryRequest.casterId,
              targetId: visibleOrdinaryTarget,
              sourceProcedureRef: ordinaryRequest.sourceProcedureRef,
            },
            answer: {
              direction: visibleRelation.relation.direction,
              distanceFeet: visibleRelation.relation.distanceFeet,
              attackerCanSeeTarget:
                visibleRelation.relation.attackerCanSeeTarget,
              cover: visibleRelation.relation.cover,
              traversal: visibleRelation.relation.traversal,
            },
          },
        ],
      },
      ambientIllumination: result.session.battlefield.ambientIllumination,
      statBlockDamageNotation:
        result.session.battlefield.statBlockDamageNotation,
      environment: {
        ...result.session.battlefield.environment,
        barrierHeights: [],
      },
      initialRangedAttackEnemyRelationships:
        result.session.battlefield.initialRangedAttackEnemyRelationships,
      movementAllyRelationships:
        result.session.battlefield.movementAllyRelationships,
      opportunityAttackEnemyRelationships:
        result.session.battlefield.opportunityAttackEnemyRelationships,
      objects: result.session.battlefield.objects,
    });
    expect(staleSpellDecisionSession).toMatchObject({ _tag: "Right" });
    if (Either.isRight(staleSpellDecisionSession)) {
      const spatial = staleSpellDecisionSession.right.battlefield.spatial;
      expect(spatial.kind).toBe("tableAuthored");
      if (spatial.kind === "tableAuthored") {
        const staleDecision = spatial.tableAuthoredDecisions[0];
        expect(staleDecision).toBeDefined();
        if (staleDecision !== undefined) {
          const staleSession = {
            ...staleSpellDecisionSession.right,
            battlefield: {
              ...staleSpellDecisionSession.right.battlefield,
              spatial: {
                ...spatial,
                tableAuthoredDecisions: [
                  {
                    ...staleDecision,
                    lineage: {
                      ...staleDecision.lineage,
                      spatialFingerprint: scenarioTableSpatialFingerprint(
                        "stale-spell-spatial-revision",
                      ),
                    },
                  },
                ],
              },
            },
          } as ScenarioSession;
          const staleSpellProjection = scenarioCreatureSpellTargetFills({
            session: staleSession,
            subject: ordinarySpellAttackAct.subject,
            fills: [
              {
                kind: "targetChoice",
                holeId: ordinaryTargetHole.holeId,
                value: visibleOrdinaryTarget,
                spatialFacts: [],
              },
            ],
          });
          expect(staleSpellProjection).toMatchObject({
            _tag: "Left",
            left: {
              tag: "spell-target-projection",
              message: expect.stringContaining("stale"),
            },
          });
        }
      }
    }
    const mismatchedSpellDecision = createScenarioSession({
      battle: result.session.battle,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          {
            decisionId: "mismatched-spell-procedure",
            question: {
              kind: "spellTarget" as const,
              casterId: ordinaryRequest.casterId,
              targetId: visibleOrdinaryTarget,
              sourceProcedureRef:
                `${String(ordinaryRequest.sourceProcedureRef)}:wrong` as typeof ordinaryRequest.sourceProcedureRef,
            },
            answer: {
              direction: visibleRelation.relation.direction,
              distanceFeet: visibleRelation.relation.distanceFeet,
              attackerCanSeeTarget:
                visibleRelation.relation.attackerCanSeeTarget,
              cover: visibleRelation.relation.cover,
              traversal: visibleRelation.relation.traversal,
            },
          },
        ],
      },
      ambientIllumination: result.session.battlefield.ambientIllumination,
      statBlockDamageNotation:
        result.session.battlefield.statBlockDamageNotation,
      environment: {
        ...result.session.battlefield.environment,
        barrierHeights: [],
      },
      initialRangedAttackEnemyRelationships:
        result.session.battlefield.initialRangedAttackEnemyRelationships,
      movementAllyRelationships:
        result.session.battlefield.movementAllyRelationships,
      opportunityAttackEnemyRelationships:
        result.session.battlefield.opportunityAttackEnemyRelationships,
      objects: result.session.battlefield.objects,
    });
    expect(mismatchedSpellDecision).toMatchObject({ _tag: "Right" });
    if (Either.isRight(mismatchedSpellDecision)) {
      const mismatchedProjection = scenarioCreatureSpellTargetFills({
        session: mismatchedSpellDecision.right,
        subject: ordinarySpellAttackAct.subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: ordinaryTargetHole.holeId,
            value: visibleOrdinaryTarget,
            spatialFacts: [],
          },
        ],
      });
      expect(mismatchedProjection).toMatchObject({
        _tag: "Left",
        left: {
          tag: "spell-target-projection",
          message: expect.stringContaining("requires a Table-authored"),
        },
      });
    }
    expect(
      scenarioCreatureSpellTargetFills({
        session: result.session,
        subject: ordinarySpellAttackAct.subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: ordinaryTargetHole.holeId,
            value: visibleOrdinaryTarget,
            spatialFacts: [],
          },
        ],
      }).pipe(Either.map((fills) => fills[0])),
    ).toMatchObject({
      _tag: "Right",
      right: {
        kind: "targetChoice",
        spatialFacts: [
          {
            kind: "spellTarget",
            casterId: ordinaryRequest.casterId,
            targetId: visibleOrdinaryTarget,
          },
        ],
      },
    });
    const damaged = scenarioSessionWithBattleResult(
      result.session,
      result.session.battle,
      [
        {
          kind: "hitPoints",
          objectId: crystalId,
          damageType: "force",
          rolledDamage: damageAmount(8),
          effectiveDamage: damageAmount(8),
          priorHitPoints: Hp(30),
          nextHitPoints: Hp(22),
          destroyed: false,
        },
        {
          kind: "hitPoints",
          objectId: crystalId,
          damageType: "force",
          rolledDamage: damageAmount(22),
          effectiveDamage: damageAmount(22),
          priorHitPoints: Hp(22),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
    );
    expect(Either.isRight(damaged)).toBe(true);
    if (Either.isRight(damaged)) {
      expect(damaged.right.battlefield.objects[0]?.damageDisposition).toEqual({
        kind: "hitPoints",
        hitPoints: 0,
      });
      expect(result.session.battlefield.objects[0]?.damageDisposition).toEqual({
        kind: "hitPoints",
        hitPoints: 30,
      });
      expect(
        scenarioRelation({
          session: damaged.right,
          sourceId: combatantId("beacon-warden-ember"),
          targetId: crystalId,
        }),
      ).toMatchObject({
        tag: "relation",
        relation: {
          distanceFeet: 5,
          attackerCanSeeTarget: true,
          cover: "none",
        },
      });
    }

    const staleDamage = scenarioSessionWithBattleResult(
      result.session,
      result.session.battle,
      [
        {
          kind: "hitPoints",
          objectId: crystalId,
          damageType: "force",
          rolledDamage: damageAmount(1),
          effectiveDamage: damageAmount(1),
          priorHitPoints: Hp(22),
          nextHitPoints: Hp(21),
          destroyed: false,
        },
      ],
    );
    expect(staleDamage).toMatchObject({
      _tag: "Left",
      left: { tag: "object-damage-state-conflict" },
    });
    expect(
      resultSpatial.arena.cells
        .filter(({ terrain }) => terrain === "difficult")
        .map(({ coordinate }) => `${coordinate.x},${coordinate.y}`),
    ).toEqual(["8,3", "8,4", "13,3", "13,4"]);
    expect(
      Object.fromEntries(
        resultSpatial.space.placements.map(({ token, coordinate }) => [
          token,
          `${coordinate.x},${coordinate.y}`,
        ]),
      ),
    ).toEqual({
      "beacon-crystal": "11,3",
      "beacon-warden-aegis": "12,2",
      "beacon-warden-arc": "12,5",
      "beacon-warden-ember": "10,2",
      "beacon-warden-veil": "10,5",
      "goblin-warrior-2c": "2,3",
      "goblin-warrior-2d": "2,4",
      "goblin-warrior-5c": "5,3",
      "goblin-warrior-5d": "5,4",
      "wolf-3b": "3,2",
      "wolf-3e": "3,5",
    });
    const twoThreatMoverId = combatantId("beacon-warden-ember");
    const twoThreatReactorIds = [
      combatantId("beacon-warden-veil"),
      combatantId("beacon-warden-aegis"),
    ] as const;
    const reservedPlacements = new Map([
      [String(twoThreatMoverId), { x: 1, y: 1 }],
      [String(twoThreatReactorIds[0]), { x: 1, y: 0 }],
      [String(twoThreatReactorIds[1]), { x: 2, y: 1 }],
    ]);
    const remainingCoordinates = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 3, y: 0 },
      { x: 0, y: 1 },
      { x: 3, y: 1 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ];
    let remainingCoordinateIndex = 0;
    const twoThreatPlacements = [
      ...result.session.battle.state.combatants.keys(),
    ].map((tokenId) => {
      const reserved = reservedPlacements.get(String(tokenId));
      if (reserved !== undefined) return { tokenId, coordinate: reserved };
      const coordinate = remainingCoordinates[remainingCoordinateIndex];
      remainingCoordinateIndex += 1;
      if (coordinate === undefined) {
        throw new Error("Expected a tactical placement for every combatant.");
      }
      return { tokenId, coordinate };
    });
    const twoThreatArena = {
      cells: [0, 1, 2].flatMap((y) =>
        [0, 1, 2, 3].map((x) => ({
          x,
          y,
          terrain: "ordinary" as const,
        })),
      ),
      boundaries: [],
    };
    const twoThreatInput = {
      battle: result.session.battle,
      spatial: {
        kind: "geometryDerived" as const,
        arena: twoThreatArena,
        placements: twoThreatPlacements,
        spatialDecisions: [],
      },
      ambientIllumination: "brightLight" as const,
      statBlockDamageNotation: "rolled",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: twoThreatReactorIds.map(
        (reactorId) => ({ reactorId, moverId: twoThreatMoverId }),
      ),
      objects: [],
    } as const;
    const twoThreatScenario = createScenarioSession(twoThreatInput);
    expect(Either.isRight(twoThreatScenario)).toBe(true);
    if (Either.isLeft(twoThreatScenario)) return;
    const twoThreatPlan = planScenarioMovement({
      session: twoThreatScenario.right,
      subject: {
        tag: "runtimeCommand",
        actorId: twoThreatMoverId,
        command: "move",
      },
      route: [{ x: 0, y: 2 }],
      speedKind: "walk",
      fills: [],
    });
    expect(Either.isRight(twoThreatPlan)).toBe(true);
    const expectedThreats = twoThreatReactorIds.flatMap((reactorId) =>
      scenarioOpportunityAttackExecutionCandidates({
        session: twoThreatScenario.right,
        reactorId,
        moverId: twoThreatMoverId,
      }).map(({ reactorId: candidateReactorId, selection }) => ({
        reactorId: candidateReactorId,
        ...selection,
      })),
    );
    if (Either.isRight(twoThreatPlan)) {
      const movementFill = twoThreatPlan.right.fills[0];
      expect(movementFill?.kind).toBe("movement");
      if (movementFill?.kind !== "movement") return;
      expect(expectedThreats).toHaveLength(4);
      expect(movementFill.value.provokedOpportunityAttacks).toEqual(
        expectedThreats,
      );
    }
    const knownThreat = expectedThreats[0];
    expect(knownThreat).toBeDefined();
    if (knownThreat === undefined) return;
    const unknownTableMovementThreat = createScenarioSession({
      ...twoThreatInput,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          {
            decisionId: "table-movement-unknown-threat-reactor",
            question: {
              kind: "movementRoute" as const,
              moverId: twoThreatMoverId,
              route: [{ x: 0, y: 2 }],
              speedKind: "walk" as const,
            },
            answer: {
              kind: "movementRoute" as const,
              movementCostFeet: movementFeet(5),
              provokedOpportunityAttacks: [
                {
                  ...knownThreat,
                  reactorId: combatantId("missing-threat-reactor"),
                },
              ],
              creatureSpaceTraversal: { kind: "notRequired" as const },
              postMoveSpatialState: {
                kind: "tableAuthored" as const,
                spatialFingerprint: scenarioTableSpatialFingerprint({
                  kind: "unknown-threat-post-move",
                }),
                tableAuthoredDecisions: [],
              },
            },
          },
        ],
      },
      opportunityAttackEnemyRelationships: [],
    });
    expect(unknownTableMovementThreat).toMatchObject({
      _tag: "Left",
      left: {
        issues: [
          {
            tag: "invalid-spatial-decision",
            decisionId: "table-movement-unknown-threat-reactor",
            message: expect.stringContaining("missing-threat-reactor"),
          },
        ],
      },
    });
    const invalidRelationshipCases = [
      {
        expectedTag: "unknown-opportunity-attack-enemy-relationship-combatant",
        relationships: [
          {
            reactorId: combatantId("unknown-reactor"),
            moverId: twoThreatMoverId,
          },
        ],
      },
      {
        expectedTag: "self-opportunity-attack-enemy-relationship",
        relationships: [
          { reactorId: twoThreatMoverId, moverId: twoThreatMoverId },
        ],
      },
      {
        expectedTag: "duplicate-opportunity-attack-enemy-relationship",
        relationships: [
          { reactorId: twoThreatReactorIds[0], moverId: twoThreatMoverId },
          { reactorId: twoThreatReactorIds[0], moverId: twoThreatMoverId },
        ],
      },
    ] as const;
    for (const relationshipCase of invalidRelationshipCases) {
      expect(
        createScenarioSession({
          ...twoThreatInput,
          opportunityAttackEnemyRelationships: relationshipCase.relationships,
        }),
      ).toMatchObject({
        _tag: "Left",
        left: {
          issues: [{ tag: relationshipCase.expectedTag }],
        },
      });
    }
    const reverseRelationshipScenario = createScenarioSession({
      ...twoThreatInput,
      opportunityAttackEnemyRelationships: [
        {
          reactorId: twoThreatMoverId,
          moverId: twoThreatReactorIds[0],
        },
      ],
    });
    expect(Either.isRight(reverseRelationshipScenario)).toBe(true);
    if (Either.isRight(reverseRelationshipScenario)) {
      const reversePlan = planScenarioMovement({
        session: reverseRelationshipScenario.right,
        subject: {
          tag: "runtimeCommand",
          actorId: twoThreatMoverId,
          command: "move",
        },
        route: [{ x: 0, y: 2 }],
        speedKind: "walk",
        fills: [],
      });
      expect(reversePlan).toMatchObject({
        _tag: "Right",
        right: {
          fills: [{ value: { provokedOpportunityAttacks: [] } }],
        },
      });
    }
    const blockedSightScenario = createScenarioSession({
      ...twoThreatInput,
      spatial: {
        ...twoThreatInput.spatial,
        arena: {
          ...twoThreatArena,
          boundaries: [
            {
              between: [
                { x: 1, y: 0 },
                { x: 1, y: 1 },
              ] as const,
              traversal: "open" as const,
              sight: "blocked" as const,
              cover: { kind: "intervening" as const, degree: "total" as const },
            },
          ],
        },
      },
      opportunityAttackEnemyRelationships: [
        { reactorId: twoThreatReactorIds[0], moverId: twoThreatMoverId },
      ],
    });
    expect(Either.isRight(blockedSightScenario)).toBe(true);
    if (Either.isRight(blockedSightScenario)) {
      expect(
        planScenarioMovement({
          session: blockedSightScenario.right,
          subject: {
            tag: "runtimeCommand",
            actorId: twoThreatMoverId,
            command: "move",
          },
          route: [{ x: 0, y: 2 }],
          speedKind: "walk",
          fills: [],
        }),
      ).toMatchObject({
        _tag: "Right",
        right: { fills: [{ value: { provokedOpportunityAttacks: [] } }] },
      });
    }
    const dimScenario = createScenarioSession({
      ...twoThreatInput,
      ambientIllumination: "dimLight",
      statBlockDamageNotation: "rolled",
    });
    expect(Either.isRight(dimScenario)).toBe(true);
    if (Either.isRight(dimScenario)) {
      expect(
        planScenarioMovement({
          session: dimScenario.right,
          subject: {
            tag: "runtimeCommand",
            actorId: twoThreatMoverId,
            command: "move",
          },
          route: [{ x: 0, y: 2 }],
          speedKind: "walk",
          fills: [],
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { message: expect.stringContaining("bright-light") },
      });
    }
    const largeReactor = result.session.battle.state.combatants.get(
      twoThreatReactorIds[0],
    );
    expect(largeReactor).toBeDefined();
    if (largeReactor === undefined) return;
    const largeScenario = createScenarioSession({
      ...twoThreatInput,
      battle: battleRuntimeSessionWithState(result.session.battle, {
        ...result.session.battle.state,
        combatants: new Map(result.session.battle.state.combatants).set(
          twoThreatReactorIds[0],
          { ...largeReactor, size: "large" },
        ),
      }),
      opportunityAttackEnemyRelationships: [
        { reactorId: twoThreatReactorIds[0], moverId: twoThreatMoverId },
      ],
    });
    expect(Either.isRight(largeScenario)).toBe(true);
    if (Either.isRight(largeScenario)) {
      expect(
        planScenarioMovement({
          session: largeScenario.right,
          subject: {
            tag: "runtimeCommand",
            actorId: twoThreatMoverId,
            command: "move",
          },
          route: [{ x: 0, y: 2 }],
          speedKind: "walk",
          fills: [],
        }),
      ).toMatchObject({
        _tag: "Left",
        left: { message: expect.stringContaining("Small or Medium") },
      });
    }
    expect(
      planScenarioMovement({
        session: twoThreatScenario.right,
        subject: {
          tag: "runtimeCommand",
          actorId: twoThreatMoverId,
          command: "move",
        },
        route: [
          { x: 0, y: 2 },
          { x: 1, y: 1 },
          { x: 0, y: 2 },
        ],
        speedKind: "walk",
        fills: [],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("more than once") },
    });
    const moveSubject = {
      tag: "runtimeCommand" as const,
      actorId: combatantId("beacon-warden-ember"),
      command: "move" as const,
    };
    const plannedMove = planScenarioMovement({
      session: result.session,
      subject: moveSubject,
      route: [{ x: 9, y: 2 }],
      speedKind: "walk",
      fills: [],
    });
    expect(Either.isRight(plannedMove)).toBe(true);
    if (Either.isRight(plannedMove)) {
      expect(plannedMove.right.fills[0]).toMatchObject({
        kind: "movement",
        value: { movementCostFeet: 5 },
      });
      const interrupted = scenarioSessionWithBattleResult(
        plannedMove.right.session,
        plannedMove.right.session.battle,
      );
      expect(interrupted).toMatchObject({
        _tag: "Right",
        right: {
          movementResolution: { kind: "geometryDerivedPending" },
          battlefield: {
            spatial: { kind: "geometryDerived", space: { revision: 11 } },
          },
        },
      });
      if (Either.isRight(interrupted)) {
        const resumed = continueScenarioMovement({
          session: interrupted.right,
          fills: [
            {
              kind: "rolledDice",
              holeId: "battle:spike-growth-movement-damage",
              value: [{ results: [DieRollResult(3)] }],
            },
          ],
        });
        expect(resumed).toMatchObject({
          _tag: "Right",
          right: {
            subject: moveSubject,
            fills: [
              { kind: "movement", value: { movementCostFeet: 5 } },
              {
                kind: "rolledDice",
                holeId: "battle:spike-growth-movement-damage",
              },
            ],
            session: {
              movementResolution: { kind: "geometryDerivedPending" },
              battlefield: {
                spatial: { kind: "geometryDerived", space: { revision: 11 } },
              },
            },
          },
        });
      }
      const battleMove = resolveBattleRuntimeSubject({
        session: plannedMove.right.session.battle,
        subject: moveSubject,
        fills: plannedMove.right.fills,
      });
      expect(battleMove).toMatchObject({
        tag: "resolved",
        movements: [{ moverId: "beacon-warden-ember", movementCostFeet: 5 }],
      });
      if (battleMove.tag === "resolved") {
        const moved = scenarioSessionWithBattleResult(
          plannedMove.right.session,
          battleMove.session,
          battleMove.objectDamages,
          battleMove.movements,
        );
        expect(Either.isRight(moved)).toBe(true);
        if (Either.isRight(moved)) {
          expect(
            scenarioRelation({
              session: moved.right,
              sourceId: moveSubject.actorId,
              targetId: crystalId,
            }),
          ).toMatchObject({
            tag: "relation",
            relation: { distanceFeet: 10 },
          });
          expect(resultSpatial.space.revision).toBe(11);
          const movedSpatial = moved.right.battlefield.spatial;
          expect(movedSpatial.kind).toBe("geometryDerived");
          if (movedSpatial.kind !== "geometryDerived") return;
          expect(movedSpatial.space.revision).toBe(12);
        }
      }
    }
    const blockedByCrystal = planScenarioMovement({
      session: result.session,
      subject: moveSubject,
      route: [{ x: 11, y: 3 }],
      speedKind: "walk",
      fills: [],
    });
    expect(blockedByCrystal).toMatchObject({
      _tag: "Left",
      left: {
        tag: "scenario-movement-rejected",
        message: expect.stringContaining("beacon-crystal"),
      },
    });
    const difficultTerrain = planScenarioMovement({
      session: result.session,
      subject: moveSubject,
      route: [
        { x: 9, y: 2 },
        { x: 8, y: 3 },
      ],
      speedKind: "walk",
      fills: [],
    });
    expect(difficultTerrain).toMatchObject({
      _tag: "Right",
      right: {
        fills: [{ kind: "movement", value: { movementCostFeet: 15 } }],
      },
    });
    const totalCoverBoundaries = resultSpatial.arena.boundaries.filter(
      ({ cover }) => cover.kind === "intervening" && cover.degree === "total",
    );
    const barricadeBoundaries = resultSpatial.arena.boundaries.filter(
      ({ cover }) =>
        cover.kind === "protected-occupant" && cover.degree === "half",
    );
    expect(totalCoverBoundaries).toHaveLength(20);
    expect(barricadeBoundaries).toHaveLength(8);
    expect(barricadeBoundaries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          between: [
            expect.objectContaining({ x: 7, y: 3 }),
            expect.objectContaining({ x: 8, y: 3 }),
          ],
          traversal: "open",
          sight: "open",
          cover: expect.objectContaining({
            kind: "protected-occupant",
            protectedCell: expect.objectContaining({ x: 8, y: 3 }),
          }),
        }),
        expect.objectContaining({
          between: [
            expect.objectContaining({ x: 13, y: 4 }),
            expect.objectContaining({ x: 14, y: 4 }),
          ],
          traversal: "open",
          sight: "open",
          cover: expect.objectContaining({
            kind: "protected-occupant",
            protectedCell: expect.objectContaining({ x: 13, y: 4 }),
          }),
        }),
      ]),
    );
    expect(totalCoverBoundaries).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          between: [
            expect.objectContaining({ x: 6, y: 3 }),
            expect.objectContaining({ x: 7, y: 3 }),
          ],
        }),
      ]),
    );
  }, 120_000);

  test("projects Table-authored attack, spell, and object decisions deterministically", async () => {
    const scenarioDirectory = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    );
    const characters = await evaluateScenarioCharacters(
      resolve(scenarioDirectory, "generated-battle-example.characters.ts"),
    );
    expect(characters.tag).toBe("ready");
    if (characters.tag !== "ready") return;
    const result = await evaluateScenarioSetup(
      resolve(scenarioDirectory, "generated-battle-example.setup.ts"),
      characters.characterSheets,
    );
    expect(result.tag).toBe("ready");
    if (result.tag !== "ready") return;
    const geometrySession = result.session;
    const crystalId = battleObjectId("beacon-crystal");
    const attackActs = discoverBattleActs(geometrySession.battle).filter(
      ({ subject }) => subject.tag === "action" && subject.action === "attack",
    );
    expect(attackActs).not.toEqual([]);
    const creatureAttack = attackActs
      .map((act) => {
        const frontier = resolveBattleRuntimeSubject({
          session: geometrySession.battle,
          subject: act.subject,
          fills: [],
        });
        if (frontier.tag !== "needsHoles") return undefined;
        const hole = frontier.holes.find(
          (candidate) =>
            candidate.kind === "targetChoice" &&
            candidate.attack !== undefined &&
            candidate.choices.some(
              (choice) => String(choice) === "beacon-warden-aegis",
            ),
        );
        return hole?.kind === "targetChoice" && hole.attack !== undefined
          ? { act, hole }
          : undefined;
      })
      .find((value) => value !== undefined);
    expect(creatureAttack).toBeDefined();
    if (creatureAttack === undefined) return;
    const attackTarget = combatantId("beacon-warden-aegis");
    expect(attackTarget).toBeDefined();
    if (attackTarget === undefined) return;
    const attackAnswer = scenarioRelation({
      session: geometrySession,
      sourceId: creatureAttack.hole.attack.actorId,
      targetId: attackTarget,
    });
    expect(attackAnswer.tag).toBe("relation");
    if (attackAnswer.tag !== "relation") return;
    const authoredAttackDistance = scenarioDistanceFeet(5);
    expect(Either.isRight(authoredAttackDistance)).toBe(true);
    if (Either.isLeft(authoredAttackDistance)) return;

    const objectAttack = attackActs
      .map((act) => {
        const frontier = resolveBattleRuntimeSubject({
          session: geometrySession.battle,
          subject: act.subject,
          fills: [],
        });
        if (frontier.tag !== "needsHoles") return undefined;
        const hole = frontier.holes.find(
          (candidate) =>
            candidate.kind === "targetChoice" &&
            candidate.attack?.acceptsObjectTarget === true,
        );
        return hole?.kind === "targetChoice" && hole.attack !== undefined
          ? { act, hole }
          : undefined;
      })
      .find((value) => value !== undefined);
    expect(objectAttack).toBeDefined();
    if (objectAttack === undefined) return;
    const objectAnswer = scenarioRelation({
      session: geometrySession,
      sourceId: objectAttack.hole.attack.actorId,
      targetId: crystalId,
    });
    expect(objectAnswer.tag).toBe("relation");
    if (objectAnswer.tag !== "relation") return;

    const ordinarySpellAttackAct = discoverBattleActs(
      geometrySession.battle,
    ).find(
      (act) =>
        battleActSpellPresentation(act)?.invocation.procedure ===
        "spellAttackDamage",
    );
    expect(ordinarySpellAttackAct).toBeDefined();
    if (ordinarySpellAttackAct === undefined) return;
    const ordinarySpellFrontier = resolveBattleRuntimeSubject({
      session: geometrySession.battle,
      subject: ordinarySpellAttackAct.subject,
      fills: [],
    });
    expect(ordinarySpellFrontier.tag).toBe("needsHoles");
    if (ordinarySpellFrontier.tag !== "needsHoles") return;
    const ordinarySpellHole = ordinarySpellFrontier.holes.find(
      (candidate) => candidate.kind === "targetChoice",
    );
    expect(ordinarySpellHole?.kind).toBe("targetChoice");
    if (
      ordinarySpellHole?.kind !== "targetChoice" ||
      ordinarySpellHole.spellTargetSpatialFactRequest === undefined
    ) {
      return;
    }
    const spellRequest = ordinarySpellHole.spellTargetSpatialFactRequest;
    const spellTarget = ordinarySpellHole.choices.find((candidate) => {
      const relation = scenarioRelation({
        session: geometrySession,
        sourceId: spellRequest.casterId,
        targetId: candidate,
      });
      return (
        relation.tag === "relation" &&
        relation.relation.cover !== "total" &&
        relation.relation.attackerCanSeeTarget &&
        Number(relation.relation.distanceFeet) <= Number(spellRequest.rangeFeet)
      );
    });
    expect(spellTarget).toBeDefined();
    if (spellTarget === undefined) return;
    const spellAnswer = scenarioRelation({
      session: geometrySession,
      sourceId: spellRequest.casterId,
      targetId: spellTarget,
    });
    expect(spellAnswer.tag).toBe("relation");
    if (spellAnswer.tag !== "relation") return;

    const grappleAct = discoverBattleActs(geometrySession.battle).find(
      ({ subject }) => subject.tag === "action" && subject.action === "grapple",
    );
    const shoveAct = discoverBattleActs(geometrySession.battle).find(
      ({ subject }) => subject.tag === "action" && subject.action === "shove",
    );
    expect(grappleAct).toBeDefined();
    expect(shoveAct).toBeDefined();
    if (grappleAct === undefined || shoveAct === undefined) return;
    if (grappleAct.subject.tag !== "action") return;
    const factSourceId = grappleAct.subject.actorId;
    const grappleFrontier = resolveBattleRuntimeSubject({
      session: geometrySession.battle,
      subject: grappleAct.subject,
      fills: [],
    });
    const shoveFrontier = resolveBattleRuntimeSubject({
      session: geometrySession.battle,
      subject: shoveAct.subject,
      fills: [],
    });
    expect(grappleFrontier.tag).toBe("needsHoles");
    expect(shoveFrontier.tag).toBe("needsHoles");
    if (
      grappleFrontier.tag !== "needsHoles" ||
      shoveFrontier.tag !== "needsHoles"
    )
      return;
    const closeTargetForFact = grappleFrontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    )?.choices[0];
    const shoveTargetForFact = shoveFrontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    )?.choices[0];
    expect(closeTargetForFact).toBeDefined();
    expect(shoveTargetForFact).toBeDefined();
    if (closeTargetForFact === undefined || shoveTargetForFact === undefined)
      return;
    const grappleRelation = {
      direction: "east" as const,
      distanceFeet: authoredAttackDistance.right,
      attackerCanSeeTarget: true,
      cover: "none" as const,
      traversal: "open" as const,
    };

    const decisions = [
      {
        decisionId: "table-attack-target",
        question: {
          kind: "attackTarget" as const,
          actorId: creatureAttack.hole.attack.actorId,
          targetId: attackTarget,
          sourceProcedureRef: creatureAttack.hole.attack.selection.procedureRef,
          targetConstraint: creatureAttack.hole.attack.targetConstraint.kind,
        },
        answer: {
          direction: attackAnswer.relation.direction,
          distanceFeet: authoredAttackDistance.right,
          attackerCanSeeTarget: attackAnswer.relation.attackerCanSeeTarget,
          cover: attackAnswer.relation.cover,
          traversal: attackAnswer.relation.traversal,
        },
      },
      {
        decisionId: "table-spell-target",
        question: {
          kind: "spellTarget" as const,
          casterId: spellRequest.casterId,
          targetId: spellTarget,
          sourceProcedureRef: spellRequest.sourceProcedureRef,
        },
        answer: {
          direction: spellAnswer.relation.direction,
          distanceFeet: spellAnswer.relation.distanceFeet,
          attackerCanSeeTarget: spellAnswer.relation.attackerCanSeeTarget,
          cover: spellAnswer.relation.cover,
          traversal: spellAnswer.relation.traversal,
        },
      },
      {
        decisionId: "table-object-target",
        question: {
          kind: "objectTarget" as const,
          actorId: objectAttack.hole.attack.actorId,
          objectId: crystalId,
          sourceProcedureRef: objectAttack.hole.attack.selection.procedureRef,
        },
        answer: {
          direction: objectAnswer.relation.direction,
          distanceFeet: objectAnswer.relation.distanceFeet,
          attackerCanSeeTarget: objectAnswer.relation.attackerCanSeeTarget,
          cover: objectAnswer.relation.cover,
          traversal: objectAnswer.relation.traversal,
        },
      },
      {
        decisionId: "table-grapple-target",
        question: {
          kind: "grappleTarget" as const,
          grapplerId: factSourceId,
          targetId: closeTargetForFact,
        },
        answer: {
          ...grappleRelation,
        },
      },
      {
        decisionId: "table-shove-target",
        question: {
          kind: "shoveTarget" as const,
          shoverId: factSourceId,
          targetId: shoveTargetForFact,
        },
        answer: {
          ...grappleRelation,
        },
      },
    ];
    const tableSession = createScenarioSession({
      battle: geometrySession.battle,
      spatial: { kind: "tableAuthored", spatialDecisions: decisions },
      ambientIllumination: geometrySession.battlefield.ambientIllumination,
      statBlockDamageNotation:
        geometrySession.battlefield.statBlockDamageNotation,
      environment: {
        overhead: geometrySession.battlefield.environment.overhead,
        barrierHeights: [],
      },
      initialRangedAttackEnemyRelationships:
        geometrySession.battlefield.initialRangedAttackEnemyRelationships,
      movementAllyRelationships:
        geometrySession.battlefield.movementAllyRelationships,
      opportunityAttackEnemyRelationships:
        geometrySession.battlefield.opportunityAttackEnemyRelationships,
      objects: geometrySession.battlefield.objects,
    });
    expect(Either.isRight(tableSession)).toBe(true);
    if (Either.isLeft(tableSession)) return;

    const tableGrappleFrontier = resolveBattleRuntimeSubject({
      session: tableSession.right.battle,
      subject: grappleAct.subject,
      fills: [],
    });
    const tableShoveFrontier = resolveBattleRuntimeSubject({
      session: tableSession.right.battle,
      subject: shoveAct.subject,
      fills: [],
    });
    expect(tableGrappleFrontier.tag).toBe("needsHoles");
    expect(tableShoveFrontier.tag).toBe("needsHoles");
    if (
      tableGrappleFrontier.tag !== "needsHoles" ||
      tableShoveFrontier.tag !== "needsHoles"
    )
      return;
    const grappleHole = tableGrappleFrontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    const shoveHole = tableShoveFrontier.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    expect(grappleHole?.kind).toBe("targetChoice");
    expect(shoveHole?.kind).toBe("targetChoice");
    if (
      grappleHole?.kind !== "targetChoice" ||
      shoveHole?.kind !== "targetChoice"
    )
      return;
    for (const [subject, hole, targetId, expectedKind] of [
      [
        grappleAct.subject,
        grappleHole,
        closeTargetForFact,
        "grappleTargetWithinReach",
      ],
      [
        shoveAct.subject,
        shoveHole,
        shoveTargetForFact,
        "shoveTargetWithinReach",
      ],
    ] as const) {
      const projectedSpatialFact = scenarioTableSpatialFactFills({
        session: tableSession.right,
        subject,
        fills: [
          {
            kind: "targetChoice" as const,
            holeId: hole.holeId,
            value: targetId,
            spatialFacts: [],
          },
        ],
      });
      expect(projectedSpatialFact).toMatchObject({
        _tag: "Right",
        right: [{ spatialFacts: [{ kind: expectedKind }] }],
      });
    }

    const attackFill = {
      kind: "targetChoice" as const,
      holeId: creatureAttack.hole.holeId,
      value: attackTarget,
      spatialFacts: [],
    };
    const projectedAttack = scenarioAttackTargetFills({
      session: tableSession.right,
      subject: creatureAttack.act.subject,
      fills: [attackFill],
    });
    expect(Either.isRight(projectedAttack)).toBe(true);
    if (Either.isLeft(projectedAttack)) return;
    expect(projectedAttack.right[0]).toMatchObject({
      spatialFacts: [
        expect.objectContaining({
          kind: expect.stringMatching(/^attackTargetIn/),
          targetId: attackTarget,
        }),
      ],
    });
    expect(
      scenarioAttackTargetFills({
        session: tableSession.right,
        subject: creatureAttack.act.subject,
        fills: [attackFill],
      }),
    ).toEqual(projectedAttack);

    const projectedSpell = scenarioCreatureSpellTargetFills({
      session: tableSession.right,
      subject: ordinarySpellAttackAct.subject,
      fills: [
        {
          kind: "targetChoice",
          holeId: ordinarySpellHole.holeId,
          value: spellTarget,
          spatialFacts: [],
        },
      ],
    });
    expect(projectedSpell).toMatchObject({
      _tag: "Right",
      right: [
        {
          spatialFacts: [
            {
              kind: "spellTarget",
              casterId: spellRequest.casterId,
              targetId: spellTarget,
              sourceProcedureRef: spellRequest.sourceProcedureRef,
            },
          ],
        },
      ],
    });
    if (Either.isLeft(projectedSpell)) return;

    const projectedObject = scenarioObjectAttackFills({
      session: tableSession.right,
      subject: objectAttack.act.subject,
      fills: [
        {
          kind: "objectTargetChoice",
          holeId: objectAttack.hole.holeId,
          value: crystalId,
          spatialFacts: [],
        },
      ],
    });
    expect(Either.isRight(projectedObject)).toBe(true);
    if (Either.isLeft(projectedObject)) return;
    expect(projectedObject.right[0]).toMatchObject({
      spatialFacts: [
        {
          kind: "attackObjectTarget",
          actorId: objectAttack.hole.attack.actorId,
          objectId: crystalId,
        },
      ],
    });

    const alternateAttack = attackActs.find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "attack" &&
        act.subject.procedureRef !==
          creatureAttack.hole.attack?.selection.procedureRef,
    );
    expect(alternateAttack).toBeDefined();
    if (alternateAttack === undefined) return;
    const mismatchedSession = createScenarioSession({
      battle: geometrySession.battle,
      spatial: {
        kind: "tableAuthored",
        spatialDecisions: [
          {
            ...decisions[0]!,
            question: {
              ...decisions[0]!.question,
              sourceProcedureRef: alternateAttack.subject.procedureRef,
            },
          },
        ],
      },
      ambientIllumination: geometrySession.battlefield.ambientIllumination,
      statBlockDamageNotation:
        geometrySession.battlefield.statBlockDamageNotation,
      environment: {
        overhead: geometrySession.battlefield.environment.overhead,
        barrierHeights: [],
      },
      initialRangedAttackEnemyRelationships: [],
      movementAllyRelationships: [],
      opportunityAttackEnemyRelationships: [],
      objects: geometrySession.battlefield.objects,
    });
    expect(Either.isRight(mismatchedSession)).toBe(true);
    if (Either.isLeft(mismatchedSession)) return;
    expect(
      scenarioAttackTargetFills({
        session: mismatchedSession.right,
        subject: creatureAttack.act.subject,
        fills: [attackFill],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { message: expect.stringContaining("requires") },
    });
  }, 120_000);

  test("retains the second generated battle with its authored Skeleton initiative and ammunition", async () => {
    const scenarioDirectory = resolve(
      repoRoot,
      "scripts/raw-swarm/sdk-player/scenarios",
    );
    const characters = await evaluateScenarioCharacters(
      resolve(scenarioDirectory, "generated-battle-002.characters.ts"),
    );
    expect(characters.tag).toBe("ready");
    if (characters.tag !== "ready") return;
    expect(characters.observation).toMatchObject({
      characters: [
        {
          magicInitiate: {
            cantrips: ["Chill Touch", "Shocking Grasp"],
            levelOneSpell: "Burning Hands",
            spellcastingAbility: "int",
          },
        },
        {
          magicInitiate: {
            cantrips: ["Ray of Frost", "Minor Illusion"],
            levelOneSpell: "Shield",
            spellcastingAbility: "int",
          },
        },
      ],
    });
    expect(
      characters.characterSheets.map(
        ({ build }) => build.equipment.startingEquipmentCurrencyRemainderCp,
      ),
    ).toEqual([1300, 1300]);

    const result = await evaluateScenarioSetup(
      resolve(scenarioDirectory, "generated-battle-002.setup.ts"),
      characters.characterSheets,
    );
    expect(result).toMatchObject({
      tag: "ready",
      observation: {
        scenarioId: "generated-battle-002",
        skeletonAmmunition: {
          ammunition: "arrow",
          quantityPerSkeleton: 20,
        },
        initiativeRolls: {
          skeletonGroup: { d20: 14, modifier: 3, total: 17 },
        },
      },
    });
    if (result.tag !== "ready") return;

    expect(result.session.battle.state.combatants.size).toBe(6);
    for (const skeletonId of [
      "arena-skeleton-1",
      "arena-skeleton-2",
      "arena-skeleton-3",
      "arena-skeleton-4",
    ]) {
      expect(
        result.session.battle.state.combatants.get(combatantId(skeletonId))
          ?.ammunitionStocks,
      ).toEqual([{ ammunition: "arrow", remaining: 20 }]);
      expect(
        result.session.battle.state.combatants.get(combatantId(skeletonId))
          ?.initiative,
      ).toBe(17);
    }
  }, 120_000);

  test("retains an authored setup obstruction", async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), "dnd-scenario-obstruction-"),
    );
    try {
      const setupPath = resolve(directory, "setup.ts");
      writeFileSync(
        setupPath,
        `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "The required character-build setup is not exposed.",
  observation: { missing: "character-build" },
});
`,
      );
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toEqual({
        tag: "obstructed",
        obstruction: "The required character-build setup is not exposed.",
        observation: { missing: "character-build" },
      });
      writeFileSync(
        setupPath,
        `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "The changed setup is unavailable.",
  observation: { missing: "changed-setup" },
});
`,
      );
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toEqual({
        tag: "obstructed",
        obstruction: "The changed setup is unavailable.",
        observation: { missing: "changed-setup" },
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("rejects a non-JSON setup observation", async () => {
    const directory = mkdtempSync(
      resolve(tmpdir(), "dnd-scenario-observation-"),
    );
    try {
      const setupPath = resolve(directory, "setup.ts");
      writeFileSync(
        setupPath,
        `export const setupScenario = () => ({
  kind: "obstructed",
  obstruction: "Unavailable.",
  observation: new Map([["not", "json"]]),
});
`,
      );
      await expect(evaluateScenarioSetup(setupPath, [])).resolves.toEqual({
        tag: "invalid",
        message: "Scenario setup observation must be JSON data.",
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("returns a typed setup failure for an unreadable source", async () => {
    const directory = mkdtempSync(resolve(tmpdir(), "dnd-missing-setup-"));
    try {
      await expect(
        evaluateScenarioSetup(resolve(directory, "missing.ts"), []),
      ).resolves.toMatchObject({
        tag: "invalid",
        message: expect.stringContaining("Scenario setup evaluation failed"),
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });
});
