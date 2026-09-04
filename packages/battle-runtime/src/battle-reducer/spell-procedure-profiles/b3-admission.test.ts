import { describe, expect, expectTypeOf, test } from "vitest";
import { unitId } from "@dnd/shared/game-facts";
import {
  PositiveInteger,
  spellSlotLevel,
  type DamageDieSize,
  type Integer,
  type MovementFeet,
} from "@dnd/shared/types";
import { Schema } from "effect";
import {
  spellActivationAttachmentPath,
  spellActivationEffectPath,
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellDurationEndingPath,
  spellDurationValuePath,
  spellMechanicsHeaderPath,
  spellMechanicsRootPath,
  spellOngoingAttachmentPath,
  spellOngoingAuthoredConditionalEffectPath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";

import {
  spellAdmissionSource,
  spellRecord,
  decodeSpellRecordForTest,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleCreatureState,
} from "../../battle-state-execution.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";
import { spellProcedureExecution } from "../../character-execution-admission.ts";
import { battleProcedureExecutionRefForTest } from "../../battle-runtime.test-support.ts";
import { BattleHoleSchema } from "../battle-codecs.ts";
import type { SpellMechanicsAdmissionSource } from "./spell-mechanics-admission.ts";
import type { SpellAdmissionActor } from "./profile.ts";
import { grantedAreaSaveDamageActionProfile } from "./granted-area-save-damage.ts";
import { stagedSaveConditionProfile } from "./hit-point-budget-condition-admission.ts";
import { saveGatedTurnConstraintBundleProfile } from "./save-gated-turn-constraint-bundle.ts";
import { saveGatedConditionWithRepeatProfile } from "./staged-save-condition.ts";

function mechanicsSource(
  spellId: Parameters<typeof spellRecord>[0],
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spellId));
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

function spellAdmissionActor(): SpellAdmissionActor {
  const actor = spellBattle({ preparedSpells: [] }).state.combatants.get(
    spellCasterId,
  );
  if (!isSpellAdmissionActor(actor)) {
    throw new Error("Expected a spellcasting character fixture.");
  }
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

const headers = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

function activationPaths(
  effectCount: number,
  repeatCount: number,
): readonly ReturnType<typeof spellActivationPhasePath>[] {
  return [
    spellActivationPhasePath(PositiveInteger(1)),
    spellActivationAttachmentPath(PositiveInteger(1)),
    ...Array.from({ length: effectCount }, (_, index) =>
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
    ...Array.from({ length: repeatCount }, (_, index) =>
      spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(index + 1)),
    ),
  ];
}

describe("SR-04G-B3 static spell procedure admission", () => {
  test.each([
    [
      "grantedAreaSaveDamageAction",
      grantedAreaSaveDamageActionProfile,
      "dragons_breath",
      [
        ...headers,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    ],
    [
      "stagedSaveCondition",
      stagedSaveConditionProfile,
      "sleep",
      [
        ...headers,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        ...activationPaths(2, 1),
      ],
    ],
    [
      "saveGatedConditionWithRepeat",
      saveGatedConditionWithRepeatProfile,
      "hideous_laughter",
      [...headers, spellDurationValuePath(), ...activationPaths(3, 2)],
    ],
    [
      "saveGatedTurnConstraintBundle",
      saveGatedTurnConstraintBundleProfile,
      "slow",
      [...headers, spellDurationValuePath(), ...activationPaths(7, 1)],
    ],
  ] as const)(
    "admits %s with complete non-root evidence",
    (_name, profile, spellId, expected) => {
      const result = profile.admitMechanics(mechanicsSource(spellId));
      expect(result.tag).toBe("supported");
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence).toEqual({
        consumed: expected,
        unowned: [],
      });
    },
  );

  test("invokes Sleep and Hideous Laughter only through their admitted carriers", () => {
    const actor = spellAdmissionActor();
    const sleepSource = spellAdmissionSource(spellRecord("sleep"));
    const sleep = stagedSaveConditionProfile.admitMechanics({
      mechanics: sleepSource.mechanics,
      spellDefinitionRuleFacts: sleepSource.spellDefinitionRuleFacts,
    });
    expect(sleep.tag).toBe("supported");
    if (sleep.tag !== "supported") return;
    expect(
      sleep.admitted.admit(
        battleSpellExecutionSourceFromAdmission(sleepSource),
        {
          actor,
          castingSource: sleepSource.castingSource,
          battle: undefined,
          spellCastOptions: [
            { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
          ],
        },
      ),
    ).toEqual([
      expect.objectContaining({
        procedure: "stagedSaveCondition",
        spell: expect.objectContaining({ id: sleepSource.id }),
        targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
      }),
    ]);

    const laughterSource = spellAdmissionSource(
      spellRecord("hideous_laughter"),
    );
    const laughter = saveGatedConditionWithRepeatProfile.admitMechanics({
      mechanics: laughterSource.mechanics,
      spellDefinitionRuleFacts: laughterSource.spellDefinitionRuleFacts,
    });
    expect(laughter.tag).toBe("supported");
    if (laughter.tag !== "supported") return;
    const [laughterInvocation] = laughter.admitted.admit(
      battleSpellExecutionSourceFromAdmission(laughterSource),
      {
        actor,
        castingSource: laughterSource.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(1), payment: { tag: "slot" } },
        ],
      },
    );
    expect(laughterInvocation).toEqual(
      expect.objectContaining({
        procedure: "saveGatedConditionWithRepeat",
        spell: expect.objectContaining({ id: laughterSource.id }),
      }),
    );
    if (laughterInvocation === undefined) {
      throw new Error("Expected a Hideous Laughter invocation.");
    }
    expectTypeOf(
      laughterInvocation.targeting.maxTargets,
    ).toEqualTypeOf<PositiveInteger>();
    const laughterExecution = spellProcedureExecution(laughterInvocation);
    const isLaughterExecution = Schema.is(
      saveGatedConditionWithRepeatProfile.executionSchema,
    );
    expect(isLaughterExecution(laughterExecution)).toBe(true);
    expect(
      isLaughterExecution({
        ...laughterExecution,
        targeting: { ...laughterExecution.targeting, maxTargets: 0 },
      }),
    ).toBe(false);
    expect(
      isLaughterExecution({
        ...laughterExecution,
        targeting: { ...laughterExecution.targeting, maxTargets: 1.5 },
      }),
    ).toBe(false);
  });

  test("projects every Dragon's Breath execution fact instead of recomputing it", () => {
    const result = grantedAreaSaveDamageActionProfile.admitMechanics(
      mechanicsSource("dragons_breath"),
    );
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    expect(result.admitted.facts).toMatchObject({
      ability: "dex",
      rangeFeet: 5,
      durationTicks: 10,
      coneLengthFeet: 15,
      damageTypeChoices: ["acid", "cold", "fire", "lightning", "poison"],
      damage: {
        baseDice: 3,
        dieSize: 6,
        perSlotDice: 1,
        startingAtLevel: 2,
      },
    });
    expectTypeOf(result.admitted.facts.coneLengthFeet).toEqualTypeOf<
      MovementFeet & 15
    >();
    expectTypeOf(result.admitted.facts.damage.dieSize).toEqualTypeOf<
      DamageDieSize & 6
    >();
  });

  test("rejects impossible Dragon's Breath constants and an empty choice set at the execution boundary", () => {
    const source = spellAdmissionSource(spellRecord("dragons_breath"));
    const result = grantedAreaSaveDamageActionProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(2), payment: { tag: "slot" } },
        ],
      },
    );
    if (invocation === undefined) {
      throw new Error("Expected a second-level Dragon's Breath invocation.");
    }
    expectTypeOf(invocation.coneLengthFeet).toEqualTypeOf<MovementFeet & 15>();
    expectTypeOf(invocation.damageDieSize).toEqualTypeOf<DamageDieSize & 6>();
    const execution = spellProcedureExecution(invocation);
    expect(
      Schema.is(grantedAreaSaveDamageActionProfile.executionSchema)(execution),
    ).toBe(true);
    expect(
      Schema.is(grantedAreaSaveDamageActionProfile.executionSchema)({
        ...execution,
        damageTypeChoices: [],
      }),
    ).toBe(false);
    expect(
      Schema.is(grantedAreaSaveDamageActionProfile.executionSchema)({
        ...execution,
        coneLengthFeet: 20,
      }),
    ).toBe(false);
    expect(
      Schema.is(grantedAreaSaveDamageActionProfile.executionSchema)({
        ...execution,
        damageDieSize: 8,
      }),
    ).toBe(false);
  });

  test("projects Sleep, Hideous Laughter, and Slow facts into immutable carriers", () => {
    const sleep = stagedSaveConditionProfile.admitMechanics(
      mechanicsSource("sleep"),
    );
    const laughter = saveGatedConditionWithRepeatProfile.admitMechanics(
      mechanicsSource("hideous_laughter"),
    );
    const slow = saveGatedTurnConstraintBundleProfile.admitMechanics(
      mechanicsSource("slow"),
    );

    expect(sleep).toMatchObject({
      tag: "supported",
      admitted: {
        facts: {
          ability: "wis",
          rangeFeet: 60,
          durationTicks: 10,
          targeting: { kind: "pointOriginSphere", radiusFeet: 5 },
        },
      },
    });
    expect(laughter).toMatchObject({
      tag: "supported",
      admitted: {
        facts: {
          ability: "wis",
          rangeFeet: 30,
          durationTicks: 10,
          targeting: {
            kind: "targetList",
            count: { base: 1, baseLevel: 1, perSlotAboveBase: 1 },
          },
        },
      },
    });
    expect(slow).toMatchObject({
      tag: "supported",
      admitted: {
        facts: {
          ability: "wis",
          rangeFeet: 120,
          durationTicks: 10,
          maxTargets: 6,
        },
      },
    });
    if (slow.tag !== "supported") {
      throw new Error("Expected Slow mechanics to be admitted.");
    }
    expect(slow.admitted.facts.constraints).toEqual({
      speedRatio: { numerator: 1, denominator: 2 },
      armorClassDelta: -2,
      dexteritySavingThrowDelta: -2,
      maxAttacks: 1,
      somaticFailurePercent: 25,
    });
    expectTypeOf(
      slow.admitted.facts.constraints.speedRatio.numerator,
    ).toEqualTypeOf<PositiveInteger & 1>();
    expectTypeOf(
      slow.admitted.facts.constraints.speedRatio.denominator,
    ).toEqualTypeOf<PositiveInteger & 2>();
    expectTypeOf(slow.admitted.facts.constraints.armorClassDelta).toEqualTypeOf<
      Integer & -2
    >();
    expectTypeOf(
      slow.admitted.facts.constraints.dexteritySavingThrowDelta,
    ).toEqualTypeOf<Integer & -2>();
    expectTypeOf(slow.admitted.facts.constraints.maxAttacks).toEqualTypeOf<
      PositiveInteger & 1
    >();
    expectTypeOf(
      slow.admitted.facts.constraints.somaticFailurePercent,
    ).toEqualTypeOf<PositiveInteger & 25>();
  });

  test("rejects impossible Slow constraint constants at the execution boundary", () => {
    const source = spellAdmissionSource(spellRecord("slow"));
    const result = saveGatedTurnConstraintBundleProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("supported");
    if (result.tag !== "supported") return;
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      {
        actor: spellAdmissionActor(),
        castingSource: source.castingSource,
        battle: undefined,
        spellCastOptions: [
          { spellLevel: spellSlotLevel(3), payment: { tag: "slot" } },
        ],
      },
    );
    if (invocation === undefined) {
      throw new Error("Expected a third-level Slow invocation.");
    }
    const execution = spellProcedureExecution(invocation);
    const isExecution = Schema.is(
      saveGatedTurnConstraintBundleProfile.executionSchema,
    );
    expect(isExecution(execution)).toBe(true);
    const impossibleConstraints = [
      {
        ...execution.constraints,
        speedRatio: { ...execution.constraints.speedRatio, numerator: 2 },
      },
      {
        ...execution.constraints,
        speedRatio: { ...execution.constraints.speedRatio, denominator: 3 },
      },
      { ...execution.constraints, armorClassDelta: -1 },
      { ...execution.constraints, dexteritySavingThrowDelta: -1 },
      { ...execution.constraints, maxAttacks: 2 },
      { ...execution.constraints, somaticFailurePercent: 50 },
    ];
    for (const constraints of impossibleConstraints) {
      expect(isExecution({ ...execution, constraints })).toBe(false);
    }
  });

  test("rejects impossible Slow and Dragon's Breath facts at the battle-hole codec boundary", () => {
    const slowProcedureRef =
      battleProcedureExecutionRefForTest("b3-codec-slow");
    const dragonProcedureRef =
      battleProcedureExecutionRefForTest("b3-codec-dragon");
    const slowHole = {
      holeId: "battle:b3-codec:slow",
      holeInstanceKey: "battle:b3-codec:slow",
      label: "Synthetic B3 Slow codec hole",
      kind: "turnConstraintSomaticSpellFailureOutcome",
      actorId: spellCasterId,
      sourceProcedureRef: slowProcedureRef,
      failurePercent: 25,
      activeEffectSources: [],
    } as const;
    const dragonHole = {
      holeId: "battle:b3-codec:dragon",
      holeInstanceKey: "battle:b3-codec:dragon",
      label: "Synthetic B3 Dragon codec hole",
      kind: "savingThrowOutcome",
      grantedAreaSaveDamageAction: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: dragonProcedureRef,
        lengthFeet: 15,
      },
      ability: "dex",
      dc: { kind: "fixed", dc: 12 },
      areaChoices: [],
      targetRollModes: [],
      targetFlatBonuses: [],
    } as const;
    const dragonDamageHole = {
      holeId: "battle:b3-codec:dragon-damage",
      holeInstanceKey: "battle:b3-codec:dragon-damage",
      label: "Synthetic B3 Dragon damage codec hole",
      kind: "rolledDice",
      grantedAreaSaveDamageAction: {
        sourceCombatantId: spellCasterId,
        sourceProcedureRef: dragonProcedureRef,
        damageType: "fire",
        expr: { dice: 3, dieSize: 6 },
      },
    } as const;
    const isBattleHole = Schema.is(BattleHoleSchema);

    expect(isBattleHole(slowHole)).toBe(true);
    expect(isBattleHole({ ...slowHole, failurePercent: 50 })).toBe(false);
    expect(isBattleHole(dragonHole)).toBe(true);
    expect(
      isBattleHole({
        ...dragonHole,
        grantedAreaSaveDamageAction: {
          ...dragonHole.grantedAreaSaveDamageAction,
          lengthFeet: 20,
        },
      }),
    ).toBe(false);
    expect(isBattleHole(dragonDamageHole)).toBe(true);
    expect(
      isBattleHole({
        ...dragonDamageHole,
        grantedAreaSaveDamageAction: {
          ...dragonDamageHole.grantedAreaSaveDamageAction,
          expr: {
            ...dragonDamageHole.grantedAreaSaveDamageAction.expr,
            dieSize: 8,
          },
        },
      }),
    ).toBe(false);
  });

  test("keeps static facts and evidence invariant under authored renaming", () => {
    const cases = [
      [grantedAreaSaveDamageActionProfile, "dragons_breath"],
      [stagedSaveConditionProfile, "sleep"],
      [saveGatedConditionWithRepeatProfile, "hideous_laughter"],
      [saveGatedTurnConstraintBundleProfile, "slow"],
    ] as const;
    for (const [profile, spellId] of cases) {
      const original = spellRecord(spellId);
      const renamed = decodeSpellRecordForTest({
        ...original,
        id: unitId(`synthetic_b3_renamed_${spellId}`),
        name: "Synthetic Renamed Spell",
        provenance: {
          kind: "synthetic-test",
          section: `synthetic_b3_renamed_${spellId}`,
        },
      });
      const originalResult = profile.admitMechanics(mechanicsSource(spellId));
      const renamedSource = spellAdmissionSource(renamed);
      const renamedResult = profile.admitMechanics({
        mechanics: renamedSource.mechanics,
        spellDefinitionRuleFacts: renamedSource.spellDefinitionRuleFacts,
      });
      expect(originalResult.tag).toBe("supported");
      expect(renamedResult.tag).toBe("supported");
      if (
        originalResult.tag !== "supported" ||
        renamedResult.tag !== "supported"
      ) {
        continue;
      }
      expect(renamedResult.admitted.facts).toEqual(
        originalResult.admitted.facts,
      );
      expect(renamedResult.admitted.evidence).toEqual(
        originalResult.admitted.evidence,
      );
    }
  });

  test("does not claim sibling save-gate shapes", () => {
    expect(
      stagedSaveConditionProfile.admitMechanics(
        mechanicsSource("hideous_laughter"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      saveGatedConditionWithRepeatProfile.admitMechanics(
        mechanicsSource("sleep"),
      ),
    ).toEqual({ tag: "notRepresented" });
    expect(
      saveGatedTurnConstraintBundleProfile.admitMechanics(
        mechanicsSource("hypnotic_pattern"),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test.each(["barkskin", "guidance", "mage_armor", "resistance"] as const)(
    "does not claim ongoing sibling %s",
    (sibling) => {
      expect(
        grantedAreaSaveDamageActionProfile.admitMechanics(
          mechanicsSource(sibling),
        ),
      ).toEqual({ tag: "notRepresented" });
    },
  );

  test("roots Dragon's Breath's missing sole operation on the existing mechanics parent", () => {
    const source = mechanicsSource("dragons_breath");
    if (source.mechanics.family !== "ongoing_effect") {
      throw new Error("Expected Dragon's Breath ongoing mechanics.");
    }
    const mechanicsWithoutOperations = { ...source.mechanics };
    // Exercise the defensive admission branch with a malformed boundary value;
    // the public Surface decoder correctly makes this state unconstructable.
    Object.defineProperty(mechanicsWithoutOperations, "operations", {
      value: [],
    });
    const result = grantedAreaSaveDamageActionProfile.admitMechanics({
      ...source,
      mechanics: mechanicsWithoutOperations,
    });

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "operationCount",
        mechanicsPath: spellMechanicsRootPath(),
      }),
    );
    expect(result.issues).not.toContainEqual(
      expect.objectContaining({
        failedFact: "operationCount",
        mechanicsPath: spellOngoingOperationPath(PositiveInteger(1)),
      }),
    );
  });

  test("reports an authored ongoing conditional effect at its non-colliding sibling coordinate", () => {
    const dragon = mechanicsSource("dragons_breath");
    const conditional = mechanicsSource("phantasmal_force");
    if (
      dragon.mechanics.family !== "ongoing_effect" ||
      conditional.mechanics.family !== "ongoing_effect" ||
      conditional.mechanics.authoredConditionalEffects?.[0] === undefined
    ) {
      throw new Error("Expected ongoing mechanics with a conditional effect.");
    }
    const result = grantedAreaSaveDamageActionProfile.admitMechanics({
      ...dragon,
      mechanics: {
        ...dragon.mechanics,
        authoredConditionalEffects: [
          conditional.mechanics.authoredConditionalEffects[0],
        ],
      },
    });

    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    const conditionalPath = spellOngoingAuthoredConditionalEffectPath(
      PositiveInteger(1),
    );
    expect(conditionalPath).not.toEqual(spellOngoingAttachmentPath());
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "authoredConditionalEffects",
        mechanicsPath: conditionalPath,
      }),
    );
  });

  test("accumulates independent Sleep header and phase failures at stable paths", () => {
    const base = spellRecord("sleep");
    if (
      base.mechanics.family !== "activation" ||
      base.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Sleep save-gate mechanics.");
    }
    const malformed = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_sleep_multiple_failures"),
      name: "Synthetic Sleep Multiple Failures",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_sleep_multiple_failures",
      },
      mechanics: {
        ...base.mechanics,
        level: 2,
        range: { kind: "self" },
        phases: [{ ...base.mechanics.phases[0], ability: "str" }],
      },
    });
    const result = stagedSaveConditionProfile.admitMechanics({
      mechanics: malformed.mechanics,
      spellDefinitionRuleFacts:
        spellAdmissionSource(malformed).spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(
      result.issues.map(({ failedFact, mechanicsPath }) => ({
        failedFact,
        mechanicsPath,
      })),
    ).toEqual([
      { failedFact: "level", mechanicsPath: spellMechanicsHeaderPath("level") },
      { failedFact: "range", mechanicsPath: spellMechanicsHeaderPath("range") },
      {
        failedFact: "phaseAbility",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      },
    ]);
  });

  test("keeps Sleep and Hideous Laughter owned when a defining failed-save effect is deleted", () => {
    const sleep = spellRecord("sleep");
    if (
      sleep.mechanics.family !== "activation" ||
      sleep.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Sleep composite save-gate mechanics.");
    }
    const sleepPhase = sleep.mechanics.phases[0];
    const sleepFailure = sleepPhase.onFail;
    if (sleepFailure.kind !== "composite") {
      throw new Error("Expected Sleep composite failed-save effects.");
    }
    const sleepWithoutEscape = decodeSpellRecordForTest({
      ...sleep,
      id: unitId("synthetic_b3_sleep_missing_escape"),
      name: "Synthetic Sleep Missing Escape",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_sleep_missing_escape",
      },
      mechanics: {
        ...sleep.mechanics,
        phases: [
          {
            ...sleepPhase,
            onFail: {
              ...sleepFailure,
              effects: sleepFailure.effects.filter(
                (effect) => effect.kind !== "target_effect_escape_action",
              ),
            },
          },
        ],
      },
    });
    const sleepSource = spellAdmissionSource(sleepWithoutEscape);
    const sleepResult = stagedSaveConditionProfile.admitMechanics({
      mechanics: sleepSource.mechanics,
      spellDefinitionRuleFacts: sleepSource.spellDefinitionRuleFacts,
    });
    expect(sleepResult.tag).toBe("unsupported");
    if (sleepResult.tag !== "unsupported") return;
    expect(sleepResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "missingFailureEffect",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      }),
    );

    const laughter = spellRecord("hideous_laughter");
    if (
      laughter.mechanics.family !== "activation" ||
      laughter.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error(
        "Expected Hideous Laughter composite save-gate mechanics.",
      );
    }
    const laughterPhase = laughter.mechanics.phases[0];
    const laughterFailure = laughterPhase.onFail;
    if (laughterFailure.kind !== "composite") {
      throw new Error(
        "Expected Hideous Laughter composite failed-save effects.",
      );
    }
    const laughterWithoutSuppression = decodeSpellRecordForTest({
      ...laughter,
      id: unitId("synthetic_b3_laughter_missing_suppression"),
      name: "Synthetic Laughter Missing Suppression",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_laughter_missing_suppression",
      },
      mechanics: {
        ...laughter.mechanics,
        phases: [
          {
            ...laughterPhase,
            onFail: {
              ...laughterFailure,
              effects: laughterFailure.effects.filter(
                (effect) => effect.kind !== "suppress_condition_self_end",
              ),
            },
          },
        ],
      },
    });
    const laughterSource = spellAdmissionSource(laughterWithoutSuppression);
    const laughterResult = saveGatedConditionWithRepeatProfile.admitMechanics({
      mechanics: laughterSource.mechanics,
      spellDefinitionRuleFacts: laughterSource.spellDefinitionRuleFacts,
    });
    expect(laughterResult.tag).toBe("unsupported");
    if (laughterResult.tag !== "unsupported") return;
    expect(laughterResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "missingFailureEffect",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      }),
    );
  });

  test("roots absent repeat-save diagnostics on their existing save-gate phases", () => {
    const sleep = spellRecord("sleep");
    if (
      sleep.mechanics.family !== "activation" ||
      sleep.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Sleep save-gate mechanics.");
    }
    const { repeatSaves: _sleepRepeatSaves, ...sleepPhaseWithoutRepeat } =
      sleep.mechanics.phases[0];
    const sleepWithoutRepeat = decodeSpellRecordForTest({
      ...sleep,
      id: unitId("synthetic_b3_sleep_missing_repeat"),
      name: "Synthetic Sleep Missing Repeat",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_sleep_missing_repeat",
      },
      mechanics: {
        ...sleep.mechanics,
        phases: [sleepPhaseWithoutRepeat],
      },
    });
    const sleepSource = spellAdmissionSource(sleepWithoutRepeat);
    const sleepResult = stagedSaveConditionProfile.admitMechanics({
      mechanics: sleepSource.mechanics,
      spellDefinitionRuleFacts: sleepSource.spellDefinitionRuleFacts,
    });
    expect(sleepResult.tag).toBe("unsupported");
    if (sleepResult.tag !== "unsupported") return;
    expect(sleepResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "missingRepeat",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      }),
    );

    const laughter = spellRecord("hideous_laughter");
    if (
      laughter.mechanics.family !== "activation" ||
      laughter.mechanics.phases[0]?.kind !== "save_gate" ||
      laughter.mechanics.phases[0].repeatSaves === undefined
    ) {
      throw new Error("Expected Hideous Laughter repeat-save mechanics.");
    }
    const laughterWithoutDamageRepeat = decodeSpellRecordForTest({
      ...laughter,
      id: unitId("synthetic_b3_laughter_missing_damage_repeat"),
      name: "Synthetic Laughter Missing Damage Repeat",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_laughter_missing_damage_repeat",
      },
      mechanics: {
        ...laughter.mechanics,
        phases: [
          {
            ...laughter.mechanics.phases[0],
            repeatSaves: laughter.mechanics.phases[0].repeatSaves.filter(
              (repeatSave) => repeatSave.cadence !== "on_target_takes_damage",
            ),
          },
        ],
      },
    });
    const laughterSource = spellAdmissionSource(laughterWithoutDamageRepeat);
    const laughterResult = saveGatedConditionWithRepeatProfile.admitMechanics({
      mechanics: laughterSource.mechanics,
      spellDefinitionRuleFacts: laughterSource.spellDefinitionRuleFacts,
    });
    expect(laughterResult.tag).toBe("unsupported");
    if (laughterResult.tag !== "unsupported") return;
    expect(laughterResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "missingRepeat",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      }),
    );

    const slow = spellRecord("slow");
    if (
      slow.mechanics.family !== "activation" ||
      slow.mechanics.phases[0]?.kind !== "save_gate"
    ) {
      throw new Error("Expected Slow repeat-save mechanics.");
    }
    const { repeatSaves: _slowRepeatSaves, ...slowPhaseWithoutRepeat } =
      slow.mechanics.phases[0];
    const slowWithoutRepeat = decodeSpellRecordForTest({
      ...slow,
      id: unitId("synthetic_b3_slow_missing_repeat"),
      name: "Synthetic Slow Missing Repeat",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_slow_missing_repeat",
      },
      mechanics: {
        ...slow.mechanics,
        phases: [slowPhaseWithoutRepeat],
      },
    });
    const slowSource = spellAdmissionSource(slowWithoutRepeat);
    const slowResult = saveGatedTurnConstraintBundleProfile.admitMechanics({
      mechanics: slowSource.mechanics,
      spellDefinitionRuleFacts: slowSource.spellDefinitionRuleFacts,
    });
    expect(slowResult.tag).toBe("unsupported");
    if (slowResult.tag !== "unsupported") return;
    expect(slowResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "repeatSave",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      }),
    );
  });

  test("roots a missing Slow failed-save effect on its existing save-gate phase", () => {
    const slow = spellRecord("slow");
    if (slow.mechanics.family !== "activation") {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const phase = slow.mechanics.phases[0];
    if (phase?.kind !== "save_gate" || phase.onFail.kind !== "composite") {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const failedSave = phase.onFail;
    const withoutSomaticFailure = decodeSpellRecordForTest({
      ...slow,
      id: unitId("synthetic_b3_slow_missing_somatic_failure"),
      name: "Synthetic Slow Missing Somatic Failure",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_slow_missing_somatic_failure",
      },
      mechanics: {
        ...slow.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...failedSave,
              effects: failedSave.effects.filter(
                (effect) => effect.kind !== "somatic_spell_failure_chance",
              ),
            },
          },
        ],
      },
    });
    const source = spellAdmissionSource(withoutSomaticFailure);
    const result = saveGatedTurnConstraintBundleProfile.admitMechanics({
      mechanics: source.mechanics,
      spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
    });
    expect(result.tag).toBe("unsupported");
    if (result.tag !== "unsupported") return;
    expect(result.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "missingFailedSaveEffect",
        mechanicsPath: spellActivationPhasePath(PositiveInteger(1)),
      }),
    );
  });

  test("reports malformed Hideous Laughter branches at their authored ordinals", () => {
    const base = spellRecord("hideous_laughter");
    if (base.mechanics.family !== "activation") {
      throw new Error(
        "Expected Hideous Laughter composite save-gate mechanics.",
      );
    }
    const phase = base.mechanics.phases[0];
    if (phase?.kind !== "save_gate") {
      throw new Error(
        "Expected Hideous Laughter composite save-gate mechanics.",
      );
    }
    const failedSave = phase.onFail;
    const repeatSaves = phase.repeatSaves;
    if (failedSave.kind !== "composite" || repeatSaves === undefined) {
      throw new Error(
        "Expected Hideous Laughter composite save-gate mechanics.",
      );
    }
    const extraEffectOrdinal = failedSave.effects.length + 1;
    const withExtraEffect = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_laughter_extra_effect"),
      name: "Synthetic Laughter Extra Effect",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_laughter_extra_effect",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...failedSave,
              effects: [
                ...failedSave.effects,
                { kind: "apply_condition", condition: "charmed" },
              ],
            },
          },
        ],
      },
    });
    const extraEffectSource = spellAdmissionSource(withExtraEffect);
    const extraEffectResult =
      saveGatedConditionWithRepeatProfile.admitMechanics({
        mechanics: extraEffectSource.mechanics,
        spellDefinitionRuleFacts: extraEffectSource.spellDefinitionRuleFacts,
      });
    expect(extraEffectResult.tag).toBe("unsupported");
    if (extraEffectResult.tag !== "unsupported") return;
    expect(extraEffectResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "extraFailureEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(extraEffectOrdinal),
        ),
      }),
    );

    const damageRepeatIndex = repeatSaves.findIndex(
      (repeatSave) => repeatSave.cadence === "on_target_takes_damage",
    );
    if (damageRepeatIndex < 0) {
      throw new Error("Expected Hideous Laughter damage repeat save.");
    }
    const withMalformedRepeat = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_laughter_malformed_repeat"),
      name: "Synthetic Laughter Malformed Repeat",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_laughter_malformed_repeat",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            repeatSaves: repeatSaves.map((repeatSave, index) =>
              index === damageRepeatIndex
                ? {
                    ...repeatSave,
                    onFailAgain: {
                      kind: "apply_condition",
                      condition: "charmed",
                    },
                  }
                : repeatSave,
            ),
          },
        ],
      },
    });
    const malformedRepeatSource = spellAdmissionSource(withMalformedRepeat);
    const malformedRepeatResult =
      saveGatedConditionWithRepeatProfile.admitMechanics({
        mechanics: malformedRepeatSource.mechanics,
        spellDefinitionRuleFacts:
          malformedRepeatSource.spellDefinitionRuleFacts,
      });
    expect(malformedRepeatResult.tag).toBe("unsupported");
    if (malformedRepeatResult.tag !== "unsupported") return;
    expect(malformedRepeatResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "extraRepeat",
        mechanicsPath: spellActivationRepeatPath(
          PositiveInteger(1),
          PositiveInteger(damageRepeatIndex + 1),
        ),
      }),
    );
  });

  test("matches reordered composite effects and reports duplicate witnesses at actual ordinals", () => {
    const base = spellRecord("slow");
    if (base.mechanics.family !== "activation") {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const phaseCandidate = base.mechanics.phases[0];
    if (
      phaseCandidate?.kind !== "save_gate" ||
      phaseCandidate.onFail.kind !== "composite"
    ) {
      throw new Error("Expected Slow composite save-gate mechanics.");
    }
    const phase = phaseCandidate;
    const failedEffects =
      phase.onFail.kind === "composite" ? phase.onFail.effects : undefined;
    if (failedEffects === undefined) {
      throw new Error("Expected Slow composite failed-save effects.");
    }
    const reordered = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_slow_reordered"),
      name: "Synthetic Reordered Slow",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_slow_reordered",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: [...failedEffects].reverse(),
            },
          },
        ],
      },
    });
    expect(
      saveGatedTurnConstraintBundleProfile.admitMechanics({
        mechanics: reordered.mechanics,
        spellDefinitionRuleFacts:
          spellAdmissionSource(reordered).spellDefinitionRuleFacts,
      }).tag,
    ).toBe("supported");

    const duplicate = decodeSpellRecordForTest({
      ...base,
      id: unitId("synthetic_b3_slow_duplicate"),
      name: "Synthetic Duplicate Slow",
      provenance: {
        kind: "synthetic-test",
        section: "synthetic_b3_slow_duplicate",
      },
      mechanics: {
        ...base.mechanics,
        phases: [
          {
            ...phase,
            onFail: {
              ...phase.onFail,
              effects: [failedEffects[0], ...failedEffects],
            },
          },
        ],
      },
    });
    const duplicateResult = saveGatedTurnConstraintBundleProfile.admitMechanics(
      {
        mechanics: duplicate.mechanics,
        spellDefinitionRuleFacts:
          spellAdmissionSource(duplicate).spellDefinitionRuleFacts,
      },
    );
    expect(duplicateResult.tag).toBe("unsupported");
    if (duplicateResult.tag !== "unsupported") return;
    expect(duplicateResult.issues).toContainEqual(
      expect.objectContaining({
        failedFact: "extraFailedSaveEffect",
        mechanicsPath: spellActivationEffectPath(
          PositiveInteger(1),
          PositiveInteger(2),
        ),
      }),
    );
  });
});
