import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import { PositiveInteger, type ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import { Match } from "effect";

import type { CharacterBattleClassLevels } from "../character-class-level.ts";
import type { BattleResourcePoolExecutionRef } from "../identity.ts";

export const MONK_FOCUS_OPTION_PROCEDURE_KINDS = [
  "bonusActionUnarmedStrikeSequence",
  "bonusActionDefensiveModes",
  "bonusActionMobilityModes",
] as const;
export type MonkFocusOptionProcedureKind =
  (typeof MONK_FOCUS_OPTION_PROCEDURE_KINDS)[number];

export type MonkFocusResourceFacts = {
  readonly kind: "useCount";
  readonly cap: {
    readonly kind: "linearPerClassLevel";
    readonly className: "monk";
    readonly base: 2;
    readonly perLevel: 1;
    readonly startingAtLevel: 2;
  };
  readonly resetCadence: "shortOrLongRest";
};

export type MonkFocusSaveDcFacts = {
  readonly kind: "classFeatureAbilitySaveDc";
  readonly base: 8;
  readonly ability: "wis";
  readonly includesProficiencyBonus: true;
};

export type MonkFocusOptionProcedureFacts =
  | {
      readonly kind: "bonusActionUnarmedStrikeSequence";
      readonly focusPointCost: 1;
      readonly strikeCount: 2;
    }
  | {
      readonly kind: "bonusActionDefensiveModes";
      readonly freeAction: "disengage";
      readonly focusPointCost: 1;
      readonly focusActions: readonly ["disengage", "dodge"];
    }
  | {
      readonly kind: "bonusActionMobilityModes";
      readonly freeAction: "dash";
      readonly focusPointCost: 1;
      readonly focusActions: readonly ["disengage", "dash"];
      readonly jumpDistanceMultiplier: {
        readonly multiplier: 2;
        readonly expires: "endOfTurn";
      };
    };

export type MonkFocusProcedureFacts = {
  readonly kind: "monkFocusBattleOptions";
  readonly effectSaveDc: MonkFocusSaveDcFacts;
  readonly flurryOfBlows: Extract<
    MonkFocusOptionProcedureFacts,
    { readonly kind: "bonusActionUnarmedStrikeSequence" }
  >;
  readonly patientDefense: Extract<
    MonkFocusOptionProcedureFacts,
    { readonly kind: "bonusActionDefensiveModes" }
  >;
  readonly stepOfTheWind: Extract<
    MonkFocusOptionProcedureFacts,
    { readonly kind: "bonusActionMobilityModes" }
  >;
};

type MonkFocusRootPathEvidence<
  BranchKind extends "useCountResource" | "restResetCadence" | "saveDc",
> = {
  readonly disposition: "consumed";
  readonly branch: { readonly kind: BranchKind };
  readonly mechanicsPath: UnitMechanicsPath;
};

type MonkFocusOptionIdentityEvidence<
  ProcedureKind extends MonkFocusOptionProcedureKind,
> = {
  readonly disposition: "unowned";
  readonly branch: {
    readonly kind: "optionIdentity";
    readonly procedureKind: ProcedureKind;
  };
  readonly mechanicsPath: UnitMechanicsPath;
};

type MonkFocusOptionExecutionEvidence<
  ProcedureKind extends MonkFocusOptionProcedureKind,
> = {
  readonly disposition: "consumed";
  readonly branch: {
    readonly kind: "optionExecution";
    readonly procedureKind: ProcedureKind;
  };
  readonly mechanicsPath: UnitMechanicsPath;
};

export type MonkFocusProcedureEvidence = readonly [
  MonkFocusRootPathEvidence<"useCountResource">,
  MonkFocusRootPathEvidence<"restResetCadence">,
  MonkFocusRootPathEvidence<"saveDc">,
  MonkFocusOptionIdentityEvidence<"bonusActionUnarmedStrikeSequence">,
  MonkFocusOptionExecutionEvidence<"bonusActionUnarmedStrikeSequence">,
  MonkFocusOptionIdentityEvidence<"bonusActionDefensiveModes">,
  MonkFocusOptionExecutionEvidence<"bonusActionDefensiveModes">,
  MonkFocusOptionIdentityEvidence<"bonusActionMobilityModes">,
  MonkFocusOptionExecutionEvidence<"bonusActionMobilityModes">,
];

export type MonkFocusPathEvidence = MonkFocusProcedureEvidence[number];

export type AdmittedMonkFocusProcedure = {
  readonly binding: {
    readonly tag: "required";
    readonly requirements: {
      readonly resource: { readonly kind: "sameSourceUseCountResource" };
      readonly classLevel: {
        readonly kind: "canonicalClassLevel";
        readonly className: "monk";
      };
    };
  };
  readonly resource: MonkFocusResourceFacts;
  readonly facts: MonkFocusProcedureFacts;
  readonly evidence: MonkFocusProcedureEvidence;
};

export const MONK_FOCUS_ADMISSION_FAILED_FACTS = [
  "unsupportedUseCountResource",
  "unsupportedResetCadence",
  "unsupportedSaveDc",
  "unsupportedOptionTiming",
  "unexpectedOptionCount",
  "unsupportedOptionProcedure",
  "duplicateOptionProcedureKind",
  "missingOptionProcedureKind",
] as const;
export type MonkFocusAdmissionFailedFact =
  (typeof MONK_FOCUS_ADMISSION_FAILED_FACTS)[number];

type MonkFocusProcedureAdmissionIssueBase = {
  readonly tag: "monkFocusProcedureAdmissionIssue";
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

type MonkFocusRootAdmissionFailedFact = Exclude<
  MonkFocusAdmissionFailedFact,
  | "unsupportedOptionProcedure"
  | "duplicateOptionProcedureKind"
  | "missingOptionProcedureKind"
>;

export type MonkFocusProcedureAdmissionIssue =
  | (MonkFocusProcedureAdmissionIssueBase & {
      readonly failedFact: MonkFocusRootAdmissionFailedFact;
      readonly procedureKind?: never;
    })
  | (MonkFocusProcedureAdmissionIssueBase & {
      readonly failedFact: "unsupportedOptionProcedure";
    })
  | (MonkFocusProcedureAdmissionIssueBase & {
      readonly failedFact:
        | "unsupportedOptionProcedure"
        | "duplicateOptionProcedureKind"
        | "missingOptionProcedureKind";
      readonly procedureKind: MonkFocusOptionProcedureKind;
    });

export type MonkFocusProcedureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly source: { readonly unitId: AuthoredUnitSource["id"] };
      readonly procedure: AdmittedMonkFocusProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<MonkFocusProcedureAdmissionIssue>;
    };

type ResourceContainerMechanics = Extract<
  Extract<AuthoredUnitSource, { readonly kind: "class_feature" }>["mechanics"],
  { readonly family: "resource_container" }
>;
type MonkFocusBattleExecution = NonNullable<
  ResourceContainerMechanics["optionSet"]["initialOptions"][number]["battleExecution"]
>;

type OptionObservation =
  | {
      readonly ordinal: number;
      readonly procedureKind: null;
      readonly supported: false;
    }
  | {
      readonly ordinal: number;
      readonly procedureKind: MonkFocusOptionProcedureKind;
      readonly supported: boolean;
    };

type RecognizedOptionInspection = Omit<
  Extract<OptionObservation, { readonly procedureKind: string }>,
  "ordinal"
>;

export function admitMonkFocusProcedure(
  unit: AuthoredUnitSource,
): MonkFocusProcedureAdmission {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "resource_container"
  ) {
    return { tag: "notBattleOwned" };
  }
  const mechanics = unit.mechanics;
  const observations = inspectOptionProcedures(mechanics);
  if (!observations.some(({ procedureKind }) => procedureKind !== null)) {
    return { tag: "notBattleOwned" };
  }
  const issues = monkFocusAdmissionIssues(mechanics, observations);
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return { tag: "rejected", issues: [firstIssue, ...remainingIssues] };
  }
  return {
    tag: "admitted",
    source: { unitId: unit.id },
    procedure: admittedMonkFocusProcedure(observations),
  };
}

function inspectOptionProcedures(
  mechanics: ResourceContainerMechanics,
): readonly OptionObservation[] {
  return mechanics.optionSet.initialOptions.map((option, index) => {
    const inspection = inspectMonkFocusOptionProcedure(option.battleExecution);
    return inspection === null
      ? { ordinal: index + 1, procedureKind: null, supported: false }
      : { ordinal: index + 1, ...inspection };
  });
}

function inspectMonkFocusOptionProcedure(
  execution: MonkFocusBattleExecution | undefined,
): RecognizedOptionInspection | null {
  if (execution === undefined) return null;
  return Match.value(execution).pipe(
    Match.discriminatorsExhaustive("kind")({
      bonus_action_unarmed_strike_sequence: (value) =>
        optionInspection(
          "bonusActionUnarmedStrikeSequence",
          value.focusPointCost === 1 && value.strikeCount === 2,
        ),
      bonus_action_defensive_modes: (value) =>
        optionInspection(
          "bonusActionDefensiveModes",
          value.freeAction === "disengage" &&
            value.focusPointCost === 1 &&
            value.focusActions.length === 2 &&
            value.focusActions[0] === "disengage" &&
            value.focusActions[1] === "dodge",
        ),
      bonus_action_mobility_modes: (value) =>
        optionInspection(
          "bonusActionMobilityModes",
          value.freeAction === "dash" &&
            value.focusPointCost === 1 &&
            value.focusActions.length === 2 &&
            value.focusActions[0] === "disengage" &&
            value.focusActions[1] === "dash" &&
            value.jumpDistanceMultiplier.multiplier === 2 &&
            value.jumpDistanceMultiplier.expires === "end_of_turn",
        ),
    }),
  );
}

function optionInspection(
  procedureKind: MonkFocusOptionProcedureKind,
  supported: boolean,
): RecognizedOptionInspection {
  return { procedureKind, supported };
}

function monkFocusAdmissionIssues(
  mechanics: ResourceContainerMechanics,
  observations: readonly OptionObservation[],
): readonly MonkFocusProcedureAdmissionIssue[] {
  const issues: MonkFocusProcedureAdmissionIssue[] = [];
  if (!monkFocusResourceIsSupported(mechanics)) {
    issues.push(
      rootAdmissionIssue(
        "unsupportedUseCountResource",
        resourcePath(),
        "Monk Focus requires its class-level use-count resource.",
      ),
    );
  }
  if (mechanics.resetCadence.kind !== "short_or_long_rest") {
    issues.push(
      rootAdmissionIssue(
        "unsupportedResetCadence",
        generalFactPath(1),
        "Monk Focus requires full recovery on a Short or Long Rest.",
      ),
    );
  }
  if (!monkFocusSaveDcIsSupported(mechanics)) {
    issues.push(
      rootAdmissionIssue(
        "unsupportedSaveDc",
        generalFactPath(2),
        "Monk Focus requires its Wisdom-based class-feature save DC.",
      ),
    );
  }
  if (mechanics.optionSet.timing !== "resource_use") {
    issues.push(
      rootAdmissionIssue(
        "unsupportedOptionTiming",
        rootMechanicsPath(),
        "Monk Focus options must be selected when the resource is used.",
      ),
    );
  }
  if (observations.length !== MONK_FOCUS_OPTION_PROCEDURE_KINDS.length) {
    issues.push(
      rootAdmissionIssue(
        "unexpectedOptionCount",
        rootMechanicsPath(),
        "Monk Focus requires exactly three option procedures.",
      ),
    );
  }
  for (const observation of observations) {
    if (observation.procedureKind === null || !observation.supported) {
      const mechanicsPath = effectPath(observation.ordinal);
      const message =
        "Each Monk Focus option requires one completely supported execution procedure.";
      issues.push(
        observation.procedureKind === null
          ? unrecognizedOptionProcedureIssue(mechanicsPath, message)
          : procedureAdmissionIssue(
              "unsupportedOptionProcedure",
              observation.procedureKind,
              mechanicsPath,
              message,
            ),
      );
    }
  }
  for (const procedureKind of MONK_FOCUS_OPTION_PROCEDURE_KINDS) {
    const matching = observations.filter(
      (observation) => observation.procedureKind === procedureKind,
    );
    if (matching.length === 0) {
      issues.push(
        procedureAdmissionIssue(
          "missingOptionProcedureKind",
          procedureKind,
          rootMechanicsPath(),
          `Monk Focus requires the ${procedureKind} procedure.`,
        ),
      );
    }
    for (const duplicate of matching.slice(1)) {
      issues.push(
        procedureAdmissionIssue(
          "duplicateOptionProcedureKind",
          procedureKind,
          effectPath(duplicate.ordinal),
          `Monk Focus must not repeat the ${procedureKind} procedure.`,
        ),
      );
    }
  }
  return issues;
}

function monkFocusResourceIsSupported(
  mechanics: ResourceContainerMechanics,
): boolean {
  const resource = mechanics.resource;
  return (
    resource.kind === "use_count" &&
    resource.cap.kind === "linear_per_level" &&
    resource.cap.axis === "class" &&
    resource.cap.base === 2 &&
    resource.cap.perLevel === 1 &&
    resource.cap.startingAtLevel === 2
  );
}

function monkFocusSaveDcIsSupported(
  mechanics: ResourceContainerMechanics,
): boolean {
  return (
    mechanics.effectSaveDc?.kind === "class_feature_ability_save_dc" &&
    mechanics.effectSaveDc.base === 8 &&
    mechanics.effectSaveDc.ability === "wis"
  );
}

function admittedMonkFocusProcedure(
  observations: readonly OptionObservation[],
): AdmittedMonkFocusProcedure {
  const evidence = monkFocusEvidence(observations);
  /* v8 ignore start -- @preserve -- The immediately preceding admission issue pass proves one supported observation for each required procedure kind. */
  if (evidence === null) {
    throw new Error(
      "Admitted Monk Focus observations must cover every procedure kind.",
    );
  }
  /* v8 ignore stop -- @preserve */
  return {
    binding: {
      tag: "required",
      requirements: {
        resource: { kind: "sameSourceUseCountResource" },
        classLevel: { kind: "canonicalClassLevel", className: "monk" },
      },
    },
    resource: {
      kind: "useCount",
      cap: {
        kind: "linearPerClassLevel",
        className: "monk",
        base: 2,
        perLevel: 1,
        startingAtLevel: 2,
      },
      resetCadence: "shortOrLongRest",
    },
    facts: monkFocusProcedureFacts(),
    evidence,
  };
}

function monkFocusProcedureFacts(): MonkFocusProcedureFacts {
  return {
    kind: "monkFocusBattleOptions",
    effectSaveDc: {
      kind: "classFeatureAbilitySaveDc",
      base: 8,
      ability: "wis",
      includesProficiencyBonus: true,
    },
    flurryOfBlows: {
      kind: "bonusActionUnarmedStrikeSequence",
      focusPointCost: 1,
      strikeCount: 2,
    },
    patientDefense: {
      kind: "bonusActionDefensiveModes",
      freeAction: "disengage",
      focusPointCost: 1,
      focusActions: ["disengage", "dodge"],
    },
    stepOfTheWind: {
      kind: "bonusActionMobilityModes",
      freeAction: "dash",
      focusPointCost: 1,
      focusActions: ["disengage", "dash"],
      jumpDistanceMultiplier: { multiplier: 2, expires: "endOfTurn" },
    },
  };
}

function monkFocusEvidence(
  observations: readonly OptionObservation[],
): MonkFocusProcedureEvidence | null {
  const unarmedStrike = observationForProcedureKind(
    observations,
    "bonusActionUnarmedStrikeSequence",
  );
  const defensiveModes = observationForProcedureKind(
    observations,
    "bonusActionDefensiveModes",
  );
  const mobilityModes = observationForProcedureKind(
    observations,
    "bonusActionMobilityModes",
  );
  if (
    unarmedStrike === undefined ||
    defensiveModes === undefined ||
    mobilityModes === undefined
  ) {
    return null;
  }
  return [
    {
      disposition: "consumed",
      branch: { kind: "useCountResource" },
      mechanicsPath: resourcePath(),
    },
    {
      disposition: "consumed",
      branch: { kind: "restResetCadence" },
      mechanicsPath: generalFactPath(1),
    },
    {
      disposition: "consumed",
      branch: { kind: "saveDc" },
      mechanicsPath: generalFactPath(2),
    },
    ...monkFocusOptionEvidence(
      unarmedStrike,
      "bonusActionUnarmedStrikeSequence",
    ),
    ...monkFocusOptionEvidence(defensiveModes, "bonusActionDefensiveModes"),
    ...monkFocusOptionEvidence(mobilityModes, "bonusActionMobilityModes"),
  ];
}

function observationForProcedureKind<
  ProcedureKind extends MonkFocusOptionProcedureKind,
>(
  observations: readonly OptionObservation[],
  procedureKind: ProcedureKind,
): (OptionObservation & { readonly procedureKind: ProcedureKind }) | undefined {
  const observation = observations.find(
    (candidate) => candidate.procedureKind === procedureKind,
  );
  return observation?.procedureKind === procedureKind
    ? { ...observation, procedureKind }
    : undefined;
}

function monkFocusOptionEvidence<
  ProcedureKind extends MonkFocusOptionProcedureKind,
>(
  observation: OptionObservation & { readonly procedureKind: ProcedureKind },
  procedureKind: ProcedureKind,
): readonly [
  MonkFocusOptionIdentityEvidence<ProcedureKind>,
  MonkFocusOptionExecutionEvidence<ProcedureKind>,
] {
  return [
    {
      disposition: "unowned",
      branch: { kind: "optionIdentity", procedureKind },
      mechanicsPath: generalFactPath(observation.ordinal + 2),
    },
    {
      disposition: "consumed",
      branch: { kind: "optionExecution", procedureKind },
      mechanicsPath: effectPath(observation.ordinal),
    },
  ];
}

function rootAdmissionIssue(
  failedFact: MonkFocusRootAdmissionFailedFact,
  mechanicsPath: UnitMechanicsPath,
  message: string,
): MonkFocusProcedureAdmissionIssue {
  return {
    tag: "monkFocusProcedureAdmissionIssue",
    failedFact,
    mechanicsPath,
    message,
  };
}

function unrecognizedOptionProcedureIssue(
  mechanicsPath: UnitMechanicsPath,
  message: string,
): MonkFocusProcedureAdmissionIssue {
  return {
    tag: "monkFocusProcedureAdmissionIssue",
    failedFact: "unsupportedOptionProcedure",
    mechanicsPath,
    message,
  };
}

function procedureAdmissionIssue(
  failedFact:
    | "unsupportedOptionProcedure"
    | "duplicateOptionProcedureKind"
    | "missingOptionProcedureKind",
  procedureKind: MonkFocusOptionProcedureKind,
  mechanicsPath: UnitMechanicsPath,
  message: string,
): MonkFocusProcedureAdmissionIssue {
  return {
    tag: "monkFocusProcedureAdmissionIssue",
    failedFact,
    procedureKind,
    mechanicsPath,
    message,
  };
}

export type MonkFocusProcedureBindingInput = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    AuthoredUnitSource["id"],
    BattleResourcePoolExecutionRef
  >;
  readonly classLevels: CharacterBattleClassLevels;
};

export const MONK_FOCUS_BINDING_ISSUE_REASONS = [
  "sameSourceResourceMissing",
  "canonicalMonkClassLevelMissing",
] as const;
export type MonkFocusBindingIssueReason =
  (typeof MONK_FOCUS_BINDING_ISSUE_REASONS)[number];

export type MonkFocusProcedureBindingIssue = {
  readonly tag: "monkFocusProcedureBindingIssue";
  readonly reason: MonkFocusBindingIssueReason;
  readonly message: string;
};

export type ReadyMonkFocusProcedure = {
  readonly binding: "ready";
  readonly source: {
    readonly kind: "resourcePool";
    readonly resourcePoolRef: BattleResourcePoolExecutionRef;
  };
  readonly facts: MonkFocusProcedureFacts;
};

export type MonkFocusProcedureBinding =
  | { readonly tag: "bound"; readonly procedure: ReadyMonkFocusProcedure }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<MonkFocusProcedureBindingIssue>;
    };

export function bindMonkFocusProcedure(
  admitted: {
    readonly sourceUnitId: AuthoredUnitSource["id"];
    readonly procedure: AdmittedMonkFocusProcedure;
  },
  input: MonkFocusProcedureBindingInput,
): MonkFocusProcedureBinding {
  const resourcePoolRef = input.resourcePoolRefsByUnitId.get(
    admitted.sourceUnitId,
  );
  const monkClassLevelMissing = !input.classLevels.some(
    (classLevelEntry) => classLevelEntry.className === "monk",
  );
  const missingResourceIssue: MonkFocusProcedureBindingIssue = {
    tag: "monkFocusProcedureBindingIssue",
    reason: "sameSourceResourceMissing",
    message: "Monk Focus binding requires its same-source use-count resource.",
  };
  const missingClassLevelIssue: MonkFocusProcedureBindingIssue = {
    tag: "monkFocusProcedureBindingIssue",
    reason: "canonicalMonkClassLevelMissing",
    message: "Monk Focus binding requires the canonical Monk class level.",
  };
  if (resourcePoolRef === undefined) {
    return {
      tag: "rejected",
      issues: monkClassLevelMissing
        ? [missingResourceIssue, missingClassLevelIssue]
        : [missingResourceIssue],
    };
  }
  if (monkClassLevelMissing) {
    return { tag: "rejected", issues: [missingClassLevelIssue] };
  }
  return {
    tag: "bound",
    procedure: {
      binding: "ready",
      source: { kind: "resourcePool", resourcePoolRef },
      facts: admitted.procedure.facts,
    },
  };
}

function rootMechanicsPath(): UnitMechanicsPath {
  return unitMechanicsPath([{ kind: "singleton", role: "recordMechanics" }]);
}

function resourcePath(): UnitMechanicsPath {
  return unitMechanicsPath([
    { kind: "singleton", role: "recordMechanics" },
    { kind: "singleton", role: "resource" },
  ]);
}

function generalFactPath(ordinal: number): UnitMechanicsPath {
  return childOccurrencePath("generalFact", ordinal);
}

function effectPath(ordinal: number): UnitMechanicsPath {
  return childOccurrencePath("effect", ordinal);
}

function childOccurrencePath(
  role: "generalFact" | "effect",
  ordinal: number,
): UnitMechanicsPath {
  return unitMechanicsPath([
    { kind: "singleton", role: "recordMechanics" },
    { kind: "occurrence", role, ordinal: PositiveInteger(ordinal) },
  ]);
}
