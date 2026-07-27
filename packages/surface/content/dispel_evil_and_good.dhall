-- Dispel Evil and Good - SRD 5.2.1 Spell, level 5, Abjuration.

let dispelEvilAndGood =
      { kind = "spell"
      , id = "dispel_evil_and_good"
      , name = "Dispel Evil and Good"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dispel Evil and Good"
          }

      , mechanics =
          { family = "ongoing_effect"
          , level = 5
          , school = "abjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "self" }
          , components =
              { v = True, s = True, m = "powdered silver and iron" }
          , duration =
              { kind = "concentration", upTo = { unit = "minute", amount = 1 } }
          , attachment = { kind = "self" }
          , operations =
              [ { trigger = { kind = "passive" }
                , effect =
                    { kind = "modify_roll_advantage"
                    , mode = "disadvantage"
                    , affects = "rolls_against_self"
                    , on = [ "attack_roll" ]
                    , attackerTypeFilter =
                        [ "celestial", "elemental", "fey", "fiend", "undead" ]
                    }
                }
              ]
          }
      }

in  dispelEvilAndGood
