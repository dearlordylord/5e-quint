// Checks each saving throw fill against the hole it answers, for the facts
// that hold for every saving throw route: the cover on its outcomes, and the
// targets that fail without rolling.
// RAW: .references/srd-5.2.1/rules-glossary.md, "Paralyzed", "Petrified",
// "Stunned" and "Unconscious": "You automatically fail Strength and Dexterity
// saving throws."
import type {
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleSavingThrowOutcome,
} from "../battle-state-execution.ts";
import { savingThrowOutcomeCoverIssue } from "./saving-throw-cover.ts";

type SavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;
type SavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;

function isFailureWithoutRoll(outcome: BattleSavingThrowOutcome): boolean {
  return outcome.withoutRoll === true && !outcome.succeeded;
}

/**
 * Why a saving throw fill's outcomes don't answer the targets its hole says
 * fail without rolling, or null. Each such target's outcome is a failure
 * without a roll.
 */
export function savingThrowOutcomeAutomaticFailureIssue(input: {
  readonly fill: SavingThrowOutcomeFill;
  readonly hole: SavingThrowOutcomeHole;
}): string | null {
  const failingTargetIds = new Set(
    input.hole.targetAutomaticFailures.map(({ targetId }) => targetId),
  );
  const outcome = input.fill.value.outcomes.find(
    (candidate) =>
      failingTargetIds.has(candidate.targetId) &&
      !isFailureWithoutRoll(candidate),
  );
  return outcome === undefined
    ? null
    : `${outcome.targetId} automatically fails this saving throw; its outcome is a failure without a roll.`;
}

/** Why a fill doesn't answer the saving throw hole it fills, or null. */
function savingThrowOutcomeIssue(input: {
  readonly fill: SavingThrowOutcomeFill;
  readonly hole: SavingThrowOutcomeHole;
}): string | null {
  return (
    savingThrowOutcomeCoverIssue(input) ??
    savingThrowOutcomeAutomaticFailureIssue(input)
  );
}

// A fill whose every outcome is a failure without a roll can't break either
// check, so it needs no replay.
function savingThrowFillNeedsHole(fill: SavingThrowOutcomeFill): boolean {
  return fill.value.outcomes.some((outcome) => !isFailureWithoutRoll(outcome));
}

/** The open saving throw hole a fill answers, when the frontier has it. */
function frontierSavingThrowHole(
  result: BattleResolutionResult,
  fill: SavingThrowOutcomeFill,
): SavingThrowOutcomeHole | undefined {
  if (result.tag !== "needsHoles" || result.frontier.kind !== "holes") {
    return undefined;
  }
  return result.frontier.holes.find(
    (hole): hole is SavingThrowOutcomeHole =>
      hole.kind === "savingThrowOutcome" && hole.holeId === fill.holeId,
  );
}

/**
 * Why a saving throw fill doesn't answer the hole it fills, or null. Resolve
 * all other fills to discover the hole, since a fill set's facts are not
 * ordered by their position in the input array. Duplicate or unrelated fills
 * remain the resolver's responsibility.
 */
export function savingThrowFillsOutcomeIssue(
  fills: readonly BattleFill[],
  resolveFills: (fills: readonly BattleFill[]) => BattleResolutionResult,
): string | null {
  for (const [index, fill] of fills.entries()) {
    if (fill.kind !== "savingThrowOutcome") continue;
    if (!savingThrowFillNeedsHole(fill)) continue;
    const hole = frontierSavingThrowHole(
      resolveFills(
        fills.filter((_, candidateIndex) => candidateIndex !== index),
      ),
      fill,
    );
    if (hole === undefined) continue;
    const issue = savingThrowOutcomeIssue({ fill, hole });
    if (issue !== null) return issue;
  }
  return null;
}

/**
 * Resolves fills after checking each saving throw fill against its hole. The
 * check replays only the unchecked resolution, so it never nests.
 */
export function resolveWithSavingThrowOutcomeCheck(input: {
  readonly fills: readonly BattleFill[];
  readonly resolveFills: (
    fills: readonly BattleFill[],
  ) => BattleResolutionResult;
  readonly invalid: (message: string) => BattleResolutionResult;
}): BattleResolutionResult {
  const issue = savingThrowFillsOutcomeIssue(input.fills, input.resolveFills);
  return issue === null
    ? input.resolveFills(input.fills)
    : input.invalid(issue);
}
