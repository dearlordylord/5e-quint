-- Arcane Hand - SRD 5.2.1 Spell, level 5, Evocation.

let arcaneHand =
      { kind = "spell"
      , id = "arcane_hand"
      , name = "Arcane Hand"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-A-D#Arcane Hand"
          }
      , description =
          "You create a Large hand of shimmering magical energy in an unoccupied space that you can see within range. The hand is an object with AC 20 and Hit Points equal to your Hit Point maximum. The hand doesn't occupy its space. When you cast the spell and as a Bonus Action on later turns, you can move the hand up to 60 feet and cause one effect: Clenched Fist; Forceful Hand; Grasping Hand; Interposing Hand. Using a Higher-Level Spell Slot. The damage of the Clenched Fist increases by 2d8 and the damage of the Grasping Hand increases by 2d6 for each spell slot level above 5."
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
