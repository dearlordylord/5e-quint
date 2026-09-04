import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV50D2 command
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-command-drop-held-object spell.invocation-command-halt-grovel
import { battleEffectExecutionRefForTest } from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { battleStateWithSyntheticWeakeningEndTurnSave } from "./command-delegated-end-turn.test-support.ts";
import { describe, expect, test } from "vitest";
import { PositiveInteger, spellSlotLevel } from "@dnd/shared/types";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import {
  requireCharacterSpellProcedureRefForTest,
  characterBonusAttackSubjectForTest,
} from "./battle-runtime.test-support.ts";
import {
  commandLegendaryActorId,
  commandUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  legendaryActionStatBlock,
  requireCombatant,
  requireHole,
  requireResultHole,
  zeroAbilityWeaponAttack,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  spellBattle,
  spellBattleWithTargetReadiedRay,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  savingThrowOutcomeFill,
  spellAct,
  spellActInvocation,
  spellTargetListFill,
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
import { compelledNextTurnBehaviorProfile } from "./battle-reducer/spell-procedure-profiles/compelled-next-turn-behavior.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";
import type {
  AvailableBattleAct,
  BattleFill,
  BattleSubject,
} from "./unit-profile-admission.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleObjectId,
  combatantId,
  discoverBattleActCandidates,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;

function commandMechanics(): ActivationSpellMechanics {
  const mechanics = spellRecord(commandUnitId).mechanics;
  if (mechanics.family !== "activation")
    throw new Error("Expected Command activation mechanics.");
  return mechanics;
}

function syntheticCommandRecord(
  mechanics: ActivationSpellMechanics,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_compelled_behavior_${suffix}`,
    kind: "spell",
    name: `Synthetic Compelled Behavior ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_compelled_behavior_${suffix}`,
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

function malformedCommandSource(
  mutate: (mechanics: ActivationSpellMechanics) => void,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(commandUnitId));
  const mechanics = structuredClone(commandMechanics());
  mutate(mechanics);
  return { ...mechanicsSource(source), mechanics };
}

function issueShape(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}) {
  return result.tag === "unsupported"
    ? (result.issues ?? []).map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("compelledNextTurnBehavior static admission", () => {
  test("projects canonical Command mechanics, evidence, and mechanics-free invocations", () => {
    const source = spellAdmissionSource(spellRecord(commandUnitId));
    const result = compelledNextTurnBehaviorProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 1,
      ability: "wis",
      dc: { kind: "caster_spell_save_dc" },
      targetCount: { base: 1, baseLevel: 1, perSlotAboveBase: 1 },
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
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
      unowned: [],
    });
    const session = spellBattle({
      preparedSpells: [],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected Command caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null)
      throw new Error("Expected Command admission context.");
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        ...context,
        castingSource: source.castingSource,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocations[0]).toMatchObject({
      targeting: { kind: "targetList", minTargets: 1, maxTargets: 2 },
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes renamed synthetic mechanics independently of authored identity", () => {
    const original = compelledNextTurnBehaviorProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spellRecord(commandUnitId))),
    );
    const renamed = compelledNextTurnBehaviorProfile.admitMechanics(
      mechanicsSource(
        spellAdmissionSource(
          syntheticCommandRecord(commandMechanics(), "renamed"),
        ),
      ),
    );
    expect(original.tag).toBe("supported");
    expect(renamed.tag).toBe("supported");
    if (original.tag !== "supported" || renamed.tag !== "supported") return;
    expect(renamed.admitted.facts).toEqual(original.admitted.facts);
    expect(renamed.admitted.evidence).toEqual(original.admitted.evidence);
  });

  test("accumulates exact header and root-shape issues", () => {
    const result = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        Reflect.set(mechanics, "level", 2);
        Reflect.set(mechanics, "school", "illusion");
        Reflect.set(mechanics.castingTime, "kind", "bonus_action");
        Reflect.set(mechanics.range, "feet", 30);
        Reflect.set(mechanics, "syntheticRootFact", true);
      }),
    );
    expect(issueShape(result)).toEqual([
      { failedFact: "mechanics", mechanicsPath: spellMechanicsRootPath() },
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      {
        failedFact: "school",
        mechanicsPath: spellMechanicsHeaderPath("school"),
      },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "castingTime",
        mechanicsPath: spellMechanicsHeaderPath("castingTime"),
      },
    ]);
  });

  test("reports components and duration independently", () => {
    const result = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        Reflect.set(mechanics.components, "s", true);
        Reflect.set(mechanics.duration, "syntheticDurationFact", true);
      }),
    );
    expect(issueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
    ]);
  });

  test("accumulates every independent save, selection, and option-field issue", () => {
    const result = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") throw new Error("Expected save gate.");
        Reflect.set(phase, "ability", "cha");
        Reflect.set(phase.dc, "kind", "fixed");
        Reflect.set(phase.dc, "syntheticDcFact", true);
        Reflect.set(phase.onSuccess, "kind", "damage");
        Reflect.set(phase.onSuccess, "syntheticSuccessFact", true);
        Reflect.set(phase, "syntheticPhaseFact", true);
        Reflect.set(phase, "repeatSaves", [
          { cadence: "end_of_target_turn", onSuccess: "ends_on_target" },
        ]);
        if (
          phase.attachment.kind !== "hole" ||
          phase.attachment.value.kind !== "target" ||
          phase.attachment.value.selection.mode !== "choose_up_to" ||
          typeof phase.attachment.value.selection.count !== "object" ||
          phase.attachment.value.selection.count.kind !== "linear" ||
          phase.onFail.kind !== "compelled_target_next_turn"
        )
          throw new Error("Expected Command mechanics.");
        Reflect.set(phase.attachment.value.selection.count, "base", 2);
        Reflect.set(phase.attachment, "syntheticAttachmentFact", true);
        Reflect.set(phase.attachment, "holeId", "synthetic_target");
        Reflect.set(phase.attachment, "label", "synthetic target");
        Reflect.set(phase.attachment.value.selection, "mode", "choose_exactly");
        Reflect.set(
          phase.attachment.value.selection,
          "syntheticSelectionFact",
          true,
        );
        Reflect.set(phase.attachment.value.selection, "targetKinds", [
          "object",
        ]);
        Reflect.set(phase.onFail, "execution", "synthetic_later_turn");
        Reflect.set(phase.onFail, "syntheticFailureFact", true);
        Reflect.set(phase.onFail.options, "syntheticOption", true);
        Reflect.set(
          phase.onFail.options.approach,
          "syntheticApproachFact",
          true,
        );
        Reflect.set(phase.onFail.options.approach, "route", "synthetic_route");
        Reflect.set(
          phase.onFail.options.approach,
          "endsTurnWhenWithinFeet",
          10,
        );
        Reflect.set(phase.onFail.options.drop, "syntheticDropFact", true);
        Reflect.set(
          phase.onFail.options.drop,
          "objectSet",
          "synthetic_objects",
        );
        Reflect.set(phase.onFail.options.drop, "afterward", "continue_turn");
        Reflect.set(phase.onFail.options.flee, "syntheticFleeFact", true);
        Reflect.set(phase.onFail.options.flee, "direction", "toward_caster");
        Reflect.set(phase.onFail.options.flee, "means", "slowest_available");
        Reflect.set(phase.onFail.options.flee, "duration", "current_turn");
        Reflect.set(phase.onFail.options.grovel, "syntheticGrovelFact", true);
        Reflect.set(phase.onFail.options.grovel, "condition", "restrained");
        Reflect.set(phase.onFail.options.grovel, "afterward", "continue_turn");
        Reflect.set(phase.onFail.options.halt, "syntheticHaltFact", true);
        Reflect.set(phase.onFail.options.halt, "movement", "normal");
        Reflect.set(phase.onFail.options.halt, "action", "one_action");
        Reflect.set(phase.onFail.options.halt, "bonusAction", "one_action");
        Reflect.set(phase.onFail.options.halt, "duration", "current_turn");
      }),
    );
    const phasePath = spellActivationPhasePath(PositiveInteger(1));
    const effectPath = spellActivationEffectPath(
      PositiveInteger(1),
      PositiveInteger(1),
    );
    expect(issueShape(result)).toEqual([
      { failedFact: "phaseShape", mechanicsPath: phasePath },
      { failedFact: "saveAbility", mechanicsPath: phasePath },
      { failedFact: "saveDc", mechanicsPath: phasePath },
      { failedFact: "saveDcShape", mechanicsPath: phasePath },
      { failedFact: "successOutcome", mechanicsPath: phasePath },
      { failedFact: "successShape", mechanicsPath: phasePath },
      {
        failedFact: "repeatSave",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
      {
        failedFact: "attachmentShape",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "attachmentHoleId",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "attachmentLabel",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "selectionShape",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "selectionMode",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "selectionTargetKinds",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      {
        failedFact: "targetCount",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      },
      { failedFact: "failureShape", mechanicsPath: effectPath },
      { failedFact: "failureExecution", mechanicsPath: effectPath },
      { failedFact: "optionsShape", mechanicsPath: effectPath },
      { failedFact: "approachShape", mechanicsPath: effectPath },
      { failedFact: "approachRoute", mechanicsPath: effectPath },
      { failedFact: "approachEndDistance", mechanicsPath: effectPath },
      { failedFact: "dropShape", mechanicsPath: effectPath },
      { failedFact: "dropObjectSet", mechanicsPath: effectPath },
      { failedFact: "dropAfterward", mechanicsPath: effectPath },
      { failedFact: "fleeShape", mechanicsPath: effectPath },
      { failedFact: "fleeDirection", mechanicsPath: effectPath },
      { failedFact: "fleeMeans", mechanicsPath: effectPath },
      { failedFact: "fleeDuration", mechanicsPath: effectPath },
      { failedFact: "grovelShape", mechanicsPath: effectPath },
      { failedFact: "grovelCondition", mechanicsPath: effectPath },
      { failedFact: "grovelAfterward", mechanicsPath: effectPath },
      { failedFact: "haltShape", mechanicsPath: effectPath },
      { failedFact: "haltMovement", mechanicsPath: effectPath },
      { failedFact: "haltAction", mechanicsPath: effectPath },
      { failedFact: "haltBonusAction", mechanicsPath: effectPath },
      { failedFact: "haltDuration", mechanicsPath: effectPath },
    ]);
  });

  test("reports an absent phase at the mechanics root without fabricating an ordinal", () => {
    const result = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        Reflect.set(mechanics, "phases", []);
      }),
    );
    expect(issueShape(result)).toEqual([
      { failedFact: "phaseCount", mechanicsPath: spellMechanicsRootPath() },
    ]);
  });

  test("accumulates attachment discriminants independently", () => {
    const result = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") throw new Error("Expected save gate.");
        Reflect.set(phase.attachment, "kind", "synthetic_attachment");
      }),
    );
    const attachmentPath = spellActivationAttachmentPath(PositiveInteger(1));
    expect(issueShape(result)).toEqual([
      { failedFact: "attachmentShape", mechanicsPath: attachmentPath },
      { failedFact: "attachmentKind", mechanicsPath: attachmentPath },
      { failedFact: "attachmentHoleId", mechanicsPath: attachmentPath },
      { failedFact: "attachmentLabel", mechanicsPath: attachmentPath },
      { failedFact: "attachmentValueKind", mechanicsPath: attachmentPath },
      { failedFact: "selectionShape", mechanicsPath: attachmentPath },
      { failedFact: "selectionMode", mechanicsPath: attachmentPath },
      { failedFact: "selectionTargetKinds", mechanicsPath: attachmentPath },
      { failedFact: "targetCount", mechanicsPath: attachmentPath },
    ]);
  });

  test("preserves the authored phase ordinal and rejects a malformed failure discriminant", () => {
    const unrelated = spellRecord("burning_hands").mechanics;
    if (unrelated.family !== "activation")
      throw new Error("Expected an unrelated activation-phase fixture.");
    const reordered = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        Reflect.set(mechanics, "phases", [
          unrelated.phases[0],
          mechanics.phases[0],
        ]);
      }),
    );
    expect(issueShape(reordered)).toEqual([
      {
        failedFact: "phaseCount",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
      {
        failedFact: "phaseOrder",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(2)),
      },
    ]);

    const malformedFailure = compelledNextTurnBehaviorProfile.admitMechanics(
      malformedCommandSource((mechanics) => {
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") throw new Error("Expected save gate.");
        Reflect.set(phase, "onFail", { kind: "none" });
      }),
    );
    expect(issueShape(malformedFailure)).toEqual([
      {
        failedFact: "failureEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      },
    ]);
  });
});

describe("QMBT14 deterministic Command control option admission", () => {
  test("command is admitted as a target-list save spell with promoted option choices and slot-scaled targets", () => {
    const spell = spellRecord(commandUnitId);
    const secondTargetId = combatantId("unit-profile-command-target-2");
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
      extraTargetIds: [secondTargetId],
    });

    const levelOne = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const levelTwo = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 2,
    });
    const awaitingCommandChoices = resolveBattleSubject({
      state: session.state,
      subject: levelOne.subject,
      fills: [],
    });
    if (awaitingCommandChoices.tag !== "needsHoles") {
      throw new Error("Expected Command target and option choices.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingCommandChoices.snapshot);

    expect({
      ...levelOne.subject,
      invocation: battleActSpellPresentation(levelOne)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        session,
        spellCasterId,
        spellSlotInvocationRef(commandUnitId, 1, "compelledNextTurnBehavior"),
      ),
      mode: { tag: "cast" },
    });
    expect(requireHole(levelOne.initialHoles, "spellTargetList")).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 1,
        choices: expect.arrayContaining([spellTargetId, secondTargetId]),
      }),
    );
    expect(requireHole(levelTwo.initialHoles, "spellTargetList")).toEqual(
      expect.objectContaining({
        minTargets: 1,
        maxTargets: 2,
      }),
    );
    expect(
      requireHole(levelTwo.initialHoles, "compelledBehaviorOptionChoice"),
    ).toEqual(
      expect.objectContaining({
        choices: ["grovel", "halt", "drop", "approach", "flee"],
      }),
    );
    expect(spellActInvocation(session, levelTwo)).toEqual(
      expect.objectContaining({
        procedure: "compelledNextTurnBehavior",
        actionCost: "magicAction",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "wis",
        targeting: { kind: "targetList", minTargets: 1, maxTargets: 2 },
      }),
    );
  });
  test("command Grovel records failed-save pending effects and resolves them on target turn", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "compelledNextTurnBehavior",
        option: "grovel",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellTargetId,
          round: 1,
        },
      }),
    ]);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetActs = discoverBattleActCandidates(targetTurn.state);
    expect(targetActs).toEqual([
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "executeCompelledGrovel",
        }),
        initialHoles: [],
      }),
    ]);
    const grovel = resolveBattleSubject({
      state: targetTurn.state,
      subject: targetActs[0]!.subject,
      fills: [],
    });
    expect(grovel).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellCasterId,
        combatants: [
          expect.anything(),
          expect.objectContaining({
            combatantId: spellTargetId,
            conditions: expect.arrayContaining(["prone"]),
          }),
        ],
      },
    });
    if (grovel.tag !== "resolved") {
      throw new Error("Expected Command Grovel to resolve.");
    }
    expect(requireCombatant(grovel.state, spellTargetId).activeEffects).toEqual(
      [],
    );
  });
  test("command Grovel delegated End Turn keeps one committed state and snapshot until its save resolves", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const savingThrow = requireResultHole(
      resolveBattleSubject({
        state: session.state,
        subject: act.subject,
        fills: [targetFill, optionFill],
      }),
      "savingThrowOutcome",
    );
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Grovel cast to resolve.");
    }
    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const committedState = battleStateWithSyntheticWeakeningEndTurnSave(
      targetTurn.state,
      spellCasterId,
      spellTargetId,
    );
    const grovelAct = discoverBattleActCandidates(committedState)[0];
    if (
      grovelAct === undefined ||
      grovelAct.subject.tag !== "runtimeCommand" ||
      grovelAct.subject.command !== "executeCompelledGrovel"
    ) {
      throw new Error("Expected Command Grovel act.");
    }
    const committedSnapshot = snapshotBattle(committedState);

    const awaitingSave = resolveBattleSubject({
      state: committedState,
      subject: grovelAct.subject,
      fills: [],
    });

    expect(awaitingSave).toMatchObject({
      tag: "needsHoles",
      subject: grovelAct.subject,
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
    if (awaitingSave.tag !== "needsHoles") {
      throw new Error("Expected Command Grovel save frontier.");
    }
    expect(awaitingSave.state).toMatchObject({
      subjectResolutionPhase: {
        kind: "subjectContinuation",
        subject: grovelAct.subject,
      },
    });
    expect(requireCombatant(awaitingSave.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: true }),
    });
    expect(
      requireCombatant(awaitingSave.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "compelledNextTurnBehavior",
          option: "grovel",
        }),
      ]),
    );
    expect(awaitingSave.snapshot).toEqual(snapshotBattle(awaitingSave.state));
    expect(requireCombatant(committedState, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: false }),
      activeEffects: expect.arrayContaining([
        expect.objectContaining({
          kind: "compelledNextTurnBehavior",
          option: "grovel",
        }),
      ]),
    });
    const saveHole = requireResultHole(awaitingSave, "savingThrowOutcome");
    const saveFill = savingThrowOutcomeFill(saveHole, [
      { targetId: spellTargetId, succeeded: true },
    ]);
    const rejectedDuplicate = resolveBattleSubject({
      state: committedState,
      subject: grovelAct.subject,
      fills: [saveFill, saveFill],
    });
    expect(rejectedDuplicate).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "End Turn received duplicate Saving Throw outcome fills.",
    });
    expect(rejectedDuplicate.snapshot).toEqual(committedSnapshot);

    const replayed = resolveBattleSubject({
      state: committedState,
      subject: grovelAct.subject,
      fills: [saveFill],
    });
    expect(replayed).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
    if (replayed.tag !== "resolved") {
      throw new Error("Expected Command Grovel replay to resolve.");
    }
    expect(requireCombatant(replayed.state, spellTargetId)).toMatchObject({
      conditions: expect.objectContaining({ prone: true }),
      activeEffects: [],
    });
  });

  test("a failed Command save opens the target's readied-spell Reaction", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattleWithTargetReadiedRay({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      casterClassLevels: [{ className: "bard", level: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");
    const awaitingReaction = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    expect(
      requireCombatant(declined.state, spellTargetId).activeEffects,
    ).toEqual([
      expect.objectContaining({
        kind: "compelledNextTurnBehavior",
        option: "grovel",
        sourceCombatantId: spellCasterId,
      }),
    ]);
  });

  test("command Halt suppresses target turn Movement, Action, and Bonus Action until end turn", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      statBlockTargets: [
        {
          combatantId: commandLegendaryActorId,
          statBlock: legendaryActionStatBlock(),
          initiative: 5,
        },
      ],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "halt",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Halt cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "compelledNextTurnBehavior",
        option: "halt",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellTargetId,
          round: 1,
        },
      }),
    ]);

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    expect(targetTurn.state.currentTurnResources.compelledHalt).toEqual({
      kind: "compelledHalt",
    });
    expect(targetTurn.state.currentTurnResources.actionResources).toEqual([]);
    expect(targetTurn.state.currentTurnResources.currentHasBonusAction).toBe(
      false,
    );
    expect(targetTurn.snapshot.turn.actionResources).toEqual([]);
    expect(targetTurn.snapshot.turn.bonusActionQuotaAvailable).toBe(false);
    const haltedTargetSnapshot = targetTurn.snapshot.combatants.find(
      (combatant) => combatant.combatantId === spellTargetId,
    );
    if (haltedTargetSnapshot === undefined) {
      throw new Error("Expected halted target snapshot.");
    }
    expect(haltedTargetSnapshot.movement.spentFeet).toBe(
      haltedTargetSnapshot.movement.speedFeet,
    );
    expect(haltedTargetSnapshot.movement.remainingFeet).toBe(movementFeet(0));
    expect(
      haltedTargetSnapshot.movement.speedKinds.every(
        (speedKind) => speedKind.remainingFeet === movementFeet(0),
      ),
    ).toBe(true);
    const haltedActs = discoverBattleActs(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: session.context,
      }),
    );
    const legendaryAct = haltedActs.find(
      (
        candidate,
      ): candidate is AvailableBattleAct & {
        readonly subject: Extract<
          BattleSubject,
          { readonly tag: "action"; readonly action: "attack" }
        >;
      } =>
        candidate.subject.tag === "action" &&
        candidate.subject.action === "attack" &&
        candidate.subject.actorId === commandLegendaryActorId &&
        candidate.summary.includes("Tail Swipe"),
    );
    if (legendaryAct === undefined) {
      throw new Error("Expected Command Halt to leave Legendary Actions open.");
    }
    expect(
      haltedActs.some(
        (candidate) =>
          candidate.subject.actorId === spellTargetId &&
          (candidate.subject.tag === "action" ||
            candidate.subject.tag === "actionSpell" ||
            candidate.subject.tag === "bonusAction" ||
            candidate.subject.tag === "bonusActionStandardAction" ||
            candidate.subject.tag === "bonusActionSpell" ||
            candidate.subject.tag === "bonusActionDashSpell" ||
            (candidate.subject.tag === "runtimeCommand" &&
              (candidate.subject.command === "move" ||
                candidate.subject.command === "standFromProne" ||
                candidate.subject.command === "fixedCostMovementReplacement"))),
      ),
    ).toBe(false);
    expect(haltedActs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          subject: {
            tag: "runtimeCommand",
            actorId: spellTargetId,
            command: "endTurn",
          },
        }),
        expect.objectContaining({
          subject: legendaryAct.subject,
        }),
      ]),
    );
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: legendaryAct.subject,
        fills: [],
      }),
    ).not.toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: { tag: "action", actorId: spellTargetId, action: "dodge" },
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: characterBonusAttackSubjectForTest(
          targetTurn.state,
          spellTargetId,
          "martialArtsUnarmedStrike",
        ),
        fills: [],
      }),
    ).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    const suppressedMove = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "move",
      },
      fills: [],
    });
    expect(suppressedMove).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(suppressedMove).not.toHaveProperty("routeEvents");
    const staleCommandGrovel = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "executeCompelledGrovel",
        effectRef: battleEffectExecutionRefForTest("stale-command-grovel"),
      },
      fills: [],
    });
    expect(staleCommandGrovel).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });
    expect(staleCommandGrovel).not.toHaveProperty("routeEvents");
    const wrongActorHaltEndTurn = resolveBattleSubject({
      state: targetTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(wrongActorHaltEndTurn).toMatchObject({
      tag: "invalid",
      reason: "wrongActor",
      routeEvents: [
        {
          holes: [],
          kind: "resolveBattleSubjectWithoutFill",
          owner: "battleActionEconomy",
          subject: "battleAction",
        },
      ],
    });

    const committedHaltState = battleStateWithSyntheticWeakeningEndTurnSave(
      targetTurn.state,
      spellCasterId,
      spellTargetId,
    );
    const awaitingHaltSave = endTurn({
      state: committedHaltState,
      actorId: spellTargetId,
    });
    expect(awaitingHaltSave).toMatchObject({
      tag: "needsHoles",
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
    });
    if (awaitingHaltSave.tag !== "needsHoles") {
      throw new Error("Expected halted End Turn save frontier.");
    }
    expect(awaitingHaltSave.snapshot).toEqual(
      snapshotBattle(awaitingHaltSave.state),
    );
    expect(awaitingHaltSave.state.currentTurnResources.compelledHalt).toEqual({
      kind: "compelledHalt",
    });
    const haltEndTurnSave = requireResultHole(
      awaitingHaltSave,
      "savingThrowOutcome",
    );
    const ended = endTurn({
      state: committedHaltState,
      actorId: spellTargetId,
      fills: [
        savingThrowOutcomeFill(haltEndTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (ended.tag !== "resolved") {
      throw new Error("Expected halted target End Turn to resolve.");
    }
    expect(requireCombatant(ended.state, spellTargetId).activeEffects).toEqual(
      [],
    );
    expect(ended.state.currentTurnResources.compelledHalt).toBeNull();
  });
  test("command Drop consumes canonical character held-object facts, emits dropped-object outcomes, and ends turn", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      targetAttack: zeroAbilityWeaponAttack("weapon_longsword"),
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "drop",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Drop cast to resolve.");
    }

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const targetBeforeDrop = requireCombatant(targetTurn.state, spellTargetId);
    const targetLoadoutBeforeDrop =
      targetBeforeDrop.origin.kind === "character"
        ? targetBeforeDrop.origin.selectedLoadout
        : null;
    const targetActs = discoverBattleActCandidates(targetTurn.state);
    expect(targetActs).toEqual([
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: spellTargetId,
          command: "executeCompelledDrop",
        }),
        initialHoles: [],
      }),
    ]);
    const committedWithSave = battleStateWithSyntheticWeakeningEndTurnSave(
      targetTurn.state,
      spellCasterId,
      spellTargetId,
    );
    const dropSubject = targetActs[0]!.subject;
    if (
      dropSubject.tag !== "runtimeCommand" ||
      dropSubject.command !== "executeCompelledDrop"
    ) {
      throw new Error("Expected Command Drop subject.");
    }
    const awaitingEndTurnSave = resolveBattleSubject({
      state: committedWithSave,
      subject: dropSubject,
      fills: [],
    });
    expect(awaitingEndTurnSave).toMatchObject({
      tag: "needsHoles",
      subject: dropSubject,
      holes: [expect.objectContaining({ kind: "savingThrowOutcome" })],
    });
    if (awaitingEndTurnSave.tag !== "needsHoles") {
      throw new Error("Expected Command Drop save frontier.");
    }
    expect(awaitingEndTurnSave.state).toMatchObject({
      subjectResolutionPhase: {
        kind: "subjectContinuation",
        subject: dropSubject,
      },
    });
    expect(
      requireCombatant(awaitingEndTurnSave.state, spellTargetId).activeEffects,
    ).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "compelledNextTurnBehavior",
          option: "drop",
        }),
      ]),
    );
    expect(awaitingEndTurnSave).not.toHaveProperty("droppedObjects");
    expect(awaitingEndTurnSave.snapshot).toEqual(
      snapshotBattle(awaitingEndTurnSave.state),
    );
    const endTurnSave = requireResultHole(
      awaitingEndTurnSave,
      "savingThrowOutcome",
    );
    const resolvedDelegation = resolveBattleSubject({
      state: committedWithSave,
      subject: dropSubject,
      fills: [
        savingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    expect(resolvedDelegation).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        expect.objectContaining({
          kind: "objectDropped",
          actorId: spellTargetId,
          objectId: battleObjectId("main:weapon_longsword"),
        }),
      ],
    });

    const dropped = resolveBattleSubject({
      state: targetTurn.state,
      subject: targetActs[0]!.subject,
      fills: [],
    });
    expect(dropped).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        {
          kind: "objectDropped",
          actorId: spellTargetId,
          objectId: battleObjectId("main:weapon_longsword"),
          source: {
            kind: "spell",
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: expect.any(String),
          },
        },
      ],
      snapshot: { currentActorId: spellCasterId },
    });
    if (dropped.tag !== "resolved") {
      throw new Error("Expected Command Drop to resolve.");
    }
    expect(dropped.droppedObjects).toHaveLength(1);
    expect(
      requireCombatant(dropped.state, spellTargetId).activeEffects,
    ).toEqual([]);
    const targetAfterDrop = requireCombatant(dropped.state, spellTargetId);
    expect(
      targetAfterDrop.origin.kind === "character"
        ? targetAfterDrop.origin.selectedLoadout
        : null,
    ).toEqual(targetLoadoutBeforeDrop);
  });
  test("command Drop requires table held-object facts when no canonical loadout facts exist", () => {
    const spell = spellRecord(commandUnitId);
    const statBlockTargetId = combatantId(
      "unit-profile-command-drop-statblock",
    );
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
      statBlockTargets: [
        {
          combatantId: statBlockTargetId,
          statBlock: legendaryActionStatBlock(),
          initiative: 15,
        },
      ],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [statBlockTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "drop",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");
    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: statBlockTargetId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command Drop cast to resolve.");
    }

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const dropAct = discoverBattleActCandidates(targetTurn.state)[0];
    expect(dropAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "runtimeCommand",
          actorId: statBlockTargetId,
          command: "executeCompelledDrop",
        }),
        initialHoles: [expect.objectContaining({ kind: "heldObjectFacts" })],
      }),
    );
    if (
      dropAct === undefined ||
      dropAct.subject.tag !== "runtimeCommand" ||
      dropAct.subject.command !== "executeCompelledDrop"
    ) {
      throw new Error("Expected Command Drop act.");
    }
    const missingFacts = resolveBattleSubject({
      state: targetTurn.state,
      subject: dropAct.subject,
      fills: [],
    });
    expect(missingFacts).toMatchObject({
      tag: "needsHoles",
      holes: [expect.objectContaining({ kind: "heldObjectFacts" })],
    });

    const heldObjectFacts = requireHole(
      dropAct.initialHoles,
      "heldObjectFacts",
    );
    const knownEmpty = resolveBattleSubject({
      state: targetTurn.state,
      subject: dropAct.subject,
      fills: [
        {
          kind: "heldObjectFacts",
          holeId: heldObjectFacts.holeId,
          value: { objectIds: [] },
        },
      ],
    });
    expect(knownEmpty).toMatchObject({
      tag: "resolved",
      droppedObjects: [],
      snapshot: { currentActorId: spellTargetId },
    });

    const knownHeld = resolveBattleSubject({
      state: targetTurn.state,
      subject: dropAct.subject,
      fills: [
        {
          kind: "heldObjectFacts",
          holeId: heldObjectFacts.holeId,
          value: {
            objectIds: [
              battleObjectId("statblock:main-hand"),
              battleObjectId("statblock:off-hand"),
            ],
          },
        },
      ],
    });
    expect(knownHeld).toMatchObject({
      tag: "resolved",
      droppedObjects: [
        expect.objectContaining({
          objectId: battleObjectId("statblock:main-hand"),
        }),
        expect.objectContaining({
          objectId: battleObjectId("statblock:off-hand"),
        }),
      ],
      snapshot: { currentActorId: spellTargetId },
    });
  });
  test("command Grovel save success spends the cast without pending effects", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellTargetId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });

    expect(cast).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { actionResources: [] } },
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Command cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellTargetId).activeEffects).toEqual(
      [],
    );
  });
  test("self-target command Grovel cannot resolve before the caster's next turn", () => {
    const spell = spellRecord(commandUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 1, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: commandUnitId,
      slotLevel: 1,
    });
    const targetHole = requireHole(act.initialHoles, "spellTargetList");
    const commandOption = requireHole(
      act.initialHoles,
      "compelledBehaviorOptionChoice",
    );
    const targetFill = spellTargetListFill(
      targetHole,
      spellCasterId,
      commandUnitId,
      [spellCasterId],
    );
    const optionFill: Extract<
      BattleFill,
      { readonly kind: "compelledBehaviorOptionChoice" }
    > = {
      kind: "compelledBehaviorOptionChoice",
      holeId: commandOption.holeId,
      value: "grovel",
    };
    const needsSave = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [targetFill, optionFill],
    });
    const savingThrow = requireResultHole(needsSave, "savingThrowOutcome");

    const cast = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        targetFill,
        optionFill,
        savingThrowOutcomeFill(savingThrow, [
          { targetId: spellCasterId, succeeded: false },
        ]),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected self-target Command cast to resolve.");
    }
    expect(requireCombatant(cast.state, spellCasterId).activeEffects).toEqual([
      expect.objectContaining({
        kind: "compelledNextTurnBehavior",
        option: "grovel",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        expiresAt: {
          kind: "endOfTurn",
          combatantId: spellCasterId,
          round: 2,
        },
      }),
    ]);

    const prematureGrovel = resolveBattleSubject({
      state: cast.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "executeCompelledGrovel",
        effectRef: battleEffectExecutionRefForTest("premature-command-grovel"),
      },
      fills: [],
    });
    expect(prematureGrovel).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
    });

    const targetTurn = endTurn({ state: cast.state, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const nextCasterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    if (nextCasterTurn.tag !== "resolved") {
      throw new Error("Expected target End Turn to resolve.");
    }
    const casterActs = discoverBattleActCandidates(nextCasterTurn.state);
    const grovelAct = casterActs.find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "executeCompelledGrovel" &&
        candidate.subject.actorId === spellCasterId,
    );
    expect(grovelAct).toBeDefined();
    if (grovelAct === undefined) {
      throw new Error("Expected self-target Command Grovel act.");
    }

    const grovel = resolveBattleSubject({
      state: nextCasterTurn.state,
      subject: grovelAct.subject,
      fills: [],
    });
    expect(grovel).toMatchObject({
      tag: "resolved",
      snapshot: {
        currentActorId: spellTargetId,
        combatants: [
          expect.objectContaining({
            combatantId: spellCasterId,
            conditions: expect.arrayContaining(["prone"]),
          }),
          expect.anything(),
        ],
      },
    });
  });
});
