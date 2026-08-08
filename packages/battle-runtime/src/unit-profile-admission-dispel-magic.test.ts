import { battleRuntimeSessionForTest } from "./battle-runtime-session.test-support.ts";
// UNIT-IDENTITY-EVIDENCE: deterministic-admission-projection L12G-FOLLOWUP-DISPEL-MAGIC-ONGOING-SPELL-ENDING dispel_magic
// UNIT-PROFILE-COVERAGE: verification-owner:runtime-test spell.invocation-ongoing-spell-ending
// KERNEL-COVERAGE: parity-witness BATTLE.SPELL.DISPEL_MAGIC_ONGOING_SPELL_ENDING
import {
  assertBattleSnapshotCodecAcceptsHolesForSubjectForTest,
  battleActiveEffectExecutionRefForTest,
  battleProcedureExecutionRefForTest,
  requireCharacterSpellProcedureRefForTest,
} from "./battle-runtime.test-support.ts";
import {
  antimagicFieldAuraEffectForTest,
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
import * as Either from "effect/Either";
import { describe, expect, test } from "vitest";
import { parseBattleSpellEffectLevel } from "./battle-reducer/spells-effective-level.ts";
import { allocateBattleActiveEffectRefForCreature } from "./active-effect/execution-ref.ts";
import { battleSpellEffectOccurrenceId } from "./identity.ts";
import type {
  BattleActiveEffect,
  BattleStoredLightEmitter,
  BattleTrackedOngoingSpellLightEmitter,
} from "./index.ts";
import { BattleHoleSchema, BattleSnapshotSchema } from "./index.ts";
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
    const emitter = objectSpellEmitter({
      objectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_blue_flame"),
      ),
      sourceSpellLevel: 4,
    });
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
      state: state.state,
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
      state: state.state,
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
            effectId: `${spellTargetId}:${heatMetalUnitId}:${objectId}`,
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
          effect: expect.objectContaining({
            kind: "spellActiveEffect",
            activeEffectKind: "spellObjectContactDamage",
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
    const selectedEmitter = objectSpellEmitter({
      objectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_silver_glow"),
      ),
      sourceEffectId: "synthetic_silver_glow:selected",
      sourceSpellLevel: 2,
    });
    const retainedEmitter = objectSpellEmitter({
      objectId,
      sourceProcedureRef: battleProcedureExecutionRefForTest(
        String("synthetic_silver_glow"),
      ),
      sourceEffectId: "synthetic_silver_glow:retained",
      sourceSpellLevel: 2,
    });
    const state = stateWithLightEmitters([selectedEmitter, retainedEmitter]);
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
            sourceProcedureRef: retainedEmitter.sourceProcedureRef,
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
    const selectedEffect = heatMetalObjectContactDamageEffect({
      objectId,
      sourceSpellLevel: 2,
      effectId: `${spellCasterId}:${heatMetalUnitId}:${objectId}`,
    });
    const retainedEffect = heatMetalObjectContactDamageEffect({
      objectId,
      sourceSpellLevel: 2,
      sourceCombatantId: spellTargetId,
      effectId: `${spellTargetId}:${heatMetalUnitId}:${objectId}`,
    });
    const state = stateWithCombatantActiveEffects({
      caster: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [selectedEffect],
      },
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(heatMetalUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [retainedEffect],
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
    const snapshot = snapshotBattle(state.state);
    const focusedSnapshot = {
      ...snapshot,
      acts: snapshot.acts.filter(
        (candidate) =>
          "procedureRef" in candidate.subject &&
          candidate.subject.procedureRef === act.subject.procedureRef,
      ),
    };
    expect(
      Either.isRight(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(focusedSnapshot),
      ),
    ).toBe(true);
    const wrongOwnerSnapshot = {
      ...focusedSnapshot,
      combatants: focusedSnapshot.combatants.map((combatant) =>
        combatant.combatantId === spellCasterId
          ? {
              ...combatant,
              activeEffectRefs: [
                battleActiveEffectExecutionRefForTest(
                  "wrong-owner-spiritual-weapon",
                ),
              ],
            }
          : combatant,
      ),
    };
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)(wrongOwnerSnapshot),
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
    const aura = antimagicFieldAuraEffect(areaId);
    const state = stateWithCombatantActiveEffects({
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(antimagicFieldUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [aura],
      },
    });
    const act = spellAct({
      session: state,
      spellId: dispelMagicUnitId,
      slotLevel: 3,
    });
    const target = {
      kind: "magicalEffect" as const,
      effect: {
        kind: "antimagicFieldAura" as const,
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

  test("magical-effect targeting rejects stale Antimagic Field aura identity", () => {
    const activeAreaId = battleAreaId("dispel-active-antimagic-aura-target");
    const staleAreaId = battleAreaId("dispel-stale-antimagic-aura-target");
    const state = stateWithCombatantActiveEffects({
      target: {
        concentration: {
          sourceProcedureRef: battleProcedureExecutionRefForTest(
            String(antimagicFieldUnitId),
          ),
          effectKind: "spellEffect",
        },
        activeEffects: [antimagicFieldAuraEffect(activeAreaId)],
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
        areaId: staleAreaId,
        sourceCombatantId: spellTargetId,
      },
    };

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
    const focusedSnapshot = {
      ...needsCheck.snapshot,
      acts: needsCheck.snapshot.acts.filter(
        (candidate) =>
          "procedureRef" in candidate.subject &&
          candidate.subject.procedureRef === act.subject.procedureRef,
      ),
    };
    assertBattleSnapshotCodecAcceptsHolesForSubjectForTest({
      snapshot: focusedSnapshot,
      subject: act.subject,
      holes: needsCheck.holes,
    });
    const encodedSnapshot =
      Schema.encodeSync(BattleSnapshotSchema)(focusedSnapshot);
    expect(
      Either.isLeft(
        Schema.decodeUnknownEither(BattleSnapshotSchema)({
          ...encodedSnapshot,
          combatants: encodedSnapshot.combatants.map((combatant) =>
            combatant.combatantId === spellCasterId
              ? {
                  ...combatant,
                  activeEffectRefs: combatant.activeEffectRefs.filter(
                    (effectRef) => effectRef !== effect.effectRef,
                  ),
                }
              : combatant,
          ),
          acts: focusedSnapshot.acts.map((candidate) => ({
            ...candidate,
            initialHoles: needsCheck.holes,
          })),
        }),
      ),
    ).toBe(true);
    const checkHole = requireResultHole(needsCheck, "spellcastingAbilityCheck");
    expect(checkHole).toEqual(
      expect.objectContaining({
        dc: 14,
        spellcastingAbilityCheck: expect.objectContaining({
          target,
          effect: target.effect,
          contestedSpellLevel: 4,
        }),
      }),
    );

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
  lightEmitters: readonly BattleStoredLightEmitter[],
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
  return battleRuntimeSessionForTest({
    ...session,
    state: { ...session.state, lightEmitters },
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
  const effectAllocation = allocateBattleActiveEffectRefForCreature({
    owner: caster,
  });
  const effect = {
    ...spiritualWeaponEffect({
      sourceSpellLevel,
      sourceEffectId: `${spellCasterId}:${spiritualWeaponUnitId}:${sourceSpellLevel}:tracked-force`,
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
  activeEffects: readonly BattleActiveEffect[],
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
  return battleRuntimeSessionForTest({
    ...session,
    state: {
      ...session.state,
      combatants: new Map(session.state.combatants).set(spellCasterId, {
        ...caster,
        concentration: input.concentration ?? null,
        activeEffects: [...caster.activeEffects, ...activeEffects],
      }),
    },
  });
}

function stateWithCombatantActiveEffects(input: {
  readonly caster?: {
    readonly activeEffects: readonly BattleActiveEffect[];
    readonly concentration?: {
      readonly sourceProcedureRef: ReturnType<
        typeof battleProcedureExecutionRefForTest
      >;
      readonly effectKind: "spellEffect";
    } | null;
  };
  readonly target?: {
    readonly activeEffects: readonly BattleActiveEffect[];
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
      activeEffects: [...caster.activeEffects, ...input.caster.activeEffects],
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
      activeEffects: [...target.activeEffects, ...input.target.activeEffects],
    });
  }
  return battleRuntimeSessionForTest({
    ...session,
    state: { ...session.state, combatants },
  });
}

function objectSpellEmitter(input: {
  readonly objectId: ReturnType<typeof battleObjectId>;
  readonly sourceProcedureRef: ReturnType<
    typeof battleProcedureExecutionRefForTest
  >;
  readonly sourceEffectId?: string;
  readonly sourceSpellLevel: number;
}): BattleTrackedOngoingSpellLightEmitter {
  return {
    kind: "spellLightEmitter",
    sourceProcedureRef: battleProcedureExecutionRefForTest(
      String(input.sourceProcedureRef),
    ),
    sourceCombatantId: spellTargetId,
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
  readonly effectId?: string;
}): Extract<BattleActiveEffect, { readonly kind: "spellObjectContactDamage" }> {
  const sourceCombatantId = input.sourceCombatantId ?? spellCasterId;
  return {
    kind: "spellObjectContactDamage",
    effectRef: battleActiveEffectExecutionRefForTest(
      input.effectId ??
        `${sourceCombatantId}:${heatMetalUnitId}:${input.objectId}`,
    ),
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
  readonly sourceEffectId: string;
}): Extract<BattleActiveEffect, { readonly kind: "spiritualWeapon" }> {
  return {
    kind: "spiritualWeapon",
    effectRef: battleActiveEffectExecutionRefForTest(input.sourceEffectId),
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
  BattleActiveEffect,
  { readonly kind: "antimagicFieldOngoingSpellSuppression" }
> {
  return antimagicFieldAuraEffectForTest({
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
