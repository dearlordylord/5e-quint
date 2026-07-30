import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DRAGONS-BREATH-INITIAL-CAST dragons_breath
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-dragons-breath-initial
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-dragons-breath-granted-action
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DRAGONS_BREATH_INITIAL_EFFECT_STATE
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DRAGONS_BREATH_GRANTED_ACTION
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { spellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";
import { supportedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import dragonsBreathInput from "../../surface/content/dragons_breath.json";
import {
  dragonsBreathUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  rolledDiceGroup,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  damageTypeChoiceFill,
  knownWillingSpellTargetListFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  breakBattleConcentration,
  classLevel,
  combatantId,
  decodeUnitRecordSync,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  resolveBattleSubject,
  sameBattleSubject,
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  type BattleActiveEffect,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type CombatantId,
  type DamageType,
  type SpellRecord,
} from "./unit-profile-admission.test-support.ts";
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleActiveEffectExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
  testCharacterD20Statistics,
} from "./battle-runtime.test-support.ts";
import { BattleSnapshotSchema } from "./index.ts";

describe("Dragon's Breath initial cast admission", () => {
  test("stores chosen damage type, original slot, and caster save DC on the willing target", () => {
    const spell = dragonsBreathSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: dragonsBreathUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
    const invocationPresentation = battleActSpellPresentation(act)?.invocation;
    const invocation = supportedSpellActs(
      state,
      requireCombatant(state, spellCasterId),
    ).find(
      (candidate) => candidate.sourceProcedureRef === act.subject.procedureRef,
    );
    const expectedSpellSaveDc = spellSaveDcForCaster(state, spellCasterId);
    if (expectedSpellSaveDc === null) {
      throw new Error("Expected fixture caster Spell Save DC.");
    }
    if (invocation === undefined) {
      throw new Error("Expected Dragon's Breath runtime invocation.");
    }

    expect({
      ...act.subject,
      invocation: invocationPresentation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(dragonsBreathUnitId, 3, "dragonsBreathInitial"),
      ),
      mode: { tag: "cast" },
    });
    expect(spellExecutionFacts(invocation).kind).toBe("bonusActionSpell");
    expect(damageTypeHole.choices).toEqual([
      "acid",
      "cold",
      "fire",
      "lightning",
      "poison",
    ]);

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetListFill(
          targetHole,
          spellCasterId,
          dragonsBreathUnitId,
          [spellTargetId],
        ),
        damageTypeChoiceFill(damageTypeHole, "fire"),
      ],
    });

    if (resolved.tag !== "resolved") {
      throw new Error(
        `Expected Dragon's Breath to resolve: ${JSON.stringify(resolved)}`,
      );
    }
    expect(resolved).toMatchObject({ tag: "resolved" });
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "dragonsBreath",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        originalSlotLevel: 3,
        damageType: "fire",
        spellSaveDc: expectedSpellSaveDc,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    );
  });

  test("requires willing target evidence and removes the target-attached effect when concentration ends", () => {
    const spell = dragonsBreathSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: dragonsBreathUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(targetHole, spellCasterId, dragonsBreathUnitId, [
            spellTargetId,
          ]),
          damageTypeChoiceFill(damageTypeHole, "acid"),
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });

    const resolved = castDragonsBreath(session, "acid");
    const afterConcentration = breakBattleConcentration(
      resolved,
      spellCasterId,
    );

    expect(
      requireCombatant(afterConcentration, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "dragonsBreath",
      ),
    ).toBe(false);
  });

  test("grants the target a Magic action that exhales the retained damage type and slot-scaled damage", () => {
    const session = spellBattle({
      casterClassLevels: [{ className: "wizard", level: classLevel(3) }],
      casterD20Statistics: testCharacterD20Statistics({ int: 16 }),
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [
        { spellLevel: 1, count: 4 },
        { spellLevel: 2, count: 2 },
      ],
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = stateWithExhalingTargetActionEarlyEndCondition(
      endedCasterTurn.state,
    );
    const exhaleAct = discoverBattleActs(
      battleRuntimeSessionForTest({
        ...session,
        state: targetTurn,
      }),
    ).find(
      (act) =>
        act.subject.tag === "runtimeCommand" &&
        act.subject.command === "dragonsBreathExhale",
    );
    expect(exhaleAct?.label).toBe("Exhale Dragon's Breath");
    if (
      exhaleAct?.subject.tag !== "runtimeCommand" ||
      exhaleAct.subject.command !== "dragonsBreathExhale"
    ) {
      throw new Error("Expected Dragon's Breath exhale action.");
    }

    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    expect(saveHole).toMatchObject({
      kind: "savingThrowOutcome",
      ability: "dex",
      dc: { kind: "fixed" },
    });
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
      ],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Dragon's Breath damage dice.");
    }
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: needsDamage.snapshot,
      subject: exhaleAct.subject,
      holes: needsDamage.holes,
    });
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    expect(damageHole).toMatchObject({
      dragonsBreath: { sourceCombatantId: spellCasterId },
    });
    const wrongOwnerHoles = needsDamage.holes.map((hole) =>
      hole.kind === "rolledDice" && "dragonsBreath" in hole
        ? {
            ...hole,
            dragonsBreath: {
              ...hole.dragonsBreath,
              sourceCombatantId: spellTargetId,
            },
          }
        : hole,
    );
    const encodedSnapshot = Schema.encodeSync(BattleSnapshotSchema)(
      needsDamage.snapshot,
    );
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)({
          ...encodedSnapshot,
          acts: needsDamage.snapshot.acts.map((candidate) =>
            sameBattleSubject(candidate.subject, exhaleAct.subject)
              ? { ...candidate, initialHoles: wrongOwnerHoles }
              : candidate,
          ),
        }),
      ),
    ).toBe(true);
    const needsConcentration = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
      ],
    });
    const concentrationHole = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    const beforeHp = Number(requireCombatant(targetTurn, spellCasterId).hp);
    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentrationHole.holeId,
          value: { succeeded: true },
        },
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dragon's Breath exhale to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(
      beforeHp - 6,
    );
    expect(requireCombatant(resolved.state, spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ invisible: true }),
      activeEffects: expect.not.arrayContaining([
        expect.objectContaining({
          kind: "targetActionEndedSpellCondition",
          sourceProcedureRef: expect.any(String),
        }),
      ]),
    });
    expect(
      discoverBattleActCandidates(resolved.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "dragonsBreathExhale",
      ),
    ).toBe(false);
  });

  test("projects Dexterity save roll modes and flat bonuses on the granted exhale hole", () => {
    const session = spellBattle({
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "acid");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const caster = requireCombatant(endedCasterTurn.state, spellCasterId);
    const stateWithSaveModifiers = {
      ...endedCasterTurn.state,
      combatants: new Map(endedCasterTurn.state.combatants).set(spellCasterId, {
        ...caster,
        dodging: true,
        activeEffects: [
          ...caster.activeEffects,
          {
            kind: "wardingBond",
            effectRef: battleActiveEffectExecutionRefForTest("dragon-ward-one"),
            sourceProcedureRef: dragonsBreathSourceProcedureRef(
              endedCasterTurn.state,
            ),
            sourceCombatantId: spellTargetId,
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(3_600),
            },
          } satisfies Extract<
            BattleActiveEffect,
            { readonly kind: "wardingBond" }
          >,
        ],
      }),
    };
    const exhaleAct = dragonsBreathExhaleAct(stateWithSaveModifiers);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");

    expect(saveHole.targetRollModes).toContainEqual({
      targetId: spellCasterId,
      rollMode: "advantage",
    });
    expect(saveHole.targetFlatBonuses).toContainEqual({
      targetId: spellCasterId,
      sourceCombatantId: spellTargetId,
      sourceProcedureRef: expect.any(String),
      bonus: 1,
    });
  });

  test("applies Warding Bond shared-damage concentration fills from the exhale lifecycle", () => {
    const session = spellBattle({
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = stateWithWardingBondSharedCasterConcentration(
      endedCasterTurn.state,
    );
    const exhaleAct = dragonsBreathExhaleAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
      ],
    });
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    const needsConcentration = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
      ],
    });
    if (needsConcentration.tag !== "needsHoles") {
      throw new Error(
        "Expected Dragon's Breath to request concentration holes.",
      );
    }
    const targetConcentrationHole = requireConcentrationHole(
      needsConcentration.holes,
      spellCasterId,
    );
    const sharedCasterConcentrationHole = requireConcentrationHole(
      needsConcentration.holes,
      spellTargetId,
    );
    const beforeTargetHp = Number(
      requireCombatant(targetTurn, spellCasterId).hp,
    );
    const beforeSharedCasterHp = Number(
      requireCombatant(targetTurn, spellTargetId).hp,
    );

    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
        {
          kind: "concentrationSavingThrow",
          holeId: targetConcentrationHole.holeId,
          value: { succeeded: true },
        },
        {
          kind: "concentrationSavingThrow",
          holeId: sharedCasterConcentrationHole.holeId,
          value: { succeeded: false },
        },
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dragon's Breath exhale to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(
      beforeTargetHp - 3,
    );
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(
      beforeSharedCasterHp - 3,
    );
    expect(
      requireCombatant(resolved.state, spellTargetId).concentration,
    ).toBeNull();
  });

  test("preserves Warding Bond shared damage before later same-Cone direct damage", () => {
    const laterTargetId = combatantId(
      "unit-profile-dragons-breath-warding-bond-later-target",
    );
    const session = spellBattle({
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [laterTargetId],
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = stateWithWardingBondTarget(
      endedCasterTurn.state,
      spellCasterId,
      laterTargetId,
    );
    const exhaleAct = dragonsBreathExhaleAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const saveFill = dragonsBreathSavingThrowOutcomeFill(saveHole, {
      originAnchorId: spellTargetId,
      affectedTargetIds: [spellCasterId, laterTargetId],
      outcomes: [
        { targetId: spellCasterId, succeeded: false },
        { targetId: laterTargetId, succeeded: false },
      ],
    });
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill],
    });
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damageHole, [[2, 2, 2]]);
    const needsConcentration = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill, damageFill],
    });
    const concentrationHole = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    const beforeProtectedHp = Number(
      requireCombatant(targetTurn, spellCasterId).hp,
    );
    const beforeLaterHp = Number(
      requireCombatant(targetTurn, laterTargetId).hp,
    );

    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        saveFill,
        damageFill,
        {
          kind: "concentrationSavingThrow",
          holeId: concentrationHole.holeId,
          value: { succeeded: true },
        },
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dragon's Breath exhale to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(
      beforeProtectedHp - 3,
    );
    expect(Number(requireCombatant(resolved.state, laterTargetId).hp)).toBe(
      beforeLaterHp - 9,
    );
  });

  test("requests and applies matching spell damage reduction before exhale damage", () => {
    const session = spellBattle({
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = stateWithSpellDamageReduction(
      endedCasterTurn.state,
      spellCasterId,
      "fire",
    );
    const exhaleAct = dragonsBreathExhaleAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
      ],
    });
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    const needsReduction = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
      ],
    });
    const reductionHole = requireResultHole(needsReduction, "rolledDice");
    expect(reductionHole).toMatchObject({
      spellDamageReduction: {
        targetId: spellCasterId,
        damageType: "fire",
      },
    });
    const needsConcentration = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
        damageRollFillWithGroups(reductionHole, [[4]]),
      ],
    });
    const concentrationHole = requireResultHole(
      needsConcentration,
      "concentrationSavingThrow",
    );
    const beforeHp = Number(requireCombatant(targetTurn, spellCasterId).hp);
    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
        damageRollFillWithGroups(damageHole, [[2, 2, 2]]),
        damageRollFillWithGroups(reductionHole, [[4]]),
        {
          kind: "concentrationSavingThrow",
          holeId: concentrationHole.holeId,
          value: { succeeded: true },
        },
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dragon's Breath exhale to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(
      beforeHp - 2,
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellDamageReduction",
        damageType: "fire",
        usedThisTurn: true,
      }),
    );
  });

  test("rejects stale exhale state and spends the Magic action when the Cone affects no targets", () => {
    const session = spellBattle({
      preparedSpells: [dragonsBreathSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "poison");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const exhaleAct = dragonsBreathExhaleAct(endedCasterTurn.state);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    expect(
      resolveBattleSubject({
        state: endedCasterTurn.state,
        subject: {
          ...exhaleAct.subject,
          actorId: spellCasterId,
        },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "wrongActor" });
    expect(
      resolveBattleSubject({
        state: {
          ...endedCasterTurn.state,
          currentTurnResources: {
            ...endedCasterTurn.state.currentTurnResources,
            actionResources: [],
          },
        },
        subject: exhaleAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    const exhalingTarget = requireCombatant(
      endedCasterTurn.state,
      spellTargetId,
    );
    expect(
      resolveBattleSubject({
        state: {
          ...endedCasterTurn.state,
          combatants: new Map(endedCasterTurn.state.combatants).set(
            spellTargetId,
            {
              ...exhalingTarget,
              activeEffects: exhalingTarget.activeEffects.filter(
                (effect) => effect.kind !== "dragonsBreath",
              ),
            },
          ),
        },
        subject: exhaleAct.subject,
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });

    const emptyCone = resolveBattleSubject({
      state: endedCasterTurn.state,
      subject: exhaleAct.subject,
      fills: [
        dragonsBreathSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [],
          outcomes: [],
        }),
      ],
    });
    expect(emptyCone).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });

    expect(
      resolveBattleSubject({
        state: endedCasterTurn.state,
        subject: exhaleAct.subject,
        fills: [
          dragonsBreathSavingThrowOutcomeFill(saveHole, {
            originAnchorId: spellTargetId,
            affectedTargetIds: [],
            outcomes: [],
          }),
          {
            kind: "rolledDice",
            holeId: saveHole.holeId,
            value: [rolledDiceGroup([1])],
          },
        ],
      }),
    ).toMatchObject({ tag: "invalid", reason: "invalidFill" });
  });
});

function castDragonsBreath(
  session: BattleRuntimeSession,
  damageType: DamageType,
): BattleState {
  const act = bonusSpellAct({
    session,
    spellId: dragonsBreathUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetListFill(
        targetHole,
        spellCasterId,
        dragonsBreathUnitId,
        [spellTargetId],
      ),
      damageTypeChoiceFill(damageTypeHole, damageType),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error(
      `Expected Dragon's Breath to resolve: ${JSON.stringify(resolved)}`,
    );
  }
  expect(resolved).toMatchObject({ tag: "resolved" });
  return resolved.state;
}

function dragonsBreathSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(dragonsBreathInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function dragonsBreathExhaleAct(state: BattleState) {
  const exhaleAct = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "dragonsBreathExhale",
  );
  if (
    exhaleAct?.subject.tag !== "runtimeCommand" ||
    exhaleAct.subject.command !== "dragonsBreathExhale"
  ) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return exhaleAct;
}

function stateWithExhalingTargetActionEarlyEndCondition(
  state: BattleState,
): BattleState {
  const target = requireCombatant(state, spellTargetId);
  if (target.positiveHpUnconscious !== null) {
    throw new Error("Expected Dragon's Breath fixture target to be conscious.");
  }
  const effect = {
    kind: "targetActionEndedSpellCondition",
    sourceProcedureRef: dragonsBreathSourceProcedureRef(state),
    sourceCombatantId: spellTargetId,
    condition: "invisible",
    conditionHadNonSpellSource: false,
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(10),
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "targetActionEndedSpellCondition" }
  >;
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      conditions: { ...target.conditions, invisible: true },
      activeEffects: [...target.activeEffects, effect],
    }),
  };
}

function stateWithWardingBondSharedCasterConcentration(
  state: BattleState,
): BattleState {
  const stateWithBond = stateWithWardingBondTarget(
    state,
    spellCasterId,
    spellTargetId,
  );
  const sharedDamageCaster = requireCombatant(state, spellTargetId);
  return {
    ...stateWithBond,
    combatants: new Map(stateWithBond.combatants).set(spellTargetId, {
      ...sharedDamageCaster,
      concentration: {
        sourceProcedureRef: dragonsBreathSourceProcedureRef(state),
        effectKind: "spellEffect",
      },
    }),
  };
}

function stateWithWardingBondTarget(
  state: BattleState,
  targetId: CombatantId,
  sourceId: CombatantId,
): BattleState {
  const target = requireCombatant(state, targetId);
  const wardingBondEffect = {
    kind: "wardingBond",
    effectRef: battleActiveEffectExecutionRefForTest("dragon-ward-two"),
    sourceProcedureRef: dragonsBreathSourceProcedureRef(state),
    sourceCombatantId: sourceId,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(3_600),
    },
  } satisfies Extract<BattleActiveEffect, { readonly kind: "wardingBond" }>;
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [...target.activeEffects, wardingBondEffect],
    }),
  };
}

function stateWithSpellDamageReduction(
  state: BattleState,
  targetId: CombatantId,
  damageType: DamageType,
): BattleState {
  const target = requireCombatant(state, targetId);
  const spellDamageReductionEffect = {
    kind: "spellDamageReduction",
    sourceProcedureRef: dragonsBreathSourceProcedureRef(state),
    sourceCombatantId: spellTargetId,
    damageType,
    amount: { dice: 1, dieSize: 4 },
    usedThisTurn: false,
    expiresAt: {
      kind: "duration",
      durationTicks: elapsedTimeTicks(60),
    },
  } satisfies Extract<
    BattleActiveEffect,
    { readonly kind: "spellDamageReduction" }
  >;
  return {
    ...state,
    combatants: new Map(state.combatants).set(targetId, {
      ...target,
      activeEffects: [...target.activeEffects, spellDamageReductionEffect],
    }),
  };
}

function dragonsBreathSourceProcedureRef(state: BattleState) {
  const effect = requireCombatant(state, spellTargetId).activeEffects.find(
    (candidate) => candidate.kind === "dragonsBreath",
  );
  if (effect === undefined) {
    throw new Error("Expected Dragon's Breath active effect.");
  }
  return effect.sourceProcedureRef;
}

function requireConcentrationHole(
  holes: readonly BattleHole[],
  combatantId: CombatantId,
): Extract<BattleHole, { readonly kind: "concentrationSavingThrow" }> {
  const hole = holes.find(
    (
      candidate,
    ): candidate is Extract<
      BattleHole,
      { readonly kind: "concentrationSavingThrow" }
    > =>
      candidate.kind === "concentrationSavingThrow" &&
      candidate.combatantId === combatantId,
  );
  if (hole === undefined) {
    throw new Error(`Expected concentration hole for ${combatantId}.`);
  }
  return hole;
}

function dragonsBreathSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  value: {
    readonly originAnchorId: CombatantId;
    readonly affectedTargetIds: readonly CombatantId[];
    readonly outcomes: readonly {
      readonly targetId: CombatantId;
      readonly succeeded: boolean;
    }[];
  },
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome" as const,
    holeId: hole.holeId,
    value: {
      area: {
        originAnchorId: value.originAnchorId,
        affectedTargetIds: value.affectedTargetIds,
      },
      outcomes: value.outcomes,
    },
  };
}
