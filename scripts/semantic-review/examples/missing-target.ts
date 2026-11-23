type Target = { readonly prone: boolean };

export function targetAttackRollSources(target: Target | undefined) {
  if (target === undefined || !target.prone) {
    return { advantage: false, disadvantage: false };
  }
  return { advantage: true, disadvantage: false };
}
