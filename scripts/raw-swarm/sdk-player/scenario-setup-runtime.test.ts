import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";
import { Either } from "effect";
import {
  battleObjectId,
  combatantId,
  discoverBattleActs,
  resolveBattleRuntimeSubject,
} from "../../../packages/battle-runtime/src/index.ts";

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
} from "../../../packages/shared/src/types.ts";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "../../../packages/surface/src/surface/unit-catalog.ts";
import { repoRoot } from "../transcript.ts";
import { evaluateScenarioCharacters } from "./scenario-character-runtime.ts";
import { evaluateScenarioSetup } from "./scenario-setup-runtime.ts";
import {
  createScenarioSession,
  continueScenarioMovement,
  scenarioRelation,
  scenarioEnemyWithinFiveFeetCanSeeAttacker,
  scenarioObjectAttackFills,
  planScenarioMovement,
  scenarioSessionWithBattleResult,
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

      await expect(
        evaluateScenarioSetup(setupPath, characters.characterSheets),
      ).resolves.toMatchObject({
        tag: "ready",
        observation: { combatants: 2 },
      });
    } finally {
      rmSync(directory, { recursive: true });
    }
  });

  test("evaluates an adjacent ordinary TypeScript setup", async () => {
    const result = await evaluateScenarioSetup(
      resolve(
        repoRoot,
        `scripts/raw-swarm/sdk-player/scenarios/${TRACER_SCENARIO_ID}.setup.ts`,
      ),
      [],
    );

    expect(result).toMatchObject({
      tag: "ready",
      observation: {
        combatants: ["goblin-warrior", "skeleton"],
        initiatives: [15, 10],
      },
    });
    if (result.tag === "ready") {
      expect(
        scenarioEnemyWithinFiveFeetCanSeeAttacker(
          result.session,
          combatantId("goblin-warrior"),
        ),
      ).toBe(true);
    }
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
      arena: {
        cells: [
          { x: 0, y: 0, terrain: "ordinary" },
          { x: 1, y: 0, terrain: "ordinary" },
        ],
        boundaries: [],
      },
      placements: [],
      ambientIllumination: "brightLight",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [],
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
      ambientIllumination: "brightLight",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [],
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
      ambientIllumination: "brightLight",
      environment: { overhead: { kind: "open" }, barrierHeights: [] },
      initialRangedAttackEnemyRelationships: [
        {
          attackerId: combatantId("goblin-warrior"),
          enemyId: combatantId("skeleton"),
        },
      ],
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
    expect(result.session.battlefield).toMatchObject({
      arena: { cellSizeFeet: 5 },
      space: { revision: 11 },
      ambientIllumination: "brightLight",
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
    expect(result.session.battlefield.arena.cells).toHaveLength(120);
    expect(result.session.battlefield.arena.boundaries).toHaveLength(28);
    expect(result.session.battlefield.space.placements).toHaveLength(11);
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
      result.session.battlefield.arena.cells
        .filter(({ terrain }) => terrain === "difficult")
        .map(({ coordinate }) => `${coordinate.x},${coordinate.y}`),
    ).toEqual(["8,3", "8,4", "13,3", "13,4"]);
    expect(
      Object.fromEntries(
        result.session.battlefield.space.placements.map(
          ({ token, coordinate }) => [token, `${coordinate.x},${coordinate.y}`],
        ),
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
      provokedOpportunityAttacks: [],
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
          movementResolution: { kind: "pending" },
          battlefield: { space: { revision: 11 } },
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
              movementResolution: { kind: "pending" },
              battlefield: { space: { revision: 11 } },
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
          expect(result.session.battlefield.space.revision).toBe(11);
          expect(moved.right.battlefield.space.revision).toBe(12);
        }
      }
    }
    const blockedByCrystal = planScenarioMovement({
      session: result.session,
      subject: moveSubject,
      route: [{ x: 11, y: 3 }],
      speedKind: "walk",
      provokedOpportunityAttacks: [],
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
      provokedOpportunityAttacks: [],
      fills: [],
    });
    expect(difficultTerrain).toMatchObject({
      _tag: "Right",
      right: {
        fills: [{ kind: "movement", value: { movementCostFeet: 15 } }],
      },
    });
    const totalCoverBoundaries =
      result.session.battlefield.arena.boundaries.filter(
        ({ cover }) => cover.kind === "intervening" && cover.degree === "total",
      );
    const barricadeBoundaries =
      result.session.battlefield.arena.boundaries.filter(
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
});
