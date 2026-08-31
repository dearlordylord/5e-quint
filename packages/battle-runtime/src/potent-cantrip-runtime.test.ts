import { characterUnitProcedureBindings } from "./character-execution-admission.ts";
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.potent-cantrip
import { describe, expect, test } from "vitest";
import { classLevel } from "@dnd/shared/types";
import { decodeCreatureImmunityDeclarationSync } from "@dnd/surface/surface/schema";

import type { BattleActiveEffect } from "./battle-state-execution.ts";
import { battleCreatureWithSpellActiveEffects } from "./active-effect/lifecycle.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  statBlockCreature,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";

import {
  characterBattleFeatureInitForTest,
  attackRollFill,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleProcedureExecutionRefForSpellHoleForTest,
  battleId,
  battleObjectId,
  characterSeed,
  combatantId,
  damageRollFill,
  discoverBattleActCandidates,
  elapsedTimeTicks,
  findAct,
  findHole,
  Hp,
  magicSubject,
  movementFeet,
  objectTargetFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleSessionRight,
  supportedBattleUnitRef,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  armorClass,
} from "./battle-runtime.test-support.ts";

const potentCantripUnit = unitLibrary.requireUnit("wizard_potent_cantrip");
const potentCantripUnitRef = supportedBattleUnitRef(potentCantripUnit);
const charmSourceId = combatantId("potent-cantrip-charm-source");

describe("Potent Cantrip runtime", () => {
  test("projects the admitted Potent Cantrip profile into character battle state", () => {
    const state = potentCantripBattle({ cantrips: ["ray_of_frost"] }).state;
    const wizard = state.combatants.get(wizardId);

    expect(wizard?.origin.kind).toBe("character");
    if (wizard?.origin.kind !== "character") {
      throw new Error("Expected Wizard character origin.");
    }
    expect(
      characterUnitProcedureBindings(wizard.origin.execution).filter(
        ({ procedure }) =>
          procedure.kind === "unitFeature" &&
          procedure.execution.kind === "potentCantrip",
      ),
    ).toHaveLength(1);
  });

  test("applies half cantrip damage on a missed spell attack without hit riders", () => {
    const session = potentCantripBattle({ cantrips: ["ray_of_frost"] });
    const state = session.state;
    const subject = findAct(session, magicSubject("ray_of_frost")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackMiss = attackRollFill(attack, { total: 4, naturalD20: 3 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss],
      }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss, damageRollFill(damage, 5)],
      }),
    );

    const targetAfter = resolved.state.combatants.get(skeletonId);
    expect(targetAfter?.hp).toBe(11);
    expect(targetAfter?.activeEffects).not.toContainEqual(
      expect.objectContaining({ kind: "speedDelta" }),
    );
    expect(resolved.snapshot.turn.actionResources).toEqual([]);
  });

  test("does not apply attack cantrip non-damage effects on the miss branch", () => {
    const session = potentCantripBattle({ cantrips: ["shocking_grasp"] });
    const state = session.state;
    const subject = findAct(session, magicSubject("shocking_grasp")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackMiss = attackRollFill(attack, { total: 4, naturalD20: 3 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss],
      }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss, damageRollFill(damage, 5)],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(11);
    expect(resolved.state.combatants.get(skeletonId)?.activeEffects).toEqual(
      [],
    );
  });

  test("does not apply attack cantrip light-emission riders on the miss branch", () => {
    const session = potentCantripBattle({ cantrips: ["starry_wisp"] });
    const state = session.state;
    const subject = findAct(session, magicSubject("starry_wisp")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const attack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice],
      }),
      "attackRoll",
    );
    const attackMiss = attackRollFill(attack, { total: 4, naturalD20: 3 });
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss],
      }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss, damageRollFill(damage, 5)],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(11);
    expect(resolved.snapshot.lightEmitters).toEqual([]);
    expect(resolved.state.combatants.get(skeletonId)?.activeEffects).toEqual(
      [],
    );
  });

  test("a missed damaging cantrip deals no Potent Cantrip damage through immunity", () => {
    const session = potentCantripBattle({
      cantrips: ["ray_of_frost"],
      coldImmuneTarget: true,
    });
    const state = session.state;
    const subject = findAct(session, magicSubject("ray_of_frost")).subject;
    const targetChoice = targetFill(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      ),
      skeletonId,
    );
    const attackMiss = attackRollFill(
      requireHole(
        resolveBattleSubject({
          state,
          subject,
          fills: [targetChoice],
        }),
        "attackRoll",
      ),
      { total: 4, naturalD20: 3 },
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss],
      }),
      "rolledDice",
    );
    const hpBefore = state.combatants.get(skeletonId)?.hp;

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss, damageRollFill(damage, 5)],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(hpBefore);
  });

  test("Potent Cantrip miss damage resolves target-damaged relationship effects", () => {
    const session = potentCantripBattle({
      cantrips: ["ray_of_frost"],
      withCharmSource: true,
    });
    const target = session.state.combatants.get(skeletonId);
    if (target === undefined) {
      throw new Error("Expected the cantrip target.");
    }
    const charmEffect = {
      kind: "spellCondition",
      effectRef: battleEffectExecutionRefForTest(
        "potent-cantrip-relationship-effect",
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "potent-cantrip-relationship-source",
      ),
      sourceCombatantId: charmSourceId,
      condition: "charmed",
      conditionHadNonSpellSource: false,
      escape: { kind: "targetDamagedByCasterOrAlly" },
      turnStartDamage: null,
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(1),
      },
    } as const satisfies BattleActiveEffect;
    const state = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(
        skeletonId,
        battleCreatureWithSpellActiveEffects(target, [charmEffect]),
      ),
    };
    const subject = findAct(
      battleRuntimeSessionForTest({ state, context: session.context }),
      magicSubject("ray_of_frost"),
    ).subject;
    const targetChoice = targetFill(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [] }),
        "targetChoice",
      ),
      skeletonId,
    );
    const attackMiss = attackRollFill(
      requireHole(
        resolveBattleSubject({ state, subject, fills: [targetChoice] }),
        "attackRoll",
      ),
      { total: 4, naturalD20: 3 },
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss],
      }),
      "rolledDice",
    );
    const damageFill = damageRollFill(damage, 5);
    const relationship = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, attackMiss, damageFill],
      }),
      "damageRelationshipDecisions",
    );
    const [firstQuestion, ...remainingQuestions] = relationship.questions;
    if (firstQuestion === undefined) {
      throw new Error("Expected a target-damaged relationship question.");
    }

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetChoice,
          attackMiss,
          damageFill,
          {
            kind: "damageRelationshipDecisions",
            holeId: relationship.holeId,
            answers: [
              { questionId: firstQuestion.questionId, answer: true },
              ...remainingQuestions.map((question) => ({
                questionId: question.questionId,
                answer: true,
              })),
            ],
          },
        ],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.activeEffects).toEqual(
      [],
    );
  });

  test("applies half cantrip damage on successful cantrip saves", () => {
    const session = potentCantripBattle({ cantrips: ["acid_splash"] });
    const state = session.state;
    const subject = findAct(session, magicSubject("acid_splash")).subject;
    const saves = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "savingThrowOutcome",
    );
    const saveSuccess = savingThrowOutcomeFill(saves, [
      { targetId: skeletonId, succeeded: true },
    ]);
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveSuccess],
      }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [saveSuccess, damageRollFill(damage, 5)],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(11);
  });

  test("does not apply failed-save cantrip effects on a successful save", () => {
    const session = potentCantripBattle({ cantrips: ["vicious_mockery"] });
    const state = session.state;
    const subject = findAct(session, magicSubject("vicious_mockery")).subject;
    const target = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetChoice = targetFill(target, skeletonId);
    const saves = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice],
      }),
      "savingThrowOutcome",
    );
    const saveSuccess = savingThrowOutcomeFill(saves, [
      { targetId: skeletonId, succeeded: true },
    ]);
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, saveSuccess],
      }),
      "rolledDice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetChoice, saveSuccess, damageRollFill(damage, 5)],
      }),
    );

    expect(resolved.state.combatants.get(skeletonId)?.hp).toBe(11);
    expect(resolved.state.combatants.get(skeletonId)?.activeEffects).toEqual(
      [],
    );
  });

  test("does not open Potent Cantrip half-damage for object targets", () => {
    const session = potentCantripBattle({ cantrips: ["fire_bolt"] });
    const state = session.state;
    const subject = findAct(session, magicSubject("fire_bolt")).subject;
    if (subject.tag !== "actionSpell") {
      throw new Error("Expected Fire Bolt action spell subject.");
    }
    const act = discoverBattleActCandidates(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.procedureRef === subject.procedureRef,
    );
    if (act === undefined) {
      throw new Error("Expected Fire Bolt action spell act.");
    }
    const objectId = battleObjectId("potent-cantrip-object-target");
    const objectTargetHole = findHole(act.initialHoles, "objectTargetChoice");
    const sourceProcedureRef =
      battleProcedureExecutionRefForSpellHoleForTest(objectTargetHole);
    const objectTarget = objectTargetFill({
      hole: objectTargetHole,
      objectId,
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          sourceProcedureRef,
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          sourceProcedureRef,
          disposition: { kind: "flammableUnattended" },
        },
      ],
    });
    const attack = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [objectTarget],
      }),
      "attackRoll",
    );
    const miss = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          objectTarget,
          attackRollFill(attack, { total: 4, naturalD20: 3 }),
        ],
      }),
    );

    expect(miss.objectDamages).toBeUndefined();
    expect(miss.snapshot.turn.actionResources).toEqual([]);

    const hit = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          objectTarget,
          attackRollFill(attack, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );

    const missWithHitDamage = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTarget,
        attackRollFill(attack, { total: 4, naturalD20: 3 }),
        damageRollFill(hit, 5),
      ],
    });

    expect(missWithHitDamage).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });
});

function potentCantripBattle(input: {
  readonly cantrips: readonly Parameters<typeof spellRecord>[0][];
  readonly coldImmuneTarget?: boolean;
  readonly withCharmSource?: boolean;
}) {
  const target = input.coldImmuneTarget
    ? statBlockCreature({
        combatantId: skeletonId,
        initiative: 10,
        statBlock: coldImmuneUndeadStatBlock(),
      })
    : skeletonCreatureInit({ initiative: 10 });
  return startBattleSessionRight({
    battleId: battleId("potent-cantrip-runtime"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "wizard", level: 3 }],
        characterUnitRefs: [potentCantripUnitRef],
        unitFeatures: [
          characterBattleFeatureInitForTest(potentCantripUnit, [
            { className: "wizard", level: classLevel(3) },
          ]),
        ],
        spellcasting: wizardSpellcasting({
          cantrips: input.cantrips.map(spellRecord),
          preparedSpells: [],
          spellSlots: [],
        }),
      }),
      target,
      ...(input.withCharmSource
        ? [
            characterSeed({
              combatantId: charmSourceId,
              displayName: "Charm Source",
              initiative: 5,
              attack: null,
            }),
          ]
        : []),
    ],
  });
}

function coldImmuneUndeadStatBlock() {
  const base = statBlockWithCreatureType("undead");
  return {
    ...base,
    statBlock: {
      ...base.statBlock,
      immunities: decodeCreatureImmunityDeclarationSync({
        damageTypes: ["cold"],
      }),
    },
  };
}
