import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING dispel_magic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ongoing-spell-ending
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
// RAW: .references/srd-5.2.1/Spells/Descriptions-A-D.md#Dispel-Magic
import {
  assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  requireCharacterSpellProcedureRefForTest,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  magicSuppressionEmanationEffectTemplateForTest,
  magicSuppressionEmanationMembershipForTest,
} from "./antimagic-field.test-support.ts";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  characterLevel,
  proficiencyBonusForCharacterLevel,
  Round,
  PositiveInteger,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  ActivationPhase,
  SpellMechanics,
  SpellRecord,
} from "@dnd/surface/surface/types";
import { Schema } from "effect";
import * as Result from "effect/Result";
import { describe, expect, test } from "vitest";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import {
  allocateBattleEffectExecutionRefForCreature,
  type BattleActiveEffectOccurrenceTemplate,
} from "./effect-execution-ref.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import type {
  BattleActiveEffect,
  BattleCreatureState,
  BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleStoredLightEmitterTemplate,
} from "./battle-state-execution.ts";
import {
  BattleCheckpointFrontierEnvelopeSchema,
  BattleHoleSchema,
  BattleSnapshotSchema,
} from "./index.ts";
import {
  antimagicFieldUnitId,
  continualFlameUnitId,
  dispelMagicUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireHole,
  requireCombatant,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { ongoingSpellEndProfile } from "./battle-reducer/spell-procedure-profiles/ongoing-spell-end.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./battle-reducer/spell-procedure-profiles/profile.ts";
import { spellRuleExecutionFactsWithCastingSource } from "./procedure-execution/spell-rule-facts.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  canSpendAction,
  classLevel,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
} from "./unit-profile-admission.test-support.ts";

type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];

type DispelMagicMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;

function dispelMechanicsSource(
  source: ReturnType<typeof spellAdmissionSource>,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function mutatedDispelMechanics(
  mutate: (mechanics: DispelMagicMechanics) => unknown,
): SpellMechanicsAdmissionSource {
  const record = spellRecord(dispelMagicUnitId);
  if (record.mechanics.family !== "activation")
    throw new Error("Expected Dispel Magic activation mechanics.");
  return dispelMechanicsSource(
    spellAdmissionSource(
      decodeSpellRecordForTest({
        ...record,
        id: "synthetic_mutated_ongoing_spell_end",
        name: "Synthetic Mutated Ongoing Spell End",
        provenance: {
          kind: "synthetic-test",
          section: "synthetic_mutated_ongoing_spell_end",
        },
        mechanics: mutate(record.mechanics),
      }),
    ),
  );
}

function staticDispelActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isStaticDispelActor(actor))
    throw new Error("Expected a spellcasting character fixture.");
  return actor;
}

function isStaticDispelActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

function admissionIssueFacts(result: {
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

describe("ongoingSpellEnd static admission", () => {
  test("projects exact facts and complete evidence into mechanics-free execution", () => {
    const source = spellAdmissionSource(spellRecord(dispelMagicUnitId));
    const result = ongoingSpellEndProfile.admitMechanics(
      dispelMechanicsSource(source),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 3,
      rangeFeet: 120,
      abilityCheckDcBase: 10,
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
        spellActivationPhasePath(PositiveInteger(2)),
        spellActivationAttachmentPath(PositiveInteger(2)),
        spellActivationEffectPath(PositiveInteger(2), PositiveInteger(1)),
      ],
      unowned: [],
    });
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: staticDispelActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(3), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocations).toHaveLength(1);
    const invocation = invocations[0];
    if (invocation === undefined) throw new Error("Expected invocation.");
    expect(invocation.spell).not.toHaveProperty("mechanics");
    const { spell: _spell, ...facts } = invocation;
    const execution = {
      ...facts,
      spellRuleFacts: spellRuleExecutionFactsWithCastingSource(
        source.spellDefinitionRuleFacts,
        source.castingSource,
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-dispel-static",
      ),
    };
    const encoded = Schema.encodeSync(ongoingSpellEndProfile.executionSchema)(
      execution,
    );
    expect(encoded).not.toHaveProperty("mechanics");
    expect(encoded).toHaveProperty("abilityCheckDcBase", 10);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(ongoingSpellEndProfile.executionSchema)(
          encoded,
        ),
      ),
    ).toBe(true);
    const { abilityCheckDcBase: _abilityCheckDcBase, ...withoutDcBase } =
      encoded;
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(ongoingSpellEndProfile.executionSchema)(
          withoutDcBase,
        ),
      ),
    ).toBe(true);
  });

  test("renamed spell and target-hole identities preserve facts and evidence", () => {
    const originalRecord = spellRecord(dispelMagicUnitId);
    if (originalRecord.mechanics.family !== "activation")
      throw new Error("Expected activation mechanics.");
    const renamedRecord = decodeSpellRecordForTest({
      ...originalRecord,
      id: "synthetic_renamed_ongoing_spell_end",
      name: "Synthetic Ongoing Spell End",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_renamed_ongoing_spell_end",
      },
      mechanics: {
        ...originalRecord.mechanics,
        phases: originalRecord.mechanics.phases.map((phase) =>
          "attachment" in phase && phase.attachment.kind === "hole"
            ? {
                ...phase,
                attachment: {
                  ...phase.attachment,
                  holeId: "synthetic_other_target",
                  label: "synthetic selection",
                },
              }
            : phase,
        ),
      },
    });
    const original = spellAdmissionSource(originalRecord);
    const renamed = spellAdmissionSource(renamedRecord);
    const canonicalResult = ongoingSpellEndProfile.admitMechanics(
      dispelMechanicsSource(original),
    );
    const renamedResult = ongoingSpellEndProfile.admitMechanics(renamed);
    expect(renamedResult.tag).toBe("supported");
    if (
      canonicalResult.tag !== "supported" ||
      renamedResult.tag !== "supported"
    )
      return;
    expect(renamedResult.admitted.facts).toEqual(
      canonicalResult.admitted.facts,
    );
    expect(renamedResult.admitted.evidence).toEqual(
      canonicalResult.admitted.evidence,
    );
  });

  test("accumulates exact authored ordinals for reordered and malformed phases", () => {
    const reordered = mutatedDispelMechanics((mechanics) => ({
      ...mechanics,
      phases: [mechanics.phases[1], mechanics.phases[0]],
    }));
    expect(
      admissionIssueFacts(ongoingSpellEndProfile.admitMechanics(reordered)),
    ).toEqual(
      expect.arrayContaining([
        {
          failedFact: "phaseOrder",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
        },
        {
          failedFact: "phaseOrder",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(2)),
        },
      ]),
    );

    const malformed = mutatedDispelMechanics((mechanics) => ({
      ...mechanics,
      components: { ...mechanics.components, v: false },
      phases: mechanics.phases.map((phase, index) =>
        index === 0 && phase.kind === "direct"
          ? {
              ...phase,
              effects: [
                {
                  kind: "end_ongoing_spells",
                  maxSpellLevel: "contested_spell_level",
                },
              ],
            }
          : index === 1 && phase.kind === "ability_check_gate"
            ? {
                ...phase,
                dc: 11,
                onFail: { kind: "none" },
                onPass: {
                  kind: "end_ongoing_spells",
                  maxSpellLevel: "caster_slot_level",
                },
              }
            : phase,
      ),
    }));
    expect(
      admissionIssueFacts(ongoingSpellEndProfile.admitMechanics(malformed)),
    ).toEqual(
      expect.arrayContaining([
        {
          failedFact: "components",
          mechanicsPath: spellMechanicsHeaderPath("components"),
        },
        {
          failedFact: "directMaxSpellLevel",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(1),
          ),
        },
        {
          failedFact: "checkDc",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(2)),
        },
        {
          failedFact: "checkOnFail",
          mechanicsPath: spellActivationPhasePath(PositiveInteger(2)),
        },
        {
          failedFact: "checkMaxSpellLevel",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(2),
            PositiveInteger(1),
          ),
        },
      ]),
    );
  });

  test("rejects an authored direct-phase mode at the phase path", () => {
    const withMode = mutatedDispelMechanics((mechanics) => ({
      ...mechanics,
      phases: mechanics.phases.map((phase) =>
        phase.kind === "direct"
          ? {
              ...phase,
              mode: {
                label: "synthetic mode",
                options: [
                  {
                    id: "synthetic_mode",
                    displayName: "Synthetic Mode",
                    effects: [{ kind: "none" }],
                  },
                ],
              },
            }
          : phase,
      ),
    }));
    const result = ongoingSpellEndProfile.admitMechanics(withMode);
    expect(result.tag).toBe("unsupported");
    expect(admissionIssueFacts(result)).toContainEqual({
      failedFact: "directMode",
      mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
    });
    expect(result).not.toHaveProperty("admitted.evidence.unowned");
  });

  test.each([
    {
      label: "canonical first and extra later",
      effects: [
        { kind: "end_ongoing_spells", maxSpellLevel: "caster_slot_level" },
        { kind: "none" },
      ],
      extraOrdinals: [2],
    },
    {
      label: "extra first and canonical later",
      effects: [
        { kind: "none" },
        { kind: "end_ongoing_spells", maxSpellLevel: "caster_slot_level" },
      ],
      extraOrdinals: [1],
    },
    {
      label: "duplicate canonical effects",
      effects: [
        { kind: "end_ongoing_spells", maxSpellLevel: "caster_slot_level" },
        { kind: "end_ongoing_spells", maxSpellLevel: "caster_slot_level" },
      ],
      extraOrdinals: [1, 2],
    },
  ] as const)(
    "attributes $label by actual effect ordinal",
    ({ effects, extraOrdinals }) => {
      const source = mutatedDispelMechanics((mechanics) => ({
        ...mechanics,
        phases: mechanics.phases.map((phase) =>
          phase.kind === "direct" ? { ...phase, effects } : phase,
        ),
      }));
      const facts = admissionIssueFacts(
        ongoingSpellEndProfile.admitMechanics(source),
      );
      expect(facts).toContainEqual({
        failedFact: "directEffectCount",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      });
      for (const ordinal of extraOrdinals)
        expect(facts).toContainEqual({
          failedFact: "directEffectCount",
          mechanicsPath: spellActivationEffectPath(
            PositiveInteger(1),
            PositiveInteger(ordinal),
          ),
        });
    },
  );
});

describe("SRD Dispel Magic ongoing spell ending admission", () => {
  test("dispel magic is admitted with an ongoing spell target choice", () => {
    expect(dispelMagicTargetContracts(spellRecord(dispelMagicUnitId))).toEqual([
      {
        holeId: "dispel_magic_target",
        targetKinds: ["creature", "object", "magical_effect"],
      },
      {
        holeId: "dispel_magic_target",
        targetKinds: ["creature", "object", "magical_effect"],
      },
    ]);
    const state = spellBattle({
      preparedSpells: [spellRecord(dispelMagicUnitId)],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef: expect.any(String),
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "ongoingSpellTargetChoice",
            requiresTableSpatialFact: true,
            choices: expect.arrayContaining([
              { kind: "combatant", combatantId: spellCasterId },
              { kind: "combatant", combatantId: spellTargetId },
            ]),
          }),
        ],
      }),
    );
  });

  test("profile admission requires the exact shared Dispel Magic target contract", () => {
    const baseSpell = spellRecord(dispelMagicUnitId);
    const narrowTargetSpell = dispelMagicWithTargetContract(baseSpell, {
      id: "synthetic_narrow_dispel_target",
      directTargetKinds: ["creature"],
      abilityCheckTargetKinds: ["creature"],
    });
    const splitHoleSpell = dispelMagicWithTargetContract(baseSpell, {
      id: "synthetic_split_dispel_target_hole",
      abilityCheckHoleId: "synthetic_other_dispel_target",
    });
    const extraPhaseSpell = dispelMagicWithExtraPhase(
      baseSpell,
      "synthetic_extra_dispel_phase",
    );
    const onFailSpell = dispelMagicWithAbilityCheckOnFail(
      baseSpell,
      "synthetic_dispel_check_on_fail",
    );

    for (const spell of [narrowTargetSpell, extraPhaseSpell, onFailSpell]) {
      const state = spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      });

      expect(
        maybeSpellAct({ session: state, spellId: spell.id, slotLevel: 3 }),
      ).toBeUndefined();
    }

    const splitHoleState = spellBattle({
      preparedSpells: [splitHoleSpell],
      spellSlots: [{ spellLevel: 3, count: 1 }],
    });
    expect(
      maybeSpellAct({
        session: splitHoleState,
        spellId: splitHoleSpell.id,
        slotLevel: 3,
      }),
    ).toBeDefined();
  });

  test("level 3 dispel magic automatically ends object-attached continual flame", () => {
    const objectId = battleObjectId("dispel-continual-flame-object");
    const state = stateWithLightEmitters([
      objectSpellEmitter({
        objectId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(continualFlameUnitId),
        ),
        sourceSpellLevel: 2,
      }),
    ]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: targetHole,
          target: { kind: "object", objectId },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [] },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn,
    ).toContainEqual({
      kind: "committed",
      combatantId: spellCasterId,
    });
  });

  test("selected ongoing spell target must have a matching within-range fact", () => {
    const objectId = battleObjectId("dispel-range-fact-object");
    const otherObjectId = battleObjectId("dispel-range-fact-other-object");
    const target: OngoingSpellTarget = { kind: "object", objectId };
    const state = stateWithLightEmitters([
      objectSpellEmitter({
        objectId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(continualFlameUnitId),
        ),
        sourceSpellLevel: 2,
      }),
    ]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );

    const missingFact = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [ongoingSpellTargetFill({ hole: targetHole, target, facts: [] })],
    });
    const wrongTargetFact = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: targetHole,
          target,
          facts: [
            ongoingSpellTargetWithinRangeFact({
              sourceProcedureRef: targetHole.procedureRef,
              target: { kind: "object", objectId: otherObjectId },
            }),
          ],
        }),
      ],
    });
    const tooFarFact = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: targetHole,
          target,
          facts: [
            ongoingSpellTargetWithinRangeFact({
              sourceProcedureRef: targetHole.procedureRef,
              target,
              rangeFeet: movementFeet(121),
            }),
          ],
        }),
      ],
    });

    for (const result of [missingFact, wrongTargetFact, tooFarFact]) {
      expect(result).toMatchObject({
        tag: "invalid",
        reason: "invalidFill",
        message:
          "Ongoing spell target does not satisfy the selected spell's range.",
      });
    }
  });

  test("higher-level ongoing spells require a spellcasting ability check", () => {
    const objectId = battleObjectId("dispel-higher-level-object");
    const base = spellBattle({
      preparedSpells: [
        spellRecord(dispelMagicUnitId),
        spellRecord(continualFlameUnitId),
      ],
      spellSlots: [
        { spellLevel: 3, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    });
    const emitter = objectSpellEmitter({
      objectId,
      sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
        base,
        spellCasterId,
        spellSlotInvocationRef(continualFlameUnitId, 4, "objectLight"),
      ),
      sourceCombatantId: spellCasterId,
      sourceSpellLevel: 4,
    });
    const otherEmitter = objectSpellEmitter({
      objectId: battleObjectId("dispel-other-owner-object"),
      sourceProcedureRef: emitter.sourceProcedureRef,
      sourceCombatantId: spellCasterId,
      sourceSpellLevel: 4,
    });
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: base.state,
      occurrences: [
        {
          kind: "storedLightEmitter",
          ownerId: spellCasterId,
          emitter,
        },
        {
          kind: "storedLightEmitter",
          ownerId: spellTargetId,
          emitter: otherEmitter,
        },
      ],
    });
    const state = battleRuntimeSessionForTest({
      ...base,
      state: allocated.state,
    });
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );
    const targetFill = ongoingSpellTargetFill({
      hole: targetHole,
      target: { kind: "object", objectId },
    });

    const needsCheck = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill],
    });
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");
    const allocatedEmitter = state.state.lightEmitters.find(
      (candidate) =>
        candidate.kind === "spellLightEmitter" &&
        candidate.sourceEffectId === emitter.sourceEffectId,
    );
    if (allocatedEmitter?.kind !== "spellLightEmitter") {
      throw new Error("Expected allocated higher-level spell emitter.");
    }
    const allocatedOtherEmitter = allocated.state.lightEmitters.find(
      (candidate) =>
        candidate.kind === "spellLightEmitter" &&
        candidate.sourceEffectId === otherEmitter.sourceEffectId,
    );
    if (allocatedOtherEmitter?.kind !== "spellLightEmitter") {
      throw new Error("Expected the other-owner spell emitter.");
    }
    expect(checkHole).toEqual(
      expect.objectContaining({
        dc: 14,
        spellcastingAbilityCheck: expect.objectContaining({
          casterId: spellCasterId,
          sourceProcedureRef: targetHole.procedureRef,
          contestedSpellLevel: 4,
        }),
      }),
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleHoleSchema)({
          ...checkHole,
          spellcastingAbilityCheck: {
            ...checkHole.spellcastingAbilityCheck,
            contestedSpellLevel: 10,
          },
        }),
      ),
    ).toBe(true);
    if (needsCheck.tag !== "needsHoles") {
      throw new Error("Expected a Dispel Magic spellcasting ability check.");
    }
    const encodedSnapshot = Schema.encodeSync(BattleSnapshotSchema)(
      needsCheck.snapshot,
    );
    const deferredCheckEnvelope = {
      checkpoint: encodedSnapshot,
      frontier: {
        kind: "holes" as const,
        subject: act.subject,
        holes: needsCheck.holes,
        continuation: { kind: "ordinaryReplay" as const },
      },
    };
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        deferredCheckEnvelope,
      ),
    ).not.toThrow();
    const mutateAggregateCheck = (
      mutate: (
        check: Exclude<
          Extract<
            BattleHole,
            { readonly kind: "spellcastingAbilityCheck" }
          >["spellcastingAbilityCheck"],
          undefined
        >,
      ) => unknown,
    ) => ({
      ...deferredCheckEnvelope,
      frontier: {
        ...deferredCheckEnvelope.frontier,
        holes: deferredCheckEnvelope.frontier.holes.map((hole) =>
          hole.kind === "spellcastingAbilityCheck"
            ? {
                ...hole,
                spellcastingAbilityCheck: mutate(hole.spellcastingAbilityCheck),
              }
            : hole,
        ),
      },
    });
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateAggregateCheck((check) => {
            if (check.target.kind === "magicalEffect") return check;
            return {
              ...check,
              checkedOccurrence: {
                ...check.checkedOccurrence,
                target: check.target,
              },
            };
          }),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateAggregateCheck((check) => {
            if (check.target.kind === "magicalEffect") return check;
            return {
              ...check,
              checkedOccurrence: {
                ...check.checkedOccurrence,
                ownerId: spellTargetId,
              },
            };
          }),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateAggregateCheck((check) => {
            if (check.target.kind === "magicalEffect") return check;
            return {
              ...check,
              checkedOccurrence: {
                ...check.checkedOccurrence,
                ownerId: spellTargetId,
                effect: {
                  kind: "spellLightEmitter",
                  effectRef: allocatedOtherEmitter.effectRef,
                },
              },
            };
          }),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateAggregateCheck((check) => {
            if (check.target.kind === "magicalEffect") return check;
            const {
              checkedOccurrence: _checkedOccurrence,
              ...checkWithoutOccurrence
            } = check;
            return checkWithoutOccurrence;
          }),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          ...deferredCheckEnvelope,
          checkpoint: {
            ...deferredCheckEnvelope.checkpoint,
            storedLightEmitters:
              deferredCheckEnvelope.checkpoint.storedLightEmitters.filter(
                (emitter) => emitter.effectRef !== allocatedEmitter.effectRef,
              ),
          },
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          ...deferredCheckEnvelope,
          checkpoint: {
            ...deferredCheckEnvelope.checkpoint,
            storedLightEmitters:
              deferredCheckEnvelope.checkpoint.storedLightEmitters.filter(
                (emitter) => emitter.effectRef !== allocatedEmitter.effectRef,
              ),
            combatants: deferredCheckEnvelope.checkpoint.combatants.map(
              (combatant) => ({
                ...combatant,
                activeEffectOccurrences: [
                  ...combatant.activeEffectOccurrences,
                  ...(combatant.combatantId === spellTargetId
                    ? [
                        {
                          ...combatant.activeEffectOccurrences[0]!,
                          effectRef: allocatedEmitter.effectRef,
                        },
                      ]
                    : []),
                ],
              }),
            ),
          },
        }),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          ...deferredCheckEnvelope,
          checkpoint: {
            ...deferredCheckEnvelope.checkpoint,
            storedLightEmitters:
              deferredCheckEnvelope.checkpoint.storedLightEmitters.map(
                (emitter) =>
                  emitter.effectRef === allocatedEmitter.effectRef &&
                  emitter.kind === "spellLightEmitter"
                    ? {
                        ...emitter,
                        attachment: {
                          kind: "object" as const,
                          objectId: battleObjectId(
                            "contradictory-emitter-census-object",
                          ),
                        },
                      }
                    : emitter,
              ),
          },
        }),
      ),
    ).toBe(true);
    const forgedEmitterRef = battleEffectExecutionRefForTest(
      "forged-deferred-dispel-emitter",
    );
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          ...deferredCheckEnvelope,
          frontier: {
            ...deferredCheckEnvelope.frontier,
            holes: deferredCheckEnvelope.frontier.holes.map((hole) =>
              hole.kind === "spellcastingAbilityCheck" &&
              hole.spellcastingAbilityCheck.target.kind !== "magicalEffect" &&
              hole.spellcastingAbilityCheck.checkedOccurrence!.effect.kind ===
                "spellLightEmitter"
                ? {
                    ...hole,
                    spellcastingAbilityCheck: {
                      ...hole.spellcastingAbilityCheck,
                      checkedOccurrence: {
                        ...hole.spellcastingAbilityCheck.checkedOccurrence!,
                        effect: {
                          ...hole.spellcastingAbilityCheck.checkedOccurrence!
                            .effect,
                          effectRef: forgedEmitterRef,
                        },
                      },
                    },
                  }
                : hole,
            ),
          },
        }),
      ),
    ).toBe(true);

    const failed = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 13)],
    });
    expect(failed).toMatchObject({ tag: "resolved" });
    if (failed.tag !== "resolved") {
      throw new Error("Expected failed higher-level Dispel check to resolve.");
    }
    expect(failed.state.lightEmitters).toContainEqual(
      expect.objectContaining({ effectRef: allocatedEmitter.effectRef }),
    );

    const succeeded = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 14)],
    });
    expect(succeeded).toMatchObject({
      tag: "resolved",
    });
    if (succeeded.tag !== "resolved") {
      throw new Error("Expected successful higher-level Dispel to resolve.");
    }
    expect(succeeded.state.lightEmitters).not.toContainEqual(
      expect.objectContaining({ effectRef: allocatedEmitter.effectRef }),
    );
    expect(succeeded.state.lightEmitters).toContainEqual(
      expect.objectContaining({ attachment: otherEmitter.attachment }),
    );
  });

  test("duplicate higher-level ability check fills are invalid", () => {
    const objectId = battleObjectId("dispel-duplicate-check-object");
    const emitter = objectSpellEmitter({
      objectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_violet_flame"),
      ),
      sourceSpellLevel: 4,
    });
    const state = stateWithLightEmitters([emitter]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetFill = ongoingSpellTargetFill({
      hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
      target: { kind: "object", objectId },
    });
    const needsCheck = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill],
    });
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");

    const duplicateCheckFill = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        targetFill,
        abilityCheckFill(checkHole, 13),
        abilityCheckFill(checkHole, 14),
      ],
    });

    expect(duplicateCheckFill).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message: "Ongoing spell ending ability check was filled twice.",
    });
  });

  test("higher-level spell slot automatically ends a same-level ongoing spell", () => {
    const objectId = battleObjectId("dispel-slot-gate-object");
    const state = stateWithLightEmitters([
      objectSpellEmitter({
        objectId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String("synthetic_green_flame"),
        ),
        sourceSpellLevel: 4,
      }),
    ]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 4,
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: { kind: "object", objectId },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [] },
    });
  });

  test("object targeting ends tracked active-effect ongoing spells and clears concentration when no spell effects remain", () => {
    const objectId = battleObjectId("dispel-heat-metal-object-target");
    const state = stateWithActiveEffects([
      heatMetalObjectContactDamageEffect({
        objectId,
        sourceSpellLevel: 2,
      }),
    ]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: { kind: "object", objectId },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        combatants: expect.any(Map),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    expect(caster?.concentration).toBeNull();
    expect(
      caster?.activeEffects.filter(
        (effect) => effect.kind === "spellObjectContactDamage",
      ),
    ).toEqual([]);
  });

  test("object targeting ends matching tracked active effects on the same object across multiple owners", () => {
    const objectId = battleObjectId("dispel-shared-heat-metal-object-target");
    const state = stateWithCombatantActiveEffects({
      caster: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [
          heatMetalObjectContactDamageEffect({
            objectId,
            sourceSpellLevel: 2,
          }),
        ],
      },
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [
          heatMetalObjectContactDamageEffect({
            objectId,
            sourceSpellLevel: 2,
            sourceCombatantId: spellTargetId,
          }),
        ],
      },
    });
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: { kind: "object", objectId },
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    const target = resolved.state.combatants.get(spellTargetId);
    expect(caster?.concentration).toBeNull();
    expect(target?.concentration).toBeNull();
    expect(
      caster?.activeEffects.some(
        (effect) => effect.kind === "spellObjectContactDamage",
      ),
    ).toBe(false);
    expect(
      target?.activeEffects.some(
        (effect) => effect.kind === "spellObjectContactDamage",
      ),
    ).toBe(false);
  });

  test("higher-level tracked active-effect ongoing spells require a spellcasting ability check", () => {
    const objectId = battleObjectId("dispel-heat-metal-higher-level-object");
    const state = stateWithActiveEffects([
      heatMetalObjectContactDamageEffect({
        objectId,
        sourceSpellLevel: 4,
      }),
    ]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetFill = ongoingSpellTargetFill({
      hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
      target: { kind: "object", objectId },
    });

    const needsCheck = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill],
    });
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");

    expect(checkHole).toEqual(
      expect.objectContaining({
        dc: 14,
        spellcastingAbilityCheck: expect.objectContaining({
          target: { kind: "object", objectId },
          checkedOccurrence: expect.objectContaining({
            effect: expect.objectContaining({
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
            }),
          }),
          contestedSpellLevel: 4,
        }),
      }),
    );

    const failed = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 13)],
    });
    expect(failed).toMatchObject({
      tag: "resolved",
    });
    if (failed.tag !== "resolved") {
      throw new Error("Expected failed higher-level Dispel Magic to resolve.");
    }
    expect(
      failed.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "spellObjectContactDamage",
        ),
    ).toBe(true);

    const succeeded = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 14)],
    });
    expect(succeeded).toMatchObject({
      tag: "resolved",
    });
    if (succeeded.tag !== "resolved") {
      throw new Error(
        "Expected successful higher-level Dispel Magic to resolve.",
      );
    }
    expect(
      succeeded.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "spellObjectContactDamage",
        ),
    ).toBe(false);
  });

  test("magical-effect targeting removes only the selected ongoing spell effect", () => {
    const objectId = battleObjectId("dispel-magical-effect-object");
    const selectedEmitterTemplate = objectSpellEmitter({
      objectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_silver_glow"),
      ),
      sourceEffectId: "synthetic_silver_glow:selected",
      sourceSpellLevel: 2,
    });
    const retainedEmitterTemplate = objectSpellEmitter({
      objectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_silver_glow"),
      ),
      sourceEffectId: "synthetic_silver_glow:retained",
      sourceSpellLevel: 2,
    });
    const state = stateWithLightEmitters([
      selectedEmitterTemplate,
      retainedEmitterTemplate,
    ]);
    const selectedEmitter = state.state.lightEmitters.find(
      (emitter) =>
        emitter.kind === "spellLightEmitter" &&
        emitter.sourceEffectId === selectedEmitterTemplate.sourceEffectId,
    );
    if (selectedEmitter?.kind !== "spellLightEmitter") {
      throw new Error("Expected allocated selected spell light emitter.");
    }
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: {
            kind: "magicalEffect",
            effect: {
              kind: "spellLightEmitter",
              effectRef: selectedEmitter.effectRef,
            },
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: retainedEmitterTemplate.sourceProcedureRef,
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    expect(resolved.state.lightEmitters).toHaveLength(1);
  });

  test("magical-effect targeting removes only the selected tracked active effect when multiple owners share the same object", () => {
    const objectId = battleObjectId("dispel-shared-magical-effect-object");
    const selectedEffectTemplate = heatMetalObjectContactDamageEffect({
      objectId,
      sourceSpellLevel: 2,
    });
    const retainedEffectTemplate = heatMetalObjectContactDamageEffect({
      objectId,
      sourceSpellLevel: 2,
      sourceCombatantId: spellTargetId,
    });
    const state = stateWithCombatantActiveEffects({
      caster: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [selectedEffectTemplate],
      },
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [retainedEffectTemplate],
      },
    });
    const selectedEffect = requireCombatant(
      state.state,
      spellCasterId,
    ).activeEffects.find(
      (effect) => effect.kind === "spellObjectContactDamage",
    );
    const retainedEffect = requireCombatant(
      state.state,
      spellTargetId,
    ).activeEffects.find(
      (effect) => effect.kind === "spellObjectContactDamage",
    );
    if (
      selectedEffect?.kind !== "spellObjectContactDamage" ||
      retainedEffect?.kind !== "spellObjectContactDamage"
    ) {
      throw new Error("Expected allocated Heat Metal occurrences.");
    }
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: {
            kind: "magicalEffect",
            effect: {
              kind: "spellActiveEffect",
              activeEffectKind: "spellObjectContactDamage",
              effectRef: selectedEffect.effectRef,
            },
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    const caster = resolved.state.combatants.get(spellCasterId);
    const target = resolved.state.combatants.get(spellTargetId);
    expect(caster?.concentration).toBeNull();
    expect(target?.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(
      caster?.activeEffects.some(
        (effect) => effect.kind === "spellObjectContactDamage",
      ),
    ).toBe(false);
    const remaining = target?.activeEffects.filter(
      (effect) => effect.kind === "spellObjectContactDamage",
    );
    expect(remaining).toHaveLength(1);
    expect(remaining?.[0]).toMatchObject({
      kind: "spellObjectContactDamage",
      effectRef: retainedEffect.effectRef,
    });
  });

  test("magical-effect targeting ends a tracked Spiritual Weapon occurrence and clears concentration", () => {
    const { state, effect } = stateWithBoundSpiritualWeaponEffect(2);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const target = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "spellActiveEffect" as const,
        activeEffectKind: "spatialMeleeSpellAttackProxy" as const,
        effectRef: effect.effectRef,
      },
    };

    expect(
      requireHole(act.initialHoles, "ongoingSpellTargetChoice").choices,
    ).toContainEqual(target);
    const snapshot = Schema.encodeSync(BattleSnapshotSchema)(
      snapshotBattle(state.state),
    );
    const focusedEnvelope = {
      checkpoint: snapshot,
      frontier: {
        kind: "holes" as const,
        subject: act.subject,
        holes: act.initialHoles,
        continuation: { kind: "ordinaryReplay" as const },
      },
    };
    const focusedSnapshot = snapshot;
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(focusedSnapshot),
      ),
    ).toBe(true);
    const wrongOwnerSnapshot = {
      ...focusedSnapshot,
      combatants: focusedSnapshot.combatants.map((combatant) =>
        combatant.combatantId === spellCasterId
          ? {
              ...combatant,
              activeEffectOccurrences: combatant.activeEffectOccurrences.map(
                (occurrence) =>
                  occurrence.effectRef === effect.effectRef
                    ? {
                        ...occurrence,
                        effectRef: battleEffectExecutionRefForTest(
                          "wrong-owner-spiritual-weapon",
                        ),
                      }
                    : occurrence,
              ),
            }
          : combatant,
      ),
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(wrongOwnerSnapshot),
      ),
    ).toBe(true);
    const wrongOccurrenceKindSnapshot = {
      ...focusedSnapshot,
      combatants: focusedSnapshot.combatants.map((combatant) => ({
        ...combatant,
        activeEffectOccurrences: combatant.activeEffectOccurrences.map(
          (occurrence) =>
            occurrence.effectRef === effect.effectRef
              ? { ...occurrence, kind: "storedLightEmitter" as const }
              : occurrence,
        ),
      })),
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          wrongOccurrenceKindSnapshot,
        ),
      ),
    ).toBe(true);
    expect(() =>
      Schema.decodeUnknownSync(BattleCheckpointFrontierEnvelopeSchema)(
        focusedEnvelope,
      ),
    ).not.toThrow();
    const wrongOwnerEnvelope = {
      ...focusedEnvelope,
      checkpoint: {
        ...focusedEnvelope.checkpoint,
        combatants: focusedEnvelope.checkpoint.combatants.map((combatant) =>
          combatant.combatantId === spellCasterId
            ? {
                ...combatant,
                activeEffectOccurrences: combatant.activeEffectOccurrences.map(
                  (occurrence) =>
                    occurrence.effectRef === effect.effectRef
                      ? {
                          ...occurrence,
                          effectRef: battleEffectExecutionRefForTest(
                            "wrong-owner-spiritual-weapon",
                          ),
                        }
                      : occurrence,
                ),
              }
            : combatant,
        ),
      },
    };
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          wrongOwnerEnvelope,
        ),
      ),
    ).toBe(true);

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target,
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    const resolvedCaster = resolved.state.combatants.get(spellCasterId);
    expect(resolvedCaster?.concentration).toBeNull();
    expect(
      resolvedCaster?.activeEffects.some((candidate) => candidate === effect),
    ).toBe(false);
  });

  test("magical-effect targeting leaves an Antimagic Field aura active", () => {
    const areaId = battleAreaId("dispel-antimagic-field-aura-target");
    const auraTemplate = magicSuppressionEmanationEffect(areaId);
    const state = stateWithCombatantActiveEffects({
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(antimagicFieldUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [auraTemplate],
      },
    });
    const aura = requireCombatant(
      state.state,
      spellTargetId,
    ).activeEffects.find(
      (effect) =>
        effect.kind === "magicSuppressionEmanation" && effect.areaId === areaId,
    );
    if (aura?.kind !== "magicSuppressionEmanation") {
      throw new Error("Expected an allocated Antimagic Field aura.");
    }
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const target = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "magicSuppressionEmanation" as const,
        effectRef: aura.effectRef,
        areaId,
        sourceCombatantId: spellTargetId,
      },
    };

    expect(
      requireHole(act.initialHoles, "ongoingSpellTargetChoice").choices,
    ).toContainEqual(target);

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target,
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic aura target to resolve.");
    }
    const antimagicCaster = resolved.state.combatants.get(spellTargetId);
    expect(antimagicCaster?.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(antimagicCaster?.activeEffects).toContainEqual(aura);
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
  });

  test("magical-effect targeting rejects a stale recast Antimagic Field aura", () => {
    const areaId = battleAreaId("dispel-recast-antimagic-aura-target");
    const auraTemplate = magicSuppressionEmanationEffect(areaId);
    const base = stateWithCombatantActiveEffects({
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(antimagicFieldUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [],
      },
    });
    const targetBeforeRecast = requireCombatant(base.state, spellTargetId);
    const withBothAuras = battleStateWithAllocatedEffectOccurrencesForTest({
      state: base.state,
      occurrences: [
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: auraTemplate,
        },
        {
          kind: "activeEffect",
          ownerId: spellTargetId,
          effect: auraTemplate,
        },
      ],
    }).state;
    const targetWithBothAuras = requireCombatant(withBothAuras, spellTargetId);
    const [staleAura, activeAura] = targetWithBothAuras.activeEffects.filter(
      (effect) => effect.kind === "magicSuppressionEmanation",
    );
    if (
      staleAura?.kind !== "magicSuppressionEmanation" ||
      activeAura?.kind !== "magicSuppressionEmanation"
    ) {
      throw new Error("Expected two allocated Antimagic Field auras.");
    }
    expect(Number(targetWithBothAuras.nextEffectOrdinal)).toBe(
      Number(targetBeforeRecast.nextEffectOrdinal) + 2,
    );
    const state = battleRuntimeSessionForTest({
      ...base,
      state: {
        ...withBothAuras,
        combatants: new Map(withBothAuras.combatants).set(spellTargetId, {
          ...targetWithBothAuras,
          activeEffects: targetWithBothAuras.activeEffects.filter(
            (effect) => effect.effectRef !== staleAura.effectRef,
          ),
        }),
      },
    });
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const staleTarget = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "magicSuppressionEmanation" as const,
        effectRef: staleAura.effectRef,
        areaId,
        sourceCombatantId: spellTargetId,
      },
    };
    const activeTarget = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "magicSuppressionEmanation" as const,
        effectRef: activeAura.effectRef,
        areaId,
        sourceCombatantId: spellTargetId,
      },
    };

    expect(
      requireHole(act.initialHoles, "ongoingSpellTargetChoice").choices,
    ).toContainEqual(activeTarget);
    const snapshot = snapshotBattle(state.state);
    expect(
      Result.isSuccess(
        Schema.decodeUnknownResult(BattleSnapshotSchema)(
          Schema.encodeSync(BattleSnapshotSchema)(snapshot),
        ),
      ),
    ).toBe(true);

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          ongoingSpellTargetFill({
            hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
            target: staleTarget,
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Ongoing-spell ending suppression target must reference an active aura.",
    });
  });

  test("higher-level tracked Spiritual Weapon occurrences use the Dispel Magic ability-check gate", () => {
    const { state, effect } = stateWithBoundSpiritualWeaponEffect(4);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const target = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "spellActiveEffect" as const,
        activeEffectKind: "spatialMeleeSpellAttackProxy" as const,
        effectRef: effect.effectRef,
      },
    };
    const targetFill = ongoingSpellTargetFill({
      hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
      target,
    });

    const needsCheck = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill],
    });
    if (needsCheck.tag !== "needsHoles") {
      throw new Error("Expected a Dispel Magic spellcasting ability check.");
    }
    const focusedSnapshot = needsCheck.snapshot;
    assertBattleCheckpointFrontierEnvelopeCodecAcceptsHolesForSubjectForTest({
      snapshot: focusedSnapshot,
      subject: act.subject,
      holes: needsCheck.holes,
    });
    const encodedEnvelope = Schema.encodeSync(
      BattleCheckpointFrontierEnvelopeSchema,
    )({
      checkpoint: focusedSnapshot,
      frontier: {
        kind: "acts",
        acts: [{ subject: act.subject, initialHoles: needsCheck.holes }],
      },
    });
    if (encodedEnvelope.frontier.kind !== "acts") {
      throw new Error("Expected the focused Dispel Magic Acts frontier.");
    }
    const encodedActsFrontier = encodedEnvelope.frontier;
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)({
          ...encodedEnvelope,
          checkpoint: {
            ...encodedEnvelope.checkpoint,
            combatants: encodedEnvelope.checkpoint.combatants.map(
              (combatant) =>
                combatant.combatantId === spellCasterId
                  ? {
                      ...combatant,
                      activeEffectOccurrences:
                        combatant.activeEffectOccurrences.filter(
                          (occurrence) =>
                            occurrence.effectRef !== effect.effectRef,
                        ),
                    }
                  : combatant,
            ),
          },
        }),
      ),
    ).toBe(true);
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");
    expect(checkHole).toEqual(
      expect.objectContaining({
        dc: 14,
        spellcastingAbilityCheck: expect.objectContaining({
          target,
          contestedSpellLevel: 4,
        }),
      }),
    );
    const forgedTargetRef = battleEffectExecutionRefForTest(
      "forged-spiritual-weapon-ability-check-target",
    );
    type EncodedDeferredCheckHole = Extract<
      (typeof encodedActsFrontier.acts)[number]["initialHoles"][number],
      { readonly kind: "spellcastingAbilityCheck" }
    >;
    const mutateDeferredCheck = (
      mutate: (hole: EncodedDeferredCheckHole) => unknown,
    ) => ({
      ...encodedEnvelope,
      frontier: {
        ...encodedActsFrontier,
        acts: encodedActsFrontier.acts.map((candidate) => ({
          ...candidate,
          initialHoles: candidate.initialHoles.map((hole) =>
            hole.kind === "spellcastingAbilityCheck" ? mutate(hole) : hole,
          ),
        })),
      },
    });
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateDeferredCheck((hole) => ({
            ...hole,
            spellcastingAbilityCheck: {
              ...hole.spellcastingAbilityCheck,
              target: {
                kind: "magicalEffect",
                effect: { ...target.effect, effectRef: forgedTargetRef },
              },
            },
          })),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateDeferredCheck((hole) => ({
            ...hole,
            spellcastingAbilityCheck: {
              ...hole.spellcastingAbilityCheck,
              target: {
                kind: "magicalEffect",
                effect: {
                  kind: "spellLightEmitter",
                  effectRef: effect.effectRef,
                },
              },
            },
          })),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateDeferredCheck((hole) => ({
            ...hole,
            spellcastingAbilityCheck: {
              ...hole.spellcastingAbilityCheck,
              checkedOccurrence: {
                ownerId: spellCasterId,
                effect: {
                  kind: "magicSuppressionEmanation",
                  areaId: battleAreaId("forged-ability-check-aura"),
                  sourceCombatantId: spellCasterId,
                },
              },
            },
          })),
        ),
      ),
    ).toBe(true);
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(BattleCheckpointFrontierEnvelopeSchema)(
          mutateDeferredCheck((hole) => {
            if (hole.spellcastingAbilityCheck.target.kind !== "magicalEffect") {
              throw new Error("Expected a magical-effect Dispel check.");
            }
            const { effect: _effect, ...targetWithoutEffect } =
              hole.spellcastingAbilityCheck.target;
            return {
              ...hole,
              spellcastingAbilityCheck: {
                ...hole.spellcastingAbilityCheck,
                target: targetWithoutEffect,
              },
            };
          }),
        ),
      ),
    ).toBe(true);

    const failed = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 13)],
    });
    expect(failed).toMatchObject({ tag: "resolved" });
    if (failed.tag !== "resolved") {
      throw new Error("Expected failed Dispel Magic check to resolve.");
    }
    expect(
      failed.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some((candidate) => candidate === effect),
    ).toBe(true);

    const succeeded = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 14)],
    });
    expect(succeeded).toMatchObject({ tag: "resolved" });
    if (succeeded.tag !== "resolved") {
      throw new Error("Expected successful Dispel Magic check to resolve.");
    }
    expect(
      succeeded.state.combatants
        .get(spellCasterId)
        ?.activeEffects.some((candidate) => candidate === effect),
    ).toBe(false);
  });

  test("snapshot codec rejects out-of-domain ongoing spell effect levels", () => {
    const objectId = battleObjectId("dispel-invalid-level-codec-object");
    const state = stateWithLightEmitters([
      objectSpellEmitter({
        objectId,
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(continualFlameUnitId),
        ),
        sourceSpellLevel: 2,
      }),
    ]);
    const snapshot = snapshotBattle(state.state);

    const decoded = Schema.decodeUnknownResult(BattleSnapshotSchema)({
      ...snapshot,
      lightEmitters: snapshot.lightEmitters.map((emitter) =>
        emitter.kind === "spellLightEmitter" && "sourceSpellLevel" in emitter
          ? { ...emitter, sourceSpellLevel: 10 }
          : emitter,
      ),
    });

    expect(Result.isFailure(decoded)).toBe(true);
  });

  test("deferred support boundary: untracked combatant effects remain untouched", () => {
    const unrelatedSource = battleProcedureExecutionRefForTest(
      "synthetic-dispel-unrelated-condition-immunity",
    );
    const unrelatedEffect = {
      kind: "conditionImmunity",
      sourceProcedureRef: unrelatedSource,
      sourceCombatantId: spellTargetId,
      condition: "frightened",
      conditionHadNonSpellSource: false,
      expiresAt: {
        kind: "duration",
        durationTicks: elapsedTimeTicks(10),
      },
    } as const;
    const base = stateWithCombatantActiveEffects({
      target: { activeEffects: [], concentration: null },
    });
    const state = battleRuntimeSessionForTest({
      ...base,
      state: battleStateWithAllocatedEffectOccurrencesForTest({
        state: base.state,
        occurrences: [
          {
            kind: "activeEffect",
            ownerId: spellTargetId,
            effect: unrelatedEffect,
          },
        ],
      }).state,
    });
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: { kind: "combatant", combatantId: spellTargetId },
        }),
      ],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    const effects = requireCombatant(
      resolved.state,
      spellTargetId,
    ).activeEffects;
    expect(effects).toHaveLength(1);
    expect(effects).toContainEqual(expect.objectContaining(unrelatedEffect));
  });

  test("deferred support boundary: untracked light emitters stay outside target discovery", () => {
    const emitter = {
      kind: "objectInvisibleRevealLightEmitter" as const,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-dispel-untracked-light",
      ),
      sourceCombatantId: spellTargetId,
      objectId: battleObjectId("dispel-untracked-light-object"),
      emission: { kind: "dim" as const, radiusFeet: movementFeet(5) },
      expiresAt: {
        kind: "endOfTurn" as const,
        combatantId: spellTargetId,
        round: Round(1),
      },
    } satisfies BattleStoredLightEmitterTemplate;
    const state = stateWithLightEmitters([emitter]);
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );

    expect(targetHole.choices).not.toContainEqual({
      kind: "object",
      objectId: emitter.objectId,
    });
    const resolved = resolveBattleSubject({
      state: state.state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: targetHole,
          target: { kind: "combatant", combatantId: spellTargetId },
        }),
      ],
    });
    expect(resolved).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [expect.objectContaining(emitter)] },
    });
  });
});

function stateWithLightEmitters(
  lightEmitters: readonly BattleStoredLightEmitterTemplate[],
  spellSlots: readonly {
    readonly spellLevel: 3 | 4;
    readonly count: number;
  }[] = [
    { spellLevel: 3, count: 1 },
    { spellLevel: 4, count: 1 },
  ],
): BattleRuntimeSession {
  const session = spellBattle({
    preparedSpells: [spellRecord(dispelMagicUnitId)],
    spellSlots,
  });
  const state = battleStateWithAllocatedEffectOccurrencesForTest({
    state: session.state,
    occurrences: lightEmitters.map((emitter) => ({
      kind: "storedLightEmitter" as const,
      ownerId: emitter.sourceCombatantId,
      emitter,
    })),
  }).state;
  return battleRuntimeSessionForTest({
    ...session,
    state,
  });
}

function stateWithBoundSpiritualWeaponEffect(sourceSpellLevel: 2 | 4): {
  readonly state: BattleRuntimeSession;
  readonly effect: Extract<
    BattleActiveEffect,
    { readonly kind: "spatialMeleeSpellAttackProxy" }
  >;
} {
  const clericClassLevel = {
    className: "cleric",
    level: classLevel(7),
  } as const;
  const baseState = spellBattle({
    casterClassLevels: [clericClassLevel],
    casterSpellcastingSourceClassName: clericClassLevel.className,
    casterProficiencyBonus: proficiencyBonusForCharacterLevel(
      characterLevel(Number(clericClassLevel.level)),
    ),
    preparedSpells: [
      spellRecord(dispelMagicUnitId),
      spellRecord(spiritualWeaponUnitId),
    ],
    spellSlots: [
      { spellLevel: 1, count: 4 },
      { spellLevel: 2, count: 3 },
      { spellLevel: 3, count: 3 },
      { spellLevel: 4, count: 1 },
    ],
  });
  const boundProcedureRef = requireCharacterSpellProcedureRefForTest(
    baseState,
    spellCasterId,
    spellSlotInvocationRef(
      spiritualWeaponUnitId,
      sourceSpellLevel,
      "spatialMeleeSpellAttackProxy",
    ),
  );
  const caster = baseState.state.combatants.get(spellCasterId);
  if (caster === undefined) {
    throw new Error("Expected spell caster combatant.");
  }
  const effectAllocation = allocateBattleEffectExecutionRefForCreature({
    owner: caster,
  });
  const effect = {
    ...spatialMeleeSpellAttackProxyEffect(),
    effectRef: effectAllocation.effectRef,
    sourceProcedureRef: boundProcedureRef,
  };
  return {
    effect,
    state: battleRuntimeSessionForTest({
      ...baseState,
      state: {
        ...baseState.state,
        combatants: new Map(baseState.state.combatants).set(spellCasterId, {
          ...effectAllocation.owner,
          concentration: {
            sourceProcedureRef: boundProcedureRef,
            effectKind: "spellEffect" as const,
          },
          activeEffects: [...effectAllocation.owner.activeEffects, effect],
        }),
      },
    }),
  };
}

function stateWithActiveEffects(
  activeEffects: readonly BattleActiveEffectOccurrenceTemplate[],
  input: {
    readonly concentration?: {
      readonly sourceProcedureRef: ReturnType<
        typeof battleProcedureExecutionRefForTest
      >;
      readonly effectKind: "spellEffect";
    } | null;
  } = {
    concentration: {
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(heatMetalUnitId),
      ),
      effectKind: "spellEffect",
    },
  },
): BattleRuntimeSession {
  const session = dispelTestSessionWithObjectContactBindings();
  const boundActiveEffects = activeEffects.map((effect) =>
    bindDispellableObjectContactEffect(session, effect),
  );
  const caster = session.state.combatants.get(spellCasterId);
  if (caster === undefined) {
    throw new Error("Expected spell caster combatant.");
  }
  const concentrationState = {
    ...session.state,
    combatants: new Map(session.state.combatants).set(spellCasterId, {
      ...caster,
      concentration: concentrationForBoundEffects(
        input.concentration,
        boundActiveEffects,
      ),
    }),
  };
  return battleRuntimeSessionForTest({
    ...session,
    state: battleStateWithAllocatedEffectOccurrencesForTest({
      state: concentrationState,
      occurrences: boundActiveEffects.map((effect) => ({
        kind: "activeEffect" as const,
        ownerId: spellCasterId,
        effect,
      })),
    }).state,
  });
}

function stateWithCombatantActiveEffects(input: {
  readonly caster?: {
    readonly activeEffects: readonly BattleActiveEffectOccurrenceTemplate[];
    readonly concentration?: {
      readonly sourceProcedureRef: ReturnType<
        typeof battleProcedureExecutionRefForTest
      >;
      readonly effectKind: "spellEffect";
    } | null;
  };
  readonly target?: {
    readonly activeEffects: readonly BattleActiveEffectOccurrenceTemplate[];
    readonly concentration?: {
      readonly sourceProcedureRef: ReturnType<
        typeof battleProcedureExecutionRefForTest
      >;
      readonly effectKind: "spellEffect";
    } | null;
  };
}): BattleRuntimeSession {
  const session = dispelTestSessionWithObjectContactBindings();
  const combatants = new Map(session.state.combatants);
  const casterActiveEffects = (input.caster?.activeEffects ?? []).map(
    (effect) => bindDispellableObjectContactEffect(session, effect),
  );
  const targetActiveEffects = (input.target?.activeEffects ?? []).map(
    (effect) => bindDispellableObjectContactEffect(session, effect),
  );
  if (input.caster !== undefined) {
    const caster = combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected spell caster combatant.");
    }
    combatants.set(spellCasterId, {
      ...caster,
      concentration: concentrationForBoundEffects(
        input.caster.concentration,
        casterActiveEffects,
      ),
    });
  }
  if (input.target !== undefined) {
    const target = combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected spell target combatant.");
    }
    combatants.set(spellTargetId, {
      ...target,
      concentration: concentrationForBoundEffects(
        input.target.concentration,
        targetActiveEffects,
      ),
    });
  }
  const state = battleStateWithAllocatedEffectOccurrencesForTest({
    state: { ...session.state, combatants },
    occurrences: [
      ...casterActiveEffects.map((effect) => ({
        kind: "activeEffect" as const,
        ownerId: spellCasterId,
        effect,
      })),
      ...targetActiveEffects.map((effect) => ({
        kind: "activeEffect" as const,
        ownerId: spellTargetId,
        effect,
      })),
    ],
  }).state;
  return battleRuntimeSessionForTest({
    ...session,
    state,
  });
}

function dispelTestSessionWithObjectContactBindings(): BattleRuntimeSession {
  const heatMetal = spellRecord(heatMetalUnitId);
  return spellBattle({
    preparedSpells: [spellRecord(dispelMagicUnitId), heatMetal],
    spellSlots: [
      { spellLevel: 2, count: 1 },
      { spellLevel: 3, count: 1 },
      { spellLevel: 4, count: 1 },
    ],
    targetSpellcasting: wizardSpellcasting({
      preparedSpells: [heatMetal],
      spellSlots: [
        { spellLevel: 2, count: 1 },
        { spellLevel: 4, count: 1 },
      ],
    }),
  });
}

function bindDispellableObjectContactEffect(
  session: BattleRuntimeSession,
  effect: BattleActiveEffectOccurrenceTemplate,
): BattleActiveEffectOccurrenceTemplate {
  if (effect.kind !== "spellObjectContactDamage") {
    return effect;
  }
  return {
    ...effect,
    sourceProcedureRef: requireCharacterSpellProcedureRefForTest(
      session,
      effect.sourceCombatantId,
      spellSlotInvocationRef(
        heatMetalUnitId,
        effect.sourceSpellLevel,
        "objectContactDamage",
      ),
    ),
  };
}

function concentrationForBoundEffects(
  concentration:
    | {
        readonly sourceProcedureRef: ReturnType<
          typeof battleProcedureExecutionRefForTest
        >;
        readonly effectKind: "spellEffect";
      }
    | null
    | undefined,
  effects: readonly BattleActiveEffectOccurrenceTemplate[],
) {
  if (concentration === null) {
    return null;
  }
  const boundEffect = effects.find(
    (effect) => effect.kind === "spellObjectContactDamage",
  );
  return boundEffect === undefined
    ? (concentration ?? null)
    : {
        sourceProcedureRef: boundEffect.sourceProcedureRef,
        effectKind: "spellEffect" as const,
      };
}

function objectSpellEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly sourceEffectId?: string;
  readonly sourceCombatantId?: typeof spellCasterId | typeof spellTargetId;
  readonly sourceSpellLevel: number;
}): Omit<BattleTrackedOngoingSpellLightEmitter, "effectRef"> & {
  readonly effectRef?: never;
} {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: input.sourceProcedureRef,
    sourceCombatantId: input.sourceCombatantId ?? spellTargetId,
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
    sourceEffectId: battleSpellEffectOccurrenceId(
      input.sourceEffectId ??
        `${spellTargetId}:${input.sourceProcedureRef}:${input.objectId}:test-effect`,
    ),
    attachment: { kind: "object", objectId: input.objectId },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: { kind: "untilDispelled" },
  };
}

function heatMetalObjectContactDamageEffect(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceSpellLevel: number;
  readonly sourceCombatantId?: typeof spellCasterId | typeof spellTargetId;
}): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "spellObjectContactDamage" }
> {
  const sourceCombatantId = input.sourceCombatantId ?? spellCasterId;
  return {
    kind: "spellObjectContactDamage",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(heatMetalUnitId),
    ),
    sourceCombatantId,
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
    objectId: input.objectId,
    rangeFeet: movementFeet(60),
    damage: {
      expr: { dice: 2, dieSize: 8 },
      damageType: "fire",
    },
    startedOn: { actorId: sourceCombatantId, round: Round(1) },
    expiresAt: {
      kind: "concentration",
      combatantId: sourceCombatantId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function spatialMeleeSpellAttackProxyEffect(): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "spatialMeleeSpellAttackProxy" }
> {
  return {
    kind: "spatialMeleeSpellAttackProxy",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spiritualWeaponUnitId),
    ),
    sourceCombatantId: spellCasterId,
    forcePositionId: battleTablePositionId("dispel-spiritual-weapon-force"),
    startedOn: { actorId: spellCasterId, round: Round(1) },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function magicSuppressionEmanationEffect(
  areaId: ReturnType<typeof battleAreaId>,
): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "magicSuppressionEmanation" }
> {
  return magicSuppressionEmanationEffectTemplateForTest({
    areaId,
    aura: magicSuppressionEmanationMembershipForTest({
      sourceCombatantId: spellTargetId,
      originIncluded: true,
      nonOriginCombatantIds: [],
    }),
  });
}

type SurfaceTargetKind = "creature" | "object" | "magical_effect";

function dispelMagicTargetContracts(spell: SpellRecord): readonly {
  readonly holeId: string;
  readonly targetKinds: readonly SurfaceTargetKind[];
}[] {
  if (spell.mechanics.family !== "activation") {
    return [];
  }
  return spell.mechanics.phases.flatMap((phase) => {
    if (
      (phase.kind !== "direct" && phase.kind !== "ability_check_gate") ||
      phase.attachment.kind !== "hole" ||
      phase.attachment.value.kind !== "target" ||
      !("targetKinds" in phase.attachment.value.selection) ||
      phase.attachment.value.selection.targetKinds === undefined
    ) {
      return [];
    }
    return [
      {
        holeId: phase.attachment.holeId,
        // The guard above establishes the Dispel Magic target-kind contract shape.
        targetKinds: phase.attachment.value.selection
          .targetKinds as readonly SurfaceTargetKind[],
      },
    ];
  });
}

function dispelMagicWithTargetContract(
  spell: SpellRecord,
  input: {
    readonly id: string;
    readonly directTargetKinds?: readonly SurfaceTargetKind[];
    readonly abilityCheckTargetKinds?: readonly SurfaceTargetKind[];
    readonly directHoleId?: string;
    readonly abilityCheckHoleId?: string;
  },
): SpellRecord {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Dispel Magic activation mechanics.");
  }
  // Test-only synthetic record keeps the parsed SpellRecord shape while changing
  // contract details that the admission gate must reject.
  return decodeSpellRecordForTest({
    ...spell,
    id: input.id,
    mechanics: {
      ...spell.mechanics,
      phases: spell.mechanics.phases.map((phase): ActivationPhase => {
        if (phase.kind === "direct") {
          return dispelMagicTargetPhaseWithContract(
            phase,
            targetContractPatch(input.directTargetKinds, input.directHoleId),
          );
        }
        if (phase.kind === "ability_check_gate") {
          return dispelMagicTargetPhaseWithContract(
            phase,
            targetContractPatch(
              input.abilityCheckTargetKinds,
              input.abilityCheckHoleId,
            ),
          );
        }
        return phase;
      }),
    },
  });
}

function dispelMagicWithExtraPhase(
  spell: SpellRecord,
  id: string,
): SpellRecord {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Dispel Magic activation mechanics.");
  }
  const extraPhase = spell.mechanics.phases[0];
  if (extraPhase === undefined) {
    throw new Error("Expected Dispel Magic phases.");
  }
  // Test-only synthetic record keeps the parsed SpellRecord shape while adding a
  // phase that the admission gate must reject.
  return decodeSpellRecordForTest({
    ...spell,
    id,
    mechanics: {
      ...spell.mechanics,
      phases: [...spell.mechanics.phases, extraPhase],
    },
  });
}

function dispelMagicWithAbilityCheckOnFail(
  spell: SpellRecord,
  id: string,
): SpellRecord {
  if (spell.mechanics.family !== "activation") {
    throw new Error("Expected Dispel Magic activation mechanics.");
  }
  // Test-only synthetic record keeps the parsed SpellRecord shape while adding
  // an on-fail branch that the admission gate must reject.
  return decodeSpellRecordForTest({
    ...spell,
    id,
    mechanics: {
      ...spell.mechanics,
      phases: spell.mechanics.phases.map(
        (phase): ActivationPhase =>
          phase.kind === "ability_check_gate"
            ? { ...phase, onFail: { kind: "none" } }
            : phase,
      ),
    },
  });
}

type DispelMagicTargetPhase = Extract<
  ActivationPhase,
  { readonly kind: "direct" } | { readonly kind: "ability_check_gate" }
>;

function dispelMagicTargetPhaseWithContract<
  TPhase extends DispelMagicTargetPhase,
>(
  phase: TPhase,
  input: {
    readonly targetKinds?: readonly SurfaceTargetKind[];
    readonly holeId?: string;
  },
): TPhase {
  if (
    phase.attachment.kind !== "hole" ||
    phase.attachment.value.kind !== "target"
  ) {
    return phase;
  }
  // The generic phase type is preserved; only the shared target contract fields
  // are replaced for negative admission tests.
  return {
    ...phase,
    attachment: {
      ...phase.attachment,
      ...(input.holeId === undefined ? {} : { holeId: input.holeId }),
      value: {
        ...phase.attachment.value,
        selection: {
          ...phase.attachment.value.selection,
          ...(input.targetKinds === undefined
            ? {}
            : { targetKinds: input.targetKinds }),
        },
      },
    },
  } as TPhase;
}

function targetContractPatch(
  targetKinds: readonly SurfaceTargetKind[] | undefined,
  holeId: string | undefined,
): {
  readonly targetKinds?: readonly SurfaceTargetKind[];
  readonly holeId?: string;
} {
  return {
    ...(targetKinds === undefined ? {} : { targetKinds }),
    ...(holeId === undefined ? {} : { holeId }),
  };
}

function testBattleSpellEffectLevel(sourceSpellLevel: number) {
  const parsed = parseBattleSpellEffectLevel(sourceSpellLevel);
  if (parsed === null) {
    throw new Error("Expected test spell effect level to be in range.");
  }
  return parsed;
}

function ongoingSpellTargetFill(input: {
  readonly hole: Extract<
    BattleHole,
    { readonly kind: "ongoingSpellTargetChoice" }
  >;
  readonly target: OngoingSpellTarget;
  readonly facts?: readonly OngoingSpellTargetWithinRangeFact[];
}): OngoingSpellTargetChoiceFill {
  return {
    kind: "ongoingSpellTargetChoice",
    holeId: input.hole.holeId,
    value: input.target,
    spatialFacts: input.facts ?? [
      ongoingSpellTargetWithinRangeFact({
        sourceProcedureRef: input.hole.procedureRef,
        target: input.target,
      }),
    ],
  };
}

function ongoingSpellTargetWithinRangeFact(input: {
  readonly sourceProcedureRef: OngoingSpellTargetWithinRangeFact["sourceProcedureRef"];
  readonly target: OngoingSpellTarget;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
}): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    sourceProcedureRef: input.sourceProcedureRef,
    target: input.target,
    rangeFeet: input.rangeFeet ?? movementFeet(120),
  };
}

function abilityCheckFill(
  hole: Extract<BattleHole, { readonly kind: "spellcastingAbilityCheck" }>,
  total: number,
): Extract<BattleFill, { readonly kind: "abilityCheck" }> {
  return { kind: "abilityCheck", holeId: hole.holeId, value: { total } };
}
