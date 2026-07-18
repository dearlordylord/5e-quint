import { Brand } from "effect";
import * as Either from "effect/Either";
import type { CharacterBattleClassLevel } from "./character-class-level.ts";
import {
  NonNegativeInteger,
  type ReadonlyNonEmptyArray,
} from "@dnd/shared/types";
import type { UnitRecord } from "@dnd/surface/surface/types";
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
  BONUS_ACTION_DASH_TEMPORARY_HIT_POINTS_SUPPORT_PROFILE,
  BONUS_ACTION_DELEGATED_STANDARD_ACTIONS_SUPPORT_PROFILE,
  DRUID_WILD_SHAPE_KNOWN_FORM_SUPPORT_PROFILE,
  MONK_FOCUS_BATTLE_OPTIONS_SUPPORT_PROFILE,
  type BattleUnitSupportProfile,
  type BattleUnitSupportProfileIssue,
  type SupportedUnitFeatureProfile,
  battleUnitSupportProfilesForUnit,
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

type CharacterUnitProcedureKind =
  | UnitSupportProfileKind
  | UnitSupportProfileKind<SupportedUnitFeatureProfile>;

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
        readonly supportKind: UnitSupportProfileKind;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly unitId: UnitRecord["id"];
        readonly supportKind: CharacterUnitProcedureKind;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly invocation: SupportedSpellInvocation;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
        readonly occurrence: SpellInvocationOccurrence;
      };
    };

export function characterProcedureBinding(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): CharacterProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
}

export type SpellInvocationOccurrence = {
  readonly invocationRef: SpellInvocationRef;
} & (
  | { readonly kind: "invocationRefOnly" }
  | { readonly kind: "activeEffect"; readonly effectId: string }
  | { readonly kind: "componentWeapon"; readonly itemId: string }
  | { readonly kind: "attachedWeapon"; readonly itemId: string }
);

export type CharacterProcedureBindingSnapshot =
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitFeature";
        readonly unitId: UnitRecord["id"];
        readonly supportKind: CharacterUnitProcedureKind;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unitSupportProfile";
        readonly unitId: UnitRecord["id"];
        readonly supportKind: UnitSupportProfileKind;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "spellInvocation";
        readonly invocation: SupportedSpellInvocation;
      };
    }
  | {
      readonly procedureRef: BattleProcedureExecutionRef;
      readonly procedure: {
        readonly kind: "unavailableSpellInvocation";
        readonly occurrence: SpellInvocationOccurrence;
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
  readonly unitFeatureProfiles: readonly SupportedUnitFeatureProfile[];
  readonly units: readonly UnitRecord[];
  readonly unitRefs: readonly BattleUnitRef[];
  readonly classLevels: readonly CharacterBattleClassLevel[];
}): Either.Either<
  CharacterExecutionState,
  ReadonlyNonEmptyArray<BattleUnitSupportProfileIssue>
> {
  const scopeRef = battleCharacterExecutionScopeRef(
    input.battleId,
    input.combatantId,
    input.scopeOrdinal,
  );
  const unitProcedures = [
    ...new Map(
      input.unitFeatureProfiles.map((profile) => [profile.unit.id, profile]),
    ).values(),
  ];
  const unitBindings = unitProcedures.map((profile, ordinal) => ({
    procedureRef: battleProcedureExecutionRef(
      scopeRef,
      NonNegativeInteger(ordinal),
    ),
    procedure: {
      kind: "unitFeature" as const,
      unitId: profile.unit.id,
      supportKind: profile.kind,
    },
  }));
  const derivedUnitSupportProcedures: Array<{
    readonly unitId: UnitRecord["id"];
    readonly profile: BattleUnitSupportProfile;
  }> = [];
  const supportProfileIssues: BattleUnitSupportProfileIssue[] = [];
  for (const unit of input.units) {
    const profiles = battleUnitSupportProfilesForUnit({
      unit,
      classLevels: input.classLevels,
    });
    if (Either.isLeft(profiles)) {
      supportProfileIssues.push(profiles.left);
      continue;
    }
    derivedUnitSupportProcedures.push(
      ...profiles.right.map((profile) => ({ unitId: unit.id, profile })),
    );
  }
  if (supportProfileIssues.length > 0) {
    const [firstIssue, ...remainingIssues] = supportProfileIssues;
    return Either.left([firstIssue, ...remainingIssues]);
  }
  const explicitUnitSupportProcedures = input.unitRefs.flatMap((unitRef) =>
    unitRef.supportProfiles.map((profile) => ({
      unitId: unitRef.unitId,
      profile,
    })),
  );
  const explicitlyProjectedUnitIds = new Set(
    explicitUnitSupportProcedures.map((procedure) => procedure.unitId),
  );
  const unitSupportProcedures = [
    ...explicitUnitSupportProcedures,
    ...derivedUnitSupportProcedures.filter(
      (procedure) => !explicitlyProjectedUnitIds.has(procedure.unitId),
    ),
  ];
  const unitRefBindings = unitSupportProcedures.map(
    (procedure, offset): CharacterProcedureBinding => ({
      procedureRef: battleProcedureExecutionRef(
        scopeRef,
        NonNegativeInteger(unitBindings.length + offset),
      ),
      procedure: {
        kind: "unitSupportProfile",
        unitId: procedure.unitId,
        supportKind: unitSupportProfileKind(procedure.profile),
      },
    }),
  );
  const procedureBindings = [...unitBindings, ...unitRefBindings];
  return Either.right(
    CharacterExecutionState({
      scopeRef,
      procedureBindings,
    }),
  );
}

export function characterExecutionWithSpellInvocations(
  execution: CharacterExecutionState,
  invocations: readonly SupportedSpellInvocation[],
): CharacterExecutionState {
  let refreshed = false;
  const refreshedBindings = execution.procedureBindings.map((binding) => {
    if (binding.procedure.kind !== "spellInvocation") {
      return binding;
    }
    const occurrence = spellInvocationOccurrence(binding.procedure.invocation);
    const currentInvocation = invocations.find((invocation) =>
      spellInvocationMatchesOccurrence(invocation, occurrence),
    );
    if (currentInvocation === undefined) {
      refreshed = true;
      return {
        ...binding,
        procedure: {
          kind: "unavailableSpellInvocation" as const,
          occurrence,
        },
      };
    }
    if (
      binding.procedure.kind === "spellInvocation" &&
      currentInvocation === binding.procedure.invocation
    ) {
      return binding;
    }
    refreshed = true;
    return {
      ...binding,
      procedure: {
        kind: "spellInvocation" as const,
        invocation: currentInvocation,
      },
    };
  });
  const newInvocations = invocations.filter(
    (invocation) =>
      !refreshedBindings.some(
        (binding) =>
          binding.procedure.kind === "spellInvocation" &&
          spellInvocationMatchesOccurrence(
            invocation,
            spellInvocationOccurrence(binding.procedure.invocation),
          ),
      ),
  );
  const spellBindings = newInvocations.map((invocation, offset) => ({
    procedureRef: battleProcedureExecutionRef(
      execution.scopeRef,
      NonNegativeInteger(refreshedBindings.length + offset),
    ),
    procedure: { kind: "spellInvocation" as const, invocation },
  }));
  if (spellBindings.length === 0 && !refreshed) return execution;
  return CharacterExecutionState({
    scopeRef: execution.scopeRef,
    procedureBindings: [...refreshedBindings, ...spellBindings],
  });
}

export function characterProcedureBindingSnapshots(
  execution: CharacterExecutionState,
): readonly CharacterProcedureBindingSnapshot[] {
  return execution.procedureBindings;
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
    binding.procedure.unitId === unitId
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
      query.supportKinds.has(binding.procedure.supportKind))
      ? [binding.procedureRef]
      : [],
  );
}

export function unitSupportProfileKind(
  profile: BattleUnitSupportProfile,
): UnitSupportProfileKind {
  return typeof profile === "string" ? profile : profile.kind;
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
    ? binding.procedure.unitId
    : binding?.procedure.kind === "unitSupportProfile"
      ? query.kind === "unitFeatureOrSupportProfile" ||
        query.supportKinds.has(binding.procedure.supportKind)
        ? binding.procedure.unitId
        : undefined
      : undefined;
}

export function characterUnitFeatureProcedureId(
  execution: CharacterExecutionState,
  procedureRef: BattleProcedureExecutionRef,
): UnitRecord["id"] | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding?.procedure.kind === "unitFeature"
    ? binding.procedure.unitId
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

export function characterStoredSpellProcedureRef(
  execution: CharacterExecutionState,
  invocation: SupportedSpellInvocation,
): BattleProcedureExecutionRef | undefined {
  return execution.procedureBindings.find((binding) =>
    binding.procedure.kind === "spellInvocation"
      ? sameSpellInvocationOccurrence(binding.procedure.invocation, invocation)
      : binding.procedure.kind === "unavailableSpellInvocation" &&
        spellInvocationMatchesOccurrence(
          invocation,
          binding.procedure.occurrence,
        ),
  )?.procedureRef;
}

function sameSpellInvocationOccurrence(
  left: SupportedSpellInvocation,
  right: SupportedSpellInvocation,
): boolean {
  return spellInvocationMatchesOccurrence(
    right,
    spellInvocationOccurrence(left),
  );
}

function spellInvocationOccurrence(
  invocation: SupportedSpellInvocation,
): SpellInvocationOccurrence {
  const invocationRef = supportedSpellInvocationRef(invocation);
  const effectId = spellInvocationEffectOccurrenceId(invocation);
  if (effectId !== undefined) {
    return { invocationRef, kind: "activeEffect", effectId };
  }
  if (invocation.procedure === "spellHostedWeaponAttack") {
    return {
      invocationRef,
      kind: "componentWeapon",
      itemId: invocation.componentWeapon.itemId,
    };
  }
  if (invocation.procedure === "weaponAttackOverride") {
    return {
      invocationRef,
      kind: "attachedWeapon",
      itemId: invocation.attachedWeapon.itemId,
    };
  }
  return { invocationRef, kind: "invocationRefOnly" };
}

function spellInvocationMatchesOccurrence(
  invocation: SupportedSpellInvocation,
  occurrence: SpellInvocationOccurrence,
): boolean {
  if (
    !sameSpellInvocationRef(
      supportedSpellInvocationRef(invocation),
      occurrence.invocationRef,
    )
  ) {
    return false;
  }
  if (occurrence.kind === "activeEffect") {
    return (
      spellInvocationEffectOccurrenceId(invocation) === occurrence.effectId
    );
  }
  if (occurrence.kind === "componentWeapon") {
    return (
      invocation.procedure === "spellHostedWeaponAttack" &&
      invocation.componentWeapon.itemId === occurrence.itemId
    );
  }
  if (occurrence.kind === "attachedWeapon") {
    return (
      invocation.procedure === "weaponAttackOverride" &&
      invocation.attachedWeapon.itemId === occurrence.itemId
    );
  }
  return (
    invocation.procedure !== "spellHostedWeaponAttack" &&
    invocation.procedure !== "weaponAttackOverride" &&
    spellInvocationEffectOccurrenceId(invocation) === undefined
  );
}

function spellInvocationEffectOccurrenceId(
  invocation: SupportedSpellInvocation,
): string | undefined {
  if ("activeEffect" in invocation) {
    const activeEffect: unknown = invocation.activeEffect;
    if (typeof activeEffect === "object" && activeEffect !== null) {
      if (
        "sourceEffectId" in activeEffect &&
        typeof activeEffect.sourceEffectId === "string"
      ) {
        return activeEffect.sourceEffectId;
      }
      if (
        "effectId" in activeEffect &&
        typeof activeEffect.effectId === "string"
      ) {
        return activeEffect.effectId;
      }
    }
  }
  return undefined;
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
): SupportedSpellInvocation | undefined {
  const binding = execution.procedureBindings.find(
    (candidate) => candidate.procedureRef === procedureRef,
  );
  return binding?.procedure.kind === "spellInvocation"
    ? binding.procedure.invocation
    : undefined;
}
