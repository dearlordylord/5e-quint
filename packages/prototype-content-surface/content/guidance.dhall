-- Guidance — SRD 5.2.1 Divination Cantrip (Cleric, Druid).
--
-- RAW (Spells / Descriptions E-L / Guidance):
--   "You touch a willing creature and choose a skill. Until the spell
--    ends, the creature adds 1d4 to any ability check using the chosen
--    skill."
--
-- Uses SkillFilter.choice (§A1) for cast-time skill pick, and the
-- unified ongoing trigger grammar (§A15): trigger=passive + effect=
-- modify_roll_numeric.

let guidance =
      { kind = "spell"
      , id = "guidance"
      , name = "Guidance"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Guidance"
          }
      , description =
          "You touch a willing creature and choose a skill. Until the spell ends, the creature adds 1d4 to any ability check using the chosen skill."
      , mechanics =
          { family = "ongoing_effect"
          , level = 0
          , school = "divination"
          , castingTime = { kind = "action" }
          , range = { kind = "touch" }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , attachment =
              { kind = "target"
              , selection = { mode = "one" }
              }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_roll_numeric"
                    , on = [ "ability_check" ]
                    , delta =
                        { kind = "fixed_dice"
                        , dice = 1
                        , dieSize = 4
                        , sign = "+"
                        }
                    , skillFilter =
                        { kind = "choice"
                        , options =
                            [ "acrobatics"
                            , "animal_handling"
                            , "arcana"
                            , "athletics"
                            , "deception"
                            , "history"
                            , "insight"
                            , "intimidation"
                            , "investigation"
                            , "medicine"
                            , "nature"
                            , "perception"
                            , "performance"
                            , "persuasion"
                            , "religion"
                            , "sleight_of_hand"
                            , "stealth"
                            , "survival"
                            ]
                        }
                    }
                }
              ]
          }
      }

in  guidance
