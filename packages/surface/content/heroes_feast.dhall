-- Heroes' Feast - SRD 5.2.1 Spell, level 6, Conjuration.
--
-- RAW (Spells/Descriptions-E-L#Heroes' Feast): a consumed 1,000+ GP bowl
-- creates a feast in an unoccupied 10-foot Cube; consumption and its 24-hour
-- benefits remain deferred to a rest/benefit owner.

let heroesFeast =
      { kind = "spell"
      , id = "heroes_feast"
      , name = "Heroes' Feast"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-E-L#Heroes' Feast"
          }
      , mechanics =
          { family = "activation"
          , level = 6
          , school = "conjuration"
          , castingTime = { kind = "minutes", amount = 10, ritual = False }
          , range = { kind = "self" }
          , components =
              { v = True
              , s = True
              , m = "a gem-encrusted bowl worth 1,000+ GP, which the spell consumes"
              , materialCostGp = 1000
              , materialConsumed = True
              }
          , duration = { kind = "instantaneous" }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "location"
                    , description = "an unoccupied 10-foot Cube next to you"
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  heroesFeast
