-- Arcane Hand - SRD 5.2.1 Spell, level 5, Evocation.

let arcaneHand =
      { kind = "spell"
      , id = "arcane_hand"
      , name = "Arcane Hand"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Arcane Hand"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "evocation"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components =
              { v = True, s = True, m = "an eggshell and a glove" }
          , duration =
              { kind = "concentration", upTo = { unit = "minute", amount = 1 } }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location"
                    , description =
                        "unoccupied space that you can see within range"
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  arcaneHand
