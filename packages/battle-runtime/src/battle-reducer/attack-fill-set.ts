// Attack replay fill parser extracted from attack-resolution.ts.
// Owns classification of attack fills and the uniqueness invariant for attack target distance facts.
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.PRONE_TARGET_ROLL_MODE
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.brutal-strike
// KERNEL-COVERAGE: runtime-owner BATTLE.ATTACK.ORDINARY_OBJECT_PROCEDURE BATTLE.DAMAGE.OBJECT_DAMAGE_TRANSITION

import { Match } from "effect";
import {
  type BattleFill,
  type BattleRolledDiceFill,
  type BattleBrutalStrikeForcefulBlowMovementFill,
  type BattleState,
  type BattleTargetSpatialFact,
} from "../battle-state-execution.ts";
import {
  ATTACK_DAMAGE_DISPOSITION_HOLE_ID,
  ATTACK_ROLL_HOLE_ID,
  ATTACK_TARGET_HOLE_ID,
  FRENZY_DAMAGE_TYPE_HOLE_ID,
  GRAPPLE_OUTCOME_HOLE_ID,
  type AttackFillSet,
  type SelectedAttackFillSet,
} from "./battle-runtime-protocol.ts";
import type { CombatantId } from "../identity.ts";
import {
  parseAttackTargetChoiceFill,
  type BattleAttackTargetChoiceFill,
} from "./roll-trigger-relationship-facts.ts";
import {
  isSourceDamageRollPenaltyRollFill,
  isSpellDamageReductionRollFill,
} from "./damage-helpers.ts";
import {
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID,
  ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID,
  WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID,
  BRUTAL_STRIKE_DECISION_HOLE_ID,
  BRUTAL_STRIKE_EFFECT_DECISION_HOLE_ID,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_ID,
  BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID,
  TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID,
  REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID,
  WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID,
  HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_ID,
  GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID,
  OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID,
  OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID,
  CUNNING_STRIKE_MOVEMENT_HOLE_ID,
  CUNNING_STRIKE_END_TURN_COVER_HOLE_ID,
  CUNNING_STRIKE_SAVE_HOLE_ID,
  CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID,
  STUNNING_STRIKE_DECISION_HOLE_ID,
  STUNNING_STRIKE_SAVE_HOLE_ID,
} from "./domain-constants.ts";
import { isSaveGatedConditionWithRepeatDamageRepeatSaveFill } from "./staged-condition-repeat-save.ts";
import { isDuplicateHitInterceptionDuplicateRollFill } from "./duplicate-hit-interception.ts";
import { DamageRelationshipDecisionsByHole } from "./damage-relationship-decisions.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";

function isBrutalStrikeForcefulBlowMovementFill(
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
): fill is BattleBrutalStrikeForcefulBlowMovementFill {
  return fill.value.brutalStrikeForcefulBlow !== undefined;
}

export function selectedAttackFillSet(
  fills: readonly BattleFill[],
  attackerId: CombatantId,
  state: BattleState,
  attackRollRelationshipFactsAllowed = false,
): SelectedAttackFillSet {
  const attackRelationshipDecisionRequired =
    ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      attackerId,
      "attackRollAgainstEnemy",
    );
  const context = createSelectedAttackFillContext();
  const collectionIssue = collectSelectedAttackFills({
    fills,
    attackerId,
    context,
    attackRelationshipDecisionRequired,
    attackRollRelationshipFactsAllowed,
  });
  if (collectionIssue !== null) return collectionIssue;

  const {
    targetId,
    objectTarget,
    targetSpatialFacts,
    targetRelationshipFacts,
    attackRollRelationshipFacts,
    attackRoll,
    frenzyDamageTypeChoice,
    concentrationSavingThrows,
    damageDisposition,
    damageDispositionFilled,
    weaponMasteryCleaveDamageDisposition,
    weaponMasteryCleaveDamageDispositionFilled,
    huntersPreyHordeBreakerDamageDisposition,
    huntersPreyHordeBreakerDamageDispositionFilled,
    damageRoll,
    duplicateHitInterceptionRoll,
    spellDamageReductionRoll,
    sourceDamageRollPenaltyRolls,
    attackDamageReductionRedirectTarget,
    attackDamageReductionRedirectSave,
    attackDamageReductionRedirectDamage,
    weaponMasteryToppleSavingThrow,
    tacticalMasterReplacementDecision,
    brutalStrikeDecision,
    brutalStrikeEffectDecision,
    brutalStrikeForcefulBlowMovementDecision,
    brutalStrikeForcefulBlowMovement,
    openHandTechniqueDecision,
    openHandTechniqueSavingThrow,
    stunningStrikeDecision,
    stunningStrikeSavingThrow,
    cunningStrikeSavingThrow,
    cunningStrikeMovement,
    cunningStrikeToolPossession,
    cunningStrikeEndTurnCover,
    saveGatedConditionWithRepeatDamageRepeatSaves,
    weaponMasteryCleaveDecision,
    weaponMasteryCleaveTarget,
    weaponMasteryCleaveAttackRoll,
    weaponMasteryCleaveDamageRoll,
    remarkableAthleteCriticalHitMovementDecision,
    remarkableAthleteCriticalHitMovement,
    weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision,
    weaponMasteryCleaveRemarkableAthleteCriticalHitMovement,
    huntersPreyHordeBreakerDecision,
    huntersPreyHordeBreakerTarget,
    huntersPreyHordeBreakerAttackRoll,
    huntersPreyHordeBreakerDamageRoll,
    grapplerPunchAndGrabDecision,
    grapplerPunchAndGrabOutcome,
  } = context;

  if (objectTarget !== undefined) {
    const incompatibleFills = fills.filter(
      (fill) =>
        !(
          (fill.kind === "objectTargetChoice" &&
            fill.holeId === ATTACK_TARGET_HOLE_ID) ||
          (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) ||
          fill === damageRoll
        ),
    );
    if (incompatibleFills.length > 0) {
      return {
        tag: "invalid",
        message:
          "Object attacks do not accept these creature-only fills: " +
          incompatibleFills.map((fill) => fill.kind).join(", ") +
          ".",
      };
    }
    return {
      tag: "objectTarget",
      target: objectTarget,
      attackRoll,
      damageRoll,
    };
  }

  const relationshipDecisions = DamageRelationshipDecisionsByHole.parse({
    fills,
    damageEventHoleIds: new Set(
      [
        damageRoll,
        weaponMasteryCleaveDamageRoll,
        huntersPreyHordeBreakerDamageRoll,
        attackDamageReductionRedirectDamage,
      ]
        .flatMap((fill) => (fill === undefined ? [] : [fill.holeId]))
        .concat(damageRoll === undefined ? [ATTACK_ROLL_HOLE_ID] : []),
    ),
    owner: "an Attack",
  });
  /* v8 ignore start -- @preserve -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipDecisions.tag === "invalid") {
    /* v8 ignore next -- @preserve -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
    return {
      tag: "invalid",
      message: relationshipDecisions.message,
    };
  }
  /* v8 ignore stop -- @preserve */

  return {
    tag: "ok",
    targetId,
    targetSpatialFacts,
    damageRelationshipDecisions:
      relationshipDecisions.decisionsByRelationshipHole,
    targetRelationshipFacts,
    attackRollRelationshipFacts,
    attackRoll,
    frenzyDamageTypeChoice,
    concentrationSavingThrows,
    saveGatedConditionWithRepeatDamageRepeatSaves,
    damageDisposition,
    damageDispositionFilled,
    damageRoll,
    duplicateHitInterceptionRoll,
    spellDamageReductionRoll,
    sourceDamageRollPenaltyRolls,
    attackDamageReductionRedirectTarget,
    attackDamageReductionRedirectSave,
    attackDamageReductionRedirectDamage,
    weaponMasteryToppleSavingThrow,
    tacticalMasterReplacementDecision,
    brutalStrikeDecision,
    brutalStrikeEffectDecision,
    brutalStrikeForcefulBlowMovementDecision,
    brutalStrikeForcefulBlowMovement,
    openHandTechniqueDecision,
    openHandTechniqueSavingThrow,
    stunningStrikeDecision,
    stunningStrikeSavingThrow,
    cunningStrikeSavingThrow,
    cunningStrikeMovement,
    cunningStrikeToolPossession,
    cunningStrikeEndTurnCover,
    weaponMasteryCleaveDecision,
    weaponMasteryCleaveTarget,
    weaponMasteryCleaveAttackRoll,
    weaponMasteryCleaveDamageRoll,
    weaponMasteryCleaveDamageDisposition,
    weaponMasteryCleaveDamageDispositionFilled,
    remarkableAthleteCriticalHitMovementDecision,
    remarkableAthleteCriticalHitMovement,
    weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision,
    weaponMasteryCleaveRemarkableAthleteCriticalHitMovement,
    huntersPreyHordeBreakerDecision,
    huntersPreyHordeBreakerTarget,
    huntersPreyHordeBreakerAttackRoll,
    huntersPreyHordeBreakerDamageRoll,
    huntersPreyHordeBreakerDamageDisposition,
    huntersPreyHordeBreakerDamageDispositionFilled,
    grapplerPunchAndGrabDecision,
    grapplerPunchAndGrabOutcome,
  };
}

type SelectedAttackObjectTarget = {
  readonly objectId: import("../identity.ts").BattleObjectId;
  readonly spatialFacts: readonly Extract<
    BattleTargetSpatialFact,
    { readonly kind: "attackObjectTarget" }
  >[];
};

type MutableFields<Value> = {
  -readonly [Key in keyof Value]: Value[Key];
};
type SelectedAttackCreatureFillContext = Omit<
  MutableFields<Extract<AttackFillSet, { readonly tag: "ok" }>>,
  | "tag"
  | "damageRelationshipDecisions"
  | "concentrationSavingThrows"
  | "saveGatedConditionWithRepeatDamageRepeatSaves"
  | "sourceDamageRollPenaltyRolls"
  | "weaponMasteryCleaveTarget"
  | "huntersPreyHordeBreakerTarget"
>;
type SelectedAttackFillContext = SelectedAttackCreatureFillContext & {
  objectTarget: SelectedAttackObjectTarget | undefined;
  targetSpatialFactsFilled: boolean;
  attackRollFill:
    | Extract<BattleFill, { readonly kind: "attackRoll" }>
    | undefined;
  concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[];
  saveGatedConditionWithRepeatDamageRepeatSaves: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[];
  sourceDamageRollPenaltyRolls: BattleRolledDiceFill[];
  weaponMasteryCleaveTarget: BattleAttackTargetChoiceFill | undefined;
  huntersPreyHordeBreakerTarget: BattleAttackTargetChoiceFill | undefined;
  concentrationSavingThrowHoleIdsBeforeCleave: Set<string>;
  concentrationSavingThrowHoleIdsAfterCleave: Set<string>;
};
type SelectedAttackFillError = Extract<
  SelectedAttackFillSet,
  { readonly tag: "invalid" }
>;
type SelectedAttackFillProcessingResult =
  | SelectedAttackFillError
  | null
  | undefined;

function createSelectedAttackFillContext(): SelectedAttackFillContext {
  return {
    targetId: undefined,
    objectTarget: undefined,
    targetSpatialFacts: [],
    targetRelationshipFacts: [],
    attackRollRelationshipFacts: [],
    targetSpatialFactsFilled: false,
    attackRoll: undefined,
    attackRollFill: undefined,
    frenzyDamageTypeChoice: undefined,
    concentrationSavingThrows: [],
    concentrationSavingThrowHoleIdsBeforeCleave: new Set<string>(),
    concentrationSavingThrowHoleIdsAfterCleave: new Set<string>(),
    damageDisposition: { kind: "ordinaryDamage" },
    damageDispositionFilled: false,
    weaponMasteryCleaveDamageDisposition: { kind: "ordinaryDamage" },
    weaponMasteryCleaveDamageDispositionFilled: false,
    huntersPreyHordeBreakerDamageDisposition: { kind: "ordinaryDamage" },
    huntersPreyHordeBreakerDamageDispositionFilled: false,
    damageRoll: undefined,
    duplicateHitInterceptionRoll: undefined,
    spellDamageReductionRoll: undefined,
    sourceDamageRollPenaltyRolls: [],
    attackDamageReductionRedirectTarget: undefined,
    attackDamageReductionRedirectSave: undefined,
    attackDamageReductionRedirectDamage: undefined,
    weaponMasteryToppleSavingThrow: undefined,
    tacticalMasterReplacementDecision: undefined,
    brutalStrikeDecision: undefined,
    brutalStrikeEffectDecision: undefined,
    brutalStrikeForcefulBlowMovementDecision: undefined,
    brutalStrikeForcefulBlowMovement: undefined,
    openHandTechniqueDecision: undefined,
    openHandTechniqueSavingThrow: undefined,
    stunningStrikeDecision: undefined,
    stunningStrikeSavingThrow: undefined,
    cunningStrikeSavingThrow: undefined,
    cunningStrikeMovement: undefined,
    cunningStrikeToolPossession: undefined,
    cunningStrikeEndTurnCover: undefined,
    saveGatedConditionWithRepeatDamageRepeatSaves: [],
    weaponMasteryCleaveDecision: undefined,
    weaponMasteryCleaveTarget: undefined,
    weaponMasteryCleaveAttackRoll: undefined,
    weaponMasteryCleaveDamageRoll: undefined,
    remarkableAthleteCriticalHitMovementDecision: undefined,
    remarkableAthleteCriticalHitMovement: undefined,
    weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision: undefined,
    weaponMasteryCleaveRemarkableAthleteCriticalHitMovement: undefined,
    huntersPreyHordeBreakerDecision: undefined,
    huntersPreyHordeBreakerTarget: undefined,
    huntersPreyHordeBreakerAttackRoll: undefined,
    huntersPreyHordeBreakerDamageRoll: undefined,
    grapplerPunchAndGrabDecision: undefined,
    grapplerPunchAndGrabOutcome: undefined,
  };
}

function selectedAttackFillError(message: string): SelectedAttackFillError {
  return { tag: "invalid", message };
}

function rememberSelectedAttackFill<T>(
  existing: T | undefined,
  value: T,
  message: string,
  assign: (value: T) => void,
): SelectedAttackFillError | null {
  if (existing !== undefined) return selectedAttackFillError(message);
  assign(value);
  return null;
}

function collectSelectedAttackFills(input: {
  readonly fills: readonly BattleFill[];
  readonly attackerId: CombatantId;
  readonly context: SelectedAttackFillContext;
  readonly attackRelationshipDecisionRequired: boolean;
  readonly attackRollRelationshipFactsAllowed: boolean;
}): SelectedAttackFillError | null {
  for (const fill of input.fills) {
    const result = processSelectedAttackFill({
      fill,
      attackerId: input.attackerId,
      context: input.context,
      attackRelationshipDecisionRequired:
        input.attackRelationshipDecisionRequired,
      attackRollRelationshipFactsAllowed:
        input.attackRollRelationshipFactsAllowed,
    });
    if (result !== null && result !== undefined) return result;
  }
  return null;
}

function processSelectedAttackFill(input: {
  readonly fill: BattleFill;
  readonly attackerId: CombatantId;
  readonly context: SelectedAttackFillContext;
  readonly attackRelationshipDecisionRequired: boolean;
  readonly attackRollRelationshipFactsAllowed: boolean;
}): SelectedAttackFillProcessingResult {
  const { fill } = input;
  const result = Match.value(fill).pipe(
    Match.when(isSelectedAttackSupportedFill, (supportedFill) =>
      processSelectedAttackSupportedFill({
        ...input,
        fill: supportedFill,
      }),
    ),
    Match.when(isSelectedAttackUnsupportedFill, unsupportedAttackFill),
    Match.exhaustive,
  );
  return result;
}

const SELECTED_ATTACK_SUPPORTED_FILL_KINDS = [
  "damageRelationshipDecisions",
  "targetingSaveInterdictionOutcome",
  "unitFeatureDecision",
  "movement",
  "targetChoice",
  "objectTargetChoice",
  "targetSpatialFacts",
  "attackRoll",
  "savingThrowOutcome",
  "rolledDice",
  "concentrationSavingThrow",
  "attackDamageDisposition",
  "damageTypeChoice",
  "toolPossessionFacts",
  "cunningStrikeEndTurnCoverFacts",
  "grappleOutcome",
] as const satisfies readonly BattleFill["kind"][];

type SelectedAttackSupportedFillKind =
  (typeof SELECTED_ATTACK_SUPPORTED_FILL_KINDS)[number];
type SelectedAttackSupportedFill = Extract<
  BattleFill,
  { readonly kind: SelectedAttackSupportedFillKind }
>;
const SELECTED_ATTACK_SUPPORTED_FILL_KIND_SET: ReadonlySet<BattleFill["kind"]> =
  new Set(SELECTED_ATTACK_SUPPORTED_FILL_KINDS);

function isSelectedAttackSupportedFill(
  fill: BattleFill,
): fill is SelectedAttackSupportedFill {
  return SELECTED_ATTACK_SUPPORTED_FILL_KIND_SET.has(fill.kind);
}

function isSelectedAttackUnsupportedFill(
  fill: BattleFill,
): fill is Exclude<BattleFill, SelectedAttackSupportedFill> {
  return !isSelectedAttackSupportedFill(fill);
}

function processSelectedAttackSupportedFill(input: {
  readonly fill: SelectedAttackSupportedFill;
  readonly attackerId: CombatantId;
  readonly context: SelectedAttackFillContext;
  readonly attackRelationshipDecisionRequired: boolean;
  readonly attackRollRelationshipFactsAllowed: boolean;
}): SelectedAttackFillProcessingResult {
  const { fill, context } = input;
  return Match.value(fill).pipe(
    Match.when({ kind: "damageRelationshipDecisions" }, () => null),
    Match.when({ kind: "targetingSaveInterdictionOutcome" }, () => null),
    Match.when({ kind: "unitFeatureDecision" }, (value) =>
      processUnitFeatureDecisionFill(value, context),
    ),
    Match.when({ kind: "movement" }, (value) =>
      processMovementFill(value, context),
    ),
    Match.when({ kind: "targetChoice" }, (value) =>
      processParsedTargetChoiceFill({
        fill: value,
        context,
        attackerId: input.attackerId,
        attackRelationshipDecisionRequired:
          input.attackRelationshipDecisionRequired,
      }),
    ),
    Match.when({ kind: "objectTargetChoice" }, (value) =>
      processObjectTargetChoiceFill(value, context),
    ),
    Match.when({ kind: "targetSpatialFacts" }, (value) =>
      processTargetSpatialFactsFill(value, context),
    ),
    Match.when({ kind: "attackRoll" }, (value) =>
      processAttackRollFill({
        fill: value,
        context,
        attackRollRelationshipFactsAllowed:
          input.attackRollRelationshipFactsAllowed,
      }),
    ),
    Match.when({ kind: "savingThrowOutcome" }, (value) =>
      processSavingThrowOutcomeFill(value, context),
    ),
    Match.when({ kind: "rolledDice" }, (value) =>
      processRolledDiceFill(value, context),
    ),
    Match.when({ kind: "concentrationSavingThrow" }, (value) =>
      processConcentrationSavingThrowFill(value, context),
    ),
    Match.when({ kind: "attackDamageDisposition" }, (value) =>
      processAttackDamageDispositionFill(value, context),
    ),
    Match.when({ kind: "damageTypeChoice" }, (value) =>
      processDamageTypeChoiceFill(value, context),
    ),
    Match.when({ kind: "toolPossessionFacts" }, (value) =>
      processToolPossessionFill(value, context),
    ),
    Match.when({ kind: "cunningStrikeEndTurnCoverFacts" }, (value) =>
      processCunningStrikeEndTurnCoverFill(value, context),
    ),
    Match.when({ kind: "grappleOutcome" }, (value) =>
      processGrappleOutcomeFill(value, context),
    ),
    Match.exhaustive,
  );
}

function unsupportedAttackFill(fill: BattleFill): SelectedAttackFillError {
  return selectedAttackFillError(
    "Fill " + fill.kind + " does not match the Attack replay holes.",
  );
}

function processParsedTargetChoiceFill(input: {
  readonly fill: Extract<BattleFill, { readonly kind: "targetChoice" }>;
  readonly context: SelectedAttackFillContext;
  readonly attackerId: CombatantId;
  readonly attackRelationshipDecisionRequired: boolean;
}): SelectedAttackFillProcessingResult {
  const parsed = parseAttackTargetChoiceFill(
    input.fill,
    input.attackerId,
    input.attackRelationshipDecisionRequired,
  );
  if (parsed.tag === "invalid") return parsed;
  return processTargetChoiceFill({
    ...input,
    fill: parsed.fill,
  });
}

function processUnitFeatureDecisionFill(
  fill: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  const first = processUnitFeatureDecisionGroupA(fill, context);
  return first === undefined
    ? processUnitFeatureDecisionGroupB(fill, context)
    : first;
}

function processUnitFeatureDecisionGroupA(
  fill: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId === BRUTAL_STRIKE_EFFECT_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.brutalStrikeEffectDecision,
      fill,
      "Brutal Strike effect decision was filled twice.",
      (value) => {
        context.brutalStrikeEffectDecision = value;
      },
    );
  }
  if (fill.holeId === BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.brutalStrikeForcefulBlowMovementDecision,
      fill,
      "Brutal Strike Forceful Blow movement decision was filled twice.",
      (value) => {
        context.brutalStrikeForcefulBlowMovementDecision = value;
      },
    );
  }
  if (
    fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID
  ) {
    if (context.weaponMasteryCleaveAttackRoll !== undefined) {
      return rememberSelectedAttackFill(
        context.weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision,
        fill,
        "Weapon Mastery Cleave Remarkable Athlete movement decision was filled twice.",
        (value) => {
          context.weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision =
            value;
        },
      );
    }
    return rememberSelectedAttackFill(
      context.remarkableAthleteCriticalHitMovementDecision,
      fill,
      "Remarkable Athlete movement decision was filled twice.",
      (value) => {
        context.remarkableAthleteCriticalHitMovementDecision = value;
      },
    );
  }
  if (fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.huntersPreyHordeBreakerDecision,
      fill,
      "Hunter's Prey Horde Breaker decision was filled twice.",
      (value) => {
        context.huntersPreyHordeBreakerDecision = value;
      },
    );
  }
  if (fill.holeId === GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.grapplerPunchAndGrabDecision,
      fill,
      "Grappler Punch and Grab decision was filled twice.",
      (value) => {
        context.grapplerPunchAndGrabDecision = value;
      },
    );
  }
  if (fill.holeId === WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.weaponMasteryCleaveDecision,
      fill,
      "Weapon Mastery Cleave decision was filled twice.",
      (value) => {
        context.weaponMasteryCleaveDecision = value;
      },
    );
  }
  return undefined;
}

function processUnitFeatureDecisionGroupB(
  fill: Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId === TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.tacticalMasterReplacementDecision,
      fill,
      "Tactical Master replacement decision was filled twice.",
      (value) => {
        context.tacticalMasterReplacementDecision = value;
      },
    );
  }
  if (fill.holeId === BRUTAL_STRIKE_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.brutalStrikeDecision,
      fill,
      "Brutal Strike decision was filled twice.",
      (value) => {
        context.brutalStrikeDecision = value;
      },
    );
  }
  if (fill.holeId === OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.openHandTechniqueDecision,
      fill,
      "Open Hand Technique decision was filled twice.",
      (value) => {
        context.openHandTechniqueDecision = value;
      },
    );
  }
  if (fill.holeId === STUNNING_STRIKE_DECISION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.stunningStrikeDecision,
      fill,
      "Stunning Strike decision was filled twice.",
      (value) => {
        context.stunningStrikeDecision = value;
      },
    );
  }
  return selectedAttackFillError(
    "Unit feature decision fill uses an unexpected Attack hole.",
  );
}

function processMovementFill(
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId === BRUTAL_STRIKE_FORCEFUL_BLOW_MOVEMENT_HOLE_ID) {
    return processBrutalStrikeForcefulBlowMovementFill(fill, context);
  }
  if (fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID) {
    return processRemarkableAthleteCriticalHitMovementFill(fill, context);
  }
  if (fill.holeId === CUNNING_STRIKE_MOVEMENT_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.cunningStrikeMovement,
      fill,
      "Cunning Strike movement was filled twice.",
      (value) => {
        context.cunningStrikeMovement = value;
      },
    );
  }
  return selectedAttackFillError(
    "Movement fill uses an unexpected Attack hole.",
  );
}

function processBrutalStrikeForcefulBlowMovementFill(
  fill:
    | BattleBrutalStrikeForcefulBlowMovementFill
    | Extract<BattleFill, { readonly kind: "movement" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (context.brutalStrikeForcefulBlowMovement !== undefined) {
    return selectedAttackFillError(
      "Brutal Strike Forceful Blow movement was filled twice.",
    );
  }
  if (!isBrutalStrikeForcefulBlowMovementFill(fill)) {
    return selectedAttackFillError(
      "Brutal Strike Forceful Blow movement requires the straight-toward-target fact.",
    );
  }
  context.brutalStrikeForcefulBlowMovement = fill;
  return null;
}

function processRemarkableAthleteCriticalHitMovementFill(
  fill: Extract<BattleFill, { readonly kind: "movement" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (
    context.weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision !==
    undefined
  ) {
    return rememberSelectedAttackFill(
      context.weaponMasteryCleaveRemarkableAthleteCriticalHitMovement,
      fill,
      "Weapon Mastery Cleave Remarkable Athlete movement was filled twice.",
      (value) => {
        context.weaponMasteryCleaveRemarkableAthleteCriticalHitMovement = value;
      },
    );
  }
  return rememberSelectedAttackFill(
    context.remarkableAthleteCriticalHitMovement,
    fill,
    "Remarkable Athlete movement was filled twice.",
    (value) => {
      context.remarkableAthleteCriticalHitMovement = value;
    },
  );
}

function parseAndRememberAttackTargetChoice(
  fill: BattleAttackTargetChoiceFill,
  existing: BattleAttackTargetChoiceFill | undefined,
  message: string,
  attackerId: CombatantId,
  relationshipRequired: boolean,
  assign: (value: BattleAttackTargetChoiceFill) => void,
): SelectedAttackFillError | null {
  if (existing !== undefined) return selectedAttackFillError(message);
  const parsed = parseAttackTargetChoiceFill(
    fill,
    attackerId,
    relationshipRequired,
  );
  if (parsed.tag === "invalid") return parsed;
  assign(parsed.fill);
  return null;
}

function processTargetChoiceFill(input: {
  readonly fill: BattleAttackTargetChoiceFill;
  readonly context: SelectedAttackFillContext;
  readonly attackerId: CombatantId;
  readonly attackRelationshipDecisionRequired: boolean;
}): SelectedAttackFillProcessingResult {
  const { fill, context } = input;
  if (fill.holeId === HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_ID) {
    return processHuntersPreyHordeBreakerTargetFill(input);
  }
  if (fill.holeId === WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID) {
    return processWeaponMasteryCleaveTargetFill(input);
  }
  if (fill.holeId === ATTACK_TARGET_HOLE_ID) {
    return processPrimaryAttackTargetChoiceFill(input);
  }
  if (
    fill.holeId === ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID
  ) {
    return processAttackDamageReductionRedirectTargetFill(fill, context);
  }
  return selectedAttackFillError(
    "Target choice fill uses an unexpected Attack hole.",
  );
}

function processHuntersPreyHordeBreakerTargetFill(input: {
  readonly fill: BattleAttackTargetChoiceFill;
  readonly context: SelectedAttackFillContext;
  readonly attackerId: CombatantId;
  readonly attackRelationshipDecisionRequired: boolean;
}): SelectedAttackFillProcessingResult {
  return parseAndRememberAttackTargetChoice(
    input.fill,
    input.context.huntersPreyHordeBreakerTarget,
    "Hunter's Prey Horde Breaker target was filled twice.",
    input.attackerId,
    input.attackRelationshipDecisionRequired,
    (value) => {
      input.context.huntersPreyHordeBreakerTarget = value;
    },
  );
}

function processWeaponMasteryCleaveTargetFill(input: {
  readonly fill: BattleAttackTargetChoiceFill;
  readonly context: SelectedAttackFillContext;
  readonly attackerId: CombatantId;
  readonly attackRelationshipDecisionRequired: boolean;
}): SelectedAttackFillProcessingResult {
  return parseAndRememberAttackTargetChoice(
    input.fill,
    input.context.weaponMasteryCleaveTarget,
    "Weapon Mastery Cleave target was filled twice.",
    input.attackerId,
    input.attackRelationshipDecisionRequired,
    (value) => {
      input.context.weaponMasteryCleaveTarget = value;
    },
  );
}

function processPrimaryAttackTargetChoiceFill(input: {
  readonly fill: BattleAttackTargetChoiceFill;
  readonly context: SelectedAttackFillContext;
  readonly attackerId: CombatantId;
  readonly attackRelationshipDecisionRequired: boolean;
}): SelectedAttackFillProcessingResult {
  const parsed = parseAttackTargetChoiceFill(
    input.fill,
    input.attackerId,
    input.attackRelationshipDecisionRequired,
  );
  if (parsed.tag === "invalid") return parsed;
  if (
    input.context.targetId !== undefined ||
    input.context.objectTarget !== undefined
  ) {
    return selectedAttackFillError("Attack target was filled twice.");
  }
  if (input.context.targetSpatialFactsFilled) {
    return selectedAttackFillError(
      "Attack target spatial facts were filled twice.",
    );
  }
  input.context.targetId = input.fill.value;
  input.context.targetSpatialFacts = input.fill.spatialFacts ?? [];
  input.context.targetRelationshipFacts = parsed.fill.relationshipFacts ?? [];
  input.context.targetSpatialFactsFilled = true;
  const spatialFactValidation = validateUniqueAttackTargetSpatialFacts(
    input.context.targetSpatialFacts,
  );
  return spatialFactValidation === null
    ? null
    : selectedAttackFillError(spatialFactValidation);
}

function processAttackDamageReductionRedirectTargetFill(
  fill: BattleAttackTargetChoiceFill,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  return (
    rememberSelectedAttackFill(
      context.attackDamageReductionRedirectTarget,
      fill,
      "Attack damage reduction redirect target was filled twice.",
      (value) => {
        context.attackDamageReductionRedirectTarget = value;
      },
    ) ??
    (fill.relationshipFacts !== undefined
      ? selectedAttackFillError(
          "Attack damage redirect target relationship facts do not match a requested target decision.",
        )
      : null)
  );
}

function processObjectTargetChoiceFill(
  fill: Extract<BattleFill, { readonly kind: "objectTargetChoice" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (context.objectTarget !== undefined || context.targetId !== undefined) {
    return selectedAttackFillError("Attack target was filled twice.");
  }
  const spatialFacts = fill.spatialFacts.filter(
    (
      fact,
    ): fact is Extract<
      BattleTargetSpatialFact,
      { readonly kind: "attackObjectTarget" }
    > => fact.kind === "attackObjectTarget",
  );
  if (spatialFacts.length !== fill.spatialFacts.length) {
    return selectedAttackFillError(
      "Ordinary object attacks require object attack table facts.",
    );
  }
  context.objectTarget = { objectId: fill.value, spatialFacts };
  return null;
}

function processTargetSpatialFactsFill(
  fill: Extract<BattleFill, { readonly kind: "targetSpatialFacts" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (context.targetSpatialFactsFilled) {
    return selectedAttackFillError(
      "Attack target spatial facts were filled twice.",
    );
  }
  context.targetSpatialFacts = fill.spatialFacts;
  context.targetSpatialFactsFilled = true;
  const spatialFactValidation = validateUniqueAttackTargetSpatialFacts(
    context.targetSpatialFacts,
  );
  return spatialFactValidation === null
    ? null
    : selectedAttackFillError(spatialFactValidation);
}

function processAdditionalAttackRollFill(
  fill: Extract<BattleFill, { readonly kind: "attackRoll" }>,
  existing: Extract<BattleFill, { readonly kind: "attackRoll" }> | undefined,
  duplicateMessage: string,
  relationshipMessage: string,
  relationshipFactsAllowed: boolean,
  assign: (value: Extract<BattleFill, { readonly kind: "attackRoll" }>) => void,
): SelectedAttackFillError | null {
  const duplicate = rememberSelectedAttackFill(
    existing,
    fill,
    duplicateMessage,
    assign,
  );
  if (duplicate !== null) return duplicate;
  return relationshipFactsAllowed || fill.relationshipFacts === undefined
    ? null
    : selectedAttackFillError(relationshipMessage);
}

function processAttackRollFill(input: {
  readonly fill: Extract<BattleFill, { readonly kind: "attackRoll" }>;
  readonly context: SelectedAttackFillContext;
  readonly attackRollRelationshipFactsAllowed: boolean;
}): SelectedAttackFillProcessingResult {
  const { fill, context } = input;
  if (fill.holeId === HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_ID) {
    return processAdditionalAttackRollFill(
      fill,
      context.huntersPreyHordeBreakerAttackRoll,
      "Hunter's Prey Horde Breaker attack roll was filled twice.",
      "Hunter's Prey Horde Breaker attack-roll relationship facts were not requested.",
      false,
      (value) => {
        context.huntersPreyHordeBreakerAttackRoll = value;
      },
    );
  }
  if (fill.holeId === WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID) {
    return processAdditionalAttackRollFill(
      fill,
      context.weaponMasteryCleaveAttackRoll,
      "Weapon Mastery Cleave attack roll was filled twice.",
      "Weapon Mastery Cleave attack-roll relationship facts were not requested.",
      false,
      (value) => {
        context.weaponMasteryCleaveAttackRoll = value;
      },
    );
  }
  if (fill.holeId === ATTACK_ROLL_HOLE_ID) {
    return processAdditionalAttackRollFill(
      fill,
      context.attackRollFill,
      "Attack roll was filled twice.",
      "Attack roll relationship facts do not match a requested attack-roll decision.",
      input.attackRollRelationshipFactsAllowed,
      (value) => {
        context.attackRollFill = value;
        context.attackRoll = value.value;
        context.attackRollRelationshipFacts = value.relationshipFacts ?? [];
      },
    );
  }
  return selectedAttackFillError(
    "Attack roll fill uses an unexpected Attack hole.",
  );
}

function processSavingThrowOutcomeFill(
  fill: Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (
    fill.holeId === ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID
  ) {
    return rememberSelectedAttackFill(
      context.attackDamageReductionRedirectSave,
      fill,
      "Attack damage reduction redirect save was filled twice.",
      (value) => {
        context.attackDamageReductionRedirectSave = value;
      },
    );
  }
  if (fill.holeId === WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.weaponMasteryToppleSavingThrow,
      fill,
      "Weapon Mastery Topple Saving Throw was filled twice.",
      (value) => {
        context.weaponMasteryToppleSavingThrow = value;
      },
    );
  }
  if (fill.holeId === OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.openHandTechniqueSavingThrow,
      fill,
      "Open Hand Technique Saving Throw was filled twice.",
      (value) => {
        context.openHandTechniqueSavingThrow = value;
      },
    );
  }
  if (fill.holeId === STUNNING_STRIKE_SAVE_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.stunningStrikeSavingThrow,
      fill,
      "Stunning Strike Saving Throw was filled twice.",
      (value) => {
        context.stunningStrikeSavingThrow = value;
      },
    );
  }
  if (fill.holeId === CUNNING_STRIKE_SAVE_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.cunningStrikeSavingThrow,
      fill,
      "Cunning Strike Saving Throw was filled twice.",
      (value) => {
        context.cunningStrikeSavingThrow = value;
      },
    );
  }
  if (isSaveGatedConditionWithRepeatDamageRepeatSaveFill(fill)) {
    if (
      context.saveGatedConditionWithRepeatDamageRepeatSaves.some(
        (candidate) => candidate.holeId === fill.holeId,
      )
    ) {
      return selectedAttackFillError(
        "Staged-condition damage repeat save was filled twice.",
      );
    }
    context.saveGatedConditionWithRepeatDamageRepeatSaves.push(fill);
    return null;
  }
  return selectedAttackFillError(
    "Saving throw fill uses an unexpected Attack hole.",
  );
}

function processRolledDiceFill(
  fill: BattleRolledDiceFill,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (isDuplicateHitInterceptionDuplicateRollFill(fill)) {
    return rememberSelectedAttackFill(
      context.duplicateHitInterceptionRoll,
      fill,
      "Duplicate-interception roll was filled twice.",
      (value) => {
        context.duplicateHitInterceptionRoll = value;
      },
    );
  }
  if (isSpellDamageReductionRollFill(fill)) {
    return rememberSelectedAttackFill(
      context.spellDamageReductionRoll,
      fill,
      "Spell damage reduction roll was filled twice.",
      (value) => {
        context.spellDamageReductionRoll = value;
      },
    );
  }
  if (isSourceDamageRollPenaltyRollFill(fill)) {
    if (
      context.sourceDamageRollPenaltyRolls.some(
        (candidate) => candidate.holeId === fill.holeId,
      )
    ) {
      return selectedAttackFillError(
        "Source damage roll penalty was filled twice.",
      );
    }
    context.sourceDamageRollPenaltyRolls.push(fill);
    return null;
  }
  if (
    fill.holeId === ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID
  ) {
    return rememberSelectedAttackFill(
      context.attackDamageReductionRedirectDamage,
      fill,
      "Attack damage reduction redirect damage was filled twice.",
      (value) => {
        context.attackDamageReductionRedirectDamage = value;
      },
    );
  }
  if (fill.holeId === WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.weaponMasteryCleaveDamageRoll,
      fill,
      "Weapon Mastery Cleave damage was filled twice.",
      (value) => {
        context.weaponMasteryCleaveDamageRoll = value;
      },
    );
  }
  if (fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.huntersPreyHordeBreakerDamageRoll,
      fill,
      "Hunter's Prey Horde Breaker damage was filled twice.",
      (value) => {
        context.huntersPreyHordeBreakerDamageRoll = value;
      },
    );
  }
  return rememberSelectedAttackFill(
    context.damageRoll,
    fill,
    "Attack damage was filled twice.",
    (value) => {
      context.damageRoll = value;
    },
  );
}

function processConcentrationSavingThrowFill(
  fill: Extract<BattleFill, { readonly kind: "concentrationSavingThrow" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  const ids =
    context.weaponMasteryCleaveDecision === undefined &&
    context.huntersPreyHordeBreakerDecision === undefined
      ? context.concentrationSavingThrowHoleIdsBeforeCleave
      : context.concentrationSavingThrowHoleIdsAfterCleave;
  const id = String(fill.holeId);
  if (ids.has(id)) {
    return selectedAttackFillError(
      "Concentration Saving Throw hole was filled twice.",
    );
  }
  ids.add(id);
  context.concentrationSavingThrows.push(fill);
  return null;
}

function processAttackDamageDispositionFill(
  fill: Extract<BattleFill, { readonly kind: "attackDamageDisposition" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId === ATTACK_DAMAGE_DISPOSITION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.damageDispositionFilled ? context.damageDisposition : undefined,
      fill.value,
      "Attack damage disposition was filled twice.",
      (value) => {
        context.damageDispositionFilled = true;
        context.damageDisposition = value;
      },
    );
  }
  if (fill.holeId === WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.weaponMasteryCleaveDamageDispositionFilled
        ? context.weaponMasteryCleaveDamageDisposition
        : undefined,
      fill.value,
      "Weapon Mastery Cleave damage disposition was filled twice.",
      (value) => {
        context.weaponMasteryCleaveDamageDispositionFilled = true;
        context.weaponMasteryCleaveDamageDisposition = value;
      },
    );
  }
  if (fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID) {
    return rememberSelectedAttackFill(
      context.huntersPreyHordeBreakerDamageDispositionFilled
        ? context.huntersPreyHordeBreakerDamageDisposition
        : undefined,
      fill.value,
      "Hunter's Prey Horde Breaker damage disposition was filled twice.",
      (value) => {
        context.huntersPreyHordeBreakerDamageDispositionFilled = true;
        context.huntersPreyHordeBreakerDamageDisposition = value;
      },
    );
  }
  return selectedAttackFillError(
    "Attack damage disposition fill uses the wrong hole.",
  );
}

function processDamageTypeChoiceFill(
  fill: Extract<BattleFill, { readonly kind: "damageTypeChoice" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId !== FRENZY_DAMAGE_TYPE_HOLE_ID) {
    return selectedAttackFillError(
      "Damage type choice fill uses an unexpected Attack hole.",
    );
  }
  return rememberSelectedAttackFill(
    context.frenzyDamageTypeChoice,
    fill,
    "Frenzy damage type was filled twice.",
    (value) => {
      context.frenzyDamageTypeChoice = value;
    },
  );
}

function processToolPossessionFill(
  fill: Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId !== CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID) {
    return selectedAttackFillError(
      "Tool-possession fill uses an unexpected Attack hole.",
    );
  }
  return rememberSelectedAttackFill(
    context.cunningStrikeToolPossession,
    fill,
    "Cunning Strike tool-possession facts were filled twice.",
    (value) => {
      context.cunningStrikeToolPossession = value;
    },
  );
}

function processCunningStrikeEndTurnCoverFill(
  fill: Extract<
    BattleFill,
    { readonly kind: "cunningStrikeEndTurnCoverFacts" }
  >,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId !== CUNNING_STRIKE_END_TURN_COVER_HOLE_ID) {
    return selectedAttackFillError(
      "Cunning Strike end-turn cover facts use an unexpected Attack hole.",
    );
  }
  return rememberSelectedAttackFill(
    context.cunningStrikeEndTurnCover,
    fill,
    "Cunning Strike end-turn cover facts were filled twice.",
    (value) => {
      context.cunningStrikeEndTurnCover = value;
    },
  );
}

function processGrappleOutcomeFill(
  fill: Extract<BattleFill, { readonly kind: "grappleOutcome" }>,
  context: SelectedAttackFillContext,
): SelectedAttackFillProcessingResult {
  if (fill.holeId !== GRAPPLE_OUTCOME_HOLE_ID) {
    return selectedAttackFillError(
      "Grapple outcome fill uses an unexpected Attack hole.",
    );
  }
  return rememberSelectedAttackFill(
    context.grapplerPunchAndGrabOutcome,
    fill,
    "Grappler Punch and Grab outcome was filled twice.",
    (value) => {
      context.grapplerPunchAndGrabOutcome = value;
    },
  );
}

export function attackFillSet(
  fills: readonly BattleFill[],
  attackerId: CombatantId,
  state: BattleState,
  attackRollRelationshipFactsAllowed = false,
): AttackFillSet {
  return Match.value(
    selectedAttackFillSet(
      fills,
      attackerId,
      state,
      attackRollRelationshipFactsAllowed,
    ),
  ).pipe(
    Match.when({ tag: "ok" }, (fillSet) => fillSet),
    Match.when({ tag: "invalid" }, (fillSet) => fillSet),
    Match.when({ tag: "objectTarget" }, () =>
      selectedAttackFillError(
        "This attack procedure does not accept an object target.",
      ),
    ),
    Match.exhaustive,
  );
}

export function validateUniqueAttackSightFacts(
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  const sightFacts = facts.filter(
    (fact) =>
      fact.kind === "attackAttackerCannotSeeTarget" ||
      fact.kind === "attackTargetCannotSeeAttacker",
  );
  const duplicate = sightFacts.find((fact, factIndex) =>
    sightFacts
      .slice(0, factIndex)
      .some(
        (previous) =>
          previous.kind === fact.kind &&
          previous.attackerId === fact.attackerId &&
          previous.targetId === fact.targetId,
      ),
  );
  if (duplicate === undefined) {
    return null;
  }
  return "Attack sight facts must contain at most one witness for each direction, attacker, and target.";
}

function validateUniqueAttackTargetSpatialFacts(
  spatialFacts: readonly BattleTargetSpatialFact[],
): string | null {
  return (
    validateUniqueAttackTargetDistanceFacts(spatialFacts) ??
    validateUniqueAttackSightFacts(spatialFacts)
  );
}

function validateUniqueAttackTargetDistanceFacts(
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  const distanceFacts = facts.filter(
    (fact) => fact.kind === "attackTargetDistance",
  );
  const duplicate = distanceFacts.find((fact, factIndex) =>
    distanceFacts
      .slice(0, factIndex)
      .some(
        (previous) =>
          previous.actorId === fact.actorId &&
          previous.targetId === fact.targetId &&
          previous.procedureRef === fact.procedureRef,
      ),
  );
  return duplicate === undefined
    ? null
    : "Attack target distance facts must contain at most one distance for each actor, target, and attack.";
}
