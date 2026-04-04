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
      always: [
        { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead", actions: ["monsterDeathCleanup"] },
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
            actions: ["applyDamage", "setUnconscious"]
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
            actions: ["applyFall", "setUnconscious"]
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
            actions: ["suffocate"]
          }
        ]
      }
    },
    dying: {
      initial: "unstable" as const,
      always: [
        // Monster catch-all: monsters die at 0 HP, should never stay in dying state
        { guard: "monsterAtZeroHp" as const, target: "#dnd.damageTrack.dead", actions: ["monsterDeathCleanup"] },
        { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead", actions: ["monsterDeathCleanup"] },
        { guard: "contextDead" as const, target: "#dnd.damageTrack.dead" },
        { guard: "regainedConsciousness" as const, target: "#dnd.damageTrack.alive" }
      ],
      on: {
        HEAL: { target: "#dnd.damageTrack.alive", actions: ["applyHealFromZero", "clearUnconscious"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: { target: "#dnd.damageTrack.alive", actions: ["applyKnockOut", "setUnconscious"] },
        APPLY_FALL: [...DYING_FALL_PREFIX, { actions: ["applyFallAtZeroHp"] }],
        SHORT_REST: [
          {
            guard: "shortRestHeals" as const,
            target: "#dnd.damageTrack.alive",
            actions: ["shortRest", "classShortRest", "clearUnconscious"]
          },
          {
            guard: "isOutOfCombat" as const,
            actions: ["shortRest", "classShortRest"]
          }
        ],
        LONG_REST: [
          {
            guard: "longRestHeals" as const,
            target: "#dnd.damageTrack.alive",
            actions: ["longRest", "classLongRest", "clearUnconscious"]
          },
          {
            guard: "isOutOfCombat" as const,
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
          always: { guard: "contextUnstable" as const, target: "unstable" },
          on: {
            TAKE_DAMAGE: [...DYING_TAKE_DAMAGE_PREFIX, { target: "unstable", actions: ["applyDamageAtZeroHp"] }],
            APPLY_FALL: [...DYING_FALL_PREFIX, { target: "unstable", actions: ["applyFallAtZeroHp"] }]
          }
        }
      }
    },
    dead: { entry: "markDead" as const }
  }
} as const

export const turnPhaseConfig = {
  initial: "outOfCombat" as const,
  states: {
    outOfCombat: {
      on: { ENTER_COMBAT: { target: "waitingForTurn" as const, actions: ["enterCombat"] } }
    },
    acting: {
      on: {
        END_TURN: { target: "waitingForTurn" as const, actions: ["endTurn"] },
        EXIT_COMBAT: { target: "outOfCombat" as const, actions: ["exitCombat"] },
        USE_ACTION: { actions: ["useAction"] },
        USE_BONUS_ACTION: { actions: ["useBonusAction"] },
        USE_REACTION: { actions: ["useReaction"] },
        USE_MOVEMENT: { actions: ["useMovement"] },
        USE_BONUS_MOVEMENT: { actions: ["useBonusMovement"] },
        USE_EXTRA_ATTACK: { actions: ["useExtraAttack"] },
        STAND_FROM_PRONE: { guard: "canStandFromProne" as const, actions: ["standFromProne"] },
        DROP_PRONE: { actions: ["dropProne"] },
        GRANT_EXTRA_ACTION: { actions: ["grantExtraAction"] },
        USE_SECOND_WIND: { actions: ["useSecondWind"] },
        USE_ACTION_SURGE: { actions: ["useActionSurge"] },
        USE_INDOMITABLE: { actions: ["useIndomitable"] },
        USE_TACTICAL_MIND: { actions: ["useTacticalMind"] },

        SCORE_CRITICAL_HIT: { actions: ["scoreCriticalHit"] },
        MARK_BONUS_ACTION_SPELL: { actions: ["markBonusActionSpell"] },
        MARK_NON_CANTRIP_ACTION_SPELL: { actions: ["markNonCantripActionSpell"] },
        USE_RECHARGE_ABILITY: { actions: ["useRechargeAbility"] },
        USE_DAILY_ABILITY: { actions: ["useDailyAbility"] },
        ENTER_RAGE: { actions: ["enterRage"] },
        EXTEND_RAGE_BA: { actions: ["extendRageBA"] },
        DECLARE_RECKLESS: { actions: ["declareReckless"] },
        USE_INTIMIDATING_PRESENCE: { actions: ["useIntimidatingPresence"] },
        USE_BRUTAL_STRIKE: { actions: ["useBrutalStrike"] },
        FLURRY_OF_BLOWS: { actions: ["flurryOfBlows"] },
        PATIENT_DEFENSE_FREE: { actions: ["patientDefenseFree"] },
        PATIENT_DEFENSE_FOCUS: { actions: ["patientDefenseFocus"] },
        STEP_OF_THE_WIND_FREE: { actions: ["stepOfTheWindFree"] },
        STEP_OF_THE_WIND_FOCUS: { actions: ["stepOfTheWindFocus"] },
        STUNNING_STRIKE: { actions: ["stunningStrike"] },
        WHOLENESS_OF_BODY: { actions: ["wholenessOfBody"] },
        UNCANNY_METABOLISM: { actions: ["uncannyMetabolism"] },
        USE_ARCANE_RECOVERY: { actions: ["useArcaneRecovery"] },
        USE_OVERCHANNEL: { actions: ["useOverchannel"] },
        USE_SNEAK_ATTACK: { actions: ["useSneakAttack"] },
        USE_STEADY_AIM: { actions: ["useSteadyAim"] },
        CUNNING_ACTION_DASH: { actions: ["cunningActionDash"] },
        CUNNING_ACTION_DISENGAGE: { actions: ["cunningActionDisengage"] },
        CUNNING_ACTION_HIDE: { actions: ["cunningActionHide"] },
        USE_UNCANNY_DODGE: { actions: ["useUncannyDodge"] },
        USE_CUNNING_STRIKE: { actions: ["useCunningStrike"] },
        USE_CLERIC_CHANNEL_DIVINITY: { actions: ["useClericChannelDivinity"] },
        USE_LAY_ON_HANDS: { actions: ["useLayOnHands"] },
        USE_PALADIN_CHANNEL_DIVINITY: { actions: ["usePaladinChannelDivinity"] },
        USE_DIVINE_SMITE: { actions: ["useDivineSmite"] },
        USE_DIVINE_SMITE_FREE: { actions: ["useDivineSmiteFree"] },
        USE_MAGICAL_CUNNING: { actions: ["useMagicalCunning"] },
        USE_MYSTIC_ARCANUM: { actions: ["useMysticArcanum"] },
        USE_ELDRITCH_SMITE: { actions: ["useEldritchSmite"] },
        CONVERT_SLOT_TO_POINTS: { actions: ["convertSlotToPoints"] },
        CONVERT_POINTS_TO_SLOT: { actions: ["convertPointsToSlot"] },
        USE_INNATE_SORCERY: { actions: ["useInnateSorcery"] },
        USE_METAMAGIC: { actions: ["useMetamagic"] },
        ENTER_WILD_SHAPE: { actions: ["enterWildShape"] },
        EXIT_WILD_SHAPE: { actions: ["exitWildShape"] },
        USE_WILD_RESURGENCE_CHARGE: { actions: ["wildResurgenceCharge"] },
        USE_WILD_RESURGENCE_SLOT: { actions: ["wildResurgenceSlot"] },
        USE_FREE_HUNTERS_MARK: { actions: ["useFreeHuntersMark"] },
        USE_TIRELESS: { actions: ["useTireless"] },
        USE_NATURES_VEIL: { actions: ["useNaturesVeil"] },
        USE_BARDIC_INSPIRATION: { actions: ["useBardicInspiration"] },
        USE_CUTTING_WORDS: { actions: ["useCuttingWords"] },
        USE_FONT_SLOT_RESTORE: { actions: ["useFontSlotRestore"] },
        USE_PEERLESS_SKILL: { actions: ["usePeerlessSkill"] }
      }
    },
    waitingForTurn: {
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
  RELEASE_GRAPPLE: { actions: ["releaseGrapple"] },
  ESCAPE_GRAPPLE: { actions: ["escapeGrapple"] },
  SHOVE: { actions: ["applyShove"] },
  EXPEND_SLOT: { guard: "canExpendSlot" as const, actions: ["expendSlot"] },
  EXPEND_PACT_SLOT: { guard: "canExpendSlot" as const, actions: ["expendPactSlot"] },
  SHORT_REST: {
    guard: "isOutOfCombat" as const,
    actions: ["shortRest", "classShortRest"]
  },
  LONG_REST: {
    guard: "isOutOfCombat" as const,
    actions: ["longRest", "classLongRest"]
  },
  SPEND_HIT_DIE: { actions: ["spendHitDie"] },
  APPLY_STARVATION: { actions: ["applyStarvation"] },
  APPLY_DEHYDRATION: { actions: ["applyDehydration"] },
  USE_HEROIC_INSPIRATION: { actions: ["useHeroicInspiration"] },
  END_RAGE: { actions: ["endRage"] },
  MARK_ATTACK_OR_FORCED_SAVE: { actions: ["markAttackOrForcedSave"] },
  RESTORE_INTIMIDATING_PRESENCE: { actions: ["restoreIntimidatingPresence"] },
  USE_RELENTLESS_RAGE: { actions: ["useRelentlessRage"] }
} as const
