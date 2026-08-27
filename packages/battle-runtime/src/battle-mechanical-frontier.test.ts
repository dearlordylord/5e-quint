import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleMechanicalFrontierSchema,
  battleMechanicalFrontier,
  BattleMechanicalHoleSchema,
  BattleMechanicalInterruptChoiceSchema,
  BattleMechanicalInterruptDecisionHoleSchema,
  BattleMechanicalOrdinaryHoleSchema,
} from "./battle-mechanical-frontier.ts";
import {
  combatantId,
  fighterAttackSubject,
  fighterVsGoblinBattle,
  holeId,
  holeInstanceKey,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";
import { battleReplayStackDepth } from "./identity.ts";
import type {
  BattleHole,
  BattleInterruptDecisionHole,
  BattleInterruptProcedureChoice,
  BattleSnapshot,
} from "./battle-state-execution.ts";

const mechanicalHole = {
  holeInstanceKey: "mechanical-frontier-instance",
  holeId: "mechanical-frontier-hole",
  kind: "abilityCheck" as const,
  ability: "dex" as const,
  skill: "stealth" as const,
  dc: 12,
};

const mechanicalInterruptHole = {
  holeInstanceKey: "mechanical-frontier-interrupt-instance",
  holeId: "mechanical-frontier-interrupt-hole",
  kind: "interruptDecision" as const,
  trigger: "afterDamage" as const,
  eligibleResponders: ["reactor-id"],
};

const mechanicalNestedHole = {
  ...mechanicalHole,
  d20TestNaturalOneRerolls: [
    { effectKind: "d20_test_natural_one_reroll" as const },
  ],
};

const mechanicalInterruptChoice = {
  kind: "nestedProcedure" as const,
  subject: {
    tag: "runtimeCommand" as const,
    actorId: "reactor-id",
    command: "releaseReadiedAction" as const,
    reactorId: "reactor-id",
  },
  initialHoles: [mechanicalNestedHole],
};

const runtimeInterruptResponderId = combatantId("mechanical-frontier-reactor");

const runtimeInterruptDecisionHole = {
  holeInstanceKey: holeInstanceKey("mechanical-frontier-decision-instance"),
  holeId: holeId("mechanical-frontier-decision-hole"),
  kind: "interruptDecision" as const,
  label: "After damage interrupt decision",
  trigger: "afterDamage" as const,
  eligibleResponders: [runtimeInterruptResponderId],
} satisfies BattleInterruptDecisionHole;

const runtimeInterruptChoice = {
  kind: "nestedProcedure" as const,
  subject: {
    tag: "runtimeCommand" as const,
    actorId: runtimeInterruptResponderId,
    command: "releaseReadiedAction" as const,
    reactorId: runtimeInterruptResponderId,
  },
  initialHoles: [],
} satisfies Extract<
  BattleInterruptProcedureChoice,
  { readonly kind: "nestedProcedure" }
>;

const runtimePendingInterrupt = {
  trigger: runtimeInterruptDecisionHole.trigger,
  decisionHole: runtimeInterruptDecisionHole,
  choices: [runtimeInterruptChoice],
  stackDepth: battleReplayStackDepth(1),
} satisfies NonNullable<BattleSnapshot["pendingInterrupt"]>;

type NeedsHolesResult = Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "needsHoles" }
>;

function ordinaryNeedsHolesResult(): NeedsHolesResult {
  const state = fighterVsGoblinBattle();
  const result = resolveBattleSubject({
    state,
    subject: fighterAttackSubject(state),
    fills: [],
  });
  if (result.tag !== "needsHoles") {
    throw new Error(`Expected ordinary needsHoles result, got ${result.tag}.`);
  }
  return result;
}

function frontierInput(
  result: NeedsHolesResult,
  holes: readonly BattleHole[],
  pendingInterrupt: BattleSnapshot["pendingInterrupt"],
) {
  return {
    result: {
      ...result,
      holes,
      snapshot: { ...result.snapshot, pendingInterrupt },
    },
    acceptedFills: [],
  };
}

describe("battle mechanical frontier", () => {
  test("round-trips a presentation-free mechanical hole", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)(
      mechanicalHole,
    );

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalHole });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation fields at the mechanical boundary", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)({
      ...mechanicalHole,
      label: "must not cross the boundary",
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("accepts recursively mechanical nested options without presentation labels", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)(
      mechanicalNestedHole,
    );

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalNestedHole });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation labels inside recursively mechanical nested options", () => {
    const decoded = Schema.decodeUnknownEither(BattleMechanicalHoleSchema)({
      ...mechanicalNestedHole,
      d20TestNaturalOneRerolls: [
        {
          ...mechanicalNestedHole.d20TestNaturalOneRerolls[0],
          label: "must not cross the boundary",
        },
      ],
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("accepts interrupt choices with recursively mechanical initial holes", () => {
    const decoded = Schema.decodeUnknownEither(
      BattleMechanicalInterruptChoiceSchema,
    )(mechanicalInterruptChoice);

    expect(Either.isRight(decoded)).toBe(true);
    expect(decoded).toMatchObject({ right: mechanicalInterruptChoice });
    expect(JSON.stringify(decoded)).not.toContain("label");
  });

  test("rejects presentation labels in interrupt choice initial holes", () => {
    const decoded = Schema.decodeUnknownEither(
      BattleMechanicalInterruptChoiceSchema,
    )({
      ...mechanicalInterruptChoice,
      initialHoles: [
        {
          ...mechanicalNestedHole,
          d20TestNaturalOneRerolls: [
            {
              ...mechanicalNestedHole.d20TestNaturalOneRerolls[0],
              label: "must not cross the boundary",
            },
          ],
        },
      ],
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });

  test("keeps ordinary and interrupt hole schemas structurally exclusive", () => {
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalOrdinaryHoleSchema)(
          mechanicalHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalOrdinaryHoleSchema)(
          mechanicalInterruptHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalInterruptDecisionHoleSchema)(
          mechanicalInterruptHole,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalInterruptDecisionHoleSchema)(
          mechanicalHole,
        ),
      ),
    ).toBe(true);
  });

  test("keeps ordinary and interrupt frontier branches structurally exclusive", () => {
    const ordinaryFrontier = {
      kind: "ordinaryHoles" as const,
      subject: {
        tag: "runtimeCommand" as const,
        actorId: "actor-id",
        command: "endTurn" as const,
      },
      holes: [mechanicalHole],
      acceptedFills: [],
    };
    const interruptFrontier = {
      kind: "interruptDecision" as const,
      decisionHole: mechanicalInterruptHole,
      choices: [mechanicalInterruptChoice],
    };

    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)(
          ordinaryFrontier,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)(
          interruptFrontier,
        ),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...ordinaryFrontier,
          holes: [mechanicalInterruptHole],
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...interruptFrontier,
          decisionHole: mechanicalHole,
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...ordinaryFrontier,
          label: "presentation must not cross the boundary",
        }),
      ),
    ).toBe(true);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleMechanicalFrontierSchema)({
          ...interruptFrontier,
          unknown: true,
        }),
      ),
    ).toBe(true);
  });

  test("projects an ordinary frontier without a pending interrupt", () => {
    const result = ordinaryNeedsHolesResult();

    const frontier = battleMechanicalFrontier(
      frontierInput(result, result.holes, null),
    );

    expect(Either.isRight(frontier)).toBe(true);
    if (Either.isLeft(frontier)) {
      throw new Error("Expected an ordinary mechanical frontier.");
    }
    if (frontier.right.kind !== "ordinaryHoles") {
      throw new Error("Expected an ordinary mechanical frontier.");
    }
    expect(frontier.right.holes).toHaveLength(result.holes.length);
    expect(frontier.right.acceptedFills).toEqual([]);
  });

  test("projects an interrupt frontier when its decision hole matches the checkpoint", () => {
    const result = ordinaryNeedsHolesResult();

    const frontier = battleMechanicalFrontier(
      frontierInput(result, [runtimeInterruptDecisionHole], {
        ...runtimePendingInterrupt,
        decisionHole: {
          ...runtimePendingInterrupt.decisionHole,
          label: "A different presentation label",
        },
      }),
    );

    expect(Either.isRight(frontier)).toBe(true);
    if (Either.isRight(frontier)) {
      expect(frontier.right).toEqual({
        kind: "interruptDecision",
        decisionHole: {
          holeInstanceKey: runtimeInterruptDecisionHole.holeInstanceKey,
          holeId: runtimeInterruptDecisionHole.holeId,
          kind: "interruptDecision",
          trigger: runtimeInterruptDecisionHole.trigger,
          eligibleResponders: runtimeInterruptDecisionHole.eligibleResponders,
        },
        choices: [runtimeInterruptChoice],
      });
    }
  });

  test("reports every mechanical frontier admission issue", () => {
    const result = ordinaryNeedsHolesResult();
    const [ordinaryHole] = result.holes;
    if (ordinaryHole === undefined) {
      throw new Error("Expected the ordinary test frontier to contain a hole.");
    }
    const emptyChoicesPendingInterrupt = {
      ...runtimePendingInterrupt,
      choices: [],
    } satisfies NonNullable<BattleSnapshot["pendingInterrupt"]>;
    const mismatchedPendingInterrupt = {
      ...runtimePendingInterrupt,
      decisionHole: {
        ...runtimePendingInterrupt.decisionHole,
        eligibleResponders: [],
      },
    } satisfies NonNullable<BattleSnapshot["pendingInterrupt"]>;
    const issueCases = [
      {
        name: "empty hole frontier",
        holes: [],
        pendingInterrupt: null,
        issue: { tag: "emptyHoleFrontier" },
      },
      {
        name: "mixed interrupt and ordinary holes",
        holes: [ordinaryHole, runtimeInterruptDecisionHole],
        pendingInterrupt: null,
        issue: { tag: "mixedInterruptAndOrdinaryHoles" },
      },
      {
        name: "ordinary frontier with pending interrupt",
        holes: result.holes,
        pendingInterrupt: runtimePendingInterrupt,
        issue: { tag: "ordinaryFrontierHasPendingInterrupt" },
      },
      {
        name: "interrupt frontier missing checkpoint",
        holes: [runtimeInterruptDecisionHole],
        pendingInterrupt: null,
        issue: { tag: "interruptFrontierMissingCheckpoint" },
      },
      {
        name: "interrupt frontier with empty choices",
        holes: [runtimeInterruptDecisionHole],
        pendingInterrupt: emptyChoicesPendingInterrupt,
        issue: { tag: "interruptFrontierChoiceSetEmpty" },
      },
      {
        name: "interrupt frontier decision-hole mismatch",
        holes: [runtimeInterruptDecisionHole],
        pendingInterrupt: mismatchedPendingInterrupt,
        issue: { tag: "interruptFrontierDecisionHoleMismatch" },
      },
    ] as const;

    for (const issueCase of issueCases) {
      const frontier = battleMechanicalFrontier(
        frontierInput(result, issueCase.holes, issueCase.pendingInterrupt),
      );
      expect(frontier, issueCase.name).toEqual(Either.left(issueCase.issue));
    }
  });
});
