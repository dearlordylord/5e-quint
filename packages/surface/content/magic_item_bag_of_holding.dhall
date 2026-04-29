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
          , section = "MagicItems#Bag of Holding"
          }
      , description =
          "This bag has an interior space considerably larger than its outside dimensions—roughly 2 feet square and 4 feet deep on the inside. The bag can hold up to 500 pounds, not exceeding a volume of 64 cubic feet. The bag weighs 5 pounds, regardless of its contents. Retrieving an item from the bag requires a Utilize action. If the bag is overloaded, pierced, or torn, it is destroyed, and its contents are scattered in the Astral Plane. If the bag is turned inside out, its contents spill forth unharmed, but the bag must be put right before it can be used again. The bag holds enough air for 10 minutes of breathing, divided by the number of breathing creatures inside. Placing a Bag of Holding inside an extradimensional space created by a Handy Haversack, Portable Hole, or similar item instantly destroys both items and opens a gate to the Astral Plane. Any creature within a 10-foot-radius Sphere centered on the gate is sucked through it to a random location on the Astral Plane. The gate then closes. The gate is one-way and can't be reopened."
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
