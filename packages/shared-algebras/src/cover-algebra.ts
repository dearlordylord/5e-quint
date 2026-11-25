// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.TARGET_COVER
// KERNEL-COVERAGE: runtime-owner BATTLE.SAVE.DEXTERITY_COVER
// RAW: .references/srd-5.2.1/rules-glossary.md "Cover" and
// .references/srd-5.2.1/playing-the-game.md "Cover". The table adjudicates the
// degree of cover between an attacker and a target, and supplies it only when it
// rules some; this algebra owns what that degree does to an attack roll, to a
// Dexterity saving throw or to direct targeting.
import type { Ability } from "@dnd/shared/game-facts";
import type {
  BonusCoverType,
  CoverType,
  RuledCoverType,
} from "@dnd/shared/types";
import { Match } from "effect";

/** A degree of cover that still lets an attack or a spell target directly. */
export type DirectTargetCover = Exclude<CoverType, "total">;

/** The bonus Half Cover and Three-Quarters Cover add to a target's AC. */
export type CoverArmorClassBonus = 0 | 2 | 5;

/**
 * Whether a target behind the given cover can be targeted directly. Total Cover
 * prevents it; any other degree is narrowed for the AC bonus.
 */
export type CoverTargeting =
  | { readonly tag: "targetable"; readonly cover: DirectTargetCover }
  | { readonly tag: "totalCover" };

export function coverTargeting(cover: CoverType): CoverTargeting {
  return Match.value(cover).pipe(
    Match.when("total", (): CoverTargeting => ({ tag: "totalCover" })),
    Match.whenOr(
      "none",
      "half",
      "threeQuarters",
      (degree): CoverTargeting => ({ tag: "targetable", cover: degree }),
    ),
    Match.exhaustive,
  );
}

/**
 * The degree narrowed for an attack, or null when Total Cover prevents it. A
 * target fact without a degree is one the table ruled no cover for, so it is
 * narrowed to no cover.
 */
export function directTargetCover(
  cover: CoverType | undefined,
): DirectTargetCover | null {
  if (cover === undefined) return "none";
  const targeting = coverTargeting(cover);
  return targeting.tag === "targetable" ? targeting.cover : null;
}

/**
 * The bonus Half Cover and Three-Quarters Cover each give, to AC and to
 * Dexterity saving throws alike.
 */
export const COVER_BONUS_BY_DEGREE = {
  half: 2,
  threeQuarters: 5,
} as const satisfies Record<BonusCoverType, CoverArmorClassBonus>;

export const COVER_BONUSES = [
  COVER_BONUS_BY_DEGREE.half,
  COVER_BONUS_BY_DEGREE.threeQuarters,
] as const;
export type CoverBonus = (typeof COVER_BONUSES)[number];

export type CoverBenefit = {
  readonly [Degree in BonusCoverType]: {
    readonly cover: Degree;
    readonly bonus: (typeof COVER_BONUS_BY_DEGREE)[Degree];
  };
}[BonusCoverType];

export function coverBenefit(cover: BonusCoverType): CoverBenefit {
  return Match.value(cover).pipe(
    Match.when("half", () => ({
      cover: "half" as const,
      bonus: COVER_BONUS_BY_DEGREE.half,
    })),
    Match.when("threeQuarters", () => ({
      cover: "threeQuarters" as const,
      bonus: COVER_BONUS_BY_DEGREE.threeQuarters,
    })),
    Match.exhaustive,
  );
}

export function coverBonus(cover: BonusCoverType): CoverBonus {
  return coverBenefit(cover).bonus;
}

/**
 * The degree of a target's cover that adds a bonus, or null when the target
 * has no cover.
 */
export function bonusCover(cover: DirectTargetCover): BonusCoverType | null {
  return Match.value(cover).pipe(
    Match.when("none", () => null),
    Match.whenOr("half", "threeQuarters", (degree): BonusCoverType => degree),
    Match.exhaustive,
  );
}

export function coverArmorClassBonus(
  cover: DirectTargetCover,
): CoverArmorClassBonus {
  return Match.value(cover).pipe(
    Match.when("none", (): CoverArmorClassBonus => 0),
    Match.whenOr("half", "threeQuarters", coverBonus),
    Match.exhaustive,
  );
}

/**
 * Whether cover can add to a saving throw of this ability. Cover's bonus is to
 * AC and Dexterity saving throws, so only a Dexterity save benefits.
 */
export function savingThrowBenefitsFromCover(ability: Ability): boolean {
  return ability === "dex";
}

/**
 * Whether an effect lets its saving throw take the target's cover.
 * - available: a Dexterity save adds the bonus of the target's cover.
 * - denied: the target gains no benefit from Half Cover or Three-Quarters
 *   Cover for the save, as Sacred Flame says.
 */
export const SAVE_COVER_BENEFITS = ["available", "denied"] as const;
export type SaveCoverBenefit = (typeof SAVE_COVER_BENEFITS)[number];

/** The AC an attack roll must meet against a target behind the given cover. */
export function armorClassBehindCover(
  armorClass: number,
  cover: DirectTargetCover,
): number {
  return armorClass + coverArmorClassBonus(cover);
}

/**
 * A target fact's cover field for a measured degree: the degree when there is
 * some cover, and no field when there is none.
 */
export function ruledCoverField(cover: CoverType): {
  readonly cover?: RuledCoverType;
} {
  return Match.value(cover).pipe(
    Match.when("none", () => ({})),
    Match.whenOr("half", "threeQuarters", "total", (degree) => ({
      cover: degree,
    })),
    Match.exhaustive,
  );
}
