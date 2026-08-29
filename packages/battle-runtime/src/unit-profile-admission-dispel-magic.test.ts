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
} from "./battle-runtime.test-support.ts";
import {
  antimagicFieldAuraEffectTemplateForTest,
  antimagicFieldAuraMembershipForTest,
} from "./antimagic-field.test-support.ts";
import { elapsedTimeTicks } from "@dnd/shared-algebras/elapsed-time-algebra";
import {
  characterLevel,
  proficiencyBonusForCharacterLevel,
  Round,
} from "@dnd/shared/types";
import type { ActivationPhase, SpellRecord } from "@dnd/surface/surface/types";
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
  BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";
import type { BattleStoredLightEmitterTemplate } from "./battle-state-execution.ts";
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
  spellRecord,
} from "./unit-profile-admission-spell-record.test-support.ts";
import {
  attackBonus,
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
        maybeSpellAct({ session: state, spellId: spell.id, slotLevel: 3 }),
      ).toBeUndefined();
    }
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
        activeEffectKind: "spiritualWeapon" as const,
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
    const auraTemplate = antimagicFieldAuraEffect(areaId);
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
        effect.kind === "antimagicFieldOngoingSpellSuppression" &&
        effect.areaId === areaId,
    );
    if (aura?.kind !== "antimagicFieldOngoingSpellSuppression") {
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
        kind: "antimagicFieldAura" as const,
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
    const auraTemplate = antimagicFieldAuraEffect(areaId);
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
      (effect) => effect.kind === "antimagicFieldOngoingSpellSuppression",
    );
    if (
      staleAura?.kind !== "antimagicFieldOngoingSpellSuppression" ||
      activeAura?.kind !== "antimagicFieldOngoingSpellSuppression"
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
        kind: "antimagicFieldAura" as const,
        effectRef: staleAura.effectRef,
        areaId,
        sourceCombatantId: spellTargetId,
      },
    };
    const activeTarget = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "antimagicFieldAura" as const,
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
        "Dispel Magic Antimagic Field aura target must reference an active aura.",
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
        activeEffectKind: "spiritualWeapon" as const,
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
                  kind: "antimagicFieldAura",
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
    { readonly kind: "spiritualWeapon" }
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
      "spiritualWeaponAttackProxy",
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
    ...spiritualWeaponEffect({
      sourceSpellLevel,
    }),
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
  const session = stateWithLightEmitters([]);
  const caster = session.state.combatants.get(spellCasterId);
  if (caster === undefined) {
    throw new Error("Expected spell caster combatant.");
  }
  const concentrationState = {
    ...session.state,
    combatants: new Map(session.state.combatants).set(spellCasterId, {
      ...caster,
      concentration: input.concentration ?? null,
    }),
  };
  return battleRuntimeSessionForTest({
    ...session,
    state: battleStateWithAllocatedEffectOccurrencesForTest({
      state: concentrationState,
      occurrences: activeEffects.map((effect) => ({
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
  const session = stateWithLightEmitters([]);
  const combatants = new Map(session.state.combatants);
  if (input.caster !== undefined) {
    const caster = combatants.get(spellCasterId);
    if (caster === undefined) {
      throw new Error("Expected spell caster combatant.");
    }
    combatants.set(spellCasterId, {
      ...caster,
      concentration: input.caster.concentration ?? null,
    });
  }
  if (input.target !== undefined) {
    const target = combatants.get(spellTargetId);
    if (target === undefined) {
      throw new Error("Expected spell target combatant.");
    }
    combatants.set(spellTargetId, {
      ...target,
      concentration: input.target.concentration ?? null,
    });
  }
  const state = battleStateWithAllocatedEffectOccurrencesForTest({
    state: { ...session.state, combatants },
    occurrences: [
      ...(input.caster?.activeEffects.map((effect) => ({
        kind: "activeEffect" as const,
        ownerId: spellCasterId,
        effect,
      })) ?? []),
      ...(input.target?.activeEffects.map((effect) => ({
        kind: "activeEffect" as const,
        ownerId: spellTargetId,
        effect,
      })) ?? []),
    ],
  }).state;
  return battleRuntimeSessionForTest({
    ...session,
    state,
  });
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
    sourceEffectId: battleSpellEffectOccurrenceId(
      input.sourceEffectId ??
        `${spellTargetId}:${input.sourceProcedureRef}:${input.objectId}:test-effect`,
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

function spiritualWeaponEffect(input: {
  readonly sourceSpellLevel: number;
}): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "spiritualWeapon" }
> {
  return {
    kind: "spiritualWeapon",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(spiritualWeaponUnitId),
    ),
    sourceCombatantId: spellCasterId,
    sourceSpellLevel: testBattleSpellEffectLevel(input.sourceSpellLevel),
    forcePositionId: battleTablePositionId("dispel-spiritual-weapon-force"),
    forceReachFeet: movementFeet(5),
    repeatMoveMaxFeet: movementFeet(20),
    repeatTargeting: { kind: "unrestricted" },
    startedOn: { actorId: spellCasterId, round: Round(1) },
    damage: {
      kind: "fixedSpellAttackDamage",
      expr: { dice: 1, dieSize: 8, flat: 4 },
      damageType: "force",
    },
    attackKind: "melee_spell_attack",
    attackBonus: attackBonus(6),
    expiresAt: {
      kind: "concentration",
      combatantId: spellCasterId,
      durationTicks: elapsedTimeTicks(10),
    },
  };
}

function antimagicFieldAuraEffect(
  areaId: ReturnType<typeof battleAreaId>,
): Extract<
  BattleActiveEffectOccurrenceTemplate,
  { readonly kind: "antimagicFieldOngoingSpellSuppression" }
> {
  return antimagicFieldAuraEffectTemplateForTest({
    areaId,
    aura: antimagicFieldAuraMembershipForTest({
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
