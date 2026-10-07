// RAW-COVERAGE: runtime-owner RAW-STAT-BLOCK-SPELL-INVOCATION-UNRESTRICTED-001
// UNIT-PROFILE-COVERAGE: runtime-owner stat-block.spell-invocation.unrestricted
// KERNEL-COVERAGE: runtime-owner BATTLE.STAT_BLOCK.SPELL_INVOCATION_UNRESTRICTED
import type {
  CastingTime,
  SpellLevel,
  SpellRecord,
  StatBlockSpellReference,
} from "@dnd/surface/surface/types";
import { topLevelSpellCastingTime } from "@dnd/surface/surface/types";
import type { SpellDefinitionRuleFacts } from "../procedure-execution/spell-rule-facts.ts";
import type { StatBlockSpellInvocationDeltas } from "@dnd/surface/surface/types";
import { projectSpellDefinitionRuleFacts } from "./spell-definition-rule-facts.ts";

export type StatBlockSpellInvocationContinuation =
  | { readonly kind: "unrestricted" }
  | {
      readonly kind: "restricted";
      readonly deltas: StatBlockSpellInvocationDeltas;
    };

export type JoinedStatBlockSpellDefinition = {
  readonly definition: SpellRecord;
  readonly definitionRuleFacts: SpellDefinitionRuleFacts;
  readonly castLevel: SpellLevel;
  readonly castingTime: CastingTime;
  readonly continuation: StatBlockSpellInvocationContinuation;
};

export type StatBlockSpellDefinitionJoin =
  | { readonly kind: "joined"; readonly value: JoinedStatBlockSpellDefinition }
  | { readonly kind: "missingDefinition" }
  | { readonly kind: "definitionReferenceMismatch" }
  | { readonly kind: "missingCastingTimeOwner" }
  | {
      readonly kind: "invalidCastLevel";
      readonly definitionLevel: SpellLevel;
      readonly requestedLevel: SpellLevel;
    };

/**
 * Catalog admission is the only place that joins an authored spell reference.
 * The caller consumes the definition transiently to admit its profile; the
 * projected rule facts and typed continuation are safe to retain in execution.
 * RAW: monsters.md, Spellcasting — lowest possible level unless noted otherwise.
 */
export function joinStatBlockSpellDefinition(
  reference: StatBlockSpellReference,
  definition: SpellRecord | undefined,
): StatBlockSpellDefinitionJoin {
  if (definition === undefined) return { kind: "missingDefinition" };
  if (definition.id !== reference.spellId) {
    return { kind: "definitionReferenceMismatch" };
  }
  const level = definition.mechanics.level;
  const castLevel = reference.castAtLevel ?? level;
  if (castLevel < level || (level === 0 && castLevel !== 0)) {
    return {
      kind: "invalidCastLevel",
      definitionLevel: level,
      requestedLevel: castLevel,
    };
  }
  const castingTime = topLevelSpellCastingTime(definition.mechanics);
  if (castingTime === null) return { kind: "missingCastingTimeOwner" };
  return {
    kind: "joined",
    value: {
      definition,
      definitionRuleFacts: projectSpellDefinitionRuleFacts(
        definition.mechanics,
      ),
      castLevel,
      castingTime,
      continuation:
        reference.restriction === undefined
          ? { kind: "unrestricted" }
          : { kind: "restricted", deltas: reference.restriction.deltas },
    },
  };
}
