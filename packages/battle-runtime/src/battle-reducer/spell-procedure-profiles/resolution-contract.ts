import type {
  ActionSpellBattleResolutionInput,
  BonusActionDashSpellBattleResolutionInput,
  BonusActionSpellBattleResolutionInput,
  BattleCreatureState,
  BattleFill,
  BattleInterruptCheckpoint,
  BattleResolutionInputForSubject,
  BattleState,
  GlyphStoredSpellReleaseReplayContext,
} from "../../battle-state-execution.ts";
import type { BattleInterruptTrigger } from "../../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resource-execution.ts";
import type {
  SpellExecutionClassForProcedure,
  SpellProcedureActionCost,
  SpellProcedureAcceptingActionCostOverride,
  SpellProcedureAcceptingMetamagicApplications,
  SpellProcedureExecutionsWithActionCost,
  SpellProcedureExecutionsWithoutActionCost,
  SpellProcedureWithQuickenedActionCostRewrite,
} from "../spell-execution-facts.ts";
import type {
  BattleSpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
  SpellProcedureKey,
} from "../../character-execution.ts";
import type {
  BattleProcedureExecutionRef,
  CombatantId,
} from "../../identity.ts";
import type { ChainedSpellFillSet } from "../spells-resolve-chained.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type { WeaponAttackOverrideFillInput } from "../weapon-attack-override-fill-input.ts";
import type {
  GlyphStoredAreaControlInvocation,
  GlyphStoredAreaControlProcedure,
  GlyphStoredAreaOngoingProcedure,
  GlyphStoredConcentrationSelfTransformationInvocation,
  GlyphStoredConcentrationSingleCreatureActiveEffectInvocation,
  GlyphStoredSelfTransformationProcedure,
  GlyphStoredSingleCreatureActiveEffectProcedure,
  GlyphStoredSpellInvocation,
} from "../../glyph-stored-spell-invocation.ts";
import type { StoredGlyphAreaOngoingSpellInvocation } from "../spells-resolve-area-effects.ts";

type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;
type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AttackHitDamageReplayFrame =
  import("../../battle-state-execution.ts").BattleAttackHitReplayCheckpoint;
type AttackHitDamageResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly frame: AttackHitDamageReplayFrame;
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  };
type AttackHitSaveGatedConditionResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger;
  };
type TriggeredReactionSpellResolutionInput = BattleResolutionInputForSubject<
  Extract<
    BattleSubject,
    {
      readonly tag: "runtimeCommand";
      readonly command: "castTriggeredReactionSpell";
    }
  >
> & {
  readonly frame: BattleInterruptCheckpoint;
};

type SpellProcedureActionCostResolutionInput<P extends SpellProcedureKey> = [
  Exclude<SpellProcedureActionCost<P>, "magicAction" | "bonusAction">,
] extends [never]
  ?
      | ([Extract<SpellProcedureActionCost<P>, "magicAction">] extends [never]
          ? never
          : ActionSpellBattleResolutionInput)
      | ([Extract<SpellProcedureActionCost<P>, "bonusAction">] extends [never]
          ? never
          : BonusActionSpellBattleResolutionInput)
  : never;

type SpellProcedureExecutionClassResolutionInput<P extends SpellProcedureKey> =
  SpellExecutionClassForProcedure<P> extends "bonusActionCast"
    ? BonusActionSpellBattleResolutionInput
    : SpellExecutionClassForProcedure<P> extends "actionCast" | "actionCostCast"
      ? ActionSpellBattleResolutionInput
      : never;

export type HypnoticPatternStoredGlyphRelease = {
  readonly kind: "storedGlyphSpellRelease";
  readonly selfOriginAreaAnchorId: CombatantId;
};

type OrdinarySpellProcedureResolutionOptions<P extends SpellProcedureKey> =
  (P extends SpellProcedureAcceptingActionCostOverride
    ? { readonly actionCostOverride?: "magicAction" | "bonusAction" }
    : { readonly actionCostOverride?: never }) &
    (P extends SpellProcedureAcceptingMetamagicApplications
      ? {
          readonly metamagicApplications: readonly SpellMetamagicApplicationFact[];
        }
      : { readonly metamagicApplications?: never });

type SpellProcedureResolutionOptions<P extends SpellProcedureKey> =
  P extends "hypnoticPattern"
    ?
        | {
            readonly metamagicApplications: readonly CharacterBattleMetamagicOptionFact[];
            readonly storedGlyphRelease?: never;
          }
        | {
            readonly metamagicApplications?: never;
            readonly storedGlyphRelease: HypnoticPatternStoredGlyphRelease;
          }
    : P extends GlyphStoredSingleCreatureActiveEffectProcedure
      ?
          | (OrdinarySpellProcedureResolutionOptions<P> & {
              readonly storedGlyphRelease?: never;
            })
          | {
              readonly actionCostOverride?: never;
              readonly metamagicApplications?: never;
              readonly storedGlyphRelease: {
                readonly kind: "storedGlyphSpellRelease";
              };
            }
      : OrdinarySpellProcedureResolutionOptions<P>;

export type SpellProcedureResolutionInput<P extends SpellProcedureKey> =
  P extends "persistentArmorEffect"
    ? ActionSpellBattleResolutionInput & { readonly castingState: BattleState }
    : P extends "counterspell" | "shieldReaction" | "featherFallMitigation"
      ? TriggeredReactionSpellResolutionInput
      : P extends
            | "afterHitDamage"
            | "afterHitDamageAndIllumination"
            | "afterHitTimedDamageAndSave"
        ? AttackHitDamageResolutionInput
        : P extends "afterHitSaveGatedCondition"
          ? AttackHitSaveGatedConditionResolutionInput
          : P extends "expeditiousRetreatDash"
            ? BonusActionDashSpellBattleResolutionInput
            : P extends SpellProcedureWithQuickenedActionCostRewrite
              ?
                  | ActionSpellBattleResolutionInput
                  | BonusActionSpellBattleResolutionInput
              : [SpellProcedureExecutionsWithActionCost<P>] extends [never]
                ? SpellProcedureExecutionClassResolutionInput<P>
                :
                    | SpellProcedureActionCostResolutionInput<P>
                    | ([SpellProcedureExecutionsWithoutActionCost<P>] extends [
                        never,
                      ]
                        ? never
                        : SpellProcedureExecutionClassResolutionInput<P>);

export type SpellProcedureResolutionFillSet<P extends SpellProcedureKey> =
  P extends "afterHitSaveGatedCondition"
    ? readonly BattleFill[]
    : P extends "weaponAttackOverride"
      ? WeaponAttackOverrideFillInput
      : P extends "chainedSpellAttackDamage"
        ? ChainedSpellFillSet
        : OkSpellFillSet;

type OrdinarySpellProcedureExecutionResolution<P extends SpellProcedureKey> =
  SpellProcedureResolutionOptions<P> & {
    readonly input: SpellProcedureResolutionInput<P>;
    readonly actorId: CombatantId;
    readonly invocation: BattleSpellProcedureExecution<
      SpellProcedureExecutionByProcedure[P]
    >;
    readonly fillSet: SpellProcedureResolutionFillSet<P>;
  };

type StoredGlyphExecution<Invocation extends GlyphStoredSpellInvocation> =
  BattleSpellProcedureExecution<Invocation>;

type StoredGlyphOrdinaryReleaseInvocation = Exclude<
  GlyphStoredSpellInvocation,
  {
    readonly procedure:
      | GlyphStoredAreaControlProcedure
      | GlyphStoredAreaOngoingProcedure
      | GlyphStoredSelfTransformationProcedure
      | GlyphStoredSingleCreatureActiveEffectProcedure
      | "saveGatedDamage"
      | "saveGatedCondition"
      | "greaseGroundHazard";
  }
>;

type StoredGlyphSaveGatedDamageInvocation = Extract<
  GlyphStoredSpellInvocation,
  { readonly procedure: "saveGatedDamage" }
>;
type StoredGlyphSaveGatedDamageExecution =
  BattleSpellProcedureExecution<StoredGlyphSaveGatedDamageInvocation>;
type StoredGlyphSaveGatedDamageDuration =
  StoredGlyphSaveGatedDamageExecution["spellRuleFacts"]["duration"];
type StoredGlyphConcentrationDuration = Extract<
  StoredGlyphSaveGatedDamageDuration,
  { readonly kind: "concentration" }
>;
type StoredGlyphNonConcentrationDuration = Exclude<
  StoredGlyphSaveGatedDamageDuration,
  StoredGlyphConcentrationDuration
>;
type StoredGlyphSaveGatedDamageExecutionWithDuration<
  Duration extends StoredGlyphSaveGatedDamageDuration,
> = StoredGlyphSaveGatedDamageExecution & {
  readonly spellRuleFacts: StoredGlyphSaveGatedDamageExecution["spellRuleFacts"] & {
    readonly duration: Duration;
  };
};
type StoredGlyphAreaSaveGatedDamageTargeting = Extract<
  StoredGlyphSaveGatedDamageExecution["targeting"],
  {
    readonly kind:
      | "pointOriginSphere"
      | "pointOriginSphereDiameter"
      | "pointOriginCylinder"
      | "pointOriginCubeExcludingCaster"
      | "pointOriginCube"
      | "selfOriginCube"
      | "selfOriginCone"
      | "selfOriginLine"
      | "selfOriginEmanation"
      | "primaryTargetOriginEmanation";
  }
>;
export type StoredGlyphReadiedAreaSaveGatedDamageExecution =
  StoredGlyphSaveGatedDamageExecutionWithDuration<StoredGlyphNonConcentrationDuration> & {
    readonly targeting: StoredGlyphAreaSaveGatedDamageTargeting;
  };
type StoredGlyphSingleCreatureSaveGatedDamageTargeting =
  | Extract<
      StoredGlyphSaveGatedDamageExecution["targeting"],
      { readonly kind: "singleCombatant" | "singleCreatureOrObject" }
    >
  | (Extract<
      StoredGlyphSaveGatedDamageExecution["targeting"],
      { readonly kind: "targetList" }
    > & {
      readonly minTargets: 1;
      readonly maxTargets: 1;
    });
export type StoredGlyphReadiedCreatureSaveGatedDamageExecution =
  StoredGlyphSaveGatedDamageExecutionWithDuration<StoredGlyphNonConcentrationDuration> & {
    readonly targeting: StoredGlyphSingleCreatureSaveGatedDamageTargeting;
  };
export type StoredGlyphConcentrationSaveGatedDamageExecution =
  StoredGlyphSaveGatedDamageExecutionWithDuration<StoredGlyphConcentrationDuration> & {
    readonly targeting: StoredGlyphSingleCreatureSaveGatedDamageTargeting;
  };

export type StoredGlyphSpellReleasePlan =
  | {
      readonly kind: "areaOngoing";
      readonly invocation: StoredGlyphAreaOngoingSpellInvocation & {
        readonly sourceProcedureRef: BattleProcedureExecutionRef;
      };
      readonly anchorId: CombatantId;
    }
  | {
      readonly kind: "areaControl";
      readonly invocation: BattleSpellProcedureExecution<GlyphStoredAreaControlInvocation>;
      readonly anchorId: CombatantId;
      readonly replayContext: GlyphStoredSpellReleaseReplayContext;
    }
  | {
      readonly kind: "greaseGroundHazard";
      readonly invocation: StoredGlyphExecution<
        Extract<
          GlyphStoredSpellInvocation,
          { readonly procedure: "greaseGroundHazard" }
        >
      >;
    }
  | {
      readonly kind: "saveGatedCondition";
      readonly invocation: StoredGlyphExecution<
        Extract<
          GlyphStoredSpellInvocation,
          { readonly procedure: "saveGatedCondition" }
        >
      >;
    }
  | {
      readonly kind: "fullDurationSaveGatedDamage";
      readonly invocation: StoredGlyphConcentrationSaveGatedDamageExecution;
    }
  | {
      readonly kind: "singleCreatureActiveEffect";
      readonly invocation: StoredGlyphExecution<GlyphStoredConcentrationSingleCreatureActiveEffectInvocation>;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "selfTransformation";
      readonly invocation: StoredGlyphExecution<GlyphStoredConcentrationSelfTransformationInvocation>;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "ordinaryTriggeringCreature";
      readonly invocation:
        | StoredGlyphExecution<StoredGlyphOrdinaryReleaseInvocation>
        | StoredGlyphReadiedCreatureSaveGatedDamageExecution;
      readonly targetId: CombatantId;
    }
  | {
      readonly kind: "ordinaryArea";
      readonly invocation: StoredGlyphReadiedAreaSaveGatedDamageExecution;
      readonly anchorId: CombatantId;
    };

export type StoredGlyphSpellProcedureResolution = {
  readonly input: ActionSpellBattleResolutionInput;
  readonly actorId: CombatantId;
  readonly fillSet: OkSpellFillSet;
  readonly release: StoredGlyphSpellReleasePlan;
};

type TriggeredReactionSaveGatedDamageExecution =
  SpellProcedureExecutionByProcedure["saveGatedDamage"] & {
    readonly access: { readonly tag: "prepared" };
    readonly castingTime: { readonly kind: "reaction" };
    readonly resource: { readonly tag: "spellSlot" };
  };

export type TriggeredReactionSaveGatedDamageResolution = {
  readonly input: TriggeredReactionSpellResolutionInput;
  readonly actorId: CombatantId;
  readonly invocation: BattleSpellProcedureExecution<TriggeredReactionSaveGatedDamageExecution>;
  readonly fillSet: OkSpellFillSet;
};

type SpellProcedureDeclarationResolutionFor<P extends SpellProcedureKey> =
  P extends "saveGatedDamage"
    ?
        | OrdinarySpellProcedureExecutionResolution<P>
        | TriggeredReactionSaveGatedDamageResolution
    : OrdinarySpellProcedureExecutionResolution<P>;

export type SpellProcedureDeclarationResolution<
  P extends SpellProcedureKey = SpellProcedureKey,
> = { [Procedure in P]: SpellProcedureDeclarationResolutionFor<Procedure> }[P];

export type SpellProcedureExecutionResolution<
  P extends SpellProcedureKey = SpellProcedureKey,
> = SpellProcedureDeclarationResolution<P>;
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
