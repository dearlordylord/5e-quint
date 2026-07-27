-- Conjure Elemental - SRD 5.2.1 Spell, level 5, Conjuration.

let conjureElemental =
      { kind = "spell"
      , id = "conjure_elemental"
      , name = "Conjure Elemental"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Conjure Elemental"
          }

      , mechanics =
          { family = "activation"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 60 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location"
                    , description = "unoccupied space within range"
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  conjureElemental
