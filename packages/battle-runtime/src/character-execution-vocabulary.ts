import type { SpellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";
import type {
  UnitFeatureProcedureExecutionSchema,
  UnitSupportProcedureExecutionSchema,
} from "./battle-reducer/procedure-execution-codecs.ts";
import type {
  BattleCharacterExecutionScopeRef,
  BattleProcedureExecutionCursor,
  BattleProcedureExecutionRef,
  BattleResourcePoolExecutionRef,
} from "./identity.ts";
import type { SpellProcedureExecution } from "./character-execution.ts";
import type { EffectOccurrenceSourceProcedure } from "./effect-occurrence-source-vocabulary.ts";
export {
  EFFECT_OCCURRENCE_SOURCE_KINDS,
  type EffectOccurrenceSourceKind,
} from "./effect-occurrence-source-vocabulary.ts";
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

export type CharacterEffectOccurrenceSourceProcedure =
  EffectOccurrenceSourceProcedure;

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
