import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { AuthoredUnitSource } from "@dnd/surface/surface/types";
import { Match } from "effect";

import type { CharacterBattleResourceExecutionFacts } from "../character-battle-resource-execution.ts";
import {
  admitDruidWildShapeProcedure,
  type AdmittedDruidWildShapeProcedure,
  type DruidWildShapeProcedureAdmission,
  type DruidWildShapeProcedureAdmissionIssue,
} from "./druid-wild-shape.ts";
import {
  admitFailedSavingThrowRerollProcedure,
  type AdmittedFailedSavingThrowRerollProcedure,
  type FailedSavingThrowRerollProcedureAdmission,
  type FailedSavingThrowRerollProcedureAdmissionIssue,
} from "./failed-saving-throw-reroll.ts";
import {
  admitMonkFocusProcedure,
  type AdmittedMonkFocusProcedure,
  type MonkFocusProcedureAdmission,
  type MonkFocusProcedureAdmissionIssue,
} from "./monk-focus.ts";

export type ResourceFeatureAdmissionIssue =
  | FailedSavingThrowRerollProcedureAdmissionIssue
  | DruidWildShapeProcedureAdmissionIssue
  | MonkFocusProcedureAdmissionIssue;

export type UnboundResourceFeatureProcedure =
  | {
      readonly kind: "failedSavingThrowReroll";
      readonly admitted: AdmittedFailedSavingThrowRerollProcedure;
    }
  | {
      readonly kind: "druidWildShape";
      readonly admitted: AdmittedDruidWildShapeProcedure;
    }
  | {
      readonly kind: "monkFocus";
      readonly admitted: AdmittedMonkFocusProcedure;
    };

export type AdmittedResourceFeature = {
  readonly sourceUnitId: AuthoredUnitSource["id"];
  readonly resource: CharacterBattleResourceExecutionFacts;
  readonly procedure: UnboundResourceFeatureProcedure;
};

export type ResourceFeatureAdmission =
  | { readonly tag: "notBattleOwned" }
  | {
      readonly tag: "rejected";
      readonly issues: ReadonlyNonEmptyArray<ResourceFeatureAdmissionIssue>;
    }
  | ({ readonly tag: "admitted" } & AdmittedResourceFeature);

export function admitResourceFeature(
  unit: AuthoredUnitSource,
): ResourceFeatureAdmission {
  const failedSavingThrowReroll = failedSavingThrowRerollAdmission(
    admitFailedSavingThrowRerollProcedure(unit),
  );
  if (failedSavingThrowReroll.tag !== "notBattleOwned") {
    return failedSavingThrowReroll;
  }

  const druidWildShape = druidWildShapeAdmission(
    admitDruidWildShapeProcedure(unit),
  );
  if (druidWildShape.tag !== "notBattleOwned") return druidWildShape;

  return monkFocusAdmission(admitMonkFocusProcedure(unit));
}

function failedSavingThrowRerollAdmission(
  admission: FailedSavingThrowRerollProcedureAdmission,
): ResourceFeatureAdmission {
  return Match.value(admission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: notBattleOwned,
      rejected: ({ issues }) => rejected(issues),
      admitted: ({ source, procedure }) =>
        admitted({
          sourceUnitId: source.unitId,
          resource: failedSavingThrowRerollResource(procedure),
          procedure: {
            kind: "failedSavingThrowReroll",
            admitted: procedure,
          },
        }),
    }),
  );
}

function druidWildShapeAdmission(
  admission: DruidWildShapeProcedureAdmission,
): ResourceFeatureAdmission {
  return Match.value(admission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: notBattleOwned,
      rejected: ({ issues }) => rejected(issues),
      admitted: ({ source, projection }) =>
        admitted({
          sourceUnitId: source.unitId,
          resource: druidWildShapeResource(projection),
          procedure: { kind: "druidWildShape", admitted: projection },
        }),
    }),
  );
}

function monkFocusAdmission(
  admission: MonkFocusProcedureAdmission,
): ResourceFeatureAdmission {
  return Match.value(admission).pipe(
    Match.discriminatorsExhaustive("tag")({
      notBattleOwned: notBattleOwned,
      rejected: ({ issues }) => rejected(issues),
      admitted: ({ source, procedure }) =>
        admitted({
          sourceUnitId: source.unitId,
          resource: monkFocusResource(procedure),
          procedure: { kind: "monkFocus", admitted: procedure },
        }),
    }),
  );
}

function notBattleOwned(): ResourceFeatureAdmission {
  return { tag: "notBattleOwned" };
}

function rejected(
  issues: ReadonlyNonEmptyArray<ResourceFeatureAdmissionIssue>,
): ResourceFeatureAdmission {
  return { tag: "rejected", issues };
}

function admitted(
  resourceFeature: AdmittedResourceFeature,
): ResourceFeatureAdmission {
  return { tag: "admitted", ...resourceFeature };
}

function failedSavingThrowRerollResource(
  procedure: AdmittedFailedSavingThrowRerollProcedure,
): CharacterBattleResourceExecutionFacts {
  return {
    kind: procedure.resource.kind,
    cap: procedure.resource.cap,
  };
}

function druidWildShapeResource(
  projection: AdmittedDruidWildShapeProcedure,
): CharacterBattleResourceExecutionFacts {
  return {
    kind: "use_count",
    cap: {
      kind: "threshold_tiers",
      axis: "class",
      base: projection.resource.cap.base,
      tiers: projection.resource.cap.tiers,
    },
  };
}

function monkFocusResource(
  procedure: AdmittedMonkFocusProcedure,
): CharacterBattleResourceExecutionFacts {
  return {
    kind: "use_count",
    cap: {
      kind: "linear_per_level",
      axis: "class",
      base: procedure.resource.cap.base,
      perLevel: procedure.resource.cap.perLevel,
      startingAtLevel: procedure.resource.cap.startingAtLevel,
    },
  };
}
