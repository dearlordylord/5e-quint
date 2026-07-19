import { describe, expect, test } from "vitest";
import {
  armorClass,
  attackRollFill,
  battleId,
  battleObjectId,
  battleProcedureExecutionRefForTest,
  characterSeed,
  damageAmount,
  damageRollFillWithGroups,
  findAct,
  findHole,
  Hp,
  magicSubject,
  movementFeet,
  objectTargetFill,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  skeletonCreatureInit,
  skeletonId,
  spellRecord,
  startBattleRight,
  wizardId,
  wizardSpellcasting,
} from "./battle-runtime-test-support.ts";

describe("battle runtime: Fire Bolt object targets", () => {
  test("Fire Bolt object target requires ignition facts before resolving the object attack", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fire-bolt-object-missing-ignition"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("fire_bolt");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        objectTargetFill({
          hole: objectTarget,
          spellId: "fire_bolt",
          rangeFeet: movementFeet(120),
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell object target must include a matching table-supplied object ignition fact.",
    });
  });

  test("Fire Bolt applies cantrip-scaled Fire damage and ignites unattended flammable object hits", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fire-bolt-object-hit"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          classLevel: 5,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("fire_bolt");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("dry-training-dummy");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "fire_bolt",
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("fire_bolt"),
          ),
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("fire_bolt"),
          ),
          disposition: { kind: "flammableUnattended" },
        },
      ],
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );
    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );

    expect(damage).toMatchObject({
      label: "Fire Bolt damage (2d10-fire)",
    });

    const result = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[4, 5]]),
      ],
    });

    expect(result).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          damageType: "fire",
          rolledDamage: damageAmount(9),
          effectiveDamage: damageAmount(9),
          priorHitPoints: Hp(8),
          nextHitPoints: Hp(0),
          destroyed: true,
        },
      ],
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId,
          sourceCombatantId: wizardId,
          sourceProcedureRef: expect.any(String),
        },
      ],
      snapshot: {
        combatants: [
          { combatantId: wizardId, hp: 12 },
          { combatantId: skeletonId, hp: 13 },
        ],
        turn: { actionResources: [] },
      },
    });
  });

  test("Fire Bolt object miss and non-igniting object hit do not emit object ignition outcomes", () => {
    const state = startBattleRight({
      battleId: battleId("battle-fire-bolt-object-no-ignition"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          attack: null,
          spellcasting: wizardSpellcasting({
            cantrips: [spellRecord("fire_bolt")],
            preparedSpells: [],
          }),
        }),
        skeletonCreatureInit({ initiative: 10 }),
      ],
    });
    const subject = magicSubject("fire_bolt");
    const objectTarget = findHole(
      findAct(state, subject).initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("training-object");
    const targetFillForObject = objectTargetFill({
      hole: objectTarget,
      objectId,
      spellId: "fire_bolt",
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "tableResolved" },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("fire_bolt"),
          ),
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "tableResolved" },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("fire_bolt"),
          ),
          disposition: { kind: "wornOrCarried" },
        },
      ],
    });
    const attackRoll = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [targetFillForObject],
      }),
      "attackRoll",
    );

    const miss = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 12, naturalD20: 7 }),
      ],
    });

    expect(miss).toMatchObject({ tag: "resolved" });
    expect("objectDamages" in requireResolved(miss)).toBe(false);
    expect("objectIgnitions" in requireResolved(miss)).toBe(false);

    const damage = requireHole(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          targetFillForObject,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hit = resolveBattleSubject({
      state,
      subject,
      fills: [
        targetFillForObject,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[6]]),
      ],
    });

    expect(hit).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "tableResolved",
          damageType: "fire",
          rolledDamage: damageAmount(6),
        },
      ],
    });
    expect("objectIgnitions" in requireResolved(hit)).toBe(false);
  });
});
