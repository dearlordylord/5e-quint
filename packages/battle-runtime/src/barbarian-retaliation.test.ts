import { movementFeet } from "@dnd/shared/types";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.retaliation-reaction-attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-01-BARBARIAN-RETALIATION barbarian_retaliation
import { describe, expect, test } from "vitest";
import { Schema } from "effect";
import { classLevel } from "@dnd/shared/types";
import {
  BattleCheckpointFrontierEnvelopeSchema,
  BattleInterruptProcedureChoiceSchema,
  BattleSnapshotSchema,
  battleCheckpointFrontierEnvelope,
} from "./index.ts";
import {
  Either,
  attackRollFill,
  battleId,
  battleUnitSupportProfilesForUnit,
  characterBattleFeatureInitForTest,
  characterSeed,
  fighterId,
  fighterAttackSubject,
  attackExecutionSelectionForSubjectForTest,
  attackTargetDistanceSpatialFact,
  findHole,
  goblinAttackSubject,
  goblinId,
  interruptDecisionFill,
  requireHole,
  resolveBattleInterrupt,
  resolveBattleSubject,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  damageRollFill,
  battleFrontierInterruptDecisionForState,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type { BattleState } from "./battle-runtime.test-support.ts";
import { ATTACK_TARGET_HOLE_ID } from "./battle-reducer/battle-runtime-protocol.ts";

describe("battle runtime: Barbarian Retaliation", () => {
  test("opens an after-damage Reaction attack against the damaging creature within 5 feet", () => {
    const awaitingRetaliation = resolveGoblinScimitarDamage({
      state: barbarianRetaliationBattle(),
      includeRetaliationWitness: true,
    });

    expect(awaitingRetaliation).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
    });
    if (awaitingRetaliation.tag !== "needsHoles") {
      throw new Error("Expected Retaliation interrupt decision.");
    }
    const retaliationChoice = battleFrontierInterruptDecisionForState(
      awaitingRetaliation.state,
    )?.choices.find(
      (choice) =>
        choice.kind === "nestedProcedure" &&
        choice.subject.command === "retaliationAttack",
    );
    if (
      retaliationChoice === undefined ||
      retaliationChoice.kind !== "nestedProcedure" ||
      retaliationChoice.subject.command !== "retaliationAttack"
    ) {
      throw new Error("Expected a Retaliation codec fixture.");
    }
    const encoded = Schema.encodeSync(BattleCheckpointFrontierEnvelopeSchema)(
      battleCheckpointFrontierEnvelope(awaitingRetaliation.state),
    );
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleCheckpointFrontierEnvelopeSchema)(
          encoded,
        ),
      ),
    ).toBe(true);
    expect(() =>
      Schema.decodeUnknownSync(BattleInterruptProcedureChoiceSchema)(
        retaliationChoice,
      ),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleSnapshotSchema)(
        Schema.encodeSync(BattleSnapshotSchema)(awaitingRetaliation.snapshot),
      ),
    ).not.toThrow();
    const malformedRetaliationChoice = {
      ...retaliationChoice,
      subject: {
        ...retaliationChoice.subject,
        reactorId: goblinId,
      },
    };
    expect(() =>
      Schema.decodeUnknownSync(BattleInterruptProcedureChoiceSchema)({
        ...malformedRetaliationChoice,
      }),
    ).not.toThrow();
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)({
        ...encoded,
        frontier:
          encoded.frontier.kind === "interruptDecision"
            ? {
                ...encoded.frontier,
                choices: encoded.frontier.choices.map((choice) =>
                  choice.kind === "nestedProcedure" &&
                  choice.subject.command === "retaliationAttack"
                    ? {
                        ...choice,
                        subject: {
                          ...choice.subject,
                          reactorId: goblinId,
                        },
                      }
                    : choice,
                ),
              }
            : encoded.frontier,
      }),
    ).toThrow(
      "Battle checkpoint frontier references must be bound to the checkpoint and its subjects.",
    );
    const longswordSelection = attackExecutionSelectionForSubjectForTest(
      fighterAttackSubject(awaitingRetaliation.state, "Longsword"),
    );

    const startedRetaliation = resolveBattleInterrupt({
      state: awaitingRetaliation.state,
      fill: interruptDecisionFill(
        findHole(awaitingRetaliation.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: fighterId,
          choice: {
            kind: "retaliationAttack",
            selection: longswordSelection,
            fills: [
              {
                kind: "targetSpatialFacts",
                holeId: ATTACK_TARGET_HOLE_ID,
                spatialFacts: [
                  attackTargetDistanceSpatialFact(
                    fighterId,
                    goblinId,
                    longswordSelection,
                    movementFeet(5),
                  ),
                ],
              },
            ],
          },
        },
      ),
    });

    expect(startedRetaliation).toMatchObject({
      tag: "needsHoles",
      subject: expect.objectContaining({
        command: "retaliationAttack",
        reactorId: fighterId,
        targetId: goblinId,
        ...longswordSelection,
      }),
      holes: [{ kind: "attackRoll" }],
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: fighterId,
            hp: 6,
            reactionAvailable: false,
          }),
        ]),
      },
    });
  });

  test("does not offer Retaliation without the selected unit or within-5-foot damage witness", () => {
    const noSelectedUnit = resolveGoblinScimitarDamage({
      state: barbarianRetaliationBattle({ includeRetaliationUnit: false }),
      includeRetaliationWitness: true,
    });
    expect(noSelectedUnit).toMatchObject({ tag: "resolved" });

    const noWitness = resolveGoblinScimitarDamage({
      state: barbarianRetaliationBattle(),
      includeRetaliationWitness: false,
    });
    expect(noWitness).toMatchObject({ tag: "resolved" });
  });
});

function barbarianRetaliationBattle(input?: {
  readonly includeRetaliationUnit?: boolean;
}): BattleState {
  const includeRetaliationUnit = input?.includeRetaliationUnit ?? true;
  const retaliationUnit = unitLibrary.requireUnit("barbarian_retaliation");
  return startBattleRight({
    battleId: battleId("battle-barbarian-retaliation"),
    combatants: [
      statBlockCreatureInit({ initiative: 20 }),
      characterSeed({
        combatantId: fighterId,
        displayName: "Berserker",
        initiative: 10,
        classLevels: [{ className: "barbarian", level: 10 }],
        unitFeatures: includeRetaliationUnit
          ? [
              characterBattleFeatureInitForTest(retaliationUnit, [
                { className: "barbarian", level: classLevel(10) },
              ]),
            ]
          : [],
        characterUnitRefs: includeRetaliationUnit
          ? [
              {
                unit: unitLibrary.requireUnit(retaliationUnit.id),
                supportProfiles: retaliationSupportProfiles(),
              },
            ]
          : [],
      }),
    ],
  });
}

function retaliationSupportProfiles() {
  const unit = unitLibrary.requireUnit("barbarian_retaliation");
  const supportProfiles = battleUnitSupportProfilesForUnit({ unit });
  if (Either.isLeft(supportProfiles)) {
    throw new Error(supportProfiles.left.message);
  }
  return supportProfiles.right;
}

function resolveGoblinScimitarDamage(input: {
  readonly state: BattleState;
  readonly includeRetaliationWitness: boolean;
}) {
  const subject = goblinAttackSubject(input.state, "Scimitar");
  const target = requireHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  if (target.kind !== "targetChoice" || target.attack === undefined) {
    throw new Error("Expected Stat Block attack target context.");
  }
  const targetFacts = [
    {
      kind: "attackTargetDistance" as const,
      actorId: goblinId,
      targetId: fighterId,
      distanceFeet: movementFeet(5),
      ...target.attack.selection,
    },
    ...(input.includeRetaliationWitness
      ? [
          {
            kind: "retaliationDamagerWithinFiveFeet" as const,
            damagedId: fighterId,
            damageSourceId: goblinId,
          },
        ]
      : []),
  ];
  const targetFilled = targetFill(target, fighterId, targetFacts);
  const attackRoll = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetFilled],
    }),
    "attackRoll",
  );
  const attackRolled = attackRollFill(attackRoll, {
    total: 20,
    naturalD20: 15,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [targetFilled, attackRolled],
    }),
    "rolledDice",
  );
  return resolveBattleSubject({
    state: input.state,
    subject,
    fills: [targetFilled, attackRolled, damageRollFill(damage, 4)],
  });
}
