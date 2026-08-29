-- Phantasmal Killer - SRD 5.2.1 Spell, level 4, Illusion.
--
-- RAW (Spells/Descriptions-M-P#Phantasmal Killer): one visible creature in
-- range makes a Wisdom save against a concentration effect up to 1 minute;
-- the frightening image, damage, and repeat-save timing are deferred.

let phantasmalKiller =
      { kind = "spell"
      , id = "phantasmal_killer"
      , name = "Phantasmal Killer"
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Spells/Descriptions-M-P#Phantasmal Killer"
          }
      , mechanics =
          { family = "activation"
          , level = 4
          , school = "illusion"
          , castingTime = { kind = "action" }
          , range = { kind = "point", feet = 120 }
          , components = { v = True, s = True, m = False }
          , duration =
              { kind = "concentration"
              , upTo = { unit = "minute", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment =
                    { kind = "hole"
                    , holeId = "phantasmal_killer_target"
                    , label = "one creature you can see"
                    , value =
                        { kind = "target"
                        , selection = { mode = "one" }
                        }
                    }
                , effects = [ { kind = "none" } ]
                }
              ]
          }
      }

in  phantasmalKiller
