type Target = { readonly prone: boolean };

export function targetAttackRollSources(target: Target) {
  return { advantage: target.prone, disadvantage: false };
}
