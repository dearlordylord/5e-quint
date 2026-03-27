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
            guard: "fallDropsToZero" as const,
            target: "#dnd.damageTrack.dying",
            actions: ["applyFall", "setUnconscious"]
          },
          { actions: ["applyFall"] }
        ],
        SUFFOCATE: {
          guard: "canSuffocate" as const,
          target: "#dnd.damageTrack.dying",
          actions: ["suffocate"]
        }
      }
    },
    dying: {
      initial: "unstable" as const,
      always: [
        { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
        { guard: "contextDead" as const, target: "#dnd.damageTrack.dead" },
        { guard: "regainedConsciousness" as const, target: "#dnd.damageTrack.alive" }
      ],
      on: {
        HEAL: { target: "#dnd.damageTrack.alive", actions: ["applyHealFromZero", "clearUnconscious"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: { target: "#dnd.damageTrack.alive", actions: ["applyKnockOut"] },
        APPLY_FALL: [...DYING_FALL_PREFIX, { actions: ["applyFallAtZeroHp"] }],
        SHORT_REST: [
          {
            guard: "shortRestHeals" as const,
            target: "#dnd.damageTrack.alive",
            actions: ["shortRest", "fighterShortRest", "clearUnconscious"]
          },
          { guard: "isOutOfCombat" as const, actions: ["shortRest", "fighterShortRest"] }
        ],
        LONG_REST: [
          {
            guard: "longRestHeals" as const,
            target: "#dnd.damageTrack.alive",
            actions: ["longRest", "fighterLongRest", "clearUnconscious"]
          },
          { guard: "isOutOfCombat" as const, actions: ["longRest", "fighterLongRest"] }
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
        USE_EXTRA_ATTACK: { actions: ["useExtraAttack"] },
        STAND_FROM_PRONE: { guard: "canStandFromProne" as const, actions: ["standFromProne"] },
        DROP_PRONE: { actions: ["dropProne"] },
        GRANT_EXTRA_ACTION: { actions: ["grantExtraAction"] },
        USE_SECOND_WIND: { actions: ["useSecondWind"] },
        USE_ACTION_SURGE: { actions: ["useActionSurge"] },
        USE_INDOMITABLE: { actions: ["useIndomitable"] },
        MARK_BONUS_ACTION_SPELL: { actions: ["markBonusActionSpell"] },
        MARK_NON_CANTRIP_ACTION_SPELL: { actions: ["markNonCantripActionSpell"] }
      }
    },
    waitingForTurn: {
      on: {
        START_TURN: { target: "acting" as const, actions: ["initTurn", "fighterStartTurn"] },
        EXIT_COMBAT: { target: "outOfCombat" as const, actions: ["exitCombat"] }
      }
    }
  }
} as const

export const conditionTrackConfig = {
  initial: "tracking" as const,
  states: {
    tracking: {
      on: { APPLY_CONDITION: { actions: ["applyCondition"] }, REMOVE_CONDITION: { actions: ["removeCondition"] } }
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
  SHORT_REST: { guard: "isOutOfCombat" as const, actions: ["shortRest", "fighterShortRest"] },
  LONG_REST: { guard: "isOutOfCombat" as const, actions: ["longRest", "fighterLongRest"] },
  SPEND_HIT_DIE: { actions: ["spendHitDie"] },
  APPLY_STARVATION: { actions: ["applyStarvation"] },
  APPLY_DEHYDRATION: { actions: ["applyDehydration"] }
} as const
