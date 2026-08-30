import { Match } from "effect";

type CasterActionRepositionLifecycle = {
  readonly actionCost: "magicAction" | "bonusAction";
  readonly collisionDisposition: "stopAndAffectAdjacent" | "ignoreObstacles";
};

export function persistentAreaSaveDamageRepositionKind(
  lifecycle: CasterActionRepositionLifecycle & {
    readonly collisionDisposition: "stopAndAffectAdjacent";
  },
): "collisionReposition";
export function persistentAreaSaveDamageRepositionKind(
  lifecycle: CasterActionRepositionLifecycle & {
    readonly collisionDisposition: "ignoreObstacles";
  },
): "directedReposition";
export function persistentAreaSaveDamageRepositionKind(
  lifecycle: CasterActionRepositionLifecycle,
): "collisionReposition" | "directedReposition";
export function persistentAreaSaveDamageRepositionKind(
  lifecycle: CasterActionRepositionLifecycle,
): "collisionReposition" | "directedReposition" {
  return Match.value(lifecycle.collisionDisposition).pipe(
    Match.when(
      "stopAndAffectAdjacent",
      (): "collisionReposition" => "collisionReposition",
    ),
    Match.when(
      "ignoreObstacles",
      (): "directedReposition" => "directedReposition",
    ),
    Match.exhaustive,
  );
}
