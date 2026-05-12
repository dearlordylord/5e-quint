-- Feather Fall - SRD 5.2.1 Spell, level 1, Transmutation.
--
-- RAW (Spells / Descriptions E-L / Feather Fall):
--   "Reaction, which you take when you or a creature you can see within
--    60 feet of you falls"
--   "Choose up to five falling creatures within range."
--   "A falling creature's rate of descent slows to 60 feet per round
--    until the spell ends."
--   "If a creature lands before the spell ends, the creature takes no
--    damage from the fall, and the spell ends for that creature."
--
-- SURFACE WIDENING REFERENCE (SRDINV47). The trigger and target state
-- record caller-supplied falling facts. The mitigation atom records the
-- descent cap, fall-damage prevention, and per-target landing cleanup.
-- Runtime falling simulation, fall distance, and landing geometry remain
-- with table/runtime movement owners.

let featherFall =
      { kind = "spell"
      , id = "feather_fall"
      , name = "Feather Fall"
      , provenance =
          { kind = "srd-5.2.1", section = "Spells/Descriptions-E-L#Feather Fall" }
      , description =
          "Choose up to five falling creatures within range. A falling creature's rate of descent slows to 60 feet per round until the spell ends. If a creature lands before the spell ends, the creature takes no damage from the fall, and the spell ends for that creature."
      , mechanics =
          { family = "triggered_reaction"
          , level = 1
          , school = "transmutation"
          , castingTime =
              { kind = "reaction"
              , trigger =
                  { kind = "self_or_visible_creature_falls", rangeFeet = 60 }
              }
          , range = { kind = "point", feet = 60 }
          , components =
              { v = True
              , s = False
              , m = Some "a small feather or piece of down"
              }
          , duration = { kind = "timed", value = { unit = "minute", amount = 1 } }
          , interruptsTrigger = True
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "feather_fall_targets"
                    , label = "falling targets"
                    , value =
                        { kind = "target"
                        , selection =
                            { mode = "choose_up_to"
                            , count = 5
                            , targetKinds = [ "creature" ]
                            , stateFilter = [ "falling" ]
                            }
                        }
                    }
                , effects =
                    [ { kind = "feather_fall_mitigation"
                      , descentRateCapFeetPerRound = 60
                      , landingOutcome = "no_fall_damage_and_end_for_target"
                      }
                    ]
                }
              ]
          }
      }

in  featherFall
