// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.enemy-zero-hit-point-temporary-hit-points
import { describe, expect, test } from "vitest";

import { Hp, movementFeet } from "@dnd/shared/types";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";

import {
  applyBattleHitPointDamage,
  attackRollFill,
  battleId,
  characterSeed,
  combatantId,
  damageRollFill,
  discoverBattleActs,
  findHole,
  partySide,
  startBattleRight,
  statBlockCreatureInit,
  testCharacterD20Statistics,
  targetFill,
  resolveBattleSubject,
  spellRecord,
  type BattleState,
  type CombatantId,
  unitLibrary,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import type {
  BattleDamageRelationshipDecision,
  BattleTargetSpatialFact,
} from "./battle-reducer.ts";
import { applyPreparedSlotSpellDamage } from "./battle-reducer/spells-damage-fills.ts";
import { damageRelationshipQuestionId } from "./battle-reducer/damage-relationship-question-id.ts";
import { applyChainedSpellDamage } from "./battle-reducer/spells-resolve-chained.ts";
import { battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit } from "./unit-feature-support.ts";

type DarkOnesBlessingSupportProfile = Exclude<
  ReturnType<typeof battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit>,
  null | "unsupported"
>;

const warlockId = combatantId("dark-ones-blessing-warlock");
const secondWarlockId = combatantId("dark-ones-blessing-second-warlock");
const allyId = combatantId("dark-ones-blessing-ally");
const enemyId = combatantId("dark-ones-blessing-enemy");
const otherEnemyId = combatantId("dark-ones-blessing-other-enemy");
const unitId = "warlock_dark_ones_blessing";
const unit = unitLibrary.requireUnit(unitId);
const supportProfile = requireDarkOnesBlessingSupportProfile();

describe("Dark One's Blessing zero-HP Temporary Hit Points", () => {
  test("ordinary Attack damage emits and consumes an event-scoped enemy decision", () => {
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
    });
    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack",
    );
    if (act?.subject.tag !== "action" || act.subject.action !== "attack") {
      throw new Error("Expected an ordinary Attack act.");
    }
    const target = findHole(act.initialHoles, "targetChoice");
    const targetChoice = targetFill(target, enemyId);
    const awaitingAttackRoll = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    });
    const attackRoll = findHole(
      awaitingAttackRoll.tag === "needsHoles" ? awaitingAttackRoll.holes : [],
      "attackRoll",
    );
    const attack = attackRollFill(attackRoll, {
      total: 20,
      naturalD20: 15,
    });
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetChoice,
          attackRollFill(attackRoll, { total: 1, naturalD20: 2 }),
          {
            kind: "damageRelationshipDecisions",
            holeId: holeId(`${String(attackRoll.holeId)}:relationships`),
            answers: [
              {
                questionId: damageRelationshipQuestionId(["orphan"]),
                answer: true,
              },
            ],
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attack],
    });
    const damage = findHole(
      awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
      "rolledDice",
    );
    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetChoice, attack, damageRollFill(damage, 1)],
      }),
    ).toMatchObject({ tag: "resolved" });
    const damageFill = damageRollFill(damage, 8);
    const awaitingDisposition = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attack, damageFill],
    });
    const disposition = findHole(
      awaitingDisposition.tag === "needsHoles" ? awaitingDisposition.holes : [],
      "attackDamageDisposition",
    );
    const dispositionFill = {
      kind: "attackDamageDisposition",
      holeId: disposition.holeId,
      value: { kind: "ordinaryDamage" },
    } as const;
    const awaitingRelationship = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, attack, damageFill, dispositionFill],
    });
    if (awaitingRelationship.tag !== "needsHoles") {
      throw new Error(
        `Expected Attack relationship holes, received ${awaitingRelationship.tag}${
          awaitingRelationship.tag === "invalid"
            ? `: ${awaitingRelationship.message}`
            : ""
        }.`,
      );
    }
    const relationship = findHole(
      awaitingRelationship.holes,
      "damageRelationshipDecisions",
    );
    if (relationship.kind !== "damageRelationshipDecisions") {
      throw new Error("Expected a damage relationship hole.");
    }
    expect(relationship).toMatchObject({
      damageEventHoleId: damage.holeId,
      damageSourceId: warlockId,
      targetIds: [enemyId],
      questions: [
        {
          kind: "enemyZeroHitPointTemporaryHitPoints",
          beneficiaryId: warlockId,
          targetId: enemyId,
          unitId,
        },
      ],
    });
    const relationshipAnswer = {
      questionId: relationship.questions[0].questionId,
      answer: true,
    } as const;

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetChoice,
          attack,
          damageFill,
          dispositionFill,
          {
            kind: "damageRelationshipDecisions",
            holeId: relationship.holeId,
            answers: [relationshipAnswer],
          },
          {
            kind: "damageRelationshipDecisions",
            holeId: holeId(`${String(attack.holeId)}:relationships`),
            answers: [relationshipAnswer],
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetChoice,
          attack,
          damageFill,
          dispositionFill,
          {
            kind: "damageRelationshipDecisions",
            holeId: relationship.holeId,
            answers: [relationshipAnswer],
          },
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("ordinary save-gated spell damage carries the event relationship decision", () => {
    const sacredFlameId = "sacred_flame";
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
      preparedSpells: [spellRecord(sacredFlameId)],
    });
    const act = spellAct({ state, spellId: sacredFlameId });
    const target = findHole(act.initialHoles, "targetChoice");
    if (target.kind !== "targetChoice") {
      throw new Error("Expected a spell target hole.");
    }
    const targetChoice = targetFill(target, enemyId, [
      {
        kind: "spellTarget",
        casterId: warlockId,
        targetId: enemyId,
        spellId: sacredFlameId,
      },
    ]);
    const awaitingSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice],
    });
    const save = findHole(
      awaitingSave.tag === "needsHoles" ? awaitingSave.holes : [],
      "savingThrowOutcome",
    );
    if (save.kind !== "savingThrowOutcome") {
      throw new Error("Expected a saving-throw outcome hole.");
    }
    const saveFill = savingThrowOutcomeFill(save, [
      { targetId: enemyId, succeeded: false },
    ]);
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, saveFill],
    });
    const damage = findHole(
      awaitingDamage.tag === "needsHoles" ? awaitingDamage.holes : [],
      "rolledDice",
    );
    const damageFill = damageRollFill(damage, 5);
    const awaitingRelationship = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetChoice, saveFill, damageFill],
    });
    const relationship = findHole(
      awaitingRelationship.tag === "needsHoles"
        ? awaitingRelationship.holes
        : [],
      "damageRelationshipDecisions",
    );
    if (relationship.kind !== "damageRelationshipDecisions") {
      throw new Error("Expected a spell damage relationship hole.");
    }

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          targetChoice,
          saveFill,
          damageFill,
          {
            kind: "damageRelationshipDecisions",
            holeId: relationship.holeId,
            answers: [
              {
                questionId: relationship.questions[0].questionId,
                answer: true,
              },
            ],
          },
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("grants Temporary Hit Points when the Warlock reduces an enemy to 0 Hit Points", () => {
    const result = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("grants Temporary Hit Points when another creature reduces an enemy within 10 feet to 0 Hit Points", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("grants Temporary Hit Points when the damage source is not an enemy of the defeated target", () => {
    const result = damageEnemyToZero({
      damageSourceId: otherEnemyId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
      spatialFacts: [darkOnesBlessingRangeFact(otherEnemyId, enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("uses the event-scoped enemy decision independently of Encounter Side", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: otherEnemyId,
      warlockCha: 16,
      warlockLevel: 3,
      targetSide: partySide,
      targetIsEnemy: true,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, otherEnemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("prepared-slot spell damage threads source and range facts into zero-HP awards", () => {
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
    });
    const result = applyPreparedSlotSpellDamage(state, enemyId, 5, {
      damageSourceId: allyId,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, enemyId)],
      relationshipDecisions: [darkOnesBlessingEnemyDecision(enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("chained spell damage threads the caster as damage source into zero-HP awards", () => {
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
    });
    const result = applyChainedSpellDamage(state, enemyId, 5, false, {
      concentrationSavingThrow: undefined,
      damageDisposition: { kind: "ordinaryDamage" },
      wardingBondDamageShareConcentrationSavingThrows: [],
      hideousLaughterDamageRepeatSaves: [],
      damageSourceId: warlockId,
      spatialFacts: [],
      relationshipDecisions: [darkOnesBlessingEnemyDecision(enemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(6);
  });

  test("rejects another creature's zero-HP event without the 10-foot range fact", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
    });

    expect(tempHp(result, warlockId)).toBe(0);
  });

  test("rejects non-enemy zero-HP events", () => {
    const result = damageEnemyToZero({
      damageSourceId: allyId,
      targetId: otherEnemyId,
      warlockCha: 16,
      warlockLevel: 3,
      targetIsEnemy: false,
      spatialFacts: [darkOnesBlessingRangeFact(allyId, otherEnemyId)],
    });

    expect(tempHp(result, warlockId)).toBe(0);
  });

  test("evaluates enemy decisions independently for multiple beneficiaries", () => {
    const state = darkOnesBlessingBattle({
      warlockCha: 16,
      warlockLevel: 3,
      secondWarlock: true,
    });
    const target = state.combatants.get(enemyId);
    if (target === undefined) {
      throw new Error("Dark One's Blessing test target must exist.");
    }

    const result = applyBattleHitPointDamage({
      state,
      target,
      damageAmount: 5,
      deathFailuresAtZeroHp: 1,
      damageSourceId: allyId,
      spatialFacts: [
        darkOnesBlessingRangeFact(allyId, enemyId, warlockId),
        darkOnesBlessingRangeFact(allyId, enemyId, secondWarlockId),
      ],
      relationshipDecisions: [
        darkOnesBlessingEnemyDecision(enemyId, warlockId),
      ],
    });

    expect(tempHp(result, warlockId)).toBe(6);
    expect(tempHp(result, secondWarlockId)).toBe(0);
  });

  test("applies the minimum Temporary Hit Point amount", () => {
    const result = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 1,
      warlockLevel: 3,
    });

    expect(tempHp(result, warlockId)).toBe(1);
  });

  test("uses ordinary Temporary Hit Point replacement behavior", () => {
    const lowerAward = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 16,
      warlockLevel: 3,
      warlockTempHp: 8,
    });
    const higherAward = damageEnemyToZero({
      damageSourceId: warlockId,
      targetId: enemyId,
      warlockCha: 18,
      warlockLevel: 5,
      warlockTempHp: 4,
    });

    expect(tempHp(lowerAward, warlockId)).toBe(8);
    expect(tempHp(higherAward, warlockId)).toBe(9);
  });
});

function damageEnemyToZero(input: {
  readonly damageSourceId: CombatantId;
  readonly targetId: CombatantId;
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
  readonly targetSide?: typeof partySide;
  readonly targetIsEnemy?: boolean;
  readonly spatialFacts?: readonly BattleTargetSpatialFact[];
}): BattleState {
  const state = darkOnesBlessingBattle(input);
  const target = state.combatants.get(input.targetId);
  if (target === undefined) {
    throw new Error("Dark One's Blessing test target must exist.");
  }
  return applyBattleHitPointDamage({
    state,
    target,
    damageAmount: 5,
    deathFailuresAtZeroHp: 1,
    damageSourceId: input.damageSourceId,
    spatialFacts: [...(input.spatialFacts ?? [])],
    ...(input.targetIsEnemy === false
      ? {}
      : {
          relationshipDecisions: [
            darkOnesBlessingEnemyDecision(input.targetId),
          ],
        }),
  });
}

function darkOnesBlessingBattle(input: {
  readonly warlockCha: number;
  readonly warlockLevel: number;
  readonly warlockTempHp?: number;
  readonly targetSide?: typeof partySide;
  readonly secondWarlock?: true;
  readonly preparedSpells?: readonly ReturnType<typeof spellRecord>[];
}): BattleState {
  return startBattleRight({
    battleId: battleId("dark-ones-blessing-battle"),
    combatants: [
      characterSeed({
        combatantId: warlockId,
        displayName: "Warlock",
        initiative: 20,
        classLevels: [{ className: "warlock", level: input.warlockLevel }],
        characterUnitRefs: [
          {
            unitId,
            supportProfiles: [supportProfile],
          },
        ],
        unitFeatures: [{ unit }],
        knownLanguages: ["Common"],
        d20Statistics: testCharacterD20Statistics({ cha: input.warlockCha }),
        spellcasting:
          input.preparedSpells === undefined
            ? undefined
            : {
                ...wizardSpellcasting({
                  cantrips: input.preparedSpells,
                  preparedSpells: [],
                }),
                sourceClassName: "warlock",
              },
        tempHp: input.warlockTempHp ?? 0,
      }),
      ...(input.secondWarlock === true
        ? [
            characterSeed({
              combatantId: secondWarlockId,
              displayName: "Second Warlock",
              initiative: 18,
              classLevels: [
                { className: "warlock", level: input.warlockLevel },
              ],
              characterUnitRefs: [
                {
                  unitId,
                  supportProfiles: [supportProfile],
                },
              ],
              unitFeatures: [{ unit }],
              knownLanguages: ["Common"],
              d20Statistics: testCharacterD20Statistics({
                cha: input.warlockCha,
              }),
            }),
          ]
        : []),
      characterSeed({
        combatantId: allyId,
        displayName: "Ally",
        initiative: 15,
        side: partySide,
      }),
      statBlockCreatureInit({
        combatantId: enemyId,
        initiative: 10,
        currentHp: 5,
      }),
      statBlockCreatureInit({
        combatantId: otherEnemyId,
        initiative: 5,
        currentHp: 5,
      }),
    ].map((combatant) =>
      combatant.combatantId === otherEnemyId && input.targetSide !== undefined
        ? { ...combatant, side: input.targetSide }
        : combatant,
    ),
  });
}

function darkOnesBlessingRangeFact(
  damageSourceId: CombatantId,
  targetId: CombatantId,
  beneficiaryId: CombatantId = warlockId,
): BattleTargetSpatialFact {
  return {
    kind: "enemyZeroHitPointTemporaryHitPointsBeneficiaryWithinRange",
    beneficiaryId,
    damageSourceId,
    targetId,
    unitId,
    rangeFeet: movementFeet(10),
  };
}

function darkOnesBlessingEnemyDecision(
  targetId: CombatantId,
  beneficiaryId: CombatantId = warlockId,
): BattleDamageRelationshipDecision {
  return {
    kind: "enemyZeroHitPointTemporaryHitPoints",
    beneficiaryId,
    targetId,
    unitId,
    targetIsEnemy: true,
  };
}

function requireDarkOnesBlessingSupportProfile(): DarkOnesBlessingSupportProfile {
  const profile = battleEnemyZeroHitPointTemporaryHitPointsSupportForUnit(unit);
  if (profile === null || profile === "unsupported") {
    throw new Error("Dark One's Blessing support profile is required.");
  }
  return profile;
}

function tempHp(state: BattleState, combatantId: CombatantId): number {
  return Number(state.combatants.get(combatantId)?.tempHp ?? Hp(0));
}
