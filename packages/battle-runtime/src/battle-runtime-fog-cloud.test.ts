import { PositiveInteger } from "@dnd/shared/types";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
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
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  battleActSpellSlotPresentation,
  battleActSpellPresentation,
} from "./battle-act-composition.ts";
import { applyBattleHitPointDamage } from "./battle-reducer/damage-apply.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";
import { persistentAreaTraitProfile } from "./battle-reducer/spell-procedure-profiles/persistent-area-obscurement.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import {
  startBattleSessionRight,
  requireElapsedHours,
  requireResolved,
  goblinAttackSubject,
  attackInitialTargetHole,
  attackRollHoleAfterTarget,
  persistentAreaTraitAreaFill,
  fogCloudBattle,
  characterSeed,
  statBlockCreatureInit,
  wizardSpellcasting,
  spellRecord,
  magicSubject,
  expendedLevelOneSlots,
  wizardId,
  battleAreaId,
  battleId,
  battleObscurementZones,
  breakBattleConcentration,
  castFogCloud,
  discoverBattleActs,
  endTurn,
  movementFeet,
  resolveBattleSubject,
  supportedSpellActs,
  requireHole,
} from "./battle-runtime.test-support.ts";
import { unitLibrary } from "./unit-profile-admission-catalog.test-support.ts";
import { spellCasterId } from "./unit-profile-admission-catalog.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
} from "./unit-profile-admission-spell-record.test-support.ts";
import { describe, expect, test } from "vitest";

type OngoingSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function fogCloudMechanics(): OngoingSpellMechanics {
  const mechanics = spellRecord("fog_cloud").mechanics;
  if (mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Fog Cloud ongoing-effect mechanics.");
  }
  return mechanics;
}

function syntheticFogCloudRecord(
  mutate: (mechanics: OngoingSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_persistent_obscurement_${suffix}`,
    kind: "spell",
    name: `Synthetic Persistent Obscurement ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_persistent_obscurement_${suffix}`,
    },
    mechanics: mutate(fogCloudMechanics()),
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

describe("persistentAreaTrait static admission", () => {
  test("projects Fog Cloud's complete mechanics and binds slot-scaled execution facts", () => {
    const source = spellAdmissionSource(spellRecord("fog_cloud"));
    const result = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 1,
      rangeFeet: 120,
      durationTicks: requireElapsedHours(1),
      radius: {
        baseFeet: 20,
        startingSlotLevel: 1,
        perSlotLevelFeet: 20,
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
        spellDurationEndingPath(PositiveInteger(1)),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
      unowned: [],
    });

    const session = spellBattle({
      spellSlots: [
        { spellLevel: 1, count: 1 },
        { spellLevel: 3, count: 1 },
      ],
    });
    const actor = session.state.combatants.get(spellCasterId);
    if (actor === undefined) throw new Error("Expected the Fog Cloud caster.");
    const context = spellAdmissionContextFor(actor, session.state);
    if (context === null) {
      throw new Error("Expected a spell-admission context for the caster.");
    }
    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      { ...context, castingSource: source.castingSource },
    );

    expect(invocations).toHaveLength(2);
    expect(invocations).toEqual([
      expect.objectContaining({
        resource: { tag: "spellSlot", slotLevel: 1 },
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(20),
        },
        durationTicks: requireElapsedHours(1),
        rangeFeet: movementFeet(120),
      }),
      expect.objectContaining({
        resource: { tag: "spellSlot", slotLevel: 3 },
        targeting: {
          kind: "pointOriginSphere",
          radiusFeet: movementFeet(60),
        },
      }),
    ]);
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("keeps authored renaming out of recognition and projected evidence", () => {
    const original = spellAdmissionSource(spellRecord("fog_cloud"));
    const renamed = spellAdmissionSource(
      syntheticFogCloudRecord((mechanics) => mechanics, "renamed"),
    );
    const originalResult = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(renamed),
    );

    expect(originalResult.tag).toBe("supported");
    expect(renamedResult.tag).toBe("supported");
    if (originalResult.tag !== "supported") return;
    if (renamedResult.tag !== "supported") return;
    expect(renamedResult.admitted.facts).toEqual(originalResult.admitted.facts);
    expect(renamedResult.admitted.evidence).toEqual(
      originalResult.admitted.evidence,
    );
  });

  test("keeps a malformed scaling candidate represented with one exact issue", () => {
    const record = syntheticFogCloudRecord((mechanics) => {
      if (
        mechanics.attachment.kind !== "hole" ||
        mechanics.attachment.value.kind !== "area" ||
        mechanics.attachment.value.shape.kind !== "sphere" ||
        typeof mechanics.attachment.value.shape.radiusFeet !== "object"
      ) {
        throw new Error("Expected Fog Cloud's scaling Sphere attachment.");
      }
      return {
        ...mechanics,
        attachment: {
          ...mechanics.attachment,
          value: {
            ...mechanics.attachment.value,
            shape: {
              ...mechanics.attachment.value.shape,
              radiusFeet: {
                ...mechanics.attachment.value.shape.radiusFeet,
                perLevel: 10,
              },
            },
          },
        },
      };
    }, "unsupported_radius");
    const result = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(result.tag).toBe("unsupported");
    expect(issueShape(result)).toEqual([
      {
        failedFact: "radiusScaling",
        mechanicsPath: spellOngoingAttachmentPath(),
      },
    ]);
  });

  test("accumulates independent duration issues at their exact paths", () => {
    const record = syntheticFogCloudRecord((mechanics) => {
      if (mechanics.duration.kind !== "concentration") {
        throw new Error("Expected Fog Cloud Concentration mechanics.");
      }
      return {
        ...mechanics,
        duration: {
          ...mechanics.duration,
          upTo: { ...mechanics.duration.upTo, amount: 2 },
          earlyEnd: [
            { kind: "area_dispersed_by_strong_wind" as const },
            { kind: "caster_recasts_spell" as const },
          ],
        },
      };
    }, "accumulated_duration_issues");
    const result = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(result.tag).toBe("unsupported");
    expect(issueShape(result)).toEqual([
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
      {
        failedFact: "durationEnding",
        mechanicsPath: spellDurationEndingPath(PositiveInteger(2)),
      },
    ]);
  });

  test("reports priced and consumed material at their canonical child paths", () => {
    const record = syntheticFogCloudRecord(
      (mechanics) => ({
        ...mechanics,
        components: {
          v: true,
          s: true,
          m: "a synthetic reagent",
          materialCostGp: 5,
          materialConsumed: true,
        },
      }),
      "material_children",
    );
    const result = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
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
    ]);
  });

  test("reports every duration extension at its canonical ordinal", () => {
    const record = syntheticFogCloudRecord((mechanics) => {
      if (mechanics.duration.kind !== "concentration") {
        throw new Error("Expected Fog Cloud Concentration mechanics.");
      }
      return {
        ...mechanics,
        duration: {
          ...mechanics.duration,
          upTo: {
            ...mechanics.duration.upTo,
            upcastTiers: [
              { atSlot: 2, amount: 2 },
              { atSlot: 4, amount: 3 },
            ],
          },
        },
      };
    }, "duration_extensions");
    const result = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(1)),
      },
      {
        failedFact: "durationExtension",
        mechanicsPath: spellDurationExtensionPath(PositiveInteger(2)),
      },
    ]);
  });

  test("reports the value and every owned child of a timed duration", () => {
    const record = syntheticFogCloudRecord(
      (mechanics) => ({
        ...mechanics,
        duration: {
          kind: "timed",
          value: {
            unit: "hour",
            amount: 1,
            upcastTiers: [{ atSlot: 2, amount: 2 }],
          },
          earlyEnd: [{ kind: "area_dispersed_by_strong_wind" }],
        },
      }),
      "timed_duration_children",
    );
    const result = persistentAreaTraitProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(record)),
    );

    expect(issueShape(result)).toEqual([
      {
        failedFact: "duration",
        mechanicsPath: spellMechanicsHeaderPath("duration"),
      },
      { failedFact: "durationValue", mechanicsPath: spellDurationValuePath() },
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

  test("reports every authored conditional mechanic at its canonical ordinal", () => {
    const conditionalMechanics = spellRecord("phantasmal_force").mechanics;
    if (
      conditionalMechanics.family !== "ongoing_effect" ||
      conditionalMechanics.authoredConditionalMechanics === undefined
    ) {
      throw new Error(
        "Expected a synthetic conditional-mechanic fixture source.",
      );
    }
    const mechanic = conditionalMechanics.authoredConditionalMechanics[0];
    if (mechanic === undefined) {
      throw new Error("Expected a conditional-mechanic fixture.");
    }
    const record = syntheticFogCloudRecord(
      (mechanics) => ({
        ...mechanics,
        authoredConditionalMechanics: [mechanic, mechanic],
      }),
      "conditional_mechanics",
    );
    const result = persistentAreaTraitProfile.admitMechanics(
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
    ]);
  });

  test("does not claim any other shipped spell root", () => {
    const results = unitLibrary
      .listUnits()
      .filter(
        (unit): unit is SpellRecord =>
          unit.kind === "spell" && unit.id !== "fog_cloud",
      )
      .map((spell) =>
        persistentAreaTraitProfile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spell)),
        ),
      );

    expect(results.length).toBeGreaterThan(0);
    expect(results).toEqual(results.map(() => ({ tag: "notRepresented" })));
  });
});

describe("battle runtime: Fog Cloud", () => {
  test("Fog Cloud admits caller-supplied fog area and slot-scaled radius", () => {
    const session = startBattleSessionRight({
      battleId: battleId("battle-fog-cloud-admission"),
      combatants: [
        characterSeed({
          combatantId: wizardId,
          displayName: "Wizard",
          initiative: 20,
          spellcasting: wizardSpellcasting({
            preparedSpells: [spellRecord("fog_cloud")],
            spellSlots: [
              { spellLevel: 1, count: 1 },
              { spellLevel: 3, count: 1 },
            ],
          }),
        }),
        statBlockCreatureInit({ initiative: 10 }),
      ],
    });

    const levelOneAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.tag === "spellSlot" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          "fog_cloud" &&
        battleActSpellSlotPresentation(candidate)?.invocation.slotLevel === 1 &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "persistentAreaTrait",
    );
    if (levelOneAct === undefined) {
      throw new Error("Expected level-1 Fog Cloud action spell act.");
    }
    expect(levelOneAct.initialHoles).toEqual([
      expect.objectContaining({
        kind: "spellAreaChoice",
        area: { kind: "pointOriginSphere", radiusFeet: movementFeet(20) },
      }),
    ]);

    const wizard = session.state.combatants.get(wizardId);
    if (wizard === undefined) {
      throw new Error("Expected Wizard.");
    }
    const levelThree = supportedSpellActs(session.state, wizard).find(
      (invocation) =>
        invocation.procedure === "persistentAreaTrait" &&
        invocation.resource.tag === "spellSlot" &&
        invocation.resource.slotLevel === 3,
    );
    expect(levelThree).toMatchObject({
      targeting: { kind: "pointOriginSphere", radiusFeet: movementFeet(60) },
      durationTicks: requireElapsedHours(1),
      rangeFeet: movementFeet(120),
    });
  });

  test("Fog Cloud creates a Concentration-owned Heavily Obscured area", () => {
    const initial = fogCloudBattle("battle-fog-cloud-initial");
    expect(initial.combatants.get(wizardId)?.activeEffects).toEqual([]);

    const cast = castFogCloud("battle-fog-cloud-cast", battleAreaId("fog-1"));
    const caster = cast.state.combatants.get(wizardId);

    expect(caster?.activeEffects).toEqual([
      expect.objectContaining({
        kind: "persistentAreaTrait",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        areaId: "fog-1",
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: requireElapsedHours(1),
        },
      }),
    ]);
    expect(caster?.concentration).toMatchObject({
      sourceProcedureRef: expect.any(String),
    });
    expect(cast.snapshot.obscurementZones).toEqual([
      {
        kind: "spellObscurementZone",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: wizardId,
        obscurement: "heavilyObscured",
        area: {
          kind: "pointOriginSphere",
          areaId: "fog-1",
          radiusFeet: movementFeet(20),
        },
        expiresAt: {
          kind: "concentration",
          combatantId: wizardId,
          durationTicks: requireElapsedHours(1),
        },
      },
    ]);
    expect(expendedLevelOneSlots(cast, wizardId)).toBe(1);
  });

  test("Fog Cloud ends when Concentration breaks or strong wind disperses it", () => {
    const cast = castFogCloudSession(
      "battle-fog-cloud-ends",
      battleAreaId("fog-1"),
    );
    const broken = breakBattleConcentration(cast.session.state, wizardId);

    expect(broken.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(broken.combatants.get(wizardId)?.concentration).toBeNull();
    expect(battleObscurementZones(broken)).toEqual([]);

    const command = discoverBattleActs(cast.session).find(
      (candidate) =>
        candidate.subject.tag === "runtimeCommand" &&
        candidate.subject.command === "endPersistentAreaTraitForEnvironment" &&
        candidate.subject.areaId === "fog-1",
    );
    if (command === undefined) {
      throw new Error("Expected Fog Cloud strong-wind dispersal command.");
    }
    const dispersed = requireResolved(
      resolveBattleSubject({
        state: cast.session.state,
        subject: command.subject,
        fills: [],
      }),
    );

    expect(dispersed.state.combatants.get(wizardId)?.activeEffects).toEqual([]);
    expect(dispersed.state.combatants.get(wizardId)?.concentration).toBeNull();
    expect(dispersed.snapshot.obscurementZones).toEqual([]);
    expect(
      resolveBattleSubject({
        state: dispersed.state,
        subject: command.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "persistent-area trait area is no longer active.",
    });
  });

  test("damage to zero Hit Points tears down Fog Cloud Concentration ownership", () => {
    const cast = castFogCloudSession(
      "battle-fog-cloud-damage-teardown",
      battleAreaId("fog-1"),
    );
    const priorCaster = cast.session.state.combatants.get(wizardId);
    if (priorCaster?.concentration === null || priorCaster === undefined) {
      throw new Error("Expected the Fog Cloud caster to be concentrating.");
    }
    const damaged = applyBattleHitPointDamage({
      saveGatedConditionDamageRepeatSave: { kind: "noRepeatSave" },
      state: cast.session.state,
      target: priorCaster,
      damageAmount: Number(priorCaster.hp),
      deathFailuresAtZeroHp: 1,
    });

    expect(damaged.combatants.get(wizardId)).toMatchObject({
      hp: 0,
      concentration: null,
      activeEffects: [],
    });
    expect(battleObscurementZones(damaged)).toEqual([]);
  });

  test("Fog Cloud source zone does not impose attack-roll Disadvantage without a sight witness", () => {
    const cast = castFogCloudSession(
      "battle-fog-cloud-no-implicit-sight",
      battleAreaId("fog-1"),
    );
    const goblinTurn = requireResolved(
      endTurn({ state: cast.session.state, actorId: wizardId }),
    ).state;
    const subject = goblinAttackSubject(goblinTurn, "Scimitar");
    const target = attackInitialTargetHole(goblinTurn, subject);
    const roll = attackRollHoleAfterTarget(
      goblinTurn,
      target,
      subject,
      wizardId,
    );

    expect(cast.result.snapshot.obscurementZones).toHaveLength(1);
    expect(roll).not.toHaveProperty("rollMode");
  });
});

function castFogCloudSession(
  battleIdValue: string,
  areaId: ReturnType<typeof battleAreaId>,
) {
  const session = startBattleSessionRight({
    battleId: battleId(battleIdValue),
    combatants: [
      characterSeed({
        combatantId: wizardId,
        displayName: "Wizard",
        initiative: 20,
        spellcasting: wizardSpellcasting({
          preparedSpells: [spellRecord("fog_cloud")],
          spellSlots: [{ spellLevel: 1, count: 1 }],
        }),
      }),
      statBlockCreatureInit({ initiative: 10 }),
    ],
  });
  const subject = magicSubject("fog_cloud");
  const area = requireHole(
    resolveBattleSubject({ session, subject, fills: [] }),
    "spellAreaChoice",
  );
  const result = requireResolved(
    resolveBattleSubject({
      session,
      subject,
      fills: [persistentAreaTraitAreaFill(area, areaId)],
    }),
  );
  return {
    result,
    session: battleRuntimeSessionForTest({ ...session, state: result.state }),
  };
}
