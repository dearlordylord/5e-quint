import { assertStatBlockForTest } from "@dnd/surface/surface/stat-block-catalog.test-support";
import { Either } from "effect";
import { describe, expect, test } from "vitest";
import { statBlockId as parseSharedStatBlockId } from "@dnd/shared/game-facts";
import { armorClass } from "@dnd/shared-algebras/armor-class-algebra";
import { DieRollResult, Hp } from "@dnd/shared/types";
import type { StatBlockRecord } from "@dnd/surface/surface/types";
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
  battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest,
  damageRollFill,
  discoverBattleActs,
  fighterAttackSubject,
  fighterId,
  fighterVsGoblinBattle,
  findHole,
  goblinAttackSubject,
  goblinId,
  goblinTurnBattle,
  requireHole,
  resolveBattleSubject,
  startBattleRight,
  statBlockCatalog,
  statBlockRecord,
  statBlockCreatureInit,
  authoredProcedureOrdinal,
} from "./battle-runtime.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleUnitRefWithSupportProfiles,
  speciesHalflingLuckUnitId,
  unitLibrary,
} from "./unit-profile-admission.test-support.ts";

describe("battle runtime: ordinary object attack tail boundaries", () => {
  test("a pure-damage Stat Block attack exposes and resolves an ordinary object target", () => {
    const objectKey = "calibration-strike-object-target";
    const objectId = battleObjectId(objectKey);
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-calibration-strike-object-target"),
      combatants: [
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 20,
          statBlock: pureDamageObjectTargetStatBlock(),
        }),
        characterSeed({ combatantId: fighterId, initiative: 10 }),
      ],
    });
    const calibrationAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        state,
        context: battleRuntimeContextForStateForTest(state),
      }),
    ).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
          candidate.subject,
          "rolled",
        ) &&
        candidate.summary.includes("Calibration Strike"),
    );
    if (
      calibrationAct === undefined ||
      calibrationAct.subject.tag !== "action"
    ) {
      throw new Error("Expected the Calibration Strike action.");
    }
    const targetHole = findHole(calibrationAct.initialHoles, "targetChoice");
    expect(targetHole).toMatchObject({
      attack: { acceptsObjectTarget: true },
    });

    const target = objectTargetFill(targetHole, goblinId, objectKey);
    const rollHole = requireHole(
      resolveBattleSubject({
        state,
        subject: calibrationAct.subject,
        fills: [target],
      }),
      "attackRoll",
    );
    const roll = attackRollFill(rollHole, { total: 20, naturalD20: 12 });
    const damageHole = requireHole(
      resolveBattleSubject({
        state,
        subject: calibrationAct.subject,
        fills: [target, roll],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state,
      subject: calibrationAct.subject,
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

  test("a Stat Block Bite with a creature-only rider rejects ordinary object targeting", () => {
    const objectKey = "wolf-bite-object-target-rejected";
    const state = startBattleRight({
      battleId: battleId("battle-stat-block-bite-object-target-rejected"),
      combatants: [
        statBlockCreatureInit({
          combatantId: goblinId,
          initiative: 20,
          statBlock: assertStatBlockForTest(
            statBlockCatalog,
            parseSharedStatBlockId("stat_block_wolf"),
          ),
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
        battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
          candidate.subject,
          "rolled",
        ) &&
        candidate.summary.includes("Bite"),
    );
    if (biteAct === undefined || biteAct.subject.tag !== "action") {
      throw new Error("Expected the Wolf Bite action.");
    }
    const targetHole = findHole(biteAct.initialHoles, "targetChoice");
    expect(targetHole.attack?.acceptsObjectTarget).toBeUndefined();

    expect(
      resolveBattleSubject({
        state,
        subject: biteAct.subject,
        fills: [objectTargetFill(targetHole, goblinId, objectKey)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
      message:
        "This attack procedure does not support an ordinary object target.",
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
        battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
          candidate.subject,
          "static",
        ) &&
        candidate.summary.includes("Scimitar"),
    );
    if (
      staticAct?.subject.tag !== "action" ||
      staticAct.subject.action !== "attack" ||
      !battleSubjectUsesOnlyStatBlockDamageComponentNotationForTest(
        staticAct.subject,
        "static",
      )
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

function pureDamageObjectTargetStatBlock(): StatBlockRecord {
  const base = statBlockRecord();
  const scimitar = base.statBlock.actions?.find(
    (entry) =>
      entry.kind === "executable" &&
      entry.procedure.kind === "attack_roll" &&
      entry.procedure.name === "Scimitar",
  );
  if (
    scimitar === undefined ||
    scimitar.kind !== "executable" ||
    scimitar.procedure.kind !== "attack_roll"
  ) {
    throw new Error("Expected the pure-damage Stat Block attack fixture.");
  }
  const baseDamage = scimitar.procedure.onHit.find(
    (effect) => effect.kind === "damage",
  );
  if (baseDamage === undefined) {
    throw new Error("Expected a base damage effect for the test attack.");
  }
  return {
    ...base,
    id: parseSharedStatBlockId("stat_block_pure_damage_object_target_test"),
    name: "Pure Damage Object Target Test Monster",
    provenance: {
      kind: "synthetic-test",
      section: "ordinary object target boundary",
    },
    statBlock: {
      ...base.statBlock,
      actions: [
        {
          ...scimitar,
          procedureOrdinal: authoredProcedureOrdinal(1),
          procedure: {
            ...scimitar.procedure,
            name: "Calibration Strike",
            onHit: [baseDamage],
          },
        },
      ],
    },
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
