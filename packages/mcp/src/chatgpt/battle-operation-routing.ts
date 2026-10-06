import type {
  BattleState,
  BattleSubject,
  BattleInterruptDecision,
} from "@dnd/battle-runtime";
import { Match, Result } from "effect";
import { characterSpellProcedure } from "@dnd/battle-runtime";
import { errorContent } from "../tool-content.ts";
import type { ToolError } from "../schema-codec.ts";
import type { ChatGptExposure } from "./operation-exposure.ts";
import { CHATGPT_OPERATION_EXPOSURE } from "./operation-tool-plan.ts";

type ToolExposure = Extract<ChatGptExposure, { readonly kind: "tools" }>;
type Accounting = typeof CHATGPT_OPERATION_EXPOSURE;
type Values<Table> = Table[keyof Table];
type RefinementChildren<
  Exposure,
  Family extends keyof Accounting,
> = Exposure extends {
  readonly kind: "refineOperations";
  readonly operations: readonly (infer Operation)[];
}
  ? Accounting[Family][Extract<Operation, keyof Accounting[Family]>]
  : Values<Accounting[Family]>;
type ReachableExposure<Exposure, Seen = never> = Exposure extends {
  readonly kind: "refine" | "refineOperations";
  readonly family: infer Family extends keyof Accounting;
}
  ?
      | Exposure
      | (Family extends Seen
          ? never
          : ReachableExposure<
              RefinementChildren<Exposure, Family>,
              Seen | Family
            >)
  : Exposure;
type SubjectExposure = ReachableExposure<Values<Accounting["battleSubjects"]>>;
type SubjectRefinementFamily = Extract<
  SubjectExposure,
  { readonly kind: "refine" }
>["family"];

function hasKey<T extends object>(
  object: T,
  key: string,
): key is Extract<keyof T, string> {
  return Object.hasOwn(object, key);
}

function exposureAt<T extends Readonly<Record<string, ChatGptExposure>>>(
  table: T,
  key: string,
): Result.Result<T[Extract<keyof T, string>], ToolError> {
  return hasKey(table, key)
    ? Result.succeed(table[key])
    : Result.fail(
        errorContent("Execution operation has no ChatGPT route.", {
          code: "CHATGPT_OPERATION_NOT_EXPOSED",
          operation: key,
        }),
      );
}

export function battleSubjectOperationKey(subject: BattleSubject): string {
  const base =
    "command" in subject
      ? `${subject.tag}.${subject.command}`
      : "action" in subject
        ? `${subject.tag}.${subject.action}`
        : "option" in subject
          ? `${subject.tag}.${subject.option}`
          : subject.tag;
  return "mode" in subject
    ? `${base}.${typeof subject.mode === "string" ? subject.mode : subject.mode.tag}`
    : base;
}

export function chatGptBattleSubjectExposure(
  state: BattleState,
  subject: BattleSubject,
): Result.Result<ToolExposure, ToolError> {
  const initial = exposureAt(
    CHATGPT_OPERATION_EXPOSURE.battleSubjects,
    battleSubjectOperationKey(subject),
  );
  if (Result.isFailure(initial)) return Result.fail(initial.failure);
  return finishExposure(state, subject, initial.success);
}

function finishExposure(
  state: BattleState,
  subject: BattleSubject,
  exposure: SubjectExposure | ToolExposure,
): Result.Result<ToolExposure, ToolError> {
  return Match.value(exposure).pipe(
    Match.when({ kind: "tools" }, (route) => Result.succeed(route)),
    Match.when({ kind: "refine" }, ({ family }) => {
      const refined = refineSubject(state, subject, family);
      return Result.isFailure(refined)
        ? Result.fail(refined.failure)
        : finishExposure(state, subject, refined.success);
    }),
    Match.when({ kind: "refineOperations" }, (route) =>
      Match.value(route).pipe(
        Match.when({ family: "procedureBindings" }, ({ operations }) => {
          if (subject.tag !== "unitFeature") return unexposedSubject(subject);
          const actor = state.combatants.get(subject.actorId);
          if (actor?.origin.kind !== "character")
            return unexposedSubject(subject);
          const binding = actor.origin.execution.procedureBindings.find(
            (candidate) => candidate.procedureRef === subject.procedureRef,
          );
          if (binding === undefined) return unexposedSubject(subject);
          const operation = operations.find(
            (kind) => kind === binding.procedure.kind,
          );
          if (operation === undefined) return unexposedSubject(subject);
          return finishExposure(
            state,
            subject,
            CHATGPT_OPERATION_EXPOSURE.procedureBindings[operation],
          );
        }),
        Match.exhaustive,
      ),
    ),
    Match.when({ kind: "boundContinuation" }, () => unexposedSubject(subject)),
    Match.when({ kind: "internal" }, () => unexposedSubject(subject)),
    Match.exhaustive,
  );
}

function unexposedSubject(
  subject: BattleSubject,
): Result.Result<never, ToolError> {
  return Result.fail(
    errorContent("The selected execution has no callable ChatGPT operation.", {
      code: "CHATGPT_OPERATION_NOT_EXPOSED",
      subject,
    }),
  );
}

function refineSubject(
  state: BattleState,
  subject: BattleSubject,
  family: SubjectRefinementFamily,
): Result.Result<SubjectExposure, ToolError> {
  return Match.value(family).pipe(
    Match.when("readiedActionSubjects", () =>
      readiedActionExposure(state, subject),
    ),
    Match.when("statBlockBonusActions", () =>
      statBlockBonusActionExposure(subject),
    ),
    Match.when("spellOperations", () => spellOperationExposure(state, subject)),
    Match.when("unitFeatureProcedures", () =>
      unitFeatureProcedureExposure(state, subject),
    ),
    Match.when("unitSupportProcedures", () =>
      unitSupportProcedureExposure(state, subject),
    ),
    Match.exhaustive,
  );
}

function readiedActionExposure(state: BattleState, subject: BattleSubject) {
  if (
    subject.tag !== "runtimeCommand" ||
    subject.command !== "releaseReadiedAction"
  )
    return unexposedSubject(subject);
  const response = state.readiedResponses.get(subject.reactorId)?.response;
  return response?.kind === "action"
    ? exposureAt(
        CHATGPT_OPERATION_EXPOSURE.readiedActionSubjects,
        battleSubjectOperationKey(response.subject),
      )
    : unexposedSubject(subject);
}

function statBlockBonusActionExposure(subject: BattleSubject) {
  return subject.tag === "bonusAction" &&
    subject.action === "statBlockActionOption"
    ? exposureAt(
        CHATGPT_OPERATION_EXPOSURE.statBlockBonusActions,
        subject.standardAction,
      )
    : unexposedSubject(subject);
}

type SpellInvocation = NonNullable<ReturnType<typeof characterSpellProcedure>>;

function spellInvocationOperationKey(invocation: SpellInvocation): string {
  const base =
    "operation" in invocation
      ? `${invocation.procedure}.${invocation.operation}`
      : "action" in invocation
        ? `${invocation.procedure}.${invocation.action}`
        : invocation.procedure;
  return "castingTime" in invocation
    ? `${base}.${invocation.castingTime.kind}`
    : base;
}

function spellOperationExposure(state: BattleState, subject: BattleSubject) {
  if (!(subject.tag === "actionSpell" || subject.tag === "bonusActionSpell"))
    return unexposedSubject(subject);
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return unexposedSubject(subject);
  const invocation = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  return invocation === undefined
    ? unexposedSubject(subject)
    : exposureAt(
        CHATGPT_OPERATION_EXPOSURE.spellOperations,
        spellInvocationOperationKey(invocation),
      );
}

function unitFeatureProcedureExposure(
  state: BattleState,
  subject: BattleSubject,
) {
  if (subject.tag !== "unitFeature") return unexposedSubject(subject);
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return unexposedSubject(subject);
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === subject.procedureRef,
  );
  return binding?.procedure.kind === "unitFeature"
    ? exposureAt(
        CHATGPT_OPERATION_EXPOSURE.unitFeatureProcedures,
        binding.procedure.execution.kind,
      )
    : unexposedSubject(subject);
}

function unitSupportProcedureExposure(
  state: BattleState,
  subject: BattleSubject,
) {
  if (subject.tag !== "unitFeature") return unexposedSubject(subject);
  const actor = state.combatants.get(subject.actorId);
  if (actor?.origin.kind !== "character") return unexposedSubject(subject);
  const binding = actor.origin.execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === subject.procedureRef,
  );
  if (binding?.procedure.kind !== "unitSupportProfile")
    return unexposedSubject(subject);
  const execution = binding.procedure.execution;
  return exposureAt(
    CHATGPT_OPERATION_EXPOSURE.unitSupportProcedures,
    typeof execution === "string" ? execution : execution.kind,
  );
}

export function chatGptInterruptDecisionExposure(
  state: BattleState,
  subject: BattleSubject,
  decision: BattleInterruptDecision,
): Result.Result<ToolExposure, ToolError> {
  if (decision.kind === "decline")
    return Result.succeed(
      CHATGPT_OPERATION_EXPOSURE.interruptDecisions.decline,
    );
  const choice = decision.choice;
  if (choice.kind === "releaseReadiedAction") {
    const response = state.readiedResponses.get(decision.responderId)?.response;
    return response?.kind === "action"
      ? chatGptBattleSubjectExposure(state, response.subject)
      : unexposedSubject(subject);
  }
  if (choice.kind === "reactionRollOrDamageReduction") {
    return Result.succeed(
      CHATGPT_OPERATION_EXPOSURE.reactionModifiers[choice.modifierKind],
    );
  }
  const exposure = CHATGPT_OPERATION_EXPOSURE.interruptSelections[choice.kind];
  return finishExposure(state, subject, exposure);
}
