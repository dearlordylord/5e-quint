export const damageTrackConfig = {
  initial: "conscious" as const,
  states: {
    conscious: {
      always: { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
      on: {
        TAKE_DAMAGE: [
          { guard: "instantDeathFromConscious" as const, target: "#dnd.damageTrack.dead", actions: ["applyDamage"] },
          {
            guard: "dropsToZeroHp" as const,
            target: "#dnd.damageTrack.dying",
            actions: ["applyDamage", "setUnconscious"]
          },
          { actions: ["applyDamage"] }
        ],
        HEAL: { actions: ["applyHeal"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] },
        KNOCK_OUT: { target: "#dnd.damageTrack.dying.stable", actions: ["applyKnockOut", "setUnconscious"] }
      }
    },
    dying: {
      initial: "unstable" as const,
      always: { guard: "exhaustionDeath" as const, target: "#dnd.damageTrack.dead" },
      on: {
        HEAL: { target: "#dnd.damageTrack.conscious", actions: ["applyHealFromZero", "clearUnconscious"] },
        GRANT_TEMP_HP: { actions: ["applyTempHp"] }
      },
      states: {
        unstable: {
          on: {
            TAKE_DAMAGE: [
              { guard: "noDamageThrough" as const, actions: ["absorbTempHpOnly"] },
              {
                guard: "instantDeathFromDying" as const,
                target: "#dnd.damageTrack.dead",
                actions: ["absorbTempHpOnly"]
              },
              {
                guard: "deathFromDamageFailures" as const,
                target: "#dnd.damageTrack.dead",
                actions: ["applyDamageAtZeroHp"]
              },
              { actions: ["applyDamageAtZeroHp"] }
            ],
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
            TAKE_DAMAGE: [
              { guard: "noDamageThrough" as const, actions: ["absorbTempHpOnly"] },
              {
                guard: "instantDeathFromDying" as const,
                target: "#dnd.damageTrack.dead",
                actions: ["absorbTempHpOnly"]
              },
              {
                guard: "deathFromDamageFailures" as const,
                target: "#dnd.damageTrack.dead",
                actions: ["applyDamageAtZeroHp"]
              },
              { target: "unstable", actions: ["applyDamageAtZeroHp"] }
            ]
          }
        }
      }
    },
    dead: { entry: ["breakConcentration"] }
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
      on: {
        START_TURN: START_TURN_TRANSITIONS,
        USE_ACTION: { actions: ["useAction"] },
        USE_BONUS_ACTION: { actions: ["useBonusAction"] },
        USE_REACTION: { actions: ["useReaction"] },
        USE_MOVEMENT: { actions: ["useMovement"] },
        USE_EXTRA_ATTACK: { actions: ["useExtraAttack"] },
        STAND_FROM_PRONE: { guard: "canStandFromProne" as const, actions: ["standFromProne"] },
        DROP_PRONE: { actions: ["dropProne"] },
        MARK_BONUS_ACTION_SPELL: { actions: ["markBonusActionSpell"] },
        MARK_NON_CANTRIP_ACTION_SPELL: { actions: ["markNonCantripActionSpell"] }
      }
    },
    surprised: {
      on: {
        END_SURPRISE_TURN: { target: "outOfCombat", actions: ["endSurprise"] },
        START_TURN: START_TURN_TRANSITIONS
      }
    }
  }
} as const
