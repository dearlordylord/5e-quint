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
          "For the duration, Celestials, Elementals, Fey, Fiends, and Undead have Disadvantage on attack rolls against you. You can end the spell early with Break Enchantment, touching a creature possessed by or Charmed or Frightened by such creatures so the target is no longer possessed, Charmed, or Frightened by them. You can also use Dismissal against one visible creature within 5 feet of you of those types; on a failed Charisma saving throw, it is sent back to its home plane if it isn't already there. Undead are sent to the Shadowfell and Fey to the Feywild if they aren't on their home plane."
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
