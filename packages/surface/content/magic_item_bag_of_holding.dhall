-- Bag of Holding — SRD 5.2.1 magic item.
-- Honest fit: passive storage profile.
--
-- Encoded:
--   • extradimensional interior
--   • 500 lb / 64 cu ft capacity
--   • fixed external weight 5 lb
--   • shared 10-minute air supply for breathing occupants
--
-- Not surfaced here:
--   • retrieving an item requires a Utilize action
--   • overloaded / pierced / torn destroys bag and scatters contents to the Astral Plane
--   • turning the bag inside out spills contents and temporarily disables use
--   • nesting with Handy Haversack / Portable Hole destroys both items and opens a one-shot Astral gate
--
-- Those omissions are recorded in proposal-magic_item_bag_of_holding.md and
-- the result file classifies this as a surface widening rather than clean.

let bagOfHolding =
      { kind = "magic_item"
      , id = "magic_item_bag_of_holding"
      , name = "Bag of Holding"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "Magic-Items/Items-A-H.md#Bag of Holding"
          }

      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "container_storage"
                , storage =
                    { maxWeightPounds = 500
                    , maxVolumeCubicFeet = 64
                    , weightOverridePounds = Some 5
                    , airSupply = Some { sharedMinutes = 10 }
                    , extradimensional = Some True
                    }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  bagOfHolding
