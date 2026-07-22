export function druidWildShapeDurationHoursForClassLevel(
  classLevel: number,
): number {
  return Math.floor(classLevel / 2);
}
