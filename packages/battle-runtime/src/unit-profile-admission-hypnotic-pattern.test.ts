import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME hypnotic_pattern
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-hypnotic-pattern-control
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import { resourceCount } from "@dnd/shared/types";
import type { SpellRecord } from "@dnd/surface/surface/types";
import saveGatedAreaControlInput from "../../surface/content/hypnotic_pattern.json";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import {
  calmEmotionsUnitId,
  protectionFromEvilAndGoodUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import {
  applyBattleHitPointDamage,
  applyCondition,
  breakBattleConcentration,
  combatantId,
  damageAmount,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  saveGatedAreaControlDurationTicks,
  saveGatedAreaControlUnitId,
  maybeSpellAct,
  requireCombatant,
  requireHole,
  resolveBattleSubject,
  savingThrowOutcomeFill,
  spellAct,
  spellCasterId,
  spellSlotInvocationRef,
  spellTargetId,
} from "./unit-profile-admission.test-support.ts";
import type {
  BattleFill,
  BattleHole,
  BattleRuntimeSession,
  BattleState,
  BattleSpellSavingThrowOutcomeHole,
  CombatantId,
} from "./unit-profile-admission.test-support.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-state.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleStateWithAllocatedEffectForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  requireCharacterSpellProcedureRefForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

describe("QMBT14 deterministic Hypnotic Pattern control admission", () => {
  test("Hypnotic Pattern admits level-3+ area save casting and applies Charmed, Incapacitated, and Speed 0", () => {
    const spell = saveGatedAreaControlSpellRecord();
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });

    expect(
      maybeSpellAct({
        session: state,
        spellId: saveGatedAreaControlUnitId,
        slotLevel: 2,
      }),
    ).toBeUndefined();
    const act = spellAct({
      session: state,
      spellId: saveGatedAreaControlUnitId,
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
        spellSlotInvocationRef(
          saveGatedAreaControlUnitId,
          3,
          "saveGatedAreaControl",
        ),
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Cube Saving Throw outcomes",
        ability: "wis",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(savingThrow).toMatchObject({ outcomeTargeting: "area" });
    expect("spell" in savingThrow).toBe(false);

    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        saveGatedAreaControlSavingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error(
        `Expected Hypnotic Pattern cast to resolve: ${JSON.stringify(cast)}`,
      );
    }
    const target = requireCombatant(cast.state, spellTargetId);
    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(cast.state, target))).toBe(0);
    expect(target.activeEffects).toEqual([
      expect.objectContaining({
        kind: "saveGatedAreaControl",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        conditionHadNonSpellCharmedSource: false,
        conditionHadNonSpellIncapacitatedSource: false,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: saveGatedAreaControlDurationTicks,
        },
      }),
    ]);
    expect(requireCombatant(cast.state, spellCasterId).concentration).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
  });

  test("Hypnotic Pattern rejects generic area save fills without Cube and sight witnesses", () => {
    const state = spellBattle({
      preparedSpells: [saveGatedAreaControlSpellRecord()],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: saveGatedAreaControlUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);

    const cast = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(cast).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("RAW-valid creature-type protection does not cover a Humanoid Hypnotic Pattern caster", () => {
    const spell = saveGatedAreaControlSpellRecord();
    const protectedTargetId = combatantId(
      "synthetic-hypnotic-protected-target",
    );
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetPreparedSpells: [spellRecord(protectionFromEvilAndGoodUnitId)],
      extraTargetIds: [protectedTargetId],
    });
    const protectionProcedureRef = requireCharacterSpellProcedureRefForTest(
      baseState,
      spellTargetId,
      spellSlotInvocationRef(
        protectionFromEvilAndGoodUnitId,
        1,
        "creatureTypeProtection",
      ),
    );
    const protectionSource = requireCombatant(baseState.state, spellTargetId);
    if (
      protectionSource.origin.kind !== "character" ||
      protectionSource.origin.spellcasting == null
    ) {
      throw new Error("Expected an admitted Protection spell source.");
    }
    const protectionSpellcasting = protectionSource.origin.spellcasting;
    const concentratingState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants).set(spellTargetId, {
        ...protectionSource,
        origin: {
          ...protectionSource.origin,
          spellcasting: {
            ...protectionSpellcasting,
            spellSlots: protectionSpellcasting.spellSlots.map((slot) => ({
              ...slot,
              expended: resourceCount(1),
            })),
          },
        },
        concentration: {
          sourceProcedureRef: protectionProcedureRef,
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const state: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...baseState,
      state: battleStateWithAllocatedEffectForTest({
        state: concentratingState,
        ownerId: protectedTargetId,
        effect: {
          kind: "creatureTypeProtection",
          sourceProcedureRef: protectionProcedureRef,
          sourceCombatantId: spellTargetId,
          attackRollMode: "disadvantage",
          protectedAgainstCreatureTypes: [
            "aberration",
            "celestial",
            "elemental",
            "fey",
            "fiend",
            "undead",
          ],
          preventedConditions: ["charmed", "frightened"],
          preventsPossession: true,
          expiresAt: {
            kind: "concentration",
            combatantId: spellTargetId,
          },
        },
      }),
    });

    const cast = castFailedHypnoticPattern(state, protectedTargetId);
    const caster = requireCombatant(cast.state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected spell caster test fixture to be a character.");
    }
    const target = requireCombatant(cast.state, protectedTargetId);

    expect(cast.state.currentTurnResources.actionResources).toEqual([]);
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);
    expect(caster.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(Number(effectiveWalkSpeed(cast.state, target))).toBe(0);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(true);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "creatureTypeProtection",
      ),
    ).toBe(true);
  });

  test("failed saves blocked by Charmed condition immunity spend the slot without control or concentration", () => {
    const spell = saveGatedAreaControlSpellRecord();
    const immuneTargetId = combatantId("synthetic-hypnotic-immune-target");
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetSpellcasting: wizardSpellcasting({
        preparedSpells: [spellRecord(calmEmotionsUnitId)],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      extraTargetIds: [immuneTargetId],
    });
    const immunityProcedureRef = requireCharacterSpellProcedureRefForTest(
      baseState,
      spellTargetId,
      spellSlotInvocationRef(
        calmEmotionsUnitId,
        2,
        "saveGatedConditionImmunity",
      ),
    );
    const immunitySource = requireCombatant(baseState.state, spellTargetId);
    if (
      immunitySource.origin.kind !== "character" ||
      immunitySource.origin.spellcasting == null
    ) {
      throw new Error("Expected an admitted immunity spell source.");
    }
    const immunitySpellcasting = immunitySource.origin.spellcasting;
    const concentratingState = {
      ...baseState.state,
      combatants: new Map(baseState.state.combatants).set(spellTargetId, {
        ...immunitySource,
        origin: {
          ...immunitySource.origin,
          spellcasting: {
            ...immunitySpellcasting,
            spellSlots: immunitySpellcasting.spellSlots.map((slot) => ({
              ...slot,
              expended: resourceCount(1),
            })),
          },
        },
        concentration: {
          sourceProcedureRef: immunityProcedureRef,
          effectKind: "spellEffect" as const,
        },
      }),
    };
    const state: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...baseState,
      state: battleStateWithAllocatedEffectForTest({
        state: concentratingState,
        ownerId: immuneTargetId,
        effect: {
          kind: "conditionImmunity",
          sourceProcedureRef: immunityProcedureRef,
          sourceCombatantId: spellTargetId,
          condition: "charmed",
          conditionHadNonSpellSource: false,
          expiresAt: {
            kind: "concentration",
            combatantId: spellTargetId,
          },
        },
      }),
    });

    const cast = castFailedHypnoticPattern(state, immuneTargetId);
    const caster = requireCombatant(cast.state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected spell caster test fixture to be a character.");
    }
    const target = requireCombatant(cast.state, immuneTargetId);

    expect(cast.state.currentTurnResources.actionResources).toEqual([]);
    expect(caster.origin.spellcasting?.spellSlots).toEqual([
      { spellLevel: 3, count: 1, expended: 1 },
    ]);
    expect(caster.concentration).toBeNull();
    expect(hasCondition(target.conditions, "charmed")).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(Number(effectiveWalkSpeed(cast.state, target))).toBeGreaterThan(0);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(false);
    expect(
      target.activeEffects.some(
        (effect) =>
          effect.kind === "conditionImmunity" && effect.condition === "charmed",
      ),
    ).toBe(true);
  });

  test("damage ends only the Hypnotic Pattern spell control and preserves independent conditions", () => {
    const spell = saveGatedAreaControlSpellRecord();
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const baseTarget = requireCombatant(baseState.state, spellTargetId);
    const state: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...baseState,
      state: {
        ...baseState.state,
        combatants: new Map(baseState.state.combatants).set(spellTargetId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            baseTarget,
            applyCondition(
              applyCondition(baseTarget.conditions, "charmed"),
              "incapacitated",
            ),
          ),
        }),
      },
    });
    const cast = castFailedHypnoticPattern(state);
    const controlled = requireCombatant(cast.state, spellTargetId);
    expect(
      controlled.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(true);

    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: controlled,
      damageAmount: damageAmount(1),
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    });
    const target = requireCombatant(damaged, spellTargetId);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(false);
    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(requireCombatant(damaged, spellCasterId).concentration).toBeNull();
  });

  test("breaking Concentration ends Hypnotic Pattern control", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [saveGatedAreaControlSpellRecord()],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );

    const concentrationBroken = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    const target = requireCombatant(concentrationBroken, spellTargetId);
    expect(hasCondition(target.conditions, "charmed")).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(
      Number(effectiveWalkSpeed(concentrationBroken, target)),
    ).toBeGreaterThan(0);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(false);
    expect(
      requireCombatant(concentrationBroken, spellCasterId).concentration,
    ).toBeNull();
  });

  test("duration expiry ends Hypnotic Pattern control", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [saveGatedAreaControlSpellRecord()],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const controlled = requireCombatant(cast.state, spellTargetId);
    const nearlyExpiredCombatants = new Map(cast.state.combatants).set(
      spellTargetId,
      {
        ...controlled,
        activeEffects: controlled.activeEffects.map((effect) =>
          effect.kind === "saveGatedAreaControl" &&
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
    const target = expiredCombatants.get(spellTargetId);
    expect(target).toMatchObject({
      activeEffects: [],
    });
    if (target === undefined) {
      throw new Error("Expected Hypnotic Pattern target after duration tick.");
    }
    expect(hasCondition(target.conditions, "charmed")).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(
      Number(
        effectiveWalkSpeed(
          { ...cast.state, combatants: expiredCombatants },
          target,
        ),
      ),
    ).toBeGreaterThan(0);
    expect(expiredCombatants.get(spellCasterId)?.concentration).toBeNull();
  });

  test("recasting preserves independent conditions after replacement cleanup", () => {
    const spell = saveGatedAreaControlSpellRecord();
    const baseState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 2 }],
    });
    const baseTarget = requireCombatant(baseState.state, spellTargetId);
    const state: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...baseState,
      state: {
        ...baseState.state,
        combatants: new Map(baseState.state.combatants).set(spellTargetId, {
          ...battleCreatureStateWithKnockOutPreservedConditions(
            baseTarget,
            applyCondition(
              applyCondition(baseTarget.conditions, "charmed"),
              "incapacitated",
            ),
          ),
        }),
      },
    });
    const firstCast = castFailedHypnoticPattern(state);
    const firstControlled = requireCombatant(firstCast.state, spellTargetId);
    const firstControl = firstControlled.activeEffects.find(
      (effect) => effect.kind === "saveGatedAreaControl",
    );
    if (firstControl === undefined) {
      throw new Error("Expected the first Hypnotic Pattern occurrence.");
    }
    const casterTurnEnded = endTurn({
      state: firstCast.state,
      actorId: spellCasterId,
    });
    if (casterTurnEnded.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurnEnded = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
    });
    if (targetTurnEnded.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const recast = castFailedHypnoticPattern(
      battleRuntimeSessionForTest({
        ...firstCast,
        state: targetTurnEnded.state,
      }),
    );
    const controlled = requireCombatant(recast.state, spellTargetId);
    const recastControls = controlled.activeEffects.filter(
      (effect) => effect.kind === "saveGatedAreaControl",
    );
    expect(recastControls).toHaveLength(1);
    expect(controlled.activeEffects).toEqual([
      expect.objectContaining({
        kind: "saveGatedAreaControl",
        effectRef: expect.any(String),
        conditionHadNonSpellCharmedSource: true,
        conditionHadNonSpellIncapacitatedSource: true,
      }),
    ]);
    const replacementControl = recastControls[0];
    expect(replacementControl?.effectRef).not.toBe(firstControl.effectRef);
    expect(
      controlled.activeEffects.some(
        (effect) => effect.effectRef === firstControl.effectRef,
      ),
    ).toBe(false);
    expect(Number(controlled.nextEffectOrdinal)).toBe(
      Number(firstControlled.nextEffectOrdinal) + 1,
    );

    const damaged = applyBattleHitPointDamage({
      state: recast.state,
      target: controlled,
      damageAmount: damageAmount(1),
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      saveGatedConditionWithRepeatDamageRepeatSaves: [],
    });
    const target = requireCombatant(damaged, spellTargetId);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "saveGatedAreaControl",
      ),
    ).toBe(false);
    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
  });

  test("another creature can spend an action to shake an adjacent target awake", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [saveGatedAreaControlSpellRecord()],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const casterTurnEnded = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (casterTurnEnded.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurnEnded = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
    });
    if (targetTurnEnded.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const activeSession: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...cast,
      state: targetTurnEnded.state,
    });
    const act = discoverBattleActs(activeSession).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.actorId === spellCasterId &&
        candidate.subject.action === "shakeAwakeFromAreaControl",
    );
    expect(act).toBeDefined();
    if (act === undefined) {
      throw new Error("Expected Hypnotic Pattern shake-awake act.");
    }
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    expect(targetHole.choices).toEqual([spellTargetId]);
    const replayed = resolveBattleSubject({
      state: targetTurnEnded.state,
      subject: act.subject,
      fills: [],
    });
    if (replayed.tag !== "needsHoles") {
      throw new Error("Expected Hypnotic Pattern shake-awake target replay.");
    }
    expect(requireHole(replayed.holes, "targetChoice")).toEqual(targetHole);

    const shaken = resolveBattleSubject({
      state: targetTurnEnded.state,
      subject: act.subject,
      fills: [saveGatedAreaControlShakeAwakeTargetFill(targetHole)],
    });
    if (shaken.tag !== "resolved") {
      throw new Error("Expected Hypnotic Pattern shake-awake to resolve.");
    }
    const target = requireCombatant(shaken.state, spellTargetId);
    expect(hasCondition(target.conditions, "charmed")).toBe(false);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(false);
    expect(Number(effectiveWalkSpeed(shaken.state, target))).toBeGreaterThan(0);
    expect(target.activeEffects).toEqual([]);
    expect(
      requireCombatant(shaken.state, spellCasterId).concentration,
    ).toBeNull();
  });

  test("Hypnotic Pattern shake-awake rejects a discovered action after the helper spends it", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [saveGatedAreaControlSpellRecord()],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const casterTurnEnded = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (casterTurnEnded.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetTurnEnded = endTurn({
      state: casterTurnEnded.state,
      actorId: spellTargetId,
    });
    if (targetTurnEnded.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }

    const activeSession: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...cast,
      state: targetTurnEnded.state,
    });
    const act = discoverBattleActs(activeSession).find(
      (candidate) =>
        candidate.subject.tag === "action" &&
        candidate.subject.actorId === spellCasterId &&
        candidate.subject.action === "shakeAwakeFromAreaControl",
    );
    if (act === undefined) {
      throw new Error("Expected Hypnotic Pattern shake-awake act.");
    }
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const dashed = resolveBattleSubject({
      state: targetTurnEnded.state,
      subject: {
        tag: "action",
        actorId: spellCasterId,
        action: "dash",
        speedKind: "walk",
      },
      fills: [],
    });
    if (dashed.tag !== "resolved") {
      throw new Error("Expected the helper Dash to resolve.");
    }

    expect(
      resolveBattleSubject({
        state: dashed.state,
        subject: act.subject,
        fills: [saveGatedAreaControlShakeAwakeTargetFill(targetHole)],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Save-gated area-control condition shake-awake is no longer available.",
    });
  });

  test("Hypnotic Pattern cast preserves an unrelated control occurrence by exact ref", () => {
    const unrelatedCasterId = combatantId(
      "synthetic-unrelated-hypnotic-caster",
    );
    const base = spellBattle({
      preparedSpells: [saveGatedAreaControlSpellRecord()],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      extraTargetIds: [unrelatedCasterId],
      extraTargetSpellcasting: wizardSpellcasting({
        preparedSpells: [saveGatedAreaControlSpellRecord()],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    });
    const unrelatedSource = requireCharacterSpellProcedureRefForTest(
      base,
      unrelatedCasterId,
      spellSlotInvocationRef(
        saveGatedAreaControlUnitId,
        3,
        "saveGatedAreaControl",
      ),
    );
    const unrelatedCaster = requireCombatant(base.state, unrelatedCasterId);
    if (
      unrelatedCaster.origin.kind !== "character" ||
      unrelatedCaster.origin.spellcasting == null
    ) {
      throw new Error("Expected the unrelated Hypnotic Pattern caster.");
    }
    const unrelatedSpellcasting = unrelatedCaster.origin.spellcasting;
    const mechanicallyPossibleState: BattleState = {
      ...base.state,
      combatants: new Map(base.state.combatants).set(unrelatedCasterId, {
        ...unrelatedCaster,
        origin: {
          ...unrelatedCaster.origin,
          spellcasting: {
            ...unrelatedSpellcasting,
            spellSlots: unrelatedSpellcasting.spellSlots.map((slot) => ({
              ...slot,
              expended: resourceCount(1),
            })),
          },
        },
        concentration: {
          sourceProcedureRef: unrelatedSource,
          effectKind: "spellEffect",
        },
      }),
    };
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: mechanicallyPossibleState,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: {
            kind: "saveGatedAreaControl" as const,
            sourceProcedureRef: unrelatedSource,
            sourceCombatantId: unrelatedCasterId,
            conditionHadNonSpellCharmedSource: false,
            conditionHadNonSpellIncapacitatedSource: false,
            expiresAt: {
              kind: "concentration" as const,
              combatantId: unrelatedCasterId,
              durationTicks: elapsedTimeTicks(10),
            },
          },
        },
      ],
    });
    const unrelatedOccurrence = allocated.occurrences[0];
    if (
      unrelatedOccurrence?.kind !== "activeEffect" ||
      unrelatedOccurrence.effect.kind !== "saveGatedAreaControl"
    ) {
      throw new Error("Expected allocated unrelated Hypnotic Pattern control.");
    }
    const allocatedTarget = requireCombatant(allocated.state, spellTargetId);
    const state: BattleRuntimeSession = battleRuntimeSessionForTest({
      ...base,
      state: allocated.state,
    });
    const cast = castFailedHypnoticPattern(state);
    const castTarget = requireCombatant(cast.state, spellTargetId);
    const effects = castTarget.activeEffects;
    expect(effects).toHaveLength(2);
    expect(effects).toContainEqual(unrelatedOccurrence.effect);
    const freshControl = effects.find(
      (effect) =>
        effect.kind === "saveGatedAreaControl" &&
        effect.effectRef !== unrelatedOccurrence.effect.effectRef,
    );
    expect(freshControl).toEqual(
      expect.objectContaining({
        kind: "saveGatedAreaControl",
        sourceCombatantId: spellCasterId,
        expiresAt: expect.objectContaining({ kind: "concentration" }),
      }),
    );
    expect(freshControl?.effectRef).not.toBe(
      unrelatedOccurrence.effect.effectRef,
    );
    expect(Number(castTarget.nextEffectOrdinal)).toBe(
      Number(allocatedTarget.nextEffectOrdinal) + 1,
    );
  });
});

function castFailedHypnoticPattern(
  session: BattleRuntimeSession,
  targetId: CombatantId = spellTargetId,
): BattleRuntimeSession {
  const act = spellAct({
    session,
    spellId: saveGatedAreaControlUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      saveGatedAreaControlSavingThrowOutcomeFill(savingThrow, [
        { targetId, succeeded: false },
      ]),
    ],
  });
  if (cast.tag !== "resolved") {
    throw new Error(
      `Expected Hypnotic Pattern cast to resolve: ${JSON.stringify(cast)}`,
    );
  }
  return battleRuntimeSessionForTest({ ...session, state: cast.state });
}

function saveGatedAreaControlSavingThrowOutcomeFill(
  hole: BattleSpellSavingThrowOutcomeHole,
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
        kind: "saveGatedAreaControlArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        cubeSideFeet: 30,
        affectedCreatureWitnesses: outcomes.map((outcome) => ({
          targetId: outcome.targetId,
          inCube: true,
          canSeePattern: true,
        })),
      },
      outcomes,
    },
  };
}

function saveGatedAreaControlSpellRecord(): SpellRecord {
  const unit = decodeUnitRecordSync(saveGatedAreaControlInput);
  if (unit.kind !== "spell") {
    throw new Error("Expected Hypnotic Pattern fixture to decode as a Spell.");
  }
  return unit;
}

function requireSpellSavingThrowOutcomeHole(
  holes: readonly BattleHole[],
): BattleSpellSavingThrowOutcomeHole {
  const hole = requireHole(holes, "savingThrowOutcome");
  if (!("sourceProcedureRef" in hole)) {
    throw new Error("Expected a spell Saving Throw outcome projection.");
  }
  return hole;
}

function saveGatedAreaControlShakeAwakeTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: spellTargetId,
    spatialFacts: [
      {
        kind: "areaControlShakeAwakeActorWithin5Feet",
        actorId: spellCasterId,
        targetId: spellTargetId,
      },
    ],
  };
}
