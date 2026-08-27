// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.ATTACK_CONTROL
import * as Either from "effect/Either";
import { Match } from "effect";
import type { ReadonlyNonEmptyArray, Size } from "@dnd/shared/types";
import type {
  CreatureAttackRollMechanics,
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResourceOrdinal,
  StatBlockRecord,
  StandaloneStatBlock,
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
  parseStatBlockLegendaryActionUses,
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
import type { StatBlockTraitAttackRollMode } from "./battle-action-options.ts";

type BattleStatBlockProjectionScalarFailureReason =
  | "nonLiteralSize"
  | "invalidLegendaryActionUses";

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
      "invalidLegendaryActionUses",
      () =>
        "battle initialization requires positive integer Legendary Action uses",
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
  const size = literalSize(source.size);
  if (size === null) return Either.left(failure("nonLiteralSize"));
  const speeds = source.speeds.map(runtimeSpeed);
  const legendaryActionUses = parseStatBlockLegendaryActionUses(
    source.legendaryActions?.uses,
  );
  if (Either.isLeft(legendaryActionUses)) {
    return Either.left(failure("invalidLegendaryActionUses"));
  }
  const resources = runtimeResources(source.resources);
  if (Either.isLeft(resources)) {
    return Either.left(invalidResourceLimitFailure(resources.left));
  }
  const runtimeProcedures = runtimeProcedureBindings(source);
  if (Either.isLeft(runtimeProcedures)) {
    return Either.left(
      unsupportedProcedureBindingFailure(runtimeProcedures.left),
    );
  }
  const runtime = runtimeProjection(
    record,
    source,
    size,
    nonEmptyRuntimeValues(speeds),
    resources.right,
    runtimeProcedures.right,
    legendaryActionUses.right,
  );
  return Either.right({
    runtime,
    presentation: presentationProjection(record),
  });
}

function runtimeProjection(
  record: StatBlockRecord,
  source: StandaloneStatBlock,
  size: Size,
  speeds: ReadonlyNonEmptyArray<BattleStatBlockRuntimeSpeed>,
  resources: readonly BattleStatBlockRuntimeResource[] | undefined,
  procedures: readonly BattleStatBlockRuntimeProcedure[],
  legendaryActionUses: BattleStatBlockExecutionSource["legendaryActionUses"],
): BattleStatBlockExecutionSource {
  return {
    id: record.id,
    challengeRating: record.challengeRating,
    statBlock: runtimeStatBlockProjection(source, size, speeds),
    procedures,
    ...(resources === undefined ? {} : { resources }),
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
    initiativeModifier: source.initiative.modifier,
    initiativeScore: source.initiative.score,
    passivePerception: source.passivePerception,
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

function runtimeProcedureBindings(
  source: StandaloneStatBlock,
): Either.Either<
  readonly BattleStatBlockRuntimeProcedure[],
  ReadonlyNonEmptyArray<BattleStatBlockUnsupportedProcedureBinding>
> {
  const supportedActionAttackOrdinals = supportedAttackOrdinals(source.actions);
  const procedures: BattleStatBlockRuntimeProcedure[] = [];
  const issues: BattleStatBlockUnsupportedProcedureBinding[] = [];
  for (const { section, entries } of authoredProcedureSections(source)) {
    for (const entry of entries ?? []) {
      const projected = runtimeProcedureBinding(
        source,
        section,
        entry,
        supportedActionAttackOrdinals,
      );
      if (Either.isLeft(projected)) {
        issues.push(projected.left);
      } else {
        procedures.push(...projected.right);
      }
    }
  }
  const [firstIssue, ...remainingIssues] = issues;
  return firstIssue === undefined
    ? Either.right(procedures)
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
      creatureAttackRollMechanicsAreSupported(
        authoredAttackMechanics(entry.procedure),
      )
        ? [entry.procedureOrdinal]
        : [],
    ),
  );
}

function runtimeProcedureBinding(
  source: StandaloneStatBlock,
  section: StatBlockActionProjectionSection,
  entry: StatBlockProcedureEntry,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal>,
): Either.Either<
  readonly BattleStatBlockRuntimeProcedure[],
  BattleStatBlockUnsupportedProcedureBinding
> {
  if (entry.kind !== "executable") return Either.right([]);
  const procedure = entry.procedure;
  return Match.value(procedure).pipe(
    Match.when({ kind: "attack_roll" }, (attack) =>
      runtimeAttackBinding(source, section, entry, attack),
    ),
    Match.when({ kind: "multiattack" }, (multiattack) =>
      section === "actions"
        ? runtimeMultiattackBinding(
            entry,
            multiattack,
            supportedActionAttackOrdinals,
          )
        : Either.left(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.when({ kind: "action_option" }, (actionOption) =>
      section === "bonusActions"
        ? runtimeBonusActionBinding(entry, actionOption)
        : Either.left(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.when({ kind: "save" }, () =>
      Either.left(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.when({ kind: "support" }, () =>
      Either.left(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.when({ kind: "spellcasting" }, () =>
      Either.left(procedureBindingIssue(section, entry.procedureOrdinal)),
    ),
    Match.exhaustive,
  );
}

function runtimeAttackBinding(
  source: StandaloneStatBlock,
  section: StatBlockActionProjectionSection,
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  procedure: Extract<typeof entry.procedure, { readonly kind: "attack_roll" }>,
): Either.Either<
  readonly BattleStatBlockRuntimeProcedure[],
  BattleStatBlockUnsupportedProcedureBinding
> {
  const attack = authoredAttackMechanics(procedure);
  if (
    (section !== "actions" && section !== "legendaryActions") ||
    !creatureAttackRollMechanicsAreSupported(attack)
  )
    return Either.left(procedureBindingIssue(section, entry.procedureOrdinal));
  return Either.right([
    {
      kind: "attack",
      section,
      procedureOrdinal: entry.procedureOrdinal,
      attack,
      resourceRefs: procedureResourceRefs(entry),
      ...traitModes(source),
    },
  ]);
}

function runtimeMultiattackBinding(
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  procedure: Extract<typeof entry.procedure, { readonly kind: "multiattack" }>,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal>,
): Either.Either<
  readonly BattleStatBlockRuntimeProcedure[],
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
  return Either.right([
    {
      kind: "multiattack",
      section: "actions",
      procedureOrdinal: entry.procedureOrdinal,
      dispatches: nonEmptyRuntimeValues(dispatches),
      resourceRefs: procedureResourceRefs(entry),
    },
  ]);
}

function runtimeBonusActionBinding(
  entry: Extract<StatBlockProcedureEntry, { readonly kind: "executable" }>,
  procedure: Extract<
    typeof entry.procedure,
    { readonly kind: "action_option" }
  >,
): Either.Either<
  readonly BattleStatBlockRuntimeProcedure[],
  BattleStatBlockUnsupportedProcedureBinding
> {
  const options = procedure.options.filter(isSupportedBonusAction);
  return options.length === procedure.options.length
    ? Either.right([
        {
          kind: "bonusActionOption",
          section: "bonusActions",
          procedureOrdinal: entry.procedureOrdinal,
          standardActions: nonEmptyRuntimeValues(options),
          resourceRefs: procedureResourceRefs(entry),
        },
      ])
    : Either.left(
        procedureBindingIssue("bonusActions", entry.procedureOrdinal),
      );
}

function presentationProjection(
  record: StatBlockRecord,
): BattleStatBlockPresentationSource {
  return {
    displayName: record.name,
    communication: record.statBlock.communication,
    traits: authoredTraitPresentations(record.statBlock.traits ?? []),
    orderedProcedures: authoredProcedurePresentations(record.statBlock),
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

function authoredProcedurePresentations(
  source: StandaloneStatBlock,
): readonly BattleStatBlockAuthoredProcedurePresentation[] {
  return authoredProcedureSections(source).flatMap(({ section, entries }) =>
    (entries ?? []).map((entry) => {
      if (entry.kind === "textOnly") {
        return {
          section,
          procedureOrdinal: entry.procedureOrdinal,
          name: entry.name,
          description: entry.description,
          kind: "textOnly" as const,
          reason: entry.reason,
          resourceRefs: procedureResourceRefs(entry),
        };
      }
      const procedure = entry.procedure;
      return {
        section,
        procedureOrdinal: entry.procedureOrdinal,
        name: procedure.name,
        ...(!("description" in procedure) || procedure.description === undefined
          ? {}
          : { description: procedure.description }),
        kind: runtimePresentationKind(procedure.kind),
        resourceRefs: procedureResourceRefs(entry),
      };
    }),
  );
}

function authoredAttackMechanics(
  procedure: Extract<
    Extract<
      StatBlockProcedureEntry,
      { readonly kind: "executable" }
    >["procedure"],
    { readonly kind: "attack_roll" }
  >,
): CreatureAttackRollMechanics {
  const {
    kind: _kind,
    name: _name,
    description: _description,
    ...attack
  } = procedure;
  return attack;
}

function procedureResourceRefs(
  entry: StatBlockProcedureEntry,
): readonly StatBlockProcedureResourceOrdinal[] {
  const refs =
    entry.resourceRefs.kind === "none" ? [] : [...entry.resourceRefs.ordinals];
  if (entry.kind === "executable" && entry.procedure.kind === "spellcasting") {
    return [
      ...refs,
      ...entry.procedure.groups.flatMap((group) =>
        group.resourceRefs.kind === "none" ? [] : group.resourceRefs.ordinals,
      ),
    ];
  }
  return refs;
}

function runtimeResources(
  resources: NonNullable<StandaloneStatBlock["resources"]> | undefined,
): Either.Either<
  readonly BattleStatBlockRuntimeResource[] | undefined,
  ReadonlyNonEmptyArray<BattleStatBlockInvalidResourceDeclaration>
> {
  if (resources === undefined) return Either.right(undefined);
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

function runtimePresentationKind(
  kind: Extract<
    StatBlockProcedureEntry,
    { readonly kind: "executable" }
  >["procedure"]["kind"],
): Exclude<BattleStatBlockAuthoredProcedurePresentation["kind"], "textOnly"> {
  return Match.value(kind).pipe(
    Match.when("attack_roll", () => "attack" as const),
    Match.when("multiattack", () => "multiattack" as const),
    Match.when("action_option", () => "bonusActionOption" as const),
    Match.when("save", () => "save" as const),
    Match.when("support", () => "support" as const),
    Match.when("spellcasting", () => "spellcasting" as const),
    Match.exhaustive,
  );
}

function isSupportedBonusAction(
  option: string,
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
  speed: StandaloneStatBlock["speeds"][number],
): BattleStatBlockRuntimeSpeed {
  return {
    kind: speed.kind,
    feet: speed.feet,
    ...(speed.kind === "fly" && speed.hover === true ? { hover: true } : {}),
  };
}

function runtimeSense(
  sense: NonNullable<StandaloneStatBlock["senses"]>[number],
): BattleStatBlockRuntimeSense {
  return {
    kind: sense.kind,
    rangeFeet: sense.rangeFeet,
    ...(sense.kind === "darkvision" && sense.qualifier !== undefined
      ? { qualifier: sense.qualifier }
      : {}),
  };
}

function literalSize(size: StandaloneStatBlock["size"]): Size | null {
  return typeof size === "string" ? size : null;
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
