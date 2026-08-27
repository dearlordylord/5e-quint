import { Either, Match, Schema } from "effect";

import {
  BattleFillSchema,
  BattleMechanicalHoleSchema as BattleMechanicalHoleCodecSchema,
  BattleMechanicalInterruptProcedureChoiceSchema,
} from "./battle-reducer/battle-codecs.ts";
import { battleHoleFamilyKind } from "./battle-reducer/hole-helpers.ts";
import type {
  BattleHole,
  BattleInterruptProcedureChoice,
  BattleFill,
  BattleResolutionResult,
} from "./battle-state-execution.ts";
import { BattleSubjectSchema, type BattleSubject } from "./battle-subjects.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export const BattleMechanicalHoleSchema =
  BattleMechanicalHoleCodecSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });

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
  BattleMechanicalInterruptProcedureChoiceSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });

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
): Extract<BattleMechanicalHole, { readonly kind: "interruptDecision" }> {
  return Match.value(hole).pipe(
    Match.discriminatorsExhaustive("kind")({
      interruptDecision: (value) => projectHoleWithoutPresentationLabel(value),
    }),
  );
}

function projectMechanicalHole(hole: BattleHole): BattleMechanicalHole {
  return Match.value(hole).pipe(
    Match.discriminatorsExhaustive("kind")({
      abilityCheck: (value) => projectHoleWithoutPresentationLabel(value),
      abilityChoice: (value) => projectHoleWithoutPresentationLabel(value),
      attackDamageDisposition: (value) =>
        projectHoleWithoutPresentationLabel(value),
      attackRoll: (value) => projectHoleWithoutPresentationLabel(value),
      commandOptionChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      companionReappearanceInitiative: (value) =>
        projectHoleWithoutPresentationLabel(value),
      companionReappearancePlacement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      concentrationSavingThrow: (value) =>
        projectHoleWithoutPresentationLabel(value),
      conditionChoice: (value) => projectHoleWithoutPresentationLabel(value),
      cunningStrikeEndTurnCoverFacts: (value) =>
        projectHoleWithoutPresentationLabel(value),
      damageRelationshipDecisions: (value) =>
        projectHoleWithoutPresentationLabel(value),
      damageTypeChoice: (value) => projectHoleWithoutPresentationLabel(value),
      dancingLightsPlacement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      deathSavingThrow: (value) => projectHoleWithoutPresentationLabel(value),
      findFamiliarConnection: (value) =>
        projectHoleWithoutPresentationLabel(value),
      grappleOutcome: (value) => projectHoleWithoutPresentationLabel(value),
      gustOfWindLineDirectionChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      heldObjectFacts: (value) => projectHoleWithoutPresentationLabel(value),
      helpAttackAllyDecision: (value) =>
        projectHoleWithoutPresentationLabel(value),
      helpAttackEnemyDecision: (value) =>
        projectHoleWithoutPresentationLabel(value),
      hitPointHealingDistribution: (value) =>
        projectHoleWithoutPresentationLabel(value),
      interruptDecision: (value) => projectHoleWithoutPresentationLabel(value),
      levitateAltitudeChange: (value) =>
        projectHoleWithoutPresentationLabel(value),
      levitateInitialRise: (value) =>
        projectHoleWithoutPresentationLabel(value),
      magicWeaponTargetItem: (value) =>
        projectHoleWithoutPresentationLabel(value),
      movableZoneRamMovement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      movableZoneRepositionMovement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      readyDeclaration: (value) => projectHoleWithoutPresentationLabel(value),
      movement: (value) => projectHoleWithoutPresentationLabel(value),
      objectContactTargets: (value) =>
        projectHoleWithoutPresentationLabel(value),
      objectDropResolution: (value) =>
        projectHoleWithoutPresentationLabel(value),
      objectTargetChoice: (value) => projectHoleWithoutPresentationLabel(value),
      ongoingSpellTargetChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      rolledDice: (value) => projectHoleWithoutPresentationLabel(value),
      sanctuaryInterdictionOutcome: (value) =>
        projectHoleWithoutPresentationLabel(value),
      savingThrowOutcome: (value) => projectHoleWithoutPresentationLabel(value),
      selfTransformationModeChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      slowSomaticSpellFailureOutcome: (value) =>
        projectHoleWithoutPresentationLabel(value),
      shoveOutcome: (value) => projectHoleWithoutPresentationLabel(value),
      skillChoice: (value) => projectHoleWithoutPresentationLabel(value),
      spellAreaChoice: (value) => projectHoleWithoutPresentationLabel(value),
      spellTargetAllocation: (value) =>
        projectHoleWithoutPresentationLabel(value),
      spellTargetList: (value) => projectHoleWithoutPresentationLabel(value),
      spellcastingAbilityCheck: (value) =>
        projectHoleWithoutPresentationLabel(value),
      spiritualWeaponForcePosition: (value) =>
        projectHoleWithoutPresentationLabel(value),
      statBlockRechargeRoll: (value) =>
        projectHoleWithoutPresentationLabel(value),
      targetAbilityChoices: (value) =>
        projectHoleWithoutPresentationLabel(value),
      targetChoice: (value) => projectHoleWithoutPresentationLabel(value),
      targetSpatialFacts: (value) => projectHoleWithoutPresentationLabel(value),
      teleportDestination: (value) =>
        projectHoleWithoutPresentationLabel(value),
      thaumaturgyActiveOneMinuteEffectCount: (value) =>
        projectHoleWithoutPresentationLabel(value),
      toolPossessionFacts: (value) =>
        projectHoleWithoutPresentationLabel(value),
      unitFeatureDecision: (value) =>
        projectHoleWithoutPresentationLabel(value),
      wildShapeEquipmentDisposition: (value) =>
        projectHoleWithoutPresentationLabel(value),
    }),
  );
}

type MechanicalHoleProjection<Hole extends { readonly label: string }> =
  Hole extends unknown ? Omit<Hole, "label"> : never;

function projectHoleWithoutPresentationLabel<
  Hole extends { readonly label: string },
>(hole: Hole): MechanicalHoleProjection<Hole>;
function projectHoleWithoutPresentationLabel<
  Hole extends { readonly label: string },
>(hole: Hole) {
  const { label, ...mechanical } = hole;
  void label;
  return mechanical;
}

function projectMechanicalInterruptChoice(
  choice: BattleInterruptProcedureChoice,
): BattleMechanicalInterruptChoice {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      releaseReadiedSpell: (value) => projectChoiceWithMechanicalHoles(value),
      releaseReadiedMovement: (value) =>
        projectChoiceWithMechanicalHoles(value),
      releaseReadiedAction: (value) => projectChoiceWithMechanicalHoles(value),
      releaseReadiedAttack: (value) => projectChoiceWithMechanicalHoles(value),
      castTriggeredReactionSpell: (value) =>
        projectChoiceWithMechanicalHoles(value),
      castAttackHitBonusActionSpell: (value) =>
        projectChoiceWithMechanicalHoles(value),
      opportunityAttack: (value) => projectChoiceWithMechanicalHoles(value),
      retaliationAttack: (value) => projectChoiceWithMechanicalHoles(value),
      reactionRollOrDamageReduction: (value) =>
        projectChoiceWithMechanicalHoles(value),
    }),
  );
}

function projectChoiceWithMechanicalHoles<
  T extends BattleInterruptProcedureChoice,
>(choice: T) {
  const { initialHoles, ...mechanical } = choice;
  return {
    ...mechanical,
    initialHoles: initialHoles.map(projectMechanicalHole),
  };
}
