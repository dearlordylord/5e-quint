import { Either, Match, Schema } from "effect";

import {
  BattleFillSchema,
  BattleMechanicalInterruptDecisionHoleSchema as BattleMechanicalInterruptDecisionHoleCodecSchema,
  BattleMechanicalHoleSchema as BattleMechanicalHoleCodecSchema,
  BattleMechanicalInterruptProcedureChoiceSchema,
  BattleMechanicalOrdinaryHoleSchema as BattleMechanicalOrdinaryHoleCodecSchema,
} from "./battle-reducer/battle-codecs.ts";
import { battleHoleFamilyKind } from "./battle-reducer/hole-helpers.ts";
import { sameDomainValue } from "./domain-value-equality.ts";
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
export const BattleMechanicalOrdinaryHoleSchema =
  BattleMechanicalOrdinaryHoleCodecSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });
export const BattleMechanicalInterruptDecisionHoleSchema =
  BattleMechanicalInterruptDecisionHoleCodecSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });

export type BattleMechanicalHole = typeof BattleMechanicalHoleSchema.Type;
export type BattleMechanicalOrdinaryHole =
  typeof BattleMechanicalOrdinaryHoleSchema.Type;
export type BattleMechanicalInterruptDecisionHole =
  typeof BattleMechanicalInterruptDecisionHoleSchema.Type;

export type BattleMechanicalInterruptChoice =
  typeof BattleMechanicalInterruptProcedureChoiceSchema.Type;

export type BattleMechanicalOrdinaryFrontier = {
  readonly kind: "ordinaryHoles";
  readonly subject: BattleSubject;
  readonly holes: ReadonlyNonEmptyArray<BattleMechanicalOrdinaryHole>;
  readonly acceptedFills: readonly BattleFill[];
};

export type BattleMechanicalInterruptFrontier = {
  readonly kind: "interruptDecision";
  readonly decisionHole: BattleMechanicalInterruptDecisionHole;
  readonly choices: ReadonlyNonEmptyArray<BattleMechanicalInterruptChoice>;
};

export type BattleMechanicalFrontier =
  | BattleMechanicalOrdinaryFrontier
  | BattleMechanicalInterruptFrontier;

export type BattleMechanicalFrontierIssue =
  | { readonly tag: "emptyHoleFrontier" }
  | { readonly tag: "mixedInterruptAndOrdinaryHoles" }
  | { readonly tag: "ordinaryFrontierHasPendingInterrupt" }
  | { readonly tag: "interruptFrontierMissingCheckpoint" }
  | { readonly tag: "interruptFrontierChoiceSetEmpty" }
  | { readonly tag: "interruptFrontierDecisionHoleMismatch" };

export const BattleMechanicalInterruptChoiceSchema =
  BattleMechanicalInterruptProcedureChoiceSchema.annotations({
    parseOptions: { onExcessProperty: "error" },
  });

export const BattleMechanicalFrontierSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("ordinaryHoles"),
    subject: BattleSubjectSchema,
    holes: Schema.NonEmptyArray(BattleMechanicalOrdinaryHoleSchema),
    acceptedFills: Schema.Array(BattleFillSchema),
  }),
  Schema.Struct({
    kind: Schema.Literal("interruptDecision"),
    decisionHole: BattleMechanicalInterruptDecisionHoleSchema,
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
    if (!sameDomainValue(interruptHole, pendingInterrupt.decisionHole)) {
      return Either.left({ tag: "interruptFrontierDecisionHoleMismatch" });
    }
    return Either.right({
      kind: "interruptDecision",
      decisionHole: projectMechanicalInterruptHole(interruptHole),
      choices: projectMechanicalChoices(pendingInterrupt.choices),
    });
  }
  if (result.snapshot.pendingInterrupt !== null) {
    return Either.left({ tag: "ordinaryFrontierHasPendingInterrupt" });
  }
  return Either.right({
    kind: "ordinaryHoles",
    subject: result.subject,
    holes: projectMechanicalOrdinaryHoles(result.holes),
    acceptedFills: input.acceptedFills,
  });
}

function isOrdinaryBattleHole(
  hole: BattleHole,
): hole is Exclude<BattleHole, { readonly kind: "interruptDecision" }> {
  return hole.kind !== "interruptDecision";
}

function projectMechanicalOrdinaryHoles(
  holes: readonly BattleHole[],
): ReadonlyNonEmptyArray<BattleMechanicalOrdinaryHole> {
  const ordinaryHoles = holes.filter(isOrdinaryBattleHole);
  const [first, ...rest] = ordinaryHoles;
  if (first === undefined) {
    throw new Error("ordinary battle holes were proven nonempty");
  }
  return [
    projectMechanicalHole(first),
    ...rest.map((hole) => projectMechanicalHole(hole)),
  ];
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
): BattleMechanicalInterruptDecisionHole {
  return projectMechanicalHole(hole);
}

function projectMechanicalHole(
  hole: Exclude<BattleHole, { readonly kind: "interruptDecision" }>,
): BattleMechanicalOrdinaryHole;
function projectMechanicalHole(
  hole: Extract<BattleHole, { readonly kind: "interruptDecision" }>,
): BattleMechanicalInterruptDecisionHole;
function projectMechanicalHole(hole: BattleHole): BattleMechanicalHole;
function projectMechanicalHole(hole: BattleHole): BattleMechanicalHole {
  return Match.value(hole).pipe(
    Match.discriminatorsExhaustive("kind")({
      abilityCheck: (value) => projectMechanicalD20Hole(value),
      abilityChoice: (value) => projectHoleWithoutPresentationLabel(value),
      attackDamageDisposition: (value) =>
        projectHoleWithoutPresentationLabel(value),
      attackRoll: (value) => projectMechanicalAttackRollHole(value),
      commandOptionChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      companionReappearanceInitiative: (value) =>
        projectHoleWithoutPresentationLabel(value),
      companionReappearancePlacement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      concentrationSavingThrow: (value) => projectMechanicalD20Hole(value),
      conditionChoice: (value) => projectHoleWithoutPresentationLabel(value),
      cunningStrikeEndTurnCoverFacts: (value) =>
        projectHoleWithoutPresentationLabel(value),
      damageRelationshipDecisions: (value) =>
        projectHoleWithoutPresentationLabel(value),
      damageTypeChoice: (value) => projectHoleWithoutPresentationLabel(value),
      dancingLightsPlacement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      deathSavingThrow: (value) => projectMechanicalD20Hole(value),
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
      rolledDice: (value) => projectMechanicalRolledDiceHole(value),
      sanctuaryInterdictionOutcome: (value) =>
        projectHoleWithoutPresentationLabel(value),
      savingThrowOutcome: (value) => projectMechanicalSavingThrowHole(value),
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
      spellcastingAbilityCheck: (value) => projectMechanicalD20Hole(value),
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

function projectNestedPresentationLabel<
  Option extends { readonly label: string },
>(option: Option): Omit<Option, "label"> {
  const { label, ...mechanical } = option;
  void label;
  return mechanical;
}

type MechanicalHoleProjection<Hole extends { readonly label: string }> =
  Hole extends unknown ? Omit<Hole, "label"> : never;

type BattleMechanicalD20Hole = Extract<
  BattleMechanicalOrdinaryHole,
  {
    readonly kind:
      | "abilityCheck"
      | "concentrationSavingThrow"
      | "deathSavingThrow"
      | "spellcastingAbilityCheck";
  }
>;

function projectMechanicalD20Hole(
  hole: Extract<
    BattleHole,
    {
      readonly kind:
        | "abilityCheck"
        | "concentrationSavingThrow"
        | "deathSavingThrow"
        | "spellcastingAbilityCheck";
    }
  >,
): BattleMechanicalD20Hole {
  const { label, d20TestNaturalOneRerolls, ...mechanical } = hole;
  void label;
  return {
    ...mechanical,
    ...(d20TestNaturalOneRerolls === undefined
      ? {}
      : {
          d20TestNaturalOneRerolls: d20TestNaturalOneRerolls.map(
            projectNestedPresentationLabel,
          ),
        }),
  };
}

function projectMechanicalAttackRollHole(
  hole: Extract<BattleHole, { readonly kind: "attackRoll" }>,
): Extract<BattleMechanicalOrdinaryHole, { readonly kind: "attackRoll" }> {
  const { label, d20TestNaturalOneRerolls, ...mechanical } = hole;
  void label;
  const mechanicalWithD20 = {
    ...mechanical,
    ...(d20TestNaturalOneRerolls === undefined
      ? {}
      : {
          d20TestNaturalOneRerolls: d20TestNaturalOneRerolls.map(
            projectNestedPresentationLabel,
          ),
        }),
  };
  if ("spellAttackRerolls" in hole && hole.spellAttackRerolls !== undefined) {
    return {
      ...mechanicalWithD20,
      spellAttackRerolls: hole.spellAttackRerolls.map(
        projectNestedPresentationLabel,
      ),
    };
  }
  return mechanicalWithD20;
}

function projectMechanicalRolledDiceHole(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): Extract<BattleMechanicalOrdinaryHole, { readonly kind: "rolledDice" }> {
  const { label, ...mechanical } = hole;
  void label;
  if ("spellDamageRerolls" in hole && hole.spellDamageRerolls !== undefined) {
    return {
      ...mechanical,
      spellDamageRerolls: hole.spellDamageRerolls.map(
        projectNestedPresentationLabel,
      ),
    };
  }
  return mechanical;
}

function projectMechanicalSavingThrowHole(
  hole: Extract<BattleHole, { readonly kind: "savingThrowOutcome" }>,
): Extract<
  BattleMechanicalOrdinaryHole,
  { readonly kind: "savingThrowOutcome" }
> {
  const { label, ...mechanical } = hole;
  void label;
  if (
    "d20TestNaturalOneRerolls" in hole &&
    hole.d20TestNaturalOneRerolls !== undefined
  ) {
    return {
      ...mechanical,
      d20TestNaturalOneRerolls: hole.d20TestNaturalOneRerolls.map(
        projectNestedPresentationLabel,
      ),
    };
  }
  return mechanical;
}

function projectMechanicalInterruptChoice(
  choice: BattleInterruptProcedureChoice,
): BattleMechanicalInterruptChoice {
  return Match.value(choice).pipe(
    Match.discriminatorsExhaustive("kind")({
      nestedProcedure: (value) => projectChoiceWithMechanicalHoles(value),
      reactionModifier: (value) => projectChoiceWithMechanicalHoles(value),
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
