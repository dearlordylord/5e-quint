import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { resolveCastAttackHitBonusActionSpellCommand } from "./battle-reducer/attack-hit-bonus-action-spell-procedures.ts";
import { spellProcedureExecutionRegistry } from "./battle-reducer/spell-procedure-profiles/execution-composition.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.AFTER_HIT_DAMAGE_RIDERS BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31F true_strike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31C divine_smite
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-after-hit-damage spell.invocation-spell-hosted-weapon-attack
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import { characterAttackSubjectForTest } from "./battle-runtime.test-support.ts";
import {
  divineSmiteUnitId,
  rayOfFrostUnitId,
  spellCasterId,
  spellTargetId,
  statBlockCatalog,
  trueStrikeUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  interruptDecisionFill,
  requireCombatant,
  requireHole,
  requireResultHole,
  sameClubMainAndOffHandLoadout,
  statBlockWithCreatureType,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { testBattleCreatureStateWithConditions } from "./battle-runtime.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellAct } from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  abilityModifier,
  applyCondition,
  attackBonus,
  battleObjectId,
  cantripSpellInvocationRef,
  classLevel,
  combatantId,
  decodeUnitRecordSync,
  DieRollResult,
  discoverBattleActs,
  endTurn,
  Hp,
  proficiencyBonus,
  resolveBattleInterrupt,
  resolveBattleSubject,
  spellSlotInvocationRef,
  trueStrikeInput,
} from "./unit-profile-admission.test-support.ts";
import type { BattleFill } from "./unit-profile-admission.test-support.ts";

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
    const act = spellAct({ session: state, spellId: trueStrikeUnitId });
    const damageType = requireHole(act.initialHoles, "damageTypeChoice");

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        cantripSpellInvocationRef(trueStrikeUnitId, "spellHostedWeaponAttack"),
      ),
      mode: { tag: "cast" },
    });
    expect(damageType.choices).toEqual(["radiant", "piercing"]);

    const damageTypeFill: Extract<
      BattleFill,
      { readonly kind: "damageTypeChoice" }
    > = {
      kind: "damageTypeChoice",
      holeId: damageType.holeId,
      value: "radiant",
    };
    const target = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [damageTypeFill],
      }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);

    const attack = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [damageTypeFill, targetFill],
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
      state: state.state,
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
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        sourceProcedure: "spellHostedWeaponAttack",
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "radiant",
        },
      },
    ]);

    const resolved = resolveBattleSubject({
      state: state.state,
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
  test("true_strike preserves the selected held-weapon identity for matching main- and off-hand weapons", () => {
    const spell = spellRecord(trueStrikeUnitId);
    const clubAttack = zeroAbilityWeaponAttack("weapon_club");
    const state = spellBattle({
      cantrips: [spell],
      spellSlots: [],
      attack: clubAttack,
      offHandAttack: clubAttack,
      selectedLoadout: sameClubMainAndOffHandLoadout(),
      casterClassLevels: [{ className: "wizard", level: classLevel(1) }],
      casterWeaponProficiencies: [
        { kind: "weapon_category", category: "simple" },
      ],
    });
    const mainHandAct = spellAct({
      session: state,
      spellId: trueStrikeUnitId,
      componentWeaponObjectId: battleObjectId("main:weapon_club"),
    });
    const offHandAct = spellAct({
      session: state,
      spellId: trueStrikeUnitId,
      componentWeaponObjectId: battleObjectId("off:weapon_club"),
    });

    expect(mainHandAct.subject.procedureRef).not.toBe(
      offHandAct.subject.procedureRef,
    );
    expect(
      requireResultHole(
        resolveBattleSubject({
          state: state.state,
          subject: offHandAct.subject,
          fills: [],
        }),
        "damageTypeChoice",
      ).choices,
    ).toEqual(["radiant", "bludgeoning"]);
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
          battleActSpellPresentation(act)?.invocation.spellId ===
            trueStrikeUnitId,
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
          battleActSpellPresentation(act)?.invocation.spellId ===
            divineSmiteUnitId,
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
      state: state.state,
      subject: {
        tag: "actionSpell",
        actorId: spellCasterId,
        procedureRef: requireCharacterSpellProcedureRefForTest(
          state,
          spellCasterId,
          spellSlotInvocationRef(divineSmiteUnitId, 1, "afterHitDamage"),
        ),
        mode: { tag: "ready", trigger: "attackHit" },
      },
      fills: [],
    });

    expect(readied).toMatchObject({
      tag: "invalid",
      reason: "unsupportedSubject",
    });
    expect(state.state.readiedSpells.has(spellCasterId)).toBe(false);
  });
  test("divine_smite is admitted after an Unarmed Strike hit", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: null,
    });
    const subject = characterAttackSubjectForTest(
      state.state,
      spellCasterId,
      "Unarmed Strike",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, attackRollFill(roll, { total: 15, naturalD20: 10 })],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite Unarmed Strike hit to open an attack-hit window.",
      );
    }
    expect(awaitingReaction.snapshot.pendingInterrupt?.choices).toEqual(
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
    const subject = characterAttackSubjectForTest(
      state.state,
      spellCasterId,
      "Unarmed Strike",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(
      target,
      spellCasterId,
      skeletonTargetId,
    );
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite Unarmed Strike hit to open an attack-hit window.",
      );
    }
    const smiteChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
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
    const afterSmite = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
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
            sourceProcedureRef: expect.any(String),
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
    const subject = weaponAttackSubject(state, "Shortbow");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const afterHit = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, attackRollFill(roll, { total: 15, naturalD20: 10 })],
    });

    expect(afterHit).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: null },
    });
  });
  test("divine_smite is admitted after a melee weapon hit and adds Radiant damage without replaying the base attack", () => {
    const spell = spellRecord(divineSmiteUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, rollFill],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: { pendingInterrupt: { trigger: "attackHit" } },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite hit to open an attack-hit window.",
      );
    }
    const smiteChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
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

    const afterSmite = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });

    expect(afterSmite).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingInterrupt: null,
        turn: {
          bonusActionQuotaAvailable: false,
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
            sourceProcedureRef: expect.any(String),
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
  test("divine_smite rejects stale hit state, validates resources before spending, and does not treat Ready as a pre-cast interrupt", () => {
    const divineSmite = spellRecord(divineSmiteUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const initialState = spellBattle({
      preparedSpells: [divineSmite],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetSpellcasting: {
        spellcastingSource: {
          tag: "classSpellcasting",
          className: "wizard",
          abilityModifier: abilityModifier(3),
        },
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [rayOfFrost],
        preparedSpells: [],
        featurePreparedSpells: [],
        spellAccesses: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [],
      },
    });
    const targetTurn = endTurn({
      state: initialState.state,
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
        procedureRef: requireCharacterSpellProcedureRefForTest(
          battleRuntimeSessionForTest({
            state: targetTurn.state,
            context: initialState.context,
          }),
          spellTargetId,
          cantripSpellInvocationRef(rayOfFrostUnitId, "spellAttackDamage"),
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

    const subject = weaponAttackSubject(
      battleRuntimeSessionForTest({ ...initialState, state: casterTurn.state }),
      "Longsword",
    );
    const target = requireResultHole(
      resolveBattleSubject({ state: casterTurn.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
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
      awaitingAttackHit.snapshot.pendingInterrupt?.choices.find(
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
    const activeFrame =
      awaitingAttackHit.state.interruptStack[
        awaitingAttackHit.state.interruptStack.length - 1
      ];
    if (
      activeFrame?.kind !== "interruptCheckpoint" ||
      activeFrame.frame.trigger !== "attackHit"
    ) {
      throw new Error("Expected active attack-hit checkpoint.");
    }
    const commandFrame = {
      ...activeFrame,
      frame: {
        ...activeFrame.frame,
        activeInterrupt: {
          responderId: spellCasterId,
          subject: smiteChoice.subject,
          fills: [],
        },
      },
    };
    const commandState = {
      ...awaitingAttackHit.state,
      interruptStack: [
        ...awaitingAttackHit.state.interruptStack.slice(0, -1),
        commandFrame,
      ],
    };
    const caster = requireCombatant(commandState, spellCasterId);
    if (
      caster.origin.kind !== "character" ||
      caster.origin.spellcasting === undefined
    ) {
      throw new Error("Expected spellcasting character caster.");
    }
    const spellcasting = caster.origin.spellcasting;
    const executionRegistry = spellProcedureExecutionRegistry();
    const resolveDirectly = (state: typeof awaitingAttackHit.state) =>
      resolveCastAttackHitBonusActionSpellCommand(
        {
          state,
          subject: smiteChoice.subject,
          fills: [],
        },
        executionRegistry,
      );
    expect(resolveDirectly(casterTurn.state)).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const combatantsWithoutCaster = new Map(commandState.combatants);
    combatantsWithoutCaster.delete(spellCasterId);
    expect(
      resolveDirectly({
        ...commandState,
        combatants: combatantsWithoutCaster,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "unsupportedActOption",
    });
    expect(
      resolveDirectly({
        ...commandState,
        combatants: new Map(commandState.combatants).set(
          spellCasterId,
          testBattleCreatureStateWithConditions(
            caster,
            applyCondition(caster.conditions, "incapacitated"),
          ),
        ),
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const combatantsWithoutTarget = new Map(commandState.combatants);
    combatantsWithoutTarget.delete(spellTargetId);
    expect(
      resolveDirectly({
        ...commandState,
        combatants: combatantsWithoutTarget,
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "missingCombatant",
    });
    expect(
      resolveDirectly({
        ...commandState,
        interruptStack: [
          ...commandState.interruptStack.slice(0, -1),
          {
            ...commandFrame,
            frame: {
              ...commandFrame.frame,
              attackerId: spellTargetId,
            },
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(
      resolveDirectly({
        ...commandState,
        combatants: new Map(commandState.combatants).set(spellCasterId, {
          ...caster,
          origin: {
            ...caster.origin,
            spellcasting: {
              ...spellcasting,
              spellSlots: spellcasting.spellSlots.map((slot) => ({
                ...slot,
                expended: slot.count,
              })),
            },
          },
        }),
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const staleWithoutBonusAction = resolveBattleInterrupt({
      state: {
        ...awaitingAttackHit.state,
        currentTurnResources: {
          ...awaitingAttackHit.state.currentTurnResources,
          currentHasBonusAction: false,
        },
      },
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    expect(staleWithoutBonusAction).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const staleAfterSlotSpend = resolveBattleInterrupt({
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
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });
    expect(staleAfterSlotSpend).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    const malformedFills = resolveBattleInterrupt({
      state: awaitingAttackHit.state,
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
            fills: [targetFill],
          },
        },
      ),
    });
    expect(malformedFills).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const afterSmite = resolveBattleInterrupt({
      state: awaitingAttackHit.state,
      fill: interruptDecisionFill(
        requireHole(awaitingAttackHit.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
            fills: [],
          },
        },
      ),
    });

    expect(afterSmite).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "spellCast" }],
      snapshot: {
        pendingInterrupt: {
          trigger: "spellCast",
          choices: [
            expect.objectContaining({
              kind: "releaseReadiedSpell",
              readiedSpellCasterId: spellTargetId,
            }),
          ],
        },
        turn: {
          bonusActionQuotaAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (afterSmite.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite post-cast Ready window.");
    }
    const afterReadyDecline = resolveBattleInterrupt({
      state: afterSmite.state,
      fill: interruptDecisionFill(
        afterSmite.snapshot.pendingInterrupt!.decisionHole,
        { kind: "decline", responderId: spellTargetId },
      ),
    });
    expect(afterReadyDecline).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "rolledDice" }],
      snapshot: { pendingInterrupt: null },
    });
    if (afterReadyDecline.tag !== "needsHoles") {
      throw new Error("Expected Divine Smite replay to need attack damage.");
    }
    const damage = requireHole(afterReadyDecline.holes, "rolledDice");
    expect(damage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({
            sourceProcedureRef: expect.any(String),
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
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, spellTargetId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 25, naturalD20: 20 });
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite critical hit to open an attack-hit window.",
      );
    }
    const smiteChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
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

    const afterSmite = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
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
            sourceProcedureRef: expect.any(String),
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
    const subject = weaponAttackSubject(state, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: state.state, subject, fills: [] }),
      "targetChoice",
    );
    const targetFill = attackTargetFill(target, spellCasterId, undeadId);
    const roll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const awaitingReaction = resolveBattleSubject({
      state: state.state,
      subject,
      fills: [targetFill, rollFill],
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error(
        "Expected Divine Smite hit to open an attack-hit window.",
      );
    }
    const smiteChoice =
      awaitingReaction.snapshot.pendingInterrupt?.choices.find(
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

    const afterSmite = resolveBattleInterrupt({
      state: awaitingReaction.state,
      fill: interruptDecisionFill(
        requireHole(awaitingReaction.holes, "interruptDecision"),
        {
          kind: "resolve",
          responderId: spellCasterId,
          choice: {
            kind: "castAttackHitBonusActionSpell",
            procedureRef: smiteChoice.subject.procedureRef,
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
            sourceProcedureRef: expect.any(String),
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
