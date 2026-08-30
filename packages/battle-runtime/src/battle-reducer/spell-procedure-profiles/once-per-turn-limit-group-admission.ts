import type { UsageLimit } from "@dnd/surface/surface/types";

export function hasSharedNonEmptyOncePerTurnLimitGroup(
  limits: readonly (UsageLimit | undefined)[],
): boolean {
  const [first, ...remaining] = limits;

  return (
    first?.kind === "once_per_turn" &&
    first.limitGroup !== undefined &&
    first.limitGroup.length > 0 &&
    remaining.every(
      (limit) =>
        limit?.kind === "once_per_turn" &&
        limit.limitGroup === first.limitGroup,
    )
  );
}
