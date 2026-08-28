import type { SpellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";
import type {
  UnitFeatureProcedureExecutionSchema,
  UnitSupportProcedureExecutionSchema,
} from "./battle-reducer/procedure-execution-codecs.ts";
import type {
  BattleCharacterExecutionScopeRef,
  BattleEffectExecutionRef,
  BattleProcedureExecutionCursor,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
} from "./identity.ts";
import type { SpellProcedureExecution } from "./character-execution.ts";
import type { Brand, Schema } from "effect";

export type UnitFeatureProcedureExecution = Schema.Schema.Type<
  typeof UnitFeatureProcedureExecutionSchema
>;
export type UnitSupportProcedureExecution = Schema.Schema.Type<
  typeof UnitSupportProcedureExecutionSchema
>;

export type CharacterUnitProcedureSource =
  | { readonly kind: "intrinsic" }
  | {
      readonly kind: "resourcePool";
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
    };

export type CharacterUnitProcedureExecution =
  | {
      readonly kind: "unitFeature";
      readonly source: CharacterUnitProcedureSource;
      readonly execution: UnitFeatureProcedureExecution;
    }
  | {
      readonly kind: "unitSupportProfile";
      readonly source: CharacterUnitProcedureSource;
      readonly execution: UnitSupportProcedureExecution;
    };

export const EFFECT_OCCURRENCE_SOURCE_KINDS = [
  "nextAttackRollBySelf",
  "sleepPendingRepeatSave",
  "spellCondition",
  "spellConditionEndTurnSave",
  "spellTurnEndDamage",
  "spellTurnStartDamageAndSave",
] as const;

export type EffectOccurrenceSourceKind =
  (typeof EFFECT_OCCURRENCE_SOURCE_KINDS)[number];

export type CharacterEffectOccurrenceSourceProcedure = {
  readonly kind: "effectOccurrenceSource";
  readonly effectRef: BattleEffectExecutionRef;
  readonly effectKind: EffectOccurrenceSourceKind;
};

export type CharacterProcedureBinding =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: CharacterUnitProcedureExecution;
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly execution: SpellProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
        readonly execution: SpellProcedureExecution;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: CharacterEffectOccurrenceSourceProcedure;
    };

export type CharacterProcedureBindingSnapshot =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: CharacterUnitProcedureExecution;
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly executionFacts: SpellExecutionFacts;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: { readonly kind: "unavailableSpellInvocation" };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: CharacterEffectOccurrenceSourceProcedure;
    };

type CharacterExecutionStateData = {
  readonly scopeRef: BattleCharacterExecutionScopeRef;
  readonly nextProcedureOrdinal: BattleProcedureExecutionCursor;
  readonly procedureBindings: readonly CharacterProcedureBinding[];
};
export type CharacterExecutionState = CharacterExecutionStateData &
  Brand.Brand<"CharacterExecutionState">;
