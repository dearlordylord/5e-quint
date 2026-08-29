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
  AdmittedBattleResolutionInputFor,
  AdmittedBonusActionStandardActionBattleResolutionInput,
  AdmittedBonusActionStandardActionRejectionBattleResolutionInput,
  AdmittedDruidWildShapeBattleResolutionInput,
  AdmittedUnitFeatureBattleResolutionInput,
  BattleResolutionInput,
  CharacterBattleCreatureState,
} from "../battle-state-execution.ts";
import type { CharacterUnitProcedureExecution } from "../character-execution-vocabulary.ts";
import { isCharacterBattleCreatureState } from "./creature-state-execution.ts";
import { Match } from "effect";

export type BattleResolutionAdmission<
  TInput extends BattleResolutionInput = BattleResolutionInput,
> =
  | {
      readonly tag: "admitted";
      readonly input: AdmittedBattleResolutionInputFor<TInput>;
    }
  | { readonly tag: "staleCharacterProcedure" };

/**
 * Admit one selected subject against the current execution bindings.
 * Initial execution and interrupted replay share this operation so their
 * subject-specific procedure queries cannot drift.
 */
export function admitBattleResolutionInput<
  TInput extends BattleResolutionInput,
>(input: TInput): BattleResolutionAdmission<TInput>;
export function admitBattleResolutionInput(
  input: BattleResolutionInput,
): BattleResolutionAdmission {
  return Match.value(input.subject).pipe(
    Match.discriminatorsExhaustive("tag")({
      action: () => admitWithoutCharacterBinding(input),
      companionAttack: () => admitWithoutCharacterBinding(input),
      bonusAction: () => admitWithoutCharacterBinding(input),
      monkFocusFlurryOfBlowsStrike: () => admitWithoutCharacterBinding(input),
      companionLifecycle: () => admitWithoutCharacterBinding(input),
      spawnedCompanionSharedSenses: () => admitWithoutCharacterBinding(input),
      runtimeCommand: () => admitWithoutCharacterBinding(input),
      actionSpell: (subject) => admitSpellSubject(input, subject),
      bonusActionSpell: (subject) => admitSpellSubject(input, subject),
      bonusActionDashSpell: (subject) => admitSpellSubject(input, subject),
      spawnedCompanionTouchSpellProxy: (subject) =>
        admitSpellSubject(input, subject),
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
      | "spawnedCompanionTouchSpellProxy";
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
  if (subject.tag === "bonusActionStandardAction") {
    return admitBonusActionStandardAction(input, actor, subject);
  }
  const query = characterUnitProcedureQueryForSubject(subject);
  const unitProcedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    query,
  );
  if (subject.tag === "druidWildShape") {
    return unitProcedure?.kind === "unitFeature" &&
      unitProcedure.execution.kind === "druidWildShapeKnownForm" &&
      unitProcedure.source.kind === "resourcePool"
      ? {
          tag: "admitted",
          input: asAdmittedDruidWildShape(input, actor, {
            ...unitProcedure,
            execution: unitProcedure.execution,
            source: unitProcedure.source,
          }),
        }
      : { tag: "staleCharacterProcedure" };
  }
  if (subject.tag === "unitFeature") {
    return unitProcedure?.kind === "unitFeature"
      ? {
          tag: "admitted",
          input: asAdmittedUnitFeature(input, actor, unitProcedure),
        }
      : { tag: "staleCharacterProcedure" };
  }
  return unitProcedure === undefined
    ? { tag: "staleCharacterProcedure" }
    : { tag: "admitted", input: asAdmitted(input) };
}

function admitBonusActionStandardAction(
  input: BattleResolutionInput,
  actor: CharacterBattleCreatureState,
  subject: Extract<
    UnitProcedureSubject,
    { readonly tag: "bonusActionStandardAction" }
  >,
): BattleResolutionAdmission {
  const unitProcedure = characterUnitProcedure(
    actor.origin.execution,
    subject.procedureRef,
    characterUnitProcedureQueryForSubject(subject),
  );
  return unitProcedure === undefined
    ? admitGrantedAlternateActionCost(input, actor, subject)
    : admitUnitBonusActionStandardAction(input, actor, subject, unitProcedure);
}

type BonusActionStandardActionProcedureAdmission =
  AdmittedBonusActionStandardActionBattleResolutionInput["bonusActionStandardActionAdmission"]["procedure"];

function admitUnitBonusActionStandardAction(
  input: BattleResolutionInput,
  actor: CharacterBattleCreatureState,
  subject: Extract<
    UnitProcedureSubject,
    { readonly tag: "bonusActionStandardAction" }
  >,
  unitProcedure: CharacterUnitProcedureExecution,
): BattleResolutionAdmission {
  const alternateActionCost = supportedAlternateActionCostProcedure(
    unitProcedure,
    subject.action,
  );
  if (alternateActionCost !== undefined) {
    return {
      tag: "admitted",
      input: asAdmittedBonusActionStandardAction(input, actor, {
        kind: "supportedAlternateActionCost",
        procedure: alternateActionCost,
      }),
    };
  }
  const dashTemporaryHitPoints = dashTemporaryHitPointsProcedure(
    unitProcedure,
    subject.action,
  );
  if (dashTemporaryHitPoints !== undefined) {
    return {
      tag: "admitted",
      input: asAdmittedBonusActionStandardAction(input, actor, {
        kind: "dashTemporaryHitPoints",
        procedure: dashTemporaryHitPoints,
      }),
    };
  }
  return admittedBonusActionStandardActionRejection(input, {
    reason: "unsupportedActOption",
    message:
      "Bonus Action standard action requires an admitted alternate action cost feature.",
  });
}

function supportedAlternateActionCostProcedure(
  procedure: CharacterUnitProcedureExecution,
  action: Extract<
    UnitProcedureSubject,
    { readonly tag: "bonusActionStandardAction" }
  >["action"],
):
  | Extract<
      BonusActionStandardActionProcedureAdmission,
      { readonly kind: "supportedAlternateActionCost" }
    >["procedure"]
  | undefined {
  return procedure.kind === "unitSupportProfile" &&
    typeof procedure.execution === "object" &&
    procedure.execution.kind === "alternateActionCost" &&
    procedure.execution.to.kind === "bonusAction" &&
    procedure.execution.from.actions.includes(action)
    ? { ...procedure, execution: procedure.execution }
    : undefined;
}

function dashTemporaryHitPointsProcedure(
  procedure: CharacterUnitProcedureExecution,
  action: Extract<
    UnitProcedureSubject,
    { readonly tag: "bonusActionStandardAction" }
  >["action"],
):
  | Extract<
      BonusActionStandardActionProcedureAdmission,
      { readonly kind: "dashTemporaryHitPoints" }
    >["procedure"]
  | undefined {
  return action === "dash" &&
    typeof procedure.execution === "object" &&
    procedure.execution.kind === "bonusActionDashTemporaryHitPoints"
    ? { ...procedure, execution: procedure.execution }
    : undefined;
}

function admitGrantedAlternateActionCost(
  input: BattleResolutionInput,
  actor: CharacterBattleCreatureState,
  subject: Extract<
    UnitProcedureSubject,
    { readonly tag: "bonusActionStandardAction" }
  >,
): BattleResolutionAdmission {
  const spellProcedure = characterSpellProcedure(
    actor.origin.execution,
    subject.procedureRef,
    actor,
  );
  if (spellProcedure?.procedure !== "grantedAlternateActionCost") {
    return { tag: "staleCharacterProcedure" };
  }
  if (!grantedAlternateActionCostEffectIsActive(actor, subject)) {
    return admittedBonusActionStandardActionRejection(input, {
      reason: "staleSubject",
      message:
        "The spell effect that granted this Bonus Action is no longer active.",
    });
  }
  return {
    tag: "admitted",
    input: asAdmittedBonusActionStandardAction(input, actor, {
      kind: "grantedAlternateActionCost",
    }),
  };
}

function grantedAlternateActionCostEffectIsActive(
  actor: CharacterBattleCreatureState,
  subject: Extract<
    UnitProcedureSubject,
    { readonly tag: "bonusActionStandardAction" }
  >,
): subject is Extract<typeof subject, { readonly action: "dash" }> {
  return (
    subject.action === "dash" &&
    actor.activeEffects.some(
      (effect) =>
        effect.kind === "spellDashBonusAction" &&
        effect.effectRef === subject.sourceEffectRef &&
        effect.sourceProcedureRef === subject.procedureRef &&
        effect.sourceCombatantId === actor.combatantId,
    )
  );
}

function asAdmittedUnitFeature(
  input: BattleResolutionInput,
  actor: CharacterBattleCreatureState,
  procedure: Extract<
    CharacterUnitProcedureExecution,
    { readonly kind: "unitFeature" }
  >,
): AdmittedUnitFeatureBattleResolutionInput {
  return {
    ...input,
    admissionKind: "unitFeature",
    unitFeatureAdmission: { actor, procedure },
    // This private boundary is the sole brand minter. The immediately
    // preceding subject-specific query proves the actor and Unit-feature
    // procedure stored in this payload.
  } as AdmittedUnitFeatureBattleResolutionInput;
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
    readonly source: Extract<
      CharacterUnitProcedureExecution["source"],
      { readonly kind: "resourcePool" }
    >;
  },
): AdmittedDruidWildShapeBattleResolutionInput {
  return {
    ...input,
    admissionKind: "druidWildShape",
    wildShapeAdmission: { actor, procedure },
    // This private boundary is the sole brand minter. The immediately
    // preceding guards prove the actor, subject-specific procedure query,
    // and exact Wild Shape execution profile stored in this payload.
  } as AdmittedDruidWildShapeBattleResolutionInput;
}

function asAdmittedBonusActionStandardAction(
  input: BattleResolutionInput,
  actor: CharacterBattleCreatureState,
  procedure: AdmittedBonusActionStandardActionBattleResolutionInput["bonusActionStandardActionAdmission"]["procedure"],
): AdmittedBonusActionStandardActionBattleResolutionInput {
  return {
    ...input,
    admissionKind: "bonusActionStandardAction",
    bonusActionStandardActionAdmission: { actor, procedure },
    // The subject-specific query immediately above proves the actor and exact
    // Unit or Expeditious Retreat procedure stored in this admission payload.
  } as AdmittedBonusActionStandardActionBattleResolutionInput;
}

function admittedBonusActionStandardActionRejection(
  input: BattleResolutionInput,
  rejection: AdmittedBonusActionStandardActionRejectionBattleResolutionInput["bonusActionStandardActionRejection"],
): BattleResolutionAdmission {
  return {
    tag: "admitted",
    input: {
      ...input,
      admissionKind: "bonusActionStandardActionRejection",
      bonusActionStandardActionRejection: rejection,
      // Admission proved the binding and classified the exact unsupported or
      // stale selected state without creating a contradictory procedure fact.
    } as AdmittedBonusActionStandardActionRejectionBattleResolutionInput,
  };
}

function asAdmitted(
  input: BattleResolutionInput,
): AdmittedBattleResolutionInput {
  // The unique-symbol brand is compile-time-only and erased at runtime. This
  // private cast is required to mint it. The exhaustive tag policy above
  // proves either that this subject needs no character binding or that its
  // subject-specific binding check succeeded before this helper is reached.
  return {
    ...input,
    admissionKind: "general",
  } as AdmittedBattleResolutionInput;
}
