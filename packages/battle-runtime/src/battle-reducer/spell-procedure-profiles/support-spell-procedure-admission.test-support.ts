import { expect } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import { type BattleSpellAdmissionSource } from "../../battle-state-execution.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import { heldLightProfile } from "./held-light.ts";
import { rollModifierProfile } from "./roll-modifier.ts";
import { scalarBuffProfile } from "./scalar-buff.ts";
import { seeInvisibleObserverSightProfile } from "./see-invisible-observer-sight.ts";
import {
  spellActivationPhasePath,
  spellActivationRepeatPath,
  spellMechanicsHeaderPath,
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
} from "@dnd/surface/surface/types";
import type { SpellAdmissionContext } from "./profile.ts";
import { spellAdmissionContextFor } from "./admission-context.ts";
import { spellBattle } from "../../unit-profile-admission-spell-battle.test-support.ts";
import { spellCasterId } from "../../unit-profile-admission-catalog.test-support.ts";

export type OngoingEffectMechanics = Extract<
  SpellMechanics,
  { readonly family: "ongoing_effect" }
>;

export type OngoingEffectMechanicsOperation =
  OngoingEffectMechanics["operations"][number];

export function mechanicsSource(
  source: BattleSpellAdmissionSource,
): SpellMechanicsAdmissionSource {
  return {
    mechanics: source.mechanics,
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

export const commonHeaderPaths = [
  spellMechanicsHeaderPath("level"),
  spellMechanicsHeaderPath("school"),
  spellMechanicsHeaderPath("range"),
  spellMechanicsHeaderPath("components"),
  spellMechanicsHeaderPath("duration"),
  spellMechanicsHeaderPath("castingTime"),
  spellMechanicsHeaderPath("family"),
];

export function sourceWith(
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

export function contextFor(
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

export type SupportProfileAdmissionResult =
  | ReturnType<typeof damageReductionProfile.admitMechanics>
  | ReturnType<typeof heldLightProfile.admitMechanics>
  | ReturnType<typeof rollModifierProfile.admitMechanics>
  | ReturnType<typeof scalarBuffProfile.admitMechanics>
  | ReturnType<typeof seeInvisibleObserverSightProfile.admitMechanics>;

export type SupportProfileAdmissionIssue = Extract<
  SupportProfileAdmissionResult,
  { readonly tag: "unsupported" }
>["issues"][number];

export type ExpectedSupportProfileAdmissionIssue = SpellProcedureAdmissionIssue<
  SupportProfileAdmissionIssue["procedure"],
  SupportProfileAdmissionIssue["failedFact"],
  SupportProfileAdmissionIssue["mechanicsPath"]
>;

export type NumericRollEffect = Extract<
  EffectAtom,
  { readonly kind: "modify_roll_numeric" }
>;

export type TemporaryHitPointEffect = Extract<
  EffectAtom,
  { readonly kind: "grant_temp_hp" }
>;

export type AreaAttachment = Extract<Attachment, { readonly kind: "area" }>;

export type SaveGatePhase = Extract<
  ActivationPhase,
  { readonly kind: "save_gate" }
>;

export type SaveGateTargetAutoSuccess = Exclude<
  SaveGatePhase["autoSuccessIfTarget"],
  undefined
>;

export const authoredConditionalMechanic: AuthoredConditionalMechanic = {
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

export const ongoingPredicate: OngoingPredicate = {
  kind: "spell_created_held_object_active",
};

export const ongoingTargetLimit: NonNullable<OngoingOperation["targetLimit"]> =
  {
    count: 1,
    distinct: true,
    targetTypes: ["creature"],
  };

export const ongoingUsageLimit: NonNullable<OngoingOperation["usageLimit"]> = {
  kind: "once_per_turn",
};

export const directPhaseMode: CastTimeEffectModeChoice = {
  label: "mode",
  options: [
    {
      id: "mode_a",
      displayName: "Mode A",
      effects: [{ kind: "none" }],
    },
  ],
};

export const repeatSave: RepeatSaveSpec = {
  cadence: "end_of_target_turn",
  onSuccess: "ends_on_target",
};

export const saveGateTargetAutoSuccess: SaveGateTargetAutoSuccess = {
  kind: "challenge_rating_not_equal",
  challengeRating: 0,
};

export const initialDirectPhase: ActivationPhase = {
  kind: "direct",
  attachment: { kind: "self" },
  effects: [{ kind: "none" }],
};

export const ongoingOperationUpdates = [
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

export const saveGateOptionalUpdates = [
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

export const directPhaseModeUpdate = (
  phase: Extract<ActivationPhase, { readonly kind: "direct" }>,
): Extract<ActivationPhase, { readonly kind: "direct" }> => ({
  ...phase,
  mode: directPhaseMode,
});

export const scalarBuffTemporaryHitPointUpdates = [
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

export const heldLightExplodingMaxDieAmount = {
  kind: "threshold_tiers_exploding_max_die",
  axis: "character",
  baseDice: 1,
  dieSize: 8,
  tiers: [{ atLevel: 5, dice: 2 }],
  maxAdditionalDice: "spellcasting_ability_modifier",
} as const satisfies DiceAmount;

export function updateHeldLightHurlOperation(
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

export const heldLightHurlOptionalUpdates = [
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

export function expectedIssue(
  procedure: SupportProfileAdmissionIssue["procedure"],
  failedFact: SupportProfileAdmissionIssue["failedFact"],
  mechanicsPath: SupportProfileAdmissionIssue["mechanicsPath"],
): ExpectedSupportProfileAdmissionIssue {
  return {
    tag: "spellProcedureAdmissionIssue",
    procedure,
    failedFact,
    mechanicsPath,
    message: `Unsupported ${procedure} mechanics fact: ${failedFact}.`,
  };
}

export const damageReductionMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  level: 1,
  range: { kind: "unlimited" },
});

export const rollModifierMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  range: { kind: "unlimited" },
  duration: { kind: "permanent" },
});

export const scalarBuffMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics =>
  "castingTime" in mechanics
    ? {
        ...mechanics,
        range: { kind: "unlimited" },
        castingTime: { kind: "minutes", amount: 1, ritual: false },
      }
    : mechanics;

export const seeInvisibleMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  level: 1,
  range: { kind: "unlimited" },
});

export const heldLightMultiIssueUpdate = (
  mechanics: SpellMechanics,
): SpellMechanics => ({
  ...mechanics,
  range: { kind: "unlimited" },
  duration: { kind: "permanent" },
});

export function appendOngoingNoop(mechanics: SpellMechanics): SpellMechanics {
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

export function appendActivationPhase(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "activation") return mechanics;
  const firstPhase = mechanics.phases[0];
  if (firstPhase === undefined) {
    throw new Error("Expected an activation phase representative.");
  }
  return { ...mechanics, phases: [...mechanics.phases, firstPhase] };
}

export function removeOngoingCharacteristicEffect(
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

export function replaceOngoingCharacteristicEffect(
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

export function ensureSinglePassiveNoneOperation(
  mechanics: SpellMechanics,
): SpellMechanics {
  if (mechanics.family !== "ongoing_effect") return mechanics;
  const operation = mechanics.operations[0] ?? {
    trigger: { kind: "passive" as const },
    effect: { kind: "none" as const },
  };
  return {
    ...mechanics,
    operations: [{ ...operation, effect: { kind: "none" } }],
  };
}

export function damageReductionFallbackSource(
  update: (mechanics: SpellMechanics) => SpellMechanics,
  identity: string,
  name: string,
): BattleSpellAdmissionSource {
  const source = spellAdmissionSource(spellRecord("resistance"));
  const mechanics = update(removeOngoingCharacteristicEffect(source.mechanics));
  return {
    ...source,
    id: unitId(identity),
    name,
    mechanics,
    // These candidates intentionally exercise malformed mechanics. Keep the
    // already-parsed definition facts independent of the malformed branch.
    spellDefinitionRuleFacts: source.spellDefinitionRuleFacts,
  };
}

export function expectDamageReductionNotRepresented(
  source: BattleSpellAdmissionSource,
): void {
  expect(
    damageReductionProfile.admitMechanics(mechanicsSource(source)),
  ).toEqual({ tag: "notRepresented" });
}

export function expectDamageReductionFallbackNotRepresented(
  update: (mechanics: SpellMechanics) => SpellMechanics,
  identity: string,
  name: string,
): void {
  expectDamageReductionNotRepresented(
    damageReductionFallbackSource(update, identity, name),
  );
}

export function removeRollModifierCharacteristicOperation(
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

export function removeActivationCharacteristicEffect(
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
