-- Teleportation Circle - SRD 5.2.1 Spell, level 5, Conjuration.

let teleportationCircle =
      { kind = "spell"
      , id = "teleportation_circle"
      , name = "Teleportation Circle"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-S-Z#Teleportation Circle"
          }

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
