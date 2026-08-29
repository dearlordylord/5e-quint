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
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";
import { Hp } from "@dnd/shared/types";
import {
  holeId,
  holeInstanceKey,
} from "@dnd/shared-algebras/runtime-hole-algebra";
import grantedAreaSaveDamageActionInput from "../../surface/content/dragons_breath.json";
import {
  grantedAreaSaveDamageActionUnitId,
  resistanceUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  rolledDiceGroup,
  attackDamageDispositionFill,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  bonusSpellAct,
  damageTypeChoiceFill,
  knownWillingSpellTargetFill,
  knownWillingSpellTargetListFill,
  spellAct,
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
  spellSaveDcForCaster,
  spellSlotInvocationRef,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type CombatantId,
  type DamageType,
  type SpellRecord,
} from "./unit-profile-admission.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest,
  requireCharacterUnitProcedureRefForTest,
  requireCharacterSpellProcedureRefForTest,
  testCharacterD20Statistics,
  unitLibrary,
  wizardSpellcasting,
  ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE,
} from "./battle-runtime.test-support.ts";
import { BattleCheckpointFrontierEnvelopeSchema } from "./index.ts";

describe("Dragon's Breath initial cast admission", () => {
  test("stores chosen damage type, original slot, and caster save DC on the willing target", () => {
    const spell = grantedAreaSaveDamageActionSpell();
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
      spellId: grantedAreaSaveDamageActionUnitId,
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
        spellSlotInvocationRef(
          grantedAreaSaveDamageActionUnitId,
          3,
          "grantedAreaSaveDamageAction",
        ),
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
          grantedAreaSaveDamageActionUnitId,
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
        kind: "grantedAreaSaveDamageAction",
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
    const spell = grantedAreaSaveDamageActionSpell();
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const state = session.state;
    const act = bonusSpellAct({
      session,
      spellId: grantedAreaSaveDamageActionUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const damageTypeHole = requireHole(act.initialHoles, "damageTypeChoice");

    expect(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [
          spellTargetListFill(
            targetHole,
            spellCasterId,
            grantedAreaSaveDamageActionUnitId,
            [spellTargetId],
          ),
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
        (effect) => effect.kind === "grantedAreaSaveDamageAction",
      ),
    ).toBe(false);
  });

  test("grants the target an exhale and applies a low-level action-ended invisibility interaction", () => {
    const renamedPresentationSpell = {
      ...grantedAreaSaveDamageActionSpell(),
      name: "Synthetic Breath Gift",
    };
    const session = spellBattle({
      casterClassLevels: [{ className: "wizard", level: classLevel(3) }],
      casterD20Statistics: testCharacterD20Statistics({ int: 16 }),
      preparedSpells: [renamedPresentationSpell],
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
    const targetTurn = stateWithSyntheticExhaleEndedInvisibilityInteraction(
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
        act.subject.command === "grantedAreaSaveDamageAction",
    );
    expect(exhaleAct?.label).toBe("Exhale Synthetic Breath Gift");
    if (
      exhaleAct?.subject.tag !== "runtimeCommand" ||
      exhaleAct.subject.command !== "grantedAreaSaveDamageAction"
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
          originAnchorId: spellTargetId,
          affectedTargetIds: [spellCasterId],
          outcomes: [{ targetId: spellCasterId, succeeded: false }],
        }),
      ],
    });
    if (needsDamage.tag !== "needsHoles") {
      throw new Error("Expected Dragon's Breath damage dice.");
    }
    assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest({
      snapshot: needsDamage.snapshot,
      subject: exhaleAct.subject,
      holes: needsDamage.holes,
    });
    const wrongOccurrenceHoles = needsDamage.holes.map((hole) =>
      hole.kind === "rolledDice" && "grantedAreaSaveDamageAction" in hole
        ? {
            ...hole,
            holeId: holeId("battle:dragons-breath:another-occurrence:damage"),
            holeInstanceKey: holeInstanceKey(
              "battle:dragons-breath:another-occurrence:damage",
            ),
          }
        : hole,
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          checkpoint: needsDamage.snapshot,
          frontier: {
            kind: "acts",
            acts: [
              {
                subject: exhaleAct.subject,
                initialHoles: wrongOccurrenceHoles,
              },
            ],
          },
        }),
      ),
    ).toBe(true);
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    expect(damageHole).toMatchObject({
      grantedAreaSaveDamageAction: { sourceCombatantId: spellCasterId },
    });
    const wrongOwnerHoles = needsDamage.holes.map((hole) =>
      hole.kind === "rolledDice" && "grantedAreaSaveDamageAction" in hole
        ? {
            ...hole,
            grantedAreaSaveDamageAction: {
              ...hole.grantedAreaSaveDamageAction,
              sourceCombatantId: spellTargetId,
            },
          }
        : hole,
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          checkpoint: needsDamage.snapshot,
          frontier: {
            kind: "acts",
            acts: [
              { subject: exhaleAct.subject, initialHoles: wrongOwnerHoles },
            ],
          },
        }),
      ),
    ).toBe(true);
    const needsConcentration = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
          act.subject.command === "grantedAreaSaveDamageAction",
      ),
    ).toBe(false);
  });

  test("projects Dexterity save roll modes and flat bonuses on the granted exhale hole", () => {
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "acid");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const stateWithSaveModifiers = stateWithSyntheticWardingBondInteraction(
      endedCasterTurn.state,
      spellCasterId,
      spellTargetId,
    );
    const caster = requireCombatant(stateWithSaveModifiers, spellCasterId);
    const stateWithSaveModifiersAndDodge = {
      ...stateWithSaveModifiers,
      combatants: new Map(stateWithSaveModifiers.combatants).set(
        spellCasterId,
        { ...caster, dodging: true },
      ),
    };
    const exhaleAct = grantedAreaSaveDamageActionAct(
      stateWithSaveModifiersAndDodge,
    );
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

  test("applies a low-level Warding Bond interaction before exhale concentration fills", () => {
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
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
    const exhaleAct = grantedAreaSaveDamageActionAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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

  test("preserves low-level Warding Bond shared damage before later same-Cone direct damage", () => {
    const laterTargetId = combatantId(
      "unit-profile-dragons-breath-warding-bond-later-target",
    );
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [laterTargetId],
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = stateWithSyntheticWardingBondInteraction(
      endedCasterTurn.state,
      spellCasterId,
      laterTargetId,
    );
    const exhaleAct = grantedAreaSaveDamageActionAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const saveFill = grantedAreaSaveDamageActionSavingThrowOutcomeFill(
      saveHole,
      {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId, laterTargetId],
        outcomes: [
          { targetId: spellCasterId, succeeded: false },
          { targetId: laterTargetId, succeeded: false },
        ],
      },
    );
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
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: wizardSpellcasting({
        cantrips: [spellRecord(resistanceUnitId)],
        preparedSpells: [],
      }),
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const resistanceSession = battleRuntimeSessionForTest({
      ...session,
      state: endedCasterTurn.state,
    });
    const resistanceAct = spellAct({
      session: resistanceSession,
      spellId: resistanceUnitId,
    });
    const resistanceTarget = requireHole(
      resistanceAct.initialHoles,
      "targetChoice",
    );
    const resistanceDamageType = requireHole(
      resistanceAct.initialHoles,
      "damageTypeChoice",
    );
    const resistanceCast = resolveBattleSubject({
      state: resistanceSession.state,
      subject: resistanceAct.subject,
      fills: [
        knownWillingSpellTargetFill(
          resistanceTarget,
          resistanceUnitId,
          spellTargetId,
          spellCasterId,
        ),
        damageTypeChoiceFill(resistanceDamageType, "fire"),
      ],
    });
    if (resistanceCast.tag !== "resolved") {
      throw new Error(
        `Expected admitted Resistance cast to resolve: ${JSON.stringify(resistanceCast)}`,
      );
    }
    const nextCasterTurn = endTurn({
      state: resistanceCast.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected Resistance caster turn to end.");
    }
    const nextTargetTurn = endTurn({
      state: nextCasterTurn.state,
      actorId: spellCasterId,
    });
    if (nextTargetTurn.tag !== "resolved") {
      throw new Error("Expected Dragon's Breath source turn to end.");
    }
    const targetTurn = nextTargetTurn.state;
    const exhaleAct = grantedAreaSaveDamageActionAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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

  test("halves an odd damage roll after a successful Dexterity save", () => {
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "lightning");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = endedCasterTurn.state;
    const exhaleAct = grantedAreaSaveDamageActionAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const saveFill = grantedAreaSaveDamageActionSavingThrowOutcomeFill(
      saveHole,
      {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId],
        outcomes: [{ targetId: spellCasterId, succeeded: true }],
      },
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill],
    });
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    const damageFill = damageRollFillWithGroups(damageHole, [[3, 3, 3]]);
    const needsConcentration = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill, damageFill],
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
      throw new Error("Expected successful-save exhale to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellCasterId).hp)).toBe(
      beforeHp - 4,
    );
  });

  test("spends the Magic action without damaging an immune Cone target", () => {
    const immuneTargetId = combatantId("dragons-breath-fire-immune-target");
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: immuneTargetId,
          statBlock: fireImmuneHumanoidStatBlock(),
          initiative: 5,
        },
      ],
    });
    const cast = castDragonsBreath(session, "fire");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurn = endedCasterTurn.state;
    const exhaleAct = grantedAreaSaveDamageActionAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const saveFill = grantedAreaSaveDamageActionSavingThrowOutcomeFill(
      saveHole,
      {
        originAnchorId: spellTargetId,
        affectedTargetIds: [immuneTargetId],
        outcomes: [{ targetId: immuneTargetId, succeeded: false }],
      },
    );
    const needsDamage = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill],
    });
    const damageHole = requireResultHole(needsDamage, "rolledDice");
    const beforeHp = requireCombatant(targetTurn, immuneTargetId).hp;

    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill, damageRollFillWithGroups(damageHole, [[4, 4, 4]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected damage-immune exhale to resolve.");
    }
    expect(requireCombatant(resolved.state, immuneTargetId).hp).toBe(beforeHp);
  });

  test("offers and applies zero-Hit-Point replacement for exhale damage", () => {
    const relentlessEndurance = unitLibrary.requireUnit(
      "orc_relentless_endurance",
    );
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterResources: [{ unit: relentlessEndurance }],
      casterUnitRefs: [
        {
          unit: relentlessEndurance,
          supportProfiles: [ZERO_HIT_POINT_REPLACEMENT_SUPPORT_PROFILE],
        },
      ],
    });
    const cast = castDragonsBreath(session, "cold");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const caster = requireCombatant(endedCasterTurn.state, spellCasterId);
    if (caster.positiveHpUnconscious !== null) {
      throw new Error(
        "Expected the Relentless Endurance caster to be conscious.",
      );
    }
    const targetTurn: BattleState = {
      ...endedCasterTurn.state,
      combatants: new Map(endedCasterTurn.state.combatants).set(spellCasterId, {
        ...caster,
        hp: Hp(3),
      }),
    };
    const exhaleAct = grantedAreaSaveDamageActionAct(targetTurn);
    const saveHole = requireHole(exhaleAct.initialHoles, "savingThrowOutcome");
    const saveFill = grantedAreaSaveDamageActionSavingThrowOutcomeFill(
      saveHole,
      {
        originAnchorId: spellTargetId,
        affectedTargetIds: [spellCasterId],
        outcomes: [{ targetId: spellCasterId, succeeded: false }],
      },
    );
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
    const concentrationFill = {
      kind: "concentrationSavingThrow" as const,
      holeId: concentrationHole.holeId,
      value: { succeeded: true },
    };
    const needsDisposition = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [saveFill, damageFill, concentrationFill],
    });
    const dispositionHole = requireResultHole(
      needsDisposition,
      "attackDamageDisposition",
    );
    expect(dispositionHole).toMatchObject({
      targetId: spellCasterId,
      choices: expect.arrayContaining([
        expect.objectContaining({ kind: "zeroHitPointReplacement" }),
      ]),
    });

    const resolved = resolveBattleSubject({
      state: targetTurn,
      subject: exhaleAct.subject,
      fills: [
        saveFill,
        damageFill,
        concentrationFill,
        attackDamageDispositionFill(dispositionHole, {
          kind: "zeroHitPointReplacement",
          procedureRef: requireCharacterUnitProcedureRefForTest(
            session,
            spellCasterId,
            "orc_relentless_endurance",
          ),
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected zero-Hit-Point replacement to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hp).toBe(Hp(1));
  });

  test("rejects stale exhale state and spends the Magic action when the Cone affects no targets", () => {
    const session = spellBattle({
      preparedSpells: [grantedAreaSaveDamageActionSpell()],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const cast = castDragonsBreath(session, "poison");
    const endedCasterTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (endedCasterTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const exhaleAct = grantedAreaSaveDamageActionAct(endedCasterTurn.state);
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
                (effect) => effect.kind !== "grantedAreaSaveDamageAction",
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
        grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
          grantedAreaSaveDamageActionSavingThrowOutcomeFill(saveHole, {
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
    spellId: grantedAreaSaveDamageActionUnitId,
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
        grantedAreaSaveDamageActionUnitId,
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

function grantedAreaSaveDamageActionSpell(): SpellRecord {
  const unit = decodeUnitRecordSync(grantedAreaSaveDamageActionInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Dragon's Breath fixture to decode as a spell.");
  }
  return unit;
}

function fireImmuneHumanoidStatBlock() {
  const base = statBlockWithCreatureType("humanoid");
  return {
    ...base,
    statBlock: {
      ...base.statBlock,
      immunities: { damageTypes: ["fire"] as const },
    },
  };
}

function grantedAreaSaveDamageActionAct(state: BattleState) {
  const exhaleAct = discoverBattleActCandidates(state).find(
    (act) =>
      act.subject.tag === "runtimeCommand" &&
      act.subject.command === "grantedAreaSaveDamageAction",
  );
  if (
    exhaleAct?.subject.tag !== "runtimeCommand" ||
    exhaleAct.subject.command !== "grantedAreaSaveDamageAction"
  ) {
    throw new Error("Expected Dragon's Breath exhale action.");
  }
  return exhaleAct;
}

function stateWithSyntheticExhaleEndedInvisibilityInteraction(
  state: BattleState,
): BattleState {
  const target = requireCombatant(state, spellTargetId);
  if (target.positiveHpUnconscious !== null) {
    throw new Error("Expected Dragon's Breath fixture target to be conscious.");
  }
  const invisibilityProcedureRef = battleProcedureExecutionRefForTest(
    "synthetic-dragons-breath-interaction-invisibility",
  );
  const effect = {
    kind: "targetActionEndedSpellCondition",
    sourceProcedureRef: invisibilityProcedureRef,
    sourceCombatantId: spellTargetId,
    condition: "invisible",
    conditionHadNonSpellSource: false,
    expiresAt: {
      kind: "concentration",
      combatantId: spellTargetId,
      durationTicks: elapsedTimeTicks(10),
    },
  } as const;
  const conditionedState: BattleState = {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...target,
      concentration: {
        sourceProcedureRef: invisibilityProcedureRef,
        effectKind: "spellEffect",
      },
      conditions: { ...target.conditions, invisible: true },
    }),
  };
  return battleStateWithAllocatedEffectForTest({
    state: conditionedState,
    ownerId: spellTargetId,
    effect,
  });
}

function stateWithWardingBondSharedCasterConcentration(
  state: BattleState,
): BattleState {
  const stateWithBond = stateWithSyntheticWardingBondInteraction(
    state,
    spellCasterId,
    spellTargetId,
  );
  const sharedDamageCaster = requireCombatant(stateWithBond, spellTargetId);
  const concentrationProcedureRef = battleProcedureExecutionRefForTest(
    "synthetic-dragons-breath-interaction-target-concentration",
  );
  return {
    ...stateWithBond,
    combatants: new Map(stateWithBond.combatants).set(spellTargetId, {
      ...sharedDamageCaster,
      concentration: {
        sourceProcedureRef: concentrationProcedureRef,
        effectKind: "spellEffect",
      },
    }),
  };
}

function stateWithSyntheticWardingBondInteraction(
  state: BattleState,
  targetId: CombatantId,
  sourceId: CombatantId,
): BattleState {
  return battleStateWithAllocatedEffectForTest({
    state,
    ownerId: targetId,
    effect: {
      kind: "linkedDefenseResistanceDamageShare",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-dragons-breath-interaction-warding-bond",
      ),
      sourceCombatantId: sourceId,
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(3_600),
      },
    },
  });
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

function grantedAreaSaveDamageActionSavingThrowOutcomeFill(
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
