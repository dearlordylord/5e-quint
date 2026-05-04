import { CLASS_NAMES, type ClassName } from "@dnd/shared/game-facts";

export { type ClassName } from "@dnd/shared/game-facts";

export type ClassProgressionEntry = {
  readonly className: ClassName;
};

export type ClassProgression<
  Entry extends ClassProgressionEntry = ClassProgressionEntry,
> = ReadonlyArray<Entry>;

export type ClassLevelMap = Readonly<Record<ClassName, number>>;
export type PartialClassLevelMap = Partial<Record<ClassName, number>>;

export const ZERO_CLASS_LEVELS = Object.fromEntries(
  CLASS_NAMES.map((className) => [className, 0]),
) as ClassLevelMap;

export function normalizeClassLevels(
  partial: PartialClassLevelMap,
): ClassLevelMap {
  return {
    ...ZERO_CLASS_LEVELS,
    ...partial,
  };
}

export function totalClassLevels(classLevels: ClassLevelMap): number {
  return CLASS_NAMES.reduce(
    (total, className) => total + classLevels[className],
    0,
  );
}

export function advancementToClassLevels(
  advancement: ClassProgression,
): ClassLevelMap {
  const classLevels = { ...ZERO_CLASS_LEVELS };
  for (const entry of advancement) {
    classLevels[entry.className] += 1;
  }
  return classLevels;
}

export function primaryClassFromAdvancement(
  advancement: ClassProgression,
): ClassName | undefined {
  return advancement[0]?.className;
}

export function singleClassAdvancement(
  className: ClassName,
  level: number,
): ClassProgression {
  return Array.from({ length: level }, () => ({ className }));
}
