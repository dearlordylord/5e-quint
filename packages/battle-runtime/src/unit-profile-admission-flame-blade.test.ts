import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV95 flame_blade
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-spell-created-held-object
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.SPELL_CREATED_HELD_OBJECT_LIFECYCLE
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { holeId } from "@dnd/shared-algebras/runtime-hole-algebra";
import {
  difficultyClass,
  PositiveInteger,
  spellSlotLevel,
  type HandUse,
} from "@dnd/shared/types";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { decodeSpellRecordSync } from "@dnd/surface/surface/schema";
import type { SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import { spellId } from "./identity.ts";
import {
  SPELL_CAST_REACTION_FACTS_HOLE_ID,
  type BattleFill,
  type CombatantId,
} from "./index.ts";
import { battleSpellExecutionSourceFromAdmission } from "./battle-state-execution.ts";
import {
  spellCastInterruptionReactionUnitId,
  flameBladeUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  attackRollFill,
  damageRollFillWithGroups,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  bonusSpellAct,
  maybeSpellAct,
  spellAct,
  spellHoleInvocation,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  breakBattleConcentration,
  canSpendAction,
  classLevel,
  discoverBattleActCandidates,
  elapsedTimeTicks,
  Hp,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  type BattleRuntimeSession,
  type BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
  requireCharacterSpellProcedureRefForTest,
  unitLibrary,
} from "./battle-runtime.test-support.ts";
import { spellCreatedHeldObjectProfile } from "./battle-reducer/spell-procedure-profiles/spell-created-held-object.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";
import { admitRegisteredSpellProcedureMechanics } from "./battle-reducer/spell-procedure-profiles/admission-registry.ts";

describe("spellCreatedHeldObject static mechanics admission", () => {
  test("projects complete held-object facts and binds a mechanics-free invocation", () => {
    const source = spellAdmissionSource(spellRecord(flameBladeUnitId));
    const result = spellCreatedHeldObjectProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      duration: {
        kind: "concentration",
        upTo: { amount: 10, unit: "minute" },
      },
      light: { brightRadiusFeet: 10, dimAdditionalFeet: 10 },
      attack: {
        attackKind: "melee_spell_attack",
        rangeFeet: 5,
        damageType: "fire",
      },
    });
    expect(result.admitted.evidence).toEqual({
      consumed: [
        spellMechanicsHeaderPath("level"),
        spellMechanicsHeaderPath("school"),
        spellMechanicsHeaderPath("range"),
        spellMechanicsHeaderPath("components"),
        spellMechanicsHeaderPath("duration"),
        spellMechanicsHeaderPath("castingTime"),
        spellMechanicsHeaderPath("family"),
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingInitialPhasePath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
      unowned: [],
    });
    const session = flameBladeBattle();
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected Flame Blade caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) throw new Error("Expected spell admission context.");
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      { ...context, castingSource: source.castingSource },
    );

    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
    expect(invocations[0]?.activeEffect).toMatchObject({
      objectState: { kind: "held" },
      light: { brightRadiusFeet: 10, dimAdditionalFeet: 10 },
      attack: {
        damage: {
          expr: { dice: 3, dieSize: 6, flat: 3 },
          damageType: "fire",
        },
        attackKind: "melee_spell_attack",
        attackBonus: 5,
      },
      expiresAt: { durationTicks: 100 },
    });
    const upcast = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        ...context,
        castingSource: source.castingSource,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(3), payment: { tag: "slot" } },
        ],
      },
    );
    expect(upcast[0]?.activeEffect.attack.damage.expr).toEqual({
      dice: 4,
      dieSize: 6,
      flat: 3,
    });
  });

  test("recognizes reordered complete mechanics independently of authored identity", () => {
    const original = spellAdmissionSource(spellRecord(flameBladeUnitId));
    const originalMechanics = requireOngoingEffectMechanics(
      spellRecord(flameBladeUnitId),
    );
    const renamed = spellAdmissionSource(
      decodeSpellRecordSync({
        ...spellRecord(flameBladeUnitId),
        id: "synthetic_created_held_object",
        name: "Synthetic Created Held Object",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic_created_held_object",
        },
        mechanics: {
          ...originalMechanics,
          operations: [...originalMechanics.operations].reverse(),
        },
      }),
    );
    const originalResult = spellCreatedHeldObjectProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = spellCreatedHeldObjectProfile.admitMechanics(
      mechanicsSource(renamed),
    );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported" || renamedResult.tag !== "supported")
      return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
  });

  test("canonical registry selects only the created-held-object procedure", () => {
    const source = spellAdmissionSource(spellRecord(flameBladeUnitId));
    const result = admitRegisteredSpellProcedureMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("admitted");
    if (result.tag !== "admitted") return;
    expect(result.procedures.map(({ procedure }) => procedure)).toEqual([
      "spellCreatedHeldObject",
    ]);
  });

  test("does not represent unrelated shipped spell mechanics", () => {
    const results = unitLibrary
      .listUnits()
      .filter(
        (unit): unit is SpellRecord =>
          unit.kind === "spell" && unit.id !== flameBladeUnitId,
      )
      .map((spell) =>
        spellCreatedHeldObjectProfile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spell)),
        ),
      );

    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(results.map(() => ({ tag: "notRepresented" })));
  });

  test("accumulates independent held-object, illumination, damage, and root issues", () => {
    const source = spellAdmissionSource(spellRecord(flameBladeUnitId));
    const mechanics = requireOngoingEffectMechanics(
      spellRecord(flameBladeUnitId),
    );
    const initialPhase = mechanics.initialPhase;
    const lightOperation = mechanics.operations[0];
    const attackOperation = mechanics.operations[1];
    if (
      initialPhase?.kind !== "direct" ||
      initialPhase.effects?.[0]?.kind !== "spell_created_held_object" ||
      lightOperation?.effect.kind !== "emit_bright_and_dim_illumination" ||
      attackOperation?.effect.kind !== "attack_roll" ||
      attackOperation.effect.onHit[0]?.kind !== "damage" ||
      attackOperation.effect.onHit[0].amount?.kind !== "linear_per_level"
    )
      throw new Error("Expected complete held-object mechanics fixture.");
    const unsupportedHeldObjectEffect = { ...initialPhase.effects[0] };
    Reflect.set(unsupportedHeldObjectEffect, "requirements", []);
    const unsupportedInitialPhase: typeof initialPhase = {
      ...initialPhase,
      effects: [unsupportedHeldObjectEffect],
    };
    const unsupportedLightOperation: typeof lightOperation = {
      ...lightOperation,
      effect: { ...lightOperation.effect, brightRadiusFeet: 15 },
    };
    const unsupportedAttackOperation: typeof attackOperation = {
      ...attackOperation,
      effect: {
        ...attackOperation.effect,
        onHit: [
          {
            ...attackOperation.effect.onHit[0],
            amount: {
              ...attackOperation.effect.onHit[0].amount,
              base: {
                ...attackOperation.effect.onHit[0].amount.base,
                dice: 4,
              },
            },
          },
        ],
      },
    };
    const conditionalSource = spellRecord("phantasmal_force").mechanics;
    if (
      conditionalSource.family !== "ongoing_effect" ||
      conditionalSource.authoredConditionalMechanics?.[0] === undefined
    )
      throw new Error("Expected an authored conditional mechanic fixture.");
    const result = spellCreatedHeldObjectProfile.admitMechanics({
      ...mechanicsSource(source),
      mechanics: {
        ...mechanics,
        initialPhase: unsupportedInitialPhase,
        operations: [unsupportedLightOperation, unsupportedAttackOperation],
        authoredConditionalMechanics: [
          conditionalSource.authoredConditionalMechanics[0],
        ],
      },
    });

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      {
        failedFact: "heldObjectLifecycle",
        mechanicsPath: spellOngoingInitialPhasePath(),
      },
      {
        failedFact: "illuminationOperation",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
      {
        failedFact: "attackDamage",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
      },
      {
        failedFact: "authoredConditionalMechanics",
        mechanicsPath: spellOngoingAuthoredConditionalMechanicPath(
          PositiveInteger(1),
        ),
      },
    ]);
  });
});

describe("SRDINV95 deterministic Flame Blade admission", () => {
  test("flame_blade casts as a Bonus Action slot spell and occupies the canonical free hand", () => {
    const spell = spellRecord(flameBladeUnitId);
    const state = flameBladeBattle();
    const act = bonusSpellAct({ session: state, spellId: flameBladeUnitId });

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

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionQuotaAvailable: false,
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
        lightEmitters: [
          {
            kind: "spellLightEmitter",
            sourceProcedureRef: expect.any(String),
            sourceCombatantId: spellCasterId,
            attachment: { kind: "combatant", combatantId: spellCasterId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(10),
              dimAdditionalFeet: movementFeet(10),
            },
            opaqueCoverInteraction: { kind: "doesNotBlockEmission" },
            expiresAt: {
              kind: "concentration",
              combatantId: spellCasterId,
              durationTicks: elapsedTimeTicks(100),
            },
          },
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flame Blade to resolve.");
    }
    const caster = requireCombatant(resolved.state, spellCasterId);
    expect(caster.armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "spellCreatedHeldObject",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(caster.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        objectState: { kind: "held" },
        light: { brightRadiusFeet: 10, dimAdditionalFeet: 10 },
        attack: {
          damage: {
            expr: { dice: 3, dieSize: 6, flat: 3 },
            damageType: "fire",
          },
          attackKind: "melee_spell_attack",
          attackBonus: 5,
        },
      }),
    );
    expect(
      caster.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([{ spellLevel: 2, count: 1, expended: 1 }]);
    expect(spell.name).toBe("Flame Blade");
  });

  test("held flame_blade admits a Magic Action melee spell attack without a second Spell Slot spend", () => {
    const state = flameBladeBattle({ targetHp: 20, targetMaxHp: 20 });
    const cast = castFlameBlade(state);
    const attackAct = spellAct({
      session: cast,
      spellId: flameBladeUnitId,
    });

    expect({
      ...attackAct.subject,
      invocation: battleActSpellPresentation(attackAct)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        cast,
        spellCasterId,
        {
          tag: "spellEffect",
          spellId: spellId(flameBladeUnitId),
          sourceCombatantId: spellCasterId,
          procedure: "spellCreatedHeldObjectAttack",
        },
      ),
      mode: { tag: "cast" },
    });
    expect(attackAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "targetChoice",
        choices: [spellCasterId, spellTargetId],
      }),
    ]);
    const targetFill = spellTargetFill(
      requireHole(attackAct.initialHoles, "targetChoice"),
      flameBladeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const attackRoll = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject: attackAct.subject,
        fills: [targetFill],
      }),
      "attackRoll",
    );
    expect(spellHoleInvocation(cast, [attackRoll])).toEqual(
      expect.objectContaining({
        access: { tag: "spellEffect", sourceCombatantId: spellCasterId },
        resource: { tag: "none" },
        procedure: "spellCreatedHeldObjectAttack",
        sourceProcedureRef: attackAct.subject.procedureRef,
        targeting: { kind: "singleCombatant" },
        damage: {
          expr: { dice: 3, dieSize: 6, flat: 3 },
          damageType: "fire",
        },
        rangeFeet: 5,
        attackKind: "melee_spell_attack",
        attackBonus: 5,
      }),
    );
    const damage = requireResultHole(
      resolveBattleSubject({
        state: cast.state,
        subject: attackAct.subject,
        fills: [
          targetFill,
          attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        ],
      }),
      "rolledDice",
    );
    expect(damage.label).toBe("Spell damage (3d6+3-fire)");

    const resolved = resolveBattleSubject({
      state: cast.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, { total: 18, naturalD20: 12 }),
        damageRollFillWithGroups(damage, [[2, 3, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Flame Blade attack to resolve.");
    }
    expect(resolved.state.combatants.get(spellTargetId)?.hp).toStrictEqual(
      Hp(8),
    );
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        objectState: { kind: "held" },
      }),
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toHaveLength(1);
  });

  test("hidden flame_blade attacks keep Advantage for the roll and reveal after the attack roll", () => {
    const cast = castFlameBlade(
      flameBladeBattle({ targetHp: 20, targetMaxHp: 20 }),
    );
    const hidden = withHiddenCaster(cast.state);
    const attackAct = spellAct({
      session: battleRuntimeSessionForTest({ ...cast, state: hidden }),
      spellId: flameBladeUnitId,
    });
    const targetFill = spellTargetFill(
      requireHole(attackAct.initialHoles, "targetChoice"),
      flameBladeUnitId,
      spellCasterId,
      spellTargetId,
    );
    const awaitingAttackRoll = resolveBattleSubject({
      state: hidden,
      subject: attackAct.subject,
      fills: [targetFill],
    });

    expect(awaitingAttackRoll).toMatchObject({ tag: "needsHoles" });
    if (awaitingAttackRoll.tag !== "needsHoles") {
      throw new Error("Expected hidden Flame Blade attack roll hole.");
    }
    const attackRoll = requireHole(awaitingAttackRoll.holes, "attackRoll");
    expect(attackRoll).toMatchObject({ rollMode: "advantage" });
    expect(
      requireCombatant(awaitingAttackRoll.state, spellCasterId).hidden,
    ).toEqual({ discoveryDc: difficultyClass(17) });

    const awaitingDamage = resolveBattleSubject({
      state: hidden,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "advantage",
        }),
      ],
    });

    expect(awaitingDamage).toMatchObject({ tag: "needsHoles" });
    if (awaitingDamage.tag !== "needsHoles") {
      throw new Error("Expected hidden Flame Blade damage hole.");
    }
    expect(
      requireCombatant(awaitingDamage.state, spellCasterId).hidden,
    ).toBeNull();
    const damage = requireHole(awaitingDamage.holes, "rolledDice");

    const resolved = resolveBattleSubject({
      state: hidden,
      subject: attackAct.subject,
      fills: [
        targetFill,
        attackRollFill(attackRoll, {
          total: 18,
          naturalD20: 12,
          rollMode: "advantage",
        }),
        damageRollFillWithGroups(damage, [[2, 3, 4]]),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected hidden Flame Blade attack to resolve.");
    }
    expect(requireCombatant(resolved.state, spellCasterId).hidden).toBeNull();
  });

  test("flame_blade attack rejects spell-cast Reaction facts", () => {
    const cast = castFlameBlade(flameBladeBattle());
    const attackAct = spellAct({
      session: cast,
      spellId: flameBladeUnitId,
    });
    const targetFill = spellTargetFill(
      requireHole(attackAct.initialHoles, "targetChoice"),
      flameBladeUnitId,
      spellCasterId,
      spellTargetId,
    );

    const rejected = resolveBattleSubject({
      state: cast.state,
      subject: attackAct.subject,
      fills: [
        targetFill,
        spellCastReactionFactsFill([
          spellCastInterruptionReactionTriggerFact({
            reactorId: spellTargetId,
            casterId: spellCasterId,
          }),
        ]),
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Spell-created held object attacks are not spell casts and do not accept spell-cast Reaction facts.",
    });
  });

  test("letting go removes flame_blade light and enables later Bonus Action re-evocation without a slot spend", () => {
    const state = flameBladeBattle();
    const cast = castFlameBlade(state);
    const releaseAct = releaseFlameBladeAct(cast.state);
    const released = resolveBattleSubject({
      state: cast.state,
      subject: releaseAct.subject,
      fills: [],
    });

    expect(released).toMatchObject({
      tag: "resolved",
      snapshot: { lightEmitters: [] },
    });
    if (released.tag !== "resolved") {
      throw new Error("Expected Flame Blade release to resolve.");
    }
    expect(
      maybeSpellAct({
        session: battleRuntimeSessionForTest({
          ...state,
          state: released.state,
        }),
        spellId: flameBladeUnitId,
      }),
    ).toBeUndefined();
    expect(
      requireCombatant(released.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        objectState: { kind: "notHeld" },
      }),
    );
    expect(requireCombatant(released.state, spellCasterId).armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "free",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(
      resolveBattleSubject({
        state: released.state,
        subject: releaseAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spell-created held object is no longer held by this actor.",
    });

    const nextCasterTurn = advanceToNextCasterTurn(released.state);
    const reEvokeAct = bonusSpellAct({
      session: battleRuntimeSessionForTest({ ...state, state: nextCasterTurn }),
      spellId: flameBladeUnitId,
    });
    expect({
      ...reEvokeAct.subject,
      invocation: battleActSpellPresentation(reEvokeAct)?.invocation,
    }).toMatchObject({
      tag: "bonusActionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        battleRuntimeSessionForTest({ ...state, state: nextCasterTurn }),
        spellCasterId,
        {
          tag: "spellEffect",
          spellId: spellId(flameBladeUnitId),
          sourceCombatantId: spellCasterId,
          procedure: "spellCreatedHeldObjectReEvoke",
        },
      ),
      mode: { tag: "cast" },
    });
    const reEvoked = resolveBattleSubject({
      state: nextCasterTurn,
      subject: reEvokeAct.subject,
      fills: [],
    });

    expect(reEvoked).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: {
          bonusActionQuotaAvailable: false,
          spellSlotUsesThisTurn: [],
        },
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: expect.any(String),
            attachment: { kind: "combatant", combatantId: spellCasterId },
          }),
        ],
      },
    });
    if (reEvoked.tag !== "resolved") {
      throw new Error("Expected Flame Blade re-evocation to resolve.");
    }
    const caster = requireCombatant(reEvoked.state, spellCasterId);
    expect(caster.armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "spellCreatedHeldObject",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(caster.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "spellCreatedHeldObject",
        objectState: { kind: "held" },
      }),
    );
    expect(
      caster.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots
        : [],
    ).toEqual([{ spellLevel: 2, count: 1, expended: 1 }]);
  });

  test("flame_blade rejects canonical hand state with no free hand", () => {
    const state = flameBladeBattle();
    const act = bonusSpellAct({ session: state, spellId: flameBladeUnitId });
    const noFreeHand = withCasterHands(state.state, {
      leftHandUse: "shield",
      rightHandUse: "mainWeapon",
    });

    expect(
      maybeSpellAct({
        session: battleRuntimeSessionForTest({ ...state, state: noFreeHand }),
        spellId: flameBladeUnitId,
      }),
    ).toBeUndefined();

    const rejected = resolveBattleSubject({
      state: noFreeHand,
      subject: act.subject,
      fills: [],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spell-created held object requires a free hand.",
    });
  });

  test("a stored flame_blade cast rejects after its Bonus Action is spent", () => {
    const session = flameBladeBattle();
    const act = bonusSpellAct({ session, spellId: flameBladeUnitId });
    const afterBonusAction: BattleState = {
      ...session.state,
      currentTurnResources: {
        ...session.state.currentTurnResources,
        currentHasBonusAction: false,
      },
    };

    expect(
      resolveBattleSubject({
        state: afterBonusAction,
        subject: act.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
  });

  test("a stored flame_blade re-evocation rejects after concentration ends", () => {
    const { nextCasterTurn, reEvokeAct } = flameBladeReEvokeScenario();
    const withoutConcentration = breakBattleConcentration(
      nextCasterTurn,
      spellCasterId,
    );

    expect(
      resolveBattleSubject({
        state: withoutConcentration,
        subject: reEvokeAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spell-created held object can no longer be re-evoked.",
    });
  });

  test("a stored flame_blade re-evocation rejects after its free hand is occupied", () => {
    const { session, nextCasterTurn, reEvokeAct } = flameBladeReEvokeScenario();
    const noFreeHand = withCasterHands(nextCasterTurn, {
      leftHandUse: "shield",
      rightHandUse: "mainWeapon",
    });

    expect(
      maybeSpellAct({
        session: battleRuntimeSessionForTest({
          ...session,
          state: noFreeHand,
        }),
        spellId: flameBladeUnitId,
      }),
    ).toBeUndefined();
    expect(
      resolveBattleSubject({
        state: noFreeHand,
        subject: reEvokeAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "Spell-created held object requires a free hand.",
    });
  });

  test("flame_blade rejects fabricated held-object facts fills", () => {
    const state = flameBladeBattle();
    const act = bonusSpellAct({ session: state, spellId: flameBladeUnitId });

    const rejected = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        {
          kind: "heldObjectFacts",
          holeId: holeId("synthetic:flame-blade:held-object-facts"),
          value: { objectIds: [] },
        },
      ],
    });

    expect(rejected).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Fill heldObjectFacts does not match the spell replay holes.",
    });
  });

  test("held flame_blade blocks other canonical free-hand consumers", () => {
    const state = flameBladeBattle();
    expect(discoverBattleActCandidates(state.state)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "grapple",
          }),
        }),
      ]),
    );

    const cast = castFlameBlade(state);

    expect(discoverBattleActCandidates(cast.state)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: expect.objectContaining({
            tag: "action",
            action: "grapple",
          }),
        }),
      ]),
    );
  });

  test("flame_blade support admission rejects extra executable Surface facts", () => {
    const spell = spellRecord(flameBladeUnitId);
    const mechanics = requireOngoingEffectMechanics(spell);
    const initialPhase = mechanics.initialPhase;
    if (initialPhase?.kind !== "direct" || initialPhase.effects === undefined) {
      throw new Error("Expected Flame Blade to have initial Surface effects.");
    }
    const extraOperation = mechanics.operations[0];
    if (extraOperation === undefined) {
      throw new Error("Expected Flame Blade to have a Surface operation.");
    }
    const extraInitialEffect = initialPhase.effects[0];
    if (extraInitialEffect === undefined) {
      throw new Error(
        "Expected Flame Blade to have an initial Surface effect.",
      );
    }
    const unsupportedOperationSpell: SpellRecord = {
      ...spell,
      mechanics: {
        ...mechanics,
        operations: [...mechanics.operations, extraOperation],
      },
    };
    const unsupportedInitialEffectSpell = decodeSpellRecordSync({
      ...spell,
      mechanics: {
        ...mechanics,
        initialPhase: {
          ...initialPhase,
          effects: [...initialPhase.effects, extraInitialEffect],
        },
      },
    });

    for (const unsupportedSpell of [
      unsupportedOperationSpell,
      unsupportedInitialEffectSpell,
    ]) {
      const state = spellBattle({
        preparedSpells: [unsupportedSpell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        casterClassLevels: [{ className: "druid", level: classLevel(3) }],
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
      });

      expect(
        maybeSpellAct({ session: state, spellId: flameBladeUnitId }),
      ).toBeUndefined();
    }
  });

  test("flame_blade support admission rejects near-miss execution shapes", () => {
    const spell = spellRecord(flameBladeUnitId);
    const mechanics = requireOngoingEffectMechanics(spell);
    const attackOperation = mechanics.operations.find(
      (operation) => operation.effect.kind === "attack_roll",
    );
    if (attackOperation?.effect.kind !== "attack_roll") {
      throw new Error("Expected Flame Blade attack operation.");
    }
    const damageEffect = attackOperation.effect.onHit[0];
    if (
      damageEffect?.kind !== "damage" ||
      damageEffect.amount?.kind !== "linear_per_level" ||
      damageEffect.amount.perLevel === undefined
    ) {
      throw new Error("Expected Flame Blade scaling damage effect.");
    }
    const scalingAmount = damageEffect.amount;

    const wrongRange = decodeSpellRecordSync({
      ...spell,
      mechanics: {
        ...mechanics,
        range: { kind: "touch" },
      },
    });
    const wrongAttackKind = decodeSpellRecordSync({
      ...spell,
      mechanics: {
        ...mechanics,
        operations: mechanics.operations.map((operation) =>
          operation === attackOperation
            ? {
                ...operation,
                effect: {
                  ...attackOperation.effect,
                  attackKind: "ranged_spell_attack",
                },
              }
            : operation,
        ),
      },
    });
    const wrongDamageScaling = decodeSpellRecordSync({
      ...spell,
      mechanics: {
        ...mechanics,
        operations: mechanics.operations.map((operation) =>
          operation === attackOperation
            ? {
                ...operation,
                effect: {
                  ...attackOperation.effect,
                  onHit: [
                    {
                      ...damageEffect,
                      amount: {
                        ...scalingAmount,
                        perLevel: {
                          ...scalingAmount.perLevel,
                          dieSize: 8,
                        },
                      },
                    },
                  ],
                },
              }
            : operation,
        ),
      },
    });

    for (const unsupportedSpell of [
      wrongRange,
      wrongAttackKind,
      wrongDamageScaling,
    ]) {
      const state = spellBattle({
        preparedSpells: [unsupportedSpell],
        spellSlots: [{ spellLevel: 2, count: 1 }],
        casterClassLevels: [{ className: "druid", level: classLevel(3) }],
        attack: zeroAbilityWeaponAttack("weapon_longsword"),
      });

      expect(
        maybeSpellAct({ session: state, spellId: flameBladeUnitId }),
      ).toBeUndefined();
    }
  });

  test("flame_blade concentration break and duration expiry remove the held blade light", () => {
    const cast = castFlameBlade(flameBladeBattle());
    const caster = requireCombatant(cast.state, spellCasterId);
    const broken = breakBattleConcentration(cast.state, spellCasterId);

    expect(requireCombatant(broken, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(broken, spellCasterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatedHeldObject" }),
      ]),
    );
    expect(requireCombatant(broken, spellCasterId).armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "free",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(snapshotBattle(broken).lightEmitters).toEqual([]);

    const nearlyExpired: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellCasterId, {
        ...caster,
        activeEffects: caster.activeEffects.map((effect) =>
          effect.kind === "spellCreatedHeldObject" &&
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
      }),
    };
    const expired = advanceToNextCasterTurn(nearlyExpired);

    expect(requireCombatant(expired, spellCasterId).concentration).toBeNull();
    expect(requireCombatant(expired, spellCasterId).activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatedHeldObject" }),
      ]),
    );
    expect(requireCombatant(expired, spellCasterId).armorClass).toEqual(
      expect.objectContaining({
        leftHandUse: "free",
        rightHandUse: "mainWeapon",
      }),
    );
    expect(snapshotBattle(expired).lightEmitters).toEqual([]);
  });

  test("flame_blade concentration cleanup preserves a low-level unrelated caster effect", () => {
    const cast = castFlameBlade(flameBladeBattle());
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-flame-blade-unrelated-resistance",
    );
    const state = battleStateWithAllocatedEffectForTest({
      state: cast.state,
      ownerId: spellCasterId,
      effect: {
        kind: "damageResistance",
        sourceProcedureRef: unrelatedSource,
        sourceCombatantId: spellCasterId,
        damageType: "cold",
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(10),
        },
      },
    });
    const broken = breakBattleConcentration(state, spellCasterId);
    const brokenCaster = requireCombatant(broken, spellCasterId);
    expect(brokenCaster.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "damageResistance",
        sourceProcedureRef: unrelatedSource,
      }),
    );
    expect(brokenCaster.activeEffects).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "spellCreatedHeldObject" }),
      ]),
    );
  });
});

function flameBladeBattle(
  input: {
    readonly targetHp?: number;
    readonly targetMaxHp?: number;
  } = {},
): BattleRuntimeSession {
  return spellBattle({
    preparedSpells: [spellRecord(flameBladeUnitId)],
    spellSlots: [{ spellLevel: 2, count: 1 }],
    casterClassLevels: [{ className: "druid", level: classLevel(3) }],
    attack: zeroAbilityWeaponAttack("weapon_longsword"),
    ...input,
  });
}

function castFlameBlade(session: BattleRuntimeSession) {
  const act = bonusSpellAct({ session, spellId: flameBladeUnitId });
  const result = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [],
  });
  if (result.tag !== "resolved") {
    throw new Error("Expected Flame Blade cast to resolve.");
  }
  return battleRuntimeSessionForTest({ ...result, context: session.context });
}

function releaseFlameBladeAct(state: BattleState) {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "releaseSpellCreatedHeldObject",
  );
  if (act === undefined) {
    throw new Error("Expected Flame Blade release act.");
  }
  return act;
}

function releaseFlameBlade(state: BattleState): BattleState {
  const releaseAct = releaseFlameBladeAct(state);
  const released = resolveBattleSubject({
    state,
    subject: releaseAct.subject,
    fills: [],
  });
  if (released.tag !== "resolved") {
    throw new Error("Expected Flame Blade release to resolve.");
  }
  return released.state;
}

function flameBladeReEvokeScenario() {
  const session = flameBladeBattle();
  const released = releaseFlameBlade(castFlameBlade(session).state);
  const nextCasterTurn = advanceToNextCasterTurn(released);
  const reEvokeAct = bonusSpellAct({
    session: battleRuntimeSessionForTest({
      ...session,
      state: nextCasterTurn,
    }),
    spellId: flameBladeUnitId,
  });
  return { session, nextCasterTurn, reEvokeAct };
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const casterEnd = resolveBattleSubject({
    state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellCasterId,
      command: "endTurn",
    },
    fills: [],
  });
  if (casterEnd.tag !== "resolved") {
    throw new Error("Expected Flame Blade caster end turn.");
  }
  const targetEnd = resolveBattleSubject({
    state: casterEnd.state,
    subject: {
      tag: "runtimeCommand",
      actorId: spellTargetId,
      command: "endTurn",
    },
    fills: [],
  });
  if (targetEnd.tag !== "resolved") {
    throw new Error("Expected Flame Blade target end turn.");
  }
  return targetEnd.state;
}

function withCasterHands(
  state: BattleState,
  hands: {
    readonly leftHandUse: HandUse;
    readonly rightHandUse: HandUse;
  },
): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      armorClass: {
        ...caster.armorClass,
        ...hands,
      },
    }),
  };
}

function withHiddenCaster(state: BattleState): BattleState {
  const caster = requireCombatant(state, spellCasterId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellCasterId, {
      ...caster,
      hidden: { discoveryDc: difficultyClass(17) },
    }),
  };
}

type SpellCastReactionFactsFill = Extract<
  BattleFill,
  { readonly kind: "targetSpatialFacts" }
>;

type CounterspellTriggerFact = Extract<
  SpellCastReactionFactsFill["spatialFacts"][number],
  { readonly kind: "spellCastInterruptionTriggerCasterVisibleWithinRange" }
>;

function spellCastInterruptionReactionTriggerFact(input: {
  readonly reactorId: CombatantId;
  readonly casterId: CombatantId;
}): CounterspellTriggerFact {
  return {
    kind: "spellCastInterruptionTriggerCasterVisibleWithinRange",
    reactorId: input.reactorId,
    casterId: input.casterId,
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spellCastInterruptionReactionUnitId),
    ),
    rangeFeet: movementFeet(60),
  };
}

function spellCastReactionFactsFill(
  spatialFacts: readonly CounterspellTriggerFact[],
): SpellCastReactionFactsFill {
  return {
    kind: "targetSpatialFacts",
    holeId: SPELL_CAST_REACTION_FACTS_HOLE_ID,
    spatialFacts,
  };
}

function requireOngoingEffectMechanics(
  spell: SpellRecord,
): Extract<SpellRecord["mechanics"], { readonly family: "ongoing_effect" }> {
  if (spell.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Flame Blade to be an ongoing-effect spell.");
  }
  return spell.mechanics;
}

function mechanicsSource(
  source: ReturnType<typeof spellAdmissionSource>,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}
