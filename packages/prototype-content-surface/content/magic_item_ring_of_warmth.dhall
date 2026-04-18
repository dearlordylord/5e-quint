-- Ring of Warmth — SRD 5.2.1 Magic Item (uncommon, requires attunement).
-- Rules:
--   "If you take Cold damage while wearing this ring, the ring reduces
--    the damage you take by 2d8.
--
--    In addition, while wearing this ring, you and everything you wear
--    and carry are unharmed by temperatures of 0 degrees Fahrenheit or
--    lower."
--
-- Partial encoding:
--   The cold-damage reduction fits the existing passive magic-item
--   surface via `reduce_damage_taken`.
--
-- Omitted rider:
--   The environmental-temperature protection has no existing authored
--   surface atom. It is recorded in
--   `proposal-magic_item_ring_of_warmth.md`.

let ringOfWarmth =
      { kind = "magic_item"
      , id = "magic_item_ring_of_warmth"
      , name = "Ring of Warmth"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#RingOfWarmth"
          }
      , description =
          "If you take Cold damage while wearing this ring, the ring reduces the damage you take by 2d8. In addition, while wearing this ring, you and everything you wear and carry are unharmed by temperatures of 0 degrees Fahrenheit or lower."
      , mechanics =
          { family = "passive"
          , condition = { kind = "wearing_item" }
          , grants =
              [ { kind = "reduce_damage_taken"
                , amount =
                    { kind = "fixed"
                    , expr = { dice = 2, dieSize = 8 }
                    }
                , damageType = "cold"
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  ringOfWarmth
