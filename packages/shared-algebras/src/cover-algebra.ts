// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.TARGET_COVER
// RAW: .references/srd-5.2.1/rules-glossary.md "Cover" and
// .references/srd-5.2.1/playing-the-game.md "Cover". The table adjudicates the
// degree of cover between an attacker and a target, and supplies it only when it
// rules some; this algebra owns what that degree does to an attack roll or to
// direct targeting.
import type { CoverType, RuledCoverType } from "@dnd/shared/types";
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

export function coverArmorClassBonus(
  cover: DirectTargetCover,
): CoverArmorClassBonus {
  return Match.value(cover).pipe(
    Match.when("none", (): CoverArmorClassBonus => 0),
    Match.when("half", (): CoverArmorClassBonus => 2),
    Match.when("threeQuarters", (): CoverArmorClassBonus => 5),
    Match.exhaustive,
  );
}

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
