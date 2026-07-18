import { battleProcedureExecutionRefForTest } from "./battle-runtime-test-support.ts";
import {
  resolveBattleSubject,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime-test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29B color_spray
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29C entangle
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV38A sleep
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-BLINDNESS-DEAFNESS blindness_deafness
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-HOLD-PERSON hold_person
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-02-L5-SAVE-CONDITION-CONTROL hold_monster
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-02-L5-SAVE-CONDITION-CONTROL contagion
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-LESSER-RESTORATION lesser_restoration
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-condition-save spell.invocation-sleep-target-admission spell.invocation-direct-condition-removal
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.CONDITION_REMOVAL_AND_PROTECTION
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  type ActionSpellAct,
  blindnessDeafnessUnitId,
  colorSprayUnitId,
  contagionUnitId,
  entangleUnitId,
  heroismUnitId,
  holdMonsterDurationTicks,
  holdMonsterUnitId,
  holdPersonDurationTicks,
  holdPersonUnitId,
  lesserRestorationUnitId,
  sleepUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog-support.ts";
import { HEIGHTENED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import {
  requireCombatant,
  damageRollFillWithGroups,
  requireHole,
  requireResultHole,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  bonusSpellAct,
  abilityChoiceFill,
  savingThrowOutcomeFill,
  spellConditionChoiceFill,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
  spellTargetListFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  BattleFillSchema,
  BattleHoleSchema,
  breakBattleConcentration,
  combatantId,
  discoverBattleActs,
  endTurn,
  type BattleState,
  type CombatantId,
} from "./index.ts";
import {
  applyCondition,
  battleCreatureStateWithKnockOutPreservedConditions,
  hasCondition,
  resourceCount,
  spellSlotInvocationRef,
  spellSlotLevel,
  supportedPreparedSaveGateConditionProfile,
  supportedPreparedSleepTargetAdmissionProfile,
} from "./unit-profile-admission-test-support.ts";

describe("QMBT14 deterministic save-condition Spell Unit admission", () => {
  test("hold_person is admitted with Humanoid filtering, Paralyzed lifecycle, and Concentration cleanup", () => {
    const spell = spellRecord(holdPersonUnitId);
    const beastId = combatantId("unit-profile-hold-person-beast");
    const secondHumanoidId = combatantId("unit-profile-hold-person-humanoid-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [secondHumanoidId],
      statBlockTargets: [
        {
          combatantId: beastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 8,
        },
      ],
    });
    const act = spellAct({
      state,
      spellId: holdPersonUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef("hold_person", 3, "saveGatedCondition"),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
      }),
    );
    expect(targetHole.choices).toEqual(
      expect.arrayContaining([spellTargetId, secondHumanoidId]),
    );
    expect(targetHole.choices).not.toContain(beastId);
    expect(spellHoleInvocation([targetHole])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "wis",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 2 },
        targetCreatureTypes: ["humanoid"],
        effect: {
          kind: "fixed",
          condition: "paralyzed",
          expiresAt: {
            kind: "concentration",
            durationTicks: holdPersonDurationTicks,
          },
          escape: null,
          turnStartDamage: null,
          repeatSave: {
            ability: "wis",
            dc: { kind: "caster_spell_save_dc" },
          },
        },
        rangeFeet: 60,
      }),
    );

    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      holdPersonUnitId,
      [spellTargetId, secondHumanoidId],
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    expect(savingThrow).toEqual(
      expect.objectContaining({
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
          { targetId: secondHumanoidId, succeeded: true },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Hold Person to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ paralyzed: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellConditionEndTurnSave",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(holdPersonUnitId),
          ),
          sourceCombatantId: spellCasterId,
          condition: "paralyzed",
          save: { ability: "wis", dc: { kind: "caster_spell_save_dc" } },
          expiresAt: {
            kind: "concentration",
            combatantId: spellCasterId,
            durationTicks: holdPersonDurationTicks,
          },
        }),
      ],
    });
    expect(resolved.state.combatants.get(secondHumanoidId)).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });
    expect(resolved.state.combatants.get(spellCasterId)?.concentration).toEqual(
      {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(holdPersonUnitId),
        ),
        effectKind: "spellEffect",
      },
    );

    const concentrationBroken = breakBattleConcentration(
      resolved.state,
      spellCasterId,
    );
    expect(concentrationBroken.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });

    const paralyzedTarget = requireCombatant(resolved.state, spellTargetId);
    const nearlyExpiredCombatants = new Map(resolved.state.combatants).set(
      spellTargetId,
      {
        ...paralyzedTarget,
        activeEffects: paralyzedTarget.activeEffects.map((effect) =>
          effect.kind === "spellConditionEndTurnSave" &&
          effect.sourceProcedureRef === holdPersonUnitId &&
          effect.expiresAt.kind === "concentration"
            ? {
                ...effect,
                expiresAt: {
                  ...effect.expiresAt,
                  durationTicks: elapsedTimeTicks(1),
                },
              }
            : effect,
        ),
      },
    );
    const expiredCombatants = tickDurationEffects(
      nearlyExpiredCombatants,
    ).value;
    expect(expiredCombatants.get(spellCasterId)?.concentration).toBeNull();
    expect(expiredCombatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const repeatSave = requireResultHole(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
      "savingThrowOutcome",
    );
    expect(repeatSave).toEqual(
      expect.objectContaining({
        spellConditionEndTurnSave: expect.objectContaining({
          targetId: spellTargetId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(holdPersonUnitId),
          ),
          condition: "paralyzed",
        }),
        ability: "wis",
      }),
    );
    const ended = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(ended).toMatchObject({ tag: "resolved" });
    if (ended.tag !== "resolved") {
      throw new Error(
        "Expected successful Hold Person repeat save to resolve.",
      );
    }
    expect(ended.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });
    expect(ended.state.combatants.get(spellCasterId)?.concentration).toBeNull();
  });

  test("Heightened hold_person carries Disadvantage only to the selected failed target repeat save", () => {
    const secondHumanoidId = combatantId("heightened-hold-person-humanoid-2");
    const cast = castHeightenedHoldPerson({
      slotLevel: 3,
      targetIds: [spellTargetId, secondHumanoidId],
      heightenedTargetId: spellTargetId,
      failedTargetIds: [spellTargetId, secondHumanoidId],
    });

    expect(requireCombatant(cast, spellTargetId).activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellConditionEndTurnSave",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(holdPersonUnitId),
        ),
        heightenedSpellTargetDisadvantage: {
          kind: "heightenedSpellTargetDisadvantage",
        },
      }),
    );
    expect(
      requireCombatant(cast, secondHumanoidId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellConditionEndTurnSave",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(holdPersonUnitId),
        ),
        heightenedSpellTargetDisadvantage: null,
      }),
    );

    const selectedTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (selectedTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const selectedRepeatSave = requireResultHole(
      endTurn({ state: selectedTurn.state, actorId: spellTargetId }),
      "savingThrowOutcome",
    );
    expect(selectedRepeatSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });
    const selectedEnded = endTurn({
      state: selectedTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(selectedRepeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (selectedEnded.tag !== "resolved") {
      throw new Error("Expected selected Hold Person repeat save to resolve.");
    }
    expect(requireCombatant(selectedEnded.state, spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });

    const unselectedRepeatSave = requireResultHole(
      endTurn({ state: selectedEnded.state, actorId: secondHumanoidId }),
      "savingThrowOutcome",
    );
    expect(unselectedRepeatSave.targetRollModes).not.toContainEqual({
      targetId: secondHumanoidId,
      rollMode: "disadvantage",
    });
    const unselectedEnded = endTurn({
      state: selectedEnded.state,
      actorId: secondHumanoidId,
      fills: [
        savingThrowOutcomeFill(unselectedRepeatSave, [
          { targetId: secondHumanoidId, succeeded: true },
        ]),
      ],
    });
    if (unselectedEnded.tag !== "resolved") {
      throw new Error(
        "Expected unselected Hold Person repeat save to resolve.",
      );
    }
    expect(
      requireCombatant(unselectedEnded.state, secondHumanoidId),
    ).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });
  });

  test("hold_person self-target failed save spends resources then immediately breaks Concentration", () => {
    const spell = spellRecord(holdPersonUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: holdPersonUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetHole.choices).toContain(spellCasterId);
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      holdPersonUnitId,
      [spellCasterId],
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected self-target Hold Person to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster).toMatchObject({
      concentration: null,
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Hold Person caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
  });

  test("hold_person failed save breaks target Concentration while keeping Paralyzed", () => {
    const spell = spellRecord(holdPersonUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const target = requireCombatant(baseState, spellTargetId);
    const targetConcentration = {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(heroismUnitId),
      ),
      effectKind: "spellEffect" as const,
    };
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(spellTargetId, {
        ...target,
        concentration: targetConcentration,
        activeEffects: [
          ...target.activeEffects,
          {
            kind: "turnStartTemporaryHitPoints" as const,
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(heroismUnitId),
            ),
            sourceCombatantId: spellTargetId,
            amount: 3,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: spellTargetId,
            },
          },
        ],
      }),
    };
    const act = spellAct({
      state,
      spellId: holdPersonUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      holdPersonUnitId,
      [spellTargetId],
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected target-concentrating Hold Person to resolve.");
    }
    expect(resolved.state.combatants.get(spellCasterId)?.concentration).toEqual(
      {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(holdPersonUnitId),
        ),
        effectKind: "spellEffect",
      },
    );
    expect(resolved.state.combatants.get(spellTargetId)).toMatchObject({
      concentration: null,
      conditions: expect.objectContaining({ paralyzed: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellConditionEndTurnSave",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(holdPersonUnitId),
          ),
        }),
      ],
    });
    expect(
      resolved.state.combatants
        .get(spellTargetId)
        ?.activeEffects.some(
          (effect) =>
            "sourceProcedureRef" in effect &&
            effect.sourceProcedureRef === heroismUnitId,
        ),
    ).toBe(false);
  });

  test("hold_person all-success initial save spends resources without stale Concentration", () => {
    const spell = spellRecord(holdPersonUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: holdPersonUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      holdPersonUnitId,
      [spellTargetId],
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected all-success Hold Person to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.concentration).toBeNull();
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Hold Person caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
    expect(resolved.state.currentTurnResources.actionResources).toEqual([]);
    expect(resolved.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ paralyzed: true }),
      activeEffects: [],
    });
  });

  test("hold_monster is admitted as a level-5 creature Paralyzed lifecycle without Humanoid filtering", () => {
    const spell = spellRecord(holdMonsterUnitId);
    const beastId = combatantId("unit-profile-hold-monster-beast");
    const undeadId = combatantId("unit-profile-hold-monster-undead");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      statBlockTargets: [
        {
          combatantId: beastId,
          statBlock: statBlockWithCreatureType("beast"),
          initiative: 8,
        },
        {
          combatantId: undeadId,
          statBlock: statBlockWithCreatureType("undead"),
          initiative: 7,
        },
      ],
    });
    const act = spellAct({
      state,
      spellId: holdMonsterUnitId,
      slotLevel: 5,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(holdMonsterUnitId, 5, "saveGatedCondition"),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
      }),
    );
    expect(targetHole.choices).toEqual(
      expect.arrayContaining([spellTargetId, beastId, undeadId]),
    );
    expect(spellHoleInvocation([targetHole])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 5 },
        ability: "wis",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        targetCreatureTypes: null,
        effect: {
          kind: "fixed",
          condition: "paralyzed",
          expiresAt: {
            kind: "concentration",
            durationTicks: holdMonsterDurationTicks,
          },
          escape: null,
          turnStartDamage: null,
          repeatSave: {
            ability: "wis",
            dc: { kind: "caster_spell_save_dc" },
          },
        },
        rangeFeet: 90,
      }),
    );

    const sixthLevelState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 6, count: 1 }],
    });
    const sixthLevelAct = spellAct({
      state: sixthLevelState,
      spellId: holdMonsterUnitId,
      slotLevel: 6,
    });
    expect(requireHole(sixthLevelAct.initialHoles, "spellTargetList")).toEqual(
      expect.objectContaining({ minTargets: 1, maxTargets: 2 }),
    );
  });

  test("contagion is admitted as touch save damage with counted Poisoned lifecycle", () => {
    const spell = spellRecord(contagionUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: contagionUnitId,
      slotLevel: 5,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(contagionUnitId, 5, "saveGatedDamage"),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const abilityHole = requireHole(act.initialHoles, "abilityChoice");
    expect(abilityHole.choices).toEqual([
      "str",
      "dex",
      "con",
      "int",
      "wis",
      "cha",
    ]);
    expect(spellHoleInvocation([abilityHole])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spell,
        resource: { tag: "spellSlot", slotLevel: 5 },
        castingTime: { kind: "action" },
        ability: "con",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 11, dieSize: 8 },
          damageType: "necrotic",
        },
        successDamage: "none",
        rangeFeet: 5,
        failedSaveConditionEffects: [
          {
            kind: "fixed",
            condition: "poisoned",
            expiresAt: { kind: "duration", durationTicks: 100800 },
            escape: null,
            turnStartDamage: null,
            repeatSave: {
              kind: "counted",
              save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
              successThreshold: 3,
              failureThreshold: 3,
              savingThrowDisadvantageAbilities: [
                "str",
                "dex",
                "con",
                "int",
                "wis",
                "cha",
              ],
            },
          },
        ],
        failedSaveAbilityChoices: ["str", "dex", "con", "int", "wis", "cha"],
      }),
    );

    const targetFill = spellTargetFill(
      targetHole,
      contagionUnitId,
      spellCasterId,
      spellTargetId,
    );
    const abilityFill = abilityChoiceFill(abilityHole, "wis");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, abilityFill],
    });
    const initialSave = requireResultHole(needsSave, "savingThrowOutcome");
    const needsDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        abilityFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        abilityFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Contagion to resolve.");
    }

    const poisonedTarget = requireCombatant(resolved.state, spellTargetId);
    expect(hasCondition(poisonedTarget.conditions, "poisoned")).toBe(true);
    expect(poisonedTarget.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellConditionCountedEndTurnSave",
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(contagionUnitId),
        ),
        sourceCombatantId: spellCasterId,
        condition: "poisoned",
        save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
        successes: 0,
        failures: 0,
        successThreshold: 3,
        failureThreshold: 3,
        savingThrowDisadvantageAbility: "wis",
        lockedIn: false,
        expiresAt: { kind: "duration", durationTicks: 100800 },
      }),
    );

    let successState = resolved.state;
    successState = advanceToContagionTargetTurn(successState);
    successState = resolveContagionTargetEndTurnSave(successState, true);
    expect(contagionEffect(successState)).toEqual(
      expect.objectContaining({ successes: 1, failures: 0, lockedIn: false }),
    );
    successState = advanceToContagionTargetTurn(successState);
    successState = resolveContagionTargetEndTurnSave(successState, true);
    expect(contagionEffect(successState)).toEqual(
      expect.objectContaining({ successes: 2, failures: 0, lockedIn: false }),
    );
    successState = advanceToContagionTargetTurn(successState);
    successState = resolveContagionTargetEndTurnSave(successState, true);
    expect(
      hasCondition(
        requireCombatant(successState, spellTargetId).conditions,
        "poisoned",
      ),
    ).toBe(false);
    expect(contagionEffect(successState)).toBeUndefined();
  });

  test("contagion locks in after three failed repeated saves", () => {
    const spell = spellRecord(contagionUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: contagionUnitId,
      slotLevel: 5,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const abilityHole = requireHole(act.initialHoles, "abilityChoice");
    const targetFill = spellTargetFill(
      targetHole,
      contagionUnitId,
      spellCasterId,
      spellTargetId,
    );
    const abilityFill = abilityChoiceFill(abilityHole, "con");
    const initialSave = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, abilityFill],
      }),
      "savingThrowOutcome",
    );
    const needsDamage = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        abilityFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    const damage = requireResultHole(needsDamage, "rolledDice");
    const cast = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        abilityFill,
        savingThrowOutcomeFill(initialSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
        damageRollFillWithGroups(damage, [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Contagion to resolve.");
    }

    let lockedState = cast.state;
    lockedState = advanceToContagionTargetTurn(lockedState);
    lockedState = resolveContagionTargetEndTurnSave(lockedState, false);
    lockedState = advanceToContagionTargetTurn(lockedState);
    lockedState = resolveContagionTargetEndTurnSave(lockedState, false);
    lockedState = advanceToContagionTargetTurn(lockedState);
    lockedState = resolveContagionTargetEndTurnSave(lockedState, false);

    expect(contagionEffect(lockedState)).toEqual(
      expect.objectContaining({
        successes: 0,
        failures: 3,
        lockedIn: true,
      }),
    );
    expect(
      hasCondition(
        requireCombatant(lockedState, spellTargetId).conditions,
        "poisoned",
      ),
    ).toBe(true);
    const nextTargetTurn = endTurn({
      state: advanceToContagionTargetTurn(lockedState),
      actorId: spellTargetId,
    });
    expect(nextTargetTurn).toMatchObject({ tag: "resolved" });
  });

  test("blindness_deafness is admitted with condition choice and end-turn save lifecycle", () => {
    const spell = spellRecord(blindnessDeafnessUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      state,
      spellId: blindnessDeafnessUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef("blindness_deafness", 2, "saveGatedCondition"),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const conditionHole = requireHole(act.initialHoles, "conditionChoice");
    expect(targetHole).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
      }),
    );
    expect(conditionHole).toEqual(
      expect.objectContaining({
        choices: ["blinded", "deafened"],
      }),
    );
    expect(spellHoleInvocation([targetHole])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "con",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        effect: {
          kind: "choice",
          choices: ["blinded", "deafened"],
          expiresAt: { kind: "duration", durationTicks: 10 },
          escape: null,
          turnStartDamage: null,
          repeatSave: {
            ability: "con",
            dc: { kind: "caster_spell_save_dc" },
          },
        },
        rangeFeet: 120,
      }),
    );

    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      blindnessDeafnessUnitId,
      [spellTargetId],
    );
    const conditionFill = spellConditionChoiceFill(conditionHole, "deafened");
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleHoleSchema)(conditionHole),
      ),
    ).toBe(true);
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleFillSchema)(conditionFill),
      ),
    ).toBe(true);
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state,
        subject: act.subject,
        fills: [targetFill, conditionFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        targetFill,
        conditionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Blindness/Deafness to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ deafened: true }),
      activeEffects: [
        expect.objectContaining({
          kind: "spellConditionEndTurnSave",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("blindness_deafness"),
          ),
          sourceCombatantId: spellCasterId,
          condition: "deafened",
          save: { ability: "con", dc: { kind: "caster_spell_save_dc" } },
          expiresAt: { kind: "duration", durationTicks: 10 },
        }),
      ],
    });

    const targetTurn = endTurn({
      state: resolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn).toMatchObject({ tag: "resolved" });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const repeatSave = requireResultHole(
      endTurn({ state: targetTurn.state, actorId: spellTargetId }),
      "savingThrowOutcome",
    );
    expect(repeatSave).toEqual(
      expect.objectContaining({
        spellConditionEndTurnSave: expect.objectContaining({
          targetId: spellTargetId,
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String("blindness_deafness"),
          ),
          condition: "deafened",
        }),
        ability: "con",
      }),
    );
    expect(
      Either.isRight(Schema.decodeUnknownEither(BattleHoleSchema)(repeatSave)),
    ).toBe(true);
    const ended = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(repeatSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(ended).toMatchObject({ tag: "resolved" });
    if (ended.tag !== "resolved") {
      throw new Error("Expected successful repeat save to resolve.");
    }
    expect(ended.state.combatants.get(spellTargetId)).toMatchObject({
      conditions: expect.not.objectContaining({ deafened: true }),
      activeEffects: [],
    });
  });

  test("color_spray is admitted as a self-origin Cone save-gated slot condition spell", () => {
    const spell = spellRecord(colorSprayUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: colorSprayUnitId,
      slotLevel: 1,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "color_spray",
        1,
        "saveGatedCondition",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Color Spray self-origin Cone Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "con",
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        effect: {
          kind: "fixed",
          condition: "blinded",
          expiresAt: "endOfCasterNextTurn",
          escape: null,
          turnStartDamage: null,
          repeatSave: null,
        },
        rangeFeet: 0,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("entangle is admitted as a point-origin Cube save-gated slot condition spell", () => {
    const spell = spellRecord(entangleUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: entangleUnitId,
      slotLevel: 1,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef("entangle", 1, "saveGatedCondition"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Entangle point-origin Cube Saving Throw outcomes",
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedCondition",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "str",
        targeting: { kind: "pointOriginCubeExcludingCaster", sideFeet: 20 },
        effect: {
          kind: "fixed",
          condition: "restrained",
          expiresAt: "concentration",
          escape: {
            kind: "abilityCheck",
            ability: "str",
            skill: "athletics",
            allowedActor: "target",
            successEnds: "condition",
          },
          turnStartDamage: null,
          repeatSave: null,
        },
        rangeFeet: 90,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("sleep is admitted as point-origin Sphere target admission", () => {
    const spell = spellRecord(sleepUnitId);
    const act = spellAct({
      state: spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 1, count: 1 }],
      }),
      spellId: sleepUnitId,
      slotLevel: 1,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef("sleep", 1, "sleepTargetAdmission"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Sleep point-origin Sphere Saving Throw outcomes",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation([savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "sleepTargetAdmission",
        spell,
        resource: { tag: "spellSlot", slotLevel: 1 },
        ability: "wis",
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("sleep is not admitted through the generic save-gated condition projection", () => {
    const spell = spellRecord(sleepUnitId);
    const spellSlots = [
      {
        spellLevel: spellSlotLevel(1),
        count: resourceCount(1),
        expended: resourceCount(0),
      },
    ];

    expect(
      supportedPreparedSaveGateConditionProfile(spell, spellSlots),
    ).toEqual([]);
    expect(
      supportedPreparedSleepTargetAdmissionProfile(spell, spellSlots),
    ).toEqual([
      expect.objectContaining({
        procedure: "sleepTargetAdmission",
        spell,
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
      }),
    ]);
  });

  test("lesser_restoration is admitted as Bonus Action direct condition removal", () => {
    const spell = spellRecord(lesserRestorationUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const target = requireCombatant(baseState, spellTargetId);
    const paralyzedEffect = {
      kind: "spellConditionEndTurnSave" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(holdPersonUnitId),
      ),
      sourceCombatantId: spellCasterId,
      condition: "paralyzed" as const,
      conditionHadNonSpellSource: false,
      heightenedSpellTargetDisadvantage: null,
      save: {
        ability: "wis" as const,
        dc: { kind: "caster_spell_save_dc" as const },
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(10),
      },
    };
    const poisonedEffect = {
      kind: "spellConditionEndTurnSave" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_poison_spell"),
      ),
      sourceCombatantId: spellCasterId,
      condition: "poisoned" as const,
      conditionHadNonSpellSource: false,
      heightenedSpellTargetDisadvantage: null,
      save: {
        ability: "con" as const,
        dc: { kind: "caster_spell_save_dc" as const },
      },
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(10),
      },
    };
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      {
        ...target,
        activeEffects: [
          ...target.activeEffects,
          paralyzedEffect,
          poisonedEffect,
        ],
      },
      applyCondition(
        applyCondition(target.conditions, "paralyzed"),
        "poisoned",
      ),
    );
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants).set(
        spellTargetId,
        affectedTarget,
      ),
    };
    const act = bonusSpellAct({ state, spellId: lesserRestorationUnitId });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          lesserRestorationUnitId,
          2,
          "directConditionRemoval",
        ),
      ),
      mode: { tag: "cast" },
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const conditionHole = requireHole(act.initialHoles, "conditionChoice");
    expect(conditionHole.choices).toEqual([
      "blinded",
      "deafened",
      "paralyzed",
      "poisoned",
    ]);
    expect(spellHoleInvocation([conditionHole])).toEqual(
      expect.objectContaining({
        procedure: "directConditionRemoval",
        spell,
        actionCost: "bonusAction",
        resource: { tag: "spellSlot", slotLevel: 2 },
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 1 },
        conditionChoices: ["blinded", "deafened", "paralyzed", "poisoned"],
        rangeFeet: 5,
      }),
    );

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          lesserRestorationUnitId,
          spellCasterId,
          spellTargetId,
        ),
        spellConditionChoiceFill(conditionHole, "paralyzed"),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Lesser Restoration to resolve.");
    }
    const cleansed = requireCombatant(resolved.state, spellTargetId);
    expect(hasCondition(cleansed.conditions, "paralyzed")).toBe(false);
    expect(hasCondition(cleansed.conditions, "poisoned")).toBe(true);
    expect(cleansed.activeEffects).not.toContainEqual(paralyzedEffect);
    expect(cleansed.activeEffects).toContainEqual(poisonedEffect);
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.origin.kind).toBe("character");
    if (caster.origin.kind !== "character") {
      throw new Error("Expected Lesser Restoration caster to be a character.");
    }
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 2, count: 1, expended: 1 },
    ]);
    expect(resolved.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(resolved.snapshot.turn.bonusActionAvailable).toBe(false);
  });

  test("lesser_restoration clears source Concentration when removing the last concentration condition effect", () => {
    const spell = spellRecord(lesserRestorationUnitId);
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const caster = requireCombatant(baseState, spellCasterId);
    const target = requireCombatant(baseState, spellTargetId);
    const paralyzedEffect = {
      kind: "spellConditionEndTurnSave" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(holdPersonUnitId),
      ),
      sourceCombatantId: spellCasterId,
      condition: "paralyzed" as const,
      conditionHadNonSpellSource: false,
      heightenedSpellTargetDisadvantage: null,
      save: {
        ability: "wis" as const,
        dc: { kind: "caster_spell_save_dc" as const },
      },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: spellCasterId,
        durationTicks: holdPersonDurationTicks,
      },
    };
    const affectedTarget = battleCreatureStateWithKnockOutPreservedConditions(
      {
        ...target,
        activeEffects: [...target.activeEffects, paralyzedEffect],
      },
      applyCondition(target.conditions, "paralyzed"),
    );
    const state = {
      ...baseState,
      combatants: new Map(baseState.combatants)
        .set(spellCasterId, {
          ...caster,
          concentration: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(holdPersonUnitId),
            ),
            effectKind: "spellEffect" as const,
          },
        })
        .set(spellTargetId, affectedTarget),
    };
    const act = bonusSpellAct({ state, spellId: lesserRestorationUnitId });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const conditionHole = requireHole(act.initialHoles, "conditionChoice");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          lesserRestorationUnitId,
          spellCasterId,
          spellTargetId,
        ),
        spellConditionChoiceFill(conditionHole, "paralyzed"),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Lesser Restoration to resolve.");
    }

    const cleansed = requireCombatant(resolved.state, spellTargetId);
    expect(hasCondition(cleansed.conditions, "paralyzed")).toBe(false);
    expect(cleansed.activeEffects).not.toContainEqual(paralyzedEffect);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
  });
});

function castHeightenedHoldPerson(input: {
  readonly slotLevel: 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  readonly targetIds: readonly [typeof spellTargetId, ...CombatantId[]];
  readonly heightenedTargetId: CombatantId;
  readonly failedTargetIds: readonly CombatantId[];
}): BattleState {
  const spell = spellRecord(holdPersonUnitId);
  const state = spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: input.slotLevel, count: 1 }],
    extraTargetIds: input.targetIds.filter(
      (targetId) => targetId !== spellTargetId,
    ),
    casterClassLevels: [{ className: "sorcerer", level: 5 }],
    casterResources: [
      {
        unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
        pointsRemaining: resourceCount(4),
      },
    ],
    casterMetamagic: {
      sorceryPointResourceUnitId: "sorcerer_font_of_magic",
      spellUseLimit: "one_per_spell_unless_option_allows_stacking",
      knownOptions: [
        {
          effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
          stackingMode: "one_per_spell",
          sorceryPointCost: resourceCount(2),
        },
      ],
    },
  });
  const act = heightenedSaveGatedConditionAct(state, holdPersonUnitId);
  const targetHole = requireHole(act.initialHoles, "spellTargetList");
  const heightenedHole = requireHole(act.initialHoles, "targetChoice");
  const targetFill = spellTargetListFill(
    targetHole,
    spellCasterId,
    holdPersonUnitId,
    input.targetIds,
  );
  const heightenedFill = {
    kind: "targetChoice" as const,
    holeId: heightenedHole.holeId,
    value: input.heightenedTargetId,
  };
  const awaitingSave = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [targetFill, heightenedFill],
  });
  const savingThrow = requireResultHole(awaitingSave, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      targetFill,
      heightenedFill,
      savingThrowOutcomeFill(
        savingThrow,
        input.targetIds.map((targetId) => ({
          targetId,
          succeeded: !input.failedTargetIds.includes(targetId),
        })),
      ),
    ],
  });
  expect(resolved).toMatchObject({ tag: "resolved" });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Heightened Hold Person to resolve.");
  }
  return resolved.state;
}

function heightenedSaveGatedConditionAct(
  state: BattleState,
  spellId: string,
): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId === spellId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "saveGatedCondition" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened save-gated condition act.");
  }
  return act;
}

function advanceToContagionTargetTurn(state: BattleState): BattleState {
  const targetTurn = endTurn({ state, actorId: spellCasterId });
  expect(targetTurn).toMatchObject({ tag: "resolved" });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster End Turn before Contagion target turn.");
  }
  return targetTurn.state;
}

function resolveContagionTargetEndTurnSave(
  state: BattleState,
  succeeded: boolean,
): BattleState {
  const activeEffect = contagionEffect(state);
  const needsSave = endTurn({ state, actorId: spellTargetId });
  const repeatSave = requireResultHole(needsSave, "savingThrowOutcome");
  expect(repeatSave).toEqual(
    expect.objectContaining({
      spellConditionCountedEndTurnSave: expect.objectContaining({
        targetId: spellTargetId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(contagionUnitId),
        ),
        sourceCombatantId: spellCasterId,
        condition: "poisoned",
      }),
      ability: "con",
    }),
  );
  if (
    activeEffect?.kind === "spellConditionCountedEndTurnSave" &&
    activeEffect.savingThrowDisadvantageAbility === "con"
  ) {
    expect(repeatSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });
  } else {
    expect(repeatSave.targetRollModes).not.toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });
  }
  const ended = endTurn({
    state,
    actorId: spellTargetId,
    fills: [
      savingThrowOutcomeFill(repeatSave, [
        { targetId: spellTargetId, succeeded },
      ]),
    ],
  });
  if (ended.tag !== "resolved") {
    throw new Error(
      `Expected Contagion target End Turn to resolve: ${JSON.stringify(ended)}`,
    );
  }
  return ended.state;
}

function contagionEffect(state: BattleState) {
  return requireCombatant(state, spellTargetId).activeEffects.find(
    (effect) =>
      effect.kind === "spellConditionCountedEndTurnSave" &&
      effect.sourceProcedureRef === contagionUnitId &&
      effect.sourceCombatantId === spellCasterId &&
      effect.condition === "poisoned",
  );
}
