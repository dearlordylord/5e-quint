import type {
  ClassLevelChoiceCount,
  ThresholdTiers,
} from "@dnd/surface/surface/types";

export type ClassLevelThresholdTiers = ThresholdTiers<number> & {
  readonly axis: "class";
};

export function isClassLevelThresholdTiers(
  threshold: ThresholdTiers<number>,
): threshold is ClassLevelThresholdTiers {
  return threshold.axis === "class";
}

export function thresholdTierValueAtClassLevel(
  threshold: ClassLevelThresholdTiers,
  classLevel: number,
): number {
  return threshold.tiers.reduce(
    (current, tier) =>
      classLevel >= tier.atLevel && tier.atLevel >= current.atLevel
        ? { atLevel: tier.atLevel, value: tier.value }
        : current,
    { atLevel: 0, value: threshold.base },
  ).value;
}

export function classLevelChoiceCountAtLevel(
  choiceCount: ClassLevelChoiceCount,
  classLevel: number,
): number {
  if (choiceCount.kind === "class_level_additional_choices") {
    return (
      choiceCount.initial +
      choiceCount.increases
        .filter((increase) => increase.atLevel <= classLevel)
        .reduce((total, increase) => total + increase.choose, 0)
    );
  }

  return (
    choiceCount.levels.filter((level) => level.atLevel <= classLevel).at(-1)
      ?.total ?? 0
  );
}
