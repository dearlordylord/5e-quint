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
          "You conjure a Large, intangible spirit from the Elemental Planes in an unoccupied space within range. Choose air, earth, fire, or water, setting the damage type to Lightning, Thunder, Fire, or Cold. The spirit lasts for the duration. A creature you can see that enters the spirit's space or starts its turn within 5 feet of it can be forced to make a Dexterity saving throw if the spirit has no creature Restrained. On a failed save, the target takes 8d8 damage of the spirit's type and is Restrained until the spell ends. At the start of each of its turns, the Restrained target repeats the save; on a failed repeat, it takes 4d8 damage, and on a success, it isn't Restrained. Using a Higher-Level Spell Slot, the damage increases by 1d8 for each slot level above 5."
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
