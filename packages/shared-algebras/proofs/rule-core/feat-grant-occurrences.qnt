// UNIT-PROFILE-COVERAGE: qnt-owner character-creation.feat-grant-occurrences
// KERNEL-COVERAGE: qnt-owner CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
// RAW: classes.md:4822-4824,4876-4878,4788-4792; feats.md:13-17,61-67.
module featGrantOccurrences {
  type GrantOrigin = { grant: str, level: int }
  type FeatChoice = { origin: GrantOrigin, feat: str, repeatable: bool }
  pure def canGainFeatChoices(
    earned: Set[GrantOrigin], gained: List[FeatChoice], held: List[FeatChoice],
    scoreAfterIncrease: int, maximumScore: int,
  ): bool = all {
    gained.length() == earned.size(),
    gained.indices().forall(i => all {
      earned.contains(gained.nth(i).origin),
      gained.indices().forall(j => i == j or gained.nth(i).origin != gained.nth(j).origin),
      held.indices().forall(j => gained.nth(i).origin != held.nth(j).origin),
      gained.nth(i).repeatable or all {
        held.indices().forall(j => gained.nth(i).feat != held.nth(j).feat),
        gained.indices().forall(j => i == j or gained.nth(i).feat != gained.nth(j).feat),
      },
    }),
    scoreAfterIncrease <= maximumScore,
  }
  pure def qualifiesAfterPriorIncreases(baseScore: int, priorIncreases: List[int], prerequisite: int, ownIncrease: int, maximum: int): bool = all {
    priorIncreases.foldl(baseScore,(score,increase)=>score+increase) >= prerequisite,
    priorIncreases.foldl(baseScore,(score,increase)=>score+increase)+ownIncrease <= maximum,
  }
  pure def retainChoices(held: List[FeatChoice], gained: List[FeatChoice]): List[FeatChoice] = held.concat(gained)
  pure def replaceAtOrigin(held: List[FeatChoice], origin: GrantOrigin, replacementFeat: str): List[FeatChoice] =
    held.foldl([], (choices, choice) => choices.append(if (choice.origin == origin) { ...choice, feat: replacementFeat } else choice))
}
