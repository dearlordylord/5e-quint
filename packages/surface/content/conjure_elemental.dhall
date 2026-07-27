-- Conjure Elemental - SRD 5.2.1 Spell, level 5, Conjuration.

let conjureElemental =
      { kind = "spell"
      , id = "conjure_elemental"
      , name = "Conjure Elemental"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Conjure Elemental"
          }
      , description =
          "You conjure a Large, intangible spirit from the Elemental Planes in an unoccupied space within range. Choose the spirit's element, which determines its damage type: air (Lightning), earth (Thunder), fire (Fire), or water (Cold). The spirit lasts for the duration. If a creature you can see enters the spirit's space or starts its turn within 5 feet of it, you can force that creature to make a Dexterity saving throw if the spirit has no creature Restrained. On a failed save, the target takes 8d8 damage of the spirit's type and has the Restrained condition until the spell ends. At the start of each of its turns, the Restrained target repeats the save. On a failed save, it takes 4d8 damage. On a successful save, it isn't Restrained. Using a Higher-Level Spell Slot. The damage increases by 1d8 for each slot level above 5."
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
