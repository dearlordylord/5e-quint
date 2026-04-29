-- Potion of Giant Strength — SRD 5.2.1 Magic Item (rarity varies).
--
-- RAW (MagicItems#PotionOfGiantStrength):
--   "When you drink this potion, your Strength score changes for 1 hour.
--    The type of giant determines the score (see the table below). The
--    potion has no effect on you if your Strength is equal to or greater
--    than that score."
--
-- SRD table:
--   Hill   → Strength 21, Uncommon
--   Frost/Stone → Strength 23, Rare
--   Fire   → Strength 25, Rare
--   Cloud  → Strength 27, Very Rare
--   Storm  → Strength 29, Legendary
--
-- Encoded as the HILL variant (Strength 21, Uncommon) — the most
-- accessible tier. Each tier differs only in `value` and `rarity`.
--
-- "No effect if Str ≥ value" → set_ability_score mode="floor":
--   raises the score to value only if current score is below it.
--
-- Single-use consumable: activationCost=action, resource=use_count(1),
-- resetCadence=never, destruction=permanent_on_empty.
-- Effect lasts 1 hour: duration.timed.

let potion =
      { kind = "magic_item"
      , id = "magic_item_potion_of_giant_strength"
      , name = "Potion of Giant Strength"
      , rarity = "uncommon"
      , requiresAttunement = False
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#PotionOfGiantStrength"
          }
      , description =
          "When you drink this potion, your Strength score changes for 1 hour. The type of giant determines the score. The potion has no effect on you if your Strength is equal to or greater than that score. (Hill variant: Strength 21, Uncommon.)"
      , mechanics =
          { family = "activation"
          , activationCost = { kind = "standard_action", action = "magic" }
          , resource =
              { kind = "use_count"
              , cap = { kind = "fixed", uses = 1 }
              }
          , resetCadence = { kind = "never" }
          , duration =
              { kind = "timed"
              , value = { unit = "hour", amount = 1 }
              }
          , phases =
              [ { kind = "direct"
                , attachment = { kind = "self" }
                , effects =
                    [ { kind = "set_ability_score"
                      , ability = "str"
                      , value = +21
                      , mode = "floor"
                      }
                    ]
                }
              ]
          }
      , destruction = { kind = "permanent_on_empty" }
      }

in  potion
