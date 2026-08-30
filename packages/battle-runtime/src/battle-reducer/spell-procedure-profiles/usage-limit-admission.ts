import type { UsageLimit } from "@dnd/surface/surface/types";

export function sharedOncePerTurnLimitGroup(
  limits: readonly (UsageLimit | undefined)[],
): string | null {
  const [first, ...remaining] = limits;
  return first?.kind === "once_per_turn" &&
    first.limitGroup !== undefined &&
    remaining.every(
      (limit) =>
        limit?.kind === "once_per_turn" &&
        limit.limitGroup === first.limitGroup,
    )
    ? first.limitGroup
    : null;
}
