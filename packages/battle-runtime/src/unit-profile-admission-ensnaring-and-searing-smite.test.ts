// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31D ensnaring_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31E searing_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-restraint-turn-start-damage spell.invocation-after-hit-timed-damage-save
import { describe, expect, test } from "vitest";
import {
  ensnaringStrikeHelperId,
  ensnaringStrikeUnitId,
  rayOfFrostUnitId,
  searingSmiteUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  abilityCheckFill,
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  reactionDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import { savingThrowOutcomeFill } from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityModifier,
  cantripSpellInvocationRef,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  Hp,
  proficiencyBonus,
  resolveBattleReaction,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV31 deterministic Ensnaring Strike and Searing Smite admission", () => {
  test("ensnaring_strike restrains after a weapon hit, damages at turn start, and can be escaped", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      extraTargetIds: [ensnaringStrikeHelperId],
      targetHp: 20,
      targetMaxHp: 20,
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
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castAttackHitBonusActionSpell" &&
        candidate.invocation.spellId === ensnaringStrikeUnitId,
    );
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    expect(save).toMatchObject({ ability: "str" });
    const afterEnsnaring = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: choice.invocation,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    if (afterEnsnaring.tag !== "needsHoles") {
      throw new Error(
        "Expected Ensnaring Strike replay to need attack damage.",
      );
    }
    const damage = requireHole(afterEnsnaring.holes, "rolledDice");
    const afterWeaponDamage = resolveBattleSubject({
      state: afterEnsnaring.state,
      subject,
      fills: [targetFill, rollFill, damageRollFillWithGroups(damage, [[3]])],
    });
    if (afterWeaponDamage.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike host attack to resolve.");
    }
    expect(
      requireCombatant(afterWeaponDamage.state, spellTargetId),
    ).toMatchObject({
      conditions: expect.objectContaining({ restrained: true }),
    });

    const awaitingTurnStartDamage = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(
      awaitingTurnStartDamage,
      "rolledDice",
    );
    expect(turnStartDamage).toMatchObject({
      spellTurnStartDamage: {
        sourceSpellId: ensnaringStrikeUnitId,
        targetId: spellTargetId,
        trigger: { kind: "condition", condition: "restrained" },
        damage: { expr: { dice: 1, dieSize: 6 }, damageType: "piercing" },
      },
    });
    const targetTurn = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
      fills: [damageRollFillWithGroups(turnStartDamage, [[4]])],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error(
        "Expected Ensnaring Strike turn-start damage to resolve.",
      );
    }
    expect(requireCombatant(targetTurn.state, spellTargetId).hp).toBe(Hp(13));

    const escapeAct = discoverBattleActs(targetTurn.state).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint",
    );
    if (
      escapeAct?.subject.tag !== "action" ||
      escapeAct.subject.action !== "escapeSpellRestraint" ||
      escapeAct.subject.targetId !== spellTargetId
    ) {
      throw new Error("Expected Ensnaring Strike escape action.");
    }
    const escaped = resolveBattleSubject({
      state: targetTurn.state,
      subject: escapeAct.subject,
      fills: [
        abilityCheckFill(
          requireHole(escapeAct.initialHoles, "abilityCheck"),
          13,
        ),
      ],
    });
    if (escaped.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike escape to resolve.");
    }
    expect(requireCombatant(escaped.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      requireCombatant(escaped.state, spellCasterId).concentration,
    ).toBeNull();

    const helperTurnResult = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (helperTurnResult.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike helper turn to start.");
    }
    const helperTurn = helperTurnResult.state;
    const helperEscapeAct = discoverBattleActs(helperTurn).find(
      (act) =>
        act.subject.tag === "action" &&
        act.subject.action === "escapeSpellRestraint" &&
        act.subject.actorId === ensnaringStrikeHelperId &&
        act.subject.targetId === spellTargetId,
    );
    if (
      helperEscapeAct?.subject.tag !== "action" ||
      helperEscapeAct.subject.action !== "escapeSpellRestraint"
    ) {
      throw new Error("Expected Ensnaring Strike helper escape action.");
    }
    const helperEscapeCheck = requireHole(
      helperEscapeAct.initialHoles,
      "abilityCheck",
    );
    expect(helperEscapeCheck).toMatchObject({
      requiresTableSpatialFact: true,
    });
    expect(
      resolveBattleSubject({
        state: helperTurn,
        subject: helperEscapeAct.subject,
        fills: [abilityCheckFill(helperEscapeCheck, 13)],
      }),
    ).toMatchObject({ tag: "invalid" });

    const helperEscaped = resolveBattleSubject({
      state: helperTurn,
      subject: helperEscapeAct.subject,
      fills: [
        abilityCheckFill(helperEscapeCheck, 13, [
          {
            kind: "spellRestraintEscapeActorWithinTargetReach",
            actorId: ensnaringStrikeHelperId,
            targetId: spellTargetId,
          },
        ]),
      ],
    });
    if (helperEscaped.tag !== "resolved") {
      throw new Error("Expected Ensnaring Strike helper escape to resolve.");
    }
    expect(requireCombatant(helperEscaped.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ restrained: false }),
    });
    expect(
      requireCombatant(helperEscaped.state, spellCasterId).concentration,
    ).toBeNull();
  });
  test("searing_smite adds Fire damage after a melee hit, burns at turn start, and a Constitution save ends it", () => {
    const spell = spellRecord(searingSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetHp: 30,
      targetMaxHp: 30,
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
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Searing Smite attack-hit window.");
    }
    const choice = awaitingReaction.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castAttackHitBonusActionSpell" &&
        candidate.invocation.spellId === searingSmiteUnitId,
    );
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Searing Smite after-hit choice.");
    }
    expect(choice.invocation).toEqual(
      spellSlotInvocationRef(
        searingSmiteUnitId,
        3,
        "afterHitTimedDamageAndSave",
      ),
    );

    const afterSearing = resolveBattleReaction({
      state: awaitingReaction.state,
      fill: reactionDecisionFill(
        requireHole(awaitingReaction.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: choice.invocation,
            fills: [],
          },
        },
      ),
    });
    if (afterSearing.tag !== "needsHoles") {
      throw new Error("Expected Searing Smite replay to need attack damage.");
    }
    const damage = requireHole(afterSearing.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceSpellId: searingSmiteUnitId,
            damage: {
              expr: { dice: 3, dieSize: 6 },
              damageType: "fire",
            },
          }),
        ],
      }),
    );
    const afterWeaponDamage = resolveBattleSubject({
      state: afterSearing.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(damage, [[4], [1, 2, 3]]),
      ],
    });
    if (afterWeaponDamage.tag !== "resolved") {
      throw new Error("Expected Searing Smite host attack to resolve.");
    }
    expect(requireCombatant(afterWeaponDamage.state, spellTargetId).hp).toBe(
      Hp(20),
    );

    const awaitingTurnStart = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
    });
    const turnStartDamage = requireResultHole(awaitingTurnStart, "rolledDice");
    expect(turnStartDamage).toMatchObject({
      spellTurnStartDamage: {
        sourceSpellId: searingSmiteUnitId,
        targetId: spellTargetId,
        trigger: {
          kind: "saveToEnd",
          ability: "con",
          dc: { kind: "caster_spell_save_dc" },
        },
        damage: { expr: { dice: 3, dieSize: 6 }, damageType: "fire" },
      },
    });
    const turnStartSave = requireResultHole(
      awaitingTurnStart,
      "savingThrowOutcome",
    );
    expect(turnStartSave).toMatchObject({
      spellTurnStartSave: {
        sourceSpellId: searingSmiteUnitId,
        targetId: spellTargetId,
        save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
      },
    });

    const targetTurn = endTurn({
      state: afterWeaponDamage.state,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(turnStartDamage, [[2, 3, 4]]),
        savingThrowOutcomeFill(turnStartSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Searing Smite turn-start damage to resolve.");
    }
    expect(requireCombatant(targetTurn.state, spellTargetId).hp).toBe(Hp(11));
    expect(
      requireCombatant(targetTurn.state, spellTargetId).activeEffects.some(
        (effect) =>
          effect.kind === "spellTurnStartDamageAndSave" &&
          effect.sourceSpellId === searingSmiteUnitId,
      ),
    ).toBe(false);

    const burnedTarget = requireCombatant(
      afterWeaponDamage.state,
      spellTargetId,
    );
    const oneRoundBurning = {
      ...afterWeaponDamage.state,
      combatants: new Map(afterWeaponDamage.state.combatants).set(
        spellTargetId,
        {
          ...burnedTarget,
          activeEffects: burnedTarget.activeEffects.map((effect) =>
            effect.kind === "spellTurnStartDamageAndSave" &&
            effect.sourceSpellId === searingSmiteUnitId
              ? {
                  ...effect,
                  expiresAt: {
                    kind: "duration" as const,
                    durationTicks: elapsedTimeTicks(1),
                  },
                }
              : effect,
          ),
        },
      ),
    };
    const expiringTurnStart = endTurn({
      state: oneRoundBurning,
      actorId: spellCasterId,
    });
    const expiringDamage = requireResultHole(expiringTurnStart, "rolledDice");
    const expiringSave = requireResultHole(
      expiringTurnStart,
      "savingThrowOutcome",
    );
    const failedSaveTargetTurn = endTurn({
      state: oneRoundBurning,
      actorId: spellCasterId,
      fills: [
        damageRollFillWithGroups(expiringDamage, [[1, 1, 1]]),
        savingThrowOutcomeFill(expiringSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (failedSaveTargetTurn.tag !== "resolved") {
      throw new Error("Expected Searing Smite failed save to resolve.");
    }
    expect(
      requireCombatant(
        failedSaveTargetTurn.state,
        spellTargetId,
      ).activeEffects.some(
        (effect) =>
          effect.kind === "spellTurnStartDamageAndSave" &&
          effect.sourceSpellId === searingSmiteUnitId,
      ),
    ).toBe(true);

    const durationExpired = endTurn({
      state: failedSaveTargetTurn.state,
      actorId: spellTargetId,
    });
    if (durationExpired.tag !== "resolved") {
      throw new Error("Expected Searing Smite duration tick to resolve.");
    }
    expect(
      requireCombatant(durationExpired.state, spellTargetId).activeEffects.some(
        (effect) =>
          effect.kind === "spellTurnStartDamageAndSave" &&
          effect.sourceSpellId === searingSmiteUnitId,
      ),
    ).toBe(false);
  });
  test("ensnaring_strike does not reopen save-failed reactions after decline", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
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
        mode: { tag: "ready", trigger: "saveFailed" },
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

    const subject = weaponAttackSubject("Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Shortbow",
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
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingAttackHit.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castAttackHitBonusActionSpell" &&
        candidate.invocation.spellId === ensnaringStrikeUnitId,
    );
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const awaitingSaveFailedReaction = resolveBattleReaction({
      state: awaitingAttackHit.state,
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: choice.invocation,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    expect(awaitingSaveFailedReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "saveFailed" }],
    });
    if (awaitingSaveFailedReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike save-failed reaction.");
    }

    const afterDecline = resolveBattleReaction({
      state: awaitingSaveFailedReaction.state,
      fill: reactionDecisionFill(
        awaitingSaveFailedReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: spellTargetId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingReaction: null },
    });
  });
  test("ensnaring_strike opens a post-cast Ready spell-cast reaction before attack damage", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
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

    const subject = weaponAttackSubject("Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Shortbow",
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
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingAttackHit.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castAttackHitBonusActionSpell" &&
        candidate.invocation.spellId === ensnaringStrikeUnitId,
    );
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const awaitingSpellCastReaction = resolveBattleReaction({
      state: awaitingAttackHit.state,
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: choice.invocation,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    expect(awaitingSpellCastReaction).toMatchObject({
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
      },
    });
    if (awaitingSpellCastReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike post-cast Ready window.");
    }
    const afterDecline = resolveBattleReaction({
      state: awaitingSpellCastReaction.state,
      fill: reactionDecisionFill(
        awaitingSpellCastReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: spellTargetId },
      ),
    });
    expect(afterDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingReaction: null },
    });
  });
  test("ensnaring_strike still opens post-cast Ready after save-failed decline", () => {
    const spell = spellRecord(ensnaringStrikeUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_shortbow"),
      extraTargetIds: [ensnaringStrikeHelperId],
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
    const readiedSaveFailed = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "actionSpell",
        actorId: spellTargetId,
        invocation: cantripSpellInvocationRef(
          rayOfFrostUnitId,
          "spellAttackDamage",
        ),
        mode: { tag: "ready", trigger: "saveFailed" },
      },
      fills: [],
    });
    if (readiedSaveFailed.tag !== "resolved") {
      throw new Error("Expected target to ready Ray of Frost.");
    }
    const helperTurn = endTurn({
      state: readiedSaveFailed.state,
      actorId: spellTargetId,
    });
    if (helperTurn.tag !== "resolved") {
      throw new Error("Expected helper turn to begin.");
    }
    const readiedSpellCast = resolveBattleSubject({
      state: helperTurn.state,
      subject: {
        tag: "action",
        actorId: ensnaringStrikeHelperId,
        action: "ready",
        readyTrigger: "spellCast",
      },
      fills: [],
    });
    if (readiedSpellCast.tag !== "resolved") {
      throw new Error("Expected helper to ready movement.");
    }
    const casterTurn = endTurn({
      state: readiedSpellCast.state,
      actorId: ensnaringStrikeHelperId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn to resume.");
    }

    const subject = weaponAttackSubject("Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      spellTargetId,
      "Shortbow",
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
      throw new Error("Expected Ensnaring Strike attack-hit window.");
    }
    const choice = awaitingAttackHit.snapshot.pendingReaction?.choices.find(
      (candidate) =>
        candidate.kind === "castAttackHitBonusActionSpell" &&
        candidate.invocation.spellId === ensnaringStrikeUnitId,
    );
    if (
      choice === undefined ||
      choice.kind !== "castAttackHitBonusActionSpell"
    ) {
      throw new Error("Expected Ensnaring Strike after-hit choice.");
    }
    const save = requireHole(choice.initialHoles, "savingThrowOutcome");
    const awaitingSaveFailedReaction = resolveBattleReaction({
      state: awaitingAttackHit.state,
      fill: reactionDecisionFill(
        requireHole(awaitingAttackHit.holes, "reactionDecision"),
        {
          kind: "resolve",
          reactorId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            invocation: choice.invocation,
            fills: [
              savingThrowOutcomeFill(save, [
                { targetId: spellTargetId, succeeded: false },
              ]),
            ],
          },
        },
      ),
    });
    if (awaitingSaveFailedReaction.tag !== "needsHoles") {
      throw new Error("Expected Ensnaring Strike save-failed reaction.");
    }
    const afterSaveFailedDecline = resolveBattleReaction({
      state: awaitingSaveFailedReaction.state,
      fill: reactionDecisionFill(
        awaitingSaveFailedReaction.snapshot.pendingReaction!.decisionHole,
        { kind: "decline", reactorId: spellTargetId },
      ),
    });
    expect(afterSaveFailedDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "reactionDecision", trigger: "spellCast" }],
      snapshot: {
        pendingReaction: {
          trigger: "spellCast",
          choices: [
            expect.objectContaining({
              kind: "releaseReadiedMovement",
              readiedMovementActorId: ensnaringStrikeHelperId,
            }),
          ],
        },
      },
    });
  });
});
