import { damageAmount } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import type {
  BattleActiveEffect,
  BattleState,
} from "./battle-state-execution.ts";
import {
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  combatantId,
  fighterId,
  fighterVsGoblinBattle,
  goblinId,
  holeId,
  elapsedTimeTicks,
} from "./battle-runtime.test-support.ts";
import {
  DamageRelationshipDecisionsByHole,
  damageRelationshipDecisionHole,
  damageRelationshipDecisionFillCheck,
} from "./battle-reducer/damage-relationship-decisions.ts";
import { damageRelationshipQuestionId } from "./battle-reducer/damage-relationship-question-id.ts";

describe("damage relationship decision protocol", () => {
  test("parses, checks, and rejects absent relationship fills", () => {
    const damageEventHoleId = holeId("synthetic-damage-event");
    const relationshipHoleId = holeId(
      `${String(damageEventHoleId)}:relationships`,
    );
    const empty = DamageRelationshipDecisionsByHole.parse({
      fills: [],
      damageEventHoleIds: new Set([damageEventHoleId]),
      owner: "a Spell",
    });
    if (empty.tag !== "ok") {
      throw new Error("Expected empty relationship fill set to parse.");
    }
    expect(
      empty.decisionsByRelationshipHole.check(damageEventHoleId, null),
    ).toEqual({ tag: "ok", decisions: undefined });
    expect(
      empty.decisionsByRelationshipHole.unexpectedFillForAbsentEvent(
        damageEventHoleId,
      ),
    ).toBeNull();

    const unexpectedFill = {
      kind: "damageRelationshipDecisions" as const,
      holeId: relationshipHoleId,
      answers: [
        {
          questionId: damageRelationshipQuestionId(["synthetic-question"]),
          answer: true,
        },
      ] as const,
    };
    const parsed = DamageRelationshipDecisionsByHole.parse({
      fills: [unexpectedFill],
      damageEventHoleIds: new Set([damageEventHoleId]),
      owner: "an Attack",
    });
    if (parsed.tag !== "ok") {
      throw new Error("Expected matching relationship fill to parse.");
    }
    expect(
      parsed.decisionsByRelationshipHole.check(damageEventHoleId, null),
    ).toMatchObject({ tag: "invalid" });
    expect(
      parsed.decisionsByRelationshipHole.unexpectedFillForAbsentEvent(
        damageEventHoleId,
      ),
    ).toContain("emitted relationship hole");
  });

  test("emits one question per source and resolves a decision answer", () => {
    const state = fighterVsGoblinBattle();
    const target = state.combatants.get(goblinId);
    if (target === undefined || target.positiveHpUnconscious !== null) {
      throw new Error("Expected the conscious synthetic target.");
    }
    const conditionEffect = {
      kind: "spellCondition",
      effectRef: battleActiveEffectExecutionRefForTest(
        "synthetic-relationship-condition-1",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-relationship-source",
      ),
      sourceCombatantId: fighterId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      escape: { kind: "targetDamagedByCasterOrAlly" as const },
      turnStartDamage: null,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    const duplicateConditionEffect = {
      ...conditionEffect,
      effectRef: battleActiveEffectExecutionRefForTest(
        "synthetic-relationship-condition-2",
      ),
    } as const satisfies BattleActiveEffect;
    const relationshipState: BattleState = {
      ...state,
      combatants: new Map(state.combatants).set(goblinId, {
        ...target,
        activeEffects: [conditionEffect, duplicateConditionEffect],
      }),
    };
    const damageEventHoleId = holeId("synthetic-damage-with-relationship");
    const hole = damageRelationshipDecisionHole({
      state: relationshipState,
      damageEventHoleId,
      damageSourceId: combatantId("synthetic-ally-damager"),
      targets: [{ targetId: goblinId, damageAmount: damageAmount(1) }],
      spatialFacts: [],
    });
    if (hole === null) {
      throw new Error("Expected a relationship question hole.");
    }
    expect(hole.questions).toHaveLength(1);
    const question = hole.questions[0];
    if (question === undefined) {
      throw new Error("Expected a relationship question.");
    }

    const parsed = DamageRelationshipDecisionsByHole.parse({
      fills: [
        {
          kind: "damageRelationshipDecisions",
          holeId: hole.holeId,
          answers: [{ questionId: question.questionId, answer: true }],
        },
      ],
      damageEventHoleIds: new Set([damageEventHoleId]),
      owner: "a Spell",
    });
    if (parsed.tag !== "ok") {
      throw new Error("Expected relationship answer to parse.");
    }
    expect(
      parsed.decisionsByRelationshipHole.check(damageEventHoleId, hole),
    ).toMatchObject({
      tag: "ok",
      decisions: [
        {
          kind: "targetDamagedByCasterOrAlly",
          targetId: goblinId,
          effectSourceId: fighterId,
          sourceIsAlly: true,
        },
      ],
    });
    expect(
      damageRelationshipDecisionFillCheck({
        state: relationshipState,
        damageEventHoleId,
        damageSourceId: combatantId("synthetic-ally-damager"),
        targets: [{ targetId: goblinId, damageAmount: damageAmount(1) }],
        spatialFacts: [],
        decisionsByRelationshipHole: parsed.decisionsByRelationshipHole,
      }),
    ).toMatchObject({ tag: "ok" });

    expect(
      damageRelationshipDecisionHole({
        state: relationshipState,
        damageEventHoleId,
        damageSourceId: fighterId,
        targets: [
          {
            targetId: combatantId("missing-target"),
            damageAmount: damageAmount(1),
          },
        ],
        spatialFacts: [],
      }),
    ).toBeNull();
    expect(
      damageRelationshipDecisionHole({
        state: relationshipState,
        damageEventHoleId,
        damageSourceId: fighterId,
        targets: [],
        spatialFacts: [],
      }),
    ).toBeNull();
  });
});
