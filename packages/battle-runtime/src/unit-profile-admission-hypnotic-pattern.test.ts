import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3SPELL-08-HYPNOTIC-PATTERN-CONTROL-RUNTIME hypnotic_pattern
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-hypnotic-pattern-control
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { describe, expect, test } from "vitest";
import { decodeUnitRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import hypnoticPatternInput from "../../surface/content/hypnotic_pattern.json";
import { effectiveWalkSpeed } from "./battle-reducer/movement-speed.ts";
import {
  calmEmotionsUnitId,
  protectionFromEvilAndGoodUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import { tickDurationEffects } from "./battle-reducer/turn-end-movement.ts";
import {
  applyBattleHitPointDamage,
  applyCondition,
  breakBattleConcentration,
  damageAmount,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  hasCondition,
  hypnoticPatternDurationTicks,
  hypnoticPatternUnitId,
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
  BattleSpellSavingThrowOutcomeHole,
} from "./unit-profile-admission.test-support.ts";
import { battleCreatureStateWithKnockOutPreservedConditions } from "./battle-reducer/creature-state.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  battleProcedureExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

describe("QMBT14 deterministic Hypnotic Pattern control admission", () => {
  test("Hypnotic Pattern admits level-3+ area save casting and applies Charmed, Incapacitated, and Speed 0", () => {
    const spell = hypnoticPatternSpellRecord();
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
        spellId: hypnoticPatternUnitId,
        slotLevel: 2,
      }),
    ).toBeUndefined();
    const act = spellAct({
      session: state,
      spellId: hypnoticPatternUnitId,
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
        spellSlotInvocationRef(hypnoticPatternUnitId, 3, "hypnoticPattern"),
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
        hypnoticPatternSavingThrowOutcomeFill(savingThrow, [
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
        kind: "hypnoticPatternControl",
        sourceProcedureRef: act.subject.procedureRef,
        sourceCombatantId: spellCasterId,
        conditionHadNonSpellCharmedSource: false,
        conditionHadNonSpellIncapacitatedSource: false,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: hypnoticPatternDurationTicks,
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
      preparedSpells: [hypnoticPatternSpellRecord()],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: hypnoticPatternUnitId,
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

  test("failed saves blocked by Charmed prevention spend the slot without control or concentration", () => {
    const spell = hypnoticPatternSpellRecord();
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
          ...baseTarget,
          activeEffects: [
            ...baseTarget.activeEffects,
            {
              kind: "creatureTypeProtection",
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String(protectionFromEvilAndGoodUnitId),
              ),
              sourceCombatantId: spellCasterId,
              attackRollMode: "disadvantage",
              protectedAgainstCreatureTypes: ["humanoid"],
              preventedConditions: ["charmed"],
              preventsPossession: true,
              expiresAt: {
                kind: "concentration",
                combatantId: spellCasterId,
              },
            },
          ],
        }),
      },
    });

    const cast = castFailedHypnoticPattern(state);
    const caster = requireCombatant(cast.state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected spell caster test fixture to be a character.");
    }
    const target = requireCombatant(cast.state, spellTargetId);

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
        (effect) => effect.kind === "hypnoticPatternControl",
      ),
    ).toBe(false);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "creatureTypeProtection",
      ),
    ).toBe(true);
  });

  test("failed saves blocked by Charmed condition immunity spend the slot without control or concentration", () => {
    const spell = hypnoticPatternSpellRecord();
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
          ...baseTarget,
          activeEffects: [
            ...baseTarget.activeEffects,
            {
              kind: "conditionImmunity",
              sourceProcedureRef: battleProcedureExecutionRefForTest(
                String(calmEmotionsUnitId),
              ),
              sourceCombatantId: spellCasterId,
              condition: "charmed",
              conditionHadNonSpellSource: false,
              expiresAt: {
                kind: "concentration",
                combatantId: spellCasterId,
              },
            },
          ],
        }),
      },
    });

    const cast = castFailedHypnoticPattern(state);
    const caster = requireCombatant(cast.state, spellCasterId);
    if (caster.origin.kind !== "character") {
      throw new Error("Expected spell caster test fixture to be a character.");
    }
    const target = requireCombatant(cast.state, spellTargetId);

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
        (effect) => effect.kind === "hypnoticPatternControl",
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
    const spell = hypnoticPatternSpellRecord();
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
        (effect) => effect.kind === "hypnoticPatternControl",
      ),
    ).toBe(true);

    const damaged = applyBattleHitPointDamage({
      state: cast.state,
      target: controlled,
      damageAmount: damageAmount(1),
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      hideousLaughterDamageRepeatSaves: [],
    });
    const target = requireCombatant(damaged, spellTargetId);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "hypnoticPatternControl",
      ),
    ).toBe(false);
    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
    expect(requireCombatant(damaged, spellCasterId).concentration).toBeNull();
  });

  test("breaking Concentration ends Hypnotic Pattern control", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [hypnoticPatternSpellRecord()],
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
        (effect) => effect.kind === "hypnoticPatternControl",
      ),
    ).toBe(false);
    expect(
      requireCombatant(concentrationBroken, spellCasterId).concentration,
    ).toBeNull();
  });

  test("duration expiry ends Hypnotic Pattern control", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [hypnoticPatternSpellRecord()],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      }),
    );
    const controlled = requireCombatant(cast.state, spellTargetId);
    const nearlyExpiredCombatants = new Map(cast.state.combatants).set(
      spellTargetId,
      {
        ...controlled,
        activeEffects: controlled.activeEffects.map((effect) =>
          effect.kind === "hypnoticPatternControl" &&
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
    const spell = hypnoticPatternSpellRecord();
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
    expect(controlled.activeEffects).toEqual([
      expect.objectContaining({
        kind: "hypnoticPatternControl",
        conditionHadNonSpellCharmedSource: true,
        conditionHadNonSpellIncapacitatedSource: true,
      }),
    ]);

    const damaged = applyBattleHitPointDamage({
      state: recast.state,
      target: controlled,
      damageAmount: damageAmount(1),
      deathFailuresAtZeroHp: 1,
      damageSourceId: spellCasterId,
      hideousLaughterDamageRepeatSaves: [],
    });
    const target = requireCombatant(damaged, spellTargetId);
    expect(
      target.activeEffects.some(
        (effect) => effect.kind === "hypnoticPatternControl",
      ),
    ).toBe(false);
    expect(hasCondition(target.conditions, "charmed")).toBe(true);
    expect(hasCondition(target.conditions, "incapacitated")).toBe(true);
  });

  test("another creature can spend an action to shake an adjacent target awake", () => {
    const cast = castFailedHypnoticPattern(
      spellBattle({
        preparedSpells: [hypnoticPatternSpellRecord()],
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
        candidate.subject.action === "shakeAwakeFromHypnoticPattern",
    );
    expect(act).toBeDefined();
    if (act === undefined) {
      throw new Error("Expected Hypnotic Pattern shake-awake act.");
    }
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    expect(targetHole.choices).toEqual([spellTargetId]);

    const shaken = resolveBattleSubject({
      state: targetTurnEnded.state,
      subject: act.subject,
      fills: [hypnoticPatternShakeAwakeTargetFill(targetHole)],
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
});

function castFailedHypnoticPattern(
  session: BattleRuntimeSession,
): BattleRuntimeSession {
  const act = spellAct({
    session,
    spellId: hypnoticPatternUnitId,
    slotLevel: 3,
  });
  const savingThrow = requireSpellSavingThrowOutcomeHole(act.initialHoles);
  const cast = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      hypnoticPatternSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: false },
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

function hypnoticPatternSavingThrowOutcomeFill(
  hole: BattleSpellSavingThrowOutcomeHole,
  outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "hypnoticPatternArea",
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

function hypnoticPatternSpellRecord(): SpellRecord {
  const unit = decodeUnitRecordSync(hypnoticPatternInput);
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

function hypnoticPatternShakeAwakeTargetFill(
  hole: Extract<BattleHole, { readonly kind: "targetChoice" }>,
): Extract<BattleFill, { readonly kind: "targetChoice" }> {
  return {
    kind: "targetChoice",
    holeId: hole.holeId,
    value: spellTargetId,
    spatialFacts: [
      {
        kind: "hypnoticPatternShakeAwakeActorWithin5Feet",
        actorId: spellCasterId,
        targetId: spellTargetId,
      },
    ],
  };
}
