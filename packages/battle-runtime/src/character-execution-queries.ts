import { Match } from "effect";
import { NonNegativeInteger } from "@dnd/shared/types";
import {
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
} from "./unit-feature-execution-constants.ts";

import type { BattleActiveEffect } from "./battle-state-execution.ts";
import {
  battleProcedureExecutionCursor,
  battleProcedureExecutionRef,
  type BattleProcedureExecutionRef,
  type CombatantId,
} from "./identity.ts";
import type {
  BattleSpellProcedureExecution,
  DancingLightsRepositionSpellProcedureExecution,
  HeldLightHurlSpellProcedureExecution,
  MarkedDamageRiderTransferSpellProcedureExecution,
  ObjectContactDamageRepeatSpellProcedureExecution,
  SpellCreatedHeldObjectAttackSpellProcedureExecution,
  SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  SpellExecutableExecutionOf,
  SpellProcedureExecution,
  SpiritualWeaponRepeatAttackSpellProcedureExecution,
} from "./character-execution.ts";
import type { SpellExecutionFacts } from "./battle-reducer/spell-execution-facts.ts";
import { sameSpellProcedureExecution } from "./same-spell-procedure-execution.ts";
import { sameDomainValue } from "./domain-value-equality.ts";
export type { BattleSpellProcedureExecution } from "./character-execution.ts";
import type {
  CharacterExecutionState,
  CharacterProcedureBinding,
  CharacterUnitProcedureExecution,
  UnitFeatureProcedureExecution,
  UnitSupportProcedureExecution,
} from "./character-execution-vocabulary.ts";
export type {
  CharacterExecutionState,
  CharacterUnitProcedureExecution,
  UnitFeatureProcedureExecution,
  UnitSupportProcedureExecution,
} from "./character-execution-vocabulary.ts";
type StringUnitSupportProfile = Extract<UnitSupportProcedureExecution, string>;
type StructuredUnitSupportProfile = Exclude<
  UnitSupportProcedureExecution,
  string
>;
export type UnitSupportProfileKind =
  | StringUnitSupportProfile
  | StructuredUnitSupportProfile["kind"];

export type CharacterUnitProcedureQuery =
  | { readonly kind: "unitFeatureOrSupportProfile" }
  | {
      readonly kind: "unitFeatureOrSupportProfileKinds";
      readonly featureKinds: ReadonlySet<UnitFeatureProcedureExecution["kind"]>;
      readonly supportKinds: ReadonlySet<UnitSupportProfileKind>;
    }
  | {
      readonly kind: "unitFeature";
      readonly featureKinds: ReadonlySet<UnitFeatureProcedureExecution["kind"]>;
    }
  | {
      readonly kind: "unitSupportProfile";
      readonly supportKinds: ReadonlySet<UnitSupportProfileKind>;
    };

export const CHARACTER_UNIT_FEATURE_PROCEDURE_QUERY = {
  kind: "unitFeatureOrSupportProfile",
} as const satisfies CharacterUnitProcedureQuery;
export const MONK_FOCUS_PROCEDURE_QUERY = {
  kind: "unitSupportProfile",
  supportKinds: new Set<UnitSupportProfileKind>([
    MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const BONUS_ACTION_STANDARD_ACTION_PROCEDURE_QUERY = {
  kind: "unitFeatureOrSupportProfileKinds",
  featureKinds: new Set<UnitFeatureProcedureExecution["kind"]>([
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
  supportKinds: new Set<UnitSupportProfileKind>([
    "alternateActionCost",
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const DRUID_WILD_SHAPE_PROCEDURE_QUERY = {
  kind: "unitFeature",
  featureKinds: new Set<UnitFeatureProcedureExecution["kind"]>([
    "druidWildShapeKnownForm",
  ]),
} as const satisfies CharacterUnitProcedureQuery;

export function characterProcedureBinding(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): CharacterProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
}

export function bindStoredSpellProcedureExecutionFacts<
  I extends SpellProcedureExecution,
>(
  execution: I,
  procedureRef: BattleProcedureExecutionRef,
): I & { readonly sourceProcedureRef: BattleProcedureExecutionRef } {
  return { ...execution, sourceProcedureRef: procedureRef };
}

export function characterStoredExecutionProcedureRef(
  execution: CharacterExecutionState,
  storedProcedure: SpellProcedureExecution,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      (binding.procedure.kind === "spellInvocation" ||
        binding.procedure.kind === "unavailableSpellInvocation") &&
      sameSpellProcedureExecution(binding.procedure.execution, storedProcedure),
  )?.procedureRef;
}

export function characterProcedureBindingSnapshots(
  execution: CharacterExecutionState,
  executionFactsFor: (
    invocation: SpellProcedureExecution,
  ) => SpellExecutionFacts,
) {
  return execution.procedureBindings.map((binding) =>
    Match.value(binding.procedure).pipe(
      Match.when({ kind: "unitFeature" }, (procedure) => ({
        procedureRef: binding.procedureRef,
        procedure: {
          kind: procedure.kind,
          source: procedure.source,
          execution: procedure.execution,
        },
      })),
      Match.when({ kind: "unitSupportProfile" }, (procedure) => ({
        procedureRef: binding.procedureRef,
        procedure: {
          kind: procedure.kind,
          source: procedure.source,
          execution: procedure.execution,
        },
      })),
      Match.when({ kind: "spellInvocation" }, (procedure) => ({
        procedureRef: binding.procedureRef,
        procedure: {
          kind: procedure.kind,
          executionFacts: executionFactsFor(procedure.execution),
        },
      })),
      Match.when({ kind: "unavailableSpellInvocation" }, (procedure) => ({
        procedureRef: binding.procedureRef,
        procedure: { kind: procedure.kind },
      })),
      Match.exhaustive,
    ),
  );
}

export function unitSupportProfileKind(
  profile: UnitSupportProcedureExecution,
): UnitSupportProfileKind {
  return typeof profile === "string" ? profile : profile.kind;
}

export function characterUnitProcedureBindings(
  execution: CharacterExecutionState,
): readonly {
  readonly procedureRef: BattleProcedureExecutionRef;
  readonly procedure: CharacterUnitProcedureExecution;
}[] {
  return execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitFeature" ||
    binding.procedure.kind === "unitSupportProfile"
      ? [{ procedureRef: binding.procedureRef, procedure: binding.procedure }]
      : [],
  );
}

export function characterUnitProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  query: CharacterUnitProcedureQuery,
): CharacterUnitProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding === undefined) return undefined;
  const procedure = binding.procedure;
  const matches = Match.value(query).pipe(
    Match.discriminatorsExhaustive("kind")({
      unitFeatureOrSupportProfile: () =>
        procedure.kind === "unitFeature" ||
        procedure.kind === "unitSupportProfile",
      unitFeatureOrSupportProfileKinds: ({ featureKinds, supportKinds }) =>
        (procedure.kind === "unitFeature" &&
          featureKinds.has(procedure.execution.kind)) ||
        (procedure.kind === "unitSupportProfile" &&
          supportKinds.has(unitSupportProfileKind(procedure.execution))),
      unitFeature: ({ featureKinds }) =>
        procedure.kind === "unitFeature" &&
        featureKinds.has(procedure.execution.kind),
      unitSupportProfile: ({ supportKinds }) =>
        procedure.kind === "unitSupportProfile" &&
        supportKinds.has(unitSupportProfileKind(procedure.execution)),
    }),
  );
  return matches &&
    (procedure.kind === "unitFeature" ||
      procedure.kind === "unitSupportProfile")
    ? procedure
    : undefined;
}

export function characterExecutionWithSpiritualWeaponRepeatAttack(
  execution: CharacterExecutionState,
  repeatExecution: SpiritualWeaponRepeatAttackSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "spiritualWeaponRepeatAttack" &&
      binding.procedure.execution.activeEffectRef ===
        repeatExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        repeatExecution.activeEffectSourceProcedureRef,
  );
  return alreadyBound
    ? execution
    : characterExecutionWithDynamicSpellProcedures(execution, [
        repeatExecution,
      ]);
}

export function characterExecutionWithObjectContactDamageRepeat(
  execution: CharacterExecutionState,
  repeatExecution: ObjectContactDamageRepeatSpellProcedureExecution,
): CharacterExecutionState {
  const alreadyBound = execution.procedureBindings.some(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      binding.procedure.execution.procedure === "objectContactDamageRepeat" &&
      binding.procedure.execution.activeEffectRef ===
        repeatExecution.activeEffectRef &&
      binding.procedure.execution.activeEffectSourceProcedureRef ===
        repeatExecution.activeEffectSourceProcedureRef,
  );
  return alreadyBound
    ? execution
    : characterExecutionWithDynamicSpellProcedures(execution, [
        repeatExecution,
      ]);
}

export function characterExecutionWithDancingLightsReposition(
  execution: CharacterExecutionState,
  repositionExecution: DancingLightsRepositionSpellProcedureExecution,
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, [
    repositionExecution,
  ]);
}

export function characterExecutionWithHeldLightHurl(
  execution: CharacterExecutionState,
  hurlExecution: HeldLightHurlSpellProcedureExecution,
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, [
    hurlExecution,
  ]);
}

export function characterExecutionWithMarkedDamageRiderTransfer(
  execution: CharacterExecutionState,
  transferExecution: MarkedDamageRiderTransferSpellProcedureExecution,
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, [
    transferExecution,
  ]);
}

export function characterExecutionWithSpellCreatedHeldObjectProcedures(
  execution: CharacterExecutionState,
  procedures: readonly [
    SpellCreatedHeldObjectAttackSpellProcedureExecution,
    SpellCreatedHeldObjectReEvokeSpellProcedureExecution,
  ],
): CharacterExecutionState {
  return characterExecutionWithDynamicSpellProcedures(execution, procedures);
}

function characterExecutionWithDynamicSpellProcedures(
  execution: CharacterExecutionState,
  procedures: readonly (
    | DancingLightsRepositionSpellProcedureExecution
    | HeldLightHurlSpellProcedureExecution
    | MarkedDamageRiderTransferSpellProcedureExecution
    | ObjectContactDamageRepeatSpellProcedureExecution
    | SpellCreatedHeldObjectAttackSpellProcedureExecution
    | SpellCreatedHeldObjectReEvokeSpellProcedureExecution
    | SpiritualWeaponRepeatAttackSpellProcedureExecution
  )[],
): CharacterExecutionState {
  const unbound = procedures.filter(
    (procedure) =>
      !execution.procedureBindings.some(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          sameDynamicSpellProcedureExecution(
            binding.procedure.execution,
            procedure,
          ),
      ),
  );
  if (unbound.length === 0) return execution;
  let cursor = Number(execution.nextProcedureOrdinal);
  const procedureBindings = unbound.map((procedure) => ({
    procedureRef: battleProcedureExecutionRef(
      execution.scopeRef,
      NonNegativeInteger(cursor++),
    ),
    procedure: { kind: "spellInvocation" as const, execution: procedure },
  }));
  return {
    ...execution,
    nextProcedureOrdinal: battleProcedureExecutionCursor(cursor),
    procedureBindings: [...execution.procedureBindings, ...procedureBindings],
  };
}

function sameDynamicSpellProcedureExecution(
  left: SpellProcedureExecution,
  right:
    | DancingLightsRepositionSpellProcedureExecution
    | HeldLightHurlSpellProcedureExecution
    | MarkedDamageRiderTransferSpellProcedureExecution
    | ObjectContactDamageRepeatSpellProcedureExecution
    | SpellCreatedHeldObjectAttackSpellProcedureExecution
    | SpellCreatedHeldObjectReEvokeSpellProcedureExecution
    | SpiritualWeaponRepeatAttackSpellProcedureExecution,
): boolean {
  return sameDomainValue(left, right);
}

export function characterSpellProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  liveActor?: {
    readonly combatantId: CombatantId;
    readonly activeEffects: readonly BattleActiveEffect[];
  },
): BattleSpellProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") return undefined;
  const executable = executableSpellProcedureFromLiveEffects(
    execution,
    binding.procedure.execution,
    liveActor,
  );
  return executable === undefined
    ? undefined
    : { ...executable, sourceProcedureRef: procedureRef };
}

export function characterSpellProcedureRefsForProcedure(
  execution: CharacterExecutionState,
  procedures: ReadonlySet<SpellProcedureExecution["procedure"]>,
): readonly BattleProcedureExecutionRef[] {
  return execution.procedureBindings.flatMap((binding) =>
    (binding.procedure.kind === "spellInvocation" ||
      binding.procedure.kind === "unavailableSpellInvocation") &&
    procedures.has(binding.procedure.execution.procedure)
      ? [binding.procedureRef]
      : [],
  );
}

export function characterSpellProcedureExecution(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): SpellProcedureExecution | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding?.procedure.kind === "spellInvocation"
    ? binding.procedure.execution
    : undefined;
}

function executableSpellProcedureFromLiveEffects(
  execution: CharacterExecutionState,
  stored: SpellProcedureExecution,
  liveActor:
    | {
        readonly combatantId: CombatantId;
        readonly activeEffects: readonly BattleActiveEffect[];
      }
    | undefined,
): SpellExecutableExecutionOf<SpellProcedureExecution> | undefined {
  if (
    stored.procedure === "markedDamageRider" &&
    stored.action === "transfer"
  ) {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellMarkedDamageRider" }
      > =>
        effect.kind === "spellMarkedDamageRider" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "markedDamageRider" &&
      source.action === "cast"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          action: stored.action,
          actionCost: "bonusAction",
          activeEffect,
          rangeFeet: source.rangeFeet,
          targeting: { kind: "singleCombatant" },
        }
      : undefined;
  }
  if (stored.procedure === "objectContactDamageRepeat") {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spellObjectContactDamage" }
      > =>
        effect.kind === "spellObjectContactDamage" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "objectContactDamage"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          actionCost: "bonusAction",
          activeEffect,
        }
      : undefined;
  }
  if (stored.procedure === "spiritualWeaponRepeatAttack") {
    if (liveActor === undefined) return undefined;
    const source = characterSpellProcedureExecution(
      execution,
      stored.activeEffectSourceProcedureRef,
    );
    const activeEffect = liveActor.activeEffects.find(
      (
        effect,
      ): effect is Extract<
        BattleActiveEffect,
        { readonly kind: "spiritualWeapon" }
      > =>
        effect.kind === "spiritualWeapon" &&
        effect.effectRef === stored.activeEffectRef &&
        effect.sourceProcedureRef === stored.activeEffectSourceProcedureRef &&
        effect.sourceCombatantId === liveActor.combatantId,
    );
    return activeEffect !== undefined &&
      source?.procedure === "spiritualWeaponAttackProxy"
      ? {
          spellRuleFacts: source.spellRuleFacts,
          access: {
            tag: "spellEffect",
            sourceCombatantId: liveActor.combatantId,
          },
          resource: { tag: "none" },
          procedure: stored.procedure,
          actionCost: "bonusAction",
          activeEffect,
          targeting: { kind: "singleCombatant" },
          damage: activeEffect.damage,
          attackKind: activeEffect.attackKind,
          attackBonus: activeEffect.attackBonus,
          forceReachFeet: activeEffect.forceReachFeet,
          repeatMoveMaxFeet: activeEffect.repeatMoveMaxFeet,
        }
      : undefined;
  }
  return stored;
}
