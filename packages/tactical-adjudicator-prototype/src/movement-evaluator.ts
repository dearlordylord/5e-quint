import type { TraversalEvaluator } from "@dnd/tactical-space-prototype";

export const MOVEMENT_PROFILES = [
  "ordinary",
  "crawling",
  "unaffected-by-difficult-terrain",
] as const;

export type MovementProfile = (typeof MOVEMENT_PROFILES)[number];

export function movementEvaluatorFor(
  profile: MovementProfile,
): TraversalEvaluator {
  return (step) => {
    const difficult = step.enteredCells.some(
      (entered) => entered.terrain === "difficult",
    );
    return Object.freeze({
      tag: "passable",
      weight: step.distanceFeet * movementMultiplier(profile, difficult),
    });
  };
}

export function isMovementProfile(
  value: string | undefined,
): value is MovementProfile {
  return (
    value !== undefined &&
    MOVEMENT_PROFILES.some((candidate) => candidate === value)
  );
}

function movementMultiplier(
  profile: MovementProfile,
  difficult: boolean,
): number {
  if (profile === "ordinary") return difficult ? 2 : 1;
  if (profile === "crawling") return difficult ? 3 : 2;
  if (profile === "unaffected-by-difficult-terrain") return 1;
  return unreachableProfile(profile);
}

function unreachableProfile(profile: never): never {
  throw new Error(`Internal invariant: unhandled movement profile ${profile}`);
}
