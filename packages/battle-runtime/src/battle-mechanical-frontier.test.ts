import { Either, Schema } from "effect";
import { describe, expect, test } from "vitest";

import {
  BattleMechanicalFrontierSchema,
  BattleMechanicalHoleSchema,
  BattleMechanicalInterruptChoiceSchema,
  BattleMechanicalInterruptDecisionHoleSchema,
  BattleMechanicalOrdinaryHoleSchema,
} from "./battle-mechanical-frontier.ts";

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
  });
});
