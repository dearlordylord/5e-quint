// KERNEL-COVERAGE: runtime-owner BATTLE.SAVE.DEXTERITY_COVER
// RAW: .references/srd-5.2.1/rules-glossary.md "Cover" (Half Cover +2 and
// Three-Quarters Cover +5 to AC and Dexterity saving throws) and
// .references/srd-5.2.1/playing-the-game.md "Cover" (a target benefits only
// when the effect originates on the opposite side of the cover). The table
// rules each target's degree for the specific effect; the runtime derives the
// bonus from it and never takes a bonus from the table. A spell whose effect
// originates at the caster takes the degree the table already ruled on each
// target's spellTarget fact.
import {
  bonusCover,
  coverBonus,
  directTargetCover,
  savingThrowBenefitsFromCover,
} from "@dnd/shared-algebras/cover-algebra";
import type { BonusCoverType } from "@dnd/shared/types";
import type {
  BattleFill,
  BattleHole,
  BattleResolutionResult,
  BattleSavingThrowFlatBonusProjection,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "../identity.ts";

/**
 * Whether a saving throw hole lets cover add to the save.
 * - noCoverBenefit: cover adds nothing, because the save isn't a Dexterity
 *   save or the effect gives no benefit from Half Cover or Three-Quarters
 *   Cover for it.
 * - coverBenefit: each target adds the bonus of its degree of cover against
 *   the effect.
 */
export const SAVING_THROW_COVER_RULINGS = [
  "noCoverBenefit",
  "coverBenefit",
] as const;
export type SavingThrowCoverRuling =
  (typeof SAVING_THROW_COVER_RULINGS)[number];

type SavingThrowOutcomeHole = Extract<
  BattleHole,
  { readonly kind: "savingThrowOutcome" }
>;
type SavingThrowOutcomeFill = Extract<
  BattleFill,
  { readonly kind: "savingThrowOutcome" }
>;
/** A spell's target fact, which carries the cover ruled for its target. */
export type SpellTargetFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellTarget" }
>;

/** Whether a target fact is a spellTarget fact. */
export function isSpellTargetFact(
  fact: BattleTargetSpatialFact,
): fact is SpellTargetFact {
  return fact.kind === "spellTarget";
}

/** Whether this saving throw hole lets cover add to the save. */
export function savingThrowCoverRuling(
  hole: Pick<SavingThrowOutcomeHole, "ability"> & {
    readonly deniesCoverBenefit?: true;
  },
): SavingThrowCoverRuling {
  return savingThrowBenefitsFromCover(hole.ability) &&
    hole.deniesCoverBenefit !== true
    ? "coverBenefit"
    : "noCoverBenefit";
}

/** The flat bonus a target adds to a Dexterity save for its degree of cover. */
export function coverSavingThrowFlatBonus(
  targetId: CombatantId,
  cover: BonusCoverType,
): BattleSavingThrowFlatBonusProjection {
  return { kind: "cover", targetId, cover, bonus: coverBonus(cover) };
}

/**
 * The cover flat bonuses of a spell's saving throw, when cover adds to it:
 * one per target, from the first spellTarget fact this caster's spell has for
 * that target. Total Cover gives none, since a spell can't target a creature
 * behind it.
 */
export function spellTargetCoverFlatBonuses(input: {
  readonly ruling: SavingThrowCoverRuling;
  readonly casterId: CombatantId;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly spellTargetFacts: readonly SpellTargetFact[];
}): readonly BattleSavingThrowFlatBonusProjection[] {
  if (input.ruling === "noCoverBenefit") return [];
  const factByTargetId = new Map<CombatantId, SpellTargetFact>();
  for (const fact of input.spellTargetFacts) {
    if (
      fact.casterId === input.casterId &&
      fact.sourceProcedureRef === input.sourceProcedureRef &&
      !factByTargetId.has(fact.targetId)
    )
      factByTargetId.set(fact.targetId, fact);
  }
  return [...factByTargetId.values()].flatMap((fact) => {
    const degree = directTargetCover(fact.cover);
    const cover = degree === null ? null : bonusCover(degree);
    return cover === null
      ? []
      : [coverSavingThrowFlatBonus(fact.targetId, cover)];
  });
}

function coveredOutcomeTargetIds(
  fill: SavingThrowOutcomeFill,
): readonly CombatantId[] {
  return fill.value.outcomes.flatMap((outcome) =>
    outcome.cover === undefined ? [] : [outcome.targetId],
  );
}

/**
 * Why a saving throw fill's outcome cover doesn't answer its hole, or null. A
 * covered outcome needs a hole that lets cover add to the save, and a target
 * whose cover the hole doesn't already count in its flat bonuses.
 */
export function savingThrowOutcomeCoverIssue(input: {
  readonly fill: SavingThrowOutcomeFill;
  readonly hole: SavingThrowOutcomeHole;
}): string | null {
  const coveredTargetIds = coveredOutcomeTargetIds(input.fill);
  if (coveredTargetIds.length === 0) return null;
  if (savingThrowCoverRuling(input.hole) === "noCoverBenefit") {
    return "Cover adds nothing to this saving throw; omit cover on its outcomes.";
  }
  const countedTargetIds = new Set(
    input.hole.targetFlatBonuses.flatMap((bonus) =>
      bonus.kind === "cover" ? [bonus.targetId] : [],
    ),
  );
  return coveredTargetIds.some((targetId) => countedTargetIds.has(targetId))
    ? "This target's cover already counts in the save's targetFlatBonuses; omit cover on its outcome."
    : null;
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
 * Why a fill's outcome cover doesn't answer the saving throw hole it fills, or
 * null. Each saving throw fill with cover is checked against the hole that the
 * fills before it leave open. When those fills don't leave it open, the
 * resolution itself reports why, so this check has nothing to add.
 */
export function savingThrowFillsCoverIssue(
  fills: readonly BattleFill[],
  resolveFills: (fills: readonly BattleFill[]) => BattleResolutionResult,
): string | null {
  for (const [index, fill] of fills.entries()) {
    if (fill.kind !== "savingThrowOutcome") continue;
    if (coveredOutcomeTargetIds(fill).length === 0) continue;
    const hole = frontierSavingThrowHole(
      resolveFills(fills.slice(0, index)),
      fill,
    );
    if (hole === undefined) continue;
    const issue = savingThrowOutcomeCoverIssue({ fill, hole });
    if (issue !== null) return issue;
  }
  return null;
}

/**
 * Resolves fills after checking each saving throw fill's outcome cover against
 * its hole. The check replays only the unchecked resolution, so it never
 * nests.
 */
export function resolveWithSavingThrowCoverCheck(input: {
  readonly fills: readonly BattleFill[];
  readonly resolveFills: (
    fills: readonly BattleFill[],
  ) => BattleResolutionResult;
  readonly invalid: (message: string) => BattleResolutionResult;
}): BattleResolutionResult {
  const issue = savingThrowFillsCoverIssue(input.fills, input.resolveFills);
  return issue === null
    ? input.resolveFills(input.fills)
    : input.invalid(issue);
}
