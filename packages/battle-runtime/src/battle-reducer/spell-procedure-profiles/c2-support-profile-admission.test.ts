import { describe, expect, test } from "vitest";
import { Result, Schema } from "effect";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import { spellProcedureExecution } from "../../character-execution-admission.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";
import {
  admitBattleSpellMechanicsFrom,
  spellTouchRangeFeet,
} from "./spell-mechanics-admission.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import { heldLightProfile } from "./held-light.ts";
import { linkedDefenseResistanceDamageShareProfile } from "./linked-defense-damage-share-profile.ts";
import { movableLightManifestationProfile } from "./movable-illumination-manifestation.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
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
  spellOngoingInitialPhasePath,
  spellOngoingOperationEffectPath,
  spellOngoingOperationPath,
} from "@dnd/surface/surface/spell-mechanics-path";
import type {
  ActivationPhase,
  Attachment,
  AuthoredConditionalMechanic,
  CastTimeEffectModeChoice,
  DiceAmount,
  EffectAtom,
  OngoingOperation,
  OngoingPredicate,
  RepeatSaveSpec,
  SpellMechanics,
  TargetSelection,
} from "@dnd/surface/surface/types";
import type { SpellAdmissionContext } from "./profile.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";

type OngoingEffectMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;
type OngoingEffectMechanicsOperation =
  OngoingEffectMechanics["operations"][number];

function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

const commonHeaderPaths = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

function sourceWith(
  spellId: string,
  update: (mechanics: SpellMechanics) => SpellMechanics,
): SpellMechanicsAdmissionSource {
  const source = spellAdmissionSource(spellRecord(spellId));
  const mechanics = update(source.mechanics);
  return {
    mechanics,
    spellDefinitionRuleFacts: projectSpellDefinitionRuleFacts(mechanics),
  };
}

function contextFor(
  castingSource: SpellAdmissionContext["castingSource"],
): SpellAdmissionContext {
  const session = spellBattle({
    spellSlots: [{ spellLevel: 5, count: 1 }],
  });
  const actor = session.state.combatants.get(spellCasterId);
  if (actor === undefined) {
    throw new Error("Expected spell-admission actor in test battle.");
  }
  const context = spellAdmissionContextFor(actor, session.state);
  if (context === null) {
    throw new Error("Expected spell-admission context for test actor.");
  }
  return { ...context, castingSource };
}

type C2StaticAdmissionResult =
  | ReturnType<typeof damageReductionProfile.admitMechanics>
  | ReturnType<typeof heldLightProfile.admitMechanics>
  | ReturnType<typeof rollModifierProfile.admitMechanics>
  | ReturnType<typeof scalarBuffProfile.admitMechanics>
  | ReturnType<typeof seeInvisibleObserverSightProfile.admitMechanics>;
type C2StaticAdmissionIssue = Extract<
  C2StaticAdmissionResult,
  { readonly tag: "unsupported" }
>["issues"][number];
type C2ExpectedAdmissionIssue = SpellProcedureAdmissionIssue<
  C2StaticAdmissionIssue["procedure"],
  C2StaticAdmissionIssue["failedFact"],
  C2StaticAdmissionIssue["mechanicsPath"]
>;
type NumericRollEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_numeric" }
>;
type TemporaryHitPointEffect = Extract<
  EffectAtom,
  { readonly kind: "grant_temp_hp" }
>;
type AreaAttachment = Extract<Attachment, { readonly kind: "area" }>;
type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type SaveGateTargetAutoSuccess = Exclude<
  SaveGatePhase["autoSuccessIfTarget"],
  undefined
>;

const authoredConditionalMechanic: AuthoredConditionalMechanic = {
  kind: "phantasm_damage",
  source: "dangerous_creature_or_hazard",
  choice: "caster_may_deal",
  timing: "each_caster_turn",
  eligibility: {
    kind: "target_in_phantasm_area_or_within_feet_of_phantasm",
    feet: 5,
  },
  damageType: "psychic",
  amount: { kind: "fixed", expr: { dice: 1, dieSize: 6 } },
  perceivedAs: "illusion_appropriate",
};
const ongoingPredicate: OngoingPredicate = {
  kind: "spell_created_held_object_active",
};
const ongoingTargetLimit: NonNullable<OngoingOperation["targetLimit"]> = {
  count: 1,
  distinct: true,
  targetTypes: ["creature"],
};
const ongoingUsageLimit: NonNullable<OngoingOperation["usageLimit"]> = {
  kind: "once_per_turn",
};
const directPhaseMode: CastTimeEffectModeChoice = {
  label: "mode",
  options: [
    {
      id: "mode_a",
      displayName: "Mode A",
      effects: [{ kind: "none" }],
    },
  ],
};
const repeatSave: RepeatSaveSpec = {
  cadence: "end_of_target_turn",
  onSuccess: "ends_on_target",
};
const saveGateTargetAutoSuccess: SaveGateTargetAutoSuccess = {
  kind: "challenge_rating_not_equal",
  challengeRating: 0,
};

const initialDirectPhase: ActivationPhase = {
  kind: "direct",
  attachment: { kind: "self" },
  effects: [{ kind: "none" }],
};

const ongoingOperationUpdates = [
  [
    "predicate",
    (
      operation: OngoingEffectMechanicsOperation,
    ): OngoingEffectMechanicsOperation => ({
      ...operation,
      predicate: ongoingPredicate,
    }),
  ],
  [
    "targetLimit",
    (
      operation: OngoingEffectMechanicsOperation,
    ): OngoingEffectMechanicsOperation => ({
      ...operation,
      targetLimit: ongoingTargetLimit,
    }),
  ],
  [
    "usageLimit",
    (
      operation: OngoingEffectMechanicsOperation,
    ): OngoingEffectMechanicsOperation => ({
      ...operation,
      usageLimit: ongoingUsageLimit,
    }),
  ],
] as const;

const saveGateOptionalUpdates = [
  [
    "repeatSaves",
    (phase: SaveGatePhase): SaveGatePhase => ({
      ...phase,
      repeatSaves: [repeatSave],
    }),
    spellActivationRepeatPath(PositiveInteger(1), PositiveInteger(1)),
  ],
  [
    "autoSuccessIfCasterSlotGte",
    (phase: SaveGatePhase): SaveGatePhase => ({
      ...phase,
      autoSuccessIfCasterSlotGte: "triggering_spell_level",
    }),
    spellActivationPhasePath(PositiveInteger(1)),
  ],
  [
    "autoSuccessIfTarget",
    (phase: SaveGatePhase): SaveGatePhase => {
      const updated = structuredClone(phase);
      Reflect.set(updated, "autoSuccessIfTarget", saveGateTargetAutoSuccess);
      return updated;
    },
    spellActivationPhasePath(PositiveInteger(1)),
  ],
  [
    "saveAppliesIf",
    (phase: SaveGatePhase): SaveGatePhase => ({
      ...phase,
      saveAppliesIf: "unwilling_target",
    }),
    spellActivationPhasePath(PositiveInteger(1)),
  ],
  [
    "usageLimit",
    (phase: SaveGatePhase): SaveGatePhase => ({
      ...phase,
      usageLimit: ongoingUsageLimit,
    }),
    spellActivationPhasePath(PositiveInteger(1)),
  ],
] as const;

const directPhaseModeUpdate = (
  phase: Extract<ActivationPhase, { readonly kind: "direct" }>,
): Extract<ActivationPhase, { readonly kind: "direct" }> => ({
  ...phase,
  mode: directPhaseMode,
});

const scalarBuffTemporaryHitPointUpdates = [
  [
    "linear base spellcastingMod",
    (effect: TemporaryHitPointEffect): TemporaryHitPointEffect => {
      if (effect.amount.kind !== "linear_per_level") {
        throw new Error("Expected False Life linear temporary hit points.");
      }
      return {
        ...effect,
        amount: {
          ...effect.amount,
          base: { ...effect.amount.base, spellcastingMod: true },
        },
      };
    },
  ],
  [
    "linear base abilityModifier",
    (effect: TemporaryHitPointEffect): TemporaryHitPointEffect => {
      if (effect.amount.kind !== "linear_per_level") {
        throw new Error("Expected False Life linear temporary hit points.");
      }
      return {
        ...effect,
        amount: {
          ...effect.amount,
          base: { ...effect.amount.base, abilityModifier: "str" },
        },
      };
    },
  ],
  [
    "linear perLevel dieSize",
    (effect: TemporaryHitPointEffect): TemporaryHitPointEffect => {
      if (effect.amount.kind !== "linear_per_level") {
        throw new Error("Expected False Life linear temporary hit points.");
      }
      return {
        ...effect,
        amount: {
          ...effect.amount,
          perLevel: { ...effect.amount.perLevel, dieSize: 4 },
        },
      };
    },
  ],
  [
    "fixed spellcastingMod",
    (effect: TemporaryHitPointEffect): TemporaryHitPointEffect => ({
      ...effect,
      amount: {
        kind: "fixed",
        expr: { dice: 1, dieSize: 4, spellcastingMod: true },
      },
    }),
  ],
  [
    "fixed abilityModifier",
    (effect: TemporaryHitPointEffect): TemporaryHitPointEffect => ({
      ...effect,
      amount: {
        kind: "fixed",
        expr: { dice: 1, dieSize: 4, abilityModifier: "str" },
      },
    }),
  ],
] as const;

const heldLightExplodingMaxDieAmount = {
  kind: "threshold_tiers_exploding_max_die",
  axis: "character",
  baseDice: 1,
  dieSize: 8,
  tiers: [{ atLevel: 5, dice: 2 }],
  maxAdditionalDice: "spellcasting_ability_modifier",
} as const satisfies DiceAmount;

function updateHeldLightHurlOperation(
  mechanics: SpellMechanics,
  update: (
    operation: OngoingEffectMechanicsOperation,
  ) => OngoingEffectMechanicsOperation,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") {
    throw new Error("Expected Produce Flame ongoing-effect mechanics.");
  }
  const hurlIndex = mechanics.operations.findIndex(
    (operation) =>
      operation.trigger.kind === "on_caster_spends_action" &&
      operation.effect.kind === "attack_roll",
  );
  if (hurlIndex < 0) {
    throw new Error("Expected Produce Flame hurl operation.");
  }
  const updated = structuredClone(mechanics);
  Reflect.set(
    updated,
    "operations",
    updated.operations.map((operation, index) =>
      index === hurlIndex ? update(operation) : operation,
    ),
  );
  return updated;
}

const heldLightHurlOptionalUpdates = [
  [
    "laterTurnsOnly",
    (
      operation: OngoingEffectMechanicsOperation,
    ): OngoingEffectMechanicsOperation => {
      if (operation.trigger.kind !== "on_caster_spends_action") {
        throw new Error("Expected Produce Flame hurl trigger.");
      }
      return {
        ...operation,
        trigger: { ...operation.trigger, laterTurnsOnly: true },
      };
    },
    spellOngoingOperationPath(PositiveInteger(2)),
  ],
  [
    "attachment",
    (
      operation: OngoingEffectMechanicsOperation,
    ): OngoingEffectMechanicsOperation => {
      if (operation.effect.kind !== "attack_roll") {
        throw new Error("Expected Produce Flame hurl attack effect.");
      }
      return {
        ...operation,
        effect: {
          ...operation.effect,
          attachment: {
            kind: "target",
            selection: { mode: "one", targetKinds: ["creature"] },
          },
        },
      };
    },
    spellOngoingOperationEffectPath(PositiveInteger(2)),
  ],
  [
    "timing",
    (
      operation: OngoingEffectMechanicsOperation,
    ): OngoingEffectMechanicsOperation => {
      if (operation.effect.kind !== "attack_roll") {
        throw new Error("Expected Produce Flame hurl attack effect.");
      }
      const hitDamage = operation.effect.onHit[0];
      if (hitDamage?.kind !== "damage") {
        throw new Error("Expected Produce Flame hurl damage effect.");
      }
      return {
        ...operation,
        effect: {
          ...operation.effect,
          onHit: [{ ...hitDamage, timing: "end_of_next_turn" }],
        },
      };
    },
    spellOngoingOperationEffectPath(PositiveInteger(2)),
  ],
] as const;

function expectedIssue(
  procedure: C2StaticAdmissionIssue["procedure"],
  failedFact: C2StaticAdmissionIssue["failedFact"],
  mechanicsPath: C2StaticAdmissionIssue["mechanicsPath"],
): C2ExpectedAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Unsupported ${procedure} mechanics fact: ${failedFact}.`,
  };
}

const damageReductionMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  level: 1,
  range: { kind: "unlimited" },
});
const rollModifierMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  range: { kind: "unlimited" },
  duration: { kind: "permanent" },
});
const scalarBuffMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics =>
  "castingTime" in mechanics
    ? {
        ...mechanics,
        range: { kind: "unlimited" },
        castingTime: { kind: "minutes", amount: 1, ritual: false },
      }
    : mechanics;
const seeInvisibleMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  level: 1,
  range: { kind: "unlimited" },
});
const heldLightMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  range: { kind: "unlimited" },
  duration: { kind: "permanent" },
});

function appendOngoingNoop(mechanics: SpellMechanics): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") return mechanics;
  const firstOperation = mechanics.operations[0];
  if (firstOperation === undefined) {
    throw new Error("Expected an ongoing operation representative.");
  }
  return {
    ...mechanics,
    operations: [
      ...mechanics.operations,
      { ...firstOperation, effect: { kind: "none" } },
    ],
  };
}

function appendActivationPhase(mechanics: SpellMechanics): SpellMechanics {
  if (mechanics.family !== "activation") return mechanics;
  const firstPhase = mechanics.phases[0];
  if (firstPhase === undefined) {
    throw new Error("Expected an activation phase representative.");
  }
  return { ...mechanics, phases: [...mechanics.phases, firstPhase] };
}

function removeOngoingCharacteristicEffect(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") return mechanics;
  const malformed = { ...mechanics };
  // This mutation intentionally violates the Surface non-empty tuple to
  // exercise the runtime admission boundary.
  Object.defineProperty(malformed, "operations", {
    configurable: true,
    enumerable: true,
    value: [],
    writable: true,
  });
  return malformed;
}

function replaceOngoingCharacteristicEffect(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") return mechanics;
  const characteristicIndex = mechanics.operations.findIndex(
    ({ effect }) =>
      effect.kind === "modify_roll_numeric" ||
      effect.kind === "modify_roll_advantage",
  );
  if (characteristicIndex < 0) {
    throw new Error("Expected an ongoing characteristic operation.");
  }
  const operations = mechanics.operations.map(
    (operation, index): OngoingEffectMechanicsOperation =>
      index === characteristicIndex
        ? { ...operation, effect: { kind: "none" } }
        : operation,
  );
  const [firstOperation, ...remainingOperations] = operations;
  if (firstOperation === undefined) {
    throw new Error("Expected an ongoing characteristic operation.");
  }
  return {
    ...mechanics,
    operations: [firstOperation, ...remainingOperations],
  };
}

function removeRollModifierCharacteristicOperation(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") return mechanics;
  const malformed = { ...mechanics };
  Object.defineProperty(malformed, "operations", {
    configurable: true,
    enumerable: true,
    value: mechanics.operations.filter(
      ({ effect }) =>
        effect.kind !== "modify_roll_numeric" &&
        effect.kind !== "modify_roll_advantage",
    ),
    writable: true,
  });
  return malformed;
}

function removeActivationCharacteristicEffect(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "activation") return mechanics;
  const malformed = { ...mechanics };
  const phases = mechanics.phases.map((phase) => {
    const malformedPhase = { ...phase };
    if (phase.kind === "direct") {
      Object.defineProperty(malformedPhase, "effects", {
        configurable: true,
        enumerable: true,
        value: [],
        writable: true,
      });
    } else {
      Object.defineProperty(malformedPhase, "onFail", {
        configurable: true,
        enumerable: true,
        value: { kind: "none" },
        writable: true,
      });
    }
    return malformedPhase;
  });
  // These mutations intentionally violate the Surface phase/effect shape;
  // the parser receives the malformed graph at this test boundary.
  Object.defineProperty(malformed, "phases", {
    configurable: true,
    enumerable: true,
    value: phases,
    writable: true,
  });
  return malformed;
}

describe("C2 support profile static admission", () => {
  test("held-light ownership excludes canonical and renamed created-held-object mechanics", () => {
    const source = spellAdmissionSource(spellRecord("flame_blade"));
    const renamed = {
      ...source,
      id: unitId("synthetic_c2_created_held_object"),
      name: "Synthetic Created Held Object",
    };

    expect(heldLightProfile.admitMechanics(mechanicsSource(source))).toEqual({
      tag: "notRepresented",
    });
    expect(heldLightProfile.admitMechanics(mechanicsSource(renamed))).toEqual({
      tag: "notRepresented",
    });
  });

  test("held-light keeps each exact ownership discriminant defect represented", () => {
    const durationDefect = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) => {
        if (mechanics.duration.kind !== "timed")
          throw new Error("Expected Produce Flame timed duration.");
        return {
          ...mechanics,
          duration: {
            ...mechanics.duration,
            value: { ...mechanics.duration.value, amount: 9 },
          },
        };
      }),
    );
    expect(durationDefect).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue("heldLight", "duration", spellDurationValuePath()),
      ],
    });

    const hurlDefect = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) =>
        updateHeldLightHurlOperation(mechanics, (operation) => {
          if (operation.effect.kind !== "attack_roll")
            throw new Error("Expected Produce Flame hurl attack.");
          return {
            ...operation,
            effect: {
              ...operation.effect,
              attackKind: "melee_spell_attack",
            },
          };
        }),
      ),
    );
    expect(hurlDefect).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "heldLight",
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "heldLight",
          "operation",
          spellOngoingOperationPath(PositiveInteger(1)),
        ),
        expectedIssue(
          "heldLight",
          "hurl",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test.each([
    ["damage reduction", ["barkskin"], damageReductionProfile],
    ["roll modifier", ["levitate", "enlarge_reduce"], rollModifierProfile],
    ["scalar buff", ["bless"], scalarBuffProfile],
    ["see invisible", ["shield_of_faith"], seeInvisibleObserverSightProfile],
    ["held light", ["fire_bolt"], heldLightProfile],
  ] as const)(
    "does not represent canonical or renamed unrelated %s mechanics",
    (_label, spellIds, profile) => {
      for (const spellId of spellIds) {
        const source = spellAdmissionSource(spellRecord(spellId));
        const renamed = {
          ...source,
          id: unitId(`synthetic_c2_${spellId}_ownership_collision`),
          name: "Synthetic Unrelated Spell",
        };
        expect(profile.admitMechanics(mechanicsSource(source))).toEqual({
          tag: "notRepresented",
        });
        expect(profile.admitMechanics(mechanicsSource(renamed))).toEqual({
          tag: "notRepresented",
        });
      }
    },
  );

  test("roll-modifier ownership excludes canonical and renamed condition-immunity turn-start temporary-hit-point mechanics", () => {
    const source = spellAdmissionSource(spellRecord("heroism"));
    const renamed = {
      ...source,
      id: unitId("synthetic_c2_condition_immunity_turn_start_temp_hp"),
      name: "Synthetic Courage Ward",
    };

    expect(rollModifierProfile.admitMechanics(mechanicsSource(source))).toEqual(
      { tag: "notRepresented" },
    );
    expect(
      rollModifierProfile.admitMechanics(mechanicsSource(renamed)),
    ).toEqual({ tag: "notRepresented" });
  });

  test.each([
    "bless",
    "guidance",
    "bane",
    "enhance_ability",
    "pass_without_trace",
  ] as const)(
    "keeps renamed %s roll-modifier mechanics owned by Surface shape",
    (spellId) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const renamed = {
        ...source,
        id: unitId(`synthetic_c2_${spellId}_roll_modifier_owner`),
        name: "Synthetic Roll Modifier",
      };
      expect(
        rollModifierProfile.admitMechanics(mechanicsSource(renamed)),
      ).toMatchObject({ tag: "supported" });
    },
  );

  test("rejects an empty roll-modifier skill choice at the execution codec boundary", () => {
    const source = spellAdmissionSource(spellRecord("guidance"));
    const result = rollModifierProfile.admitMechanics(mechanicsSource(source));
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      contextFor(source.castingSource),
    );
    expect(invocation).toBeDefined();
    if (
      invocation === undefined ||
      invocation.effect.kind !== "d20RollModifier"
    ) {
      return;
    }
    const decodeInvocation = Schema.decodeUnknownResult(
      rollModifierProfile.executionSchema,
    );
    const execution = spellProcedureExecution(invocation);
    expect(Result.isSuccess(decodeInvocation(execution))).toBe(true);
    const malformedInvocation = {
      ...execution,
      effect: {
        ...execution.effect,
        skillFilter: { kind: "choice", options: [] },
      },
    };
    expect(Result.isFailure(decodeInvocation(malformedInvocation))).toBe(true);
  });

  test.each([
    [
      "damage reduction operation deletion",
      "resistance",
      damageReductionProfile,
      removeOngoingCharacteristicEffect,
      "damageReduction",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "roll modifier ongoing effect deletion",
      "bless",
      rollModifierProfile,
      removeOngoingCharacteristicEffect,
      "rollModifier",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "roll modifier Enhance Ability effect deletion",
      "enhance_ability",
      rollModifierProfile,
      removeOngoingCharacteristicEffect,
      "rollModifier",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "roll modifier activation effect deletion",
      "bane",
      rollModifierProfile,
      removeActivationCharacteristicEffect,
      "rollModifier",
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ],
    [
      "scalar buff activation effect deletion",
      "longstrider",
      scalarBuffProfile,
      removeActivationCharacteristicEffect,
      "scalarBuff",
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ],
    [
      "scalar buff ongoing effect deletion",
      "barkskin",
      scalarBuffProfile,
      removeOngoingCharacteristicEffect,
      "scalarBuff",
      spellOngoingOperationEffectPath(PositiveInteger(1)),
    ],
    [
      "see invisible effect deletion",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      removeActivationCharacteristicEffect,
      "seeInvisibleObserverSight",
      spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
    ],
  ] as const)(
    "keeps a deleted characteristic effect represented at its exact path",
    (_label, spellId, profile, update, procedure, mechanicsPath) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result.tag, _label).toBe("unsupported");
      if (result.tag !== "unsupported") return;
      expect(result.issues).toEqual(
        expect.arrayContaining([
          expectedIssue(
            procedure,
            procedure === "damageReduction" ? "damage" : "effect",
            mechanicsPath,
          ),
        ]),
      );
    },
  );

  test("direct roll-modifier inspection keeps deleted Guidance unsupported at its exact operation path", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("guidance", removeOngoingCharacteristicEffect),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(1)),
        ),
        expectedIssue(
          "rollModifier",
          "operation",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("keeps Pass without Trace characteristic-only deletion at the inferred vacant ordinal", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith(
        "pass_without_trace",
        removeRollModifierCharacteristicOperation,
      ),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "operation",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
      ],
    });
    expect(
      rollModifierProfile.admitMechanics(
        sourceWith("pass_without_trace", removeOngoingCharacteristicEffect),
      ),
    ).toEqual({ tag: "notRepresented" });
  });

  test.each([
    "bless",
    "guidance",
    "enhance_ability",
    "pass_without_trace",
  ] as const)(
    "keeps replaced %s roll-modifier mechanics represented at the characteristic effect path",
    (spellId) => {
      const source = sourceWith(spellId, replaceOngoingCharacteristicEffect);
      const renamedSource = {
        ...spellAdmissionSource(spellRecord(spellId)),
        id: unitId(`synthetic_c2_${spellId}_replaced_roll_modifier`),
        name: "Synthetic Replaced Roll Modifier",
        mechanics: source.mechanics,
        spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
      };
      for (const candidate of [source, mechanicsSource(renamedSource)]) {
        const result = rollModifierProfile.admitMechanics(candidate);
        expect(result.tag).toBe("unsupported");
        if (result.tag !== "unsupported") continue;
        expect(result.issues).toEqual(
          expect.arrayContaining([
            expectedIssue(
              "rollModifier",
              "effect",
              spellOngoingOperationEffectPath(PositiveInteger(1)),
            ),
          ]),
        );
      }
    },
  );

  test("keeps reordered Pass without Trace replacement at the actual characteristic ordinal", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("pass_without_trace", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [rollModifier, movementTrace, ...rest] = mechanics.operations;
        if (rollModifier === undefined || movementTrace === undefined) {
          throw new Error("Expected paired roll-modifier operations.");
        }
        return replaceOngoingCharacteristicEffect({
          ...mechanics,
          operations: [movementTrace, rollModifier, ...rest],
        });
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "operationCount",
          spellOngoingOperationPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "rollModifier",
          "operation",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
      ],
    });
  });

  test("closes every structural layer of the effect-missing roll-modifier envelope", () => {
    const updates: readonly [
      label: string,
      update: (mechanics: OngoingEffectMechanics) => void,
    ][] = [
      ["root", (mechanics) => Reflect.set(mechanics, "syntheticRoot", true)],
      [
        "casting time",
        (mechanics) => Reflect.set(mechanics.castingTime, "ritual", true),
      ],
      [
        "components",
        (mechanics) => Reflect.set(mechanics.components, "materialCostGp", 1),
      ],
      ["range", (mechanics) => Reflect.set(mechanics.range, "feet", 5)],
      [
        "duration",
        (mechanics) => Reflect.set(mechanics.duration, "earlyEnd", []),
      ],
      [
        "duration value",
        (mechanics) => {
          if (mechanics.duration.kind !== "concentration") return;
          Reflect.set(mechanics.duration.upTo, "syntheticUnit", true);
        },
      ],
      [
        "attachment",
        (mechanics) => Reflect.set(mechanics.attachment, "synthetic", true),
      ],
      [
        "selection",
        (mechanics) => {
          if (
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            return;
          }
          Reflect.set(
            mechanics.attachment.value.selection,
            "repeatsAllowed",
            true,
          );
        },
      ],
      [
        "operation",
        (mechanics) => Reflect.set(mechanics.operations[0], "predicate", {}),
      ],
      [
        "trigger",
        (mechanics) =>
          Reflect.set(
            mechanics.operations[0]?.trigger ?? {},
            "synthetic",
            true,
          ),
      ],
      [
        "effect",
        (mechanics) =>
          Reflect.set(mechanics.operations[0]?.effect ?? {}, "synthetic", true),
      ],
      [
        "operation cardinality",
        (mechanics) => {
          const operation = mechanics.operations[0];
          if (operation !== undefined) {
            Reflect.set(mechanics, "operations", [
              ...mechanics.operations,
              operation,
            ]);
          }
        },
      ],
    ];

    for (const [label, update] of updates) {
      const source = sourceWith("guidance", (mechanics) => {
        const replaced = replaceOngoingCharacteristicEffect(mechanics);
        if (replaced.family !== "ongoing_effect") return replaced;
        const updated = structuredClone(replaced);
        update(updated);
        return updated;
      });
      expect(rollModifierProfile.admitMechanics(source), label).toEqual({
        tag: "notRepresented",
      });
    }
  });

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier bless", "bless", rollModifierProfile],
    ["roll modifier guidance", "guidance", rollModifierProfile],
    ["roll modifier bane", "bane", rollModifierProfile],
    ["roll modifier enhance ability", "enhance_ability", rollModifierProfile],
    ["scalar buff longstrider", "longstrider", scalarBuffProfile],
    ["scalar buff fly", "fly", scalarBuffProfile],
    ["scalar buff false life", "false_life", scalarBuffProfile],
    ["scalar buff shield of faith", "shield_of_faith", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)("supports %s", (_label, spellId, profile) => {
    const source = spellAdmissionSource(spellRecord(spellId));
    const result = profile.admitMechanics(mechanicsSource(source));
    if (result.tag !== "supported") {
      throw new Error(
        `Expected ${spellId} support, got ${result.tag}: ${JSON.stringify(
          result.tag === "unsupported"
            ? result.issues.map(({ failedFact, mechanicsPath }) => ({
                failedFact,
                mechanicsPath,
              }))
            : null,
        )}`,
      );
    }
    expect(result.admitted.evidence.unowned).toEqual([]);
  });

  test("threads the admitted damage-reduction amount, targeting, and range into execution", () => {
    const source = spellAdmissionSource(spellRecord("resistance"));
    const result = damageReductionProfile.admitMechanics(
      mechanicsSource(source),
    );
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;

    expect(result.admitted.facts).toMatchObject({
      amount: { dice: 1, dieSize: 4 },
      targeting: {
        kind: "targetList",
        minTargets: 1,
        maxTargets: 1,
        requiredTargetDisposition: "willing",
      },
      rangeFeet: spellTouchRangeFeet(),
    });
    const [invocation] = result.admitted.admit(
      battleSpellExecutionSourceFromAdmission(source),
      contextFor(source.castingSource),
    );
    expect(invocation).toBeDefined();
    if (invocation === undefined) return;
    expect(invocation.amount).toBe(result.admitted.facts.amount);
    expect(invocation.targeting).toBe(result.admitted.facts.targeting);
    expect(invocation.rangeFeet).toBe(result.admitted.facts.rangeFeet);
  });

  test.each([
    ["bless", { kind: "none" }],
    ["guidance", { kind: "choice" }],
    ["pass_without_trace", { kind: "fixed", skill: "stealth" }],
  ] as const)(
    "carries the %s skill filter as one discriminated invocation fact",
    (spellId, expectedSkillFilter) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = rollModifierProfile.admitMechanics(
        mechanicsSource(source),
      );
      expect(result).toMatchObject({ tag: "supported" });
      if (result.tag !== "supported") return;
      const [invocation] = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        contextFor(source.castingSource),
      );
      expect(invocation).toBeDefined();
      if (
        invocation === undefined ||
        invocation.effect.kind !== "d20RollModifier"
      ) {
        return;
      }
      expect(invocation.effect.skillFilter).toMatchObject(expectedSkillFilter);
      expect(invocation).not.toHaveProperty("skillChoices");
      if (invocation.effect.skillFilter.kind === "choice") {
        expect(invocation.effect.skillFilter.options.length).toBeGreaterThan(0);
      }
    },
  );

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    ],
    [
      "roll modifier ongoing",
      "bless",
      rollModifierProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    ],
    [
      "roll modifier activation",
      "bane",
      rollModifierProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "scalar buff timed",
      "longstrider",
      scalarBuffProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "scalar buff flight",
      "fly",
      scalarBuffProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "scalar buff instantaneous",
      "false_life",
      scalarBuffProfile,
      [
        ...commonHeaderPaths,
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellActivationPhasePath(PositiveInteger(1)),
        spellActivationAttachmentPath(PositiveInteger(1)),
        spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
      ],
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellDurationEndingPath(PositiveInteger(1)),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
    ],
  ] as const)(
    "consumes exact evidence for %s",
    (_label, spellId, profile, consumed) => {
      const result = profile.admitMechanics(
        mechanicsSource(spellAdmissionSource(spellRecord(spellId))),
      );
      expect(result).toMatchObject({ tag: "supported" });
      if (result.tag !== "supported") return;
      expect(result.admitted.evidence).toEqual({ consumed, unowned: [] });
    },
  );

  test("reports Pass without Trace movement-trace suppression as exact unowned mechanics", () => {
    const result = rollModifierProfile.admitMechanics(
      mechanicsSource(spellAdmissionSource(spellRecord("pass_without_trace"))),
    );

    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toEqual({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
      unowned: [
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
    });
  });

  test("tracks Pass without Trace ownership by effect shape after authored reordering", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("pass_without_trace", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [rollBonus, movementTrace, ...rest] = mechanics.operations;
        if (rollBonus === undefined || movementTrace === undefined) {
          throw new Error("Expected Pass without Trace operation pair.");
        }
        return {
          ...mechanics,
          operations: [movementTrace, rollBonus, ...rest],
        };
      }),
    );

    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toMatchObject({
      consumed: [
        ...commonHeaderPaths,
        spellDurationValuePath(),
        spellOngoingAttachmentPath(),
        spellOngoingOperationPath(PositiveInteger(2)),
        spellOngoingOperationEffectPath(PositiveInteger(2)),
      ],
      unowned: [
        spellOngoingOperationPath(PositiveInteger(1)),
        spellOngoingOperationEffectPath(PositiveInteger(1)),
      ],
    });
  });

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      damageReductionMultiIssueUpdate,
      [
        expectedIssue(
          "damageReduction",
          "level",
          spellMechanicsHeaderPath("level"),
        ),
        expectedIssue(
          "damageReduction",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "roll modifier",
      "bless",
      rollModifierProfile,
      rollModifierMultiIssueUpdate,
      [
        expectedIssue("rollModifier", "duration", spellDurationValuePath()),
        expectedIssue(
          "rollModifier",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "scalar buff",
      "longstrider",
      scalarBuffProfile,
      scalarBuffMultiIssueUpdate,
      [
        expectedIssue(
          "scalarBuff",
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
        expectedIssue("scalarBuff", "range", spellMechanicsHeaderPath("range")),
      ],
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      seeInvisibleMultiIssueUpdate,
      [
        expectedIssue(
          "seeInvisibleObserverSight",
          "level",
          spellMechanicsHeaderPath("level"),
        ),
        expectedIssue(
          "seeInvisibleObserverSight",
          "range",
          spellMechanicsHeaderPath("range"),
        ),
      ],
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      heldLightMultiIssueUpdate,
      [
        expectedIssue("heldLight", "range", spellMechanicsHeaderPath("range")),
        expectedIssue("heldLight", "duration", spellDurationValuePath()),
      ],
    ],
  ] as const)(
    "accumulates exact multi-issue failures for %s",
    (_label, spellId, profile, update, issues) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result).toEqual({ tag: "unsupported", issues });
    },
  );

  test.each([
    [
      "damage reduction",
      "resistance",
      damageReductionProfile,
      appendOngoingNoop,
      "damageReduction",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
    [
      "roll modifier",
      "bless",
      rollModifierProfile,
      appendOngoingNoop,
      "rollModifier",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(2)),
    ],
    [
      "scalar buff",
      "longstrider",
      scalarBuffProfile,
      appendActivationPhase,
      "scalarBuff",
      "phaseCount",
      spellActivationPhasePath(PositiveInteger(2)),
    ],
    [
      "see invisible",
      "see_invisibility",
      seeInvisibleObserverSightProfile,
      appendActivationPhase,
      "seeInvisibleObserverSight",
      "phaseCount",
      spellActivationPhasePath(PositiveInteger(2)),
    ],
    [
      "held light",
      "produce_flame",
      heldLightProfile,
      appendOngoingNoop,
      "heldLight",
      "operationCount",
      spellOngoingOperationPath(PositiveInteger(3)),
    ],
  ] as const)(
    "reports an extra branch at its actual %s ordinal",
    (
      _label,
      spellId,
      profile,
      update,
      procedure,
      failedFact,
      mechanicsPath,
    ) => {
      const result = profile.admitMechanics(sourceWith(spellId, update));
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue(procedure, failedFact, mechanicsPath)],
      });
    },
  );

  test.each([
    [
      "weaponFilter",
      (effect: NumericRollEffect) => ({
        ...effect,
        weaponFilter: { kind: "weapon_property", property: "finesse" },
      }),
    ],
    [
      "abilityFilter",
      (effect: NumericRollEffect) => ({
        ...effect,
        abilityFilter: ["str"] as const,
      }),
    ],
    ["count", (effect: NumericRollEffect) => ({ ...effect, count: 1 })],
  ] as const)(
    "rejects a dropped roll-modifier numeric %s constraint at its effect path",
    (failedFact, update) => {
      const result = rollModifierProfile.admitMechanics(
        sourceWith("bless", (mechanics) => {
          if (mechanics.family !== "ongoing_effect") return mechanics;
          const updated = structuredClone(mechanics);
          const operation = updated.operations[0];
          if (operation?.effect.kind !== "modify_roll_numeric") {
            throw new Error("Expected Bless numeric roll-modifier effect.");
          }
          Reflect.set(operation, "effect", update(operation.effect));
          Reflect.set(updated, "operations", [operation]);
          return updated;
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "rollModifier",
            failedFact,
            spellOngoingOperationEffectPath(PositiveInteger(1)),
          ),
        ],
      });
    },
  );

  test.each([
    [
      "typeFilter",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        typeFilter: ["aberration"] as const,
      }),
    ],
    [
      "stateFilter",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        stateFilter: ["dead"] as const,
      }),
    ],
    [
      "visibility",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        visibility: "caster_can_see" as const,
      }),
    ],
  ] as const)(
    "rejects a dropped damage-reduction target %s constraint at its attachment path",
    (failedFact, update) => {
      const result = damageReductionProfile.admitMechanics(
        sourceWith("resistance", (mechanics) => {
          if (
            mechanics.family !== "ongoing_effect" ||
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            throw new Error("Expected Resistance target attachment.");
          }
          return {
            ...mechanics,
            attachment: {
              ...mechanics.attachment,
              value: {
                ...mechanics.attachment.value,
                selection: update(mechanics.attachment.value.selection),
              },
            },
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "damageReduction",
            failedFact,
            spellOngoingAttachmentPath(),
          ),
        ],
      });
    },
  );

  test.each([
    ["spellcastingMod", { spellcastingMod: true }],
    ["abilityModifier", { abilityModifier: "str" as const }],
  ] as const)(
    "rejects a dropped damage-reduction %s constraint at its effect path",
    (failedFact, update) => {
      const result = damageReductionProfile.admitMechanics(
        sourceWith("resistance", (mechanics) => {
          if (mechanics.family !== "ongoing_effect") return mechanics;
          const operation = mechanics.operations[0];
          if (
            operation?.effect.kind !== "reduce_damage_taken" ||
            operation.effect.amount.kind !== "fixed"
          ) {
            throw new Error("Expected Resistance fixed damage reduction.");
          }
          return {
            ...mechanics,
            operations: [
              {
                ...operation,
                effect: {
                  ...operation.effect,
                  amount: {
                    ...operation.effect.amount,
                    expr: { ...operation.effect.amount.expr, ...update },
                  },
                },
              },
            ],
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "damageReduction",
            failedFact,
            spellOngoingOperationEffectPath(PositiveInteger(1)),
          ),
        ],
      });
    },
  );

  test.each([
    ["roll modifier", "bless", rollModifierProfile, "rollModifier"],
    ["scalar buff", "longstrider", scalarBuffProfile, "scalarBuff"],
  ] as const)(
    "rejects dropped target rangeOrigin for %s at the actual attachment path",
    (_label, spellId, profile, procedure) => {
      const result = profile.admitMechanics(
        sourceWith(spellId, (mechanics) => {
          if (procedure === "scalarBuff") {
            if (mechanics.family !== "activation") {
              throw new Error("Expected scalar-buff activation mechanics.");
            }
            const updated = structuredClone(mechanics);
            const phase = updated.phases[0];
            if (
              phase?.kind !== "direct" ||
              phase.attachment.kind !== "hole" ||
              phase.attachment.value.kind !== "target"
            ) {
              throw new Error("Expected scalar-buff target attachment.");
            }
            Reflect.set(phase.attachment.value, "rangeOrigin", "caster");
            return updated;
          }
          if (
            mechanics.family !== "ongoing_effect" ||
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            throw new Error("Expected ongoing target attachment.");
          }
          const updated = structuredClone(mechanics);
          if (
            updated.attachment.kind !== "hole" ||
            updated.attachment.value.kind !== "target"
          )
            throw new Error("Expected cloned ongoing target attachment.");
          Reflect.set(updated.attachment.value, "rangeOrigin", "caster");
          return updated;
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            procedure,
            "rangeOrigin",
            procedure === "scalarBuff"
              ? spellActivationAttachmentPath(PositiveInteger(1))
              : spellOngoingAttachmentPath(),
          ),
        ],
      });
    },
  );

  test.each([
    [
      "typeFilter",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        typeFilter: ["aberration"] as const,
      }),
    ],
    [
      "stateFilter",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        stateFilter: ["dead"] as const,
      }),
    ],
    [
      "visibility",
      (selection: TargetSelection): TargetSelection => ({
        ...selection,
        disposition: "willing",
        visibility: "caster_can_see",
      }),
    ],
  ] as const)(
    "rejects dropped target selection %s for roll modifier and scalar buff",
    (failedFact, update) => {
      for (const [spellId, profile, procedure] of [
        ["bless", rollModifierProfile, "rollModifier"],
        ["longstrider", scalarBuffProfile, "scalarBuff"],
      ] as const) {
        const result = profile.admitMechanics(
          sourceWith(spellId, (mechanics) => {
            if (procedure === "scalarBuff") {
              if (mechanics.family !== "activation") {
                throw new Error("Expected scalar-buff activation mechanics.");
              }
              const updated = structuredClone(mechanics);
              const phase = updated.phases[0];
              if (
                phase?.kind !== "direct" ||
                phase.attachment.kind !== "hole" ||
                phase.attachment.value.kind !== "target"
              ) {
                throw new Error("Expected scalar-buff target attachment.");
              }
              Reflect.set(
                phase.attachment.value,
                "selection",
                update(phase.attachment.value.selection),
              );
              return updated;
            }
            if (
              mechanics.family !== "ongoing_effect" ||
              mechanics.attachment.kind !== "hole" ||
              mechanics.attachment.value.kind !== "target"
            ) {
              throw new Error("Expected ongoing target attachment.");
            }
            const updated = structuredClone(mechanics);
            if (
              updated.attachment.kind !== "hole" ||
              updated.attachment.value.kind !== "target"
            )
              throw new Error("Expected cloned ongoing target attachment.");
            Reflect.set(
              updated.attachment.value,
              "selection",
              update(updated.attachment.value.selection),
            );
            return updated;
          }),
        );
        expect(result).toEqual({
          tag: "unsupported",
          issues: [
            expectedIssue(
              procedure,
              failedFact,
              procedure === "scalarBuff"
                ? spellActivationAttachmentPath(PositiveInteger(1))
                : spellOngoingAttachmentPath(),
            ),
          ],
        });
      }
    },
  );

  test.each([
    [
      "selection",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        selection: { mode: "one", targetKinds: ["creature"] },
      }),
    ],
    [
      "occupantDispositionFilter",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        occupantDispositionFilter: "friendly_to_source",
      }),
    ],
    [
      "occupantPerceptionFilter",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        occupantPerceptionFilter: "can_see_area_effect",
      }),
    ],
    [
      "excludedAreas",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        excludedAreas: { chooser: "caster", count: "one_or_more", size: "any" },
      }),
    ],
    [
      "rangeOrigin",
      (attachment: AreaAttachment): AreaAttachment => ({
        ...attachment,
        rangeOrigin: "caster",
      }),
    ],
  ] as const)(
    "rejects dropped roll-modifier area %s semantics at the attachment path",
    (failedFact, update) => {
      const result = rollModifierProfile.admitMechanics(
        sourceWith("pass_without_trace", (mechanics) => {
          if (mechanics.family !== "ongoing_effect") return mechanics;
          if (mechanics.attachment.kind !== "area") {
            throw new Error("Expected Pass Without Trace area attachment.");
          }
          return { ...mechanics, attachment: update(mechanics.attachment) };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "rollModifier",
            failedFact,
            spellOngoingAttachmentPath(),
          ),
        ],
      });
    },
  );

  test.each([
    [
      "initialPhase",
      (mechanics: SpellMechanics): SpellMechanics => {
        if (mechanics.family !== "ongoing_effect") {
          throw new Error("Expected ongoing-effect mechanics.");
        }
        return { ...mechanics, initialPhase: initialDirectPhase };
      },
      spellOngoingInitialPhasePath(),
    ],
    [
      "authoredConditionalMechanics",
      (mechanics: SpellMechanics): SpellMechanics => {
        if (mechanics.family !== "ongoing_effect") {
          throw new Error("Expected ongoing-effect mechanics.");
        }
        return {
          ...mechanics,
          authoredConditionalMechanics: [authoredConditionalMechanic],
        };
      },
      spellMechanicsRootPath(),
    ],
  ] as const)(
    "rejects unsupported ongoing root %s while retaining profile ownership",
    (failedFact, update, mechanicsPath) => {
      for (const [spellId, profile, procedure] of [
        ["resistance", damageReductionProfile, "damageReduction"],
        ["bless", rollModifierProfile, "rollModifier"],
        ["barkskin", scalarBuffProfile, "scalarBuff"],
        ["produce_flame", heldLightProfile, "heldLight"],
      ] as const) {
        const result = profile.admitMechanics(sourceWith(spellId, update));
        expect(result).toEqual({
          tag: "unsupported",
          issues: [expectedIssue(procedure, failedFact, mechanicsPath)],
        });
      }
    },
  );

  test.each([
    {
      caseName: "root-only",
      includeConditionalMechanic: false,
      expectedFacts: ["mechanics"],
    },
    {
      caseName: "root and conditional-mechanic",
      includeConditionalMechanic: true,
      expectedFacts: ["mechanics", "authoredConditionalMechanics"],
    },
  ] as const)(
    "reports $caseName defects separately for linked defense and movable light",
    ({ includeConditionalMechanic, expectedFacts }) => {
      for (const [spellId, profile] of [
        ["warding_bond", linkedDefenseResistanceDamageShareProfile],
        ["dancing_lights", movableLightManifestationProfile],
      ] as const) {
        const result = profile.admitMechanics(
          sourceWith(spellId, (mechanics) => {
            if (mechanics.family !== "ongoing_effect")
              throw new Error("Expected ongoing-effect mechanics.");
            const malformed = structuredClone(mechanics);
            Reflect.set(malformed, "syntheticRootFact", true);
            if (includeConditionalMechanic)
              Reflect.set(malformed, "authoredConditionalMechanics", [
                authoredConditionalMechanic,
              ]);
            return malformed;
          }),
        );

        expect(result.tag).toBe("unsupported");
        if (result.tag !== "unsupported") continue;
        expect(
          result.issues.map(({ failedFact, mechanicsPath }) => ({
            failedFact,
            mechanicsPath,
          })),
        ).toEqual(
          expectedFacts.map((failedFact) => ({
            failedFact,
            mechanicsPath: spellMechanicsRootPath(),
          })),
        );
      }
    },
  );

  test.each(ongoingOperationUpdates)(
    "rejects unsupported ongoing operation %s at its operation path",
    (failedFact, update) => {
      for (const [spellId, profile, procedure] of [
        ["resistance", damageReductionProfile, "damageReduction"],
        ["bless", rollModifierProfile, "rollModifier"],
        ["barkskin", scalarBuffProfile, "scalarBuff"],
        ["produce_flame", heldLightProfile, "heldLight"],
      ] as const) {
        const result = profile.admitMechanics(
          sourceWith(spellId, (mechanics) => {
            if (mechanics.family !== "ongoing_effect") {
              throw new Error("Expected ongoing-effect mechanics.");
            }
            const operation = mechanics.operations[0];
            if (operation === undefined) {
              throw new Error("Expected an ongoing operation.");
            }
            return {
              ...mechanics,
              operations: [update(operation), ...mechanics.operations.slice(1)],
            };
          }),
        );
        expect(result).toEqual({
          tag: "unsupported",
          issues: [
            expectedIssue(
              procedure,
              failedFact,
              spellOngoingOperationPath(PositiveInteger(1)),
            ),
          ],
        });
      }
    },
  );

  test.each(heldLightHurlOptionalUpdates)(
    "rejects dropped held-light hurl %s at its actual path",
    (failedFact, update, mechanicsPath) => {
      const result = heldLightProfile.admitMechanics(
        sourceWith("produce_flame", (mechanics) =>
          updateHeldLightHurlOperation(mechanics, update),
        ),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue("heldLight", failedFact, mechanicsPath)],
      });
    },
  );

  test.each(scalarBuffTemporaryHitPointUpdates)(
    "rejects dropped scalar-buff temporary-hit-point %s at its effect path",
    (_label, update) => {
      const result = scalarBuffProfile.admitMechanics(
        sourceWith("false_life", (mechanics) => {
          if (mechanics.family !== "activation") {
            throw new Error("Expected False Life activation mechanics.");
          }
          const phase = mechanics.phases[0];
          if (phase?.kind !== "direct") {
            throw new Error("Expected False Life direct phase.");
          }
          const effect = phase.effects?.[0];
          if (effect?.kind !== "grant_temp_hp") {
            throw new Error("Expected False Life temporary-hit-point effect.");
          }
          return {
            ...mechanics,
            phases: [{ ...phase, effects: [update(effect)] }],
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "scalarBuff",
            "effect",
            spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ),
        ],
      });
    },
  );

  test("rejects held-light exploding max-die amount at the selected hurl effect", () => {
    const result = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) =>
        updateHeldLightHurlOperation(mechanics, (operation) => {
          if (operation.effect.kind !== "attack_roll") {
            throw new Error("Expected Produce Flame hurl attack effect.");
          }
          const hitDamage = operation.effect.onHit[0];
          if (hitDamage?.kind !== "damage") {
            throw new Error("Expected Produce Flame hurl damage effect.");
          }
          return {
            ...operation,
            effect: {
              ...operation.effect,
              onHit: [{ ...hitDamage, amount: heldLightExplodingMaxDieAmount }],
            },
          };
        }),
      ),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "heldLight",
          "hurl",
          spellOngoingOperationEffectPath(PositiveInteger(2)),
        ),
      ],
    });
  });

  test("rejects direct-phase mode for scalar buffs and sight at the phase path", () => {
    for (const [spellId, profile, procedure] of [
      ["longstrider", scalarBuffProfile, "scalarBuff"],
      [
        "see_invisibility",
        seeInvisibleObserverSightProfile,
        "seeInvisibleObserverSight",
      ],
    ] as const) {
      const result = profile.admitMechanics(
        sourceWith(spellId, (mechanics) => {
          if (mechanics.family !== "activation") {
            throw new Error("Expected activation mechanics.");
          }
          const phase = mechanics.phases[0];
          if (phase?.kind !== "direct") {
            throw new Error("Expected direct activation phase.");
          }
          return {
            ...mechanics,
            phases: [directPhaseModeUpdate(phase)],
          };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            procedure,
            "mode",
            spellActivationPhasePath(PositiveInteger(1)),
          ),
        ],
      });
    }
  });

  test.each(saveGateOptionalUpdates)(
    "rejects unsupported save-gate %s at its canonical path",
    (failedFact, update, mechanicsPath) => {
      const result = rollModifierProfile.admitMechanics(
        sourceWith("bane", (mechanics) => {
          if (mechanics.family !== "activation") {
            throw new Error("Expected activation mechanics.");
          }
          const phase = mechanics.phases[0];
          if (phase?.kind !== "save_gate") {
            throw new Error("Expected Bane save gate.");
          }
          return { ...mechanics, phases: [update(phase)] };
        }),
      );
      expect(result).toEqual({
        tag: "unsupported",
        issues: [expectedIssue("rollModifier", failedFact, mechanicsPath)],
      });
    },
  );

  test("selects the semantic roll-modifier save gate and reports a prepended sibling ordinal", () => {
    const result = rollModifierProfile.admitMechanics(
      sourceWith("bane", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") {
          throw new Error("Expected Bane save gate.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, onFail: { kind: "none" } }, phase],
        };
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the semantic scalar direct phase and reports its prepended sibling ordinal", () => {
    const result = scalarBuffProfile.admitMechanics(
      sourceWith("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, effects: [{ kind: "none" }] }, phase],
        };
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "scalarBuff",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the scalar effect by semantic kind and reports its actual effect ordinal", () => {
    const result = scalarBuffProfile.admitMechanics(
      sourceWith("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        Reflect.set(phase, "effects", [
          { kind: "none" },
          ...(phase.effects ?? []),
        ]);
        Reflect.set(updated, "phases", [phase]);
        return updated;
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "scalarBuff",
          "effect",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ],
    });
  });

  test("does not retain scalar ownership without a projectable effect or complete owner envelope", () => {
    const result = scalarBuffProfile.admitMechanics(
      sourceWith("longstrider", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        return {
          ...mechanics,
          phases: [
            { ...phase, effects: [{ kind: "none" }] },
            {
              ...phase,
              attachment: { kind: "object", count: 1 },
              effects: [
                {
                  kind: "modify_ac",
                  delta: {
                    kind: "fixed_dice",
                    dice: 1,
                    dieSize: 2,
                    sign: "+",
                  },
                },
              ],
            },
          ],
        };
      }),
    );
    expect(result).toEqual({ tag: "notRepresented" });
  });

  test("keeps malformed roll-modifier owners represented for typed rejection", () => {
    const ongoingResult = rollModifierProfile.admitMechanics(
      sourceWith("bless", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const operation = mechanics.operations[0];
        if (operation?.effect.kind !== "modify_roll_numeric") {
          throw new Error("Expected Bless numeric roll-modifier effect.");
        }
        return {
          ...mechanics,
          operations: [
            {
              ...operation,
              effect: {
                ...operation.effect,
                delta: {
                  kind: "ability_modifier",
                  ability: "str",
                  sign: "+",
                },
              },
            },
          ],
        };
      }),
    );
    expect(ongoingResult).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });

    const missingEffectResult = rollModifierProfile.admitMechanics(
      sourceWith("bane", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
        if (phase?.kind !== "save_gate") {
          throw new Error("Expected numeric save-penalty gate.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, onFail: { kind: "none" } }],
        };
      }),
    );
    expect(missingEffectResult).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "effect",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ],
    });

    const omittedBaseLevelSource = sourceWith("bane", (mechanics) => {
      if (mechanics.family !== "activation") return mechanics;
      const updated = structuredClone(mechanics);
      const phase = updated.phases[0];
      if (
        phase?.kind !== "save_gate" ||
        phase.attachment.kind !== "hole" ||
        phase.attachment.value.kind !== "target" ||
        phase.attachment.value.selection.mode !== "choose_up_to" ||
        typeof phase.attachment.value.selection.count !== "object" ||
        phase.attachment.value.selection.count.kind !== "linear"
      ) {
        throw new Error("Expected slot-scaled numeric save-penalty targeting.");
      }
      Reflect.deleteProperty(
        phase.attachment.value.selection.count,
        "baseLevel",
      );
      Reflect.set(phase, "onFail", { kind: "none" });
      return updated;
    });
    const renamedOmittedBaseLevelSource = {
      ...spellAdmissionSource(spellRecord("bane")),
      id: unitId("synthetic_c2_omitted_base_level_save_penalty"),
      name: "Synthetic Omitted Base Level Save Penalty",
      mechanics: omittedBaseLevelSource.mechanics,
      spellDefinitionRuleFacts: omittedBaseLevelSource.spellDefinitionRuleFacts,
    };
    for (const source of [
      omittedBaseLevelSource,
      mechanicsSource(renamedOmittedBaseLevelSource),
    ]) {
      expect(rollModifierProfile.admitMechanics(source)).toEqual({
        tag: "unsupported",
        issues: [
          expectedIssue(
            "rollModifier",
            "effect",
            spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
          ),
        ],
      });
    }

    const independentlyMalformedResult = rollModifierProfile.admitMechanics(
      sourceWith("bane", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "save_gate") {
          throw new Error("Expected numeric save-penalty gate.");
        }
        Reflect.set(updated, "castingTime", { kind: "bonus_action" });
        Reflect.set(updated, "duration", { kind: "permanent" });
        Reflect.set(phase, "attachment", { kind: "object", count: 1 });
        Reflect.set(updated, "phases", [phase]);
        return updated;
      }),
    );
    expect(independentlyMalformedResult).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "castingTime",
          spellMechanicsHeaderPath("castingTime"),
        ),
        expectedIssue("rollModifier", "duration", spellDurationValuePath()),
        expectedIssue(
          "rollModifier",
          "attachment",
          spellActivationAttachmentPath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the semantic sight direct phase and reports its prepended sibling ordinal", () => {
    const result = seeInvisibleObserverSightProfile.admitMechanics(
      sourceWith("see_invisibility", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected See Invisibility direct phase.");
        }
        return {
          ...mechanics,
          phases: [{ ...phase, effects: [{ kind: "none" }] }, phase],
        };
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "seeInvisibleObserverSight",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the sight effect by semantic kind and reports its actual effect ordinal", () => {
    const result = seeInvisibleObserverSightProfile.admitMechanics(
      sourceWith("see_invisibility", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const updated = structuredClone(mechanics);
        const phase = updated.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected See Invisibility direct phase.");
        }
        Reflect.set(phase, "effects", [
          { kind: "none" },
          ...(phase.effects ?? []),
        ]);
        Reflect.set(updated, "phases", [phase]);
        return updated;
      }),
    );
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "seeInvisibleObserverSight",
          "phaseCount",
          spellActivationEffectPath(PositiveInteger(1), PositiveInteger(1)),
        ),
      ],
    });
  });

  test("matches held light operation roles independent of authored ordering", () => {
    const result = heldLightProfile.admitMechanics(
      sourceWith("produce_flame", (mechanics) => {
        if (mechanics.family !== "ongoing_effect") return mechanics;
        const [first, second, ...rest] = mechanics.operations;
        if (first === undefined || second === undefined) {
          throw new Error("Expected paired held-light operations.");
        }
        return {
          ...mechanics,
          operations: [second, first, ...rest],
        };
      }),
    );
    expect(result).toMatchObject({ tag: "supported" });
    if (result.tag !== "supported") return;
    expect(result.admitted.evidence).toMatchObject({ unowned: [] });
  });

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier", "bane", rollModifierProfile],
    ["roll modifier partial", "pass_without_trace", rollModifierProfile],
    ["scalar buff", "longstrider", scalarBuffProfile],
    ["scalar buff flight", "fly", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)(
    "preserves %s admission under authored renaming",
    (_label, spellId, profile) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const renamed = {
        ...source,
        id: unitId(`synthetic_c2_${spellId}`),
        name: "Synthetic Renamed Spell",
      };
      const original = profile.admitMechanics(mechanicsSource(source));
      const renamedResult = profile.admitMechanics(mechanicsSource(renamed));
      expect(original).toMatchObject({ tag: "supported" });
      expect(renamedResult).toMatchObject({ tag: "supported" });
      if (original.tag !== "supported" || renamedResult.tag !== "supported")
        return;
      expect(renamedResult.admitted.facts).toEqual(original.admitted.facts);
      expect(renamedResult.admitted.evidence).toEqual(
        original.admitted.evidence,
      );
    },
  );

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier", "bless", rollModifierProfile],
    ["scalar buff", "longstrider", scalarBuffProfile],
    ["see invisible", "see_invisibility", seeInvisibleObserverSightProfile],
    ["held light", "produce_flame", heldLightProfile],
  ] as const)(
    "binds a mechanics-free closure for %s",
    (_label, spellId, profile) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = profile.admitMechanics(mechanicsSource(source));
      expect(result).toMatchObject({ tag: "supported" });
      if (result.tag !== "supported") return;
      const invocations = result.admitted.admit(
        battleSpellExecutionSourceFromAdmission(source),
        contextFor(source.castingSource),
      );
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation.spell).not.toHaveProperty("mechanics");
      }
    },
  );

  test.each([
    ["resistance", "damageReduction"],
    ["bless", "rollModifier"],
    ["longstrider", "scalarBuff"],
    ["see_invisibility", "seeInvisibleObserverSight"],
    ["produce_flame", "heldLight"],
  ] as const)(
    "does not collide on the %s representative",
    (spellId, procedure) => {
      const source = spellAdmissionSource(spellRecord(spellId));
      const result = admitBattleSpellMechanicsFrom(mechanicsSource(source), [
        damageReductionProfile,
        rollModifierProfile,
        scalarBuffProfile,
        seeInvisibleObserverSightProfile,
        heldLightProfile,
      ]);
      expect(result.tag).toBe("admitted");
      if (result.tag !== "admitted") return;
      expect(
        result.procedures.map(
          ({ procedure: admittedProcedure }) => admittedProcedure,
        ),
      ).toEqual([procedure]);
    },
  );

  test.each([
    [
      "resistance operation deletion",
      "resistance",
      removeOngoingCharacteristicEffect,
      "damageReduction",
    ],
    [
      "bless operation deletion",
      "bless",
      removeOngoingCharacteristicEffect,
      "rollModifier",
    ],
    [
      "bane effect deletion",
      "bane",
      removeActivationCharacteristicEffect,
      "rollModifier",
    ],
    [
      "longstrider effect deletion",
      "longstrider",
      removeActivationCharacteristicEffect,
      "scalarBuff",
    ],
    [
      "barkskin operation deletion",
      "barkskin",
      removeOngoingCharacteristicEffect,
      "scalarBuff",
    ],
    [
      "see invisibility effect deletion",
      "see_invisibility",
      removeActivationCharacteristicEffect,
      "seeInvisibleObserverSight",
    ],
  ] as const)(
    "does not collide after %s",
    (_label, spellId, update, procedure) => {
      const source = sourceWith(spellId, update);
      const profiles = [
        ["damageReduction", damageReductionProfile],
        ["rollModifier", rollModifierProfile],
        ["scalarBuff", scalarBuffProfile],
        ["seeInvisibleObserverSight", seeInvisibleObserverSightProfile],
        ["heldLight", heldLightProfile],
      ] as const;
      const representedProcedures = profiles.flatMap(
        ([candidateProcedure, profile]) =>
          profile.admitMechanics(source).tag === "notRepresented"
            ? []
            : [candidateProcedure],
      );
      expect(representedProcedures).toEqual([procedure]);
    },
  );
});
