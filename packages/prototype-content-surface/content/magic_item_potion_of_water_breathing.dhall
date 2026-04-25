-- Potion of Water Breathing — SRD 5.2.1 magic item.
--
-- RAW (MagicItems#PotionOfWaterBreathing):
--   "You can breathe underwater for 24 hours after drinking this potion."
--
-- Single-use consumable: activationCost=action, use_count(1),
-- resetCadence=never, destruction=permanent_on_empty.

let potion =
      { kind = "magic_item"
      , id = "magic_item_potion_of_water_breathing"
      , name = "Potion of Water Breathing"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#PotionOfWaterBreathing"
          }
      , description =
          "You can breathe underwater for 24 hours after drinking this potion."
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "action" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 24 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects = [ { kind = "water_breathing" } ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potion
