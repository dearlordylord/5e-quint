// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.potent-cantrip
import { describe, expect, test } from "vitest";

import {
  attackRollFill,
  battleId,
  battleObjectId,
  characterSeed,
  damageRollFill,
  discoverBattleActs,
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
  startBattleRight,
  supportedBattleUnitRef,
  targetFill,
  unitLibrary,
  wizardId,
  wizardSpellcasting,
  armorClass,
} from "./battle-runtime-test-support.ts";

const potentCantripUnit = unitLibrary.requireUnit("wizard_potent_cantrip");
const potentCantripUnitRef = supportedBattleUnitRef(potentCantripUnit);

describe("Potent Cantrip runtime", () => {
  test("projects the admitted Potent Cantrip profile into character battle state", () => {
    const state = potentCantripBattle({ cantrips: ["ray_of_frost"] });
    const wizard = state.combatants.get(wizardId);

    expect(wizard?.origin.kind).toBe("character");
    if (wizard?.origin.kind !== "character") {
      throw new Error("Expected Wizard character origin.");
    }
    expect([...wizard.origin.potentCantripProfiles.keys()]).toEqual([
      "wizard_potent_cantrip",
    ]);
  });

  test("applies half cantrip damage on a missed spell attack without hit riders", () => {
    const state = potentCantripBattle({ cantrips: ["ray_of_frost"] });
    const subject = magicSubject("ray_of_frost");
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
    const state = potentCantripBattle({ cantrips: ["shocking_grasp"] });
    const subject = magicSubject("shocking_grasp");
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
    const state = potentCantripBattle({ cantrips: ["starry_wisp"] });
    const subject = magicSubject("starry_wisp");
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

  test("applies half cantrip damage on successful cantrip saves", () => {
    const state = potentCantripBattle({ cantrips: ["acid_splash"] });
    const subject = magicSubject("acid_splash");
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
    const state = potentCantripBattle({ cantrips: ["vicious_mockery"] });
    const subject = magicSubject("vicious_mockery");
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
    const state = potentCantripBattle({ cantrips: ["fire_bolt"] });
    const subject = magicSubject("fire_bolt");
    const act = discoverBattleActs(state).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === "fire_bolt",
    );
    if (act === undefined) {
      throw new Error("Expected Fire Bolt action spell act.");
    }
    const objectId = battleObjectId("potent-cantrip-object-target");
    const objectTarget = objectTargetFill({
      hole: findHole(act.initialHoles, "objectTargetChoice"),
      objectId,
      spellId: "fire_bolt",
      rangeFeet: movementFeet(120),
      damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
      spatialFacts: [
        {
          kind: "spellObjectTarget",
          casterId: wizardId,
          objectId,
          spellId: "fire_bolt",
          rangeFeet: movementFeet(120),
          armorClass: armorClass(13),
          damageDisposition: { kind: "hitPoints", hitPoints: Hp(8) },
        },
        {
          kind: "spellObjectIgnition",
          casterId: wizardId,
          objectId,
          spellId: "fire_bolt",
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
}) {
  return startBattleRight({
    battleId: battleId("potent-cantrip-runtime"),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "wizard", level: 3 }],
        characterUnitRefs: [potentCantripUnitRef],
        unitFeatures: [{ unit: potentCantripUnit }],
        spellcasting: wizardSpellcasting({
          cantrips: input.cantrips.map(spellRecord),
          preparedSpells: [],
          spellSlots: [],
        }),
      }),
      skeletonCreatureInit({ initiative: 10 }),
    ],
  });
}
