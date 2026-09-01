import { describe, expect, test } from "vitest";
import { PositiveInteger } from "@dnd/shared/types";
import { unitId } from "@dnd/shared/game-facts";
import {
  battleSpellExecutionSourceFromAdmission,
  type BattleSpellAdmissionSource,
} from "../../battle-state-execution.ts";
import {
  spellAdmissionSource,
  spellRecord,
} from "../../unit-profile-admission-spell-record.test-support.ts";
import { projectSpellDefinitionRuleFacts } from "../../procedure-admission/spell-definition-rule-facts.ts";
import type {
  SpellMechanicsAdmissionSource,
  SpellProcedureAdmissionIssue,
} from "./spell-mechanics-admission.ts";
import { admitBattleSpellMechanicsFrom } from "./spell-mechanics-admission.ts";
import { damageReductionProfile } from "./damage-reduction.ts";
import { heldLightProfile } from "./held-light.ts";
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
  AuthoredConditionalEffect,
  CastTimeEffectModeChoice,
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
type AreaAttachment = Extract<Attachment, { readonly kind: "area" }>;
type SaveGatePhase = Extract<ActivationPhase, { readonly kind: "save_gate" }>;
type SaveGateTargetAutoSuccess = Exclude<
  SaveGatePhase["autoSuccessIfTarget"],
  undefined
>;

const authoredConditionalEffect: AuthoredConditionalEffect = {
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
    (operation: OngoingOperation): OngoingOperation => ({
      ...operation,
      predicate: ongoingPredicate,
    }),
  ],
  [
    "targetLimit",
    (operation: OngoingOperation): OngoingOperation => ({
      ...operation,
      targetLimit: ongoingTargetLimit,
    }),
  ],
  [
    "usageLimit",
    (operation: OngoingOperation): OngoingOperation => ({
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
    (phase: SaveGatePhase): SaveGatePhase => ({
      ...phase,
      autoSuccessIfTarget: saveGateTargetAutoSuccess,
    }),
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

describe("C2 support profile static admission", () => {
  test.each([
    ["damage reduction", "barkskin", damageReductionProfile],
    ["roll modifier", "longstrider", rollModifierProfile],
    ["scalar buff", "bless", scalarBuffProfile],
    ["see invisible", "shield_of_faith", seeInvisibleObserverSightProfile],
    ["held light", "fire_bolt", heldLightProfile],
  ] as const)(
    "does not represent unrelated %s mechanics",
    (_label, spellId, profile) => {
      expect(
        profile.admitMechanics(
          mechanicsSource(spellAdmissionSource(spellRecord(spellId))),
        ),
      ).toEqual({ tag: "notRepresented" });
    },
  );

  test.each([
    ["damage reduction", "resistance", damageReductionProfile],
    ["roll modifier bless", "bless", rollModifierProfile],
    ["roll modifier guidance", "guidance", rollModifierProfile],
    ["roll modifier bane", "bane", rollModifierProfile],
    ["roll modifier enhance ability", "enhance_ability", rollModifierProfile],
    ["scalar buff longstrider", "longstrider", scalarBuffProfile],
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
          const operation = mechanics.operations[0];
          if (operation?.effect.kind !== "modify_roll_numeric") {
            throw new Error("Expected Bless numeric roll-modifier effect.");
          }
          return {
            ...mechanics,
            operations: [{ ...operation, effect: update(operation.effect) }],
          };
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
            const phase = mechanics.phases[0];
            if (
              phase?.kind !== "direct" ||
              phase.attachment.kind !== "hole" ||
              phase.attachment.value.kind !== "target"
            ) {
              throw new Error("Expected scalar-buff target attachment.");
            }
            return {
              ...mechanics,
              phases: [
                {
                  ...phase,
                  attachment: {
                    ...phase.attachment,
                    value: {
                      ...phase.attachment.value,
                      rangeOrigin: "caster",
                    },
                  },
                },
              ],
            };
          }
          if (
            mechanics.family !== "ongoing_effect" ||
            mechanics.attachment.kind !== "hole" ||
            mechanics.attachment.value.kind !== "target"
          ) {
            throw new Error("Expected ongoing target attachment.");
          }
          return {
            ...mechanics,
            attachment: {
              ...mechanics.attachment,
              value: {
                ...mechanics.attachment.value,
                rangeOrigin: "caster",
              },
            },
          };
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
              const phase = mechanics.phases[0];
              if (
                phase?.kind !== "direct" ||
                phase.attachment.kind !== "hole" ||
                phase.attachment.value.kind !== "target"
              ) {
                throw new Error("Expected scalar-buff target attachment.");
              }
              return {
                ...mechanics,
                phases: [
                  {
                    ...phase,
                    attachment: {
                      ...phase.attachment,
                      value: {
                        ...phase.attachment.value,
                        selection: update(phase.attachment.value.selection),
                      },
                    },
                  },
                ],
              };
            }
            if (
              mechanics.family !== "ongoing_effect" ||
              mechanics.attachment.kind !== "hole" ||
              mechanics.attachment.value.kind !== "target"
            ) {
              throw new Error("Expected ongoing target attachment.");
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
      "authoredConditionalEffects",
      (mechanics: SpellMechanics): SpellMechanics => {
        if (mechanics.family !== "ongoing_effect") {
          throw new Error("Expected ongoing-effect mechanics.");
        }
        return {
          ...mechanics,
          authoredConditionalEffects: [authoredConditionalEffect],
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
        const phase = mechanics.phases[0];
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
        const phase = mechanics.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected Longstrider direct phase.");
        }
        return {
          ...mechanics,
          phases: [
            { ...phase, effects: [{ kind: "none" }, ...(phase.effects ?? [])] },
          ],
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
  });

  test("carries selected scalar phase and effect ordinals into downstream issues", () => {
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
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "scalarBuff",
          "phaseCount",
          spellActivationPhasePath(PositiveInteger(1)),
        ),
        expectedIssue(
          "scalarBuff",
          "attachment",
          spellActivationAttachmentPath(PositiveInteger(2)),
        ),
        expectedIssue(
          "scalarBuff",
          "effect",
          spellActivationEffectPath(PositiveInteger(2), PositiveInteger(1)),
        ),
      ],
    });
  });

  test("keeps a malformed roll-modifier effect represented for typed rejection", () => {
    const result = rollModifierProfile.admitMechanics(
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
    expect(result).toEqual({
      tag: "unsupported",
      issues: [
        expectedIssue(
          "rollModifier",
          "effect",
          spellOngoingOperationEffectPath(PositiveInteger(1)),
        ),
      ],
    });
  });

  test("selects the semantic sight direct phase and reports its prepended sibling ordinal", () => {
    const result = seeInvisibleObserverSightProfile.admitMechanics(
      sourceWith("see_invisibility", (mechanics) => {
        if (mechanics.family !== "activation") return mechanics;
        const phase = mechanics.phases[0];
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
        const phase = mechanics.phases[0];
        if (phase?.kind !== "direct") {
          throw new Error("Expected See Invisibility direct phase.");
        }
        return {
          ...mechanics,
          phases: [
            { ...phase, effects: [{ kind: "none" }, ...(phase.effects ?? [])] },
          ],
        };
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
    ["roll modifier", "bless", rollModifierProfile],
    ["scalar buff", "longstrider", scalarBuffProfile],
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
});
