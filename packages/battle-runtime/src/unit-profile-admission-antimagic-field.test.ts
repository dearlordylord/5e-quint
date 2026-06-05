// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-ANTIMAGIC-FIELD-GENERIC-SUPPRESSION antimagic_field
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-antimagic-field-ongoing-spell-suppression
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.ANTIMAGIC_FIELD_ONGOING_SUPPRESSION
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import { attackBonus, movementFeet, Round } from "@dnd/shared/types";
import { describe, expect, test } from "vitest";

import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import {
  antimagicFieldUnitId,
  continualFlameUnitId,
  heatMetalUnitId,
  spellCasterId,
  spellTargetId,
  spiritualWeaponUnitId,
} from "./unit-profile-admission-catalog-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import {
  maybeBonusSpellAct,
  spellAct,
  spiritualWeaponForcePositionFill,
  spiritualWeaponTargetFill,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleAreaId,
  battleObjectId,
  battleTablePositionId,
  breakBattleConcentration,
  discoverBattleActs,
  endTurn,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  type BattleActiveEffect,
  type BattleAntimagicFieldAffectedOngoingSpellEffect,
  type BattleAntimagicFieldAuraMembership,
  type BattleFill,
  type BattleHole,
  type BattleState,
  type BattleStoredLightEmitter,
  type BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";

const antimagicFieldAreaId = battleAreaId("unit-profile-antimagic-field-area");
type SpellBattleSlots = NonNullable<
  Parameters<typeof spellBattle>[0]["spellSlots"]
>;

describe("SRD Antimagic Field ongoing spell suppression admission", () => {
  test("antimagic field is admitted as a level-8 self Emanation suppression spell", () => {
    const state = antimagicFieldBattle();

    const act = spellAct({
      state,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "actionSpell",
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            antimagicFieldUnitId,
            8,
            "antimagicFieldOngoingSpellSuppression",
          ),
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
      sourceSpellId: continualFlameUnitId,
      sourceEffectId: continualFlameEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-continual-flame-object",
    });
    const artifactLight = trackedObjectSpellLightEmitter({
      sourceSpellId: "synthetic_artifact_light",
      sourceEffectId: artifactEffectId,
      sourceSpellLevel: 2,
      objectId: "unit-profile-antimagic-artifact-light-object",
    });
    const state = antimagicFieldBattle({
      lightEmitters: [ordinaryLight, artifactLight],
    });

    const resolved = castAntimagicField(state, [
      antimagicAffectedLight(continualFlameEffectId, "ordinarySpell"),
      antimagicAffectedLight(artifactEffectId, "artifact"),
    ]);

    expect(resolved.state.lightEmitters).toEqual([
      ordinaryLight,
      artifactLight,
    ]);
    expect(resolved.snapshot.lightEmitters).toEqual([artifactLight]);
    expect(
      resolved.state.combatants.get(spellCasterId)?.activeEffects,
    ).toContainEqual({
      kind: "antimagicFieldOngoingSpellSuppression",
      sourceSpellId: antimagicFieldUnitId,
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
          sourceEffectId: continualFlameEffectId,
        },
      ],
      expiresAt: {
        kind: "concentration",
        combatantId: spellCasterId,
        durationTicks: elapsedTimeTicks(600),
      },
    });

    const restored = breakBattleConcentration(resolved.state, spellCasterId);
    expect(
      restored.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) => effect.kind === "antimagicFieldOngoingSpellSuppression",
        ),
    ).toBe(false);
    expect(snapshotBattle(restored).lightEmitters).toEqual([
      ordinaryLight,
      artifactLight,
    ]);
  });

  test("rejects an aura membership that lists the source as non-origin", () => {
    const state = antimagicFieldBattle();
    const act = spellAct({
      state,
      spellId: antimagicFieldUnitId,
      slotLevel: 8,
    });
    const areaHole = requireHole(act.initialHoles, "spellAreaChoice");

    const result = resolveBattleSubject({
      state,
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
      sourceSpellId: "synthetic_duration_light",
      sourceEffectId,
      sourceSpellLevel: 1,
      objectId: "unit-profile-antimagic-duration-light-object",
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(1) },
    });
    const state = antimagicFieldBattle({ lightEmitters: [durationLight] });
    const suppressed = castAntimagicField(state, [
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
    const state = antimagicFieldBattle({
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
    const suppressed = antimagicFieldSuppressing(state, [
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
            effect.effectId === sourceEffectId,
        ),
    ).toBe(true);
    expect(
      maybeBonusSpellAct({ state: suppressed, spellId: heatMetalUnitId }),
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
          effect.effectId === sourceEffectId,
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
      maybeBonusSpellAct({ state: restored, spellId: heatMetalUnitId }),
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
    const state = antimagicFieldBattle({
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
    const suppressed = antimagicFieldSuppressing(state, [
      antimagicAffectedSpiritualWeapon(sourceEffectId, "ordinarySpell"),
    ]);

    expect(
      suppressed.combatants
        .get(spellCasterId)
        ?.activeEffects.some(
          (effect) =>
            effect.kind === "spiritualWeapon" &&
            effect.sourceEffectId === sourceEffectId,
        ),
    ).toBe(true);
    expect(maybeSpiritualWeaponRepeatAct(suppressed)).toBeUndefined();

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
          effect.sourceEffectId === sourceEffectId,
      );
    expect(tickedEffect).toMatchObject({
      kind: "spiritualWeapon",
      expiresAt: {
        kind: "concentration",
        durationTicks: elapsedTimeTicks(2),
      },
    });

    const restored = breakBattleConcentration(suppressed, spellTargetId);
    expect(maybeSpiritualWeaponRepeatAct(restored)).toBeDefined();
  });

  test("rejects a stale Spiritual Weapon repeat subject after Antimagic Field suppression", () => {
    const sourceEffectId = battleSpellEffectOccurrenceId(
      `${spellCasterId}:${spiritualWeaponUnitId}:unit-profile-antimagic-stale-spiritual-weapon`,
    );
    const spiritualWeaponEffect = spiritualWeaponActiveEffect({
      effectId: sourceEffectId,
      durationTicks: elapsedTimeTicks(3),
    });
    const state = antimagicFieldBattle({
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
    const staleAct = maybeSpiritualWeaponRepeatAct(state);
    expect(staleAct).toBeDefined();
    if (staleAct === undefined) {
      throw new Error(
        "Expected Spiritual Weapon repeat act before suppression.",
      );
    }
    const suppressed = antimagicFieldSuppressing(state, [
      antimagicAffectedSpiritualWeapon(sourceEffectId, "ordinarySpell"),
    ]);
    const forceHole = requireHole(
      staleAct.initialHoles,
      "spiritualWeaponForcePosition",
    );
    const targetHole = requireHole(staleAct.initialHoles, "targetChoice");
    const movedForceId = "unit-profile-antimagic-stale-spiritual-weapon-moved";

    const resolved = resolveBattleSubject({
      state: suppressed,
      subject: staleAct.subject,
      fills: [
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
      ],
    });

    expect(resolved).toMatchObject({ tag: "invalid", reason: "staleSubject" });
    expect(
      suppressed.combatants
        .get(spellCasterId)
        ?.activeEffects.find(
          (effect) =>
            effect.kind === "spiritualWeapon" &&
            effect.sourceEffectId === sourceEffectId,
        ),
    ).toMatchObject({
      kind: "spiritualWeapon",
      forcePositionId: spiritualWeaponEffect.forcePositionId,
    });
  });
});

function maybeSpiritualWeaponRepeatAct(state: BattleState) {
  return discoverBattleActs(state).find(
    (candidate) =>
      candidate.subject.tag === "bonusActionSpell" &&
      candidate.subject.invocation.spellId === spiritualWeaponUnitId &&
      candidate.subject.invocation.procedure === "spiritualWeaponRepeatAttack",
  );
}

function antimagicFieldBattle(input?: {
  readonly lightEmitters?: readonly BattleStoredLightEmitter[];
  readonly activeEffects?: readonly BattleActiveEffect[];
  readonly preparedSpells?: readonly ReturnType<typeof spellRecord>[];
  readonly spellSlots?: SpellBattleSlots;
}): BattleState {
  const base = spellBattle({
    preparedSpells: input?.preparedSpells ?? [
      spellRecord(antimagicFieldUnitId),
    ],
    spellSlots: input?.spellSlots ?? [{ spellLevel: 8, count: 1 }],
  });
  if (input?.activeEffects === undefined) {
    return {
      ...base,
      lightEmitters: input?.lightEmitters ?? [],
    };
  }
  const caster = requireCombatant(base, spellCasterId);
  return {
    ...base,
    lightEmitters: input?.lightEmitters ?? [],
    combatants: new Map(base.combatants).set(spellCasterId, {
      ...caster,
      activeEffects: input.activeEffects,
      concentration: {
        sourceSpellId: heatMetalUnitId,
        effectKind: "spellEffect",
      },
    }),
  };
}

function castAntimagicField(
  state: BattleState,
  affectedOngoingSpellEffects: readonly BattleAntimagicFieldAffectedOngoingSpellEffect[],
): Extract<
  ReturnType<typeof resolveBattleSubject>,
  { readonly tag: "resolved" }
> {
  const act = spellAct({
    state,
    spellId: antimagicFieldUnitId,
    slotLevel: 8,
  });
  const areaHole = requireHole(act.initialHoles, "spellAreaChoice");
  const resolved = resolveBattleSubject({
    state,
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
    effect: { kind: "spellLightEmitter", sourceEffectId },
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
      sourceEffectId,
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
      sourceEffectId,
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
        sourceSpellId: antimagicFieldUnitId,
        effectKind: "spellEffect",
      },
      activeEffects: [
        ...antimagicCaster.activeEffects,
        {
          kind: "antimagicFieldOngoingSpellSuppression",
          sourceSpellId: antimagicFieldUnitId,
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
  readonly sourceSpellId: string;
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
    sourceSpellId: input.sourceSpellId,
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
    effectId: input.effectId,
    sourceSpellId: heatMetalUnitId,
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
    sourceEffectId: input.effectId,
    sourceSpellId: spiritualWeaponUnitId,
    sourceCombatantId: spellCasterId,
    sourceSpellLevel,
    forcePositionId: battleTablePositionId(
      "unit-profile-antimagic-spiritual-weapon-force",
    ),
    forceReachFeet: movementFeet(5),
    repeatMoveMaxFeet: movementFeet(20),
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
