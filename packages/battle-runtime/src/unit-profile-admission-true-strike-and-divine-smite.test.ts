// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31F true_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31C divine_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-damage spell.invocation-spell-hosted-weapon-attack
import { describe, expect, test } from "vitest";
import {
  divineSmiteUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  trueStrikeUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  reactionDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockWithCreatureType,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityModifier,
  attackBonus,
  cantripSpellInvocationRef,
  classLevel,
  combatantId,
  decodeUnitRecordSync,
  DieRollResult,
  discoverBattleActs,
  endTurn,
  Hp,
  proficiencyBonus,
  resolveBattleReaction,
  resolveBattleSubject,
  spellSlotInvocationRef,
  trueStrikeInput,
} from "./unit-profile-admission-test-support.ts";
import type {
  BattleFill,
  BattleSubject,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV31 deterministic True Strike and Divine Smite admission", () => {
  test("true_strike casts through its material weapon using spellcasting ability and cantrip Radiant scaling", () => {
    const unit = decodeUnitRecordSync(trueStrikeInput);
    expect(unit.kind).toBe("spell");
    if (unit.kind !== "spell") return;
    const spell = unit;
    const state = spellBattle({
      cantrips: [spell],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_dagger"),
      casterClassLevels: [{ className: "wizard", level: classLevel(5) }],
      casterProficiencyBonus: proficiencyBonus(3),
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
      targetHp: 20,
      targetMaxHp: 20,
    });
    const act = spellAct({ state, spellId: trueStrikeUnitId });
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");
    const target = requireHole(act.initialHoles, "targetChoice");

    expect(act.subject).toEqual({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        trueStrikeUnitId,
        "spellHostedWeaponAttack",
      ),
      mode: { tag: "cast" },
      componentWeaponItemId: "main:weapon_dagger",
    });
    expect(damageType.choices).toEqual(["radiant", "piercing"]);

    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Dagger",
    );
    const targetFirstDamageType = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "damageTypeChoice",
    );
    expect(targetFirstDamageType.choices).toEqual(["radiant", "piercing"]);

    const attack = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          {
            kind: "damageTypeChoice",
            holeId: damageType.holeId,
            value: "radiant",
          },
          targetFill,
        ],
      }),
      "attackRoll",
    );
    expect(attack.attackBonus).toBe(attackBonus(6));

    const attackFill: Extract<BattleFill, { readonly kind: "attackRoll" }> = {
      kind: "attackRoll",
      holeId: attack.holeId,
      value: { total: 15, naturalD20: DieRollResult(12) },
    };
    const awaitingDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "damageTypeChoice",
          holeId: damageType.holeId,
          value: "radiant",
        },
        targetFill,
        attackFill,
      ],
    });
    const damage = requireResultHole(awaitingDamage, "rolledDice");
    if (!("attack" in damage)) {
      throw new Error("Expected True Strike weapon attack damage hole.");
    }
    expect(damage.spellWeaponDamageRiders).toEqual([
      {
        kind: "attackSpellDamageAddition",
        sourceSpellId: trueStrikeUnitId,
        sourceCombatantId: spellCasterId,
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "radiant",
        },
      },
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        {
          kind: "damageTypeChoice",
          holeId: damageType.holeId,
          value: "radiant",
        },
        targetFill,
        attackFill,
        damageRollFillWithGroups(damage, [[4], [5]]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected True Strike to resolve.");
    }
    expect(requireCombatant(resolved.state, spellTargetId).hp).toBe(Hp(8));
  });
  test("true_strike is not offered for a non-proficient material weapon", () => {
    const unit = decodeUnitRecordSync(trueStrikeInput);
    expect(unit.kind).toBe("spell");
    if (unit.kind !== "spell") return;
    const state = spellBattle({
      cantrips: [unit],
      spellSlots: [],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      casterClassLevels: [{ className: "wizard", level: classLevel(5) }],
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          act.subject.invocation.spellId === trueStrikeUnitId,
      ),
    ).toBe(false);
  });
  test("divine_smite is not offered as an ordinary Spell act", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          (act.subject.tag === "actionSpell" ||
            act.subject.tag === "bonusActionSpell") &&
          act.subject.invocation.spellId === divineSmiteUnitId,
      ),
    ).toBe(false);
  });
  test("divine_smite cannot be manually readied through the ordinary Spell resolver path", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });

    const readied = resolveBattleSubject({
      state,
      subject: {
        tag: "actionSpell",
        actorId: spellCasterId,
        invocation: spellSlotInvocationRef(
          divineSmiteUnitId,
          1,
          "afterHitDamage",
        ),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    });

    expect(readied).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
    });
    expect(state.readiedSpells.has(spellCasterId)).toBe(false);
  });
  test("divine_smite is admitted after an Unarmed Strike hit", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: null,
    });
    const subject: Extract<BattleSubject, { readonly tag: "action" }> = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Unarmed Strike",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, attackRollFill(roll, { total: 15, naturalD20: 10 })],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite Unarmed Strike hit to open an attack-hit window.",
      );
    }
    expect(awaitingReaction.snapshot.pendingReaction?.choices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "castAttackHitBonusActionSpell",
          reactorId: spellCasterId,
        }),
      ]),
    );
  });
  test("divine_smite on a base Unarmed Strike keeps the strike Bludgeoning and adds Radiant dice", () => {
    const skeletonTargetId = combatantId("unit-profile-divine-smite-skeleton");
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: null,
      statBlockTargets: [
        {
          combatantId: skeletonTargetId,
          statBlock: statBlockCatalog.requireStatBlock("stat_block_skeleton"),
          initiative: 9,
        },
      ],
    });
    const subject: Extract<BattleSubject, { readonly tag: "action" }> = {
      tag: "action",
      actorId: spellCasterId,
      action: "attack",
      attackName: "Unarmed Strike",
    };
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      skeletonTargetId,
      "Unarmed Strike",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite Unarmed Strike hit to open an attack-hit window.",
      );
    }
    const smiteChoice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (choice) =>
        choice.kind === "castAttackHitBonusActionSpell" &&
        choice.reactorId === spellCasterId,
    );
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Divine Smite after-hit choice.");
    }

    const afterSmite = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });

    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite replay to need attack damage.");
    }
    const damage = requireHole(afterSmite.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: divineSmiteUnitId,
            damage: {
              expr: { dice: 3, dieSize: 8 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state: afterSmite.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(damage, [[1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Divine Smite Unarmed Strike to resolve.");
    }
    expect(requireCombatant(resolved.state, skeletonTargetId).hp).toBe(Hp(8));
  });
  test("divine_smite is not admitted after a ranged weapon hit", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
    });
    const subject = weaponAttackSubject("Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Shortbow",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const afterHit = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, attackRollFill(roll, { total: 15, naturalD20: 10 })],
    });

    expect(afterHit).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: null },
    });
  });
  test("divine_smite is admitted after a melee weapon hit and adds Radiant damage without replaying the base attack", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingReaction: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite hit to open an attack-hit window.",
      );
    }
    const smiteChoice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (choice) =>
        choice.kind === "castAttackHitBonusActionSpell" &&
        choice.reactorId === spellCasterId,
    );
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Divine Smite after-hit choice.");
    }

    const afterSmite = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });

    expect(afterSmite).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingReaction: null,
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite replay to need attack damage.");
    }
    const damage = requireHole(afterSmite.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: divineSmiteUnitId,
            damage: {
              expr: { dice: 2, dieSize: 8 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state: afterSmite.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(damage, [[4], [3, 4]]),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Divine Smite damage to resolve.");
    }

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({ combatantId: spellTargetId, hp: 1 }),
        ],
      },
    });
  });
  test("divine_smite validates resources before spending and does not treat Ready as a pre-cast interrupt", () => {
    const divineSmite = spellRecord(divineSmiteUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [divineSmite],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialState,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn to begin.");
    }
    const readiedRay = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        invocation: cantripSpellInvocationRef(
          rayOfFrostUnitId,
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "spellCast" },
      },
      fills: [],
    });
    if (readiedRay.tag !== "resolved") {
      throw new Error("Expected target to ready Ray of Frost.");
    }
    const casterTurn = endTurn({
      state: readiedRay.state,
      actorId: spellTargetId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to resume.");
    }

    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: casterTurn.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingAttackHit = resolveBattleSubject({
      state: casterTurn.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingAttackHit.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite attack-hit window.");
    }
    const smiteChoice =
      awaitingAttackHit.snapshot.pendingReaction?.choices.find(
        (choice) =>
          choice.kind === "castAttackHitBonusActionSpell" &&
          choice.reactorId === spellCasterId,
      );
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Divine Smite after-hit choice.");
    }
    const staleWithoutBonusAction = resolveBattleReaction({
      state: {
        ...awaitingAttackHit.state,
        currentTurnResources: {
          ...awaitingAttackHit.state.currentTurnResources,
          currentHasBonusAction: false,
        },
      },
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });
    expect(staleWithoutBonusAction).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const staleAfterSlotSpend = resolveBattleReaction({
      state: {
        ...awaitingAttackHit.state,
        currentTurnResources: {
          ...awaitingAttackHit.state.currentTurnResources,
          spellSlotUsesThisTurn: [
            {
              kind: "committed",
              combatantId: spellCasterId,
            },
          ],
          levelOnePlusSpellCastsThisTurn: [spellCasterId],
        },
      },
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });
    expect(staleAfterSlotSpend).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const malformedFills = resolveBattleReaction({
      state: awaitingAttackHit.state,
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [targetFill],
          },
        },
      ),
    });
    expect(malformedFills).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const afterSmite = resolveBattleReaction({
      state: awaitingAttackHit.state,
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });

    expect(afterSmite).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "spellCast" }],
      snapshot: {
        pendingReaction: {
          trigger: "spellCast",
          choices: [
            expect.objectContaining({
              kind: "releaseReadiedSpell",
              readiedSpellCasterId: spellTargetId,
            }),
          ],
        },
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite post-cast Ready window.");
    }
    const afterReadyDecline = resolveBattleReaction({
      state: afterSmite.state,
      fill: reactionDecisionFill(
        afterSmite.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: spellTargetId },
      ),
    });
    expect(afterReadyDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingReaction: null },
    });
    if (afterReadyDecline.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite replay to need attack damage.");
    }
    const damage = requireHole(afterReadyDecline.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: divineSmiteUnitId,
            damage: {
              expr: { dice: 2, dieSize: 8 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );
  });
  test("divine_smite scales by slot level and doubles smite dice on critical hits", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 25, naturalD20: 20 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite critical hit to open an attack-hit window.",
      );
    }
    const smiteChoice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (choice) =>
        choice.kind === "castAttackHitBonusActionSpell" &&
        choice.reactorId === spellCasterId,
    );
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Divine Smite after-hit choice.");
    }

    const afterSmite = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });

    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected critical Divine Smite to need attack damage.");
    }
    expect(requireHole(afterSmite.holes, "rolledDice")).toEqual(
      expect.objectContaining({
        critical: true,
        label: expect.stringContaining("8d8"),
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: divineSmiteUnitId,
            damage: {
              expr: { dice: 4, dieSize: 8 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );
  });
  test("divine_smite adds the SRD Fiend or Undead bonus die", () => {
    const undeadId = combatantId("unit-profile-divine-smite-undead");
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      statBlockTargets: [
        {
          combatantId: undeadId,
          statBlock: statBlockWithCreatureType("undead"),
          initiative: 9,
        },
      ],
    });
    const subject = weaponAttackSubject("Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      undeadId,
      "Longsword",
    );
    const roll = requireResultHole(
      resolveBattleSubject({ state, subject, fills: [targetFill] }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite hit to open an attack-hit window.",
      );
    }
    const smiteChoice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (choice) =>
        choice.kind === "castAttackHitBonusActionSpell" &&
        choice.reactorId === spellCasterId,
    );
    if (
      smiteChoice === undefined ||
      smiteChoice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Divine Smite after-hit choice.");
    }

    const afterSmite = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: smiteChoice.invocation,
            fills: [],
          },
        },
      ),
    });

    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite replay to need attack damage.");
    }
    expect(requireHole(afterSmite.holes, "rolledDice")).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: divineSmiteUnitId,
            damage: {
              expr: { dice: 3, dieSize: 8 },
              damageType: "radiant",
            },
          }),
        ],
      }),
    );
  });
});
