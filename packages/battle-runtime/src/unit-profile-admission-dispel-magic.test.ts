// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING dispel_magic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ongoing-spell-ending
import type { ActivationPhase, SpellRecord } from "@dnd/surface/surface/types";
import { Schema } from "effect";
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import {
  continualFlameUnitId,
  dispelMagicUnitId,
  spellCasterId,
  spellTargetId,
} from "./unit-profile-admission-catalog-support.ts";
import {
  requireHole,
  requireResultHole,
} from "./unit-profile-admission-creature-fixture-support.ts";
import { spellBattle } from "./unit-profile-admission-spell-battle-support.ts";
import {
  maybeSpellAct,
  spellAct,
} from "./unit-profile-admission-spell-fill-support.ts";
import { spellRecord } from "./unit-profile-admission-spell-record-support.ts";
import {
  battleObjectId,
  canSpendAction,
  movementFeet,
  resolveBattleSubject,
  snapshotBattle,
  spellSlotInvocationRef,
  type BattleFill,
  type BattleHole,
  type BattleState,
} from "./unit-profile-admission-test-support.ts";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import { BattleHoleSchema, BattleSnapshotSchema } from "./index.ts";
import type {
  BattleLightEmitter,
  BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";

type OngoingSpellTargetChoiceFill = Extract<
  BattleFill,
  { readonly kind: "ongoingSpellTargetChoice" }
>;
type OngoingSpellTarget = OngoingSpellTargetChoiceFill["value"];
type OngoingSpellTargetWithinRangeFact =
  OngoingSpellTargetChoiceFill["spatialFacts"][number];

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
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    expect(act).toEqual(
      expect.objectContaining({
        subject: {
          tag: "actionSpell",
          actorId: spellCasterId,
          invocation: spellSlotInvocationRef(
            dispelMagicUnitId,
            3,
            "ongoingSpellEnd",
          ),
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

    for (const spell of [
      narrowTargetSpell,
      splitHoleSpell,
      extraPhaseSpell,
      onFailSpell,
    ]) {
      const state = spellBattle({
        preparedSpells: [spell],
        spellSlots: [{ spellLevel: 3, count: 1 }],
      });

      expect(
        maybeSpellAct({ state, spellId: spell.id, slotLevel: 3 }),
      ).toBeUndefined();
    }
  });

  test("level 3 dispel magic automatically ends object-attached continual flame", () => {
    const objectId = battleObjectId("dispel-continual-flame-object");
    const state = stateWithLightEmitters([
      objectSpellEmitter({
        objectId,
        sourceSpellId: continualFlameUnitId,
        sourceSpellLevel: 2,
      }),
    ]);
    const act = spellAct({
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );

    const resolved = resolveBattleSubject({
      state,
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
        sourceSpellId: continualFlameUnitId,
        sourceSpellLevel: 2,
      }),
    ]);
    const act = spellAct({
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetHole = requireHole(
      act.initialHoles,
      "ongoingSpellTargetChoice",
    );

    const missingFact = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [ongoingSpellTargetFill({ hole: targetHole, target, facts: [] })],
    });
    const wrongTargetFact = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: targetHole,
          target,
          facts: [
            ongoingSpellTargetWithinRangeFact({
              target: { kind: "object", objectId: otherObjectId },
            }),
          ],
        }),
      ],
    });
    const tooFarFact = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: targetHole,
          target,
          facts: [
            ongoingSpellTargetWithinRangeFact({
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
    const emitter = objectSpellEmitter({
      objectId,
      sourceSpellId: "synthetic_blue_flame",
      sourceSpellLevel: 4,
    });
    const state = stateWithLightEmitters([emitter]);
    const act = spellAct({
      state,
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
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");
    expect(checkHole).toEqual(
      expect.objectContaining({
        dc: 14,
        spellcastingAbilityCheck: expect.objectContaining({
          casterId: spellCasterId,
          sourceSpellId: dispelMagicUnitId,
          contestedSpellLevel: 4,
        }),
      }),
    );
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleHoleSchema)({
          ...checkHole,
          spellcastingAbilityCheck: {
            ...checkHole.spellcastingAbilityCheck,
            contestedSpellLevel: 10,
          },
        }),
      ),
    ).toBe(true);

    const failed = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 13)],
    });
    expect(failed).toMatchObject({
      tag: "resolved",
      state: {
        lightEmitters: [expect.objectContaining({ sourceSpellLevel: 4 })],
      },
    });

    const succeeded = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill, abilityCheckFill(checkHole, 14)],
    });
    expect(succeeded).toMatchObject({
      tag: "resolved",
      state: { lightEmitters: [] },
    });
  });

  test("duplicate higher-level ability check fills are invalid", () => {
    const objectId = battleObjectId("dispel-duplicate-check-object");
    const emitter = objectSpellEmitter({
      objectId,
      sourceSpellId: "synthetic_violet_flame",
      sourceSpellLevel: 4,
    });
    const state = stateWithLightEmitters([emitter]);
    const act = spellAct({
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const targetFill = ongoingSpellTargetFill({
      hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
      target: { kind: "object", objectId },
    });
    const needsCheck = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [targetFill],
    });
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");

    const duplicateCheckFill = resolveBattleSubject({
      state,
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
        sourceSpellId: "synthetic_green_flame",
        sourceSpellLevel: 4,
      }),
    ]);
    const act = spellAct({
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 4,
    });

    const resolved = resolveBattleSubject({
      state,
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

  test("magical-effect targeting removes only the selected ongoing spell effect", () => {
    const objectId = battleObjectId("dispel-magical-effect-object");
    const selectedEmitter = objectSpellEmitter({
      objectId,
      sourceSpellId: "synthetic_silver_glow",
      sourceEffectId: "synthetic_silver_glow:selected",
      sourceSpellLevel: 2,
    });
    const retainedEmitter = objectSpellEmitter({
      objectId,
      sourceSpellId: "synthetic_silver_glow",
      sourceEffectId: "synthetic_silver_glow:retained",
      sourceSpellLevel: 2,
    });
    const state = stateWithLightEmitters([selectedEmitter, retainedEmitter]);
    const act = spellAct({
      state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });

    const resolved = resolveBattleSubject({
      state,
      subject: act.subject,
      fills: [
        ongoingSpellTargetFill({
          hole: requireHole(act.initialHoles, "ongoingSpellTargetChoice"),
          target: {
            kind: "magicalEffect",
            effect: {
              kind: "spellLightEmitter",
              sourceEffectId: selectedEmitter.sourceEffectId,
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
            sourceSpellId: retainedEmitter.sourceSpellId,
          }),
        ],
      },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Dispel Magic to resolve.");
    }
    expect(resolved.state.lightEmitters).toHaveLength(1);
  });

  test("snapshot codec rejects out-of-domain ongoing spell effect levels", () => {
    const objectId = battleObjectId("dispel-invalid-level-codec-object");
    const state = stateWithLightEmitters([
      objectSpellEmitter({
        objectId,
        sourceSpellId: continualFlameUnitId,
        sourceSpellLevel: 2,
      }),
    ]);
    const snapshot = snapshotBattle(state);

    const decoded = Schema.decodeUnknownEither(BattleSnapshotSchema)({
      ...snapshot,
      lightEmitters: snapshot.lightEmitters.map((emitter) =>
        emitter.kind === "spellLightEmitter" && "sourceSpellLevel" in emitter
          ? { ...emitter, sourceSpellLevel: 10 }
          : emitter,
      ),
    });

    expect(Either.isLeft(decoded)).toBe(true);
  });
});

function stateWithLightEmitters(
  lightEmitters: readonly BattleLightEmitter[],
  spellSlots: readonly {
    readonly spellLevel: 3 | 4;
    readonly count: number;
  }[] = [
    { spellLevel: 3, count: 1 },
    { spellLevel: 4, count: 1 },
  ],
): BattleState {
  return {
    ...spellBattle({
      preparedSpells: [spellRecord(dispelMagicUnitId)],
      spellSlots,
    }),
    lightEmitters,
  };
}

function objectSpellEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceSpellId: string;
  readonly sourceEffectId?: string;
  readonly sourceSpellLevel: number;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceSpellId: input.sourceSpellId,
    sourceCombatantId: spellTargetId,
    sourceEffectId: battleSpellEffectOccurrenceId(
      input.sourceEffectId ??
        `${spellTargetId}:${input.sourceSpellId}:${input.objectId}:test-effect`,
    ),
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
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
  return {
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
  } as unknown as SpellRecord;
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
  return {
    ...spell,
    id,
    mechanics: {
      ...spell.mechanics,
      phases: [...spell.mechanics.phases, extraPhase],
    },
  } as unknown as SpellRecord;
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
  return {
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
  } as unknown as SpellRecord;
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
      ongoingSpellTargetWithinRangeFact({ target: input.target }),
    ],
  };
}

function ongoingSpellTargetWithinRangeFact(input: {
  readonly target: OngoingSpellTarget;
  readonly rangeFeet?: ReturnType<typeof movementFeet>;
}): OngoingSpellTargetWithinRangeFact {
  return {
    kind: "ongoingSpellTargetWithinRange",
    casterId: spellCasterId,
    spellId: dispelMagicUnitId,
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
