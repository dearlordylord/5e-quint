import { unitId as parseSharedUnitId } from "@dnd/shared/game-facts";
import {
  battleProcedureExecutionRefForTest,
  battleStateWithAllocatedEffectForTest,
} from "./battle-runtime.test-support.ts";
import { battleActSpellPresentation } from "./battle-act-composition.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-GUST-OF-WIND-LINE-RUNTIME gust_of_wind
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-gust-of-wind-line
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test unit-feature.metamagic-heightened-save-disadvantage
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.GUST_OF_WIND_LINE_LIFECYCLE
import {
  PositiveInteger,
  resourceCount,
  spellSlotLevel,
} from "@dnd/shared/types";
import {
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type { SpellMechanics, SpellRecord } from "@dnd/surface/surface/types";
import { describe, expect, test } from "vitest";
import { HEIGHTENED_METAMAGIC_EFFECT_KIND } from "./battle-reducer/metamagic.ts";
import { directionalPersistentAreaProfile } from "./battle-reducer/spell-procedure-profiles/directional-persistent-area.ts";
import type { SpellMechanicsAdmissionSource } from "./battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./battle-reducer/spell-procedure-profiles/profile.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
  type BattleSpellAdmissionSource,
} from "./battle-state-execution.ts";
import {
  requireCharacterSpellProcedureRefForTest,
  characterSeed,
  startBattleSessionRight,
  statBlockCreatureInit,
  wizardSpellcasting,
} from "./battle-runtime.test-support.ts";
import {
  movementFill,
  requireCombatant,
  requireHole,
} from "./unit-profile-admission-creature-fixture.test-support.ts";
import {
  declineTargetReadiedSpellAfterFailedSave,
  readyTargetRayOfFrost,
  spellBattle,
  spellBattleWithTargetRayOfFrost,
} from "./unit-profile-admission-spell-battle.test-support.ts";
import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
import {
  directionalPersistentAreaDirectionChangeAct,
  directionalPersistentAreaDirectionChoiceFill,
  directionalPersistentAreaEndTurnSaveAct,
  directionalPersistentAreaSavingThrowOutcomeFill,
  spellAct,
  spellHoleInvocation,
} from "./unit-profile-admission-spell-fill.test-support.ts";
import {
  decodeSpellRecordForTest,
  spellAdmissionSource,
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  assertBattleSnapshotCodecRoundTripForTest,
  battleId,
  breakBattleConcentration,
  discoverBattleActCandidates,
  discoverBattleActs,
  elapsedTimeTicks,
  endTurn,
  movementFeet,
  movementDeltaFeet,
  resolveBattleSubject,
  spellSlotInvocationRef,
  type AvailableBattleAct,
  type BattleRuntimeSession,
  type BattleState,
} from "./unit-profile-admission.test-support.ts";
import { battleFrontierInterruptDecisionForState } from "./index.ts";
import {
  greaseAreaId,
  greaseUnitId,
  gustOfWindAreaId,
  gustOfWindEastDirectionId,
  gustOfWindNorthDirectionId,
  gustOfWindUnitId,
  spellCasterId,
  spellTargetId,
  thunderwaveSecondTargetId,
  unitLibrary,
} from "./unit-profile-admission-catalog.test-support.ts";

type OngoingMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

function gustMechanics(): OngoingMechanics {
  const mechanics = spellRecord(gustOfWindUnitId).mechanics;
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Gust of Wind ongoing-effect mechanics.");
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

function syntheticGustRecord(
  mutate: (mechanics: OngoingMechanics) => unknown,
  suffix: string,
): SpellRecord {
  return decodeSpellRecordForTest({
    id: `synthetic_directional_area_${suffix}`,
    kind: "spell",
    name: `Synthetic Directional Area ${suffix}`,
    provenance: {
      kind: "synthetic-test",
      section: `synthetic_directional_area_${suffix}`,
    },
    mechanics: mutate(structuredClone(gustMechanics())),
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

function mutatedGustMechanicsSource(
  mutate: (mechanics: OngoingMechanics) => void,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(gustOfWindUnitId));
  const mechanics = structuredClone(source.mechanics);
  if (mechanics.family !== "ongoing_effect")
    throw new Error("Expected Gust of Wind ongoing-effect mechanics.");
  mutate(mechanics);
  return { ...mechanicsSource(source), mechanics };
}

function requireSaveArea(
  save:
    | OngoingMechanics["initialPhase"]
    | OngoingMechanics["operations"][number]["effect"]
    | undefined,
): Extract<
  Exclude<
    Extract<typeof save, { readonly kind: "save_gate" }>["attachment"],
    undefined
  >,
  { readonly kind: "hole" }
>["value"] {
  if (
    save?.kind !== "save_gate" ||
    save.attachment?.kind !== "hole" ||
    save.attachment.value.kind !== "area"
  )
    throw new Error("Expected a hole-wrapped save area.");
  return save.attachment.value;
}

describe("directionalPersistentArea static admission", () => {
  test("projects Gust mechanics once with exact owned and table-owned evidence", () => {
    const source = spellAdmissionSource(spellRecord(gustOfWindUnitId));
    const result = directionalPersistentAreaProfile.admitMechanics(
      mechanicsSource(source),
    );

    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      level: 2,
      durationTicks: 10,
      lengthFeet: 60,
      widthFeet: 10,
      rangeFeet: 0,
      ability: "str",
      dc: { kind: "caster_spell_save_dc" },
      pushDistanceFeet: 15,
      movementCost: { multiplier: 2, appliesTo: "towardSource" },
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
        spellOngoingInitialPhasePath(),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
        spellOngoingOperationPath(PositiveInteger(3)),
        spellOngoingOperationEffectPath(PositiveInteger(3)),
        spellOngoingOperationPath(PositiveInteger(4)),
        spellOngoingOperationEffectPath(PositiveInteger(4)),
      ],
      unowned: [
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    });

    const invocations = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: staticSpellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    expect(invocations).toHaveLength(1);
    expect(invocations[0]?.spell).not.toHaveProperty("mechanics");
  });

  test("recognizes renamed spell and hole identity with identical facts and execution", () => {
    const original = spellAdmissionSource(spellRecord(gustOfWindUnitId));
    const renamed = spellAdmissionSource(
      syntheticGustRecord((mechanics) => {
        const attachments = [
          mechanics.attachment,
          mechanics.initialPhase?.kind === "save_gate"
            ? mechanics.initialPhase.attachment
            : undefined,
          ...mechanics.operations.map(({ effect }) =>
            effect.kind === "save_gate" ? effect.attachment : undefined,
          ),
        ];
        for (const attachment of attachments)
          if (attachment?.kind === "hole") {
            Reflect.set(attachment, "holeId", "renamed_directional_area");
            Reflect.set(attachment, "label", "renamed directional area");
          }
        return mechanics;
      }, "renamed"),
    );
    const originalResult = directionalPersistentAreaProfile.admitMechanics(
      mechanicsSource(original),
    );
    const renamedResult = directionalPersistentAreaProfile.admitMechanics(
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

  test("accepts reordered operations and preserves their authored ordinals", () => {
    const reversed = spellAdmissionSource(
      syntheticGustRecord(
        (mechanics) => ({
          ...mechanics,
          operations: [...mechanics.operations].reverse(),
        }),
        "reordered",
      ),
    );
    const result = directionalPersistentAreaProfile.admitMechanics(
      mechanicsSource(reversed),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence.unowned).toEqual([
      spellOngoingOperationPath(PositiveInteger(4)),
      spellOngoingOperationEffectPath(PositiveInteger(4)),
    ]);
    expect(result.admitted.evidence.consumed).toContainEqual(
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    );
  });

  test("accumulates independent nested failures at actual operation paths", () => {
    const malformed = spellAdmissionSource(
      syntheticGustRecord((mechanics) => {
        if (mechanics.initialPhase?.kind !== "save_gate")
          throw new Error("Expected initial save gate.");
        Reflect.set(mechanics.initialPhase, "ability", "dex");
        const movement = mechanics.operations[1];
        const repeated = mechanics.operations[2];
        const direction = mechanics.operations[3];
        if (
          movement?.effect.kind !== "area_movement_cost_multiplier" ||
          repeated?.effect.kind !== "save_gate" ||
          direction?.trigger.kind !== "on_caster_spends_action"
        )
          throw new Error("Expected canonical Gust operations.");
        Reflect.set(movement.effect, "multiplier", 3);
        Reflect.set(repeated.effect, "ability", "dex");
        Reflect.set(direction.trigger, "cost", {
          kind: "standard_action",
          action: "magic",
        });
        return mechanics;
      }, "malformed"),
    );
    const result = directionalPersistentAreaProfile.admitMechanics(
      mechanicsSource(malformed),
    );

    expect(issueFacts(result)).toEqual(
      expect.arrayContaining([
        {
          failedFact: "initialSaveAbility",
          mechanicsPath: spellOngoingInitialPhasePath(),
        },
        {
          failedFact: "movementCostMultiplier",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(2)),
        },
        {
          failedFact: "endTurnSaveAbility",
          mechanicsPath: spellOngoingOperationEffectPath(PositiveInteger(3)),
        },
        {
          failedFact: "directionActionCost",
          mechanicsPath: spellOngoingOperationPath(PositiveInteger(4)),
        },
      ]),
    );
  });

  test.each([
    {
      label: "strong-wind trigger",
      ordinal: 1,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "trigger", { kind: "on_effect_starts" }),
      failedFact: "strongWindTrigger",
      effectPath: false,
    },
    {
      label: "strong-wind effect",
      ordinal: 1,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "effect", { kind: "none" }),
      failedFact: "strongWindEffect",
      effectPath: true,
    },
    {
      label: "movement-cost trigger",
      ordinal: 2,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "trigger", { kind: "on_effect_starts" }),
      failedFact: "movementCostTrigger",
      effectPath: false,
    },
    {
      label: "movement-cost effect",
      ordinal: 2,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "effect", { kind: "none" }),
      failedFact: "movementCostEffect",
      effectPath: true,
    },
    {
      label: "end-turn trigger",
      ordinal: 3,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "trigger", { kind: "passive" }),
      failedFact: "endTurnTrigger",
      effectPath: false,
    },
    {
      label: "end-turn effect",
      ordinal: 3,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "effect", { kind: "none" }),
      failedFact: "endTurnSaveFailure",
      effectPath: true,
    },
    {
      label: "direction trigger",
      ordinal: 4,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "trigger", { kind: "passive" }),
      failedFact: "directionTrigger",
      effectPath: false,
    },
    {
      label: "direction effect",
      ordinal: 4,
      mutate: (operation: OngoingMechanics["operations"][number]) =>
        Reflect.set(operation, "effect", { kind: "none" }),
      failedFact: "directionEffect",
      effectPath: true,
    },
  ])(
    "keeps malformed $label assigned to its authored ordinal",
    ({ ordinal, mutate, failedFact, effectPath }) => {
      const source = mutatedGustMechanicsSource((mechanics) => {
        const operation = mechanics.operations[ordinal - 1];
        if (operation === undefined)
          throw new Error("Expected the selected Gust operation.");
        mutate(operation);
      });
      const result = directionalPersistentAreaProfile.admitMechanics(source);
      expect(issueFacts(result)).toContainEqual({
        failedFact,
        mechanicsPath: effectPath
          ? spellOngoingOperationEffectPath(PositiveInteger(ordinal))
          : spellOngoingOperationPath(PositiveInteger(ordinal)),
      });
      expect(issueFacts(result)).not.toContainEqual({
        failedFact: "operationCount",
        mechanicsPath: spellMechanicsRootPath(),
      });
    },
  );

  test.each([
    {
      label: "initial Sphere",
      operationIndex: undefined,
      shape: { kind: "sphere", radiusFeet: 10 },
      failedFact: "initialSaveAttachment",
      path: spellOngoingInitialPhasePath(),
    },
    {
      label: "initial wrong-size Line",
      operationIndex: undefined,
      shape: { kind: "line", lengthFeet: 50, widthFeet: 10 },
      failedFact: "initialSaveAttachment",
      path: spellOngoingInitialPhasePath(),
    },
    {
      label: "repeated Sphere",
      operationIndex: 2,
      shape: { kind: "sphere", radiusFeet: 10 },
      failedFact: "endTurnSaveAttachment",
      path: spellOngoingOperationEffectPath(PositiveInteger(3)),
    },
    {
      label: "repeated wrong-size Line",
      operationIndex: 2,
      shape: { kind: "line", lengthFeet: 60, widthFeet: 15 },
      failedFact: "endTurnSaveAttachment",
      path: spellOngoingOperationEffectPath(PositiveInteger(3)),
    },
  ] as const)(
    "rejects a $label at the save path",
    ({ operationIndex, shape, failedFact, path }) => {
      const source = mutatedGustMechanicsSource((mechanics) => {
        const save =
          operationIndex === undefined
            ? mechanics.initialPhase
            : mechanics.operations[operationIndex]?.effect;
        Reflect.set(requireSaveArea(save), "shape", shape);
      });
      expect(
        issueFacts(directionalPersistentAreaProfile.admitMechanics(source)),
      ).toContainEqual({ failedFact, mechanicsPath: path });
    },
  );

  test("accumulates every optional save branch independently for both saves", () => {
    const source = mutatedGustMechanicsSource((mechanics) => {
      const saves = [mechanics.initialPhase, mechanics.operations[2]?.effect];
      for (const save of saves) {
        if (save?.kind !== "save_gate")
          throw new Error("Expected Gust save gates.");
        Reflect.set(save, "repeatSaves", []);
        Reflect.set(save, "autoSuccessIfCasterSlotGte", 3);
        Reflect.set(save, "autoSuccessIfTarget", { kind: "construct" });
        Reflect.set(save, "saveAppliesIf", { kind: "target_can_hear" });
        Reflect.set(save, "usageLimit", { kind: "once_per_turn" });
      }
    });
    const result = directionalPersistentAreaProfile.admitMechanics(source);
    expect(issueFacts(result).map(({ failedFact }) => failedFact)).toEqual(
      expect.arrayContaining([
        "initialRepeatSaves",
        "initialAutoSuccessIfCasterSlotGte",
        "initialAutoSuccessIfTarget",
        "initialSaveAppliesIf",
        "initialUsageLimit",
        "endTurnRepeatSaves",
        "endTurnAutoSuccessIfCasterSlotGte",
        "endTurnAutoSuccessIfTarget",
        "endTurnSaveAppliesIf",
        "endTurnUsageLimit",
      ]),
    );
  });
});

describe("L12G deterministic Gust of Wind Line admission", () => {
  test("gust of wind is admitted as a self-origin Line STR-save concentration spell", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });

    expect({
      ...act.subject,
      invocation: battleActSpellPresentation(act)?.invocation,
    }).toMatchObject({
      tag: "actionSpell",
      actorId: spellCasterId,
      procedureRef: requireCharacterSpellProcedureRefForTest(
        state,
        spellCasterId,
        spellSlotInvocationRef(
          gustOfWindUnitId,
          2,
          "directionalPersistentArea",
        ),
      ),
      mode: { tag: "cast" },
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
    expect(savingThrow).toEqual(
      expect.objectContaining({
        label: "Spell self-origin Line Saving Throw outcomes",
        ability: "str",
        dc: { kind: "caster_spell_save_dc" },
      }),
    );
    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "directionalPersistentArea",
        resource: { tag: "spellSlot", slotLevel: 2 },
        ability: "str",
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
        durationTicks: elapsedTimeTicks(10),
        rangeFeet: movementFeet(0),
        pushDistanceFeet: movementFeet(15),
        movementCost: {
          multiplier: 2,
          appliesTo: "towardSource",
        },
      }),
    );
  });

  test("gust of wind admission requires the repeated end-turn Line save", () => {
    const base = spellRecord(gustOfWindUnitId);
    if (base.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Gust of Wind ongoing effect mechanics.");
    }
    const operations = base.mechanics.operations.filter(
      (operation) => operation.trigger.kind !== "on_creature_ends_turn_in_area",
    );
    if (operations.length === 0) {
      throw new Error("Expected retained Gust of Wind operations.");
    }
    const spell = {
      ...base,
      mechanics: {
        ...base.mechanics,
        operations: operations as [
          (typeof operations)[number],
          ...(typeof operations)[number][],
        ],
      },
    };
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });

    expect(
      discoverBattleActs(state).some(
        (act) =>
          act.subject.tag === "actionSpell" &&
          battleActSpellPresentation(act)?.invocation.procedure ===
            "directionalPersistentArea",
      ),
    ).toBe(false);
  });

  test("gust of wind admission uses Line shape instead of authored hole id", () => {
    const spell = gustOfWindWithLineHoleId("synthetic_line_for_admission");
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(spellHoleInvocation(state, [savingThrow])).toEqual(
      expect.objectContaining({
        procedure: "directionalPersistentArea",
        targeting: {
          kind: "selfOriginLine",
          lengthFeet: movementFeet(60),
          widthFeet: movementFeet(10),
        },
      }),
    );
  });

  test("cast records the source-owned Line and Concentration state", () => {
    const cast = castGustOfWind([]);
    const caster = requireCombatant(cast.state, spellCasterId);

    expect(caster.concentration).toEqual({
      sourceProcedureRef: expect.any(String),
      effectKind: "spellEffect",
    });
    expect(caster.activeEffects).toEqual([
      expect.objectContaining({
        kind: "directionalPersistentArea",
        sourceProcedureRef: expect.any(String),
        sourceCombatantId: spellCasterId,
        areaId: gustOfWindAreaId,
        directionId: gustOfWindNorthDirectionId,
        heightenedSpellTargetDisadvantage: null,
        castTurn: {
          actorId: spellCasterId,
          round: 1,
        },
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(10),
        },
      }),
    ]);
  });

  test("failed appearance save requires table-supplied Line push facts", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const state = spellBattle({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
    });
    const act = spellAct({
      session: state,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");

    expect(
      resolveBattleSubject({
        state: state.state,
        subject: act.subject,
        fills: [
          directionalPersistentAreaSavingThrowOutcomeFill(
            savingThrow,
            [{ targetId: spellTargetId, succeeded: false }],
            { creaturePushes: [] },
          ),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "directional persistent area push facts must cover every failed-save target.",
    });
  });

  test("end-turn save resolves at the End Turn boundary", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );

    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: endTurnAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { currentActorId: spellCasterId },
    });
  });
  test("failed table-triggered Gust of Wind save opens a readied-spell Reaction", () => {
    const spell = spellRecord(gustOfWindUnitId);
    const initialSession = spellBattleWithTargetRayOfFrost({
      preparedSpells: [spell],
      spellSlots: [{ spellLevel: 2, count: 1 }],
      casterClassLevels: [{ className: "wizard", level: 3 }],
    });
    const castAct = spellAct({
      session: initialSession,
      spellId: gustOfWindUnitId,
      slotLevel: 2,
    });
    const cast = resolveBattleSubject({
      state: initialSession.state,
      subject: castAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(
          requireHole(castAct.initialHoles, "savingThrowOutcome"),
          [],
        ),
      ],
    });
    if (cast.tag !== "resolved") {
      throw new Error("Expected Gust of Wind cast to resolve.");
    }
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const readied = readyTargetRayOfFrost(
      battleRuntimeSessionForTest({
        state: targetTurn.state,
        context: initialSession.context,
      }),
    );
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(readied.state);
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    const awaitingReaction = resolveBattleSubject({
      state: readied.state,
      subject: endTurnAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
          { targetId: spellTargetId, succeeded: false },
        ]),
      ],
    });
    expect(awaitingReaction).toMatchObject({
      tag: "needsHoles",
      holes: [{ kind: "interruptDecision", trigger: "saveFailed" }],
    });
    const declined = declineTargetReadiedSpellAfterFailedSave(awaitingReaction);
    expect(declined.snapshot).toMatchObject({
      currentActorId: spellCasterId,
    });
    expect(battleFrontierInterruptDecisionForState(declined.state)).toBeNull();
  });

  test("movement closer to the caster through the Line spends two feet per foot", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const lineEffect = directionalPersistentAreaEffect(targetTurn.state);
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 10,
          provokedOpportunityAttacks: [],
          directionalPersistentAreaMovement: {
            kind: "directionalPersistentAreaMovement",
            effectRef: lineEffect.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: lineEffect.sourceProcedureRef,
            areaId: gustOfWindAreaId,
            directionId: gustOfWindNorthDirectionId,
            totalDistanceFeet: movementFeet(5),
            closerDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: 10 }),
          }),
        ]),
      },
    });
  });

  test("movement through a recast Line requires the current occurrence reference", () => {
    const session = gustOfWindBattle(2);
    const firstCast = resolveGustOfWindCast({ session, outcomes: [] });
    const staleEffect = directionalPersistentAreaEffect(firstCast.state);
    const casterTurn = advanceToCasterLaterTurn(firstCast.state);
    const casterBeforeRecast = requireCombatant(casterTurn, spellCasterId);
    const recast = resolveGustOfWindCast({
      session: battleRuntimeSessionForTest({
        state: casterTurn,
        context: session.context,
      }),
      outcomes: [],
    });
    const freshEffect = directionalPersistentAreaEffect(recast.state);
    const casterAfterRecast = requireCombatant(recast.state, spellCasterId);

    expect(freshEffect.effectRef).not.toBe(staleEffect.effectRef);
    expect(Number(casterAfterRecast.nextEffectOrdinal)).toBe(
      Number(casterBeforeRecast.nextEffectOrdinal) + 1,
    );
    expect(casterAfterRecast.activeEffects).toContainEqual(freshEffect);
    expect(
      requireCombatant(recast.state, spellTargetId).activeEffects.some(
        (effect) => effect.effectRef === freshEffect.effectRef,
      ),
    ).toBe(false);
    assertBattleSnapshotCodecRoundTripForTest(recast.snapshot);

    const targetTurn = endTurn({
      state: recast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const lineMovement = (effectRef: typeof staleEffect.effectRef) =>
      movementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        directionalPersistentAreaMovement: {
          kind: "directionalPersistentAreaMovement",
          effectRef,
          sourceCombatantId: spellCasterId,
          sourceProcedureRef: freshEffect.sourceProcedureRef,
          areaId: gustOfWindAreaId,
          directionId: gustOfWindNorthDirectionId,
          totalDistanceFeet: movementFeet(5),
          closerDistanceFeet: movementFeet(5),
        },
      });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [lineMovement(staleEffect.effectRef)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "directional persistent area Line movement fact does not match an active directional persistent area Line.",
    });
    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [lineMovement(freshEffect.effectRef)],
      }),
    ).toMatchObject({ tag: "resolved" });
  });

  test("movement closer to the caster rejects mismatched Line movement cost", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const lineEffect = directionalPersistentAreaEffect(targetTurn.state);
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [
          movementFill(movement, {
            movementCostFeet: 5,
            provokedOpportunityAttacks: [],
            directionalPersistentAreaMovement: {
              kind: "directionalPersistentAreaMovement",
              effectRef: lineEffect.effectRef,
              sourceCombatantId: spellCasterId,
              sourceProcedureRef: lineEffect.sourceProcedureRef,
              areaId: gustOfWindAreaId,
              directionId: gustOfWindNorthDirectionId,
              totalDistanceFeet: movementFeet(5),
              closerDistanceFeet: movementFeet(5),
            },
          }),
        ],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "directional persistent area Line movement must spend total distance plus 1 extra foot for every foot moved closer to the caster through the Line.",
    });
  });

  test("movement cost composes Grease and Gust of Wind Line facts", () => {
    const session = gustOfWindBattle(1);
    const cast = resolveGustOfWindCast({ session, outcomes: [] });
    const greased = withGreaseGroundHazard(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    );
    const targetTurn = endTurn({
      state: greased,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const lineEffect = directionalPersistentAreaEffect(targetTurn.state);
    const greaseEffect = persistentAreaSaveConditionEffect(targetTurn.state);
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [
        movementFill(movement, {
          movementCostFeet: 15,
          provokedOpportunityAttacks: [],
          areaDifficultTerrain: {
            kind: "areaDifficultTerrain",
            sources: [
              {
                kind: "persistentAreaSaveCondition",
                effectRef: greaseEffect.effectRef,
                sourceCombatantId: spellCasterId,
                sourceProcedureRef: greaseEffect.sourceProcedureRef,
                areaId: greaseAreaId,
              },
            ],
            totalDistanceFeet: movementFeet(5),
            difficultTerrainDistanceFeet: movementFeet(5),
          },
          directionalPersistentAreaMovement: {
            kind: "directionalPersistentAreaMovement",
            effectRef: lineEffect.effectRef,
            sourceCombatantId: spellCasterId,
            sourceProcedureRef: lineEffect.sourceProcedureRef,
            areaId: gustOfWindAreaId,
            directionId: gustOfWindNorthDirectionId,
            totalDistanceFeet: movementFeet(5),
            closerDistanceFeet: movementFeet(5),
          },
        }),
      ],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: {
        combatants: expect.arrayContaining([
          expect.objectContaining({
            combatantId: spellTargetId,
            movement: expect.objectContaining({ spentFeet: 15 }),
          }),
        ]),
      },
    });
  });

  test("area movement rejects a stale mechanically identical hazard occurrence", () => {
    const session = gustOfWindBattle(1);
    const cast = resolveGustOfWindCast({ session, outcomes: [] });
    const greased = withGreaseGroundHazard(
      battleRuntimeSessionForTest({ ...session, state: cast.state }),
    );
    const staleEffect = persistentAreaSaveConditionEffect(greased);
    const casterBeforeReplacement = requireCombatant(greased, spellCasterId);
    const withReplacement = withGreaseGroundHazard(
      battleRuntimeSessionForTest({ ...session, state: greased }),
    );
    const replacementCaster = requireCombatant(withReplacement, spellCasterId);
    const freshEffect = replacementCaster.activeEffects.find(
      (effect) =>
        effect.kind === "persistentAreaSaveCondition" &&
        effect.effectRef !== staleEffect.effectRef,
    );
    if (freshEffect?.kind !== "persistentAreaSaveCondition") {
      throw new Error("Expected a fresh allocated Grease occurrence.");
    }
    expect(Number(replacementCaster.nextEffectOrdinal)).toBe(
      Number(casterBeforeReplacement.nextEffectOrdinal) + 1,
    );
    const replacedState: BattleState = {
      ...withReplacement,
      combatants: new Map(withReplacement.combatants).set(spellCasterId, {
        ...replacementCaster,
        activeEffects: replacementCaster.activeEffects.filter(
          (effect) => effect.effectRef !== staleEffect.effectRef,
        ),
      }),
    };
    const targetTurn = endTurn({
      state: replacedState,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const act = moveAct(targetTurn.state);
    const movement = requireHole(act.initialHoles, "movement");
    const difficultTerrainMovement = (
      effectRef: typeof staleEffect.effectRef,
    ) =>
      movementFill(movement, {
        movementCostFeet: 10,
        provokedOpportunityAttacks: [],
        areaDifficultTerrain: {
          kind: "areaDifficultTerrain",
          sources: [
            {
              kind: "persistentAreaSaveCondition",
              effectRef,
              sourceCombatantId: spellCasterId,
              sourceProcedureRef: freshEffect.sourceProcedureRef,
              areaId: greaseAreaId,
            },
          ],
          totalDistanceFeet: movementFeet(5),
          difficultTerrainDistanceFeet: movementFeet(5),
        },
      });

    expect(
      resolveBattleSubject({
        state: targetTurn.state,
        subject: act.subject,
        fills: [difficultTerrainMovement(staleEffect.effectRef)],
      }),
    ).toMatchObject({
      tag: "invalid",
      message:
        "Area Difficult Terrain movement fact does not match an active Difficult Terrain area.",
    });
    const resolved = resolveBattleSubject({
      state: targetTurn.state,
      subject: act.subject,
      fills: [difficultTerrainMovement(freshEffect.effectRef)],
    });
    expect(resolved).toMatchObject({ tag: "resolved" });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected current Grease occurrence to resolve.");
    }
    assertBattleSnapshotCodecRoundTripForTest(resolved.snapshot);
  });

  test("caster can spend a Bonus Action to replace the active Line direction", () => {
    const cast = castGustOfWind([]);
    expect(
      discoverBattleActCandidates(cast.state).some(
        (act) =>
          act.subject.tag === "runtimeCommand" &&
          act.subject.command === "directionalPersistentAreaDirectionChange",
      ),
    ).toBe(false);
    const laterTurnBase = advanceToCasterLaterTurn(cast.state);
    const unrelatedEffect = {
      kind: "speedDelta",
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        "synthetic-gust-of-wind-composition",
      ),
      sourceCombatantId: spellCasterId,
      deltaFeet: movementDeltaFeet(10),
      expiresAt: { kind: "duration", durationTicks: elapsedTimeTicks(10) },
    } as const;
    const laterTurn = battleStateWithAllocatedEffectForTest({
      state: laterTurnBase,
      ownerId: spellCasterId,
      effect: unrelatedEffect,
    });
    const selectedGust = directionalPersistentAreaEffect(laterTurn);
    const { effectRef: _selectedEffectRef, ...overlappingGustTemplate } =
      selectedGust;
    const overlappingState = battleStateWithAllocatedEffectForTest({
      state: laterTurn,
      ownerId: spellCasterId,
      effect: overlappingGustTemplate,
    });
    const directionAct =
      directionalPersistentAreaDirectionChangeAct(overlappingState);
    const directionHole = requireHole(
      directionAct.initialHoles,
      "directionalPersistentAreaDirectionChoice",
    );
    const awaitingDirection = resolveBattleSubject({
      state: overlappingState,
      subject: directionAct.subject,
      fills: [],
    });
    if (awaitingDirection.tag !== "needsHoles") {
      throw new Error("Expected Gust of Wind direction choice.");
    }
    assertBattleSnapshotCodecRoundTripForTest(awaitingDirection.snapshot);

    const resolved = resolveBattleSubject({
      state: overlappingState,
      subject: directionAct.subject,
      fills: [directionalPersistentAreaDirectionChoiceFill(directionHole)],
    });

    expect(resolved).toMatchObject({
      tag: "resolved",
      snapshot: { turn: { bonusActionQuotaAvailable: false } },
    });
    if (resolved.tag !== "resolved") {
      throw new Error("Expected Gust of Wind direction change to resolve.");
    }
    expect(directionalPersistentAreaEffect(resolved.state)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindEastDirectionId,
        heightenedSpellTargetDisadvantage: null,
        expiresAt: {
          kind: "concentration",
          combatantId: spellCasterId,
          durationTicks: elapsedTimeTicks(9),
        },
      }),
    );
    expect(
      requireCombatant(resolved.state, spellCasterId).activeEffects,
    ).toEqual(
      expect.arrayContaining([expect.objectContaining(unrelatedEffect)]),
    );
    const gustEffects = requireCombatant(
      resolved.state,
      spellCasterId,
    ).activeEffects.filter(
      (effect) => effect.kind === "directionalPersistentArea",
    );
    expect(
      gustEffects.find(
        (effect) => effect.effectRef === directionAct.subject.effectRef,
      ),
    ).toEqual(
      expect.objectContaining({ directionId: gustOfWindEastDirectionId }),
    );
    expect(
      gustEffects.find(
        (effect) => effect.effectRef !== directionAct.subject.effectRef,
      ),
    ).toEqual(
      expect.objectContaining({ directionId: gustOfWindNorthDirectionId }),
    );
  });

  test("Heightened Gust of Wind stores the selected target on the Line occurrence", () => {
    const cast = castHeightenedGustOfWindWithSelectedTarget();

    expect(directionalPersistentAreaEffect(cast)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindNorthDirectionId,
        heightenedSpellTargetDisadvantage: {
          kind: "heightenedSpellTargetDisadvantage",
          targetId: spellTargetId,
        },
      }),
    );
  });

  test("Heightened Gust of Wind end-turn saves project Disadvantage only for the selected target", () => {
    const cast = castHeightenedGustOfWindWithSelectedTarget();
    const targetTurn = endTurn({ state: cast, actorId: spellCasterId });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }

    const selectedAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
      spellTargetId,
    );
    const selectedSave = requireHole(
      selectedAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(selectedSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });

    const secondTargetTurn = resolveBattleSubject({
      state: targetTurn.state,
      subject: selectedAct.subject,
      fills: [
        directionalPersistentAreaSavingThrowOutcomeFill(selectedSave, [
          { targetId: spellTargetId, succeeded: true },
        ]),
      ],
    });
    if (secondTargetTurn.tag !== "resolved") {
      throw new Error("Expected selected target End Turn to resolve.");
    }

    const unselectedAct = directionalPersistentAreaEndTurnSaveAct(
      secondTargetTurn.state,
      thunderwaveSecondTargetId,
    );
    const unselectedSave = requireHole(
      unselectedAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(unselectedSave.targetRollModes).not.toContainEqual({
      targetId: thunderwaveSecondTargetId,
      rollMode: "disadvantage",
    });
  });

  test("Heightened Gust of Wind preserves the selected target through direction replacement", () => {
    const cast = castHeightenedGustOfWindWithSelectedTarget();
    const laterTurn = advanceHeightenedGustOfWindToCasterLaterTurn(cast);
    const directionAct = directionalPersistentAreaDirectionChangeAct(laterTurn);
    const directionHole = requireHole(
      directionAct.initialHoles,
      "directionalPersistentAreaDirectionChoice",
    );
    const changed = resolveBattleSubject({
      state: laterTurn,
      subject: directionAct.subject,
      fills: [directionalPersistentAreaDirectionChoiceFill(directionHole)],
    });
    if (changed.tag !== "resolved") {
      throw new Error("Expected Gust of Wind direction change to resolve.");
    }

    expect(directionalPersistentAreaEffect(changed.state)).toEqual(
      expect.objectContaining({
        areaId: gustOfWindAreaId,
        directionId: gustOfWindEastDirectionId,
        heightenedSpellTargetDisadvantage: {
          kind: "heightenedSpellTargetDisadvantage",
          targetId: spellTargetId,
        },
      }),
    );

    const targetTurn = endTurn({
      state: changed.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
      spellTargetId,
      gustOfWindAreaId,
      gustOfWindEastDirectionId,
    );
    const endTurnSave = requireHole(
      endTurnAct.initialHoles,
      "savingThrowOutcome",
    );
    expect(endTurnSave.targetRollModes).toContainEqual({
      targetId: spellTargetId,
      rollMode: "disadvantage",
    });
  });

  test("breaking Concentration removes the active Line", () => {
    const cast = castGustOfWind([]);
    const ended = breakBattleConcentration(cast.state, spellCasterId);

    expect(requireCombatant(ended, spellCasterId)).toEqual(
      expect.objectContaining({
        concentration: null,
        activeEffects: [],
      }),
    );
  });
  test("a Gust of Wind save subject becomes stale after Concentration ends", () => {
    const cast = castGustOfWind([]);
    const targetTurn = endTurn({
      state: cast.state,
      actorId: spellCasterId,
    });
    if (targetTurn.tag !== "resolved") {
      throw new Error("Expected caster End Turn to resolve.");
    }
    const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
      targetTurn.state,
    );
    const ended = breakBattleConcentration(targetTurn.state, spellCasterId);
    expect(
      resolveBattleSubject({
        state: ended,
        subject: endTurnAct.subject,
        fills: [],
      }),
    ).toMatchObject({
      tag: "invalid",
      reason: "staleSubject",
      message: "directional persistent area Line save is no longer available.",
    });
  });
});

function castGustOfWind(
  outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[],
) {
  return resolveGustOfWindCast({
    session: gustOfWindBattle(1),
    outcomes,
  });
}

function gustOfWindBattle(spellSlotCount: number) {
  const spell = spellRecord(gustOfWindUnitId);
  return spellBattle({
    preparedSpells: [spell, spellRecord(greaseUnitId)],
    spellSlots: [
      { spellLevel: 1, count: 2 },
      { spellLevel: 2, count: spellSlotCount },
    ],
    casterClassLevels: [{ className: "wizard", level: 3 }],
  });
}

function resolveGustOfWindCast(input: {
  readonly session: BattleRuntimeSession;
  readonly outcomes: readonly {
    readonly targetId: typeof spellTargetId;
    readonly succeeded: boolean;
  }[];
}) {
  const act = spellAct({
    session: input.session,
    spellId: gustOfWindUnitId,
    slotLevel: 2,
  });
  const savingThrow = requireHole(act.initialHoles, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: input.session.state,
    subject: act.subject,
    fills: [
      directionalPersistentAreaSavingThrowOutcomeFill(
        savingThrow,
        input.outcomes,
      ),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Gust of Wind cast to resolve.");
  }
  return resolved;
}

function castHeightenedGustOfWindWithSelectedTarget(): BattleState {
  const spell = spellRecord(gustOfWindUnitId);
  const state = startBattleSessionRight({
    battleId: battleId("heightened-gust-of-wind-line"),
    combatants: [
      characterSeed({
        combatantId: spellCasterId,
        displayName: "Sorcerer",
        initiative: 20,
        attack: null,
        classLevels: [{ className: "sorcerer", level: 5 }],
        resources: [
          {
            unit: unitLibrary.requireUnit("sorcerer_font_of_magic"),
            pointsRemaining: resourceCount(4),
          },
        ],
        metamagic: {
          sorceryPointResourceUnitId: parseSharedUnitId(
            "sorcerer_font_of_magic",
          ),
          spellUseLimit: "one_per_spell_unless_option_allows_stacking",
          knownOptions: [
            {
              effectKind: HEIGHTENED_METAMAGIC_EFFECT_KIND,
              stackingMode: "one_per_spell",
              sorceryPointCost: resourceCount(2),
            },
          ],
        },
        spellcasting: {
          ...wizardSpellcasting({
            preparedSpells: [spell],
            spellSlots: [{ spellLevel: 2, count: 1 }],
          }),
          spellcastingSource: {
            tag: "classSpellcasting",
            className: "sorcerer",
            abilityModifier: 3,
          },
        },
      }),
      statBlockCreatureInit({
        combatantId: spellTargetId,
        statBlockName: "Target",
        initiative: 10,
      }),
      statBlockCreatureInit({
        combatantId: thunderwaveSecondTargetId,
        statBlockName: "Second Target",
        initiative: 9,
      }),
    ],
  });
  const act = heightenedGustOfWindAct(state);
  const heightenedTarget = requireHole(act.initialHoles, "targetChoice");
  const heightenedTargetFill = {
    kind: "targetChoice" as const,
    holeId: heightenedTarget.holeId,
    value: spellTargetId,
  };
  const awaitingSave = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [heightenedTargetFill],
  });
  if (awaitingSave.tag !== "needsHoles") {
    throw new Error("Expected Heightened Gust of Wind to request a save hole.");
  }
  const savingThrow = requireHole(awaitingSave.holes, "savingThrowOutcome");
  const resolved = resolveBattleSubject({
    state: state.state,
    subject: act.subject,
    fills: [
      heightenedTargetFill,
      directionalPersistentAreaSavingThrowOutcomeFill(savingThrow, [
        { targetId: spellTargetId, succeeded: true },
        { targetId: thunderwaveSecondTargetId, succeeded: true },
      ]),
    ],
  });
  if (resolved.tag !== "resolved") {
    throw new Error("Expected Heightened Gust of Wind to resolve.");
  }
  return resolved.state;
}

type ActionSpellAct = AvailableBattleAct & {
  readonly subject: Extract<
    AvailableBattleAct["subject"],
    { readonly tag: "actionSpell" }
  >;
};

function heightenedGustOfWindAct(state: BattleRuntimeSession): ActionSpellAct {
  const act = discoverBattleActs(state).find(
    (candidate): candidate is ActionSpellAct =>
      candidate.subject.tag === "actionSpell" &&
      battleActSpellPresentation(candidate)?.invocation.procedure ===
        "directionalPersistentArea" &&
      candidate.subject.metamagic?.some(
        (selection) =>
          selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
  if (act === undefined) {
    throw new Error("Expected Heightened Gust of Wind act.");
  }
  return act;
}

function gustOfWindWithLineHoleId(
  holeId: string,
): ReturnType<typeof spellRecord> {
  const base = spellRecord(gustOfWindUnitId);
  if (base.mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Gust of Wind ongoing effect mechanics.");
  }
  const attachment = base.mechanics.attachment;
  const initialPhase = base.mechanics.initialPhase;
  if (
    attachment.kind !== "hole" ||
    initialPhase?.kind !== "save_gate" ||
    initialPhase.attachment.kind !== "hole"
  ) {
    throw new Error("Expected Gust of Wind Line hole mechanics.");
  }
  const operations = base.mechanics.operations.map((operation) => {
    const effect = operation.effect;
    return operation.trigger.kind === "on_creature_ends_turn_in_area" &&
      effect.kind === "save_gate" &&
      effect.attachment?.kind === "hole"
      ? ({
          ...operation,
          effect: {
            ...effect,
            attachment: { ...effect.attachment, holeId },
          },
        } as typeof operation)
      : operation;
  });
  return decodeSpellRecordForTest({
    ...base,
    mechanics: {
      ...base.mechanics,
      attachment: { ...attachment, holeId },
      initialPhase: {
        ...initialPhase,
        attachment: { ...initialPhase.attachment, holeId },
      },
      operations,
    },
  });
}

function withGreaseGroundHazard(session: BattleRuntimeSession): BattleState {
  const sourceProcedureRef = requireCharacterSpellProcedureRefForTest(
    session,
    spellCasterId,
    spellSlotInvocationRef(greaseUnitId, 1, "persistentAreaSaveCondition"),
  );
  return battleStateWithAllocatedEffectForTest({
    state: session.state,
    ownerId: spellCasterId,
    effect: {
      kind: "persistentAreaSaveCondition" as const,
      sourceCombatantId: spellCasterId,
      sourceProcedureRef,
      areaId: greaseAreaId,
      heightenedSpellTargetDisadvantage: null,
      expiresAt: {
        kind: "duration" as const,
        durationTicks: elapsedTimeTicks(10),
      },
    },
  });
}

function persistentAreaSaveConditionEffect(state: BattleState) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "persistentAreaSaveCondition",
  );
  if (effect?.kind !== "persistentAreaSaveCondition") {
    throw new Error("Expected a Grease ground-hazard occurrence.");
  }
  return effect;
}

function moveAct(state: BattleState) {
  const act = discoverBattleActCandidates(state).find(
    (candidate) =>
      candidate.subject.tag === "runtimeCommand" &&
      candidate.subject.command === "move",
  );
  if (act === undefined) {
    throw new Error("Expected Movement act.");
  }
  return act;
}

function advanceToCasterLaterTurn(state: BattleState) {
  const targetTurn = endTurn({
    state,
    actorId: spellCasterId,
  });
  if (targetTurn.tag !== "resolved") {
    throw new Error("Expected caster End Turn to resolve.");
  }
  const endTurnAct = directionalPersistentAreaEndTurnSaveAct(targetTurn.state);
  const endTurnSave = requireHole(
    endTurnAct.initialHoles,
    "savingThrowOutcome",
  );
  const casterNextTurn = resolveBattleSubject({
    state: targetTurn.state,
    subject: endTurnAct.subject,
    fills: [
      directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
        { targetId: spellTargetId, succeeded: true },
      ]),
    ],
  });
  if (casterNextTurn.tag !== "resolved") {
    throw new Error("Expected target End Turn in Gust of Wind to resolve.");
  }
  return casterNextTurn.state;
}

function advanceHeightenedGustOfWindToCasterLaterTurn(state: BattleState) {
  const secondTargetTurn = advanceToCasterLaterTurn(state);
  const endTurnAct = directionalPersistentAreaEndTurnSaveAct(
    secondTargetTurn,
    thunderwaveSecondTargetId,
  );
  const endTurnSave = requireHole(
    endTurnAct.initialHoles,
    "savingThrowOutcome",
  );
  const casterNextTurn = resolveBattleSubject({
    state: secondTargetTurn,
    subject: endTurnAct.subject,
    fills: [
      directionalPersistentAreaSavingThrowOutcomeFill(endTurnSave, [
        { targetId: thunderwaveSecondTargetId, succeeded: true },
      ]),
    ],
  });
  if (casterNextTurn.tag !== "resolved") {
    throw new Error(
      "Expected second target End Turn in Gust of Wind to resolve.",
    );
  }
  return casterNextTurn.state;
}

function directionalPersistentAreaEffect(state: BattleState) {
  const effect = requireCombatant(state, spellCasterId).activeEffects.find(
    (candidate) => candidate.kind === "directionalPersistentArea",
  );
  if (effect === undefined) {
    throw new Error("Expected active Gust of Wind Line effect.");
  }
  return effect;
}
