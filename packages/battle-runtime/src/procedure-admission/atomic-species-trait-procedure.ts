import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import { Match } from "effect";

import type { UnitFeatureProcedureExecution } from "../character-execution-vocabulary.ts";

export type AtomicSpeciesTraitProcedureFacts = Extract<
  UnitFeatureProcedureExecution,
  {
    readonly kind:
      | "creatureSpaceMovementPermission"
      | "d20TestNaturalOneReroll"
      | "hideActionObscurementPermission";
  }
>;

const ATOMIC_SPECIES_TRAIT_ROOT_MECHANICS_PATH = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
]);

const CREATURE_SPACE_MOVEMENT_FAILED_FACTS = [
  "movementTarget",
  "occupiedSpaceStopping",
] as const;
type CreatureSpaceMovementFailedFact =
  (typeof CREATURE_SPACE_MOVEMENT_FAILED_FACTS)[number];

const NATURAL_ONE_REROLL_FAILED_FACTS = [
  "rerollOptionality",
  "rerollTrigger",
  "rerollUse",
] as const;
type NaturalOneRerollFailedFact =
  (typeof NATURAL_ONE_REROLL_FAILED_FACTS)[number];

const HIDE_OBSCUREMENT_FAILED_FACTS = [
  "hideAction",
  "hideObscurement",
] as const;
type HideObscurementFailedFact = (typeof HIDE_OBSCUREMENT_FAILED_FACTS)[number];

type AtomicSpeciesTraitProcedureAdmissionIssueFields = {
  readonly tag: "atomicSpeciesTraitProcedureAdmissionIssue";
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type AtomicSpeciesTraitProcedureAdmissionIssue =
  | (AtomicSpeciesTraitProcedureAdmissionIssueFields & {
      readonly procedure: "creatureSpaceMovementPermission";
      readonly failedFact: CreatureSpaceMovementFailedFact;
    })
  | (AtomicSpeciesTraitProcedureAdmissionIssueFields & {
      readonly procedure: "d20TestNaturalOneReroll";
      readonly failedFact: NaturalOneRerollFailedFact;
    })
  | (AtomicSpeciesTraitProcedureAdmissionIssueFields & {
      readonly procedure: "hideActionObscurementPermission";
      readonly failedFact: HideObscurementFailedFact;
    });

export type AdmittedAtomicSpeciesTraitProcedure = {
  readonly binding: "ready";
  readonly facts: AtomicSpeciesTraitProcedureFacts;
  readonly evidence: {
    readonly consumed: readonly [UnitMechanicsPath];
    readonly unowned: readonly [];
  };
};

export type AtomicSpeciesTraitProcedureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly procedure: AdmittedAtomicSpeciesTraitProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<AtomicSpeciesTraitProcedureAdmissionIssue>;
    };

type ProcedureInspection =
  | { readonly tag: "notRepresented" }
  | {
      readonly tag: "supported";
      readonly facts: AtomicSpeciesTraitProcedureFacts;
    }
  | {
      readonly tag: "unsupported";
      readonly issues: ReadonlyNonEmptyArray<AtomicSpeciesTraitProcedureAdmissionIssue>;
    };

export function admitAtomicSpeciesTraitProcedure(
  unit: AuthoredUnitSource,
): AtomicSpeciesTraitProcedureAdmission {
  const inspections = [
    inspectCreatureSpaceMovementPermission(unit),
    inspectD20TestNaturalOneReroll(unit),
    inspectHideActionObscurementPermission(unit),
  ];
  const represented = inspections.find(isRepresentedProcedureInspection);
  if (represented === undefined) return { tag: "notBattleOwned" };
  return Match.value(represented).pipe(
    Match.discriminatorsExhaustive("tag")({
      supported: ({ facts }) => admittedProcedure(facts),
      unsupported: ({ issues }) => rejectedProcedure(issues),
    }),
  );
}

function rejectedProcedure(
  issues: ReadonlyNonEmptyArray<AtomicSpeciesTraitProcedureAdmissionIssue>,
): Extract<AtomicSpeciesTraitProcedureAdmission, { readonly tag: "rejected" }> {
  return { tag: "rejected", issues };
}

function admittedProcedure(
  facts: AtomicSpeciesTraitProcedureFacts,
): Extract<AtomicSpeciesTraitProcedureAdmission, { readonly tag: "admitted" }> {
  return {
    tag: "admitted",
    procedure: {
      binding: "ready",
      facts,
      evidence: {
        consumed: [ATOMIC_SPECIES_TRAIT_ROOT_MECHANICS_PATH],
        unowned: [],
      },
    },
  };
}

function isRepresentedProcedureInspection(
  inspection: ProcedureInspection,
): inspection is Exclude<
  ProcedureInspection,
  { readonly tag: "notRepresented" }
> {
  return inspection.tag !== "notRepresented";
}

function unsupportedProcedureIssueFields(): AtomicSpeciesTraitProcedureAdmissionIssueFields {
  return {
    tag: "atomicSpeciesTraitProcedureAdmissionIssue",
    mechanicsPath: ATOMIC_SPECIES_TRAIT_ROOT_MECHANICS_PATH,
    message:
      "The represented atomic species-trait procedure is not completely supported by Battle.",
  };
}

function creatureSpaceMovementIssue(
  failedFact: CreatureSpaceMovementFailedFact,
): AtomicSpeciesTraitProcedureAdmissionIssue {
  return {
    ...unsupportedProcedureIssueFields(),
    procedure: "creatureSpaceMovementPermission",
    failedFact,
  };
}

function naturalOneRerollIssue(
  failedFact: NaturalOneRerollFailedFact,
): AtomicSpeciesTraitProcedureAdmissionIssue {
  return {
    ...unsupportedProcedureIssueFields(),
    procedure: "d20TestNaturalOneReroll",
    failedFact,
  };
}

function hideObscurementIssue(
  failedFact: HideObscurementFailedFact,
): AtomicSpeciesTraitProcedureAdmissionIssue {
  return {
    ...unsupportedProcedureIssueFields(),
    procedure: "hideActionObscurementPermission",
    failedFact,
  };
}

function inspectCreatureSpaceMovementPermission(
  unit: AuthoredUnitSource,
): ProcedureInspection {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "creature_space_movement_permission"
  ) {
    return { tag: "notRepresented" };
  }
  const mechanics = unit.mechanics;
  const issues: AtomicSpeciesTraitProcedureAdmissionIssue[] = [];
  if (
    mechanics.moveThrough.kind !== "occupied_creature_space" ||
    mechanics.moveThrough.creatureSizeRelationToSelf !== "larger"
  ) {
    issues.push(creatureSpaceMovementIssue("movementTarget"));
  }
  if (mechanics.canStopInOccupiedSpace !== false) {
    issues.push(creatureSpaceMovementIssue("occupiedSpaceStopping"));
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? {
        tag: "supported",
        facts: {
          kind: "creatureSpaceMovementPermission",
          permission: {
            moveThrough: {
              kind: "occupiedCreatureSpace",
              creatureSizeRelationToSelf: "larger",
            },
            canStopInOccupiedSpace: false,
          },
        },
      }
    : {
        tag: "unsupported",
        issues: [firstIssue, ...remainingIssues],
      };
}

function inspectD20TestNaturalOneReroll(
  unit: AuthoredUnitSource,
): ProcedureInspection {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "d20_test_natural_one_reroll"
  ) {
    return { tag: "notRepresented" };
  }
  const mechanics = unit.mechanics;
  const issues: AtomicSpeciesTraitProcedureAdmissionIssue[] = [];
  if (mechanics.optional !== true) {
    issues.push(naturalOneRerollIssue("rerollOptionality"));
  }
  if (
    mechanics.trigger.kind !== "d20_test_roll_is" ||
    mechanics.trigger.dieFace !== 1
  ) {
    issues.push(naturalOneRerollIssue("rerollTrigger"));
  }
  if (
    mechanics.reroll.kind !== "reroll_triggering_d20" ||
    mechanics.reroll.use !== "new_roll"
  ) {
    issues.push(naturalOneRerollIssue("rerollUse"));
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? {
        tag: "supported",
        facts: {
          kind: "d20TestNaturalOneReroll",
          reroll: {
            optional: true,
            trigger: { kind: "d20TestRollIs", dieFace: 1 },
            reroll: { kind: "triggeringD20", use: "newRoll" },
          },
        },
      }
    : {
        tag: "unsupported",
        issues: [firstIssue, ...remainingIssues],
      };
}

function inspectHideActionObscurementPermission(
  unit: AuthoredUnitSource,
): ProcedureInspection {
  if (
    unit.kind !== "species_trait" ||
    unit.mechanics.family !== "hide_action_obscurement_permission"
  ) {
    return { tag: "notRepresented" };
  }
  const mechanics = unit.mechanics;
  const issues: AtomicSpeciesTraitProcedureAdmissionIssue[] = [];
  if (mechanics.action !== "hide") {
    issues.push(hideObscurementIssue("hideAction"));
  }
  if (
    mechanics.allowedObscurement.kind !== "obscured_only_by_creature" ||
    mechanics.allowedObscurement.creatureSizeRelationToSelf !==
      "at_least_one_size_larger"
  ) {
    issues.push(hideObscurementIssue("hideObscurement"));
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? {
        tag: "supported",
        facts: {
          kind: "hideActionObscurementPermission",
          permission: {
            allowedObscurement: {
              kind: "obscuredOnlyByCreature",
              creatureSizeRelationToSelf: "atLeastOneSizeLarger",
            },
          },
        },
      }
    : {
        tag: "unsupported",
        issues: [firstIssue, ...remainingIssues],
      };
}
