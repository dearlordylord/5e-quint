import { Match } from "effect";

import type {
  ProjectedAmount,
  ProjectedExecutableAttachment,
  ProjectedSaveDc,
  ProjectedSource,
} from "#/projected-executable.ts";
import type {
  ProjectedAmountResolution,
  ProjectedInterpreterActor,
  ProjectedResolvedAmount,
  ProjectedTargetResolution,
} from "#/projected-mechanic-interpreter-types.ts";

function uniqueTargetIds(
  source: ProjectedSource,
  label: string,
  targetIds: ReadonlyArray<string>,
  fail: (source: ProjectedSource, message: string) => never,
): ReadonlyArray<string> {
  const seen = new Set<string>();
  for (const targetId of targetIds) {
    if (seen.has(targetId)) {
      fail(source, `${label} duplicated target ${targetId}`);
    }
    seen.add(targetId);
  }
  return targetIds;
}

export function requireTargets(
  source: ProjectedSource,
  targetIds: ReadonlyArray<string>,
  fail: (source: ProjectedSource, message: string) => never,
): ReadonlyArray<string> {
  if (targetIds.length === 0) {
    fail(source, "projected action requires at least one resolved target");
  }
  return targetIds;
}

export function validateAttachmentResolution(
  source: ProjectedSource,
  actor: ProjectedInterpreterActor,
  attachment: ProjectedExecutableAttachment,
  resolved: ReadonlyArray<string>,
  fail: (source: ProjectedSource, message: string) => never,
): ReadonlyArray<string> {
  const targetIds = uniqueTargetIds(source, "attachment resolution", resolved, fail);
  return Match.value(attachment.tag).pipe(
    Match.when("PEASelf", () => {
      if (targetIds.length !== 1 || targetIds[0] !== actor.actorId) {
        fail(source, `self attachment must resolve to ${actor.actorId}`);
      }
      return targetIds;
    }),
    Match.when("PEAOneTarget", () => {
      if (targetIds.length !== 1) {
        fail(source, "one-target attachment must resolve exactly one target");
      }
      return targetIds;
    }),
    Match.when("PEAAreaSpherePointWithinRange", () => targetIds),
    Match.exhaustive,
  );
}

export function validateOutcomeTargets<TOutcome extends string>(
  source: ProjectedSource,
  targetIds: ReadonlyArray<string>,
  outcomes: ReadonlyArray<ProjectedTargetResolution<TOutcome>>,
  fail: (source: ProjectedSource, message: string) => never,
): ReadonlyArray<ProjectedTargetResolution<TOutcome>> {
  const allowed = new Set(targetIds);
  uniqueTargetIds(
    source,
    "outcome resolution",
    outcomes.map((outcome) => outcome.targetId),
    fail,
  );
  for (const outcome of outcomes) {
    if (!allowed.has(outcome.targetId)) {
      fail(source, `resolved unknown target ${outcome.targetId}`);
    }
  }
  if (outcomes.length !== targetIds.length) {
    fail(source, "must resolve exactly one outcome per target");
  }
  return outcomes;
}

export function validateAmountResolutions(
  source: ProjectedSource,
  targetIds: ReadonlyArray<string>,
  resolutions: ReadonlyArray<ProjectedAmountResolution>,
  fail: (source: ProjectedSource, message: string) => never,
): ReadonlyArray<ProjectedAmountResolution> {
  const allowed = new Set(targetIds);
  uniqueTargetIds(
    source,
    "amount resolution",
    resolutions.map((resolution) => resolution.targetId),
    fail,
  );
  for (const resolution of resolutions) {
    if (!allowed.has(resolution.targetId)) {
      fail(source, `resolved amount for unknown target ${resolution.targetId}`);
    }
    if (resolution.rolledTotal != null && resolution.rolledTotal < 0) {
      fail(source, `resolved negative rolled total for ${resolution.targetId}`);
    }
  }
  if (resolutions.length !== targetIds.length) {
    fail(source, "must resolve exactly one amount per target");
  }
  return resolutions;
}

function axisLevel(
  actor: ProjectedInterpreterActor,
  axis: ProjectedAmount["value"]["axis"],
): number {
  return Match.value(axis).pipe(
    Match.when("PLACharacterLevel", () => actor.characterLevel),
    Match.when("PLAFighterLevel", () => actor.fighterLevel),
    Match.exhaustive,
  );
}

export function resolveAmount(
  actor: ProjectedInterpreterActor,
  amount: ProjectedAmount,
): ProjectedResolvedAmount {
  return Match.value(amount).pipe(
    Match.when({ tag: "PAThresholdDice" }, ({ value }) => {
      const level = axisLevel(actor, value.axis);
      const dice = value.tiers.reduce<number>(
        (current, tier) =>
          level >= tier.atLevel ? tier.diceOverride : current,
        value.base.dice,
      );
      return {
        dice,
        dieSize: value.base.dieSize,
        flat: value.base.flat,
      };
    }),
    Match.when({ tag: "PALinearDicePlusLevel" }, ({ value }) => {
      const level = axisLevel(actor, value.axis);
      return {
        dice: value.base.dice,
        dieSize: value.base.dieSize,
        flat:
          value.base.flat +
          Math.max(0, level - value.startingAtLevel) * value.perLevelFlat,
      };
    }),
    Match.exhaustive,
  );
}

export function resolveSaveDc(
  source: ProjectedSource,
  actor: ProjectedInterpreterActor,
  dc: ProjectedSaveDc,
  fail: (source: ProjectedSource, message: string) => never,
): number {
  return Match.value(dc).pipe(
    Match.when("PDCSpellSaveDc", () => {
      if (actor.spellSaveDc == null) {
        fail(source, "runtime did not supply a spell save DC");
      }
      return actor.spellSaveDc;
    }),
    Match.exhaustive,
  );
}

export function nextTargetsForOutcome<TOutcome extends string>(
  outcomes: ReadonlyArray<ProjectedTargetResolution<TOutcome>>,
  expected: TOutcome,
): ReadonlyArray<string> {
  return outcomes
    .filter((outcome) => outcome.outcome === expected)
    .map((outcome) => outcome.targetId);
}
