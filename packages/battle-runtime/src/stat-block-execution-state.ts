import { optionalProperty } from "./optional-property.ts";
import {
  resourceCount,
  type DieRollResult,
  type ReadonlyNonEmptyArray,
  type ResourceCount,
} from "@dnd/shared/types";
import type { Ability, CreatureType } from "@dnd/shared/game-facts";
import { Brand } from "effect";
import type {
  ChallengeRating,
  CreatureLimitedUse,
  CreatureSense,
  CreatureImmunityList,
  CreatureSavingThrowModifier,
  CreatureSkillModifier,
  SixAbilityScores,
  StatBlockLiteralValue,
  StatBlockTextOnlyReason,
  CreatureResistanceList,
  CreatureVulnerabilityList,
  StatBlockId,
  StatBlockProcedureOrdinal,
} from "@dnd/surface/surface/types";
import type { Size } from "@dnd/shared/types";
import type {
  StatBlockAttackActionOption,
  StatBlockAttackSection,
  StatBlockTraitAttackRollMode,
  SupportedCreatureAttackRollMechanics,
  SupportedStaticDamageCreatureAttackRollMechanics,
} from "./battle-action-options.ts";
import type { SupportedStatBlockBonusActionStandardAction } from "./battle-reducer/battle-runtime-protocol.ts";
import {
  statBlockAttackDamageRequiresRoll,
  statBlockAttackDamageSupportsStaticNotation,
  supportedStatBlockAttackDamage,
} from "./statblock-attack-damage-support.ts";
import type {
  BattleResourcePoolExecutionRef,
  BattleStatBlockExecutionScopeRef,
  BattleStatBlockProcedureExecutionRef,
} from "./identity.ts";

export type BattleStatBlockExecutionSource = {
  readonly id: StatBlockId;
  readonly challengeRating: ChallengeRating;
  /** Parsed, source-free facts consumed by runtime admission. */
  readonly statBlock: BattleStatBlockRuntimeFacts;
  /** Ordered executable bindings produced by the authored projection. */
  readonly procedures: readonly BattleStatBlockRuntimeProcedure[];
  readonly resources?: readonly BattleStatBlockRuntimeResource[];
  readonly legendaryActionUses?: number;
};

/** The sole negative procedure ordinal is reserved for the runtime Unarmed Strike. */
export const UNARMED_STRIKE_PROCEDURE_ORDINAL = -1 as const;

export type BattleStatBlockRuntimeResource = {
  readonly ordinal: number;
  readonly ownership: "shared" | "each";
  readonly limit:
    | { readonly kind: "daily"; readonly uses: number }
    | { readonly kind: "recharge"; readonly minimumRoll: number }
    | { readonly kind: "recharge_after_rest" };
};

export type BattleStatBlockRuntimeMultiattackDispatch = {
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly count: number;
  readonly target:
    | { readonly kind: "attack" }
    | {
        readonly kind: "unsupported";
        readonly reason: "nonExecutableTarget";
      };
};

export type BattleStatBlockRuntimeFacts = {
  readonly size: Size;
  readonly creatureType: CreatureType;
  readonly ac: StatBlockLiteralValue;
  readonly hp: StatBlockLiteralValue;
  readonly speeds: readonly BattleStatBlockRuntimeSpeed[];
  readonly abilityScores: SixAbilityScores;
  readonly initiativeModifier: number;
  readonly initiativeScore: number;
  readonly passivePerception: number;
  readonly savingThrowModifiers?: readonly CreatureSavingThrowModifier[];
  readonly skillModifiers?: readonly CreatureSkillModifier[];
  readonly saveProficiencies?: readonly Ability[];
  readonly vulnerabilities?: CreatureVulnerabilityList;
  readonly resistances?: CreatureResistanceList;
  readonly immunities?: CreatureImmunityList;
  readonly senses?: readonly BattleStatBlockRuntimeSense[];
};

export type BattleStatBlockRuntimeSpeed = {
  readonly kind: "walk" | "burrow" | "climb" | "fly" | "swim";
  readonly feet: StatBlockLiteralValue;
  readonly hover?: true;
};

export type BattleStatBlockRuntimeSense = {
  readonly kind: CreatureSense["kind"];
  readonly rangeFeet: number;
  readonly qualifier?: "unimpeded_by_magical_darkness";
};

export type BattleStatBlockRuntimeProcedure =
  | {
      readonly kind: "attack";
      readonly section: Extract<
        StatBlockAttackSection,
        "actions" | "legendaryActions"
      >;
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly attack: SupportedCreatureAttackRollMechanics;
      readonly resourceRefs: readonly number[];
      readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
    }
  | {
      readonly kind: "multiattack";
      readonly section: "actions";
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly dispatches: ReadonlyNonEmptyArray<BattleStatBlockRuntimeMultiattackDispatch>;
      readonly resourceRefs: readonly number[];
    }
  | {
      readonly kind: "bonusActionOption";
      readonly section: "bonusActions";
      readonly procedureOrdinal: StatBlockProcedureOrdinal;
      readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
      readonly resourceRefs: readonly number[];
    };

export type StatBlockActionProjectionSection =
  | "actions"
  | "bonusActions"
  | "reactions"
  | "legendaryActions";

export type StatBlockActionProjectionShape =
  | "attack"
  | "multiattack"
  | "save"
  | "support"
  | "actionOption"
  | "special";

/**
 * A represented Stat Block shape that the generic battle projection leaves as
 * text-only. The issue carries no authored label or record identity; callers
 * at the presentation boundary may join those facts separately.
 */
export type StatBlockProjectionIssue =
  | {
      readonly tag: "statBlockProjectionIssue";
      readonly source: {
        readonly kind: "trait";
        readonly nonExecutableReason:
          | "textOnlyTrait"
          | "unsupportedTraitEffect";
      };
    }
  | {
      readonly tag: "statBlockProjectionIssue";
      readonly source: {
        readonly kind: "action";
        readonly section: StatBlockActionProjectionSection;
        readonly shape: StatBlockActionProjectionShape;
        readonly nonExecutableReason:
          | "unsupportedActionShape"
          | StatBlockTextOnlyReason;
      };
    };

export type StatBlockAttackProcedure = {
  readonly kind: "attack";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly section: Extract<
    StatBlockAttackSection,
    "actions" | "legendaryActions"
  >;
  readonly attack: SupportedCreatureAttackRollMechanics;
  readonly traitAttackRollModes?: ReadonlyNonEmptyArray<StatBlockTraitAttackRollMode>;
};

/** Runtime-injected Unarmed Strike; authored procedure ordinals remain positive. */
export type StatBlockUnarmedStrikeProcedure = {
  readonly kind: "unarmedStrike";
  readonly procedureOrdinal: typeof UNARMED_STRIKE_PROCEDURE_ORDINAL;
  readonly section: "actions";
  readonly attack: SupportedCreatureAttackRollMechanics;
};

export type StatBlockMultiattackProcedure = {
  readonly kind: "multiattack";
  readonly section: "actions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly dispatchProcedureRefs: ReadonlyNonEmptyArray<BattleStatBlockProcedureExecutionRef>;
};

export type StatBlockUnsupportedProcedure = {
  readonly kind: "unsupported";
  readonly section: "actions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly reason: "unsupportedMultiattackDispatch";
  readonly dispatches: ReadonlyNonEmptyArray<BattleStatBlockRuntimeMultiattackDispatch>;
};

export type StatBlockBonusActionOptionProcedure = {
  readonly kind: "bonusActionOption";
  readonly section: "bonusActions";
  readonly procedureOrdinal: StatBlockProcedureOrdinal;
  readonly standardActions: ReadonlyNonEmptyArray<SupportedStatBlockBonusActionStandardAction>;
};

export type StatBlockProcedure =
  | StatBlockAttackProcedure
  | StatBlockUnarmedStrikeProcedure
  | StatBlockMultiattackProcedure
  | StatBlockBonusActionOptionProcedure
  | StatBlockUnsupportedProcedure;

export type StatBlockProcedureBindingFor<
  TProcedure extends StatBlockProcedure,
> = {
  readonly procedureRef: BattleStatBlockProcedureExecutionRef;
  readonly resourcePoolRefs: readonly BattleResourcePoolExecutionRef[];
  readonly procedure: TProcedure;
};

export type StatBlockProcedureBinding =
  StatBlockProcedureBindingFor<StatBlockProcedure>;
export type StatBlockProcedureBindingSnapshot = StatBlockProcedureBinding;

export type StatBlockResourcePoolState =
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "daily";
      readonly ownership: "shared" | "each";
      readonly usesMax: ResourceCount;
      readonly usesRemaining: ResourceCount;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "recharge";
      readonly ownership: "shared" | "each";
      readonly minimumRoll: Extract<
        CreatureLimitedUse,
        { readonly kind: "recharge" }
      >["minimumRoll"];
      readonly available: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "recharge_after_rest";
      readonly ownership: "shared" | "each";
      readonly available: boolean;
    }
  | {
      readonly resourcePoolRef: BattleResourcePoolExecutionRef;
      readonly kind: "legendaryActions";
      readonly usesMax: ResourceCount;
      readonly usesRemaining: ResourceCount;
    };

export type StatBlockExecutionSnapshot = {
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly procedureBindings: readonly StatBlockProcedureBindingSnapshot[];
  readonly resourcePools: readonly StatBlockResourcePoolState[];
};

type StatBlockExecutionStateData = {
  readonly scopeRef: BattleStatBlockExecutionScopeRef;
  readonly procedureBindings: readonly StatBlockProcedureBinding[];
  readonly resourcePools: readonly StatBlockResourcePoolState[];
};
export type StatBlockExecutionState = StatBlockExecutionStateData &
  Brand.Brand<"AdmittedStatBlockExecutionState">;

const AdmittedStatBlockExecutionState =
  Brand.nominal<StatBlockExecutionState>();

export function admittedStatBlockExecutionState(
  data: StatBlockExecutionStateData,
): StatBlockExecutionState {
  return AdmittedStatBlockExecutionState(data);
}

export type StatBlockExecutionAdmission<
  TStatBlock extends BattleStatBlockExecutionSource =
    BattleStatBlockExecutionSource,
> = {
  readonly statBlock: TStatBlock;
  readonly execution: StatBlockExecutionState;
} & Brand.Brand<"StatBlockExecutionAdmission">;

export function statBlockAttackActionOptions(
  execution: StatBlockExecutionState,
): readonly StatBlockAttackActionOption[] {
  return execution.procedureBindings.flatMap((binding) => {
    if (
      binding.procedure.kind !== "attack" &&
      binding.procedure.kind !== "unarmedStrike"
    ) {
      return [];
    }
    const attack = binding.procedure.attack;
    const damage = supportedStatBlockAttackDamage(attack);
    const traitAttackRollModes =
      binding.procedure.kind === "attack"
        ? binding.procedure.traitAttackRollModes
        : undefined;
    const base = {
      kind: "statBlockAttack" as const,
      procedureRef: binding.procedureRef,
      attack,
      ...optionalProperty("traitAttackRollModes", traitAttackRollModes),
    };
    return [
      ...(statBlockAttackDamageRequiresRoll(damage)
        ? [{ ...base, damageNotation: "rolled" as const }]
        : []),
      ...(statBlockAttackSupportsStaticDamageNotation(attack)
        ? [{ ...base, attack, damageNotation: "static" as const }]
        : []),
    ];
  });
}

function statBlockAttackSupportsStaticDamageNotation(
  attack: SupportedCreatureAttackRollMechanics,
): attack is SupportedStaticDamageCreatureAttackRollMechanics {
  return statBlockAttackDamageSupportsStaticNotation(
    supportedStatBlockAttackDamage(attack),
  );
}

export function statBlockProcedureBinding(
  execution: StatBlockExecutionState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): StatBlockProcedureBinding | undefined {
  return execution.procedureBindings.find(
    (binding) => binding.procedureRef === procedureRef,
  );
}

export function statBlockExecutionSnapshot(
  execution: StatBlockExecutionState,
): StatBlockExecutionSnapshot {
  return {
    scopeRef: execution.scopeRef,
    procedureBindings: execution.procedureBindings,
    resourcePools: execution.resourcePools,
  };
}

export function statBlockProcedureResourcesAvailable(
  execution: StatBlockExecutionState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): boolean {
  const binding = statBlockProcedureBinding(execution, procedureRef);
  return (
    binding !== undefined &&
    binding.resourcePoolRefs.every((resourcePoolRef) => {
      const pool = statBlockResourcePool(execution, resourcePoolRef);
      return pool !== undefined && resourcePoolAvailable(pool);
    })
  );
}

export function spendStatBlockProcedureResources(
  execution: StatBlockExecutionState,
  procedureRef: BattleStatBlockProcedureExecutionRef,
): StatBlockExecutionState {
  const binding = statBlockProcedureBinding(execution, procedureRef);
  if (
    binding === undefined ||
    !statBlockProcedureResourcesAvailable(execution, procedureRef)
  ) {
    return execution;
  }
  const ownedPoolRefs = new Set(binding.resourcePoolRefs);
  return admittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) =>
      ownedPoolRefs.has(pool.resourcePoolRef) ? spendResourcePool(pool) : pool,
    ),
  });
}

export function refreshStatBlockStartTurnExecution(
  execution: StatBlockExecutionState,
): StatBlockExecutionState {
  return admittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) =>
      pool.kind === "legendaryActions"
        ? { ...pool, usesRemaining: pool.usesMax }
        : pool,
    ),
  });
}

export function unavailableStatBlockRechargePoolRefs(
  execution: StatBlockExecutionState,
): readonly BattleResourcePoolExecutionRef[] {
  return execution.resourcePools.flatMap((pool) =>
    pool.kind === "recharge" && !pool.available ? [pool.resourcePoolRef] : [],
  );
}

export function applyStatBlockRechargeRolls(
  execution: StatBlockExecutionState,
  rolls: readonly {
    readonly target: BattleResourcePoolExecutionRef;
    readonly roll: DieRollResult;
  }[],
): StatBlockExecutionState {
  const rollsByTarget = new Map(rolls.map((roll) => [roll.target, roll.roll]));
  return admittedStatBlockExecutionState({
    ...execution,
    resourcePools: execution.resourcePools.map((pool) => {
      if (pool.kind !== "recharge" || pool.available) return pool;
      const roll = rollsByTarget.get(pool.resourcePoolRef);
      return roll !== undefined && roll >= pool.minimumRoll
        ? { ...pool, available: true }
        : pool;
    }),
  });
}

function statBlockResourcePool(
  execution: StatBlockExecutionState,
  resourcePoolRef: BattleResourcePoolExecutionRef,
): StatBlockResourcePoolState | undefined {
  return execution.resourcePools.find(
    (pool) => pool.resourcePoolRef === resourcePoolRef,
  );
}

function resourcePoolAvailable(pool: StatBlockResourcePoolState): boolean {
  return pool.kind === "daily" || pool.kind === "legendaryActions"
    ? pool.usesRemaining > 0
    : pool.available;
}

function spendResourcePool(
  pool: StatBlockResourcePoolState,
): StatBlockResourcePoolState {
  if (pool.kind === "daily" || pool.kind === "legendaryActions") {
    return {
      ...pool,
      usesRemaining: resourceCount(Number(pool.usesRemaining) - 1),
    };
  }
  return { ...pool, available: false };
}

export function statBlockMultiattackBindings(
  execution: StatBlockExecutionState,
): readonly StatBlockProcedureBindingFor<StatBlockMultiattackProcedure>[] {
  return execution.procedureBindings.filter(
    (
      binding,
    ): binding is StatBlockProcedureBindingFor<StatBlockMultiattackProcedure> =>
      binding.procedure.kind === "multiattack",
  );
}

export function statBlockBonusActionOptionBindings(
  execution: StatBlockExecutionState,
): readonly StatBlockProcedureBindingFor<StatBlockBonusActionOptionProcedure>[] {
  return execution.procedureBindings.filter(
    (
      binding,
    ): binding is StatBlockProcedureBindingFor<StatBlockBonusActionOptionProcedure> =>
      binding.procedure.kind === "bonusActionOption",
  );
}
