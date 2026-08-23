// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
import fc from "fast-check";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  difficultyClass,
  movementFeet,
} from "@dnd/shared/types";
import { combatantId } from "./identity.ts";
import type { BattleFill, BattleHole } from "./battle-state-execution.ts";
import {
  resolveBattleRuntimeSubjectWithTableD20TestCircumstances,
  endBattleRuntimeTurnWithTableD20TestCircumstances,
} from "./battle-session-execution.ts";
import {
  attackRollFill,
  battleId,
  characterSeed,
  fighterAttackSubject,
  fighterId,
  goblinId,
  startBattleSessionRight,
  statBlockCreatureInit,
  targetFill,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionFollows } from "./battle-runtime-context.ts";
import { attackRollHasAdvantageSource } from "./battle-reducer/attack-roll.ts";
import {
  D20_TEST_KINDS,
  admitTableD20TestCircumstanceDecisions,
  battleD20TestCircumstanceRequests,
  battleHolesWithTableD20TestCircumstances,
  combineD20TestRollMode,
  proneAttackRollModeSources,
  mechanicalD20TestRollModeSources,
  effectiveD20TestRollMode,
  d20TestResolutionId,
  type BattleD20TestCircumstanceRequest,
  type TableD20TestCircumstanceDecision,
  type TableD20TestCircumstanceSource,
} from "./d20-test-circumstance.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x279 } as const;
const resolutionId = d20TestResolutionId("synthetic-resolution");
const firstTargetId = combatantId("synthetic-first-target");
const secondTargetId = combatantId("synthetic-second-target");

// These focused fixtures contain only the fields read by the circumstance
// projector; complete procedure payloads are covered by their owning tests.
function syntheticBattleHole(value: unknown): BattleHole {
  return value as BattleHole;
}

function syntheticBattleFill(value: unknown): BattleFill {
  return value as BattleFill;
}

function requestFor(
  testKind: BattleD20TestCircumstanceRequest["testKind"],
  resolvedFills: readonly BattleFill[] = [],
): BattleD20TestCircumstanceRequest {
  const holeKind =
    testKind === "attackRoll"
      ? "attackRoll"
      : testKind === "abilityCheck"
        ? "abilityCheck"
        : "deathSavingThrow";
  // This synthetic fixture exercises only the common D20-hole protocol fields;
  // unrelated attack presentation payload is intentionally outside this unit.
  const hole = {
    kind: holeKind,
    holeId: holeId(`synthetic-${holeKind}`),
    holeInstanceKey: holeInstanceKey(`synthetic-${holeKind}-instance`),
    label: `Synthetic ${holeKind}`,
    ...(holeKind === "abilityCheck"
      ? {
          ability: "dex" as const,
          skill: "acrobatics" as const,
          dc: difficultyClass(12),
        }
      : {}),
    ...(holeKind === "deathSavingThrow" ? { combatantId: firstTargetId } : {}),
  } as BattleHole;
  const request = battleD20TestCircumstanceRequests({
    resolutionId,
    holes: [hole],
    resolvedFills,
  })[0];
  if (request === undefined) {
    throw new Error(`Synthetic ${testKind} hole did not produce a request.`);
  }
  return request;
}

function decision(
  request: BattleD20TestCircumstanceRequest,
  source: TableD20TestCircumstanceSource,
  testKind = request.testKind,
): TableD20TestCircumstanceDecision {
  return { requestRef: request.requestRef, testKind, source };
}

describe("Table-authored per-test D20 circumstances", () => {
  test("matches the QNT integer-distance Prone threshold and cancellation", () => {
    const atFiveFeet = proneAttackRollModeSources(movementFeet(5));
    const atSixFeet = proneAttackRollModeSources(movementFeet(6));

    expect(atFiveFeet).toEqual({ advantage: true, disadvantage: false });
    expect(atSixFeet).toEqual({ advantage: false, disadvantage: true });
    expect(combineD20TestRollMode(atFiveFeet, "disadvantage")).toBe("normal");
    expect(combineD20TestRollMode(atSixFeet, "advantage")).toBe("normal");
  });

  test("requests every RAW D20 Test kind", () => {
    expect(
      D20_TEST_KINDS.map((testKind) => requestFor(testKind).testKind),
    ).toEqual(D20_TEST_KINDS);
  });

  test("distinguishes repeated uses of the same D20 hole in one resolution", () => {
    const first = requestFor("attackRoll");
    const second = requestFor("attackRoll", [
      {
        kind: "attackRoll",
        holeId: holeId("synthetic-attackRoll"),
        value: { total: 12, naturalD20: DieRollResult(8) },
      },
    ]);

    expect(first.testOrdinal).toBe(0);
    expect(second.testOrdinal).toBe(1);
    expect(second.requestRef).not.toBe(first.requestRef);
  });

  test("requests each target of a multi-target saving throw independently", () => {
    // The cast keeps this test focused on target projection; the omitted
    // procedure payload is not read by the circumstance boundary.
    const hole = syntheticBattleHole({
      kind: "savingThrowOutcome",
      holeId: holeId("synthetic-save"),
      holeInstanceKey: holeInstanceKey("synthetic-save-instance"),
      label: "Synthetic save",
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [firstTargetId, secondTargetId],
      targetRollModes: [{ targetId: secondTargetId, rollMode: "advantage" }],
      targetFlatBonuses: [],
      d20TestNaturalOneRerolls: [],
    });
    const requests = battleD20TestCircumstanceRequests({
      resolutionId,
      holes: [hole],
      resolvedFills: [],
    });

    expect(requests.map(({ targetId }) => targetId)).toEqual([
      firstTargetId,
      secondTargetId,
    ]);
    expect(requests.map(({ mechanicalSources }) => mechanicalSources)).toEqual([
      { advantage: false, disadvantage: false },
      { advantage: true, disadvantage: false },
    ]);
    expect(new Set(requests.map(({ requestRef }) => requestRef))).toHaveLength(
      2,
    );
  });

  test("uses the canonical accepted prefix for a normal single-target spell save", () => {
    // The cast keeps this test focused on prefix-owned target identity; the
    // omitted procedure payload is not read by the circumstance boundary.
    const hole = syntheticBattleHole({
      kind: "savingThrowOutcome",
      holeId: holeId("synthetic-single-save"),
      holeInstanceKey: holeInstanceKey("synthetic-single-save-instance"),
      label: "Synthetic single-target save",
      ability: "wis",
      dc: { kind: "fixed", dc: difficultyClass(13) },
      targetIds: [],
      targetRollModes: [],
      targetFlatBonuses: [],
    });
    const requests = battleD20TestCircumstanceRequests({
      resolutionId,
      holes: [hole],
      resolvedFills: [
        {
          kind: "targetChoice",
          holeId: holeId("synthetic-target"),
          value: firstTargetId,
        },
      ],
    });

    expect(requests).toMatchObject([
      {
        testKind: "savingThrow",
        targetId: firstTargetId,
        mechanicalSources: { advantage: false, disadvantage: false },
      },
    ]);
  });

  test.each([
    ["areaChoices", { areaChoices: [{ affectedTargetIds: [firstTargetId] }] }],
    [
      "objectContactSave",
      { objectContactSave: { targetIds: [firstTargetId] } },
    ],
    ["spellTurnStartSave", { spellTurnStartSave: { targetId: firstTargetId } }],
    ["sleepRepeatSave", { sleepRepeatSave: { targetId: firstTargetId } }],
    [
      "hideousLaughterRepeatSave",
      { hideousLaughterRepeatSave: { targetId: firstTargetId } },
    ],
    [
      "spellConditionCountedEndTurnSave",
      { spellConditionCountedEndTurnSave: { targetId: firstTargetId } },
    ],
    ["greaseGroundHazard", { greaseGroundHazard: { targetId: firstTargetId } }],
    ["webRestraint", { webRestraint: { targetId: firstTargetId } }],
    [
      "sleetStormAreaHazard",
      { sleetStormAreaHazard: { targetId: firstTargetId } },
    ],
    [
      "insectPlagueAreaHazard",
      { insectPlagueAreaHazard: { targetId: firstTargetId } },
    ],
    [
      "cloudkillAreaHazard",
      { cloudkillAreaHazard: { targetId: firstTargetId } },
    ],
    ["gustOfWindLine", { gustOfWindLine: { targetId: firstTargetId } }],
    [
      "spellConditionEndTurnSave",
      { spellConditionEndTurnSave: { targetId: firstTargetId } },
    ],
    [
      "unitFeatureConditionEndTurnSave",
      { unitFeatureConditionEndTurnSave: { targetId: firstTargetId } },
    ],
    [
      "slowActivePenaltiesEndTurnSave",
      { slowActivePenaltiesEndTurnSave: { targetId: firstTargetId } },
    ],
    [
      "abilityD20TestRollModeEndTurnSave",
      { abilityD20TestRollModeEndTurnSave: { targetId: firstTargetId } },
    ],
    ["movableZone", { movableZone: { targetId: firstTargetId } }],
    [
      "protectionRelevantEffectSave",
      { protectionRelevantEffectSave: { targetId: firstTargetId } },
    ],
  ] as const)("projects the target owned by %s", (_owner, targetProjection) => {
    const hole = syntheticBattleHole({
      kind: "savingThrowOutcome",
      holeId: holeId(`synthetic-${_owner}`),
      holeInstanceKey: holeInstanceKey(`synthetic-${_owner}-instance`),
      label: `Synthetic ${_owner}`,
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetRollModes: [],
      targetFlatBonuses: [],
      ...targetProjection,
    });

    expect(
      battleD20TestCircumstanceRequests({
        resolutionId,
        holes: [hole],
        resolvedFills: [],
      }).map(({ targetId }) => targetId),
    ).toEqual([firstTargetId]);
  });

  test.each([
    [
      "savingThrowOutcome",
      {
        kind: "savingThrowOutcome",
        holeId: holeId("synthetic-prior-save"),
        value: {
          outcomes: [
            { targetId: firstTargetId, total: 14, naturalD20: 10 },
            { targetId: secondTargetId, withoutRoll: true },
          ],
        },
      },
    ],
    [
      "spellTargetList",
      {
        kind: "spellTargetList",
        holeId: holeId("synthetic-prior-target-list"),
        value: { targetIds: [firstTargetId] },
      },
    ],
    [
      "spellTargetAllocation",
      {
        kind: "spellTargetAllocation",
        holeId: holeId("synthetic-prior-target-allocation"),
        value: { allocations: [{ targetId: firstTargetId }] },
      },
    ],
    [
      "objectContactTargets",
      {
        kind: "objectContactTargets",
        holeId: holeId("synthetic-prior-object-contact"),
        value: { targetIds: [firstTargetId] },
      },
    ],
  ] as const)("projects a saving-throw target from prior %s", (_kind, fill) => {
    const hole = {
      kind: "savingThrowOutcome",
      holeId: holeId(`synthetic-prior-${_kind}-save`),
      holeInstanceKey: holeInstanceKey(`synthetic-prior-${_kind}-instance`),
      label: `Synthetic prior ${_kind} save`,
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [],
      targetRollModes: [],
      targetFlatBonuses: [],
    } as BattleHole;

    expect(
      battleD20TestCircumstanceRequests({
        resolutionId,
        holes: [hole],
        resolvedFills: [syntheticBattleFill(fill)],
      }).map(({ targetId }) => targetId),
    ).toEqual([firstTargetId]);
  });

  test("classifies grapple saves and escape checks as their distinct RAW D20 Test kinds", () => {
    const request = (mode: "grappleSave" | "escapeCheck") =>
      battleD20TestCircumstanceRequests({
        resolutionId: d20TestResolutionId(`${resolutionId}:${mode}`),
        holes: [
          {
            kind: "grappleOutcome",
            holeId: holeId(`synthetic-${mode}`),
            holeInstanceKey: holeInstanceKey(`synthetic-${mode}-instance`),
            label: `Synthetic ${mode}`,
            actorId: secondTargetId,
            targetId: firstTargetId,
            dc: difficultyClass(12),
            mode,
          },
        ],
        resolvedFills: [],
      })[0]?.testKind;

    expect(request("grappleSave")).toBe("savingThrow");
    expect(request("escapeCheck")).toBe("abilityCheck");
  });

  test.each([
    [undefined, undefined, "normal"],
    [undefined, "advantage", "advantage"],
    [undefined, "disadvantage", "disadvantage"],
    ["advantage", "advantage", "advantage"],
    ["disadvantage", "disadvantage", "disadvantage"],
    ["advantage", "disadvantage", "normal"],
    ["disadvantage", "advantage", "normal"],
    ["normal", "advantage", "normal"],
    ["normal", "disadvantage", "normal"],
  ] as const)(
    "combines mechanical source summary %s and Table %s as %s",
    (mechanical, table, expected) => {
      expect(
        combineD20TestRollMode(
          mechanicalD20TestRollModeSources(mechanical),
          table,
        ),
      ).toBe(expected);
    },
  );

  test("rejects stale, mismatched, duplicate, and contradictory decisions", () => {
    const attack = requestFor("attackRoll");
    const ability = requestFor("abilityCheck");
    const stale = { ...attack, requestRef: ability.requestRef };

    expect(
      admitTableD20TestCircumstanceDecisions({
        requests: [attack],
        decisions: [decision(stale, "advantage")],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { issues: [{ tag: "stale-d20-test-request" }] },
    });
    expect(
      admitTableD20TestCircumstanceDecisions({
        requests: [attack],
        decisions: [decision(attack, "advantage", "savingThrow")],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { issues: [{ tag: "d20-test-kind-mismatch" }] },
    });
    expect(
      admitTableD20TestCircumstanceDecisions({
        requests: [attack],
        decisions: [
          decision(attack, "advantage"),
          decision(attack, "advantage"),
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { issues: [{ tag: "duplicate-d20-test-decision" }] },
    });
    expect(
      admitTableD20TestCircumstanceDecisions({
        requests: [attack],
        decisions: [
          decision(attack, "advantage"),
          decision(attack, "disadvantage"),
        ],
      }),
    ).toMatchObject({
      _tag: "Left",
      left: { issues: [{ tag: "contradictory-d20-test-decision" }] },
    });
  });

  test("admission is order-independent for decisions on distinct tests", () => {
    fc.assert(
      fc.property(
        fc.shuffledSubarray([...D20_TEST_KINDS], {
          minLength: D20_TEST_KINDS.length,
          maxLength: D20_TEST_KINDS.length,
        }),
        (orderedKinds) => {
          const requests = D20_TEST_KINDS.map((testKind) =>
            requestFor(testKind),
          );
          const decisions = orderedKinds.map((testKind) =>
            decision(requestFor(testKind), "advantage"),
          );
          const admitted = admitTableD20TestCircumstanceDecisions({
            requests,
            decisions,
          });
          expect(Either.isRight(admitted)).toBe(true);
          if (Either.isRight(admitted)) {
            expect(
              requests.map((request) =>
                effectiveD20TestRollMode({ request, admitted: admitted.right }),
              ),
            ).toEqual(["advantage", "advantage", "advantage"]);
          }
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("carries an exact Table attack decision through the runtime session wrapper", () => {
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-table-circumstance"),
      combatants: [
        characterSeed({ initiative: 20 }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject(session.state);
    const initial = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [],
      d20TestResolutionId: resolutionId,
      tableD20TestCircumstanceDecisions: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    const targetHole = initial.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    expect(targetHole).toBeDefined();
    if (targetHole === undefined) return;
    const selectedTarget = targetFill(targetHole, goblinId);
    const preliminary =
      resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
        session,
        subject,
        fills: [selectedTarget],
        d20TestResolutionId: resolutionId,
        tableD20TestCircumstanceDecisions: [],
      });
    expect(preliminary.tag).toBe("needsHoles");
    if (preliminary.tag !== "needsHoles") return;
    const request = preliminary.d20TestCircumstanceRequests[0];
    expect(request).toMatchObject({
      testKind: "attackRoll",
      targetId: goblinId,
    });
    if (request === undefined) return;
    const tableDecision = decision(request, "advantage");
    const admitted = admitTableD20TestCircumstanceDecisions({
      requests: [request],
      decisions: [tableDecision],
    });
    expect(Either.isRight(admitted)).toBe(true);
    if (Either.isLeft(admitted)) return;
    const projectedHoles = battleHolesWithTableD20TestCircumstances({
      holes: preliminary.holes,
      requests: preliminary.d20TestCircumstanceRequests,
      admitted: admitted.right,
    });
    const attackHole = projectedHoles.find(
      (hole) => hole.kind === "attackRoll",
    );
    expect(attackHole).toMatchObject({ rollMode: "advantage" });
    if (attackHole === undefined) return;

    const rolled = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [
        selectedTarget,
        attackRollFill(attackHole, {
          total: 30,
          naturalD20: 18,
          rollMode: "advantage",
        }),
      ],
      d20TestResolutionId: resolutionId,
      tableD20TestCircumstanceDecisions: [tableDecision],
    });
    expect(rolled.tag).toBe("needsHoles");
    expect(
      attackRollHasAdvantageSource(
        session.state,
        fighterId,
        goblinId,
        undefined,
        [],
      ),
    ).toBe(false);

    const invalid = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [selectedTarget],
      d20TestResolutionId: resolutionId,
      tableD20TestCircumstanceDecisions: [
        { ...tableDecision, testKind: "savingThrow" },
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      tableD20TestCircumstanceDecisionIssue: {
        issues: [{ tag: "d20-test-kind-mismatch" }],
      },
    });

    const ended = endBattleRuntimeTurnWithTableD20TestCircumstances({
      session,
      actorId: fighterId,
      fills: [],
      d20TestResolutionId: resolutionId,
      tableD20TestCircumstanceDecisions: [],
    });
    expect(ended.tag).toBe("resolved");
    if (ended.tag === "resolved") {
      expect(battleRuntimeSessionFollows(ended.session, session)).toBe(true);
    }
  });
});
