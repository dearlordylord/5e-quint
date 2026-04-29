-- Gem of Seeing — SRD 5.2.1 magic item (rare, attunement).
--
-- RAW:
--   "This gem has 3 charges. As a Magic action, you can expend 1
--    charge. For the next 10 minutes, you have Truesight out to 120
--    feet when you peer through the gem. The gem regains 1d3 expended
--    charges daily at dawn."
--
-- Honest fit to the existing magic-item activation surface:
--   • ActivationResource.charge_pool with a fixed 3-charge cap
--   • standard_action Magic action activation cost
--   • timed duration (10 minutes)
--   • direct self grant_sense(truesight, 120 ft)
--   • RestResetCadence.dawn with partial regain = 1d3
--
-- The "when you peer through the gem" clause is kept in the description
-- as a usage qualifier on the granted sense; the deterministic
-- mechanics payload is the timed Truesight grant.

let gem =
      { kind = "magic_item"
      , id = "magic_item_gem_of_seeing"
      , name = "Gem of Seeing"
      , rarity = "rare"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#GemOfSeeing"
          }
      , description =
          "This gem has 3 charges. As a Magic action, you can expend 1 charge. For the next 10 minutes, you have Truesight out to 120 feet when you peer through the gem. The gem regains 1d3 expended charges daily at dawn."
      , mechanics =
          { family = "activation"
          , condition = { kind = "holding_item" }
          , activationCost =
              { kind = "standard_action"
              , action = "magic"
              }
          , resource =
              { kind = "charge_pool"
              , cap = { kind = "fixed", uses = 3 }
              }
          , resetCadence =
              { kind = "dawn"
              , regain =
                  Some
                    { kind = "fixed"
                    , expr = { dice = 1, dieSize = 3 }
                    }
              }
          , duration =
              { kind = "timed"
              , value = { unit = "minute", amount = 10 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "grant_sense"
                      , sense = "truesight"
                      , rangeFeet = 120
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  gem
