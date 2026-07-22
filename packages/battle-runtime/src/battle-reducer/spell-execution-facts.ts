import type {
  BattleExecutableSpellInvocation,
  ReadiedSpellInvocation,
  SupportedSpellInvocation,
} from "../battle-state-execution.ts";
import type {
  RuntimeSpellProcedureExecution,
  SpellProcedureExecution,
} from "../character-execution.ts";
import { spellInvocationIsSpellcasting } from "./spell-turn-resources.ts";
import { isTriggeredReactionSpellInvocation } from "./spell-interrupt-procedure-kinds.ts";
import { Match, Schema } from "effect";

export const SpellExecutionFactsSchema = Schema.Union(
  Schema.Struct({
    kind: Schema.Literal("actionSpell"),
    familiarTouchDelivery: Schema.Boolean,
    readiedSpellCompatible: Schema.Boolean,
  }),
  Schema.Struct({
    kind: Schema.Literal("bonusActionSpell"),
    familiarTouchDelivery: Schema.Boolean,
  }),
  Schema.Struct({ kind: Schema.Literal("bonusActionDashSpell") }),
  Schema.Struct({ kind: Schema.Literal("triggeredReactionSpell") }),
  Schema.Struct({ kind: Schema.Literal("attackHitBonusActionSpell") }),
);
export type SpellExecutionFacts = typeof SpellExecutionFactsSchema.Type;

const SPELL_EXECUTION_CLASSES = [
  "actionCast",
  "actionCostCast",
  "bonusActionCast",
  "bonusActionDash",
  "triggeredReactionOrActionCast",
  "attackHitBonusAction",
] as const;
export type SpellExecutionClass = (typeof SPELL_EXECUTION_CLASSES)[number];

const SPELL_EXECUTION_CLASS_BY_PROCEDURE = {
  abilityD20TestRollModeSaveGate: "actionCast",
  afterHitDamage: "attackHitBonusAction",
  afterHitDamageAndIllumination: "attackHitBonusAction",
  afterHitSaveGatedCondition: "attackHitBonusAction",
  afterHitTimedDamageAndSave: "attackHitBonusAction",
  antimagicFieldOngoingSpellSuppression: "actionCast",
  attackBurstSaveDamage: "actionCast",
  blurAttackRollDefense: "actionCast",
  chainedSpellAttackDamage: "actionCast",
  chosenDamageResistance: "actionCast",
  cloudkillAreaHazard: "actionCast",
  command: "actionCast",
  conditionImmunityAndTurnStartTemporaryHitPoints: "actionCast",
  conditionRemovalProtection: "actionCast",
  counterspell: "triggeredReactionOrActionCast",
  creatureSizeDecrease: "actionCast",
  creatureSizeIncrease: "actionCast",
  creatureTypeProtection: "actionCast",
  damageReduction: "actionCast",
  dancingLightsCombinedCast: "actionCast",
  dancingLightsReposition: "bonusActionCast",
  dancingLightsSeparateCast: "actionCast",
  directCondition: "actionCast",
  directConditionRemoval: "bonusActionCast",
  directHitPointRestoration: "actionCostCast",
  dragonsBreathInitial: "actionCast",
  expeditiousRetreatDash: "bonusActionDash",
  featherFallMitigation: "triggeredReactionOrActionCast",
  flamingSphere: "actionCast",
  fogCloudObscurement: "actionCast",
  greaseGroundHazard: "actionCast",
  gustOfWindLine: "actionCast",
  hastePositive: "actionCast",
  heldLight: "bonusActionCast",
  heldLightHurl: "actionCast",
  hideousLaughter: "actionCast",
  hypnoticPattern: "actionCast",
  insectPlagueAreaHazard: "actionCast",
  jumpMovementReplacement: "bonusActionCast",
  levitatedCreature: "actionCast",
  magicWeaponEnhancement: "bonusActionCast",
  magicalDarknessPointOrigin: "actionCast",
  makeStable: "actionCast",
  markedDamageRider: "bonusActionCast",
  mirrorImageHitInterception: "actionCast",
  moonbeam: "actionCast",
  objectContactDamage: "actionCast",
  objectContactDamageRepeat: "bonusActionCast",
  objectLight: "actionCast",
  ongoingSpellEnd: "actionCast",
  persistentArmorEffect: "actionCast",
  repeatedDamageAllocation: "actionCast",
  rollModifier: "actionCast",
  sanctuaryTargetingInterdiction: "bonusActionCast",
  saveGatedAttackRollAdvantage: "actionCast",
  saveGatedCondition: "actionCast",
  saveGatedConditionImmunity: "actionCast",
  saveGatedDamage: "triggeredReactionOrActionCast",
  scalarBuff: "actionCostCast",
  seeInvisibleObserverSight: "actionCast",
  selfTeleport: "bonusActionCast",
  selfTransformationMode: "actionCast",
  shieldReaction: "triggeredReactionOrActionCast",
  sleepTargetAdmission: "actionCast",
  sleetStormAreaHazard: "actionCast",
  slowActivePenalties: "actionCast",
  spellAttackDamage: "actionCast",
  spellAttackSequence: "actionCast",
  spellCreatedHeldObject: "bonusActionCast",
  spellCreatedHeldObjectAttack: "actionCast",
  spellCreatedHeldObjectReEvoke: "bonusActionCast",
  spellHostedWeaponAttack: "actionCast",
  spikeGrowthMovementHazard: "actionCast",
  spiritualWeaponAttackProxy: "bonusActionCast",
  spiritualWeaponRepeatAttack: "bonusActionCast",
  thaumaturgyBoomingVoice: "actionCast",
  wardingBond: "actionCast",
  weaponAttackOverride: "bonusActionCast",
  weaponDamageRider: "bonusActionCast",
  webRestraintHazard: "actionCast",
} as const satisfies Record<
  SupportedSpellInvocation["procedure"],
  SpellExecutionClass
>;

export type SpellExecutionClassForProcedure<
  P extends SupportedSpellInvocation["procedure"],
> = (typeof SPELL_EXECUTION_CLASS_BY_PROCEDURE)[P];

// ReadiedSpellInvocation is the wider mechanical release-shape union. This
// list is the single admission boundary for procedures whose reducers are
// implemented by the runtime's Readied Spell lane.
const READIED_SPELL_RUNTIME_LANE_PROCEDURES = [
  "chainedSpellAttackDamage",
  "repeatedDamageAllocation",
  "saveGatedDamage",
  "spellAttackDamage",
] as const satisfies ReadonlyArray<ReadiedSpellInvocation["procedure"]>;
const READIED_SPELL_RUNTIME_LANE_PROCEDURE_SET: ReadonlySet<
  SpellProcedureExecution["procedure"]
> = new Set(READIED_SPELL_RUNTIME_LANE_PROCEDURES);

export function spellInvocationHasReadiedSpellExecutionShape(
  invocation:
    | SupportedSpellInvocation
    | RuntimeSpellProcedureExecution
    | SpellProcedureExecution,
): boolean {
  if (!READIED_SPELL_RUNTIME_LANE_PROCEDURE_SET.has(invocation.procedure)) {
    return false;
  }
  if (invocation.procedure !== "spellAttackDamage") {
    return true;
  }
  return invocation.damage.kind !== "sorcerousBurstDamageTypeChoice";
}

function executionClassForInvocation(
  invocation: Pick<SupportedSpellInvocation, "procedure">,
): SpellExecutionClass {
  return SPELL_EXECUTION_CLASS_BY_PROCEDURE[invocation.procedure];
}

export function spellSubjectTagForInvocation(
  invocation: SpellProcedureExecution | BattleExecutableSpellInvocation,
): "actionSpell" | "bonusActionSpell" {
  if (
    invocation.procedure === "directHitPointRestoration" ||
    invocation.procedure === "scalarBuff"
  ) {
    return invocation.actionCost === "bonusAction"
      ? "bonusActionSpell"
      : "actionSpell";
  }
  return Match.value(executionClassForInvocation(invocation)).pipe(
    Match.when("actionCast", () => "actionSpell" as const),
    Match.when("actionCostCast", () => "actionSpell" as const),
    Match.when("bonusActionCast", () => "bonusActionSpell" as const),
    Match.when("bonusActionDash", () => "actionSpell" as const),
    Match.when("triggeredReactionOrActionCast", () => "actionSpell" as const),
    Match.when("attackHitBonusAction", () => "bonusActionSpell" as const),
    Match.exhaustive,
  );
}

export function spellExecutionFacts(
  invocation: SpellProcedureExecution,
): SpellExecutionFacts {
  const executionClass = executionClassForInvocation(invocation);
  if (
    executionClass === "triggeredReactionOrActionCast" &&
    isTriggeredReactionSpellInvocation(invocation)
  ) {
    return { kind: "triggeredReactionSpell" };
  }
  if (executionClass === "attackHitBonusAction") {
    return { kind: "attackHitBonusActionSpell" };
  }
  if (executionClass === "bonusActionDash") {
    return { kind: "bonusActionDashSpell" };
  }
  const kind = spellSubjectTagForInvocation(invocation);
  const familiarTouchDelivery =
    spellInvocationIsSpellcasting(invocation) &&
    "spellRuleFacts" in invocation &&
    invocation.spellRuleFacts.range.kind === "touch";
  return kind === "actionSpell"
    ? {
        kind,
        familiarTouchDelivery,
        readiedSpellCompatible:
          spellInvocationHasReadiedSpellExecutionShape(invocation),
      }
    : { kind, familiarTouchDelivery };
}
