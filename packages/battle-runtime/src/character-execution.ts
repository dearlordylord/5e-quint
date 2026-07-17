import { Brand } from "effect";
import * as Either from "effect/Either";
import { NonNegativeInteger } from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import type {
  BattleCharacterExecutionScopeRef,
  BattleProcedureExecutionRef,
  BattleId,
  CombatantId,
  BattleExecutionScopeOrdinal,
} from "./identity.ts";
import {
  battleCharacterExecutionScopeRef,
  battleProcedureExecutionRef,
} from "./identity.ts";
import {
  parseSupportedUnitFeatureProfile,
  battleUnitSupportProfilesForUnit,
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  type BattleUnitSupportProfile,
  type SupportedUnitFeatureProfile,
} from "./unit-feature-support.ts";
import type { SupportedSpellInvocation } from "./battle-reducer.ts";
import type { BattleUnitRef } from "./battle-init.ts";
import type { SpellInvocationRef } from "./battle-subjects.ts";
import {
  sameSpellInvocationRef,
  supportedSpellInvocationRef,
} from "./battle-reducer/spells-invocation-ref.ts";

export type UnitSupportProfileKind<TProfile = BattleUnitSupportProfile> =
  TProfile extends string
    ? TProfile
    : TProfile extends { readonly kind: infer TKind extends string }
      ? TKind
      : never;

export type CharacterUnitProcedureQuery =
  | { readonly kind: "unitFeatureOrSupportProfile" }
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
  kind: "unitSupportProfile",
  supportKinds: new Set<UnitSupportProfileKind>([
    "alternateActionCost",
    BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
    BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;
export const DRUID_WILD_SHAPE_PROCEDURE_QUERY = {
  kind: "unitSupportProfile",
  supportKinds: new Set<UnitSupportProfileKind>([
    DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  ]),
} as const satisfies CharacterUnitProcedureQuery;

export type CharacterProcedureBinding =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitSupportProfile";
        readonly unitId: UnitRecord["id"];
        readonly profile: BattleUnitSupportProfile;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly profile: SupportedUnitFeatureProfile;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly invocation: SupportedSpellInvocation;
      };
    };

type CharacterExecutionStateData = {
  readonly scopeRef: BattleCharacterExecutionScopeRef;
  readonly procedureBindings: readonly CharacterProcedureBinding[];
};
export type CharacterExecutionState = CharacterExecutionStateData &
  Brand.Brand<"CharacterExecutionState">;
const CharacterExecutionState = Brand.nominal<CharacterExecutionState>();

export function characterExecutionFromUnits(input: {
  readonly battleId: BattleId;
  readonly combatantId: CombatantId;
  readonly scopeOrdinal: BattleExecutionScopeOrdinal;
  readonly units: readonly UnitRecord[];
  readonly unitRefs: readonly BattleUnitRef[];
  readonly classLevels: readonly CharacterBattleClassLevel[];
}): CharacterExecutionState {
  const scopeRef = battleCharacterExecutionScopeRef(
    input.battleId,
    input.combatantId,
    input.scopeOrdinal,
  );
  const unitProcedureById = new Map<
    UnitRecord["id"],
    SupportedUnitFeatureProfile
  >();
  for (const unit of input.units) {
    const profile = parseSupportedUnitFeatureProfile(unit, input.classLevels);
    if (profile !== null && !unitProcedureById.has(profile.unit.id)) {
      unitProcedureById.set(profile.unit.id, profile);
    }
  }
  const unitProcedures = [...unitProcedureById.values()];
  const unitBindings = unitProcedures.map((profile, ordinal) => ({
    procedureRef: battleProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(ordinal),
    ),
    procedure: { kind: "unitFeature" as const, profile },
  }));
  const derivedUnitSupportProcedures = input.units.flatMap((unit) => {
    const profiles = battleUnitSupportProfilesForUnit({
      unit,
      classLevels: input.classLevels,
    });
    return Either.isLeft(profiles)
      ? []
      : profiles.right.map((profile) => ({ unitId: unit.id, profile }));
  });
  const explicitUnitSupportProcedures = input.unitRefs.flatMap((unitRef) =>
    unitRef.supportProfiles.map((profile) => ({
      unitId: unitRef.unitId,
      profile,
    })),
  );
  const explicitlyProjectedUnitIds = new Set(
    explicitUnitSupportProcedures.map((procedure) => procedure.unitId),
  );
  const unitRefProcedures = [
    ...explicitUnitSupportProcedures,
    ...derivedUnitSupportProcedures.filter(
      (procedure) => !explicitlyProjectedUnitIds.has(procedure.unitId),
    ),
  ];
  const unitRefBindings = unitRefProcedures.map(
    (procedure, offset): CharacterProcedureBinding => ({
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(unitBindings.length + offset),
      ),
      procedure: { kind: "unitSupportProfile", ...procedure },
    }),
  );
  const procedureBindings = [...unitBindings, ...unitRefBindings];
  return CharacterExecutionState({
    scopeRef,
    procedureBindings,
  });
}

export function characterExecutionWithSpellInvocations(
  execution: CharacterExecutionState,
  invocations: readonly SupportedSpellInvocation[],
): CharacterExecutionState {
  const newInvocations = invocations.filter(
    (invocation) =>
      !execution.procedureBindings.some(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          sameSpellInvocationOccurrence(
            binding.procedure.invocation,
            invocation,
          ),
      ),
  );
  const spellBindings = newInvocations.map((invocation, offset) => ({
    procedureRef: battleProcedureExecutionRef(
      execution.scopeRef,
      NonNegativeInteger(execution.procedureBindings.length + offset),
    ),
    procedure: { kind: "spellInvocation" as const, invocation },
  }));
  if (spellBindings.length === 0) return execution;
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    procedureBindings: [...execution.procedureBindings, ...spellBindings],
  });
}

export function characterUnitProcedureRef(
  execution: CharacterExecutionState,
  unitId: UnitRecord["id"],
  query: CharacterUnitProcedureQuery,
): BattleProcedureExecutionRef | undefined {
  return characterUnitProcedureRefs(execution, unitId, query)[0];
}

export function characterUnitProcedureRefs(
  execution: CharacterExecutionState,
  unitId: UnitRecord["id"],
  query: CharacterUnitProcedureQuery,
): readonly BattleProcedureExecutionRef[] {
  const unitFeatureRefs = execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitFeature" &&
    binding.procedure.profile.unit.id === unitId
      ? [binding.procedureRef]
      : [],
  );
  if (
    query.kind === "unitFeatureOrSupportProfile" &&
    unitFeatureRefs.length > 0
  ) {
    return unitFeatureRefs;
  }
  return execution.procedureBindings.flatMap((binding) =>
    binding.procedure.kind === "unitSupportProfile" &&
    binding.procedure.unitId === unitId &&
    (query.kind === "unitFeatureOrSupportProfile" ||
      query.supportKinds.has(unitSupportProfileKind(binding.procedure.profile)))
      ? [binding.procedureRef]
      : [],
  );
}

function unitSupportProfileKind(
  profile: BattleUnitSupportProfile,
): UnitSupportProfileKind {
  return (
    typeof profile === "string" ? profile : profile.kind
  ) as UnitSupportProfileKind;
}

export function characterUnitProcedureId(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  query: CharacterUnitProcedureQuery,
): UnitRecord["id"] | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding?.procedure.kind === "unitFeature" &&
    query.kind === "unitFeatureOrSupportProfile"
    ? binding.procedure.profile.unit.id
    : binding?.procedure.kind === "unitSupportProfile"
      ? query.kind === "unitFeatureOrSupportProfile" ||
        query.supportKinds.has(
          unitSupportProfileKind(binding.procedure.profile),
        )
        ? binding.procedure.unitId
        : undefined
      : undefined;
}

export function characterUnitFeatureProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): SupportedUnitFeatureProfile | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding?.procedure.kind === "unitFeature"
    ? binding.procedure.profile
    : undefined;
}

export function characterSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      sameSpellInvocationOccurrence(binding.procedure.invocation, invocation),
  )?.procedureRef;
}

function sameSpellInvocationOccurrence(
  left: SupportedSpellInvocation,
  right: SupportedSpellInvocation,
): boolean {
  if (
    !sameSpellInvocationRef(
      supportedSpellInvocationRef(left),
      supportedSpellInvocationRef(right),
    )
  ) {
    return false;
  }
  const leftEffectOccurrenceId = spellInvocationEffectOccurrenceId(left);
  const rightEffectOccurrenceId = spellInvocationEffectOccurrenceId(right);
  if (
    leftEffectOccurrenceId !== undefined ||
    rightEffectOccurrenceId !== undefined
  ) {
    return leftEffectOccurrenceId === rightEffectOccurrenceId;
  }
  if (
    left.procedure === "spellHostedWeaponAttack" &&
    right.procedure === "spellHostedWeaponAttack"
  ) {
    return left.componentWeapon.itemId === right.componentWeapon.itemId;
  }
  if (
    left.procedure === "weaponAttackOverride" &&
    right.procedure === "weaponAttackOverride"
  ) {
    return left.attachedWeapon.itemId === right.attachedWeapon.itemId;
  }
  return true;
}

function spellInvocationEffectOccurrenceId(
  invocation: SupportedSpellInvocation,
): string | undefined {
  if (!("activeEffect" in invocation)) return undefined;
  const activeEffect: unknown = invocation.activeEffect;
  if (typeof activeEffect !== "object" || activeEffect === null) {
    return undefined;
  }
  if (
    "sourceEffectId" in activeEffect &&
    typeof activeEffect.sourceEffectId === "string"
  ) {
    return activeEffect.sourceEffectId;
  }
  return "effectId" in activeEffect && typeof activeEffect.effectId === "string"
    ? activeEffect.effectId
    : undefined;
}

export function characterSpellProcedureRefForInvocationRef(
  execution: CharacterExecutionState,
  invocationRef: SpellInvocationRef,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find(
    (binding) =>
      binding.procedure.kind === "spellInvocation" &&
      sameSpellInvocationRef(
        supportedSpellInvocationRef(binding.procedure.invocation),
        invocationRef,
      ),
  )?.procedureRef;
}

export function characterSpellProcedure(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
  currentInvocations: readonly SupportedSpellInvocation[],
): SupportedSpellInvocation | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  if (binding?.procedure.kind !== "spellInvocation") return undefined;
  const boundInvocation = binding.procedure.invocation;
  return currentInvocations.find((invocation) =>
    sameSpellInvocationOccurrence(boundInvocation, invocation),
  );
}
