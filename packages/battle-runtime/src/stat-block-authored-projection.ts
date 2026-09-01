// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spellcasting.procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE
import * as Result from "effect/Result";
import { Match } from "effect";
import {
  Integer,
  NonNegativeInteger,
  PositiveInteger,
} from "@dnd/shared/types";
import type { ReadonlyNonEmptyArray, Size } from "@dnd/shared/types";
import type {
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockRecord,
  StandaloneCreatureSpeed,
  StandaloneStatBlock,
  StandaloneStatBlockSpeedEntry,
} from "@dnd/surface/surface/stat-block-types";
import type {
  BattleStatBlockAuthoredProcedurePresentation,
  BattleStatBlockAuthoredTraitPresentation,
  BattleStatBlockPresentationSource,
} from "./battle-runtime-context.ts";
import {
  parseStatBlockRuntimeResource,
  type BattleStatBlockExecutionSource,
  type BattleStatBlockRuntimeProcedure,
  type BattleStatBlockRuntimeResource,
  type BattleStatBlockRuntimeSpeed,
  type BattleStatBlockRuntimeSense,
} from "./stat-block-execution-state.ts";
import type { StatBlockActionProjectionSection } from "./stat-block-presentation-contract.ts";
import {
  authoredStatBlockProcedureExecutionDecision,
  procedureBindingIssue,
  procedureResourceRefs,
  supportedStatBlockAttackOrdinals,
  type AuthoredExecutableProcedureEntry,
} from "./procedure-admission/stat-block-procedure-execution-decision.ts";
import { mapReadonlyNonEmptyArray } from "./readonly-non-empty-array.ts";
import type {
  BattleStatBlockInvalidResourceDeclaration,
  BattleStatBlockProjectionFailure,
  BattleStatBlockProjectionScalarFailureReason,
  BattleStatBlockUnsupportedProcedureBinding,
} from "./stat-block-projection-failure.ts";

export type AuthoredStatBlockProjection = {
  readonly runtime: BattleStatBlockExecutionSource;
  readonly presentation: BattleStatBlockPresentationSource;
};

/**
 * The catalog admission boundary. The authored record is consumed once;
 * execution receives only literal mechanics and ordinal bindings while the
 * presentation companion retains source identity and exact prose.
 */
export function projectAuthoredStatBlock(
  record: StatBlockRecord,
): Result.Result<
  AuthoredStatBlockProjection,
  BattleStatBlockProjectionFailure
> {
  const source = record.statBlock;
  const scalarProjection = authoredStatBlockScalarProjection(source);
  if (Result.isFailure(scalarProjection)) {
    return Result.fail(scalarProjection.failure);
  }
  const resources = runtimeResources(source.resources);
  if (Result.isFailure(resources)) {
    return Result.fail(invalidResourceLimitFailure(resources.failure));
  }
  const admittedProcedures = admittedProcedureProjections(source);
  if (Result.isFailure(admittedProcedures)) {
    return Result.fail(
      unsupportedProcedureBindingFailure(admittedProcedures.failure),
    );
  }
  const admitted = admittedProcedures.success;
  const runtime = runtimeProjection(
    record,
    source,
    scalarProjection.success.size,
    scalarProjection.success.speeds,
    resources.success,
    admitted.flatMap((projection) =>
      projection.kind === "executable" ? [projection.runtime] : [],
    ),
    scalarProjection.success.legendaryActionUses,
  );
  return Result.succeed({
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
): Result.Result<
  AuthoredStatBlockScalarProjection,
  BattleStatBlockProjectionFailure
> {
  const size = literalSize(source.size);
  if (size === null) return Result.fail(failure("nonLiteralSize"));
  if (!areStandaloneCreatureSpeeds(source.speeds)) {
    return Result.fail(failure("unresolvedGmSpeedChoice"));
  }
  const concreteSpeeds = source.speeds;
  if (concreteSpeeds.some((speed) => "availability" in speed)) {
    return Result.fail(failure("unsupportedFormRestrictedSpeed"));
  }
  if (
    source.immunities !== undefined &&
    "qualifiedConditions" in source.immunities
  ) {
    return Result.fail(failure("unsupportedQualifiedConditionImmunity"));
  }
  const legendaryActionUses = authoredLegendaryActionUses(
    source.legendaryActions?.uses,
  );
  if (Result.isFailure(legendaryActionUses)) {
    return Result.fail(legendaryActionUses.failure);
  }
  return Result.succeed({
    size,
    speeds: mapReadonlyNonEmptyArray(concreteSpeeds, runtimeSpeed),
    legendaryActionUses: legendaryActionUses.success,
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
): Result.Result<
  AuthoredStatBlockProjection,
  BattleStatBlockProjectionFailure
> {
  const projected = projectAuthoredStatBlock(record);
  if (Result.isFailure(projected)) return projected;
  return Result.succeed({
    runtime: {
      ...projected.success.runtime,
      statBlock: {
        ...projected.success.runtime.statBlock,
        creatureType,
      },
    },
    presentation: projected.success.presentation,
  });
}

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
): Result.Result<
  readonly AdmittedStatBlockProcedureProjection[],
  ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>
> {
  const supportedActionAttackOrdinals = supportedStatBlockAttackOrdinals(
    source.actions,
  );
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
      if (Result.isFailure(projected)) {
        issues.push(projected.failure);
      } else {
        projections.push(projected.success);
      }
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Result.succeed(projections)
    : Result.fail([firstIssue, ...remainingIssues]);
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

function admittedProcedureProjection(
  source: StandaloneStatBlock,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedureEntry,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal>,
): Result.Result<
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
      Result.succeed({
        kind: "textOnly" as const,
        presentation: textOnlyProcedurePresentation(section, textOnlyEntry),
      }),
    ),
    Match.when({ kind: "missingOwner" }, () =>
      Result.fail(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.when(
      { kind: "executable", procedureKind: "attack_roll" },
      ({ entry: executableEntry, runtime }) =>
        Result.succeed({
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
        Result.succeed({
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
        Result.succeed({
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
        Result.succeed({
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

function runtimeResources(
  resources: NonNullable<StandaloneStatBlock["resources"]> | undefined,
): Result.Result<
  readonly BattleStatBlockRuntimeResource[],
  ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>
> {
  if (resources === undefined) return Result.succeed([]);
  const projected: BattleStatBlockRuntimeResource[] = [];
  const issues: BattleStatBlockInvalidResourceDeclaration[] = [];
  for (const resource of resources) {
    const parsed = parseStatBlockRuntimeResource(resource);
    if (Result.isFailure(parsed)) {
      issues.push({ ordinal: resource.ordinal, reason: parsed.failure });
    } else {
      projected.push(parsed.success);
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  if (firstIssue !== undefined) {
    return Result.fail([firstIssue, ...remainingIssues]);
  }
  return Result.succeed(projected);
}

function runtimeSpeed(
  speed: StandaloneCreatureSpeed,
): BattleStatBlockRuntimeSpeed {
  return {
    kind: speed.kind,
    feet: speed.feet,
    ...(speed.kind === "fly" && "hover" in speed && speed.hover === true
      ? { hover: true }
      : {}),
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

function areStandaloneCreatureSpeeds(
  speeds: ReadonlyNonEmptyArray<StandaloneStatBlockSpeedEntry>,
): speeds is ReadonlyNonEmptyArray<StandaloneCreatureSpeed> {
  return speeds.every(isStandaloneCreatureSpeed);
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
): Result.Result<
  BattleStatBlockExecutionSource["legendaryActionUses"],
  BattleStatBlockProjectionFailure
> {
  if (uses === undefined) return Result.succeed(undefined);
  return Match.value(uses).pipe(
    Match.when({ kind: "fixed" }, ({ uses: fixedUses }) =>
      Result.succeed(PositiveInteger(fixedUses)),
    ),
    Match.when({ kind: "lair_bonus" }, () =>
      Result.fail(failure("unsupportedLairConditionalLegendaryActionUses")),
    ),
    Match.exhaustive,
  );
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

function unsupportedProcedureBindingFailure(
  issues: ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>,
): BattleStatBlockProjectionFailure {
  return {
    tag: "battleStatBlockProjectionFailure",
    reason: "unsupportedProcedureBinding",
    issues,
  };
}
