-- Revivify - SRD 5.2.1 Spell, level 3, Necromancy.
--
-- RAW (Spells/Descriptions-Q-R#Revivify):
--   "You touch a creature that has died within the last minute. That creature
--    revives with 1 Hit Point. This spell can't revive a creature that has
--    died of old age, nor does it restore any missing body parts."
--
-- RAW (Rules-Glossary#Dead):
--   "When such a spell is cast, the spirit knows who is casting it and can
--    refuse."
--   "Unless otherwise stated, the creature returns to life with any
--    conditions, magical contagions, or curses that were affecting it at death
--    if the durations of those effects are still ongoing."
--   "If the creature died with any Exhaustion levels, it returns with 1 fewer
--    level. If the creature had Attunement to one or more magic items, it is no
--    longer attuned to them."
--
-- This Spell Definition records Revivify's death timing, return Hit Points,
-- old-age and missing-body-part exclusions, and Dead-glossary return-state
-- boundaries. It does not claim promoted battle-runtime execution; broader
-- death-state, spirit-refusal, condition/cursing/contagion persistence,
-- Exhaustion adjustment, and Attunement cleanup belong to the deferred
-- rest/revival workflow owner.

let revivify =
      { kind = "spell"
      , id = "revivify"
      , name = "Revivify"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-Q-R#Revivify"
          }
      , description =
          "You touch a creature that has died within the last minute. That creature revives with 1 Hit Point. This spell can't revive a creature that has died of old age, nor does it restore any missing body parts. When revival magic is cast, the spirit knows who is casting it and can refuse. Unless otherwise stated, a creature that returns to life keeps conditions, magical contagions, and curses whose durations are still ongoing, returns with 1 fewer Exhaustion level, and is no longer attuned to magic items."
      , mechanics =
          { family = "activation"
          , level = 3
          , school = "necromancy"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components =
              { v = True
              , s = True
              , m = Some "a diamond worth 300+ GP, which the spell consumes"
              , materialCostGp = 300
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "revivify_target"
                    , label = "dead creature"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "one"
                            , targetKinds = [ "creature" ]
                            , stateFilter = [ "dead" ]
                            }
                        }
                    }
                , effects =
                    [ { kind = "revive_dead_creature"
                      , deathWindow = { unit = "minute", amount = 1 }
                      , hitPoints = 1
                      , spiritConsent = "can_refuse"
                      , excludedDeathCauses = [ "old_age" ]
                      , missingBodyParts = "not_restored"
                      , returningOngoingEffects =
                          { conditions = "preserve_if_duration_ongoing"
                          , magicalContagions =
                              "preserve_if_duration_ongoing"
                          , curses = "preserve_if_duration_ongoing"
                          , exhaustion = { kind = "reduce_by", amount = 1 }
                          , attunement = "ends"
                          }
                      }
                    ]
                }
              ]
          }
      }

in  revivify
