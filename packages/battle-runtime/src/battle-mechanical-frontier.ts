import { Match, Result, Schema } from "effect";

import {
  BattleFillSchema,
  BattleMechanicalInterruptDecisionHoleSchema as BattleMechanicalInterruptDecisionHoleCodecSchema,
  BattleMechanicalHoleSchema as BattleMechanicalHoleCodecSchema,
  BattleMechanicalInterruptProcedureChoiceSchema,
  BattleMechanicalOrdinaryHoleSchema as BattleMechanicalOrdinaryHoleCodecSchema,
  portableCodec,
} from "./battle-reducer/battle-codecs.ts";
import { projectMechanicalAttackActionOption } from "./battle-mechanical-attack-options.ts";
import type {
  BattleHole,
  BattleInterruptProcedureChoice,
  BattleFill,
  BattleInterruptDecisionFrontier,
} from "./battle-state-execution.ts";
import { BattleSubjectSchema, type BattleSubject } from "./battle-subjects.ts";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";

export const BattleMechanicalHoleSchema: typeof BattleMechanicalHoleCodecSchema =
  BattleMechanicalHoleCodecSchema.annotate({
    parseOptions: { onExcessProperty: "error" },
  });
export const BattleMechanicalOrdinaryHoleSchema: typeof BattleMechanicalOrdinaryHoleCodecSchema =
  BattleMechanicalOrdinaryHoleCodecSchema.annotate({
    parseOptions: { onExcessProperty: "error" },
  });
export const BattleMechanicalInterruptDecisionHoleSchema: typeof BattleMechanicalInterruptDecisionHoleCodecSchema =
  BattleMechanicalInterruptDecisionHoleCodecSchema.annotate({
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

/**
 * The single frontier projection consumed by the mechanical boundary.
 * Runtime resolution/session envelopes own this frontier; no committed
 * snapshot fields are duplicated here.
 */
export type BattleMechanicalFrontierResult =
  | {
      readonly kind: "holes";
      readonly subject: BattleSubject;
      readonly holes: readonly BattleHole[];
    }
  | BattleInterruptDecisionFrontier;

export type BattleMechanicalFrontierIssue =
  | { readonly tag: "emptyHoleFrontier" }
  | { readonly tag: "interruptFrontierDecisionHoleMismatch" };

export const BattleMechanicalInterruptChoiceSchema: typeof BattleMechanicalInterruptProcedureChoiceSchema =
  BattleMechanicalInterruptProcedureChoiceSchema.annotate({
    parseOptions: { onExcessProperty: "error" },
  });

type BattleMechanicalOrdinaryFrontierCodec = Schema.Struct<{
  readonly kind: Schema.Literal<"ordinaryHoles">;
  readonly subject: typeof BattleSubjectSchema;
  readonly holes: Schema.NonEmptyArray<
    typeof BattleMechanicalOrdinaryHoleSchema
  >;
  readonly acceptedFills: Schema.$Array<typeof BattleFillSchema>;
}>;

type BattleMechanicalInterruptFrontierCodec = Schema.Struct<{
  readonly kind: Schema.Literal<"interruptDecision">;
  readonly decisionHole: typeof BattleMechanicalInterruptDecisionHoleSchema;
  readonly choices: Schema.NonEmptyArray<
    typeof BattleMechanicalInterruptChoiceSchema
  >;
}>;

type BattleMechanicalFrontierCodec = Schema.Union<
  readonly [
    BattleMechanicalOrdinaryFrontierCodec,
    BattleMechanicalInterruptFrontierCodec,
  ]
>;

export const BattleMechanicalFrontierSchema: Schema.Codec<
  BattleMechanicalFrontier,
  Schema.Codec.Encoded<BattleMechanicalFrontierCodec>,
  never,
  never
> = portableCodec<
  BattleMechanicalFrontier,
  Schema.Codec.Encoded<BattleMechanicalFrontierCodec>
>()(
  Schema.Union([
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
  ]).annotate({
    identifier: "BattleMechanicalFrontier",
    parseOptions: { onExcessProperty: "error" },
  }),
);

export function battleMechanicalFrontier(input: {
  readonly result: BattleMechanicalFrontierResult;
  readonly acceptedFills: readonly BattleFill[];
}): Result.Result<BattleMechanicalFrontier, BattleMechanicalFrontierIssue> {
  const { result } = input;
  if (result.kind === "interruptDecision") {
    if (result.trigger !== result.decisionHole.trigger) {
      return Result.fail({ tag: "interruptFrontierDecisionHoleMismatch" });
    }
    const mechanicalInterruptHole = projectMechanicalInterruptHole(
      result.decisionHole,
    );
    return Result.succeed({
      kind: "interruptDecision",
      decisionHole: mechanicalInterruptHole,
      choices: projectMechanicalChoices(result.choices),
    });
  }
  const ordinaryHoles = result.holes.filter(isOrdinaryBattleHole);
  const [firstOrdinaryHole, ...remainingOrdinaryHoles] = ordinaryHoles;
  if (firstOrdinaryHole === undefined) {
    return Result.fail({ tag: "emptyHoleFrontier" });
  }
  return Result.succeed({
    kind: "ordinaryHoles",
    subject: result.subject,
    holes: projectMechanicalOrdinaryHoles([
      firstOrdinaryHole,
      ...remainingOrdinaryHoles,
    ]),
    acceptedFills: input.acceptedFills,
  });
}

function isOrdinaryBattleHole(
  hole: BattleHole,
): hole is Exclude<BattleHole, { readonly kind: "interruptDecision" }> {
  return hole.kind !== "interruptDecision";
}

function projectMechanicalOrdinaryHoles(
  holes: ReadonlyNonEmptyArray<
    Exclude<BattleHole, { readonly kind: "interruptDecision" }>
  >,
): ReadonlyNonEmptyArray<BattleMechanicalOrdinaryHole> {
  const [first, ...rest] = holes;
  return [
    projectMechanicalHole(first),
    ...rest.map((hole) => projectMechanicalHole(hole)),
  ];
}

function projectMechanicalChoices(
  choices: ReadonlyNonEmptyArray<BattleInterruptProcedureChoice>,
): ReadonlyNonEmptyArray<BattleMechanicalInterruptChoice> {
  const [first, ...rest] = choices;
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
      areaWindStrength: (value) => projectHoleWithoutPresentationLabel(value),
      attackDamageDisposition: (value) =>
        projectHoleWithoutPresentationLabel(value),
      attackRoll: (value) => projectMechanicalAttackRollHole(value),
      companionReappearanceInitiative: (value) =>
        projectHoleWithoutPresentationLabel(value),
      companionReappearancePlacement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      compelledBehaviorOptionChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      concentrationSavingThrow: (value) => projectMechanicalD20Hole(value),
      conditionChoice: (value) => projectHoleWithoutPresentationLabel(value),
      controlledVerticalSuspensionAltitudeChange: (value) =>
        projectHoleWithoutPresentationLabel(value),
      controlledVerticalSuspensionInitialRise: (value) =>
        projectHoleWithoutPresentationLabel(value),
      cunningStrikeEndTurnCoverFacts: (value) =>
        projectHoleWithoutPresentationLabel(value),
      damageRelationshipDecisions: (value) =>
        projectHoleWithoutPresentationLabel(value),
      damageTypeChoice: (value) => projectHoleWithoutPresentationLabel(value),
      deathSavingThrow: (value) => projectMechanicalD20Hole(value),
      directionalPersistentAreaDirectionChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      grappleOutcome: (value) => projectHoleWithoutPresentationLabel(value),
      heldObjectFacts: (value) => projectHoleWithoutPresentationLabel(value),
      helpAttackAllyDecision: (value) =>
        projectHoleWithoutPresentationLabel(value),
      helpAttackEnemyDecision: (value) =>
        projectHoleWithoutPresentationLabel(value),
      hitPointHealingDistribution: (value) =>
        projectHoleWithoutPresentationLabel(value),
      interruptDecision: (value) => projectHoleWithoutPresentationLabel(value),
      movement: (value) => projectHoleWithoutPresentationLabel(value),
      movableLightPlacement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      movableZoneRamMovement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      movableZoneRepositionMovement: (value) =>
        projectHoleWithoutPresentationLabel(value),
      objectContactTargets: (value) =>
        projectHoleWithoutPresentationLabel(value),
      objectDropResolution: (value) =>
        projectHoleWithoutPresentationLabel(value),
      objectTargetChoice: (value) => projectHoleWithoutPresentationLabel(value),
      ongoingSpellTargetChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      persistentAreaSourceTurnTranslation: (value) =>
        projectHoleWithoutPresentationLabel(value),
      readyDeclaration: (value) => projectHoleWithoutPresentationLabel(value),
      rolledDice: (value) => projectMechanicalRolledDiceHole(value),
      savingThrowOutcome: (value) => projectMechanicalSavingThrowHole(value),
      selfTransformationModeChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      shoveOutcome: (value) => projectHoleWithoutPresentationLabel(value),
      skillChoice: (value) => projectHoleWithoutPresentationLabel(value),
      spatialMeleeSpellAttackProxyPosition: (value) =>
        projectHoleWithoutPresentationLabel(value),
      spawnedCompanionConnection: (value) =>
        projectHoleWithoutPresentationLabel(value),
      spellAreaChoice: (value) => projectHoleWithoutPresentationLabel(value),
      spellTargetAllocation: (value) =>
        projectHoleWithoutPresentationLabel(value),
      spellTargetList: (value) => projectHoleWithoutPresentationLabel(value),
      spellcastingAbilityCheck: (value) => projectMechanicalD20Hole(value),
      startTurnOccurrenceOrder: (value) =>
        projectHoleWithoutPresentationLabel(value),
      statBlockRechargeRoll: (value) =>
        projectHoleWithoutPresentationLabel(value),
      targetAbilityChoices: (value) =>
        projectHoleWithoutPresentationLabel(value),
      targetChoice: (value) => projectHoleWithoutPresentationLabel(value),
      targetSpatialFacts: (value) => projectHoleWithoutPresentationLabel(value),
      targetingSaveInterdictionOutcome: (value) =>
        projectHoleWithoutPresentationLabel(value),
      teleportDestination: (value) =>
        projectHoleWithoutPresentationLabel(value),
      temporaryAbilityCheckRollModeActiveEffectCount: (value) =>
        projectHoleWithoutPresentationLabel(value),
      temporaryHitPointChoice: (value) =>
        projectHoleWithoutPresentationLabel(value),
      toolPossessionFacts: (value) =>
        projectHoleWithoutPresentationLabel(value),
      turnConstraintSomaticSpellFailureOutcome: (value) =>
        projectHoleWithoutPresentationLabel(value),
      unitFeatureDecision: (value) =>
        projectHoleWithoutPresentationLabel(value),
      weaponAttackDamageEnhancementTargetItem: (value) =>
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
  if ("attack" in hole) {
    const { label, d20TestNaturalOneRerolls, attack, ...mechanical } = hole;
    void label;
    return {
      ...mechanical,
      attack: projectMechanicalAttackActionOption(attack),
      ...(d20TestNaturalOneRerolls === undefined
        ? {}
        : {
            d20TestNaturalOneRerolls: d20TestNaturalOneRerolls.map(
              projectNestedPresentationLabel,
            ),
          }),
    };
  }
  const { label, d20TestNaturalOneRerolls, spellAttackRerolls, ...mechanical } =
    hole;
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
    ...(spellAttackRerolls === undefined
      ? {}
      : {
          spellAttackRerolls: spellAttackRerolls.map(
            projectNestedPresentationLabel,
          ),
        }),
  };
}

function projectMechanicalRolledDiceHole(
  hole: Extract<BattleHole, { readonly kind: "rolledDice" }>,
): Extract<BattleMechanicalOrdinaryHole, { readonly kind: "rolledDice" }> {
  const { label, ...withoutLabel } = hole;
  void label;
  const mechanical =
    "attack" in withoutLabel
      ? {
          ...withoutLabel,
          attack: projectMechanicalAttackActionOption(withoutLabel.attack),
        }
      : withoutLabel;
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
