import type { ClassLevel, ReadonlyNonEmptyArray } from "@dnd/shared/types";
import {
  unitMechanicsPath,
  type UnitMechanicsPath,
} from "@dnd/surface/surface/mechanics-graph-path";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import { Match } from "effect";

import type { CharacterBattleClassLevels } from "../character-class-level.ts";
import type { BattleResourcePoolExecutionRef } from "../identity.ts";

const FAILED_SAVING_THROW_REROLL_ROOT_MECHANICS_PATH = unitMechanicsPath([
  { kind: "singleton", role: "recordMechanics" },
]);

export type FailedSavingThrowRerollProcedureFacts = {
  readonly kind: "failedSavingThrowReroll";
  readonly savingThrow: {
    readonly trigger: "failedSavingThrow";
    readonly reroll: {
      readonly use: "newRoll";
      readonly bonus: {
        readonly kind: "classLevel";
        readonly className: "fighter";
      };
    };
  };
};

export type FailedSavingThrowRerollUseCountResourceProjection = {
  readonly kind: "use_count";
  readonly cap: {
    readonly kind: "threshold_tiers";
    readonly axis: "class";
    readonly base: 1;
    readonly tiers: readonly [
      { readonly atLevel: 13; readonly value: 2 },
      { readonly atLevel: 17; readonly value: 3 },
    ];
  };
  readonly resetCadence: { readonly kind: "long_rest" };
};

export type FailedSavingThrowRerollBindingRequirements = {
  readonly resource: { readonly kind: "sameSourceUseCountResource" };
  readonly classLevel: {
    readonly kind: "canonicalClassLevel";
    readonly className: "fighter";
  };
};

export type AdmittedFailedSavingThrowRerollProcedure = {
  readonly binding: {
    readonly tag: "required";
    readonly requirements: FailedSavingThrowRerollBindingRequirements;
  };
  readonly facts: FailedSavingThrowRerollProcedureFacts;
  readonly resource: FailedSavingThrowRerollUseCountResourceProjection;
  readonly evidence: {
    readonly consumed: readonly [UnitMechanicsPath];
    readonly unowned: readonly [];
  };
};

export type FailedSavingThrowRerollProcedureAdmissionIssue = {
  readonly tag: "failedSavingThrowRerollProcedureAdmissionIssue";
  readonly mechanicsPath: UnitMechanicsPath;
  readonly message: string;
};

export type FailedSavingThrowRerollProcedureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "admitted";
      readonly source: { readonly unitId: AuthoredUnitSource["id"] };
      readonly procedure: AdmittedFailedSavingThrowRerollProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<FailedSavingThrowRerollProcedureAdmissionIssue>;
    };

type FailedSavingThrowRerollInspection =
  | { readonly tag: "notRepresented" }
  | { readonly tag: "supported" }
  | { readonly tag: "unsupported" };

type FailedSavingThrowRerollMechanics = Extract<
  Extract<AuthoredUnitSource, { readonly kind: "class_feature" }>["mechanics"],
  { readonly family: "failed_saving_throw_reroll" }
>;
type FailedSavingThrowResourceThresholdTier = Extract<
  FailedSavingThrowRerollMechanics["resource"]["cap"],
  { readonly kind: "threshold_tiers" }
>["tiers"][number];

export function admitFailedSavingThrowRerollProcedure(
  unit: AuthoredUnitSource,
): FailedSavingThrowRerollProcedureAdmission {
  return Match.value(inspectFailedSavingThrowRerollRoot(unit)).pipe(
    Match.discriminatorsExhaustive("tag")({
      notRepresented: () => ({ tag: "notBattleOwned" as const }),
      unsupported: rejectedFailedSavingThrowRerollAdmission,
      supported: () => ({
        tag: "admitted" as const,
        source: { unitId: unit.id },
        procedure: admittedFailedSavingThrowRerollProcedure(),
      }),
    }),
  );
}

function inspectFailedSavingThrowRerollRoot(
  unit: AuthoredUnitSource,
): FailedSavingThrowRerollInspection {
  if (
    unit.kind !== "class_feature" ||
    unit.mechanics.family !== "failed_saving_throw_reroll"
  ) {
    return { tag: "notRepresented" };
  }
  const mechanics = unit.mechanics;
  return failedSavingThrowRerollRootIsSupported(mechanics)
    ? { tag: "supported" }
    : { tag: "unsupported" };
}

function failedSavingThrowRerollRootIsSupported(
  mechanics: FailedSavingThrowRerollMechanics,
): boolean {
  return (
    failedSavingThrowTriggerIsSupported(mechanics) &&
    failedSavingThrowRerollIsSupported(mechanics) &&
    failedSavingThrowResourceIsSupported(mechanics) &&
    mechanics.resetCadence.kind === "long_rest"
  );
}

function failedSavingThrowTriggerIsSupported(
  mechanics: FailedSavingThrowRerollMechanics,
): boolean {
  return mechanics.trigger.kind === "failed_saving_throw";
}

function failedSavingThrowRerollIsSupported(
  mechanics: FailedSavingThrowRerollMechanics,
): boolean {
  return (
    mechanics.reroll.mustUseNewRoll === true &&
    mechanics.reroll.bonus.kind === "class_level" &&
    mechanics.reroll.bonus.className === "fighter"
  );
}

function failedSavingThrowResourceIsSupported(
  mechanics: FailedSavingThrowRerollMechanics,
): boolean {
  if (mechanics.resource.kind !== "use_count") return false;
  return failedSavingThrowResourceCapIsSupported(mechanics.resource.cap);
}

function failedSavingThrowResourceCapIsSupported(
  cap: FailedSavingThrowRerollMechanics["resource"]["cap"],
): boolean {
  if (cap.kind !== "threshold_tiers") return false;
  const [levelThirteen, levelSeventeen, ...additionalTiers] = cap.tiers;
  return (
    cap.axis === "class" &&
    cap.base === 1 &&
    failedSavingThrowLevelThirteenTierIsSupported(levelThirteen) &&
    failedSavingThrowLevelSeventeenTierIsSupported(levelSeventeen) &&
    additionalTiers.length === 0
  );
}

function failedSavingThrowLevelThirteenTierIsSupported(
  tier: FailedSavingThrowResourceThresholdTier | undefined,
): boolean {
  return tier?.atLevel === 13 && tier.value === 2;
}

function failedSavingThrowLevelSeventeenTierIsSupported(
  tier: FailedSavingThrowResourceThresholdTier | undefined,
): boolean {
  return tier?.atLevel === 17 && tier.value === 3;
}

function admittedFailedSavingThrowRerollProcedure(): AdmittedFailedSavingThrowRerollProcedure {
  return {
    binding: {
      tag: "required",
      requirements: {
        resource: { kind: "sameSourceUseCountResource" },
        classLevel: {
          kind: "canonicalClassLevel",
          className: "fighter",
        },
      },
    },
    facts: {
      kind: "failedSavingThrowReroll",
      savingThrow: {
        trigger: "failedSavingThrow",
        reroll: {
          use: "newRoll",
          bonus: { kind: "classLevel", className: "fighter" },
        },
      },
    },
    resource: {
      kind: "use_count",
      cap: {
        kind: "threshold_tiers",
        axis: "class",
        base: 1,
        tiers: [
          { atLevel: 13, value: 2 },
          { atLevel: 17, value: 3 },
        ],
      },
      resetCadence: { kind: "long_rest" },
    },
    evidence: {
      consumed: [FAILED_SAVING_THROW_REROLL_ROOT_MECHANICS_PATH],
      unowned: [],
    },
  };
}

function failedSavingThrowRerollAdmissionIssue(): FailedSavingThrowRerollProcedureAdmissionIssue {
  return {
    tag: "failedSavingThrowRerollProcedureAdmissionIssue",
    mechanicsPath: FAILED_SAVING_THROW_REROLL_ROOT_MECHANICS_PATH,
    message:
      "The represented atomic failed Saving Throw reroll root is not completely supported by Battle.",
  };
}

function rejectedFailedSavingThrowRerollAdmission(): Extract<
  FailedSavingThrowRerollProcedureAdmission,
  { readonly tag: "rejected" }
> {
  return {
    tag: "rejected",
    issues: [failedSavingThrowRerollAdmissionIssue()],
  };
}

export type FailedSavingThrowRerollProcedureBindingInput = {
  readonly resourcePoolRefsByUnitId: ReadonlyMap<
    AuthoredUnitSource["id"],
    BattleResourcePoolExecutionRef
  >;
  readonly classLevels: CharacterBattleClassLevels;
};

export type FailedSavingThrowRerollProcedureBindingIssueReason =
  | "sameSourceResourceMissing"
  | "canonicalClassLevelMissing";

export type FailedSavingThrowRerollProcedureBindingIssue = {
  readonly tag: "failedSavingThrowRerollProcedureBindingIssue";
  readonly reason: FailedSavingThrowRerollProcedureBindingIssueReason;
  readonly message: string;
};

export type ReadyFailedSavingThrowRerollProcedure = {
  readonly binding: "ready";
  readonly execution: {
    readonly kind: "failedSavingThrowReroll";
    readonly savingThrow: {
      readonly trigger: "failedSavingThrow";
      readonly reroll: {
        readonly use: "newRoll";
        readonly bonus: {
          readonly kind: "classLevel";
          readonly className: "fighter";
          readonly level: ClassLevel;
        };
      };
      readonly spends: {
        readonly resourcePoolRef: BattleResourcePoolExecutionRef;
        readonly amount: 1;
      };
    };
  };
};

export type FailedSavingThrowRerollProcedureBinding =
  | {
      readonly tag: "bound";
      readonly procedure: ReadyFailedSavingThrowRerollProcedure;
    }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<FailedSavingThrowRerollProcedureBindingIssue>;
    };

export function bindFailedSavingThrowRerollProcedure(
  admitted: {
    readonly sourceUnitId: AuthoredUnitSource["id"];
    readonly facts: FailedSavingThrowRerollProcedureFacts;
  },
  input: FailedSavingThrowRerollProcedureBindingInput,
): FailedSavingThrowRerollProcedureBinding {
  const resource = resolveFailedSavingThrowRerollResourceBinding(
    admitted.sourceUnitId,
    input.resourcePoolRefsByUnitId,
  );
  const fighterLevel = resolveFailedSavingThrowRerollClassLevel(
    input.classLevels,
  );
  if (resource.tag === "issue") {
    return fighterLevel.tag === "issue"
      ? { tag: "rejected", issues: [resource.issue, fighterLevel.issue] }
      : { tag: "rejected", issues: [resource.issue] };
  }
  if (fighterLevel.tag === "issue") {
    return { tag: "rejected", issues: [fighterLevel.issue] };
  }
  return {
    tag: "bound",
    procedure: {
      binding: "ready",
      execution: {
        kind: admitted.facts.kind,
        savingThrow: {
          trigger: admitted.facts.savingThrow.trigger,
          reroll: {
            use: admitted.facts.savingThrow.reroll.use,
            bonus: {
              ...admitted.facts.savingThrow.reroll.bonus,
              level: fighterLevel.level,
            },
          },
          spends: {
            resourcePoolRef: resource.resourcePoolRef,
            amount: 1,
          },
        },
      },
    },
  };
}

type ResourceBindingResolution =
  | {
      readonly tag: "resolved";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    }
  | {
      readonly tag: "issue";
      readonly issue: FailedSavingThrowRerollProcedureBindingIssue;
    };

function resolveFailedSavingThrowRerollResourceBinding(
  sourceUnitId: AuthoredUnitSource["id"],
  resourcePoolRefsByUnitId: FailedSavingThrowRerollProcedureBindingInput["resourcePoolRefsByUnitId"],
): ResourceBindingResolution {
  const resourcePoolRef = resourcePoolRefsByUnitId.get(sourceUnitId);
  return resourcePoolRef === undefined
    ? {
        tag: "issue",
        issue: failedSavingThrowRerollBindingIssue(
          "sameSourceResourceMissing",
          "Failed Saving Throw reroll binding requires its same-source use-count resource.",
        ),
      }
    : { tag: "resolved", resourcePoolRef };
}

type ClassLevelBindingResolution =
  | { readonly tag: "resolved"; readonly level: ClassLevel }
  | {
      readonly tag: "issue";
      readonly issue: FailedSavingThrowRerollProcedureBindingIssue;
    };

function resolveFailedSavingThrowRerollClassLevel(
  classLevels: CharacterBattleClassLevels,
): ClassLevelBindingResolution {
  const fighterClassLevel = classLevels.find(
    (classLevelEntry) => classLevelEntry.className === "fighter",
  );
  return fighterClassLevel === undefined
    ? {
        tag: "issue",
        issue: failedSavingThrowRerollBindingIssue(
          "canonicalClassLevelMissing",
          "Failed Saving Throw reroll binding requires the canonical Fighter class level.",
        ),
      }
    : { tag: "resolved", level: fighterClassLevel.level };
}

function failedSavingThrowRerollBindingIssue(
  reason: FailedSavingThrowRerollProcedureBindingIssueReason,
  message: string,
): FailedSavingThrowRerollProcedureBindingIssue {
  return {
    tag: "failedSavingThrowRerollProcedureBindingIssue",
    reason,
    message,
  };
}
