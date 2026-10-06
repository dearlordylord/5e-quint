import type { BattleReadyActionSubject } from "../../../battle-runtime/src/battle-subjects.ts";
import type {
  BattleSubject,
  BattleInterruptSubject,
} from "@dnd/battle-runtime";
import type {
  AdmittedBattleResolutionInput,
  BattleFill,
  BattleInterruptDecision,
  BattleInterruptProcedureSelection,
  BattleReactionModifierChoice,
} from "../../../battle-runtime/src/battle-state-execution.ts";
import type {
  CharacterProcedureBinding,
  UnitFeatureProcedureExecution,
  UnitSupportProcedureExecution,
} from "../../../battle-runtime/src/character-execution-vocabulary.ts";
import type {
  BattleSpellProcedureKey,
  SpellProcedureExecutionByProcedure,
} from "../../../battle-runtime/src/character-execution.ts";
import type { StaticSpellMechanicsOwnerKey } from "../../../battle-runtime/src/battle-reducer/spell-procedure-profiles/spell-mechanics-admission.ts";
import type {
  StatBlockProcedure,
  StatBlockBonusActionOptionProcedure,
} from "../../../battle-runtime/src/stat-block-execution-state.ts";
import type { SpellProcedureExecutionRegistry } from "../../../battle-runtime/src/battle-reducer/spell-procedure-profiles/execution-registry.ts";
import type { CreationFill } from "@dnd/character-creation-runtime";
import type { applyCharacterSessionOperation } from "../character-session-operation-tool.ts";
import type { queryCharacterSession } from "../character-session-query.ts";
import type { handleBattleLifecycleToolCall } from "../battle-lifecycle-tool.ts";
import type { PlaySessionNextOperationName } from "../play-session-tool-names.ts";

// Distribute over the execution union, preserving compound discriminants.
type SubjectBaseKey<T> = T extends { readonly tag: infer Tag extends string }
  ? T extends { readonly command: infer Command extends string }
    ? `${Tag}.${Command}`
    : T extends { readonly action: infer Action extends string }
      ? `${Tag}.${Action}`
      : T extends { readonly option: infer Option extends string }
        ? `${Tag}.${Option}`
        : Tag
  : "__unaccountedSubjectShape";
export type SubjectOperationKey<T> = T extends { readonly mode: infer Mode }
  ? Mode extends string
    ? `${SubjectBaseKey<T>}.${Mode}`
    : Mode extends { readonly tag: infer Tag extends string }
      ? `${SubjectBaseKey<T>}.${Tag}`
      : "__unaccountedSubjectMode"
  : SubjectBaseKey<T>;
export type ProcedureKind<T> = T extends string
  ? T
  : T extends { readonly kind: infer Kind extends string }
    ? Kind
    : "__unaccountedProcedureShape";
type SpellProcedureOperationKey<T> = T extends {
  readonly procedure: infer P extends string;
}
  ? P extends `${string}.${string}`
    ? "__unaccountedSpellProcedureDelimiter"
    : T extends { readonly operation: infer O extends string }
      ? `${P}.${O}`
      : T extends { readonly action: infer A extends string }
        ? `${P}.${A}`
        : P
  : "__unaccountedSpellShape";
export type SpellOperationKey<T> = T extends {
  readonly castingTime: { readonly kind: infer Kind extends string };
}
  ? `${SpellProcedureOperationKey<T>}.${Kind}`
  : SpellProcedureOperationKey<T>;

export interface OperationDomains {
  publicTools: PlaySessionNextOperationName;
  battleSubjects: SubjectOperationKey<BattleSubject>;
  battleInterruptSubjects: SubjectOperationKey<BattleInterruptSubject>;
  readiedActionSubjects: SubjectOperationKey<BattleReadyActionSubject>;
  battleAdmissions: AdmittedBattleResolutionInput["admissionKind"];
  battleContinuations: BattleFill["kind"];
  unitFeatureDecisionChoices: Extract<
    BattleFill,
    { readonly kind: "unitFeatureDecision" }
  >["value"];
  interruptDecisions: BattleInterruptDecision["kind"];
  interruptSelections: BattleInterruptProcedureSelection["kind"];
  reactionModifiers: BattleReactionModifierChoice["kind"];
  spellProcedures: BattleSpellProcedureKey;
  spellOperations: SpellOperationKey<
    SpellProcedureExecutionByProcedure[BattleSpellProcedureKey]
  >;
  staticSpellMechanics: StaticSpellMechanicsOwnerKey;
  procedureBindings: CharacterProcedureBinding["procedure"]["kind"];
  unitFeatureProcedures: ProcedureKind<UnitFeatureProcedureExecution>;
  unitSupportProcedures: ProcedureKind<UnitSupportProcedureExecution>;
  statBlockProcedures: StatBlockProcedure["kind"];
  statBlockBonusActions: StatBlockBonusActionOptionProcedure["standardActions"][number];
  spellRegistryPorts: keyof SpellProcedureExecutionRegistry;
  characterMutations: Parameters<
    typeof applyCharacterSessionOperation
  >[1]["operation"]["kind"];
  characterQueries: Parameters<
    typeof queryCharacterSession
  >[1]["query"]["kind"];
  battleLifecycle: Parameters<
    typeof handleBattleLifecycleToolCall
  >[1]["operation"]["kind"];
  creationInputs: CreationFill["kind"];
}
