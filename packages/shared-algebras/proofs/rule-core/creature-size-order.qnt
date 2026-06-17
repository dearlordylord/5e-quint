// -*- mode: Bluespec; -*-

module creatureSizeOrder {
  type RuleSize =
    | TinySize
    | SmallSize
    | MediumSize
    | LargeSize
    | HugeSize
    | GargantuanSize

  pure def sizeRank(creatureSize: RuleSize): int =
    if (creatureSize == TinySize) 0
    else if (creatureSize == SmallSize) 1
    else if (creatureSize == MediumSize) 2
    else if (creatureSize == LargeSize) 3
    else if (creatureSize == HugeSize) 4
    else 5

  pure def creatureSizeIsLargerThanSelf(
    selfSize: RuleSize,
    otherSize: RuleSize,
  ): bool =
    sizeRank(otherSize) > sizeRank(selfSize)
}
