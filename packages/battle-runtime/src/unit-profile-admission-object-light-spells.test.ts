import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection SRDINV70B light
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-SPELL-CONTINUAL-FLAME continual_flame
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L14G-D03-SORCERER-METAMAGIC-PARTIAL-PROFILE sorcerer_metamagic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-object-light
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-cast-range-increase
// KERNEL-COVERAGE: parity-witness BATTLE.FEATURE.METAMAGIC_DISTANT_CAST_RANGE_INCREASE
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import {
  PositiveInteger,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { DISTANT_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import {
  characterBattleResourceIsPointPool,
  type CharacterBattleMetamagicOptionFact,
  type CharacterBattlePointPoolResourceState,
} from "./character-battle-resources.ts";
import {
  continualFlameUnitId,
  lightUnitId,
  spellCasterId,
  spellTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";
import { requireHole } from "./unit-profile-admission-creature-fixture.test-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle.test-support.ts";
import {
  spellAct,
  spellDistantObjectLightTargetFill,
  spellDistantTouchedObjectTargetFill,
  spellObjectLightTargetFill,
  spellTouchedObjectTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import { objectLightProfile } from "./battle-reducer/spell-procedure-profiles/object-light.ts";
import {
  spellConsumedMaterialEvidencePaths,
  type SpellMechanicsAdmissionSource,
} from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import { battleSpellExecutionSourceFromAdmission } from "./battle-state-execution.ts";
import { spellAdmissionContextFor } from "./battle-reducer/spell-procedure-profiles/admission-context.ts";
import type { BattleTrackedOngoingSpellLightEmitter } from "./index.ts";
import type {
  BattleRuntimeSession,
  BattleState,
} from "./unit-profile-admission.test-support.ts";
import {
  battleIlluminationFromLightEmitters,
  battleLightEmitterProjection,
  battleObjectId,
  battlePerceptionRollModeForSight,
  battleSightObscurement,
  canSpendAction,
  cantripSpellInvocationRef,
  discoverBattleActs,
  elapsedTimeTicks,
  movementFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
} from "./unit-profile-admission.test-support.ts";
import {
  battleStateWithAllocatedEffectOccurrencesForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";

function stateWithAllocatedObjectLight(input: {
  readonly state: BattleState;
  readonly sourceSpellLevel: number;
  readonly emitter: Omit<
    BattleTrackedOngoingSpellLightEmitter,
    "effectRef" | "sourceSpellLevel"
  > & {
    readonly attachment: Extract<
      BattleTrackedOngoingSpellLightEmitter["attachment"],
      { readonly kind: "object" }
    >;
  };
}): BattleState {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error("Expected a supported object-light spell level.");
  }
  return battleStateWithAllocatedEffectOccurrencesForTest({
    state: input.state,
    occurrences: [
      {
        kind: "storedLightEmitter",
        ownerId: input.emitter.sourceCombatantId,
        emitter: {
          ...input.emitter,
          sourceSpellLevel,
        },
      },
    ],
  }).state;
}

function objectLightFixtureSourceEffectId(input: {
  readonly sourceProcedureRef: BattleTrackedOngoingSpellLightEmitter["sourceProcedureRef"];
  readonly objectId: Extract<
    BattleTrackedOngoingSpellLightEmitter["attachment"],
    { readonly kind: "object" }
  >["objectId"];
}) {
  return battleSpellEffectOccurrenceId(
    `${spellCasterId}:${input.sourceProcedureRef}:${input.objectId}:fixture`,
  );
}

function distantMetamagicOption(): CharacterBattleMetamagicOptionFact {
  return {
    effectKind: DISTANT_METAMAGIC_EFFECT_KIND,
    stackingMode: "one_per_spell",
    sorceryPointCost: resourceCount(1),
  };
}

function actWithDistantSpellMetamagic(session: BattleRuntimeSession) {
  const act = discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        lightUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "objectLight" &&
      candidate.subject.metamagic?.some(
        (selection) => selection.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  expect(act).toBeDefined();
  if (act === undefined || act.subject.tag !== "actionSpell") {
    throw new Error("Expected Distant Light spell act.");
  }
  return act;
}

function sorceryPointsRemaining(state: BattleState): unknown {
  const actor = state.combatants.get(spellCasterId);
  if (actor?.origin.kind !== "character") {
    return undefined;
  }
  const resourcePoolRef = actor.origin.metamagic?.sorceryPointResourcePoolRef;
  const resource = actor.origin.resources.find(
    (candidate): candidate is CharacterBattlePointPoolResourceState =>
      candidate.resourcePoolRef === resourcePoolRef &&
      characterBattleResourceIsPointPool(candidate),
  );
  return resource?.pointsRemaining;
}

type ActivationSpellMechanics = Extract<
  SpellMechanics,
  { readonly family: "activation" }
>;

function syntheticObjectLight(
  baseId: typeof lightUnitId | typeof continualFlameUnitId,
  mutate: (mechanics: ActivationSpellMechanics) => unknown,
  suffix: string,
): SpellRecord {
  const mechanics = spellRecord(baseId).mechanics;
  if (mechanics.family !== "activation")
    throw new Error("Expected activation object-light mechanics.");
  return decodeSpellRecordForTest({
    id: `synthetic_object_light_${suffix}`,
    kind: "spell",
    name: `Synthetic Object Light ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_object_light_${suffix}`,
    },
    mechanics: mutate(mechanics),
  });
}

function mechanicsSource(
  source: ReturnType<typeof spellAdmissionSource>,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

describe("objectLight static admission", () => {
  test.each([
    [lightUnitId, "lightCantripObject", 0],
    [continualFlameUnitId, "permanentTouchedObject", 2],
  ] as const)(
    "projects exact %s facts and evidence",
    (spellId, kind, level) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = objectLightProfile.admitMechanics(mechanicsSource(source));

      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.facts).toMatchObject({
        kind,
        level,
        range: { kind: "touch" },
        brightRadiusFeet: 20,
        dimAdditionalFeet: 20,
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
          ...(kind === "lightCantripObject"
            ? [
                spellDurationValuePath(),
                spellDurationEndingPath(PositiveInteger(1)),
              ]
            : [spellDurationEndingPath(PositiveInteger(1))]),
          spellActivationPhasePath(PositiveInteger(1)),
          spellActivationAttachmentPath(PositiveInteger(1)),
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ...spellConsumedMaterialEvidencePaths(
            spellRecord(spellId).mechanics.components,
          ),
        ],
        unowned: [],
      });

      const session = spellBattle({ cantrips: [], preparedSpells: [] });
      const actor = session.state.combatants.get(spellCasterId);
      if (actor === undefined) throw new Error("Expected caster fixture.");
      const context = spellAdmissionContextFor(actor, session.state);
      if (context === null) throw new Error("Expected admission context.");
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        {
          ...context,
          castingSource: source.castingSource,
          spellCastOptions:
            level === 0
              ? []
              : [{ spellLevel: spellSlotLevel(2), payment: { tag: "slot" } }],
        },
      );
      expect(invocations).toHaveLength(1);
      expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
    },
  );

  test.each([lightUnitId, continualFlameUnitId] as const)(
    "recognizes renamed %s mechanics independently of identity",
    (spellId) => {
      const original = objectLightProfile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord(spellId))),
      );
      const renamed = objectLightProfile.admitMechanics(
        mechanicsSource(
          spellAdmissionSource(
            syntheticObjectLight(spellId, (mechanics) => mechanics, "renamed"),
          ),
        ),
      );
      expect(original.tag).toBe("supported");
      expect(renamed.tag).toBe("supported");
      if (original.tag !== "supported" || renamed.tag !== "supported") return;
      expect(renamed.admitted.facts).toEqual(original.admitted.facts);
    },
  );

  test("does not claim unrelated shipped spells", () => {
    const results = unitLibrary
      .listUnits()
      .filter(
        (unit): unit is SpellRecord =>
          unit.kind === "spell" &&
          unit.id !== lightUnitId &&
          unit.id !== continualFlameUnitId,
      )
      .map((spell) =>
        objectLightProfile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spell)),
        ),
      );
    expect(results).toEqual(results.map(() => ({ tag: "notRepresented" })));
  });

  test("keeps a malformed cantrip light effect owned at its exact path", () => {
    const source = spellAdmissionSource(
      syntheticObjectLight(
        lightUnitId,
        (mechanics) => {
          const phase = mechanics.phases[0];
          if (
            phase?.kind !== "direct" ||
            phase.effects?.[0]?.kind !== "emit_bright_and_dim_illumination"
          )
            throw new Error("Expected object-light direct phase.");
          return {
            ...mechanics,
            phases: [
              {
                ...phase,
                effects: [{ ...phase.effects[0], brightRadiusFeet: 25 }],
              },
            ],
          };
        },
        "bad_radius",
      ),
    );
    const result = objectLightProfile.admitMechanics(mechanicsSource(source));
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        failedFact: "lightEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(1),
        ),
      }),
    ]);
  });

  test("keeps a wholly replaced phase branch owned", () => {
    const source = spellAdmissionSource(
      syntheticObjectLight(
        continualFlameUnitId,
        (mechanics) => ({
          ...mechanics,
          phases: [
            {
              kind: "direct" as const,
              attachment: { kind: "self" as const },
              effects: [{ kind: "none" as const }],
            },
          ],
        }),
        "replaced_phase",
      ),
    );
    const result = objectLightProfile.admitMechanics(mechanicsSource(source));
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toEqual([
      expect.objectContaining({
        failedFact: "attachment",
        mechanicsPath: spellActivationAttachmentPath(PositiveInteger(1)),
      }),
    ]);
  });
});

describe("SRDINV70B deterministic object-light Spell Unit admission", () => {
  test("light is admitted as a Magic action cantrip object emitter", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });
    const procedureRef = act.subject.procedureRef;
    const targetHole = requireHole(act.initialHoles, "objectTargetChoice");
    const objectId = battleObjectId("unit-profile-light-object");

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef,
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "objectTargetChoice",
            label: "Spell object target",
            requiresTableSpatialFact: true,
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: targetHole,
          objectId,
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "large",
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            sourceProcedureRef: procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(20),
              dimAdditionalFeet: movementFeet(20),
            },
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          },
        ],
      },
      snapshot: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId },
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Light to resolve.");
    }
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(
      resolved.state.currentTurnResources.spellSlotUsesThisTurn.some(
        (use) => use.kind === "committed",
      ),
    ).toBe(false);
    expect(resolved.state.combatants.get(spellCasterId)?.activeEffects).toEqual(
      [],
    );
    expect(resolved.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [],
    );
  });

  test("continual flame is admitted as a Magic action spell slot object emitter", () => {
    const spell = spellRecord(continualFlameUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session,
      spellId: continualFlameUnitId,
      slotLevel: 2,
    });
    const procedureRef = act.subject.procedureRef;
    const targetHole = requireHole(act.initialHoles, "objectTargetChoice");
    const objectId = battleObjectId("unit-profile-continual-flame-object");

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          procedureRef,
          tag: "actionSpell",
          actorId: spellCasterId,
          mode: { tag: "cast" },
        },
        initialHoles: [
          expect.objectContaining({
            kind: "objectTargetChoice",
            label: "Spell object target",
            requiresTableSpatialFact: true,
          }),
        ],
      }),
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellTouchedObjectTargetFill({
          hole: targetHole,
          objectId,
          spellId: continualFlameUnitId,
          casterId: spellCasterId,
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            sourceProcedureRef: procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(20),
              dimAdditionalFeet: movementFeet(20),
            },
            expiresAt: { kind: "untilDispelled" },
          },
        ],
      },
      snapshot: {
        turn: {
          spellSlotUsesThisTurn: [
            { kind: "committed", combatantId: spellCasterId },
          ],
        },
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId },
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Continual Flame to resolve.");
    }
    const emitter = resolved.snapshot.lightEmitters[0];
    if (emitter === undefined) {
      throw new Error("Expected Continual Flame emitter.");
    }
    expect(
      battleLightEmitterProjection(emitter, {
        kind: "object",
        objectId,
        distanceFeet: movementFeet(20),
        opaqueCover: false,
      }),
    ).toEqual({ emitter, illumination: "brightLight" });
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        {
          kind: "object",
          objectId,
          distanceFeet: movementFeet(40),
          opaqueCover: false,
        },
      ]),
    ).toBe("dimLight");
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
    expect(resolved.state.combatants.get(spellCasterId)?.activeEffects).toEqual(
      [],
    );
    expect(resolved.state.combatants.get(spellTargetId)?.activeEffects).toEqual(
      [],
    );
  });

  test("light object emitter projection respects range, object identity, and opaque cover", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });
    const objectId = battleObjectId("unit-profile-light-covered-object");
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId,
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "large",
        }),
      ],
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Light to resolve.");
    }
    const emitter = resolved.snapshot.lightEmitters[0];
    if (emitter === undefined) {
      throw new Error("Expected Light emitter.");
    }

    const brightFact = {
      kind: "object" as const,
      objectId,
      distanceFeet: movementFeet(20),
      opaqueCover: false,
    };
    const dimFact = {
      ...brightFact,
      distanceFeet: movementFeet(40),
    };
    const darkFact = {
      ...brightFact,
      distanceFeet: movementFeet(50),
    };
    const coveredFact = {
      ...brightFact,
      opaqueCover: true,
    };
    const otherObjectFact = {
      ...brightFact,
      objectId: battleObjectId("unit-profile-light-other-object"),
    };

    expect(battleLightEmitterProjection(emitter, brightFact)).toEqual({
      emitter,
      illumination: "brightLight",
    });
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        brightFact,
      ]),
    ).toBe("brightLight");
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        dimFact,
      ]),
    ).toBe("dimLight");
    expect(battleLightEmitterProjection(emitter, darkFact)).toBeNull();
    expect(battleLightEmitterProjection(emitter, otherObjectFact)).toBeNull();
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        darkFact,
      ]),
    ).toBe("darkness");
    expect(
      battleIlluminationFromLightEmitters(resolved.snapshot.lightEmitters, [
        coveredFact,
      ]),
    ).toBe("darkness");
  });

  test("dim illumination projects Lightly Obscured sight unless Darkvision adjusts it", () => {
    expect(battleSightObscurement("brightLight")).toBe("unobscured");
    expect(battleSightObscurement("dimLight")).toBe("lightlyObscured");
    expect(battleSightObscurement("darkness")).toBe("heavilyObscured");
    expect(battlePerceptionRollModeForSight("dimLight")).toBe("disadvantage");
    expect(
      battleSightObscurement("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(60),
      }),
    ).toBe("unobscured");
    expect(
      battlePerceptionRollModeForSight("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(60),
      }),
    ).toBeUndefined();
    expect(
      battleSightObscurement("darkness", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(60),
      }),
    ).toBe("lightlyObscured");
    expect(
      battleSightObscurement("dimLight", {
        kind: "darkvision",
        rangeFeet: movementFeet(60),
        distanceFeet: movementFeet(65),
      }),
    ).toBe("lightlyObscured");
  });

  test("light rejects objects larger than Large", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "huge",
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test.each([
    { kind: "someoneElse" as const, relation: "worn" as const },
    { kind: "someoneElse" as const, relation: "carried" as const },
  ])("light rejects an object $relation by someone else", (wornOrCarried) => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const act = spellAct({ session, spellId: lightUnitId });

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          spellId: lightUnitId,
          casterId: spellCasterId,
          wornOrCarried,
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
  });

  test("light recast replaces the caster's prior object emitter", () => {
    const spell = spellRecord(lightUnitId);
    const baseSession = spellBattle({ cantrips: [spell] });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      baseSession,
      spellCasterId,
      cantripSpellInvocationRef(lightUnitId, "objectLight"),
    );
    const staleObjectId = battleObjectId("unit-profile-light-stale");
    const state = stateWithAllocatedObjectLight({
      state: baseSession.state,
      sourceSpellLevel: 0,
      emitter: {
        kind: "spellLightEmitter" as const,
        sourceProcedureRef: procedureRef,
        sourceCombatantId: spellCasterId,
        sourceEffectId: objectLightFixtureSourceEffectId({
          sourceProcedureRef: procedureRef,
          objectId: staleObjectId,
        }),
        attachment: {
          kind: "object" as const,
          objectId: staleObjectId,
        },
        emission: {
          kind: "brightAndDim" as const,
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "blocksEmission" as const },
        expiresAt: {
          kind: "duration" as const,
          durationTicks: elapsedTimeTicks(1),
        },
      },
    });
    const act = spellAct({ session: baseSession, spellId: lightUnitId });
    const objectId = battleObjectId("unit-profile-light-recast");

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId,
          spellId: lightUnitId,
          casterId: spellCasterId,
          wornOrCarried: { kind: "caster" },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(600),
            },
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Light recast to resolve.");
    }
    expect(resolved.state.lightEmitters).toHaveLength(1);
  });

  test("distant light admits a 30-foot object target without changing light radii", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "sorcerer", level: 2 }],
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(2),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [distantMetamagicOption()],
      },
    });
    const act = spellAct({ session, spellId: lightUnitId });
    const distantAct = actWithDistantSpellMetamagic(session);
    const targetHole = requireHole(
      distantAct.initialHoles,
      "objectTargetChoice",
    );
    const objectId = battleObjectId("unit-profile-distant-light-object");

    expect(distantAct).toEqual(
      expect.objectContaining({
        subject: expect.objectContaining({
          tag: "actionSpell",
          actorId: spellCasterId,
          procedureRef: requireCharacterSpellProcedureRefForTest(
            session,
            spellCasterId,
            cantripSpellInvocationRef(lightUnitId, "objectLight"),
          ),
          metamagic: [{ effectKind: DISTANT_METAMAGIC_EFFECT_KIND }],
        }),
        label: "Light — Distant Spell",
      }),
    );
    expect(act.subject).not.toHaveProperty("metamagic");

    const fill = spellDistantObjectLightTargetFill({
      hole: targetHole,
      objectId,
      spellId: lightUnitId,
      casterId: spellCasterId,
      rangeFeet: movementFeet(30),
      size: "large",
    });
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: distantAct.subject,
      fills: [fill],
    });
    if (distantAct.subject.tag !== "actionSpell") {
      throw new Error("Expected Distant Light spell subject.");
    }

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            sourceProcedureRef: distantAct.subject.procedureRef,
            sourceCombatantId: spellCasterId,
            attachment: { kind: "object", objectId },
            emission: {
              kind: "brightAndDim",
              brightRadiusFeet: movementFeet(20),
              dimAdditionalFeet: movementFeet(20),
            },
          },
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Distant Light to resolve.");
    }
    expect(sorceryPointsRemaining(resolved.state)).toEqual(resourceCount(1));
    expect(canSpendAction(resolved.state.currentTurnResources, "magic")).toBe(
      false,
    );
  });

  test("distant light rejects a non-range-bearing object-light target fact before spending", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({
      cantrips: [spell],
      casterClassLevels: [{ className: "sorcerer", level: 2 }],
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(1),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [distantMetamagicOption()],
      },
    });
    const distantAct = actWithDistantSpellMetamagic(session);
    const targetHole = requireHole(
      distantAct.initialHoles,
      "objectTargetChoice",
    );

    const resolved = resolveBattleSubject({
      state: session.state,
      subject: distantAct.subject,
      fills: [
        spellObjectLightTargetFill({
          hole: targetHole,
          spellId: lightUnitId,
          casterId: spellCasterId,
          size: "large",
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "invalid",
      reason: "invalidFill",
    });
    expect(sorceryPointsRemaining(session.state)).toEqual(resourceCount(1));
  });

  test("Distant Spell projects a touched object target to the 30-foot witness", () => {
    const spell = spellRecord(continualFlameUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "sorcerer", level: 3 }],
      casterResources: [
        {
          unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
          pointsRemaining: resourceCount(1),
        },
      ],
      casterMetamagic: {
        sorceryPointResourceUnitId: parseSharedUnitId("sorcerer_font_of_magic"),
        spellUseLimit: "one_per_spell_unless_option_allows_stacking",
        knownOptions: [distantMetamagicOption()],
      },
    });
    const distantAct = discoverBattleActs(session).find(
      (candidate) =>
        candidate.subject.tag === "actionSpell" &&
        battleActSpellPresentation(candidate)?.invocation.spellId ===
          continualFlameUnitId &&
        battleActSpellPresentation(candidate)?.invocation.procedure ===
          "objectLight" &&
        candidate.subject.metamagic?.some(
          (selection) => selection.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
        ) === true,
    );
    expect(distantAct).toBeDefined();
    if (distantAct === undefined || distantAct.subject.tag !== "actionSpell") {
      throw new Error("Expected Distant Continual Flame spell act.");
    }

    const objectId = battleObjectId("unit-profile-distant-continual-flame");
    const resolved = resolveBattleSubject({
      state: session.state,
      subject: distantAct.subject,
      fills: [
        spellDistantTouchedObjectTargetFill({
          hole: requireHole(distantAct.initialHoles, "objectTargetChoice"),
          objectId,
          spellId: continualFlameUnitId,
          casterId: spellCasterId,
          rangeFeet: movementFeet(30),
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: distantAct.subject.procedureRef,
            attachment: { kind: "object", objectId },
          }),
        ],
      },
    });
  });

  test("continual flame does not replace the caster's prior continual flame emitter", () => {
    const spell = spellRecord(continualFlameUnitId);
    const priorObjectId = battleObjectId("unit-profile-continual-flame-prior");
    const nextObjectId = battleObjectId("unit-profile-continual-flame-next");
    const baseSession = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      baseSession,
      spellCasterId,
      spellSlotInvocationRef(continualFlameUnitId, 2, "objectLight"),
    );
    const state = stateWithAllocatedObjectLight({
      state: baseSession.state,
      sourceSpellLevel: 2,
      emitter: {
        kind: "spellLightEmitter",
        sourceProcedureRef: procedureRef,
        sourceCombatantId: spellCasterId,
        sourceEffectId: objectLightFixtureSourceEffectId({
          sourceProcedureRef: procedureRef,
          objectId: priorObjectId,
        }),
        attachment: { kind: "object", objectId: priorObjectId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: { kind: "untilDispelled" },
      },
    });
    const act = spellAct({
      session: baseSession,
      spellId: continualFlameUnitId,
      slotLevel: 2,
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTouchedObjectTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId: nextObjectId,
          spellId: continualFlameUnitId,
          casterId: spellCasterId,
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: expect.arrayContaining([
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId: priorObjectId },
          }),
          expect.objectContaining({
            sourceProcedureRef: act.subject.procedureRef,
            attachment: { kind: "object", objectId: nextObjectId },
          }),
        ]),
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Continual Flame recast to resolve.");
    }
    expect(resolved.state.lightEmitters).toHaveLength(2);
  });

  test("light object emitter expires on its timed duration", () => {
    const spell = spellRecord(lightUnitId);
    const session = spellBattle({ cantrips: [spell] });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      spellCasterId,
      cantripSpellInvocationRef(lightUnitId, "objectLight"),
    );
    const objectId = battleObjectId("unit-profile-light-expiring");
    const twoRoundsRemaining = stateWithAllocatedObjectLight({
      state: session.state,
      sourceSpellLevel: 0,
      emitter: {
        kind: "spellLightEmitter",
        sourceProcedureRef: procedureRef,
        sourceCombatantId: spellCasterId,
        sourceEffectId: objectLightFixtureSourceEffectId({
          sourceProcedureRef: procedureRef,
          objectId,
        }),
        attachment: {
          kind: "object",
          objectId,
        },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: {
          kind: "duration",
          durationTicks: elapsedTimeTicks(2),
        },
      },
    });

    const sameRound = resolveBattleSubject({
      state: twoRoundsRemaining,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (sameRound.tag !== "resolved") {
      throw new Error("Expected Light caster end turn to resolve.");
    }
    const oneRoundRemaining = resolveBattleSubject({
      state: sameRound.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });
    expect(oneRoundRemaining).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          {
            expiresAt: {
              kind: "duration",
              durationTicks: elapsedTimeTicks(1),
            },
          },
        ],
      },
    });
    if (oneRoundRemaining.tag !== "resolved") {
      throw new Error("Expected Light emitter duration to tick.");
    }
    const finalCasterTurn = resolveBattleSubject({
      state: oneRoundRemaining.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (finalCasterTurn.tag !== "resolved") {
      throw new Error("Expected final Light caster turn to resolve.");
    }
    const expired = resolveBattleSubject({
      state: finalCasterTurn.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(expired).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [] },
      snapshot: { lightEmitters: [] },
    });
  });

  test("continual flame object emitter remains until dispelled", () => {
    const spell = spellRecord(continualFlameUnitId);
    const session = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      session,
      spellCasterId,
      spellSlotInvocationRef(continualFlameUnitId, 2, "objectLight"),
    );
    const objectId = battleObjectId("unit-profile-continual-flame-persistent");
    const ongoingFlame = stateWithAllocatedObjectLight({
      state: session.state,
      sourceSpellLevel: 2,
      emitter: {
        kind: "spellLightEmitter",
        sourceProcedureRef: procedureRef,
        sourceCombatantId: spellCasterId,
        sourceEffectId: objectLightFixtureSourceEffectId({
          sourceProcedureRef: procedureRef,
          objectId,
        }),
        attachment: { kind: "object", objectId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: { kind: "untilDispelled" },
      },
    });

    const sameRound = resolveBattleSubject({
      state: ongoingFlame,
      subject: {
        tag: "runtimeCommand",
        actorId: spellCasterId,
        command: "endTurn",
      },
      fills: [],
    });
    if (sameRound.tag !== "resolved") {
      throw new Error("Expected Continual Flame caster end turn to resolve.");
    }
    const nextRound = resolveBattleSubject({
      state: sameRound.state,
      subject: {
        tag: "runtimeCommand",
        actorId: spellTargetId,
        command: "endTurn",
      },
      fills: [],
    });

    expect(nextRound).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [
          expect.objectContaining({
            sourceProcedureRef: procedureRef,
            attachment: { kind: "object", objectId },
            expiresAt: { kind: "untilDispelled" },
          }),
        ],
      },
    });
  });

  test("continual flame keeps separate occurrences when recast on the same object", () => {
    const spell = spellRecord(continualFlameUnitId);
    const objectId = battleObjectId("unit-profile-continual-flame-same-object");
    const baseSession = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const procedureRef = requireCharacterSpellProcedureRefForTest(
      baseSession,
      spellCasterId,
      spellSlotInvocationRef(continualFlameUnitId, 2, "objectLight"),
    );
    const priorSourceEffectId = battleSpellEffectOccurrenceId(
      `${spellCasterId}:${procedureRef}:${objectId}:object-light:1`,
    );
    const sourceSpellLevel = testBattleSpellEffectLevel(2);
    const state = stateWithAllocatedObjectLight({
      state: baseSession.state,
      sourceSpellLevel: 2,
      emitter: {
        kind: "spellLightEmitter",
        sourceProcedureRef: procedureRef,
        sourceCombatantId: spellCasterId,
        sourceEffectId: priorSourceEffectId,
        attachment: { kind: "object", objectId },
        emission: {
          kind: "brightAndDim",
          brightRadiusFeet: movementFeet(20),
          dimAdditionalFeet: movementFeet(20),
        },
        opaqueCoverInteraction: { kind: "blocksEmission" },
        expiresAt: { kind: "untilDispelled" },
      },
    });
    const act = spellAct({
      session: baseSession,
      spellId: continualFlameUnitId,
      slotLevel: 2,
    });
    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        spellTouchedObjectTargetFill({
          hole: requireHole(act.initialHoles, "objectTargetChoice"),
          objectId,
          spellId: continualFlameUnitId,
          casterId: spellCasterId,
        }),
      ],
    });

    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error(
        "Expected same-object Continual Flame recast to resolve.",
      );
    }
    const emitters = resolved.state.lightEmitters.filter(
      (emitter): emitter is BattleTrackedOngoingSpellLightEmitter =>
        emitter.kind === "spellLightEmitter" &&
        "sourceEffectId" in emitter &&
        emitter.sourceCombatantId === spellCasterId &&
        emitter.attachment.kind === "object" &&
        emitter.attachment.objectId === objectId,
    );
    expect(emitters).toHaveLength(2);
    const nextSourceEffectId = battleSpellEffectOccurrenceId(
      `${spellCasterId}:${procedureRef}:${objectId}:object-light:2`,
    );
    expect(emitters.map((emitter) => emitter.sourceEffectId)).toEqual(
      expect.arrayContaining([priorSourceEffectId, nextSourceEffectId]),
    );
    expect(
      emitters.every(
        (emitter) => emitter.sourceSpellLevel === sourceSpellLevel,
      ),
    ).toBe(true);
  });
});

function testBattleSpellEffectLevel(value: number) {
  const parsed = parseBattleSpellEffectLevel(value);
  if (parsed === null) {
    throw new Error(`Invalid spell effect level ${value}.`);
  }
  return parsed;
}
