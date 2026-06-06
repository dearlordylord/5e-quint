// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84G sanctuary
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-sanctuary-targeting-interdiction
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";

import { defaultArmorClassState } from "@dnd/shared-algebras/armor-class-algebra";
import {
  abilityModifier,
  attackBonus,
  DieRollResult,
  Hp,
  movementFeet,
  proficiencyBonus,
} from "@dnd/shared/types";
import {
  buildUnitCatalog,
  srdUnitCollection,
} from "@dnd/surface/surface/unit-catalog";
import type { SpellRecord } from "@dnd/surface/surface/types";

import {
  battleCombatantSide,
  battleId,
  characterId,
  combatantId,
  discoverBattleActs,
  initiativeScore,
  BattleHoleSchema,
  resolveBattleSubject,
  startBattle,
  type BattleCreatureInit,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import { testCharacterD20Statistics } from "./battle-runtime-test-d20-statistics.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";

const unitCatalogResult = buildUnitCatalog({
  collections: [srdUnitCollection],
});
if (unitCatalogResult.tag !== "ok") {
  throw new Error("Sanctuary test Unit catalog must build.");
}

const unitLibrary = unitCatalogResult.catalog;
const sanctuaryUnitId = "sanctuary";
const burningHandsUnitId = "burning_hands";
const chromaticOrbUnitId = "chromatic_orb";
const eldritchBlastUnitId = "eldritch_blast";
const fireBoltUnitId = "fire_bolt";
const iceKnifeUnitId = "ice_knife";
const longstriderUnitId = "longstrider";
const magicMissileUnitId = "magic_missile";
const sacredFlameUnitId = "sacred_flame";
const casterId = combatantId("sanctuary-caster");
const wardedId = combatantId("sanctuary-warded");
const attackerId = combatantId("sanctuary-attacker");
const replacementId = combatantId("sanctuary-replacement");
const partySide = battleCombatantSide("party");
const enemySide = battleCombatantSide("enemy");

describe("Sanctuary targeting interdiction", () => {
  test("casts as a Bonus Action and wards one creature", () => {
    const state = battleWithSanctuary();
    const cast = castSanctuary(state, wardedId);

    expect(combatant(cast, wardedId).activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "sanctuaryWard",
        sourceSpellId: sanctuaryUnitId,
        sourceCombatantId: casterId,
        save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
      }),
    );
  });

  test("public codec decodes the Sanctuary target-list hole", () => {
    const act = discoverBattleActs(battleWithSanctuary()).find(
      (candidate) =>
        candidate.subject.tag === "bonusActionSpell" &&
        candidate.subject.invocation.procedure ===
          "sanctuaryTargetingInterdiction",
    );
    if (act === undefined || act.subject.tag !== "bonusActionSpell") {
      throw new Error("Expected Sanctuary Bonus Action spell act.");
    }
    const decoded = Schema.decodeUnknownEither(BattleHoleSchema)(
      requireHole(act.initialHoles, "spellTargetList"),
    );

    if (Either.isLeft(decoded)) {
      throw new Error(String(decoded.left));
    }
    expect(decoded.right).toMatchObject({
      kind: "spellTargetList",
      spell: { procedure: "sanctuaryTargetingInterdiction" },
    });
  });

  test("failed save can lose a direct attack against the warded creature", () => {
    const warded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const attack = attackAct(warded);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    });

    expect(needsSanctuary).toMatchObject({
      tag: "needsHoles",
      holes: [
        expect.objectContaining({ kind: "sanctuaryInterdictionOutcome" }),
      ],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost attack to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("successful save proceeds to the attack roll", () => {
    const warded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const attack = attackAct(warded);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const needsAttackRoll = resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: true },
        ),
      ],
    });

    expect(needsAttackRoll).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
    });
  });

  test("failed save can choose a new legal attack target", () => {
    const warded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const attack = attackAct(warded);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const retargeted = resolveBattleSubject({
      state: warded,
      subject: attack.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          {
            saveSucceeded: false,
            outcome: {
              kind: "newTarget",
              targetId: replacementId,
              spatialFacts: [attackTargetFact(replacementId)],
            },
          },
        ),
      ],
    });

    expect(retargeted).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "attackRoll" })],
    });
  });

  test("failed save can lose a direct damaging spell against the warded creature", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === fireBoltUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Fire Bolt action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      fireBoltUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose a direct save-damage spell against the warded creature", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === sacredFlameUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Sacred Flame action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      sacredFlameUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose Magic Missile allocation against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === magicMissileUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Magic Missile action spell.");
    }
    const allocationFill = spellTargetAllocationFill(
      requireHole(act.initialHoles, "spellTargetAllocation"),
      magicMissileUnitId,
      wardedId,
      3,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [allocationFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        allocationFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose Eldritch Blast beam targeting the warded creature", () => {
    const warded = castSanctuary(battleWithSanctuary(), wardedId);
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === eldritchBlastUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Eldritch Blast action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      eldritchBlastUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("each Eldritch Blast beam against the warded creature requires its own Wisdom save", () => {
    const warded = castSanctuary(
      battleWithSanctuary({ casterLevel: 5 }),
      wardedId,
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === eldritchBlastUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Eldritch Blast action spell.");
    }
    const targetHoles = act.initialHoles.filter(
      (hole): hole is Extract<BattleHole, { readonly kind: "targetChoice" }> =>
        hole.kind === "targetChoice",
    );
    expect(targetHoles).toHaveLength(2);
    const targetFills = targetHoles.map((hole) =>
      spellTargetFill(hole, eldritchBlastUnitId, casterId, wardedId),
    );
    const needsFirstSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: targetFills,
    });
    if (needsFirstSanctuary.tag !== "needsHoles") {
      throw new Error("Expected first Sanctuary interdiction hole.");
    }
    const firstSanctuaryHole = requireHole(
      needsFirstSanctuary.holes,
      "sanctuaryInterdictionOutcome",
    );
    expect(firstSanctuaryHole).toMatchObject({ ability: "wis" });

    const needsFirstAttackRoll = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        ...targetFills,
        sanctuaryOutcomeFill(firstSanctuaryHole, { saveSucceeded: true }),
      ],
    });
    if (needsFirstAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected first Eldritch Blast attack roll hole.");
    }
    const firstAttackRoll = requireHole(
      needsFirstAttackRoll.holes,
      "attackRoll",
    );

    const needsSecondSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        ...targetFills,
        sanctuaryOutcomeFill(firstSanctuaryHole, { saveSucceeded: true }),
        attackRollFill(firstAttackRoll, { total: 1, naturalD20: 1 }),
      ],
    });
    if (needsSecondSanctuary.tag !== "needsHoles") {
      throw new Error("Expected second Sanctuary interdiction hole.");
    }
    const secondSanctuaryHole = requireHole(
      needsSecondSanctuary.holes,
      "sanctuaryInterdictionOutcome",
    );
    expect(secondSanctuaryHole).toMatchObject({ ability: "wis" });
    expect(secondSanctuaryHole.holeId).not.toBe(firstSanctuaryHole.holeId);
  });

  test("failed save can lose Ice Knife initial target against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === iceKnifeUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Ice Knife action spell.");
    }
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      iceKnifeUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose Chromatic Orb primary target against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === chromaticOrbUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Chromatic Orb action spell.");
    }
    const damageTypeFill = spellDamageTypeChoiceFill(
      requireHole(act.initialHoles, "damageTypeChoice"),
      "acid",
    );
    const needsTarget = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [damageTypeFill],
    });
    if (needsTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb target hole.");
    }
    const targetFill = spellTargetFill(
      requireHole(needsTarget.holes, "targetChoice"),
      chromaticOrbUnitId,
      casterId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [damageTypeFill, targetFill],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        damageTypeFill,
        targetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost spell to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("failed save can lose Chromatic Orb leap target against the warded creature", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === chromaticOrbUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Chromatic Orb action spell.");
    }
    const damageTypeFill = spellDamageTypeChoiceFill(
      requireHole(act.initialHoles, "damageTypeChoice"),
      "acid",
    );
    const needsPrimaryTarget = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [damageTypeFill],
    });
    if (needsPrimaryTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb primary target hole.");
    }
    const primaryTargetFill = spellTargetFill(
      requireHole(needsPrimaryTarget.holes, "targetChoice"),
      chromaticOrbUnitId,
      casterId,
      replacementId,
    );
    const needsAttack = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [damageTypeFill, primaryTargetFill],
    });
    if (needsAttack.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb attack roll hole.");
    }
    const attackFill = attackRollFill(
      requireHole(needsAttack.holes, "attackRoll"),
    );
    const needsDamage = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [damageTypeFill, primaryTargetFill, attackFill],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb damage roll hole.");
    }
    const duplicateDamageFill = rolledDiceFill(
      requireHole(needsDamage.holes, "rolledDice"),
      [4, 4, 1],
    );
    const needsLeapTarget = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        attackFill,
        duplicateDamageFill,
      ],
    });
    if (needsLeapTarget.tag !== "needsHoles") {
      throw new Error("Expected Chromatic Orb leap target hole.");
    }
    const leapTargetFill = spellLeapTargetFill(
      requireHole(needsLeapTarget.holes, "targetChoice"),
      replacementId,
      wardedId,
    );
    const needsSanctuary = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        attackFill,
        duplicateDamageFill,
        leapTargetFill,
      ],
    });
    if (needsSanctuary.tag !== "needsHoles") {
      throw new Error("Expected Sanctuary interdiction hole.");
    }

    const lost = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        damageTypeFill,
        primaryTargetFill,
        attackFill,
        duplicateDamageFill,
        leapTargetFill,
        sanctuaryOutcomeFill(
          requireHole(needsSanctuary.holes, "sanctuaryInterdictionOutcome"),
          { saveSucceeded: false, outcome: { kind: "loseAttackOrSpell" } },
        ),
      ],
    });

    expect(lost).toMatchObject({ tag: "resolved" });
    if (lost.tag !== "resolved") {
      throw new Error("Expected lost leap to resolve.");
    }
    expect(combatant(lost.state, wardedId).hp).toBe(Hp(12));
  });

  test("area-effect damaging spells do not trigger Sanctuary interdiction", () => {
    const warded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), wardedId),
    );
    const act = discoverBattleActs(warded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === burningHandsUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Burning Hands action spell.");
    }
    const save = requireHole(act.initialHoles, "savingThrowOutcome");

    const needsDamage = resolveBattleSubject({
      state: warded,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(save, [
          { targetId: wardedId, succeeded: false },
        ]),
      ],
    });

    expect(needsDamage).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "rolledDice" })],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Burning Hands damage roll hole.");
    }
    expect(needsDamage.holes).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sanctuaryInterdictionOutcome" }),
      ]),
    );
  });

  test("ward remains while a warded caster is only requesting spell target holes", () => {
    const selfWarded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), casterId),
    );
    const act = discoverBattleActs(selfWarded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === fireBoltUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Fire Bolt action spell.");
    }

    const needsTarget = resolveBattleSubject({
      state: selfWarded,
      subject: act.subject,
      fills: [],
    });

    expect(needsTarget).toMatchObject({ tag: "needsHoles" });
    if (needsTarget.tag !== "needsHoles") {
      throw new Error("Expected Fire Bolt target holes.");
    }
    expect(needsTarget.holes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "targetChoice" }),
      ]),
    );
    expect(combatant(needsTarget.state, casterId).activeEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sanctuaryWard" }),
      ]),
    );
  });

  test("ward ends when the warded creature casts a support-effect spell", () => {
    const selfWarded = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), casterId),
    );
    const act = discoverBattleActs(selfWarded).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        candidate.subject.invocation.spellId === longstriderUnitId,
    );
    if (act === undefined || act.subject.tag !== "actionSpell") {
      throw new Error("Expected Longstrider action spell.");
    }

    const resolved = resolveBattleSubject({
      state: selfWarded,
      subject: act.subject,
      fills: [
        spellTargetFill(
          requireHole(act.initialHoles, "targetChoice"),
          longstriderUnitId,
          casterId,
          casterId,
        ),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Longstrider to resolve.");
    }
    expect(combatant(resolved.state, casterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sanctuaryWard" }),
      ]),
    );
  });

  test("ward ends when the warded creature makes an attack roll, casts a spell, or deals damage", () => {
    const selfWarded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), attackerId),
    );
    const attack = attackAct(selfWarded, wardedId);
    const targetFill = attackTargetFill(
      requireHole(attack.initialHoles, "targetChoice"),
      wardedId,
    );
    const needsAttackRoll = resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [targetFill],
    });
    if (needsAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected attack roll hole.");
    }

    const needsDamage = resolveBattleSubject({
      state: selfWarded,
      subject: attack.subject,
      fills: [
        targetFill,
        attackRollFill(requireHole(needsAttackRoll.holes, "attackRoll")),
      ],
    });
    if (needsDamage.tag !== "needsHoles" && needsDamage.tag !== "resolved") {
      throw new Error("Expected attack roll to progress.");
    }
    expect(combatant(needsDamage.state, attackerId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sanctuaryWard" }),
      ]),
    );

    const recast = advanceRoundToCaster(
      castSanctuary(battleWithSanctuary(), casterId),
    );
    const afterSpellCast = castSanctuary(recast, wardedId);
    expect(combatant(afterSpellCast, casterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sanctuaryWard" }),
      ]),
    );

    const damageSourceWarded = advanceToAttacker(
      castSanctuary(battleWithSanctuary(), attackerId),
    );
    const afterDamage = applyBattleHitPointDamage({
      state: damageSourceWarded,
      target: combatant(damageSourceWarded, wardedId),
      damageAmount: 1,
      deathFailuresAtZeroHp: 1,
      damageSourceId: attackerId,
    });
    expect(combatant(afterDamage, attackerId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "sanctuaryWard" }),
      ]),
    );
  });
});

function srdSpellRecord(unitId: string): SpellRecord {
  const unit = unitLibrary.requireUnit(unitId);
  if (unit.kind !== "spell") {
    throw new Error(`Expected SRD catalog unit ${unitId} to be a Spell.`);
  }
  return unit;
}

function battleWithSanctuary(
  input: { readonly casterLevel?: number } = {},
): BattleState {
  const result = startBattle({
    battleId: battleId("sanctuary-targeting-interdiction"),
    combatants: [
      characterCreature(
        casterId,
        "Caster",
        20,
        partySide,
        {
          sourceClassName: "cleric",
          spellcastingAbilityModifier: abilityModifier(3),
          proficiencyBonus: proficiencyBonus(2),
          canCastSpells: true,
          cantrips: [
            srdSpellRecord(eldritchBlastUnitId),
            srdSpellRecord(fireBoltUnitId),
            srdSpellRecord(sacredFlameUnitId),
          ],
          preparedSpells: [
            srdSpellRecord(sanctuaryUnitId),
            srdSpellRecord(burningHandsUnitId),
            srdSpellRecord(chromaticOrbUnitId),
            srdSpellRecord(iceKnifeUnitId),
            srdSpellRecord(longstriderUnitId),
            srdSpellRecord(magicMissileUnitId),
          ],
          featurePreparedSpells: [],
          spellbookRitualSpellAccesses: [],
          invocationSpellAccesses: [],
          spellSlots: [{ spellLevel: 1, count: 2 }],
        },
        input.casterLevel,
      ),
      characterCreature(wardedId, "Warded", 15, partySide),
      characterCreature(attackerId, "Attacker", 10, enemySide),
      characterCreature(replacementId, "Replacement", 9, partySide),
    ],
  });
  expect(Either.isRight(result)).toBe(true);
  if (Either.isLeft(result)) {
    throw new Error(result.left.message);
  }
  return result.right;
}

function castSanctuary(state: BattleState, targetId: CombatantId): BattleState {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.procedure ===
        "sanctuaryTargetingInterdiction",
  );
  if (act === undefined || act.subject.tag !== "bonusActionSpell") {
    throw new Error("Expected Sanctuary Bonus Action spell act.");
  }
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [sanctuaryTargetListFill(targetHole, targetId)],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Sanctuary cast to resolve.");
  }
  return resolved.state;
}

function advanceToAttacker(state: BattleState): BattleState {
  return endTurnFor(endTurnFor(state, casterId), wardedId);
}

function advanceRoundToCaster(state: BattleState): BattleState {
  return endTurnFor(
    endTurnFor(endTurnFor(endTurnFor(state, casterId), wardedId), attackerId),
    replacementId,
  );
}

function endTurnFor(state: BattleState, actorId: CombatantId): BattleState {
  const resolved = resolveBattleSubject({
    state,
    subject: { tag: "runtimeCommand", actorId, command: "endTurn" },
    fills: [],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(`Expected ${actorId} to end turn.`);
  }
  return resolved.state;
}

function attackAct(state: BattleState, targetId = wardedId) {
  const act = discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "action" &&
      candidate.subject.action === "attack" &&
      requireHole(candidate.initialHoles, "targetChoice").choices.includes(
        targetId,
      ),
  );
  if (act === undefined || act.subject.tag !== "action") {
    throw new Error("Expected attacker Attack act.");
  }
  return act;
}

function sanctuaryTargetListFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetList" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "spellTargetList" }> {
  return {
    kind: "spellTargetList",
    holeId: hole.holeId,
    value: { targetIds: [targetId] },
    spatialFacts: [
      { kind: "spellTarget", casterId, targetId, spellId: sanctuaryUnitId },
    ],
  };
}

function attackTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [attackTargetFact(targetId)],
  };
}

function spellTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  spellId: string,
  casterIdValue: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      { kind: "spellTarget", casterId: casterIdValue, targetId, spellId },
    ],
  };
}

function spellLeapTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
  previousTargetId: CombatantId,
  targetId: CombatantId,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: targetId,
    spatialFacts: [
      {
        kind: "spellLeapTargetWithinRange",
        previousTargetId,
        targetId,
        spellId: chromaticOrbUnitId,
        rangeFeet: movementFeet(30),
      },
    ],
  };
}

function spellTargetAllocationFill(
  hole: Extract<BattleHole, { readonly kind: "spellTargetAllocation" }>,
  spellId: string,
  targetId: CombatantId,
  count: number,
): Extract<BattleFill, { readonly kind: "spellTargetAllocation" }> {
  return {
    kind: "spellTargetAllocation",
    holeId: hole.holeId,
    value: { allocations: [{ targetId, count }] },
    spatialFacts: [{ kind: "spellTarget", casterId, targetId, spellId }],
  };
}

function spellDamageTypeChoiceFill(
  hole: Extract<BattleHole, { readonly kind: "damageTypeChoice" }>,
  value: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>["value"],
): Extract<BattleFill, { readonly kind: "damageTypeChoice" }> {
  return { kind: "damageTypeChoice", holeId: hole.holeId, value };
}

function attackTargetFact(targetId: CombatantId) {
  return {
    kind: "attackTargetInMeleeReach" as const,
    actorId: attackerId,
    targetId,
    attackName: "Unarmed Strike",
  };
}

function attackRollFill(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
  value: { readonly total: number; readonly naturalD20: number } = {
    total: 18,
    naturalD20: 12,
  },
): Extract<BattleFill, { readonly kind: "attackRoll" }> {
  return {
    kind: "attackRoll",
    holeId: hole.holeId,
    value: { total: value.total, naturalD20: DieRollResult(value.naturalD20) },
  };
}

function rolledDiceFill(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
  faces: readonly number[],
): Extract<BattleFill, { readonly kind: "rolledDice" }> {
  const [first, ...rest] = faces;
  if (first === undefined) {
    throw new Error("Expected at least one die face.");
  }
  return {
    kind: "rolledDice",
    holeId: hole.holeId,
    value: [
      {
        results: [DieRollResult(first), ...rest.map(DieRollResult)],
      },
    ],
  };
}

function savingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: casterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
      },
      outcomes,
    },
  };
}

function sanctuaryOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "sanctuaryInterdictionOutcome" }>,
  value: Extract<
    BattleFill,
    { readonly kind: "sanctuaryInterdictionOutcome" }
  >["value"],
): Extract<BattleFill, { readonly kind: "sanctuaryInterdictionOutcome" }> {
  return { kind: "sanctuaryInterdictionOutcome", holeId: hole.holeId, value };
}

function characterCreature(
  combatantIdValue: CombatantId,
  displayName: string,
  initiative: number,
  side: ReturnType<typeof battleCombatantSide>,
  spellcasting?: Extract<
    BattleCreatureInit["creatureInit"],
    { readonly kind: "character" }
  >["spellcasting"],
  classLevel = 1,
): BattleCreatureInit {
  return {
    combatantId: combatantIdValue,
    displayName,
    initiative: initiativeScore(initiative),
    side,
    creatureInit: {
      kind: "character",
      characterId: characterId(`${combatantIdValue}-character`),
      characterUnitRefs: [],
      classLevels: [{ className: "cleric", level: classLevel }],
      knownLanguages: ["Common"],
      d20Statistics: testCharacterD20Statistics(),
      armorClass: defaultArmorClassState(),
      size: "medium",
      speed: { walkFeet: movementFeet(30) },
      currentHp: Hp(12),
      maxHp: Hp(12),
      tempHp: Hp(0),
      selectedLoadout: {},
      attack: null,
      unarmedStrike: {
        kind: "unarmedStrike",
        effect: {
          kind: "damage",
          damage: { kind: "base", damageType: "bludgeoning", flat: 1 },
        },
        attackAbility: "str",
        attackAbilityModifier: abilityModifier(0),
        attackBonus: attackBonus(2),
        damageAbilityModifier: abilityModifier(0),
      },
      ...(spellcasting === undefined ? {} : { spellcasting }),
    },
  };
}

function requireHole<K extends BattleHole["kind"]>(
  holes: readonly BattleHole[],
  kind: K,
): Extract<BattleHole, { readonly kind: K }> {
  const hole = holes.find(
    (candidate): candidate is Extract<BattleHole, { readonly kind: K }> =>
      candidate.kind === kind,
  );
  if (hole === undefined) {
    throw new Error(`Expected ${kind} hole.`);
  }
  return hole;
}

function combatant(state: BattleState, id: CombatantId) {
  const found = state.combatants.get(id);
  if (found === undefined) {
    throw new Error(`Expected combatant ${id}.`);
  }
  return found;
}
