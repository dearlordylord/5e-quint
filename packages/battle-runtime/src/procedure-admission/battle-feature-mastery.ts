import * as Either from "effect/Either";
import { Match } from "effect";

import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";

import type { CharacterBattleClassLevel } from "../character-class-level.ts";
import {
  admitBattleUnitSupportPlan,
  bindAdmittedBattleUnitSupportPlan,
  parseSupportedUnitFeatureProfile,
  type BattleUnitSupportProfile,
  type BattleUnitSupportProfileIssue,
  type BattleUnitSupportProfileSelectedOption,
  type BattleUnitSupportProfileSourceFacts,
  type SupportedUnitFeatureProfile,
} from "../unit-feature-support.ts";

/** The authored Unit roles that can own this Battle procedure family. */
export type BattleFeatureMasteryUnit = Extract<
  UnitRecord,
  {
    readonly kind: "class_feature" | "feat" | "mastery" | "species_trait";
  }
>;

export type BattleFeatureMasteryProcedure = {
  /** Typed Battle support facts projected from the admitted mechanics graph. */
  readonly supportProfiles: readonly BattleUnitSupportProfile[];
  /** The one feature projection parsed at this admission boundary, if any. */
  readonly featureProfile: SupportedUnitFeatureProfile | null;
};

export type BattleFeatureMasteryProcedureAdmissionIssue = {
  readonly tag: "battleFeatureMasteryProcedureAdmissionIssue";
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type BattleFeatureMasteryProcedureAdmissionResult =
  | {
      readonly tag: "admitted";
      readonly procedure: BattleFeatureMasteryProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<BattleFeatureMasteryProcedureAdmissionIssue>;
    };

export type BattleFeatureMasteryProcedureAdmissionInput = {
  readonly unit: UnitRecord;
  readonly classLevels?: readonly CharacterBattleClassLevel[];
  readonly selectedOption?: BattleUnitSupportProfileSelectedOption;
  readonly sourceFacts?: BattleUnitSupportProfileSourceFacts;
};

/**
 * Parse and bind a feature/mastery graph once at the Battle boundary. The
 * context-independent support plan is built first; Character facts then
 * specialize that plan and the existing feature projection is produced once
 * for the same admitted authored graph. No later operation reparses the Unit.
 */
export function admitBattleFeatureMasteryProcedure(
  input: BattleFeatureMasteryProcedureAdmissionInput,
): BattleFeatureMasteryProcedureAdmissionResult {
  const { unit } = input;
  if (!isBattleFeatureMasteryUnit(unit)) {
    return rejected(
      `Unit role ${unit.kind} does not own a Battle feature or mastery procedure.`,
    );
  }

  const plan = admitBattleUnitSupportPlan(unit);
  if (Either.isLeft(plan)) {
    return rejected(plan.left.message);
  }
  const support = bindAdmittedBattleUnitSupportPlan({
    plan: plan.right,
    binding: bindingInput(input),
  });
  if (Either.isLeft(support)) {
    return rejected(bindingIssue(support.left).message);
  }

  const featureProfile = parseSupportedUnitFeatureProfile(
    unit,
    input.classLevels ?? [],
    input.sourceFacts,
  );
  if (support.right.length === 0 && featureProfile === null) {
    return rejected(
      "The Unit graph has no executable Battle feature or mastery procedure.",
    );
  }
  return {
    tag: "admitted",
    procedure: {
      supportProfiles: support.right,
      featureProfile,
    },
  };
}

function bindingInput(input: BattleFeatureMasteryProcedureAdmissionInput): {
  readonly selectedOption?: BattleUnitSupportProfileSelectedOption;
  readonly classLevels?: readonly {
    readonly className: CharacterBattleClassLevel["className"];
    readonly level: number;
  }[];
  readonly sourceFacts?: BattleUnitSupportProfileSourceFacts;
} {
  const classLevels =
    input.classLevels === undefined
      ? undefined
      : input.classLevels.map((entry) => ({
          className: entry.className,
          level: Number(entry.level),
        }));
  return {
    ...(classLevels === undefined ? {} : { classLevels }),
    ...(input.selectedOption === undefined
      ? {}
      : { selectedOption: input.selectedOption }),
    ...(input.sourceFacts === undefined
      ? {}
      : { sourceFacts: input.sourceFacts }),
  };
}

export function isBattleFeatureMasteryUnit(
  unit: UnitRecord,
): unit is BattleFeatureMasteryUnit {
  return Match.value(unit.kind).pipe(
    Match.when("class_feature", () => true),
    Match.when("feat", () => true),
    Match.when("mastery", () => true),
    Match.when("species_trait", () => true),
    Match.orElse(() => false),
  );
}

function rootPath(): UnitMechanicsPath {
  return unitMechanicsPath([{ kind: "singleton", role: "recordMechanics" }]);
}

function rejected(
  message: string,
): BattleFeatureMasteryProcedureAdmissionResult {
  return {
    tag: "rejected",
    issues: [
      {
        tag: "battleFeatureMasteryProcedureAdmissionIssue",
        mechanicsPath: rootPath(),
        message,
      },
    ],
  };
}

function bindingIssue(
  issue: BattleUnitSupportProfileIssue,
): BattleFeatureMasteryProcedureAdmissionIssue {
  return {
    tag: "battleFeatureMasteryProcedureAdmissionIssue",
    mechanicsPath: rootPath(),
    message: issue.message,
  };
}
