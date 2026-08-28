import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ANTIMAGIC-FIELD-GENERIC-SUPPRESSION antimagic_field
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-ongoing-spell-suppression
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
import { battleActSpellPresentation } from "./battle-act-composition.ts";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { attackBonus, movementFeet, Round } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { admittedSpellActs } from "./battle-reducer/spells-profiles.ts";
import { characterExecutionWithSpellInvocations } from "./character-execution-admission.ts";
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
  type BattleAntimagicFieldAffectedOngoingSpellEffect,
  type BattleAntimagicFieldAuraMembership,
  type BattleFill,
  type BattleHole,
  type BattleRuntimeSession,
  type BattleState,
  type BattleStoredLightEmitter,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";
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
  spiritualWeaponForcePositionFill,
  spiritualWeaponTargetFill,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
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
    const ordinaryLight = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String(continualFlameUnitId),
      ),
      sourceEffectId: continualFlameEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-continual-flame-object",
    });
    const artifactLight = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_artifact_light"),
      ),
      sourceEffectId: artifactEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-artifact-light-object",
    });
    const session = antimagicFieldBattle({
      lightEmitters: [ordinaryLight, artifactLight],
    });

    const resolved = castAntimagicField(session, [
      antimagicAffectedLight(continualFlameEffectId, "ordinarySpell"),
      antimagicAffectedLight(artifactEffectId, "artifact"),
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
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "antimagicFieldOngoingSpellSuppression",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: antimagicFieldAreaId,
        auraMembership: {
          kind: "antimagicFieldAuraMembership",
          originIncluded: true,
          nonOriginCombatantIds: [],
        },
        radiusFeet: movementFeet(10),
        suppressedOngoingSpellEffects: [
          {
            kind: "spellLightEmitter",
            effectRef: effectRefForTest(continualFlameEffectId),
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
          (effect) => effect.kind === "antimagicFieldOngoingSpellSuppression",
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
            kind: "antimagicFieldAuraMembership",
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
        "Antimagic Field non-origin aura membership cannot include the source combatant.",
    });
  });

  test("suppressed duration-based spell light still expires while suppressed", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-duration-light-effect",
    );
    const durationLight = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_duration_light"),
      ),
      sourceEffectId,
      sourceSpellLevel: 1,
      objectId: "unit-profile-antimagic-duration-light-object",
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
    });
    const session = antimagicFieldBattle({ lightEmitters: [durationLight] });
    const suppressed = castAntimagicField(session, [
      antimagicAffectedLight(sourceEffectId, "ordinarySpell"),
    ]);

    expect(suppressed.state.lightEmitters).toEqual([durationLight]);
    expect(suppressed.snapshot.lightEmitters).toEqual([]);

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
    const spiritualWeaponEffect = spiritualWeaponActiveEffect({
      effectId: sourceEffectId,
      durationTicks: elapsedTimeTicks(3),
    });
    const session = antimagicFieldBattle({
      activeEffects: [spiritualWeaponEffect],
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
            effect.kind === "spiritualWeapon" &&
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
          effect.kind === "spiritualWeapon" &&
          effect.effectRef === effectRefForTest(sourceEffectId),
      );
    expect(tickedEffect).toMatchObject({
      kind: "spiritualWeapon",
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
    const spiritualWeaponEffect = spiritualWeaponActiveEffect({
      effectId: sourceEffectId,
      durationTicks: elapsedTimeTicks(3),
    });
    const session = antimagicFieldBattle({
      activeEffects: [spiritualWeaponEffect],
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
      "spiritualWeaponForcePosition",
    );
    const targetHole = requireHole(staleAct.initialHoles, "targetChoice");
    const movedForceId = "unit-profile-antimagic-stale-spiritual-weapon-moved";

    const targetFills = [
      spiritualWeaponForcePositionFill({
        hole: forceHole,
        positionId: movedForceId,
      }),
      spiritualWeaponTargetFill(
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
        "Spiritual Weapon repeat attack is suppressed by Antimagic Field.",
    });
    expect(
      suppressed.combatants
        .get(spellCasterId)
        ?.activeEffects.find(
          (effect) =>
            effect.kind === "spiritualWeapon" &&
            effect.effectRef === effectRefForTest(sourceEffectId),
        ),
    ).toMatchObject({
      kind: "spiritualWeapon",
      forcePositionId: spiritualWeaponEffect.forcePositionId,
    });
  });

  test("empty Antimagic Field suppression preserves tracked light occurrences", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      "unit-profile-antimagic-empty-suppression-effect",
    );
    const emitter = trackedObjectSpellLightEmitter({
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic_empty_suppression_light",
      ),
      sourceEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-empty-suppression-object",
    });
    const session = antimagicFieldBattle({ lightEmitters: [emitter] });
    const resolved = castAntimagicField(session, []);

    expect(resolved.state.lightEmitters).toEqual([emitter]);
    const { effectRef: _emitterEffectRef, ...emitterProjection } = emitter;
    expect(resolved.snapshot.lightEmitters).toEqual([emitterProjection]);
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toContainEqual(
      expect.objectContaining({
        kind: "antimagicFieldOngoingSpellSuppression",
        suppressedOngoingSpellEffects: [],
      }),
    );
  });
});

function maybeSpiritualWeaponRepeatAct(session: BattleRuntimeSession) {
  return discoverBattleActs(session).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.spellId ===
        spiritualWeaponUnitId &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "spiritualWeaponRepeatAttack",
  );
}

function antimagicFieldBattle(input?: {
  readonly lightEmitters?: readonly BattleStoredLightEmitter[];
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
  if (input?.activeEffects === undefined) {
    return battleRuntimeSessionForTest({
      ...base,
      state: {
        ...base.state,
        lightEmitters: input?.lightEmitters ?? [],
      },
    });
  }
  const caster = requireCombatant(base.state, spellCasterId);
  if (caster.origin.kind !== "character") {
    throw new Error("Expected Antimagic Field caster to be a character.");
  }
  const characterContext = base.context.characters.get(spellCasterId);
  if (characterContext === undefined) {
    throw new Error("Expected Antimagic Field caster runtime context.");
  }
  const activeEffects = input.activeEffects.map((effect) => {
    const sourceProcedure =
      effect.kind === "spellObjectContactDamage"
        ? "objectContactDamage"
        : effect.kind === "spiritualWeapon"
          ? "spiritualWeaponAttackProxy"
          : undefined;
    if (sourceProcedure === undefined) return effect;
    const sourceProcedureRef = characterContext.spellPresentationSources.find(
      (source) => source.invocation.procedure === sourceProcedure,
    )?.procedureRef;
    if (sourceProcedureRef === undefined) {
      throw new Error(`Expected ${sourceProcedure} presentation source.`);
    }
    return { ...effect, sourceProcedureRef };
  });
  const casterWithEffects = { ...caster, activeEffects };
  const provisionalState = {
    ...base.state,
    combatants: new Map(base.state.combatants).set(
      spellCasterId,
      casterWithEffects,
    ),
  };
  const execution = characterExecutionWithSpellInvocations(
    caster.origin.execution,
    admittedSpellActs(
      casterWithEffects,
      provisionalState,
      characterContext.spellcastingPresentationSource,
    ),
  );
  return battleRuntimeSessionForTest({
    ...base,
    state: {
      ...base.state,
      lightEmitters: input?.lightEmitters ?? [],
      combatants: new Map(base.state.combatants).set(spellCasterId, {
        ...casterWithEffects,
        origin: { ...caster.origin, execution },
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
      }),
    },
  });
}

function castAntimagicField(
  session: BattleRuntimeSession,
  affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[],
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
  readonly affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[];
  readonly auraMembership?: BattleAntimagicFieldAuraMembership;
}): Extract<BattleFill, { readonly kind: "spellAreaChoice" }> {
  return {
    kind: "spellAreaChoice",
    holeId: input.hole.holeId,
    value: {
      kind: "antimagicFieldSelfEmanation",
      areaId: antimagicFieldAreaId,
      auraMembership: input.auraMembership ?? {
        kind: "antimagicFieldAuraMembership",
        originIncluded: true,
        nonOriginCombatantIds: [],
      },
      affectedOngoingSpellEffects: input.affectedOngoingSpellEffects,
    },
  };
}

function antimagicAffectedLight(
  sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
  sourceKind: BattleAntimagicFieldAffectedOngoingSpellEffect["sourceKind"],
): BattleAntimagicFieldAffectedOngoingSpellEffect {
  return {
    kind: "antimagicFieldAffectedOngoingSpellEffect",
    effect: {
      kind: "spellLightEmitter",
      effectRef: effectRefForTest(sourceEffectId),
    },
    sourceKind,
  };
}

function antimagicAffectedSpellObjectContactDamage(
  sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>,
  sourceKind: BattleAntimagicFieldAffectedOngoingSpellEffect["sourceKind"],
): BattleAntimagicFieldAffectedOngoingSpellEffect {
  return {
    kind: "antimagicFieldAffectedOngoingSpellEffect",
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
  sourceKind: BattleAntimagicFieldAffectedOngoingSpellEffect["sourceKind"],
): BattleAntimagicFieldAffectedOngoingSpellEffect {
  return {
    kind: "antimagicFieldAffectedOngoingSpellEffect",
    effect: {
      kind: "spellActiveEffect",
      activeEffectKind: "spiritualWeapon",
      effectRef: effectRefForTest(sourceEffectId),
    },
    sourceKind,
  };
}

function antimagicFieldSuppressing(
  state: BattleState,
  affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[],
): BattleState {
  const antimagicCaster = requireCombatant(state, spellTargetId);
  return {
    ...state,
    combatants: new Map(state.combatants).set(spellTargetId, {
      ...antimagicCaster,
      concentration: {
        sourceProcedureRef: battleProcedureExecutionRefForTest(
          String(antimagicFieldUnitId),
        ),
        effectKind: "spellEffect",
      },
      activeEffects: [
        ...antimagicCaster.activeEffects,
        {
          kind: "antimagicFieldOngoingSpellSuppression",
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(antimagicFieldUnitId),
          ),
          sourceCombatantId: spellTargetId,
          areaId: antimagicFieldAreaId,
          auraMembership: {
            kind: "antimagicFieldAuraMembership",
            originIncluded: true,
            nonOriginCombatantIds: [],
          },
          radiusFeet: movementFeet(10),
          suppressedOngoingSpellEffects: affectedOngoingSpellEffects
            .filter((effect) => effect.sourceKind === "ordinarySpell")
            .map((effect) => effect.effect),
          expiresAt: {
            kind: "concentration",
            combatantId: spellTargetId,
            durationTicks: elapsedTimeTicks(600),
          },
        },
      ],
    }),
  };
}

function trackedObjectSpellLightEmitter(input: {
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly sourceEffectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly sourceSpellLevel: number;
  readonly objectId: string;
  readonly expiresAt?: BattleTrackedOngoingSpellLightEmitter["expiresAt"];
}): BattleTrackedOngoingSpellLightEmitter {
  const sourceSpellLevel = parseBattleSpellEffectLevel(input.sourceSpellLevel);
  if (sourceSpellLevel === null) {
    throw new Error(`Invalid spell effect level ${input.sourceSpellLevel}.`);
  }
  return {
    kind: "spellLightEmitter",
    effectRef: effectRefForTest(input.sourceEffectId),
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

function spiritualWeaponActiveEffect(input: {
  readonly effectId: ReturnType<typeof battleSpellEffectOccurrenceId>;
  readonly durationTicks: ReturnType<typeof elapsedTimeTicks>;
}): Extract<BattleActiveEffect, { readonly kind: "spiritualWeapon" }> {
  const sourceSpellLevel = parseBattleSpellEffectLevel(2);
  if (sourceSpellLevel === null) {
    throw new Error("Expected valid Spiritual Weapon spell effect level.");
  }
  return {
    kind: "spiritualWeapon",
    effectRef: effectRefForTest(input.effectId),
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spiritualWeaponUnitId),
    ),
    sourceCombatantId: spellCasterId,
    sourceSpellLevel,
    forcePositionId: battleTablePositionId(
      "unit-profile-antimagic-spiritual-weapon-force",
    ),
    forceReachFeet: movementFeet(5),
    repeatMoveMaxFeet: movementFeet(20),
    repeatTargeting: { kind: "unrestricted" },
    startedOn: {
      actorId: spellTargetId,
      round: Round(1),
    },
    damage: {
      kind: "fixedSpellAttackDamage",
      expr: { dice: 1, dieSize: 8, flat: 3 },
      damageType: "force",
    },
    attackKind: "melee_spell_attack",
    attackBonus: attackBonus(5),
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: input.durationTicks,
    },
  };
}
