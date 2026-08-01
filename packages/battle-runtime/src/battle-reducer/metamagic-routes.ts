import type {
  AdmittedBattleResolutionInput,
  BattleActDiscoveryCandidate,
  BattleFill,
  BattleHole,
  BattleResolutionInput,
  BattleResolutionResult,
  BattleState,
} from "../battle-state-execution.ts";
import {
  CAREFUL_METAMAGIC_EFFECT_KIND,
  DISTANT_METAMAGIC_EFFECT_KIND,
  EMPOWERED_METAMAGIC_EFFECT_KIND,
  EXTENDED_METAMAGIC_EFFECT_KIND,
  HEIGHTENED_METAMAGIC_EFFECT_KIND,
  QUICKENED_METAMAGIC_EFFECT_KIND,
  SEEKING_METAMAGIC_EFFECT_KIND,
  SUBTLE_METAMAGIC_EFFECT_KIND,
  TRANSMUTED_METAMAGIC_EFFECT_KIND,
  TWINNED_METAMAGIC_EFFECT_KIND,
} from "./metamagic-support.ts";
import { isHeightenedSpellTargetChoiceHoleId } from "./spells-damage-fills.ts";
import {
  battleReducerRouteFill,
  battleReducerRouteHoles,
  discoverBattleActsRoute,
  resolveBattleSubjectRoute,
  resolveBattleSubjectWithoutFillRoute,
} from "./reducer-route-builders.ts";
import type {
  BattleReducerRouteEvent,
  BattleReducerRouteEvents,
  BattleReducerRouteHole,
  BattleReducerRouteOwnerGroup,
} from "./reducer-route-protocol.ts";
import { spellInvocationForRouteSubject } from "./reducer-route-spell-query.ts";
import {
  combatantConcentrationChanged,
  combatantsActiveEffectsChanged,
  combatantsActiveEffectCountIncreased,
} from "./reducer-route-state-query.ts";

export function metamagicCastingOptionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  const fill = input.fills.at(-1);
  if (
    fill === undefined &&
    result.tag === "invalid" &&
    isBonusActionSpellWithMetamagicSubject(input.subject)
  ) {
    return [metamagicGovernorInvalidRoute(input)];
  }
  if (!isQuickenedBonusActionCastingTimeSubject(input.subject)) {
    return (
      metamagicSpellRangeProjectionRouteForResolution(input, result, fill) ??
      metamagicSavingThrowProtectionRouteForResolution(input, result, fill) ??
      metamagicSavingThrowRollModeRouteForResolution(input, result, fill) ??
      metamagicDamageTypeSubstitutionRouteForResolution(input, result, fill) ??
      metamagicMissedSpellAttackRerollRouteForResolution(input, result, fill) ??
      metamagicDamageDiceRerollRouteForResolution(input, result, fill)
    );
  }

  if (fill === undefined) {
    return undefined;
  }

  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === undefined) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (routeFill === "targetChoice") {
    return [
      ...metamagicBonusActionTimingRoutes(["targetChoice"]),
      resolveBattleSubjectRoute(
        "metamagicBonusActionCastingTime",
        routeFill,
        holes,
        "battleTargetSelection",
      ),
    ];
  }
  if (routeFill === "attackRoll") {
    if (
      spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
        "spellAttackSequence" &&
      result.tag === "resolved"
    ) {
      return [
        resolveBattleSubjectWithoutFillRoute(
          "metamagicBonusActionCastingTime",
          [],
          "battleTurnBoundary",
        ),
      ];
    }
    return [
      resolveBattleSubjectRoute(
        "metamagicBonusActionCastingTime",
        routeFill,
        holes,
        "battleSpellAttackProcedure",
      ),
    ];
  }
  if (routeFill === "spellTargetList" && result.tag === "resolved") {
    return [
      ...metamagicBonusActionTimingRoutes(["spellTargetList"]),
      resolveBattleSubjectRoute(
        "metamagicBonusActionCastingTime",
        routeFill,
        holes,
        "battleTargetSelection",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "metamagicBonusActionCastingTime",
        [],
        "battleActiveEffect",
      ),
    ];
  }
  if (
    routeFill === "savingThrowOutcome" &&
    spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
      "saveGatedDamage" &&
    result.tag !== "invalid"
  ) {
    return [
      ...metamagicBonusActionTimingRoutes(["savingThrowOutcome"]),
      resolveBattleSubjectRoute(
        "metamagicBonusActionCastingTime",
        routeFill,
        holes,
        "battleSavingThrowOutcome",
      ),
      ...(result.tag === "resolved"
        ? [
            resolveBattleSubjectWithoutFillRoute(
              "metamagicBonusActionCastingTime" as const,
              [],
              metamagicSaveGatedFinalOwner(input.state, result.state),
            ),
          ]
        : []),
    ];
  }
  if (routeFill === "savingThrowOutcome" && result.tag === "resolved") {
    return [
      ...metamagicBonusActionTimingRoutes(["savingThrowOutcome"]),
      resolveBattleSubjectRoute(
        "metamagicBonusActionCastingTime",
        routeFill,
        holes,
        "battleSavingThrowOutcome",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "metamagicBonusActionCastingTime",
        [],
        metamagicSaveGatedFinalOwner(input.state, result.state),
      ),
    ];
  }
  if (routeFill === "rolledDice" && result.tag === "resolved") {
    if (
      spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
      "directHitPointRestoration"
    ) {
      return [
        resolveBattleSubjectRoute(
          "metamagicBonusActionCastingTime",
          routeFill,
          holes,
          "battleHitPointAndZeroHpLifecycle",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "metamagicBonusActionCastingTime",
          [],
          "battleTurnBoundary",
        ),
      ];
    }
    if (
      spellInvocationForRouteSubject(input.state, input.subject)?.procedure ===
      "saveGatedDamage"
    ) {
      return [
        resolveBattleSubjectRoute(
          "metamagicBonusActionCastingTime",
          routeFill,
          holes,
          "battleDamageRoll",
        ),
        resolveBattleSubjectWithoutFillRoute(
          "metamagicBonusActionCastingTime",
          [],
          "battleTurnBoundary",
        ),
      ];
    }
    return [
      resolveBattleSubjectWithoutFillRoute(
        "metamagicBonusActionCastingTime",
        [],
        "battleTurnBoundary",
      ),
    ];
  }
  return undefined;
}

function metamagicSavingThrowProtectionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isCarefulSavingThrowProtectionSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill === "spellTargetList") {
    return [
      resolveBattleSubjectRoute(
        "metamagicSavingThrowProtection",
        routeFill,
        result.tag === "needsHoles"
          ? battleReducerRouteHoles(result.holes)
          : [],
        "battleFeatureResource",
      ),
    ];
  }
  if (routeFill === "savingThrowOutcome") {
    const holes =
      result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
    return [
      resolveBattleSubjectRoute(
        "metamagicSavingThrowProtection",
        routeFill,
        holes,
        "battleSavingThrowOutcome",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "metamagicSavingThrowProtection",
        holes,
        "battleDamageAdjustment",
      ),
      ...(result.tag === "resolved"
        ? [
            resolveBattleSubjectWithoutFillRoute(
              "metamagicSavingThrowProtection",
              [],
              "battleFeatureResource",
            ) satisfies BattleReducerRouteEvent,
          ]
        : []),
    ];
  }
  if (routeFill === "rolledDice" && result.tag === "resolved") {
    return [
      resolveBattleSubjectWithoutFillRoute(
        "metamagicSavingThrowProtection",
        [],
        "battleFeatureResource",
      ),
    ];
  }
  return undefined;
}

function metamagicDamageTypeSubstitutionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (
    !isTransmutedDamageTypeSubstitutionSubject(input.state, input.subject) ||
    fill === undefined ||
    result.tag === "invalid"
  ) {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (
    (routeFill === "savingThrowOutcome" || routeFill === "attackRoll") &&
    holes.includes("rolledDice")
  ) {
    return [
      resolveBattleSubjectRoute(
        "metamagicDamageTypeSubstitution",
        "damageTypeChoice",
        holes,
        "battleDamageType",
      ),
    ];
  }
  if (routeFill === "rolledDice" && result.tag === "resolved") {
    return [
      resolveBattleSubjectRoute(
        "metamagicDamageTypeSubstitution",
        routeFill,
        [],
        "battleDamageRoll",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "metamagicDamageTypeSubstitution",
        [],
        "battleHitPoint",
      ),
    ];
  }
  return undefined;
}

function metamagicSavingThrowRollModeRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isHeightenedSavingThrowRollModeSubject(input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill === "targetChoice" &&
    fill.kind === "targetChoice" &&
    isHeightenedSpellTargetChoiceHoleId(fill.holeId) &&
    result.tag === "needsHoles" &&
    battleReducerRouteHoles(result.holes).includes("savingThrowOutcome")
  ) {
    const holes = battleReducerRouteHoles(result.holes);
    return [
      discoverBattleActsRoute(
        "metamagicSavingThrowRollMode",
        holes,
        "battleFeatureResource",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "metamagicSavingThrowRollMode",
        holes,
        "battleSavingThrowRollMode",
      ),
    ];
  }
  if (routeFill === "savingThrowOutcome" && result.tag === "resolved") {
    return [
      resolveBattleSubjectRoute(
        "metamagicSavingThrowRollMode",
        routeFill,
        [],
        "battleSavingThrowOutcome",
      ),
      resolveBattleSubjectWithoutFillRoute(
        "metamagicSavingThrowRollMode",
        [],
        "battleConditionLifecycle",
      ),
    ];
  }
  return undefined;
}

export function metamagicEffectiveSpellLevelRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    !isTwinnedEffectiveSpellLevelSubject(input.state, input.subject) ||
    result.tag === "invalid"
  ) {
    return undefined;
  }
  const fill = input.fills.at(-1);
  if (
    fill === undefined ||
    battleReducerRouteFill(fill) !== "spellTargetList"
  ) {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  return [
    resolveBattleSubjectWithoutFillRoute(
      "metamagicEffectiveSpellLevel",
      ["spellTargetList"],
      "battleSpellSlotAndActionEconomy",
    ),
    resolveBattleSubjectRoute(
      "metamagicEffectiveSpellLevel",
      "spellTargetList",
      holes,
      "battleTargetSelection",
    ),
  ];
}

function metamagicSpellRangeProjectionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isDistantSpellRangeProjectionSubject(input.state, input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "targetChoice") {
    return undefined;
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  return [
    resolveBattleSubjectWithoutFillRoute(
      "metamagicSpellRangeProjection",
      ["targetChoice"],
      "battleObjectTargetBoundary",
    ),
    resolveBattleSubjectRoute(
      "metamagicSpellRangeProjection",
      routeFill,
      holes,
      "battleTargetSelection",
    ),
  ];
}

export function metamagicSpellDurationProjectionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    !isExtendedSpellDurationProjectionSubject(input.state, input.subject) ||
    !metamagicSpellDurationProjectionChangedState(input, result.state)
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "metamagicSpellDurationProjection",
      [],
      "battleActiveEffect",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "metamagicSpellDurationProjection",
      [],
      "battleConcentration",
    ),
  ];
}

function metamagicSpellDurationProjectionChangedState(
  input: AdmittedBattleResolutionInput,
  after: BattleState,
): boolean {
  return (
    combatantsActiveEffectsChanged(input.state, after) ||
    (input.subject.tag === "actionSpell" &&
      combatantConcentrationChanged(input.state, after, input.subject.actorId))
  );
}

export function metamagicSpellComponentProjectionRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    !isSubtleSpellComponentProjectionSubject(input.subject)
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "metamagicSpellComponentProjection",
      [],
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

function metamagicDamageDiceRerollRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isSpellAttackDamageSubject(input.state, input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (
    routeFill === "attackRoll" &&
    result.tag === "needsHoles" &&
    hasEmpoweredSpellDamageRerollHole(result.holes)
  ) {
    return [
      discoverBattleActsRoute(
        "metamagicDamageDiceReroll",
        battleReducerRouteHoles(result.holes),
        "battleFeatureResource",
      ),
    ];
  }
  if (
    routeFill !== "rolledDice" ||
    fill.kind !== "rolledDice" ||
    fill.spellDamageReroll?.effectKind !== EMPOWERED_METAMAGIC_EFFECT_KIND ||
    result.tag !== "resolved"
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      "metamagicDamageDiceReroll",
      routeFill,
      ["rolledDice"],
      "battleDamageRoll",
    ),
    resolveBattleSubjectRoute(
      "metamagicDamageDiceReroll",
      routeFill,
      [],
      "battleDamageRoll",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "metamagicDamageDiceReroll",
      [],
      "battleHitPoint",
    ),
  ];
}

function metamagicMissedSpellAttackRerollRouteForResolution(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill | undefined,
): BattleReducerRouteEvents | undefined {
  if (!isSpellAttackDamageSubject(input.state, input.subject)) {
    return undefined;
  }
  if (fill === undefined || result.tag === "invalid") {
    return undefined;
  }
  const routeFill = battleReducerRouteFill(fill);
  if (routeFill !== "attackRoll") {
    return metamagicMissedSpellAttackRerollCompletionRoute(input, result, fill);
  }
  const holes =
    result.tag === "needsHoles" ? battleReducerRouteHoles(result.holes) : [];
  if (
    result.tag === "needsHoles" &&
    hasSeekingSpellAttackRerollHole(result.holes)
  ) {
    return [
      discoverBattleActsRoute(
        "metamagicMissedSpellAttackReroll",
        holes,
        "battleFeatureResource",
      ),
      resolveBattleSubjectRoute(
        "metamagicMissedSpellAttackReroll",
        routeFill,
        holes,
        "battleAttackRoll",
      ),
    ];
  }
  if (
    fill.kind !== "attackRoll" ||
    fill.value.spellAttackReroll?.effectKind !== SEEKING_METAMAGIC_EFFECT_KIND
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectRoute(
      "metamagicMissedSpellAttackReroll",
      routeFill,
      holes,
      "battleAttackRoll",
    ),
  ];
}

function metamagicMissedSpellAttackRerollCompletionRoute(
  input: AdmittedBattleResolutionInput,
  result: BattleResolutionResult,
  fill: BattleFill,
): BattleReducerRouteEvents | undefined {
  if (
    result.tag !== "resolved" ||
    battleReducerRouteFill(fill) !== "rolledDice" ||
    !input.fills.some(
      (candidate) =>
        candidate.kind === "attackRoll" &&
        candidate.value.spellAttackReroll?.effectKind ===
          SEEKING_METAMAGIC_EFFECT_KIND,
    )
  ) {
    return undefined;
  }
  return [
    resolveBattleSubjectWithoutFillRoute(
      "metamagicMissedSpellAttackReroll",
      [],
      "battleFeatureResource",
    ),
  ];
}

function hasSeekingSpellAttackRerollHole(
  holes: readonly BattleHole[],
): boolean {
  return holes.some(
    (hole) =>
      hole.kind === "attackRoll" &&
      "spellAttackRerolls" in hole &&
      hole.spellAttackRerolls?.some(
        (option) => option.effectKind === SEEKING_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
}

function hasEmpoweredSpellDamageRerollHole(
  holes: readonly BattleHole[],
): boolean {
  return holes.some(
    (hole) =>
      hole.kind === "rolledDice" &&
      "spellDamageRerolls" in hole &&
      hole.spellDamageRerolls?.some(
        (option) => option.effectKind === EMPOWERED_METAMAGIC_EFFECT_KIND,
      ) === true,
  );
}

function metamagicBonusActionTimingRoutes(
  holes: readonly BattleReducerRouteHole[],
): readonly [BattleReducerRouteEvent, BattleReducerRouteEvent] {
  return [
    resolveBattleSubjectWithoutFillRoute(
      "metamagicBonusActionCastingTime",
      holes,
      "battleActionEconomy",
    ),
    resolveBattleSubjectWithoutFillRoute(
      "metamagicBonusActionCastingTime",
      holes,
      "battleSpellSlotAndActionEconomy",
    ),
  ];
}

function metamagicSaveGatedFinalOwner(
  before: BattleState,
  after: BattleState,
): BattleReducerRouteOwnerGroup {
  return combatantsActiveEffectCountIncreased(before, after)
    ? "battleActiveEffect"
    : "battleConditionLifecycle";
}

function metamagicGovernorInvalidRoute(
  input: AdmittedBattleResolutionInput,
): BattleReducerRouteEvent {
  if (
    isQuickenedBonusActionCastingTimeSubject(input.subject) &&
    input.state.currentTurnResources.levelOnePlusSpellCastsThisTurn.includes(
      input.subject.actorId,
    )
  ) {
    return resolveBattleSubjectWithoutFillRoute(
      "metamagicBonusActionCastingTime",
      [],
      "battleTurnBoundary",
    );
  }
  return resolveBattleSubjectWithoutFillRoute(
    "metamagicSpellGovernor",
    [],
    "battleFeatureResource",
  );
}

function isTwinnedEffectiveSpellLevelDiscoveryAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): boolean {
  return (
    isTwinnedEffectiveSpellLevelSubject(state, act.subject) &&
    act.initialHoles.some((hole) => hole.kind === "spellTargetList")
  );
}

function isCarefulSavingThrowProtectionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === CAREFUL_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isDistantSpellRangeProjectionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.mode.tag === "cast" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "objectLight" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === DISTANT_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isHeightenedSavingThrowRollModeSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === HEIGHTENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isTransmutedDamageTypeSubstitutionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    (spellInvocationForRouteSubject(state, subject)?.procedure ===
      "saveGatedDamage" ||
      spellInvocationForRouteSubject(state, subject)?.procedure ===
        "spellAttackDamage") &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === TRANSMUTED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isTwinnedEffectiveSpellLevelSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.mode.tag === "cast" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "rollModifier" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === TWINNED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isExtendedSpellDurationProjectionSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    subject.mode.tag === "cast" &&
    (spellInvocationForRouteSubject(state, subject)?.procedure ===
      "creatureSizeIncrease" ||
      spellInvocationForRouteSubject(state, subject)?.procedure ===
        "creatureSizeDecrease") &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === EXTENDED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isSubtleSpellComponentProjectionSubject(
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    (subject.tag === "actionSpell" || subject.tag === "bonusActionSpell") &&
    subject.mode.tag === "cast" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === SUBTLE_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isSpellAttackDamageSubject(
  state: BattleState,
  subject: BattleResolutionInput["subject"],
): boolean {
  return (
    subject.tag === "actionSpell" &&
    spellInvocationForRouteSubject(state, subject)?.procedure ===
      "spellAttackDamage"
  );
}

export function metamagicEffectiveSpellLevelRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  return isTwinnedEffectiveSpellLevelDiscoveryAct(state, act)
    ? [
        discoverBattleActsRoute(
          "metamagicEffectiveSpellLevel",
          battleReducerRouteHoles(act.initialHoles),
          "battleFeatureResource",
        ),
      ]
    : undefined;
}

export function metamagicSpellComponentProjectionRouteForDiscoveredAct(
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  return isSubtleSpellComponentProjectionSubject(act.subject)
    ? [
        discoverBattleActsRoute(
          "metamagicSpellComponentProjection",
          [],
          "battleFeatureResource",
        ),
      ]
    : undefined;
}

export function metamagicSpellDurationProjectionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  return isExtendedSpellDurationProjectionSubject(state, act.subject)
    ? [
        discoverBattleActsRoute(
          "metamagicSpellDurationProjection",
          [],
          "battleFeatureResource",
        ),
      ]
    : undefined;
}

export function metamagicCastingOptionRouteForDiscoveredAct(
  state: BattleState,
  act: BattleActDiscoveryCandidate,
): BattleReducerRouteEvents | undefined {
  if (isQuickenedBonusActionCastingTimeSubject(act.subject)) {
    return [
      discoverBattleActsRoute(
        "metamagicBonusActionCastingTime",
        battleReducerRouteHoles(act.initialHoles),
        "battleFeatureResource",
      ),
    ];
  }
  if (isCarefulSavingThrowProtectionSubject(act.subject)) {
    return [
      discoverBattleActsRoute(
        "metamagicSavingThrowProtection",
        battleReducerRouteHoles(act.initialHoles),
        "battleFeatureResource",
      ),
    ];
  }
  if (isTransmutedDamageTypeSubstitutionSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "metamagicDamageTypeSubstitution",
        ["damageTypeChoice"],
        "battleFeatureResource",
      ),
    ];
  }
  if (isDistantSpellRangeProjectionSubject(state, act.subject)) {
    return [
      discoverBattleActsRoute(
        "metamagicSpellRangeProjection",
        battleReducerRouteHoles(act.initialHoles),
        "battleFeatureResource",
      ),
    ];
  }
  return undefined;
}

function isQuickenedBonusActionCastingTimeSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionSpell" }
> {
  return (
    subject.tag === "bonusActionSpell" &&
    subject.metamagic?.some(
      (selection) => selection.effectKind === QUICKENED_METAMAGIC_EFFECT_KIND,
    ) === true
  );
}

function isBonusActionSpellWithMetamagicSubject(
  subject: BattleResolutionInput["subject"],
): subject is Extract<
  BattleResolutionInput["subject"],
  { readonly tag: "bonusActionSpell" }
> {
  return subject.tag === "bonusActionSpell" && subject.metamagic !== undefined;
}
