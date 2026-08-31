import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";

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
  mechanics: Extract<
    AtomicClassFeatureMechanics,
    { readonly family: "bonus_action_delegated_standard_actions" }
  >,
): readonly AtomicClassFeatureProcedureAdmissionIssue[] {
  const [firstOperation, secondOperation, thirdOperation, ...extraOperations] =
    mechanics.sleightOfHand.operations;
  const [utilize, magic, ...extraActions] = mechanics.objectUse.actions;
  const failedFacts: DelegatedStandardActionsFailedFact[] = [];
  if (mechanics.activationCost.kind !== "bonus_action") {
    failedFacts.push("unsupportedActivationCost");
  }
  if (
    mechanics.sleightOfHand.abilityCheck.ability !== "dex" ||
    mechanics.sleightOfHand.abilityCheck.skill !== "sleight_of_hand"
  ) {
    failedFacts.push("unsupportedSleightOfHandAbilityCheck");
  }
  if (
    firstOperation !== "pick_lock_with_thieves_tools" ||
    secondOperation !== "disarm_trap_with_thieves_tools" ||
    thirdOperation !== "pick_pocket" ||
    extraOperations.length > 0
  ) {
    failedFacts.push("unsupportedSleightOfHandOperations");
  }
  if (
    utilize?.action !== "utilize" ||
    utilize === undefined ||
    "restrictedTo" in utilize ||
    magic?.action !== "magic" ||
    magic.restrictedTo !== "magic_item_requires_magic_action" ||
    extraActions.length > 0
  ) {
    failedFacts.push("unsupportedObjectUseActions");
  }
  return failedFacts.map(delegatedStandardActionsAdmissionIssue);
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
  const failedFacts: AcrobaticMovementFailedFact[] = [];
  const predicates =
    mechanics.condition.kind === "all_of" &&
    mechanics.condition.predicates.length === 2
      ? mechanics.condition.predicates
      : null;
  const unarmored = predicates?.find(
    (predicate) => predicate.kind === "not_wearing_armor",
  );
  const unshielded = predicates?.find(
    (predicate) => predicate.kind === "not_wielding_shield",
  );
  if (
    unarmored?.kind !== "not_wearing_armor" ||
    !stringSetMatches(unarmored.categories, ["light", "medium", "heavy"]) ||
    unshielded?.kind !== "not_wielding_shield"
  ) {
    failedFacts.push("unsupportedEquipmentCondition");
  }
  if (mechanics.movement.timing !== "on_your_turn") {
    failedFacts.push("unsupportedMovementTiming");
  }
  if (
    mechanics.movement.verticalSurfaces.path !== "along_vertical_surfaces" ||
    mechanics.movement.verticalSurfaces.withoutFallingDuringMovement !== true
  ) {
    failedFacts.push("unsupportedVerticalSurfaceTraversal");
  }
  if (
    mechanics.movement.liquids.path !== "across_liquids" ||
    mechanics.movement.liquids.withoutFallingDuringMovement !== true
  ) {
    failedFacts.push("unsupportedLiquidTraversal");
  }
  return failedFacts.map(acrobaticMovementAdmissionIssue);
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

function stringSetMatches(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value) => expected.includes(value)) &&
    expected.every((value) => actual.includes(value))
  );
}
