// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spellcasting.procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE
import * as Either from "effect/Either";
import { Match } from "effect";
import {
  Integer,
  NonNegativeInteger,
  PositiveInteger,
} from "@dnd/shared/types";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import type { ReadonlyNonEmptyArray, Size } from "@dnd/shared/types";
import type {
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResourceOrdinal,
  StatBlockRecord,
  StatBlockSpellReference,
  StandaloneCreatureSpeed,
  StandaloneStatBlock,
  StandaloneStatBlockSpeedEntry,
} from "@dnd/surface/surface/types";
import {
  creatureAttackRollMechanicsAreSupported,
  supportedStatBlockTraitAttackRollModes,
} from "./statblock-action-execution-support.ts";
import {
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type SupportedStatBlockBonusActionStandardAction,
} from "./battle-reducer/battle-runtime-protocol.ts";
import type {
  BattleStatBlockAuthoredProcedurePresentation,
  BattleStatBlockAuthoredTraitPresentation,
  BattleStatBlockPresentationSource,
} from "./battle-runtime-context.ts";
import {
  parseStatBlockPositiveIntegerLiteral,
  parseStatBlockRuntimeResource,
  type BattleStatBlockExecutionSource,
  type BattleStatBlockRuntimeProcedure,
  type BattleStatBlockRuntimeMultiattackDispatch,
  type BattleStatBlockRuntimeResource,
  type BattleStatBlockRuntimeSpeed,
  type BattleStatBlockRuntimeSense,
  type StatBlockRuntimeResourceParseFailure,
} from "./stat-block-execution-state.ts";
import type { StatBlockActionProjectionSection } from "./stat-block-presentation-contract.ts";
import type {
  StatBlockTraitAttackRollMode,
  SupportedCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import { optionalProperty } from "./optional-property.ts";

type BattleStatBlockProjectionScalarFailureReason =
  | "nonLiteralSize"
  | "unresolvedGmSpeedChoice"
  | "unsupportedFormRestrictedSpeed"
  | "unsupportedQualifiedConditionImmunity"
  | "unsupportedLairConditionalLegendaryActionUses";

export type BattleStatBlockInvalidResourceDeclaration = {
  readonly ordinal: StatBlockProcedureResourceOrdinal;
  readonly reason: StatBlockRuntimeResourceParseFailure;
};

export type BattleStatBlockUnsupportedProcedureBinding = {
  readonly section: StatBlockActionProjectionSection;
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
};

export type BattleStatBlockProjectionFailure =
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: BattleStatBlockProjectionScalarFailureReason;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    }
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: "invalidResourceLimit";
      readonly issues: ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    }
  | {
      readonly tag: "battleStatBlockProjectionFailure";
      readonly reason: "unsupportedProcedureBinding";
      readonly issues: ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>;
      readonly procedureOrdinal?: never;
      readonly section?: never;
    };

export type AuthoredStatBlockProjection = {
  readonly runtime: BattleStatBlockExecutionSource;
  readonly presentation: BattleStatBlockPresentationSource;
};

/**
 * Format an authored projection failure for a boundary that presents it to a
 * caller. The failure itself remains structured; this helper only supplies
 * the shared human-readable location and reason text.
 */
export function battleStatBlockProjectionFailureMessage(
  failure: BattleStatBlockProjectionFailure,
  prefix = "Stat Block authored projection failed",
): string {
  const location =
    failure.reason === "unsupportedProcedureBinding"
      ? ` in ${failure.issues
          .map(
            ({ section, procedureOrdinal }) =>
              `${section} procedure ${String(procedureOrdinal)}`,
          )
          .join(", ")}`
      : "";
  const reason = Match.value(failure.reason).pipe(
    Match.when(
      "nonLiteralSize",
      () => "battle initialization requires a concrete Size",
    ),
    Match.when(
      "unresolvedGmSpeedChoice",
      () =>
        "battle initialization requires the GM's Table Decision selecting one authored Speed alternative",
    ),
    Match.when(
      "unsupportedFormRestrictedSpeed",
      () =>
        "battle initialization does not own the active form needed to select a form-restricted Speed",
    ),
    Match.when(
      "unsupportedQualifiedConditionImmunity",
      () =>
        "battle initialization cannot apply a qualified condition Immunity without its qualifying state",
    ),
    Match.when(
      "unsupportedLairConditionalLegendaryActionUses",
      () =>
        "battle initialization does not own the lair context needed to select Legendary Action uses",
    ),
    Match.when(
      "invalidResourceLimit",
      () => "battle initialization requires valid Stat Block resource limits",
    ),
    Match.when(
      "unsupportedProcedureBinding",
      () => "the procedure binding is not supported by battle execution",
    ),
    Match.exhaustive,
  );
  return `${prefix}${location}: ${reason}.`;
}

/**
 * The catalog admission boundary. The authored record is consumed once;
 * execution receives only literal mechanics and ordinal bindings while the
 * presentation companion retains source identity and exact prose.
 */
export function projectAuthoredStatBlock(
  record: StatBlockRecord,
): Either.Either<
  AuthoredStatBlockProjection,
  BattleStatBlockProjectionFailure
> {
  const source = record.statBlock;
  const scalarProjection = authoredStatBlockScalarProjection(source);
  if (Either.isLeft(scalarProjection)) {
    return Either.left(scalarProjection.left);
  }
  const resources = runtimeResources(source.resources);
  if (Either.isLeft(resources)) {
    return Either.left(invalidResourceLimitFailure(resources.left));
  }
  const admittedProcedures = admittedProcedureProjections(source);
  if (Either.isLeft(admittedProcedures)) {
    return Either.left(
      unsupportedProcedureBindingFailure(admittedProcedures.left),
    );
  }
  const admitted = admittedProcedures.right;
  const runtime = runtimeProjection(
    record,
    source,
    scalarProjection.right.size,
    scalarProjection.right.speeds,
    resources.right,
    admitted.flatMap((projection) =>
      projection.kind === "executable" ? [projection.runtime] : [],
    ),
    scalarProjection.right.legendaryActionUses,
  );
  return Either.right({
    runtime,
    presentation: presentationProjection(record, admitted),
  });
}

type AuthoredStatBlockScalarProjection = {
  readonly size: Size;
  readonly speeds: ReadonlyNonEmptyArray<BattleStatBlockRuntimeSpeed>;
  readonly legendaryActionUses: BattleStatBlockExecutionSource["legendaryActionUses"];
};

function authoredStatBlockScalarProjection(
  source: StandaloneStatBlock,
): Either.Either<
  AuthoredStatBlockScalarProjection,
  BattleStatBlockProjectionFailure
> {
  const size = literalSize(source.size);
  if (size === null) return Either.left(failure("nonLiteralSize"));
  const concreteSpeeds = source.speeds.filter(isStandaloneCreatureSpeed);
  if (concreteSpeeds.length !== source.speeds.length) {
    return Either.left(failure("unresolvedGmSpeedChoice"));
  }
  if (concreteSpeeds.some((speed) => "availability" in speed)) {
    return Either.left(failure("unsupportedFormRestrictedSpeed"));
  }
  if (
    source.immunities !== undefined &&
    "qualifiedConditions" in source.immunities
  ) {
    return Either.left(failure("unsupportedQualifiedConditionImmunity"));
  }
  const legendaryActionUses = authoredLegendaryActionUses(
    source.legendaryActions?.uses,
  );
  if (Either.isLeft(legendaryActionUses)) {
    return Either.left(legendaryActionUses.left);
  }
  return Either.right({
    size,
    speeds: nonEmptyRuntimeValues(concreteSpeeds.map(runtimeSpeed)),
    legendaryActionUses: legendaryActionUses.right,
  });
}

function runtimeProjection(
  record: StatBlockRecord,
  source: StandaloneStatBlock,
  size: Size,
  speeds: ReadonlyNonEmptyArray<BattleStatBlockRuntimeSpeed>,
  resources: readonly BattleStatBlockRuntimeResource[],
  procedures: readonly BattleStatBlockRuntimeProcedure[],
  legendaryActionUses: BattleStatBlockExecutionSource["legendaryActionUses"],
): BattleStatBlockExecutionSource {
  return {
    id: record.id,
    challengeRating: record.challengeRating,
    statBlock: runtimeStatBlockProjection(source, size, speeds),
    procedures,
    resources,
    ...(legendaryActionUses === undefined ? {} : { legendaryActionUses }),
  };
}

function runtimeStatBlockProjection(
  source: StandaloneStatBlock,
  size: Size,
  speeds: ReadonlyNonEmptyArray<BattleStatBlockRuntimeSpeed>,
): BattleStatBlockExecutionSource["statBlock"] {
  return {
    size,
    creatureType: source.creatureType,
    ac: source.ac.value,
    hp: source.hp,
    speeds,
    abilityScores: source.abilityScores,
    initiativeModifier: Integer(source.initiative.modifier),
    initiativeScore: NonNegativeInteger(source.initiative.score),
    passivePerception: NonNegativeInteger(source.passivePerception),
    ...(source.savingThrowModifiers === undefined
      ? {}
      : { savingThrowModifiers: source.savingThrowModifiers }),
    ...(source.skillModifiers === undefined
      ? {}
      : { skillModifiers: source.skillModifiers }),
    ...(source.saveProficiencies === undefined
      ? {}
      : { saveProficiencies: source.saveProficiencies }),
    ...(source.vulnerabilities === undefined
      ? {}
      : { vulnerabilities: source.vulnerabilities }),
    ...(source.resistances === undefined
      ? {}
      : { resistances: source.resistances }),
    ...(source.immunities === undefined
      ? {}
      : { immunities: source.immunities }),
    ...(source.senses === undefined
      ? {}
      : { senses: source.senses.map(runtimeSense) }),
  };
}

export function projectAuthoredStatBlockWithCreatureType(
  record: StatBlockRecord,
  creatureType: BattleStatBlockExecutionSource["statBlock"]["creatureType"],
): Either.Either<
  AuthoredStatBlockProjection,
  BattleStatBlockProjectionFailure
> {
  const projected = projectAuthoredStatBlock(record);
  if (Either.isLeft(projected)) return projected;
  return Either.right({
    runtime: {
      ...projected.right.runtime,
      statBlock: {
        ...projected.right.runtime.statBlock,
        creatureType,
      },
    },
    presentation: projected.right.presentation,
  });
}

type AuthoredExecutableProcedureEntry = Extract<
  StatBlockProcedureEntry,
  { readonly kind: "executable" }
>;

type AuthoredExecutableProcedureEntryByKind<
  TKind extends AuthoredExecutableProcedureEntry["procedure"]["kind"],
> = AuthoredExecutableProcedureEntry & {
  readonly procedure: Extract<
    AuthoredExecutableProcedureEntry["procedure"],
    { readonly kind: TKind }
  >;
};

export const STAT_BLOCK_PROCEDURE_EXECUTION_FAILED_FACTS = [
  "unsupportedSection",
  "unsupportedAttackEffect",
  "unsupportedAttackMechanics",
  "unresolvedMultiattackDispatch",
  "invalidMultiattackCount",
  "unsupportedStandardAction",
  "missingSaveProcedureOwner",
  "missingSupportProcedureOwner",
  "missingSpellcastingProcedureOwner",
  "runtimeProcedureBindingRejected",
] as const;

export type StatBlockProcedureExecutionFailedFact =
  (typeof STAT_BLOCK_PROCEDURE_EXECUTION_FAILED_FACTS)[number];

export type AuthoredStatBlockProcedureExecutionDecision =
  | {
      readonly kind: "textOnly";
      readonly entry: Extract<
        StatBlockProcedureEntry,
        { readonly kind: "textOnly" }
      >;
    }
  | {
      readonly kind: "missingOwner";
      readonly entry: AuthoredExecutableProcedureEntry;
      readonly failedFacts: ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact>;
    }
  | {
      readonly kind: "executable";
      readonly procedureKind: "attack_roll";
      readonly entry: AuthoredExecutableProcedureEntryByKind<"attack_roll">;
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "attack" }
      >;
    }
  | {
      readonly kind: "executable";
      readonly procedureKind: "multiattack";
      readonly entry: AuthoredExecutableProcedureEntryByKind<"multiattack">;
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "multiattack" }
      >;
    }
  | {
      readonly kind: "executable";
      readonly procedureKind: "action_option";
      readonly entry: AuthoredExecutableProcedureEntryByKind<"action_option">;
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "bonusActionOption" }
      >;
    }
  | {
      readonly kind: "executable";
      readonly procedureKind: "spellcasting";
      readonly entry: AuthoredExecutableProcedureEntryByKind<"spellcasting">;
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "spellcasting" }
      >;
    };

type AdmittedExecutableStatBlockProcedureProjection =
  | {
      readonly kind: "executable";
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "attack" }
      >;
      readonly presentation: Extract<
        BattleStatBlockAuthoredProcedurePresentation,
        { readonly kind: "attack" }
      >;
    }
  | {
      readonly kind: "executable";
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "multiattack" }
      >;
      readonly presentation: Extract<
        BattleStatBlockAuthoredProcedurePresentation,
        { readonly kind: "multiattack" }
      >;
    }
  | {
      readonly kind: "executable";
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "bonusActionOption" }
      >;
      readonly presentation: Extract<
        BattleStatBlockAuthoredProcedurePresentation,
        { readonly kind: "bonusActionOption" }
      >;
    }
  | {
      readonly kind: "executable";
      readonly runtime: Extract<
        BattleStatBlockRuntimeProcedure,
        { readonly kind: "spellcasting" }
      >;
      readonly presentation: Extract<
        BattleStatBlockAuthoredProcedurePresentation,
        { readonly kind: "spellcasting" }
      >;
    };

type AdmittedStatBlockProcedureProjection =
  | {
      readonly kind: "textOnly";
      readonly presentation: Extract<
        BattleStatBlockAuthoredProcedurePresentation,
        { readonly kind: "textOnly" }
      >;
    }
  | AdmittedExecutableStatBlockProcedureProjection;

function admittedProcedureProjections(
  source: StandaloneStatBlock,
): Either.Either<
  readonly AdmittedStatBlockProcedureProjection[],
  ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>
> {
  const supportedActionAttackOrdinals = supportedAttackOrdinals(source.actions);
  const projections: AdmittedStatBlockProcedureProjection[] = [];
  const issues: BattleStatBlockUnsupportedProcedureBinding[] = [];
  for (const { section, entries } of authoredProcedureSections(source)) {
    for (const entry of entries ?? []) {
      const projected = admittedProcedureProjection(
        source,
        section,
        entry,
        supportedActionAttackOrdinals,
      );
      if (Either.isLeft(projected)) {
        issues.push(projected.left);
      } else {
        projections.push(projected.right);
      }
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Either.right(projections)
    : Either.left([firstIssue, ...remainingIssues]);
}

type AuthoredProcedureSection = {
  readonly section: StatBlockActionProjectionSection;
  readonly entries: readonly StatBlockProcedureEntry[] | undefined;
};

function authoredProcedureSections(
  source: StandaloneStatBlock,
): readonly AuthoredProcedureSection[] {
  return [
    { section: "actions", entries: source.actions },
    { section: "bonusActions", entries: source.bonusActions },
    { section: "reactions", entries: source.reactions },
    {
      section: "legendaryActions",
      entries: source.legendaryActions?.entries,
    },
  ];
}

function supportedAttackOrdinals(
  entries: readonly StatBlockProcedureEntry[] | undefined,
): ReadonlySet<StatBlockProcedureOrdinal> {
  return new Set(
    (entries ?? []).flatMap((entry) =>
      entry.kind === "executable" &&
      entry.procedure.kind === "attack_roll" &&
      authoredAttackMechanicsAreSupported(
        authoredAttackMechanics(entry.procedure),
      )
        ? [entry.procedureOrdinal]
        : [],
    ),
  );
}

function admittedProcedureProjection(
  source: StandaloneStatBlock,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedureEntry,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal>,
): Either.Either<
  AdmittedStatBlockProcedureProjection,
  BattleStatBlockUnsupportedProcedureBinding
> {
  return Match.value(
    authoredStatBlockProcedureExecutionDecision(
      source,
      section,
      entry,
      supportedActionAttackOrdinals,
    ),
  ).pipe(
    Match.when({ kind: "textOnly" }, ({ entry: textOnlyEntry }) =>
      Either.right({
        kind: "textOnly" as const,
        presentation: textOnlyProcedurePresentation(section, textOnlyEntry),
      }),
    ),
    Match.when({ kind: "missingOwner" }, () =>
      Either.left(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.when(
      { kind: "executable", procedureKind: "attack_roll" },
      ({ entry: executableEntry, runtime }) =>
        Either.right({
          kind: "executable" as const,
          runtime,
          presentation: attackProcedurePresentation(
            section,
            executableEntry,
            executableEntry.procedure,
          ),
        }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "multiattack" },
      ({ entry: executableEntry, runtime }) =>
        Either.right({
          kind: "executable" as const,
          runtime,
          presentation: multiattackProcedurePresentation(
            section,
            executableEntry,
            executableEntry.procedure,
          ),
        }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "action_option" },
      ({ entry: executableEntry, runtime }) =>
        Either.right({
          kind: "executable" as const,
          runtime,
          presentation: bonusActionProcedurePresentation(
            section,
            executableEntry,
            executableEntry.procedure,
          ),
        }),
    ),
    Match.when(
      { kind: "executable", procedureKind: "spellcasting" },
      ({ entry: executableEntry, runtime }) =>
        Either.right({
          kind: "executable" as const,
          runtime,
          presentation: spellcastingProcedurePresentation(
            section,
            executableEntry,
            executableEntry.procedure,
          ),
        }),
    ),
    Match.exhaustive,
  );
}

/**
 * Decide one authored procedure against the same support predicates consumed
 * by runtime projection. The result is pure and retains the failed structural
 * facts so planning evidence can count pressure without attempting whole-record
 * admission or dispatching on authored identity.
 */
export function authoredStatBlockProcedureExecutionDecision(
  source: StandaloneStatBlock,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedureEntry,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal> = supportedAttackOrdinals(
    source.actions,
  ),
): AuthoredStatBlockProcedureExecutionDecision {
  if (entry.kind === "textOnly") return { kind: "textOnly", entry };

  return Match.value(entry.procedure).pipe(
    Match.when({ kind: "attack_roll" }, (procedure) => {
      const narrowedEntry: AuthoredExecutableProcedureEntryByKind<"attack_roll"> =
        { ...entry, procedure };
      const runtime = runtimeAttackBinding(
        source,
        section,
        narrowedEntry,
        procedure,
      );
      return Either.isRight(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "attack_roll" as const,
            entry: narrowedEntry,
            runtime: runtime.right,
          }
        : {
            kind: "missingOwner" as const,
            entry: narrowedEntry,
            failedFacts: attackExecutionFailedFacts(section, procedure),
          };
    }),
    Match.when({ kind: "multiattack" }, (procedure) => {
      const narrowedEntry: AuthoredExecutableProcedureEntryByKind<"multiattack"> =
        { ...entry, procedure };
      const runtime =
        section === "actions"
          ? runtimeMultiattackBinding(
              narrowedEntry,
              procedure,
              supportedActionAttackOrdinals,
            )
          : Either.left(procedureBindingIssue(section, entry.procedureOrdinal));
      return Either.isRight(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "multiattack" as const,
            entry: narrowedEntry,
            runtime: runtime.right,
          }
        : {
            kind: "missingOwner" as const,
            entry: narrowedEntry,
            failedFacts: multiattackExecutionFailedFacts(
              section,
              procedure,
              supportedActionAttackOrdinals,
            ),
          };
    }),
    Match.when({ kind: "action_option" }, (procedure) => {
      const narrowedEntry: AuthoredExecutableProcedureEntryByKind<"action_option"> =
        { ...entry, procedure };
      const runtime =
        section === "bonusActions"
          ? runtimeBonusActionBinding(narrowedEntry, procedure)
          : Either.left(procedureBindingIssue(section, entry.procedureOrdinal));
      return Either.isRight(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "action_option" as const,
            entry: narrowedEntry,
            runtime: runtime.right,
          }
        : {
            kind: "missingOwner" as const,
            entry: narrowedEntry,
            failedFacts: actionOptionExecutionFailedFacts(section, procedure),
          };
    }),
    Match.when({ kind: "save" }, () => ({
      kind: "missingOwner" as const,
      entry,
      failedFacts: ["missingSaveProcedureOwner"] as const,
    })),
    Match.when({ kind: "support" }, () => ({
      kind: "missingOwner" as const,
      entry,
      failedFacts: ["missingSupportProcedureOwner"] as const,
    })),
    Match.when({ kind: "spellcasting" }, (procedure) => {
      // The Surface schema correlates this procedure with a `none` resource
      // reference branch. Keep the guard at this typed boundary because the
      // generated TypeScript union does not retain that nested correlation.
      if (entry.resourceRefs.kind !== "none") {
        return {
          kind: "missingOwner" as const,
          entry,
          failedFacts: ["runtimeProcedureBindingRejected"] as const,
        };
      }
      const narrowedEntry: AuthoredExecutableProcedureEntryByKind<"spellcasting"> =
        {
          kind: "executable",
          procedureOrdinal: entry.procedureOrdinal,
          procedure,
          resourceRefs: { kind: "none" },
        };
      const runtime = runtimeSpellcastingBinding(
        section,
        narrowedEntry,
        procedure,
      );
      return Either.isRight(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "spellcasting" as const,
            entry: narrowedEntry,
            runtime: runtime.right,
          }
        : {
            kind: "missingOwner" as const,
            entry: narrowedEntry,
            failedFacts: spellcastingExecutionFailedFacts(section),
          };
    }),
    Match.exhaustive,
  );
}

function attackExecutionFailedFacts(
  section: StatBlockActionProjectionSection,
  procedure: AuthoredExecutableProcedureEntryByKind<"attack_roll">["procedure"],
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  const failedFacts: StatBlockProcedureExecutionFailedFact[] = [];
  if (section !== "actions" && section !== "legendaryActions") {
    failedFacts.push("unsupportedSection");
  }
  const attack = authoredAttackMechanics(procedure);
  if (!authoredAttackEffectsAreSupported(attack)) {
    failedFacts.push("unsupportedAttackEffect");
  }
  if (
    authoredAttackEffectsAreSupported(attack) &&
    !creatureAttackRollMechanicsAreSupported(attack)
  ) {
    failedFacts.push("unsupportedAttackMechanics");
  }
  return nonEmptyFailedFacts(failedFacts);
}

function multiattackExecutionFailedFacts(
  section: StatBlockActionProjectionSection,
  procedure: AuthoredExecutableProcedureEntryByKind<"multiattack">["procedure"],
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal>,
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  const failedFacts: StatBlockProcedureExecutionFailedFact[] = [];
  if (section !== "actions") failedFacts.push("unsupportedSection");
  if (
    !procedure.dispatches.every(({ procedureOrdinal }) =>
      supportedActionAttackOrdinals.has(procedureOrdinal),
    )
  ) {
    failedFacts.push("unresolvedMultiattackDispatch");
  }
  if (
    procedure.dispatches.some(({ count }) =>
      Either.isLeft(parseStatBlockPositiveIntegerLiteral(count)),
    )
  ) {
    failedFacts.push("invalidMultiattackCount");
  }
  return nonEmptyFailedFacts(failedFacts);
}

function actionOptionExecutionFailedFacts(
  section: StatBlockActionProjectionSection,
  procedure: AuthoredExecutableProcedureEntryByKind<"action_option">["procedure"],
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  const failedFacts: StatBlockProcedureExecutionFailedFact[] = [];
  if (section !== "bonusActions") failedFacts.push("unsupportedSection");
  if (!procedure.options.every(isSupportedBonusAction)) {
    failedFacts.push("unsupportedStandardAction");
  }
  return nonEmptyFailedFacts(failedFacts);
}

function nonEmptyFailedFacts(
  failedFacts: readonly StatBlockProcedureExecutionFailedFact[],
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  const [first, ...remaining] = failedFacts;
  return first === undefined
    ? ["runtimeProcedureBindingRejected"]
    : [first, ...remaining];
}

function runtimeAttackBinding(
  source: StandaloneStatBlock,
  section: StatBlockActionProjectionSection,
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<typeof entry.procedure, { readonly kind: "attack_roll" }>,
): Either.Either<
  Extract<BattleStatBlockRuntimeProcedure, { readonly kind: "attack" }>,
  BattleStatBlockUnsupportedProcedureBinding
> {
  const attack = authoredAttackMechanics(procedure);
  if (
    (section !== "actions" && section !== "legendaryActions") ||
    !authoredAttackMechanicsAreSupported(attack)
  )
    return Either.left(procedureBindingIssue(section, entry.procedureOrdinal));
  return Either.right({
    kind: "attack",
    section,
    procedureOrdinal: entry.procedureOrdinal,
    attack,
    resourceRefs: procedureResourceRefs(entry),
    ...traitModes(source),
  });
}

function runtimeMultiattackBinding(
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<typeof entry.procedure, { readonly kind: "multiattack" }>,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal>,
): Either.Either<
  Extract<BattleStatBlockRuntimeProcedure, { readonly kind: "multiattack" }>,
  BattleStatBlockUnsupportedProcedureBinding
> {
  if (
    !procedure.dispatches.every(({ procedureOrdinal }) =>
      supportedActionAttackOrdinals.has(procedureOrdinal),
    )
  ) {
    return Either.left(
      procedureBindingIssue("actions", entry.procedureOrdinal),
    );
  }
  const dispatches: BattleStatBlockRuntimeMultiattackDispatch[] = [];
  for (const dispatch of procedure.dispatches) {
    const count = parseStatBlockPositiveIntegerLiteral(dispatch.count);
    if (Either.isLeft(count)) {
      return Either.left(
        procedureBindingIssue("actions", entry.procedureOrdinal),
      );
    }
    dispatches.push({
      procedureOrdinal: dispatch.procedureOrdinal,
      count: count.right.value,
    });
  }
  return Either.right({
    kind: "multiattack",
    section: "actions",
    procedureOrdinal: entry.procedureOrdinal,
    dispatches: nonEmptyRuntimeValues(dispatches),
    resourceRefs: procedureResourceRefs(entry),
  });
}

function runtimeBonusActionBinding(
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<
    typeof entry.procedure,
    { readonly kind: "action_option" }
  >,
): Either.Either<
  Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "bonusActionOption" }
  >,
  BattleStatBlockUnsupportedProcedureBinding
> {
  const options = procedure.options.filter(isSupportedBonusAction);
  return options.length === procedure.options.length
    ? Either.right({
        kind: "bonusActionOption",
        section: "bonusActions",
        procedureOrdinal: entry.procedureOrdinal,
        standardActions: nonEmptyRuntimeValues(options),
        resourceRefs: procedureResourceRefs(entry),
      })
    : Either.left(
        procedureBindingIssue("bonusActions", entry.procedureOrdinal),
      );
}

function runtimeSpellcastingBinding(
  section: StatBlockActionProjectionSection,
  entry: AuthoredExecutableProcedureEntryByKind<"spellcasting">,
  procedure: AuthoredExecutableProcedureEntryByKind<"spellcasting">["procedure"],
): Either.Either<
  Extract<BattleStatBlockRuntimeProcedure, { readonly kind: "spellcasting" }>,
  BattleStatBlockUnsupportedProcedureBinding
> {
  if (section !== "actions" && section !== "bonusActions") {
    return Either.left(procedureBindingIssue(section, entry.procedureOrdinal));
  }
  const groups = procedure.groups.map((group) =>
    Match.value(group).pipe(
      Match.when({ kind: "at_will" }, ({ spells }) => ({
        kind: "at_will" as const,
        resourceRefs: [] as const,
        invocations: runtimeSpellcastingInvocations(spells),
      })),
      Match.when({ kind: "limited" }, ({ resourceRefs, spells }) => ({
        kind: "limited" as const,
        resourceRefs: resourceRefs.ordinals,
        invocations: runtimeSpellcastingInvocations(spells),
      })),
      Match.exhaustive,
    ),
  );
  return Either.right({
    kind: "spellcasting",
    section,
    procedureOrdinal: entry.procedureOrdinal,
    ability: procedure.ability,
    ...optionalProperty(
      "spellSaveDc",
      procedure.spellSaveDc === undefined
        ? undefined
        : PositiveInteger(procedure.spellSaveDc.dc),
    ),
    ...optionalProperty(
      "spellAttackBonus",
      procedure.spellAttackBonus === undefined
        ? undefined
        : Integer(procedure.spellAttackBonus.value),
    ),
    ...(procedure.components === undefined
      ? {}
      : {
          components: {
            v: procedure.components.v,
            s: procedure.components.s,
            m:
              procedure.components.m === false
                ? ("notRequired" as const)
                : ("required" as const),
          },
        }),
    groups: nonEmptyRuntimeValues(groups),
    resourceRefs: [],
  });
}

function runtimeSpellcastingInvocations(
  spells: ReadonlyNonEmptyArray<StatBlockSpellReference>,
): ReadonlyNonEmptyArray<
  Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "spellcasting" }
  >["groups"][number]["invocations"][number]
> {
  return nonEmptyRuntimeValues(
    spells.map((spell) =>
      spell.restriction === undefined
        ? { kind: "unrestricted" as const }
        : { kind: "restricted" as const },
    ),
  );
}

function spellcastingExecutionFailedFacts(
  section: StatBlockActionProjectionSection,
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  return section === "actions" || section === "bonusActions"
    ? ["runtimeProcedureBindingRejected"]
    : ["unsupportedSection"];
}

function presentationProjection(
  record: StatBlockRecord,
  admitted: readonly AdmittedStatBlockProcedureProjection[],
): BattleStatBlockPresentationSource {
  return {
    displayName: record.name,
    communication: record.statBlock.communication,
    traits: authoredTraitPresentations(record.statBlock.traits ?? []),
    orderedProcedures: admitted.map(({ presentation }) => presentation),
  };
}

function authoredTraitPresentations(
  traits: readonly NonNullable<StandaloneStatBlock["traits"]>[number][],
): readonly BattleStatBlockAuthoredTraitPresentation[] {
  return traits.map((trait) => ({
    name: trait.name,
    description: trait.description,
    ...(trait.effect === undefined ? {} : { effect: trait.effect }),
  }));
}

function textOnlyProcedurePresentation(
  section: StatBlockActionProjectionSection,
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "textOnly" }>,
): Extract<
  BattleStatBlockAuthoredProcedurePresentation,
  { readonly kind: "textOnly" }
> {
  return {
    ...procedurePresentationBase(section, entry, entry.name),
    description: entry.description,
    kind: "textOnly",
    reason: entry.reason,
  };
}

function attackProcedurePresentation(
  section: StatBlockActionProjectionSection,
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<typeof entry.procedure, { readonly kind: "attack_roll" }>,
): Extract<
  BattleStatBlockAuthoredProcedurePresentation,
  { readonly kind: "attack" }
> {
  return {
    ...procedurePresentationBase(section, entry, procedure.name),
    kind: "attack",
  };
}

function multiattackProcedurePresentation(
  section: StatBlockActionProjectionSection,
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<typeof entry.procedure, { readonly kind: "multiattack" }>,
): Extract<
  BattleStatBlockAuthoredProcedurePresentation,
  { readonly kind: "multiattack" }
> {
  return {
    ...procedurePresentationBase(section, entry, procedure.name),
    kind: "multiattack",
  };
}

function bonusActionProcedurePresentation(
  section: StatBlockActionProjectionSection,
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<
    typeof entry.procedure,
    { readonly kind: "action_option" }
  >,
): Extract<
  BattleStatBlockAuthoredProcedurePresentation,
  { readonly kind: "bonusActionOption" }
> {
  return {
    ...procedurePresentationBase(section, entry, procedure.name),
    kind: "bonusActionOption",
  };
}

function spellcastingProcedurePresentation(
  section: StatBlockActionProjectionSection,
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<typeof entry.procedure, { readonly kind: "spellcasting" }>,
): Extract<
  BattleStatBlockAuthoredProcedurePresentation,
  { readonly kind: "spellcasting" }
> {
  return {
    ...procedurePresentationBase(section, entry, procedure.name),
    kind: "spellcasting",
  };
}

function procedurePresentationBase(
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedureEntry,
  name: string,
): Pick<
  BattleStatBlockAuthoredProcedurePresentation,
  "section" | "procedureOrdinal" | "name" | "resourceRefs"
> {
  return {
    section,
    procedureOrdinal: entry.procedureOrdinal,
    name,
    resourceRefs: procedureResourceRefs(entry),
  };
}

type AuthoredAttackProcedure = Extract<
  Extract<
    StatBlockProcedureEntry,
    { readonly kind: "executable" }
  >["procedure"],
  { readonly kind: "attack_roll" }
>;

function authoredAttackMechanics(procedure: AuthoredAttackProcedure) {
  const { kind: _kind, name: _name, ...attack } = procedure;
  return attack;
}

type AuthoredAttackMechanics = ReturnType<typeof authoredAttackMechanics>;

/**
 * Authored timed conditions retain their explicit turn owner but are not yet
 * an executable battle effect. Exhaustive matching prevents a future authored
 * effect kind from entering the older creature-attack projection implicitly.
 */
function authoredAttackMechanicsAreSupported(
  attack: AuthoredAttackMechanics,
): attack is AuthoredAttackMechanics & SupportedCreatureAttackRollMechanics {
  return (
    authoredAttackEffectsAreSupported(attack) &&
    creatureAttackRollMechanicsAreSupported(attack)
  );
}

function authoredAttackEffectsAreSupported(
  attack: AuthoredAttackMechanics,
): boolean {
  return attack.onHit.every((effect) =>
    Match.value(effect).pipe(
      Match.discriminatorsExhaustive("kind")({
        apply_condition: () => false,
        apply_condition_if_target_size_at_most: () => true,
        conditional_bonus_damage: () => true,
        damage: () => true,
      }),
    ),
  );
}

function procedureResourceRefs(
  entry: StatBlockProcedureEntry,
): readonly StatBlockProcedureResourceOrdinal[] {
  return entry.resourceRefs.kind === "none"
    ? []
    : [...entry.resourceRefs.ordinals];
}

function runtimeResources(
  resources: NonNullable<StandaloneStatBlock["resources"]> | undefined,
): Either.Either<
  readonly BattleStatBlockRuntimeResource[],
  ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>
> {
  if (resources === undefined) return Either.right([]);
  const projected: BattleStatBlockRuntimeResource[] = [];
  const issues: BattleStatBlockInvalidResourceDeclaration[] = [];
  for (const resource of resources) {
    const parsed = parseStatBlockRuntimeResource(resource);
    if (Either.isLeft(parsed)) {
      issues.push({ ordinal: resource.ordinal, reason: parsed.left });
    } else {
      projected.push(parsed.right);
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return Either.left([firstIssue, ...remainingIssues]);
  }
  return Either.right(projected);
}

function isSupportedBonusAction(
  option: StandardActionKind,
): option is SupportedStatBlockBonusActionStandardAction {
  return SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS.some(
    (supportedOption) => supportedOption === option,
  );
}

function traitModes(source: StandaloneStatBlock): {
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
} {
  const modes = supportedStatBlockTraitAttackRollModes(source.traits);
  return modes === undefined ? {} : { traitAttackRollModes: modes };
}

function runtimeSpeed(
  speed: StandaloneCreatureSpeed,
): BattleStatBlockRuntimeSpeed {
  return {
    kind: speed.kind,
    feet: speed.feet,
    ...(speed.kind === "fly" && speed.hover === true ? { hover: true } : {}),
  };
}

function isStandaloneCreatureSpeed(
  speed: StandaloneStatBlockSpeedEntry,
): speed is StandaloneCreatureSpeed {
  return Match.value(speed).pipe(
    Match.when({ kind: "gm_choice" }, () => false),
    Match.when({ kind: "walk" }, () => true),
    Match.when({ kind: "burrow" }, () => true),
    Match.when({ kind: "climb" }, () => true),
    Match.when({ kind: "fly" }, () => true),
    Match.when({ kind: "swim" }, () => true),
    Match.exhaustive,
  );
}

function runtimeSense(
  sense: NonNullable<StandaloneStatBlock["senses"]>[number],
): BattleStatBlockRuntimeSense {
  return {
    kind: sense.kind,
    rangeFeet: PositiveInteger(sense.rangeFeet),
    ...(sense.kind === "darkvision" && sense.qualifier !== undefined
      ? { qualifier: sense.qualifier }
      : {}),
  };
}

function literalSize(size: StandaloneStatBlock["size"]): Size | null {
  return typeof size === "string" ? size : null;
}

function authoredLegendaryActionUses(
  uses:
    | NonNullable<StandaloneStatBlock["legendaryActions"]>["uses"]
    | undefined,
): Either.Either<
  BattleStatBlockExecutionSource["legendaryActionUses"],
  BattleStatBlockProjectionFailure
> {
  if (uses === undefined) return Either.right(undefined);
  return Match.value(uses).pipe(
    Match.when({ kind: "fixed" }, ({ uses: fixedUses }) =>
      Either.right(PositiveInteger(fixedUses)),
    ),
    Match.when({ kind: "lair_bonus" }, () =>
      Either.left(failure("unsupportedLairConditionalLegendaryActionUses")),
    ),
    Match.exhaustive,
  );
}

function nonEmptyRuntimeValues<T>(
  values: readonly (T | null)[],
): ReadonlyNonEmptyArray<T> {
  const present = values.filter((value): value is T => value !== null);
  const [first, ...rest] = present;
  if (first === undefined) {
    throw new Error("Projection requires a non-empty runtime collection.");
  }
  return [first, ...rest];
}

function failure(
  reason: BattleStatBlockProjectionScalarFailureReason,
): BattleStatBlockProjectionFailure {
  return { tag: "battleStatBlockProjectionFailure", reason };
}

function invalidResourceLimitFailure(
  issues: ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>,
): BattleStatBlockProjectionFailure {
  return {
    tag: "battleStatBlockProjectionFailure",
    reason: "invalidResourceLimit",
    issues,
  };
}

function procedureBindingIssue(
  section: StatBlockActionProjectionSection,
  procedureOrdinal: StatBlockProcedureOrdinal,
): BattleStatBlockUnsupportedProcedureBinding {
  return { section, procedureOrdinal };
}

function unsupportedProcedureBindingFailure(
  issues: ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>,
): BattleStatBlockProjectionFailure {
  return {
    tag: "battleStatBlockProjectionFailure",
    reason: "unsupportedProcedureBinding",
    issues,
  };
}
