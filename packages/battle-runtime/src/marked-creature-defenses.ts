// KERNEL-COVERAGE: runtime-owner BATTLE.FEATURE.MARKED_CREATURE_DISCLOSURE
// UNIT-PROFILE-COVERAGE: runtime-owner table-caller.marked-creature-defenses
// RAW: .references/srd-5.2.1/classes.md:6813-6816.
import { DAMAGE_TYPES } from "@dnd/shared/types";
import { combatantActiveConditionImmunities } from "./battle-reducer/spell-condition-effects-helpers.ts";
import { combatantHasDamageResistance } from "./battle-reducer/damage-helpers.ts";
import type {
  CharacterBattleRuntimeContext,
  BattleRuntimeSession,
} from "./battle-runtime-context.ts";
import type { BattleProcedureExecutionRef, CombatantId } from "./identity.ts";
import type { BattleStatBlockCombatantMechanics } from "./stat-block-combatant-execution-state.ts";
import {
  characterProcedureBinding,
  type CharacterExecutionState,
} from "./character-execution-queries.ts";

export type MarkedCreatureDefensesDisclosure =
  | {
      readonly kind: "disclosed";
      readonly defenses: Pick<
        BattleStatBlockCombatantMechanics,
        "immunities" | "resistances" | "vulnerabilities"
      >;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: "creatureDefensesUnavailable";
    }
  | {
      readonly kind: "ineligible";
      readonly reason:
        | "actorMissing"
        | "featureMissing"
        | "targetMissing"
        | "targetNotMarked";
    };

/** Resolve a source-authored spell cross-reference at the table-knowledge boundary. */
export function discloseMarkedCreatureDefenses(input: {
  readonly session: BattleRuntimeSession;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
}): MarkedCreatureDefensesDisclosure {
  const { session, actorId, targetId } = input;
  const actor = session.state.combatants.get(actorId);
  if (actor?.origin.kind !== "character")
    return { kind: "ineligible", reason: "actorMissing" };
  const execution = actor.origin.execution;
  const context = session.context.characters.get(actorId);
  const spellRefs = markedCreatureDisclosureSpellRefs(execution, context);
  if (spellRefs === null)
    return { kind: "ineligible", reason: "featureMissing" };
  const target = session.state.combatants.get(targetId);
  if (target === undefined)
    return { kind: "ineligible", reason: "targetMissing" };
  if (
    !actor.activeEffects.some(
      (effect) =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.sourceCombatantId === actorId &&
        effect.targetCombatantId === targetId &&
        spellRefs.includes(effect.sourceProcedureRef),
    )
  ) {
    return { kind: "ineligible", reason: "targetNotMarked" };
  }
  if (target.origin.kind !== "statBlock")
    return { kind: "unavailable", reason: "creatureDefensesUnavailable" };
  const { immunities, vulnerabilities } = target.origin.mechanics;
  const resistances = DAMAGE_TYPES.filter((damageType) =>
    combatantHasDamageResistance(session.state, target, damageType),
  );
  return {
    kind: "disclosed",
    defenses: {
      immunities: {
        ...immunities,
        conditions: [
          ...new Set([
            ...immunities.conditions,
            ...combatantActiveConditionImmunities(target),
          ]),
        ],
      },
      resistances,
      vulnerabilities,
    },
  };
}

/** Resolve retained authored references before querying current mark state. */
function markedCreatureDisclosureSpellRefs(
  execution: CharacterExecutionState,
  context: CharacterBattleRuntimeContext | undefined,
): readonly BattleProcedureExecutionRef[] | null {
  const disclosureSources =
    context?.unitPresentationSources.flatMap(({ unit, supportProfiles }) => {
      if (
        unit.kind !== "class_feature" ||
        unit.mechanics.family !== "marked_creature_defenses_disclosure" ||
        !supportProfiles.includes("markedCreatureDefensesDisclosure")
      )
        return [];
      const ownsFeature = context.unitProcedureOwnership.some((ownership) => {
        const binding = characterProcedureBinding(
          execution,
          ownership.procedureRef,
        );
        return (
          ownership.unitId === unit.id &&
          binding?.procedure.kind === "unitSupportProfile" &&
          binding.procedure.execution === "markedCreatureDefensesDisclosure"
        );
      });
      return ownsFeature ? [{ spellId: unit.mechanics.spellId }] : [];
    }) ?? [];
  const spellRefs = disclosureSources.flatMap(({ spellId }) => {
    // This source rule names its spell. Identity resolves that retained cross-record reference;
    // eligibility below uses only admitted execution refs and the current mark occurrence.
    return (
      context?.spellPresentationSources.flatMap(
        ({ invocation, procedureRef }) => {
          const binding = characterProcedureBinding(execution, procedureRef);
          return invocation.spell.id === spellId &&
            binding?.procedure.kind === "spellInvocation" &&
            binding.procedure.execution.procedure === "markedDamageRider"
            ? [procedureRef]
            : [];
        },
      ) ?? []
    );
  });
  return disclosureSources.length === 0 ? null : spellRefs;
}
