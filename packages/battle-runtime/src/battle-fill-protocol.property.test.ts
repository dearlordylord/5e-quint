import fc from "fast-check";
import { describe, expect, test } from "vitest";

import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { characterSpellProcedure } from "./character-execution-queries.ts";
import {
  parseAttackRollRelationshipFacts,
  parseSavingThrowRelationshipFacts,
  parseSpellTargetListRelationshipFacts,
} from "./battle-reducer/roll-trigger-relationship-facts.ts";
import { attackFillSet } from "./battle-reducer/attack-fill-set.ts";
import {
  selectedSpellAttackDamageProcedure,
  applyPreparedSlotSpellDamage,
  applySpellDamage,
  carefulSpellProtectedTargetsHole,
  spellConditionChoiceHole,
  spellDamageByTypeForTarget,
  spellDamageTypes,
  spellDamageTypeChoiceHole,
  spellRollModifierTargetAbilityChoicesHoleId,
  spellSavingThrowOutcomeHole,
  spellSavingThrowAbility,
  validatePreparedSlotSpellDamageGroups,
  validateSpellBurstDamageFill,
  validateSpellHealingFill,
} from "./battle-reducer/spells-damage-fills.ts";
import {
  parseSpellCastReactionFactsFill,
  spellFillSet,
} from "./battle-reducer/spells-resolve-fill-set.ts";
import {
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
} from "./battle-reducer/domain-constants.ts";
import {
  armorClass,
  attackExecutionSelectionForSubjectForTest,
  attackInitialTargetHole,
  attackTargetSpatialFact,
  attackRollHoleAfterTarget,
  battleId,
  battleProcedureExecutionRefForTest,
  battleProcedureExecutionRefForSpellHoleForTest,
  characterSeed,
  damageRollFill,
  damageRollFillWithGroups,
  discoverBattleActs,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findAct,
  goblinId,
  magicSubject,
  movementFill,
  movementFeet,
  objectTargetFill,
  Hp,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  greataxeWeaponMasterySelections,
  startBattleSessionRight,
  startBattleRight,
  statBlockCreatureInit,
  targetFill,
  unitLibrary,
  unitFeatureDecisionFill,
  grappleOutcomeFill,
  grapplerUnitRefs,
  masteryCleaveUnitRefs,
  recklessAttackFeature,
  supportedBattleUnitRef,
  wizardId,
  wizardSpellcasting,
  snapshotBattle,
  holeId,
  attackRollFill,
  attackTargetFill,
  attackTargetDistanceSpatialFact,
  testGreataxeAttack,
  testLongswordAttack,
  rageResource,
  requireCharacterUnitProcedureRefForTest,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleSubject,
} from "./battle-runtime.test-support.ts";
import { spellTargetListFill } from "./unit-profile-admission-spell-fill.test-support.ts";
import type { BattleUnitRef } from "./index.ts";
import type { RuntimeDamageSpellProcedure } from "./battle-reducer/spells-damage-fills.ts";
import { combatantId, type CombatantId } from "./identity.ts";

const PROPERTY_OPTIONS = { numRuns: 64, seed: 0x5eed18 } as const;

function expectInvalid(
  result: ReturnType<typeof resolveBattleSubject>,
  message: string,
): void {
  expect(result).toMatchObject({
    tag: "invalid",
    reason: "invalidFill",
    message,
  });
}

function stateSnapshot(state: BattleState): ReturnType<typeof snapshotBattle> {
  return snapshotBattle(state);
}

function canonicalAttackFills(input: {
  readonly state: BattleState;
  readonly subject?: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
  readonly total?: number;
  readonly naturalD20?: number;
}): {
  readonly state: BattleState;
  readonly subject: Extract<
    BattleSubject,
    { readonly tag: "action"; readonly action: "attack" }
  >;
  readonly target: BattleHole;
  readonly targetFill: BattleFill;
  readonly roll: BattleHole;
  readonly rollFill: BattleFill;
  readonly damage: BattleHole;
  readonly damageFill: BattleFill;
  readonly complete: readonly BattleFill[];
} {
  const subject = input.subject ?? fighterAttackSubject(input.state);
  const target = requireHole(
    resolveBattleSubject({ state: input.state, subject, fills: [] }),
    "targetChoice",
  );
  const selectedTarget = attackTargetFill(target, subject.actorId, goblinId);
  const roll = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [selectedTarget],
    }),
    "attackRoll",
  );
  const selectedRoll = attackRollFill(roll, {
    total: input.total ?? 15,
    naturalD20: input.naturalD20 ?? 10,
  });
  const damage = requireHole(
    resolveBattleSubject({
      state: input.state,
      subject,
      fills: [selectedTarget, selectedRoll],
    }),
    "rolledDice",
  );
  const selectedDamage = damageRollFill(damage, 2);
  return {
    state: input.state,
    subject,
    target,
    targetFill: selectedTarget,
    roll,
    rollFill: selectedRoll,
    damage,
    damageFill: selectedDamage,
    complete: [selectedTarget, selectedRoll, selectedDamage],
  };
}

function assertFrontier(
  state: BattleState,
  subject: BattleSubject,
  fills: readonly BattleFill[],
  kinds: readonly BattleHole["kind"][],
): void {
  const result = resolveBattleSubject({ state, subject, fills });
  expect(result.tag).toBe("needsHoles");
  if (result.tag === "needsHoles") {
    expect(result.holes.map((hole) => hole.kind)).toEqual(kinds);
  }
}

describe("battle fill protocol boundary owners", () => {
  test("relationship parsers cover deterministic empty, valid, duplicate, and wrong-identity cases", () => {
    const attacker = combatantId("relationship-attacker");
    const target = combatantId("relationship-target");
    const otherTarget = combatantId("relationship-other-target");
    const sourceProcedureRef =
      battleProcedureExecutionRefForTest("relationship-spell");
    const attackFact = {
      kind: "attackRollTargetIsEnemy" as const,
      attackerId: attacker,
      targetId: target,
      targetIsEnemy: true,
    };
    const savingFact = {
      kind: "savingThrowTargetIsEnemy" as const,
      actorId: attacker,
      targetId: target,
      targetIsEnemy: true,
    };
    const targetListFact = {
      kind: "spellTargetIsHostileToCaster" as const,
      casterId: attacker,
      targetId: target,
      sourceProcedureRef,
      targetIsHostileToCaster: true,
    };

    const attackCases = [
      { facts: [], required: true, expected: null },
      { facts: [], required: false, expected: [] },
      { facts: [attackFact], required: false, expected: null },
      { facts: [attackFact], required: true, expected: [attackFact] },
      { facts: [attackFact, attackFact], required: true, expected: null },
      {
        facts: [{ ...attackFact, targetId: otherTarget }],
        required: true,
        expected: null,
      },
    ] as const;
    for (const testCase of attackCases) {
      expect(
        parseAttackRollRelationshipFacts(
          testCase.facts,
          attacker,
          target,
          testCase.required,
        ),
      ).toEqual(testCase.expected);
    }

    const savingCases = [
      { facts: [], targets: [], required: false, expected: [] },
      { facts: [], targets: [target], required: true, expected: null },
      {
        facts: [savingFact],
        targets: [target],
        required: false,
        expected: null,
      },
      {
        facts: [savingFact],
        targets: [target],
        required: true,
        expected: [savingFact],
      },
      {
        facts: [savingFact, savingFact],
        targets: [target],
        required: true,
        expected: null,
      },
      {
        facts: [{ ...savingFact, targetId: otherTarget }],
        targets: [target],
        required: true,
        expected: null,
      },
    ] as const;
    for (const testCase of savingCases) {
      expect(
        parseSavingThrowRelationshipFacts(
          testCase.facts,
          attacker,
          testCase.targets,
          testCase.required,
        ),
      ).toEqual(testCase.expected);
    }

    const targetListCases = [
      {
        facts: [targetListFact],
        targets: [target],
        expected: [targetListFact],
      },
      { facts: [], targets: [target], expected: null },
      {
        facts: [targetListFact, targetListFact],
        targets: [target],
        expected: null,
      },
      {
        facts: [{ ...targetListFact, targetId: otherTarget }],
        targets: [target],
        expected: null,
      },
      {
        facts: [
          {
            ...targetListFact,
            sourceProcedureRef: battleProcedureExecutionRefForTest("other"),
          },
        ],
        targets: [target],
        expected: null,
      },
    ] as const;
    for (const testCase of targetListCases) {
      expect(
        parseSpellTargetListRelationshipFacts(
          testCase.facts,
          attacker,
          sourceProcedureRef,
          testCase.targets,
        ),
      ).toEqual(testCase.expected);
    }

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10_000 }),
        fc.boolean(),
        (caseId, targetIsEnemy) => {
          const generatedAttacker = combatantId(
            `relationship-attacker-${caseId}`,
          );
          const generatedTarget = combatantId(`relationship-target-${caseId}`);
          const differentTarget = combatantId(
            `relationship-other-target-${caseId}`,
          );
          const matchingFact = {
            kind: "attackRollTargetIsEnemy" as const,
            attackerId: generatedAttacker,
            targetId: generatedTarget,
            targetIsEnemy,
          };

          expect(
            parseAttackRollRelationshipFacts(
              [matchingFact],
              generatedAttacker,
              generatedTarget,
              true,
            ),
          ).toEqual([matchingFact]);
          expect(
            parseAttackRollRelationshipFacts(
              [{ ...matchingFact, targetId: differentTarget }],
              generatedAttacker,
              generatedTarget,
              true,
            ),
          ).toBeNull();
          expect(
            parseAttackRollRelationshipFacts(
              [matchingFact, matchingFact],
              generatedAttacker,
              generatedTarget,
              true,
            ),
          ).toBeNull();
        },
      ),
      PROPERTY_OPTIONS,
    );
  });

  test("canonical attack prefixes expose the next hole and preserve state on duplicate or incompatible fills", () => {
    const catalog = canonicalAttackFills({ state: fighterVsGoblinBattle() });
    assertFrontier(catalog.state, catalog.subject, [], ["targetChoice"]);
    assertFrontier(
      catalog.state,
      catalog.subject,
      [catalog.targetFill],
      ["attackRoll"],
    );
    assertFrontier(
      catalog.state,
      catalog.subject,
      [catalog.targetFill, catalog.rollFill],
      ["rolledDice"],
    );

    const canonical = requireResolved(
      resolveBattleSubject({
        state: catalog.state,
        subject: catalog.subject,
        fills: catalog.complete,
      }),
    );
    expect(canonical.tag).toBe("resolved");

    const duplicateCases = [
      {
        fills: [catalog.targetFill, catalog.targetFill],
        message: "Attack target was filled twice.",
      },
      {
        fills: [catalog.targetFill, catalog.rollFill, catalog.rollFill],
        message: "Attack roll was filled twice.",
      },
      {
        fills: [
          catalog.targetFill,
          catalog.rollFill,
          catalog.damageFill,
          catalog.damageFill,
        ],
        message: "Attack damage was filled twice.",
      },
    ] as const;
    for (const duplicate of duplicateCases) {
      const before = stateSnapshot(catalog.state);
      const result = resolveBattleSubject({
        state: catalog.state,
        subject: catalog.subject,
        fills: duplicate.fills,
      });
      expectInvalid(result, duplicate.message);
      expect(stateSnapshot(catalog.state)).toEqual(before);
    }

    const wrongHole = {
      ...catalog.targetFill,
      holeId: catalog.roll.holeId,
    } as BattleFill;
    const wrongKind = {
      kind: "abilityCheck" as const,
      holeId: catalog.target.holeId,
      value: { total: 10 },
    } as BattleFill;
    for (const fill of [wrongHole]) {
      const before = stateSnapshot(catalog.state);
      const result = resolveBattleSubject({
        state: catalog.state,
        subject: catalog.subject,
        fills: [fill],
      });
      expectInvalid(
        result,
        "Target choice fill uses an unexpected Attack hole.",
      );
      expect(stateSnapshot(catalog.state)).toEqual(before);
    }
    expectInvalid(
      resolveBattleSubject({
        state: catalog.state,
        subject: catalog.subject,
        fills: [catalog.targetFill, wrongKind],
      }),
      "Fill abilityCheck does not match the Attack replay holes.",
    );

    const targetValue = catalog.targetFill as Extract<
      BattleFill,
      { readonly kind: "targetChoice" }
    >;
    const duplicateSight = {
      ...targetValue,
      spatialFacts: [
        ...(targetValue.spatialFacts ?? []),
        {
          kind: "attackAttackerCannotSeeTarget" as const,
          attackerId: catalog.subject.actorId,
          targetId: goblinId,
        },
        {
          kind: "attackAttackerCannotSeeTarget" as const,
          attackerId: catalog.subject.actorId,
          targetId: goblinId,
        },
      ],
    };
    expectInvalid(
      resolveBattleSubject({
        state: catalog.state,
        subject: catalog.subject,
        fills: [duplicateSight],
      }),
      "Attack sight facts must contain at most one witness for each direction, attacker, and target.",
    );
  });

  test("attack fill-set accepts canonical target spatial facts and rejects duplicate facts deterministically", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state);
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = attackTargetFill(target, fighterId, goblinId);
    const targetSpatial = {
      kind: "targetSpatialFacts" as const,
      holeId: target.holeId,
      spatialFacts: targetChoice.spatialFacts ?? [],
    } as const;
    expect(attackFillSet([targetSpatial], fighterId, state).tag).toBe("ok");
    expect(
      attackFillSet(
        [
          targetSpatial,
          {
            ...targetSpatial,
            spatialFacts: [
              ...targetSpatial.spatialFacts,
              ...targetSpatial.spatialFacts,
            ],
          },
        ],
        fighterId,
        state,
      ),
    ).toMatchObject({
      tag: "invalid",
      message: "Attack target spatial facts were filled twice.",
    });
  });

  test("rejects duplicate attack-target distance facts deterministically", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state);
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    if (target.attack === undefined) {
      throw new Error("Expected the ordinary attack target selection.");
    }
    const targetChoice = attackTargetFill(target, fighterId, goblinId);
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          {
            ...targetChoice,
            spatialFacts: [
              ...(targetChoice.spatialFacts ?? []),
              attackTargetDistanceSpatialFact(
                fighterId,
                goblinId,
                target.attack.selection,
                movementFeet(10),
              ),
            ],
          },
        ],
      }),
      "Attack target distance facts must contain at most one distance for each actor, target, and attack.",
    );
  });

  test("canonical Brutal Strike effect and Forceful Blow frontiers reject duplicates and wrong movement facts", () => {
    const brutalStrikeUnit = unitLibrary.requireUnit("barbarian_brutal_strike");
    const state = startBattleRight({
      battleId: battleId("boundary-brutal-strike"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [{ className: "barbarian", level: 9 }],
          unitFeatures: [recklessAttackFeature()],
          characterUnitRefs: [supportedBattleUnitRef(brutalStrikeUnit)],
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = fighterAttackSubject(state);
    const target = attackInitialTargetHole(state, subject);
    const targetChoice = targetFill(target, goblinId);
    const useDecision = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice] }),
      "unitFeatureDecision",
    );
    const useDecisionFill = unitFeatureDecisionFill(useDecision, "use");
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, useDecisionFill],
      }),
      "attackRoll",
    );
    const attackRollValue = attackRollFill(attackRoll, {
      total: 15,
      naturalD20: 10,
    });
    const effect = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, useDecisionFill, attackRollValue],
      }),
      "unitFeatureDecision",
    );
    const effectDecline = unitFeatureDecisionFill(effect, "decline");
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          useDecisionFill,
          attackRollValue,
          effectDecline,
          effectDecline,
        ],
      }),
      "Brutal Strike effect decision was filled twice.",
    );

    const forceful = unitFeatureDecisionFill(effect, "forceful_blow");
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, useDecisionFill, attackRollValue, forceful],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFillWithGroups(damage, [[1], [1]]);
    const movementDecision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          useDecisionFill,
          attackRollValue,
          forceful,
          damageFill,
        ],
      }),
      "unitFeatureDecision",
    );
    const useMovement = unitFeatureDecisionFill(movementDecision, "use");
    const movement = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          useDecisionFill,
          attackRollValue,
          forceful,
          damageFill,
          useMovement,
        ],
      }),
      "movement",
    );
    const malformedMovement = movementFill(movement, {
      movementCostFeet: 10,
      provokedOpportunityAttacks: [],
    });
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          useDecisionFill,
          attackRollValue,
          forceful,
          damageFill,
          useMovement,
          malformedMovement,
        ],
      }),
      "Brutal Strike Forceful Blow movement requires the straight-toward-target fact.",
    );
    const canonicalMovement = {
      ...malformedMovement,
      value: {
        ...malformedMovement.value,
        brutalStrikeForcefulBlow: {
          kind: "brutalStrikeForcefulBlowStraightTowardTarget" as const,
          targetId: goblinId,
        },
      },
    } as Extract<BattleFill, { readonly kind: "movement" }>;
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          useDecisionFill,
          attackRollValue,
          forceful,
          damageFill,
          unitFeatureDecisionFill(movementDecision, "decline"),
          canonicalMovement,
        ],
      }),
      "Declined Brutal Strike Forceful Blow movement cannot include a path.",
    );
  });

  test("canonical Grappler Punch and Grab rejects outcome without use and preserves valid prefix frontier", () => {
    const state = fighterVsGoblinBattle({
      characterUnitRefs: grapplerUnitRefs(),
    });
    const subject = fighterAttackSubject(state, "Unarmed Strike");
    const target = attackInitialTargetHole(state, subject);
    const targetChoice = attackTargetFill(target, fighterId, goblinId);
    const roll = attackRollHoleAfterTarget(state, target, subject);
    const rollFill = attackRollFill(roll, { total: 17, naturalD20: 12 });
    const decision = requireHole(
      resolveBattleSubject({ state, subject, fills: [targetChoice, rollFill] }),
      "unitFeatureDecision",
    );
    const outcome = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          rollFill,
          unitFeatureDecisionFill(decision, "use"),
        ],
      }),
      "grappleOutcome",
    );
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, rollFill, grappleOutcomeFill(outcome, false)],
      }),
      "Grappler Punch and Grab outcome requires choosing to use Punch and Grab.",
    );
    assertFrontier(
      state,
      subject,
      [targetChoice, rollFill],
      ["unitFeatureDecision"],
    );
    expect(
      requireResolved(
        resolveBattleSubject({
          state,
          subject,
          fills: [
            targetChoice,
            rollFill,
            unitFeatureDecisionFill(decision, "decline"),
          ],
        }),
      ).state.grapples,
    ).toEqual([]);
  });

  test("canonical Cleave prefixes preserve the second-target sequence and reject duplicates", () => {
    const state = startBattleRight({
      battleId: battleId("boundary-cleave"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: masteryCleaveUnitRefs(),
          weaponMasteries: greataxeWeaponMasterySelections(),
          attack: testGreataxeAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Cleave second target",
          initiative: 9,
        }),
      ],
    });
    const subject = fighterAttackSubject(state, "Greataxe");
    const target = attackInitialTargetHole(state, subject);
    const primaryTarget = attackTargetFill(
      target,
      fighterId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    );
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [primaryTarget] }),
      "attackRoll",
    );
    const primaryRoll = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [primaryTarget, primaryRoll],
      }),
      "rolledDice",
    );
    const primaryDamage = damageRollFill(damage, 1);
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [primaryTarget, primaryRoll, primaryDamage],
      }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Cleave",
      choices: ["use", "decline"],
    });
    const use = unitFeatureDecisionFill(decision, "use");
    const cleaveTarget = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [primaryTarget, primaryRoll, primaryDamage, use],
      }),
      "targetChoice",
    );
    const cleaveTargetFill = targetFill(cleaveTarget, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "cleaveSecondTargetWithin5FeetOfFirstTarget" as const,
        attackerId: fighterId,
        firstTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const cleaveRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          primaryTarget,
          primaryRoll,
          primaryDamage,
          use,
          cleaveTargetFill,
        ],
      }),
      "attackRoll",
    );
    const cleaveRollFill = attackRollFill(cleaveRoll, {
      total: 15,
      naturalD20: 10,
    });
    const cleaveDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          primaryTarget,
          primaryRoll,
          primaryDamage,
          use,
          cleaveTargetFill,
          cleaveRollFill,
        ],
      }),
      "rolledDice",
    );
    const cleaveDamageFill = damageRollFill(cleaveDamage, 1);
    const complete = [
      primaryTarget,
      primaryRoll,
      primaryDamage,
      use,
      cleaveTargetFill,
      cleaveRollFill,
      cleaveDamageFill,
    ];
    expect(
      requireResolved(resolveBattleSubject({ state, subject, fills: complete }))
        .tag,
    ).toBe("resolved");
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [...complete, use],
      }),
      "Weapon Mastery Cleave decision was filled twice.",
    );
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [...complete, cleaveTargetFill],
      }),
      "Weapon Mastery Cleave target was filled twice.",
    );
  });

  test("canonical Horde Breaker prefixes preserve the extra-attack target sequence", () => {
    const session = startBattleSessionRight({
      battleId: battleId("boundary-horde-breaker"),
      combatants: [
        characterSeed({
          initiative: 20,
          characterUnitRefs: [huntersPreyHordeBreakerUnitRef()],
          attack: testLongswordAttack(),
        }),
        statBlockCreatureInit({ initiative: 10 }),
        statBlockCreatureInit({
          combatantId: skeletonId,
          displayName: "Horde Breaker second target",
          initiative: 9,
        }),
      ],
    });
    const state = session.state;
    const subject = fighterAttackSubject(state, "Longsword");
    const target = attackInitialTargetHole(state, subject);
    const primaryTarget = attackTargetFill(
      target,
      fighterId,
      goblinId,
      attackExecutionSelectionForSubjectForTest(subject),
    );
    const roll = requireHole(
      resolveBattleSubject({ state, subject, fills: [primaryTarget] }),
      "attackRoll",
    );
    const primaryRoll = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [primaryTarget, primaryRoll],
      }),
      "rolledDice",
    );
    const primaryDamage = damageRollFill(damage, 1);
    const decision = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [primaryTarget, primaryRoll, primaryDamage],
      }),
      "unitFeatureDecision",
    );
    expect(decision).toMatchObject({
      label: "Use Horde Breaker",
      choices: ["use", "decline"],
    });
    const use = unitFeatureDecisionFill(decision, "use");
    const secondTarget = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [primaryTarget, primaryRoll, primaryDamage, use],
      }),
      "targetChoice",
    );
    const secondTargetFill = targetFill(secondTarget, skeletonId, [
      attackTargetSpatialFact(
        fighterId,
        skeletonId,
        attackExecutionSelectionForSubjectForTest(subject),
      ),
      {
        kind: "hordeBreakerSecondTargetEligible" as const,
        attackerId: fighterId,
        sourceProcedureRef:
          battleProcedureExecutionRefForSpellHoleForTest(secondTarget),
        originalTargetId: goblinId,
        secondTargetId: skeletonId,
      },
    ]);
    const secondRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          primaryTarget,
          primaryRoll,
          primaryDamage,
          use,
          secondTargetFill,
        ],
      }),
      "attackRoll",
    );
    const secondRollFill = attackRollFill(secondRoll, {
      total: 15,
      naturalD20: 10,
    });
    const secondDamage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          primaryTarget,
          primaryRoll,
          primaryDamage,
          use,
          secondTargetFill,
          secondRollFill,
        ],
      }),
      "rolledDice",
    );
    const complete = [
      primaryTarget,
      primaryRoll,
      primaryDamage,
      use,
      secondTargetFill,
      secondRollFill,
      damageRollFill(secondDamage, 1),
    ];
    const resolved = requireResolved(
      resolveBattleSubject({ state, subject, fills: complete }),
    );
    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(Hp(6));
    expectInvalid(
      resolveBattleSubject({
        state,
        subject,
        fills: [...complete, secondTargetFill],
      }),
      "Hunter's Prey Horde Breaker target was filled twice.",
    );
  });

  test("canonical creature and object spell workflows cover ordered prefixes and duplicate/incompatible fills", () => {
    const session = startBattleSessionRight({
      battleId: battleId("boundary-spell-attack"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast"), spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const act = findAct(session, magicSubject("eldritch_blast"));
    const subject = act.subject;
    const targetHoles = act.initialHoles.filter(
      (hole) => hole.kind === "targetChoice",
    );
    const objectHoles = act.initialHoles.filter(
      (hole) => hole.kind === "objectTargetChoice",
    );
    expect(targetHoles.length).toBeGreaterThan(0);
    expect(objectHoles.length).toBeGreaterThan(1);
    const targetHole = targetHoles[0];
    const objectHole = objectHoles[1];
    if (targetHole === undefined || objectHole === undefined) {
      throw new Error("Expected two spell-object target holes.");
    }
    const target = targetFill(targetHole, skeletonId);
    const objectBase = objectTargetFill({
      hole: objectHole,
      casterId: wizardId,
      rangeFeet: movementFeet(120),
      armorClass: armorClass(13),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(5) },
    });
    const objectSpatialFact = objectBase.spatialFacts.find(
      (fact) => fact.kind === "spellObjectTarget",
    );
    if (objectSpatialFact === undefined) {
      throw new Error("Expected object-target sight fact.");
    }
    const object = {
      ...objectBase,
      spatialFacts: [
        ...objectBase.spatialFacts,
        {
          kind: "spellObjectTargetSight" as const,
          casterId: wizardId,
          objectId: objectBase.value,
          sourceProcedureRef: objectSpatialFact.sourceProcedureRef,
          attackerCanSeeObject: true,
        },
      ],
    };
    const firstRoll = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [target, object],
      }),
      "attackRoll",
    );
    const firstRollFill = attackRollFill(firstRoll, {
      total: 20,
      naturalD20: 20,
    });
    const firstDamage = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [target, object, firstRollFill],
      }),
      "rolledDice",
    );
    const firstDamageFill = damageRollFillWithGroups(firstDamage, [[6, 6]]);
    const secondRoll = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [target, object, firstRollFill, firstDamageFill],
      }),
      "attackRoll",
    );
    assertFrontier(session.state, subject, [target, object], ["attackRoll"]);
    const duplicate = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [target, target],
    });
    expectInvalid(duplicate, "Spell attack sequence target was filled twice.");
    const wrongObject = { ...object, holeId: firstRoll.holeId } as BattleFill;
    expectInvalid(
      resolveBattleSubject({
        state: session.state,
        subject,
        fills: [target, wrongObject],
      }),
      "Object target fill does not match this spell act.",
    );
    expect(secondRoll.kind).toBe("attackRoll");
  });

  test("canonical spell invocations drive ignored-fill, object-sight, sequence-frontier, and roll-modifier boundaries", () => {
    const sequenceSession = startBattleSessionRight({
      battleId: battleId("boundary-spell-parser-sequence"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("eldritch_blast")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const sequenceAct = findAct(
      sequenceSession,
      magicSubject("eldritch_blast"),
    );
    const sequenceInvocation = characterSpellProcedureFromAct(
      sequenceSession.state,
      sequenceAct,
      wizardId,
    );
    if (sequenceInvocation?.procedure !== "spellAttackSequence") {
      throw new Error("Expected the canonical multi-part spell invocation.");
    }
    const movementDecision = {
      kind: "unitFeatureDecision" as const,
      holeId: REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
      value: "use" as const,
    };
    const movement = movementFill(
      {
        kind: "movement",
        holeId: REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
      } as BattleHole,
      { movementCostFeet: 5, provokedOpportunityAttacks: [] },
    );
    expect(
      spellFillSet(
        [movementDecision],
        sequenceInvocation,
        sequenceInvocation.sourceProcedureRef,
        wizardId,
        sequenceSession.state,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Remarkable Athlete movement decision must follow a spell attack sequence attack roll.",
    });
    expect(
      spellFillSet(
        [movement],
        sequenceInvocation,
        sequenceInvocation.sourceProcedureRef,
        wizardId,
        sequenceSession.state,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Remarkable Athlete movement must follow a spell attack sequence use decision.",
    });
    expect(
      parseSpellCastReactionFactsFill({
        kind: "abilityCheck",
        holeId: holeId("not-reaction"),
        value: { total: 10 },
      }),
    ).toEqual({ tag: "notSpellCastReactionFactsFill" });

    const slowSession = startBattleSessionRight({
      battleId: battleId("boundary-spell-parser-slow"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("slow")],
            spellSlots: [{ spellLevel: 3, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const slowAct = findAct(slowSession, magicSubject("slow"));
    const slowInvocation = characterSpellProcedureFromAct(
      slowSession.state,
      slowAct,
      wizardId,
    );
    if (slowInvocation === undefined) {
      throw new Error("Expected canonical Slow invocation.");
    }
    const ignoredFill = {
      kind: "slowSomaticSpellFailureOutcome" as const,
      holeId: holeId("boundary-slow-failure"),
      value: { spellFailed: false },
    };
    expect(
      spellFillSet(
        [ignoredFill],
        slowInvocation,
        slowInvocation.sourceProcedureRef,
        wizardId,
        slowSession.state,
      ),
    ).toMatchObject({ tag: "ok" });

    const blindnessSession = startBattleSessionRight({
      battleId: battleId("boundary-spell-condition-choice"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("blindness_deafness")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const blindnessAct = findAct(
      blindnessSession,
      magicSubject("blindness_deafness"),
    );
    const blindnessInvocation = characterSpellProcedureFromAct(
      blindnessSession.state,
      blindnessAct,
      wizardId,
    );
    if (
      blindnessInvocation?.procedure !== "saveGatedCondition" ||
      blindnessInvocation.effect.kind !== "choice"
    ) {
      throw new Error(
        "Expected canonical Blindness/Deafness condition choice.",
      );
    }
    expect(
      spellConditionChoiceHole(
        blindnessInvocation as Parameters<typeof spellConditionChoiceHole>[0],
      ).choices,
    ).toEqual(["blinded", "deafened"]);

    const rollModifierSession = startBattleSessionRight({
      battleId: battleId("boundary-spell-parser-roll-modifier"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("enhance_ability")],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const rollModifierAct = findAct(
      rollModifierSession,
      magicSubject("enhance_ability"),
    );
    const rollModifierInvocation = characterSpellProcedureFromAct(
      rollModifierSession.state,
      rollModifierAct,
      wizardId,
    );
    if (rollModifierInvocation?.procedure !== "rollModifier") {
      throw new Error("Expected canonical roll-modifier invocation.");
    }
    expect(spellSavingThrowAbility(rollModifierInvocation)).toBe(
      rollModifierInvocation.saveGate?.ability ?? "cha",
    );
    const targetAbilityFill = {
      kind: "targetAbilityChoices" as const,
      holeId: spellRollModifierTargetAbilityChoicesHoleId(
        rollModifierInvocation,
      ),
      value: { choices: [{ targetId: skeletonId, ability: "str" as const }] },
    };
    expect(
      spellFillSet(
        [targetAbilityFill],
        rollModifierInvocation,
        rollModifierInvocation.sourceProcedureRef,
        wizardId,
        rollModifierSession.state,
      ),
    ).toMatchObject({
      tag: "invalid",
      message: "Spell target ability choices do not match this spell act.",
    });

    const commandSession = startBattleSessionRight({
      battleId: battleId("boundary-spell-target-list-relationship"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("command")],
            spellSlots: [{ spellLevel: 1, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const commandAct = findAct(commandSession, magicSubject("command"));
    const commandInvocation = characterSpellProcedureFromAct(
      commandSession.state,
      commandAct,
      wizardId,
    );
    if (commandInvocation?.procedure !== "command") {
      throw new Error("Expected canonical Command target-list invocation.");
    }
    const commandTargetHole = commandAct.initialHoles.find(
      (
        hole,
      ): hole is Extract<BattleHole, { readonly kind: "spellTargetList" }> =>
        hole.kind === "spellTargetList",
    );
    if (commandTargetHole === undefined) {
      throw new Error("Expected canonical Command target-list hole.");
    }
    const commandTarget = spellTargetListFill(
      commandTargetHole,
      wizardId,
      "command",
      [skeletonId],
    );
    expect(
      spellFillSet(
        [
          {
            ...commandTarget,
            relationshipFacts: [
              {
                kind: "spellTargetIsHostileToCaster" as const,
                casterId: wizardId,
                targetId: skeletonId,
                sourceProcedureRef: commandInvocation.sourceProcedureRef,
                targetIsHostileToCaster: true,
              },
            ],
          },
        ],
        commandInvocation,
        commandInvocation.sourceProcedureRef,
        wizardId,
        commandSession.state,
      ),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Spell target relationship facts must answer the target-list hole request.",
    });
  });

  test("save-gated spell prefixes cover target-list and saving-throw relationship boundaries", () => {
    const session = startBattleSessionRight({
      battleId: battleId("boundary-save-spell"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("acid_splash")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = findAct(session, magicSubject("acid_splash")).subject;
    const first = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [],
    });
    expect(first.tag).toBe("needsHoles");
    if (first.tag !== "needsHoles") {
      throw new Error("Expected Acid Splash saving-throw frontier.");
    }
    const target = first.holes.find(
      (hole) => hole.kind === "savingThrowOutcome",
    );
    if (target === undefined || target.kind !== "savingThrowOutcome") {
      throw new Error("Expected Acid Splash saving-throw hole.");
    }
    const targetFillValue = savingThrowOutcomeFill(target, [
      { targetId: skeletonId, succeeded: false },
    ]);
    const before = stateSnapshot(session.state);
    const duplicate = resolveBattleSubject({
      state: session.state,
      subject,
      fills: [targetFillValue, targetFillValue],
    });
    expectInvalid(duplicate, "Spell saving throw outcomes were filled twice.");
    expect(stateSnapshot(session.state)).toEqual(before);

    const sacredSession = startBattleSessionRight({
      battleId: battleId("boundary-sacred-flame-single-target"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("sacred_flame")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const sacredAct = findAct(sacredSession, magicSubject("sacred_flame"));
    const sacredInvocation = characterSpellProcedureFromAct(
      sacredSession.state,
      sacredAct,
      wizardId,
    );
    if (sacredInvocation?.procedure !== "saveGatedDamage") {
      throw new Error("Expected canonical Sacred Flame save-gated damage.");
    }
    const sacredHole = spellSavingThrowOutcomeHole(
      sacredSession.state,
      wizardId,
      sacredInvocation,
    );
    expect(sacredHole.label).toBe("Spell Saving Throw outcome");
    expect(sacredHole.outcomeTargeting).toBe("singleTarget");
    expect(spellSavingThrowAbility(sacredInvocation)).toBe("dex");
    const carefulHole = carefulSpellProtectedTargetsHole(
      sacredSession.state,
      wizardId,
      {
        procedure: sacredInvocation.procedure,
        sourceProcedureRef: sacredInvocation.sourceProcedureRef,
        spellRuleFacts: sacredInvocation.spellRuleFacts,
      },
    );
    expect(carefulHole.choices).not.toContain(wizardId);
    expect(carefulHole.maxTargets).toBeGreaterThanOrEqual(1);

    const ragingSession = startBattleSessionRight({
      battleId: battleId("boundary-rage-saving-relationship"),
      combatants: [
        characterSeed({
          initiative: 20,
          classLevels: [
            { className: "barbarian", level: 1 },
            { className: "wizard", level: 1 },
          ],
          resources: [rageResource()],
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("sacred_flame")],
            preparedSpells: [],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const ragingAct = discoverBattleActs(ragingSession).find(
      (candidate) =>
        candidate.subject.actorId === fighterId &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "sacred_flame",
    );
    if (ragingAct === undefined) {
      throw new Error("Expected discovered raging Sacred Flame act.");
    }
    const ragingInvocation = characterSpellProcedureFromAct(
      ragingSession.state,
      ragingAct,
      fighterId,
    );
    if (ragingInvocation?.procedure !== "saveGatedDamage") {
      throw new Error("Expected canonical raging Sacred Flame invocation.");
    }
    const rageProcedureRef = requireCharacterUnitProcedureRefForTest(
      ragingSession,
      fighterId,
      "barbarian_rage",
    );
    const raging = requireResolved(
      resolveBattleSubject({
        state: ragingSession.state,
        subject: {
          tag: "unitFeature",
          actorId: fighterId,
          procedureRef: rageProcedureRef,
        },
        fills: [],
      }),
    );
    expect(
      spellSavingThrowOutcomeHole(raging.state, fighterId, ragingInvocation)
        .relationshipFactRequest,
    ).toEqual({ kind: "savingThrowTargetIsEnemy", actorId: fighterId });
  });

  test("canonical Ice Knife burst and healing validators reject wrong holes and malformed groups", () => {
    const session = startBattleSessionRight({
      battleId: battleId("boundary-ice-knife"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [
              spellRecord("ice_knife"),
              spellRecord("cure_wounds"),
            ],
            spellSlots: [{ spellLevel: 1, count: 2 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const iceAct = findAct(session, magicSubject("ice_knife"));
    const iceSubject = iceAct.subject;
    const target = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: iceSubject,
        fills: [],
      }),
      "targetChoice",
    );
    const attack = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: iceSubject,
        fills: [targetFill(target, skeletonId)],
      }),
      "attackRoll",
    );
    const attackFill = attackRollFill(attack, { total: 20, naturalD20: 20 });
    const directDamage = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: iceSubject,
        fills: [targetFill(target, skeletonId), attackFill],
      }),
      "rolledDice",
    );
    const directDamageFill = damageRollFillWithGroups(directDamage, [[4, 4]]);
    const burst = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: iceSubject,
        fills: [targetFill(target, skeletonId), attackFill, directDamageFill],
      }),
      "savingThrowOutcome",
    );
    const save = {
      kind: "savingThrowOutcome" as const,
      holeId: burst.holeId,
      value: {
        area: {
          originAnchorId: skeletonId,
          affectedTargetIds: [skeletonId],
        },
        outcomes: [{ targetId: skeletonId, succeeded: false }],
      },
    } satisfies Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>;
    const burstDamage = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: iceSubject,
        fills: [
          targetFill(target, skeletonId),
          attackFill,
          directDamageFill,
          save,
        ],
      }),
      "rolledDice",
    );
    const burstDamageFill = damageRollFillWithGroups(burstDamage, [[2, 2]]);
    const iceInvocation = characterSpellProcedureFromAct(
      session.state,
      iceAct,
      wizardId,
    );
    if (iceInvocation?.procedure !== "attackBurstSaveDamage") {
      throw new Error("Expected canonical Ice Knife invocation.");
    }
    expect(
      validateSpellBurstDamageFill(burstDamageFill, iceInvocation),
    ).toBeNull();
    const wrongBurst = {
      ...burstDamageFill,
      holeId: directDamage.holeId,
    } as Extract<BattleFill, { readonly kind: "rolledDice" }>;
    expect(validateSpellBurstDamageFill(wrongBurst, iceInvocation)).toBe(
      "Ice Knife burst damage must use the burst damage hole.",
    );

    const cureAct = findAct(session, magicSubject("cure_wounds"));
    const cureInvocation = characterSpellProcedureFromAct(
      session.state,
      cureAct,
      wizardId,
    );
    if (cureInvocation?.procedure !== "directHitPointRestoration") {
      throw new Error("Expected canonical Cure Wounds invocation.");
    }
    const cureInitial = resolveBattleSubject({
      state: session.state,
      subject: cureAct.subject,
      fills: [],
    });
    if (cureInitial.tag !== "needsHoles")
      throw new Error("Expected Cure Wounds frontier.");
    const cureTarget = cureInitial.holes.find(
      (candidate) => candidate.kind === "targetChoice",
    );
    const cureFills =
      cureTarget === undefined
        ? []
        : [targetFill(cureTarget, cureTarget.choices[0] ?? wizardId)];
    const hole = requireHole(
      resolveBattleSubject({
        state: session.state,
        subject: cureAct.subject,
        fills: cureFills,
      }),
      "rolledDice",
    );
    const valid = damageRollFillWithGroups(hole, [[4, 4]]) as Extract<
      BattleFill,
      { readonly kind: "rolledDice" }
    >;
    expect(validateSpellHealingFill(valid, cureInvocation)).toBeNull();
    expect(
      validateSpellHealingFill(
        { ...valid, holeId: burstDamage.holeId },
        cureInvocation,
      ),
    ).toBe("Spell healing must use the selected spell act healing hole.");
  });

  test("canonical invocation projections cover damage-type choice and prepared-slot group boundaries", () => {
    const session = startBattleSessionRight({
      battleId: battleId("boundary-projections"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("ray_of_frost")],
            preparedSpells: [],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });
    const act = findAct(session, magicSubject("ray_of_frost"));
    const invocation = characterSpellProcedureFromAct(
      session.state,
      act,
      wizardId,
    );
    if (invocation?.procedure !== "spellAttackDamage") {
      throw new Error("Expected canonical Ray of Frost invocation.");
    }
    expect(spellDamageTypeChoiceHole(invocation).choices).toEqual([]);
    expect(spellDamageTypes(invocation)).toEqual(["cold"]);
    const selected = selectedSpellAttackDamageProcedure(invocation, undefined);
    expect(selected.tag).toBe("ok");
    if (selected.tag !== "ok")
      throw new Error("Expected Ray of Frost damage selection.");
    const runtimeInvocation =
      selected.invocation as RuntimeDamageSpellProcedure;
    const missingTarget = combatantId("boundary-missing-spell-target");
    const missingTargetDamage = damageRollFillWithGroups(
      { kind: "rolledDice", holeId: holeId("boundary-missing-spell-damage") },
      [[1]],
    );
    expect(
      applySpellDamage(
        session.state,
        missingTarget,
        runtimeInvocation,
        missingTargetDamage,
        false,
        { spatialFacts: [] },
      ),
    ).toBe(session.state);
    expect(
      applyPreparedSlotSpellDamage(session.state, missingTarget, 1, {
        spatialFacts: [],
      }),
    ).toBe(session.state);
    const allocation = [
      { targetId: goblinId, count: 2 },
      { targetId: fighterId, count: 1 },
    ] as const;
    const fill = damageRollFillWithGroups(
      { kind: "rolledDice", holeId: holeId("boundary-repeated-damage") },
      [[1, 2], [3]],
    );
    const tooFewGroups = damageRollFillWithGroups(
      { kind: "rolledDice", holeId: holeId("boundary-repeated-damage") },
      [[1]],
    );
    const mismatchedGroup = damageRollFillWithGroups(
      { kind: "rolledDice", holeId: holeId("boundary-repeated-damage") },
      [[1], [2, 3]],
    );
    const unsupportedDieFloor = {
      ...fill,
      attackDamageDieFloorChoice: {
        procedureRef: battleProcedureExecutionRefForTest(
          "boundary-unsupported-die-floor",
        ),
        selection: "apply" as const,
      },
    };
    const unsupportedAbilityModifier = {
      ...fill,
      attackDamageAbilityModifierChoice: {
        procedureRef: battleProcedureExecutionRefForTest(
          "boundary-unsupported-ability-modifier",
        ),
        selection: "apply" as const,
      },
    };
    expect(validatePreparedSlotSpellDamageGroups(fill, allocation)).toBeNull();
    expect(
      validatePreparedSlotSpellDamageGroups(unsupportedDieFloor, allocation),
    ).toBe(
      "Attack damage die floor choices are not available for this damage-roll owner.",
    );
    expect(
      validatePreparedSlotSpellDamageGroups(
        unsupportedAbilityModifier,
        allocation,
      ),
    ).toBe(
      "Attack damage ability modifier choices are not available for this damage-roll owner.",
    );
    expect(
      validatePreparedSlotSpellDamageGroups(tooFewGroups, allocation),
    ).toBe(
      "Repeated spell damage dice groups must match the target allocation entries.",
    );
    expect(
      validatePreparedSlotSpellDamageGroups(mismatchedGroup, allocation),
    ).toBe(
      "Each repeated spell damage dice group must match that target's allocated effect count.",
    );
    const flameSession = startBattleSessionRight({
      battleId: battleId("boundary-flame-strike-components"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [],
            preparedSpells: [spellRecord("flame_strike")],
            spellSlots: [{ spellLevel: 5, count: 1 }],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const flameAct = findAct(flameSession, magicSubject("flame_strike"));
    const flameInvocation = characterSpellProcedureFromAct(
      flameSession.state,
      flameAct,
      wizardId,
    );
    if (flameInvocation?.procedure !== "saveGatedDamage") {
      throw new Error("Expected canonical Flame Strike save-gated damage.");
    }
    const flameTarget = flameSession.state.combatants.get(skeletonId);
    if (flameTarget === undefined)
      throw new Error("Expected Flame Strike target.");
    const extraComponentRoll = damageRollFillWithGroups(
      { kind: "rolledDice", holeId: holeId("boundary-flame-extra-component") },
      [[1], [2], [3]],
    );
    expect(
      spellDamageByTypeForTarget(
        flameTarget,
        flameInvocation,
        extraComponentRoll,
      ).size,
    ).toBe(2);
  });
});

function characterSpellProcedureFromAct(
  state: BattleState,
  act: ReturnType<typeof findAct>,
  actorId: CombatantId,
) {
  const actor = state.combatants.get(actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected canonical spellcaster character.");
  }
  const presentation = battleActSpellPresentation(act);
  if (presentation === undefined) {
    throw new Error("Expected canonical spell presentation.");
  }
  return characterSpellProcedure(
    actor.origin.execution,
    presentation.procedureRef,
    {
      combatantId: actorId,
      activeEffects: actor.activeEffects,
    },
  );
}

function huntersPreyHordeBreakerUnitRef(): BattleUnitRef {
  const unit = unitLibrary.requireUnit("ranger_hunters_prey");
  return {
    unit,
    supportProfiles: [
      {
        kind: "huntersPrey",
        huntersPrey: {
          kind: "nearbyDifferentTargetSameWeaponAttack",
          trigger: "makeWeaponAttack",
          usageLimit: "oncePerTurn",
          extraAttack: {
            weapon: "sameWeapon",
            target: {
              kind: "differentCreatureNearOriginalTarget",
              withinFeetOfOriginalTarget: movementFeet(5),
              withinWeaponRange: true,
              notAttackedThisTurn: true,
            },
          },
        },
      },
    ],
  };
}
