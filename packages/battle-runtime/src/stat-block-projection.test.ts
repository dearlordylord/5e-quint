// KERNEL-COVERAGE: parity-witness BATTLE.STAT_BLOCK.ATTACK_CONTROL
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test stat-block.attack-control
import * as Either from "effect/Either";
import { Schema } from "effect";
import { describe, expect, test } from "vitest";
import { statBlockId } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { StatBlockProcedureOrdinalSchema } from "@dnd/surface/surface/schema";
import type {
  StandaloneStatBlock,
  StatBlockRecord,
} from "@dnd/surface/surface/types";

import {
  battleAmmunitionStock,
  battleCreatureInitFromAuthoredStatBlock,
  battleCreatureInitFromStatBlock,
  battleExecutionScopeOrdinal,
  battleId,
  combatantId,
  discoverBattleActsWithStatBlockProjectionIssues,
  initiativeScore,
  statBlockProjectionIssuesForActor,
  projectAuthoredStatBlock,
  startBattle,
  statBlockProcedurePresentations,
  type StatBlockProjectionIssue,
} from "./index.ts";
import {
  statBlockCatalog,
  statBlockRecord,
} from "./battle-runtime.test-support.ts";
import { statBlockExecutionAdmissionCohort } from "./stat-block-execution.ts";
import { statBlockAttackActionOptions } from "./stat-block-execution-state.ts";
import { statBlockTraitsAreSupported } from "./statblock-action-support.ts";

const authoredOrdinal = (value: number) =>
  Schema.decodeUnknownSync(StatBlockProcedureOrdinalSchema)(value);

function initializedStatBlock(source: StatBlockRecord) {
  const projected = projectAuthoredStatBlock(source);
  if (Either.isLeft(projected)) {
    throw new Error(`Expected Stat Block projection: ${projected.left.reason}`);
  }
  const initialized = battleCreatureInitFromStatBlock({
    combatantId: combatantId("stat-block-projection-actor"),
    statBlock: projected.right.runtime,
    initiative: initiativeScore(10),
    ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
    conditions: [],
    presentation: projected.right.presentation,
  });
  if (Either.isLeft(initialized)) {
    throw new Error(`Expected Stat Block initialization: ${initialized.left}`);
  }
  return initialized.right;
}

function startedStatBlock(source: StatBlockRecord) {
  const started = startBattle({
    battleId: battleId("stat-block-projection"),
    combatants: [initializedStatBlock(source)],
  });
  if (Either.isLeft(started)) {
    throw new Error(`Expected Stat Block battle start: ${started.left}`);
  }
  return started.right;
}

function mechanicalActs(session: ReturnType<typeof startedStatBlock>) {
  return discoverBattleActsWithStatBlockProjectionIssues(session).acts.map(
    ({ subject, initialHoles }) => ({ subject, initialHoles }),
  );
}

function mechanicalProjection(session: ReturnType<typeof startedStatBlock>) {
  const actor = session.state.combatants.get(
    combatantId("stat-block-projection-actor"),
  );
  if (actor === undefined || actor.origin.kind !== "statBlock") {
    throw new Error("Expected a Stat Block projection actor.");
  }
  return {
    maxHp: actor.maxHp,
    armorClass: actor.armorClass,
    size: actor.size,
    mechanics: actor.origin.mechanics,
    execution: actor.origin.execution,
  };
}

function firstProjectionIssue(
  issues: ReadonlyNonEmptyArray<StatBlockProjectionIssue>,
): StatBlockProjectionIssue {
  return issues[0];
}

describe("generic Stat Block projection", () => {
  test("admits authored mechanics and presentation as one operation", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromAuthoredStatBlock({
      combatantId: combatantId("authored-stat-block"),
      statBlock: source,
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      conditions: [],
    });

    expect(Either.isRight(initialized)).toBe(true);
    if (Either.isLeft(initialized)) return;
    expect(initialized.right.displayName).toBe(source.name);
    expect(initialized.right.creatureInit.kind).toBe("statBlock");
    if (initialized.right.creatureInit.kind !== "statBlock") return;
    expect(initialized.right.creatureInit.source.procedures).not.toHaveLength(
      0,
    );
    expect(initialized.right.creatureInit.presentation?.displayName).toBe(
      source.name,
    );
  });

  test("keeps authored projection failure distinct from battle init failure", () => {
    const source = statBlockRecord();
    const initialized = battleCreatureInitFromAuthoredStatBlock({
      combatantId: combatantId("nonliteral-authored-stat-block"),
      statBlock: {
        ...source,
        statBlock: {
          ...source.statBlock,
          size: { kind: "alternatives", options: ["small", "medium"] },
        },
      },
      initiative: initiativeScore(10),
      ammunitionStocks: [],
      conditions: [],
    });

    expect(initialized).toMatchObject({
      _tag: "Left",
      left: {
        tag: "statBlockProjectionFailure",
        failure: { reason: "nonLiteralSize" },
      },
    });
  });

  test("does not synthesize presentation when initialization omits authored context", () => {
    const projected = projectAuthoredStatBlock(statBlockRecord());
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;

    const initialized = battleCreatureInitFromStatBlock({
      combatantId: combatantId("stat-block-without-presentation"),
      statBlock: projected.right.runtime,
      initiative: initiativeScore(10),
      ammunitionStocks: [battleAmmunitionStock("arrow", 20)],
      conditions: [],
    });
    expect(Either.isRight(initialized)).toBe(true);
    if (Either.isLeft(initialized)) return;

    const started = startBattle({
      battleId: battleId("stat-block-without-presentation"),
      combatants: [initialized.right],
    });
    expect(Either.isRight(started)).toBe(true);
    if (Either.isLeft(started)) return;
    expect(
      started.right.context.statBlocks.has(
        combatantId("stat-block-without-presentation"),
      ),
    ).toBe(false);
  });

  test("admits only typed attack-roll trait effects", () => {
    const untyped = [
      {
        name: "Coordinated Strike",
        description:
          "The form has Advantage on attack rolls against a creature if an ally is next to the creature.",
      },
    ] satisfies NonNullable<StandaloneStatBlock["traits"]>;
    const typed = [
      {
        ...untyped[0],
        effect: {
          kind: "attack_roll_advantage_when_non_incapacitated_ally_within_5_feet_of_target" as const,
        },
      },
    ] satisfies NonNullable<StandaloneStatBlock["traits"]>;

    expect(statBlockTraitsAreSupported(untyped)).toBe(false);
    expect(statBlockTraitsAreSupported(typed)).toBe(true);
  });

  test("admits a static-only authored damage amount as a static attack option", () => {
    const cat = statBlockCatalog.requireStatBlock("stat_block_cat");
    const projected = projectAuthoredStatBlock(cat);
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;

    const [admission] = statBlockExecutionAdmissionCohort(
      battleId("static-only-authored-damage"),
      combatantId("static-only-authored-damage"),
      [projected.right.runtime],
      battleExecutionScopeOrdinal(0),
    ).admissions;
    const scratchBinding = admission.execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "attack" &&
        binding.procedure.procedureOrdinal === 1,
    );
    expect(scratchBinding).toBeDefined();
    if (scratchBinding === undefined) return;
    const scratch = statBlockAttackActionOptions(admission.execution).find(
      (option) =>
        option.procedureRef === scratchBinding.procedureRef &&
        option.damageNotation === "static",
    );

    expect(scratch).toMatchObject({
      kind: "statBlockAttack",
      damageNotation: "static",
      attack: {
        onHit: [
          {
            kind: "damage",
            amount: { kind: "fixed", static: 1 },
          },
        ],
      },
    });
  });

  test("retains an authored Multiattack but reports a non-executable target", () => {
    const source = statBlockRecord();
    const attack = source.statBlock.actions?.[0];
    if (attack === undefined || attack.kind !== "executable") {
      throw new Error("Expected an authored action attack.");
    }
    const withUnsupportedDispatch: StatBlockRecord = {
      ...source,
      id: statBlockId("synthetic-multiattack-unsupported-target"),
      name: "Synthetic Multiattacker",
      statBlock: {
        ...source.statBlock,
        actions: [
          attack,
          {
            kind: "textOnly",
            procedureOrdinal: authoredOrdinal(2),
            name: "Unresolved Action",
            description: "The creature uses an unresolved action.",
            reason: "required_table_adjudication",
            resourceRefs: { kind: "none" },
          },
          {
            kind: "executable",
            procedureOrdinal: authoredOrdinal(3),
            procedure: {
              kind: "multiattack",
              name: "Synthetic Routine",
              dispatches: [
                {
                  procedureOrdinal: authoredOrdinal(2),
                  count: { kind: "literal", value: 1 },
                },
              ],
            },
            resourceRefs: { kind: "none" },
          },
        ],
      },
    };

    const projected = projectAuthoredStatBlock(withUnsupportedDispatch);
    expect(Either.isRight(projected)).toBe(true);
    if (Either.isLeft(projected)) return;
    expect(projected.right.presentation.orderedProcedures).toContainEqual(
      expect.objectContaining({
        section: "actions",
        procedureOrdinal: 3,
        kind: "multiattack",
      }),
    );
    expect(projected.right.runtime.procedures).toContainEqual(
      expect.objectContaining({
        kind: "multiattack",
        procedureOrdinal: 3,
        dispatches: [
          {
            procedureOrdinal: 2,
            count: 1,
            target: {
              kind: "unsupported",
              reason: "nonExecutableTarget",
            },
          },
        ],
      }),
    );

    const session = startedStatBlock(withUnsupportedDispatch);
    const actor = session.state.combatants.get(
      combatantId("stat-block-projection-actor"),
    );
    expect(actor?.origin.kind).toBe("statBlock");
    if (actor?.origin.kind === "statBlock") {
      expect(actor.origin.execution.procedureBindings).toContainEqual(
        expect.objectContaining({
          procedure: expect.objectContaining({
            kind: "unsupported",
            procedureOrdinal: 3,
            reason: "unsupportedMultiattackDispatch",
            dispatches: [
              {
                procedureOrdinal: 2,
                count: 1,
                target: {
                  kind: "unsupported",
                  reason: "nonExecutableTarget",
                },
              },
            ],
          }),
          resourcePoolRefs: [],
        }),
      );
      const presentation = session.context.statBlocks.get(
        combatantId("stat-block-projection-actor"),
      );
      if (presentation === undefined) {
        throw new Error("Expected Stat Block presentation context.");
      }
      expect(
        statBlockProcedurePresentations({
          execution: actor.origin.execution,
          presentation,
        }),
      ).toContainEqual(
        expect.objectContaining({
          kind: "unsupported",
          label: "Synthetic Routine",
          reason: "unsupportedMultiattackDispatch",
        }),
      );
    }
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(session)
        .statBlockProjectionIssues,
    ).toEqual([
      {
        combatantId: combatantId("stat-block-projection-actor"),
        issues: [
          {
            tag: "statBlockProjectionIssue",
            source: {
              kind: "action",
              section: "actions",
              shape: "special",
              nonExecutableReason: "required_table_adjudication",
            },
          },
          {
            tag: "statBlockProjectionIssue",
            source: {
              kind: "action",
              section: "actions",
              shape: "multiattack",
              nonExecutableReason: "unsupportedActionShape",
            },
          },
        ],
      },
    ]);
  });

  test("renamed equivalent mechanics project to the same creature facts and Acts", () => {
    const source = statBlockRecord();
    const renamed = {
      ...source,
      id: statBlockId("synthetic-stat-block-projection"),
      name: "Synthetic Projection Shape",
      statBlock: {
        ...source.statBlock,
        displayName: "Synthetic Projection Shape",
      },
    };

    const originalSession = startedStatBlock(source);
    const renamedSession = startedStatBlock(renamed);

    expect(mechanicalProjection(originalSession)).toEqual(
      mechanicalProjection(renamedSession),
    );
    expect(mechanicalActs(originalSession)).toEqual(
      mechanicalActs(renamedSession),
    );
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(originalSession)
        .statBlockProjectionIssues,
    ).toEqual([]);
    expect(
      discoverBattleActsWithStatBlockProjectionIssues(renamedSession)
        .statBlockProjectionIssues,
    ).toEqual([]);
  });

  test("does not admit a reused action attack in another action section", () => {
    const source = statBlockRecord();
    const actionAttack = source.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "attack_roll",
    );
    if (actionAttack === undefined) {
      throw new Error("Expected a fixture action attack.");
    }
    const reusedAcrossSections: StatBlockRecord = {
      ...source,
      id: statBlockId("synthetic-reused-action-attack"),
      statBlock: {
        ...source.statBlock,
        bonusActions: [actionAttack],
      },
    };

    const discovery = discoverBattleActsWithStatBlockProjectionIssues(
      startedStatBlock(reusedAcrossSections),
    );
    expect(discovery.statBlockProjectionIssues[0]?.issues).toContainEqual({
      tag: "statBlockProjectionIssue",
      source: {
        kind: "action",
        section: "bonusActions",
        shape: "attack",
        nonExecutableReason: "unsupportedActionShape",
      },
    });
  });

  test("reports a represented unsupported action shape as a typed issue", () => {
    const source = statBlockRecord();
    const attack = source.statBlock.actions?.find(
      (entry) =>
        entry.kind === "executable" && entry.procedure.kind === "attack_roll",
    );
    if (attack === undefined) throw new Error("Expected a fixture attack.");
    const unsupported: StatBlockRecord = {
      ...source,
      statBlock: {
        ...source.statBlock,
        bonusActions: [attack],
      },
    };

    const session = startedStatBlock(unsupported);
    const actorId = combatantId("stat-block-projection-actor");
    const discovery = discoverBattleActsWithStatBlockProjectionIssues(session);
    for (const group of discovery.statBlockProjectionIssues) {
      expect(firstProjectionIssue(group.issues).tag).toBe(
        "statBlockProjectionIssue",
      );
    }
    expect(
      statBlockProjectionIssuesForActor(
        session.state,
        session.context,
        actorId,
      ),
    ).toEqual(discovery.statBlockProjectionIssues[0]?.issues ?? null);
    expect(discovery.statBlockProjectionIssues).toEqual([
      {
        combatantId: actorId,
        issues: [
          {
            tag: "statBlockProjectionIssue",
            source: {
              kind: "action",
              section: "bonusActions",
              shape: "attack",
              nonExecutableReason: "unsupportedActionShape",
            },
          },
        ],
      },
    ]);
  });
});
