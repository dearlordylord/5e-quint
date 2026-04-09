import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import { defineDriver, run, stateCheck } from "@firfi/quint-connect";
import { Schema } from "effect";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createActor } from "xstate";
import { z } from "zod";

import { defaultKnownMetamagicOptions } from "#/features/class-sorcerer.ts";
import { defaultPreparedSpellsForClassLevels } from "#/features/spell-available-actions.ts";
import { singleClassHitDice } from "#/features/class-tables.ts";
import { creatureMachine, type DndEvent } from "#/machine.ts";
import {
  killZombieEvaluators,
  registerEvaluatorCleanup,
} from "#/mbt-cleanup.ts";
import {
  compareNormalizedStates,
  computeRechargedAbilities,
  ITFBigInt,
  ITFVariant,
  logMbtSeed,
  mapCreatureKind,
  mapDamageType,
  mapExpiryPhase,
  multiattackExtraAttacks,
  parseStatBlock,
  QUINT_ACTION_TYPE_MAP,
  QUINT_CONDITION_MAP,
  QUINT_SHOVE_MAP,
  QUINT_SIZE_MAP,
  type QuintClassName,
  quintClassToTs,
  QuintCreatureState,
  QuintFullState,
  quintParsedToNormalized,
  QuintSpellSlotState,
  QuintTurnState,
  snapshotToNormalized,
} from "#/mbt-shared.ts";
import { initSpellSlotsFromLevels } from "#/machine-spells.ts";
import type {
  ActionType,
  Condition,
  CreatureKind,
  SpellName,
} from "#/types.ts";
import {
  abilityModifier,
  classLevel,
  CreatureId,
  d20Roll,
  healAmount,
  resourceCount,
  spellId,
  spellSlotLevel,
  tempHp,
} from "#/types.ts";

// ============================================================
// ENFORCEMENT: every DndEvent type must have a driver action
// ============================================================

type EventActionMap = {
  TAKE_DAMAGE: "doTakeDamage";
  HEAL: "doHeal";
  GRANT_TEMP_HP: "doGrantTempHp";
  DEATH_SAVE: "doDeathSave";
  STABILIZE: "doStabilize";
  KNOCK_OUT: "doKnockOut";
  APPLY_CONDITION: "doApplyCondition";
  REMOVE_CONDITION: "doRemoveCondition";
  ADD_EXHAUSTION: "doAddExhaustion";
  REDUCE_EXHAUSTION: "doReduceExhaustion";
  START_TURN: "doStartTurn";
  USE_ACTION: "doUseAction";
  USE_BONUS_ACTION: "doUseBonusAction";
  USE_REACTION: "doUseReaction";
  USE_MOVEMENT: "doUseMovement";
  USE_EXTRA_ATTACK: "doUseExtraAttack";
  STAND_FROM_PRONE: "doStandFromProne";
  DROP_PRONE: "doDropProne";
  END_TURN: "doEndTurn";
  MARK_BONUS_ACTION_SPELL: "doMarkBonusActionSpell";
  MARK_NON_CANTRIP_ACTION_SPELL: "doMarkNonCantripActionSpell";
  CAST_PREPARED_SPELL: "doCastPreparedSpell";
  GRAPPLE: "doGrapple";
  SET_GRAPPLING_STATE: "doSetGrapplingState";
  RELEASE_GRAPPLE: "doReleaseGrapple";
  ESCAPE_GRAPPLE: "doEscapeGrapple";
  SHOVE: "doShove";
  EXPEND_SLOT: "doExpendSlot";
  EXPEND_PACT_SLOT: "doExpendPactSlot";
  START_CONCENTRATION: "doStartConcentration";
  BREAK_CONCENTRATION: "doBreakConcentration";
  CONCENTRATION_CHECK: "doConcentrationCheck";
  SHORT_REST: "doShortRest";
  LONG_REST: "doLongRest";
  SPEND_HIT_DIE: "doSpendHitDie";
  APPLY_FALL: "doApplyFall";
  SUFFOCATE: "doSuffocate";
  APPLY_STARVATION: "doApplyStarvation";
  APPLY_DEHYDRATION: "doApplyDehydration";
  ADD_EFFECT: "doAddEffect";
  REMOVE_EFFECT: "doRemoveEffect";
  ENTER_COMBAT: "doEnterCombat";
  EXIT_COMBAT: "doExitCombat";
  GRANT_EXTRA_ACTION: "doGrantExtraAction";
  USE_SECOND_WIND: "doUseSecondWind";
  USE_ACTION_SURGE: "doUseActionSurge";
  USE_INDOMITABLE: "doUseIndomitable";
  TRIGGER_INDOMITABLE: "doTriggerIndomitable";
  USE_TACTICAL_MIND: "doUseTacticalMind";
  TRIGGER_TACTICAL_MIND: "doTriggerTacticalMind";
  USE_HEROIC_INSPIRATION: "doUseHeroicInspiration";
  SCORE_CRITICAL_HIT: "doScoreCriticalHit";
  USE_BONUS_MOVEMENT: "doUseBonusMovement";
  USE_LEGENDARY_ACTION: "doUseLegendaryAction";
  USE_RECHARGE_ABILITY: "doUseRechargeAbility";
  USE_DAILY_ABILITY: "doUseDailyAbility";
  ENTER_RAGE: "doEnterRage";
  END_RAGE: "doEndRage";
  EXTEND_RAGE_BA: "doExtendRageBA";
  MARK_ATTACK_OR_FORCED_SAVE: "doMarkAttackOrForcedSave";
  DECLARE_RECKLESS: "doDeclareReckless";
  USE_INTIMIDATING_PRESENCE: "doUseIntimidatingPresence";
  RESTORE_INTIMIDATING_PRESENCE: "doRestoreIntimidatingPresence";
  USE_BRUTAL_STRIKE: "doBrutalStrike";
  USE_RELENTLESS_RAGE: "doUseRelentlessRage";
  FLURRY_OF_BLOWS: "doFlurryOfBlows";
  PATIENT_DEFENSE_FREE: "doPatientDefenseFree";
  PATIENT_DEFENSE_FOCUS: "doPatientDefenseFocus";
  STEP_OF_THE_WIND_FREE: "doStepOfTheWindFree";
  STEP_OF_THE_WIND_FOCUS: "doStepOfTheWindFocus";
  STUNNING_STRIKE: "doStunningStrike";
  WHOLENESS_OF_BODY: "doWholenessOfBody";
  UNCANNY_METABOLISM: "doUncannyMetabolism";
  USE_ARCANE_RECOVERY: "doUseArcaneRecovery";
  USE_OVERCHANNEL: "doOverchannel";
  TRIGGER_OVERCHANNEL: "doTriggerOverchannel";
  USE_SNEAK_ATTACK: "doUseSneakAttack";
  TRIGGER_SNEAK_ATTACK: "doTriggerSneakAttack";
  USE_STEADY_AIM: "doUseSteadyAim";
  CUNNING_ACTION_DASH: "doCunningActionDash";
  CUNNING_ACTION_DISENGAGE: "doCunningActionDisengage";
  CUNNING_ACTION_HIDE: "doCunningActionHide";
  USE_UNCANNY_DODGE: "doUseUncannyDodge";
  USE_CUNNING_STRIKE: "doCunningStrike";
  USE_CLERIC_CHANNEL_DIVINITY: "doUseClericChannelDivinity";
  USE_LAY_ON_HANDS: "doUseLayOnHands";
  USE_PALADIN_CHANNEL_DIVINITY: "doUsePaladinChannelDivinity";
  USE_DIVINE_SMITE: "doDivineSmite";
  USE_DIVINE_SMITE_FREE: "doDivineSmiteFree";
  USE_MAGICAL_CUNNING: "doUseMagicalCunning";
  USE_MYSTIC_ARCANUM: "doUseMysticArcanum";
  USE_ELDRITCH_SMITE: "doEldritchSmite";
  CONVERT_SLOT_TO_POINTS: "doConvertSlotToPoints";
  CONVERT_POINTS_TO_SLOT: "doConvertPointsToSlot";
  USE_INNATE_SORCERY: "doUseInnateSorcery";
  USE_METAMAGIC: "doUseMetamagic";
  ENTER_WILD_SHAPE: "doEnterWildShape";
  EXIT_WILD_SHAPE: "doExitWildShape";
  USE_WILD_RESURGENCE_CHARGE: "doWildResurgenceCharge";
  USE_WILD_RESURGENCE_SLOT: "doWildResurgenceSlot";
  USE_FREE_HUNTERS_MARK: "doUseFreeHuntersMark";
  USE_TIRELESS: "doUseTireless";
  USE_NATURES_VEIL: "doUseNaturesVeil";
  USE_BARDIC_INSPIRATION: "doUseBardicInspiration";
  USE_CUTTING_WORDS: "doUseCuttingWords";
  USE_FONT_SLOT_RESTORE: "doUseFontSlotRestore";
  USE_PEERLESS_SKILL: "doUsePeerlessSkill";
  TRIGGER_PEERLESS_SKILL_ABILITY_CHECK: "doTriggerPeerlessSkillAbilityCheck";
  TRIGGER_PEERLESS_SKILL_ATTACK_ROLL: "doTriggerPeerlessSkillAttackRoll";
  CLEAR_PENDING_RESOLUTION: "doClearPendingResolution";
};

// Compile error if a DndEvent type is missing from EventActionMap
type UnmappedEvents = Exclude<DndEvent["type"], keyof EventActionMap>;
type AssertAllEventsMapped = UnmappedEvents extends never
  ? true
  : { ERROR: `Missing from EventActionMap: ${UnmappedEvents}` };
void (true as AssertAllEventsMapped);

// ============================================================
// Driver: map Quint actions → XState events
// ============================================================

const driverSchema = {
  init: {
    kind: ITFVariant,
    l: ITFBigInt,
    maxHp: ITFBigInt,
    selectedBlock: z.any(),
    pcClass: z.string().optional(),
    conMod: ITFBigInt,
    wisMod: ITFBigInt,
    chaMod: ITFBigInt,
  },
  doTakeDamage: { amount: ITFBigInt, dt: ITFVariant, isCrit: z.boolean() },
  doTakeDamageMonster: {
    amount: ITFBigInt,
    dt: ITFVariant,
    isCrit: z.boolean(),
  },
  doTakeDamageWithMods: {
    amount: ITFBigInt,
    dt: ITFVariant,
    isCrit: z.boolean(),
    resType: ITFVariant,
    vulnType: ITFVariant,
  },
  doHeal: { amount: ITFBigInt },
  doGrantTempHp: { amount: ITFBigInt, keepOld: z.boolean() },
  doDeathSave: { roll: ITFBigInt, roll2: ITFBigInt },
  doStabilize: {},
  doKnockOut: {},
  doApplyCondition: {
    c: ITFVariant,
    useImmunity: z.boolean(),
    immuneCondition: ITFVariant,
  },
  doRemoveCondition: { c: ITFVariant },
  doAddExhaustion: { levels: ITFBigInt, exhaustionImmune: z.boolean() },
  doReduceExhaustion: { levels: ITFBigInt },
  doStartTurn: {
    isGrappling: z.boolean(),
    grappledSmall: z.boolean(),
    deathSaveRoll: ITFBigInt.optional(),
    deathSaveRoll2: ITFBigInt.optional(),
    numEffects: ITFBigInt.optional(),
    effSpellId: z.string().optional(),
    effHeal: ITFBigInt.optional(),
    effTempHp: ITFBigInt.optional(),
    effSaveResult: z.boolean().optional(),
    effDmgAmount: ITFBigInt.optional(),
    effDmgType: ITFVariant.optional(),
    effConSave: z.boolean().optional(),
    effResType: ITFVariant.optional(),
    effVulnType: ITFVariant.optional(),
    rechargeRollVal: ITFBigInt.optional(),
  },
  doUseAction: { at: ITFVariant },
  doUseBonusAction: {},
  doUseReaction: {},
  doUseMovement: { feet: ITFBigInt, cost: ITFBigInt },
  doUseExtraAttack: {},
  doStandFromProne: {},
  doDropProne: {},
  doEndTurn: {
    numSaves: ITFBigInt.optional(),
    saveSpellId: z.string().optional(),
    saveSucceeded: z.boolean().optional(),
    saveCondition: ITFVariant.optional(),
    numDmg: ITFBigInt.optional(),
    dmgSpellId: z.string().optional(),
    dmgAmount: ITFBigInt.optional(),
    dmgType: ITFVariant.optional(),
    conSave: z.boolean().optional(),
    dmgResType: ITFVariant.optional(),
    dmgVulnType: ITFVariant.optional(),
    useLR: z.boolean().optional(),
  },
  doMarkBonusActionSpell: {},
  doMarkNonCantripActionSpell: {},
  doCastPreparedSpell: {
    spellName: z.string().optional(),
    slotLevel: ITFBigInt.optional(),
  },
  doExpendSlot: { level: ITFBigInt },
  doExpendPactSlot: {},
  doStartConcentration: {
    spellId: z.string(),
    duration: ITFBigInt,
    expiresAt: ITFVariant,
  },
  doBreakConcentration: {},
  doAddEffect: {
    spellId: z.string(),
    duration: ITFBigInt,
    expiresAt: ITFVariant,
  },
  doRemoveEffect: { spellId: z.string() },
  doConcentrationCheck: { saveSucceeded: z.boolean() },
  doSpendHitDie: { className: ITFVariant, dieRoll: ITFBigInt },
  doShortRest: {
    numDice: ITFBigInt,
    c1: ITFVariant,
    c2: ITFVariant,
    c3: ITFVariant,
    r1: ITFBigInt,
    r2: ITFBigInt,
    r3: ITFBigInt,
  },
  doLongRest: {},
  doUseLegendaryAction: { actionName: z.string().optional() },
  doUseRechargeAbility: { name: z.string().optional() },
  doUseDailyAbility: { name: z.string().optional() },
  doApplyFall: { damageRoll: ITFBigInt },
  doSuffocate: {},
  doApplyStarvation: {},
  doApplyDehydration: {},
  doGrapple: {
    atkSize: ITFVariant,
    tgtSize: ITFVariant,
    saveFailed: z.boolean(),
    freeHand: z.boolean(),
  },
  doReleaseGrapple: {},
  doEscapeGrapple: { escaped: z.boolean() },
  doShove: {
    atkSize: ITFVariant,
    tgtSize: ITFVariant,
    saveFailed: z.boolean(),
    choice: ITFVariant,
  },
  doEnterCombat: {},
  doExitCombat: {},
  doUseSecondWind: { d10Roll: ITFBigInt },
  doUseActionSurge: {},
  doUseIndomitable: {},
  doTriggerIndomitable: {},
  doUseTacticalMind: { boostedCheckSucceeds: z.boolean() },
  doTriggerTacticalMind: {},
  doUseHeroicInspiration: {},
  doScoreCriticalHit: {},
  doUseBonusMovement: { feet: ITFBigInt },
  doEnterRage: {},
  doEndRage: {},
  doExtendRageBA: {},
  doMarkAttackOrForcedSave: {},
  doDeclareReckless: {},
  doUseIntimidatingPresence: {},
  doRestoreIntimidatingPresence: {},
  doBrutalStrike: {},
  doUseRelentlessRage: { conSaveSucceeded: z.boolean().optional() },
  doFlurryOfBlows: {},
  doPatientDefenseFree: {},
  doPatientDefenseFocus: {},
  doStepOfTheWindFree: {},
  doStepOfTheWindFocus: {},
  doStunningStrike: {},
  doWholenessOfBody: { healRoll: ITFBigInt.optional() },
  doUncannyMetabolism: { healRoll: ITFBigInt.optional() },
  doUseArcaneRecovery: { slotLevel: ITFBigInt.optional() },
  doOverchannel: {},
  doTriggerOverchannel: {
    spellName: z.string().optional(),
    slotLevel: ITFBigInt.optional(),
  },
  doUseSneakAttack: {},
  doTriggerSneakAttack: {
    mode: ITFVariant.optional(),
    source: ITFVariant.optional(),
  },
  doUseSteadyAim: {},
  doCunningActionDash: {},
  doCunningActionDisengage: {},
  doCunningActionHide: {},
  doUseUncannyDodge: {},
  doCunningStrike: {},
  doUseClericChannelDivinity: {},
  doUseLayOnHands: { amount: ITFBigInt.optional() },
  doUsePaladinChannelDivinity: {},
  doDivineSmite: { slotLevel: ITFBigInt.optional() },
  doDivineSmiteFree: {},
  doUseMagicalCunning: {},
  doUseMysticArcanum: { spellLevel: ITFBigInt.optional() },
  doEldritchSmite: {},
  doConvertSlotToPoints: { slotLevel: ITFBigInt.optional() },
  doConvertPointsToSlot: { slotLevel: ITFBigInt.optional() },
  doUseInnateSorcery: {},
  doUseMetamagic: { option: z.string().optional() },
  doEnterWildShape: {},
  doExitWildShape: {},
  doWildResurgenceCharge: { slotLevel: ITFBigInt.optional() },
  doWildResurgenceSlot: {},
  doUseFreeHuntersMark: {},
  doUseTireless: { d8Roll: ITFBigInt.optional() },
  doUseNaturesVeil: {},
  doUseBardicInspiration: {},
  doUseCuttingWords: {},
  doUseFontSlotRestore: { slotLevel: ITFBigInt.optional() },
  doUsePeerlessSkill: { success: z.boolean().optional() },
  doTriggerPeerlessSkillAbilityCheck: {},
  doTriggerPeerlessSkillAttackRoll: {},
  doClearPendingResolution: {},
  step: {}, // dead character no-op
  stepPC: {}, // composite — framework expands to leaf actions
  stepMonster: {}, // composite — framework expands to leaf actions
  stepUniversal: {}, // composite — framework expands to leaf actions
} as const;

function createDndDriver() {
  return defineDriver(driverSchema, () => {
    let actor: ReturnType<typeof createActor<typeof creatureMachine>> | null =
      null;
    let currentCreatureKind: CreatureKind = "PC";
    let currentStatBlock: ReturnType<typeof parseStatBlock> | null = null;

    function ensureActor() {
      if (!actor)
        throw new Error("Actor not initialized — init must come first");
      return actor;
    }

    function send(event: DndEvent) {
      ensureActor().send(event);
    }

    return {
      init: ({
        chaMod,
        conMod,
        kind,
        l,
        maxHp: mhp,
        pcClass,
        selectedBlock,
        wisMod,
      }) => {
        if (actor) actor.stop();
        const creatureKind = mapCreatureKind(kind);
        currentCreatureKind = creatureKind;
        if (creatureKind === "Monster") {
          const sb = parseStatBlock(selectedBlock);
          currentStatBlock = sb;
          actor = createActor(creatureMachine, {
            input: {
              maxHp: sb.maxHp,
              hitDiceRemaining: undefined,
              baseWalkSpeed: sb.walkSpeed,
              effectiveSpeed: sb.walkSpeed,
              movementRemaining: sb.walkSpeed,
              extraAttacksRemaining: multiattackExtraAttacks(
                sb.multiattackLength,
              ),
              fighterLevel: undefined,
              barbarianLevel: undefined,
              monkLevel: undefined,
              paladinLevel: undefined,
              rogueLevel: undefined,
              clericLevel: undefined,
              druidLevel: undefined,
              sorcererLevel: undefined,
              warlockLevel: undefined,
              wizardLevel: undefined,
              rangerLevel: undefined,
              bardLevel: undefined,
              creatureKind: "Monster",
              legendaryActionsRemaining: resourceCount(
                sb.legendaryActionsRemaining,
              ),
              legendaryResistancesRemaining: resourceCount(
                sb.legendaryResistancesRemaining,
              ),
              rechargeAvailable: sb.rechargeAvailable,
              dailyUsesRemaining: sb.dailyUsesRemaining,
              dailyUsesMax: sb.dailyUsesRemaining,
            },
          });
        } else {
          currentStatBlock = null;
          const INIT_SPEED = 30;
          const level = Number(l);
          const cls = pcClass ?? "Fighter";
          const cl = (n: number) => (n > 0 ? classLevel(n) : undefined);
          const fLevel = cls === "Fighter" ? cl(level) : undefined;
          const bLevel = cls === "Barbarian" ? cl(level) : undefined;
          const mLevel = cls === "Monk" ? cl(level) : undefined;
          const wLevel = cls === "Wizard" ? cl(level) : undefined;
          const rLevel = cls === "Rogue" ? cl(level) : undefined;
          const cLevel = cls === "Cleric" ? cl(level) : undefined;
          const pLevel = cls === "Paladin" ? cl(level) : undefined;
          const wkLevel = cls === "Warlock" ? cl(level) : undefined;
          const sLevel = cls === "Sorcerer" ? cl(level) : undefined;
          const dLevel = cls === "Druid" ? cl(level) : undefined;
          const rnLevel = cls === "Ranger" ? cl(level) : undefined;
          const bdLevel = cls === "Bard" ? cl(level) : undefined;
          actor = createActor(creatureMachine, {
            input: {
              maxHp: Number(mhp),
              hitDiceRemaining: singleClassHitDice(
                quintClassToTs(cls as QuintClassName),
                level,
              ),
              baseWalkSpeed: INIT_SPEED,
              effectiveSpeed: INIT_SPEED,
              movementRemaining: INIT_SPEED,
              extraAttacksRemaining: 1,
              fighterLevel: fLevel,
              barbarianLevel: bLevel,
              monkLevel: mLevel,
              wholenessMax: resourceCount(Number(wisMod)),
              paladinLevel: pLevel,
              rogueLevel: rLevel,
              clericLevel: cLevel,
              druidLevel: dLevel,
              sorcererLevel: sLevel,
              knownMetamagicOptions: sLevel
                ? defaultKnownMetamagicOptions(level)
                : undefined,
              warlockLevel: wkLevel,
              wizardLevel: wLevel,
              rangerLevel: rnLevel,
              conMod: abilityModifier(Number(conMod)),
              wisMod: abilityModifier(Number(wisMod)),
              bardLevel: bdLevel,
              chaMod: abilityModifier(Number(chaMod)),
              preparedSpells: defaultPreparedSpellsForClassLevels(
                {
                  barbarian: 0,
                  bard: cls === "Bard" ? level : 0,
                  cleric: cls === "Cleric" ? level : 0,
                  druid: cls === "Druid" ? level : 0,
                  fighter: cls === "Fighter" ? level : 0,
                  monk: cls === "Monk" ? level : 0,
                  paladin: cls === "Paladin" ? level : 0,
                  ranger: cls === "Ranger" ? level : 0,
                  rogue: cls === "Rogue" ? level : 0,
                  sorcerer: cls === "Sorcerer" ? level : 0,
                  warlock: cls === "Warlock" ? level : 0,
                  wizard: cls === "Wizard" ? level : 0,
                },
                actorSlotsForClassLevel(cls as QuintClassName, level),
              ),
              creatureKind: "PC",
            },
          });
        }
        actor.start();
      },
      doTakeDamage: ({ amount, dt, isCrit }) => {
        send({
          type: "TAKE_DAMAGE",
          amount: Number(amount),
          damageType: mapDamageType(dt),
          resistances: new Set(),
          vulnerabilities: new Set(),
          immunities: new Set(),
          isCritical: isCrit,
        });
      },
      doTakeDamageMonster: ({ amount, dt, isCrit }) => {
        const sb = currentStatBlock;
        send({
          type: "TAKE_DAMAGE",
          amount: Number(amount),
          damageType: mapDamageType(dt),
          resistances: sb?.resistances ?? new Set(),
          vulnerabilities: sb?.vulnerabilities ?? new Set(),
          immunities: sb?.immunities ?? new Set(),
          isCritical: isCrit,
        });
      },
      doTakeDamageWithMods: ({ amount, dt, isCrit, resType, vulnType }) => {
        send({
          type: "TAKE_DAMAGE",
          amount: Number(amount),
          damageType: mapDamageType(dt),
          resistances: new Set([mapDamageType(resType)]),
          vulnerabilities: new Set([mapDamageType(vulnType)]),
          immunities: new Set(),
          isCritical: isCrit,
        });
      },
      doHeal: ({ amount }) => {
        send({ type: "HEAL", amount: healAmount(Number(amount)) });
      },
      doGrantTempHp: ({ amount, keepOld }) => {
        send({
          type: "GRANT_TEMP_HP",
          amount: tempHp(Number(amount)),
          keepOld,
        });
      },
      doDeathSave: ({ roll, roll2 }) => {
        send({
          type: "DEATH_SAVE",
          d20Roll: d20Roll(Number(roll)),
          d20Roll2: d20Roll(Number(roll2)),
        });
      },
      doStabilize: () => {
        send({ type: "STABILIZE" });
      },
      doKnockOut: () => {
        send({ type: "KNOCK_OUT" });
      },
      doApplyCondition: ({ c, immuneCondition, useImmunity }) => {
        const immunities = useImmunity
          ? new Set([QUINT_CONDITION_MAP[immuneCondition] ?? "blinded"])
          : new Set<Condition>();
        send({
          type: "APPLY_CONDITION",
          condition: QUINT_CONDITION_MAP[c] ?? "blinded",
          conditionImmunities: immunities,
        });
      },
      doRemoveCondition: ({ c }) => {
        send({
          type: "REMOVE_CONDITION",
          condition: QUINT_CONDITION_MAP[c] ?? "blinded",
        });
      },
      doAddExhaustion: ({ exhaustionImmune, levels }) => {
        send({
          type: "ADD_EXHAUSTION",
          levels: Number(levels),
          exhaustionImmune,
        });
      },
      doReduceExhaustion: ({ levels }) => {
        send({ type: "REDUCE_EXHAUSTION", levels: Number(levels) });
      },
      doStartTurn: ({
        deathSaveRoll: dsRoll,
        deathSaveRoll2: dsRoll2,
        effConSave,
        effDmgAmount,
        effDmgType,
        effHeal,
        effResType,
        effSaveResult,
        effSpellId,
        effTempHp,
        effVulnType,
        grappledSmall,
        isGrappling,
        numEffects,
        rechargeRollVal,
      }) => {
        const isMonster = currentCreatureKind === "Monster";
        const sb = currentStatBlock;
        void effResType;
        void effVulnType;
        const effectResolutions = !numEffects
          ? []
          : [
              {
                spellId: spellId(effSpellId ?? ""),
                saveSucceeded: effSaveResult ?? false,
                conSaveSucceeded: effConSave ?? false,
                // Creature-level MBT: inline hook data for hookless effects
                damageAmount:
                  effDmgAmount != null ? Number(effDmgAmount) : undefined,
                damageType: effDmgType
                  ? mapDamageType(effDmgType)
                  : undefined,
                healAmount:
                  effHeal != null ? Number(effHeal) : undefined,
                tempHpAmount:
                  effTempHp != null ? Number(effTempHp) : undefined,
                removeOnSaveSuccess: effSaveResult != null ? true : undefined,
              },
            ];
        send({
          type: "START_TURN",
          // Monsters: override extraAttacks from multiattack; PCs derive from class levels
          extraAttacks:
            isMonster && sb
              ? sb.multiattackLength > 0
                ? sb.multiattackLength - 1
                : 0
              : undefined,
          // Monsters: skip death save and use monster-owned start-turn data only.
          deathSaveRoll: isMonster
            ? undefined
            : dsRoll != null
              ? d20Roll(Number(dsRoll))
              : undefined,
          deathSaveRoll2: isMonster
            ? undefined
            : dsRoll2 != null
              ? d20Roll(Number(dsRoll2))
              : undefined,
          effectResolutions,
          isGrappling: isGrappling ?? false,
          grappledTargetTwoSizesSmaller: grappledSmall ?? false,
          // Phase L: compute which abilities recharged (mirrors Quint's pProcessRechargeRolls)
          rechargedAbilities:
            isMonster && sb && rechargeRollVal != null
              ? computeRechargedAbilities(
                  Number(rechargeRollVal),
                  sb.rechargeMinRolls,
                  ensureActor().getSnapshot().context.rechargeAvailable,
                )
              : undefined,
        });
      },
      doUseAction: ({ at }) => {
        send({
          type: "USE_ACTION",
          actionType: (QUINT_ACTION_TYPE_MAP[at] ?? "attack") as ActionType,
        });
      },
      doUseBonusAction: () => {
        send({ type: "USE_BONUS_ACTION" });
      },
      doUseReaction: () => {
        send({ type: "USE_REACTION" });
      },
      doUseMovement: ({ cost, feet }) => {
        send({
          type: "USE_MOVEMENT",
          feet: Number(feet),
          movementCost: Number(cost),
        });
      },
      doUseExtraAttack: () => {
        send({ type: "USE_EXTRA_ATTACK" });
      },
      doStandFromProne: () => {
        send({ type: "STAND_FROM_PRONE" });
      },
      doDropProne: () => {
        send({ type: "DROP_PRONE" });
      },
      doEndTurn: ({
        conSave,
        dmgAmount,
        dmgResType,
        dmgSpellId,
        dmgType,
        dmgVulnType,
        numDmg,
        numSaves,
        saveCondition,
        saveSpellId,
        saveSucceeded,
        useLR,
      }) => {
        // When turnPhase != "acting", Quint skips nondet generation — all params are undefined (no-op path)
        // Quint treats saves and damage as SEPARATE lists — split into two resolutions
        // so each matches its own active effect independently.
        const saveResolution =
          numSaves
            ? [
                {
                  spellId: spellId(saveSpellId ?? ""),
                  saveSucceeded: saveSucceeded ?? false,
                  removeOnSaveSuccess: true,
                },
              ]
            : [];
        const dmgResolution =
          numDmg
            ? [
                {
                  spellId: spellId(dmgSpellId ?? ""),
                  saveSucceeded: false,
                  conSaveSucceeded: conSave ?? false,
                  damageAmount:
                    dmgAmount != null ? Number(dmgAmount) : undefined,
                  damageType: dmgType ? mapDamageType(dmgType) : undefined,
                },
              ]
            : [];
        const effectResolutions = [...saveResolution, ...dmgResolution];
        const isMonster = currentCreatureKind === "Monster";
        const sb = currentStatBlock;
        void isMonster;
        void sb;
        void dmgResType;
        void dmgVulnType;
        void saveCondition;
        send({
          type: "END_TURN",
          effectResolutions,
          useLegendaryResistance: useLR,
        });
      },
      doMarkBonusActionSpell: () => {
        send({ type: "MARK_BONUS_ACTION_SPELL" });
      },
      doMarkNonCantripActionSpell: () => {
        send({ type: "MARK_NON_CANTRIP_ACTION_SPELL" });
      },
      doCastPreparedSpell: ({ spellName, slotLevel }) => {
        send({
          type: "CAST_PREPARED_SPELL",
          spellName: (spellName ?? "bless") as SpellName,
          slotLevel: spellSlotLevel(Number(slotLevel ?? 1)),
        });
      },
      doExpendSlot: ({ level }) => {
        send({ type: "EXPEND_SLOT", level: spellSlotLevel(Number(level)) });
      },
      doExpendPactSlot: () => {
        send({ type: "EXPEND_PACT_SLOT" });
      },
      doStartConcentration: ({ duration, expiresAt, spellId: sid }) => {
        send({
          type: "START_CONCENTRATION",
          spellId: spellId(sid),
          durationTurns: Number(duration),
          expiresAt: mapExpiryPhase(expiresAt),
          casterId: CreatureId(""),
        });
      },
      doBreakConcentration: () => {
        send({ type: "BREAK_CONCENTRATION" });
      },
      doAddEffect: ({ duration, expiresAt, spellId: sid }) => {
        send({
          type: "ADD_EFFECT",
          spellId: spellId(sid),
          durationTurns: Number(duration),
          expiresAt: mapExpiryPhase(expiresAt),
          casterId: CreatureId(""),
        });
      },
      doRemoveEffect: ({ spellId: sid }) => {
        send({ type: "REMOVE_EFFECT", spellId: spellId(sid) });
      },
      doConcentrationCheck: ({ saveSucceeded }) => {
        send({ type: "CONCENTRATION_CHECK", conSaveSucceeded: saveSucceeded });
      },
      doSpendHitDie: ({ className, dieRoll }) => {
        send({
          type: "SPEND_HIT_DIE",
          className: quintClassToTs(className as QuintClassName),
          dieRoll: Number(dieRoll),
        });
      },
      doShortRest: ({ c1, c2, c3, numDice, r1, r2, r3 }) => {
        const n = Number(numDice);
        const classes = [c1, c2, c3].slice(0, n);
        const rolls = [Number(r1), Number(r2), Number(r3)].slice(0, n);
        const hdRolls = classes.map((c, i) => ({
          className: quintClassToTs(c as QuintClassName),
          roll: rolls[i],
        }));
        send({ type: "SHORT_REST", hdRolls });
      },
      doLongRest: () => {
        send({ type: "LONG_REST" });
      },
      doApplyFall: ({ damageRoll }) => {
        send({
          type: "APPLY_FALL",
          damageRoll: Number(damageRoll),
          resistances: new Set(),
          vulnerabilities: new Set(),
          immunities: new Set(),
        });
      },
      doSuffocate: () => {
        send({ type: "SUFFOCATE" });
      },
      doApplyStarvation: () => {
        send({ type: "APPLY_STARVATION" });
      },
      doApplyDehydration: () => {
        send({ type: "APPLY_DEHYDRATION" });
      },
      doGrapple: ({ atkSize, freeHand, saveFailed, tgtSize }) => {
        send({
          type: "GRAPPLE",
          attackerSize: QUINT_SIZE_MAP[atkSize] ?? "medium",
          targetSize: QUINT_SIZE_MAP[tgtSize] ?? "medium",
          targetSaveFailed: saveFailed,
          attackerHasFreeHand: freeHand,
        });
      },
      doReleaseGrapple: () => {
        send({ type: "RELEASE_GRAPPLE" });
      },
      doEscapeGrapple: ({ escaped }) => {
        send({ type: "ESCAPE_GRAPPLE", escapeSucceeded: escaped });
      },
      doShove: ({ atkSize, choice, saveFailed, tgtSize }) => {
        send({
          type: "SHOVE",
          attackerSize: QUINT_SIZE_MAP[atkSize] ?? "medium",
          targetSize: QUINT_SIZE_MAP[tgtSize] ?? "medium",
          targetSaveFailed: saveFailed,
          choice: QUINT_SHOVE_MAP[choice] ?? "prone",
        });
      },
      doEnterCombat: () => {
        send({ type: "ENTER_COMBAT" });
      },
      doExitCombat: () => {
        send({ type: "EXIT_COMBAT" });
      },
      doUseSecondWind: ({ d10Roll }) => {
        send({ type: "USE_SECOND_WIND", d10Roll: Number(d10Roll) });
      },
      doUseActionSurge: () => {
        send({ type: "USE_ACTION_SURGE" });
      },
      doUseIndomitable: () => {
        send({ type: "USE_INDOMITABLE" });
      },
      doTriggerIndomitable: () => {
        send({ type: "TRIGGER_INDOMITABLE" });
      },
      doUseTacticalMind: ({ boostedCheckSucceeds }) => {
        send({ type: "USE_TACTICAL_MIND", boostedCheckSucceeds });
      },
      doTriggerTacticalMind: () => {
        send({ type: "TRIGGER_TACTICAL_MIND" });
      },
      doUseHeroicInspiration: () => {
        send({ type: "USE_HEROIC_INSPIRATION" });
      },
      doScoreCriticalHit: () => {
        send({ type: "SCORE_CRITICAL_HIT" });
      },
      doUseBonusMovement: ({ feet }) => {
        send({ type: "USE_BONUS_MOVEMENT", feet: Number(feet) });
      },
      doEnterRage: () => {
        send({ type: "ENTER_RAGE" });
      },
      doEndRage: () => {
        send({ type: "END_RAGE" });
      },
      doExtendRageBA: () => {
        send({ type: "EXTEND_RAGE_BA" });
      },
      doMarkAttackOrForcedSave: () => {
        send({ type: "MARK_ATTACK_OR_FORCED_SAVE" });
      },
      doDeclareReckless: () => {
        send({ type: "DECLARE_RECKLESS" });
      },
      doUseIntimidatingPresence: () => {
        send({ type: "USE_INTIMIDATING_PRESENCE" });
      },
      doRestoreIntimidatingPresence: () => {
        send({ type: "RESTORE_INTIMIDATING_PRESENCE" });
      },
      doBrutalStrike: () => {
        send({ type: "USE_BRUTAL_STRIKE" });
      },
      doUseRelentlessRage: ({ conSaveSucceeded }) => {
        if (conSaveSucceeded != null)
          send({ type: "USE_RELENTLESS_RAGE", conSaveSucceeded });
      },
      doFlurryOfBlows: () => {
        send({ type: "FLURRY_OF_BLOWS" });
      },
      doPatientDefenseFree: () => {
        send({ type: "PATIENT_DEFENSE_FREE" });
      },
      doPatientDefenseFocus: () => {
        send({ type: "PATIENT_DEFENSE_FOCUS" });
      },
      doStepOfTheWindFree: () => {
        send({ type: "STEP_OF_THE_WIND_FREE" });
      },
      doStepOfTheWindFocus: () => {
        send({ type: "STEP_OF_THE_WIND_FOCUS" });
      },
      doStunningStrike: () => {
        send({ type: "STUNNING_STRIKE" });
      },
      doWholenessOfBody: ({ healRoll }) => {
        if (healRoll != null)
          send({ type: "WHOLENESS_OF_BODY", healRoll: Number(healRoll) });
      },
      doUncannyMetabolism: ({ healRoll }) => {
        if (healRoll != null)
          send({ type: "UNCANNY_METABOLISM", healRoll: Number(healRoll) });
      },
      doUseArcaneRecovery: ({ slotLevel }) => {
        if (slotLevel != null)
          send({
            type: "USE_ARCANE_RECOVERY",
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
      },
      doOverchannel: () => {
        send({ type: "USE_OVERCHANNEL" });
      },
      doTriggerOverchannel: ({ spellName, slotLevel }) => {
        if (spellName != null && slotLevel != null) {
          send({
            type: "TRIGGER_OVERCHANNEL",
            spellName: spellName as SpellName,
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
        }
      },
      doUseSneakAttack: () => {
        send({ type: "USE_SNEAK_ATTACK" });
      },
      doTriggerSneakAttack: ({ mode, source }) => {
        if (mode != null && source != null) {
          send({
            type: "TRIGGER_SNEAK_ATTACK",
            mode: mode === "SARanged" ? "ranged" : "finesse",
            source: source === "SAAdjacentAlly" ? "adjacentAlly" : "advantage",
          });
        }
      },
      doUseSteadyAim: () => {
        send({ type: "USE_STEADY_AIM" });
      },
      doCunningActionDash: () => {
        send({ type: "CUNNING_ACTION_DASH" });
      },
      doCunningActionDisengage: () => {
        send({ type: "CUNNING_ACTION_DISENGAGE" });
      },
      doCunningActionHide: () => {
        send({ type: "CUNNING_ACTION_HIDE" });
      },
      doUseUncannyDodge: () => {
        send({ type: "USE_UNCANNY_DODGE" });
      },
      doCunningStrike: () => {
        send({ type: "USE_CUNNING_STRIKE" });
      },
      doUseClericChannelDivinity: () => {
        send({ type: "USE_CLERIC_CHANNEL_DIVINITY" });
      },
      doUseLayOnHands: ({ amount }) => {
        if (amount != null)
          send({ type: "USE_LAY_ON_HANDS", amount: Number(amount) });
      },
      doUsePaladinChannelDivinity: () => {
        send({ type: "USE_PALADIN_CHANNEL_DIVINITY" });
      },
      doDivineSmite: ({ slotLevel }) => {
        if (slotLevel != null)
          send({
            type: "USE_DIVINE_SMITE",
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
      },
      doDivineSmiteFree: () => {
        send({ type: "USE_DIVINE_SMITE_FREE" });
      },
      doUseMagicalCunning: () => {
        send({ type: "USE_MAGICAL_CUNNING" });
      },
      doUseMysticArcanum: ({ spellLevel }) => {
        if (spellLevel != null)
          send({
            type: "USE_MYSTIC_ARCANUM",
            spellLevel: spellSlotLevel(Number(spellLevel)),
          });
      },
      doEldritchSmite: () => {
        send({ type: "USE_ELDRITCH_SMITE" });
      },
      doConvertSlotToPoints: ({ slotLevel }) => {
        if (slotLevel != null)
          send({
            type: "CONVERT_SLOT_TO_POINTS",
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
      },
      doConvertPointsToSlot: ({ slotLevel }) => {
        if (slotLevel != null)
          send({
            type: "CONVERT_POINTS_TO_SLOT",
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
      },
      doUseInnateSorcery: () => {
        send({ type: "USE_INNATE_SORCERY" });
      },
      doUseMetamagic: ({ option }) => {
        if (option != null) send({ type: "USE_METAMAGIC", option });
      },
      doEnterWildShape: () => {
        send({ type: "ENTER_WILD_SHAPE" });
      },
      doExitWildShape: () => {
        send({ type: "EXIT_WILD_SHAPE" });
      },
      doWildResurgenceCharge: ({ slotLevel }) => {
        if (slotLevel != null)
          send({
            type: "USE_WILD_RESURGENCE_CHARGE",
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
      },
      doWildResurgenceSlot: () => {
        send({ type: "USE_WILD_RESURGENCE_SLOT" });
      },
      doUseFreeHuntersMark: () => {
        send({ type: "USE_FREE_HUNTERS_MARK" });
      },
      doUseTireless: ({ d8Roll }) => {
        if (d8Roll != null)
          send({ type: "USE_TIRELESS", d8Roll: Number(d8Roll) });
      },
      doUseNaturesVeil: () => {
        send({ type: "USE_NATURES_VEIL" });
      },
      doUseBardicInspiration: () => {
        send({ type: "USE_BARDIC_INSPIRATION" });
      },
      doUseCuttingWords: () => {
        send({ type: "USE_CUTTING_WORDS" });
      },
      doUseFontSlotRestore: ({ slotLevel }) => {
        if (slotLevel != null)
          send({
            type: "USE_FONT_SLOT_RESTORE",
            slotLevel: spellSlotLevel(Number(slotLevel)),
          });
      },
      doUsePeerlessSkill: ({ success }) => {
        if (success != null) send({ type: "USE_PEERLESS_SKILL", success });
      },
      doTriggerPeerlessSkillAbilityCheck: () => {
        send({ type: "TRIGGER_PEERLESS_SKILL_ABILITY_CHECK" });
      },
      doTriggerPeerlessSkillAttackRoll: () => {
        send({ type: "TRIGGER_PEERLESS_SKILL_ATTACK_ROLL" });
      },
      doClearPendingResolution: () => {
        send({ type: "CLEAR_PENDING_RESOLUTION" });
      },
      // Args are undefined when Quint guard → unchanged (nondet not generated)
      doUseLegendaryAction: ({ actionName }) => {
        if (actionName != null)
          send({ type: "USE_LEGENDARY_ACTION", actionName });
      },
      doUseRechargeAbility: ({ name }) => {
        if (name != null) send({ type: "USE_RECHARGE_ABILITY", name });
      },
      doUseDailyAbility: ({ name }) => {
        if (name != null) send({ type: "USE_DAILY_ABILITY", name });
      },
      step: () => {}, // dead character no-op
      stepPC: () => {}, // composite — framework expands to leaf actions
      stepMonster: () => {}, // composite — framework expands to leaf actions
      stepUniversal: () => {}, // composite — framework expands to leaf actions
      getState: () => snapshotToNormalized(ensureActor().getSnapshot()),
      config: () => ({ statePath: [] }),
    };
  });
}

function actorSlotsForClassLevel(
  cls: QuintClassName,
  level: number,
): ReadonlyArray<number> {
  return initSpellSlotsFromLevels({
    bardLevel: cls === "Bard" ? level : 0,
    clericLevel: cls === "Cleric" ? level : 0,
    druidLevel: cls === "Druid" ? level : 0,
    sorcererLevel: cls === "Sorcerer" ? level : 0,
    wizardLevel: cls === "Wizard" ? level : 0,
    paladinLevel: cls === "Paladin" ? level : 0,
    rangerLevel: cls === "Ranger" ? level : 0,
    warlockLevel: cls === "Warlock" ? level : 0,
  }).slotsMax;
}

// ============================================================
// State comparison (delegated to mbt-shared)
// ============================================================

// ============================================================
// Sync enforcement tests
// ============================================================

const KNOWN_MISSING_FIELDS = new Set<string>([]);

type QuintRow = {
  readonly kind: "row";
  readonly fields: ReadonlyArray<{ readonly fieldName: string }>;
  readonly other: QuintRow | { readonly kind: "empty" };
};

const QuintRow: Schema.Schema<QuintRow, unknown> = Schema.suspend(() =>
  Schema.Struct({
    kind: Schema.Literal("row"),
    fields: Schema.Array(Schema.Struct({ fieldName: Schema.String })),
    other: Schema.Union(
      QuintRow,
      Schema.Struct({ kind: Schema.Literal("empty") }),
    ),
  }),
) as Schema.Schema<QuintRow, unknown>;

const QuintTypedef = Schema.Struct({
  kind: Schema.Literal("typedef"),
  name: Schema.String,
  type: Schema.Struct({ fields: QuintRow }),
});

function parseQuintTypeFields(typeName: string): Array<string> {
  const tmpFile = path.join(os.tmpdir(), `quint_ast_${process.pid}.json`);
  try {
    execSync(
      `quint parse ${path.resolve(import.meta.dirname, "../../../creature.qnt")} --out ${tmpFile}`,
    );
    const raw = JSON.parse(fs.readFileSync(tmpFile, "utf8")) as {
      modules: Array<{ declarations: Array<Record<string, unknown>> }>;
    };
    const rawDecl = raw.modules[0]?.declarations.find(
      (d) => d.kind === "typedef" && d.name === typeName,
    );
    if (!rawDecl) throw new Error(`${typeName} typedef not found in Quint AST`);

    const stateType = Schema.decodeUnknownSync(QuintTypedef)(rawDecl);

    function getFields(row: QuintRow): Array<string> {
      const fields: Array<string> = row.fields.map((f) => f.fieldName);
      if (row.other.kind === "row") fields.push(...getFields(row.other));
      return fields;
    }
    return getFields(stateType.type.fields);
  } finally {
    try {
      fs.unlinkSync(tmpFile);
    } catch {
      /* ignore cleanup errors */
    }
  }
}

describe("MBT driver sync", () => {
  it("no NEW Quint CreatureState fields missing from schema", () => {
    const quintFields = parseQuintTypeFields("CreatureState");
    const schemaKeys = Object.keys(QuintCreatureState.shape);
    const missing = quintFields.filter(
      (f: string) => !schemaKeys.includes(f) && !KNOWN_MISSING_FIELDS.has(f),
    );
    expect(
      missing,
      `New Quint CreatureState fields not in schema: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("no NEW Quint TurnState fields missing from schema", () => {
    const quintFields = parseQuintTypeFields("TurnState");
    const schemaKeys = Object.keys(QuintTurnState.shape);
    const missing = quintFields.filter(
      (f: string) => !schemaKeys.includes(f) && !KNOWN_MISSING_FIELDS.has(f),
    );
    expect(
      missing,
      `New Quint TurnState fields not in schema: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("no NEW Quint SpellSlotState fields missing from schema", () => {
    const quintFields = parseQuintTypeFields("SpellSlotState");
    const schemaKeys = Object.keys(QuintSpellSlotState.shape);
    const missing = quintFields.filter(
      (f: string) => !schemaKeys.includes(f) && !KNOWN_MISSING_FIELDS.has(f),
    );
    expect(
      missing,
      `New Quint SpellSlotState fields not in schema: ${missing.join(", ")}`,
    ).toEqual([]);
  });

  it("KNOWN_MISSING_FIELDS entries are actually missing (remove when fixed)", () => {
    const allSchemaKeys = new Set([
      ...Object.keys(QuintCreatureState.shape),
      ...Object.keys(QuintTurnState.shape),
      ...Object.keys(QuintSpellSlotState.shape),
    ]);
    const stale = [...KNOWN_MISSING_FIELDS].filter((f) => allSchemaKeys.has(f));
    expect(
      stale,
      `Remove from KNOWN_MISSING_FIELDS: ${stale.join(", ")}`,
    ).toEqual([]);
  });
});

// ============================================================
// MBT test
// ============================================================

const mbtStateCheck = stateCheck(
  (raw) => quintParsedToNormalized(QuintFullState.parse(raw)),
  compareNormalizedStates,
);

describe("DnD MBT", () => {
  beforeAll(() => {
    killZombieEvaluators();
    registerEvaluatorCleanup();
  });
  afterAll(() => {
    killZombieEvaluators();
  });

  const MBT_TRACE_COUNT = 50;
  const MBT_STEP_COUNT = 30;
  const specPath = path.resolve(import.meta.dirname, "../../../creature.qnt");

  it("replays Quint traces against XState machine (L3 + L5 + L9 + L10 + L18)", async () => {
    const result = await run({
      spec: specPath,
      driver: createDndDriver(),
      backend: "rust",
      nTraces: Number(process.env["MBT_TRACES"] ?? MBT_TRACE_COUNT),
      maxSteps: Number(process.env["MBT_STEPS"] ?? MBT_STEP_COUNT),
      stateCheck: mbtStateCheck,
    });
    logMbtSeed("creature MBT", result);
  }, 180_000);
});
