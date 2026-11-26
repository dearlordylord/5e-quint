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
  coverBenefit,
  savingThrowBenefitsFromCover,
} from "@dnd/shared-algebras/cover-algebra";
import type { BonusCoverType } from "@dnd/shared/types";
import type {
  BattleExecutableSpellInvocation,
  BattleFill,
  BattleHole,
  BattleSavingThrowFlatBonusProjection,
  BattleSpellSaveCover,
  BattleState,
  BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import type { CombatantId } from "../identity.ts";
import { spellTargetAdmission } from "./spells-targeting.ts";

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
/** Selected targets and the complete evidence used to admit them. */
export type SpellSaveTargetSelection = {
  readonly targetIds: readonly CombatantId[];
  readonly spatialFacts: readonly BattleTargetSpatialFact[];
};

/** Whether this saving throw hole lets cover add to the save. */
export function savingThrowCoverRuling(
  hole: Pick<SavingThrowOutcomeHole, "ability"> & {
    readonly saveCover?: BattleSpellSaveCover;
  },
): SavingThrowCoverRuling {
  return savingThrowBenefitsFromCover(hole.ability) &&
    hole.saveCover?.kind !== "denied"
    ? "coverBenefit"
    : "noCoverBenefit";
}

/** The targets whose cover a saving throw hole already took from its spell. */
function coverRuledTargetIds(
  hole: SavingThrowOutcomeHole,
): ReadonlySet<CombatantId> {
  const saveCover = "saveCover" in hole ? hole.saveCover : undefined;
  return new Set(
    saveCover?.kind === "ruledOnSpellTargets" ? saveCover.targetIds : [],
  );
}

/** The flat bonus a target adds to a Dexterity save for its degree of cover. */
export function coverSavingThrowFlatBonus(
  targetId: CombatantId,
  cover: BonusCoverType,
): Extract<BattleSavingThrowFlatBonusProjection, { readonly kind: "cover" }> {
  return { kind: "cover", targetId, ...coverBenefit(cover) };
}

/** Project cover from the same admission that makes each spell target legal. */
export function spellTargetSaveCover(input: {
  readonly ruling: SavingThrowCoverRuling;
  readonly state: BattleState;
  readonly casterId: CombatantId;
  readonly invocation: BattleExecutableSpellInvocation;
  readonly targetSelection: SpellSaveTargetSelection | undefined;
}): {
  readonly ruledTargetIds: readonly CombatantId[];
  readonly flatBonuses: readonly Extract<
    BattleSavingThrowFlatBonusProjection,
    { readonly kind: "cover" }
  >[];
} {
  if (
    input.ruling === "noCoverBenefit" ||
    input.targetSelection === undefined
  ) {
    return { ruledTargetIds: [], flatBonuses: [] };
  }
  const selection = input.targetSelection;
  const admitted = selection.targetIds.flatMap((targetId) => {
    const admission = spellTargetAdmission(
      input.state,
      input.casterId,
      targetId,
      input.invocation,
      selection.spatialFacts,
    );
    return admission === null ? [] : [{ targetId, ...admission }];
  });
  return {
    ruledTargetIds: admitted.map(({ targetId }) => targetId),
    flatBonuses: admitted.flatMap(({ targetId, cover: degree }) => {
      const cover = bonusCover(degree);
      return cover === null ? [] : [coverSavingThrowFlatBonus(targetId, cover)];
    }),
  };
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
 * whose cover the hole didn't already take from its spell's targeting.
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
  const ruledTargetIds = coverRuledTargetIds(input.hole);
  return coveredTargetIds.some((targetId) => ruledTargetIds.has(targetId))
    ? "This target's cover against the effect is ruled on its spellTarget fact; omit cover on its outcome."
    : null;
}
