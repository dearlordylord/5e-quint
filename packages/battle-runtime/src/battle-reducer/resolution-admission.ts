import {
  characterUnitProcedureQueryForSubject,
  type UnitProcedureSubject,
} from "./resolution-subject-query.ts";
import {
  characterSpellProcedure,
  characterUnitProcedure,
} from "../character-execution-queries.ts";
import type { CharacterProcedureBattleSubject } from "../battle-subjects.ts";
import type {
  AdmittedBattleResolutionInput,
  AdmittedDruidWildShapeBattleResolutionInput,
  BattleResolutionInput,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { CharacterUnitProcedureExecution } from "../character-execution-vocabulary.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
import { Match } from "effect";

export type BattleResolutionAdmission =
  | {
      readonly tag: "admitted";
      readonly input: AdmittedBattleResolutionInput;
    }
  | { readonly tag: "staleCharacterProcedure" };

/**
 * Admit one selected subject against the current execution bindings.
 * Initial execution and interrupted replay share this operation so their
 * subject-specific procedure queries cannot drift.
 */
export function admitBattleResolutionInput(
  input: BattleResolutionInput,
): BattleResolutionAdmission {
  return Match.value(input.subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: () => admitWithoutCharacterBinding(input),
      pactOfTheChainFamiliarAttack: () => admitWithoutCharacterBinding(input),
      creatureAttack: () => admitWithoutCharacterBinding(input),
      bonusAction: () => admitWithoutCharacterBinding(input),
      monkFocusFlurryOfBlowsStrike: () => admitWithoutCharacterBinding(input),
      companionLifecycle: () => admitWithoutCharacterBinding(input),
      findFamiliarSharedSenses: () => admitWithoutCharacterBinding(input),
      runtimeCommand: () => admitWithoutCharacterBinding(input),
      actionSpell: (subject) => admitSpellSubject(input, subject),
      bonusActionSpell: (subject) => admitSpellSubject(input, subject),
      bonusActionDashSpell: (subject) => admitSpellSubject(input, subject),
      findFamiliarTouchSpell: (subject) => admitSpellSubject(input, subject),
      unitFeature: (subject) => admitUnitSubject(input, subject),
      unitFeatureHeldWeaponActivation: (subject) =>
        admitUnitSubject(input, subject),
      druidWildShape: (subject) => admitUnitSubject(input, subject),
      bonusActionStandardAction: (subject) => admitUnitSubject(input, subject),
      monkFocusOption: (subject) => admitUnitSubject(input, subject),
    }),
  );
}

function admitWithoutCharacterBinding(
  input: BattleResolutionInput,
): BattleResolutionAdmission {
  return { tag: "admitted", input: asAdmitted(input) };
}

type SpellProcedureSubject = Extract<
  CharacterProcedureBattleSubject,
  {
    readonly tag:
      | "actionSpell"
      | "bonusActionSpell"
      | "bonusActionDashSpell"
      | "findFamiliarTouchSpell";
  }
>;

function admitSpellSubject(
  input: BattleResolutionInput,
  subject: SpellProcedureSubject,
): BattleResolutionAdmission {
  const actor = input.state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return { tag: "staleCharacterProcedure" };
  }
  return characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  ) === undefined
    ? { tag: "staleCharacterProcedure" }
    : { tag: "admitted", input: asAdmitted(input) };
}

function admitUnitSubject(
  input: BattleResolutionInput,
  subject: UnitProcedureSubject,
): BattleResolutionAdmission {
  const actor = input.state.combatants.get(subject.actorId);
  if (!isCharacterBattleCreatureState(actor)) {
    return { tag: "staleCharacterProcedure" };
  }
  const query = characterUnitProcedureQueryForSubject(subject);
  const unitProcedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    query,
  );
  if (
    subject.tag === "bonusActionStandardAction" &&
    unitProcedure === undefined
  ) {
    return characterSpellProcedure(
      actor.origin.execution,
      subject.procedureRef,
      actor,
    )?.procedure === "expeditiousRetreatDash"
      ? { tag: "admitted", input: asAdmitted(input) }
      : { tag: "staleCharacterProcedure" };
  }
  if (subject.tag === "druidWildShape") {
    return unitProcedure?.kind === "unitFeature" &&
      unitProcedure.execution.kind === "druidWildShapeKnownForm"
      ? {
          tag: "admitted",
          input: asAdmittedDruidWildShape(input, actor, {
            ...unitProcedure,
            execution: unitProcedure.execution,
          }),
        }
      : { tag: "staleCharacterProcedure" };
  }
  return unitProcedure === undefined
    ? { tag: "staleCharacterProcedure" }
    : { tag: "admitted", input: asAdmitted(input) };
}

function asAdmittedDruidWildShape(
  input: BattleResolutionInput,
  actor: CharacterBattleCreatureState,
  procedure: Extract<
    CharacterUnitProcedureExecution,
    { readonly kind: "unitFeature" }
  > & {
    readonly execution: Extract<
      Extract<
        CharacterUnitProcedureExecution,
        { readonly kind: "unitFeature" }
      >["execution"],
      { readonly kind: "druidWildShapeKnownForm" }
    >;
  },
): AdmittedDruidWildShapeBattleResolutionInput {
  return {
    ...input,
    wildShapeAdmission: { actor, procedure },
  } as AdmittedDruidWildShapeBattleResolutionInput;
}

export function admittedDruidWildShapeInput(
  input: AdmittedBattleResolutionInput & {
    readonly subject: Extract<
      UnitProcedureSubject,
      { readonly tag: "druidWildShape" }
    >;
  },
): AdmittedDruidWildShapeBattleResolutionInput {
  // The only constructor for an admitted Wild Shape subject attaches this
  // subject-specific proof before the general dispatcher receives it.
  return input as AdmittedDruidWildShapeBattleResolutionInput;
}

function asAdmitted(
  input: BattleResolutionInput,
): AdmittedBattleResolutionInput {
  // The unique-symbol brand is compile-time-only and erased at runtime. This
  // private cast is required to mint it. The exhaustive tag policy above
  // proves either that this subject needs no character binding or that its
  // subject-specific binding check succeeded before this helper is reached.
  return input as AdmittedBattleResolutionInput;
}
