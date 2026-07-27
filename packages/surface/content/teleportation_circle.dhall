-- Teleportation Circle - SRD 5.2.1 Spell, level 5, Conjuration.

let teleportationCircle =
      { kind = "spell"
      , id = "teleportation_circle"
      , name = "Teleportation Circle"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Teleportation Circle"
          }
      , description =
          "As you cast the spell, you draw a 5-foot-radius circle on the ground with sigils linking your location to a permanent teleportation circle of your choice whose sigil sequence you know and that is on the same plane. A shimmering portal opens within your circle until the end of your next turn. A creature that enters it appears within 5 feet of the destination circle or in the nearest unoccupied space if that space is occupied. When you first gain the ability to cast this spell, you learn two Material Plane destination sigil sequences chosen by the GM. You might learn additional sigil sequences during your adventures. You can commit a new sequence after studying it for 1 minute. Casting this spell in the same location every day for 365 days creates a permanent teleportation circle."
      , mechanics =
          { family = "activation"
          , level = 5
          , school = "conjuration"
          , castingTime = { kind = "minutes", amount = 1, ritual = False }
          , range = { kind = "point", feet = 10 }
          , components =
              { v = True
              , s = False
              , m = "rare inks worth 50+ GP, which the spell consumes"
              , materialCostGp = 50
              , materialConsumed = True
              }
          , duration =
              { kind = "timed"
              , value = { unit = "round", amount = 1 }
              , permanentAfter =
                  { kind = "repeated_casts"
                  , cadence = "daily"
                  , count = 365
                  , target = "same_target"
                  , endsOn = [ "dispel" ]
                  }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "area"
                    , shape = { kind = "circle", radiusFeet = 5 }
                    , origin = { kind = "point_within_range" }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  teleportationCircle
