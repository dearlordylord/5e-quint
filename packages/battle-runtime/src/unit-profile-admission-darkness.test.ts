import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectOccurrencesForTest,
} from "./battle-runtime.test-support.ts";
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DARKNESS-POINT-AREA-RUNTIME darkness
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-magical-darkness-point-origin
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.MAGICAL_DARKNESS_POINT_ORIGIN_LIFECYCLE
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { PositiveInteger, Round } from "@dnd/shared/types";
import {
  spellDurationEndingPath,
  spellDurationExtensionPath,
  spellDurationValuePath,
  spellMaterialComponentPath,
  spellMechanicsHeaderPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalMechanicPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";

import {
  battleMagicalDarknessNonmagicalLightIllumination,
  battleMagicalDarknessSightObscurement,
  type BattleAreaId,
  type BattleFill,
  type BattleHole,
  type BattleMagicalDarknessZone,
  type BattleObscurementZone,
  type BattleSpellAreaOriginAnchor,
} from "./index.ts";
import {
  battleAreaId,
  battleId,
  battleObjectId,
  battleObscurementZones,
  breakBattleConcentration,
  characterSeed,
  discoverBattleActs,
  findAct,
  magicSubject,
  movementFeet,
  requireHole,
  requireResolved,
  resolveBattleSubject,
  spellRecord,
  spellSlotInvocationRef,
  startBattleSessionRight,
  statBlockCreatureInit,
  supportedSpellActs,
  tickDurationEffects,
  wizardId,
  wizardSpellcasting,
  type BattleState,
  type BattleRuntimeSession,
} from "./battle-runtime.test-support.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";
import { magicalDarknessPointOriginProfile } from "./battle-reducer/spell-procedure-profiles/magical-darkness-point-origin.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  darknessUnitId,
  spellCasterId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
} from "./unit-profile-admission-spell-record.test-support.ts";

const darknessDurationTicks = elapsedTimeTicks(100);

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function darknessMechanics(): OngoingSpellMechanics {
  const mechanics = spellRecord(darknessUnitId).mechanics;
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Darkness ongoing-effect mechanics.");
  return mechanics;
}

function syntheticDarknessRecord(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_magical_obscurement_${suffix}`,
    kind: "spell",
    name: `Synthetic Magical Obscurement ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_magical_obscurement_${suffix}`,
    },
    mechanics: mutate(darknessMechanics()),
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

function mechanicsSourceWithOperationCount(
  count: 0 | 1,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(darknessUnitId));
  const mechanics = structuredClone(source.mechanics);
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Darkness ongoing-effect mechanics.");
  if (
    !Reflect.set(mechanics, "operations", mechanics.operations.slice(0, count))
  )
    throw new Error("Expected the malformed operation fixture to be writable.");
  return { ...mechanicsSource(source), mechanics };
}

function issueShape(result: {
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

describe("magicalDarknessPointOrigin static admission", () => {
  test("projects complete point-origin mechanics and binds mechanics-free execution", () => {
    const source = spellAdmissionSource(spellRecord(darknessUnitId));
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      rangeFeet: 60,
      radiusFeet: 15,
      durationTicks: darknessDurationTicks,
      dispelledSpellCreatedLightMaxSpellLevel: 2,
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
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
      unowned: [],
    });

    const session = spellBattle({
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 2, count: 1 },
      ],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected the spell caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) throw new Error("Expected spell admission context.");
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      { ...context, castingSource: source.castingSource },
    );

    expect(invocations).toHaveLength(1);
    expect(invocations[0]).toMatchObject({
      resource: { tag: "spellSlot", slotLevel: 2 },
      targeting: { kind: "pointOriginSphere", radiusFeet: 15 },
      durationTicks: darknessDurationTicks,
      rangeFeet: 60,
      dispelledSpellCreatedLightMaxSpellLevel: 2,
    });
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes identical mechanics independently of authored identity", () => {
    const original = spellAdmissionSource(spellRecord(darknessUnitId));
    const renamed = spellAdmissionSource(
      syntheticDarknessRecord((mechanics) => mechanics, "renamed"),
    );
    const originalResult = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = magicalDarknessPointOriginProfile.admitMechanics(
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
  });

  test.each([
    [
      "level",
      (mechanics: OngoingSpellMechanics) => ({ ...mechanics, level: 3 }),
      "level",
      spellMechanicsHeaderPath("level"),
    ],
    [
      "material",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        components: { ...mechanics.components, m: "synthetic black sand" },
      }),
      "components",
      spellMechanicsHeaderPath("components"),
    ],
    [
      "radius",
      (mechanics: OngoingSpellMechanics) => {
        if (
          mechanics.attachment.kind !== "hole" ||
          mechanics.attachment.value.kind !== "area" ||
          mechanics.attachment.value.shape.kind !== "sphere"
        )
          throw new Error("Expected Darkness point-origin Sphere attachment.");
        return {
          ...mechanics,
          attachment: {
            ...mechanics.attachment,
            value: {
              ...mechanics.attachment.value,
              shape: { ...mechanics.attachment.value.shape, radiusFeet: 20 },
            },
          },
        };
      },
      "attachment",
      spellOngoingAttachmentPath(),
    ],
    [
      "dispel threshold",
      (mechanics: OngoingSpellMechanics) => ({
        ...mechanics,
        operations: mechanics.operations.map((operation) =>
          operation.effect.kind ===
          "end_overlapping_spell_created_bright_or_dim_light"
            ? {
                ...operation,
                effect: { ...operation.effect, maxSpellLevel: 3 },
              }
            : operation,
        ),
      }),
      "dispelLightEffect",
      spellOngoingOperationEffectPath(PositiveInteger(2)),
    ],
  ] as const)(
    "keeps a one-field %s mutation represented with one exact issue",
    (_label, mutate, failedFact, mechanicsPath) => {
      const result = magicalDarknessPointOriginProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(
            syntheticDarknessRecord(mutate, `mutation_${failedFact}`),
          ),
        ),
      );

      expect(result.tag).toBe("unsupported");
      expect(issueShape(result)).toEqual([{ failedFact, mechanicsPath }]);
    },
  );

  test("rejects the unrepresented object-origin branch at its attachment path", () => {
    const record = syntheticDarknessRecord(
      (mechanics) => ({
        ...mechanics,
        attachment: {
          kind: "hole" as const,
          holeId: "synthetic_darkness_object",
          label: "target object",
          value: {
            kind: "object" as const,
            count: 1 as const,
            filter: { targetRelation: "not_worn_or_carried" as const },
          },
        },
      }),
      "object_origin_branch",
    );
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(result.tag).toBe("unsupported");
    expect(issueShape(result)).toEqual([
      { failedFact: "attachment", mechanicsPath: spellOngoingAttachmentPath() },
    ]);
  });

  test("reports both unsupported material children without a container issue", () => {
    const record = syntheticDarknessRecord(
      (mechanics) => ({
        ...mechanics,
        components: {
          ...mechanics.components,
          materialCostGp: 5,
          materialConsumed: true,
        },
      }),
      "material_children",
    );
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("cost"),
      },
      {
        failedFact: "components",
        mechanicsPath: spellMaterialComponentPath("consumption"),
      },
    ]);
  });

  test("rejects a genuinely extra components container key at the header", () => {
    const source = spellAdmissionSource(spellRecord(darknessUnitId));
    const mechanics = {
      ...source.mechanics,
      components: {
        ...source.mechanics.components,
        syntheticContainerFact: true,
      },
    };
    const result = magicalDarknessPointOriginProfile.admitMechanics({
      ...mechanicsSource(source),
      mechanics,
    });

    expect(issueShape(result)).toEqual([
      {
        failedFact: "components",
        mechanicsPath: spellMechanicsHeaderPath("components"),
      },
    ]);
  });

  test("reports duration children at their exact canonical paths", () => {
    const record = syntheticDarknessRecord((mechanics) => {
      if (mechanics.duration.kind !== "concentration")
        throw new Error("Expected Darkness Concentration mechanics.");
      return {
        ...mechanics,
        duration: {
          ...mechanics.duration,
          upTo: {
            ...mechanics.duration.upTo,
            upcastTiers: [{ atSlot: 3, amount: 20 }],
          },
          earlyEnd: [{ kind: "caster_recasts_spell" as const }],
          permanentIfMaintainedFull: true as const,
        },
      };
    }, "nested_children");
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
      },
    ]);
  });

  test("reports distinct exact expected coordinates when both operations are absent", () => {
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSourceWithOperationCount(0),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
      },
      {
        failedFact: "darknessOperation",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      },
      {
        failedFact: "darknessEffect",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(1)),
      },
      {
        failedFact: "dispelLightOperation",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
      },
      {
        failedFact: "dispelLightEffect",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
      },
    ]);
  });

  test("preserves each operation's authored ordinal when the roles are reordered", () => {
    const record = syntheticDarknessRecord(
      (mechanics) => ({
        ...mechanics,
        operations: [mechanics.operations[1], mechanics.operations[0]],
      }),
      "reordered_operations",
    );
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence.consumed.slice(-4)).toEqual([
      spellOngoingOperationPath(PositiveInteger(2)),
      spellOngoingOperationEffectPath(PositiveInteger(2)),
      spellOngoingOperationPath(PositiveInteger(1)),
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ]);
  });

  test("preserves the remaining operation and assigns the missing role to slot 2", () => {
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSourceWithOperationCount(1),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
      },
      {
        failedFact: "dispelLightOperation",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(2)),
      },
      {
        failedFact: "dispelLightEffect",
        mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
      },
    ]);
  });

  test("reports every conditional mechanic and extra operation at its authored ordinal", () => {
    const conditionalSource = spellRecord("phantasmal_force").mechanics;
    if (
      conditionalSource.family !== "ongoing_effect" ||
      conditionalSource.authoredConditionalMechanics === undefined
    )
      throw new Error("Expected a conditional-mechanic fixture source.");
    const conditionalMechanic =
      conditionalSource.authoredConditionalMechanics[0];
    if (conditionalMechanic === undefined)
      throw new Error("Expected a conditional-mechanic fixture.");
    const record = syntheticDarknessRecord(
      (mechanics) => ({
        ...mechanics,
        operations: [...mechanics.operations, mechanics.operations[0]],
        authoredConditionalMechanics: [
          conditionalMechanic,
          conditionalMechanic,
        ],
      }),
      "extra_branches",
    );
    const result = magicalDarknessPointOriginProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
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
      {
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(3)),
      },
    ]);
  });

  test("does not claim any other shipped spell root", () => {
    const results = unitLibrary
      .listUnits()
      .filter(
        (unit): unit is SpellRecord =>
          unit.kind === "spell" && unit.id !== darknessUnitId,
      )
      .map((spell) =>
        magicalDarknessPointOriginProfile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spell)),
        ),
      );

    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(results.map(() => ({ tag: "notRepresented" })));
  });
});

describe("battle runtime: Darkness", () => {
  test("Darkness admits only level-2-or-higher point-origin Sphere casts", () => {
    const session = darknessBattle("battle-darkness-admission", [
      { spellLevel: 1, count: 1 },
      { spellLevel: 2, count: 1 },
      { spellLevel: 3, count: 1 },
    ]);
    const levelOneAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          darknessUnitId &&
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel === 1,
    );
    expect(levelOneAct).toBeUndefined();

    const levelTwoAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          darknessUnitId &&
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel === 2 &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "magicalDarknessPointOrigin",
    );
    if (levelTwoAct?.subject.tag !== "actionSpell") {
      throw new Error("Expected level-2 Darkness action spell act.");
    }
    expect(battleActSpellPresentation(levelTwoAct)?.invocation).toEqual(
      spellSlotInvocationRef(darknessUnitId, 2, "magicalDarknessPointOrigin"),
    );
    expect(levelTwoAct?.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellAreaChoice",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(15) },
      }),
    ]);

    const wizard = session.state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(session.state, wizard).find(
      (invocation) =>
        invocation.procedure === "magicalDarknessPointOrigin" &&
        invocation.resource.tag === "spellSlot" &&
        invocation.resource.slotLevel === 3,
    );
    expect(levelThree).toMatchObject({
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(15) },
      durationTicks: darknessDurationTicks,
      rangeFeet: movementFeet(60),
    });
  });

  test("Darkness creates a caster-owned magical Darkness zone", () => {
    const resolved = castDarkness(
      "battle-darkness-cast",
      battleAreaId("darkness-1"),
    );
    const caster = resolved.state.combatants.get(wizardId);

    expect(caster?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "magicalDarknessPointOrigin",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        areaId: "darkness-1",
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: darknessDurationTicks,
        },
      }),
    ]);
    expect(caster?.concentration).toMatchObject({
      sourceProcedureRef: expect.any(String),
    });
    expect(resolved.state.currentTurnResources).toMatchObject({
      spellSlotUsesThisTurn: [{ kind: "committed", combatantId: wizardId }],
    });
    expect(
      caster?.origin.kind === "character"
        ? caster.origin.spellcasting?.spellSlots.find(
            (slot) => slot.spellLevel === 2,
          )?.expended
        : undefined,
    ).toBe(1);
    expect(resolved.snapshot.obscurementZones).toEqual([
      {
        kind: "spellMagicalDarknessZone",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        area: {
          kind: "pointOriginSphere",
          areaId: "darkness-1",
          radiusFeet: movementFeet(15),
        },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: darknessDurationTicks,
        },
      },
    ]);
    assertBattleSnapshotCodecRoundTripForTest(resolved.snapshot);
  });

  test("Darkness projection blocks ordinary sight, Darkvision, and nonmagical light by witness fact", () => {
    const resolved = castDarkness(
      "battle-darkness-projection",
      battleAreaId("darkness-1"),
    );
    const zone = requireMagicalDarknessZone(resolved.snapshot.obscurementZones);
    const matchingSightFact = {
      kind: "sightThroughArea" as const,
      areaId: zone.area.areaId,
    };
    const matchingNonmagicalLightFact = {
      kind: "nonmagicalLightInArea" as const,
      areaId: zone.area.areaId,
    };
    const otherSightFact = {
      kind: "sightThroughArea" as const,
      areaId: battleAreaId("outside-darkness"),
    };
    const otherNonmagicalLightFact = {
      kind: "nonmagicalLightInArea" as const,
      areaId: battleAreaId("outside-darkness"),
    };

    expect(battleMagicalDarknessSightObscurement(zone, matchingSightFact)).toBe(
      "heavilyObscured",
    );
    expect(
      battleMagicalDarknessSightObscurement(zone, matchingSightFact, {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(30),
      }),
    ).toBe("heavilyObscured");
    expect(
      battleMagicalDarknessNonmagicalLightIllumination(
        zone,
        matchingNonmagicalLightFact,
      ),
    ).toBe("darkness");
    expect(
      battleMagicalDarknessSightObscurement(zone, otherSightFact),
    ).toBeNull();
    expect(
      battleMagicalDarknessNonmagicalLightIllumination(
        zone,
        otherNonmagicalLightFact,
      ),
    ).toBeNull();
  });

  test("Darkness cleanup follows Concentration and duration expiration", () => {
    const cast = castDarkness(
      "battle-darkness-cleanup",
      battleAreaId("darkness-1"),
    );
    const broken = breakBattleConcentration(cast.state, wizardId);

    expect(broken.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(broken)).toEqual([]);

    const expiring = darknessWithDurationTicks(cast.state, elapsedTimeTicks(1));
    const expired = {
      ...expiring,
      combatants: tickDurationEffects(expiring.combatants).value,
    };
    expect(expired.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(expired.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(expired)).toEqual([]);
  });

  test("Darkness dispels overlapping level-2-or-lower tracked spell-created light", () => {
    const overlappingLevelTwoEffectId = battleSpellEffectOccurrenceId(
      "darkness-overlap-level-two-light",
    );
    const overlappingLevelThreeEffectId = battleSpellEffectOccurrenceId(
      "darkness-overlap-level-three-light",
    );
    const nonoverlappingLevelTwo = trackedObjectSpellLightEmitter({
      sourceEffectId: battleSpellEffectOccurrenceId(
        "darkness-untracked-level-two-light",
      ),
      sourceSpellLevel: 2,
      objectId: "darkness-untracked-level-two-object",
    });
    const baseSession = darknessBattle("battle-darkness-light-overlap");
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: baseSession.state,
      occurrences: [
        trackedObjectSpellLightEmitter({
          sourceEffectId: overlappingLevelTwoEffectId,
          sourceSpellLevel: 2,
          objectId: "darkness-overlap-level-two-object",
        }),
        trackedObjectSpellLightEmitter({
          sourceEffectId: overlappingLevelThreeEffectId,
          sourceSpellLevel: 3,
          objectId: "darkness-overlap-level-three-object",
        }),
        nonoverlappingLevelTwo,
      ].map((emitter) => ({
        kind: "storedLightEmitter" as const,
        ownerId: wizardId,
        emitter,
      })),
    });
    const [overlappingLevelTwo, overlappingLevelThree, nonoverlapping] =
      allocated.occurrences;
    if (
      overlappingLevelTwo?.kind !== "storedLightEmitter" ||
      overlappingLevelThree?.kind !== "storedLightEmitter" ||
      nonoverlapping?.kind !== "storedLightEmitter"
    ) {
      throw new Error("Expected the allocated spell-light occurrences.");
    }
    const state = allocated.state;
    const subject = findAct(
      battleRuntimeSessionForTest({ ...baseSession, state }),
      magicSubject(darknessUnitId),
    ).subject;
    const area = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellAreaChoice",
    );

    const resolved = requireResolved(
      resolveBattleSubject({
        state,
        subject,
        fills: [
          magicalDarknessAreaFill(area, battleAreaId("darkness-overlap-area"), [
            {
              kind: "spellCreatedLightOverlapsArea",
              effectRef: overlappingLevelTwo.emitter.effectRef,
            },
          ]),
        ],
      }),
    );

    expect(resolved.state.lightEmitters).toEqual([
      expect.objectContaining({
        sourceEffectId: overlappingLevelThreeEffectId,
      }),
      nonoverlapping.emitter,
    ]);
  });

  test("Darkness rejects unknown and over-level spell-light overlaps", () => {
    const unknownOverlapSession = darknessBattle(
      "battle-darkness-unknown-overlap",
    );
    const unknownSubject = findAct(
      unknownOverlapSession,
      magicSubject(darknessUnitId),
    ).subject;
    const unknownArea = requireHole(
      resolveBattleSubject({
        state: unknownOverlapSession.state,
        subject: unknownSubject,
        fills: [],
      }),
      "spellAreaChoice",
    );
    expect(
      resolveBattleSubject({
        state: unknownOverlapSession.state,
        subject: unknownSubject,
        fills: [
          magicalDarknessAreaFill(
            unknownArea,
            battleAreaId("darkness-unknown-overlap-area"),
            [
              {
                kind: "spellCreatedLightOverlapsArea",
                effectRef: battleEffectExecutionRefForTest(
                  "darkness-missing-light",
                ),
              },
            ],
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Darkness spell-light overlap must reference a tracked ongoing spell light.",
    });

    const overLevelSession = darknessBattle("battle-darkness-over-level");
    const overLevelEffectId = battleSpellEffectOccurrenceId(
      "darkness-over-level-light",
    );
    const overLevelAllocated = battleStateWithAllocatedEffectOccurrencesForTest(
      {
        state: overLevelSession.state,
        occurrences: [
          {
            kind: "storedLightEmitter",
            ownerId: wizardId,
            emitter: trackedObjectSpellLightEmitter({
              sourceEffectId: overLevelEffectId,
              sourceSpellLevel: 3,
              objectId: "darkness-over-level-object",
            }),
          },
        ],
      },
    );
    const overLevelOccurrence = overLevelAllocated.occurrences[0];
    if (overLevelOccurrence?.kind !== "storedLightEmitter") {
      throw new Error("Expected the allocated over-level light occurrence.");
    }
    const overLevelState = overLevelAllocated.state;
    const overLevelSubject = findAct(
      battleRuntimeSessionForTest({
        ...overLevelSession,
        state: overLevelState,
      }),
      magicSubject(darknessUnitId),
    ).subject;
    const overLevelArea = requireHole(
      resolveBattleSubject({
        state: overLevelState,
        subject: overLevelSubject,
        fills: [],
      }),
      "spellAreaChoice",
    );
    expect(
      resolveBattleSubject({
        state: overLevelState,
        subject: overLevelSubject,
        fills: [
          magicalDarknessAreaFill(
            overLevelArea,
            battleAreaId("darkness-over-level-area"),
            [
              {
                kind: "spellCreatedLightOverlapsArea",
                effectRef: overLevelOccurrence.emitter.effectRef,
              },
            ],
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
      message:
        "Darkness can only dispel overlapping spell-created light at or below its supported spell level limit.",
    });
  });

  test("Darkness ignores non-tracked light emitters and rejects stale slot resources", () => {
    const session = darknessBattle("battle-darkness-untracked-light");
    const subject = findAct(session, magicSubject(darknessUnitId)).subject;
    if (subject.tag !== "actionSpell") {
      throw new Error("Expected the Darkness action spell subject.");
    }
    const allocated = battleStateWithAllocatedEffectOccurrencesForTest({
      state: session.state,
      occurrences: [
        {
          kind: "storedLightEmitter",
          ownerId: wizardId,
          emitter: {
            kind: "objectInvisibleRevealLightEmitter",
            sourceProcedureRef: subject.procedureRef,
            sourceCombatantId: wizardId,
            objectId: battleObjectId("darkness-untracked-object"),
            emission: { kind: "dim", radiusFeet: movementFeet(5) },
            expiresAt: {
              kind: "endOfTurn",
              combatantId: wizardId,
              round: Round(1),
            },
          },
        },
      ],
    });
    const nonTrackedEmitter = allocated.state.lightEmitters[0];
    if (nonTrackedEmitter === undefined) {
      throw new Error("Expected the allocated untracked light emitter.");
    }
    const state = allocated.state;
    const area = requireHole(
      resolveBattleSubject({ state, subject, fills: [] }),
      "spellAreaChoice",
    );
    const areaFill = magicalDarknessAreaFill(
      area,
      battleAreaId("darkness-untracked-area"),
    );
    const cast = requireResolved(
      resolveBattleSubject({ state, subject, fills: [areaFill] }),
    );
    expect(cast.state.lightEmitters).toContainEqual(nonTrackedEmitter);

    const resetResourcesState: BattleState = {
      ...cast.state,
      currentTurnResources: session.state.currentTurnResources,
    };
    expect(
      resolveBattleSubject({
        state: resetResourcesState,
        subject,
        fills: [areaFill],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message:
        "Action-time spell act no longer has its required runtime spell resource.",
    });
  });
});

function darknessBattle(
  battleIdValue: string,
  spellSlots: readonly {
    readonly spellLevel: 1 | 2 | 3;
    readonly count: number;
  }[] = [{ spellLevel: 2, count: 1 }],
): BattleRuntimeSession {
  return startBattleSessionRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord(darknessUnitId)],
          spellSlots,
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
}

function castDarkness(
  battleIdValue: string,
  areaId: BattleAreaId,
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const session = darknessBattle(battleIdValue);
  const subject = findAct(session, magicSubject(darknessUnitId)).subject;
  const area = requireHole(
    resolveBattleSubject({ state: session.state, subject, fills: [] }),
    "spellAreaChoice",
  );
  return requireResolved(
    resolveBattleSubject({
      state: session.state,
      subject,
      fills: [magicalDarknessAreaFill(area, areaId)],
    }),
  );
}

function magicalDarknessAreaFill(
  hole: BattleHole,
  areaId: BattleAreaId,
  spellCreatedLightOverlaps: Extract<
    Extract<BattleFill, { readonly kind: "spellAreaChoice" }>["value"],
    { readonly kind: "magicalDarknessArea" }
  >["spellCreatedLightOverlaps"] = [],
  originAnchor: BattleSpellAreaOriginAnchor = { kind: "tableSelectedPoint" },
): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  if (hole.kind !== "spellAreaChoice") {
    throw new Error("Expected spellAreaChoice hole.");
  }
  return {
    kind: "spellAreaChoice",
    holeId: hole.holeId,
    value: {
      kind: "magicalDarknessArea",
      areaId,
      originAnchor,
      spellCreatedLightOverlaps,
    },
  };
}

function trackedObjectSpellLightEmitter(input: {
  readonly sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly sourceSpellLevel: number;
  readonly objectId: string;
}) {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error(`Invalid spell effect level ${input.sourceSpellLevel}.`);
  }
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String("synthetic_spell_light"),
    ),
    sourceCombatantId: wizardId,
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
    expiresAt: { kind: "untilDispelled" },
  } as const;
}

function requireMagicalDarknessZone(
  zones: readonly BattleObscurementZone[],
): BattleMagicalDarknessZone {
  const zone = zones.find(
    (candidate): candidate is BattleMagicalDarknessZone =>
      candidate.kind === "spellMagicalDarknessZone",
  );
  if (zone === undefined) {
    throw new Error("Expected magical Darkness zone.");
  }
  return zone;
}

function darknessWithDurationTicks(
  state: BattleState,
  durationTicks: typeof darknessDurationTicks,
): BattleState {
  const caster = state.combatants.get(wizardId);
  if (caster === undefined) {
    throw new Error("Expected Wizard.");
  }
  const combatants = new Map(state.combatants);
  combatants.set(wizardId, {
    ...caster,
    activeEffects: caster.activeEffects.map((effect) =>
      effect.kind === "magicalDarknessPointOrigin"
        ? {
            ...effect,
            expiresAt: { ...effect.expiresAt, durationTicks },
          }
        : effect,
    ),
  });
  return { ...state, combatants };
}
