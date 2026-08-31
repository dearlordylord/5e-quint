export function compareUnicodeCodePointStrings(
  left: string,
  right: string,
): number {
  const leftCodePoints = Array.from(left, (character) =>
    character.codePointAt(0),
  );
  const rightCodePoints = Array.from(right, (character) =>
    character.codePointAt(0),
  );
  const sharedLength = Math.min(leftCodePoints.length, rightCodePoints.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftCodePoint = leftCodePoints[index];
    const rightCodePoint = rightCodePoints[index];
    if (leftCodePoint === rightCodePoint) continue;
    return leftCodePoint! < rightCodePoint! ? -1 : 1;
  }
  return leftCodePoints.length - rightCodePoints.length;
}
