// KERNEL-COVERAGE: qnt-owner CREATION.FEAT_GRANT_OCCURRENCE.CHOICE_LIFECYCLE
// RAW: classes.md:4822-4824 (Fighter ASI 4/6/8), 4876-4878 (additional style7),
// 4788-4792 (Fighter style replacement); feats.md:13-17,61-67 (repeatability/cap).
module characterCreationFeatGrantOccurrences {
  type FeatGrantState = {
    classLevel: int,
    score: int,
    abilityFeatGrantLevels: List[int],
    styles: List[{ grantLevel: int, feat: str }],
    accepted: bool,
  }
  var qState: FeatGrantState
  action init = qState' = {
    classLevel: 5,
    score: 15,
    abilityFeatGrantLevels: [4],
    styles: [{ grantLevel: 1, feat: "defense" }],
    accepted: true,
  }
  action doGain6 = all {
    qState.classLevel == 5,
    qState' = { ...qState, classLevel: 6, score: qState.score + 2,
      abilityFeatGrantLevels: qState.abilityFeatGrantLevels.append(6), accepted: true },
  }
  action doGain7AdditionalStyle = all {
    qState.classLevel == 6,
    qState' = { ...qState, classLevel: 7,
      styles: qState.styles.append({ grantLevel: 7, feat: "feat_archery" }), accepted: true },
  }
  action doGain8ReplacePrimary = all {
    qState.classLevel == 7,
    qState' = { ...qState, classLevel: 8, score: qState.score + 2,
      abilityFeatGrantLevels: qState.abilityFeatGrantLevels.append(8),
      styles: qState.styles.foldl([], (styles, style) => styles.append(if (style.grantLevel == 1)
        { grantLevel: 1, feat: "feat_great_weapon_fighting" } else style)), accepted: true },
  }
  action doRejectMissingGain = all {
    qState.classLevel < 8,
    qState' = { ...qState, accepted: false },
  }
  action doRejectForgedOrigin = all {
    qState.classLevel < 8,
    qState' = { ...qState, accepted: false },
  }
  action doRejectDuplicateAdditionalStyle = all {
    qState.classLevel == 6,
    qState' = { ...qState, accepted: false },
  }
  action doIdle = all { qState.classLevel == 8, qState' = qState }
  action step = any {
    doGain6, doGain7AdditionalStyle, doGain8ReplacePrimary,
    doRejectMissingGain, doRejectForgedOrigin, doRejectDuplicateAdditionalStyle, doIdle,
  }
}
