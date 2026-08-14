import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection QMBT14 acid_splash magic_missile ray_of_frost
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV28B inflict_wounds poison_spray sacred_flame
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV89A chill_touch
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV28D guiding_bolt ray_of_sickness shocking_grasp vicious_mockery
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV29A burning_hands
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV54 fireball
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV55 shatter
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-MIND-SPIKE mind_spike
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L3-SPELL-LIGHTNING-BOLT-RUNTIME-SURVEY lightning_bolt
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ACID-ARROW-DELAYED-RUNTIME-SUPPORT acid_arrow
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L19E-01-L5-AREA-SAVE-DAMAGE cone_of_cold flame_strike
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-damage-save-or-attack spell.invocation-acid-arrow-attack-timing
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ACID_ARROW_ATTACK_TIMING
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import type { SpellRecord } from "@dnd/surface/surface/types";
import fc from "fast-check";
import { describe, expect, test } from "vitest";
import {
  acidArrowUnitId,
  acidSplashUnitId,
  burningHandsUnitId,
  chillTouchUnitId,
  coneOfColdUnitId,
  fireballUnitId,
  flameStrikeUnitId,
  guidingBoltUnitId,
  inflictWoundsUnitId,
  lightningBoltUnitId,
  magicMissileUnitId,
  mindSpikeDurationTicks,
  mindSpikeUnitId,
  poisonSprayUnitId,
  rayOfFrostUnitId,
  rayOfSicknessUnitId,
  sacredFlameUnitId,
  shockingGraspUnitId,
  shatterUnitId,
  spellCasterId,
  spellTargetId,
  viciousMockeryUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  statBlockWithCreatureType,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  savingThrowOutcomeFill,
  spellAct,
  spellActInvocation,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { characterSpellProcedure } from "./character-execution-admission.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleObjectId,
  cantripSpellInvocationRef,
  combatantId,
  endTurn,
  Hp,
  resolveBattleSubject,
  snapshotBattle,
  spellId,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import type {
  ActivationPhase,
  BattleFill,
  BattleHole,
  BattleObjectDamageDisposition,
  BattleObjectIgnitionDisposition,
  BattleRuntimeSession,
  BattleState,
  CombatantId,
  EffectAtom,
} from "./unit-profile-admission.test-support.ts";
import type { BattleActiveEffect } from "./battle-state-execution.ts";
import { tickDurationEffects } from "./battle-reducer/turn-boundary-lifecycle.ts";
import {
  repeatedDamageAllocationInvocationFacts,
  repeatedDamageAllocationInvocationResourceFacts,
} from "./battle-reducer/spell-procedure-profiles/repeated-damage-allocation-facts.ts";
import {
  battleProcedureExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";

const fireballObjectId = battleObjectId("unit-profile-fireball-object");

function spellExecutionForAct(
  session: BattleRuntimeSession,
  act: ReturnType<typeof spellAct>,
) {
  const actor = session.state.combatants.get(act.subject.actorId);
  if (actor?.origin.kind !== "character") {
    throw new Error("Expected character spell caster.");
  }
  const execution = characterSpellProcedure(
    actor.origin.execution,
    act.subject.procedureRef,
  );
  if (execution === undefined) {
    throw new Error("Expected admitted mechanical spell execution.");
  }
  return execution;
}

function resolveAcidArrowHit(
  session: BattleRuntimeSession,
  targetId: CombatantId,
): BattleState {
  const act = spellAct({
    session,
    spellId: acidArrowUnitId,
    slotLevel: 2,
  });
  const target = requireHole(act.initialHoles, "targetChoice");
  const targetSelection = spellTargetFill(
    target,
    acidArrowUnitId,
    act.subject.actorId,
    targetId,
  );
  const attack = requireResultHole(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetSelection],
    }),
    "attackRoll",
  );
  const attackSelection = attackRollFill(attack, {
    total: 18,
    naturalD20: 12,
  });
  const damage = requireResultHole(
    resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetSelection, attackSelection],
    }),
    "rolledDice",
  );
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      targetSelection,
      attackSelection,
      damageRollFillWithGroups(damage, [[1, 1, 1, 1]]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Acid Arrow hit to resolve.");
  }
  return resolved.state;
}

describe("QMBT14 deterministic damage Spell Unit admission", () => {
  test("magic_missile is admitted through catalog spell access and projected as a prepared slot spell", () => {
    const spell = spellRecord(magicMissileUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({
      session: state,
      spellId: magicMissileUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "magic_missile",
        1,
        "repeatedDamageAllocation",
      ),
      mode: { tag: "cast" },
    });
    const invocation = spellExecutionForAct(state, act);
    expect(invocation).toEqual(
      expect.objectContaining({
        procedure: "repeatedDamageAllocation",
        spellRuleFacts: expect.objectContaining({
          level: spell.mechanics.level,
        }),
        resource: { tag: "spellSlot", slotLevel: 1 },
        targeting: {
          kind: "repeatedEffectTargetAllocation",
          repeatedEffectCount: 3,
        },
        damage: {
          expr: { dice: 1, dieSize: 4, flat: 1 },
          damageType: "force",
        },
        rangeFeet: 120,
      }),
    );
    if (invocation.procedure !== "repeatedDamageAllocation") {
      throw new Error("Expected repeated-damage-allocation invocation.");
    }
    expect(
      repeatedDamageAllocationInvocationResourceFacts(
        repeatedDamageAllocationInvocationFacts({
          invocation,
          targetCount: 1,
          targetsAreValid: true,
        }),
      ),
    ).toMatchObject({
      invocationAction: "magicAction",
      hasSpellAccess: true,
      selectedSlotLevel: 1,
      slotSpend: { tag: "spellSlot", minimumSlotLevel: 1 },
      targetCount: 1,
      targetCardinality: {
        tag: "bounded",
        minimumTargetCount: 1,
        maximumTargetCount: 3,
      },
      targetsAreValid: true,
    });
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellTargetAllocation",
        allocationCount: 3,
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("ray_of_frost is admitted through catalog spell access and projected as a cantrip spell attack", () => {
    const spell = spellRecord(rayOfFrostUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: rayOfFrostUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "ray_of_frost",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    expect(spell.mechanics.family).toBe("activation");
    expect(spell.mechanics.level).toBe(0);
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("synthetic spell identity does not select the procedure, while mechanics facts change execution", () => {
    const syntheticRay = (input: {
      readonly id: string;
      readonly name: string;
      readonly provenanceSection: string;
      readonly damageType: "cold" | "fire";
    }): SpellRecord => {
      const source = spellRecord(rayOfFrostUnitId);
      if (source.mechanics.family !== "activation") {
        throw new Error("Expected an activation spell fixture.");
      }
      const phase = source.mechanics.phases[0];
      if (phase?.kind !== "attack_roll") {
        throw new Error("Expected an attack-roll spell fixture.");
      }
      const [firstHitEffect, ...remainingHitEffects] = phase.onHit;
      if (firstHitEffect?.kind !== "damage") {
        throw new Error("Expected the first hit effect to deal damage.");
      }
      return {
        ...source,
        id: parseSharedUnitId(input.id),
        name: input.name,
        provenance: {
          kind: "synthetic-test" as const,
          section: input.provenanceSection,
        },
        mechanics: {
          ...source.mechanics,
          phases: [
            {
              ...phase,
              onHit: [
                { ...firstHitEffect, damageType: input.damageType },
                ...remainingHitEffects,
              ],
            },
          ],
        },
      };
    };
    const admittedInvocation = (
      spell: ReturnType<typeof syntheticRay>,
    ): Extract<
      ReturnType<typeof spellActInvocation>,
      { readonly procedure: "spellAttackDamage" }
    > => {
      const state = spellBattle({ cantrips: [spell] });
      const act = spellAct({ session: state, spellId: spell.id });
      const targetHole = requireHole(act.initialHoles, "targetChoice");
      const attackRoll = requireResultHole(
        resolveBattleSubject({
          state: state.state,
          subject: act.subject,
          fills: [
            spellTargetFill(targetHole, spell.id, spellCasterId, spellTargetId),
          ],
        }),
        "attackRoll",
      );
      const invocation = spellHoleInvocation(state, [attackRoll]);
      if (invocation.procedure !== "spellAttackDamage") {
        throw new Error("Expected synthetic spell attack procedure.");
      }
      return invocation;
    };
    const identityArbitrary = fc.record({
      id: fc.constantFrom(
        "synthetic_frost_beam_a",
        "synthetic_frost_beam_b",
        "synthetic_frost_beam_c",
      ),
      name: fc.constantFrom(
        "Synthetic Frost Beam",
        "Synthetic Ice Ray",
        "Synthetic Winter Lance",
      ),
      provenanceSection: fc.constantFrom(
        "battle-runtime/synthetic-spell-procedure-a",
        "battle-runtime/synthetic-spell-procedure-b",
        "battle-runtime/synthetic-spell-procedure-c",
      ),
    });

    const coldA = syntheticRay({
      id: "synthetic_frost_beam_a",
      name: "Synthetic Frost Beam",
      provenanceSection: "battle-runtime/synthetic-spell-procedure-a",
      damageType: "cold",
    });
    const coldB = syntheticRay({
      id: "synthetic_frost_beam_b",
      name: "Synthetic Ice Ray",
      provenanceSection: "battle-runtime/synthetic-spell-procedure-b",
      damageType: "cold",
    });
    const coldInvocationA = admittedInvocation(coldA);
    const coldInvocationB = admittedInvocation(coldB);

    expect(coldInvocationA).toEqual(coldInvocationB);
    expect(coldInvocationA).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        damage: expect.objectContaining({ damageType: "cold" }),
      }),
    );

    const baselineFacts = coldInvocationA;
    fc.assert(
      fc.property(identityArbitrary, (identity) => {
        expect(
          admittedInvocation(syntheticRay({ ...identity, damageType: "cold" })),
        ).toEqual(baselineFacts);
      }),
      { numRuns: 20 },
    );

    const stableIdentity = {
      id: "synthetic_stable_frost_beam",
      name: "Synthetic Stable Frost Beam",
      provenanceSection: "battle-runtime/synthetic-stable-spell-procedure",
    } as const;
    const coldStableIdentity = syntheticRay({
      ...stableIdentity,
      damageType: "cold",
    });
    const fireStableIdentity = syntheticRay({
      ...stableIdentity,
      damageType: "fire",
    });
    const coldStableInvocation = admittedInvocation(coldStableIdentity);
    const fireStableInvocation = admittedInvocation(fireStableIdentity);

    expect(coldStableInvocation.procedure).toBe("spellAttackDamage");
    expect(fireStableInvocation.procedure).toBe("spellAttackDamage");
    expect(coldStableInvocation.damage).toEqual(
      expect.objectContaining({ damageType: "cold" }),
    );
    expect(fireStableInvocation.damage).toEqual(
      expect.objectContaining({ damageType: "fire" }),
    );

    const coldResistantTarget = (() => {
      const target = statBlockWithCreatureType("humanoid");
      return {
        ...target,
        statBlock: {
          ...target.statBlock,
          resistances: {
            kind: "fixed" as const,
            damageTypes: ["cold"] as const,
          },
        },
      };
    })();
    const resolveAgainstColdResistance = (spell: SpellRecord) => {
      const state = spellBattle({
        cantrips: [spell],
        targetStatBlock: coldResistantTarget,
      });
      const act = spellAct({ session: state, spellId: spell.id });
      const targetFill = spellTargetFill(
        requireHole(act.initialHoles, "targetChoice"),
        spell.id,
        spellCasterId,
        spellTargetId,
      );
      const attackRoll = requireResultHole(
        resolveBattleSubject({
          state: state.state,
          subject: act.subject,
          fills: [targetFill],
        }),
        "attackRoll",
      );
      const pendingDamage = resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
        ],
      });
      const damageRoll = requireResultHole(pendingDamage, "rolledDice");
      const resolved = resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 20, naturalD20: 15 }),
          damageRollFillWithGroups(damageRoll, [[2]]),
        ],
      });
      expect(resolved.tag).toBe("resolved");
      if (resolved.tag !== "resolved") {
        throw new Error("Expected synthetic spell attack to resolve.");
      }
      return requireCombatant(resolved.state, spellTargetId).hp;
    };
    const initialTargetHp = requireCombatant(
      spellBattle({
        cantrips: [coldStableIdentity],
        targetStatBlock: coldResistantTarget,
      }).state,
      spellTargetId,
    ).hp;

    expect(resolveAgainstColdResistance(coldStableIdentity)).toBe(
      Hp(Number(initialTargetHp) - 1),
    );
    expect(resolveAgainstColdResistance(fireStableIdentity)).toBe(
      Hp(Number(initialTargetHp) - 2),
    );
  });
  test("acid_splash is admitted through catalog spell access and projected as a save-gated cantrip", () => {
    const spell = spellRecord(acidSplashUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: acidSplashUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("acid_splash", "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    expect(spellExecutionForAct(state, act)).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        spellRuleFacts: expect.objectContaining({
          level: spell.mechanics.level,
        }),
        ability: "dex",
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: 5,
        },
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "acid",
        },
        successDamage: "none",
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
        targetRollModes: [],
      }),
    ]);
  });
  test("acid_arrow is admitted as ranged spell attack with hit-later and miss-half damage", () => {
    const spell = spellRecord(acidArrowUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: acidArrowUnitId,
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
        spellSlotInvocationRef("acid_arrow", 2, "spellAttackDamage"),
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            acidArrowUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(state, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 4, dieSize: 4 },
          damageType: "acid",
        },
        missDamage: "halfInitialOnly",
        laterDamage: {
          expr: { dice: 2, dieSize: 4 },
          damageType: "acid",
        },
        rangeFeet: 90,
        postDamageRiders: [],
      }),
    );
  });
  test("acid_arrow hit applies initial damage and target-end later damage; miss applies half initial only", () => {
    const spell = spellRecord(acidArrowUnitId);
    const hitState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 2 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const hitAct = spellAct({
      session: hitState,
      spellId: acidArrowUnitId,
      slotLevel: 2,
    });
    const hitTargetHole = requireHole(hitAct.initialHoles, "targetChoice");
    const hitAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: hitState.state,
        subject: hitAct.subject,
        fills: [
          spellTargetFill(
            hitTargetHole,
            acidArrowUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    const hitDamage = requireResultHole(
      resolveBattleSubject({
        state: hitState.state,
        subject: hitAct.subject,
        fills: [
          spellTargetFill(
            hitTargetHole,
            acidArrowUnitId,
            spellCasterId,
            spellTargetId,
          ),
          attackRollFill(hitAttackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    const hitResolved = resolveBattleSubject({
      state: hitState.state,
      subject: hitAct.subject,
      fills: [
        spellTargetFill(
          hitTargetHole,
          acidArrowUnitId,
          spellCasterId,
          spellTargetId,
        ),
        attackRollFill(hitAttackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(hitDamage, [[4, 4, 4, 4]]),
      ],
    });
    expect(hitResolved.tag).toBe("resolved");
    if (hitResolved.tag !== "resolved") return;
    expect(requireCombatant(hitResolved.state, spellTargetId).hp).toBe(Hp(14));
    expect(
      requireCombatant(hitResolved.state, spellTargetId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellTurnEndDamage",
        sourceProcedureRef: hitAct.subject.procedureRef,
        damage: { expr: { dice: 2, dieSize: 4 }, damageType: "acid" },
      }),
    );

    const targetTurn = endTurn({
      state: hitResolved.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") return;
    const laterRequest = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    const laterDamage = requireResultHole(laterRequest, "rolledDice");
    expect(laterDamage).toMatchObject({
      spellTurnEndDamage: {
        targetId: spellTargetId,
        sourceProcedureRef: hitAct.subject.procedureRef,
        damage: { expr: { dice: 2, dieSize: 4 }, damageType: "acid" },
      },
    });
    const laterResolved = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
      fills: [damageRollFillWithGroups(laterDamage, [[2, 2]])],
    });
    expect(laterResolved.tag).toBe("resolved");
    if (laterResolved.tag !== "resolved") return;
    expect(requireCombatant(laterResolved.state, spellTargetId).hp).toBe(
      Hp(10),
    );
    expect(
      requireCombatant(laterResolved.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellTurnEndDamage",
      ),
    ).toBe(false);

    const missState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const missAct = spellAct({
      session: missState,
      spellId: acidArrowUnitId,
      slotLevel: 2,
    });
    const missTargetHole = requireHole(missAct.initialHoles, "targetChoice");
    const missAttackRoll = requireResultHole(
      resolveBattleSubject({
        state: missState.state,
        subject: missAct.subject,
        fills: [
          spellTargetFill(
            missTargetHole,
            acidArrowUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    const missDamage = requireResultHole(
      resolveBattleSubject({
        state: missState.state,
        subject: missAct.subject,
        fills: [
          spellTargetFill(
            missTargetHole,
            acidArrowUnitId,
            spellCasterId,
            spellTargetId,
          ),
          attackRollFill(missAttackRoll, { total: 1, naturalD20: 1 }),
        ],
      }),
      "rolledDice",
    );
    const missResolved = resolveBattleSubject({
      state: missState.state,
      subject: missAct.subject,
      fills: [
        spellTargetFill(
          missTargetHole,
          acidArrowUnitId,
          spellCasterId,
          spellTargetId,
        ),
        attackRollFill(missAttackRoll, { total: 1, naturalD20: 1 }),
        damageRollFillWithGroups(missDamage, [[4, 4, 4, 4]]),
      ],
    });
    expect(missResolved.tag).toBe("resolved");
    if (missResolved.tag !== "resolved") return;
    expect(requireCombatant(missResolved.state, spellTargetId).hp).toBe(Hp(22));
    expect(
      requireCombatant(missResolved.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "spellTurnEndDamage",
      ),
    ).toBe(false);
  });

  test("concurrent Acid Arrow effects expose the next unfilled delayed-damage roll", () => {
    const spell = spellRecord(acidArrowUnitId);
    const sharedTargetId = combatantId("unit-profile-acid-arrow-shared-target");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetSpellcasting: wizardSpellcasting({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
      }),
      extraTargetIds: [sharedTargetId],
      extraTargetHp: 40,
      extraTargetMaxHp: 40,
    });
    const firstCast = resolveAcidArrowHit(session, sharedTargetId);
    const secondCasterTurn = endTurn({
      state: firstCast,
      actorId: spellCasterId,
    });
    if (secondCasterTurn.tag !== "resolved") {
      throw new Error("Expected first Acid Arrow caster End Turn to resolve.");
    }
    const secondCast = resolveAcidArrowHit(
      battleRuntimeSessionForTest({
        state: secondCasterTurn.state,
        context: session.context,
      }),
      sharedTargetId,
    );
    const sharedTargetTurn = endTurn({
      state: secondCast,
      actorId: spellTargetId,
    });
    if (sharedTargetTurn.tag !== "resolved") {
      throw new Error("Expected second Acid Arrow caster End Turn to resolve.");
    }
    const request = endTurn({
      state: sharedTargetTurn.state,
      actorId: sharedTargetId,
    });
    if (request.tag !== "needsHoles") {
      throw new Error("Expected two delayed-damage rolls.");
    }
    const delayedDamageHoles = request.holes.filter(
      (hole) => hole.kind === "rolledDice",
    );
    expect(delayedDamageHoles).toHaveLength(2);
    const [firstDelayedDamage, secondDelayedDamage] = delayedDamageHoles;
    if (firstDelayedDamage === undefined || secondDelayedDamage === undefined) {
      throw new Error("Expected both delayed-damage roll holes.");
    }

    expect(
      resolveBattleSubject({
        state: sharedTargetTurn.state,
        subject: {
          tag: "runtimeCommand",
          actorId: sharedTargetId,
          command: "endTurn",
        },
        fills: [damageRollFillWithGroups(firstDelayedDamage, [[2, 2]])],
      }),
    ).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ holeId: secondDelayedDamage.holeId })],
    });
  });

  test("poison_spray is admitted through catalog spell access and projected as a pure damage cantrip spell attack", () => {
    const spell = spellRecord(poisonSprayUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: poisonSprayUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "poison_spray",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            poisonSprayUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(state, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        targeting: { kind: "singleCombatant" },
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 12 },
          damageType: "poison",
        },
        rangeFeet: 30,
        postDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("chill_touch is admitted as creature-or-object melee spell attack with Hit Point regain prevention rider", () => {
    const spell = spellRecord(chillTouchUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: chillTouchUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("chill_touch", "spellAttackDamage"),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            chillTouchUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(state, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        targeting: { kind: "singleCreatureOrObject" },
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 10 },
          damageType: "necrotic",
        },
        rangeFeet: 5,
        attackKind: "melee_spell_attack",
        postDamageRiders: [
          {
            kind: "hitPointRegainPrevented",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
        objectHitEffect: { kind: "none" },
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
      expect.objectContaining({
        kind: "objectTargetChoice",
        requiresTableSpatialFact: true,
      }),
    ]);
  });
  test("shocking_grasp is admitted as melee spell attack with Opportunity Attack denial rider", () => {
    const spell = spellRecord(shockingGraspUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: shockingGraspUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "shocking_grasp",
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            shockingGraspUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(state, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        attackKind: "melee_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 1, dieSize: 8 },
          damageType: "lightning",
        },
        postDamageRiders: [
          {
            kind: "opportunityAttackDenied",
            expiresAt: "startOfTargetNextTurn",
          },
        ],
      }),
    );
  });
  test("guiding_bolt is admitted as ranged spell attack with next attack Advantage rider", () => {
    const spell = spellRecord(guidingBoltUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({
      session: state,
      spellId: guidingBoltUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "guiding_bolt",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ preparedSpells: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            guidingBoltUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(state, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 4, dieSize: 6 },
          damageType: "radiant",
        },
        postDamageRiders: [
          {
            kind: "nextAttackRollAgainstTarget",
            mode: "advantage",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    );
  });
  test("ray_of_sickness is admitted as ranged spell attack with Poisoned rider", () => {
    const spell = spellRecord(rayOfSicknessUnitId);
    const state = spellBattle({ preparedSpells: [spell] });
    const act = spellAct({
      session: state,
      spellId: rayOfSicknessUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "ray_of_sickness",
        1,
        "spellAttackDamage",
      ),
      mode: { tag: "cast" },
    });
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ preparedSpells: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            rayOfSicknessUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(state, [attackRoll])).toEqual(
      expect.objectContaining({
        procedure: "spellAttackDamage",
        attackKind: "ranged_spell_attack",
        damage: {
          kind: "fixedSpellAttackDamage",
          expr: { dice: 2, dieSize: 8 },
          damageType: "poison",
        },
        postDamageRiders: [
          {
            kind: "condition",
            condition: "poisoned",
            expiresAt: "endOfCasterNextTurn",
          },
        ],
      }),
    );
  });
  test("vicious_mockery is admitted as save-gated cantrip with next attack Disadvantage rider", () => {
    const spell = spellRecord(viciousMockeryUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: viciousMockeryUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef(
        "vicious_mockery",
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            viciousMockeryUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        ability: "wis",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 1, dieSize: 6 },
          damageType: "psychic",
        },
        successDamage: "none",
        failedSavePostDamageRiders: [
          {
            kind: "nextAttackRollByTarget",
            mode: "disadvantage",
            expiresAt: "endOfTargetNextTurn",
          },
        ],
      }),
    );
  });
  test("spell rider timing is admitted by effect shape, not authored identity", () => {
    const genericPoisonRay = {
      ...spellRecord(rayOfSicknessUnitId),
      id: parseSharedUnitId("generic_poison_ray"),
      name: "Generic Poison Ray",
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "Spells/Descriptions-Q-R#Generic Poison Ray",
      },
    };
    const genericOpportunityAttackDenial = {
      ...spellRecord(shockingGraspUnitId),
      id: parseSharedUnitId("generic_opportunity_attack_denial"),
      name: "Generic Opportunity Attack Denial",
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "Spells/Descriptions-S-Z#Generic Opportunity Attack Denial",
      },
    };
    const genericNextAttackAdvantage = {
      ...spellRecord(guidingBoltUnitId),
      id: parseSharedUnitId("generic_next_attack_advantage"),
      name: "Generic Next Attack Advantage",
      provenance: {
        kind: "srd-5.2.1" as const,
        section: "Spells/Descriptions-E-L#Generic Next Attack Advantage",
      },
    };
    const mockery = spellRecord(viciousMockeryUnitId);
    if (mockery.mechanics.family !== "activation") {
      throw new Error("Expected Vicious Mockery activation fixture.");
    }
    const mockeryPhase = mockery.mechanics.phases[0];
    if (
      mockeryPhase?.kind !== "save_gate" ||
      mockeryPhase.onFail.kind !== "composite"
    ) {
      throw new Error("Expected Vicious Mockery save-gate composite fixture.");
    }
    const [incomingAttackDisadvantageFirst, ...incomingAttackDisadvantageRest] =
      mockeryPhase.onFail.effects.map(
        (effect): EffectAtom =>
          effect.kind === "modify_roll_advantage"
            ? { ...effect, affects: "rolls_against_self" }
            : effect,
      );
    if (incomingAttackDisadvantageFirst === undefined) {
      throw new Error("Expected Vicious Mockery failed-save effects.");
    }
    const incomingAttackDisadvantageEffects = [
      incomingAttackDisadvantageFirst,
      ...incomingAttackDisadvantageRest,
    ] as const;
    const incomingAttackDisadvantagePhase = {
      ...mockeryPhase,
      onFail: {
        ...mockeryPhase.onFail,
        effects: incomingAttackDisadvantageEffects,
      },
    } satisfies ActivationPhase;
    const genericIncomingAttackDisadvantage = {
      ...mockery,
      id: parseSharedUnitId("generic_incoming_attack_disadvantage"),
      mechanics: {
        ...mockery.mechanics,
        phases: [incomingAttackDisadvantagePhase] as const,
      },
    };

    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [genericPoisonRay] }),
        spellId: genericPoisonRay.id,
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        session: spellBattle({ cantrips: [genericOpportunityAttackDenial] }),
        spellId: genericOpportunityAttackDenial.id,
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        session: spellBattle({ preparedSpells: [genericNextAttackAdvantage] }),
        spellId: genericNextAttackAdvantage.id,
      }),
    ).toBeDefined();
    expect(
      maybeSpellAct({
        session: spellBattle({ cantrips: [genericIncomingAttackDisadvantage] }),
        spellId: genericIncomingAttackDisadvantage.id,
      }),
    ).toBeUndefined();
  });
  test("sacred_flame is admitted through catalog spell access and projected as single-target save-gated cantrip damage", () => {
    const spell = spellRecord(sacredFlameUnitId);
    const state = spellBattle({ cantrips: [spell] });
    const act = spellAct({
      session: state,
      spellId: sacredFlameUnitId,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: cantripSpellInvocationRef("sacred_flame", "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({ cantrips: [spell] }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            sacredFlameUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        ability: "dex",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 1, dieSize: 8 },
          damageType: "radiant",
        },
        successDamage: "none",
        rangeFeet: 60,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("sacred_flame successful saves resolve without Potent Cantrip damage", () => {
    const spell = spellRecord(sacredFlameUnitId);
    const session = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "cleric", level: 1 }],
    });
    const initialTargetHp = Number(
      requireCombatant(session.state, spellTargetId).hp,
    );
    const act = spellAct({
      session,
      spellId: sacredFlameUnitId,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      sacredFlameUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const resolved = resolveBattleSubject({
      state: session.state,
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
      throw new Error("Expected Sacred Flame successful save to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(
      initialTargetHp,
    );
  });
  test("inflict_wounds is admitted through prepared spell access and projected as single-target save-gated slot damage", () => {
    const spell = spellRecord(inflictWoundsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: inflictWoundsUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        "inflict_wounds",
        3,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            inflictWoundsUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "con",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 4, dieSize: 10 },
          damageType: "necrotic",
        },
        successDamage: "half",
        rangeFeet: 5,
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("mind_spike is admitted as single-target Wisdom save Psychic slot damage", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: mindSpikeUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(mindSpikeUnitId, 3, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: spellBattle({
          preparedSpells: [spell],
          spellSlots: [{ spellLevel: 3, count: 1 }],
        }).state,
        subject: act.subject,
        fills: [
          spellTargetFill(
            requireHole(act.initialHoles, "targetChoice"),
            mindSpikeUnitId,
            spellCasterId,
            spellTargetId,
          ),
        ],
      }),
      "savingThrowOutcome",
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "wis",
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 4, dieSize: 8 },
          damageType: "psychic",
        },
        successDamage: "half",
        rangeFeet: 120,
        failedSavePostDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
  });
  test("mind_spike failed save applies Psychic damage and owns Concentration without duplicate location state", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session: state,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      requireCombatant(resolved.state, spellTargetId).activeEffects,
    ).toEqual([]);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      {
        kind: "spellConcentrationDuration",
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: act.subject.procedureRef,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: mindSpikeDurationTicks,
        },
      },
    ]);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 2, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("mind_spike failed-save Concentration expires after its one-hour maximum", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session: state,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }

    const caster = requireCombatant(resolved.state, spellCasterId);
    const nearlyExpiredCombatants = new Map(resolved.state.combatants).set(
      spellCasterId,
      {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "spellConcentrationDuration" &&
          effect.sourceCombatantId === spellCasterId &&
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
    expect(expiredCombatants.get(spellCasterId)?.activeEffects).toEqual([]);
    expect(expiredCombatants.get(spellTargetId)?.activeEffects).toEqual([]);
  });
  test("mind_spike self-target breaks prior Concentration before damage can request a save", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const caster = requireCombatant(state.state, spellCasterId);
    const concentratingSession = battleRuntimeSessionForTest({
      ...state,
      state: {
        ...state.state,
        combatants: new Map(state.state.combatants).set(spellCasterId, {
          ...caster,
          concentration: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(spellId("synthetic_prior_concentration")),
            ),
            effectKind: "spellEffect",
          },
        }),
      },
    });
    const act = spellAct({
      session: concentratingSession,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellCasterId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: concentratingSession.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellCasterId, succeeded: false },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: concentratingSession.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: concentratingSession.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected self-targeted Mind Spike to resolve.");
    }
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toEqual({
      sourceProcedureRef: act.subject.procedureRef,
      effectKind: "spellEffect",
    });
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([
      {
        kind: "spellConcentrationDuration",
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: act.subject.procedureRef,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: mindSpikeDurationTicks,
        },
      },
    ]);
  });
  test("mind_spike successful save applies half damage and breaks prior Concentration without starting Mind Spike", () => {
    const spell = spellRecord(mindSpikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const caster = requireCombatant(state.state, spellCasterId);
    const concentratingSession = battleRuntimeSessionForTest({
      ...state,
      state: {
        ...state.state,
        combatants: new Map(state.state.combatants).set(spellCasterId, {
          ...caster,
          concentration: {
            sourceProcedureRef: battleProcedureExecutionRefForTest(
              String(spellId("synthetic_prior_concentration")),
            ),
            effectKind: "spellEffect",
          },
        }),
      },
    });
    const act = spellAct({
      session: concentratingSession,
      spellId: mindSpikeUnitId,
      slotLevel: 2,
    });
    const targetFill = spellTargetFill(
      requireHole(act.initialHoles, "targetChoice"),
      mindSpikeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: concentratingSession.state,
        subject: act.subject,
        fills: [targetFill],
      }),
      "savingThrowOutcome",
    );
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: concentratingSession.state,
        subject: act.subject,
        fills: [targetFill, saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: concentratingSession.state,
      subject: act.subject,
      fills: [
        targetFill,
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Mind Spike to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(24);
    expect(
      requireCombatant(resolved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual([]);
  });
  test("burning_hands is admitted as a self-origin Cone save-gated slot damage spell", () => {
    const spell = spellRecord(burningHandsUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: burningHandsUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef("burning_hands", 2, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell self-origin Cone Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "dex",
        targeting: { kind: "selfOriginCone", lengthFeet: 15 },
        damage: {
          expr: { dice: 4, dieSize: 6 },
          damageType: "fire",
        },
        successDamage: "half",
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
  test("lightning_bolt is admitted as a self-origin Line save-gated slot damage spell", () => {
    const spell = spellRecord(lightningBoltUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 4, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: lightningBoltUnitId,
      slotLevel: 4,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        lightningBoltUnitId,
        4,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell self-origin Line Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 4 },
        ability: "dex",
        targeting: { kind: "selfOriginLine", lengthFeet: 100, widthFeet: 5 },
        damage: {
          expr: { dice: 9, dieSize: 6 },
          damageType: "lightning",
        },
        successDamage: "half",
        rangeFeet: 0,
        failedSavePostDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("cone_of_cold is admitted as a level-5 self-origin Cone save-gated slot damage spell", () => {
    const spell = spellRecord(coneOfColdUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: coneOfColdUnitId,
      slotLevel: 5,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        coneOfColdUnitId,
        5,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell self-origin Cone Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 5 },
        ability: "con",
        targeting: { kind: "selfOriginCone", lengthFeet: 60 },
        damage: {
          expr: { dice: 8, dieSize: 8 },
          damageType: "cold",
        },
        successDamage: "half",
        rangeFeet: 0,
        failedSavePostDamageRiders: [],
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({
        kind: "savingThrowOutcome",
        areaChoices: [],
      }),
    ]);
  });
  test("flame_strike is admitted as point-origin Cylinder save-gated slot damage with fire and radiant components", () => {
    const spell = spellRecord(flameStrikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: flameStrikeUnitId,
      slotLevel: 5,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(
        flameStrikeUnitId,
        5,
        "saveGatedDamage",
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Cylinder Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 5 },
        ability: "dex",
        targeting: {
          kind: "pointOriginCylinder",
          radiusFeet: 10,
          heightFeet: 40,
        },
        damage: {
          expr: { dice: 5, dieSize: 6 },
          damageType: "fire",
        },
        additionalDamageComponents: [
          {
            expr: { dice: 5, dieSize: 6 },
            damageType: "radiant",
          },
        ],
        successDamage: "half",
        rangeFeet: 60,
        failedSavePostDamageRiders: [],
      }),
    );
  });
  test("flame_strike applies full and half damage for each damage component in the Cylinder", () => {
    const secondTargetId = combatantId("unit-profile-flame-strike-target-2");
    const spell = spellRecord(flameStrikeUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 5, count: 1 }],
      targetHp: 40,
      targetMaxHp: 40,
      extraTargetIds: [secondTargetId],
      extraTargetHp: 40,
      extraTargetMaxHp: 40,
    });
    const act = spellAct({
      session: state,
      spellId: flameStrikeUnitId,
      slotLevel: 5,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
      { targetId: secondTargetId, succeeded: true },
    ]);
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [
          [1, 1, 1, 1, 1],
          [2, 2, 2, 2, 2],
        ]),
      ],
    });

    if (resolved.tag !== "resolved") {
      throw new Error(
        `Expected Flame Strike to resolve: ${JSON.stringify(resolved)}`,
      );
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(25);
    expect(Number(requireCombatant(resolved.state, secondTargetId).hp)).toBe(
      33,
    );
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 5, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("lightning_bolt resolves caller-supplied Line targets with full and half damage", () => {
    const secondTargetId = combatantId("unit-profile-lightning-bolt-target-2");
    const spell = spellRecord(lightningBoltUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 30,
      targetMaxHp: 30,
      extraTargetIds: [secondTargetId],
    });
    const act = spellAct({
      session: state,
      spellId: lightningBoltUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(savingThrow, [
      { targetId: spellTargetId, succeeded: false },
      { targetId: secondTargetId, succeeded: true },
    ]);
    expect(saveFill).toMatchObject({
      value: {
        area: {
          originAnchorId: spellCasterId,
          affectedTargetIds: [spellTargetId, secondTargetId],
        },
      },
    });
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[1, 1, 1, 1, 1, 1, 1, 1]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Lightning Bolt to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(22);
    expect(Number(requireCombatant(resolved.state, secondTargetId).hp)).toBe(8);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("fireball is admitted as point-origin Sphere save damage with object ignition facts", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 4, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: fireballUnitId,
      slotLevel: 4,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(fireballUnitId, 4, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Sphere Saving Throw outcomes",
        ability: "dex",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 4 },
        ability: "dex",
        targeting: { kind: "pointOriginSphere", radiusFeet: 20 },
        damage: {
          expr: { dice: 9, dieSize: 6 },
          damageType: "fire",
        },
        successDamage: "half",
        rangeFeet: 150,
        failedSavePostDamageRiders: [],
        postSaveAreaEffect: { kind: "fireballObjectIgnition" },
      }),
    );
  });
  test("save-gated damage replays a missing Hideous Laughter damage repeat save", () => {
    const spell = spellRecord(fireballUnitId);
    const baseSession = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 5 }],
      targetHp: 50,
      targetMaxHp: 50,
    });
    const baseCaster = requireCombatant(baseSession.state, spellCasterId);
    const baseTarget = requireCombatant(baseSession.state, spellTargetId);
    const hideousLaughterProcedureRef = battleProcedureExecutionRefForTest(
      "synthetic-save-gated-damage-hideous-laughter",
    );
    const hideousLaughter = {
      kind: "hideousLaughter" as const,
      sourceProcedureRef: hideousLaughterProcedureRef,
      sourceCombatantId: spellCasterId,
      conditionHadNonSpellProneSource: false,
      conditionHadNonSpellIncapacitatedSource: false,
      repeatSaveRollMode: null,
      save: {
        ability: "wis" as const,
        dc: { kind: "caster_spell_save_dc" as const },
      },
      expiresAt: {
        kind: "concentration" as const,
        combatantId: spellCasterId,
      },
    } satisfies Extract<
      BattleActiveEffect,
      { readonly kind: "hideousLaughter" }
    >;
    const enrichedState = {
      ...baseSession.state,
      combatants: new Map(baseSession.state.combatants)
        .set(spellCasterId, {
          ...baseCaster,
          concentration: {
            sourceProcedureRef: hideousLaughterProcedureRef,
            effectKind: "spellEffect" as const,
          },
        })
        .set(spellTargetId, {
          ...baseTarget,
          activeEffects: [...baseTarget.activeEffects, hideousLaughter],
        }),
    };
    const session = battleRuntimeSessionForTest({
      ...baseSession,
      state: enrichedState,
    });
    const act = spellAct({
      session,
      spellId: fireballUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = fireballSavingThrowOutcomeFill(
      savingThrow,
      [{ targetId: spellTargetId, succeeded: false }],
      [],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: enrichedState,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );
    const awaitingRepeatSave = resolveBattleSubject({
      state: enrichedState,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4, 4, 4, 4, 4, 4]]),
      ],
    });

    expect(awaitingRepeatSave).toMatchObject({ tag: "needsHoles" });
    if (awaitingRepeatSave.tag !== "needsHoles") {
      throw new Error("Expected a Hideous Laughter repeat-save hole.");
    }
    const repeatSaveHole = awaitingRepeatSave.holes.find(
      (hole) => "hideousLaughterRepeatSave" in hole,
    );
    expect(repeatSaveHole).toBeDefined();
    expect(repeatSaveHole).toMatchObject({
      kind: "savingThrowOutcome",
      hideousLaughterRepeatSave: expect.objectContaining({
        targetId: spellTargetId,
        trigger: "damage",
      }),
    });
  });

  test("fireball applies area save damage and emits unattended flammable object ignitions", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 50,
      targetMaxHp: 50,
    });
    const act = spellAct({
      session: state,
      spellId: fireballUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = fireballSavingThrowOutcomeFill(
      savingThrow,
      [{ targetId: spellTargetId, succeeded: false }],
      [
        {
          objectId: fireballObjectId,
          disposition: { kind: "flammableUnattended" },
        },
      ],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        saveFill,
        damageRollFillWithGroups(damageRoll, [[4, 4, 4, 4, 4, 4, 4, 4]]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId: fireballObjectId,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: act.subject.procedureRef,
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Fireball to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(18);
    expect(
      snapshotBattle(resolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    );

    const immuneState = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
      targetHp: 50,
      targetMaxHp: 50,
      targetStatBlock: fireImmuneHumanoidStatBlock(),
    });
    const immuneInitialHp = Number(
      requireCombatant(immuneState.state, spellTargetId).hp,
    );
    const immuneAct = spellAct({
      session: immuneState,
      spellId: fireballUnitId,
      slotLevel: 3,
    });
    const immuneSavingThrow = requireHole(
      immuneAct.initialHoles,
      "savingThrowOutcome",
    );
    const immuneSaveFill = fireballSavingThrowOutcomeFill(
      immuneSavingThrow,
      [{ targetId: spellTargetId, succeeded: false }],
      [],
    );
    const immuneDamageRoll = requireResultHole(
      resolveBattleSubject({
        state: immuneState.state,
        subject: immuneAct.subject,
        fills: [immuneSaveFill],
      }),
      "rolledDice",
    );
    const immuneResolved = resolveBattleSubject({
      state: immuneState.state,
      subject: immuneAct.subject,
      fills: [
        immuneSaveFill,
        damageRollFillWithGroups(immuneDamageRoll, [[4, 4, 4, 4, 4, 4, 4, 4]]),
      ],
    });

    expect(immuneResolved).toMatchObject({ tag: "resolved" });
    if (immuneResolved.tag !== "resolved") {
      throw new Error("Expected Fireball immunity case to resolve.");
    }
    expect(
      Number(requireCombatant(immuneResolved.state, spellTargetId).hp),
    ).toBe(immuneInitialHp);
    expect("objectIgnitions" in immuneResolved).toBe(false);
    expect(
      snapshotBattle(immuneResolved.state).combatants.find(
        (combatant) => combatant.combatantId === spellCasterId,
      )?.origin,
    ).toEqual(
      expect.objectContaining({
        spellcasting: expect.objectContaining({
          spellSlots: expect.arrayContaining([
            expect.objectContaining({ spellLevel: 3, expended: 1 }),
          ]),
        }),
      }),
    );
  });
  test("fireball can ignite unattended flammable objects when no creature is caught in the area", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: fireballUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        fireballSavingThrowOutcomeFill(
          savingThrow,
          [],
          [
            {
              objectId: fireballObjectId,
              disposition: { kind: "flammableUnattended" },
            },
            {
              objectId: battleObjectId("unit-profile-fireball-not-flammable"),
              disposition: { kind: "notFlammable" },
            },
            {
              objectId: battleObjectId("unit-profile-fireball-worn-object"),
              disposition: { kind: "wornOrCarried" },
            },
          ],
        ),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectIgnitions: [
        {
          kind: "startsBurning",
          objectId: fireballObjectId,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: act.subject.procedureRef,
        },
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Fireball to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(12);
  });
  test("fireball requires explicit object ignition area facts", () => {
    const spell = spellRecord(fireballUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: fireballUnitId,
      slotLevel: 3,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message: "Fireball requires caller-supplied object ignition area facts.",
    });
  });
  test("shatter is admitted as point-origin Sphere save damage", () => {
    const spell = spellRecord(shatterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: shatterUnitId,
      slotLevel: 3,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      invocation: spellSlotInvocationRef(shatterUnitId, 3, "saveGatedDamage"),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell point-origin Sphere Saving Throw outcomes",
        ability: "con",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "saveGatedDamage",
        resource: { tag: "spellSlot", slotLevel: 3 },
        ability: "con",
        targeting: { kind: "pointOriginSphere", radiusFeet: 10 },
        damage: {
          expr: { dice: 4, dieSize: 8 },
          damageType: "thunder",
        },
        successDamage: "half",
        rangeFeet: 60,
        failedSavePostDamageRiders: [],
        saveRollModeRule: {
          kind: "creatureType",
          creatureType: "construct",
          mode: "disadvantage",
        },
        postSaveAreaEffect: { kind: "shatterObjectDamage" },
      }),
    );
  });
  test("shatter marks Constructs with Disadvantage on the save", () => {
    const spell = spellRecord(shatterUnitId);
    const constructId = combatantId("unit-profile-shatter-construct");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      statBlockTargets: [
        {
          combatantId: constructId,
          statBlock: statBlockWithCreatureType("construct"),
          initiative: 9,
        },
      ],
    });
    const act = spellAct({
      session: state,
      spellId: shatterUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(savingThrow.targetRollModes).toEqual([
      { targetId: constructId, rollMode: "disadvantage" },
    ]);
  });
  test("shatter applies area save damage with explicit object damage facts", () => {
    const spell = spellRecord(shatterUnitId);
    const secondTargetId = combatantId("unit-profile-shatter-target-2");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      extraTargetIds: [secondTargetId],
      targetHp: 30,
      targetMaxHp: 30,
    });
    const act = spellAct({
      session: state,
      spellId: shatterUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const saveFill = shatterSavingThrowOutcomeFill(
      savingThrow,
      [
        { targetId: spellTargetId, succeeded: false },
        { targetId: secondTargetId, succeeded: true },
      ],
      [],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 4]])],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Shatter to resolve.");
    }
    expect(Number(requireCombatant(resolved.state, spellTargetId).hp)).toBe(16);
    expect(Number(requireCombatant(resolved.state, secondTargetId).hp)).toBe(5);
  });
  test("shatter damages supplied nonmagical unattended object facts", () => {
    const spell = spellRecord(shatterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: shatterUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    const objectId = battleObjectId("unit-profile-shatter-vase");
    const saveFill = shatterSavingThrowOutcomeFill(
      savingThrow,
      [],
      [
        {
          objectId,
          disposition: { kind: "hitPoints", hitPoints: Hp(20) },
        },
      ],
    );
    const damageRoll = requireResultHole(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [saveFill],
      }),
      "rolledDice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [saveFill, damageRollFillWithGroups(damageRoll, [[5, 5, 4]])],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      objectDamages: [
        {
          kind: "hitPoints",
          objectId,
          components: [{ damageType: "thunder", rolledDamage: 14 }],
          rolledDamage: 14,
          damageAfterImmunities: 14,
          effectiveDamage: 14,
          priorHitPoints: 20,
          nextHitPoints: 6,
          destroyed: false,
        },
      ],
    });
  });
  test("shatter requires explicit object damage area facts", () => {
    const spell = spellRecord(shatterUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: shatterUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          savingThrowOutcomeFill(savingThrow, [
            { targetId: spellTargetId, succeeded: false },
          ]),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Shatter requires caller-supplied nonmagical unattended object damage area facts.",
    });
  });
});

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

function fireballSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  objectIgnitionFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectIgnitionDisposition;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "fireballArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        objectIgnitionFacts,
      },
      outcomes,
    },
  };
}

function shatterSavingThrowOutcomeFill(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
  outcomes: readonly {
    readonly targetId: CombatantId;
    readonly succeeded: boolean;
  }[],
  nonmagicalUnattendedObjectDamageFacts: readonly {
    readonly objectId: ReturnType<typeof battleObjectId>;
    readonly disposition: BattleObjectDamageDisposition;
  }[],
): Extract<BattleFill, { readonly kind: "savingThrowOutcome" }> {
  return {
    kind: "savingThrowOutcome",
    holeId: hole.holeId,
    value: {
      area: {
        kind: "shatterArea",
        originAnchorId: spellCasterId,
        affectedTargetIds: outcomes.map((outcome) => outcome.targetId),
        nonmagicalUnattendedObjectDamageFacts,
      },
      outcomes,
    },
  };
}
