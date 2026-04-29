-- Slippers of Spider Climbing — SRD 5.2.1 magic item.
--
-- RAW:
--   "While you wear these light shoes, you can move up, down, and
--    across vertical surfaces and along ceilings, while leaving your
--    hands free. You have a Climb Speed equal to your Speed. However,
--    the slippers don't allow you to move this way on a slippery
--    surface, such as one covered by ice or oil."
--
-- Local precedent: `content/spider_climb.dhall` already treats the
-- vertical-surface / ceiling-traversal text as a spatial-movement
-- carveout and only encodes the deterministic Climb Speed grant.
-- This item follows that precedent.

let slippers =
      { kind = "magic_item"
      , id = "magic_item_slippers_of_spider_climbing"
      , name = "Slippers of Spider Climbing"
      , rarity = "uncommon"
      , requiresAttunement = True
      , provenance =
          { kind = "srd-5.2.1"
          , section = "MagicItems#Slippers of Spider Climbing"
          }
      , description =
          "While you wear these light shoes, you can move up, down, and across vertical surfaces and along ceilings, while leaving your hands free. You have a Climb Speed equal to your Speed. However, the slippers don't allow you to move this way on a slippery surface, such as one covered by ice or oil."
      , mechanics =
          { family = "passive"
          , grants =
              [ { kind = "grant_speed"
                , speedKind = "climb"
                , feet = { kind = "walk_speed" }
                }
              ]
          }
      , destruction = { kind = "none" }
      }

in  slippers
