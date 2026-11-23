type Target = { readonly prone: boolean };

export function targetAttackRollSources(target: Target | undefined) {
  if (target === undefined) {
    return { kind: "targetNotFound" } as const;
  }
  return {
    kind: "resolved",
    sources: { advantage: target.prone, disadvantage: false },
  } as const;
}
