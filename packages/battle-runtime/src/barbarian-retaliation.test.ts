// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.retaliation-reaction-attack
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L110D-01-BARBARIAN-RETALIATION barbarian_retaliation
import { describe, expect, test } from "vitest";
import { classLevel } from "@dnd/shared/types";
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
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import type { BattleState } from "./battle-runtime.test-support.ts";

describe("battle runtime: Barbarian Retaliation", () => {
  test("opens an after-damage Reaction attack against the damaging creature within 5 feet", () => {
    const awaitingRetaliation = resolveGoblinScimitarDamage({
      state: barbarianRetaliationBattle(),
      includeRetaliationWitness: true,
    });

    expect(awaitingRetaliation).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "afterDamage" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "afterDamage",
          choices: expect.arrayContaining([
            expect.objectContaining({
              kind: "retaliationAttack",
              reactorId: fighterId,
              subject: expect.objectContaining({
                command: "retaliationAttack",
                reactorId: fighterId,
                targetId: goblinId,
                procedureRef: expect.any(String),
                attackDamageType: "slashing",
              }),
            }),
            expect.objectContaining({
              kind: "retaliationAttack",
              reactorId: fighterId,
              subject: expect.objectContaining({
                command: "retaliationAttack",
                reactorId: fighterId,
                targetId: goblinId,
                procedureRef: expect.any(String),
                attackDamageType: "bludgeoning",
              }),
            }),
          ]),
        },
      },
    });
    if (awaitingRetaliation.tag !== "needsHoles") {
      throw new Error("Expected Retaliation interrupt decision.");
    }
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
            reactorId: fighterId,
            selection: longswordSelection,
            fills: [],
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
      kind: "attackTargetInMeleeReach" as const,
      actorId: goblinId,
      targetId: fighterId,
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
