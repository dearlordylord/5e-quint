-- Dispel Evil and Good - SRD 5.2.1 Spell, level 5, Abjuration.

let dispelEvilAndGood =
      { kind = "spell"
      , id = "dispel_evil_and_good"
      , name = "Dispel Evil and Good"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Dispel Evil and Good"
          }
      , description =
          "For the duration, Celestials, Elementals, Fey, Fiends, and Undead have Disadvantage on attack rolls against you. You can end the spell early by using either of the following special functions. As a Magic action, you touch a creature that is possessed by or has the Charmed or Frightened condition from one or more creatures of the types above. The target is no longer possessed, Charmed, or Frightened by such creatures. As a Magic action, you target one creature you can see within 5 feet of you that has one of the creature types above. The target must succeed on a Charisma saving throw or be sent back to its home plane if it isn't there already. If they aren't on their home plane, Undead are sent to the Shadowfell, and Fey are sent to the Feywild."
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
