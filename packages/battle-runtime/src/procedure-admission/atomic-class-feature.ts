import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";
import { sameStringSet } from "../same-string-set.ts";

import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";

export type AtomicClassFeatureProcedureFacts = Extract<
  UnitFeatureProcedureExecution,
  {
    readonly kind: "acrobaticMovement" | "bonusActionDelegatedStandardActions";
  }
>;

const ATOMIC_CLASS_FEATURE_ROOT_MECHANICS_PATH = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
]);

const DELEGATED_STANDARD_ACTIONS_FAILED_FACTS = [
  "unsupportedActivationCost",
  "unsupportedSleightOfHandAbilityCheck",
  "unsupportedSleightOfHandOperations",
  "unsupportedObjectUseActions",
] as const;
export type DelegatedStandardActionsFailedFact =
  (typeof DELEGATED_STANDARD_ACTIONS_FAILED_FACTS)[number];

const ACROBATIC_MOVEMENT_FAILED_FACTS = [
  "unsupportedEquipmentCondition",
  "unsupportedMovementTiming",
  "unsupportedVerticalSurfaceTraversal",
  "unsupportedLiquidTraversal",
] as const;
export type AcrobaticMovementFailedFact =
  (typeof ACROBATIC_MOVEMENT_FAILED_FACTS)[number];

export type AtomicClassFeatureProcedureAdmissionIssue =
  | {
      readonly tag: "atomicClassFeatureProcedureAdmissionIssue";
      readonly procedure: "bonusActionDelegatedStandardActions";
      readonly failedFact: DelegatedStandardActionsFailedFact;
      readonly mechanicsPath: UnitMechanicsPath;
      readonly message: string;
    }
  | {
      readonly tag: "atomicClassFeatureProcedureAdmissionIssue";
      readonly procedure: "acrobaticMovement";
      readonly failedFact: AcrobaticMovementFailedFact;
      readonly mechanicsPath: UnitMechanicsPath;
      readonly message: string;
    };

export type AdmittedAtomicClassFeatureProcedure = {
  readonly binding: "ready";
  readonly facts: AtomicClassFeatureProcedureFacts;
  readonly evidence: {
    readonly consumed: readonly [UnitMechanicsPath];
    readonly unowned: readonly [];
  };
};

export type AtomicClassFeatureProcedureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly procedure: AdmittedAtomicClassFeatureProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<AtomicClassFeatureProcedureAdmissionIssue>;
    };

type ClassFeatureMechanics = Extract<
  AuthoredUnitSource,
  { readonly kind: "class_feature" }
>["mechanics"];

type AtomicClassFeatureMechanics = Extract<
  ClassFeatureMechanics,
  {
    readonly family:
      | "acrobatic_movement"
      | "bonus_action_delegated_standard_actions";
  }
>;
type DelegatedStandardActionsMechanics = Extract<
  AtomicClassFeatureMechanics,
  { readonly family: "bonus_action_delegated_standard_actions" }
>;
type DelegatedStandardActionOperation =
  DelegatedStandardActionsMechanics["sleightOfHand"]["operations"][number];
type DelegatedObjectUseAction =
  DelegatedStandardActionsMechanics["objectUse"]["actions"][number];

export function admitAtomicClassFeatureProcedure(
  unit: AuthoredUnitSource,
): AtomicClassFeatureProcedureAdmission {
  if (unit.kind !== "class_feature") return { tag: "notBattleOwned" };
  if (
    unit.mechanics.family !== "acrobatic_movement" &&
    unit.mechanics.family !== "bonus_action_delegated_standard_actions"
  ) {
    return { tag: "notBattleOwned" };
  }

  const mechanics = unit.mechanics;
  const [firstIssue, ...remainingIssues] =
    atomicClassFeatureProcedureAdmissionIssues(mechanics);
  if (firstIssue !== undefined) {
    return {
      tag: "rejected",
      issues: [firstIssue, ...remainingIssues],
    };
  }

  return {
    tag: "admitted",
    procedure: {
      binding: "ready",
      facts: atomicClassFeatureProcedureFacts(mechanics),
      evidence: {
        consumed: [ATOMIC_CLASS_FEATURE_ROOT_MECHANICS_PATH],
        unowned: [],
      },
    },
  };
}

function atomicClassFeatureProcedureAdmissionIssues(
  mechanics: AtomicClassFeatureMechanics,
): readonly AtomicClassFeatureProcedureAdmissionIssue[] {
  return Match.value(mechanics).pipe(
    Match.discriminatorsExhaustive("family")({
      acrobatic_movement: acrobaticMovementAdmissionIssues,
      bonus_action_delegated_standard_actions:
        delegatedStandardActionsAdmissionIssues,
    }),
  );
}

function atomicClassFeatureProcedureFacts(
  mechanics: AtomicClassFeatureMechanics,
): AtomicClassFeatureProcedureFacts {
  return Match.value(mechanics).pipe(
    Match.discriminatorsExhaustive("family")({
      acrobatic_movement: () => ({
        kind: "acrobaticMovement" as const,
        acrobaticMovement: {
          condition: { kind: "unarmoredUnshielded" as const },
          timing: "onYourTurn" as const,
          paths: [
            {
              kind: "verticalSurface" as const,
              path: "alongVerticalSurface" as const,
              withoutFallingDuringMovement: true as const,
            },
            {
              kind: "liquid" as const,
              path: "acrossLiquid" as const,
              withoutFallingDuringMovement: true as const,
            },
          ] as const,
        },
      }),
      bonus_action_delegated_standard_actions: () => ({
        kind: "bonusActionDelegatedStandardActions" as const,
        actionEconomy: {
          kind: "bonusActionDelegatedStandardActions" as const,
          activationCost: { kind: "bonusAction" as const },
          sleightOfHand: {
            abilityCheck: {
              ability: "dex" as const,
              skill: "sleight_of_hand" as const,
            },
            operations: [
              "pick_lock_with_thieves_tools" as const,
              "disarm_trap_with_thieves_tools" as const,
              "pick_pocket" as const,
            ] as const,
          },
          objectUse: {
            actions: [
              { action: "utilize" as const },
              {
                action: "magic" as const,
                restrictedTo: "magicItemRequiresMagicAction" as const,
              },
            ] as const,
          },
        },
      }),
    }),
  );
}

function delegatedStandardActionsAdmissionIssues(
  mechanics: DelegatedStandardActionsMechanics,
): readonly AtomicClassFeatureProcedureAdmissionIssue[] {
  const [firstOperation, secondOperation, thirdOperation, ...extraOperations] =
    mechanics.sleightOfHand.operations;
  const [utilize, magic, ...extraActions] = mechanics.objectUse.actions;
  const supportByFailedFact = {
    unsupportedActivationCost: mechanics.activationCost.kind === "bonus_action",
    unsupportedSleightOfHandAbilityCheck:
      delegatedSleightOfHandAbilityCheckIsSupported(mechanics),
    unsupportedSleightOfHandOperations:
      delegatedSleightOfHandOperationsAreSupported({
        firstOperation,
        secondOperation,
        thirdOperation,
        extraOperations,
      }),
    unsupportedObjectUseActions: delegatedObjectUseActionsAreSupported(
      utilize,
      magic,
      extraActions,
    ),
  } satisfies Record<DelegatedStandardActionsFailedFact, boolean>;
  return DELEGATED_STANDARD_ACTIONS_FAILED_FACTS.filter(
    (failedFact) => !supportByFailedFact[failedFact],
  ).map(delegatedStandardActionsAdmissionIssue);
}

function delegatedSleightOfHandAbilityCheckIsSupported(
  mechanics: DelegatedStandardActionsMechanics,
): boolean {
  return (
    mechanics.sleightOfHand.abilityCheck.ability === "dex" &&
    mechanics.sleightOfHand.abilityCheck.skill === "sleight_of_hand"
  );
}

function delegatedSleightOfHandOperationsAreSupported(input: {
  readonly firstOperation: DelegatedStandardActionOperation | undefined;
  readonly secondOperation: DelegatedStandardActionOperation | undefined;
  readonly thirdOperation: DelegatedStandardActionOperation | undefined;
  readonly extraOperations: readonly DelegatedStandardActionOperation[];
}): boolean {
  return (
    input.firstOperation === "pick_lock_with_thieves_tools" &&
    input.secondOperation === "disarm_trap_with_thieves_tools" &&
    input.thirdOperation === "pick_pocket" &&
    input.extraOperations.length === 0
  );
}

function delegatedObjectUseActionsAreSupported(
  utilize: DelegatedObjectUseAction | undefined,
  magic: DelegatedObjectUseAction | undefined,
  extraActions: readonly DelegatedObjectUseAction[],
): boolean {
  return (
    delegatedUtilizeActionIsSupported(utilize) &&
    delegatedMagicActionIsSupported(magic) &&
    extraActions.length === 0
  );
}

function delegatedUtilizeActionIsSupported(
  action: DelegatedObjectUseAction | undefined,
): boolean {
  return action?.action === "utilize" && !("restrictedTo" in action);
}

function delegatedMagicActionIsSupported(
  action: DelegatedObjectUseAction | undefined,
): boolean {
  return (
    action?.action === "magic" &&
    action.restrictedTo === "magic_item_requires_magic_action"
  );
}

function delegatedStandardActionsAdmissionIssue(
  failedFact: DelegatedStandardActionsFailedFact,
): AtomicClassFeatureProcedureAdmissionIssue {
  return {
    tag: "atomicClassFeatureProcedureAdmissionIssue",
    procedure: "bonusActionDelegatedStandardActions",
    failedFact,
    mechanicsPath: ATOMIC_CLASS_FEATURE_ROOT_MECHANICS_PATH,
    message: `Unsupported delegated standard-action mechanics fact: ${failedFact}.`,
  };
}

function acrobaticMovementAdmissionIssues(
  mechanics: Extract<
    AtomicClassFeatureMechanics,
    { readonly family: "acrobatic_movement" }
  >,
): readonly AtomicClassFeatureProcedureAdmissionIssue[] {
  const supportByFailedFact = {
    unsupportedEquipmentCondition:
      acrobaticEquipmentConditionIsSupported(mechanics),
    unsupportedMovementTiming: mechanics.movement.timing === "on_your_turn",
    unsupportedVerticalSurfaceTraversal:
      acrobaticVerticalSurfaceTraversalIsSupported(mechanics),
    unsupportedLiquidTraversal: acrobaticLiquidTraversalIsSupported(mechanics),
  } satisfies Record<AcrobaticMovementFailedFact, boolean>;
  return ACROBATIC_MOVEMENT_FAILED_FACTS.filter(
    (failedFact) => !supportByFailedFact[failedFact],
  ).map(acrobaticMovementAdmissionIssue);
}

function acrobaticEquipmentConditionIsSupported(
  mechanics: Extract<
    AtomicClassFeatureMechanics,
    { readonly family: "acrobatic_movement" }
  >,
): boolean {
  if (mechanics.condition.kind !== "all_of") return false;
  if (mechanics.condition.predicates.length !== 2) return false;
  const unarmored = mechanics.condition.predicates.find(
    (predicate) => predicate.kind === "not_wearing_armor",
  );
  const unshielded = mechanics.condition.predicates.find(
    (predicate) => predicate.kind === "not_wielding_shield",
  );
  return (
    unarmored?.kind === "not_wearing_armor" &&
    sameStringSet(unarmored.categories, ["light", "medium", "heavy"]) &&
    unshielded?.kind === "not_wielding_shield"
  );
}

function acrobaticVerticalSurfaceTraversalIsSupported(
  mechanics: Extract<
    AtomicClassFeatureMechanics,
    { readonly family: "acrobatic_movement" }
  >,
): boolean {
  return (
    mechanics.movement.verticalSurfaces.path === "along_vertical_surfaces" &&
    mechanics.movement.verticalSurfaces.withoutFallingDuringMovement === true
  );
}

function acrobaticLiquidTraversalIsSupported(
  mechanics: Extract<
    AtomicClassFeatureMechanics,
    { readonly family: "acrobatic_movement" }
  >,
): boolean {
  return (
    mechanics.movement.liquids.path === "across_liquids" &&
    mechanics.movement.liquids.withoutFallingDuringMovement === true
  );
}

function acrobaticMovementAdmissionIssue(
  failedFact: AcrobaticMovementFailedFact,
): AtomicClassFeatureProcedureAdmissionIssue {
  return {
    tag: "atomicClassFeatureProcedureAdmissionIssue",
    procedure: "acrobaticMovement",
    failedFact,
    mechanicsPath: ATOMIC_CLASS_FEATURE_ROOT_MECHANICS_PATH,
    message: `Unsupported Acrobatic Movement mechanics fact: ${failedFact}.`,
  };
}
