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
  { guard: "fallInstantDeathFromDying" as const, target: "#dnd.damageTrack.dead", actions: ["applyFall", "breakConcentration"] },
  {
    guard: "deathFromFallFailures" as const,
    target: "#dnd.damageTrack.dead",
    actions: ["applyFallAtZeroHp", "breakConcentration"]
  }
] as const

export const damageTrackConfig = {
  initial: "conscious" as const,
  states: {
    conscious: {
      always: { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
      on: {
        TAKE_DAMAGE: [
          { guard: "instantDeathFromConscious" as const, target: "#dnd.damageTrack.dead", actions: ["applyDamage", "breakConcentration"] },
          {
            guard: "dropsToZeroHp" as const,
            target: "#dnd.damageTrack.dying",
            actions: ["applyDamage", "setUnconscious"]
          },
          { actions: ["applyDamage"] }
        ],
        HEAL: { actions: ["applyHeal"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: {
          target: "#dnd.damageTrack.dying.stable",
          actions: ["applyKnockOut", "setUnconscious"]
        },
        APPLY_FALL: [
          { guard: "fallInstantDeath" as const, target: "#dnd.damageTrack.dead", actions: ["applyFall", "breakConcentration"] },
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
      always: { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
      on: {
        HEAL: { target: "#dnd.damageTrack.conscious", actions: ["applyHealFromZero", "clearUnconscious"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: {
          target: "#dnd.damageTrack.dying.stable",
          actions: ["applyKnockOut", "setUnconscious"]
        },
        APPLY_FALL: [...DYING_FALL_PREFIX, { actions: ["applyFallAtZeroHp"] }],
        SHORT_REST: [
          {
            guard: "shortRestHeals" as const,
            target: "#dnd.damageTrack.conscious",
            actions: ["shortRest", "clearUnconscious"]
          },
          { actions: ["shortRest"] }
        ],
        LONG_REST: [
          {
            guard: "longRestHeals" as const,
            target: "#dnd.damageTrack.conscious",
            actions: ["longRest", "clearUnconscious"]
          },
          { actions: ["longRest"] }
        ],
        SPEND_HIT_DIE: [
          {
            guard: "hitDieHeals" as const,
            target: "#dnd.damageTrack.conscious",
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
                target: "#dnd.damageTrack.conscious",
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
    dead: {}
  }
} as const

const START_TURN_TRANSITIONS = [
  { guard: "isSurprised" as const, target: "surprised", actions: ["initTurn"] },
  { target: "acting", actions: ["initTurn"] }
] as const

export const turnPhaseConfig = {
  initial: "outOfCombat" as const,
  states: {
    outOfCombat: { on: { START_TURN: START_TURN_TRANSITIONS } },
    acting: {
      on: { START_TURN: START_TURN_TRANSITIONS }
    },
    surprised: {
      on: {
        END_SURPRISE_TURN: { target: "outOfCombat", actions: ["endSurprise"] },
        START_TURN: START_TURN_TRANSITIONS
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
    idle: { on: { START_CONCENTRATION: { target: "concentrating", actions: ["startConcentration"] } } },
    concentrating: {
      always: { guard: "shouldBreakConcentration" as const, target: "idle", actions: ["breakConcentration"] },
      on: {
        BREAK_CONCENTRATION: { target: "idle", actions: ["breakConcentration"] },
        CONCENTRATION_CHECK: { actions: ["concentrationCheck"] },
        START_CONCENTRATION: { actions: ["startConcentration"] }
      }
    }
  }
} as const

export const rootEventHandlers = {
  ADD_EXHAUSTION: { actions: ["addExhaustion"] },
  REDUCE_EXHAUSTION: { actions: ["reduceExhaustion"] },
  GRAPPLE: { actions: ["applyGrapple"] },
  RELEASE_GRAPPLE: { actions: ["releaseGrapple"] },
  ESCAPE_GRAPPLE: { actions: ["escapeGrapple"] },
  SHOVE: { actions: ["applyShove"] },
  EXPEND_SLOT: { actions: ["expendSlot"] },
  EXPEND_PACT_SLOT: { actions: ["expendPactSlot"] },
  SHORT_REST: { actions: ["shortRest"] },
  LONG_REST: { actions: ["longRest"] },
  SPEND_HIT_DIE: { actions: ["spendHitDie"] },
  APPLY_STARVATION: { actions: ["applyStarvation"] },
  APPLY_DEHYDRATION: { actions: ["applyDehydration"] },
  USE_ACTION: { actions: ["useAction"] },
  USE_BONUS_ACTION: { actions: ["useBonusAction"] },
  USE_REACTION: { actions: ["useReaction"] },
  USE_MOVEMENT: { actions: ["useMovement"] },
  USE_EXTRA_ATTACK: { actions: ["useExtraAttack"] },
  STAND_FROM_PRONE: { guard: "canStandFromProne" as const, actions: ["standFromProne"] },
  DROP_PRONE: { actions: ["dropProne"] },
  MARK_BONUS_ACTION_SPELL: { actions: ["markBonusActionSpell"] },
  MARK_NON_CANTRIP_ACTION_SPELL: { actions: ["markNonCantripActionSpell"] }
} as const
