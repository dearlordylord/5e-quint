// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-LEVITATE-CREATURE-RUNTIME levitate
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-levitated-creature
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.LEVITATED_CREATURE_LIFECYCLE
import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  BattleFill,
  BattleHole,
  BattleState,
  CombatantId,
} from "./index.ts";
import {
  levitateUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  knownWillingSpellTargetFill,
  savingThrowOutcomeFill,
  spellAct,
  spellTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { controlledVerticalSuspensionProfile } from "./battle-reducer/spell-procedure-profiles/levitated-creature.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";
import type { SpellAdmissionContext } from "./battle-reducer/spell-procedure-profiles/profile.ts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
} from "./battle-runtime.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  breakBattleConcentration,
  discoverBattleActCandidates,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  resolveBattleSubject,
} from "./unit-profile-admission.test-support.ts";
import { spellProcedureBoundToActiveEffect } from "./battle-reducer/spell-active-effect-binding.ts";

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;

function levitateMechanics(): ActivationSpellMechanics {
  const mechanics = spellRecord(levitateUnitId).mechanics;
  if (mechanics.family !== "activation")
    throw new Error("Expected Levitate activation mechanics.");
  return mechanics;
}

function syntheticSuspensionRecord(
  mechanics: ActivationSpellMechanics,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_vertical_suspension_${suffix}`,
    kind: "spell",
    name: `Synthetic Vertical Suspension ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_vertical_suspension_${suffix}`,
    },
    mechanics,
  });
}

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function malformedSuspensionSource(
  mutate: (mechanics: ActivationSpellMechanics) => void,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(levitateUnitId));
  const mechanics = structuredClone(levitateMechanics());
  mutate(mechanics);
  return { ...mechanicsSource(source), mechanics };
}

function issueShape(
  result: ReturnType<typeof controlledVerticalSuspensionProfile.admitMechanics>,
) {
  return result.tag === "unsupported"
    ? result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("controlledVerticalSuspension static mechanics admission", () => {
  test("projects creature execution facts with exact partial-root evidence", () => {
    const source = spellAdmissionSource(spellRecord(levitateUnitId));
    const result = controlledVerticalSuspensionProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      rangeFeet: 60,
      duration: {
        kind: "concentration",
        upTo: { amount: 10, unit: "minute" },
      },
      ability: "con",
      dc: { kind: "caster_spell_save_dc" },
      maxInitialRiseFeet: 20,
      maxAltitudeChangeFeet: 20,
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
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
      unowned: [spellActivationAttachmentPath(PositiveInteger(1))],
    });

    const session = spellBattle({
      preparedSpells: [],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected the spell caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) throw new Error("Expected spell admission context.");
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        ...context,
        castingSource: source.castingSource,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      procedure: "controlledVerticalSuspension",
      ability: "con",
      rangeFeet: 60,
      maxInitialRiseFeet: 20,
      maxAltitudeChangeFeet: 20,
      activeEffect: {
        kind: "controlledVerticalSuspension",
        expiresAt: { kind: "concentration", durationTicks: 100 },
      },
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes renamed synthetic mechanics without authored identity dispatch", () => {
    const original = spellAdmissionSource(spellRecord(levitateUnitId));
    const renamed = spellAdmissionSource(
      syntheticSuspensionRecord(levitateMechanics(), "renamed"),
    );
    const originalResult = controlledVerticalSuspensionProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = controlledVerticalSuspensionProfile.admitMechanics(
      mechanicsSource(renamed),
    );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported" || renamedResult.tag !== "supported")
      return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );

    const session = spellBattle({
      preparedSpells: [],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected the spell caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) throw new Error("Expected spell admission context.");
    const admissionContext: SpellAdmissionContext = {
      ...context,
      castingSource: original.castingSource,
      spellCastOptions: [
        { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
      ],
    };
    const originalInvocation = originalResult.admitted.admit(
      battleSpellExecutionSourceFromAdmission(original),
      admissionContext,
    )[0];
    const renamedInvocation = renamedResult.admitted.admit(
      battleSpellExecutionSourceFromAdmission(renamed),
      admissionContext,
    )[0];
    expect(originalInvocation).toBeDefined();
    expect(renamedInvocation).toBeDefined();
    if (originalInvocation === undefined || renamedInvocation === undefined)
      return;
    expect({
      access: renamedInvocation.access,
      resource: renamedInvocation.resource,
      procedure: renamedInvocation.procedure,
      actionCost: renamedInvocation.actionCost,
      ability: renamedInvocation.ability,
      dc: renamedInvocation.dc,
      targeting: renamedInvocation.targeting,
      rangeFeet: renamedInvocation.rangeFeet,
      maxInitialRiseFeet: renamedInvocation.maxInitialRiseFeet,
      maxAltitudeChangeFeet: renamedInvocation.maxAltitudeChangeFeet,
      activeEffect: renamedInvocation.activeEffect,
    }).toEqual({
      access: originalInvocation.access,
      resource: originalInvocation.resource,
      procedure: originalInvocation.procedure,
      actionCost: originalInvocation.actionCost,
      ability: originalInvocation.ability,
      dc: originalInvocation.dc,
      targeting: originalInvocation.targeting,
      rangeFeet: originalInvocation.rangeFeet,
      maxInitialRiseFeet: originalInvocation.maxInitialRiseFeet,
      maxAltitudeChangeFeet: originalInvocation.maxAltitudeChangeFeet,
      activeEffect: originalInvocation.activeEffect,
    });
    expect(renamedInvocation.spell).not.toHaveProperty("mechanics");
  });

  test("does not represent an unrelated activation spell root", () => {
    const source = spellAdmissionSource(spellRecord("command"));
    expect(
      controlledVerticalSuspensionProfile.admitMechanics(
        mechanicsSource(source),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test("accumulates independent complete-root and nested branch issues", () => {
    const result = controlledVerticalSuspensionProfile.admitMechanics(
      malformedSuspensionSource((mechanics) => {
        Reflect.set(mechanics, "unexpectedRootFact", true);
        Reflect.set(mechanics.components, "v", false);
        if (mechanics.duration.kind !== "concentration")
          throw new Error("Expected the Levitate concentration duration.");
        Reflect.set(mechanics.duration.upTo, "amount", 9);
        const phase = mechanics.phases[0];
        if (
          phase?.kind !== "save_gate" ||
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target" ||
          phase.onFail.kind !== "levitate_target"
        )
          throw new Error("Expected the Levitate save gate.");
        Reflect.set(phase, "ability", "wis");
        Reflect.set(phase.attachment.value.selection, "mode", "choose_up_to");
        Reflect.set(phase.onFail.targetMovement, "movementMode", "walking");
      }),
    );

    expect(issueShape(result)).toEqual([
      { failedFact: "mechanics", mechanicsPath: spellMechanicsRootPath() },
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "saveAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
      {
        failedFact: "targetSelection",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "targetMovement",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });

  test("reports unsupported material and duration children at their nested paths", () => {
    const result = controlledVerticalSuspensionProfile.admitMechanics(
      malformedSuspensionSource((mechanics) => {
        Reflect.set(mechanics.components, "materialCostGp", 5);
        Reflect.set(mechanics.components, "materialConsumed", true);
        if (mechanics.duration.kind !== "concentration")
          throw new Error("Expected the Levitate concentration duration.");
        Reflect.set(mechanics.duration.upTo, "upcastTiers", [
          { atSlot: 3, amount: 20 },
        ]);
        Reflect.set(mechanics.duration, "earlyEnd", [
          { kind: "target_takes_damage" },
        ]);
      }),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("cost"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("consumption"),
      },
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
      {
        failedFact: "durationValue",
        mechanicsPath: spellDurationValuePath(),
      },
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
    ]);
  });
});

describe("L12G deterministic Levitate creature admission", () => {
  test("levitate admits the creature branch as a level-2 Magic Action Spell Slot profile", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef: expect.any(String),
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
      }),
    );
    expect(act.initialHoles).toEqual([
      expect.objectContaining({ kind: "targetChoice" }),
    ]);
  });

  test("known willing creature target receives a concentration-owned suspended altitude projection", () => {
    const cast = castWillingLevitate({ initialRiseFeet: 12 });
    const target = requireCombatant(cast.state, spellTargetId);

    expect(requireLevitatedEffect(cast.state)).toEqual(
      expect.objectContaining({
        kind: "controlledVerticalSuspension",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        altitudeFeet: movementFeet(12),
        maxAltitudeChangeFeet: movementFeet(20),
        rangeFeet: movementFeet(60),
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(100),
        },
      }),
    );
    expect(target.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "controlledVerticalSuspension",
        sourceCombatantId: spellCasterId,
        altitudeFeet: movementFeet(12),
      }),
    );
    expect(target.activeEffects[0]).not.toHaveProperty("rangeFeet");
    expect(target.activeEffects[0]).not.toHaveProperty("maxAltitudeChangeFeet");
  });

  test("unwilling creature save success spends the slot without levitating or starting concentration", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const state = session.state;
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsSave).toMatchObject({ tag: "needsHoles" });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Levitate save hole.");
    }
    const saveHole = requireHole(needsSave.holes, "savingThrowOutcome");
    const saved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(saved).toMatchObject({
      tag: "resolved",
      snapshot: {
        turn: { actionResources: [] },
      },
    });
    if (saved.tag !== "resolved") {
      throw new Error("Expected successful Levitate save resolution.");
    }
    expect(
      requireCombatant(saved.state, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(saved.state, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);
  });

  test("unwilling creature save success rejects an inert initial-rise fill", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const state = session.state;
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsSave = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsSave).toMatchObject({ tag: "needsHoles" });
    if (needsSave.tag !== "needsHoles") {
      throw new Error("Expected Levitate save hole.");
    }
    const saveHole = requireHole(needsSave.holes, "savingThrowOutcome");
    const needsInitialRise = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
    if (needsInitialRise.tag !== "needsHoles") {
      throw new Error("Expected Levitate initial-rise hole.");
    }
    const initialRiseHole = requireHole(
      needsInitialRise.holes,
      "controlledVerticalSuspensionInitialRise",
    );

    const invalid = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        savingThrowOutcomeFill(saveHole, [
          { targetId: spellTargetId, succeeded: true },
        ]),
        controlledVerticalSuspensionInitialRiseFill(initialRiseHole, 5),
      ],
    });
    expect(invalid).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Successful ControlledVerticalSuspension creature saves are unaffected and do not use an initial-rise fill.",
    });
  });

  test("levitate creature cast requires a caller-selected initial rise up to 20 feet", () => {
    const spell = spellRecord(levitateUnitId);
    const session = levitateSpellBattle(spell);
    const state = session.state;
    const act = spellAct({
      session,
      spellId: levitateUnitId,
      slotLevel: 2,
    });
    const targetHole = requireHole(act.initialHoles, "targetChoice");
    const needsInitialRise = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
      ],
    });
    expect(needsInitialRise).toMatchObject({ tag: "needsHoles" });
    if (needsInitialRise.tag !== "needsHoles") {
      throw new Error("Expected Levitate initial-rise hole.");
    }
    const initialRiseHole = requireHole(
      needsInitialRise.holes,
      "controlledVerticalSuspensionInitialRise",
    );

    const tooHigh = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        controlledVerticalSuspensionInitialRiseFill(initialRiseHole, 25),
      ],
    });
    expect(tooHigh).toMatchObject({ tag: "invalid" });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        knownWillingSpellTargetFill(
          targetHole,
          levitateUnitId,
          spellCasterId,
          spellTargetId,
        ),
        controlledVerticalSuspensionInitialRiseFill(initialRiseHole, 5),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Levitate with selected initial rise.");
    }
    expect(requireLevitatedEffect(resolved.state).altitudeFeet).toBe(
      movementFeet(5),
    );
  });

  test("levitated target movement requires a fixed-object or surface witness and can change self altitude", () => {
    const cast = castWillingLevitate();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn.");
    }
    const moveAct = discoverBattleActCandidates(targetTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move",
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected target move act.");
    }
    const movementHole = requireHole(moveAct.initialHoles, "movement");

    const missingWitness = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
        }),
      ],
    });
    expect(missingWitness).toMatchObject({ tag: "invalid" });

    const underpaidClimbingCost = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 5,
          provokedOpportunityAttacks: [],
          controlledVerticalSuspensionMovement: {
            kind: "controlledVerticalSuspensionMovement",
            effectRef: requireLevitatedEffect(targetTurn.state).effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: requireLevitatedEffect(targetTurn.state)
              .sourceProcedureRef,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "down",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(underpaidClimbingCost).toMatchObject({
      tag: "invalid",
      message:
        "ControlledVerticalSuspension movement must spend the altitude-change distance as climbing, plus any area movement costs.",
    });

    const moved = resolveBattleSubject({
      state: targetTurn.state,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          controlledVerticalSuspensionMovement: {
            kind: "controlledVerticalSuspensionMovement",
            effectRef: requireLevitatedEffect(targetTurn.state).effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: requireLevitatedEffect(targetTurn.state)
              .sourceProcedureRef,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "down",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected witnessed Levitate movement.");
    }
    expect(requireLevitatedEffect(moved.state).altitudeFeet).toBe(
      movementFeet(15),
    );
  });

  test("caster Magic Action altitude control requires range facts and rejects stale acts", () => {
    const cast = castWillingLevitate();
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster end turn.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected target end turn.");
    }
    const altitudeAct = discoverBattleActCandidates(nextCasterTurn.state).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command ===
          "controlledVerticalSuspensionAltitudeControl",
    );
    expect(altitudeAct).toBeDefined();
    if (altitudeAct === undefined) {
      throw new Error("Expected Levitate altitude control act.");
    }
    const hole = requireHole(
      altitudeAct.initialHoles,
      "controlledVerticalSuspensionAltitudeChange",
    );
    const levitated = requireLevitatedEffect(nextCasterTurn.state);
    const witnessedAltitudeChange =
      controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, [
        {
          kind: "controlledVerticalSuspensionTargetWithinRange",
          effectRef: levitated.effectRef,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: levitated.sourceProcedureRef,
          targetId: spellTargetId,
          rangeFeet: movementFeet(60),
        },
      ]);
    const missingFact = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: altitudeAct.subject,
      fills: [
        controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, []),
      ],
    });
    expect(missingFact).toMatchObject({ tag: "invalid" });
    expect(
      resolveBattleSubject({
        state: breakBattleConcentration(nextCasterTurn.state, spellCasterId),
        subject: altitudeAct.subject,
        fills: [witnessedAltitudeChange],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "ControlledVerticalSuspension altitude control is no longer active for the target.",
    });

    const raised = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: altitudeAct.subject,
      fills: [witnessedAltitudeChange],
    });
    expect(raised).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (raised.tag !== "resolved") {
      throw new Error("Expected Levitate altitude control.");
    }
    expect(requireLevitatedEffect(raised.state).altitudeFeet).toBe(
      movementFeet(30),
    );
    expect(
      resolveBattleSubject({
        state: raised.state,
        subject: altitudeAct.subject,
        fills: [witnessedAltitudeChange],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Magic action is no longer available for ControlledVerticalSuspension altitude control.",
    });
  });

  test("altitude control mutates only the selected Levitate occurrence", () => {
    const cast = castWillingLevitate();
    const casterTurn = advanceToNextCasterTurn(cast.state);
    const original = requireLevitatedEffect(casterTurn);
    const targetBeforeAllocation = requireCombatant(casterTurn, spellTargetId);
    const casterBeforeAllocation = requireCombatant(casterTurn, spellCasterId);
    const twoOccurrences = battleStateWithAllocatedEffectForTest({
      state: casterTurn,
      ownerId: spellTargetId,
      effect: {
        kind: "controlledVerticalSuspension",
        sourceProcedureRef: original.sourceProcedureRef,
        sourceCombatantId: original.sourceCombatantId,
        altitudeFeet: original.altitudeFeet,
        expiresAt: original.expiresAt,
      },
    });
    const targetAfterAllocation = requireCombatant(
      twoOccurrences,
      spellTargetId,
    );
    const casterAfterAllocation = requireCombatant(
      twoOccurrences,
      spellCasterId,
    );
    const selected = targetAfterAllocation.activeEffects.find(
      (effect) =>
        effect.kind === "controlledVerticalSuspension" &&
        effect.effectRef !== original.effectRef,
    );
    if (selected?.kind !== "controlledVerticalSuspension") {
      throw new Error("Expected a second allocated Levitate occurrence.");
    }
    expect(Number(targetAfterAllocation.nextEffectOrdinal)).toBe(
      Number(targetBeforeAllocation.nextEffectOrdinal) + 1,
    );
    expect(casterAfterAllocation.nextEffectOrdinal).toBe(
      casterBeforeAllocation.nextEffectOrdinal,
    );
    expect(
      casterAfterAllocation.activeEffects.some(
        (effect) => effect.effectRef === selected.effectRef,
      ),
    ).toBe(false);
    const altitudeAct = discoverBattleActCandidates(twoOccurrences).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command ===
          "controlledVerticalSuspensionAltitudeControl" &&
        candidate.subject.effectRef === selected.effectRef,
    );
    if (altitudeAct === undefined) {
      throw new Error("Expected the selected Levitate occurrence control act.");
    }
    const hole = requireHole(
      altitudeAct.initialHoles,
      "controlledVerticalSuspensionAltitudeChange",
    );
    expect(hole.effectRef).toBe(selected.effectRef);
    const awaitingAltitudeChange = resolveBattleSubject({
      state: twoOccurrences,
      subject: altitudeAct.subject,
      fills: [],
    });
    if (awaitingAltitudeChange.tag !== "needsHoles") {
      throw new Error("Expected Levitate altitude-change hole.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingAltitudeChange.snapshot);
    const staleRangeFact = {
      kind: "controlledVerticalSuspensionTargetWithinRange" as const,
      effectRef: original.effectRef,
      sourceCombatantId: spellCasterId,
      sourceProcedureRef: original.sourceProcedureRef,
      targetId: spellTargetId,
      rangeFeet: movementFeet(60),
    };
    expect(
      resolveBattleSubject({
        state: twoOccurrences,
        subject: altitudeAct.subject,
        fills: [
          controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, [
            staleRangeFact,
          ]),
        ],
      }),
    ).toMatchObject({ tag: "invalid" });
    const raised = resolveBattleSubject({
      state: twoOccurrences,
      subject: altitudeAct.subject,
      fills: [
        controlledVerticalSuspensionAltitudeChangeFill(hole, "up", 10, [
          {
            kind: "controlledVerticalSuspensionTargetWithinRange",
            effectRef: selected.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: selected.sourceProcedureRef,
            targetId: spellTargetId,
            rangeFeet: movementFeet(60),
          },
        ]),
      ],
    });
    expect(raised).toMatchObject({ tag: "resolved" });
    if (raised.tag !== "resolved") {
      throw new Error("Expected exact-occurrence altitude control to resolve.");
    }
    assertBattleSnapshotCodecRoundTripForTest(raised.snapshot);
    const levitateEffects = requireCombatant(
      raised.state,
      spellTargetId,
    ).activeEffects.filter(
      (effect) => effect.kind === "controlledVerticalSuspension",
    );
    expect(levitateEffects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          effectRef: original.effectRef,
          altitudeFeet: movementFeet(20),
        }),
        expect.objectContaining({
          effectRef: selected.effectRef,
          altitudeFeet: movementFeet(30),
        }),
      ]),
    );
  });

  test("self-target Levitate uses movement, not a caster Magic Action, to change altitude", () => {
    const cast = castWillingLevitate({
      targetId: spellCasterId,
      initialRiseFeet: 10,
    });
    const casterTurn = advanceToNextCasterTurn(cast.state);
    expect(
      discoverBattleActCandidates(casterTurn).some(
        (candidate) =>
          candidate.subject.tag === "runtimeCommand" &&
          candidate.subject.command ===
            "controlledVerticalSuspensionAltitudeControl",
      ),
    ).toBe(false);
    const moveAct = discoverBattleActCandidates(casterTurn).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "move",
    );
    expect(moveAct).toBeDefined();
    if (moveAct === undefined) {
      throw new Error("Expected self-target move act.");
    }
    const movementHole = requireHole(moveAct.initialHoles, "movement");
    const moved = resolveBattleSubject({
      state: casterTurn,
      subject: moveAct.subject,
      fills: [
        movementFill(movementHole, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          controlledVerticalSuspensionMovement: {
            kind: "controlledVerticalSuspensionMovement",
            effectRef: requireLevitatedEffect(casterTurn, spellCasterId)
              .effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: requireLevitatedEffect(
              casterTurn,
              spellCasterId,
            ).sourceProcedureRef,
            fixedObjectOrSurfaceWithinReach: true,
            altitudeChange: {
              direction: "up",
              distanceFeet: movementFeet(5),
            },
          },
        }),
      ],
    });
    expect(moved).toMatchObject({ tag: "resolved" });
    if (moved.tag !== "resolved") {
      throw new Error("Expected self-target Levitate movement.");
    }
    expect(
      requireLevitatedEffect(moved.state, spellCasterId).altitudeFeet,
    ).toBe(movementFeet(15));
  });

  test("concentration and duration cleanup remove the levitated creature projection", () => {
    const cast = castWillingLevitate();
    const concentrationBroken = breakBattleConcentration(
      cast.state,
      spellCasterId,
    );
    expect(
      requireCombatant(concentrationBroken, spellCasterId).concentration,
    ).toBeNull();
    expect(
      requireCombatant(concentrationBroken, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);

    const target = requireCombatant(cast.state, spellTargetId);
    const nearlyExpired: BattleState = {
      ...cast.state,
      combatants: new Map(cast.state.combatants).set(spellTargetId, {
        ...target,
        activeEffects: target.activeEffects.map((effect) =>
          effect.kind === "controlledVerticalSuspension" &&
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
    expect(
      requireCombatant(expired, spellTargetId).activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);
  });

  test("Levitate concentration cleanup preserves an unrelated target resistance", () => {
    const cast = castWillingLevitate();
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-levitate-unrelated-resistance",
    );
    const state = battleStateWithAllocatedEffectForTest({
      state: cast.state,
      ownerId: spellTargetId,
      effect: {
        kind: "damageResistance" as const,
        sourceProcedureRef: unrelatedSource,
        sourceCombatantId: spellTargetId,
        damageType: "cold" as const,
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(10),
        },
      },
    });

    const broken = breakBattleConcentration(state, spellCasterId);
    const brokenTarget = requireCombatant(broken, spellTargetId);
    expect(brokenTarget.activeEffects).toContainEqual(
      expect.objectContaining({
        kind: "damageResistance",
        sourceProcedureRef: unrelatedSource,
        damageType: "cold",
      }),
    );
    expect(
      brokenTarget.activeEffects.some(
        (effect) => effect.kind === "controlledVerticalSuspension",
      ),
    ).toBe(false);
  });
});

function castWillingLevitate(
  input: {
    readonly initialRiseFeet?: number;
    readonly targetId?: CombatantId;
  } = {},
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const spell = spellRecord(levitateUnitId);
  const session = levitateSpellBattle(spell);
  const state = session.state;
  const act = spellAct({
    session,
    spellId: levitateUnitId,
    slotLevel: 2,
  });
  const targetHole = requireHole(act.initialHoles, "targetChoice");
  const targetId = input.targetId ?? spellTargetId;
  const needsInitialRise = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        targetId,
      ),
    ],
  });
  if (needsInitialRise.tag !== "needsHoles") {
    throw new Error("Expected Levitate initial-rise hole.");
  }
  const initialRiseHole = requireHole(
    needsInitialRise.holes,
    "controlledVerticalSuspensionInitialRise",
  );
  const resolved = resolveBattleSubject({
    state,
    subject: act.subject,
    fills: [
      knownWillingSpellTargetFill(
        targetHole,
        levitateUnitId,
        spellCasterId,
        targetId,
      ),
      controlledVerticalSuspensionInitialRiseFill(
        initialRiseHole,
        input.initialRiseFeet ?? 20,
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Levitate to resolve.");
  }
  return resolved;
}

function levitateSpellBattle(spell: ReturnType<typeof spellRecord>) {
  return spellBattle({
    preparedSpells: [spell],
    spellSlots: [{ spellLevel: 2, count: 2 }],
  });
}

function requireLevitatedEffect(
  state: BattleState,
  targetId: CombatantId = spellTargetId,
) {
  const target = requireCombatant(state, targetId);
  const effect = target.activeEffects.find(
    (candidate) => candidate.kind === "controlledVerticalSuspension",
  );
  if (effect === undefined) {
    throw new Error("Expected Levitate active effect.");
  }
  const facts = spellProcedureBoundToActiveEffect(state, effect);
  if (facts?.procedure !== "controlledVerticalSuspension") {
    throw new Error("Expected bound Levitate procedure facts.");
  }
  return {
    ...effect,
    maxAltitudeChangeFeet: facts.maxAltitudeChangeFeet,
    rangeFeet: facts.rangeFeet,
  };
}

function controlledVerticalSuspensionAltitudeChangeFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
  >,
  direction: "up" | "down",
  distanceFeet: number,
  spatialFacts: Extract<
    BattleFill,
    { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
  >["spatialFacts"],
): Extract<
  BattleFill,
  { readonly kind: "controlledVerticalSuspensionAltitudeChange" }
> {
  return {
    kind: "controlledVerticalSuspensionAltitudeChange",
    holeId: hole.holeId,
    value: { direction, distanceFeet: movementFeet(distanceFeet) },
    spatialFacts,
  };
}

function controlledVerticalSuspensionInitialRiseFill(
  hole: Extract<
    BattleHole,
    { readonly kind: "controlledVerticalSuspensionInitialRise" }
  >,
  distanceFeet: number,
): Extract<
  BattleFill,
  { readonly kind: "controlledVerticalSuspensionInitialRise" }
> {
  return {
    kind: "controlledVerticalSuspensionInitialRise",
    holeId: hole.holeId,
    value: { distanceFeet: movementFeet(distanceFeet) },
  };
}

function advanceToNextCasterTurn(state: BattleState): BattleState {
  const targetTurn = endTurn({
    state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster end turn.");
  }
  const casterTurn = endTurn({
    state: targetTurn.state,
    actorId: spellTargetId,
  });
  if (casterTurn.tag !== "resolved") {
    throw new Error("Expected target end turn.");
  }
  return casterTurn.state;
}
