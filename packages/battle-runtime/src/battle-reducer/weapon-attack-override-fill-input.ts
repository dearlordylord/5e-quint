import { Match } from "effect";
import type {
  BattleFill,
  BattleSpellCastReactionFact,
} from "../battle-state-execution.ts";
import type { BattleFillAfterSlowSomaticSpellFailureOutcome } from "./slow-active-penalties-runtime.ts";
import { parseSpellCastReactionFactsFill } from "./spells-resolve-fill-set.ts";

export type WeaponAttackOverrideFillInput = {
  readonly reactionFacts: readonly BattleSpellCastReactionFact[];
};

export type WeaponAttackOverrideFillInputParseResult =
  | {
      readonly tag: "parsed";
      readonly input: WeaponAttackOverrideFillInput;
    }
  | { readonly tag: "invalid"; readonly message: string };

type WeaponAttackOverrideFillClassification =
  | {
      readonly tag: "reactionFacts";
      readonly facts: readonly BattleSpellCastReactionFact[];
    }
  | { readonly tag: "invalid"; readonly message: string };

const ORDINARY_FILL_MESSAGE =
  "Weapon attack override spells do not use target, roll, damage, or save fills.";

function ordinaryFillIsInvalid(): WeaponAttackOverrideFillClassification {
  return { tag: "invalid", message: ORDINARY_FILL_MESSAGE };
}

function classifyTargetSpatialFactsFill(
  fill: Extract<BattleFill, { readonly kind: "targetSpatialFacts" }>,
): WeaponAttackOverrideFillClassification {
  const parsed = parseSpellCastReactionFactsFill(fill);
  return parsed.tag === "ok"
    ? { tag: "reactionFacts", facts: parsed.facts }
    : {
        tag: "invalid",
        message:
          parsed.tag === "invalid" ? parsed.message : ORDINARY_FILL_MESSAGE,
      };
}

function classifyWeaponAttackOverrideFill(
  fill: BattleFillAfterSlowSomaticSpellFailureOutcome,
): WeaponAttackOverrideFillClassification {
  return Match.value(fill).pipe(
    Match.discriminatorsExhaustive("kind")({
      helpAttackAllyDecision: ordinaryFillIsInvalid,
      helpAttackEnemyDecision: ordinaryFillIsInvalid,
      attackRoll: ordinaryFillIsInvalid,
      creatureAttackZeroDamage: ordinaryFillIsInvalid,
      rolledDice: ordinaryFillIsInvalid,
      damageTypeChoice: ordinaryFillIsInvalid,
      savingThrowOutcome: ordinaryFillIsInvalid,
      conditionChoice: ordinaryFillIsInvalid,
      skillChoice: ordinaryFillIsInvalid,
      abilityChoice: ordinaryFillIsInvalid,
      targetAbilityChoices: ordinaryFillIsInvalid,
      thaumaturgyActiveOneMinuteEffectCount: ordinaryFillIsInvalid,
      commandOptionChoice: ordinaryFillIsInvalid,
      selfTransformationModeChoice: ordinaryFillIsInvalid,
      wildShapeEquipmentDisposition: ordinaryFillIsInvalid,
      dancingLightsPlacement: ordinaryFillIsInvalid,
      unitFeatureDecision: ordinaryFillIsInvalid,
      hitPointHealingDistribution: ordinaryFillIsInvalid,
      heldObjectFacts: ordinaryFillIsInvalid,
      toolPossessionFacts: ordinaryFillIsInvalid,
      cunningStrikeEndTurnCoverFacts: ordinaryFillIsInvalid,
      findFamiliarConnection: ordinaryFillIsInvalid,
      companionReappearancePlacement: ordinaryFillIsInvalid,
      companionReappearanceInitiative: ordinaryFillIsInvalid,
      magicWeaponTargetItem: ordinaryFillIsInvalid,
      targetChoice: ordinaryFillIsInvalid,
      damageRelationshipDecisions: ordinaryFillIsInvalid,
      targetSpatialFacts: classifyTargetSpatialFactsFill,
      objectTargetChoice: ordinaryFillIsInvalid,
      ongoingSpellTargetChoice: ordinaryFillIsInvalid,
      objectContactTargets: ordinaryFillIsInvalid,
      objectDropResolution: ordinaryFillIsInvalid,
      spellAreaChoice: ordinaryFillIsInvalid,
      gustOfWindLineDirectionChoice: ordinaryFillIsInvalid,
      movableZoneRamMovement: ordinaryFillIsInvalid,
      movableZoneRepositionMovement: ordinaryFillIsInvalid,
      teleportDestination: ordinaryFillIsInvalid,
      spiritualWeaponForcePosition: ordinaryFillIsInvalid,
      spellTargetAllocation: ordinaryFillIsInvalid,
      spellTargetList: ordinaryFillIsInvalid,
      deathSavingThrow: ordinaryFillIsInvalid,
      statBlockRechargeRoll: ordinaryFillIsInvalid,
      concentrationSavingThrow: ordinaryFillIsInvalid,
      attackDamageDisposition: ordinaryFillIsInvalid,
      sanctuaryInterdictionOutcome: ordinaryFillIsInvalid,
      interruptDecision: ordinaryFillIsInvalid,
      movement: ordinaryFillIsInvalid,
      levitateAltitudeChange: ordinaryFillIsInvalid,
      levitateInitialRise: ordinaryFillIsInvalid,
      abilityCheck: ordinaryFillIsInvalid,
      grappleOutcome: ordinaryFillIsInvalid,
      shoveOutcome: ordinaryFillIsInvalid,
    }),
  );
}

export function parseWeaponAttackOverrideFillInput(
  fills: readonly BattleFillAfterSlowSomaticSpellFailureOutcome[],
): WeaponAttackOverrideFillInputParseResult {
  let reactionFacts: readonly BattleSpellCastReactionFact[] = [];
  let reactionFactsWereSupplied = false;
  for (const fill of fills) {
    const classification = classifyWeaponAttackOverrideFill(fill);
    if (classification.tag === "invalid") {
      return classification;
    }
    /* v8 ignore start -- Malformed resolution input: this guard exists only to reject a fill that contradicts the admitted subject's discovered hole contract. */
    if (reactionFactsWereSupplied) {
      return {
        tag: "invalid",
        message: "Spell-cast Reaction trigger facts were filled twice.",
      };
    }
    /* v8 ignore stop */
    reactionFacts = classification.facts;
    reactionFactsWereSupplied = true;
  }
  return { tag: "parsed", input: { reactionFacts } };
}
