// KERNEL-COVERAGE: runtime-owner BATTLE.SAVE.DEXTERITY_COVER
// RAW: .references/srd-5.2.1/rules-glossary.md "Cover" (Half Cover +2 and
// Three-Quarters Cover +5 to AC and Dexterity saving throws) and
// .references/srd-5.2.1/playing-the-game.md "Cover" (a target benefits only
// when the effect originates on the opposite side of the cover). The table
// rules each target's degree for the specific effect; the runtime derives the
// bonus from it and never takes a bonus from the table. A spell that targets a
// creature takes the degree the table already ruled on its spellTarget fact.
import {
  coverBonus,
  savingThrowBenefitsFromCover,
} from "@dnd/shared-algebras/cover-algebra";
import type { BonusCoverType, RuledCoverType } from "@dnd/shared/types";
import { Match } from "effect";
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
type SpellTargetFact = Extract<
  BattleTargetSpatialFact,
  { readonly kind: "spellTarget" }
>;

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

function bonusCover(cover: RuledCoverType): BonusCoverType | undefined {
  return Match.value(cover).pipe(
    Match.whenOr("half", "threeQuarters", (degree): BonusCoverType => degree),
    // A spell can't target a creature behind Total Cover, so spell targeting
    // refuses it before any save.
    Match.when("total", () => undefined),
    Match.exhaustive,
  );
}

/** The flat bonus a target adds to a Dexterity save for its degree of cover. */
export function coverSavingThrowFlatBonus(
  targetId: CombatantId,
  cover: BonusCoverType,
): BattleSavingThrowFlatBonusProjection {
  return { kind: "cover", targetId, cover, bonus: coverBonus(cover) };
}

function spellTargetFactsForProcedure(
  facts: readonly { readonly kind: string }[],
  sourceProcedureRef: BattleProcedureExecutionRef,
): readonly SpellTargetFact[] {
  return facts.filter(
    (fact): fact is SpellTargetFact =>
      fact.kind === "spellTarget" &&
      "sourceProcedureRef" in fact &&
      fact.sourceProcedureRef === sourceProcedureRef,
  );
}

/**
 * The cover flat bonuses of a spell's saving throw: each target's degree from
 * its spellTarget fact for the same spell, when cover adds to the save.
 */
export function spellTargetCoverFlatBonuses(input: {
  readonly ruling: SavingThrowCoverRuling;
  readonly sourceProcedureRef: BattleProcedureExecutionRef;
  readonly targetSpatialFacts: readonly { readonly kind: string }[];
}): readonly BattleSavingThrowFlatBonusProjection[] {
  if (input.ruling === "noCoverBenefit") return [];
  return spellTargetFactsForProcedure(
    input.targetSpatialFacts,
    input.sourceProcedureRef,
  ).flatMap((fact) => {
    const cover = fact.cover === undefined ? undefined : bonusCover(fact.cover);
    return cover === undefined
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

function fillSpatialFacts(
  fills: readonly BattleFill[],
): readonly { readonly kind: string }[] {
  return fills.flatMap((fill): readonly { readonly kind: string }[] =>
    "spatialFacts" in fill ? (fill.spatialFacts ?? []) : [],
  );
}

/**
 * Why a saving throw fill's outcome cover doesn't answer its hole, or null. A
 * covered outcome needs a hole that lets cover add to the save, and a target
 * that has no spellTarget fact for the hole's spell, which already rules it.
 */
export function savingThrowOutcomeCoverIssue(input: {
  readonly fill: SavingThrowOutcomeFill;
  readonly hole: BattleHole | undefined;
  readonly priorFills: readonly BattleFill[];
}): string | null {
  const coveredTargetIds = coveredOutcomeTargetIds(input.fill);
  if (coveredTargetIds.length === 0) return null;
  const hole = input.hole;
  if (hole?.kind !== "savingThrowOutcome") {
    return "A saving throw outcome's cover must answer an open saving throw hole.";
  }
  if (savingThrowCoverRuling(hole) === "noCoverBenefit") {
    return "Cover adds nothing to this saving throw; omit cover on its outcomes.";
  }
  if (!("sourceProcedureRef" in hole)) return null;
  const spellTargetIds = new Set(
    spellTargetFactsForProcedure(
      fillSpatialFacts(input.priorFills),
      hole.sourceProcedureRef,
    ).map((fact) => fact.targetId),
  );
  return coveredTargetIds.some((targetId) => spellTargetIds.has(targetId))
    ? "A spell target keeps the cover ruled on its spellTarget fact; omit cover on its outcome."
    : null;
}

function frontierHole(
  result: BattleResolutionResult,
  fill: SavingThrowOutcomeFill,
): BattleHole | undefined {
  return result.tag === "needsHoles" && result.frontier.kind === "holes"
    ? result.frontier.holes.find((hole) => hole.holeId === fill.holeId)
    : undefined;
}

/**
 * Why a fill's outcome cover doesn't answer the saving throw hole it fills, or
 * null. Each saving throw fill with cover is checked against the hole that the
 * fills before it leave open.
 */
export function savingThrowFillsCoverIssue(
  fills: readonly BattleFill[],
  resolveFills: (fills: readonly BattleFill[]) => BattleResolutionResult,
): string | null {
  for (const [index, fill] of fills.entries()) {
    if (fill.kind !== "savingThrowOutcome") continue;
    if (coveredOutcomeTargetIds(fill).length === 0) continue;
    const priorFills = fills.slice(0, index);
    const issue = savingThrowOutcomeCoverIssue({
      fill,
      hole: frontierHole(resolveFills(priorFills), fill),
      priorFills,
    });
    if (issue !== null) return issue;
  }
  return null;
}
