import type { ReadonlyNonEmptyArray, SpellSlotLevel } from "@dnd/shared/types";
import type { BattleStoredSpellProcedureExecution } from "./character-execution.ts";
import type {
  StatBlockCantripSpellAccess,
  StatBlockLeveledSpellAccess,
  StatBlockSpellInvocationResource,
} from "./procedure-execution/spell-invocation-vocabulary.ts";
import type { StatBlockSpellCastingSource } from "./procedure-execution/spell-rule-facts.ts";

type StatBlockSpellCastProcedure = Exclude<
  BattleStoredSpellProcedureExecution,
  | { readonly procedure: "spawnedCompanionLifecycle" }
  | { readonly procedure: "markedDamageRider"; readonly action: "transfer" }
  | { readonly procedure: "objectContactDamageRepeat" }
  | {
      readonly procedure: "spatialMeleeSpellAttackProxy";
      readonly operation: "repositionAndAttack";
    }
>;

type StatBlockSpellCastSourceFacts = {
  readonly spellRuleFacts: {
    readonly castingSource: StatBlockSpellCastingSource;
  };
};
export type StatBlockSpellCastProcedureExecution =
  | (StatBlockSpellCastProcedure &
      StatBlockSpellCastSourceFacts & {
        readonly access: StatBlockCantripSpellAccess;
        readonly resource: StatBlockSpellInvocationResource<0>;
      })
  | (StatBlockSpellCastProcedure &
      StatBlockSpellCastSourceFacts & {
        readonly access: StatBlockLeveledSpellAccess;
        readonly resource: StatBlockSpellInvocationResource<SpellSlotLevel>;
      });

export function isStatBlockSpellCastProcedureExecution(
  execution: import("./procedure-execution/spell-procedure-execution.ts").SpellProcedureExecution,
): execution is StatBlockSpellCastProcedureExecution {
  if (
    !(
      execution.procedure !== "spawnedCompanionLifecycle" &&
      !(
        execution.procedure === "markedDamageRider" &&
        execution.action === "transfer"
      ) &&
      execution.procedure !== "objectContactDamageRepeat" &&
      !(
        execution.procedure === "spatialMeleeSpellAttackProxy" &&
        execution.operation === "repositionAndAttack"
      )
    )
  )
    return false;
  if (execution.spellRuleFacts.castingSource.tag !== "statBlock") return false;
  if (
    execution.resource.tag !== "statBlockAtWill" &&
    execution.resource.tag !== "statBlockLimited"
  )
    return false;
  return execution.spellRuleFacts.level === 0
    ? execution.access.tag === "statBlockCantrip" &&
        execution.resource.castLevel === 0
    : execution.access.tag === "statBlockLeveled" &&
        execution.resource.castLevel >= execution.spellRuleFacts.level;
}

export const STAT_BLOCK_SPELL_INVOCATION_UNSUPPORTED_REASONS = [
  "missingDefinition",
  "definitionReferenceMismatch",
  "missingCastingTimeOwner",
  "invalidCastLevel",
  "unsupportedProfile",
  "missingChildProcedureOwner",
  "unsupportedRestriction",
  "missingCasterAttackBonus",
  "missingCasterSaveDc",
  "missingCasterAttackBonusAndSaveDc",
] as const;
export type StatBlockSpellInvocationUnsupportedReason =
  (typeof STAT_BLOCK_SPELL_INVOCATION_UNSUPPORTED_REASONS)[number];

export type StatBlockSpellInvocationDispatch =
  | {
      readonly kind: "unsupported";
      readonly reason: StatBlockSpellInvocationUnsupportedReason;
    }
  | {
      readonly kind: "executable";
      readonly executions: ReadonlyNonEmptyArray<StatBlockSpellCastProcedureExecution>;
    };
