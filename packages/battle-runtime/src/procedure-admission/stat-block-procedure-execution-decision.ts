// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELLCASTING-PROCEDURE-001 RAW-STAT-BLOCK-ATTACK-PROCEDURE-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spellcasting.procedure stat-block.attack-procedure
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELLCASTING_PROCEDURE BATTLE.STAT_BLOCK.ATTACK_PROCEDURE
// This module owns the authored-to-execution support relation used by both
// static mechanics admission and the runtime projection boundary. It has no
// presentation dependency.
import * as Result from "effect/Result";
import { Match } from "effect";

import { Integer, PositiveInteger } from "@dnd/shared/types";
import type { ReadonlyNonEmptyArray } from "@dnd/shared/types";
import type { StandardActionKind } from "@dnd/shared/game-facts";
import type {
  StatBlockProcedureEntry,
  StatBlockProcedureOrdinal,
  StatBlockProcedureResourceOrdinal,
  StatBlockSpellReference,
  StandaloneStatBlock,
} from "@dnd/surface/surface/types";

import { supportedStatBlockTraitAttackRollModes } from "../statblock-action-execution-support.ts";
import { statBlockAttackMechanicsSupport } from "../statblock-attack-execution-mechanics.ts";
import {
  SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS,
  type SupportedStatBlockBonusActionStandardAction,
} from "../battle-reducer/battle-runtime-protocol.ts";
import type {
  BattleStatBlockRuntimeMultiattackDispatch,
  BattleStatBlockRuntimeProcedure,
  BattleStatBlockUnsupportedProcedureBinding,
} from "../stat-block-execution-state.ts";
import { parseStatBlockPositiveIntegerLiteral } from "../stat-block-execution-state.ts";
import type { StatBlockProcedureSection } from "../procedure-execution/stat-block-procedure-sections.ts";
import type {
  StatBlockTraitAttackRollMode,
  SupportedCreatureAttackRollMechanics,
} from "../battle-action-options.ts";
import { optionalProperty } from "../optional-property.ts";
import { mapReadonlyNonEmptyArray } from "../readonly-non-empty-array.ts";

export type { BattleStatBlockUnsupportedProcedureBinding } from "../stat-block-execution-state.ts";

export function procedureBindingIssue(
  section: StatBlockProcedureSection,
  procedureOrdinal: StatBlockProcedureOrdinal,
): BattleStatBlockUnsupportedProcedureBinding {
  return { section, procedureOrdinal };
}

export type AuthoredExecutableProcedureEntry = Extract<
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

export function supportedStatBlockAttackOrdinals(
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

/**
 * Decide one authored procedure against the support predicates consumed by
 * runtime projection. The result is pure and retains failed structural facts
 * so planning evidence can count pressure without dispatching on identity.
 */
export function authoredStatBlockProcedureExecutionDecision(
  source: StandaloneStatBlock,
  section: StatBlockProcedureSection,
  entry: StatBlockProcedureEntry,
  supportedActionAttackOrdinals: ReadonlySet<StatBlockProcedureOrdinal> = supportedStatBlockAttackOrdinals(
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
      return Result.isSuccess(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "attack_roll" as const,
            entry: narrowedEntry,
            runtime: runtime.success,
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
          : Result.fail(procedureBindingIssue(section, entry.procedureOrdinal));
      return Result.isSuccess(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "multiattack" as const,
            entry: narrowedEntry,
            runtime: runtime.success,
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
          : Result.fail(procedureBindingIssue(section, entry.procedureOrdinal));
      return Result.isSuccess(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "action_option" as const,
            entry: narrowedEntry,
            runtime: runtime.success,
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
      return Result.isSuccess(runtime)
        ? {
            kind: "executable" as const,
            procedureKind: "spellcasting" as const,
            entry: narrowedEntry,
            runtime: runtime.success,
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
  section: StatBlockProcedureSection,
  procedure: AuthoredExecutableProcedureEntryByKind<"attack_roll">["procedure"],
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  const failedFacts: StatBlockProcedureExecutionFailedFact[] = [];
  if (section !== "actions" && section !== "legendaryActions") {
    failedFacts.push("unsupportedSection");
  }
  const support = statBlockAttackMechanicsSupport(
    authoredAttackMechanics(procedure),
  );
  if (support.kind === "unsupported") {
    if (support.issues.some((issue) => issue.kind === "unsupportedEffect")) {
      failedFacts.push("unsupportedAttackEffect");
    }
    if (support.issues.some((issue) => issue.kind === "unsupportedMechanics")) {
      failedFacts.push("unsupportedAttackMechanics");
    }
  }
  return nonEmptyFailedFacts(failedFacts);
}

function multiattackExecutionFailedFacts(
  section: StatBlockProcedureSection,
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
      Result.isFailure(parseStatBlockPositiveIntegerLiteral(count)),
    )
  ) {
    failedFacts.push("invalidMultiattackCount");
  }
  return nonEmptyFailedFacts(failedFacts);
}

function actionOptionExecutionFailedFacts(
  section: StatBlockProcedureSection,
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
  section: StatBlockProcedureSection,
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<typeof entry.procedure, { readonly kind: "attack_roll" }>,
): Result.Result<
  Extract<BattleStatBlockRuntimeProcedure, { readonly kind: "attack" }>,
  BattleStatBlockUnsupportedProcedureBinding
> {
  const attack = authoredAttackMechanics(procedure);
  if (
    (section !== "actions" && section !== "legendaryActions") ||
    !authoredAttackMechanicsAreSupported(attack)
  ) {
    return Result.fail(procedureBindingIssue(section, entry.procedureOrdinal));
  }
  return Result.succeed({
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
): Result.Result<
  Extract<BattleStatBlockRuntimeProcedure, { readonly kind: "multiattack" }>,
  BattleStatBlockUnsupportedProcedureBinding
> {
  if (
    !procedure.dispatches.every(({ procedureOrdinal }) =>
      supportedActionAttackOrdinals.has(procedureOrdinal),
    )
  ) {
    return Result.fail(
      procedureBindingIssue("actions", entry.procedureOrdinal),
    );
  }
  const [firstAuthoredDispatch, ...remainingAuthoredDispatches] =
    procedure.dispatches;
  const firstDispatch = runtimeMultiattackDispatch(firstAuthoredDispatch);
  if (Result.isFailure(firstDispatch)) {
    return Result.fail(
      procedureBindingIssue("actions", entry.procedureOrdinal),
    );
  }
  const dispatches: [
    BattleStatBlockRuntimeMultiattackDispatch,
    ...BattleStatBlockRuntimeMultiattackDispatch[],
  ] = [firstDispatch.success];
  for (const dispatch of remainingAuthoredDispatches) {
    const runtimeDispatch = runtimeMultiattackDispatch(dispatch);
    if (Result.isFailure(runtimeDispatch)) {
      return Result.fail(
        procedureBindingIssue("actions", entry.procedureOrdinal),
      );
    }
    dispatches.push(runtimeDispatch.success);
  }
  return Result.succeed({
    kind: "multiattack",
    section: "actions",
    procedureOrdinal: entry.procedureOrdinal,
    dispatches,
    resourceRefs: procedureResourceRefs(entry),
  });
}

function runtimeMultiattackDispatch(
  dispatch: AuthoredExecutableProcedureEntryByKind<"multiattack">["procedure"]["dispatches"][number],
): Result.Result<BattleStatBlockRuntimeMultiattackDispatch, "invalidCount"> {
  const count = parseStatBlockPositiveIntegerLiteral(dispatch.count);
  if (Result.isFailure(count)) {
    return Result.fail("invalidCount");
  }
  return Result.succeed({
    procedureOrdinal: dispatch.procedureOrdinal,
    count: count.success.value,
  });
}

function runtimeBonusActionBinding(
  entry: AuthoredExecutableProcedureEntry,
  procedure: Extract<
    typeof entry.procedure,
    { readonly kind: "action_option" }
  >,
): Result.Result<
  Extract<
    BattleStatBlockRuntimeProcedure,
    { readonly kind: "bonusActionOption" }
  >,
  BattleStatBlockUnsupportedProcedureBinding
> {
  return areSupportedBonusActions(procedure.options)
    ? Result.succeed({
        kind: "bonusActionOption",
        section: "bonusActions",
        procedureOrdinal: entry.procedureOrdinal,
        standardActions: procedure.options,
        resourceRefs: procedureResourceRefs(entry),
      })
    : Result.fail(
        procedureBindingIssue("bonusActions", entry.procedureOrdinal),
      );
}

function runtimeSpellcastingBinding(
  section: StatBlockProcedureSection,
  entry: AuthoredExecutableProcedureEntryByKind<"spellcasting">,
  procedure: AuthoredExecutableProcedureEntryByKind<"spellcasting">["procedure"],
): Result.Result<
  Extract<BattleStatBlockRuntimeProcedure, { readonly kind: "spellcasting" }>,
  BattleStatBlockUnsupportedProcedureBinding
> {
  if (section !== "actions" && section !== "bonusActions") {
    return Result.fail(procedureBindingIssue(section, entry.procedureOrdinal));
  }
  const groups = mapReadonlyNonEmptyArray(procedure.groups, (group) =>
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
  return Result.succeed({
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
    groups,
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
  return mapReadonlyNonEmptyArray(spells, (spell) =>
    spell.restriction === undefined
      ? { kind: "unrestricted" as const }
      : { kind: "restricted" as const },
  );
}

function spellcastingExecutionFailedFacts(
  section: StatBlockProcedureSection,
): ReadonlyNonEmptyArray<StatBlockProcedureExecutionFailedFact> {
  return section === "actions" || section === "bonusActions"
    ? ["runtimeProcedureBindingRejected"]
    : ["unsupportedSection"];
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

function authoredAttackMechanicsAreSupported(
  attack: AuthoredAttackMechanics,
): attack is AuthoredAttackMechanics & SupportedCreatureAttackRollMechanics {
  return statBlockAttackMechanicsSupport(attack).kind === "supported";
}

export function procedureResourceRefs(
  entry: StatBlockProcedureEntry,
): readonly StatBlockProcedureResourceOrdinal[] {
  return entry.resourceRefs.kind === "none"
    ? []
    : [...entry.resourceRefs.ordinals];
}

function isSupportedBonusAction(
  option: StandardActionKind,
): option is SupportedStatBlockBonusActionStandardAction {
  return SUPPORTED_STAT_BLOCK_BONUS_ACTION_STANDARD_ACTIONS.some(
    (supportedOption) => supportedOption === option,
  );
}

function areSupportedBonusActions(
  options: ReadonlyNonEmptyArray<StandardActionKind>,
): options is ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction> {
  return options.every(isSupportedBonusAction);
}

function traitModes(source: StandaloneStatBlock): {
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
} {
  const modes = supportedStatBlockTraitAttackRollModes(source.traits);
  return modes === undefined ? {} : { traitAttackRollModes: modes };
}
