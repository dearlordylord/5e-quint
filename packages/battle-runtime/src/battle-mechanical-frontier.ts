import { Either, Match, Schema } from "effect";

import {
  BattleFillSchema,
  BattleMechanicalHoleSchema,
  BattleMechanicalInterruptProcedureChoiceSchema,
} from "./battle-reducer/battle-codecs.ts";
import { battleHoleFamilyKind } from "./battle-reducer/hole-helpers.ts";
import type {
  BattleHole,
  BattleInterruptDecisionHole,
  BattleInterruptProcedureChoice,
  BattleFill,
  BattleResolutionResult,
} from "./battle-state-execution.ts";
import { BattleSubjectSchema, type BattleSubject } from "./battle-subjects.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export type BattleMechanicalHole = typeof BattleMechanicalHoleSchema.Type;

export type BattleMechanicalInterruptChoice =
  typeof BattleMechanicalInterruptProcedureChoiceSchema.Type;

export type BattleMechanicalOrdinaryFrontier = {
  readonly kind: "ordinaryHoles";
  readonly subject: BattleSubject;
  readonly holes: ReadonlyNonEmptyArray<BattleMechanicalHole>;
  readonly acceptedFills: readonly BattleFill[];
};

export type BattleMechanicalInterruptFrontier = {
  readonly kind: "interruptDecision";
  readonly decisionHole: Extract<
    BattleMechanicalHole,
    { readonly kind: "interruptDecision" }
  >;
  readonly choices: ReadonlyNonEmptyArray<BattleMechanicalInterruptChoice>;
};

export type BattleMechanicalFrontier =
  | BattleMechanicalOrdinaryFrontier
  | BattleMechanicalInterruptFrontier;

export type BattleMechanicalFrontierIssue =
  | { readonly tag: "emptyHoleFrontier" }
  | { readonly tag: "mixedInterruptAndOrdinaryHoles" }
  | { readonly tag: "interruptFrontierMissingCheckpoint" }
  | { readonly tag: "interruptFrontierChoiceSetEmpty" };

export const BattleMechanicalInterruptChoiceSchema =
  BattleMechanicalInterruptProcedureChoiceSchema;

export const BattleMechanicalFrontierSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("ordinaryHoles"),
    subject: BattleSubjectSchema,
    holes: Schema.NonEmptyArray(BattleMechanicalHoleSchema),
    acceptedFills: Schema.Array(BattleFillSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("interruptDecision"),
    decisionHole: BattleMechanicalHoleSchema.pipe(
      Schema.filter(
        (
          hole,
        ): hole is Extract<
          BattleMechanicalHole,
          { kind: "interruptDecision" }
        > => hole.kind === "interruptDecision",
      ),
    ),
    choices: Schema.NonEmptyArray(BattleMechanicalInterruptChoiceSchema),
  }),
).annotations({ identifier: "BattleMechanicalFrontier" });

export function battleMechanicalFrontier(input: {
  readonly result: Extract<
    BattleResolutionResult,
    { readonly tag: "needsHoles" }
  >;
  readonly acceptedFills: readonly BattleFill[];
}): Either.Either<BattleMechanicalFrontier, BattleMechanicalFrontierIssue> {
  const { result } = input;
  if (result.holes.length === 0) {
    return Either.left({ tag: "emptyHoleFrontier" });
  }
  const interruptHoles = result.holes.filter(
    (hole) => battleHoleFamilyKind(hole) === "interruptDecision",
  );
  if (interruptHoles.length > 0) {
    if (interruptHoles.length !== 1 || result.holes.length !== 1) {
      return Either.left({ tag: "mixedInterruptAndOrdinaryHoles" });
    }
    const [interruptHole] = result.holes;
    if (
      interruptHole === undefined ||
      interruptHole.kind !== "interruptDecision"
    ) {
      return Either.left({ tag: "mixedInterruptAndOrdinaryHoles" });
    }
    const pendingInterrupt = result.snapshot.pendingInterrupt;
    if (pendingInterrupt === null) {
      return Either.left({ tag: "interruptFrontierMissingCheckpoint" });
    }
    if (pendingInterrupt.choices.length === 0) {
      return Either.left({ tag: "interruptFrontierChoiceSetEmpty" });
    }
    return Either.right({
      kind: "interruptDecision",
      decisionHole: projectMechanicalInterruptHole(interruptHole),
      choices: projectMechanicalChoices(pendingInterrupt.choices),
    });
  }
  return Either.right({
    kind: "ordinaryHoles",
    subject: result.subject,
    holes: projectMechanicalHoles(result.holes),
    acceptedFills: input.acceptedFills,
  });
}

function projectMechanicalHoles(
  holes: readonly BattleHole[],
): ReadonlyNonEmptyArray<BattleMechanicalHole> {
  const [first, ...rest] = holes;
  if (first === undefined) {
    throw new Error("battle holes were proven nonempty");
  }
  return [projectMechanicalHole(first), ...rest.map(projectMechanicalHole)];
}

function projectMechanicalChoices(
  choices: readonly BattleInterruptProcedureChoice[],
): ReadonlyNonEmptyArray<BattleMechanicalInterruptChoice> {
  const [first, ...rest] = choices;
  if (first === undefined) {
    throw new Error("battle interrupt choices were proven nonempty");
  }
  return [
    projectMechanicalInterruptChoice(first),
    ...rest.map(projectMechanicalInterruptChoice),
  ];
}

function projectMechanicalInterruptHole(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
): DistributiveOmit<BattleInterruptDecisionHole, "label"> {
  return Match.value(hole).pipe(
    Match.discriminatorsExhaustive("kind")({
      interruptDecision: removeHoleLabel,
    }),
  );
}

function projectMechanicalHole(hole: BattleHole): BattleMechanicalHole {
  return Match.value(hole).pipe(
    Match.discriminatorsExhaustive("kind")({
      abilityCheck: removeHoleLabel,
      abilityChoice: removeHoleLabel,
      attackDamageDisposition: removeHoleLabel,
      attackRoll: removeHoleLabel,
      commandOptionChoice: removeHoleLabel,
      companionReappearanceInitiative: removeHoleLabel,
      companionReappearancePlacement: removeHoleLabel,
      concentrationSavingThrow: removeHoleLabel,
      conditionChoice: removeHoleLabel,
      cunningStrikeEndTurnCoverFacts: removeHoleLabel,
      damageRelationshipDecisions: removeHoleLabel,
      damageTypeChoice: removeHoleLabel,
      dancingLightsPlacement: removeHoleLabel,
      deathSavingThrow: removeHoleLabel,
      findFamiliarConnection: removeHoleLabel,
      grappleOutcome: removeHoleLabel,
      gustOfWindLineDirectionChoice: removeHoleLabel,
      heldObjectFacts: removeHoleLabel,
      helpAttackAllyDecision: removeHoleLabel,
      helpAttackEnemyDecision: removeHoleLabel,
      hitPointHealingDistribution: removeHoleLabel,
      interruptDecision: removeHoleLabel,
      levitateAltitudeChange: removeHoleLabel,
      levitateInitialRise: removeHoleLabel,
      magicWeaponTargetItem: removeHoleLabel,
      movableZoneRamMovement: removeHoleLabel,
      movableZoneRepositionMovement: removeHoleLabel,
      readyDeclaration: removeHoleLabel,
      movement: removeHoleLabel,
      objectContactTargets: removeHoleLabel,
      objectDropResolution: removeHoleLabel,
      objectTargetChoice: removeHoleLabel,
      ongoingSpellTargetChoice: removeHoleLabel,
      rolledDice: removeHoleLabel,
      sanctuaryInterdictionOutcome: removeHoleLabel,
      savingThrowOutcome: removeHoleLabel,
      selfTransformationModeChoice: removeHoleLabel,
      slowSomaticSpellFailureOutcome: removeHoleLabel,
      shoveOutcome: removeHoleLabel,
      skillChoice: removeHoleLabel,
      spellAreaChoice: removeHoleLabel,
      spellTargetAllocation: removeHoleLabel,
      spellTargetList: removeHoleLabel,
      spellcastingAbilityCheck: removeHoleLabel,
      spiritualWeaponForcePosition: removeHoleLabel,
      statBlockRechargeRoll: removeHoleLabel,
      targetAbilityChoices: removeHoleLabel,
      targetChoice: removeHoleLabel,
      targetSpatialFacts: removeHoleLabel,
      teleportDestination: removeHoleLabel,
      thaumaturgyActiveOneMinuteEffectCount: removeHoleLabel,
      toolPossessionFacts: removeHoleLabel,
      unitFeatureDecision: removeHoleLabel,
      wildShapeEquipmentDisposition: removeHoleLabel,
    }),
  );
}

function projectMechanicalInterruptChoice(
  choice: BattleInterruptProcedureChoice,
): BattleMechanicalInterruptChoice {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      releaseReadiedSpell: projectChoiceWithInitialHoles,
      releaseReadiedMovement: projectChoiceWithInitialHoles,
      releaseReadiedAction: projectChoiceWithInitialHoles,
      releaseReadiedAttack: projectChoiceWithInitialHoles,
      castTriggeredReactionSpell: projectChoiceWithInitialHoles,
      castAttackHitBonusActionSpell: projectChoiceWithInitialHoles,
      opportunityAttack: projectChoiceWithInitialHoles,
      retaliationAttack: projectChoiceWithInitialHoles,
      reactionRollOrDamageReduction: projectChoiceWithInitialHoles,
    }),
  );
}

function projectChoiceWithInitialHoles<
  T extends BattleInterruptProcedureChoice,
>(choice: T): BattleMechanicalInterruptChoice {
  const { initialHoles, ...mechanical } = choice;
  return {
    ...mechanical,
    initialHoles: initialHoles.map(projectMechanicalHole),
  };
}
