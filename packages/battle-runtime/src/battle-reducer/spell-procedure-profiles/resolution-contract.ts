import type {
  ActionSpellBattleResolutionInput,
  BonusActionDashSpellBattleResolutionInput,
  BonusActionSpellBattleResolutionInput,
  BattleCreatureState,
  BattleFill,
  BattleInterruptedProcedure,
  BattleInterruptCheckpoint,
  BattleResolutionInputForSubject,
  BattleState,
} from "../../battle-state-execution.ts";
import type { BattleInterruptTrigger } from "../../battle-interrupt-triggers.ts";
import type { BattleSubject } from "../../battle-subjects.ts";
import type { CharacterBattleMetamagicOptionFact } from "../../character-battle-resource-execution.ts";
import type { SpellExecutionClassForProcedure } from "../spell-execution-facts.ts";
import type {
  BattleSpellProcedureExecution,
  SpellProcedureExecutionByProcedure,
  SpellProcedureKey,
} from "../../character-execution.ts";
import type { CombatantId } from "../../identity.ts";
import type { SpellMetamagicApplicationFact } from "../metamagic-support.ts";
import type { ChainedSpellFillSet } from "../spells-resolve-chained.ts";
import type { SpellFillSet } from "../spells-resolve-fill-set.ts";
import type { WeaponAttackOverrideFillInput } from "../weapon-attack-override-fill-input.ts";

type OkSpellFillSet = Extract<SpellFillSet, { readonly tag: "ok" }>;
type AttackHitBonusActionSpellCommandSubject = Extract<
  BattleSubject,
  {
    readonly tag: "runtimeCommand";
    readonly command: "castAttackHitBonusActionSpell";
  }
>;
type AttackHitDamageReplayFrame = Extract<
  BattleInterruptCheckpoint,
  { readonly trigger: "attackHit" }
> & {
  readonly continuation: Extract<
    BattleInterruptedProcedure,
    {
      readonly kind: "replay";
      readonly glyphStoredSpellReleaseReplay?: never;
    }
  >;
};
type AttackHitDamageResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly frame: AttackHitDamageReplayFrame;
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
  };
type AttackHitSaveGatedConditionResolutionInput =
  BattleResolutionInputForSubject<AttackHitBonusActionSpellCommandSubject> & {
    readonly target: BattleCreatureState;
    readonly handledInterruptTrigger?: BattleInterruptTrigger | undefined;
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

export const ACTION_OR_BONUS_ACTION_SPELL_RESOLUTION_PROCEDURES = [
  "rollModifier",
  "directCondition",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "scalarBuff",
  "directHitPointRestoration",
  "saveGatedDamage",
  "saveGatedCondition",
  "saveGatedConditionImmunity",
  "spellAttackDamage",
  "spellAttackSequence",
] as const satisfies ReadonlyArray<SpellProcedureKey>;

export const BONUS_ACTION_ONLY_SPELL_RESOLUTION_PROCEDURES = [
  "heldLight",
  "magicWeaponEnhancement",
  "directConditionRemoval",
  "jumpMovementReplacement",
  "selfTeleport",
  "dragonsBreathInitial",
  "sanctuaryTargetingInterdiction",
  "markedDamageRider",
  "weaponDamageRider",
  "weaponAttackOverride",
  "spellCreatedHeldObject",
  "spellCreatedHeldObjectReEvoke",
  "spiritualWeaponAttackProxy",
  "spiritualWeaponRepeatAttack",
  "objectContactDamageRepeat",
  "dancingLightsReposition",
] as const satisfies ReadonlyArray<SpellProcedureKey>;

export const ACTION_SPELL_RESOLUTION_INCOMPATIBLE_PROCEDURES = [
  ...BONUS_ACTION_ONLY_SPELL_RESOLUTION_PROCEDURES,
  "expeditiousRetreatDash",
  "featherFallMitigation",
  "afterHitDamage",
  "afterHitSaveGatedCondition",
  "afterHitTimedDamageAndSave",
  "afterHitDamageAndIllumination",
  "counterspell",
  "shieldReaction",
] as const satisfies ReadonlyArray<SpellProcedureKey>;

type ActionOrBonusActionProcedure =
  (typeof ACTION_OR_BONUS_ACTION_SPELL_RESOLUTION_PROCEDURES)[number];
type BonusActionProcedure =
  (typeof BONUS_ACTION_ONLY_SPELL_RESOLUTION_PROCEDURES)[number];
const ACTION_COST_OVERRIDE_PROCEDURES = [
  "attackBurstSaveDamage",
  "chainedSpellAttackDamage",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "directCondition",
  "directHitPointRestoration",
  "heldLightHurl",
  "rollModifier",
  "saveGatedCondition",
  "saveGatedConditionImmunity",
  "saveGatedDamage",
  "scalarBuff",
  "spellAttackDamage",
  "spellAttackSequence",
  "spellCreatedHeldObjectAttack",
] as const satisfies ReadonlyArray<SpellProcedureKey>;

const METAMAGIC_APPLICATION_PROCEDURES = [
  ...ACTION_COST_OVERRIDE_PROCEDURES,
  "command",
  "greaseGroundHazard",
  "gustOfWindLine",
  "hideousLaughter",
  "objectLight",
  "saveGatedAttackRollAdvantage",
  "slowActivePenalties",
] as const satisfies ReadonlyArray<SpellProcedureKey>;

const STORED_GLYPH_RELEASE_PROCEDURES = [
  "conditionImmunityAndTurnStartTemporaryHitPoints",
  "creatureSizeIncrease",
  "creatureSizeDecrease",
  "creatureTypeProtection",
  "directCondition",
  "hastePositive",
  "levitatedCreature",
  "rollModifier",
  "scalarBuff",
] as const satisfies ReadonlyArray<SpellProcedureKey>;

type ActionCostOverrideProcedure =
  (typeof ACTION_COST_OVERRIDE_PROCEDURES)[number];
type MetamagicApplicationProcedure =
  (typeof METAMAGIC_APPLICATION_PROCEDURES)[number];
type StoredGlyphReleaseProcedure =
  (typeof STORED_GLYPH_RELEASE_PROCEDURES)[number];

export type HypnoticPatternStoredGlyphRelease = {
  readonly kind: "storedGlyphSpellRelease";
  readonly selfOriginAreaAnchorId: CombatantId;
};

type OrdinarySpellProcedureResolutionOptions<P extends SpellProcedureKey> =
  (P extends ActionCostOverrideProcedure
    ? { readonly actionCostOverride?: "magicAction" | "bonusAction" }
    : object) &
    (P extends MetamagicApplicationProcedure
      ? {
          readonly metamagicApplications: readonly SpellMetamagicApplicationFact[];
        }
      : object);

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
    : P extends StoredGlyphReleaseProcedure
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
            : P extends ActionOrBonusActionProcedure
              ?
                  | ActionSpellBattleResolutionInput
                  | BonusActionSpellBattleResolutionInput
              : P extends BonusActionProcedure
                ? BonusActionSpellBattleResolutionInput
                : SpellExecutionClassForProcedure<P> extends "bonusActionCast"
                  ? BonusActionSpellBattleResolutionInput
                  : SpellExecutionClassForProcedure<P> extends
                        | "actionCast"
                        | "actionCostCast"
                    ? ActionSpellBattleResolutionInput
                    : never;

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

type SpellProcedureExecutionResolutionFor<P extends SpellProcedureKey> =
  P extends "saveGatedDamage"
    ?
        | OrdinarySpellProcedureExecutionResolution<P>
        | TriggeredReactionSaveGatedDamageResolution
    : OrdinarySpellProcedureExecutionResolution<P>;

export type SpellProcedureExecutionResolution<
  P extends SpellProcedureKey = SpellProcedureKey,
> = { [Procedure in P]: SpellProcedureExecutionResolutionFor<Procedure> }[P];
