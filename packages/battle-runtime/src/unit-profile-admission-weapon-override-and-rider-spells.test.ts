import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import { battleProcedureExecutionRefForTest } from "./battle-runtime-test-support.ts";
import { battleObjectId } from "./identity.ts";
import {
  battleActSpellPresentation,
  battleAdmittedSpellPresentations,
} from "./battle-act-composition.ts";
import { battleRuntimeContextFromCharacterAdmission } from "./battle-runtime-context.ts";
import { requireCharacterSpellProcedureRefForTest } from "./battle-runtime-test-support.ts";
import {
  ATTACK_TARGET_HOLE_ID,
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
} from "./battle-reducer/battle-runtime-protocol.ts";
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.WEAPON_HOSTED_ATTACK_AND_RIDERS
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV84H shillelagh
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV31A divine_favor
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-MAGIC-WEAPON-ITEM-RUNTIME magic_weapon
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-weapon-attack-override spell.invocation-weapon-damage-rider spell.invocation-magic-weapon-enhancement
import { describe, expect, test } from "vitest";
import {
  counterspellUnitId,
  divineFavorDurationTicks,
  divineFavorUnitId,
  magicWeaponDurationTicks,
  magicWeaponUnitId,
  rayOfFrostUnitId,
  shillelaghUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  attackRollFill,
  attackTargetFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  sameClubMainAndOffHandLoadout,
  statBlockAttackAct,
  weaponAttackRollHole,
  weaponAttackSubject,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  bonusSpellActForItem,
  magicWeaponTargetItemFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  abilityModifier,
  attackBonus,
  battleWeaponItemHasMagicWeaponEnhancement,
  battleWeaponItemMagicWeaponEnhancementBonus,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  proficiencyBonus,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission-test-support.ts";

describe("SRDINV84H deterministic Shillelagh weapon override admission", () => {
  test("shillelagh is admitted only for a held Club or Quarterstaff", () => {
    const shillelagh = spellRecord(shillelaghUnitId);
    const quarterstaffState = spellBattle({
      cantrips: [shillelagh],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const act = bonusSpellAct({
      session: quarterstaffState,
      spellId: shillelaghUnitId,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef: expect.any(String),
          tag: "bonusActionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
        initialHoles: [],
      }),
    );

    const clubState = spellBattle({
      cantrips: [shillelagh],
      attack: zeroAbilityWeaponAttack("weapon_club"),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const clubAct = bonusSpellAct({
      session: clubState,
      spellId: shillelaghUnitId,
    });
    expect(clubAct).toMatchObject({
      subject: {
        tag: "bonusActionSpell",
      },
      initialHoles: [],
    });

    const longswordState = spellBattle({
      cantrips: [shillelagh],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    expect(
      discoverBattleActs(longswordState).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            shillelaghUnitId,
      ),
    ).toBe(false);

    const syntheticEligibleAttack = zeroAbilityWeaponAttack(
      "weapon_quarterstaff",
    );
    const syntheticEligibleState = spellBattle({
      cantrips: [shillelagh],
      attack: {
        ...syntheticEligibleAttack,
        weapon: {
          ...syntheticEligibleAttack.weapon,
          id: "weapon_synthetic_eligible_staff",
        },
      },
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    expect(
      discoverBattleActs(syntheticEligibleState).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            shillelaghUnitId,
      ),
    ).toBe(true);

    const authoredIdOnlyAttack = zeroAbilityWeaponAttack("weapon_longsword");
    const authoredIdOnlyState = spellBattle({
      cantrips: [shillelagh],
      attack: {
        ...authoredIdOnlyAttack,
        weapon: { ...authoredIdOnlyAttack.weapon, id: "weapon_club" },
      },
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    expect(
      discoverBattleActs(authoredIdOnlyState).some(
        (candidate) =>
          candidate.subject.tag === "bonusActionSpell" &&
          battleActSpellPresentation(candidate)?.invocation.spellId ===
            shillelaghUnitId,
      ),
    ).toBe(false);
  });

  test("shillelagh rejects fills other than spell-cast Reaction facts", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const act = bonusSpellAct({
      session,
      spellId: shillelaghUnitId,
    });

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          {
            kind: "targetChoice",
            holeId: ATTACK_TARGET_HOLE_ID,
            value: spellTargetId,
          },
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Weapon attack override spells do not use target, roll, damage, or save fills.",
    });
  });

  test("shillelagh accepts spell-cast Reaction facts", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const act = bonusSpellAct({
      session,
      spellId: shillelaghUnitId,
    });

    expect(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [
          {
            kind: "targetSpatialFacts",
            holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
            spatialFacts: [],
          },
        ],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("shillelagh waits for a populated spell-cast Reaction window before committing", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 1 }],
      targetSpellcasting: {
        sourceClassName: "wizard",
        spellcastingAbilityModifier: abilityModifier(3),
        proficiencyBonus: proficiencyBonus(2),
        canCastSpells: true,
        cantrips: [],
        preparedSpells: [spellRecord(counterspellUnitId)],
        featurePreparedSpells: [],
        spellbookRitualSpellAccesses: [],
        invocationSpellAccesses: [],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      },
    });
    const act = bonusSpellAct({
      session,
      spellId: shillelaghUnitId,
    });

    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        {
          kind: "targetSpatialFacts",
          holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
          spatialFacts: [
            {
              kind: "counterspellTriggerCasterVisibleWithinRange",
              reactorId: spellTargetId,
              casterId: spellCasterId,
              sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
                session,
                spellTargetId,
                spellSlotInvocationRef(counterspellUnitId, 3, "counterspell"),
              ),
              rangeFeet: movementFeet(60),
            },
          ],
        },
      ],
    });

    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      snapshot: {
        pendingInterrupt: { trigger: "spellCast" },
        turn: { bonusActionAvailable: true },
      },
    });
    if (awaitingReaction.tag !== "needsHoles") {
      throw new Error("Expected Shillelagh to open a Reaction window.");
    }
    expect(
      requireCombatant(awaitingReaction.state, spellCasterId).activeEffects,
    ).not.toContainEqual(
      expect.objectContaining({ kind: "spellWeaponAttackOverride" }),
    );
  });

  test("presentation rejects a context invocation that contradicts committed execution", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      preparedSpells: [spellRecord(magicWeaponUnitId)],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const characterContext = session.context.characters.get(spellCasterId);
    const shillelaghSource = characterContext?.spellPresentationSources.find(
      (source) => source.invocation.spell.id === shillelaghUnitId,
    );
    const otherSource = characterContext?.spellPresentationSources.find(
      (source) => source.invocation.spell.id === magicWeaponUnitId,
    );
    if (
      characterContext === undefined ||
      shillelaghSource === undefined ||
      otherSource === undefined
    ) {
      throw new Error("Expected both admitted spell presentation sources.");
    }
    const forgedSession = battleRuntimeSessionForTest({
      ...session,
      context: battleRuntimeContextFromCharacterAdmission(
        new Map(session.context.characters).set(spellCasterId, {
          ...characterContext,
          spellPresentationSources:
            characterContext.spellPresentationSources.map((source) =>
              source === shillelaghSource
                ? { ...source, invocation: otherSource.invocation }
                : source,
            ),
        }),
      ),
    });

    expect(
      discoverBattleActs(forgedSession).some(
        (candidate) =>
          battleActSpellPresentation(candidate)?.procedureRef ===
          shillelaghSource.procedureRef,
      ),
    ).toBe(false);
    expect(
      battleAdmittedSpellPresentations(forgedSession).some(
        (presentation) =>
          presentation.procedureRef === shillelaghSource.procedureRef,
      ),
    ).toBe(false);

    const ambiguousSession = battleRuntimeSessionForTest({
      ...session,
      context: battleRuntimeContextFromCharacterAdmission(
        new Map(session.context.characters).set(spellCasterId, {
          ...characterContext,
          spellPresentationSources: [
            ...characterContext.spellPresentationSources,
            shillelaghSource,
          ],
        }),
      ),
    });
    expect(
      discoverBattleActs(ambiguousSession).some(
        (candidate) =>
          battleActSpellPresentation(candidate)?.procedureRef ===
          shillelaghSource.procedureRef,
      ),
    ).toBe(false);
  });

  test("shillelagh projects spellcasting ability, damage die scaling, and Force-or-normal damage", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 17 }],
    });
    const act = bonusSpellAct({ session, spellId: shillelaghUnitId });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });
    expect(cast).toMatchObject({ tag: "resolved" });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Shillelagh to resolve.");
    }
    const castSession = battleRuntimeSessionForTest({
      ...session,
      state: cast.state,
    });

    expect(
      cast.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellWeaponAttackOverride",
        sourceProcedureRef: expect.any(String),
        weaponItemId: "main:weapon_quarterstaff",
        spellcastingAbilityModifier: abilityModifier(3),
        attackBonus: attackBonus(5),
        damage: { expr: { dice: 2, dieSize: 6 } },
        damageTypeChoices: ["force", "bludgeoning"],
      }),
    );

    const forceAttack = statBlockAttackAct(
      castSession,
      spellCasterId,
      "Quarterstaff (force)",
    );
    const target = requireHole(forceAttack.initialHoles, "targetChoice");
    const needsAttackRoll = resolveBattleSubject({
      state: cast.state,
      subject: forceAttack.subject,
      fills: [
        attackTargetFill(
          target,
          spellCasterId,
          spellTargetId,
          "Quarterstaff (force)",
        ),
      ],
    });
    const attackRoll = requireResultHole(needsAttackRoll, "attackRoll");
    expect(attackRoll.attackBonus).toBe(attackBonus(5));

    const needsDamage = resolveBattleSubject({
      state: cast.state,
      subject: forceAttack.subject,
      fills: [
        attackTargetFill(
          target,
          spellCasterId,
          spellTargetId,
          "Quarterstaff (force)",
        ),
        attackRollFill(attackRoll, { total: 15, naturalD20: 10 }),
      ],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    expect(damage.label).toContain("2d6+3-force");

    expect(
      discoverBattleActs(castSession).some(
        (candidate) =>
          candidate.presentation.kind === "attack" &&
          candidate.presentation.name === "Quarterstaff (bludgeoning)",
      ),
    ).toBe(true);
  });

  test("shillelagh damage die uses total character level for a multiclass caster", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [
        { className: "druid", level: 1 },
        { className: "fighter", level: 4 },
      ],
      casterSpellcastingSourceClassName: "druid",
    });
    const act = bonusSpellAct({ session, spellId: shillelaghUnitId });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });

    expect(cast).toMatchObject({
      tag: "resolved",
      state: {
        combatants: expect.any(Map),
      },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected multiclass Shillelagh to resolve.");
    }
    expect(
      cast.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellWeaponAttackOverride",
        damage: { expr: { dice: 1, dieSize: 10 } },
      }),
    );
  });

  test("shillelagh projects Club attacks", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_club"),
      casterClassLevels: [{ className: "druid", level: 5 }],
    });
    const act = bonusSpellAct({ session, spellId: shillelaghUnitId });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Club Shillelagh to resolve.");
    }
    const castSession = battleRuntimeSessionForTest({
      ...session,
      state: cast.state,
    });

    expect(
      cast.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellWeaponAttackOverride",
        sourceProcedureRef: expect.any(String),
        weaponItemId: "main:weapon_club",
        damage: { expr: { dice: 1, dieSize: 10 } },
        damageTypeChoices: ["force", "bludgeoning"],
      }),
    );
    expect(
      discoverBattleActs(castSession).some(
        (candidate) =>
          candidate.presentation.kind === "attack" &&
          candidate.presentation.name === "Club (force)",
      ),
    ).toBe(true);
  });

  test("shillelagh preserves attached item identity when both held weapons have the same unit", () => {
    const clubAttack = zeroAbilityWeaponAttack("weapon_club");
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: clubAttack,
      offHandAttack: clubAttack,
      selectedLoadout: sameClubMainAndOffHandLoadout(),
      casterClassLevels: [{ className: "druid", level: 1 }],
    });
    const mainHandProcedureRef = bonusSpellActForItem({
      session,
      spellId: shillelaghUnitId,
      componentWeaponItemId: "main:weapon_club",
    }).subject.procedureRef;
    const offHandProcedureRef = bonusSpellActForItem({
      session,
      spellId: shillelaghUnitId,
      componentWeaponItemId: "off:weapon_club",
    }).subject.procedureRef;
    expect(mainHandProcedureRef).not.toBe(offHandProcedureRef);
    const offHandCastAct = bonusSpellActForItem({
      session,
      spellId: shillelaghUnitId,
      componentWeaponItemId: "off:weapon_club",
    });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: offHandCastAct.subject,
      fills: [],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected off-hand Club Shillelagh to resolve.");
    }
    const castSession = battleRuntimeSessionForTest({
      ...session,
      state: cast.state,
    });

    expect(
      discoverBattleActs(castSession).some(
        (candidate) =>
          candidate.subject.tag === "action" &&
          candidate.subject.action === "attack" &&
          candidate.presentation.kind === "attack" &&
          candidate.presentation.name === "Club (force)",
      ),
    ).toBe(false);

    const offHandReadySession = battleRuntimeSessionForTest({
      ...castSession,
      state: {
        ...castSession.state,
        currentTurnResources: {
          ...castSession.state.currentTurnResources,
          currentHasBonusAction: true,
          lightWeaponAttackMade: { weaponItemId: "main:weapon_club" },
        },
      },
    });
    expect(
      discoverBattleActs(offHandReadySession).some(
        (candidate) =>
          candidate.subject.tag === "bonusAction" &&
          candidate.subject.action === "offHandAttack" &&
          candidate.presentation.kind === "attack" &&
          candidate.presentation.name === "Club (force)",
      ),
    ).toBe(true);
  });

  test("shillelagh recast replaces the prior weapon override and let-go removes the active effect", () => {
    const session = spellBattle({
      cantrips: [spellRecord(shillelaghUnitId)],
      attack: zeroAbilityWeaponAttack("weapon_quarterstaff"),
      casterClassLevels: [{ className: "druid", level: 5 }],
    });
    const initialCaster = session.state.combatants.get(spellCasterId);
    if (initialCaster === undefined) {
      throw new Error("Expected Shillelagh caster.");
    }
    const sessionWithPriorCasting = battleRuntimeSessionForTest({
      ...session,
      state: {
        ...session.state,
        combatants: new Map(session.state.combatants).set(spellCasterId, {
          ...initialCaster,
          activeEffects: [
            ...initialCaster.activeEffects,
            {
              kind: "spellWeaponAttackOverride",
              sourceProcedureRef: bonusSpellAct({
                session,
                spellId: shillelaghUnitId,
              }).subject.procedureRef,
              sourceCombatantId: spellCasterId,
              weaponItemId: battleObjectId("main:weapon_quarterstaff"),
              spellcastingAbilityModifier: abilityModifier(1),
              attackBonus: attackBonus(3),
              damage: { expr: { dice: 1, dieSize: 8 } },
              damageTypeChoices: ["force", "bludgeoning"],
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(1),
              },
            },
          ],
        }),
      },
    });
    const second = resolveBattleSubject({
      state: sessionWithPriorCasting.state,
      subject: bonusSpellAct({
        session: sessionWithPriorCasting,
        spellId: shillelaghUnitId,
      }).subject,
      fills: [],
    });
    if (second.tag !== "resolved") {
      throw new Error("Expected second Shillelagh cast to resolve.");
    }
    const caster = second.state.combatants.get(spellCasterId);
    if (caster?.origin.kind !== "character") {
      throw new Error("Expected Shillelagh caster.");
    }
    expect(
      caster.activeEffects.filter(
        (effect) => effect.kind === "spellWeaponAttackOverride",
      ),
    ).toHaveLength(1);

    const secondSession = battleRuntimeSessionForTest({
      ...sessionWithPriorCasting,
      state: second.state,
    });
    const letGoSession = battleRuntimeSessionForTest({
      ...secondSession,
      state: {
        ...secondSession.state,
        combatants: new Map(secondSession.state.combatants).set(spellCasterId, {
          ...caster,
          origin: {
            ...caster.origin,
            selectedLoadout: {},
          },
        }),
      },
    });
    const letGoCleaned = endTurn({
      state: letGoSession.state,
      actorId: spellCasterId,
    });
    if (letGoCleaned.tag !== "resolved") {
      throw new Error("Expected let-go cleanup end turn to resolve.");
    }
    expect(
      requireCombatant(letGoCleaned.state, spellCasterId).activeEffects.some(
        (effect) => effect.kind === "spellWeaponAttackOverride",
      ),
    ).toBe(false);
    expect(
      discoverBattleActs(letGoSession).some((candidate) =>
        candidate.summary.startsWith(
          "Take the Attack action with Quarterstaff (",
        ),
      ),
    ).toBe(false);
  });
});

describe("SRDINV31A deterministic weapon damage rider Spell Unit admission", () => {
  test("divine_favor is admitted as a Bonus Action self weapon-hit Radiant damage rider", () => {
    const spell = spellRecord(divineFavorUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = bonusSpellAct({ session, spellId: divineFavorUnitId });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(divineFavorUnitId, 1, "weaponDamageRider"),
      ),
      mode: { tag: "cast" },
    });
    expect(act.initialHoles).toEqual([]);

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });

    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Divine Favor to resolve.");
    }
    expect(
      cast.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellWeaponDamageRider",
        sourceProcedureRef: expect.any(String),
        damage: {
          expr: { dice: 1, dieSize: 4 },
          damageType: "radiant",
        },
        expiresAt: {
          kind: "duration",
          durationTicks: divineFavorDurationTicks,
        },
      }),
    );
  });

  test("divine_favor adds Radiant dice to caster weapon hits only", () => {
    const divineFavor = spellRecord(divineFavorUnitId);
    const rayOfFrost = spellRecord(rayOfFrostUnitId);
    const session = spellBattle({
      preparedSpells: [divineFavor],
      cantrips: [rayOfFrost],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: bonusSpellAct({ session, spellId: divineFavorUnitId }).subject,
      fills: [],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Divine Favor to resolve.");
    }
    const castSession = battleRuntimeSessionForTest({
      state: cast.state,
      context: session.context,
    });

    const subject = weaponAttackSubject(castSession, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: castSession.state, subject, fills: [] }),
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
        state: cast.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const weaponDamage = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject,
        fills: [targetFill, rollFill],
      }),
      "rolledDice",
    );
    expect(weaponDamage).toEqual(
      expect.objectContaining({
        spellWeaponDamageRiders: [
          expect.objectContaining({ sourceProcedureRef: expect.any(String) }),
        ],
      }),
    );

    const weaponResolved = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(weaponDamage, [[4], [3]]),
      ],
    });

    expect(weaponResolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({ combatantId: spellTargetId, hp: 5 }),
        ],
      },
    });

    const spellAttack = spellAct({
      session: castSession,
      spellId: rayOfFrostUnitId,
    });
    const spellTarget = requireHole(spellAttack.initialHoles, "targetChoice");
    const spellTargetFillValue = spellTargetFill(
      spellTarget,
      rayOfFrostUnitId,
      spellCasterId,
      spellTargetId,
    );
    const spellRoll = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject: spellAttack.subject,
        fills: [spellTargetFillValue],
      }),
      "attackRoll",
    );
    const spellDamage = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject: spellAttack.subject,
        fills: [
          spellTargetFillValue,
          attackRollFill(spellRoll, { total: 15, naturalD20: 10 }),
        ],
      }),
      "rolledDice",
    );
    expect(spellDamage).not.toHaveProperty("spellWeaponDamageRiders");
    expect(
      resolveBattleSubject({
        state: cast.state,
        subject: spellAttack.subject,
        fills: [
          spellTargetFillValue,
          attackRollFill(spellRoll, { total: 15, naturalD20: 10 }),
          damageRollFillWithGroups(spellDamage, [[4]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({ combatantId: spellTargetId, hp: 8 }),
        ],
      },
    });
  });

  test("divine_favor weapon damage rider expires on its timed duration", () => {
    const divineFavor = spellRecord(divineFavorUnitId);
    const session = spellBattle({
      preparedSpells: [divineFavor],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const cast = resolveBattleSubject({
      state: session.state,
      subject: bonusSpellAct({ session, spellId: divineFavorUnitId }).subject,
      fills: [],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Divine Favor to resolve.");
    }
    const caster = cast.state.combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected Divine Favor caster.");
    }
    const divineFavorEffect = caster.activeEffects.find(
      (effect) => effect.kind === "spellWeaponDamageRider",
    );
    if (divineFavorEffect === undefined) {
      throw new Error("Expected Divine Favor weapon damage rider.");
    }
    const expiringCaster = {
      ...caster,
      activeEffects: caster.activeEffects.map((effect) =>
        effect.kind === "spellWeaponDamageRider" &&
        effect.sourceProcedureRef === divineFavorEffect.sourceProcedureRef
          ? {
              ...effect,
              expiresAt: {
                kind: "duration" as const,
                durationTicks: elapsedTimeTicks(1),
              },
            }
          : effect,
      ),
    };
    const oneRoundRemaining = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(
        spellCasterId,
        expiringCaster,
      ),
    };
    const targetTurn = resolveBattleSubject({
      state: oneRoundRemaining,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Divine Favor caster end turn to resolve.");
    }
    const nextRound = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    if (nextRound.tag !== "resolved") {
      throw new Error("Expected Divine Favor duration tick to resolve.");
    }
    expect(
      nextRound.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "spellWeaponDamageRider" &&
            effect.sourceProcedureRef === divineFavorEffect.sourceProcedureRef,
        ),
    ).toBe(false);

    const nextRoundSession = battleRuntimeSessionForTest({
      state: nextRound.state,
      context: session.context,
    });
    const subject = weaponAttackSubject(nextRoundSession, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({
        state: nextRound.state,
        subject,
        fills: [],
      }),
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
        state: nextRound.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const weaponDamage = requireResultHole(
      resolveBattleSubject({
        state: nextRound.state,
        subject,
        fills: [targetFill, rollFill],
      }),
      "rolledDice",
    );
    expect(weaponDamage).not.toHaveProperty("spellWeaponDamageRiders");
    expect(
      resolveBattleSubject({
        state: nextRound.state,
        subject,
        fills: [
          targetFill,
          rollFill,
          damageRollFillWithGroups(weaponDamage, [[4]]),
        ],
      }),
    ).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({ combatantId: spellTargetId, hp: 8 }),
        ],
      },
    });
  });
});

describe("L12G deterministic Magic Weapon item enhancement admission", () => {
  test("magic_weapon is admitted as a level 2 Bonus Action item-target Spell Slot cast", () => {
    const magicWeapon = spellRecord(magicWeaponUnitId);
    const session = spellBattle({
      preparedSpells: [magicWeapon],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = bonusSpellAct({
      session,
      spellId: magicWeaponUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(magicWeaponUnitId, 2, "magicWeaponEnhancement"),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "magicWeaponTargetItem");
    expect(targetHole).toEqual(
      expect.objectContaining({
        label: "Spell target item",
        requiresTableItemFact: true,
      }),
    );

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        magicWeaponTargetItemFill(targetHole, {
          holderCombatantId: spellCasterId,
          itemId: "main:weapon_longsword",
        }),
      ],
    });

    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
      },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Magic Weapon to resolve.");
    }
    expect(
      cast.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellMagicWeaponEnhancement",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        holderCombatantId: spellCasterId,
        weaponItemId: "main:weapon_longsword",
        bonus: 1,
        expiresAt: {
          kind: "duration",
          durationTicks: magicWeaponDurationTicks,
        },
      }),
    );
    expect(
      battleWeaponItemHasMagicWeaponEnhancement(
        cast.state,
        spellCasterId,
        "main:weapon_longsword",
      ),
    ).toBe(true);
    expect(
      battleWeaponItemMagicWeaponEnhancementBonus(
        cast.state,
        spellCasterId,
        "main:weapon_longsword",
      ),
    ).toBe(1);
  });

  test("magic_weapon projects slot-tiered attack and damage bonuses only for the targeted item", () => {
    const magicWeapon = spellRecord(magicWeaponUnitId);
    const session = spellBattle({
      preparedSpells: [magicWeapon],
      spellSlots: [{ spellLevel: 6, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = bonusSpellAct({
      session,
      spellId: magicWeaponUnitId,
      slotLevel: 6,
    });
    const targetHole = requireHole(act.initialHoles, "magicWeaponTargetItem");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        magicWeaponTargetItemFill(targetHole, {
          holderCombatantId: spellCasterId,
          itemId: "main:weapon_longsword",
        }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected level 6 Magic Weapon to resolve.");
    }

    const castSession = battleRuntimeSessionForTest({
      state: cast.state,
      context: session.context,
    });
    const subject = weaponAttackSubject(castSession, "Longsword");
    const target = requireResultHole(
      resolveBattleSubject({ state: cast.state, subject, fills: [] }),
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
        state: cast.state,
        subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    expect(roll.attackBonus).toBe(attackBonus(3));
    const rollFill = attackRollFill(roll, { total: 15, naturalD20: 10 });
    const weaponDamage = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject,
        fills: [targetFill, rollFill],
      }),
      "rolledDice",
    );
    const weaponResolved = resolveBattleSubject({
      state: cast.state,
      subject,
      fills: [
        targetFill,
        rollFill,
        damageRollFillWithGroups(weaponDamage, [[4]]),
      ],
    });
    expect(weaponResolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: [
          expect.anything(),
          expect.objectContaining({ combatantId: spellTargetId, hp: 5 }),
        ],
      },
    });

    const caster = requireCombatant(session.state, spellCasterId);
    const otherItemState = {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: [
          ...caster.activeEffects,
          {
            kind: "spellMagicWeaponEnhancement",
            sourceProcedureRef: act.subject.procedureRef,
            sourceCombatantId: spellCasterId,
            holderCombatantId: spellCasterId,
            weaponItemId: "other:weapon_longsword",
            bonus: 3,
            expiresAt: {
              kind: "duration",
              durationTicks: magicWeaponDurationTicks,
            },
          },
        ],
      }),
    };
    const otherTarget = requireResultHole(
      resolveBattleSubject({ state: otherItemState, subject, fills: [] }),
      "targetChoice",
    );
    const otherTargetFill = attackTargetFill(
      otherTarget,
      spellCasterId,
      spellTargetId,
      "Longsword",
    );
    const otherRoll = requireResultHole(
      resolveBattleSubject({
        state: otherItemState,
        subject,
        fills: [otherTargetFill],
      }),
      "attackRoll",
    );
    expect(otherRoll.attackBonus).toBe(attackBonus(0));
  });

  test("magic_weapon exact item identity includes the holder combatant", () => {
    const magicWeapon = spellRecord(magicWeaponUnitId);
    const session = spellBattle({
      preparedSpells: [magicWeapon],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = bonusSpellAct({
      session,
      spellId: magicWeaponUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "magicWeaponTargetItem");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        magicWeaponTargetItemFill(targetHole, {
          holderCombatantId: spellTargetId,
          itemId: "main:weapon_longsword",
        }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Magic Weapon to resolve.");
    }
    const castSession = battleRuntimeSessionForTest({
      ...session,
      state: cast.state,
    });

    expect(
      weaponAttackRollHole({
        session: castSession,
        attackName: "Longsword",
        actorId: spellCasterId,
        targetId: spellTargetId,
      }).attackBonus,
    ).toBe(attackBonus(0));
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected Magic Weapon caster end turn to resolve.");
    }
    const targetTurnSession = battleRuntimeSessionForTest({
      ...castSession,
      state: targetTurn.state,
    });
    expect(
      weaponAttackRollHole({
        session: targetTurnSession,
        attackName: "Longsword",
        actorId: spellTargetId,
        targetId: spellCasterId,
      }).attackBonus,
    ).toBe(attackBonus(1));
  });

  test("magic_weapon same-caster recast replaces the prior item-attached effect", () => {
    const magicWeapon = spellRecord(magicWeaponUnitId);
    const session = spellBattle({
      preparedSpells: [magicWeapon],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const caster = requireCombatant(session.state, spellCasterId);
    const priorSession = battleRuntimeSessionForTest({
      ...session,
      state: {
        ...session.state,
        combatants: new Map(session.state.combatants).set(spellCasterId, {
          ...caster,
          activeEffects: [
            ...caster.activeEffects,
            {
              kind: "spellMagicWeaponEnhancement",
              sourceProcedureRef: bonusSpellAct({
                session,
                spellId: magicWeaponUnitId,
                slotLevel: 3,
              }).subject.procedureRef,
              sourceCombatantId: spellCasterId,
              holderCombatantId: spellCasterId,
              weaponItemId: "prior:weapon_longsword",
              bonus: 1,
              expiresAt: {
                kind: "duration",
                durationTicks: elapsedTimeTicks(1),
              },
            },
          ],
        }),
      },
    });
    const act = bonusSpellAct({
      session: priorSession,
      spellId: magicWeaponUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(act.initialHoles, "magicWeaponTargetItem");
    const recast = resolveBattleSubject({
      state: priorSession.state,
      subject: act.subject,
      fills: [
        magicWeaponTargetItemFill(targetHole, {
          holderCombatantId: spellCasterId,
          itemId: "main:weapon_longsword",
        }),
      ],
    });
    if (recast.tag !== "resolved") {
      throw new Error("Expected Magic Weapon recast to resolve.");
    }
    const effects = requireCombatant(
      recast.state,
      spellCasterId,
    ).activeEffects.filter(
      (effect) => effect.kind === "spellMagicWeaponEnhancement",
    );
    expect(effects).toEqual([
      expect.objectContaining({
        holderCombatantId: spellCasterId,
        weaponItemId: "main:weapon_longsword",
        bonus: 2,
      }),
    ]);
  });

  test("magic_weapon rejects an item already made magical by another caster and expires on duration", () => {
    const magicWeapon = spellRecord(magicWeaponUnitId);
    const session = spellBattle({
      preparedSpells: [magicWeapon],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      attack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const target = requireCombatant(session.state, spellTargetId);
    const alreadyMagicalSession = battleRuntimeSessionForTest({
      ...session,
      state: {
        ...session.state,
        combatants: new Map(session.state.combatants).set(spellTargetId, {
          ...target,
          activeEffects: [
            ...target.activeEffects,
            {
              kind: "spellMagicWeaponEnhancement",
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                "other-magic-weapon-caster",
              ),
              sourceCombatantId: spellTargetId,
              holderCombatantId: spellCasterId,
              weaponItemId: "main:weapon_longsword",
              bonus: 1,
              expiresAt: {
                kind: "duration",
                durationTicks: magicWeaponDurationTicks,
              },
            },
          ],
        }),
      },
    });
    const rejectedAct = bonusSpellAct({
      session: alreadyMagicalSession,
      spellId: magicWeaponUnitId,
      slotLevel: 2,
    });
    const rejectedHole = requireHole(
      rejectedAct.initialHoles,
      "magicWeaponTargetItem",
    );
    expect(
      resolveBattleSubject({
        state: alreadyMagicalSession.state,
        subject: rejectedAct.subject,
        fills: [
          magicWeaponTargetItemFill(rejectedHole, {
            holderCombatantId: spellCasterId,
            itemId: "main:weapon_longsword",
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });

    const act = bonusSpellAct({
      session,
      spellId: magicWeaponUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "magicWeaponTargetItem");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        magicWeaponTargetItemFill(targetHole, {
          holderCombatantId: spellCasterId,
          itemId: "main:weapon_longsword",
        }),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Magic Weapon to resolve before expiry.");
    }
    const caster = requireCombatant(cast.state, spellCasterId);
    const oneTickState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "spellMagicWeaponEnhancement"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      }),
    };
    const casterTurn = endTurn({
      state: oneTickState,
      actorId: spellCasterId,
    });
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected Magic Weapon caster end turn to resolve.");
    }
    const expired = endTurn({
      state: casterTurn.state,
      actorId: spellTargetId,
    });
    if (expired.tag !== "resolved") {
      throw new Error("Expected Magic Weapon duration tick to resolve.");
    }
    expect(
      battleWeaponItemHasMagicWeaponEnhancement(
        expired.state,
        spellCasterId,
        "main:weapon_longsword",
      ),
    ).toBe(false);
  });
});
