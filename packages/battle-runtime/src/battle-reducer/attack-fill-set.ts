// Attack replay fill parser extracted from attack-resolution.ts.
// Owns classification of attack fills and the uniqueness invariant for attack target range facts.
// UNIT-PROFILE-COVERAGE: runtime-owner spell.invocation-ray-of-enfeeblement-damage-penalty
// UNIT-PROFILE-COVERAGE: runtime-owner unit-feature.brutal-strike

import {
  type BattleAttackDamageDisposition,
  type BattleAttackRollResult,
  type BattleFill,
  type BattleRolledDiceFill,
  type BattleAttackRollRelationshipFact,
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
} from "./battle-runtime-protocol.ts";
import { attackExecutionSelectionsEqual } from "./movement-speed.ts";
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
import { isHideousLaughterDamageRepeatSaveFill } from "./hideous-laughter-repeat-save.ts";
import { isMirrorImageDuplicateRollFill } from "./mirror-image-hit-interception.ts";
import { DamageRelationshipDecisionsByHole } from "./damage-relationship-decisions.ts";
import { ongoingFeatureEnemyRelationshipDecisionRequired } from "./attack-roll.ts";

export function attackFillSet(
  fills: readonly BattleFill[],
  attackerId: CombatantId,
  state: BattleState,
  attackRollRelationshipFactsAllowed = false,
): AttackFillSet {
  const attackRelationshipDecisionRequired =
    ongoingFeatureEnemyRelationshipDecisionRequired(
      state,
      attackerId,
      "attackRollAgainstEnemy",
    );
  let targetId: CombatantId | undefined;
  let targetSpatialFacts: readonly BattleTargetSpatialFact[] = [];
  let targetRelationshipFacts: readonly BattleAttackRollRelationshipFact[] = [];
  let attackRollRelationshipFacts: readonly BattleAttackRollRelationshipFact[] =
    [];
  let targetSpatialFactsFilled = false;
  let attackRoll: BattleAttackRollResult | undefined;
  let frenzyDamageTypeChoice:
    | Extract<BattleFill, { readonly kind: "damageTypeChoice" }>
    | undefined;
  const concentrationSavingThrows: Extract<
    BattleFill,
    { readonly kind: "concentrationSavingThrow" }
  >[] = [];
  const concentrationSavingThrowHoleIdsBeforeCleave = new Set<string>();
  const concentrationSavingThrowHoleIdsAfterCleave = new Set<string>();
  let damageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  };
  let damageDispositionFilled = false;
  let weaponMasteryCleaveDamageDisposition: BattleAttackDamageDisposition = {
    kind: "ordinaryDamage",
  };
  let weaponMasteryCleaveDamageDispositionFilled = false;
  let huntersPreyHordeBreakerDamageDisposition: BattleAttackDamageDisposition =
    {
      kind: "ordinaryDamage",
    };
  let huntersPreyHordeBreakerDamageDispositionFilled = false;
  let damageRoll: BattleRolledDiceFill | undefined;
  let mirrorImageDuplicateRoll: BattleRolledDiceFill | undefined;
  let spellDamageReductionRoll: BattleRolledDiceFill | undefined;
  const sourceDamageRollPenaltyRolls: BattleRolledDiceFill[] = [];
  let attackDamageReductionRedirectTarget:
    | Extract<BattleFill, { readonly kind: "targetChoice" }>
    | undefined;
  let attackDamageReductionRedirectSave:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let attackDamageReductionRedirectDamage: BattleRolledDiceFill | undefined;
  let weaponMasteryToppleSavingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let tacticalMasterReplacementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let brutalStrikeDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let openHandTechniqueDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let openHandTechniqueSavingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let stunningStrikeDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let stunningStrikeSavingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let cunningStrikeSavingThrow:
    | Extract<BattleFill, { readonly kind: "savingThrowOutcome" }>
    | undefined;
  let cunningStrikeMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  let cunningStrikeToolPossession:
    | Extract<BattleFill, { readonly kind: "toolPossessionFacts" }>
    | undefined;
  let cunningStrikeEndTurnCover:
    | Extract<BattleFill, { readonly kind: "cunningStrikeEndTurnCoverFacts" }>
    | undefined;
  const hideousLaughterDamageRepeatSaves: Extract<
    BattleFill,
    { readonly kind: "savingThrowOutcome" }
  >[] = [];
  let weaponMasteryCleaveDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let weaponMasteryCleaveTarget: BattleAttackTargetChoiceFill | undefined;
  let weaponMasteryCleaveAttackRoll:
    | Extract<BattleFill, { readonly kind: "attackRoll" }>
    | undefined;
  let weaponMasteryCleaveDamageRoll: BattleRolledDiceFill | undefined;
  let remarkableAthleteCriticalHitMovementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let remarkableAthleteCriticalHitMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  let weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let weaponMasteryCleaveRemarkableAthleteCriticalHitMovement:
    | Extract<BattleFill, { readonly kind: "movement" }>
    | undefined;
  let huntersPreyHordeBreakerDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let huntersPreyHordeBreakerTarget: BattleAttackTargetChoiceFill | undefined;
  let huntersPreyHordeBreakerAttackRoll:
    | Extract<BattleFill, { readonly kind: "attackRoll" }>
    | undefined;
  let huntersPreyHordeBreakerDamageRoll: BattleRolledDiceFill | undefined;
  let grapplerPunchAndGrabDecision:
    | Extract<BattleFill, { readonly kind: "unitFeatureDecision" }>
    | undefined;
  let grapplerPunchAndGrabOutcome:
    | Extract<BattleFill, { readonly kind: "grappleOutcome" }>
    | undefined;
  for (const fill of fills) {
    if (fill.kind === "damageRelationshipDecisions") {
      continue;
    }
    if (fill.kind === "sanctuaryInterdictionOutcome") {
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_DECISION_HOLE_ID
    ) {
      if (weaponMasteryCleaveAttackRoll !== undefined) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (
          weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision !==
          undefined
        ) {
          /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
          return {
            tag: "invalid",
            message:
              "Weapon Mastery Cleave Remarkable Athlete movement decision was filled twice.",
          };
        }
        /* v8 ignore stop */
        weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision = fill;
        continue;
      }
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (remarkableAthleteCriticalHitMovementDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      remarkableAthleteCriticalHitMovementDecision = fill;
      continue;
    }

    if (
      fill.kind === "movement" &&
      fill.holeId === REMARKABLE_ATHLETE_CRITICAL_HIT_MOVEMENT_HOLE_ID
    ) {
      if (
        weaponMasteryCleaveRemarkableAthleteCriticalHitMovementDecision !==
        undefined
      ) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (
          weaponMasteryCleaveRemarkableAthleteCriticalHitMovement !== undefined
        ) {
          /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
          return {
            tag: "invalid",
            message:
              "Weapon Mastery Cleave Remarkable Athlete movement was filled twice.",
          };
        }
        /* v8 ignore stop */
        weaponMasteryCleaveRemarkableAthleteCriticalHitMovement = fill;
        continue;
      }
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (remarkableAthleteCriticalHitMovement !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Remarkable Athlete movement was filled twice.",
        };
      }
      /* v8 ignore stop */
      remarkableAthleteCriticalHitMovement = fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (huntersPreyHordeBreakerDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Hunter's Prey Horde Breaker decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      huntersPreyHordeBreakerDecision = fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === GRAPPLER_PUNCH_AND_GRAB_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (grapplerPunchAndGrabDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Grappler Punch and Grab decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      grapplerPunchAndGrabDecision = fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (weaponMasteryCleaveDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      weaponMasteryCleaveDecision = fill;
      continue;
    }

    if (
      fill.kind === "grappleOutcome" &&
      fill.holeId === GRAPPLE_OUTCOME_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (grapplerPunchAndGrabOutcome !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Grappler Punch and Grab outcome was filled twice.",
        };
      }
      /* v8 ignore stop */
      grapplerPunchAndGrabOutcome = fill;
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      fill.holeId === HUNTERS_PREY_HORDE_BREAKER_TARGET_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (huntersPreyHordeBreakerTarget !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Hunter's Prey Horde Breaker target was filled twice.",
        };
      }
      /* v8 ignore stop */
      const parsed = parseAttackTargetChoiceFill(
        fill,
        attackerId,
        attackRelationshipDecisionRequired,
      );
      if (parsed.tag === "invalid") return parsed;
      huntersPreyHordeBreakerTarget = parsed.fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === TACTICAL_MASTER_REPLACEMENT_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (tacticalMasterReplacementDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Tactical Master replacement decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      tacticalMasterReplacementDecision = fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === BRUTAL_STRIKE_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (brutalStrikeDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Brutal Strike decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      brutalStrikeDecision = fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === OPEN_HAND_TECHNIQUE_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (openHandTechniqueDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Open Hand Technique decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      openHandTechniqueDecision = fill;
      continue;
    }

    if (
      fill.kind === "unitFeatureDecision" &&
      fill.holeId === STUNNING_STRIKE_DECISION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (stunningStrikeDecision !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Stunning Strike decision was filled twice.",
        };
      }
      /* v8 ignore stop */
      stunningStrikeDecision = fill;
      continue;
    }

    if (
      fill.kind === "attackRoll" &&
      fill.holeId === HUNTERS_PREY_HORDE_BREAKER_ATTACK_ROLL_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (huntersPreyHordeBreakerAttackRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Hunter's Prey Horde Breaker attack roll was filled twice.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message:
            "Hunter's Prey Horde Breaker attack-roll relationship facts were not requested.",
        };
      }
      /* v8 ignore stop */
      huntersPreyHordeBreakerAttackRoll = fill;
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_TARGET_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (weaponMasteryCleaveTarget !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave target was filled twice.",
        };
      }
      /* v8 ignore stop */
      const parsed = parseAttackTargetChoiceFill(
        fill,
        attackerId,
        attackRelationshipDecisionRequired,
      );
      if (parsed.tag === "invalid") return parsed;
      weaponMasteryCleaveTarget = parsed.fill;
      continue;
    }

    if (fill.kind === "targetChoice" && fill.holeId === ATTACK_TARGET_HOLE_ID) {
      const parsed = parseAttackTargetChoiceFill(
        fill,
        attackerId,
        attackRelationshipDecisionRequired,
      );
      if (parsed.tag === "invalid") return parsed;
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetId !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return { tag: "invalid", message: "Attack target was filled twice." };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetSpatialFactsFilled) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Attack target spatial facts were filled twice.",
        };
      }
      /* v8 ignore stop */
      targetId = fill.value;
      targetSpatialFacts = fill.spatialFacts ?? [];
      targetRelationshipFacts = parsed.fill.relationshipFacts ?? [];
      targetSpatialFactsFilled = true;
      const spatialFactValidation =
        validateUniqueAttackTargetSpatialFacts(targetSpatialFacts);
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spatialFactValidation !== null) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return { tag: "invalid", message: spatialFactValidation };
      }
      /* v8 ignore stop */
      continue;
    }

    if (
      fill.kind === "targetSpatialFacts" &&
      fill.holeId === ATTACK_TARGET_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (targetSpatialFactsFilled) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Attack target spatial facts were filled twice.",
        };
      }
      /* v8 ignore stop */
      targetSpatialFacts = fill.spatialFacts;
      targetSpatialFactsFilled = true;
      const spatialFactValidation =
        validateUniqueAttackTargetSpatialFacts(targetSpatialFacts);
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spatialFactValidation !== null) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return { tag: "invalid", message: spatialFactValidation };
      }
      /* v8 ignore stop */
      continue;
    }

    if (
      fill.kind === "targetChoice" &&
      fill.holeId ===
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_TARGET_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (attackDamageReductionRedirectTarget !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect target was filled twice.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message:
            "Attack damage redirect target relationship facts do not match a requested target decision.",
        };
      }
      /* v8 ignore stop */
      attackDamageReductionRedirectTarget = fill;
      continue;
    }

    if (fill.kind === "attackRoll" && fill.holeId === ATTACK_ROLL_HOLE_ID) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (attackRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return { tag: "invalid", message: "Attack roll was filled twice." };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.relationshipFacts !== undefined &&
        !attackRollRelationshipFactsAllowed
      ) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message:
            "Attack roll relationship facts do not match a requested attack-roll decision.",
        };
      }
      /* v8 ignore stop */
      attackRoll = fill.value;
      attackRollRelationshipFacts = fill.relationshipFacts ?? [];
      continue;
    }

    if (
      fill.kind === "attackRoll" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_ATTACK_ROLL_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (weaponMasteryCleaveAttackRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave attack roll was filled twice.",
        };
      }
      /* v8 ignore stop */
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (fill.relationshipFacts !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message:
            "Weapon Mastery Cleave attack-roll relationship facts were not requested.",
        };
      }
      /* v8 ignore stop */
      weaponMasteryCleaveAttackRoll = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_SAVE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (attackDamageReductionRedirectSave !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect save was filled twice.",
        };
      }
      /* v8 ignore stop */
      attackDamageReductionRedirectSave = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === WEAPON_MASTERY_TOPPLE_SAVE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (weaponMasteryToppleSavingThrow !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Weapon Mastery Topple Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop */
      weaponMasteryToppleSavingThrow = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === OPEN_HAND_TECHNIQUE_SAVE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (openHandTechniqueSavingThrow !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Open Hand Technique Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop */
      openHandTechniqueSavingThrow = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === STUNNING_STRIKE_SAVE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (stunningStrikeSavingThrow !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Stunning Strike Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop */
      stunningStrikeSavingThrow = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      fill.holeId === CUNNING_STRIKE_SAVE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (cunningStrikeSavingThrow !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Cunning Strike Saving Throw was filled twice.",
        };
      }
      /* v8 ignore stop */
      cunningStrikeSavingThrow = fill;
      continue;
    }

    if (
      fill.kind === "movement" &&
      fill.holeId === CUNNING_STRIKE_MOVEMENT_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (cunningStrikeMovement !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Cunning Strike movement was filled twice.",
        };
      }
      /* v8 ignore stop */
      cunningStrikeMovement = fill;
      continue;
    }

    if (
      fill.kind === "toolPossessionFacts" &&
      fill.holeId === CUNNING_STRIKE_TOOL_POSSESSION_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (cunningStrikeToolPossession !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Cunning Strike tool-possession facts were filled twice.",
        };
      }
      /* v8 ignore stop */
      cunningStrikeToolPossession = fill;
      continue;
    }

    if (
      fill.kind === "cunningStrikeEndTurnCoverFacts" &&
      fill.holeId === CUNNING_STRIKE_END_TURN_COVER_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (cunningStrikeEndTurnCover !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Cunning Strike end-turn cover facts were filled twice.",
        };
      }
      /* v8 ignore stop */
      cunningStrikeEndTurnCover = fill;
      continue;
    }

    if (
      fill.kind === "savingThrowOutcome" &&
      isHideousLaughterDamageRepeatSaveFill(fill)
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        hideousLaughterDamageRepeatSaves.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Hideous Laughter damage repeat save was filled twice.",
        };
      }
      /* v8 ignore stop */
      hideousLaughterDamageRepeatSaves.push(fill);
      continue;
    }

    if (
      fill.kind === "rolledDice" &&
      fill.holeId ===
        ATTACK_DAMAGE_REDUCTION_ZERO_DAMAGE_REDIRECT_DAMAGE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (attackDamageReductionRedirectDamage !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Attack damage reduction redirect damage was filled twice.",
        };
      }
      /* v8 ignore stop */
      attackDamageReductionRedirectDamage = fill;
      continue;
    }

    if (
      fill.kind === "damageTypeChoice" &&
      fill.holeId === FRENZY_DAMAGE_TYPE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (frenzyDamageTypeChoice !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Frenzy damage type was filled twice.",
        };
      }
      /* v8 ignore stop */
      frenzyDamageTypeChoice = fill;
      continue;
    }

    if (fill.kind === "rolledDice" && isMirrorImageDuplicateRollFill(fill)) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (mirrorImageDuplicateRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Mirror Image duplicate roll was filled twice.",
        };
      }
      /* v8 ignore stop */
      mirrorImageDuplicateRoll = fill;
      continue;
    }

    if (fill.kind === "rolledDice" && isSpellDamageReductionRollFill(fill)) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (spellDamageReductionRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Spell damage reduction roll was filled twice.",
        };
      }
      /* v8 ignore stop */
      spellDamageReductionRoll = fill;
      continue;
    }

    if (fill.kind === "rolledDice" && isSourceDamageRollPenaltyRollFill(fill)) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        sourceDamageRollPenaltyRolls.some(
          (candidate) => candidate.holeId === fill.holeId,
        )
      ) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Source damage roll penalty was filled twice.",
        };
      }
      /* v8 ignore stop */
      sourceDamageRollPenaltyRolls.push(fill);
      continue;
    }

    if (
      fill.kind === "rolledDice" &&
      fill.holeId === WEAPON_MASTERY_CLEAVE_DAMAGE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (weaponMasteryCleaveDamageRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Weapon Mastery Cleave damage was filled twice.",
        };
      }
      /* v8 ignore stop */
      weaponMasteryCleaveDamageRoll = fill;
      continue;
    }

    if (
      fill.kind === "rolledDice" &&
      fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DAMAGE_HOLE_ID
    ) {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (huntersPreyHordeBreakerDamageRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Hunter's Prey Horde Breaker damage was filled twice.",
        };
      }
      /* v8 ignore stop */
      huntersPreyHordeBreakerDamageRoll = fill;
      continue;
    }

    if (fill.kind === "rolledDice") {
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (damageRoll !== undefined) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return { tag: "invalid", message: "Attack damage was filled twice." };
      }
      /* v8 ignore stop */
      damageRoll = fill;
      continue;
    }

    if (fill.kind === "concentrationSavingThrow") {
      const concentrationSavingThrowHoleIds =
        weaponMasteryCleaveDecision === undefined &&
        huntersPreyHordeBreakerDecision === undefined
          ? concentrationSavingThrowHoleIdsBeforeCleave
          : concentrationSavingThrowHoleIdsAfterCleave;
      const concentrationSavingThrowHoleId = String(fill.holeId);
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (concentrationSavingThrowHoleIds.has(concentrationSavingThrowHoleId)) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Concentration Saving Throw hole was filled twice.",
        };
      }
      /* v8 ignore stop */
      concentrationSavingThrowHoleIds.add(concentrationSavingThrowHoleId);
      concentrationSavingThrows.push(fill);
      continue;
    }

    if (fill.kind === "attackDamageDisposition") {
      if (fill.holeId === ATTACK_DAMAGE_DISPOSITION_HOLE_ID) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (damageDispositionFilled) {
          /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
          return {
            tag: "invalid",
            message: "Attack damage disposition was filled twice.",
          };
        }
        /* v8 ignore stop */
        damageDispositionFilled = true;
        damageDisposition = fill.value;
        continue;
      }
      if (fill.holeId === WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (weaponMasteryCleaveDamageDispositionFilled) {
          /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
          return {
            tag: "invalid",
            message:
              "Weapon Mastery Cleave damage disposition was filled twice.",
          };
        }
        /* v8 ignore stop */
        weaponMasteryCleaveDamageDispositionFilled = true;
        weaponMasteryCleaveDamageDisposition = fill.value;
        continue;
      }
      if (
        fill.holeId === HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID
      ) {
        /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
        if (huntersPreyHordeBreakerDamageDispositionFilled) {
          /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
          return {
            tag: "invalid",
            message:
              "Hunter's Prey Horde Breaker damage disposition was filled twice.",
          };
        }
        /* v8 ignore stop */
        huntersPreyHordeBreakerDamageDispositionFilled = true;
        huntersPreyHordeBreakerDamageDisposition = fill.value;
        continue;
      }
      /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
      if (
        fill.holeId !== ATTACK_DAMAGE_DISPOSITION_HOLE_ID &&
        fill.holeId !== WEAPON_MASTERY_CLEAVE_DAMAGE_DISPOSITION_HOLE_ID &&
        fill.holeId !== HUNTERS_PREY_HORDE_BREAKER_DAMAGE_DISPOSITION_HOLE_ID
      ) {
        /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
        return {
          tag: "invalid",
          message: "Attack damage disposition fill uses the wrong hole.",
        };
      }
      /* v8 ignore stop */
    }

    /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
    return {
      tag: "invalid",
      message: `Fill ${fill.kind} does not match the Attack replay holes.`,
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
  /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
  if (relationshipDecisions.tag === "invalid") {
    /* v8 ignore next -- Malformed attack fill set: discovery is the canonical hole contract; this parser rejects a duplicate, wrong-kind, wrong-hole, or contradictory attack fill. */
    return {
      tag: "invalid",
      message: relationshipDecisions.message,
    };
  }
  /* v8 ignore stop */

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
    hideousLaughterDamageRepeatSaves,
    damageDisposition,
    damageDispositionFilled,
    damageRoll,
    mirrorImageDuplicateRoll,
    spellDamageReductionRoll,
    sourceDamageRollPenaltyRolls,
    attackDamageReductionRedirectTarget,
    attackDamageReductionRedirectSave,
    attackDamageReductionRedirectDamage,
    weaponMasteryToppleSavingThrow,
    tacticalMasterReplacementDecision,
    brutalStrikeDecision,
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
    validateUniqueAttackTargetRangeFacts(spatialFacts) ??
    validateUniqueAttackSightFacts(spatialFacts)
  );
}

export function validateUniqueAttackTargetRangeFacts(
  facts: readonly BattleTargetSpatialFact[],
): string | null {
  const rangeFacts = facts.filter(
    (fact) => fact.kind === "attackTargetInRangedRange",
  );
  const duplicate = rangeFacts.find((fact, factIndex) =>
    rangeFacts
      .slice(0, factIndex)
      .some(
        (previous) =>
          previous.actorId === fact.actorId &&
          previous.targetId === fact.targetId &&
          attackExecutionSelectionsEqual(previous, fact),
      ),
  );
  if (duplicate === undefined) {
    return null;
  }
  return "Attack target range facts must contain at most one range band for each actor, target, and attack.";
}
