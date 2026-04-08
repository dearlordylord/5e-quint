const DYING_TAKE_DAMAGE_PREFIX = [
  { guard: "noDamageThrough" as const, actions: ["absorbTempHpOnly"] },
  {
    guard: "instantDeathFromDying" as const,
    target: "#dnd.damageTrack.dead",
    actions: ["absorbTempHpOnly", "breakConcentration"]
  },
  {
    guard: "deathFromDamageFailures" as const,
    target: "#dnd.damageTrack.dead",
    actions: ["applyDamageAtZeroHp", "breakConcentration"]
  }
] as const

const DYING_FALL_PREFIX = [
  { guard: "fallNoDamage" as const },
  {
    guard: "fallInstantDeathFromDying" as const,
    target: "#dnd.damageTrack.dead",
    actions: ["applyFall", "breakConcentration"]
  },
  {
    guard: "deathFromFallFailures" as const,
    target: "#dnd.damageTrack.dead",
    actions: ["applyFallAtZeroHp", "breakConcentration"]
  }
] as const

export const damageTrackConfig = {
  initial: "alive" as const,
  states: {
    alive: {
      tags: ["alive"],
      always: [
        { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
        { guard: "contextDead" as const, target: "#dnd.damageTrack.dead" },
        { guard: "hpZeroUnconscious" as const, target: "#dnd.damageTrack.dying" }
      ],
      on: {
        TAKE_DAMAGE: [
          {
            guard: "instantDeathFromAlive" as const,
            target: "#dnd.damageTrack.dead",
            actions: ["applyDamage", "breakConcentration"]
          },
          {
            // Monster death at 0 HP (SRD: monsters die, no death saves)
            guard: "monsterDropsToZeroHp" as const,
            target: "#dnd.damageTrack.dead",
            actions: ["applyDamage", "breakConcentration"]
          },
          {
            guard: "dropsToZeroHp" as const,
            target: "#dnd.damageTrack.dying",
            actions: ["applyDamage", "setUnconscious", "setRelentlessRagePending"]
          },
          { actions: ["applyDamage"] }
        ],
        HEAL: { actions: ["applyHeal"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: { actions: ["applyKnockOut", "setUnconscious"] },
        APPLY_FALL: [
          {
            guard: "fallInstantDeath" as const,
            target: "#dnd.damageTrack.dead",
            actions: ["applyFall", "breakConcentration"]
          },
          {
            guard: "monsterFallDropsToZero" as const,
            target: "#dnd.damageTrack.dead",
            actions: ["applyFall", "breakConcentration", "monsterDeathCleanup"]
          },
          {
            guard: "fallDropsToZero" as const,
            target: "#dnd.damageTrack.dying",
            actions: ["applyFall", "setUnconscious", "setRelentlessRagePending"]
          },
          { actions: ["applyFall"] }
        ],
        SUFFOCATE: [
          {
            guard: "monsterSuffocates" as const,
            target: "#dnd.damageTrack.dead",
            actions: ["suffocate", "breakConcentration"]
          },
          {
            guard: "canSuffocate" as const,
            target: "#dnd.damageTrack.dying",
            actions: ["suffocate", "setRelentlessRagePending"]
          }
        ]
      }
    },
    dying: {
      tags: ["incapacitated", "dying"],
      initial: "unstable" as const,
      always: [
        // Monster catch-all: monsters die at 0 HP, should never stay in dying state
        { guard: "monsterAtZeroHp" as const, target: "#dnd.damageTrack.dead", actions: ["monsterDeathCleanup"] },
        { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
        { guard: "contextDead" as const, target: "#dnd.damageTrack.dead" },
        { guard: "regainedConsciousness" as const, target: "#dnd.damageTrack.alive" }
      ],
      on: {
        HEAL: { target: "#dnd.damageTrack.alive", actions: ["applyHealFromZero", "clearUnconscious"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: { target: "#dnd.damageTrack.alive", actions: ["applyKnockOut", "setUnconscious"] },
        APPLY_FALL: [...DYING_FALL_PREFIX, { actions: ["applyFallAtZeroHp"] }],
        LONG_REST: [
          {
            guard: "longRestHeals" as const,
            target: "#dnd.damageTrack.alive",
            actions: ["longRest", "classLongRest", "clearUnconscious"]
          },
          {
            guard: "longRestHeals" as const,
            actions: ["longRest", "classLongRest"]
          }
        ],
        SPEND_HIT_DIE: [
          {
            guard: "hitDieHeals" as const,
            target: "#dnd.damageTrack.alive",
            actions: ["spendHitDie", "clearUnconscious"]
          },
          { actions: ["spendHitDie"] }
        ]
      },
      states: {
        unstable: {
          tags: ["unstable"],
          always: { guard: "contextStable" as const, target: "stable" },
          on: {
            TAKE_DAMAGE: [...DYING_TAKE_DAMAGE_PREFIX, { actions: ["applyDamageAtZeroHp"] }],
            DEATH_SAVE: [
              {
                guard: "deathSaveRegainsConsciousness" as const,
                target: "#dnd.damageTrack.alive",
                actions: ["applyDeathSave", "clearUnconscious"]
              },
              { guard: "deathSaveStabilizes" as const, target: "stable", actions: ["applyDeathSave"] },
              { guard: "deathSaveDies" as const, target: "#dnd.damageTrack.dead", actions: ["applyDeathSave"] },
              { actions: ["applyDeathSave"] }
            ],
            STABILIZE: { target: "stable", actions: ["applyStabilize"] }
          }
        },
        stable: {
          tags: ["stable"],
          always: { guard: "contextUnstable" as const, target: "unstable" },
          on: {
            TAKE_DAMAGE: [...DYING_TAKE_DAMAGE_PREFIX, { target: "unstable", actions: ["applyDamageAtZeroHp"] }],
            APPLY_FALL: [...DYING_FALL_PREFIX, { target: "unstable", actions: ["applyFallAtZeroHp"] }]
          }
        }
      }
    },
    dead: { tags: ["dead"], entry: "markDead" as const }
  }
} as const

export const turnPhaseConfig = {
  initial: "outOfCombat" as const,
  states: {
    outOfCombat: {
      tags: ["outOfCombat"],
      on: { ENTER_COMBAT: { target: "waitingForTurn" as const, actions: ["enterCombat"] } }
    },
    acting: {
      tags: ["canAct"],
      on: {
        END_TURN: { target: "waitingForTurn" as const, actions: ["endTurn"] },
        EXIT_COMBAT: { target: "outOfCombat" as const, actions: ["exitCombat"] },
        USE_ACTION: { guard: "hasAction" as const, actions: ["useAction"] },
        USE_BONUS_ACTION: { guard: "hasBonusAction" as const, actions: ["useBonusAction"] },
        USE_REACTION: { guard: "hasReaction" as const, actions: ["useReaction"] },
        USE_MOVEMENT: { actions: ["useMovement"] },
        USE_BONUS_MOVEMENT: { guard: "hasBonusMovement" as const, actions: ["useBonusMovement"] },
        USE_EXTRA_ATTACK: { guard: "hasExtraAttack" as const, actions: ["useExtraAttack"] },
        STAND_FROM_PRONE: { guard: "canStandFromProne" as const, actions: ["standFromProne"] },
        DROP_PRONE: { actions: ["dropProne"] },
        GRANT_EXTRA_ACTION: { actions: ["grantExtraAction"] },
        USE_SECOND_WIND: { guard: "canSecondWind" as const, actions: ["useSecondWind"] },
        USE_ACTION_SURGE: { guard: "canActionSurge" as const, actions: ["useActionSurge"] },
        USE_INDOMITABLE: { guard: "canIndomitable" as const, actions: ["useIndomitable"] },
        SCORE_CRITICAL_HIT: { guard: "canScoreCriticalHit" as const, actions: ["scoreCriticalHit"] },
        MARK_BONUS_ACTION_SPELL: { actions: ["markBonusActionSpell"] },
        MARK_NON_CANTRIP_ACTION_SPELL: { actions: ["markNonCantripActionSpell"] },
        USE_RECHARGE_ABILITY: { actions: ["useRechargeAbility"] },
        USE_DAILY_ABILITY: { actions: ["useDailyAbility"] },
        ENTER_RAGE: { guard: "canEnterRage" as const, actions: ["enterRage"] },
        EXTEND_RAGE_BA: { guard: "canExtendRageBA" as const, actions: ["extendRageBA"] },
        DECLARE_RECKLESS: { guard: "canDeclareReckless" as const, actions: ["declareReckless"] },
        USE_INTIMIDATING_PRESENCE: { guard: "canIntimidatingPresence" as const, actions: ["useIntimidatingPresence"] },
        USE_BRUTAL_STRIKE: { guard: "canBrutalStrike" as const, actions: ["useBrutalStrike"] },
        FLURRY_OF_BLOWS: { guard: "canMonkFocusBA" as const, actions: ["flurryOfBlows"] },
        PATIENT_DEFENSE_FREE: { guard: "canMonkFreeBA" as const, actions: ["patientDefenseFree"] },
        PATIENT_DEFENSE_FOCUS: { guard: "canMonkFocusBA" as const, actions: ["patientDefenseFocus"] },
        STEP_OF_THE_WIND_FREE: { guard: "canMonkFreeBA" as const, actions: ["stepOfTheWindFree"] },
        STEP_OF_THE_WIND_FOCUS: { guard: "canMonkFocusBA" as const, actions: ["stepOfTheWindFocus"] },
        STUNNING_STRIKE: { guard: "canStunningStrike" as const, actions: ["stunningStrike"] },
        WHOLENESS_OF_BODY: { guard: "canWholenessOfBody" as const, actions: ["wholenessOfBody"] },
        UNCANNY_METABOLISM: { guard: "canUncannyMetabolism" as const, actions: ["uncannyMetabolism"] },
        USE_ARCANE_RECOVERY: { guard: "canArcaneRecovery" as const, actions: ["useArcaneRecovery"] },
        USE_OVERCHANNEL: { guard: "canOverchannel" as const, actions: ["useOverchannel"] },
        USE_SNEAK_ATTACK: { guard: "canSneakAttack" as const, actions: ["useSneakAttack"] },
        USE_STEADY_AIM: { guard: "canSteadyAim" as const, actions: ["useSteadyAim"] },
        CUNNING_ACTION_DASH: { guard: "canCunningAction" as const, actions: ["cunningActionDash"] },
        CUNNING_ACTION_DISENGAGE: { guard: "canCunningAction" as const, actions: ["cunningActionDisengage"] },
        CUNNING_ACTION_HIDE: { guard: "canCunningAction" as const, actions: ["cunningActionHide"] },
        USE_UNCANNY_DODGE: { guard: "canUncannyDodge" as const, actions: ["useUncannyDodge"] },
        USE_CUNNING_STRIKE: { guard: "canCunningStrike" as const, actions: ["useCunningStrike"] },
        USE_CLERIC_CHANNEL_DIVINITY: { guard: "canClericCD" as const, actions: ["useClericChannelDivinity"] },
        USE_LAY_ON_HANDS: { guard: "canLayOnHands" as const, actions: ["useLayOnHands"] },
        USE_PALADIN_CHANNEL_DIVINITY: { guard: "canPaladinCD" as const, actions: ["usePaladinChannelDivinity"] },
        USE_DIVINE_SMITE: { guard: "canDivineSmite" as const, actions: ["useDivineSmite"] },
        USE_DIVINE_SMITE_FREE: { guard: "canDivineSmiteFree" as const, actions: ["useDivineSmiteFree"] },
        USE_MAGICAL_CUNNING: { guard: "canMagicalCunning" as const, actions: ["useMagicalCunning"] },
        USE_MYSTIC_ARCANUM: { guard: "canMysticArcanum" as const, actions: ["useMysticArcanum"] },
        USE_ELDRITCH_SMITE: { guard: "canEldritchSmite" as const, actions: ["useEldritchSmite"] },
        CONVERT_SLOT_TO_POINTS: { guard: "canConvertSlotToPoints" as const, actions: ["convertSlotToPoints"] },
        CONVERT_POINTS_TO_SLOT: { guard: "canConvertPointsToSlot" as const, actions: ["convertPointsToSlot"] },
        USE_INNATE_SORCERY: { guard: "canInnateSorcery" as const, actions: ["useInnateSorcery"] },
        USE_METAMAGIC: { guard: "canMetamagic" as const, actions: ["useMetamagic"] },
        ENTER_WILD_SHAPE: { guard: "canEnterWildShape" as const, actions: ["enterWildShape"] },
        EXIT_WILD_SHAPE: { guard: "canExitWildShape" as const, actions: ["exitWildShape"] },
        USE_WILD_RESURGENCE_CHARGE: { guard: "canWildResurgenceCharge" as const, actions: ["wildResurgenceCharge"] },
        USE_WILD_RESURGENCE_SLOT: { guard: "canWildResurgenceSlot" as const, actions: ["wildResurgenceSlot"] },
        USE_FREE_HUNTERS_MARK: { guard: "canFreeHuntersMark" as const, actions: ["useFreeHuntersMark"] },
        USE_TIRELESS: { guard: "canTireless" as const, actions: ["useTireless"] },
        USE_NATURES_VEIL: { guard: "canNaturesVeil" as const, actions: ["useNaturesVeil"] },
        USE_BARDIC_INSPIRATION: { guard: "canBardicInspiration" as const, actions: ["useBardicInspiration"] },
        USE_CUTTING_WORDS: { guard: "canCuttingWords" as const, actions: ["useCuttingWords"] },
        USE_FONT_SLOT_RESTORE: { guard: "canFontSlotRestore" as const, actions: ["useFontSlotRestore"] }
      }
    },
    waitingForTurn: {
      tags: ["inCombat"],
      on: {
        START_TURN: {
          target: "acting" as const,
          actions: ["initTurn", "classStartTurn"]
        },
        EXIT_COMBAT: { target: "outOfCombat" as const, actions: ["exitCombat"] },
        USE_LEGENDARY_ACTION: { actions: ["useLegendaryAction"] }
      }
    }
  }
} as const

export const spellcastingConfig = {
  initial: "idle" as const,
  states: {
    idle: {
      on: {
        START_CONCENTRATION: {
          guard: "canConcentrate" as const,
          target: "concentrating",
          actions: ["startConcentration"]
        }
      }
    },
    concentrating: {
      tags: ["concentrating"],
      always: { guard: "shouldBreakConcentration" as const, target: "idle", actions: ["breakConcentration"] },
      on: {
        BREAK_CONCENTRATION: { target: "idle", actions: ["breakConcentration"] },
        CONCENTRATION_CHECK: { actions: ["concentrationCheck"] },
        START_CONCENTRATION: { guard: "canConcentrate" as const, actions: ["startConcentration"] }
      }
    }
  }
} as const

export const rootEventHandlers = {
  APPLY_CONDITION: { actions: ["applyCondition"] },
  REMOVE_CONDITION: { actions: ["removeCondition"] },
  ADD_EFFECT: { actions: ["addEffect"] },
  REMOVE_EFFECT: { actions: ["removeEffect"] },
  ADD_EXHAUSTION: { actions: ["addExhaustion"] },
  REDUCE_EXHAUSTION: { actions: ["reduceExhaustion"] },
  GRAPPLE: { actions: ["applyGrapple"] },
  SET_GRAPPLING_STATE: { actions: ["setGrapplingState"] },
  RELEASE_GRAPPLE: { actions: ["releaseGrapple"] },
  ESCAPE_GRAPPLE: { actions: ["escapeGrapple"] },
  SHOVE: { actions: ["applyShove"] },
  EXPEND_SLOT: { guard: "canExpendSlot" as const, actions: ["expendSlot"] },
  EXPEND_PACT_SLOT: { guard: "canExpendSlot" as const, actions: ["expendPactSlot"] },
  CAST_PREPARED_SPELL: { guard: "canCastPreparedSpell" as const, actions: ["castPreparedSpell"] },
  SHORT_REST: {
    guard: "canShortRestStart" as const,
    actions: ["shortRest", "classShortRest"]
  },
  LONG_REST: {
    guard: "longRestHeals" as const,
    actions: ["longRest", "classLongRest"]
  },
  SPEND_HIT_DIE: { actions: ["spendHitDie"] },
  APPLY_STARVATION: { actions: ["applyStarvation"] },
  APPLY_DEHYDRATION: { actions: ["applyDehydration"] },
  CLEAR_PENDING_RESOLUTION: { actions: ["clearPendingResolution"] },
  TRIGGER_TACTICAL_MIND: { actions: ["triggerTacticalMind"] },
  TRIGGER_PEERLESS_SKILL_ABILITY_CHECK: { actions: ["triggerPeerlessSkillAbilityCheck"] },
  TRIGGER_PEERLESS_SKILL_ATTACK_ROLL: { actions: ["triggerPeerlessSkillAttackRoll"] },
  USE_TACTICAL_MIND: { guard: "canTacticalMind" as const, actions: ["useTacticalMind"] },
  USE_HEROIC_INSPIRATION: { actions: ["useHeroicInspiration"] },
  USE_PEERLESS_SKILL: { guard: "canPeerlessSkill" as const, actions: ["usePeerlessSkill"] },
  END_RAGE: { guard: "isRaging" as const, actions: ["endRage"] },
  MARK_ATTACK_OR_FORCED_SAVE: { guard: "isRaging" as const, actions: ["markAttackOrForcedSave"] },
  RESTORE_INTIMIDATING_PRESENCE: { actions: ["restoreIntimidatingPresence"] },
  USE_RELENTLESS_RAGE: { guard: "canRelentlessRage" as const, actions: ["useRelentlessRage"] }
} as const
