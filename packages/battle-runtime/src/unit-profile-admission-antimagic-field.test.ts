import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ANTIMAGIC-FIELD-GENERIC-SUPPRESSION antimagic_field
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-magic-suppression-emanation
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  movementFeet,
  PositiveInteger,
  Round,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import { Result, Schema } from "effect";
import { describe, expect, test } from "vitest";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { magicSuppressionEmanationProfile } from "./battle-reducer/spell-procedure-profiles/magic-suppression-emanation.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./battle-reducer/spell-procedure-profiles/profile.ts";
import { admittedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { spellRuleExecutionFactsWithCastingSource } from "./procedure-execution/spell-rule-facts.ts";
import {
  characterExecutionWithSpatialMeleeSpellAttackProxyRepeatAttack,
  characterExecutionWithSpellInvocations,
  spellProcedureExecution,
} from "./character-execution-admission.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  snapshotBattle,
  type BattleActiveEffect,
  type BattleMagicSuppressionAffectedOngoingSpellEffect,
  type BattleMagicSuppressionEmanationMembership,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
} from "./index.ts";
import type {
  BattleCreatureState,
  BattleSpellAdmissionSource,
  BattleStoredLightEmitterTemplate,
  BattleTrackedOngoingSpellLightEmitterMechanicalFacts,
} from "./battle-state-execution.ts";
import { battleSpellExecutionSourceFromAdmission } from "./battle-state-execution.ts";
import {
  antimagicFieldUnitId,
  continualFlameUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog.test-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  maybeBonusSpellAct,
  spellAct,
  spatialMeleeSpellAttackProxyPositionFill,
  spatialMeleeSpellAttackProxyTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  resolveBattleSubject,
} from "./battle-runtime.test-support.ts";

function effectRefForTest(
  effectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
) {
  return battleEffectExecutionRefForTest(String(effectId));
}

const antimagicFieldAreaId = battleAreaId("unit-profile-antimagic-field-area");
type SpellBattleSlots = NonNullable<
  Parameters<typeof spellBattle>[0]["spellSlots"]
>;

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function antimagicFieldMechanics(): OngoingSpellMechanics {
  const mechanics = spellRecord(antimagicFieldUnitId).mechanics;
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Antimagic Field ongoing-effect mechanics.");
  return mechanics;
}

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function mutatedAntimagicFieldSource(
  mutate: (mechanics: OngoingSpellMechanics) => void,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(antimagicFieldUnitId));
  const mechanics = structuredClone(source.mechanics);
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Antimagic Field ongoing-effect mechanics.");
  mutate(mechanics);
  return { ...mechanicsSource(source), mechanics };
}

function syntheticAntimagicFieldRecord(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_magic_suppression_${suffix}`,
    kind: "spell",
    name: `Synthetic Magic Suppression ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_magic_suppression_${suffix}`,
    },
    mechanics: mutate(structuredClone(antimagicFieldMechanics())),
  });
}

function staticSpellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor))
    throw new Error("Expected a spellcasting character fixture.");
  return actor;
}

function isSpellAdmissionActor(
  actor: BattleCreatureState | undefined,
): actor is SpellAdmissionActor {
  return (
    actor?.origin.kind === "character" &&
    actor.origin.spellcasting?.canCastSpells === true
  );
}

function issueFacts(result: {
  readonly tag: string;
  readonly issues?: readonly {
    readonly failedFact: string;
    readonly mechanicsPath: unknown;
  }[];
}): readonly {
  readonly failedFact: string;
  readonly mechanicsPath: unknown;
}[] {
  return result.tag === "unsupported"
    ? (result.issues ?? []).map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      }))
    : [];
}

describe("magicSuppressionEmanation static admission", () => {
  test("projects exact Antimagic mechanics and mechanics-free execution", () => {
    const source = spellAdmissionSource(spellRecord(antimagicFieldUnitId));
    const result = magicSuppressionEmanationProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 8,
      radiusFeet: 10,
      durationTicks: 600,
      rangeFeet: 0,
      exceptSources: ["artifact", "deity"],
      suppressedTimeCountsAgainstDuration: true,
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
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationPath(PositiveInteger(3)),
        spellOngoingOperationPath(PositiveInteger(4)),
        spellOngoingOperationPath(PositiveInteger(5)),
        spellOngoingOperationEffectPath(PositiveInteger(5)),
      ],
      unowned: [
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(3)),
        spellOngoingOperationEffectPath(PositiveInteger(4)),
      ],
    });

    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: staticSpellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(8), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocations).toHaveLength(1);
    const invocation = invocations[0];
    if (invocation === undefined)
      throw new Error("Expected an admitted Antimagic Field invocation.");
    expect(invocation.spell).not.toHaveProperty("mechanics");
    expect(invocation.exceptSources).toEqual(["artifact", "deity"]);
    expect(spellProcedureExecution(invocation).exceptSources).toEqual([
      "artifact",
      "deity",
    ]);
    const { spell: _spell, ...procedureFacts } = invocation;
    const execution = {
      ...procedureFacts,
      spellRuleFacts: spellRuleExecutionFactsWithCastingSource(
        source.spellDefinitionRuleFacts,
        source.castingSource,
      ),
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-antimagic-static",
      ),
    };
    const encoded = Schema.encodeSync(
      magicSuppressionEmanationProfile.executionSchema,
    )(execution);
    expect(encoded).not.toHaveProperty("mechanics");
    expect(encoded).toHaveProperty("exceptSources", ["artifact", "deity"]);
    const { exceptSources: _exceptSources, ...withoutExceptionPolicy } =
      encoded;
    expect(
      Result.isFailure(
        Schema.decodeUnknownResult(
          magicSuppressionEmanationProfile.executionSchema,
        )(withoutExceptionPolicy),
      ),
    ).toBe(true);
    const { sourceProcedureRef: _sourceProcedureRef, ...schemaFacts } =
      execution;
    expect(
      Schema.decodeSync(magicSuppressionEmanationProfile.executionSchema)(
        encoded,
      ),
    ).toEqual(schemaFacts);
  });

  test("recognizes renamed identity and a renamed structural area hole", () => {
    const canonical = spellAdmissionSource(spellRecord(antimagicFieldUnitId));
    const renamed = spellAdmissionSource(
      syntheticAntimagicFieldRecord((mechanics) => {
        if (mechanics.attachment.kind !== "area")
          throw new Error("Expected the canonical direct Emanation.");
        return {
          ...mechanics,
          attachment: {
            kind: "hole",
            holeId: "synthetic_emanation_hole",
            label: "synthetic emanation",
            value: mechanics.attachment,
          },
        };
      }, "renamed"),
    );
    const canonicalResult = magicSuppressionEmanationProfile.admitMechanics(
      mechanicsSource(canonical),
    );
    const renamedResult = magicSuppressionEmanationProfile.admitMechanics(
      mechanicsSource(renamed),
    );
    expect(canonicalResult.tag).toBe("supported");
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

  test("accepts reversed exception and operation order with actual evidence ordinals", () => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      const suppression = mechanics.operations.find(
        ({ effect }) => effect.kind === "suppress_ongoing_magic_effects",
      );
      if (suppression?.effect.kind !== "suppress_ongoing_magic_effects")
        throw new Error("Expected suppression operation.");
      Reflect.set(suppression.effect, "exceptSources", ["deity", "artifact"]);
      Reflect.set(mechanics, "operations", [...mechanics.operations].reverse());
    });
    const result = magicSuppressionEmanationProfile.admitMechanics(source);
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts.exceptSources).toEqual(["artifact", "deity"]);
    expect(result.admitted.evidence.consumed).toContainEqual(
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    );
    expect(result.admitted.evidence.unowned).toEqual([
      spellOngoingOperationEffectPath(PositiveInteger(2)),
      spellOngoingOperationEffectPath(PositiveInteger(3)),
      spellOngoingOperationEffectPath(PositiveInteger(4)),
      spellOngoingOperationEffectPath(PositiveInteger(5)),
    ]);
  });

  test.each([
    ["missing deity", ["artifact"]],
    ["duplicate artifact", ["artifact", "artifact"]],
    ["extra duplicate", ["artifact", "deity", "artifact"]],
  ] as const)("rejects $0 suppression exceptions", (_label, exceptSources) => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      const suppression = mechanics.operations.find(
        ({ effect }) => effect.kind === "suppress_ongoing_magic_effects",
      );
      if (suppression?.effect.kind !== "suppress_ongoing_magic_effects")
        throw new Error("Expected suppression operation.");
      Reflect.set(suppression.effect, "exceptSources", exceptSources);
    });
    expect(
      issueFacts(magicSuppressionEmanationProfile.admitMechanics(source)),
    ).toContainEqual({
      failedFact: "exceptSources",
      mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(5)),
    });
  });

  test("keeps malformed suppression trigger at its actual ordinal", () => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      const suppression = mechanics.operations[4];
      if (suppression?.effect.kind !== "suppress_ongoing_magic_effects")
        throw new Error("Expected suppression operation ordinal 5.");
      Reflect.set(suppression, "trigger", { kind: "on_effect_starts" });
    });
    expect(
      issueFacts(magicSuppressionEmanationProfile.admitMechanics(source)),
    ).toContainEqual({
      failedFact: "operationTrigger",
      mechanicsPath: spellOngoingOperationPath(PositiveInteger(5)),
    });
  });

  test("reports structurally unknowable malformed effect generically at its actual ordinal", () => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      const suppression = mechanics.operations[4];
      if (suppression === undefined)
        throw new Error("Expected suppression operation ordinal 5.");
      Reflect.set(suppression, "effect", { kind: "none" });
    });
    const issues = issueFacts(
      magicSuppressionEmanationProfile.admitMechanics(source),
    );
    expect(issues).toContainEqual({
      failedFact: "operationEffect",
      mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(5)),
    });
    expect(issues).toContainEqual({
      failedFact: "suppressionOperation",
      mechanicsPath: spellMechanicsRootPath(),
    });
  });

  test("accumulates exact extra operation and authored conditional paths", () => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      const extra = structuredClone(mechanics.operations[0]);
      if (extra === undefined)
        throw new Error("Expected an operation fixture.");
      Reflect.set(extra, "predicate", { kind: "synthetic" });
      Reflect.set(mechanics, "operations", [...mechanics.operations, extra]);
      const conditionalFixture = spellRecord("phantasmal_force").mechanics;
      if (
        conditionalFixture.family !== "ongoing_effect" ||
        conditionalFixture.authoredConditionalMechanics?.[0] === undefined
      )
        throw new Error("Expected an authored conditional fixture.");
      Reflect.set(mechanics, "authoredConditionalMechanics", [
        structuredClone(conditionalFixture.authoredConditionalMechanics[0]),
        structuredClone(conditionalFixture.authoredConditionalMechanics[0]),
      ]);
    });
    expect(
      issueFacts(magicSuppressionEmanationProfile.admitMechanics(source)),
    ).toEqual(
      expect.arrayContaining([
        {
          failedFact: "operationPredicate",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(6)),
        },
        {
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(6)),
        },
        {
          failedFact: "authoredConditionalMechanics",
          mechanicsPath: spellOngoingAuthoredConditionalMechanicPath(
            PositiveInteger(1),
          ),
        },
        {
          failedFact: "authoredConditionalMechanics",
          mechanicsPath: spellOngoingAuthoredConditionalMechanicPath(
            PositiveInteger(2),
          ),
        },
      ]),
    );
  });

  test("accumulates independent header and suppression failures", () => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      Reflect.set(mechanics, "level", 7);
      Reflect.set(mechanics, "school", "evocation");
      Reflect.set(mechanics, "castingTime", { kind: "bonus_action" });
      const suppression = mechanics.operations[4];
      if (suppression?.effect.kind !== "suppress_ongoing_magic_effects")
        throw new Error("Expected suppression operation ordinal 5.");
      Reflect.set(suppression.effect, "exceptSources", ["artifact"]);
      Reflect.set(
        suppression.effect,
        "suppressedTimeCountsAgainstDuration",
        false,
      );
    });
    expect(
      issueFacts(magicSuppressionEmanationProfile.admitMechanics(source)),
    ).toEqual(
      expect.arrayContaining([
        {
          failedFact: "level",
          mechanicsPath: spellMechanicsHeaderPath("level"),
        },
        {
          failedFact: "school",
          mechanicsPath: spellMechanicsHeaderPath("school"),
        },
        {
          failedFact: "castingTime",
          mechanicsPath: spellMechanicsHeaderPath("castingTime"),
        },
        {
          failedFact: "exceptSources",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(5)),
        },
        {
          failedFact: "suppressedTimeCountsAgainstDuration",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(5)),
        },
      ]),
    );
  });

  test("accumulates every malformed duplicated suppression occurrence", () => {
    const source = mutatedAntimagicFieldSource((mechanics) => {
      const suppression = mechanics.operations[4];
      if (suppression?.effect.kind !== "suppress_ongoing_magic_effects")
        throw new Error("Expected suppression operation ordinal 5.");
      const duplicate = structuredClone(suppression);
      Reflect.set(suppression.effect, "syntheticExtra", true);
      Reflect.set(
        suppression.effect,
        "suppressedTimeCountsAgainstDuration",
        false,
      );
      Reflect.set(suppression.effect, "exceptSources", ["artifact"]);
      Reflect.set(duplicate.effect, "anotherSyntheticExtra", true);
      Reflect.deleteProperty(
        duplicate.effect,
        "suppressedTimeCountsAgainstDuration",
      );
      Reflect.set(duplicate.effect, "exceptSources", ["deity", "deity"]);
      Reflect.set(mechanics, "operations", [
        ...mechanics.operations,
        duplicate,
      ]);
    });
    expect(
      issueFacts(magicSuppressionEmanationProfile.admitMechanics(source)),
    ).toEqual(
      expect.arrayContaining([
        {
          failedFact: "suppressionOperation",
          mechanicsPath: spellMechanicsRootPath(),
        },
        {
          failedFact: "operationCount",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(6)),
        },
        ...[PositiveInteger(5), PositiveInteger(6)].flatMap((ordinal) => [
          {
            failedFact: "operationEffect",
            mechanicsPath: spellOngoingOperationEffectPath(ordinal),
          },
          {
            failedFact: "suppressedTimeCountsAgainstDuration",
            mechanicsPath: spellOngoingOperationEffectPath(ordinal),
          },
          {
            failedFact: "exceptSources",
            mechanicsPath: spellOngoingOperationEffectPath(ordinal),
          },
        ]),
      ]),
    );
  });

  test.each([
    {
      label: "duration value",
      mutate: (mechanics: OngoingSpellMechanics) => {
        if (mechanics.duration.kind === "concentration")
          Reflect.set(mechanics.duration.upTo, "amount", 2);
      },
      failedFact: "durationValue",
      mechanicsPath: spellDurationValuePath(),
    },
    {
      label: "Emanation radius",
      mutate: (mechanics: OngoingSpellMechanics) => {
        if (mechanics.attachment.kind === "area")
          Reflect.set(mechanics.attachment.shape, "radiusFeet", 15);
      },
      failedFact: "attachment",
      mechanicsPath: spellOngoingAttachmentPath(),
    },
  ])(
    "rejects an unsupported $label at its exact path",
    ({ mutate, failedFact, mechanicsPath }) => {
      const source = mutatedAntimagicFieldSource(mutate);
      expect(
        issueFacts(magicSuppressionEmanationProfile.admitMechanics(source)),
      ).toContainEqual({ failedFact, mechanicsPath });
    },
  );
});

describe("SRD Antimagic Field ongoing spell suppression admission", () => {
  test("antimagic field is admitted as a level-8 self Emanation suppression spell", () => {
    const session = antimagicFieldBattle();

    const act = spellAct({
      session,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });
    const awaitingArea = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [],
    });
    if (awaitingArea.tag !== "needsHoles") {
      throw new Error("Expected Antimagic Field area choice.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingArea.snapshot);

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
            kind: "spellAreaChoice",
            area: {
              kind: "selfOriginEmanation",
              radiusFeet: movementFeet(10),
            },
          }),
        ],
      }),
    );
  });

  test("suppresses ordinary tracked spell light without deleting the occurrence", () => {
    const continualFlameEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-continual-flame-effect",
    );
    const artifactEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-artifact-light-effect",
    );
    const ordinaryLightTemplate = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(continualFlameUnitId),
      ),
      sourceEffectId: continualFlameEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-continual-flame-object",
    });
    const artifactLightTemplate = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_artifact_light"),
      ),
      sourceEffectId: artifactEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-artifact-light-object",
    });
    const session = antimagicFieldBattle({
      lightEmitters: [ordinaryLightTemplate, artifactLightTemplate],
    });
    const [ordinaryLight, artifactLight] = session.state.lightEmitters;
    if (ordinaryLight === undefined || artifactLight === undefined) {
      throw new Error("Expected both allocated tracked light occurrences.");
    }

    const resolved = castAntimagicField(session, [
      antimagicAffectedLight(ordinaryLight.effectRef, "ordinarySpell"),
      antimagicAffectedLight(artifactLight.effectRef, "artifact"),
    ]);

    expect(resolved.state.lightEmitters).toEqual([
      ordinaryLight,
      artifactLight,
    ]);
    const { effectRef: _artifactEffectRef, ...artifactProjection } =
      artifactLight;
    const { effectRef: _ordinaryEffectRef, ...ordinaryProjection } =
      ordinaryLight;
    expect(resolved.snapshot.lightEmitters).toEqual([artifactProjection]);
    expect(resolved.snapshot.storedLightEmitters).toEqual([
      ordinaryLight,
      artifactLight,
    ]);
    assertBattleSnapshotCodecRoundTripForTest(resolved.snapshot);
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "magicSuppressionEmanation",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: antimagicFieldAreaId,
        auraMembership: {
          kind: "magicSuppressionEmanationMembership",
          originIncluded: true,
          nonOriginCombatantIds: [],
        },
        suppressedOngoingSpellEffects: [
          {
            kind: "spellLightEmitter",
            effectRef: ordinaryLight.effectRef,
          },
        ],
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(600),
        },
      }),
    );

    const restored = breakBattleConcentration(resolved.state, spellCasterId);
    expect(
      restored.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "magicSuppressionEmanation",
        ),
    ).toBe(false);
    expect(snapshotBattle(restored).lightEmitters).toEqual([
      ordinaryProjection,
      artifactProjection,
    ]);
  });

  test("rejects an aura membership that lists the source as non-origin", () => {
    const session = antimagicFieldBattle();
    const act = spellAct({
      session,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });
    const areaHole = requireHole(act.initialHoles, "spellAreaChoice");

    const result = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        antimagicFieldAreaFill({
          hole: areaHole,
          affectedOngoingSpellEffects: [],
          auraMembership: {
            kind: "magicSuppressionEmanationMembership",
            originIncluded: false,
            nonOriginCombatantIds: [spellCasterId],
          },
        }),
      ],
    });

    expect(result).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "magic-suppression emanation non-origin aura membership cannot include the source combatant.",
    });
  });

  test("suppressed duration-based spell light still expires while suppressed", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-duration-light-effect",
    );
    const durationLightTemplate = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_duration_light"),
      ),
      sourceEffectId,
      sourceSpellLevel: 1,
      objectId: "unit-profile-antimagic-duration-light-object",
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
    });
    const session = antimagicFieldBattle({
      lightEmitters: [durationLightTemplate],
    });
    const durationLight = session.state.lightEmitters[0];
    if (durationLight === undefined) {
      throw new Error("Expected allocated duration light occurrence.");
    }
    const suppressed = castAntimagicField(session, [
      antimagicAffectedLight(durationLight.effectRef, "ordinarySpell"),
    ]);

    expect(suppressed.state.lightEmitters).toEqual([durationLight]);
    expect(suppressed.snapshot.lightEmitters).toEqual([]);
    expect(suppressed.snapshot.storedLightEmitters).toEqual([durationLight]);
    assertBattleSnapshotCodecRoundTripForTest(suppressed.snapshot);

    const targetTurn = endTurn({
      state: suppressed.state,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn.");
    }

    expect(casterTurn.state.lightEmitters).toEqual([]);
  });

  test("suppresses tracked object-contact spell effects without deleting the occurrence", () => {
    const objectId = battleObjectId("unit-profile-antimagic-heat-metal-object");
    const sourceEffectId = battleSpellEffectOccurrenceId(
      `${spellCasterId}:${heatMetalUnitId}:${objectId}`,
    );
    const heatMetalEffect = heatMetalObjectContactDamageEffect({
      objectId,
      effectId: sourceEffectId,
      durationTicks: elapsedTimeTicks(3),
    });
    const session = antimagicFieldBattle({
      activeEffects: [heatMetalEffect],
      preparedSpells: [
        spellRecord(antimagicFieldUnitId),
        spellRecord(heatMetalUnitId),
      ],
      spellSlots: [
        { spellLevel: 8, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const suppressed = antimagicFieldSuppressing(session.state, [
      antimagicAffectedSpellObjectContactDamage(
        sourceEffectId,
        "ordinarySpell",
      ),
    ]);

    expect(
      suppressed.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "spellObjectContactDamage" &&
            effect.effectRef === effectRefForTest(sourceEffectId),
        ),
    ).toBe(true);
    expect(
      maybeBonusSpellAct({
        session: battleRuntimeSessionForTest({ ...session, state: suppressed }),
        spellId: heatMetalUnitId,
      }),
    ).toBeUndefined();

    const targetTurn = endTurn({
      state: suppressed,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn.");
    }

    const tickedEffect = casterTurn.state.combatants
      .get(spellCasterId)
      ?.activeEffects.find(
        (effect) =>
          effect.kind === "spellObjectContactDamage" &&
          effect.effectRef === effectRefForTest(sourceEffectId),
      );
    expect(tickedEffect).toMatchObject({
      kind: "spellObjectContactDamage",
      expiresAt: {
        kind: "concentration",
        durationTicks: elapsedTimeTicks(2),
      },
    });

    const restored = breakBattleConcentration(suppressed, spellTargetId);
    expect(
      maybeBonusSpellAct({
        session: battleRuntimeSessionForTest({ ...session, state: restored }),
        spellId: heatMetalUnitId,
      }),
    ).toBeDefined();
  });

  test("suppresses tracked Spiritual Weapon spell effects without deleting the occurrence", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      `${spellCasterId}:${spiritualWeaponUnitId}:unit-profile-antimagic-spiritual-weapon`,
    );
    const spatialMeleeSpellAttackProxyEffect =
      spatialMeleeSpellAttackProxyActiveEffect({
        effectId: sourceEffectId,
        durationTicks: elapsedTimeTicks(3),
      });
    const session = antimagicFieldBattle({
      activeEffects: [spatialMeleeSpellAttackProxyEffect],
      preparedSpells: [
        spellRecord(antimagicFieldUnitId),
        spellRecord(spiritualWeaponUnitId),
      ],
      spellSlots: [
        { spellLevel: 8, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const suppressed = antimagicFieldSuppressing(session.state, [
      antimagicAffectedSpiritualWeapon(sourceEffectId, "ordinarySpell"),
    ]);

    expect(
      suppressed.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "spatialMeleeSpellAttackProxy" &&
            effect.effectRef === effectRefForTest(sourceEffectId),
        ),
    ).toBe(true);
    expect(
      maybeSpiritualWeaponRepeatAct(
        battleRuntimeSessionForTest({ ...session, state: suppressed }),
      ),
    ).toBeUndefined();

    const targetTurn = endTurn({
      state: suppressed,
      actorId: spellCasterId,
    });
    expect(targetTurn.tag).toBe("resolved");
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected target turn.");
    }
    const casterTurn = endTurn({
      state: targetTurn.state,
      actorId: spellTargetId,
    });
    expect(casterTurn.tag).toBe("resolved");
    if (casterTurn.tag !== "resolved") {
      throw new Error("Expected caster turn.");
    }

    const tickedEffect = casterTurn.state.combatants
      .get(spellCasterId)
      ?.activeEffects.find(
        (effect) =>
          effect.kind === "spatialMeleeSpellAttackProxy" &&
          effect.effectRef === effectRefForTest(sourceEffectId),
      );
    expect(tickedEffect).toMatchObject({
      kind: "spatialMeleeSpellAttackProxy",
      expiresAt: {
        kind: "concentration",
        durationTicks: elapsedTimeTicks(2),
      },
    });

    const restored = breakBattleConcentration(suppressed, spellTargetId);
    expect(
      maybeSpiritualWeaponRepeatAct(
        battleRuntimeSessionForTest({ ...session, state: restored }),
      ),
    ).toBeDefined();
  });

  test("rejects a stale Spiritual Weapon repeat subject after Antimagic Field suppression", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      `${spellCasterId}:${spiritualWeaponUnitId}:unit-profile-antimagic-stale-spiritual-weapon`,
    );
    const spatialMeleeSpellAttackProxyEffect =
      spatialMeleeSpellAttackProxyActiveEffect({
        effectId: sourceEffectId,
        durationTicks: elapsedTimeTicks(3),
      });
    const session = antimagicFieldBattle({
      activeEffects: [spatialMeleeSpellAttackProxyEffect],
      preparedSpells: [
        spellRecord(antimagicFieldUnitId),
        spellRecord(spiritualWeaponUnitId),
      ],
      spellSlots: [
        { spellLevel: 8, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const staleAct = maybeSpiritualWeaponRepeatAct(session);
    expect(staleAct).toBeDefined();
    if (staleAct === undefined) {
      throw new Error(
        "Expected Spiritual Weapon repeat act before suppression.",
      );
    }
    const suppressed = antimagicFieldSuppressing(session.state, [
      antimagicAffectedSpiritualWeapon(sourceEffectId, "ordinarySpell"),
    ]);
    const forceHole = requireHole(
      staleAct.initialHoles,
      "spatialMeleeSpellAttackProxyPosition",
    );
    const targetHole = requireHole(staleAct.initialHoles, "targetChoice");
    const movedForceId = "unit-profile-antimagic-stale-spiritual-weapon-moved";

    const targetFills = [
      spatialMeleeSpellAttackProxyPositionFill({
        hole: forceHole,
        positionId: movedForceId,
      }),
      spatialMeleeSpellAttackProxyTargetFill(
        targetHole,
        spiritualWeaponUnitId,
        spellCasterId,
        spellTargetId,
        battleTablePositionId(movedForceId),
      ),
    ];
    const resolved = resolveBattleSubject({
      state: suppressed,
      subject: staleAct.subject,
      fills: targetFills,
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "spatial melee spell-attack proxy repeat attack is suppressed by magic-suppression emanation.",
    });
    expect(
      suppressed.combatants
        .get(spellCasterId)
        ?.activeEffects.find(
          (effect) =>
            effect.kind === "spatialMeleeSpellAttackProxy" &&
            effect.effectRef === effectRefForTest(sourceEffectId),
        ),
    ).toMatchObject({
      kind: "spatialMeleeSpellAttackProxy",
      forcePositionId: spatialMeleeSpellAttackProxyEffect.forcePositionId,
    });
  });

  test("empty Antimagic Field suppression preserves tracked light occurrences", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-empty-suppression-effect",
    );
    const emitterTemplate = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_empty_suppression_light",
      ),
      sourceEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-empty-suppression-object",
    });
    const session = antimagicFieldBattle({ lightEmitters: [emitterTemplate] });
    const emitter = session.state.lightEmitters[0];
    if (emitter === undefined) {
      throw new Error("Expected allocated tracked light occurrence.");
    }
    const resolved = castAntimagicField(session, []);

    expect(resolved.state.lightEmitters).toEqual([emitter]);
    const { effectRef: _emitterEffectRef, ...emitterProjection } = emitter;
    expect(resolved.snapshot.lightEmitters).toEqual([emitterProjection]);
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "magicSuppressionEmanation",
        suppressedOngoingSpellEffects: [],
      }),
    );
  });
});

function maybeSpiritualWeaponRepeatAct(session: BattleRuntimeSession) {
  return discoverBattleActs(session).find((candidate) => {
    const presentation = battleActSpellPresentation(candidate);
    return (
      candidate.subject.tag === "bonusActionSpell" &&
      presentation?.invocation.tag === "spellEffect" &&
      presentation.invocation.spellId === spiritualWeaponUnitId &&
      presentation.invocation.procedure === "spatialMeleeSpellAttackProxy"
    );
  });
}

function antimagicFieldBattle(input?: {
  readonly lightEmitters?: readonly BattleStoredLightEmitterTemplate[];
  readonly activeEffects?: readonly BattleActiveEffect[];
  readonly preparedSpells?: readonly ReturnType<typeof spellRecord>[];
  readonly spellSlots?: SpellBattleSlots;
}): BattleRuntimeSession {
  const base = spellBattle({
    preparedSpells: input?.preparedSpells ?? [
      spellRecord(antimagicFieldUnitId),
    ],
    spellSlots: input?.spellSlots ?? [{ spellLevel: 8, count: 1 }],
  });
  const baseCaster = requireCombatant(base.state, spellCasterId);
  if (baseCaster.origin.kind !== "character") {
    throw new Error("Expected Antimagic Field caster to be a character.");
  }
  const storedLightSourceProcedureRef =
    baseCaster.origin.execution.procedureBindings.find(
      (binding) => binding.procedure.kind === "spellInvocation",
    )?.procedureRef;
  if (
    (input?.lightEmitters?.length ?? 0) > 0 &&
    storedLightSourceProcedureRef === undefined
  ) {
    throw new Error("Expected a spell invocation light source.");
  }
  const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
    state: base.state,
    occurrences: (input?.lightEmitters ?? []).map((emitter) => ({
      kind: "storedLightEmitter" as const,
      ownerId: spellCasterId,
      emitter: {
        ...emitter,
        sourceProcedureRef: storedLightSourceProcedureRef!,
      },
    })),
  });
  if (input?.activeEffects === undefined) {
    return battleRuntimeSessionForTest({
      ...base,
      state: allocated.state,
    });
  }
  const caster = requireCombatant(base.state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Antimagic Field caster to be a character.");
  }
  const activeEffects = input.activeEffects.map((effect) => {
    const sourceProcedure =
      effect.kind === "spellObjectContactDamage"
        ? "objectContactDamage"
        : effect.kind === "spatialMeleeSpellAttackProxy"
          ? "spatialMeleeSpellAttackProxy"
          : undefined;
    if (sourceProcedure === undefined) return effect;
    const sourceProcedureRef = caster.origin.execution.procedureBindings.find(
      (binding) =>
        binding.procedure.kind === "spellInvocation" &&
        binding.procedure.execution.procedure === sourceProcedure,
    )?.procedureRef;
    if (sourceProcedureRef === undefined) {
      throw new Error(`Expected ${sourceProcedure} presentation source.`);
    }
    return { ...effect, sourceProcedureRef };
  });
  const casterWithEffects = { ...caster, activeEffects };
  const executionWithRepeats = activeEffects.reduce(
    (execution, effect) =>
      effect.kind === "spatialMeleeSpellAttackProxy"
        ? characterExecutionWithSpatialMeleeSpellAttackProxyRepeatAttack(
            execution,
            {
              procedure: "spatialMeleeSpellAttackProxy",
              operation: "repositionAndAttack",
              activeEffectRef: effect.effectRef,
              activeEffectSourceProcedureRef: effect.sourceProcedureRef,
              repeatTargeting: { kind: "unrestricted" },
            },
          )
        : execution,
    caster.origin.execution,
  );
  const casterWithExecution = {
    ...casterWithEffects,
    origin: { ...caster.origin, execution: executionWithRepeats },
  };
  const provisionalState = {
    ...base.state,
    combatants: new Map(base.state.combatants).set(
      spellCasterId,
      casterWithExecution,
    ),
  };
  const characterContext = base.context.characters.get(spellCasterId);
  if (characterContext === undefined) {
    throw new Error("Expected Antimagic Field caster runtime context.");
  }
  const execution = characterExecutionWithSpellInvocations(
    executionWithRepeats,
    admittedSpellActs(
      casterWithExecution,
      provisionalState,
      characterContext.spellcastingPresentationSource,
    ),
  );
  return battleRuntimeSessionForTest({
    ...base,
    state: {
      ...allocated.state,
      combatants: new Map(allocated.state.combatants).set(spellCasterId, {
        ...casterWithExecution,
        origin: { ...caster.origin, execution },
        concentration: {
          sourceProcedureRef:
            activeEffects.find(
              (effect) =>
                effect.kind === "spellObjectContactDamage" ||
                effect.kind === "spatialMeleeSpellAttackProxy",
            )?.sourceProcedureRef ??
            battleProcedureExecutionRefForTest(String(heatMetalUnitId)),
          effectKind: "spellEffect",
        },
      }),
    },
  });
}

function castAntimagicField(
  session: BattleRuntimeSession,
  affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[],
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const act = spellAct({
    session,
    spellId: antimagicFieldUnitId,
    slotLevel: 8,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = resolveBattleSubject({
    state: session.state,
    subject: act.subject,
    fills: [
      antimagicFieldAreaFill({
        hole: areaHole,
        affectedOngoingSpellEffects,
      }),
    ],
  });
  expect(resolved.tag).toBe("resolved");
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Antimagic Field to resolve.");
  }
  return resolved;
}

function antimagicFieldAreaFill(input: {
  readonly hole: Extract<BattleHole, { readonly kind: "spellAreaChoice" }>;
  readonly affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[];
  readonly auraMembership?: BattleMagicSuppressionEmanationMembership;
}): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: input.hole.holeId,
    value: {
      kind: "magicSuppressionSelfEmanation",
      areaId: antimagicFieldAreaId,
      auraMembership: input.auraMembership ?? {
        kind: "magicSuppressionEmanationMembership",
        originIncluded: true,
        nonOriginCombatantIds: [],
      },
      affectedOngoingSpellEffects: input.affectedOngoingSpellEffects,
    },
  };
}

function antimagicAffectedLight(
  effectRef: ReturnType<typeof battleEffectExecutionRefForTest>,
  sourceKind: BattleMagicSuppressionAffectedOngoingSpellEffect["sourceKind"],
): BattleMagicSuppressionAffectedOngoingSpellEffect {
  return {
    kind: "magicSuppressionAffectedOngoingSpellEffect",
    effect: {
      kind: "spellLightEmitter",
      effectRef,
    },
    sourceKind,
  };
}

function antimagicAffectedSpellObjectContactDamage(
  sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
  sourceKind: BattleMagicSuppressionAffectedOngoingSpellEffect["sourceKind"],
): BattleMagicSuppressionAffectedOngoingSpellEffect {
  return {
    kind: "magicSuppressionAffectedOngoingSpellEffect",
    effect: {
      kind: "spellActiveEffect",
      activeEffectKind: "spellObjectContactDamage",
      effectRef: effectRefForTest(sourceEffectId),
    },
    sourceKind,
  };
}

function antimagicAffectedSpiritualWeapon(
  sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
  sourceKind: BattleMagicSuppressionAffectedOngoingSpellEffect["sourceKind"],
): BattleMagicSuppressionAffectedOngoingSpellEffect {
  return {
    kind: "magicSuppressionAffectedOngoingSpellEffect",
    effect: {
      kind: "spellActiveEffect",
      activeEffectKind: "spatialMeleeSpellAttackProxy",
      effectRef: effectRefForTest(sourceEffectId),
    },
    sourceKind,
  };
}

function antimagicFieldSuppressing(
  state: BattleState,
  affectedOngoingSpellEffects: readonly BattleMagicSuppressionAffectedOngoingSpellEffect[],
): BattleState {
  const antimagicCaster = requireCombatant(state, spellTargetId);
  const stateWithConcentration = {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...antimagicCaster,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(antimagicFieldUnitId),
        ),
        effectKind: "spellEffect",
      },
    }),
  };
  return battleStateWithAllocatedEffectOccurrencesForTest({
    state: stateWithConcentration,
    occurrences: [
      {
        kind: "activeEffect",
        ownerId: spellTargetId,
        effect: {
          kind: "magicSuppressionEmanation",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(antimagicFieldUnitId),
          ),
          sourceCombatantId: spellTargetId,
          areaId: antimagicFieldAreaId,
          auraMembership: {
            kind: "magicSuppressionEmanationMembership",
            originIncluded: true,
            nonOriginCombatantIds: [],
          },
          suppressedOngoingSpellEffects: affectedOngoingSpellEffects
            .filter((effect) => effect.sourceKind === "ordinarySpell")
            .map((effect) => effect.effect),
          expiresAt: {
            kind: "concentration",
            combatantId: spellTargetId,
            durationTicks: elapsedTimeTicks(600),
          },
        },
      },
    ],
  }).state;
}

function trackedObjectSpellLightEmitter(input: {
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly sourceSpellLevel: number;
  readonly objectId: string;
  readonly expiresAt?: BattleTrackedOngoingSpellLightEmitterMechanicalFacts["expiresAt"];
}): BattleStoredLightEmitterTemplate {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error(`Invalid spell effect level ${input.sourceSpellLevel}.`);
  }
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(input.sourceProcedureRef),
    ),
    sourceCombatantId: spellCasterId,
    sourceEffectId: input.sourceEffectId,
    sourceSpellLevel,
    attachment: {
      kind: "object",
      objectId: battleObjectId(input.objectId),
    },
    emission: {
      kind: "brightAndDim",
      brightRadiusFeet: movementFeet(20),
      dimAdditionalFeet: movementFeet(20),
    },
    opaqueCoverInteraction: { kind: "blocksEmission" },
    expiresAt: input.expiresAt ?? { kind: "untilDispelled" },
  };
}

function heatMetalObjectContactDamageEffect(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly effectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly durationTicks: ReturnType<typeof elapsedTimeTicks>;
}): Extract<BattleActiveEffect, { readonly kind: "spellObjectContactDamage" }> {
  const sourceSpellLevel = parseBattleSpellEffectLevel(2);
  if (sourceSpellLevel === null) {
    throw new Error("Expected valid Heat Metal spell effect level.");
  }
  return {
    kind: "spellObjectContactDamage",
    effectRef: effectRefForTest(input.effectId),
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(heatMetalUnitId),
    ),
    sourceCombatantId: spellCasterId,
    sourceSpellLevel,
    objectId: input.objectId,
    rangeFeet: movementFeet(60),
    damage: {
      expr: { dice: 2, dieSize: 8 },
      damageType: "fire",
    },
    startedOn: {
      actorId: spellTargetId,
      round: Round(1),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: input.durationTicks,
    },
  };
}

function spatialMeleeSpellAttackProxyActiveEffect(input: {
  readonly effectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly durationTicks: ReturnType<typeof elapsedTimeTicks>;
}): Extract<
  BattleActiveEffect,
  { readonly kind: "spatialMeleeSpellAttackProxy" }
> {
  return {
    kind: "spatialMeleeSpellAttackProxy",
    effectRef: effectRefForTest(input.effectId),
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spiritualWeaponUnitId),
    ),
    sourceCombatantId: spellCasterId,
    forcePositionId: battleTablePositionId(
      "unit-profile-antimagic-spiritual-weapon-force",
    ),
    startedOn: {
      actorId: spellTargetId,
      round: Round(1),
    },
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: input.durationTicks,
    },
  };
}
