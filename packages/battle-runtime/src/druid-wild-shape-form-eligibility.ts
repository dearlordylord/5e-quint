import type { StatBlockRecord } from "@dnd/surface/surface/types";
import type { BattleDruidWildShapeKnownFormSupportProfile } from "./unit-feature-support.ts";

export const WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_ISSUE_CODES = [
  "creatureType",
  "challengeRating",
  "flySpeed",
] as const;

export type WildShapeKnownFormEligibilityIssueCode =
  (typeof WILD_SHAPE_KNOWN_FORM_ELIGIBILITY_ISSUE_CODES)[number];

export type WildShapeKnownFormEligibilityIssue = {
  readonly code: WildShapeKnownFormEligibilityIssueCode;
};

export function wildShapeKnownFormEligibilityIssue(input: {
  readonly form: StatBlockRecord;
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): WildShapeKnownFormEligibilityIssue | undefined {
  if (
    input.form.statBlock.creatureType !==
    input.profile.knownFormRoster.creatureType
  ) {
    return { code: "creatureType" };
  }
  if (
    input.form.challengeRating > input.profile.knownFormRoster.maxChallengeRating
  ) {
    return { code: "challengeRating" };
  }
  if (
    input.profile.knownFormRoster.flySpeed === "forbidden" &&
    statBlockHasFlySpeed(input.form)
  ) {
    return { code: "flySpeed" };
  }
  return undefined;
}

export function statBlockIsWildShapeKnownFormEligible(input: {
  readonly form: StatBlockRecord;
  readonly profile: BattleDruidWildShapeKnownFormSupportProfile;
}): boolean {
  return wildShapeKnownFormEligibilityIssue(input) === undefined;
}

function statBlockHasFlySpeed(form: StatBlockRecord): boolean {
  return form.statBlock.speeds.some((speed) => speed.kind === "fly");
}
