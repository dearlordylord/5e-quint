import { Either } from "effect";
import { describe, expect, test } from "vitest";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { DieRollResult, Hp } from "@dnd/shared/types";
import {
  D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
  type BattleFill,
  type BattleHole,
} from "./battle-state-execution.ts";
import { battleObjectId } from "./identity.ts";
import {
  battleId,
  battleRuntimeContextForStateForTest,
  characterBattleFeatureInitForTest,
  characterSeed,
  attackRollFill,
  damageRollFill,
  discoverBattleActs,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  goblinAttackSubject,
  goblinId,
  goblinTurnBattle,
  requireHole,
  resolveBattleSubject,
  startBattleRight,
  statBlockCatalog,
  statBlockCreatureInit,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";

describe("battle runtime: ordinary object attack tail boundaries", () => {
  test("a supported Stat Block Bite exposes and resolves an ordinary object target", () => {
    const objectKey = "wolf-bite-object-target";
    const objectId = battleObjectId(objectKey);
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-bite-object-target"),
      combatants: [
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 20,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_wolf"),
        }),
        characterSeed({ combatantId: fighterId, initiative: 10 }),
      ],
    });
    const biteAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state,
        context: battleRuntimeContextForStateForTest(state),
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.statBlockDamageNotation === undefined &&
        candidate.summary.includes("Bite"),
    );
    if (biteAct === undefined || biteAct.subject.tag !== "action") {
      throw new Error("Expected the Wolf Bite action.");
    }
    expect(biteAct.initialHoles[0]).toMatchObject({
      kind: "targetChoice",
      attack: { acceptsObjectTarget: true },
    });

    const targetHole = requireHole(
      resolveBattleSubject({ state, subject: biteAct.subject, fills: [] }),
      "targetChoice",
    );
    const target = objectTargetFill(targetHole, goblinId, objectKey);
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: biteAct.subject,
        fills: [target],
      }),
      "attackRoll",
    );
    const roll = attackRollFill(rollHole, { total: 20, naturalD20: 12 });
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: biteAct.subject,
        fills: [target, roll],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: biteAct.subject,
      fills: [target, roll, damageRollFill(damageHole, 1)],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          effectiveDamage: 3,
        },
      ],
    });
  });

  test("ordinary object attacks expose and validate a natural-one reroll decision", () => {
    const state = halflingObjectBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const target = objectTargetFill(
      targetHole,
      fighterId,
      "natural_one_target",
    );
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );

    const decisionRequired = resolveBattleSubject({
      state,
      subject,
      fills: [target, attackRollFill(rollHole, { total: 2, naturalD20: 1 })],
    });
    expect(decisionRequired).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({
          kind: "attackRoll",
          d20TestNaturalOneRerolls: expect.any(Array),
        }),
      ],
    });

    const invalidReplacement = resolveBattleSubject({
      state,
      subject,
      fills: [
        target,
        attackRollFill(rollHole, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: {
            kind: "reroll",
            effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            replacement: {
              total: 15,
              naturalD20: DieRollResult(15),
              rollMode: "advantage",
            },
          },
        }),
      ],
    });
    expect(invalidReplacement).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "D20 Test natural-1 replacement roll mode does not match the current D20 Test rule.",
    });

    const validReplacement = resolveBattleSubject({
      state,
      subject,
      fills: [
        target,
        attackRollFill(rollHole, {
          total: 2,
          naturalD20: 1,
          d20TestNaturalOneReroll: {
            kind: "reroll",
            effectKind: D20_TEST_NATURAL_ONE_REROLL_EFFECT_KIND,
            replacement: {
              total: 18,
              naturalD20: DieRollResult(15),
            },
          },
        }),
      ],
    });
    expect(validReplacement).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
  });

  test("static object attacks resolve without damage rolls and reject a forged rolled damage fill", () => {
    const state = goblinTurnBattle();
    const rolledSubject = goblinAttackSubject(state, "Scimitar");
    const staticAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state,
        context: battleRuntimeContextForStateForTest(state),
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.statBlockDamageNotation === "static" &&
        candidate.summary.includes("Scimitar"),
    );
    if (
      staticAct?.subject.tag !== "action" ||
      staticAct.subject.action !== "attack" ||
      staticAct.subject.statBlockDamageNotation !== "static"
    ) {
      throw new Error("Expected the discovered static Scimitar attack.");
    }
    const staticSubject = staticAct.subject;
    const staticTargetHole = requireHole(
      resolveBattleSubject({ state, subject: staticSubject, fills: [] }),
      "targetChoice",
    );
    const staticTarget = objectTargetFill(
      staticTargetHole,
      goblinId,
      "static_object_target",
    );
    const staticRollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: staticSubject,
        fills: [staticTarget],
      }),
      "attackRoll",
    );
    const staticRoll = attackRollFill(staticRollHole, {
      total: 18,
      naturalD20: 14,
    });
    const resolved = resolveBattleSubject({
      state,
      subject: staticSubject,
      fills: [staticTarget, staticRoll],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        expect.objectContaining({
          objectId: battleObjectId("static_object_target"),
        }),
      ],
    });

    const rolledTargetHole = requireHole(
      resolveBattleSubject({ state, subject: rolledSubject, fills: [] }),
      "targetChoice",
    );
    const rolledTarget = objectTargetFill(
      rolledTargetHole,
      goblinId,
      "static_object_target",
    );
    const rolledRollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: rolledSubject,
        fills: [rolledTarget],
      }),
      "attackRoll",
    );
    const rolledDamageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: rolledSubject,
        fills: [
          rolledTarget,
          attackRollFill(rolledRollHole, { total: 18, naturalD20: 14 }),
        ],
      }),
      "rolledDice",
    );
    const forgedDamage = resolveBattleSubject({
      state,
      subject: staticSubject,
      fills: [staticTarget, staticRoll, damageRollFill(rolledDamageHole, 4)],
    });
    expect(forgedDamage).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Fixed attack damage does not use a rolled damage fill.",
    });
  });

  test("ordinary object attack rejects rolled damage that violates its dice expression", () => {
    const state = fighterVsGoblinBattle();
    const subject = fighterAttackSubject(state, "Longsword");
    const targetHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const target = objectTargetFill(
      targetHole,
      fighterId,
      "invalid_damage_target",
    );
    const rollHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target] }),
      "attackRoll",
    );
    const roll = attackRollFill(rollHole, { total: 18, naturalD20: 13 });
    const damageHole = requireHole(
      resolveBattleSubject({ state, subject, fills: [target, roll] }),
      "rolledDice",
    );

    const invalidDamage = resolveBattleSubject({
      state,
      subject,
      fills: [target, roll, damageRollFill(damageHole, 9)],
    });
    expect(invalidDamage).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: expect.any(String),
    });
  });
});

function objectTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  actorId: typeof fighterId | typeof goblinId,
  objectKey: string,
): Extract<BattleFill, { readonly kind: "objectTargetChoice" }> {
  const objectId = battleObjectId(objectKey);
  return {
    kind: "objectTargetChoice",
    holeId: hole.holeId,
    value: objectId,
    spatialFacts: [
      {
        kind: "attackObjectTarget",
        actorId,
        objectId,
        range: { kind: "meleeReach" },
        attackerCanSeeObject: true,
        cover: "none",
        armorClass: armorClass(15),
        damageDisposition: { kind: "hitPoints", hitPoints: Hp(30) },
      },
    ],
  };
}

function halflingObjectBattle() {
  const unit = unitLibrary.requireUnit(speciesHalflingLuckUnitId);
  const unitRef = battleUnitRefWithSupportProfiles({
    unitRef: { unitId: unit.id },
    unit,
  });
  if (Either.isLeft(unitRef)) {
    throw new Error(unitRef.left.message);
  }
  return startBattleRight({
    battleId: battleId("battle-object-natural-one-reroll"),
    combatants: [
      characterSeed({
        initiative: 20,
        characterUnitRefs: [unitRef.right],
        unitFeatures: [characterBattleFeatureInitForTest(unit)],
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}
