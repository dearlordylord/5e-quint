// KERNEL-COVERAGE: parity-witness BATTLE.D20_TEST.TABLE_CIRCUMSTANCE_DECISION
// KERNEL-COVERAGE: parity-witness BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
import fc from "fast-check";
import { Result } from "effect";
import { describe, expect, test } from "vitest";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  DieRollResult,
  classLevel,
  difficultyClass,
  movementFeet,
} from "@dnd/shared/types";
import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { combatantId } from "./identity.ts";
import type { BattleFill, BattleHole } from "./battle-state-execution.ts";
import type { CharacterBattleClassLevelInits } from "./character-class-level.ts";
import {
  resolveBattleRuntimeSubjectWithTableD20TestCircumstances,
  resolveBattleRuntimeSubject,
  endBattleRuntimeTurnWithTableD20TestCircumstances,
  endBattleRuntimeTurn,
} from "./battle-session-execution.ts";
import {
  attackRollFill,
  battleId,
  characterBattleFeatureInitForTest,
  characterSeed,
  damageRollFillWithGroups,
  fighterAttackSubject,
  fighterId,
  goblinId,
  discoverBattleActs,
  findHole,
  requireCharacterSpellProcedureRefForTest,
  requireCharacterUnitProcedureRefForTest,
  savingThrowOutcomeFill,
  startBattleSessionRight,
  statBlockCreatureInit,
  spellRecord,
  targetFill,
  secondSkeletonId,
  skeletonId,
  wizardVsSkeletonBattle,
  wizardSpellcasting,
  testCharacterD20Statistics,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { spellSlotInvocationRef } from "./index.ts";
import { battleUnitRefWithSupportProfiles } from "./unit-profile-admission.test-support.ts";
import { battleMagicActionSaveGatedConditionSupportForUnit } from "./unit-feature-support.ts";
import {
  battleRuntimeSessionFollows,
  battleRuntimeSessionWithState,
} from "./battle-runtime-context.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  spellConditionChoiceFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { requireActorAdmittedSpellActForTest } from "./spell-effect-fixture.test-support.ts";
import { attackRollHasAdvantageSource } from "./battle-reducer/attack-roll.ts";
import { uniqueSavingThrowRollModeProjections } from "./battle-reducer/saving-throw-roll-mode-projections.ts";
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

function requireSaveConditionSpellAct(
  session: Parameters<typeof discoverBattleActs>[0],
  selectedSpellId: "hold_person" | "blindness_deafness",
) {
  const expected = spellSlotInvocationRef(
    selectedSpellId,
    2,
    "saveGatedCondition",
  );
  const act = requireActorAdmittedSpellActForTest({
    session,
    actorId: fighterId,
    subjectTag: "actionSpell",
    invocationRef: expected,
  });
  return act;
}

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

  test("uses an attack relationship request and an ability roll-mode projection", () => {
    const attackHole = syntheticBattleHole({
      kind: "attackRoll",
      holeId: holeId("synthetic-relationship-attack"),
      holeInstanceKey: holeInstanceKey(
        "synthetic-relationship-attack-instance",
      ),
      label: "Synthetic relationship attack",
      relationshipFactRequest: {
        kind: "attackRollTargetIsEnemy",
        attackerId: firstTargetId,
        targetId: secondTargetId,
      },
      rollMode: "normal",
    });
    expect(
      battleD20TestCircumstanceRequests({
        resolutionId,
        holes: [attackHole],
        resolvedFills: [],
      }),
    ).toMatchObject([{ testKind: "attackRoll", targetId: secondTargetId }]);

    const abilityHole = syntheticBattleHole({
      kind: "abilityCheck",
      holeId: holeId("synthetic-ability-roll-mode"),
      holeInstanceKey: holeInstanceKey("synthetic-ability-roll-mode-instance"),
      label: "Synthetic ability check",
      ability: "dex",
      skill: "acrobatics",
      dc: difficultyClass(12),
      rollMode: "advantage",
    });
    expect(
      battleD20TestCircumstanceRequests({
        resolutionId,
        holes: [abilityHole],
        resolvedFills: [],
      }),
    ).toMatchObject([
      {
        testKind: "abilityCheck",
        mechanicalSources: { advantage: true, disadvantage: false },
      },
    ]);
  });

  test("projects concentration and shove saving throws with their own roll modes", () => {
    const concentrationHole = syntheticBattleHole({
      kind: "concentrationSavingThrow",
      holeId: holeId("synthetic-concentration-save"),
      holeInstanceKey: holeInstanceKey("synthetic-concentration-save-instance"),
      label: "Synthetic concentration save",
      combatantId: firstTargetId,
      dc: difficultyClass(10),
      damageAmount: 4,
      targetFlatBonuses: [],
      rollMode: "advantage",
    });
    const shoveHole = syntheticBattleHole({
      kind: "shoveOutcome",
      holeId: holeId("synthetic-shove-save"),
      holeInstanceKey: holeInstanceKey("synthetic-shove-save-instance"),
      label: "Synthetic shove save",
      actorId: firstTargetId,
      targetId: secondTargetId,
      ability: "str",
      dc: difficultyClass(12),
      rollMode: "disadvantage",
    });

    expect(
      battleD20TestCircumstanceRequests({
        resolutionId,
        holes: [concentrationHole, shoveHole],
        resolvedFills: [],
      }),
    ).toMatchObject([
      {
        testKind: "savingThrow",
        targetId: firstTargetId,
        mechanicalSources: { advantage: true, disadvantage: false },
      },
      {
        testKind: "savingThrow",
        targetId: secondTargetId,
        mechanicalSources: { advantage: false, disadvantage: true },
      },
    ]);
  });

  test("returns no saving-throw request when no accepted prefix supplies a target", () => {
    const hole = syntheticBattleHole({
      kind: "savingThrowOutcome",
      holeId: holeId("synthetic-no-save-target"),
      holeInstanceKey: holeInstanceKey("synthetic-no-save-target-instance"),
      label: "Synthetic targetless save",
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [],
      targetRollModes: [],
      targetFlatBonuses: [],
    });
    expect(
      battleD20TestCircumstanceRequests({
        resolutionId,
        holes: [hole],
        resolvedFills: [],
      }),
    ).toEqual([]);
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
      _tag: "Failure",
      failure: { issues: [{ tag: "stale-d20-test-request" }] },
    });
    expect(
      admitTableD20TestCircumstanceDecisions({
        requests: [attack],
        decisions: [decision(attack, "advantage", "savingThrow")],
      }),
    ).toMatchObject({
      _tag: "Failure",
      failure: { issues: [{ tag: "d20-test-kind-mismatch" }] },
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
      _tag: "Failure",
      failure: { issues: [{ tag: "duplicate-d20-test-decision" }] },
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
      _tag: "Failure",
      failure: { issues: [{ tag: "contradictory-d20-test-decision" }] },
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
          expect(Result.isSuccess(admitted)).toBe(true);
          if (Result.isSuccess(admitted)) {
            expect(
              requests.map((request) =>
                effectiveD20TestRollMode({
                  request,
                  admitted: admitted.success,
                }),
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
    const withoutTableDecision =
      resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
        session,
        subject,
        fills: [
          selectedTarget,
          attackRollFill(findHole(preliminary.holes, "attackRoll"), {
            total: 30,
            naturalD20: 18,
          }),
        ],
        d20TestResolutionId: resolutionId,
        tableD20TestCircumstanceDecisions: [],
      });
    expect(withoutTableDecision.tag).toBe("needsHoles");
    const tableDecision = decision(request, "advantage");
    const admitted = admitTableD20TestCircumstanceDecisions({
      requests: [request],
      decisions: [tableDecision],
    });
    expect(Result.isSuccess(admitted)).toBe(true);
    if (Result.isFailure(admitted)) return;
    const projectedHoles = battleHolesWithTableD20TestCircumstances({
      holes: preliminary.holes,
      requests: preliminary.d20TestCircumstanceRequests,
      admitted: admitted.success,
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

  test("keeps no-roll saves from a low-level injected concentration boundary out of Table circumstance requests", () => {
    const baseSession = startBattleSessionRight({
      battleId: battleId("synthetic-table-no-roll-concentration"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Low-Level Concentration Target",
          initiative: 10,
          attack: null,
          classLevels: [{ className: "wizard", level: 5 }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("fly")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
      ],
    });
    // This unit owns only the Table/no-roll interaction. It intentionally
    // injects the lower-layer concentration flag without claiming a cast or
    // lifecycle history. The procedure ref is admission-backed only to retain
    // valid owner/cursor identity, not as evidence that Fly was cast.
    const target = baseSession.state.combatants.get(goblinId);
    if (target === undefined) throw new Error("Expected concentration target.");
    const session = battleRuntimeSessionWithState(baseSession, {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants).set(goblinId, {
        ...target,
        concentration: {
          sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
            baseSession,
            goblinId,
            spellSlotInvocationRef("fly", 3, "scalarBuff"),
          ),
          effectKind: "spellEffect" as const,
        },
      }),
    });
    const subject = fighterAttackSubject(session.state);
    const initial = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [],
      d20TestResolutionId: d20TestResolutionId("no-roll-concentration"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    const targetHole = initial.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (targetHole === undefined) throw new Error("Expected target choice.");
    const targetSelection = targetFill(targetHole, goblinId);
    const attackStage = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [targetSelection],
    });
    expect(attackStage.tag).toBe("needsHoles");
    if (attackStage.tag !== "needsHoles") return;
    const attackHole = attackStage.holes.find(
      (hole) => hole.kind === "attackRoll",
    );
    if (attackHole === undefined) throw new Error("Expected attack roll.");
    const attack = attackRollFill(attackHole, {
      total: 20,
      naturalD20: 12,
    });
    const damageStage = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [targetSelection, attack],
    });
    expect(damageStage.tag).toBe("needsHoles");
    if (damageStage.tag !== "needsHoles") return;
    const damageHole = damageStage.holes.find(
      (hole) => hole.kind === "rolledDice",
    );
    if (damageHole === undefined) throw new Error("Expected damage roll.");
    const damage = damageRollFillWithGroups(damageHole, [[4]]);
    const concentrationStage = resolveBattleRuntimeSubject({
      session,
      subject,
      fills: [targetSelection, attack, damage],
    });
    expect(concentrationStage.tag).toBe("needsHoles");
    if (concentrationStage.tag !== "needsHoles") return;
    const concentrationHole = concentrationStage.holes.find(
      (hole) => hole.kind === "concentrationSavingThrow",
    );
    if (concentrationHole === undefined) {
      throw new Error("Expected concentration save.");
    }
    const noRoll = {
      kind: "concentrationSavingThrow" as const,
      holeId: concentrationHole.holeId,
      value: { succeeded: true, withoutRoll: true as const },
    };
    const resolved = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [targetSelection, attack, damage, noRoll],
      d20TestResolutionId: d20TestResolutionId("no-roll-concentration"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(resolved.tag).toBe("resolved");
  });

  test("keeps only rolled targets from a mixed multi-target saving throw", () => {
    const session = wizardVsSkeletonBattle({
      extraCombatants: [
        statBlockCreatureInit({
          combatantId: secondSkeletonId,
          displayName: "Second Skeleton",
          initiative: 8,
        }),
      ],
    });
    const act = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "acid_splash",
    );
    if (act === undefined) throw new Error("Expected Acid Splash act.");
    const subject = act.subject;
    const initial = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [],
      d20TestResolutionId: d20TestResolutionId("mixed-save-outcomes"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    const saveHole = findHole(initial.holes, "savingThrowOutcome");
    expect(initial.d20TestCircumstanceRequests).toEqual([]);
    const mixedSave = savingThrowOutcomeFill(saveHole, [
      { targetId: skeletonId, succeeded: true, withoutRoll: true },
      { targetId: secondSkeletonId, succeeded: false, naturalD20: 12 },
    ]);
    const next = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [mixedSave],
      d20TestResolutionId: d20TestResolutionId("mixed-save-outcomes"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(next.tag).toBe("needsHoles");
    if (next.tag !== "needsHoles") return;
    expect(next.holes).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: "rolledDice" })]),
    );
    expect(next.d20TestCircumstanceRequests).toEqual([]);
  });

  test("deduplicates repeated Table requests while preserving each save target", () => {
    const unit = unitLibrary.requireUnit("paladin_abjure_foes");
    const paladinChannelDivinity = unitLibrary.requireUnit(
      "paladin_channel_divinity",
    );
    const paladinLevel = classLevel(9);
    const classLevels = [
      { className: "paladin" as const, level: paladinLevel },
    ] as const satisfies CharacterBattleClassLevelInits;
    const unitRef = battleUnitRefWithSupportProfiles({
      unitRef: { unitId: parseSharedUnitId("paladin_abjure_foes") },
      unit,
      classLevels,
    });
    expect(Result.isSuccess(unitRef)).toBe(true);
    if (Result.isFailure(unitRef)) return;
    const support = battleMagicActionSaveGatedConditionSupportForUnit(
      unit,
      classLevels,
    );
    expect(support).not.toBe(null);
    expect(support).not.toBe("unsupported");
    if (support === null || support === "unsupported") return;
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-table-multi-target-feature"),
      combatants: [
        characterSeed({
          combatantId: fighterId,
          displayName: "Synthetic Paladin",
          initiative: 20,
          classLevels,
          d20Statistics: testCharacterD20Statistics({ cha: 16, wis: 10 }),
          characterUnitRefs: [unitRef.success],
          unitFeatures: [characterBattleFeatureInitForTest(unit, classLevels)],
          resources: [{ unit: paladinChannelDivinity, usesRemaining: 2 }],
          spellcasting: {
            ...wizardSpellcasting(),
            spellcastingSource: {
              tag: "classSpellcasting" as const,
              className: "paladin" as const,
              abilityModifier: 3,
            },
          },
          attack: null,
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic First Target",
          initiative: 10,
          attack: null,
        }),
        characterSeed({
          combatantId: secondTargetId,
          displayName: "Synthetic Second Target",
          initiative: 9,
          attack: null,
        }),
      ],
    });
    const subject = {
      tag: "unitFeature" as const,
      actorId: fighterId,
      procedureRef: requireCharacterUnitProcedureRefForTest(
        session,
        fighterId,
        "paladin_abjure_foes",
      ),
    };
    const result = resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
      session,
      subject,
      fills: [],
      d20TestResolutionId: d20TestResolutionId("multi-target-feature"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(result.tag).toBe("needsHoles");
    if (result.tag !== "needsHoles") return;
    expect(result.d20TestCircumstanceRequests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          testKind: "savingThrow",
          targetId: goblinId,
        }),
        expect.objectContaining({
          testKind: "savingThrow",
          targetId: secondTargetId,
        }),
      ]),
    );
    expect(result.d20TestCircumstanceRequests).toHaveLength(3);
  });

  test("rejects a stale subject fill before collecting Table circumstance requests", () => {
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-table-stale-fill"),
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
      d20TestResolutionId: d20TestResolutionId("stale-fill"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(initial.tag).toBe("needsHoles");
    if (initial.tag !== "needsHoles") return;
    const targetHole = initial.holes.find(
      (hole) => hole.kind === "targetChoice",
    );
    if (targetHole === undefined) throw new Error("Expected target choice.");
    const stale = {
      ...targetFill(targetHole, goblinId),
      holeId: holeId("stale-target-hole"),
    };
    expect(
      resolveBattleRuntimeSubjectWithTableD20TestCircumstances({
        session,
        subject,
        fills: [stale],
        d20TestResolutionId: d20TestResolutionId("stale-fill"),
        tableD20TestCircumstanceDecisions: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });

  test("collects and validates Table D20 decisions at an End Turn death save frontier", () => {
    const session = startBattleSessionRight({
      battleId: battleId("synthetic-table-death-save"),
      combatants: [
        characterSeed({ initiative: 20 }),
        characterSeed({
          combatantId: secondTargetId,
          initiative: 10,
          currentHp: 0,
          attack: null,
        }),
      ],
    });
    const resolutionId = d20TestResolutionId("end-turn-death-save");
    const pending = endBattleRuntimeTurnWithTableD20TestCircumstances({
      session,
      actorId: fighterId,
      fills: [],
      d20TestResolutionId: resolutionId,
      tableD20TestCircumstanceDecisions: [],
    });
    expect(pending.tag).toBe("needsHoles");
    if (pending.tag !== "needsHoles") return;
    const request = pending.d20TestCircumstanceRequests[0];
    expect(request).toMatchObject({ testKind: "savingThrow" });
    if (request === undefined) return;
    const invalid = endBattleRuntimeTurnWithTableD20TestCircumstances({
      session,
      actorId: fighterId,
      fills: [],
      d20TestResolutionId: resolutionId,
      tableD20TestCircumstanceDecisions: [
        decision(request, "advantage", "attackRoll"),
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      tableD20TestCircumstanceDecisionIssue: {
        issues: [{ tag: "d20-test-kind-mismatch" }],
      },
    });
  });

  test("deduplicates distinct simultaneous End Turn saving-throw requests", () => {
    const baseSession = startBattleSessionRight({
      battleId: battleId("synthetic-table-end-turn-save-requests"),
      combatants: [
        characterSeed({
          initiative: 20,
          attack: null,
          classLevels: [{ className: "wizard", level: 3 }],
          spellcasting: wizardSpellcasting({
            preparedSpells: [
              spellRecord("hold_person"),
              spellRecord("blindness_deafness"),
            ],
            spellSlots: [{ spellLevel: 2, count: 2 }],
          }),
        }),
        characterSeed({
          combatantId: goblinId,
          displayName: "Synthetic Humanoid Save Target",
          initiative: 10,
          attack: null,
        }),
      ],
    });
    const holdAct = requireSaveConditionSpellAct(baseSession, "hold_person");
    const holdTarget = findHole(holdAct.initialHoles, "spellTargetList");
    const holdTargetFill = spellTargetListFill(
      holdTarget,
      fighterId,
      "hold_person",
      [goblinId],
    );
    const awaitingHoldSave = resolveBattleRuntimeSubject({
      session: baseSession,
      subject: holdAct.subject,
      fills: [holdTargetFill],
    });
    if (awaitingHoldSave.tag !== "needsHoles") {
      throw new Error(
        `Expected Hold Person's initial save, got ${awaitingHoldSave.tag}${"message" in awaitingHoldSave ? `: ${awaitingHoldSave.message}` : ""}.`,
      );
    }
    const holdSave = findHole(awaitingHoldSave.holes, "savingThrowOutcome");
    const held = resolveBattleRuntimeSubject({
      session: baseSession,
      subject: holdAct.subject,
      fills: [
        holdTargetFill,
        savingThrowOutcomeFill(holdSave, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    });
    expect(held.tag).toBe("resolved");
    if (held.tag !== "resolved") return;
    const targetTurn = endBattleRuntimeTurn({
      session: held.session,
      actorId: fighterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const firstRepeat = endBattleRuntimeTurn({
      session: targetTurn.session,
      actorId: goblinId,
    });
    expect(firstRepeat.tag).toBe("needsHoles");
    if (firstRepeat.tag !== "needsHoles") return;
    const holdRepeatSave = findHole(firstRepeat.holes, "savingThrowOutcome");
    const casterTurn = endBattleRuntimeTurn({
      session: targetTurn.session,
      actorId: goblinId,
      fills: [
        savingThrowOutcomeFill(holdRepeatSave, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") return;
    const blindnessAct = requireSaveConditionSpellAct(
      casterTurn.session,
      "blindness_deafness",
    );
    const blindnessTarget = findHole(
      blindnessAct.initialHoles,
      "spellTargetList",
    );
    const blindnessCondition = findHole(
      blindnessAct.initialHoles,
      "conditionChoice",
    );
    const blindnessTargetFill = spellTargetListFill(
      blindnessTarget,
      fighterId,
      "blindness_deafness",
      [goblinId],
    );
    const blindnessConditionFill = spellConditionChoiceFill(
      blindnessCondition,
      "blinded",
    );
    const awaitingBlindnessSave = resolveBattleRuntimeSubject({
      session: casterTurn.session,
      subject: blindnessAct.subject,
      fills: [blindnessTargetFill, blindnessConditionFill],
    });
    if (awaitingBlindnessSave.tag !== "needsHoles") {
      throw new Error("Expected Blindness/Deafness's initial save.");
    }
    const blindnessSave = findHole(
      awaitingBlindnessSave.holes,
      "savingThrowOutcome",
    );
    const blinded = resolveBattleRuntimeSubject({
      session: casterTurn.session,
      subject: blindnessAct.subject,
      fills: [
        blindnessTargetFill,
        blindnessConditionFill,
        savingThrowOutcomeFill(blindnessSave, [
          { targetId: goblinId, succeeded: false },
        ]),
      ],
    });
    expect(blinded.tag).toBe("resolved");
    if (blinded.tag !== "resolved") return;
    const session = endBattleRuntimeTurn({
      session: blinded.session,
      actorId: fighterId,
    });
    expect(session.tag).toBe("resolved");
    if (session.tag !== "resolved") return;
    const result = endBattleRuntimeTurnWithTableD20TestCircumstances({
      session: session.session,
      actorId: goblinId,
      fills: [],
      d20TestResolutionId: d20TestResolutionId("end-turn-save-requests"),
      tableD20TestCircumstanceDecisions: [],
    });
    expect(result.tag).toBe("needsHoles");
    if (result.tag !== "needsHoles") return;
    expect(result.d20TestCircumstanceRequests).toHaveLength(2);
    const requestRefs = new Set(
      result.d20TestCircumstanceRequests.map(({ requestRef }) => requestRef),
    );
    expect(requestRefs.size).toBe(2);
  });

  test("emits one projection per target while combining saving throw modes", () => {
    expect(uniqueSavingThrowRollModeProjections([])).toEqual([]);
    expect(
      uniqueSavingThrowRollModeProjections([
        { targetId: firstTargetId, rollMode: "advantage" },
        { targetId: firstTargetId, rollMode: "disadvantage" },
        { targetId: secondTargetId, rollMode: "normal" },
      ]),
    ).toEqual([
      { targetId: firstTargetId, rollMode: "normal" },
      { targetId: secondTargetId, rollMode: "normal" },
    ]);
  });

  test("projects authored modes onto only matching holes", () => {
    const savingHole = syntheticBattleHole({
      kind: "savingThrowOutcome",
      holeId: holeId("synthetic-project-save"),
      holeInstanceKey: holeInstanceKey("synthetic-project-save-instance"),
      label: "Synthetic projection save",
      ability: "dex",
      dc: { kind: "fixed", dc: difficultyClass(14) },
      targetIds: [firstTargetId],
      targetRollModes: [],
      targetFlatBonuses: [],
    });
    const unrelatedHole = syntheticBattleHole({
      kind: "abilityCheck",
      holeId: holeId("synthetic-project-ability"),
      holeInstanceKey: holeInstanceKey("synthetic-project-ability-instance"),
      label: "Synthetic projection ability",
      ability: "dex",
      skill: "acrobatics",
      dc: difficultyClass(12),
    });
    const request = battleD20TestCircumstanceRequests({
      resolutionId,
      holes: [savingHole],
      resolvedFills: [],
    })[0];
    if (request === undefined) throw new Error("Expected saving request.");
    const admitted = new Map([
      [request.requestRef, decision(request, "advantage")],
    ]);
    const untouched = battleHolesWithTableD20TestCircumstances({
      holes: [unrelatedHole],
      requests: [],
      admitted,
    });
    expect(untouched).toEqual([unrelatedHole]);
    expect(
      battleHolesWithTableD20TestCircumstances({
        holes: [savingHole],
        requests: [request],
        admitted,
      }),
    ).toMatchObject([
      { targetRollModes: [{ targetId: firstTargetId, rollMode: "advantage" }] },
    ]);
  });
});
